// Hiring timeline in the app (FLAG_CAREER_TIMELINE): the flags gate, my applications (active / closed),
// the timeline with interview, offer and hire steps, outcomes and disputes, placement.
//   node tests/app/career.test.js
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
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 400) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8");
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
const find = (n, pred) => { let hit = null; (function w(x) { if (!x || hit || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(w); if (pred(x)) { hit = x; return; } w(x.props?.children); })(n); return hit; };
const byLabel = (tree, label) => find(tree, (x) => x.props?.accessibilityLabel === label);

(async () => {
  console.log("── the flags gate (api/careerApi.js)");
  {
    const store = { token: null, isGuest: null };
    const calls = [];
    let flagOn = true;
    const api = { get: async (url) => { calls.push(url); if (url === "/app/flags/me") return { data: { careerTimeline: flagOn } }; return { data: { success: true, data: { enabled: true, applications: [] } } }; }, post: async () => ({ data: { success: true, data: {} } }), patch: async () => ({ data: { success: true, data: {} } }) };
    const load = loader({ "@react-native-async-storage/async-storage": { getItem: async (k) => store[k] }, "./api": { __esModule: true, default: api, BASE_URL: "https://x.test/api" }, "expo-file-system/legacy": {}, "expo-sharing": {} });
    const C = load(path.join(SRC, "api/careerApi.js"));
    ok((await C.careerEnabled()) === false && calls.length === 0, "signed out: off, no request");
    store.token = "g"; store.isGuest = "true";
    ok((await C.careerEnabled()) === false && calls.length === 0, "guest: off, no request");
    store.token = "tok-a"; store.isGuest = "false";
    ok((await C.careerEnabled()) === true && (await C.careerEnabled()) === true && calls.filter((c) => c === "/app/flags/me").length === 1, "pilot student: on, /flags/me asked once", calls.join());
    store.token = "tok-b"; flagOn = false;
    ok((await C.careerEnabled()) === false, "another account outside the pilot: off");
  }

  const { React, mount } = makeReact();
  const alerts = [];
  const { rn } = makeRN({ Alert: { alert: (title, text, buttons) => { alerts.push({ title, text }); const yes = (buttons || []).find((b) => b.text === "yes"); if (yes) yes.onPress(); } }, Switch: "Switch", TextInput: "TextInput" });
  const icons = { "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon" } };
  const future = new Date(Date.now() + 2 * 864e5).toISOString();
  const apps = [
    { applicationId: "a1", job: { title: "Backend dev", company: "Hire Co" }, appliedAt: "2026-11-01T10:00:00Z", stage: "interview", closed: false, version: 4, interview: { status: "invited", startsAt: future }, offer: { status: "none" }, nextAllowedActions: ["WITHDRAWN", "INTERVIEW_ACCEPTED", "INTERVIEW_DECLINED", "INTERVIEW_RESCHEDULE_REQUESTED"] },
    { applicationId: "a2", job: { title: "Designer", company: "Other Co" }, appliedAt: "2026-10-20T10:00:00Z", stage: "offer", closed: false, version: 6, offer: { status: "sent", expiresAt: future }, nextAllowedActions: ["WITHDRAWN", "OFFER_ACCEPTED", "OFFER_DECLINED"] },
    { applicationId: "a3", job: { title: "Analyst", company: "Data Co" }, appliedAt: "2026-10-01T10:00:00Z", stage: "hired", closed: true, version: 9, hire: { status: "verified" }, nextAllowedActions: ["HIRE_DISPUTED"] },
    { applicationId: "a4", job: { title: "Imported role", company: "Imported Ltd" }, appliedAt: "2026-10-05T10:00:00Z", stage: "applied", closed: false, external: true, externalLabel: "External application, outcome unverified", version: 1, nextAllowedActions: ["WITHDRAWN"] },
  ];
  const timelines = {
    a1: { applicationId: "a1", job: { title: "Backend dev", company: "Hire Co" }, stage: "interview", version: 4, legacyStatus: "interview", nextAllowedActions: ["WITHDRAWN", "INTERVIEW_ACCEPTED", "INTERVIEW_DECLINED", "INTERVIEW_RESCHEDULE_REQUESTED"], events: [{ id: "e1", type: "APPLIED", actorRole: "system", occurredAt: "2026-11-01T10:00:00Z", metadata: {} }, { id: "e2", type: "INTERVIEW_INVITED", actorRole: "employer", occurredAt: "2026-11-02T10:00:00Z", metadata: { note: "bring your portfolio" } }], interviewDetails: { id: "iv1", status: "invited", startsAt: future, timezone: "Asia/Karachi", mode: "online", meetingLink: "https://meet.example.test/x", note: "bring your portfolio" }, offerDetails: null, hire: { status: "none" } },
    a2: { applicationId: "a2", job: { title: "Designer", company: "Other Co" }, stage: "offer", version: 6, legacyStatus: "interview", nextAllowedActions: ["WITHDRAWN", "OFFER_ACCEPTED", "OFFER_DECLINED"], events: [{ id: "e3", type: "OFFER_SENT", actorRole: "employer", occurredAt: "2026-11-02T10:00:00Z", metadata: {} }], interviewDetails: null, offerDetails: { id: "of1", title: "Junior designer", terms: "starts 1 december", status: "sent", expiresAt: future }, hire: { status: "none" } },
    a3: { applicationId: "a3", job: { title: "Analyst", company: "Data Co" }, stage: "hired", version: 9, legacyStatus: "hired", nextAllowedActions: ["HIRE_DISPUTED"], events: [{ id: "e4", type: "HIRE_CONFIRMED", actorRole: "employer", occurredAt: "2026-11-01T10:00:00Z", metadata: {} }], interviewDetails: null, offerDetails: { id: "of2", title: "Analyst", status: "accepted", expiresAt: future }, hire: { status: "verified" } },
  };
  const sent = [];
  const careerApiMock = {
    careerApi: {
      myApplications: async () => ({ enabled: true, applications: apps }),
      timeline: async (id) => timelines[id],
      respondInterview: async (id, body) => { sent.push({ what: "interview", id, ...body }); return {}; },
      respondOffer: async (id, body) => { sent.push({ what: "offer", id, ...body }); return {}; },
      event: async (id, body) => { sent.push({ what: "event", id, ...body }); return {}; },
      myOutcomes: async () => ({ outcomes: [{ id: "o1", label: "Hired via TDC", verificationLevel: "verified", visibility: "private" }, { id: "o2", label: "Interviewed via TDC", verificationLevel: "revoked", visibility: "private" }] }),
      setOutcomeVisibility: async (id, v) => { sent.push({ what: "visibility", id, v }); return {}; },
    },
    addInterviewToCalendar: async (id) => { sent.push({ what: "calendar", id }); },
  };
  const load = loader({ react: React, "react-native": rn, ...icons, "../api/careerApi": careerApiMock });
  const CareerApplications = load(path.join(SRC, "components/CareerApplications.js")).default;

  console.log("── my applications (components/CareerApplications.js)");
  let root = mount(React.createElement(CareerApplications));
  await tick(40); root.rerender(); await tick(20); root.rerender();
  let t = textOf(root.tree);
  ok(t.includes("active (3)") && t.includes("closed (1)"), "active / closed tabs with counts", t.slice(0, 200));
  ok(t.includes("backend dev") || t.includes("Backend dev"), "an application card");
  ok(t.includes("answer the interview invitation") && t.includes("answer the offer by"), "the next step on each card", t);
  ok(t.includes("External application, outcome unverified"), "an external job says its outcome is unverified");
  ok(t.includes("hired via tdc") && t.includes("verified · private") && t.includes("revoked · private"), "career outcomes: private by default, revoked shown as revoked", t);
  ok(!!find(root.tree, (x) => x.type === "Switch" && x.props.accessibilityLabel === "show Hired via TDC publicly") && !find(root.tree, (x) => x.type === "Switch" && x.props.accessibilityLabel === "show Interviewed via TDC publicly"), "a switch to show a verified outcome; none for a revoked one");
  find(root.tree, (x) => x.type === "Switch").props.onValueChange(true);
  await tick(10);
  ok(sent.some((s) => s.what === "visibility" && s.id === "o1" && s.v === "public"), "turning it on makes it public (the student's choice)");

  console.log("── an interview invitation");
  byLabel(root.tree, "Backend dev, interview. answer the interview invitation").props.onPress();
  await tick(40); root.rerender(); await tick(20); root.rerender();
  t = textOf(root.tree);
  ok(t.includes("interview · invited") && t.includes("Asia/Karachi") && t.includes("https://meet.example.test/x") && t.includes("bring your portfolio"), "time zone, link and note", t.slice(0, 300));
  ok(["accept", "ask for another time", "decline", "add to calendar", "withdraw my application"].every((l) => byLabel(root.tree, l)), "accept, ask for another time, decline, add to calendar, withdraw");
  byLabel(root.tree, "accept").props.onPress();
  await tick(20);
  ok(sent.some((s) => s.what === "interview" && s.id === "iv1" && s.response === "accept" && s.version === 4), "accept sends the version the screen saw", JSON.stringify(sent.slice(-1)));
  root.rerender();
  byLabel(root.tree, "add to calendar").props.onPress();
  await tick(10);
  ok(sent.some((s) => s.what === "calendar" && s.id === "iv1"), "add to calendar opens the interview's .ics");
  byLabel(root.tree, "ask for another time").props.onPress();
  root.rerender();
  const input = find(root.tree, (x) => x.type === "TextInput");
  input.props.onChangeText("any weekday after 3 pm");
  root.rerender();
  byLabel(root.tree, "send").props.onPress();
  await tick(20);
  ok(sent.some((s) => s.response === "reschedule" && s.message === "any weekday after 3 pm"), "asking for another time sends the student's times");
  root.rerender();
  byLabel(root.tree, "back to my applications").props.onPress();
  await tick(40); root.rerender(); await tick(20); root.rerender();

  console.log("── an offer and a confirmed hire");
  byLabel(root.tree, `Designer, offer. answer the offer by ${new Date(future).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`)?.props.onPress();
  await tick(40); root.rerender(); await tick(20); root.rerender();
  t = textOf(root.tree);
  ok(t.includes("offer · sent") && t.includes("Junior designer") && t.includes("starts 1 december") && t.includes("answer by"), "the offer, its terms and deadline", t.slice(0, 300));
  byLabel(root.tree, "accept the offer").props.onPress();
  await tick(20);
  ok(sent.some((s) => s.what === "offer" && s.id === "of1" && s.response === "accept" && s.version === 6) && alerts.some((a) => a.title === "accept this offer?"), "accepting asks first, then sends the answer with the version");
  root.rerender();
  byLabel(root.tree, "back to my applications").props.onPress();
  await tick(40); root.rerender(); await tick(20); root.rerender();
  find(root.tree, (x) => x.props?.accessibilityRole === "tab" && textOf(x).includes("closed")).props.onPress();
  root.rerender();
  find(root.tree, (x) => typeof x.props?.accessibilityLabel === "string" && x.props.accessibilityLabel.startsWith("Analyst, hired via tdc")).props.onPress();
  await tick(40); root.rerender(); await tick(20); root.rerender();
  t = textOf(root.tree);
  ok(t.includes("hired via tdc 🎉") && t.includes("the record is private"), "hired confirmation, private", t.slice(0, 200));
  byLabel(root.tree, "something's wrong: dispute").props.onPress();
  root.rerender();
  const send = () => byLabel(root.tree, "send");
  ok(send().props.disabled === true, "a dispute needs a reason (send stays off)");
  find(root.tree, (x) => x.type === "TextInput").props.onChangeText("the employer withdrew the job");
  root.rerender();
  send().props.onPress();
  await tick(20);
  ok(sent.some((s) => s.what === "event" && s.type === "HIRE_DISPUTED" && s.note === "the employer withdrew the job" && s.version === 9), "the dispute is sent with the reason and the version");

  console.log("── placement: the existing Jobs area, no new tab");
  ok(read("app/src/components/TDCCareers.js").includes("<CareerApplications />"), "the TDC careers applications sheet shows it for pilot students");
  const nav = read("app/src/navigation/TabNavigator.js");
  ok(!nav.includes("CareerApplications"), "no new tab for it");

  console.log("── every hire event has words, not a code");
  const careerSrc = read("app/src/components/CareerApplications.js");
  const unlabelled = ["HIRE_CONFIRMED", "HIRE_DISPUTED", "HIRE_REVOKED", "HIRE_RESTORED"].filter((t) => !careerSrc.includes(`${t}: "`));
  ok(unlabelled.length === 0, "confirmed, disputed, revoked and restored (an admin rejected the dispute) each have a label", unlabelled.join(", "));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
