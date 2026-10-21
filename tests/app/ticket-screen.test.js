// Mount the real EventTicket screen (+ real ticketData.js, eventsV2.js, plainError.js) in Node
// with a small hook runtime and fake react-native. Its requests go to the REAL server routes
// (feat/event-tickets, real schemas, in-memory store via harness.js). Real tickets, real codes.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SRC = path.join(APP, "app/src");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
const H = require("../harness/tickets-harness.js");
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

let failed = 0, passed = 0;
const ok = (c, label, extra = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${label}${!c && extra ? "  → " + String(extra).slice(0, 400) : ""}`); };

// ── tiny hook runtime ─────────────────────────────────────────
const hooks = new Map();
let cur = null, pendingEffects = [];
const roots = new Map();
let auth = {};
const slot = (init) => { const list = hooks.get(cur.path) || hooks.set(cur.path, []).get(cur.path); const i = cur.i++; if (!(i in list)) list[i] = init(); return [list, i]; };
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }),
  Fragment: "Fragment",
  useState(init) { const [l, i] = slot(() => ({ v: typeof init === "function" ? init() : init })); const owner = cur.path.split("/")[0]; return [l[i].v, (v) => { l[i].v = typeof v === "function" ? v(l[i].v) : v; roots.get(owner)?.(); }]; },
  useRef(init) { const [l, i] = slot(() => ({ current: init })); return l[i]; },
  useMemo(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, v: undefined })); const s = l[i]; if (!s.deps || !deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) { s.v = fn(); s.deps = deps; } return s.v; },
  useCallback(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, v: undefined })); const s = l[i]; if (!s.deps || !deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) { s.v = fn; s.deps = deps; } return s.v; },
  useContext() { return auth; },
  useEffect(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, cleanup: null })); const s = l[i]; if (!deps || !s.deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) pendingEffects.push(() => { if (s.cleanup) s.cleanup(); s.deps = deps; s.cleanup = fn() || null; }); },
};
React.default = React;
function expand(el, p) {
  if (el == null || typeof el !== "object") return el;
  if (Array.isArray(el)) return el.map((c, k) => expand(c, `${p}.${k}`));
  if (typeof el.type === "function") {
    const prev = cur; const np = p + "/" + (el.type.name || "C");
    cur = { path: np, i: 0 }; const out = el.type(el.props); cur = prev;
    return expand(out, np);
  }
  return { type: el.type, props: { ...el.props, children: expand(el.props.children, p + "." + el.type) } };
}
function mount(element) {
  let tree = null; const root = "root" + Math.random();
  const render = () => { tree = expand(element, root); const fx = pendingEffects; pendingEffects = []; fx.forEach((f) => f()); };
  roots.set(root, render); render();
  return { get tree() { return tree; }, unmount: () => roots.delete(root) };
}
function all(tree, pred, out = []) {
  if (tree == null || typeof tree !== "object") return out;
  if (Array.isArray(tree)) { tree.forEach((t) => all(t, pred, out)); return out; }
  if (pred(tree)) out.push(tree);
  all(tree.props?.children, pred, out);
  return out;
}
const text = (tree) => { const parts = []; (function walk(t) { if (t == null || t === false || t === true) return; if (typeof t === "string" || typeof t === "number") { parts.push(String(t)); return; } if (Array.isArray(t)) return t.forEach(walk); walk(t.props?.children); })(tree); return parts.join(" "); };

// ── fakes ─────────────────────────────────────────────────────
const alerts = [];
let lastButtons = [];
const calls = { capture: [], save: [], share: [], perm: [] };
let permStatus = "granted";
let offline = false;
let forward = null;
const httpErr = (status, data) => { const e = new Error("http " + status); e.response = { status, data }; return e; };
const axiosFake = {
  async get(url, cfg) {
    if (offline) { const e = new Error("Network Error"); e.request = {}; throw e; }
    const r = await forward("GET", url, undefined, cfg);
    if (r.status >= 400) throw httpErr(r.status, r.data);
    return { data: r.data };
  },
};
const storage = new Map();
const AsyncStorage = { getItem: async (k) => (storage.has(k) ? storage.get(k) : null), setItem: async (k, v) => { storage.set(k, v); }, removeItem: async (k) => { storage.delete(k); } };
const MOCKS = {
  react: React,
  "react-native": {
    View: "View", Text: "Text", ScrollView: "ScrollView", ActivityIndicator: "ActivityIndicator", TouchableOpacity: "TouchableOpacity",
    StyleSheet: { create: (x) => x, absoluteFill: {}, hairlineWidth: 1 }, Platform: { OS: "android", select: (o) => o.android ?? o.default },
    Linking: { openURL: async (u) => { calls.link = u; }, openSettings: async () => { calls.settings = (calls.settings || 0) + 1; } },
    Alert: { alert: (t, m, btns) => { alerts.push(`${t}: ${m}`); lastButtons = btns || []; } },
  },
  "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
  "@expo/vector-icons": { Ionicons: "Ionicons" },
  "react-native-qrcode-svg": { __esModule: true, default: "QRCode" },
  "react-native-view-shot": { captureRef: async (node, opts) => { calls.capture.push({ node, opts }); return `file:///cache/ticket-${node.code}.png`; } },
  "expo-sharing": { isAvailableAsync: async () => true, shareAsync: async (uri, opts) => { calls.share.push({ uri, opts }); } },
  "expo-media-library": { requestPermissionsAsync: async (writeOnly) => { calls.perm.push(writeOnly); return { status: permStatus }; }, saveToLibraryAsync: async (uri) => { calls.save.push(uri); } },
  "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage },
  axios: { __esModule: true, default: axiosFake, ...axiosFake },
  "../../context/AuthContext": { AuthContext: {} },
  "../../ui": { Button: "Button", EmptyState: "EmptyState", ScreenHeader: "ScreenHeader" },
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [[reqApp.resolve("@babel/plugin-transform-react-jsx"), { runtime: "classic" }], reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
  const m = new Module(file);
  m.filename = file;
  m.require = (id) => {
    if (id in MOCKS) return MOCKS[id];
    if (id.startsWith(".")) return load(require.resolve(path.resolve(path.dirname(file), id).replace(/\\/g, "/").replace(/(\.js)?$/, ".js")));
    return reqApp(id);
  };
  cache.set(file, m.exports);
  m._compile(code, file);
  cache.set(file, m.exports);
  return m.exports;
}
const Ticket = load(path.join(SRC, "screens/Events/EventTicket.js"));
const EventTicket = Ticket.default;

// helpers on the mounted tree
const buttons = (t) => all(t, (n) => n.type === "Button");
const cards = (t) => all(t, (n) => n.type === "View" && n.props.collapsable === false);
const qrs = (t) => all(t, (n) => n.type === "QRCode");
const emptyState = (t) => all(t, (n) => n.type === "EmptyState")[0];
const header = (t) => all(t, (n) => n.type === "ScreenHeader")[0];
const nav = { navigated: [], canGoBack: () => true, goBack() { this.navigated.push("back"); }, navigate(r, p) { this.navigated.push([r, p]); } };
async function show(registrationId, who) {
  auth = who ? { token: who.token, user: { _id: String(who._id), name: who.name } } : {};
  const m = mount(React.createElement(EventTicket, { route: { params: { registrationId } }, navigation: nav }));
  await tick(80);
  return m;
}

(async () => {
  const { srv, call } = await H.start();
  forward = async (method, url, body, cfg) => {
    const who = cfg?.headers?.Authorization ? H.students.concat([H.admin]).find((u) => `Bearer ${u.token}` === cfg.headers.Authorization) : null;
    const r = await call(method, url.replace(/^.*\/api\/events/, "").replace(/\?.*$/, ""), who, body);
    return { status: r.status, data: r.json };
  };
  const [s1, s2, s3] = H.students;
  const admin = H.admin;
  const ACC = [{ method: "easypaisa", accountTitle: "TDC Events", accountNumber: "03001234567" }];
  const create = async (b) => (await call("POST", "/create", admin, { organizer: "TDC", city: "Karachi", ...b })).json;
  const v2 = (eventId, who, extra) => ({ eventId, formVersion: 2, studentName: "Ayesha Khan", email: who.email, whatsapp: "0312-3456789", answers: { university: "MUET" }, ...extra });
  const regOf = (who, ev) => H.stores.Registration.find((x) => String(x.userId) === String(who._id) && String(x.eventId) === String(ev));

  const gig = await create({ title: "Night Gig", type: "Concerts", date: "12 Nov 2026", location: "Expo Centre", details: { artists: ["Band"], maxTicketsPerStudent: 4, gateOpenTime: "18:30" }, ticketTiers: [{ name: "VIP", price: 5000, quantity: 10 }], paymentAccounts: ACC });
  await call("POST", "/register", s1, v2(gig._id, s1, { ticket: { tier: "VIP", quantity: 2 }, payment: { method: "easypaisa", transactionId: "TXN-777001", receiptUrl: "https://res.cloudinary.com/decaxpera/image/upload/v1/r/a.jpg" } }));
  const regPaid = regOf(s1, gig._id);
  await call("PATCH", `/registrations/${regPaid._id}/payment`, admin, { action: "verify" });
  await tick(60);
  const codes = regOf(s1, gig._id).tickets.map((t) => t.code);

  console.log("── real ticket, all fields");
  let m = await show(String(regPaid._id), s1);
  let t = text(m.tree);
  ok(cards(m.tree).length === 2 && header(m.tree).props.title === "my tickets", "2 seats → 2 cards, header 'my tickets'", cards(m.tree).length);
  ok(t.includes("night gig") && t.includes("concerts") && t.includes("12 Nov 2026") && t.includes("18:30") && t.includes("Expo Centre, Karachi") && t.includes("Ayesha Khan"), "event title (lowercase), category, date, time, venue, attendee", t.slice(0, 400));
  ok(t.includes("vip · seat 1 of 2") && t.includes("vip · seat 2 of 2") && t.includes("Rs 10,000 · paid") && t.includes(" paid "), "tier + seat n of m, amount paid, 'paid' pill", t);
  ok(qrs(m.tree).map((q) => q.props.value).join() === codes.join() && t.includes(codes[0]) && t.includes(codes[1]), "QR value = the ticket code only, code printed under it", JSON.stringify(qrs(m.tree).map((q) => q.props.value)));
  ok(/tdc \./.test(t) || t.includes("tdc ."), "tdc logo mark");
  ok(!/undefined|null|NaN|\[object/.test(t), "no undefined / null in the text");
  ok(buttons(m.tree).filter((b) => b.props.title === "download ticket").length === 2 && buttons(m.tree).filter((b) => b.props.title === "share").length === 2, "'download ticket' + 'share' per seat");
  ok(buttons(m.tree).find((b) => b.props.title === "download ticket").props.variant === "primary" && buttons(m.tree).find((b) => b.props.title === "share").props.variant === "secondary", "download is the main button, share the second");

  console.log("── save / share as an image");
  cards(m.tree).forEach((c, i) => c.props.ref({ code: codes[i] })); // the native views
  await buttons(m.tree).filter((b) => b.props.title === "download ticket")[1].props.onPress();
  await tick();
  ok(calls.perm[0] === true && calls.capture[0]?.node.code === codes[1] && calls.capture[0].opts.format === "png" && calls.save[0] === `file:///cache/ticket-${codes[1]}.png` && alerts.at(-1) === "ticket saved: your ticket is in your gallery.", "download: write-only permission, captures seat 2's card, saves it, says 'ticket saved'", JSON.stringify({ calls, a: alerts.at(-1) }));
  ok(text(m.tree).includes("saved to your gallery"), "plain success line under the saved seat");
  permStatus = "denied";
  await buttons(m.tree).filter((b) => b.props.title === "download ticket")[0].props.onPress();
  ok(calls.capture.length === 1 && /^allow saving photos: tdc needs permission to save your ticket to the gallery/.test(alerts.at(-1)), "permission denied: nothing captured, plain-word message", alerts.at(-1));
  lastButtons.find((b) => b.text === "open settings").onPress();
  await tick();
  ok(calls.settings === 1 && lastButtons.some((b) => b.text === "not now"), "permission denied: 'open settings' opens the phone settings");
  permStatus = "granted";
  await buttons(m.tree).filter((b) => b.props.title === "share")[0].props.onPress();
  ok(calls.share[0]?.uri === `file:///cache/ticket-${codes[0]}.png` && calls.share[0].opts.mimeType === "image/png", "share: seat 1 as a png", JSON.stringify(calls.share));
  m.unmount();

  m.unmount();
  m = mount(React.createElement(EventTicket, { route: { params: { registrationId: String(regPaid._id), download: true } }, navigation: nav }));
  await tick(80);
  ok(text(m.tree).includes("tap download ticket under each seat to save it to your gallery."), "opened from 'download tickets': the download hint shows first");
  console.log("── cancelled seat");
  await call("PATCH", `/registrations/${regPaid._id}/tickets/${codes[0]}`, admin, { action: "cancel" });
  m = await show(String(regPaid._id), s1);
  t = text(m.tree);
  const stamp = all(m.tree, (n) => n.type === "Text" && n.props.children === "cancelled");
  ok(stamp.length >= 2 && t.includes("this ticket was cancelled and won't get you in."), "cancelled: stamp + pill + note", t.slice(0, 300));
  ok(buttons(m.tree).filter((b) => b.props.title === "download ticket").length === 1, "no save / share on the cancelled seat (the other keeps them)");
  const qrBoxes = all(m.tree, (n) => n.type === "View" && Array.isArray(n.props.style) && n.props.style.some((s) => s && s.opacity === 0.15));
  ok(qrBoxes.length === 1, "cancelled QR is dimmed");
  m.unmount();

  console.log("── missing fields are hidden");
  const talk = await create({ title: "Free Talk", type: "Seminar" }); // date TBA, venue placeholder
  await call("POST", "/register", s2, { eventId: talk._id, studentName: "Bilal", whatsapp: "0300", email: s2.email });
  const regFree = regOf(s2, talk._id);
  m = await show(String(regFree._id), s2);
  t = text(m.tree);
  ok(cards(m.tree).length === 1 && header(m.tree).props.title === "my ticket" && t.includes("free talk") && t.includes("Bilal") && t.includes("admit one") && t.includes("free"), "free ticket: 1 card, 'admit one', 'free'", t);
  ok(!t.includes("date") && !t.includes("time") && !t.includes("venue") && t.includes("city Karachi") && !t.includes("TBA") && !t.includes("Venue TBD") && !/undefined|null/.test(t), "no date / time / venue rows (placeholders); only the real city", t);
  ok(!t.includes(" paid "), "no 'paid' pill on a free ticket");

  console.log("── offline: the saved copy");
  offline = true;
  const m2 = await show(String(regFree._id), s2);
  t = text(m2.tree);
  ok(cards(m2.tree).length === 1 && t.includes("free talk") && /offline · saved copy from \d+ [a-z]{3}, \d\d:\d\d/.test(t), "offline: the last ticket opens with an 'offline · saved copy' note", t.slice(0, 200));
  const m3 = await show(String(regPaid._id), s2); // never opened by this account
  ok(emptyState(m3.tree) && /connection/.test(emptyState(m3.tree).props.line), "offline and never opened: plain 'check your connection'", JSON.stringify(emptyState(m3.tree)?.props));
  offline = false;

  console.log("── no ticket / not yours / signed out");
  await call("POST", "/register", s3, v2(gig._id, s3, { ticket: { tier: "VIP", quantity: 1 }, payment: { method: "easypaisa", transactionId: "TXN-777002", receiptUrl: "https://res.cloudinary.com/decaxpera/image/upload/v1/r/b.jpg" } }));
  m = await show(String(regOf(s3, gig._id)._id), s3);
  ok(emptyState(m.tree)?.props.title === "no ticket yet." && emptyState(m.tree).props.line === "your ticket comes when the payment is verified.", "pending payment: 'no ticket yet.' + server's plain reason", JSON.stringify(emptyState(m.tree)?.props));
  m = await show(String(regPaid._id), s2);
  ok(emptyState(m.tree)?.props.line === "this ticket isn't available." && cards(m.tree).length === 0, "someone else's ticket: not shown", JSON.stringify(emptyState(m.tree)?.props));
  m = await show(String(regPaid._id), null);
  ok(emptyState(m.tree)?.props.line === "sign in to see your ticket.", "signed out: 'sign in to see your ticket.'");
  // a ticket that stops existing (registration cancelled) also leaves the phone
  await call("DELETE", `/register/${talk._id}`, s2);
  m = await show(String(regFree._id), s2);
  offline = true;
  const m4 = await show(String(regFree._id), s2);
  offline = false;
  ok(cards(m.tree).length === 0 && cards(m4.tree).length === 0, "cancelled registration: gone online, and the saved copy is dropped");

  console.log("── download button on the mine card / event details");
  {
    const TB = load(path.join(SRC, "screens/Events/TicketButton.js")).default;
    const D = load(path.join(SRC, "screens/Events/ticketData.js"));
    const opened = [];
    const btn = (registration) => mount(React.createElement(TB, { registration, onOpen: (r) => opened.push(r) })).tree;
    const live = (await call("GET", "/my-registrations", s1)).json.find((x) => String(x._id) === String(regPaid._id));
    let tr = btn(live); // 2 seats, seat 1 cancelled above → 1 valid
    const t1 = all(tr, (n) => n.type === "TouchableOpacity")[0];
    ok(t1 && text(t1) === "download ticket" && t1.props.accessibilityRole === "button", "verified, 1 valid seat → 'download ticket'", text(tr));
    t1.props.onPress();
    ok(opened[0] === live, "tap → opens that registration's ticket");
    const two = { ...live, tickets: live.tickets.map((t) => ({ ...t, status: "valid" })) };
    ok(text(btn(two)) === "download tickets (2)", "2 valid seats → 'download tickets (2)'", text(btn(two)));
    const pend = (await call("GET", "/my-registrations", s3)).json.find((x) => x.payment?.status === "pending");
    tr = btn(pend);
    ok(text(tr) === "ticket after payment is confirmed" && !all(tr, (n) => n.type === "TouchableOpacity").length, "pending → 'ticket after payment is confirmed', no button", text(tr));
    ok(btn({ ...live, payment: { status: "rejected" } }) == null && btn({ ...two, payment: { status: "rejected" } }) == null, "rejected → nothing");
    ok(btn({ ...live, tickets: live.tickets.map((t) => ({ ...t, status: "cancelled" })) }) == null, "all cancelled → no download");
    ok(btn({ payment: { status: "verified" } }) == null && btn(null) == null, "verified without a ticket yet → nothing");
    const freeLive = { payment: { status: "not_required" }, tickets: [{ code: "TDC-2345-6789", status: "valid" }] };
    ok(text(btn(freeLive)) === "download ticket" && D.ticketButtonState({ tickets: [{ status: "valid" }] })?.kind === "download", "free event (no payment) → 'download ticket'");
    const evSrc = fs.readFileSync(path.join(SRC, "screens/Events/Events.js"), "utf8");
    ok(/<TicketButton registration=\{registration\} onOpen=\{onTicket\} \/>/.test(evSrc) && /<TicketButton\s+registration=\{registrationFor\(selectedEvent\._id\)\}/.test(evSrc) && /download: true/.test(evSrc), "Events: under the payment status, and in the details sheet of a registered event; opens with download ready");
  }
  console.log("── push tap → the ticket");
  const anyThing = new Proxy(function () {}, { get: (t2, k) => (k === "__esModule" ? false : k === "then" ? undefined : anyThing), apply: () => anyThing });
  const PNfile = path.join(SRC, "utils/pushNotifications.js");
  const { code } = babel.transformSync(fs.readFileSync(PNfile, "utf8"), { filename: PNfile, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
  const pm = new Module(PNfile); pm.filename = PNfile;
  pm.require = (id) => (id === "react-native" ? { Platform: { OS: "android" } } : new Proxy({}, { get: (t2, k) => (k === "__esModule" ? true : k === "then" ? undefined : anyThing) }));
  pm._compile(code, PNfile);
  const r1 = pm.exports.getRouteFromNotificationData({ type: "event", route: "Events", params: { ticketRegistrationId: "abc" }, ticketRegistrationId: "abc" });
  const r2 = pm.exports.getRouteFromNotificationData({ route: "Events", params: { openEventId: "e1" } });
  ok(r1.route === "EventTicket" && r1.params.registrationId === "abc", "ticket push → EventTicket { registrationId }", JSON.stringify(r1));
  ok(r2.route === "Events" && r2.params.openEventId === "e1", "other pushes unchanged");
  const ev = fs.readFileSync(path.join(SRC, "screens/Events/Events.js"), "utf8");
  const dn = fs.readFileSync(path.join(SRC, "navigation/DrawerNavigator.js"), "utf8");
  ok(/useOpenFromParams\("ticketRegistrationId"/.test(ev) && /name="EventTicket" component=\{EventTicket\}/.test(dn), "Events opens the ticket from { ticketRegistrationId } (in-app list / banner); screen registered");

  srv.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
