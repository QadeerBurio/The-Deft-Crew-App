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
