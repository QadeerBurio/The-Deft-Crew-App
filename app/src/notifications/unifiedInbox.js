// app/src/notifications/unifiedInbox.js
// Plan N-4 (flag unifiedInbox, off): one inbox for the bell and social notifications, with tabs for you · campus ·
// system and one unread count. The server merges both lists (GET /notification/unified); reads, deletes and clears
// go to each item's own list (bell: /notification/…, social: /social/notifications/…), so nothing else changes.
// Used by components/NotificationModal (the bell sheet, and the "Notifications" route when the flag is on).
import { SOCIAL_TITLES } from "../utils/notificationStyle";

export const FLAG = "unifiedInbox";
export const UNIFIED_FILTERS = [
  { key: "all", label: "all" },
  { key: "unread", label: "unread" },
  { key: "for_you", label: "for you" },
  { key: "campus", label: "campus" },
  { key: "system", label: "system" },
];

// a social item's look in the bell list (its own types)
export const SOCIAL_LOOK = {
  like: ["heart-outline", "gold"], comment: ["chatbubble-outline", "dark"], reply: ["chatbubble-outline", "dark"],
  mention: ["at-outline", "blue"], follow: ["person-add-outline", "ok"], request: ["person-add-outline", "blue"],
  connection_accepted: ["people-outline", "ok"], request_declined: ["people-outline", "dark"],
};

/** A server item → the bell sheet's item shape (the same fields the bell list already uses) */
export function toItem(it) {
  const social = it.source === "social";
  return {
    _id: String(it.id),
    source: it.source === "social" ? "social" : "bell",
    tab: it.tab || "system",
    type: it.type || "System",
    title: social ? SOCIAL_TITLES[it.type] || "notification" : it.title || "notification",
    description: social && it.sender?.firstName ? `${it.sender.firstName} ${it.body || ""}`.trim() : it.body || "",
    isRead: !!it.isRead,
    createdAt: it.createdAt || new Date().toISOString(),
    link: it.link || null,
    metadata: it.metadata || {},
    conversationId: it.conversationId || null,
    // a pending connection request is answered in the social screen
    ...(social && it.type === "request" && it.status === "pending" && !it.isProcessed ? { screenToOpen: "SocialNotifications" } : {}),
  };
}

export async function fetchUnified(api) {
  const { data } = await api.get("/notification/unified", { timeout: 10000 });
  return { items: (Array.isArray(data?.items) ? data.items : []).map(toItem), unread: data?.unread || null };
}

export function counts(items) {
  const c = { unread: 0, for_you: 0, campus: 0, system: 0 };
  for (const n of items) if (!n.isRead) { c.unread += 1; c[n.tab] = (c[n.tab] || 0) + 1; }
  return c;
}

export function filterItems(items, filter) {
  if (filter === "all") return items;
  if (filter === "unread") return items.filter((n) => !n.isRead);
  return items.filter((n) => n.tab === filter);
}

// each action on the item's own list (fire and forget, like the bell list today)
export const actions = {
  read: (api, item) => (item.source === "social" ? api.put(`/social/notifications/read/${item._id}`) : api.patch(`/notification/mark-read/${item._id}`)),
  readAll: (api) => Promise.allSettled([api.put("/notification/mark-all-read"), api.put("/social/notifications/read-all")]),
  remove: (api, item) => (item.source === "social" ? api.delete(`/social/notifications/${item._id}`) : api.delete(`/notification/delete/${item._id}`)),
  clearAll: (api) => Promise.allSettled([api.delete("/notification/clear-all"), api.delete("/social/notifications/clear-all")]),
};
