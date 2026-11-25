// N-4 one inbox (flag unifiedInbox; upgrade/phase-n):
//   notifications/unifiedInbox.js: server items → the bell list's items (social titles, the sender's first name, a
//     pending request opens the social screen); per-tab counts and filters; each action on the item's own list
//   components/NotificationModal: flag off → the bell list exactly as today (GET my-notifications, its filters, its
//     endpoints); on → GET /notification/unified, tabs all · unread · for you · campus · system, reads / deletes by source
//   wiring (source): "Notifications" route → NotificationsRoute (inbox with the flag, social list without);
//     "SocialNotifications" registered in both stacks and routes.js; the unread count asks scope=all only with the flag
//   node tests/app/unified-inbox.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();

const U = H.loader({ "../utils/notificationStyle": { SOCIAL_TITLES: { like: "new like ❤️", request: "connection request 👤" } } })(path.join(H.SRC, "notifications", "unifiedInbox.js"));

const server = [
  { id: "b1", source: "bell", tab: "for_you", type: "Application Status", title: "you're shortlisted", body: "for frontend dev", isRead: false, createdAt: "2026-11-22T10:00:00Z", metadata: { route: "MyApplications" } },
  { id: "s1", source: "social", tab: "for_you", type: "like", body: "liked your post", isRead: false, createdAt: "2026-11-22T09:00:00Z", link: "/post/abc", sender: { firstName: "Fahad", name: "Fahad Khan" } },
  { id: "s2", source: "social", tab: "for_you", type: "request", body: "wants to connect", isRead: true, createdAt: "2026-11-22T08:00:00Z", status: "pending", isProcessed: false, sender: { firstName: "Ali" } },
  { id: "b2", source: "bell", tab: "campus", type: "Promotion", title: "50% off", body: "cafe x", isRead: false, createdAt: "2026-11-22T07:00:00Z" },
  { id: "b3", source: "bell", tab: "system", type: "Welcome", title: "welcome", body: "hi", isRead: true, createdAt: "2026-11-21T07:00:00Z" },
];

(async () => {
  console.log("-- helpers");
  const items = server.map(U.toItem);
  ok(items[1].title === "new like ❤️" && items[1].description === "Fahad liked your post" && items[1].source === "social" && items[1].link === "/post/abc", "a social item: its title, the sender's first name, its link", JSON.stringify(items[1]));
  ok(items[2].screenToOpen === "SocialNotifications" && !items[1].screenToOpen, "a pending connection request opens the social screen (to answer it)");
  ok(items[0].title === "you're shortlisted" && items[0].description === "for frontend dev" && items[0].metadata.route === "MyApplications", "a bell item keeps its title, text and link");
  ok(JSON.stringify(U.counts(items)) === JSON.stringify({ unread: 3, for_you: 2, campus: 1, system: 0 }), "unread per tab", JSON.stringify(U.counts(items)));
  ok(U.filterItems(items, "campus").map((i) => i._id).join() === "b2" && U.filterItems(items, "unread").length === 3 && U.filterItems(items, "all").length === 5, "filters: a tab, unread, all");
  ok(U.UNIFIED_FILTERS.map((f) => f.label).join(" · ") === "all · unread · for you · campus · system", "tabs: all · unread · for you · campus · system");
  const calls = [];
  const api = new Proxy({}, { get: (t, m) => (u) => { calls.push(`${m} ${u}`); return Promise.resolve({}); } });
  await U.actions.read(api, items[0]); await U.actions.read(api, items[1]);
  await U.actions.remove(api, items[0]); await U.actions.remove(api, items[1]);
  await U.actions.readAll(api); await U.actions.clearAll(api);
  ok(JSON.stringify(calls) === JSON.stringify(["patch /notification/mark-read/b1", "put /social/notifications/read/s1", "delete /notification/delete/b1", "delete /social/notifications/s1", "put /notification/mark-all-read", "put /social/notifications/read-all", "delete /notification/clear-all", "delete /social/notifications/clear-all"]), "each action goes to the item's own list (the existing endpoints)", calls.join(" | "));

  console.log("-- NotificationModal");
  const { React, mount } = H.makeReact();
  const { rn } = H.makeRN({ FlatList: "FlatList", Modal: "Modal", RefreshControl: "RefreshControl" });
  const run = async (flagOn) => {
    const gets = []; const writes = [];
    const axios = {
      get: async (url) => { gets.push(url); if (url.endsWith("/notification/unified")) return { data: { items: server, unread: { all: 3, for_you: 2, campus: 1, system: 0 } } }; return { data: [{ _id: "old1", type: "Offer", title: "old bell", description: "x", readBy: [], createdAt: "2026-11-22T06:00:00Z" }] }; },
      patch: async (url) => { writes.push(`patch ${url}`); return {}; }, put: async (url) => { writes.push(`put ${url}`); return {}; }, delete: async (url) => { writes.push(`delete ${url}`); return {}; },
    };
    let unread = null;
    const load = H.loader({
      react: React, "react-native": rn, axios,
      "expo-haptics": { impactAsync: async () => {}, selectionAsync: async () => {}, ImpactFeedbackStyle: {} },
      "@react-navigation/native": { useNavigation: () => ({ navigate() {}, goBack() {}, canGoBack: () => true }) },
      "../lib/tdcSounds": { soundPopupOpen() {}, soundPopupClose() {} },
      "../context/AuthContext": { AuthContext: { _default: { token: "tok", user: { _id: "me" }, setUnreadCount: (v) => { unread = typeof v === "function" ? v(unread) : v; }, updateUnreadCount() {} } } },
      "../api/api": { BASE_URL: "https://srv/api" },
      "../navigation/navigationRef": { navigationRef: { isReady: () => false } },
      "../utils/jobRoutes": { jobTarget: (route, params) => ({ route, params }) },
      "./notifications/NotifUI": { N: { dark: "#111", paper: "#fff" }, timeAgo: () => "now", withSections: (l) => l, NotifHeader: "NotifHeader", NotifFilters: "NotifFilters", NotifSection: "NotifSection", NotifRow: "NotifRow", NotifSkeleton: "NotifSkeleton", NotifEmpty: "NotifEmpty" },
      "../navigation/routes": { navigateAnywhere() {} },
      "../hooks/useFlag": { __esModule: true, default: (name) => name === "unifiedInbox" && flagOn },
      "../utils/notificationStyle": { SOCIAL_TITLES: { like: "new like ❤️", request: "connection request 👤" } },
    });
    const Modal = load(path.join(H.SRC, "components", "NotificationModal.js")).default;
    const m = mount(React.createElement(Modal, { visible: true, onClose() {} }));
    await H.tick(20); m.rerender();
    const filters = H.find(m.tree, (n) => n.type === "NotifFilters");
    const list = H.find(m.tree, (n) => n.type === "FlatList");
    return { gets, writes, filters, list, unread, m };
  };

  let r = await run(false);
  ok(r.gets.length === 1 && r.gets[0] === "https://srv/api/notification/my-notifications", "flag off: the bell list as today (my-notifications only)", r.gets.join());
  ok(r.filters.props.filters.map((f) => f.key).join() === "all,unread,offers,careers,events,other", "flag off: today's filters");
  ok(r.list.props.data.length === 1 && r.list.props.data[0]._id === "old1", "flag off: today's items");

  r = await run(true);
  ok(r.gets.length === 1 && r.gets[0] === "https://srv/api/notification/unified", "flag on: one request, GET /notification/unified", r.gets.join());
  ok(r.filters.props.filters.map((f) => f.label).join(" · ") === "all · unread · for you · campus · system", "flag on: the tabs");
  ok(r.list.props.data.length === 5 && r.unread === 3, "flag on: both lists in one, one unread count (3)", `${r.list.props.data.length} ${r.unread}`);
  r.filters.props.onChange("campus"); r.m.rerender();
  ok(H.find(r.m.tree, (n) => n.type === "FlatList").props.data.map((i) => i._id).join() === "b2", "the campus tab");
  r.filters.props.onChange("all"); r.m.rerender();
  const fl = H.find(r.m.tree, (n) => n.type === "FlatList");
  const rows = fl.props.data.map((item) => fl.props.renderItem({ item })); // FlatList is a stub: render its rows
  rows[1].props.onPress(); // the social like
  await H.tick(5);
  ok(r.writes.includes("put https://srv/api/social/notifications/read/s1") && !r.writes.some((w) => w.includes("/notification/mark-read/s1")), "tapping a social item marks it read in the social list", r.writes.join());
  rows[3].props.onDelete(); // the bell promotion
  await H.tick(5);
  ok(r.writes.includes("delete https://srv/api/notification/delete/b2"), "deleting a bell item uses the bell endpoint");

  console.log("-- wiring");
  const nav = H.read("app/src/navigation/DrawerNavigator.js").split("<HS.Screen").join("<Stack.Screen"); // Q-3a: the home stack's <HS.Screen> (JS or native stack, chosen at start) is the same registration
  ok(/const NotificationScreen = accountOnly\(NotificationsRouteBase, \{ title: "notifications" \}\);/.test(nav) && (nav.match(/<Stack\.Screen name="SocialNotifications" component=\{SocialNotificationScreen\} \/>/g) || []).length === 2, "'Notifications' → NotificationsRoute; 'SocialNotifications' in both stacks");
  ok(/"Notifications", "SocialNotifications"/.test(H.read("app/src/navigation/routes.js")), "routes.js knows SocialNotifications (navigateAnywhere)");
  const route = H.read("app/src/notifications/NotificationsRoute.js");
  ok(/const unified = useFlag\(FLAG\) === true;\s*\n\s*return unified \? <NotificationModal navigation=\{props\.navigation\} \/> : <SocialNotificationScreen \{\.\.\.props\} \/>;/.test(route), "NotificationsRoute: the inbox only with the flag; the social list otherwise");
  ok(/\.\.\.\(knownFlag\("unifiedInbox"\) \? \{ params: \{ scope: "all" \} \} : \{\}\),/.test(H.read("app/src/context/AuthContext.js")), "AuthContext: scope=all only with the flag");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
