// app/src/engagement/tour/TourProvider.js
// The app tour (5 tab steps, see tourSteps.js).
//   • auto-starts once per DEVICE on a fresh install: right after the intro cards,
//     on Home, for guests too (device key below, "pending" until finished/skipped)
//   • existing installs (intro skipped because the app was used before): guests get
//     no tour; signed-in students keep the old per-account rule (@tdc_tour_v2_done:<id>)
//   • a fresh install that signs in to an account that already completed the tour
//     (old per-account key) doesn't get it again
//   • only on Home, after Home has loaded, with every tab target registered, the app
//     in the foreground and nothing holding the tour (tourGate: celebrations, app
//     alerts, permission prompts, the guest sign-up sheet)
//   • skip, hardware back and "let's go" all count as done: the device key is set and
//     the tour never auto-starts on this phone again (sign up / sign in included).
//     Killing the app mid-tour doesn't count; it starts from step 1 next time.
//   • replay from Settings (start()) works any time
import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { isTourHeld } from './tourGate';
import { TOUR_STEPS } from './tourSteps';

export const TourContext = createContext(null);

const KEY_PREFIX = '@tdc_tour_v2_done:'; // old per-account key (read; written on finish as before)
const DEVICE_KEY = '@tdc_tour_device_v1_done'; // "pending" (fresh install, not done yet) | "1" (done)
const SETTLE_MS = 1500; // let Home's first popups (celebrations, alerts) arrive first
const POLL_MS = 400;
const MAX_WAIT_MS = 30000; // give up for this visit if something keeps holding the tour

// Splash calls this when the intro cards finish on a fresh install
let deviceListener = null;
export async function markTourPendingForNewInstall() {
  try {
    const v = await AsyncStorage.getItem(DEVICE_KEY);
    if (v == null) {
      await AsyncStorage.setItem(DEVICE_KEY, 'pending');
      deviceListener?.('pending');
    }
  } catch {}
}

export function TourProvider({ children }) {
  const { user, isGuest, token } = useContext(AuthContext);
  const userId = user?._id || user?.id || null;
  const signedIn = !!token && !isGuest && !!userId;
  const guest = !!isGuest && !signedIn;

  const [running, setRunning] = useState(false);
  const [doneFor, setDoneFor] = useState({}); // { [userId]: true | false }
  const [device, setDevice] = useState(undefined); // undefined (reading) | null | "pending" | "1"
  const [homeReady, setHomeReady] = useState(false);
  const [targetsVersion, setTargetsVersion] = useState(0);
  const targetsRef = useRef(new Map());
  const runningRef = useRef(false);
  runningRef.current = running;

  // Device flag (and live updates from the splash)
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(DEVICE_KEY)
      .then((v) => alive && setDevice(v === '1' || v === 'pending' ? v : null))
      .catch(() => alive && setDevice(null));
    deviceListener = (v) => alive && setDevice(v);
    return () => {
      alive = false;
      deviceListener = null;
    };
  }, []);

  // This account's old flag
  useEffect(() => {
    if (!userId || doneFor[userId] !== undefined) return;
    let alive = true;
    AsyncStorage.getItem(KEY_PREFIX + userId)
      .then((v) => alive && setDoneFor((m) => ({ ...m, [userId]: v === '1' })))
      .catch(() => alive && setDoneFor((m) => ({ ...m, [userId]: false })));
    return () => {
      alive = false;
    };
  }, [userId, doneFor]);

  // Nobody in the app any more (logout) → stop a running tour
  useEffect(() => {
    if (!signedIn && !guest) setRunning(false);
  }, [signedIn, guest, userId]);

  const registerTarget = useCallback((id, ref) => {
    if (!ref) return;
    targetsRef.current.set(id, ref);
    setTargetsVersion((v) => v + 1);
  }, []);

  const unregisterTarget = useCallback((id) => {
    targetsRef.current.delete(id);
  }, []);

  const getTargets = useCallback(() => targetsRef.current, []);

  // Replay (Settings) — explicit, so it runs even if already finished
  const start = useCallback(() => {
    setRunning(true);
  }, []);

  // Done, skip and hardware back all end here
  const stop = useCallback(async () => {
    setRunning(false);
    setDevice('1');
    if (userId) setDoneFor((m) => ({ ...m, [userId]: true }));
    try {
      await AsyncStorage.setItem(DEVICE_KEY, '1');
      if (userId) await AsyncStorage.setItem(KEY_PREFIX + userId, '1');
    } catch {}
  }, [userId]);

  const resetTour = useCallback(async () => {
    if (!userId) return;
    setDoneFor((m) => ({ ...m, [userId]: false }));
    try {
      await AsyncStorage.removeItem(KEY_PREFIX + userId);
    } catch {}
  }, [userId]);

  // Home tells us when it's focused and has loaded (Home.js)
  const setHomeLoaded = useCallback((ready) => setHomeReady(!!ready), []);

  // Should the tour start by itself? (null = not known yet)
  let shouldAutoStart = false;
  if (device === '1' || device === undefined) shouldAutoStart = false;
  else if (device === 'pending') {
    if (guest) shouldAutoStart = true;
    else if (signedIn) shouldAutoStart = doneFor[userId] === false; // wait for the read; done elsewhere → no
  } else if (signedIn) {
    shouldAutoStart = doneFor[userId] === false; // existing install: the old per-account rule
  }

  // ── Auto-start
  useEffect(() => {
    if (!shouldAutoStart || running || !homeReady) return undefined;
    const allTargets = TOUR_STEPS.every((s) => targetsRef.current.has(s.id));
    if (!allTargets) return undefined;

    let cancelled = false;
    let timer = null;
    let clearChecks = 0;
    const startedAt = Date.now();
    const check = () => {
      if (cancelled) return;
      if (Date.now() - startedAt > MAX_WAIT_MS) return;
      const clear = !isTourHeld() && AppState.currentState === 'active';
      clearChecks = clear ? clearChecks + 1 : 0;
      if (clearChecks >= 2 && !runningRef.current) {
        setRunning(true);
        return;
      }
      timer = setTimeout(check, POLL_MS);
    };
    timer = setTimeout(check, SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shouldAutoStart, running, homeReady, targetsVersion]);

  const value = {
    running,
    start,
    stop,
    resetTour,
    hasEverCompleted: device === '1' ? true : userId ? doneFor[userId] ?? null : null,
    registerTarget,
    unregisterTarget,
    getTargets,
    setHomeLoaded,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside <TourProvider />');
  return ctx;
};

export default TourProvider;
