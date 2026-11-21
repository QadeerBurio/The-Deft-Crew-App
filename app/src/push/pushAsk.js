// app/src/push/pushAsk.js
// Plan N-3: ask for notifications at a good moment, with a reason, instead of on login (flag pushAskV2, off).
//   pushMoment("deal" | "confession" | "job")  a screen's good moment (first deal claimed, confession posted, job
//                                               applied). Shows the sheet (PushAskHost) when: the flag is on, the phone
//                                               hasn't allowed notifications yet, the OS can still ask, and it's due
//   due: never asked → yes; "not now" once → once more after 7 days; after that → only from Settings
//   answer("on" | "not_now")                   the sheet's buttons; "on" opens the OS prompt and saves the token
// Flag off: pushMoment does nothing (login asks, as today).
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { flagOn } from "../api/appFlags";

export const FLAG = "pushAskV2";
export const STORE_KEY = "@tdc_push_ask";
export const AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
export const REASONS = Object.freeze({
  deal: "we'll tell you when a deal near you drops",
  confession: "know when someone replies",
  job: "hear back from employers first",
});

const listeners = new Set();
let showing = false;

/** The sheet subscribes here: fn({ kind, reason }) */
export function onPushAsk(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function readState() {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return { asks: Number(s?.asks) || 0, lastAskAt: Number(s?.lastAskAt) || 0, answered: s?.answered || null };
  } catch {
    return { asks: 0, lastAskAt: 0, answered: null };
  }
}
async function writeState(s) {
  try { await AsyncStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* best effort */ }
}

/** Is a sheet due? Never asked, or "not now" once and 7 days have passed. */
export function due(state, now = Date.now()) {
  if (state.answered === "on") return false;
  if (state.asks <= 0) return true;
  return state.asks === 1 && now - state.lastAskAt >= AGAIN_AFTER_MS;
}

/** A good moment. Never throws, never blocks the screen. Resolves true when the sheet was shown. */
export async function pushMoment(kind, { now = Date.now() } = {}) {
  try {
    const reason = REASONS[kind];
    if (!reason || showing || !listeners.size) return false;
    if (!(await flagOn(FLAG))) return false;
    const perm = await Notifications.getPermissionsAsync();
    if (perm?.status === "granted" || perm?.granted) return false;
    if (perm?.canAskAgain === false) return false; // denied: the "turn on in settings" row in Settings
    if (!due(await readState(), now)) return false;
    showing = true;
    listeners.forEach((fn) => { try { fn({ kind, reason }); } catch { /* the sheet's own problem */ } });
    return true;
  } catch {
    return false;
  }
}

/**
 * The sheet's answer. "on": the OS prompt (via register()), then the token is saved (save()). "not_now": counted.
 * register / save are passed in so this module stays free of the api client (and testable).
 */
export async function answer(choice, { register, save, now = Date.now() } = {}) {
  showing = false;
  const s = await readState();
  if (choice === "on") {
    await writeState({ asks: s.asks + 1, lastAskAt: now, answered: "on" });
    try {
      const token = register ? await register() : null;
      if (token && save) await save(token);
      return { granted: !!token };
    } catch {
      return { granted: false };
    }
  }
  await writeState({ asks: s.asks + 1, lastAskAt: now, answered: "not_now" });
  return { granted: false };
}

export const _test = { reset: () => { showing = false; listeners.clear(); } };
