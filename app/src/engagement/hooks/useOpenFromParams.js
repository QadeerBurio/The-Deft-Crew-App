// app/src/engagement/hooks/useOpenFromParams.js
// Opens one item when a screen is reached with a param, e.g.
//   navigate('Career', { openJobId })   → job details open
//   navigate('Events', { openEventId }) → event sheet opens
// Used by the Daily Drop card and Daily Drop push taps.
//
// open(value) may be async. Return false to retry later (data not loaded yet).
// Once handled, the param is cleared so going back/forward doesn't reopen it.

import { useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';

export function useOpenFromParams(key, open, ready = true) {
  const route = useRoute();
  const navigation = useNavigation();
  const value = route?.params?.[key];
  const handledRef = useRef(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!value) {
      handledRef.current = null;
      return;
    }
    if (!ready || handledRef.current === value) return;

    let cancelled = false;
    (async () => {
      let ok = false;
      try {
        ok = await openRef.current(value);
      } catch (e) {
        console.log(`[openFromParams] ${key} failed:`, e?.message);
        ok = true; // don't loop on errors
      }
      if (cancelled || ok === false) return;
      handledRef.current = value;
      try {
        navigation.setParams({ [key]: undefined });
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [value, ready, key, navigation]);
}

export default useOpenFromParams;
