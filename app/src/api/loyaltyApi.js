// app/src/api/loyaltyApi.js
// Brand loyalty (server: routes/loyalty.routes.js, behind FLAG_LOYALTY_V2). The loyalty card and the
// visits list show only when GET /app/flags/me says loyaltyV2 for this student (the shared
// flags, api/appFlags.js). Replies are { success, data }; these return `data`.
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

import { flagOn } from "./appFlags";
// the shared flags (api/appFlags.js): asked on login, app open and back in the foreground; a failed
// request never switches the feature off
export async function loyaltyEnabled() {
  return flagOn("loyaltyV2");
}

/** The brands running a loyalty program now: { enabled, programs: [{ brandId, brandName, name }] } */
export async function activeLoyaltyPrograms() {
  if (!(await loyaltyEnabled())) return { enabled: false, programs: [] };
  const r = await api.get("/loyalty/programs/active", { timeout: 8000 });
  return r.data?.data || { enabled: true, programs: [] };
}

/** { enabled, program, progress } for one brand, or { enabled: false } */
export async function getBrandLoyalty(brandId) {
  if (!brandId || !(await loyaltyEnabled())) return { enabled: false };
  try {
    const r = await api.get(`/loyalty/brands/${brandId}/me`, { timeout: 8000 });
    return r.data?.data || { enabled: false };
  } catch {
    return { enabled: false };
  }
}

/** The student's confirmed bills and whether each counted as a visit (newest first) */
export async function getMyLoyaltyCredits() {
  if (!(await loyaltyEnabled())) return [];
  try {
    const r = await api.get("/loyalty/me/credits", { timeout: 8000 });
    return r.data?.data?.credits || [];
  } catch {
    return [];
  }
}
