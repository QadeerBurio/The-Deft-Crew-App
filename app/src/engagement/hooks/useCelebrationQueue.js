// app/src/engagement/hooks/useCelebrationQueue.js
// ✅ FIXED:
//   • shownIdsRef is keyed off sessionStart so it resets on session roll
//   • Popups are removed from provider state on ack → no reappearing
//   • No infinite ack loop
//   • Skips while keyboard visible

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Keyboard } from 'react-native';
import { useEngagement } from './useEngagement';

const SESSION_GAP = 30 * 60 * 1000;

export function useCelebrationQueue() {
  const { pendingPopups, ackPopup, sessionStart } = useEngagement();

  const [current, setCurrent] = useState(null);
  const [sessionId, setSessionId] = useState(0);

  // Popups shown this session (reset on session roll)
  const shownIdsRef = useRef(new Set());

  // Last-session-start ref for AppState gap detection
  const lastSessionRef = useRef(sessionStart || Date.now());
  const lastSessionIdRef = useRef(sessionId);

  // ── Session roll when AppState returns to active after >30 min ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;

      const gap = Date.now() - lastSessionRef.current;
      if (gap > SESSION_GAP) {
        lastSessionRef.current = Date.now();
        shownIdsRef.current = new Set();
        setSessionId((id) => id + 1);
      }
    });
    return () => sub.remove();
  }, []);

  // ── React to provider-driven session roll ──
  useEffect(() => {
    if (lastSessionIdRef.current !== sessionId) {
      lastSessionIdRef.current = sessionId;
      lastSessionRef.current = Date.now();
      shownIdsRef.current = new Set();
    }
  }, [sessionId]);

  // ── Pick the next popup when idle ──
  useEffect(() => {
    // Already showing one
    if (current) return;

    // Defer while keyboard visible
    const kbVisible = Keyboard.isVisible && Keyboard.isVisible();
    if (kbVisible) return;

    if (!pendingPopups || pendingPopups.length === 0) return;

    // Find first popup we HAVEN'T shown this session
    const next = pendingPopups.find(
      (p) => p?.id && !shownIdsRef.current.has(String(p.id))
    );

    if (!next) {
      // Every remaining popup has been shown this session.
      // Ack them so the server cleans up. Provider dedupes ack calls.
      pendingPopups.forEach((p) => {
        if (!p?.id) return;
        const idStr = String(p.id);
        if (shownIdsRef.current.has(idStr)) {
          ackPopup(idStr).catch(() => {});
        }
      });
      return;
    }

    // fully_sorted wins if present (highest priority)
    const fullSorted = pendingPopups.find(
      (p) =>
        p?.kind === 'fully_sorted' &&
        !shownIdsRef.current.has(String(p.id))
    );
    const chosen = fullSorted || next;

    // Mark shown BEFORE displaying to prevent duplicates
    shownIdsRef.current.add(String(chosen.id));
    setCurrent(chosen);
  }, [pendingPopups, current, sessionId, ackPopup]);

  // ── Close + ack + advance ──
  const onClose = useCallback(
    async (ack = true) => {
      const id = current?.id;

      // Optimistic: unmount immediately
      setCurrent(null);

      if (ack && id) {
        try {
          await ackPopup(id);
        } catch (e) {
          console.log('[CelebrationQueue] ack error:', e?.message);
        }
      }
    },
    [current, ackPopup]
  );

  return {
    current,
    onClose,
    dismiss: () => onClose(true),
    notNow: () => onClose(true),
  };
}

export default useCelebrationQueue;