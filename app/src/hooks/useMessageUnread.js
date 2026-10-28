// app/src/hooks/useMessageUnread.js
// One shared "unread messages" number for the tab bar's Social badge, Social's Messages tab
// and the Messages screen. Before, the tab bar fetched GET /social/inbox on every tab change,
// Social polled it every 30 s from launch, and Messages fetched it again.
// Refreshes: on first use, when the app comes back to the foreground, every 60 s while the app
// is active and something shows the number, and from the inbox the Messages screen loads
// (setMessageUnread, no extra request). One request at a time, at most one per 5 s unless forced.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import axios from "axios";

const INBOX_URL = "https://the-deft-crew-production.up.railway.app/api/social/inbox";
const POLL_MS = 60_000;
const MIN_GAP_MS = 5_000;

let unread = 0;
let token = null;
let inFlight = null;
let lastAt = 0;
let timer = null;
let appSub = null;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());
const set = (n) => {
  const v = Math.max(0, Number(n) || 0);
  if (v !== unread) {
    unread = v;
    emit();
  }
};

// The Messages screen already has the inbox: it reports its own total here
export function setMessageUnread(n) {
  set(n);
  lastAt = Date.now();
}

export function refreshMessageUnread({ force = false } = {}) {
  if (!token) {
    set(0);
    return Promise.resolve(0);
  }
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastAt < MIN_GAP_MS) return Promise.resolve(unread);
  const forToken = token;
  const request = axios
    .get(INBOX_URL, { headers: { Authorization: `Bearer ${forToken}` } })
    .then((res) => {
      // a sign-out or account switch meanwhile: drop the old account's answer
      if (forToken === token && Array.isArray(res?.data)) {
        set(res.data.reduce((sum, c) => sum + (c?.unreadCount || 0), 0));
        lastAt = Date.now();
      }
      return unread;
    })
    .catch(() => unread)
    .finally(() => {
      if (inFlight === request) inFlight = null;
    });
  inFlight = request;
  return request;
}

function setToken(t) {
  const next = t || null;
  if (next === token) return;
  token = next;
  lastAt = 0;
  inFlight = null; // a request for the previous account must not answer for this one
  set(0);
  if (token) refreshMessageUnread({ force: true });
}

function startTimers() {
  if (!timer) {
    timer = setInterval(() => {
      if (AppState.currentState === "active") refreshMessageUnread();
    }, POLL_MS);
  }
  if (!appSub) {
    let prev = AppState.currentState;
    appSub = AppState.addEventListener("change", (next) => {
      if (/inactive|background/.test(prev || "") && next === "active") refreshMessageUnread({ force: true });
      prev = next;
    });
  }
}

function stopTimers() {
  if (timer) clearInterval(timer);
  timer = null;
  appSub?.remove();
  appSub = null;
}

// timers run only while something shows the number
const subscribe = (listener) => {
  listeners.add(listener);
  if (listeners.size === 1) startTimers();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) stopTimers();
  };
};
const getSnapshot = () => unread;

export function useMessageUnread(authToken, isGuest) {
  const t = !isGuest && authToken ? authToken : null;
  useEffect(() => {
    setToken(t);
  }, [t]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const refresh = useCallback(() => refreshMessageUnread({ force: true }), []);
  return { unread: t ? value : 0, refresh };
}

// for tests
export const _test = {
  reset() {
    stopTimers();
    listeners.clear();
    unread = 0;
    token = null;
    inFlight = null;
    lastAt = 0;
  },
  get timerRunning() {
    return !!timer;
  },
};

export default useMessageUnread;
