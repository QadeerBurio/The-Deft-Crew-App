// app/src/lib/homeCache.js
// Home's last good data, kept on the phone so a cold start shows it at once while the fresh
// copy loads (stale-while-revalidate). One entry per name, for the signed-in user only:
// another user's (or a guest's) entry is never shown and is replaced by the next write.
// Older than 24 h → ignored. Never throws; storage problems just mean no cache.
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "tdc.homeCache.v1.";
export const HOME_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// { data, savedAt } or null
export async function readHomeCache(name, owner) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + name);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || entry.owner !== String(owner)) return null;
    if (!(Date.now() - entry.savedAt < HOME_CACHE_MAX_AGE_MS)) return null;
    return { data: entry.data, savedAt: entry.savedAt };
  } catch {
    return null;
  }
}

export function writeHomeCache(name, owner, data) {
  if (data == null || (Array.isArray(data) && data.length === 0)) return;
  try {
    AsyncStorage.setItem(PREFIX + name, JSON.stringify({ owner: String(owner), savedAt: Date.now(), data })).catch(() => {});
  } catch {}
}

// Removes entries saved for anyone but `owner` (another user, or a guest). Shared public
// entries (owner "all", e.g. the slider) stay.
const PER_USER = ["deals", "publicDeals", "engagementMe"];
export async function pruneHomeCache(owner) {
  try {
    const rows = await AsyncStorage.multiGet(PER_USER.map((n) => PREFIX + n));
    const stale = rows
      .filter(([, raw]) => {
        if (!raw) return false;
        try { return JSON.parse(raw)?.owner !== String(owner); } catch { return true; }
      })
      .map(([key]) => key);
    if (stale.length) await AsyncStorage.multiRemove(stale);
  } catch {}
}

// Seeds a React Query entry from the phone cache when it has no data yet. updatedAt is the
// save time, so the query still counts as stale and refetches as usual.
// Returns the seeded data (or null).
export async function hydrateQuery(queryClient, queryKey, name, owner) {
  if (queryClient.getQueryData(queryKey) !== undefined) return null;
  const hit = await readHomeCache(name, owner);
  if (!hit || queryClient.getQueryData(queryKey) !== undefined) return null;
  queryClient.setQueryData(queryKey, hit.data, { updatedAt: hit.savedAt });
  return hit.data;
}
