// app/src/screens/home/homeData.js
// Data helpers for the Home sections. Existing endpoints only:
//   • latest confession → GET {social}/confessions/feed?scope=all (same as ConfessionScreen)
//   • deals            → optimizedAPI.getBrandsFast (same as Brands)
import api, { optimizedAPI } from "../../api/brandApi";
import { imageUrl, brandLogoUrl, withFixedImages, FALLBACK_IMAGE } from "../../utils/imageUrl";

// Same value ConfessionScreen.js hard-codes
const SOCIAL_API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

export const LATEST_CONFESSION_KEY = (userId) => ["home", "latestConfession", userId];
export const DEALS_KEY = (userId) => ["home", "deals", userId];
export const NEARBY_KEY = (userId, lat, lng) => ["home", "nearby", userId, lat, lng];

export const MAX_DEALS = 6;
export const PUBLIC_DEALS_KEY = ["home", "publicDeals"];
export const TOP_DISCOUNTS_MAX = 5;

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

// All brands with an offer, in API order (newest first). The near me section
// filters by city and takes the first MAX_DEALS.
export async function fetchDeals(token, userId, forceRefresh = false) {
  const brands = await optimizedAPI.getBrandsFast(token, userId, { forceRefresh });
  // getBrandsFast builds logo URLs with the old /uploads/brands/ rule: repair them
  return (Array.isArray(brands) ? brands : []).filter((b) => b?.hasOffer === true).map(withFixedImages);
}

// Image URLs: shared rule (utils/imageUrl), same as Brands and OfferScreen
const DEFAULT_IMAGE = FALLBACK_IMAGE;

// Guests (no token): the same brand + offer data from public endpoints only.
//   GET /brands             approved brands with their cities (same list Brands uses)
//   GET /offers/brandss     every brand's offers with discountPercentage (no auth)
// /offers/summary, which getBrandsFast uses, needs a token. Both group the same
// Offer documents, so the numbers match what a signed-in student sees.
export async function fetchPublicDeals(signal) {
  const [brandsRes, offersRes] = await Promise.all([
    api.get("/brands", { params: { limit: 200 }, signal, timeout: 8000, _skipDedup: true }),
    api.get("/offers/brandss", { signal, timeout: 10000, _skipDedup: true }),
  ]);
  const raw = brandsRes?.data;
  const brands = Array.isArray(raw) ? raw : raw?.data || raw?.brands || [];
  const offersByBrand = new Map(
    (Array.isArray(offersRes?.data?.brands) ? offersRes.data.brands : []).map((b) => [
      String(b?._id),
      Array.isArray(b?.offers) ? b.offers : [],
    ])
  );
  return brands
    .map((brand) => {
      const logo = brandLogoUrl(brand.logo);
      const offers = (offersByBrand.get(String(brand._id)) || []).map((o) => ({
        ...o,
        image: imageUrl(o.image),
        displayImage: imageUrl(o.image),
        isClaimed: false,
        serverClaimed: false,
        discountPercentage: o.discountPercentage || 0,
      }));
      const first = offers[0];
      return {
        ...brand,
        logo,
        offers,
        displayImage: first?.image || logo || DEFAULT_IMAGE,
        hasOffer: offers.length > 0,
        discount: first?.discountPercentage || 0,
        category: first?.category || brand.category || "General",
        isOnline: first?.isOnline || brand.isOnline || false,
        isInStore: first?.isInStore || brand.isInStore || false,
      };
    })
    .filter((b) => b.hasOffer);
}

// ── Guest deals cache ──
// /offers/brandss is public, uncached and heavy on the server, so a guest's Home
// reuses one result for 10 minutes across mounts and tab switches, never runs two
// requests at once, and a pull to refresh forces a new one at most every 30 s.
// A failed request is not tried again for a minute (no retry loop).
const PUBLIC_DEALS_TTL_MS = 10 * 60 * 1000;
const PUBLIC_DEALS_FORCE_GAP_MS = 30 * 1000;
const PUBLIC_DEALS_FAIL_PAUSE_MS = 60 * 1000;
let publicDealsCache = null; // { data, at }
let publicDealsInFlight = null;
let publicDealsForcedAt = 0;
let publicDealsFailedAt = 0;

export function clearPublicDealsCache() {
  publicDealsCache = null;
  publicDealsInFlight = null;
  publicDealsForcedAt = 0;
  publicDealsFailedAt = 0;
}

export async function getPublicDeals({ force = false } = {}) {
  const now = Date.now();
  const fresh = !!publicDealsCache && now - publicDealsCache.at < PUBLIC_DEALS_TTL_MS;
  const canForce = force && now - publicDealsForcedAt >= PUBLIC_DEALS_FORCE_GAP_MS;
  if (fresh && !canForce) return publicDealsCache.data;
  if (publicDealsInFlight) return publicDealsInFlight;
  if (!canForce && now - publicDealsFailedAt < PUBLIC_DEALS_FAIL_PAUSE_MS) {
    return publicDealsCache ? publicDealsCache.data : [];
  }
  if (canForce) publicDealsForcedAt = now;
  const run = fetchPublicDeals()
    .then((data) => {
      if (publicDealsInFlight === run) publicDealsCache = { data, at: Date.now() };
      return data;
    })
    .catch((e) => {
      if (publicDealsInFlight === run) publicDealsFailedAt = Date.now();
      throw e;
    })
    .finally(() => {
      if (publicDealsInFlight === run) publicDealsInFlight = null;
    });
  publicDealsInFlight = run;
  return run;
}

// ── Top discounts ──
// A real percentage: a number in (0, 100], or a string that is only a number
// ("60") or contains one followed by "%" ("60%", "60% off", "up to 60%").
// Text like "buy 1 get 1" has no "%" and is not a percentage.
export function parsePercent(v) {
  let n = null;
  if (typeof v === "number") n = v;
  else if (typeof v === "string") {
    const plain = v.match(/^\s*(\d+(?:\.\d+)?)\s*%?\s*$/);
    const withPct = v.match(/(\d+(?:\.\d+)?)\s*%/);
    const m = plain || withPct;
    n = m ? Number(m[1]) : null;
  }
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
}

// Highest real percentage on the brand or any of its offers, else null
export function topDiscountOf(brand) {
  const values = [
    brand?.discount,
    brand?.maxDiscount,
    brand?.discountPercentage,
    ...(Array.isArray(brand?.offers) ? brand.offers : []).flatMap((o) => [o?.discountPercentage, o?.discount]),
  ]
    .map(parsePercent)
    .filter((n) => n != null);
  return values.length ? Math.round(Math.max(...values)) : null;
}

const timeOf = (b) => {
  const t = new Date(b?.createdAt || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

// Brands with a real discount, highest first (ties: newest first), at most `max`.
// The card shows the brand's top percentage ("up to X% off").
export function rankTopDiscounts(list, max = TOP_DISCOUNTS_MAX) {
  return (Array.isArray(list) ? list : [])
    .map((b) => ({ b, top: topDiscountOf(b) }))
    .filter((x) => x.top != null)
    .sort((a, b) => b.top - a.top || timeOf(b.b) - timeOf(a.b))
    .slice(0, max)
    .map(({ b, top }) => ({ ...b, discount: top, topDiscount: top }));
}

// GET /brands/nearby → brands mapped exactly like getBrandsFast, plus distanceKm and
// nearestBranch. Throws on any failure (the section then falls back to city deals).
export async function fetchNearby(lat, lng, userId, signal) {
  const res = await api.get("/brands/nearby", {
    params: { lat, lng, limit: MAX_DEALS, maxKm: 25 },
    timeout: 8000,
    signal,
  });
  if (!Array.isArray(res.data)) throw new Error("bad nearby response");
  const me = userId ? String(userId) : null;
  return res.data.map((brand) => {
    const logo = brandLogoUrl(brand.logo);
    const offers = (brand.offers || []).map((o) => {
      const claimed = !!me && (o.claimedBy || []).some((id) => String(id) === me);
      return {
        ...o,
        image: imageUrl(o.image),
        displayImage: imageUrl(o.image),
        isClaimed: claimed,
        serverClaimed: claimed,
        discountPercentage: o.discountPercentage || 0,
      };
    });
    const first = offers[0];
    return {
      ...brand,
      logo,
      offers,
      displayImage: first?.image || logo || DEFAULT_IMAGE,
      hasOffer: offers.length > 0,
      discount: first?.discountPercentage || 0,
      category: first?.category || brand.category || "General",
      isOnline: first?.isOnline || brand.isOnline || false,
      isInStore: first?.isInStore || brand.isInStore || false,
    };
  });
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
