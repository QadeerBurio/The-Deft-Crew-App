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
  useImperativeHandle() {},
  memo: (c) => c,
  createContext: (v) => { const ctx = { _value: v }; ctx.Provider = ({ value, children }) => { ctx._value = value; return children; }; return ctx; },
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
const axiosFake = { get: http("GET"), post: http("POST"), put: http("PUT"), patch: http("PATCH"), delete: http("DELETE") };
class AnimValue { constructor(v) { this.v = v; } setValue(v) { this.v = v; } interpolate() { return this; } stopAnimation(cb) { cb && cb(this.v); } addListener() { return "l"; } removeListener() {} removeAllListeners() {} }
const anim = () => ({ start: (cb) => cb && cb({ finished: true }), stop() {} });
const rnHost = new Set(["View", "Text", "Image", "ScrollView", "FlatList", "Modal", "Pressable", "TouchableOpacity", "TextInput", "ActivityIndicator", "StatusBar", "KeyboardAvoidingView", "TouchableWithoutFeedback"]);
const fakeRN = new Proxy({
  StyleSheet: { create: (x) => x, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1, flatten: (x) => x },
  Platform: { OS: "android", select: (o) => o.android ?? o.default },
  Alert: { alert: (t, m) => alerts.push(`${t}: ${m}`) },
  Animated: { Value: AnimValue, View: "Animated.View", Text: "Animated.Text", Image: "Animated.Image", ScrollView: "Animated.ScrollView", timing: anim, spring: anim, parallel: anim, sequence: anim, loop: anim, delay: anim, stagger: anim, multiply: () => new AnimValue(0), add: () => new AnimValue(0), diffClamp: () => new AnimValue(0), event: () => () => {}, createAnimatedComponent: (c) => c },
  AppState: { addEventListener: () => ({ remove() {} }), currentState: "active" },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
  Linking: { openURL: async () => {} },
  Keyboard: { dismiss() {}, addListener: () => ({ remove() {} }) },
  BackHandler: { addEventListener: () => ({ remove() {} }) },
  AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
  Easing: { out: () => 0, in: () => 0, inOut: () => 0, ease: 0, cubic: 0, quad: 0, sin: 0, linear: 0, bezier: () => 0 },
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
  "../../lib/tdcSounds": new Proxy({}, { get: () => () => {} }),
  "../../engagement/components/BadgePip": "BadgePip",
  "./ReportModal": "ReportModal",
  "../../utils/goToAuth": { goToAuth() {} },
  "../../hooks/useMyProfessionalProfile": { __esModule: true, default: () => ({ fullName: "Me", photoUrl: null }), useMyProfessionalProfile: () => ({ fullName: "Me", photoUrl: null }) },
  "../../../../assets/icons/offer-hand-stars.png": 1,
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
  // what onboardingCompleted sends: Meta's standard tutorial event, once-key unchanged
  const metaSrc = fs.readFileSync(path.join(SRC, "analytics/metaEvents.js"), "utf8");
  ok(/tutorial: \(sdk\) => sdk\?\.AppEventsLogger\?\.AppEvents\?\.CompletedTutorial \|\| "fb_mobile_tutorial_completion"/.test(metaSrc)
    && /onboardingCompleted: \(\) =>\s*log\(\(s\) => \(\{ name: EVENT\.tutorial\(s\), params: \{\} \}\), "onboarding"\)/.test(metaSrc)
    && !/tdc_onboarding_completed/.test(metaSrc.replace(/^\s*\/\/.*$/gm, "")), "onboardingCompleted → fb_mobile_tutorial_completion (SDK constant), once-key still \"onboarding\"");

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
  console.log("── event registered: paid event (payment step, real routes)");
  const ACC = [{ method: "easypaisa", accountTitle: "TDC Events", accountNumber: "03001234567" }];
  const paidEv = await create({ title: "paid workshop", type: "Seminar", fee: 500, paymentAccounts: ACC });
  const registerPaid = async (me, ev, txn) => {
    ctxValue = { token: me.token, user: { _id: me.id }, isGuest: false };
    const outcome = { registered: 0, already: 0 };
    const user = { _id: me.id, name: me.name, email: me.email, phone: "03001234567", university: { name: "MUET" }, rollNo: "21CS024" };
    const sheet = mount(React.createElement(RegisterSheet, { event: ev, token: me.token, user, onClose() {}, onRegistered: () => { outcome.registered++; }, onAlreadyRegistered: () => { outcome.already++; } }));
    await tick(80);
    const btnOf = (title) => all(sheet.tree, (n) => n.type === "Button" && n.props.title === title)[0];
    // form step → payment step
    for (let round = 0; round < 3 && btnOf("continue to payment"); round++) {
      await btnOf("continue to payment").props.onPress(); await tick(120);
      for (const input of all(sheet.tree, (n) => n.type === "Input" && n.props.error)) input.props.onChangeText(/phone|whatsapp/i.test(input.props.label) ? "03001234567" : "test answer");
    }
    const onPayStep = !!btnOf("submit registration");
    // payment: the one account is preselected; transaction id + receipt screenshot
    all(sheet.tree, (n) => n.type === "Input" && n.props.label === "transaction id")[0]?.props.onChangeText(txn);
    await tick(20);
    const attach = btnOf("attach screenshot");
    if (attach) { await attach.props.onPress(); await tick(60); }
    await btnOf("submit registration").props.onPress(); await tick(150);
    return { outcome, onPayStep, text: text(sheet.tree) };
  };
  const paidBefore = callsOf("eventRegistered").length;
  r = await registerPaid(students[3], paidEv, "TXN-PAID-0001");
  const paidReg = H.stores.Registration.find((x) => String(x.eventId) === String(paidEv._id) && String(x.userId) === students[3].id);
  ok(r.onPayStep && paidReg?.payment?.status === "pending" && paidReg.payment.amount === 500 && paidReg.payment.transactionId === "TXN-PAID-0001", "paid event: payment step → the server accepted the registration (pending review, Rs 500)", JSON.stringify({ pay: paidReg?.payment, text: r.text.slice(0, 200) }));
  const paidCalls = callsOf("eventRegistered").slice(paidBefore);
  ok(paidCalls.length === 1 && paidCalls[0][1] === paidEv._id && r.outcome.registered === 1, "→ eventRegistered(eventId) once for the paid registration", JSON.stringify(paidCalls));
  r = await registerPaid(students[4], paidEv, "TXN-PAID-0001"); // the same transaction id
  const refusedShown = /already been used/i.test(r.text) || alerts.some((x) => /already been used/i.test(x));
  ok(callsOf("eventRegistered").length === paidBefore + 1 && r.outcome.registered === 0 && refusedShown, "paid, transaction id already used (server refuses, the student sees why) → no event", JSON.stringify({ n: callsOf("eventRegistered").length - paidBefore, alerts: alerts.slice(-2) }));
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

  // ══ more events: posts, confessions, likes/comments, AI chat, travel, skillshare, redemptions ══
  const lastCall = (name) => callsOf(name).at(-1);
  const resetCalls = () => { metaCalls.length = 0; alerts.length = 0; };
  const fetchAs = (reply) => { global.fetch = async (url, init) => { fetched2.push({ url, init }); if (reply.throws) throw new Error("Network request failed"); return { ok: reply.ok, status: reply.ok ? 201 : 400, json: async () => reply.body }; }; };
  const fetched2 = [];
  const typeInto = (tree, value) => all(tree, (n) => n.type === "TextInput" && typeof n.props.onChangeText === "function").forEach((n) => n.props.onChangeText(value));

  console.log("── tdc_post_created: CreatePostScreen");
  const CreatePostScreen = load(path.join(SRC, "screens/Social/CreatePostScreen.js")).default;
  ctxValue = { token: "tok", user: { _id: "u1", location: "Karachi" }, isGuest: false };
  const postOnce = async (reply) => {
    fetchAs(reply);
    const m = mount(React.createElement(CreatePostScreen, { navigation, route: {} }));
    await tick(360); // the composer shows after its 320 ms opening
    typeInto(m.tree, "my private thoughts about exams"); await tick();
    await all(m.tree, (n) => n.props?.onPress?.name === "handlePost")[0].props.onPress(); await tick(40);
  };
  resetCalls();
  await postOnce({ ok: true, body: { _id: "post-123", content: "my private thoughts about exams" } });
  ok(callsOf("postCreated").length === 1 && lastCall("postCreated")[1] === "post-123" && /\/create-post$/.test(fetched2.at(-1).url), "server saved the post (201) → postCreated(postId)", JSON.stringify(metaCalls));
  ok(!JSON.stringify(metaCalls).includes("private thoughts"), "the post text never reaches Meta");
  await postOnce({ ok: false, body: { error: "Please add some text" } });
  ok(callsOf("postCreated").length === 1, "server error → no event");
  await postOnce({ throws: true });
  ok(callsOf("postCreated").length === 1, "offline → no event");

  console.log("── PostCard: likes and comments");
  const PostCard = load(path.join(SRC, "screens/Social/PostCard.js")).default;
  ctxValue = { token: "tok", user: { _id: "u1", name: "Me" }, isGuest: false, setUser() {} };
  const post = { _id: "p1", author: { _id: "u2", name: "Other" }, content: "hello", likes: [], comments: [], favorites: [], createdAt: new Date().toISOString() };
  let likeReply = { status: 200, data: { success: true, liked: true, likes: 1, likedBy: ["u1"] } };
  let commentReply = { status: 200, data: { success: true, comments: [{ _id: "c1", text: "nice post", user: { _id: "u1" } }], newCommentId: "c1" } };
  forward = async (method, url) => (method === "PUT" && /\/posts\/like\//.test(url) ? likeReply : method === "POST" && /\/posts\/comment\//.test(url) ? commentReply : { status: 200, data: { success: true, comments: [] } });
  resetCalls();
  let card = mount(React.createElement(PostCard, { post, onPostUpdate() {} }));
  const pressNamed = async (tree, name) => { const n = all(tree, (x) => x.props?.onPress?.name === name)[0]; if (!n) throw new Error("no button " + name); await n.props.onPress(); await tick(30); };
  await pressNamed(card.tree, "handleLike");
  ok(callsOf("socialEngaged").length === 1 && lastCall("socialEngaged")[1] === "like" && lastCall("socialEngaged").length === 2, "server accepted the like (liked: true) → socialEngaged(\"like\"), type only", JSON.stringify(metaCalls));
  likeReply = { status: 200, data: { success: true, liked: false, likes: 0, likedBy: [] } };
  card = mount(React.createElement(PostCard, { post: { ...post, likes: ["u1"] }, onPostUpdate() {} }));
  await pressNamed(card.tree, "handleLike");
  ok(callsOf("socialEngaged").length === 1, "unlike (liked: false) → nothing");
  likeReply = { status: 500, data: { message: "boom" } };
  card = mount(React.createElement(PostCard, { post, onPostUpdate() {} }));
  await pressNamed(card.tree, "handleLike");
  ok(callsOf("socialEngaged").length === 1, "like refused by the server (500) → nothing");
  card = mount(React.createElement(PostCard, { post, onPostUpdate() {} }));
  all(card.tree, (n) => n.props?.onChangeText?.name === "handleCommentTextChange")[0].props.onChangeText("nice post"); await tick();
  await pressNamed(card.tree, "handleComment");
  ok(callsOf("socialEngaged").length === 2 && lastCall("socialEngaged")[1] === "comment", "server accepted the comment → socialEngaged(\"comment\")", JSON.stringify(metaCalls));
  ok(!JSON.stringify(metaCalls).includes("nice post"), "the comment text never reaches Meta");
  commentReply = { status: 400, data: { error: "Comment text cannot be empty." } };
  card = mount(React.createElement(PostCard, { post, onPostUpdate() {} }));
  all(card.tree, (n) => n.props?.onChangeText?.name === "handleCommentTextChange")[0].props.onChangeText("again"); await tick();
  await pressNamed(card.tree, "handleComment");
  ok(callsOf("socialEngaged").length === 2, "comment refused by the server → nothing");

  console.log("── skillshare: CreateOfferScreen / CreateListingScreen");
  let skillReply = { offer: { _id: "skoffer-1" } };
  let skillThrows = false;
  MOCKS["../../api/api"] = {
    createSkillOffer: async () => { if (skillThrows) { const e = new Error("http 400"); e.response = { data: { error: "already offered" } }; throw e; } return { success: true, message: "Offer submitted successfully", offer: skillReply.offer }; },
    createListing: async () => { if (skillThrows) { const e = new Error("http 500"); e.response = { data: { error: "db" } }; throw e; } return { _id: "listing-1", title: "Guitar lessons" }; },
    uploadListingMedia: async () => ({}),
  };
  ctxValue = { getCurrentUserId: () => "u1", isGuest: false, setIsGuest() {}, token: "tok", user: { _id: "u1" } };
  const CreateOfferScreen = load(path.join(SRC, "screens/skillshare/CreateOfferScreen.js")).default;
  const offerOnce = async () => {
    const m = mount(React.createElement(CreateOfferScreen, { route: { params: { listing: { _id: "L1", type: "job", title: "Designer" } } }, navigation }));
    typeInto(m.tree, "I can do this, call me on 03001234567"); await tick();
    await pressNamed(m.tree, "handleSubmit");
  };
  resetCalls();
  await offerOnce();
  ok(callsOf("skillshareOfferCreated").length === 1 && lastCall("skillshareOfferCreated")[1] === "skoffer-1", "server saved the offer → skillshareOfferCreated(offerId)", JSON.stringify(metaCalls) + " " + alerts.join(" | "));
  ok(!JSON.stringify(metaCalls).includes("0300"), "the offer message (with a phone number) never reaches Meta");
  skillThrows = true;
  await offerOnce();
  ok(callsOf("skillshareOfferCreated").length === 1, "server refused the offer → no event");
  skillThrows = false;
  const CreateListingScreen = load(path.join(SRC, "screens/skillshare/CreateListingScreen.js")).default;
  const listingOnce = async () => {
    const m = mount(React.createElement(CreateListingScreen, { route: { params: { type: "barter" } }, navigation }));
    typeInto(m.tree, "3"); await tick();
    const level = all(m.tree, (n) => n.props?.onPress && /^\s*beginner\s*$/i.test(text(n)))[0];
    if (level) { await level.props.onPress(); await tick(); }
    await pressNamed(m.tree, "handleSubmit");
  };
  await listingOnce();
  ok(callsOf("skillshareListingCreated").length === 1 && lastCall("skillshareListingCreated")[1] === "listing-1", "server saved the listing → skillshareListingCreated(listingId)", JSON.stringify(metaCalls) + " " + alerts.join(" | "));
  skillThrows = true;
  await listingOnce();
  ok(callsOf("skillshareListingCreated").length === 1, "server refused the listing → no event");
  skillThrows = false;

  console.log("── tdc_ai_chat_used: ChatContext");
  let stream = null;
  MOCKS["@react-native-community/netinfo"] = { __esModule: true, default: { addEventListener: () => () => {}, fetch: async () => ({ isConnected: true }) } };
  MOCKS["@react-native-async-storage/async-storage"] = { __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, multiGet: async (ks) => ks.map((k) => [k, k === "token" ? "tok" : "false"]) } };
  MOCKS["../services/aiService"] = { __esModule: true, default: {
    streamMessage: (msg, sid, cat, onToken, onComplete, onError) => { stream = { msg, onToken, onComplete, onError }; return { abort() {} }; },
    getSuggestions: async () => ({ success: true, data: [] }), getSessions: async () => ({ success: true, data: [] }), getHistory: async () => ({ success: true, data: [] }),
  } };
  const { ChatProvider, ChatContext } = load(path.join(SRC, "context/ChatContext.js"));
  let chat = null;
  const ChatProbe = () => { chat = React.useContext(ChatContext); return null; };
  mount(React.createElement(ChatProvider, null, React.createElement(ChatProbe)));
  resetCalls();
  await chat.sendMessage("how do I write a cover letter for my CV?"); await tick();
  stream.onToken("Start "); stream.onToken("with"); await stream.onComplete(); await tick();
  ok(callsOf("aiChatUsed").length === 1 && lastCall("aiChatUsed").length === 1, "first reply ([DONE] after tokens) → aiChatUsed(), no arguments", JSON.stringify(metaCalls));
  ok(!JSON.stringify(metaCalls).includes("cover letter"), "the chat message never reaches Meta");
  await chat.sendMessage("again"); stream.onToken("x"); await stream.onComplete(); await tick();
  ok(callsOf("aiChatUsed").length === 2, "every reply calls it; once a day is enforced by metaEvents (daily key)");
  await chat.sendMessage("fails"); stream.onToken("half"); stream.onError(new Error("model down")); await stream.onComplete(); await tick();
  ok(callsOf("aiChatUsed").length === 2, "error frame (even if [DONE] follows) → no event");
  await chat.sendMessage("empty"); await stream.onComplete(); await tick();
  ok(callsOf("aiChatUsed").length === 2, "[DONE] with no reply text → no event");

  console.log("── tdc_travel_assistant_used: TravelChatBot");
  const xhrs = [];
  global.XMLHttpRequest = class { constructor() { this.readyState = 0; this.status = 0; this.responseText = ""; xhrs.push(this); } open(m, u) { this.url = u; } setRequestHeader() {} send(b) { this.body = b; } feed(textIn, state = 3, status = 200) { this.status = status; this.responseText += textIn; this.readyState = state; this.onreadystatechange && this.onreadystatechange(); } };
  MOCKS["../api/api"] = { __esModule: true, default: { defaults: { baseURL: "https://tdc.test/api" }, post: async () => ({ data: {} }), get: async () => ({ data: {} }) } };
  MOCKS["react-native-svg"] = new Proxy({ __esModule: true }, { get: (t, k) => (k in t ? t[k] : typeof k === "string" ? k : undefined) });
  MOCKS["../../../assets/travel_mascot.png"] = 1; MOCKS["../../../assets/travel.png"] = 1;
  MOCKS["../engagement/engagementBus"] = { engagementBus: { emit() {} }, ENGAGEMENT_EVENTS: {} };
  MOCKS["../utils/clipboard"] = { copyToClipboard: async () => true };
  ctxValue = { token: "tok", user: { _id: "u1" }, isGuest: false };
  const TravelChatBot = load(path.join(SRC, "components/TravelChatBot.js")).default;
  const travelAsk = async (question) => {
    const m = mount(React.createElement(TravelChatBot, {}));
    await all(m.tree, (n) => n.type === "TouchableOpacity" && n.props.onPress)[0].props.onPress(); await tick();
    const input = () => all(m.tree, (n) => n.type === "TextInput" && n.props.onSubmitEditing)[0];
    input().props.onChangeText(question); await tick();
    await input().props.onSubmitEditing(); await tick(30);
    return xhrs.at(-1);
  };
  resetCalls();
  let x = await travelAsk("cheap hotels near my uncle's house in Hunza?");
  ok(/\/api\/v1\/travel\/stream$/.test(x.url), "the question goes to /api/v1/travel/stream", x.url);
  x.feed('data: {"token":"Try "}\n\n'); x.feed('data: {"token":"Karimabad"}\n\n'); x.feed("data: [DONE]\n\n", 4);
  await tick();
  ok(callsOf("travelAssistantUsed").length === 1 && lastCall("travelAssistantUsed").length === 1, "the server answered ([DONE] after tokens) → travelAssistantUsed()", JSON.stringify(metaCalls));
  ok(!JSON.stringify(metaCalls).includes("Hunza"), "the travel question never reaches Meta");
  x = await travelAsk("again");
  x.feed('data: {"error":"quota"}\n\n'); x.feed("data: [DONE]\n\n", 4); await tick();
  ok(callsOf("travelAssistantUsed").length === 1, "error frame → no event");
  x = await travelAsk("again");
  x.feed('data: {"token":"x"}\n\ndata: [DONE]\n\n', 4, 503); await tick();
  ok(callsOf("travelAssistantUsed").length === 1, "HTTP 503 → no event");
  x = await travelAsk("again");
  x.feed("data: [DONE]\n\n", 4); await tick();
  ok(callsOf("travelAssistantUsed").length === 1, "[DONE] with no answer → no event");

  console.log("── the other call sites (source checks: inside the server-success branch)");
  const src = (f) => fs.readFileSync(path.join(SRC, f), "utf8").replace(/\r\n/g, "\n");
  const conf = src("screens/Social/ConfessionScreen.js");
  ok(/if \(response\.ok\) \{\n\s*const result = await response\.json\(\);\n\s*metaEvents\.confessionCreated\(\);/.test(conf), "ConfessionScreen create: confessionCreated() only inside response.ok, with no arguments");
  ok(/const res = await fetch\(`\$\{API_URL\}\/confessions\/like\/\$\{id\}`[\s\S]{0,260}if \(res\.ok\) \{\n\s*const data = await res\.json\(\)\.catch\(\(\) => null\);\n\s*if \(data\?\.liked === true\) metaEvents\.socialEngaged\("like"\);/.test(conf), "ConfessionScreen like: only res.ok AND liked === true (unlike/err → nothing)");
  ok(/if \(res\.ok\) \{\n\s*const updated = await res\.json\(\);\n\s*metaEvents\.socialEngaged\("comment"\);/.test(conf), "ConfessionScreen comment: only inside res.ok");
  ok(!/metaEvents\.\w+\([^)]*(\bid\b|_id|text|newConfession|selectedPost)/.test(conf), "ConfessionScreen: no confession id or text passed to any Meta call");
  const det = src("screens/Social/PostDetailScreen.js");
  ok(/if \(response\.data\.success\) \{\n\s*if \(response\.data\.liked === true\) metaEvents\.socialEngaged\("like"\);/.test(det) && /if \(response\.data\.success\) \{\n\s*metaEvents\.socialEngaged\("comment"\);/.test(det), "PostDetailScreen: like only on success + liked === true; comment only on success");
  const up = src("screens/Social/UserProfile.js");
  ok(/if \(response\.data\.success\) \{\n\s*if \(response\.data\.liked === true\) metaEvents\.socialEngaged\("like"\);/.test(up) && /if \(res\.data\.success && res\.data\.comments\) \{\n\s*metaEvents\.socialEngaged\("comment"\);/.test(up), "UserProfile: like only on success + liked === true; comment only on success");
  const prof = src("screens/Social/ProfileScreen.js");
  ok(/if \(response\.ok\) \{\n\s*metaEvents\.socialEngaged\("comment"\);/.test(prof), "Social ProfileScreen: comment (posts and confessions) only inside response.ok");
  const allSites = ["screens/Social/CreatePostScreen.js", "screens/Social/ConfessionScreen.js", "screens/Social/PostCard.js", "screens/Social/PostDetailScreen.js", "screens/Social/UserProfile.js", "screens/Social/ProfileScreen.js", "context/ChatContext.js", "components/TravelChatBot.js", "screens/skillshare/CreateListingScreen.js", "screens/skillshare/CreateOfferScreen.js"].map((f) => [f, src(f)]);
  const metaLines = allSites.flatMap(([f, s]) => (s.match(/metaEvents\.\w+\([^)]*\)/g) || []).map((c) => `${f}: ${c}`));
  const allowed = /metaEvents\.(postCreated\(result\?\._id\)|confessionCreated\(\)|socialEngaged\("(like|comment)"\)|aiChatUsed\(\)|travelAssistantUsed\(\)|skillshareListingCreated\(saved\?\._id\)|skillshareOfferCreated\(saved\?\.offer\?\._id\))$/;
  ok(metaLines.length === 15 && metaLines.every((l) => allowed.test(l.split(": ")[1])), "every new Meta call passes only a server id or a fixed word (no text, name, email, phone, message)", metaLines.join(" | "));
  ok(["api/api.js", "services/aiService.js"].every((f) => !/metaEvents|metaRedemptions/.test(src(f))), "api/api.js and services/aiService.js untouched");

  console.log("── tdc_discount_redeemed: when the app checks");
  const gnl = src("components/GlobalNotificationLayer.js");
  ok((gnl.match(/onRedemptionPush\(data\);/g) || []).length === 2, "GlobalNotificationLayer: the push is checked when received and when tapped");
  ok(/if \(isGuest\) \{[\s\S]{0,200}return;\n\s*\}[\s\S]{0,500}onRedemptionPush\(data\);/.test(gnl), "…received: after the guest check (and checkRedemptions itself needs a signed-in student)");
  ok(/if \(!Number\.isFinite\(totalSaved\)\) throw new Error\("bad savings response"\);\n\s*checkRedemptions\(\);/.test(src("hooks/useMySavings.js")), "useMySavings: checked after a good savings refresh (a failed one doesn't)");
  ok(/if \(s === "active"\) checkRedemptions\(\);/.test(src("analytics/MetaConsent.js")) && /setMetaUser\(userId\)\.then\(\(\) => checkRedemptions\(\)\)/.test(src("analytics/MetaConsent.js")), "MetaEventsHost: checked on sign-in and on every return to the app");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.stack); process.exit(1); });
