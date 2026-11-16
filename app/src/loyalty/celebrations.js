// app/src/loyalty/celebrations.js
// Loyalty moments the student should see once (feat/loyalty-control):
//   reward unlocked  "reward unlocked at Chai Cafe: 25% off your next bill" + confetti, once per reward
//   reward used      "reward used, you saved PKR 400", once per reward
// Triggered by the loyalty push / in-app notification (data.event "reward_unlocked" / "reward_used"), and by a stamp
// card that shows a ready reward not yet celebrated (a missed push). The phone remembers which rewards it already
// showed (AsyncStorage), so a restart, a second push or the card loading again never shows it twice.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = { unlocked: "tdc.loyalty.celebrated.v1", used: "tdc.loyalty.usedShown.v1" };
const MAX_REMEMBERED = 200;
const listeners = new Set();
const memory = { unlocked: null, used: null }; // loaded once
const inFlight = new Set();

async function seenSet(kind) {
  if (memory[kind]) return memory[kind];
  try {
    const raw = await AsyncStorage.getItem(KEY[kind]);
    memory[kind] = new Set(raw ? JSON.parse(raw) : []);
  } catch {
    memory[kind] = new Set();
  }
  return memory[kind];
}
async function remember(kind, id) {
  const set = await seenSet(kind);
  set.add(id);
  const list = [...set].slice(-MAX_REMEMBERED);
  memory[kind] = new Set(list);
  try { await AsyncStorage.setItem(KEY[kind], JSON.stringify(list)); } catch (e) { console.warn("[loyalty] couldn't remember the celebration:", e?.message); }
}

/** subscribe to moments to show ({ kind: "unlocked" | "used", ... }); returns the unsubscribe */
export function onCelebration(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** the popup text: "reward unlocked at Chai Cafe: 25% off your next bill" / "…: a free coffee on your next visit" */
export function unlockedLine({ brandName, label, kind, item }) {
  const what = kind === "item" ? `${item || label || "a free item"} on your next visit` : `${label || "a reward"} your next bill`;
  return `reward unlocked at ${brandName || "the brand"}: ${what}`;
}
/** "reward used, you saved PKR 400" */
export function usedLine({ savedAmount, brandName }) {
  const n = Number(savedAmount) || 0;
  return `reward used${brandName ? ` at ${brandName}` : ""}, you saved PKR ${n.toLocaleString("en-PK")}`;
}

/**
 * The same breakdown the brand saw (server services/loyalty.js), as lines for the "reward used" card:
 * ["bill PKR 1,000", "offer 15% −PKR 150", "reward 25% off −PKR 250", "you paid PKR 600"]
 */
export function breakdownLines(bd) {
  if (!bd || !(Number(bd.bill) > 0)) return [];
  const pkr = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;
  const lines = [`bill ${pkr(bd.bill)}`];
  if (bd.combine === "replace" && Number(bd.offerDiscount) === 0) lines.push(`reward ${bd.reward?.label || ""} −${pkr(bd.rewardDiscount)} (instead of the offer)`.replace("  ", " "));
  else {
    lines.push(`offer ${Number(bd.offerPct) || 0}% −${pkr(bd.offerDiscount)}`);
    if (Number(bd.rewardDiscount) > 0) lines.push(`reward ${bd.reward?.label || ""} −${pkr(bd.rewardDiscount)}`.replace("  ", " "));
  }
  if (bd.giveItem) lines.push(`free: ${bd.giveItem}`);
  lines.push(`you paid ${pkr(bd.pay)}`);
  return lines;
}

async function show(kind, moment) {
  const id = moment?.rewardId ? String(moment.rewardId) : null;
  if (!id) return false;
  const key = `${kind}:${id}`;
  if (inFlight.has(key)) return false; // the push and the card at the same moment
  inFlight.add(key);
  try {
    if ((await seenSet(kind)).has(id)) return false;
    await remember(kind, id);
    // kind: which moment ("unlocked" / "used"); rewardKind: the reward's own kind (percent, amount, item)
    const m = { ...moment, kind, rewardKind: moment.kind || null, rewardId: id, text: kind === "unlocked" ? unlockedLine(moment) : usedLine(moment) };
    listeners.forEach((fn) => { try { fn(m); } catch (e) { console.warn("[loyalty] a celebration listener failed:", e?.message); } });
    return true;
  } finally {
    inFlight.delete(key);
  }
}

/** a reward was unlocked: the popup with confetti, once per reward. Returns true when shown now. */
export const celebrateReward = (m) => show("unlocked", m);
/** a reward was used: "reward used, you saved PKR X", once per reward */
export const rewardUsed = (m) => show("used", m);

/** a loyalty push / in-app notification's data → the matching moment (true when one was shown) */
export function fromNotificationData(data) {
  if (!data || data.type !== "loyalty") return Promise.resolve(false);
  const base = { rewardId: data.rewardId, brandName: data.brandName || data.params?.brand?.brandName || "", label: data.rewardLabel, kind: data.rewardKind };
  if (data.event === "reward_unlocked") return celebrateReward(base);
  if (data.event === "reward_used") return rewardUsed({ ...base, savedAmount: data.savedAmount, breakdown: data.breakdown || null });
  return Promise.resolve(false);
}

/** a stamp card with a ready reward (a missed push): celebrate it if this phone hasn't yet */
export function fromStamps(stamps, brandName) {
  const a = stamps?.available;
  if (!a?.id) return Promise.resolve(false);
  return celebrateReward({ rewardId: a.id, brandName, label: a.label, kind: a.kind, item: a.item });
}

// tests: forget what this phone remembered
export const _test = { reset: () => { memory.unlocked = null; memory.used = null; inFlight.clear(); listeners.clear(); }, KEY };
