// app/src/screens/home/homeData.js
// Data helpers for the Home sections. Existing endpoints only:
//   • latest confession → GET {social}/confessions/feed?scope=all (same as ConfessionScreen)
//   • deals            → optimizedAPI.getBrandsFast (same as Brands)
import { optimizedAPI } from "../../api/brandApi";

// Same value ConfessionScreen.js hard-codes
const SOCIAL_API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

export const LATEST_CONFESSION_KEY = (userId) => ["home", "latestConfession", userId];
export const DEALS_KEY = (userId) => ["home", "deals", userId];

const MAX_DEALS = 6;

// Dev-only, once per label, so a failing section doesn't spam the console
const logged = new Set();
export const devLogOnce = (label, err) => {
  if (!__DEV__ || logged.has(label)) return;
  logged.add(label);
  console.log(`[Home] ${label}:`, err?.message || err);
};

// Newest confession that has text (image-only posts are skipped).
// The feed endpoint returns the whole feed; the backend needs a light
// "latest confession" endpoint later.
export async function fetchLatestConfession(token, signal) {
  const res = await fetch(`${SOCIAL_API_URL}/confessions/feed?scope=all`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : [];
  const found = list.find((c) => typeof c?.text === "string" && c.text.trim().length > 0);
  if (!found) return null;
  return {
    _id: found._id,
    text: found.text.trim(),
    likes: Number(found.likes) || 0,
    comments: Array.isArray(found.comments) ? found.comments.length : 0,
    createdAt: found.createdAt || null,
  };
}

// First brands with an offer, in API order (newest first)
export async function fetchDeals(token, userId, forceRefresh = false) {
  const brands = await optimizedAPI.getBrandsFast(token, userId, { forceRefresh });
  return (Array.isArray(brands) ? brands : []).filter((b) => b?.hasOffer === true).slice(0, MAX_DEALS);
}

// Same rules as ConfessionScreen's formatPostTime (not exported there), lowercase
export function relativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
}
