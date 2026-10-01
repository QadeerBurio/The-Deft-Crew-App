// app/src/engagement/EngagementProvider.js
// Root provider: exposes { me, flags, refresh, celebrate, isLoading, error }
// - Reads /engagement/me via React Query
// - Refetches on AppState → active, and every 60s while foreground
// - Listens to engagementBus for popups emitted by the axios interceptor
// - Calls celebrate() after any successful write that returns an `engagement` field

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import engagementApi from './api/engagementApi';
import { engagementBus, ENGAGEMENT_EVENTS } from './engagementBus';
import { pop } from './utils/haptics';

export const EngagementContext = createContext(null);

const POLL_INTERVAL = 60_000; // 60s
const SESSION_GAP = 30 * 60 * 1000; // 30 min

// 🆕 Normalize a popup — always expose a stable `id` string
function normalizePopup(p) {
  if (!p) return null;
  const id = String(p.id || p._id || '');
  if (!id) return null;
  return { ...p, id };
}

export function EngagementProvider({ children }) {
  const { token, isGuest } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const appStateRef = useRef(AppState.currentState);
  const lastBackgroundAtRef = useRef(null);
  const pendingPopupsRef = useRef([]);
  const sessionStartRef = useRef(Date.now());

  // 🆕 ackedIds — block re-showing of acked popups for this session
  const [ackedIds, setAckedIds] = useState(() => new Set());

  const enabled = !!token && !isGuest;

  // ── Fetch /engagement/me ─────────────────────────────
  const {
    data: me,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['engagement', 'me'],
    queryFn: engagementApi.getMe,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
  });

  // ── Refetch on AppState active + 60s foreground poll ──
  useEffect(() => {
    if (!enabled) return;

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev.match(/inactive|background/) && next === 'active') {
        if (lastBackgroundAtRef.current) {
          const gap = Date.now() - lastBackgroundAtRef.current;
          if (gap > SESSION_GAP) {
            sessionStartRef.current = Date.now();
          }
        }
        refetch();
      }
      if (next === 'background') {
        lastBackgroundAtRef.current = Date.now();
      }
    });

    const interval = setInterval(() => {
      if (appStateRef.current === 'active') refetch();
    }, POLL_INTERVAL);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [enabled, refetch]);

  // ── Merge popups emitted from the axios interceptor ──
  useEffect(() => {
    const off = engagementBus.on(
      ENGAGEMENT_EVENTS.POPUPS_QUEUED,
      (popups) => {
        if (!Array.isArray(popups) || popups.length === 0) return;
        const normalized = popups
          .map(normalizePopup)
          .filter(Boolean);
        if (normalized.length === 0) return;
        pendingPopupsRef.current = [
          ...pendingPopupsRef.current,
          ...normalized,
        ];
        queryClient.invalidateQueries({ queryKey: ['engagement'] });
        pop();
      }
    );
    return off;
  }, [queryClient]);

  // ── Sync pending popups into `me` — filter acked + dedupe ──
  const pendingPopups = useMemo(() => {
    const fromServer = (me?.popups || []).map(normalizePopup).filter(Boolean);
    const fromLocal = pendingPopupsRef.current.map(normalizePopup).filter(Boolean);

    const seen = new Set();
    const merged = [];

    for (const p of [...fromServer, ...fromLocal]) {
      const id = p.id;
      if (seen.has(id)) continue;
      if (ackedIds.has(id)) continue;   // 🆕 skip acked
      seen.add(id);
      merged.push(p);
    }

    merged.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return merged;
  }, [me?.popups, ackedIds]);

  // ── Explicit celebrate() for callers that opt in ──────
  const celebrate = useCallback(
    (engagementResult) => {
      if (!engagementResult) return;
      const popups = engagementResult.popups;
      if (Array.isArray(popups) && popups.length > 0) {
        engagementBus.emit(ENGAGEMENT_EVENTS.POPUPS_QUEUED, popups);
      }
      queryClient.invalidateQueries({ queryKey: ['engagement'] });
    },
    [queryClient]
  );

  // ── Ack a popup after showing it ──────────────────────
  const ackPopup = useCallback(
    async (popupId) => {
      if (!popupId) return;
      const id = String(popupId);

      // 1. Mark locally as acked — hides from pendingPopups instantly
      setAckedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      // 2. Strip from local buffer (works with both `id` and `_id`)
      pendingPopupsRef.current = pendingPopupsRef.current.filter(
        (p) => String(p.id || p._id) !== id
      );

      // 3. Fire API — never block UI on failure
      try {
        await engagementApi.ackPopup(id);
      } catch (e) {
        console.log('[engagement] ack popup error:', e?.message);
      }

      // 4. Invalidate — server refetch without this popup
      queryClient.invalidateQueries({ queryKey: ['engagement'] });
    },
    [queryClient]
  );

  const value = useMemo(
    () => ({
      me: me || null,
      flags: me?.flags || {
        tour: true,
        missions: true,
        dailyDrop: true,
        popups: true,
        soloStreak: false,
        badges: false,
        savingsCounter: true,
      },
      pendingPopups,
      isLoading,
      isRefreshing: isFetching,
      error: error || null,
      refresh: refetch,
      celebrate,
      ackPopup,
      isGuest: !!isGuest,
      sessionStart: sessionStartRef.current,
    }),
    [
      me,
      pendingPopups,
      isLoading,
      isFetching,
      error,
      refetch,
      celebrate,
      ackPopup,
      isGuest,
    ]
  );

  return (
    <EngagementContext.Provider value={value}>
      {children}
    </EngagementContext.Provider>
  );
}

export const useEngagementContext = () => {
  const ctx = useContext(EngagementContext);
  if (!ctx) {
    throw new Error(
      'useEngagementContext must be used inside <EngagementProvider />'
    );
  }
  return ctx;
};

export default EngagementProvider;