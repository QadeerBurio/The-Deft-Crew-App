// app/src/analytics/metaEvents.js
// Meta App Events (react-native-fbsdk-next), strict consent.
//
// Nothing is sent and the advertising ID is not collected unless ALL of these are true:
//   1. this build was made with the Meta IDs     (app.config.js → extra.meta.enabled)
//   2. the server's switch is on                 (GET /api/app/flags → metaEvents)
//   3. the signed-in student allowed it          (consent sheet / Settings → privacy)
// The SDK is only started (initializeSDK) after that; the native settings keep it from
// starting or logging by itself before then.
//
// Once allowed, the SDK's automatic logging is switched on before it starts, so the SDK sends
// its own one-time install ping and fb_mobile_activate_app on each open. It goes off again when
// the student withdraws or the server's switch turns off (the SDK can't be unloaded; it just
// stops logging and collecting).
//
// Advertising ID: Android, with consent. iPhone, with consent AND the system tracking prompt
// granted (asked only after the student says "allow"; never on its own).
//
// The server's switch is re-read every 5 minutes while the app is open and on every return to
// the app (onAppState), so turning META_EVENTS_ENABLED off stops everything within minutes.
//
// Before the student decides, events (e.g. the sign-up) wait on the phone for up to 24 h:
// sent if they allow, dropped if they don't. Each item is sent once (per-item keys kept on
// the phone). Every function here catches its own errors: a Meta problem never breaks a
// sign-up, a claim or an application.
//
// Events (no name, email, phone number or free text, ever):
//   registration(userId)              fb_mobile_complete_registration  (account sign-up)
//   offerClaimed(offerId)             tdc_offer_claimed
//   jobApplied(jobId)                 SubmitApplication
//   aiResumeCreated(resumeId, method) tdc_ai_resume_created  (method: upload_parse | tailor)
//   onboardingCompleted()             fb_mobile_tutorial_completion  (tour finished with "let's go"; skip doesn't count)
//   eventRegistered(eventId)          tdc_event_registered  (feature_name: events; free, or paid and accepted)
//   scholarshipApplied(programId)     tdc_scholarship_applied  (application saved by the server)
// Plus, from the SDK itself once allowed: its install ping and fb_mobile_activate_app.

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { BASE_URL } from "../api/api";

const KEY_FLAGS = "tdc.appFlags.v1";
const KEY_SENT = "tdc.metaSent.v1";
const keyConsent = (userId) => `tdc.metaConsent.v1.${userId}`;
const keyQueue = (userId) => `tdc.metaQueue.v1.${userId}`;

const FLAGS_MAX_AGE = 5 * 60 * 1000; // refresh the switch when older than this
const FLAGS_EVERY = 5 * 60 * 1000; // and re-read it this often while the app is open
const QUEUE_MAX = 20;
const QUEUE_TTL = 24 * 60 * 60 * 1000;
const SENT_MAX = 500;

// Fallback, OFF: log fb_mobile_activate_app ourselves on each open. Only for the case where a
// device test shows the SDK's automatic logging misses the session it was started in. It counts
// opens but does not replace the SDK's install ping.
const config = { manualActivate: false };

// Meta's names (the SDK's constants are read when present)
const EVENT = {
  registration: (sdk) => sdk?.AppEventsLogger?.AppEvents?.CompletedRegistration || "fb_mobile_complete_registration",
  application: (sdk) => sdk?.AppEventsLogger?.AppEvents?.SubmitApplication || "SubmitApplication",
  tutorial: (sdk) => sdk?.AppEventsLogger?.AppEvents?.CompletedTutorial || "fb_mobile_tutorial_completion",
  activate: () => "fb_mobile_activate_app",
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
  platform: () => Platform.OS,
  // iPhone's system tracking prompt (App Tracking Transparency)
  loadTracking: () => require("expo-tracking-transparency"),
  now: () => Date.now(),
  every: (fn, ms) => { const t = setInterval(fn, ms); return () => clearInterval(t); },
};

const state = {
  userId: null,
  consent: null, // "granted" | "denied" | null (not asked yet)
  remote: false,
  flagsAt: 0,
  started: false,
  tracking: null, // iPhone: "granted" | "denied" | "undetermined" | null (not read yet)
  sent: null, // Set of keys, loaded lazily
  sdk: undefined,
};
let stopWatch = null; // the 5-minute switch check while the app is open
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

const isIOS = () => { try { return deps.platform() === "ios"; } catch { return false; } };
const buildOn = () => { try { return deps.buildEnabled(); } catch { return false; } };
/** Meta can be used at all (build + server switch). The UI asks / shows the switch only then. */
export const metaAvailable = () => buildOn() && state.remote === true;
const active = () => metaAvailable() && !!state.userId && state.consent === "granted" && !!sdk();

// ── iPhone tracking prompt ──
function tracking() {
  try { return deps.loadTracking() || null; } catch { return null; } // module missing → treated as not granted
}
async function readTracking() {
  if (!isIOS()) return null;
  try {
    const t = tracking();
    const res = t ? await t.getTrackingPermissionsAsync() : null;
    state.tracking = res?.status || "denied";
  } catch {
    state.tracking = "denied";
  }
  return state.tracking;
}

/** The advertising ID may be collected now: Android with consent; iPhone with consent and tracking granted. */
const adIdAllowed = () => active() && (!isIOS() || state.tracking === "granted");

function applyAdId(s) {
  const on = adIdAllowed();
  if (isIOS()) s.Settings.setAdvertiserTrackingEnabled?.(on);
  s.Settings.setAdvertiserIDCollectionEnabled(on);
}

// ── start / stop the SDK ──

async function start() {
  const s = sdk();
  if (!s) return false;

  try {
    if (isIOS() && state.tracking == null) await readTracking();
    // automatic logging first, so the SDK sends its install ping and fb_mobile_activate_app
    s.Settings.setAutoLogAppEventsEnabled(true);
    applyAdId(s);
    s.Settings.initializeSDK();
    state.started = true;
    if (config.manualActivate) logActivate();
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
    // the SDK can't be unloaded: no automatic logging, no events from us, no advertising ID
    s?.Settings?.setAutoLogAppEventsEnabled(false);
    if (isIOS()) s?.Settings?.setAdvertiserTrackingEnabled?.(false);
    s?.Settings?.setAdvertiserIDCollectionEnabled(false);
  } catch {}
}

async function applyState() {
  try {
    if (active()) {
      if (!state.started) {
        if (await start()) await flushQueue();
      } else {
        const s = sdk();
        if (s) applyAdId(s); // e.g. the tracking answer changed
      }
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

/**
 * The app came to the front ("active") or left it. On every return: re-read the switch and the
 * iPhone tracking answer (it can change in iOS Settings), and re-check the switch every 5 minutes
 * while the app stays open. In the background: stop checking.
 */
export async function onAppState(appState) {
  try {
    if (appState === "active") {
      if (!stopWatch) stopWatch = deps.every(() => { refreshFlags({ force: true }); }, FLAGS_EVERY);
      if (isIOS() && state.started) await readTracking();
      await refreshFlags({ force: true });
      if (config.manualActivate && state.started) logActivate();
    } else if (stopWatch) {
      stopWatch();
      stopWatch = null;
    }
  } catch (e) {
    warn("app state failed:", e?.message);
  }
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

/**
 * iPhone only, and only after the student allowed it: shows the system tracking prompt if it was
 * never answered, then switches the advertising ID on or off to match. Never asks after "not now",
 * when Meta is off, or on Android. Returns the tracking status (null when not asked).
 */
export async function requestTracking() {
  try {
    if (!isIOS() || !active()) return null;
    const t = tracking();
    if (!t) return null;
    let res = await t.getTrackingPermissionsAsync();
    if (res?.status === "undetermined") res = await t.requestTrackingPermissionsAsync();
    state.tracking = res?.status || "denied";
    await applyState();
    notify();
    return state.tracking;
  } catch (e) {
    warn("tracking prompt failed:", e?.message);
    return null;
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

  if (!s?.AppEventsLogger) {
    throw new Error("Meta App Events SDK unavailable");
  }

  s.AppEventsLogger.logEvent(name, params);

  // Request immediate transmission of queued events.
  s.AppEventsLogger.flush();
}

// the fallback activation (config.manualActivate); never throws
function logActivate() {
  try {
    if (state.started && active()) send(EVENT.activate(), {});
  } catch (e) {
    warn("activate not sent:", e?.message);
  }
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
  /** app tour finished on its last step (not skipped); Meta's standard tutorial event, once per student */
  onboardingCompleted: () =>
    log((s) => ({ name: EVENT.tutorial(s), params: {} }), "onboarding"),
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
  config,
  FLAGS_EVERY,
  reset: () => {
    Object.assign(state, { userId: null, consent: null, remote: false, flagsAt: 0, started: false, tracking: null, sent: null, sdk: undefined });
    if (stopWatch) { try { stopWatch(); } catch {} }
    stopWatch = null;
    config.manualActivate = false;
    listeners.clear();
  },
};

export default metaEvents;
