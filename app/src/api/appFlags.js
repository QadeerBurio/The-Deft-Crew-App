// app/src/api/appFlags.js
// The one copy of GET /api/app/flags/me (config/featureFlags.js on the server): which features this
// signed-in account sees. Every feature reads it through flagOn(name) / useFlag(name).
//
//   - asked again on login and on app open (always), and when the app comes back to the foreground
//     (at most once a minute)
//   - a failed or slow request never turns a feature off: the last answer stays; with no answer yet
//     a feature is off for now and the next call asks again (a few seconds later at the earliest)
//   - kept on the phone per account and app version, so a feature shows at once on the next open;
//     cleared on logout and whenever the app version changes
//   - guests and signed-out: every feature off, nothing asked
import AsyncStorage from "@react-native-async-storage/async-storage";
// the api client is loaded when flags are first asked for (keeps this module light to import)
const api = () => { const m = require("./api"); return m.default || m; };

export const MIN_REFRESH_MS = 60 * 1000; // foreground / repeated reads: at most once a minute
export const RETRY_AFTER_MS = 5 * 1000; // after a failure with nothing known yet
const MAX_AGE_MS = 5 * 60 * 1000; // a read older than this asks again
const STORE_KEY = "appFlags:v2";
const TIMEOUT_MS = 15000;

// the app version (App.js passes it in watchFlags): saved flags from another version are dropped
let appVersion = null;

// key: which account (a short hash of its token, never the token itself)
let state = { key: null, flags: null, at: 0, failedAt: 0, pending: null, restored: false };
const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(state.flags); } catch { /* a listener's own problem */ } });

const hash = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `a${(h >>> 0).toString(36)}`;
};

async function account() {
  try {
    const [token, guest] = await Promise.all([AsyncStorage.getItem("token"), AsyncStorage.getItem("isGuest")]);
    if (!token || guest === "true") return null;
    return hash(token);
  } catch {
    return null;
  }
}

async function restore(key) {
  if (state.restored) return;
  state.restored = true;
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    // another account or another app version: start fresh
    if (!saved || saved.key !== key || saved.version !== appVersion || !saved.flags) {
      if (raw) await AsyncStorage.removeItem?.(STORE_KEY);
      return;
    }
    if (state.key === key && !state.flags) { state.flags = saved.flags; state.at = 0; emit(); }
  } catch (e) {
    console.warn("[flags] saved flags not read:", e?.message);
  }
}

async function persist(key, flags) {
  try { await AsyncStorage.setItem?.(STORE_KEY, JSON.stringify({ key, version: appVersion, flags, at: Date.now() })); }
  catch (e) { console.warn("[flags] flags not saved on the phone:", e?.message); }
}

/**
 * Ask the server again (unless asked within the last minute and `force` isn't set).
 * Resolves to the flags object, or null when there is no account / nothing known.
 */
export async function refreshFlags({ force = false } = {}) {
  const key = await account();
  if (!key) {
    if (state.key || state.flags) { state = { key: null, flags: null, at: 0, failedAt: 0, pending: null, restored: false }; emit(); }
    return null;
  }
  if (state.key !== key) {
    state = { key, flags: null, at: 0, failedAt: 0, pending: null, restored: false };
    await restore(key);
  }
  const age = Date.now() - state.at;
  if (!force && state.at && age < MIN_REFRESH_MS) return state.flags;
  if (!force && !state.flags && state.failedAt && Date.now() - state.failedAt < RETRY_AFTER_MS) return null;
  if (state.pending) return state.pending;
  const pending = Promise.resolve()
    .then(() => api().get("/app/flags/me", { timeout: TIMEOUT_MS }))
    .then((r) => {
      const flags = r?.data && typeof r.data === "object" ? r.data : {};
      if (state.key === key) {
        state.flags = flags;
        state.at = Date.now();
        state.failedAt = 0;
        persist(key, flags);
        emit();
      }
      return flags;
    })
    .catch((e) => {
      // keep what we knew: a slow or unreachable server never switches a feature off
      console.warn("[flags] flags/me not read:", e?.message);
      if (state.key === key) state.failedAt = Date.now();
      return state.key === key ? state.flags : null;
    })
    .finally(() => { if (state.key === key && state.pending === pending) state.pending = null; });
  state.pending = pending;
  return pending;
}

/** Is a feature on for the signed-in account? (asks the server when nothing recent is known) */
export async function flagOn(name) {
  const key = await account();
  if (!key) return false;
  if (state.key === key && state.flags && Date.now() - state.at < MAX_AGE_MS) return !!state.flags[name];
  const flags = await refreshFlags();
  return !!(flags && flags[name]);
}

/** The last known value without asking: true / false, or null when nothing is known yet */
export const knownFlag = (name) => (state.flags ? !!state.flags[name] : null);

/** Called on every new answer (or when the flags are cleared) */
export function subscribeFlags(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Logout: forget this account's flags (memory and phone) */
export async function clearFlags() {
  state = { key: null, flags: null, at: 0, failedAt: 0, pending: null, restored: false };
  try { await AsyncStorage.removeItem?.(STORE_KEY); } catch (e) { console.warn("[flags] saved flags not cleared:", e?.message); }
  emit();
}

/**
 * Keep the flags fresh: now (app open), and whenever the app returns to the foreground (at most once
 * a minute). Returns a function that stops watching.
 */
export function watchFlags(AppState, version = null) {
  if (version) appVersion = version;
  refreshFlags({ force: true });
  if (!AppState?.addEventListener) return () => {};
  let last = AppState.currentState;
  const sub = AppState.addEventListener("change", (next) => {
    if (next === "active" && last !== "active") refreshFlags();
    last = next;
  });
  return () => sub?.remove?.();
}

export const _test = { reset: () => { state = { key: null, flags: null, at: 0, failedAt: 0, pending: null, restored: false }; listeners.clear(); }, state: () => state };
