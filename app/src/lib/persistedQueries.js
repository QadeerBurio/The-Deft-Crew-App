// app/src/lib/persistedQueries.js — Q-3c "instant reopen", flag persistCache (off by default).
// Saves a few read-only, non-sensitive React Query results on the phone, so Home opens with the last known deals and
// points at once and refreshes quietly (the normal fetch still runs; newer data always wins).
//   saved:     Home's deals (personal and public), the student's engagement summary (points, streak, missions),
//              today's drop
//   never:     anything with a location (nearby), confession text, referral lists, savings, anything else
// The saved copy belongs to one account: it is restored only for that account, and deleted when the account
// changes or signs out (and after 24 hours). Built on React Query's own dehydrate / hydrate and the approved
// @tanstack/query-async-storage-persister (save / restore / remove only).
import { useContext, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { dehydrate, hydrate, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../context/AuthContext";
import useFlag from "../hooks/useFlag";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

import { QUERY_CACHE_KEY } from "./queryCacheKey";

export const STORAGE_KEY = QUERY_CACHE_KEY;
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const BUSTER = "1"; // bump when a saved shape changes

/** the query keys that may be saved (read-only, nothing sensitive) */
export function persistable(queryKey) {
  if (!Array.isArray(queryKey)) return false;
  const [a, b] = queryKey;
  if (a === "home") return b === "deals" || b === "publicDeals";
  if (a === "engagement") return b === "me" || b === "drop";
  return false;
}

let persister = null;
const getPersister = () => (persister ||= createAsyncStoragePersister({ storage: AsyncStorage, key: STORAGE_KEY, throttleTime: 2000 }));

/** forget the saved copy (sign-out, another account) */
export async function clearPersistedQueries() {
  try { await getPersister().removeClient(); } catch {}
}

/**
 * Restores the saved copy for `userId` (when it is theirs, recent and the same shape), then keeps saving the
 * allowed queries as they change. Returns a stop function.
 */
export async function startQueryPersistence(queryClient, userId, { now = () => Date.now() } = {}) {
  const p = getPersister();
  let stopped = false;
  try {
    const saved = await p.restoreClient();
    const fresh = saved && saved.buster === BUSTER && saved.userId === userId && now() - (saved.timestamp || 0) <= MAX_AGE_MS;
    if (fresh && !stopped) hydrate(queryClient, saved.clientState);
    else if (saved) await p.removeClient();
  } catch {}
  const save = () => {
    if (stopped) return;
    try {
      const clientState = dehydrate(queryClient, { shouldDehydrateQuery: (q) => q.state.status === "success" && persistable(q.queryKey), shouldDehydrateMutation: () => false });
      p.persistClient({ timestamp: now(), buster: BUSTER, userId, clientState });
    } catch {}
  };
  const unsubscribe = queryClient.getQueryCache().subscribe((e) => { if (e && e.query && persistable(e.query.queryKey)) save(); });
  return () => { stopped = true; try { unsubscribe(); } catch {} };
}

/**
 * Hook for the root: while `enabled` and someone is signed in, restore + keep saving for that account. A change of
 * account or a sign-out deletes the saved copy; the flag off deletes it too (nothing stays on the phone).
 */
// `flag`: true / false, or null while the flags are still loading (then nothing is saved, restored or deleted).
// `userId`: the signed-in account, or null (signed out, a guest, or not loaded yet). The saved copy is deleted only
// when the flag is known to be off, or when a known account signs out or changes (never while loading).
export function useQueryPersistence(queryClient, userId, flag) {
  const prevUser = useRef(undefined);
  useEffect(() => {
    const before = prevUser.current;
    prevUser.current = userId;
    if (flag === false) { clearPersistedQueries(); return undefined; }
    if (before && before !== userId) clearPersistedQueries(); // signed out, or another account
    if (flag !== true || !userId) return undefined;
    let stop = null; let live = true;
    startQueryPersistence(queryClient, userId).then((s) => { if (live) stop = s; else s(); });
    return () => { live = false; if (stop) stop(); };
  }, [queryClient, userId, flag]);
}

/** mounted once at the root (App.js, inside the query and auth providers): renders nothing */
export default function QueryPersistHost() {
  const queryClient = useQueryClient();
  const { user, isGuest } = useContext(AuthContext) || {};
  const userId = !isGuest && user ? String(user._id || user.id || "") || null : null;
  useQueryPersistence(queryClient, userId, useFlag("persistCache"));
  return null;
}
