// app/src/growth/inviteLinks.js
// P1 invite links. The share link is https://gettdc.pk/i/<CODE>?c=<channel> (a tiny web page in the portal with store
// buttons and the copy-code flow). With the 1.3.0 store build the same link opens the app (app links); tdcapp://i/<CODE>
// works now.
//   - opening an invite link in the app saves the code (@tdc_pending_ref) for signup; signed out → Signup opens;
//     a guest keeps it for when they sign up; a signed-in student is already a member, so nothing happens
//   - Signup fills the code in from it and clears it once the account exists
// Sharing (who creates these links) is behind growthV2; opening one works for everyone, because only flagged
// students create them.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const PENDING_REF_KEY = "@tdc_pending_ref";
export const INVITE_ORIGIN = "https://gettdc.pk";
const CODE = /^[A-Z0-9]{4,12}$/;
const CHANNELS = new Set(["wa", "ig", "tt", "copy", "direct"]);

/** The invite code in a link (tdcapp://i/CODE, https://gettdc.pk/i/CODE?c=wa), or null. */
export function inviteCodeFromUrl(url) {
  const m = String(url || "").match(/^(?:tdcapp:\/\/|https:\/\/(?:www\.)?gettdc\.pk\/)i\/([A-Za-z0-9]{4,12})\/?(?:[?#].*)?$/);
  const code = m ? m[1].toUpperCase() : null;
  return code && CODE.test(code) ? code : null;
}

/** The share link for a code and channel (wa, ig, tt, copy, direct). */
export function inviteLink(code, channel = "direct") {
  const c = CHANNELS.has(channel) ? channel : "direct";
  return `${INVITE_ORIGIN}/i/${encodeURIComponent(String(code || "").toUpperCase())}?c=${c}`;
}

/** The share text (owner's copy, lowercase voice). */
export function inviteMessage(code, channel = "direct") {
  const c = String(code || "").toUpperCase();
  return `join me on tdc, the student app.\n\nuse my code: ${c}\nyou both get 100 points when your friend starts using tdc.\n\n${inviteLink(c, channel)}`;
}

/**
 * An opened link. Returns the code when it was an invite link (and saved), else null.
 * deps: { storage = AsyncStorage, navigationRef }
 */
export async function handleInviteUrl(url, { storage = AsyncStorage, navigationRef = null } = {}) {
  const code = inviteCodeFromUrl(url);
  if (!code) return null;
  let token = null; let guest = null;
  try { [token, guest] = await Promise.all([storage.getItem("token"), storage.getItem("isGuest")]); } catch { /* treat as signed out */ }
  const signedIn = !!token && guest !== "true";
  if (signedIn) return null; // already a member: nothing to do
  try { await storage.setItem(PENDING_REF_KEY, code); } catch { return null; }
  // signed out: the sign-in stack is mounted, open Signup (a guest keeps the code for whenever they sign up)
  try {
    const names = navigationRef?.isReady?.() ? navigationRef.getRootState()?.routeNames || [] : [];
    if (guest !== "true" && names.includes("Signup")) navigationRef.navigate("Signup");
  } catch { /* the code is saved anyway */ }
  return code;
}

export async function readPendingRef(storage = AsyncStorage) {
  try { const v = await storage.getItem(PENDING_REF_KEY); return v && CODE.test(v) ? v : null; } catch { return null; }
}

export async function clearPendingRef(storage = AsyncStorage) {
  try { await storage.removeItem(PENDING_REF_KEY); } catch { /* ok */ }
}

/** A code in pasted text ("use my code: ABC123", a link, or the code alone), or null. */
export function codeFromText(text) {
  const t = String(text || "");
  const fromLink = inviteCodeFromUrl(t.trim());
  if (fromLink) return fromLink;
  const m = t.match(/code[:\s]+([A-Za-z0-9]{4,12})\b/i) || t.trim().match(/^([A-Za-z0-9]{4,12})$/);
  return m ? m[1].toUpperCase() : null;
}
