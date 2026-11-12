// The pilot features in the app: mutual ratings (FLAG_CAREER_RATINGS: rate the employer after an interview or a
// hire, ratings received with a report, the employer's average on job details from 5 ratings), loyalty
// notifications (FLAG_LOYALTY_V2: the pilot-only 'loyalty' switch and the tap opening the brand's loyalty card),
// and the Resume Studio warning before export when Urdu can't be included in the PDF.
//   node tests/app/career-pilot.test.js
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

const all = (n, pred, out = []) => {
  if (n == null || typeof n !== "object") return out;
  if (Array.isArray(n)) { n.forEach((c) => all(c, pred, out)); return out; }
  if (pred(n)) out.push(n);
  all(n.props?.children, pred, out);
  return out;
};
const byLabel = (tree, label) => all(tree, (x) => x.props?.accessibilityLabel === label)[0];

(async () => {
  console.log("── the flags gate (api/ratingsApi.js)");
  {
    const store = { token: null, isGuest: null };
    const calls = [];
    let flagOn = true;
    const api = { get: async (url) => { calls.push(url); if (url === "/app/flags/me") return { data: { careerRatings: flagOn } }; throw new Error("unexpected " + url); } };
    const load = loader({ "@react-native-async-storage/async-storage": { getItem: async (k) => store[k] }, "./api": api });
    const R = load(path.join(SRC, "api/ratingsApi.js"));
    ok((await R.ratingsEnabled()) === false && calls.length === 0, "signed out: off, no request");
    store.token = "t"; store.isGuest = "true";
    ok((await R.ratingsEnabled()) === false && calls.length === 0, "guest: off, no request");
    store.isGuest = "false"; store.token = "tok-a";
    ok((await R.ratingsEnabled()) === true && (await R.ratingsEnabled()) === true && calls.length === 1, "pilot student: on, /flags/me asked once", calls.join());
    store.token = "tok-b"; flagOn = false;
    ok((await R.ratingsEnabled()) === false, "another account outside the pilot: off");
  }

  const { React, mount } = makeReact();
  const alerts = [];
  const { rn } = makeRN({ Alert: { alert: (title, msg, buttons) => alerts.push({ title, msg, buttons }) } });
  const icons = { "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon" } };
  const QS = [{ id: "communication", label: "Communication" }, { id: "respect", label: "Respect" }, { id: "clarity", label: "Clarity of the process" }];

  console.log("── rate the employer (components/CareerRatings.js)");
  {
    const sent = [];
    let rated = null;
    let enabled = true;
    const ratingsApi = {
      forApplication: async () => ({ side: "candidate", questions: QS, events: [{ kind: "interview", ref: "iv1", windowEndsAt: "2026-11-20T00:00:00Z", open: !rated, myRating: rated }] }),
      rate: async (body) => { sent.push(body); rated = { answers: body.answers, comment: body.comment }; return { id: "x" }; },
      received: async () => ({ ratings: [{ id: "r1", kind: "interview", job: { title: "Data intern", company: "Hire Co" }, answers: { communication: 2, punctuality: 3, preparation: 2 }, comment: "came late", month: "2026-11" }] }),
      report: async (id, reason) => { sent.push({ report: id, reason }); return {}; },
      employerForJob: async (jobId) => (jobId === "j5" ? { count: 6, shown: true, average: 4, minimum: 5 } : { count: 3, shown: false, average: null, minimum: 5 }),
    };
    const load = loader({ react: React, "react-native": rn, ...icons, "../api/ratingsApi": { ratingsApi, ratingsEnabled: async () => enabled } });
    const C = load(path.join(SRC, "components/CareerRatings.js"));
    let root = mount(React.createElement(C.RateEmployer, { applicationId: "a1" }));
    await tick(30); root.rerender(); await tick(30); root.rerender();
    let t = textOf(root.tree);
    ok(t.includes("rate the employer") && t.includes("how was the interview?") && t.includes("only ever sees an average from 5 ratings") && t.includes("Clarity of the process"), "after a completed interview: rate the employer, private, the three questions", t);
    const star = (q, n) => byLabel(root.tree, `${q}: ${n} of 5 stars`);
    ok(star("Respect", 3)?.props.accessibilityRole === "radio" && all(root.tree, (x) => x.props?.accessibilityRole === "radiogroup").length === 3, "each star is a labelled radio in a labelled group (screen readers)");
    const save = () => byLabel(root.tree, "save my rating");
    ok(save().props.disabled === true, "save is off until every question has stars");
    star("Communication", 4).props.onPress(); root.rerender();
    star("Respect", 5).props.onPress(); root.rerender();
    ok(save().props.disabled === true, "…still off with two of three");
    star("Clarity of the process", 3).props.onPress(); root.rerender();
    all(root.tree, (x) => x.type === "TextInput")[0].props.onChangeText("clear and kind"); root.rerender();
    ok(save().props.disabled === false && star("Clarity of the process", 3).props.accessibilityState.selected === true, "…on with all three; the chosen star is announced as selected");
    save().props.onPress(); await tick(30); root.rerender(); await tick(30); root.rerender();
    ok(sent[0]?.applicationId === "a1" && sent[0].kind === "interview" && sent[0].ref === "iv1" && JSON.stringify(sent[0].answers) === JSON.stringify({ communication: 4, respect: 5, clarity: 3 }) && sent[0].comment === "clear and kind", "it sends the application, the interview and the three answers with the comment", JSON.stringify(sent[0]));
    t = textOf(root.tree);
    ok(t.includes("you rated the interview: communication 4/5, respect 5/5, clarity of the process 3/5") && !byLabel(root.tree, "save my rating"), "then shows what was rated, and no second form (one per side per event)", t);
    ok(read("app/src/components/CareerRatings.js").includes("maxLength={300}"), "the comment is limited to 300 characters");

    root = mount(React.createElement(C.RatingsReceived, {}));
    await tick(30); root.rerender(); await tick(30); root.rerender();
    t = textOf(root.tree);
    ok(t.includes("ratings from employers") && t.includes("only you see these. other employers never do.") && t.includes("communication 2/5") && t.includes("came late"), "ratings received: only the student sees them", t);
    byLabel(root.tree, "report the rating for Data intern as unfair").props.onPress();
    const a = alerts.slice(-1)[0];
    a.buttons.find((b) => b.text === "report").onPress(); await tick(20);
    ok(sent.some((s) => s.report === "r1" && s.reason.length >= 5), "a rating can be reported as unfair", JSON.stringify(sent));

    root = mount(React.createElement(C.EmployerRating, { jobId: "j5" }));
    await tick(30); root.rerender(); await tick(30); root.rerender();
    ok(textOf(root.tree).includes("4 / 5 from 6 candidates"), "job details: the employer's average from 6 ratings", textOf(root.tree));
    root = mount(React.createElement(C.EmployerRating, { jobId: "j3" }));
    await tick(30); root.rerender(); await tick(30); root.rerender();
    ok(textOf(root.tree) === "", "fewer than 5 ratings: nothing shown", textOf(root.tree));

    enabled = false;
    const before = sent.length;
    for (const el of [React.createElement(C.RateEmployer, { applicationId: "a1" }), React.createElement(C.RatingsReceived, {}), React.createElement(C.EmployerRating, { jobId: "j5" })]) {
      root = mount(el); await tick(30); root.rerender();
      ok(textOf(root.tree) === "", `outside the pilot: ${el.type.name} renders nothing`);
    }
    ok(sent.length === before, "…and sends nothing");
  }

  console.log("── placement");
  {
    ok(read("app/src/components/CareerApplications.js").includes("<RateEmployer applicationId={applicationId} />") && read("app/src/components/CareerApplications.js").includes("<RatingsReceived />"), "the application timeline offers the rating; my applications lists ratings received");
    ok(read("app/src/components/TDCCareers.js").includes("<EmployerRating jobId={detailJob?._id} />") && read("app/src/screens/Career/JobDetails.js").includes("<EmployerRating jobId={job?._id} />"), "both job detail screens show the employer's average (when 5+)");
  }

  console.log("── loyalty notifications: the setting and the tap");
  {
    const s = read("app/src/engagement/screens/NotificationSettingsScreen.js");
    ok(/key: 'loyalty',[\s\S]*?pilotOnly: true/.test(s) && s.includes("const rows = ROWS.filter((r) => !r.pilotOnly || (prefs && r.key in prefs));") && s.includes("{rows.map((r, i) => ("), "settings: a 'loyalty' switch, shown only when the server sends it (students in the loyalty pilot)");
    ok(/loyalty:\s+\{ mood: 'money',\s+sound: 'tdc_mood_rs' \}/.test(read("app/src/utils/notificationFeatures.js")), "notificationFeatures has 'loyalty' (same mood and sound as the server's table)");
    const loadP = loader({ "expo-notifications": {}, "expo-device": {}, "expo-constants": { __esModule: true, default: {} }, "react-native": { Platform: { OS: "android" } }, "@react-native-async-storage/async-storage": { getItem: async () => null } });
    const P = loadP(path.join(SRC, "utils/pushNotifications.js"));
    // what the server sends (services/loyaltyNotify.js)
    const r = P.getRouteFromNotificationData({ type: "loyalty", screen: "OfferScreen", params: { brand: { _id: "b1", name: "alpha", brandName: "Alpha Cafe" } }, brandId: "b1", ledgerRow: "l1" });
    ok(r.route === "OfferScreen" && r.params.brand._id === "b1", "push tap: opens the brand's screen (its loyalty card) with that brand", JSON.stringify(r));
    ok(read("app/src/screens/OfferScreen.js").includes("<LoyaltyCard brandId={initialBrand?._id}"), "…where the loyalty card reads the brand's id from the same param");
  }

  console.log("── Urdu in resume PDFs: the warning before export (Resume Studio)");
  {
    const s = read("app/src/screens/Resume/ResumeStudio.js");
    ok(s.includes('const urduWarning = (pdf) => (pdf?.urdu === "not_included"'), "the warning comes from the server's pdf status (not_included)");
    const previews = (s.match(/label="preview pdf"[^\n]*confirmExport\(draft\.pdf/g) || []).length;
    const exportsV = (s.match(/confirmExport\((draft\?\.pdf|full\?\.pdf)/g) || []).length;
    ok(previews === 2 && exportsV === 2, "both preview buttons and both downloads ask first when Urdu can't be included", `${previews} ${exportsV}`);
    ok((s.match(/accessibilityRole="alert"[^\n]*\{urduWarning\(draft\.pdf\)\}/g) || []).length === 3, "and the warning is written above the buttons (announced by screen readers)");
    ok(read("app/src/api/resumeStudioApi.js").includes("version: (id) => unwrap(api.get(`${B}/versions/${id}`"), "a saved version is checked (its pdf status) before it's downloaded");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
