// app/src/screens/Social/confessionApi.js
// The confession screen's server address, feed cache, change checks and image upload (moved verbatim from
// ConfessionScreen.js, P4-6 split-only).
import { SERVER_ORIGIN } from "../../config/server";
import { fetchWithTimeout } from "../../config/timeouts";

export const API_URL = `${SERVER_ORIGIN}/api/social`;

// One poll while the confessions are on screen. It also refreshes the open comments sheet
// (was: the whole feed every 8 s, plus the whole feed again every 6 s for open comments).
export const CONFESSIONS_POLL_INTERVAL = 20000;

// Last list per tab, kept for the whole app session, so switching tabs or
// coming back to the screen shows posts instantly (no skeleton).
export const feedCache = { all: null, campus: null };

// ============ HELPERS ============
export const confessionsChanged = (oldList, newList) => {
  if (!Array.isArray(oldList) || !Array.isArray(newList)) return true;
  if (oldList.length !== newList.length) return true;
  for (let i = 0; i < newList.length; i++) {
    const a = oldList[i], b = newList[i];
    if (!a || !b || a._id !== b._id) return true;
    if (a.likes !== b.likes) return true;
    if ((a.comments?.length || 0) !== (b.comments?.length || 0)) return true;
    if (a.text !== b.text) return true;
  }
  return false;
};

export const commentsChanged = (oldComments, newComments) => {
  if (!Array.isArray(oldComments) || !Array.isArray(newComments)) return true;
  if (oldComments.length !== newComments.length) return true;
  for (let i = 0; i < newComments.length; i++) {
    const a = oldComments[i], b = newComments[i];
    if (!a || !b || a._id !== b._id) return true;
    if (a.text !== b.text) return true;
    if (a.parentComment !== b.parentComment) return true;
  }
  return false;
};

// ============ IMAGE UPLOAD ============
export const uploadToCloudinary = async (fileUri) => {
  const data = new FormData();
  data.append("file", { uri: fileUri, name: 'upload.jpg', type: 'image/jpeg' });
  data.append("upload_preset", "tdc_profiles");
  const res = await fetchWithTimeout("https://api.cloudinary.com/v1_1/decaxpera/image/upload", { method: "POST", body: data });
  const json = await res.json();
  return json.secure_url;
};

// ============ P4a (flag confessionsV2) ============
// the composer's config: { tags, prompts, moods, maxLength, handle: { enabled, handle } } (null when it can't be read)
export const getV2Config = async (token) => {
  try {
    const res = await fetchWithTimeout(`${API_URL}/confessions/v2/config`, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
};
// "me too" on / off → { meToo, meTooCount }
export const toggleMeToo = async (token, id) => {
  const res = await fetchWithTimeout(`${API_URL}/confessions/${encodeURIComponent(id)}/metoo`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ============ P4b ============
const putJson = async (token, path, body) => {
  const res = await fetchWithTimeout(`${API_URL}${path}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
// a vote (or a changed vote) → { poll: { options: [{ text, votes }], total, myVote } }   (flag confessionPolls)
export const votePoll = (token, id, option) => putJson(token, `/confessions/${encodeURIComponent(id)}/poll`, { option });
// follow / unfollow, the author: mute / unmute → { following }   (flag confessionFollow)
export const setFollowing = (token, id, on) => putJson(token, `/confessions/${encodeURIComponent(id)}/follow`, { on });
// save / unsave → { saved }   (confessionsV2; the list: the feed with saved=1)
export const setSavedConfession = (token, id, on) => putJson(token, `/confessions/${encodeURIComponent(id)}/save`, { on });
