// Mount the real Events screen (and its RegisterSheet) in Node, against the REAL server routes
// (server main, real schemas, in-memory store). The admin edits the event with a real PUT
// between two opens; the second open must show the new questions, details and fee.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SRC = path.join(APP, "app/src");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
const H = require("../harness/events-harness.js");
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));

let failed = 0, passed = 0;
const ok = (c, label, extra = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${label}${!c && extra ? "  → " + String(extra).slice(0, 300) : ""}`); };

// ── hook runtime ──────────────────────────────────────────────
const hooks = new Map();
let cur = null, pendingEffects = [];
const roots = new Map();
const focusCallbacks = [];
const slot = (init) => { const list = hooks.get(cur.path) || hooks.set(cur.path, []).get(cur.path); const i = cur.i++; if (!(i in list)) list[i] = init(); return [list, i]; };
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }),
  Fragment: "Fragment",
  useState(init) { const [l, i] = slot(() => ({ v: typeof init === "function" ? init() : init })); const owner = cur.path.split("/")[0]; return [l[i].v, (v) => { const nv = typeof v === "function" ? v(l[i].v) : v; if (Object.is(nv, l[i].v)) return; l[i].v = nv; roots.get(owner)?.(); }]; },
  useRef(init) { const [l, i] = slot(() => ({ current: init })); return l[i]; },
  useMemo(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, v: undefined })); const s = l[i]; if (!s.deps || !deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) { s.v = fn(); s.deps = deps; } return s.v; },
  useCallback(fn) { return fn; },
  useContext(ctx) { return ctx && ctx._value ? ctx._value : {}; },
  useEffect(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, cleanup: null })); const s = l[i]; if (!deps || !s.deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) pendingEffects.push(() => { if (s.cleanup) s.cleanup(); s.deps = deps; s.cleanup = fn() || null; }); },
  forwardRef: (fn) => (props) => fn(props, null),
};
React.default = React;
function expand(el, p) {
  if (el == null || typeof el !== "object") return el;
  if (Array.isArray(el)) return el.map((c, k) => expand(c, `${p}.${k}`));
  if (typeof el.type === "function") { const prev = cur; const np = p + "/" + (el.type.name || "C") + (el.props?.key ?? ""); cur = { path: np, i: 0 }; const out = el.type(el.props); cur = prev; return expand(out, np); }
  return { type: el.type, props: { ...el.props, children: expand(el.props.children, p + "." + el.type) } };
}
function mount(element) {
  let tree = null; const root = "root" + Math.random(); let rendering = false, again = false;
  const render = () => {
    if (rendering) { again = true; return; }
    rendering = true;
    do { again = false; tree = expand(element, root); const fx = pendingEffects; pendingEffects = []; fx.forEach((f) => f()); } while (again);
    rendering = false;
  };
  roots.set(root, render); render();
  return { get tree() { return tree; } };
}
function all(tree, pred, out = []) { if (tree == null || typeof tree !== "object") return out; if (Array.isArray(tree)) { tree.forEach((t) => all(t, pred, out)); return out; } if (pred(tree)) out.push(tree); all(tree.props?.children, pred, out); return out; }
const text = (tree) => { const parts = []; (function walk(t) { if (t == null || t === false || t === true) return; if (typeof t === "string" || typeof t === "number") { parts.push(String(t)); return; } if (Array.isArray(t)) return t.forEach(walk); walk(t.props?.children); })(tree); return parts.join(" "); };

// ── fakes (react-native, expo, navigation…) ───────────────────
const alerts = [];
const requests = [];
let forward = null;
const http = (method) => async (url, a, b) => {
  const body = method === "GET" ? undefined : a;
  const cfg = method === "GET" ? a : b;
  requests.push({ method, url: url.replace(/^.*\/api\/events/, ""), params: cfg?.params, headers: cfg?.headers });
  const r = await forward(method, url, body, cfg);
  if (r.status >= 400) { const e = new Error("http " + r.status); e.response = { status: r.status, data: r.data }; throw e; }
  return { data: r.data };
};
const axiosFake = { get: http("GET"), post: http("POST"), patch: http("PATCH"), delete: http("DELETE") };
class AnimValue { constructor(v) { this.v = v; } setValue(v) { this.v = v; } interpolate() { return this; } }
const anim = () => ({ start: (cb) => cb && cb({ finished: true }), stop() {} });
const rnHost = new Set(["View", "Text", "Image", "ScrollView", "FlatList", "Modal", "Pressable", "TouchableOpacity", "TextInput", "ActivityIndicator", "StatusBar", "KeyboardAvoidingView", "TouchableWithoutFeedback"]);
const fakeRN = new Proxy({
  StyleSheet: { create: (x) => x, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1, flatten: (x) => x },
  Platform: { OS: "android", select: (o) => o.android ?? o.default },
  Alert: { alert: (t, m) => alerts.push(`${t}: ${m}`) },
  Animated: { Value: AnimValue, View: "Animated.View", Text: "Animated.Text", timing: anim, spring: anim, parallel: anim, sequence: anim, loop: anim, delay: anim },
  AppState: { addEventListener: () => ({ remove() {} }), currentState: "active" },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
  Linking: { openURL: async () => {} },
  Keyboard: { dismiss() {} },
  Easing: { out: () => 0, in: () => 0, ease: 0, cubic: 0, bezier: () => 0 },
}, { get: (t, k) => (k in t ? t[k] : rnHost.has(k) ? k : typeof k === "string" ? k : undefined) });
const navigation = { canGoBack: () => false, goBack() {}, navigate() {} };
let ctxValue = {};
const MOCKS = {
  react: React,
  "react-native": fakeRN,
  "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", SafeAreaProvider: ({ children }) => children, useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) },
  "react-native-keyboard-controller": { KeyboardAwareScrollView: "KeyboardAwareScrollView" },
  "@expo/vector-icons": { Ionicons: "Ionicons", MaterialCommunityIcons: "MaterialCommunityIcons" },
  "@react-native-community/datetimepicker": "DateTimePicker",
  "expo-haptics": new Proxy({}, { get: (_, k) => (typeof k === "string" && k.endsWith("Async") ? async () => {} : {}) }),
  "expo-image-picker": { MediaTypeOptions: { Images: "Images" } },
  axios: axiosFake,
  // Meta events: recorded only (the module has its own suite)
  "../../analytics/metaEvents": { metaEvents: new Proxy({}, { get: (t, k) => (...args) => { (global.__metaCalls = global.__metaCalls || []).push([k, ...args]); return Promise.resolve("stub"); } }) },
  "../../engagement/hooks/useOpenFromParams": { useOpenFromParams: () => {} },
  "../../context/AuthContext": { AuthContext: { get _value() { return ctxValue; } } },
  "@react-navigation/native": { useNavigation: () => navigation, useFocusEffect: (cb) => { focusCallbacks.push(cb); React.useEffect(() => cb(), []); } },
  "../../ui/FlatGradient": { LinearGradient: "LinearGradient" },
  "../../guest/GuestGate": { useGuestGate: () => ({ requireAccount: () => true }) },
  "../../ui": { PressScale: "PressScale", EmptyState: "EmptyState", SkeletonBlock: "SkeletonBlock", Button: "Button", Input: "Input", Chip: "Chip" },
  "../../utils/imageUrl": { imageUrl: (x) => x },
  "./useSavedEvents": () => ({ savedIds: [], isSaved: () => false, toggle() {}, prune() {} }),
  "socket.io-client": () => ({ emit() {}, on() {}, disconnect() {} }),
  "../../engagement/engagementBus": { engagementBus: { emit() {} }, ENGAGEMENT_EVENTS: {} },
  "../../utils/clipboard": { copyToClipboard: async () => true },
  "../../utils/cloudinaryUpload": { pickImageFromLibrary: async () => "file:///r.jpg", uploadImageToCloudinary: async () => "https://res.cloudinary.com/decaxpera/image/upload/r.jpg" },
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [[reqApp.resolve("@babel/plugin-transform-react-jsx"), { runtime: "classic" }], reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
  const m = new Module(file);
  m.filename = file;
  m.require = (id) => {
    if (id in MOCKS) return MOCKS[id];
    if (id.startsWith(".")) return load(require.resolve(path.resolve(path.dirname(file), id).replace(/(\.js)?$/, ".js")));
    return reqApp(id);
  };
  cache.set(file, m.exports);
  m._compile(code, file);
  return m.exports;
}
const EventsScreen = load(path.join(SRC, "screens/Events/Events.js")).default;

(async () => {
  const { srv, call } = await H.start();
  const students = H.students, admin = H.admin;
  const me = students[0];
  ctxValue = { token: me.token, user: { _id: me.id, name: "Ayesha Khan", email: "ayesha@students.muet.edu.pk", phone: "03001234567", university: { name: "MUET" } }, isGuest: false };
  forward = async (method, url, body, cfg) => {
    const auth = cfg?.headers?.Authorization;
    const who = auth ? [...students, admin].find((u) => `Bearer ${u.token}` === auth) : null;
    const q = cfg?.params ? "?" + new URLSearchParams(cfg.params).toString() : "";
    const r = await call(method, url.replace(/^.*\/api\/events/, "") + q, who, body);
    return { status: r.status, data: r.json };
  };
  const ACC = [{ method: "easypaisa", accountTitle: "TDC Events", accountNumber: "03001234567" }];
  try {
    // the admin creates a paid Workshop with one extra question
    const created = (await call("POST", "/create", admin, { title: "React workshop", organizer: "TDC", city: "Karachi", type: "Workshops", formVersion: 2, details: { level: "Beginner", durationHours: 2 }, fee: 500, paymentAccounts: ACC,
      registrationForm: [{ key: "experienceLevel", label: "Your experience", type: "select", options: ["Beginner", "Advanced"], required: true }, { key: "q_laptop", label: "Do you have a laptop?", type: "select", options: ["Yes", "No"], required: true }] })).json;
    const id = created._id;

    const screen = mount(React.createElement(EventsScreen));
    await tick(80);
    const feedCalls = () => requests.filter((r) => r.method === "GET" && r.url === "/feed").length;
    ok(feedCalls() === 1 && requests.find((r) => r.url === "/feed").params?._ && requests.find((r) => r.url === "/feed").headers?.["Cache-Control"] === "no-cache", "list loads once on mount, no-cache (no duplicate from focus)");
    const card = () => { const list = all(screen.tree, (n) => n.type === "FlatList")[0]; const row = list.props.data.find((r) => r.kind === "event" && String(r.event._id) === id); return row.event; };
    const listCopy = card();
    const openDetails = async (ev) => {
      const fl = all(screen.tree, (n) => n.type === "FlatList")[0];
      const item = fl.props.renderItem({ item: { kind: "event", key: "x", event: ev }, index: 1 });
      const cardEl = all(item, (n) => n.type && n.type.name === "EventCard")[0];
      cardEl.props.onOpen(ev);
    };
    const detailText = () => text(all(screen.tree, (n) => n.type === "Modal" && n.props.visible)[0]);

    // first open
    requests.length = 0;
    await openDetails(listCopy);
    ok(/updating/.test(detailText()), "details open at once with the list copy and 'updating…'");
    await tick(60);
    let t = detailText();
    ok(requests.some((r) => r.method === "GET" && r.url === `/${id}` && r.params?._), "opening details fetches GET /api/events/:id (no-cache)");
    ok(t.includes("Rs 500") && /level\s+Beginner/.test(t) && !/updating/.test(t), "first open: Rs 500, level Beginner", t.slice(0, 300));
    all(screen.tree, (n) => n.props && n.props.accessibilityLabel === "close event details")[0].props.onPress();
    await tick();

    // the admin edits the event: fee 800, level Advanced, a new question, laptop removed
    const put = await call("PUT", `/event/${id}`, admin, { fee: 800, details: { level: "Advanced", durationHours: 3 },
      registrationForm: [{ key: "experienceLevel", label: "Your experience", type: "select", options: ["Beginner", "Advanced"], required: true }, { key: "q_tshirt", label: "T-shirt size", type: "select", options: ["S", "M", "L"], required: true }] });
    ok(put.status === 200, "admin PUT /event/:id (fee 800, level Advanced, new question)", put.status);

    // second open from the SAME old list item
    requests.length = 0;
    await openDetails(listCopy);
    await tick(60);
    t = detailText();
    ok(t.includes("Rs 800") && /level\s+Advanced/.test(t) && !t.includes("Rs 500"), "second open (same old list item): Rs 800, level Advanced", t.slice(0, 300));
    ok(card().fee?.amount === 800, "the list item is replaced with the fresh copy too");

    // register from the details sheet → RegisterSheet fetches the event again
    requests.length = 0;
    const regBtn = all(screen.tree, (n) => n.type === "TouchableOpacity" && /register now|save my spot/i.test(text(n)))[0];
    regBtn.props.onPress();
    ok(/loading the latest form/.test(text(screen.tree)), "register screen: small 'loading the latest form…' state (before the response)");
    await tick(80);
    t = text(all(screen.tree, (n) => n.type === "Modal" && n.props.visible).pop());
    ok(requests.some((r) => r.method === "GET" && r.url === `/${id}`), "register screen fetches GET /api/events/:id itself");
    ok(/t-shirt size/.test(t) && !/laptop/.test(t), "register screen shows the new question, not the removed one", t.slice(0, 400));
    ok(/Rs 800/.test(t), "register screen shows the new fee (Rs 800)");
    // payment step: fresh payment-info every time it opens
    const regTree = () => all(screen.tree, (n) => n.type === "Modal" && n.props.visible).pop();
    const chipPress = async (label) => { all(regTree(), (n) => n.type === "Chip" && n.props.label === label)[0].props.onPress(); await tick(); };
    await chipPress("Advanced"); await chipPress("M");
    all(regTree(), (n) => n.type === "Button" && n.props.title === "continue to payment")[0].props.onPress();
    await tick(80);
    ok(/03001234567/.test(text(regTree())) && requests.filter((r) => /payment-info/.test(r.url)).length === 1, "payment step: payment-info fetched (account shown)");
    await call("PUT", `/event/${id}`, admin, { paymentAccounts: [{ method: "jazzcash", accountTitle: "TDC Events", accountNumber: "03219876543" }] });
    all(regTree(), (n) => n.props && n.props.accessibilityLabel === "back")[0].props.onPress();
    await tick();
    all(regTree(), (n) => n.type === "Button" && n.props.title === "continue to payment")[0].props.onPress();
    await tick(80);
    t = text(regTree());
    ok(requests.filter((r) => /payment-info/.test(r.url)).length === 2 && /03219876543/.test(t) && !/03001234567/.test(t), "payment step reopened: payment-info fetched again, new account shown", t.slice(0, 300));
    all(regTree(), (n) => n.props && n.props.accessibilityLabel === "back")[0].props.onPress();
    await tick();
    all(regTree(), (n) => n.props && n.props.accessibilityLabel === "close registration")[0].props.onPress();
    await tick();

    // offline: GET /:id fails → saved copy + note
    const real = forward;
    forward = async (m, url, b, c) => (m === "GET" && /\/api\/events\/[a-f0-9]{24}$/.test(url) ? Promise.reject(Object.assign(new Error("Network Error"), { request: {} })) : real(m, url, b, c));
    all(screen.tree, (n) => n.props && n.props.accessibilityLabel === "close event details")[0]?.props.onPress();
    await tick();
    await openDetails(card());
    await tick(60);
    ok(/offline · showing saved details/.test(detailText()) && /Rs 800/.test(detailText()), "offline: the list copy is shown with 'offline · showing saved details'");
    forward = real;

    // focus: list refetch only when older than 30 s
    requests.length = 0;
    focusCallbacks[focusCallbacks.length - 1]();
    await tick(40);
    ok(feedCalls() === 0, "focus within 30 s: no refetch");
    const realNow = Date.now;
    Date.now = () => realNow() + 31000;
    focusCallbacks[focusCallbacks.length - 1]();
    await tick(60);
    Date.now = realNow;
    ok(feedCalls() === 1, "focus after 30 s: the list is fetched again");
    // pull to refresh: always
    requests.length = 0;
    await all(screen.tree, (n) => n.type === "FlatList")[0].props.onRefresh();
    await tick(40);
    ok(feedCalls() === 1, "pull-to-refresh fetches the list");

    // old event without a form → four fields
    const oldId = new H.mongoose.Types.ObjectId();
    H.stores.Event.push({ _id: oldId, title: "old meetup", type: "Hackathons", city: "Karachi", status: "approved", isExpired: false, creator: admin._id, createdAt: new Date() });
    await all(screen.tree, (n) => n.type === "FlatList")[0].props.onRefresh();
    await tick(60);
    const fl = all(screen.tree, (n) => n.type === "FlatList")[0];
    const oldItem = fl.props.data.find((r) => r.kind === "event" && String(r.event._id) === String(oldId)).event;
    const el = fl.props.renderItem({ item: { kind: "event", key: "o", event: oldItem }, index: 1 });
    all(el, (n) => n.type && n.type.name === "EventCard")[0].props.onRegister(oldItem);
    await tick(80);
    const labels = all(regTree(), (n) => n.type === "Input").map((n) => n.props.label);
    ok(labels.join(",") === "full name,university email,whatsapp number,student id / cnic (optional)", "event without a form: the four fields", labels.join(","));
    void alerts;
  } catch (e) {
    failed++;
    console.log("FAIL  (stopped) " + (e.stack || e.message).split("\n").slice(0, 5).join(" | "));
  } finally {
    srv.close();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
})();
