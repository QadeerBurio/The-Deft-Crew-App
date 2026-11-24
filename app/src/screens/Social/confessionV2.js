// app/src/screens/Social/confessionV2.js
// P4a confessions v2 (flag confessionsV2): pure helpers for the feed, the composer and the card.
//   SORTS                         hot (default) · new · top this week
//   feedQuery({ scope, v2, sort, tag, saved })   the feed's query string; v2 off: exactly today's (?scope=…)
//   viewKey({ scope, v2, sort, tag })     the cache / "still the same view" key; v2 off: the scope, as today
//   avatarFor(handle)             a Dot face + colour for a handle (the same handle always gets the same one)
//   MAX_LENGTH                    500 characters in the v2 composer (the server takes up to 1,000 from older apps)
import { MOODS, MOOD_COLORS } from "../../engagement/utils/mood";

export const SORTS = Object.freeze([
  { key: "hot", label: "hot", icon: "flame-outline" },
  { key: "new", label: "new", icon: "time-outline" },
  { key: "top", label: "top this week", icon: "trending-up-outline" },
]);
export const MAX_LENGTH = 500;

export function feedQuery({ scope, v2 = false, sort = "hot", tag = null, saved = false }) {
  let q = `scope=${scope}`;
  if (!v2) return q;
  q += `&sort=${encodeURIComponent(sort)}`;
  if (tag) q += `&tag=${encodeURIComponent(tag)}`;
  if (saved) q += "&saved=1"; // P4b: only my saved confessions
  if (sort === "hot" || sort === "top") q += "&limit=50"; // ranked: the top 50 (new: the whole feed, as today)
  return q;
}

export const viewKey = ({ scope, v2 = false, sort = "hot", tag = null, saved = false }) => (v2 ? `${scope}|${sort}|${tag || ""}${saved ? "|saved" : ""}` : scope);

export function avatarFor(handle) {
  const s = String(handle || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const mood = MOODS[h % MOODS.length];
  return { mood, color: MOOD_COLORS[mood] };
}
