// app/src/screens/Events/useSavedEvents.js
// Saved events, stored on the device per student: @tdc_saved_events:<userId>.
// The server has no save / favourite endpoint for events, so nothing is sent anywhere.
//   • guests (or no user id): always empty, nothing read or written
//   • another account signs in: its own key is read; nobody else's list is touched
//   • prune(validIds): drops saved ids that are no longer in the live list, quietly
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "@tdc_saved_events:";

export default function useSavedEvents(userId) {
  const [ids, setIds] = useState([]);
  const ownerRef = useRef(null);

  // Load the signed-in student's list; reset for guests and on account change
  useEffect(() => {
    ownerRef.current = userId || null;
    setIds([]);
    if (!userId) return undefined;
    let alive = true;
    AsyncStorage.getItem(KEY_PREFIX + userId)
      .then((raw) => {
        if (!alive || ownerRef.current !== userId) return;
        const list = raw ? JSON.parse(raw) : [];
        setIds(Array.isArray(list) ? list.map(String) : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const persist = useCallback(
    (next) => {
      if (!userId || ownerRef.current !== userId) return;
      AsyncStorage.setItem(KEY_PREFIX + userId, JSON.stringify(next)).catch(() => {});
    },
    [userId]
  );

  const isSaved = useCallback((id) => ids.includes(String(id)), [ids]);

  const toggle = useCallback(
    (id) => {
      if (!userId || !id) return;
      const key = String(id);
      setIds((prev) => {
        const next = prev.includes(key) ? prev.filter((x) => x !== key) : [key, ...prev];
        persist(next);
        return next;
      });
    },
    [userId, persist]
  );

  // Keep only ids that are still live (events removed or past are dropped quietly)
  const prune = useCallback(
    (validIds) => {
      if (!userId) return;
      const valid = new Set((validIds || []).map(String));
      setIds((prev) => {
        const next = prev.filter((x) => valid.has(x));
        if (next.length === prev.length) return prev;
        persist(next);
        return next;
      });
    },
    [userId, persist]
  );

  return { savedIds: ids, isSaved, toggle, prune };
}
