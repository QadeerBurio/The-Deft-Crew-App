// app/src/api/surplusApi.js
// Surprise Box (server: routes/surplus.routes.js, behind FLAG_SURPLUS_BOXES): brands' surplus food, pickup
// only, pay at pickup. Shown only when GET /app/flags/me says surplusBoxes for this student 
// (the shared flags, api/appFlags.js). Replies are { success, data }; these return `data` and throw an Error with the
// server's message, `code` and any extra fields (orderId, holdId, left, ...).
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

import { flagOn } from "./appFlags";
// the shared flags (api/appFlags.js): asked on login, app open and back in the foreground; a failed
// request never switches the feature off
export async function surplusEnabled() {
  return flagOn("surplusBoxes");
}

const unwrap = (request) =>
  request
    .then((r) => r.data?.data)
    .catch((e) => {
      const body = e.response?.data || {};
      const { code, message, ...extra } = body.error || {};
      const err = new Error(message || body.message || (e.response ? "something went wrong, try again" : "you seem to be offline"));
      Object.assign(err, extra, { code, status: e.response?.status, offline: !e.response });
      throw err;
    });
export const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const B = "/surplus";

export const surplusApi = {
  // { lat, lng } optional (distance), city optional
  listings: (params = {}) => unwrap(api.get(`${B}/listings`, { params, timeout: 10000 })),
  listing: (id) => unwrap(api.get(`${B}/listings/${id}`, { timeout: 10000 })),
  // the same idempotencyKey for a retried tap
  hold: (listingId, qty, idempotencyKey) => unwrap(api.post(`${B}/holds`, { listingId, qty, idempotencyKey }, { timeout: 10000 })),
  releaseHold: (holdId) => unwrap(api.delete(`${B}/holds/${holdId}`, { timeout: 10000 })),
  placeOrder: (holdId, idempotencyKey) => unwrap(api.post(`${B}/orders`, { holdId, idempotencyKey, acceptedTerms: true }, { timeout: 15000 })),
  myOrders: () => unwrap(api.get(`${B}/orders/me`, { timeout: 10000 })),
  order: (id) => unwrap(api.get(`${B}/orders/${id}`, { timeout: 10000 })),
  cancel: (id, version) => unwrap(api.post(`${B}/orders/${id}/cancel`, { version }, { timeout: 10000 })),
  openCase: (body) => unwrap(api.post(`${B}/support-cases`, body, { timeout: 10000 })),
};

export const STATE = {
  ORDER_PLACED: { label: "ordered", step: 1 },
  CONFIRMED: { label: "confirmed by the brand", step: 2 },
  PREPARING: { label: "being prepared", step: 2 },
  READY_FOR_PICKUP: { label: "ready for pickup", step: 3 },
  PICKUP_VERIFIED: { label: "picked up", step: 4 },
  COMPLETED: { label: "picked up", step: 4 },
  CUSTOMER_CANCELLED: { label: "you cancelled", step: -1 },
  MERCHANT_CANCELLED: { label: "cancelled by the brand", step: -1 },
  NO_SHOW: { label: "not collected (no-show)", step: -1 },
  DISPUTED: { label: "support case open", step: -1 },
  RESERVATION_EXPIRED: { label: "expired", step: -1 },
};
export const CASE_REASONS = [
  ["not_as_described", "not as described"],
  ["food_safety", "food safety problem"],
  ["not_handed_over", "I didn't get it"],
  ["wrong_no_show", "I was there (wrong no-show)"],
  ["merchant_cancelled_late", "cancelled too late by the brand"],
  ["charged_wrong_price", "charged a different price"],
  ["other", "something else"],
];
export const pkTime = (iso, opts = { weekday: "short", hour: "2-digit", minute: "2-digit" }) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Karachi", ...opts }); } catch { return new Date(iso).toLocaleString(); }
};

export default surplusApi;
