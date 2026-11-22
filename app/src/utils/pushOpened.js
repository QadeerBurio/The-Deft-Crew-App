// app/src/utils/pushOpened.js
// Plan N-6: report that a push was opened from the tray, so the admin push report can show real open rates.
// The server only puts pushLogId into a push when the recipient has the pushOpenTracking flag (off by default), so
// without the flag there is nothing to report and nothing is sent. One report per push, never blocks the tap.
import api from "../api/api";

const reported = new Set();

export function reportPushOpened(data) {
  const id = data && typeof data.pushLogId === "string" ? data.pushLogId : null;
  if (!id || !/^[0-9a-f]{24}$/i.test(id) || reported.has(id)) return false;
  reported.add(id);
  api.post(`/notification/push-opened/${id}`, {}, { timeout: 8000 }).catch(() => {});
  return true;
}
