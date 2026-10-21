// Meta call sites, mounted for real: the onboarding tour (TourOverlay), event registration
// (RegisterSheet against the REAL server routes, in-memory store) and the scholarship form
// (ApplicationForm, fetch faked). The Meta module is a recorder here; its gates, consent,
// duplicates and error handling are covered in meta-events.test.js.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SRC = path.join(APP, "app/src");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
const H = require("../harness/events-harness.js");
const metaCalls = [];
const metaStub = { metaEvents: new Proxy({}, { get: (t, k) => (...args) => { metaCalls.push([k, ...args]); return Promise.resolve("recorded"); } }) };
let tour = { running: false, stop() {}, getTargets: () => new Map() };
let accountAsked = 0;

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
  BackHandler: { addEventListener: () => ({ remove() {} }) },
  AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
  Easing: { out: () => 0, in: () => 0, ease: 0, cubic: 0, bezier: () => 0 },
}, { get: (t, k) => (k in t ? t[k] : rnHost.has(k) ? k : typeof k === "string" ? k : undefined) });
const navigation = { canGoBack: () => false, goBack() {}, navigate() {} };
let ctxValue = {};
const MOCKS = {
  react: React,
  "react-native": fakeRN,
  "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", SafeAreaProvider: ({ children }) => children, useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) },
  "react-native-keyboard-controller": { KeyboardAwareScrollView: "KeyboardAwareScrollView" },
  "@expo/vector-icons": { Ionicons: "Ionicons", MaterialCommunityIcons: "MaterialCommunityIcons", FontAwesome5: "FontAwesome5" },
  "@react-native-community/datetimepicker": "DateTimePicker",
  "expo-haptics": new Proxy({}, { get: (_, k) => (typeof k === "string" && k.endsWith("Async") ? async () => {} : {}) }),
  "expo-image-picker": { MediaTypeOptions: { Images: "Images" } },
  axios: axiosFake,
  // Meta events: recorded only (the module has its own suite)
  "../../analytics/metaEvents": metaStub,
  "../analytics/metaEvents": metaStub,
  "./TourProvider": { useTour: () => tour },
  "../utils/haptics": { pop() {} },
  "../components/Dot": "Dot",
  "../context/AuthContext": { AuthContext: { get _value() { return ctxValue; } } },
  "../guest/GuestGate": { useGuestGate: () => ({ requireAccount: () => { accountAsked++; return false; } }) },
  "../ui/ScreenHeader": "ScreenHeader",
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

const callsOf = (name) => metaCalls.filter((c) => c[0] === name);
const byLabel = (tree, label) => all(tree, (n) => n.props?.accessibilityLabel === label)[0];
const press = async (node) => { await node.props.onPress(); await tick(40); };

(async () => {
  console.log("── onboarding: TourOverlay");
  const TourOverlay = load(path.join(SRC, "engagement/tour/TourOverlay.js")).default;
  const { TOUR_STEPS } = load(path.join(SRC, "engagement/tour/tourSteps.js"));
  let stops = 0;
  tour = { running: true, stop: () => { stops++; }, getTargets: () => new Map() };
  // the card shows once the overlay knows its size (onLayout)
  const mountTour = async () => {
    const mt = mount(React.createElement(TourOverlay));
    all(mt.tree, (n) => typeof n.props?.onLayout === "function")[0].props.onLayout({ nativeEvent: { layout: { width: 400, height: 800 } } });
    await tick(30);
    return mt;
  };
  let m = await mountTour();
  for (let i = 0; i < TOUR_STEPS.length - 1; i++) await press(byLabel(m.tree, "next step"));
  ok(!callsOf("onboardingCompleted").length, "steps 1..n-1 (next): no event yet");
  await press(byLabel(m.tree, "finish the tour"));
  ok(callsOf("onboardingCompleted").length === 1 && stops === 1, "\"let's go\" on the last step → onboardingCompleted once, tour stopped", JSON.stringify(metaCalls));
  metaCalls.length = 0; stops = 0;
  tour = { running: true, stop: () => { stops++; }, getTargets: () => new Map() };
  m = await mountTour();
  await press(byLabel(m.tree, "skip the tour"));
  ok(!callsOf("onboardingCompleted").length && stops === 1, "skip → tour ends, no event");
  m = await mountTour();
  await press(byLabel(m.tree, "next step"));
  all(m.tree, (n) => n.type === "Modal")[0].props.onRequestClose(); await tick();
  ok(!callsOf("onboardingCompleted").length && stops === 2, "hardware back mid-tour → no event");

  console.log("── event registered: RegisterSheet (real routes)");
  const { srv, call } = await H.start();
  const students = H.students, admin = H.admin;
  forward = async (method, url, bodyIn, cfg) => {
    const auth = cfg?.headers?.Authorization;
    const who = auth ? [...students, admin].find((u) => `Bearer ${u.token}` === auth) : null;
    const q = cfg?.params ? "?" + new URLSearchParams(cfg.params).toString() : "";
    const r = await call(method, url.replace(/^.*\/api\/events/, "") + q, who, bodyIn);
    return { status: r.status, data: r.json };
  };
  const RegisterSheet = load(path.join(SRC, "screens/Events/RegisterSheet.js")).default;
  const create = async (b) => (await call("POST", "/create", admin, { organizer: "TDC", city: "Karachi", formVersion: 2, ...b })).json;
  const register = async (me, ev) => {
    ctxValue = { token: me.token, user: { _id: me.id }, isGuest: false };
    const outcome = { registered: 0, already: 0, closed: 0 };
    const user = { _id: me.id, name: me.name, email: me.email, phone: "03001234567", university: { name: "MUET" }, rollNo: "21CS024" };
    const sheet = mount(React.createElement(RegisterSheet, { event: ev, token: me.token, user, onClose: () => { outcome.closed++; }, onRegistered: () => { outcome.registered++; }, onAlreadyRegistered: () => { outcome.already++; } }));
    await tick(80);
    for (let round = 0; round < 3; round++) {
      const btn = all(sheet.tree, (n) => n.type === "Button" && n.props.title === "submit registration")[0];
      if (!btn) break;
      await btn.props.onPress(); await tick(80);
      if (outcome.registered || outcome.already) break; // the server answered
      // fill whatever the form still asks for, then try again
      for (const input of all(sheet.tree, (n) => n.type === "Input" && n.props.error)) input.props.onChangeText(/phone|whatsapp/i.test(input.props.label) ? "03001234567" : "test answer");
      await tick(20);
    }
    return { outcome, text: text(sheet.tree) };
  };

  const free = await create({ title: "free talk", type: "Seminar" });
  let r = await register(students[0], free);
  const saved = H.stores.Registration.some((x) => String(x.eventId) === String(free._id) && String(x.userId) === students[0].id);
  ok(saved && r.outcome.registered === 1, "free event: the server saved the registration", JSON.stringify(r.outcome) + " " + r.text.slice(0, 200));
  ok(callsOf("eventRegistered").length === 1 && callsOf("eventRegistered")[0][1] === free._id, "→ eventRegistered(eventId) once, after the server accepted it", JSON.stringify(metaCalls));
  r = await register(students[0], free);
  ok(r.outcome.already === 1 && callsOf("eventRegistered").length === 1, "registering again → 'already registered', no second event");
  const full = await create({ title: "tiny talk", type: "Seminar", capacity: 1 });
  await register(students[1], full);
  const before = callsOf("eventRegistered").length;
  r = await register(students[2], full);
  ok(callsOf("eventRegistered").length === before && /full/i.test(r.text), "event full (server refuses) → no event", r.text.slice(0, 200));
  srv.close();

  console.log("── scholarship applied: ApplicationForm");
  const ApplicationForm = load(path.join(SRC, "components/ApplicationForm.js")).default;
  const program = { _id: "64b0000000000000000000aa", title: "Erasmus", university: "TU", color: "#111" };
  const navigation2 = { reset() {}, goBack() {}, navigate() {} };
  let fetchReply = { ok: true, body: { message: "Application submitted" } };
  const fetched = [];
  global.fetch = async (url, init) => { fetched.push({ url, body: JSON.parse(init.body) }); return { ok: fetchReply.ok, json: async () => fetchReply.body }; };
  ctxValue = { token: "tok", user: { _id: "u1" } };
  let form = mount(React.createElement(ApplicationForm, { route: { params: { program } }, navigation: navigation2 }));
  const submit = () => all(form.tree, (n) => n.type === "TouchableOpacity" && n.props.onPress && /submit/i.test(text(n)))[0];
  await press(submit());
  ok(fetched.length === 1 && /\/auth\/exchange\/apply$/.test(fetched[0].url) && callsOf("scholarshipApplied").length === 1 && callsOf("scholarshipApplied")[0][1] === program._id, "server saved the application → scholarshipApplied(programId) once", JSON.stringify({ fetched: fetched.map((f) => f.url), metaCalls }));
  fetchReply = { ok: false, body: { message: "You have already applied for this program." } };
  form = mount(React.createElement(ApplicationForm, { route: { params: { program } }, navigation: navigation2 }));
  await press(submit());
  ok(callsOf("scholarshipApplied").length === 1, "server refuses (already applied) → no event");
  global.fetch = async () => { throw new Error("Network request failed"); };
  form = mount(React.createElement(ApplicationForm, { route: { params: { program } }, navigation: navigation2 }));
  await press(submit());
  ok(callsOf("scholarshipApplied").length === 1, "offline → no event");
  ctxValue = { token: null, user: null };
  form = mount(React.createElement(ApplicationForm, { route: { params: { program } }, navigation: navigation2 }));
  await press(submit());
  ok(accountAsked === 1 && callsOf("scholarshipApplied").length === 1, "signed out → asked to sign in, no event");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.stack); process.exit(1); });
