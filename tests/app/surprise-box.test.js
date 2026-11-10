// Surprise Boxes in the app (FLAG_SURPLUS_BOXES): the flags gate, the Discounts card, the list (no
// location prompt until asked), every disclosure before confirming, the 10-minute hold and its expiry,
// confirm with accepted terms, the order with code + QR and timeline, cancel, a support case, limits,
// accessibility and placement (no new tab).
//   node tests/app/surprise-box.test.js
// Real app modules (Babel) with fakes for React Native, phone storage and the network.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SRC = path.join(APP, "app/src");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  \u2192 " + String(x).slice(0, 400) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8");
global.__DEV__ = false;

// (helpers copied from tests/app/responsiveness.test.js)
// \u2500\u2500 hook runtime \u2500\u2500
function makeReact() {
  const hooks = new Map(); let cur = null; let pending = []; const roots = new Map(); const renders = {};
  const slot = (init) => { const l = hooks.get(cur.path) || hooks.set(cur.path, []).get(cur.path); const i = cur.i++; if (!(i in l)) l[i] = init(); return [l, i]; };
  const contexts = new Map();
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }),
    Fragment: "Fragment",
    createContext: (dflt) => { const c = { _default: dflt, Provider: "Provider" }; return c; },
    useState(init) { const [l, i] = slot(() => ({ v: typeof init === "function" ? init() : init })); const root = cur.path.split("/")[0]; return [l[i].v, (v) => { const nv = typeof v === "function" ? v(l[i].v) : v; if (Object.is(nv, l[i].v)) return; l[i].v = nv; roots.get(root)?.(); }]; },
    useRef(init) { const [l, i] = slot(() => ({ current: init })); return l[i]; },
    useMemo(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, v: undefined })); const s = l[i]; if (!s.deps || !deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) { s.v = fn(); s.deps = deps; } return s.v; },
    useCallback(fn, deps) { return React.useMemo(() => fn, deps); },
    useContext(ctx) { return contexts.has(ctx) ? contexts.get(ctx) : ctx?._default ?? {}; },
    useEffect(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, cleanup: null })); const s = l[i]; if (!deps || !s.deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) pending.push(() => { if (s.cleanup) s.cleanup(); s.deps = deps; s.cleanup = fn() || null; }); },
    memo: (c) => c,
    forwardRef: (c) => c,
    useSyncExternalStore(subscribe, getSnapshot) {
      const [l, i] = slot(() => ({ unsub: null }));
      const [, force] = React.useState(0);
      if (!l[i].unsub) l[i].unsub = subscribe(() => force((x) => x + 1));
      return getSnapshot();
    },
  };
  React.useLayoutEffect = React.useEffect;
  React.default = React;
  const expand = (el, p) => {
    if (el == null || typeof el !== "object") return el;
    if (Array.isArray(el)) return el.map((c, k) => expand(c, `${p}.${k}`));
    if (typeof el.type === "function") { const prev = cur; const np = p + "/" + (el.type.name || "C"); cur = { path: np, i: 0 }; renders[el.type.name] = (renders[el.type.name] || 0) + 1; const out = el.type(el.props); cur = prev; return expand(out, np); }
    const out = { type: el.type, props: { ...el.props, children: expand(el.props.children, p + "." + (el.type?.displayName || el.type)) } };
    // host refs (React 19: ref is a prop): point them at the expanded node
    const ref = el.props?.ref;
    if (ref && typeof ref === "object" && "current" in ref) ref.current = out;
    else if (typeof ref === "function") ref(out);
    return out;
  };
  const mount = (element) => {
    const root = "r" + Math.random().toString(36).slice(2); let tree = null;
    const render = () => { tree = expand(element, root); const fx = pending; pending = []; fx.forEach((f) => f()); };
    roots.set(root, render); render();
    return { get tree() { return tree; }, rerender: (el) => { if (el) element = el; render(); } };
  };
  return { React, mount, renders, contexts };
}

function loader(mocks) {
  const cache = new Map();
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports;
    const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), {
      filename: file, babelrc: false, configFile: false,
      plugins: [[reqApp.resolve("@babel/plugin-transform-react-jsx"), { runtime: "classic" }], reqApp.resolve("@babel/plugin-transform-modules-commonjs")],
    });
    const m = new Module(file); m.filename = file;
    m.require = (id) => {
      if (id in mocks) return mocks[id];
      if (id.startsWith(".")) {
        const abs = path.resolve(path.dirname(file), id);
        for (const key of Object.keys(mocks)) if (key.startsWith("/") && abs.replace(/\\/g, "/").endsWith(key)) return mocks[key];
        return load(require.resolve(abs.replace(/(\.js)?$/, ".js")));
      }
      return reqApp(id);
    };
    cache.set(file, m); m._compile(code, file);
    return m.exports;
  };
  return load;
}

// \u2500\u2500 react-native fakes \u2500\u2500
const flat = (st) => (Array.isArray(st) ? Object.assign({}, ...st.flat(Infinity).filter(Boolean)) : st || {});
function makeRN(extra = {}) {
  class Value { constructor(v) { this.v = v; } setValue(v) { this.v = v; } interpolate() { return this; } stopAnimation() {} }
  const anim = () => ({ start: (cb) => cb && cb({ finished: true }), stop() {} });
  const loops = { started: 0, stopped: 0 };
  return {
    loops,
    rn: {
      View: "View", Text: "Text", Pressable: "Pressable", TouchableOpacity: "TouchableOpacity", Image: "Image", ScrollView: "ScrollView", FlatList: "FlatList", Modal: "Modal", TextInput: "TextInput", ActivityIndicator: "ActivityIndicator", RefreshControl: "RefreshControl", KeyboardAvoidingView: "KeyboardAvoidingView", StatusBar: "StatusBar",
      StyleSheet: { create: (x) => x, flatten: flat, absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, absoluteFillObject: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, hairlineWidth: 1 },
      Dimensions: { get: () => ({ width: 390, height: 844 }) },
      Platform: { OS: "android", select: (o) => o.android ?? o.default },
      AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) },
      Animated: { Value, View: "Animated.View", Text: "Animated.Text", spring: anim, timing: anim, parallel: anim, sequence: anim, loop: () => ({ start() { loops.started++; }, stop() { loops.stopped++; } }), event: () => () => {} },
      Easing: { bezier: () => (x) => x, out: (f) => f, in: (f) => f, inOut: (f) => f, cubic: (x) => x, ease: (x) => x, linear: (x) => x },
      ...extra,
    },
  };
}

const textOf = (n) => (n == null || n === false ? "" : typeof n === "string" || typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(textOf).join("") : textOf(n.props?.children));
const find = (n, pred) => { let hit = null; (function w(x) { if (!x || hit || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(w); if (pred(x)) { hit = x; return; } w(x.props?.children); })(n); return hit; };
const byLabel = (tree, label) => find(tree, (x) => x.props?.accessibilityLabel === label);

(async () => {
  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 api/surplusApi.js \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  console.log("\u2500\u2500 the flags gate (api/surplusApi.js)");
  {
    const store = { token: null, isGuest: null };
    const calls = [];
    let flagOn = true;
    const api = { get: async (url) => { calls.push(url); if (url === "/app/flags/me") return { data: { surplusBoxes: flagOn } }; return { data: { success: true, data: {} } }; }, post: async () => ({}), delete: async () => ({}) };
    const load = loader({ "@react-native-async-storage/async-storage": { getItem: async (k) => store[k] }, "./api": { __esModule: true, default: api } });
    const S = load(path.join(SRC, "api/surplusApi.js"));
    ok((await S.surplusEnabled()) === false && calls.length === 0, "signed out: off, no request");
    store.token = "g"; store.isGuest = "true";
    ok((await S.surplusEnabled()) === false && calls.length === 0, "guest: off, no request");
    store.token = "tok-a"; store.isGuest = "false";
    ok((await S.surplusEnabled()) === true && (await S.surplusEnabled()) === true && calls.filter((c) => c === "/app/flags/me").length === 1, "pilot student: on, /flags/me asked once");
    store.token = "tok-b"; flagOn = false;
    ok((await S.surplusEnabled()) === false, "another account outside the pilot: off");
  }

  const { React, mount } = makeReact();
  const alerts = [];
  const { rn } = makeRN({ Alert: { alert: (title, text, buttons) => { alerts.push({ title, text, buttons }); const yes = (buttons || []).find((b) => b.text === "yes"); if (yes) yes.onPress(); } }, Switch: "Switch", TextInput: "TextInput" });
  const icons = { "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon" } };
  const sent = [];
  let enabled = true;
  const soon = (min) => new Date(Date.now() + min * 60000).toISOString();
  const disclosures = { contentsMayVary: true, contentsNote: "Contents may vary: it's what the brand has left that day.", description: "breads and pastries", allergens: ["gluten", "dairy"], allergenNotes: "contains gluten and dairy; may contain nuts", allergenWarning: "Ask the brand at pickup if you have an allergy.", dietary: ["vegetarian"], bestBefore: soon(600), pickupStart: soon(180), pickupEnd: soon(240), payment: "Pay PKR 450 per box at pickup. tdc doesn't take payment.", cancellationRule: "Pay at pickup. You can cancel in the app until 30 minutes before pickup starts; after that, not collecting counts as a no-show.", cancelUntil: soon(150), branchName: "Alpha Clifton" };
  const listing = { id: "l1", title: "Evening bakery box", brand: { id: "b1", name: "Alpha Bakery" }, branch: { id: "br1", name: "Alpha Clifton", city: "Karachi", address: "Clifton block 5" }, price: 450, listPrice: 1200, currency: "PKR", quantityLeft: 3, quantityTotal: 5, pickupStart: soon(180), pickupEnd: soon(240), available: true, status: "published", distanceKm: 1.2, maxPerOrder: 2, disclosures, image: "https://res.cloudinary.com/testcloud/image/upload/box1.jpg" };
  let holdExpires = soon(10);
  const order = (extra = {}) => ({ id: "o1", ref: "SB-ABC123", state: "ORDER_PLACED", qty: 2, price: { unitPrice: 450, listPrice: 1200, total: 900, currency: "PKR" }, payment: { mode: "pay_at_pickup", state: "unpaid", note: "Pay PKR 900 at pickup" }, title: "Evening bakery box", brand: { name: "Alpha Bakery" }, branch: { name: "Alpha Clifton", address: "Clifton block 5" }, pickupStart: soon(180), pickupEnd: soon(240), disclosures, history: [{ from: "RESERVED", to: "ORDER_PLACED", byRole: "student", at: new Date().toISOString() }], version: 1, canCancel: true, cancelUntil: soon(150), canDispute: false, pickup: { code: "K7QM2X", qr: "TDCBOX1:o1:K7QM2X", validUntil: soon(240) }, supportCase: null, ...extra });
  let current = order();
  let holdError = null;
  const studioMock = {
    surplusEnabled: async () => enabled,
    newKey: (() => { let n = 0; return () => `key-${++n}`; })(),
    STATE: { ORDER_PLACED: { label: "ordered", step: 1 }, CONFIRMED: { label: "confirmed by the brand", step: 2 }, READY_FOR_PICKUP: { label: "ready for pickup", step: 3 }, COMPLETED: { label: "picked up", step: 4 }, CUSTOMER_CANCELLED: { label: "you cancelled", step: -1 }, NO_SHOW: { label: "not collected (no-show)", step: -1 } },
    CASE_REASONS: [["food_safety", "food safety problem"], ["other", "something else"]],
    pkTime: (iso) => (iso ? new Date(iso).toISOString().slice(11, 16) : ""),
    surplusApi: {
      listings: async (params) => { sent.push({ what: "listings", params }); return { listings: [listing, { ...listing, id: "l2", title: "Sold out box", available: false, quantityLeft: 0, status: "sold_out", image: null }] }; },
      listing: async () => listing,
      hold: async (listingId, qty, key) => { sent.push({ what: "hold", listingId, qty, key }); if (holdError) throw holdError; return { hold: { id: "h1", listingId, qty, state: "active", expiresAt: holdExpires }, disclosures, total: 450 * qty }; },
      releaseHold: async (id) => { sent.push({ what: "release", id }); return {}; },
      placeOrder: async (holdId, key) => { sent.push({ what: "order", holdId, key }); current = order(); return current; },
      myOrders: async () => [current],
      order: async () => current,
      cancel: async (id, version) => { sent.push({ what: "cancel", id, version }); current = order({ state: "CUSTOMER_CANCELLED", canCancel: false, pickup: null }); return current; },
      openCase: async (body) => { sent.push({ what: "case", ...body }); current = { ...current, supportCase: { status: "open", decision: null } }; return {}; },
    },
  };
  const location = { granted: false };
  const Location = {
    Accuracy: { Balanced: 3 },
    getForegroundPermissionsAsync: async () => ({ status: location.granted ? "granted" : "undetermined" }),
    requestForegroundPermissionsAsync: async () => { location.asked = true; location.granted = true; return { status: "granted" }; },
    getLastKnownPositionAsync: async () => ({ coords: { latitude: 24.81, longitude: 67.03 } }),
    getCurrentPositionAsync: async () => ({ coords: { latitude: 24.81, longitude: 67.03 } }),
  };
  const load = loader({
    react: React, "react-native": rn, ...icons,
    "expo-location": Location,
    "react-native-qrcode-svg": { __esModule: true, default: "QRCode" },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "../ui": { ScreenHeader: (p) => React.createElement("Header", { accessibilityLabel: "header" }, p.title) },
    "../api/surplusApi": studioMock,
  });
  const SurpriseBoxes = load(path.join(SRC, "screens/SurpriseBoxes.js")).default;
  const SurpriseBoxCard = load(path.join(SRC, "components/SurpriseBoxCard.js")).default;
  const settle = async (root, n = 4) => { for (let i = 0; i < n; i++) { await tick(15); root.rerender(); } };
  const navigation = { navigate: () => {}, goBack: () => {} };

  console.log("\u2500\u2500 the Discounts card");
  enabled = false;
  let root = mount(React.createElement(SurpriseBoxCard, { onOpen: () => sent.push({ what: "open" }) }));
  await settle(root);
  ok(root.tree == null || textOf(root.tree) === "", "flag off: the card renders nothing (Discounts unchanged)");
  enabled = true;
  root = mount(React.createElement(SurpriseBoxCard, { onOpen: () => sent.push({ what: "open" }) }));
  await settle(root);
  let t = textOf(root.tree);
  ok(t.includes("surprise boxes near you") && t.includes("1 on sale") && t.includes("pick up and pay at the brand"), "pilot: 'surprise boxes near you' with how many are on sale", t);
  find(root.tree, (x) => x.props?.accessibilityRole === "button").props.onPress();
  ok(sent.some((s) => s.what === "open"), "tapping it opens the Surprise Boxes screen");

  console.log("\u2500\u2500 flag off / list");
  enabled = false;
  root = mount(React.createElement(SurpriseBoxes, { route: { params: {} }, navigation }));
  await settle(root);
  ok(textOf(root.tree).includes("aren't available for your account"), "flag off: the screen says it isn't available");
  enabled = true;
  sent.length = 0;
  root = mount(React.createElement(SurpriseBoxes, { route: { params: {} }, navigation }));
  await settle(root);
  t = textOf(root.tree);
  ok(t.includes("Evening bakery box") && t.includes("PKR 450") && t.includes("PKR 1,200") && t.includes("3 left") && t.includes("sold out"), "list: price vs usual price, boxes left, sold out", t.slice(0, 300));
  ok(!location.asked && sent.find((s) => s.what === "listings")?.params?.lat === undefined, "no location prompt on opening; no distance without permission");
  byLabel(root.tree, "show distance").props.onPress();
  await settle(root);
  ok(location.asked && sent.filter((s) => s.what === "listings").pop().params.lat === 24.81 && textOf(root.tree).includes("1.2 km"), "'show distance' asks for location, then sends it and shows the distance");

  const images = (tree) => { const out = []; const walk = (x) => { if (!x || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(walk); if (x.type === "Image") out.push(x.props); walk(x.props?.children); }; walk(tree); return out; };
  ok(images(root.tree).length === 1 && images(root.tree)[0].source?.uri === listing.image, "photo: the box with a photo shows it in the list; the one without shows none (as before)", JSON.stringify(images(root.tree).map((i) => i.source)));
  console.log("\u2500\u2500 detail: every disclosure before confirming");
  find(root.tree, (x) => typeof x.props?.accessibilityLabel === "string" && x.props.accessibilityLabel.startsWith("Evening bakery box from Alpha Bakery")).props.onPress();
  await settle(root);
  t = textOf(root.tree);
  ok(images(root.tree).some((i) => i.source?.uri === listing.image && i.accessibilityLabel === "photo of Evening bakery box"), "detail: the photo at the top, described for screen readers");
  ok(["Contents may vary", "allergens: contains gluten and dairy; may contain nuts (gluten, dairy)", "Ask the brand at pickup if you have an allergy", "best before", "pickup", "at Alpha Clifton", "cancel in the app until 30 minutes before pickup starts", "Pay PKR 450 per box at pickup"].every((w) => t.includes(w)), "contents may vary, allergens, best-before, pickup window, cancellation rule, pay at pickup", t.slice(0, 600));
  byLabel(root.tree, "2 boxes").props.onPress();
  root.rerender();
  ok(textOf(root.tree).includes("total PKR 900, paid at pickup"), "choosing 2 boxes shows the total to pay at pickup");
  ok(!byLabel(root.tree, "3 boxes"), "never more than 2 boxes");
  byLabel(root.tree, "hold for 10 minutes").props.onPress();
  await settle(root);
  ok(sent.some((s) => s.what === "hold" && s.listingId === "l1" && s.qty === 2 && s.key), "hold: the listing, 2 boxes and an idempotency key");

  console.log("\u2500\u2500 hold: 10-minute timer, confirm");
  t = textOf(root.tree);
  ok(/held for you: (9:5\d|10:00)/.test(t) && t.includes("pay PKR 900 at pickup"), "the 10-minute timer and the amount", t.slice(0, 200));
  ok(t.includes("allergens: contains gluten") && t.includes("Contents may vary"), "the disclosures are on the confirm screen too");
  ok(byLabel(root.tree, "confirm order").props.disabled === true, "confirm stays off until the terms are accepted");
  find(root.tree, (x) => x.type === "Switch").props.onValueChange(true);
  root.rerender();
  byLabel(root.tree, "confirm order").props.onPress();
  await settle(root);
  ok(sent.some((s) => s.what === "order" && s.holdId === "h1" && s.key), "confirming sends the hold and an idempotency key");

  console.log("\u2500\u2500 my order: code + QR, timeline, cancel, dispute");
  t = textOf(root.tree);
  ok(t.includes("Pay PKR 900 at pickup") && t.includes("K7QM2X") && t.includes("works once, at Alpha Clifton"), "the order: pay at pickup, the 6-character code, where it works", t.slice(0, 400));
  ok(!!find(root.tree, (x) => x.type === "QRCode" && x.props.value === "TDCBOX1:o1:K7QM2X"), "the QR of the pickup code");
  ok(t.includes("status: ordered") && t.includes("confirmed") && t.includes("ready for pickup") && t.includes("picked up"), "a status timeline");
  byLabel(root.tree, "cancel order").props.onPress();
  await settle(root);
  ok(sent.some((s) => s.what === "cancel" && s.id === "o1" && s.version === 1) && alerts.some((a) => a.title === "cancel this order?"), "cancel asks first, then sends the version");
  ok(!find(root.tree, (x) => x.type === "QRCode") && textOf(root.tree).includes("you cancelled"), "a cancelled order shows no code");

  current = order({ state: "COMPLETED", canCancel: false, pickup: null, canDispute: true, disputeUntil: soon(60 * 20), payment: { mode: "pay_at_pickup", state: "paid_at_pickup", note: "" } });
  root = mount(React.createElement(SurpriseBoxes, { route: { params: { orderId: "o1" } }, navigation }));
  await settle(root);
  t = textOf(root.tree);
  ok(t.includes("paid PKR 900 at pickup") && !t.includes("cancel order"), "a collected order: paid at pickup, no cancel");
  byLabel(root.tree, "something went wrong").props.onPress();
  root.rerender();
  ok(textOf(root.tree).includes("nothing to refund here") && byLabel(root.tree, "send to tdc").props.disabled === true, "a support case needs a reason; it says nothing is refunded");
  byLabel(root.tree, "food safety problem").props.onPress();
  root.rerender();
  find(root.tree, (x) => x.type === "TextInput").props.onChangeText("the bread was mouldy");
  root.rerender();
  byLabel(root.tree, "send to tdc").props.onPress();
  await settle(root);
  ok(sent.some((s) => s.what === "case" && s.orderId === "o1" && s.reason === "food_safety" && s.description === "the bread was mouldy"), "the case is sent with the reason and what happened");
  ok(textOf(root.tree).includes("tdc is looking at it"), "the order shows the open case");

  current = order({ canCancel: false, cancelUntil: soon(-5) });
  root = mount(React.createElement(SurpriseBoxes, { route: { params: { orderId: "o1" } }, navigation }));
  await settle(root);
  ok(!byLabel(root.tree, "cancel order") && textOf(root.tree).includes("counts as a no-show"), "within 30 minutes of pickup: no cancel, the no-show rule is explained");

  console.log("\u2500\u2500 hold expiry and limits");
  holdExpires = new Date(Date.now() + 1200).toISOString();
  root = mount(React.createElement(SurpriseBoxes, { route: { params: {} }, navigation }));
  await settle(root);
  find(root.tree, (x) => typeof x.props?.accessibilityLabel === "string" && x.props.accessibilityLabel.startsWith("Evening bakery box from Alpha Bakery")).props.onPress();
  await settle(root);
  byLabel(root.tree, "hold for 10 minutes").props.onPress();
  await settle(root);
  await tick(1600); root.rerender(); await settle(root);
  ok(alerts.some((a) => a.title === "time ran out") && textOf(root.tree).includes("hold for 10 minutes"), "when the 10 minutes run out the student is told and goes back to the box");
  holdError = Object.assign(new Error("You already have an active Surprise Box order with this brand."), { code: "ACTIVE_ORDER_WITH_BRAND", orderId: "o9" });
  byLabel(root.tree, "hold for 10 minutes").props.onPress();
  await settle(root);
  ok(alerts.some((a) => a.title === "you already have an order here" && (a.buttons || []).some((b) => b.text === "see it")), "one active order per brand: explained, with a link to the order");

  console.log("-- notification taps open the order");
  {
    const loadP = loader({ "expo-notifications": {}, "expo-device": {}, "expo-constants": { __esModule: true, default: {} }, "react-native": { Platform: { OS: "android" } }, "@react-native-async-storage/async-storage": { getItem: async () => null } });
    const P = loadP(path.join(SRC, "utils/pushNotifications.js"));
    // what the server sends for a student's Surprise Box notification (services/surplus/notifications.js tapData)
    const payload = { surplusOrderId: "o7", ref: "SB-XYZ789", eventType: "READY_FOR_PICKUP", screen: "SurpriseBoxes", params: { orderId: "o7" } };
    const r = P.getRouteFromNotificationData(payload);
    ok(r.route === "SurpriseBoxes" && r.params.orderId === "o7" && !r.params.offerId, "push tap: the server's payload opens SurpriseBoxes on that order (not an offer)", JSON.stringify(r));
    const popup = read("app/src/hooks/useNotificationPopup.js");
    const modal = read("app/src/components/NotificationModal.js");
    const banner = read("app/src/components/NotificationBanner.js");
    ok(popup.includes("data.screen") && popup.includes("data.params") && modal.includes("m.screen") && modal.includes("m.params") && banner.includes("meta?.screen") && banner.includes("meta?.params"), "the in-app banner, the notification list and the banner card use the same screen + params");
    const drawer = read("app/src/navigation/DrawerNavigator.js");
    ok(drawer.includes('<Stack.Screen name="Career" component={Career} />') && drawer.includes('name="SurpriseBoxes"'), "SurpriseBoxes sits in the same stack as Career (where notification taps already go)");
    const opened = [];
    const realOrder = studioMock.surplusApi.order;
    studioMock.surplusApi.order = async (id) => { opened.push(id); return { ...order(), id, ref: `SB-${id}` }; };
    const rootT = mount(React.createElement(SurpriseBoxes, { route: { params: { orderId: "o1" } }, navigation }));
    await settle(rootT);
    rootT.rerender(React.createElement(SurpriseBoxes, { route: { params: { orderId: "o7" } }, navigation }));
    await settle(rootT);
    ok(opened.join() === "o1,o7" && textOf(rootT.tree).includes("SB-o7"), "a tap while the screen is already open opens the new order", opened.join());
    studioMock.surplusApi.order = async () => ({ ...order(), pickup: { code: null, qr: null, validUntil: soon(240), unavailable: true } });
    const rootU = mount(React.createElement(SurpriseBoxes, { route: { params: { orderId: "o1" } }, navigation }));
    await settle(rootU);
    ok(textOf(rootU.tree).includes("can't be shown right now") && !find(rootU.tree, (x) => x.type === "QRCode"), "if the server can't make the code, the app says so (no empty QR)");
    studioMock.surplusApi.order = realOrder;
  }

  console.log("\u2500\u2500 accessibility and placement");
  const src = read("app/src/screens/SurpriseBoxes.js");
  ok(/minHeight: 44/.test(src) && /accessibilityLiveRegion="polite"/.test(src) && /accessibilityRole="switch"/.test(src), "44 pt targets, the timer is announced, the terms switch is labelled");
  const all = [];
  (function walk(x) { if (!x || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(walk); all.push(x); walk(x.props?.children); })(root.tree);
  ok(all.filter((x) => x.type === "Text").every((x) => x.props.maxFontSizeMultiplier), "every text caps its font scale");
  const brands = read("app/src/screens/Brands.js");
  ok(brands.includes('<SurpriseBoxCard onOpen={() => navigation.navigate("SurpriseBoxes")}'), "the card sits in the Discounts (brands) screen");
  ok(read("app/src/navigation/HomeStack.js").includes('name="SurpriseBoxes"') && read("app/src/navigation/DrawerNavigator.js").includes('name="SurpriseBoxes"'), "the screen is registered next to Brands in both stacks");
  const tabs = read("app/src/navigation/TabNavigator.js");
  ok((tabs.match(/<Tab\.Screen/g) || []).length === 5 && tabs.includes('"SurpriseBoxes"'), "no new main tab; the tab bar hides on the screen");
  const babel2 = reqApp("@babel/core");
  let compiled = 0;
  const files = ["app/src/api/surplusApi.js", "app/src/components/SurpriseBoxCard.js", "app/src/screens/SurpriseBoxes.js", "app/src/screens/Brands.js", "app/src/navigation/HomeStack.js", "app/src/navigation/DrawerNavigator.js", "app/src/navigation/TabNavigator.js"];
  for (const f of files) {
    try { babel2.transformSync(read(f), { filename: f, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-transform-react-jsx"), reqApp.resolve("@babel/plugin-transform-modules-commonjs")] }); compiled++; } catch (e) { console.log(e.message.slice(0, 200)); }
  }
  ok(compiled === files.length, "the changed files compile (jsx)");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
