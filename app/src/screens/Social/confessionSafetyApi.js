// confessionSafetyApi.js: the confession safety calls (plan P4-1, flag confessionSafety). The server answers 404 to
// all of them for an account without the flag, so they're only called when useFlag(FLAGS.confessionSafety) is true.
import { SERVER_ORIGIN } from "../../config/server";
import { fetchWithTimeout } from "../../config/timeouts";

const API_URL = `${SERVER_ORIGIN}/api/social`;
const headers = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
const read = async (res) => { try { return await res.json(); } catch { return null; } };

/** { rulesAcceptedAt, bannedUntil, reportingPausedUntil, helplines[], reasons[] } or null */
export async function safetyMe(token) {
  const res = await fetchWithTimeout(`${API_URL}/confessions/safety/me`, { headers: headers(token) });
  return res.ok ? read(res) : null;
}

/** the text check before an image upload → { verdict: "ok" | "edit", reasons } or null (unreachable: post anyway) */
export async function precheckText(token, text) {
  const res = await fetchWithTimeout(`${API_URL}/confessions/precheck`, { method: "POST", headers: headers(token), body: JSON.stringify({ text }) });
  return res.ok ? read(res) : null;
}

/** store "rules accepted" (once) → true when stored */
export async function acceptRules(token) {
  const res = await fetchWithTimeout(`${API_URL}/confessions/rules/accept`, { method: "POST", headers: headers(token) });
  return res.ok;
}

/** mute (on = true) or unmute an author → { ok, message } */
export async function muteAuthor(token, confessionId, on = true) {
  const res = await fetchWithTimeout(`${API_URL}/confessions/${confessionId}/mute-author`, { method: on ? "POST" : "DELETE", headers: headers(token) });
  const data = await read(res);
  return { ok: res.ok, message: data?.message || null };
}

/** delete my own confession (existing route) → true when deleted */
export async function deleteMyConfession(token, confessionId) {
  const res = await fetchWithTimeout(`${API_URL}/confessions/${confessionId}`, { method: "DELETE", headers: headers(token) });
  return res.ok;
}

/** the ids of my own confessions (existing route), so the feed can offer "delete" on mine */
export async function myConfessionIds(token) {
  const res = await fetchWithTimeout(`${API_URL}/confessions/my-confessions`, { headers: headers(token) });
  if (!res.ok) return null;
  const list = await read(res);
  return new Set((Array.isArray(list) ? list : []).map((c) => String(c._id)));
}
