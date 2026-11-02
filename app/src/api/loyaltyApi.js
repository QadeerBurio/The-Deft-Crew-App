// app/src/api/loyaltyApi.js
// Brand loyalty (server: routes/loyalty.routes.js, behind FLAG_LOYALTY_V2). The loyalty card and the
// visits list show only when GET /app/flags/me says loyaltyV2 for this student; that answer is kept
// for a few minutes per signed-in account. Replies are { success, data }; these return `data`.
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const FLAGS_MAX_AGE = 5 * 60 * 1000;
let flags = { key: null, at: 0, on: false, pending: null };

/** Is loyalty on for the signed-in student? Guests, errors and an unreachable server: no. */
export async function loyaltyEnabled() {
  const [token, guest] = await Promise.all([AsyncStorage.getItem("token"), AsyncStorage.getItem("isGuest")]);
  if (!token || guest === "true") return false;
  if (flags.key === token && Date.now() - flags.at < FLAGS_MAX_AGE) return flags.on;
  if (flags.key === token && flags.pending) return flags.pending;
  flags = { key: token, at: 0, on: false, pending: null };
  flags.pending = api
    .get("/app/flags/me", { timeout: 6000 })
    .then((r) => !!r.data?.loyaltyV2)
    .catch(() => false)
    .then((on) => {
      if (flags.key === token) flags = { key: token, at: Date.now(), on, pending: null };
      return on;
    });
  return flags.pending;
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
