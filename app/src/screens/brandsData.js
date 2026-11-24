// screens/brandsData.js — the brands screen's categories and pure helpers (image links, discounts, comparisons,
// the local claim registry overlay), moved unchanged from Brands.js (Q-a split-only, plan Q-3f).
import { isLocallyClaimed } from "./OfferScreen";
import { color as T } from "../theme/tokens";
import { fixLegacyImageUrl, FALLBACK_IMAGE } from "../utils/imageUrl";

// ── Categories ─────────────────────────────────────────
export const CATEGORIES = [
  { id: "all", name: "All", icon: "apps", color: T.ink, bgColor: T.yellowSoft },
  { id: "restaurant", name: "Restaurant", icon: "silverware-fork-knife", color: "#FF6B6B", bgColor: "#FF6B6B15" },
  { id: "cafe", name: "Cafe & Coffee", icon: "coffee", color: "#A0522D", bgColor: "#A0522D15" },
  { id: "food", name: "Food & Drinks", icon: "food", color: "#FF8C00", bgColor: "#FF8C0015" },
  { id: "salon", name: "Salon", icon: "scissors-cutting", color: "#FF69B4", bgColor: "#FF69B415" },
  { id: "spa", name: "Spa & Wellness", icon: "spa", color: "#2E8B57", bgColor: "#2E8B5715" },
  { id: "health", name: "Health & Beauty", icon: "heart-pulse", color: "#FF1493", bgColor: "#FF149315" },
  { id: "perfumes", name: "Perfumes & Fragrances", icon: "flask", color: "#9B59B6", bgColor: "#9B59B615" },
  { id: "fashion", name: "Fashion & Clothing", icon: "tshirt-crew", color: "#2C3E50", bgColor: "#2C3E5015" },
  { id: "shoes", name: "Shoes & Footwear", icon: "shoe-print", color: "#8B4513", bgColor: "#8B451315" },
  { id: "bags", name: "Bags & Accessories", icon: "bag-suitcase", color: "#D4A017", bgColor: "#D4A01715" },
  { id: "electronics", name: "Electronics & Gadgets", icon: "laptop", color: "#3498DB", bgColor: "#3498DB15" },
  { id: "mobile", name: "Mobile & Accessories", icon: "cellphone", color: "#2ECC71", bgColor: "#2ECC7115" },
  { id: "education", name: "Education & Institutes", icon: "school", color: "#1A5276", bgColor: "#1A527615" },
  { id: "travel", name: "Travel & Tourism", icon: "airplane", color: "#5DADE2", bgColor: "#5DADE215" },
  { id: "hotels", name: "Hotels & Resorts", icon: "bed", color: "#E67E22", bgColor: "#E67E2215" },
  { id: "gym", name: "Gym & Fitness", icon: "dumbbell", color: "#E74C3C", bgColor: "#E74C3C15" },
  { id: "sports", name: "Sports", icon: "basketball", color: "#2ECC71", bgColor: "#2ECC7115" },
  { id: "entertainment", name: "Entertainment", icon: "movie", color: "#8E44AD", bgColor: "#8E44AD15" },
  { id: "photography", name: "Photography", icon: "camera", color: "#2C3E50", bgColor: "#2C3E5015" },
  { id: "services", name: "Services", icon: "tools", color: "#7F8C8D", bgColor: "#7F8C8D15" },
  { id: "others", name: "Others", icon: "dots-horizontal", color: "#95A5A6", bgColor: "#95A5A615" },
];
export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
export const CATEGORY_BY_NAME = new Map(CATEGORIES.map((c) => [c.name, c]));
// ── Brand image URLs (rule in utils/imageUrl) ──
// getBrandsFast still builds old-rule URLs, so they're repaired here. The generic
// flaticon fallback is not a brand image: those cards get the sand placeholder.
export const repairImageUrl = (url) => {
  if (!url || url === FALLBACK_IMAGE) return null;
  return fixLegacyImageUrl(String(url));
};
// brand logo first (what OfferScreen shows), else the first offer's image
export const brandImageOf = (b) => repairImageUrl(b?.logo) || repairImageUrl(b?.displayImage);
// Discount shown on the card (number, never a string like "10")
export const brandDiscount = (b) => {
  const n = Number(b?.discount);
  return Number.isFinite(n) ? Math.round(n) : 0;
};
// ── Deep-diff helpers ──
export const offersEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x._id !== y._id ||
      x.discountPercentage !== y.discountPercentage ||
      x.isClaimed !== y.isClaimed ||
      x.image !== y.image ||
      x.isOnline !== y.isOnline ||
      x.isInStore !== y.isInStore
    ) {
      return false;
    }
  }
  return true;
};
export const brandsEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x._id !== y._id ||
      x.discount !== y.discount ||
      x.displayImage !== y.displayImage ||
      x.hasOffer !== y.hasOffer ||
      x.isOnline !== y.isOnline ||
      x.isInStore !== y.isInStore ||
      x.category !== y.category ||
      x.name !== y.name ||
      !offersEqual(x.offers, y.offers)
    ) {
      return false;
    }
  }
  return true;
};
export const statsEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.totalBrands === b.totalBrands &&
    a.totalOffers === b.totalOffers &&
    a.claimedCount === b.claimedCount &&
    a.onlineCount === b.onlineCount &&
    a.inStoreCount === b.inStoreCount &&
    a.maxDiscount === b.maxDiscount
  );
};
// ==========================================
// ✅ HELPER: Re-apply local claim registry to a brand object
// ==========================================
export const applyLocalClaimRegistry = (brand) => {
  if (!brand || !brand.offers || brand.offers.length === 0) return brand;

  let changed = false;
  const updatedOffers = brand.offers.map((offer) => {
    const registryClaimed = isLocallyClaimed(offer._id);
    const finalClaimed = offer.isClaimed || registryClaimed;
    if (finalClaimed !== offer.isClaimed) {
      changed = true;
      return { ...offer, isClaimed: finalClaimed };
    }
    return offer;
  });

  if (!changed) return brand;

  const firstOffer = updatedOffers[0];
  return {
    ...brand,
    offers: updatedOffers,
    hasOffer: updatedOffers.length > 0,
    discount: firstOffer?.discountPercentage || 0,
    displayImage: firstOffer?.image || brand.displayImage,
    isOnline: firstOffer?.isOnline || brand.isOnline,
    isInStore: firstOffer?.isInStore || brand.isInStore,
  };
};
