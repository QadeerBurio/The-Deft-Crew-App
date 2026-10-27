// app/src/analytics/metaRedemptions.js
// tdc_discount_redeemed. A redemption is recorded by the brand's scanner or a promo-code webhook,
// never on the student's phone, so the app asks the server for the student's own redemptions of the
// last 24 h (GET /offers/my-redemptions) and reports each one it hasn't reported yet (once-key
// redeem:<redemptionId>, kept by metaEvents; older than 24 h is never sent).
// Asked on the "payment successful." push (pushType "redemption"), when the app comes back to the
// front, and when savings refresh. Only while Meta is on, someone is signed in, and they haven't said
// no. Ids and a date only: the response has nothing else, and nothing else is passed on.
import api from "../api/api";
import { metaAvailable, getConsent, metaUser, metaEvents } from "./metaEvents";

const WINDOW = 24 * 60 * 60 * 1000;
const MIN_GAP = 60 * 1000; // foreground + savings refresh close together → one request

const deps = {
  get: (url, cfg) => api.get(url, cfg),
  now: () => Date.now(),
};
let running = null;
let lastAt = 0;

/** Reports unseen redemptions of the last 24 h. Resolves to how many were sent; never throws. */
export function checkRedemptions({ force = false } = {}) {
  try {
    if (!metaAvailable() || !metaUser() || getConsent() === "denied") return Promise.resolve(0);
    if (running) return running;
    if (!force && deps.now() - lastAt < MIN_GAP) return Promise.resolve(0);
    lastAt = deps.now();
  } catch {
    return Promise.resolve(0);
  }
  running = (async () => {
    try {
      const since = new Date(deps.now() - WINDOW).toISOString();
      const res = await deps.get(`/offers/my-redemptions?since=${encodeURIComponent(since)}`, { timeout: 10000 });
      let sent = 0;
      for (const r of res?.data?.redemptions || []) {
        const out = await metaEvents.discountRedeemed(r?.redemptionId, r?.offerId, r?.redeemedAt);
        if (out === "sent") sent++;
      }
      return sent;
    } catch {
      return 0; // offline or signed out: the next return to the app tries again
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Push data of a received or tapped notification: the redemption push checks at once. */
export function onRedemptionPush(data) {
  if (data?.type === "redemption" || data?.pushType === "redemption") return checkRedemptions({ force: true });
  return Promise.resolve(0);
}

// tests only
export const _test = {
  deps,
  reset: () => {
    running = null;
    lastAt = 0;
  },
};
