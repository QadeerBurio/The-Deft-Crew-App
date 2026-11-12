// app/src/utils/connectionRequests.js
// Accept a connection request from one person (server: routes/social.routes.js). The server accepts a request
// through its notification (POST /social/notifications/respond { notificationId, action: "accepted" }); there is
// no accept-by-user route. So: find the pending "request" notification from that person, then respond to it.
//   acceptRequestFrom(http, apiUrl, config, requesterId)
//     → { ok: true } | { ok: false, reason: "not_pending" | "error", error }
// http is axios (or anything with get / post); apiUrl is `${SERVER_ORIGIN}/api/social`.
const idOf = (v) => String(v?._id || v || "");

export async function acceptRequestFrom(http, apiUrl, config, requesterId) {
  const list = (await http.get(`${apiUrl}/notifications`, { ...config, params: { types: "request" } })).data;
  const pending = (Array.isArray(list) ? list : []).find((n) =>
    n?.type === "request" && idOf(n.sender) === idOf(requesterId) && !n.isProcessed && (n.status || "pending") === "pending");
  if (!pending) return { ok: false, reason: "not_pending" };
  try {
    await http.post(`${apiUrl}/notifications/respond`, { notificationId: idOf(pending), action: "accepted" }, config);
    return { ok: true };
  } catch (err) {
    // accepted a moment ago (another screen, another tap): that's the outcome the student wanted
    if (err?.response?.status === 400 && err.response.data?.status === "accepted") return { ok: true };
    return { ok: false, reason: "error", error: err };
  }
}

export default { acceptRequestFrom };
