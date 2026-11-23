// app/src/crew/crew.js
// Plan P2 (flag ambassadorV2): the ambassador programme's calls to the server (/api/crew) and the small rules the
// screens share. Every number shown comes from the server; nothing is made up (no fake data: a real number or
// nothing). Flag off: none of this is used (Points keeps the Google Form, as today).
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/api";
import { LEVELS } from "../components/crew/levels";

export const SQUAD_FLAG = "squadMission";
// kept from the Google Form days: Points still reads it, so an application sent in the app shows "applied" there too
export const APPLIED_KEY = (userId) => `@tdc_ambassador_applied:${userId}`;
export const DRAFT_KEY = (userId) => `@tdc_crew_apply_draft:${userId}`;
export const INVITE_CHECK_KEY = (userId) => `@tdc_crew_invite_checked:${userId}`;
export const INVITE_CHECK_EVERY_MS = 6 * 3600e3;

export const WHY_CHIPS = Object.freeze(["i know a lot of people on campus", "i run or help run a society", "i'm big on social media", "i love finding deals", "i want it on my cv"]);

const data = (r) => r?.data?.data ?? null;
const plain = (e, fallback) => e?.response?.data?.message || e?.response?.data?.error || fallback;

/** Turn an error into { code, message } for the screens (lowercase, from the server when it says something) */
export function crewError(e, fallback = "something went wrong. try again.") {
  return { code: e?.response?.data?.code || (e?.response ? "SERVER" : "OFFLINE"), message: e?.response ? plain(e, fallback) : "you're offline. check your connection and try again." };
}

export const getInvitation = async () => data(await api.get("/crew/invitation"));
export const answerInvitation = async (answer) => data(await api.post("/crew/invitation", { answer }));
export const myApplication = async () => data(await api.get("/crew/applications/me"));
export const sendApplication = async (body) => data(await api.post("/crew/applications", body));
export const campusCount = async () => data(await api.get("/crew/campus-count"));
export const getHub = async () => data(await api.get("/crew/me"));
export const getDailyCard = async () => data(await api.get("/crew/daily-card"))?.card || null;
export const credentialLink = async (id) => data(await api.post(`/crew/credentials/${id}/link`));
export const postMoment = async (caption, imageUrl) => data(await api.post("/crew/moments", { caption, imageUrl }));
export const getSquad = async () => data(await api.get("/crew/squad"));

/** The invitation sheet's line for the good moment the server found */
export function inviteLine(moment) {
  switch (moment) {
    case "friend_joined": return "a friend just joined with your code. you're good at this.";
    case "deals_claimed": return "you've been finding the good deals. your campus could use that.";
    case "level_starter": return "you just levelled up. people notice.";
    case "confession_liked": return "your post got people talking.";
    default: return "you'd make a good one.";
  }
}

/** The intro's campus card: the real count, or "be the first at <uni>"; null when the server didn't say */
export function campusLine(cc) {
  if (!cc || typeof cc.count !== "number") return null;
  const uni = String(cc.university || "").trim();
  if (cc.count === 0) return uni ? `be the first at ${uni}.` : "be the first at your campus.";
  const who = cc.count === 1 ? "1 ambassador" : `${cc.count} ambassadors`;
  return uni ? `${who} at ${uni} already.` : `${who} at your campus already.`;
}

/** The next level the student hasn't unlocked yet (real names from the level list), or null at the top */
export function nextLevel(tiersIssued = []) {
  const have = new Set(Array.isArray(tiersIssued) ? tiersIssued : []);
  const next = LEVELS.find((l) => !have.has(l.id));
  return next ? { id: next.id, name: next.name, discount: next.discount || null } : null;
}

/** An application status in plain words */
export function statusLine(st) {
  if (!st) return null;
  if (st.status === "pending") return "your application is in. we reply within 7 working days.";
  if (st.status === "approved") return "you're a tdc ambassador.";
  if (st.status === "rejected") {
    const again = st.canApplyAgainAt ? ` you can apply again from ${String(st.canApplyAgainAt).slice(0, 10)}.` : "";
    return `not this time.${st.reviewNote ? ` ${st.reviewNote}` : ""}${again}`;
  }
  return null;
}

/** May the student send the form now? (none, or rejected and the 30 days have passed) */
export function canApply(st, now = Date.now()) {
  if (!st || st.status === "none") return true;
  if (st.status !== "rejected") return false;
  return !st.canApplyAgainAt || new Date(st.canApplyAgainAt).getTime() <= now;
}

/** Clean the form for the server: chips kept as picked, groups split on commas, the handle without "@" */
export function applicationBody({ why = "", whyChips = [], groups = "", handle = "" } = {}) {
  return {
    why: String(why).trim(),
    whyChips: (whyChips || []).filter((c) => WHY_CHIPS.includes(c)),
    groups: String(groups).split(",").map((g) => g.trim()).filter(Boolean).slice(0, 8),
    handle: String(handle).trim().replace(/^@/, ""),
  };
}

export async function readDraft(userId) {
  if (!userId) return null;
  try { const raw = await AsyncStorage.getItem(DRAFT_KEY(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export async function saveDraft(userId, draft) {
  if (!userId) return;
  try { await AsyncStorage.setItem(DRAFT_KEY(userId), JSON.stringify(draft)); } catch { /* best effort */ }
}
export async function clearDraft(userId) {
  if (!userId) return;
  try { await AsyncStorage.removeItem(DRAFT_KEY(userId)); } catch { /* best effort */ }
}
/** after the server took the application: the old "applied" key (Points reads it) and no draft */
export async function markApplied(userId) {
  if (!userId) return;
  try { await AsyncStorage.setItem(APPLIED_KEY(userId), "1"); } catch { /* best effort */ }
  await clearDraft(userId);
}

/** Ask the server whether to invite, at most every 6 hours per account (the server also records each ask) */
export async function inviteDue(userId, now = Date.now()) {
  if (!userId) return false;
  try {
    const last = Number(await AsyncStorage.getItem(INVITE_CHECK_KEY(userId))) || 0;
    if (now - last < INVITE_CHECK_EVERY_MS) return false;
    await AsyncStorage.setItem(INVITE_CHECK_KEY(userId), String(now));
    return true;
  } catch {
    return false;
  }
}

/** "ends in 3 days" from an ISO date, or "" */
export function endsIn(iso, now = Date.now()) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t) || t <= now) return "";
  const days = Math.ceil((t - now) / (24 * 3600e3));
  return days <= 1 ? "ends within a day" : `ends in ${days} days`;
}
