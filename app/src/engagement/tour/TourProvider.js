// app/src/engagement/tour/TourProvider.js
// The app tour (5 tab steps, see tourSteps.js).
//   • auto-starts once per ACCOUNT on this phone (key per user id), never for guests
//   • only on Home, after Home has loaded, with every tab target registered,
//     the app in the foreground and nothing holding the tour (tourGate:
//     celebrations, app alerts, permission prompts)
//   • skip, hardware back and "let's go" all count as done
//   • replay from Settings (start()) works any time for the signed-in account
// Storage moved to v2 so students who saw the old 4-step tour see this one once.
import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { isTourHeld } from './tourGate';
import { TOUR_STEPS } from './tourSteps';

export const TourContext = createContext(null);

const KEY_PREFIX = '@tdc_tour_v2_done:';
const SETTLE_MS = 1500; // let Home's first popups (celebrations, alerts) arrive first
const POLL_MS = 400;
const MAX_WAIT_MS = 30000; // give up for this visit if something keeps holding the tour

export function TourProvider({ children }) {
  const { user, isGuest, token } = useContext(AuthContext);
  const userId = user?._id || user?.id || null;
  const signedIn = !!token && !isGuest && !!userId;

  const [running, setRunning] = useState(false);
  const [doneFor, setDoneFor] = useState({}); // { [userId]: true | false }
  const [homeReady, setHomeReady] = useState(false);
  const [targetsVersion, setTargetsVersion] = useState(0);
  const targetsRef = useRef(new Map());
  const runningRef = useRef(false);
  runningRef.current = running;

  // Read this account's flag
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

  // Account changed or signed out → stop a running tour
  useEffect(() => {
    if (!signedIn) setRunning(false);
  }, [signedIn, userId]);

  const registerTarget = useCallback((id, ref) => {
    if (!ref) return;
    targetsRef.current.set(id, ref);
    setTargetsVersion((v) => v + 1);
  }, []);

  const unregisterTarget = useCallback((id) => {
    targetsRef.current.delete(id);
  }, []);

  const getTargets = useCallback(() => targetsRef.current, []);

  // Replay (Settings) — explicit, so it runs even if this account already finished
  const start = useCallback(() => {
    setRunning(true);
  }, []);

  // Done, skip and hardware back all end here
  const stop = useCallback(async () => {
    setRunning(false);
    if (!userId) return;
    setDoneFor((m) => ({ ...m, [userId]: true }));
    try {
      await AsyncStorage.setItem(KEY_PREFIX + userId, '1');
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

  // ── Auto-start
  useEffect(() => {
    if (!signedIn || running || !homeReady) return undefined;
    if (doneFor[userId] !== false) return undefined; // unknown yet, or already done
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
  }, [signedIn, userId, running, homeReady, doneFor, targetsVersion]);

  const value = {
    running,
    start,
    stop,
    resetTour,
    hasEverCompleted: userId ? doneFor[userId] ?? null : null,
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
