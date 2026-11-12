// The job details screen and the apply flow (feat/job-details-screen):
//   app/src/screens/Career/JobDetails.js          a job, full screen: details, "your match", Apply / Applied / Closed
//   app/src/screens/Career/JobApplicationForm.js  the apply form: fields, checks, resume choice, one send
//   app/src/utils/careerNav.js                    open a job; back to the jobs list after applying
// The jobs list (Career), pushes, invites, the Daily Drop and "recommended for you" open JobDetails; success resets
// the stack to the jobs list, which shows the job "Applied"; failure stays and keeps the input; Meta
// SubmitApplication fires once, only after the server confirmed.
//   node tests/app/job-details.test.js
// Real app modules (Babel) with fakes for React Native, navigation and the network.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SRC = path.join(APP, "app/src");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 400) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8").replace(/\r\n/g, "\n");
global.__DEV__ = false;

// (helpers copied from tests/app/responsiveness.test.js)
// ── hook runtime ──
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

// ── react-native fakes ──
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

const all = (n, pred, out = []) => {
  if (n == null || typeof n !== "object") return out;
  if (Array.isArray(n)) { n.forEach((c) => all(c, pred, out)); return out; }
  if (pred(n)) out.push(n);
  all(n.props?.children, pred, out);
  return out;
};
const byLabel = (tree, label) => all(tree, (x) => x.props?.accessibilityLabel === label)[0];


const settle = async (root, n = 5) => { for (let i = 0; i < n; i++) { await tick(10); root.rerender(); } };
const deferred = () => { let resolve, reject; const p = new Promise((a, b) => { resolve = a; reject = b; }); return { p, resolve, reject }; };

(async () => {
  // ═════ careerNav ═════
  console.log("── utils/careerNav.js");
  const navMocks = { "@react-navigation/native": { CommonActions: { reset: (state) => ({ type: "RESET", payload: state }) } } };
  const nav = loader(navMocks)(path.join(SRC, "utils/careerNav.js"));
  {
    const calls = [];
    nav.openJobDetails({ navigate: (n, p) => calls.push([n, p]) }, { _id: "j1", title: "T" });
    nav.openJobDetails({ navigate: (n, p) => calls.push([n, p]) }, "j2");
    ok(calls[0][0] === "JobDetails" && calls[0][1].jobId === "j1" && calls[0][1].preview.title === "T" && calls[1][1].jobId === "j2" && !calls[1][1].preview, "openJobDetails: JobDetails with the id (and the job shown at once)");
    ok(nav.openJobDetails({ navigate: () => calls.push("x") }, null) === false && calls.length === 2, "no id: nothing opens");
  }
  {
    const dispatched = [];
    const state = { key: "stack-1", type: "stack", index: 3, routes: [{ key: "h", name: "HomeTabs" }, { key: "c", name: "Career", params: { foo: 1 } }, { key: "d", name: "JobDetails", params: { jobId: "j1" } }, { key: "f", name: "JobApplicationForm", params: { jobId: "j1" } }] };
    nav.backToJobsList({ getState: () => state, dispatch: (a) => dispatched.push(a) }, "j1");
    const p = dispatched[0]?.payload;
    ok(dispatched[0]?.type === "RESET" && p.routes.map((r) => r.name).join() === "HomeTabs,Career" && p.index === 1 && p.key === "stack-1", "after applying: details and form removed, back on the jobs list", JSON.stringify(p));
    ok(p.routes[1].key === "c" && p.routes[1].params.appliedJobId === "j1" && p.routes[1].params.foo === 1, "…the same jobs list, told which job was applied to");
    dispatched.length = 0;
    const fromPush = { key: "s", type: "stack", index: 2, routes: [{ key: "h", name: "HomeTabs" }, { key: "d", name: "JobDetails" }, { key: "f", name: "JobApplicationForm" }] };
    nav.backToJobsList({ getState: () => fromPush, dispatch: (a) => dispatched.push(a) }, "j9");
    const q = dispatched[0]?.payload;
    ok(q.routes.map((r) => r.name).join() === "HomeTabs,Career" && q.routes[1].params.appliedJobId === "j9" && !q.routes[1].key, "opened without the list underneath: a jobs list replaces details and form", JSON.stringify(q));
  }
  {
    const now = new Date("2026-06-01T00:00:00Z");
    ok(nav.jobState({ active: true }, { applied: true, now }) === "applied", "jobState: applied first");
    ok(nav.jobState({ active: false }, { now }) === "closed" && nav.jobState({ active: true, applicationDeadline: "2026-05-01" }, { now }) === "closed" && nav.jobState({ isExpired: true }, { now }) === "closed", "jobState: closed (inactive, past the deadline, expired)");
    ok(nav.jobState({ active: true, isExternal: true }, { now }) === "external" && nav.jobState({ active: true, isExternal: false, applicationDeadline: "2026-07-01" }, { now }) === "open", "jobState: external / open");
  }

  // ═════ JobApplicationForm ═════
  console.log("── JobApplicationForm");
  const { React, mount, contexts } = makeReact();
  const { rn } = makeRN();
  const alerts = [];
  rn.Alert = { alert: (...a) => alerts.push(a) };
  rn.Linking = { openURL: async () => {} };
  rn.Share = { share: async () => {} };
  const h = (type) => function Fake(p) { return React.createElement(type, p, p.title ?? p.children ?? null); };
  const ui = {
    ScreenHeader: function ScreenHeader(p) { return React.createElement("Header", { title: p.title }, p.right || null); },
    HeaderIconButton: function HeaderIconButton(p) { return React.createElement("Pressable", { accessibilityLabel: p.label, onPress: p.onPress }); },
    Button: function Button(p) { return React.createElement("Button", { title: p.title, onPress: p.onPress, disabled: !!(p.disabled || p.loading), loading: !!p.loading, accessibilityLabel: p.accessibilityLabel || p.title }, p.title); },
    Input: function Input(p) { return React.createElement("Input", p, p.error ? React.createElement("Text", { role: "error" }, p.error) : null); },
  };
  const AuthContext = { _default: {}, Provider: "Provider" };
  const meta = [];
  const studio = { on: false, versions: [], attached: [] };
  const net = { posts: [], gets: [], post: null, get: async () => ({ data: {} }) };
  const api = {
    post: (url, body, cfg) => { net.posts.push({ url, body, cfg }); return net.post(url, body, cfg); },
    get: (url, cfg) => { net.gets.push(url); return net.get(url, cfg); },
  };
  class FakeFormData { constructor() { this.parts = []; } append(k, v) { this.parts.push([k, v]); } get(k) { return (this.parts.find((p) => p[0] === k) || [])[1]; } }
  global.FormData = FakeFormData;
  let nextPick = null;
  const mocks = {
    react: React, "react-native": rn,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "react-native-keyboard-controller": { KeyboardAwareScrollView: "KeyboardAwareScrollView" },
    "@expo/vector-icons": { Ionicons: "Ionicons" },
    "expo-document-picker": { getDocumentAsync: async () => nextPick },
    "../../ui": ui,
    "../../api/api": { __esModule: true, default: api },
    "../../api/resumeStudioApi": { studioEnabled: async () => studio.on, studioApi: { versions: async () => studio.versions, attachVersion: async (a, v) => { studio.attached.push([a, v]); if (studio.attachFails) throw new Error("version changed"); return {}; } } },
    "../../analytics/metaEvents": { metaEvents: { jobApplied: (id) => meta.push({ id, posts: net.posts.length, settled: net.settled }) } },
    "../../context/AuthContext": { AuthContext },
    "@react-navigation/native": navMocks["@react-navigation/native"],
    "../../api/matchingApi": { matchingEnabled: async () => net.matchingOn, myJobMatch: async (id) => net.match(id) },
    "../../guest/GuestGate": { useGuestGate: () => ({ requireAccount: () => net.allowAccount !== false }) },
    "../../components/CareerRatings": { EmployerRating: function EmployerRating() { return null; } },
    "../../components/career/JobWebView": { WebViewModal: function WebViewModal(p) { return React.createElement("WebViewModal", p); }, buildLocationUrl: (x) => (x ? `maps:${x}` : null) },
  };
  const load = loader(mocks);
  const FormMod = load(path.join(SRC, "screens/Career/JobApplicationForm.js"));
  const Form = FormMod.default;
  contexts.set(AuthContext, { user: { name: "Sana Ali", email: "sana@test.pk" }, token: "t", isGuest: false });

  const makeNav = (routes) => {
    const n = { navigated: [], dispatched: [], listeners: {}, params: [] };
    n.navigate = (name, params) => n.navigated.push([name, params]);
    n.dispatch = (a) => n.dispatched.push(a);
    n.getState = () => ({ key: "home", type: "stack", index: routes.length - 1, routes });
    n.addListener = (ev, fn) => { n.listeners[ev] = fn; return () => { delete n.listeners[ev]; }; };
    n.setParams = (p) => n.params.push(p);
    return n;
  };
  const stack = () => [{ key: "h", name: "HomeTabs" }, { key: "c", name: "Career" }, { key: "d", name: "JobDetails" }, { key: "f", name: "JobApplicationForm" }];
  const inputs = (tree) => all(tree, (x) => x.type === "Input");
  const input = (tree, label) => inputs(tree).find((x) => String(x.props.label).replace(/ \*$/, "") === label);
  const submitBtn = (tree) => all(tree, (x) => x.type === "Button" && x.props.title === "send application")[0];
  const fill = async (root, values) => { for (const [k, v] of Object.entries(values)) { input(root.tree, k).props.onChangeText(v); await settle(root, 1); } };

  {
    const { validate, buildBody, REQUIRED } = FormMod;
    const e = validate({ fullName: " ", email: "a@b.c", phone: "", coverLetter: "x" }, { kind: "file", file: null });
    ok(e.fullName === "Full name is required" && e.phone === "Phone is required" && !e.email && !e.coverLetter && e.resume === "Choose a resume to send" && Object.keys(REQUIRED).join() === "fullName,email,phone,coverLetter", "validate: the same required fields as before (name, email, phone, cover letter) and a resume");
    ok(!validate({ fullName: "a", email: "b", phone: "c", coverLetter: "d" }, { kind: "tailored", version: { id: "v1" } }).resume, "validate: the tailored version counts as a resume");
    const b1 = buildBody({ fullName: " Sana ", yearsOfExperience: "2" }, { kind: "file", file: { uri: "file:///cv.pdf", name: "cv.pdf", mimeType: "application/pdf" } }, () => new FakeFormData());
    const b2 = buildBody({ fullName: "Sana" }, { kind: "tailored", version: { id: "v1" } }, () => new FakeFormData());
    ok(b1.get("fullName") === "Sana" && b1.get("resume").name === "cv.pdf" && b1.get("resume").type === "application/pdf" && b2.get("resume") === undefined, "buildBody: trimmed fields; the file only when a file was chosen");
  }

  // 1. empty / invalid: nothing sent, an error under each field
  {
    const navi = makeNav(stack());
    net.post = async () => ({ data: { application: { _id: "a1" } } });
    const root = mount(React.createElement(Form, { navigation: navi, route: { params: { jobId: "j1", job: { title: "React intern", companyName: "HireCo" } } } }));
    await settle(root);
    ok(input(root.tree, "Full name").props.value === "Sana Ali" && input(root.tree, "Email").props.value === "sana@test.pk", "name and email filled from the account");
    ok(textOf(root.tree).includes("React intern") && textOf(root.tree).includes("HireCo"), "shows which job");
    ok(all(root.tree, (x) => x.type === "KeyboardAwareScrollView").length === 1, "keyboard-safe, scrollable form (KeyboardAwareScrollView)");
    submitBtn(root.tree).props.onPress(); await settle(root);
    ok(net.posts.length === 0, "missing fields: nothing is sent");
    ok(input(root.tree, "Phone").props.error === "Phone is required" && input(root.tree, "Cover letter").props.error === "Cover letter is required" && !input(root.tree, "Full name").props.error, "…an error under each missing field");
    ok(textOf(root.tree).includes("Choose a resume to send"), "…and under the resume");
    await fill(root, { Phone: "0300" });
    ok(!input(root.tree, "Phone").props.error, "typing clears that field's error");
  }

  // 2. failure: stay, keep input, show the error, no Meta event
  {
    const navi = makeNav(stack());
    meta.length = 0; net.posts.length = 0;
    net.post = async () => { const e = new Error("400"); e.response = { status: 400, data: { message: "You have already applied for this position" } }; throw e; };
    const root = mount(React.createElement(Form, { navigation: navi, route: { params: { jobId: "j1", job: { title: "React intern" } } } }));
    await settle(root);
    await fill(root, { Phone: "0300 1234567", "Cover letter": "I build React apps.", City: "Lahore" });
    nextPick = { assets: [{ uri: "file:///cv.pdf", name: "cv.pdf", mimeType: "application/pdf", size: 2048 }] };
    all(root.tree, (x) => x.props?.accessibilityLabel === "upload a resume file, PDF, DOC or DOCX")[0].props.onPress(); await settle(root);
    ok(textOf(root.tree).includes("cv.pdf"), "a resume file chosen");
    submitBtn(root.tree).props.onPress(); await settle(root);
    ok(net.posts.length === 1 && net.posts[0].url === "/jobs/apply/j1" && net.posts[0].body.get("resume").name === "cv.pdf" && net.posts[0].body.get("coverLetter") === "I build React apps.", "sends the form and the file to POST /jobs/apply/:jobId", JSON.stringify(net.posts[0]?.url));
    ok(textOf(root.tree).includes("You have already applied for this position"), "failure: the server's reason is shown");
    ok(input(root.tree, "City").props.value === "Lahore" && input(root.tree, "Cover letter").props.value === "I build React apps." && textOf(root.tree).includes("cv.pdf"), "…everything typed is kept, the file too");
    ok(navi.dispatched.length === 0 && navi.navigated.length === 0, "…and it stays on the form");
    ok(meta.length === 0, "…no Meta SubmitApplication");
    ok(submitBtn(root.tree).props.disabled === false, "…and it can be sent again");
  }

  // 3. success: one send even with a double tap, back held while sending, Meta once after the server, back to the list
  {
    const navi = makeNav(stack());
    meta.length = 0; net.posts.length = 0; alerts.length = 0; net.settled = false;
    const d = deferred();
    net.post = () => d.p.then((r) => { net.settled = true; return r; });
    const root = mount(React.createElement(Form, { navigation: navi, route: { params: { jobId: "j1", job: { title: "React intern" } } } }));
    await settle(root);
    await fill(root, { Phone: "0300", "Cover letter": "hello" });
    nextPick = { assets: [{ uri: "file:///cv.pdf", name: "cv.pdf", mimeType: "application/pdf", size: 2048 }] };
    all(root.tree, (x) => x.props?.accessibilityLabel === "upload a resume file, PDF, DOC or DOCX")[0].props.onPress(); await settle(root);
    const press = submitBtn(root.tree).props.onPress;
    press(); press(); await settle(root, 2);
    ok(net.posts.length === 1, "double tap: sent once");
    ok(submitBtn(root.tree).props.disabled === true, "submit disabled while sending");
    let prevented = 0;
    navi.listeners.beforeRemove?.({ preventDefault: () => prevented++ });
    ok(prevented === 1, "back (Android button / iOS swipe) is held while sending");
    ok(meta.length === 0, "no Meta event before the server answers");
    d.resolve({ data: { success: true, application: { _id: "app1" } } });
    await settle(root);
    ok(meta.length === 1 && meta[0].id === "j1" && meta[0].settled === true, "Meta SubmitApplication once, after the server confirmed", JSON.stringify(meta));
    ok(alerts[0]?.[0] === "Application sent", "a short success message", JSON.stringify(alerts[0]));
    const reset = navi.dispatched[0]?.payload;
    ok(navi.dispatched[0]?.type === "RESET" && reset.routes.map((r) => r.name).join() === "HomeTabs,Career" && reset.routes[1].params.appliedJobId === "j1", "back to the jobs list, which is told the job was applied to", JSON.stringify(reset));
    let prevented2 = 0;
    navi.listeners.beforeRemove?.({ preventDefault: () => prevented2++ });
    ok(prevented2 === 0, "after success, leaving isn't blocked");
    press(); await settle(root);
    ok(net.posts.length === 1 && meta.length === 1, "no second send after success");
  }

  // 4. the tailored resume (Resume Studio): chosen by default when one exists for this job; attached after the server has it
  {
    const navi = makeNav(stack());
    meta.length = 0; net.posts.length = 0; alerts.length = 0;
    studio.on = true; studio.versions = [{ id: "v-other", target: { kind: "tdc_job", jobId: "j2" } }, { id: "v1", label: "React intern (tailored)", target: { kind: "tdc_job", jobId: "j1" } }];
    net.post = async () => ({ data: { application: { _id: "app9" } } });
    const root = mount(React.createElement(Form, { navigation: navi, route: { params: { jobId: "j1", job: { title: "React intern" } } } }));
    await settle(root);
    const tailoredChoice = all(root.tree, (x) => x.props?.accessibilityRole === "radio" && /tailored/.test(x.props.accessibilityLabel))[0];
    ok(tailoredChoice && tailoredChoice.props.accessibilityState.checked === true, "the version tailored for this job is offered and chosen");
    await fill(root, { Phone: "0300", "Cover letter": "hello" });
    submitBtn(root.tree).props.onPress(); await settle(root);
    ok(net.posts.length === 1 && net.posts[0].body.get("resume") === undefined, "sent without a file");
    ok(studio.attached.length === 1 && studio.attached[0][0] === "app9" && studio.attached[0][1] === "v1", "then that version is attached to the new application", JSON.stringify(studio.attached));
    ok(/tailored resume went with it/.test(alerts[0]?.[1] || ""), "and the message says so");
    studio.on = false; studio.versions = [];
  }

  // ═════ JobDetails ═════
  console.log("── JobDetails");
  const Details = load(path.join(SRC, "screens/Career/JobDetails.js")).default;
  const future = new Date(Date.now() + 7 * 864e5).toISOString();
  const JOB = { _id: "j1", title: "React intern", companyName: "HireCo", companyLogo: "https://x/logo.png", location: "Lahore", type: "Internship", locationType: "Hybrid", salary: "PKR 40,000", applicationDeadline: future, description: "Build things.", responsibilities: ["Ship features"], skills: ["React", "JavaScript"], requirements: ["Must know React"], benefits: ["Mentorship"], active: true, isExternal: false };
  const MATCH = { hasResume: true, applied: false, match: { score: 83, quality: "strong", summary: "Matches 5 of 6 skills, missing MongoDB, meets all requirements", matched: [{ skill: "React", evidence: ["A web app built with React"] }], missing: ["MongoDB"], unknown: [], mandatory: [{ criterion: "Must know React", status: "met" }] } };
  const setNet = ({ job = JOB, apps = [], match = null, matchingOn = false }) => {
    net.gets.length = 0; net.matchingOn = matchingOn; net.match = async () => match;
    net.get = async (url) => (url.startsWith("/jobs/public/job/") ? { data: job } : url === "/jobs/my-applications" ? { data: apps } : { data: {} });
  };
  const BAR = new Set(["Apply", "Applied", "Closed", "Apply on company site"]);
  const applyBtn = (tree) => all(tree, (x) => x.type === "Button" && BAR.has(x.props.title))[0];
  {
    setNet({ match: MATCH, matchingOn: true });
    const navi = makeNav(stack().slice(0, 3));
    const root = mount(React.createElement(Details, { navigation: navi, route: { params: { jobId: "j1", preview: { _id: "j1", title: "React intern" } } } }));
    await settle(root);
    const t = textOf(root.tree);
    ok(net.gets.includes("/jobs/public/job/j1"), "loads the job (GET /jobs/public/job/:id)");
    ok(["React intern", "HireCo", "Lahore", "Internship", "PKR 40,000", "apply by", "Build things.", "Ship features", "React", "JavaScript", "Must know React", "Mentorship"].every((s) => t.includes(s)), "title, company, location, type, salary, deadline, description, responsibilities, skills, requirements, benefits", t.slice(0, 300));
    ok(all(root.tree, (x) => x.type === "Image" && x.props.source?.uri === "https://x/logo.png").length === 1, "the company logo");
    ok(t.includes("your match") && t.includes("83%") && t.includes("strong match") && t.includes("Matches 5 of 6 skills, missing MongoDB, meets all requirements") && t.includes('"A web app built with React"') && t.includes("MongoDB") && /estimate/.test(t), "your match: estimate, band, one line, a strength with the resume line, the gap, an honest note");
    const b = applyBtn(root.tree);
    ok(b.props.title === "Apply" && b.props.disabled === false, "open job: Apply");
    b.props.onPress();
    ok(navi.navigated[0]?.[0] === "JobApplicationForm" && navi.navigated[0][1].jobId === "j1" && navi.navigated[0][1].job.title === "React intern", "Apply → JobApplicationForm for this job", JSON.stringify(navi.navigated));
  }
  {
    setNet({ apps: [{ jobId: { _id: "j1" }, status: "shortlisted" }] });
    const root = mount(React.createElement(Details, { navigation: makeNav(stack().slice(0, 3)), route: { params: { jobId: "j1" } } }));
    await settle(root);
    const b = applyBtn(root.tree);
    ok(b.props.title === "Applied" && b.props.disabled === true && textOf(root.tree).includes("shortlisted"), "already applied: Applied, disabled, with the status");
    ok(!textOf(root.tree).includes("your match"), "outside the matching pilot: no 'your match'");
  }
  {
    setNet({ job: { ...JOB, applicationDeadline: new Date(Date.now() - 864e5).toISOString() } });
    const navi = makeNav(stack().slice(0, 3));
    const root = mount(React.createElement(Details, { navigation: navi, route: { params: { jobId: "j1" } } }));
    await settle(root);
    const b = applyBtn(root.tree);
    ok(b.props.title === "Closed" && b.props.disabled === true && textOf(root.tree).includes("closed"), "past the deadline: Closed, disabled");
    b.props.onPress();
    ok(navi.navigated.length === 0, "…and it does nothing");
  }
  {
    setNet({ job: { ...JOB, isExternal: true, applyUrl: "https://hireco.pk/jobs/1" } });
    const navi = makeNav(stack().slice(0, 3));
    const root = mount(React.createElement(Details, { navigation: navi, route: { params: { jobId: "j1" } } }));
    await settle(root);
    const b = applyBtn(root.tree);
    ok(b.props.title === "Apply on company site", "external job: apply on the company's site");
    b.props.onPress(); await settle(root);
    const w = all(root.tree, (x) => x.type === "WebViewModal")[0];
    ok(w.props.visible === true && w.props.url === "https://hireco.pk/jobs/1" && navi.navigated.length === 0, "…in the in-app browser, not the form");
  }
  {
    setNet({});
    net.allowAccount = false;
    contexts.set(AuthContext, { user: null, token: null, isGuest: true });
    const navi = makeNav(stack().slice(0, 3));
    const root = mount(React.createElement(Details, { navigation: navi, route: { params: { jobId: "j1" } } }));
    await settle(root);
    ok(!net.gets.includes("/jobs/my-applications"), "guest: the job loads, no account calls");
    applyBtn(root.tree).props.onPress();
    ok(navi.navigated.length === 0, "guest: Apply asks to sign up first (no form)");
    net.allowAccount = true;
    contexts.set(AuthContext, { user: { name: "Sana Ali", email: "sana@test.pk" }, token: "t", isGuest: false });
  }
  {
    net.gets.length = 0;
    net.get = async () => { const e = new Error("404"); e.response = { status: 404 }; throw e; };
    const root = mount(React.createElement(Details, { navigation: makeNav(stack().slice(0, 3)), route: { params: { jobId: "gone" } } }));
    await settle(root);
    ok(textOf(root.tree).includes("This job is no longer listed.") && all(root.tree, (x) => x.type === "Button" && x.props.title === "try again").length === 1, "a job that's gone: a clear message and try again");
  }

  // ═════ wiring ═════
  console.log("── wiring");
  const drawer = read("app/src/navigation/DrawerNavigator.js");
  ok(/<Stack\.Screen name="JobDetails" component=\{JobDetails\} options=\{\{ gestureEnabled: true \}\} \/>/.test(drawer) && /<Stack\.Screen name="JobApplicationForm" component=\{JobApplicationForm\} options=\{\{ gestureEnabled: true \}\} \/>/.test(drawer) && drawer.indexOf('name="JobDetails"') > drawer.indexOf('name="Career"'), "both screens are registered next to the jobs list (iOS swipe back on)");
  ok(/const JobApplicationForm = accountOnly\(JobApplicationFormBase/.test(drawer) && /<Stack\.Screen name="ApplicationForm" component=\{ApplicationForm\} \/>/.test(drawer), "the form needs an account; the scholarship ApplicationForm is unchanged");
  ok(drawer.includes("  'JobDetails',\n  'JobApplicationForm',") && read("app/src/navigation/TabNavigator.js").includes('  "JobDetails",\n  "JobApplicationForm",'), "full screen (no tab bar or drawer header over the Apply bar)");
  const career = read("app/src/components/Career.js");
  ok(/const openJob = useStableCallback\(\(job\) => openJobDetails\(navigation, job\)\);/.test(career), "jobs list: a job opens JobDetails");
  ok(/useOpenFromParams\('openJobId', async \(id\) => \{\n    const job = jobs\.find\(\(j\) => String\(j\._id\) === String\(id\)\);\n    openJobDetails\(navigation, job \|\| String\(id\)\);/.test(career), "pushes, invites, the Daily Drop and recommended jobs (Career { openJobId }) open JobDetails");
  ok(/const appliedJobId = route\?\.params\?\.appliedJobId;/.test(career) && /setAppliedJobIds\(\(prev\) => new Set\(prev\)\.add\(String\(appliedJobId\)\)\)/.test(career) && /hasApplied=\{appliedJobIds\.has\(item\._id\)\}/.test(career), "back on the list after applying: the job shows Applied");
  ok(!/<TextInput[\s\S]*<TextInput/.test(career) && !/handleApply|apply\/\$\{|metaEvents|JobDetailsModal|setModalVisible/.test(career), "the old apply modal, its form and its Meta call are gone from Career.js");
  const metaCalls = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.js$/.test(f.name) && /metaEvents\.jobApplied\(/.test(fs.readFileSync(p, "utf8"))) metaCalls.push(path.relative(APP, p).split(path.sep).join("/")); } };
  walk(SRC);
  // (TDCCareers and its own apply form are gone: fix/tdccareers-to-jobdetails)
  ok(metaCalls.join() === "app/src/screens/Career/JobApplicationForm.js", "SubmitApplication is sent from one place only: the apply form, after the server accepted", metaCalls.join());
  ok(/jobApplied: \(jobId\) =>\n\s*log\([\s\S]*?`job:\$\{id\(jobId\)\}`\)/.test(read("app/src/analytics/metaEvents.js")), "…and counted once per job (de-duplicated by job id)");
  for (const [f, n] of [["app/src/components/CareerInvites.js", 'navigation?.navigate?.("Career", { openJobId: inv.job.id })'], ["app/src/components/RecommendedJobs.js", 'navigation?.navigate?.("Career", { openJobId: String(j._id) })']]) ok(read(f).includes(n), `${path.basename(f)}: still opens the job through Career (the list stays underneath)`);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("FAIL  crashed  → " + e.stack); process.exit(1); });
