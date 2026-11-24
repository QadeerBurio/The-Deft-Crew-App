// screens/offerClaims.js — which offers this phone has claimed (the claimed-ids registry, its storage and listeners)
// and the offer-stats helpers, moved unchanged from OfferScreen.js (Q-a split-only, plan Q-3f). OfferScreen.js
// re-exports the same names, so every file importing them from there keeps working.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isSignedInNow } from "../guest/accountRoutes";

// ============================================================
// ✅ PERSISTENT CLAIMED IDS REGISTRY (per user)
// Before: one shared key for every account and IDs were only ever added,
// so a redeemed/removed offer stayed "Claimed" forever and the next user
// on the same phone saw the previous user's claims.
// ============================================================
export const CLAIMED_IDS_STORAGE_PREFIX = "@tdc_claimed_offer_ids:";
export const LEGACY_CLAIMED_IDS_KEY = "@tdc_claimed_offer_ids";
export const RECENT_CLAIM_GRACE_MS = 20000; // ignore server for 20s after a local claim

export const claimedIdsRegistry = new Set();
export const recentLocalClaims = new Map(); // offerId → timestamp
export let registryOwner = null; // userId the registry belongs to
export let registryHydrated = false;
export let hydratingPromise = null;
export const storageKeyFor = (uid) => `${CLAIMED_IDS_STORAGE_PREFIX}${uid}`;
export const userIdFromStoredToken = async () => {
  try {
    const [[, tk], [, guest]] = await AsyncStorage.multiGet(["token", "isGuest"]);
    if (!tk || guest === "true") return null;
    const payload = JSON.parse(atob(tk.split(".")[1]));
    return payload.id || payload._id || payload.userId || payload.sub || null;
  } catch {
    return null;
  }
};
export let persistTimer = null;
export const persistRegistry = () => {
  if (!registryOwner) return;
  const owner = registryOwner;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    if (!isSignedInNow()) return; // logged out meanwhile: don't write claims back
    try {
      const arr = Array.from(claimedIdsRegistry);
      await AsyncStorage.setItem(storageKeyFor(owner), JSON.stringify(arr));
    } catch (e) {
      console.log("persistRegistry error:", e);
    }
  }, 200);
};
// Loads the claimed IDs of the logged-in user. Safe to call many times.
export const hydrateClaimedRegistry = async (userId) => {
  // no signed-in student (guest, logged out): nothing is read from storage
  if (!isSignedInNow()) {
    claimedIdsRegistry.clear();
    recentLocalClaims.clear();
    registryOwner = null;
    registryHydrated = false;
    return;
  }
  const uid = userId || (await userIdFromStoredToken());

  if (registryHydrated && registryOwner === (uid || null)) return;
  if (hydratingPromise) {
    await hydratingPromise;
    if (registryOwner === (uid || null)) return;
  }

  hydratingPromise = (async () => {
    claimedIdsRegistry.clear();
    recentLocalClaims.clear();
    registryOwner = uid || null;
    registryHydrated = true;

    try { await AsyncStorage.removeItem(LEGACY_CLAIMED_IDS_KEY); } catch (e) { console.warn("[offers] removing old claim data failed:", e?.message || e); }
    if (!uid) return;

    try {
      const raw = await AsyncStorage.getItem(storageKeyFor(uid));
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) arr.forEach((id) => id && claimedIdsRegistry.add(String(id)));
    } catch (e) {
      console.log("hydrateClaimedRegistry error:", e);
    }
  })();

  try { await hydratingPromise; } finally { hydratingPromise = null; }
};
// Called by AuthContext on logout / account switch
export const clearClaimedRegistry = async (userId) => {
  claimedIdsRegistry.clear();
  recentLocalClaims.clear();
  registryOwner = null;
  registryHydrated = false;
  try {
    if (userId) await AsyncStorage.removeItem(storageKeyFor(userId));
    await AsyncStorage.removeItem(LEGACY_CLAIMED_IDS_KEY);
  } catch (e) { console.warn("[offers] clearing old claim data failed:", e?.message || e); }
};
export const registerLocalClaim = (offerId) => {
  if (!offerId || !isSignedInNow()) return;
  claimedIdsRegistry.add(String(offerId));
  recentLocalClaims.set(String(offerId), Date.now());
  persistRegistry();
};
export const unregisterLocalClaim = (offerId) => {
  if (!offerId) return;
  claimedIdsRegistry.delete(String(offerId));
  recentLocalClaims.delete(String(offerId));
  persistRegistry();
};
export const isLocallyClaimed = (offerId) => {
  if (!offerId || !isSignedInNow()) return false; // a guest never has claims
  return claimedIdsRegistry.has(String(offerId));
};
export const getAllLocallyClaimed = () => Array.from(claimedIdsRegistry);
/**
 * Server is the source of truth.
 * serverIds: offers the server says this user has claimed
 * scopeIds:  every offer ID that response covered (optional).
 *   With scopeIds, any ID in scope that the server no longer lists is removed
 *   (redeemed, unclaimed on another phone, offer deleted), except claims made
 *   on this phone in the last 20s (server may not have caught up yet).
 */
export const reconcileClaimedIds = (serverIds, scopeIds = null) => {
  // late responses from a session that has ended must not refill the registry
  if (!Array.isArray(serverIds) || !isSignedInNow()) return;
  const serverSet = new Set(serverIds.map(String));
  let changed = false;

  serverSet.forEach((id) => {
    if (!claimedIdsRegistry.has(id)) {
      claimedIdsRegistry.add(id);
      changed = true;
    }
  });

  if (Array.isArray(scopeIds)) {
    const now = Date.now();
    scopeIds.map(String).forEach((id) => {
      if (serverSet.has(id) || !claimedIdsRegistry.has(id)) return;
      const t = recentLocalClaims.get(id);
      if (t && now - t < RECENT_CLAIM_GRACE_MS) return;
      claimedIdsRegistry.delete(id);
      recentLocalClaims.delete(id);
      changed = true;
    });
  }

  if (changed) persistRegistry();
  return changed;
};
// Full list from /offers/claimed → registry becomes exactly that list
export const replaceClaimedIds = (serverIds) => {
  if (!Array.isArray(serverIds)) return;
  return reconcileClaimedIds(serverIds, Array.from(claimedIdsRegistry));
};
// ============================================================
// GLOBAL CLAIM EVENT BUS
// ============================================================
export const claimListeners = new Set();
export const statsListeners = new Set();
export const onOfferClaimed = (callback) => {
  claimListeners.add(callback);
  return () => claimListeners.delete(callback);
};
export const onStatsChanged = (callback) => {
  statsListeners.add(callback);
  return () => statsListeners.delete(callback);
};
export const emitOfferClaimed = (brandId, offerId, extra = {}) => {
  claimListeners.forEach((cb) => {
    try {
      cb(brandId, offerId, extra);
    } catch (e) {
      console.log("claim listener error:", e);
    }
  });
};
export const emitStatsChanged = (stats, brandId) => {
  statsListeners.forEach((cb) => {
    try {
      cb(stats, brandId);
    } catch (e) {
      console.log("stats listener error:", e);
    }
  });
};
// ============================================================
// HELPERS
// ============================================================
export const userIdFromToken = (tk) => {
  if (!tk) return null;
  try {
    const payload = JSON.parse(atob(tk.split(".")[1]));
    return payload.id || payload._id || payload.userId || payload.sub || null;
  } catch {
    return null;
  }
};
export const isOfferClaimedByUser = (offer, currentUserId) => {
  if (!offer) return false;
  // no signed-in user (guest): never claimed. Before, any offer someone had
  // claimed (including the account that just logged out) showed as claimed.
  if (!currentUserId) return false;
  if (!offer.claimedBy || !Array.isArray(offer.claimedBy)) return false;

  const me = String(currentUserId);
  return offer.claimedBy.some((entry) => {
    if (!entry) return false;
    if (typeof entry === "string") return entry === me;
    const id =
      entry._id?.toString?.() ||
      entry.id?.toString?.() ||
      entry.userId?.toString?.() ||
      entry.toString?.();
    return id === me;
  });
};
export const extractClaimedIdsFromOffers = (offers, currentUserId) => {
  if (!Array.isArray(offers) || !currentUserId) return [];
  const me = String(currentUserId);
  const ids = [];
  for (const offer of offers) {
    if (!offer) continue;
    if (isOfferClaimedByUser(offer, me)) {
      ids.push(offer._id?.toString?.() || offer._id);
    }
  }
  return ids;
};
export const branchesEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x._id !== y._id ||
      x.name !== y.name ||
      x.discountPercentage !== y.discountPercentage ||
      x.isOnline !== y.isOnline ||
      x.isInStore !== y.isInStore ||
      x.city !== y.city
    ) {
      return false;
    }
  }
  return true;
};
export const computeStatsFromOffers = (offers) => {
  if (!Array.isArray(offers)) {
    return {
      totalOffers: 0,
      claimedCount: 0,
      onlineCount: 0,
      inStoreCount: 0,
      maxDiscount: 0,
    };
  }
  let claimedCount = 0;
  let onlineCount = 0;
  let inStoreCount = 0;
  let maxDiscount = 0;
  for (const o of offers) {
    if (o.isClaimed) claimedCount++;
    if (o.isOnline) onlineCount++;
    if (o.isInStore) inStoreCount++;
    if ((o.discountPercentage || 0) > maxDiscount)
      maxDiscount = o.discountPercentage || 0;
  }
  return {
    totalOffers: offers.length,
    claimedCount,
    onlineCount,
    inStoreCount,
    maxDiscount,
  };
};
export const statsEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.totalOffers === b.totalOffers &&
    a.claimedCount === b.claimedCount &&
    a.onlineCount === b.onlineCount &&
    a.inStoreCount === b.inStoreCount &&
    a.maxDiscount === b.maxDiscount
  );
};
// ============================================================
// BUILD ACTIVE DATA
// ============================================================
export const buildActiveData = (brand, currentOffer, selectedBranch) => {
  const hasBranch = !!selectedBranch;
  const branch = selectedBranch || {};
  const offer = currentOffer || {};
  const brandData = brand || {};

  const discount = hasBranch
    ? Number(branch.discountPercentage || offer.discountPercentage || brandData.discount || 0)
    : Number(offer.discountPercentage || brandData.discount || 0);

  const title = hasBranch
    ? branch.name || offer.title || brandData.name || "Offer Details"
    : offer.title || brandData.name || "Offer Details";

  const description =
    (hasBranch && branch.description) ||
    offer.description ||
    brandData.description ||
    "Explore this iconic destination. Get exclusive student discounts.";

  const redeemInstructions =
    (hasBranch && branch.redeemInstructions) ||
    offer.redeemInstructions ||
    brandData.redeemInstructions ||
    "1. Show your valid student ID at the counter\n2. Mention you're a Crew Privilege member\n3. Enjoy your discount!";

  const location = hasBranch
    ? (branch.location || branch.address || branch.city || "")
    : (offer.location || offer.address || brandData.location || brandData.address || "");

  const isOnline = hasBranch
    ? !!branch.isOnline
    : !!(offer.isOnline || brandData.isOnline);

  const isInStore = hasBranch
    ? !!branch.isInStore
    : !!(offer.isInStore || brandData.isInStore);

  const image =
    (hasBranch && branch.image) ||
    offer.image ||
    offer.displayImage ||
    brandData.displayImage ||
    brandData.logo ||
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  const category =
    (hasBranch && branch.category) ||
    offer.category ||
    brandData.category ||
    "General";

  return {
    discount,
    title,
    description,
    redeemInstructions,
    location,
    isOnline,
    isInStore,
    image,
    category,
    branchName: hasBranch ? branch.name : null,
  };
};
