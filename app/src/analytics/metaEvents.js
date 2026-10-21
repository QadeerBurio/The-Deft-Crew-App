// app/src/analytics/metaEvents.js
// Meta App Events (react-native-fbsdk-next), strict consent.
//
// Nothing is sent and the advertising ID is not collected unless ALL of these are true:
//   1. this build was made with the Meta IDs     (app.config.js → extra.meta.enabled)
//   2. the server's switch is on                 (GET /api/app/flags → metaEvents)
//   3. the signed-in student allowed it          (consent sheet / Settings → privacy)
// The SDK is only started (initializeSDK) after that; the native settings keep it from
// starting or logging by itself.
//
// Before the student decides, events (e.g. the sign-up) wait on the phone for up to 24 h:
// sent if they allow, dropped if they don't. Each item is sent once (per-item keys kept on
// the phone). Every function here catches its own errors: a Meta problem never breaks a
// sign-up, a claim or an application.
//
// Events (no name, email or phone number, ever):
//   registration(userId)              fb_mobile_complete_registration  (account sign-up)
//   offerClaimed(offerId)             tdc_offer_claimed
//   jobApplied(jobId)                 SubmitApplication
//   aiResumeCreated(resumeId, method) tdc_ai_resume_created  (method: upload_parse | tailor)
//   onboardingCompleted()             tdc_onboarding_completed  (tour finished with "let's go"; skip doesn't count)
//   eventRegistered(eventId)          tdc_event_registered  (feature_name: events; free, or paid and accepted)
//   scholarshipApplied(programId)     tdc_scholarship_applied  (application saved by the server)

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { BASE_URL } from "../api/api";

const KEY_FLAGS = "tdc.appFlags.v1";
const KEY_SENT = "tdc.metaSent.v1";
const keyConsent = (userId) => `tdc.metaConsent.v1.${userId}`;
const keyQueue = (userId) => `tdc.metaQueue.v1.${userId}`;

const FLAGS_MAX_AGE = 15 * 60 * 1000; // refresh the switch when older than this
const QUEUE_MAX = 20;
const QUEUE_TTL = 24 * 60 * 60 * 1000;
const SENT_MAX = 500;

// Meta's names (the SDK's constants are read when present)
const EVENT = {
  registration: (sdk) => sdk?.AppEventsLogger?.AppEvents?.CompletedRegistration || "fb_mobile_complete_registration",
  application: (sdk) => sdk?.AppEventsLogger?.AppEvents?.SubmitApplication || "SubmitApplication",
};
const PARAM = {
  method: (sdk) => sdk?.AppEventsLogger?.AppEventParams?.RegistrationMethod || "fb_registration_method",
  contentType: (sdk) => sdk?.AppEventsLogger?.AppEventParams?.ContentType || "fb_content_type",
  contentId: (sdk) => sdk?.AppEventsLogger?.AppEventParams?.ContentID || "fb_content_id",
};

// ── dependencies (tests replace them) ──
const deps = {
  storage: AsyncStorage,
  get: (url, cfg) => axios.get(url, cfg),
  flagsUrl: () => `${String(BASE_URL || "").replace(/\/$/, "")}/app/flags`,
  buildEnabled: () => Constants.expoConfig?.extra?.meta?.enabled === true,
  loadSdk: () => require("react-native-fbsdk-next"),
  now: () => Date.now(),
};

const state = {
  userId: null,
  consent: null, // "granted" | "denied" | null (not asked yet)
  remote: false,
  flagsAt: 0,
  started: false,
  sent: null, // Set of keys, loaded lazily
  sdk: undefined,
};
const listeners = new Set();
const notify = () => listeners.forEach((fn) => { try { fn(); } catch {} });
const warn = (...a) => { try { console.warn("[meta]", ...a); } catch {} };

async function read(key, fallback) {
  try {
    const raw = await deps.storage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
async function write(key, value) {
  try {
    if (value == null) await deps.storage.removeItem(key);
    else await deps.storage.setItem(key, JSON.stringify(value));
  } catch {}
}

function sdk() {
  if (state.sdk === undefined) {
    try {
      state.sdk = deps.loadSdk() || null;
    } catch {
      state.sdk = null; // native module missing (e.g. an older build)
    }
  }
  return state.sdk;
}

const buildOn = () => { try { return deps.buildEnabled(); } catch { return false; } };
/** Meta can be used at all (build + server switch). The UI asks / shows the switch only then. */
export const metaAvailable = () => buildOn() && state.remote === true;
const active = () => metaAvailable() && !!state.userId && state.consent === "granted" && !!sdk();

// ── start / stop the SDK ──
function start() {
  const s = sdk();
  if (!s) return false;
  try {
    s.Settings.setAutoLogAppEventsEnabled(false);
    s.Settings.setAdvertiserIDCollectionEnabled(true);
    s.Settings.initializeSDK();
    state.started = true;
    return true;
  } catch (e) {
    warn("could not start:", e?.message);
    return false;
  }
}
function stop() {
  const s = sdk();
  state.started = false;
  try {
    // the SDK can't be unloaded: no more events from us, and no advertising ID
    s?.Settings?.setAdvertiserIDCollectionEnabled(false);
  } catch {}
}

async function applyState() {
  try {
    if (active()) {
      if (!state.started && start()) await flushQueue();
    } else if (state.started) {
      stop();
    }
  } catch (e) {
    warn("state change failed:", e?.message);
  }
}

// ── the server's switch ──
/** Reads GET /api/app/flags (cached on the phone). Unreachable and never read: off. */
export async function refreshFlags({ force = false } = {}) {
  try {
    if (!force && state.flagsAt && deps.now() - state.flagsAt < FLAGS_MAX_AGE) return state.remote;
    try {
      const res = await deps.get(deps.flagsUrl(), { timeout: 5000, headers: { "Cache-Control": "no-cache" } });
      state.remote = res?.data?.metaEvents === true;
      state.flagsAt = deps.now();
      await write(KEY_FLAGS, { metaEvents: state.remote, at: state.flagsAt });
    } catch {
      // offline: the last answer the server gave (none yet = off)
      const cached = await read(KEY_FLAGS, null);
      state.remote = cached?.metaEvents === true;
    }
    await applyState();
    notify();
  } catch (e) {
    warn("flags failed:", e?.message);
  }
  return state.remote;
}

// ── who is signed in ──
/** Call when the signed-in student changes (null when signed out or a guest). */
export async function setMetaUser(userId) {
  try {
    const id = userId ? String(userId) : null;
    if (id === state.userId) return;
    state.userId = id;
    state.consent = id ? await read(keyConsent(id), null) : null;
    await applyState();
    notify();
  } catch (e) {
    warn("user change failed:", e?.message);
  }
}

export const getConsent = () => state.consent;

/** The student's choice (consent sheet, Settings → privacy). */
export async function setConsent(allowed) {
  try {
    if (!state.userId) return false;
    state.consent = allowed ? "granted" : "denied";
    await write(keyConsent(state.userId), state.consent);
    if (!allowed) await write(keyQueue(state.userId), null); // nothing waiting is ever sent
    await applyState();
    notify();
    return true;
  } catch (e) {
    warn("consent failed:", e?.message);
    return false;
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── once per item ──
async function sentSet() {
  if (!state.sent) state.sent = new Set(await read(KEY_SENT, []));
  return state.sent;
}
async function markSent(key) {
  const set = await sentSet();
  set.add(key);
  const list = [...set];
  if (list.length > SENT_MAX) list.splice(0, list.length - SENT_MAX);
  state.sent = new Set(list);
  await write(KEY_SENT, list);
}

function send(name, params) {
  const s = sdk();
  s.AppEventsLogger.logEvent(name, params);
}

async function flushQueue() {
  if (!state.userId) return;
  const queue = await read(keyQueue(state.userId), []);
  await write(keyQueue(state.userId), null);
  const set = await sentSet();
  for (const item of queue) {
    if (!item || deps.now() - item.at > QUEUE_TTL || set.has(item.key)) continue;
    try {
      send(item.name, item.params);
      await markSent(item.key);
    } catch (e) {
      warn("queued event not sent:", e?.message);
    }
  }
}

/**
 * Logs one event. Returns what happened (for tests and logs), never throws:
 *   "sent" | "queued" (waiting for the student's choice) | "duplicate" | "off" | "no_consent" |
 *   "no_user" | "error"
 */
async function log(build, key, forUserId) {
  try {
    if (!metaAvailable()) return "off";
    const userId = forUserId ? String(forUserId) : state.userId;
    if (!userId) return "no_user";
    const fullKey = `${userId}:${key}`;
    if ((await sentSet()).has(fullKey)) return "duplicate";

    // the student this event belongs to (sign-up: may not be the active user yet)
    const consent = userId === state.userId ? state.consent : await read(keyConsent(userId), null);
    if (consent === "denied") return "no_consent";
    const s = sdk();
    if (!s) return "off";
    const { name, params } = build(s);

    // allowed by the signed-in student: send now
    if (consent === "granted" && userId === state.userId) {
      if (!state.started) await applyState();
      if (state.started) {
        send(name, params);
        await markSent(fullKey);
        return "sent";
      }
    }
    // not decided yet (or not their session yet): wait on the phone, sent only if allowed
    const queue = await read(keyQueue(userId), []);
    if (queue.some((q) => q.key === fullKey)) return "duplicate";
    queue.push({ name, params, key: fullKey, at: deps.now() });
    await write(keyQueue(userId), queue.slice(-QUEUE_MAX));
    return "queued";
  } catch (e) {
    warn("event not sent:", e?.message);
    return "error";
  }
}

const id = (v) => String(v ?? "").slice(0, 64);

export const metaEvents = {
  /** account sign-up confirmed by the server */
  registration: (userId) =>
    log((s) => ({ name: EVENT.registration(s), params: { [PARAM.method(s)]: "email" } }), "registration", userId),
  /** offer claim confirmed by the server */
  offerClaimed: (offerId) =>
    log((s) => ({ name: "tdc_offer_claimed", params: { [PARAM.contentType(s)]: "offer", [PARAM.contentId(s)]: id(offerId) } }), `offer:${id(offerId)}`),
  /** job application confirmed by the server */
  jobApplied: (jobId) =>
    log((s) => ({ name: EVENT.application(s), params: { [PARAM.contentType(s)]: "job", [PARAM.contentId(s)]: id(jobId) } }), `job:${id(jobId)}`),
  /** AI resume made: upload_parse (from a CV) or tailor (to a job) */
  aiResumeCreated: (resumeId, method) =>
    log((s) => ({ name: "tdc_ai_resume_created", params: { method: id(method) } }), `resume:${id(method)}:${id(resumeId)}`),
  /** app tour finished on its last step (not skipped); once per student */
  onboardingCompleted: () =>
    log(() => ({ name: "tdc_onboarding_completed", params: {} }), "onboarding"),
  /** event registration accepted by the server; feature_name only, once per event */
  eventRegistered: (eventId) =>
    log(() => ({ name: "tdc_event_registered", params: { feature_name: "events" } }), `event:${id(eventId)}`),
  /** scholarship application saved by the server; once per program */
  scholarshipApplied: (programId) =>
    log((s) => ({ name: "tdc_scholarship_applied", params: { [PARAM.contentType(s)]: "scholarship", [PARAM.contentId(s)]: id(programId) } }), `scholarship:${id(programId)}`),
};

// tests only
export const _test = {
  deps,
  state,
  reset: () => {
    Object.assign(state, { userId: null, consent: null, remote: false, flagsAt: 0, started: false, sent: null, sdk: undefined });
    listeners.clear();
  },
};

export default metaEvents;
