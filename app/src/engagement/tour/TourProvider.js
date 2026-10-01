// app/src/engagement/tour/TourProvider.js
import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TourContext = createContext(null);

const STORAGE_KEY = '@tdc_tour_completed_v1';

export function TourProvider({ children }) {
  const [running, setRunning] = useState(false);
  const [hasEverCompleted, setHasEverCompleted] = useState(null); // null=unknown, true/false
  const targetsRef = useRef(new Map());

  // ── On mount: check if user has ever finished the tour on this device
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        setHasEverCompleted(v === '1');
      } catch {
        setHasEverCompleted(false);
      }
    })();
  }, []);

  const registerTarget = useCallback((id, ref) => {
    targetsRef.current.set(id, ref);
  }, []);

  const unregisterTarget = useCallback((id) => {
    targetsRef.current.delete(id);
  }, []);

  const start = useCallback(() => {
    // Prevent double-start if already running
    setRunning((prev) => (prev ? prev : true));
  }, []);

  const stop = useCallback(async () => {
    setRunning(false);
    // Persist completion so it never auto-runs again
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
      setHasEverCompleted(true);
    } catch {}
  }, []);

  const resetTour = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setHasEverCompleted(false);
    } catch {}
  }, []);

  const getTargets = useCallback(() => targetsRef.current, []);

  // ── AUTO-START: only if the user has never seen the tour AND we know
  //    that at least one of the tab targets is registered (i.e. the tab
  //    bar is mounted). Runs once per device.
  useEffect(() => {
    if (hasEverCompleted !== false) return;
    if (running) return;

    // Wait a moment for the tab bar to mount + register its refs
    let attempts = 0;
    const tick = () => {
      attempts += 1;
      const targets = targetsRef.current;
      if (targets.has('tab_home')) {
        setRunning(true);
        return;
      }
      if (attempts < 20) {
        setTimeout(tick, 200);
      }
    };
    const id = setTimeout(tick, 800); // 800ms after mount
    return () => clearTimeout(id);
  }, [hasEverCompleted, running]);

  const value = {
    running,
    start,
    stop,
    resetTour,
    hasEverCompleted,
    registerTarget,
    unregisterTarget,
    getTargets,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside <TourProvider />');
  return ctx;
};

export default TourProvider;