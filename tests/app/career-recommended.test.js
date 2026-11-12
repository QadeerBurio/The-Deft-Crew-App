// "Recommended for you" in the careers hub (FLAG_CAREER_MATCHING): app/src/api/matchingApi.js (the flags gate) and
// app/src/components/RecommendedJobs.js (hidden outside the pilot, without a resume or with nothing matching; each job
// with its match share and matched skills; a tap opens the job in Career with openJobId); placed in CareerHub.js.
//   node tests/app/career-recommended.test.js
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
  console.log("── the flags gate (api/matchingApi.js)");
  const store = { token: null, isGuest: null };
  const calls = [];
  let flagOn = true;
  let reply = { hasResume: true, recommendations: [] };
  const api = {
    get: async (url, cfg) => {
      calls.push({ url, params: cfg?.params });
      if (url === "/app/flags/me") return { data: { careerMatching: flagOn } };
      if (url === "/career/matching/recommended") return { data: { success: true, data: reply } };
      throw new Error("unexpected " + url);
    },
  };
  const loadApi = loader({ "@react-native-async-storage/async-storage": { getItem: async (k) => store[k] }, "./api": { __esModule: true, default: api } });
  const M = loadApi(path.join(SRC, "api/matchingApi.js"));
  ok((await M.matchingEnabled()) === false && calls.length === 0, "signed out: off, no request");
  store.token = "t1"; store.isGuest = "true";
  ok((await M.matchingEnabled()) === false && calls.length === 0, "guest: off, no request");
  store.isGuest = null;
  ok((await M.matchingEnabled()) === true && (await M.matchingEnabled()) === true && calls.filter((c) => c.url === "/app/flags/me").length === 1, "pilot student: on, /flags/me asked once");

  console.log("── RecommendedJobs");
  const { React, mount } = makeReact();
  const { rn } = makeRN();
  const icons = { "@expo/vector-icons": { Ionicons: "Ionicons" } };
  let enabled = false;
  const mapi = { matchingEnabled: async () => enabled, recommendedJobs: async (limit) => { calls.push({ url: "recommended", limit }); return reply; } };
  const load = loader({ react: React, "react-native": rn, ...icons, "../api/matchingApi": mapi });
  const RecommendedJobs = load(path.join(SRC, "components/RecommendedJobs.js")).default;
  const settle = async (root) => { for (let i = 0; i < 5; i++) { await tick(); root.rerender(); } };
  const nav = []; const navigation = { navigate: (s, p) => nav.push({ s, p }) };

  let root = mount(React.createElement(RecommendedJobs, { navigation }));
  await settle(root);
  ok(root.tree == null || textOf(root.tree) === "", "outside the pilot: nothing shown (the hub is unchanged)");
  ok(!calls.some((c) => c.url === "recommended"), "…and no recommendations request");
  enabled = true;
  reply = { hasResume: false, recommendations: [] };
  root = mount(React.createElement(RecommendedJobs, { navigation }));
  await settle(root);
  ok(root.tree == null || textOf(root.tree) === "", "no resume: nothing shown");
  reply = { hasResume: true, recommendations: [] };
  root = mount(React.createElement(RecommendedJobs, { navigation }));
  await settle(root);
  ok(root.tree == null || textOf(root.tree) === "", "nothing matches: nothing shown");
  reply = { hasResume: true, recommendations: [
    { _id: "j1", title: "React intern", companyName: "Bright Labs", location: "Karachi", matchPercentage: 100, matchedSkills: ["JavaScript", "React", "Node.js", "Git"] },
    { _id: "j2", title: "Frontend intern", company: "Hire Co", matchPercentage: 67, matchedSkills: ["React"] },
  ] };
  calls.length = 0;
  root = mount(React.createElement(RecommendedJobs, { navigation }));
  await settle(root);
  const t = textOf(root.tree);
  ok(t.includes("recommended for you") && t.includes("React intern") && t.includes("Bright Labs · Karachi") && t.includes("100%") && t.includes("Frontend intern") && t.includes("67%"), "the jobs, best first, with company, place and the share of skills matched", t.slice(0, 200));
  ok(t.includes("you show: JavaScript, React, Node.js") && !t.includes("Git"), "up to three matched skills each");
  ok(/an estimate, not a promise/.test(t), "says it's an estimate");
  ok(calls.find((c) => c.url === "recommended")?.limit === 5, "asks for 5");
  const row = all(root.tree, (x) => x.type === "TouchableOpacity")[0];
  ok(row.props.accessibilityRole === "button" && /React intern at Bright Labs. 100% of its skills on your resume: JavaScript, React, Node.js. opens the job/.test(row.props.accessibilityLabel), "each job is a button with a full spoken label", row.props.accessibilityLabel);
  row.props.onPress();
  ok(nav.length === 1 && nav[0].s === "Career" && nav[0].p.openJobId === "j1", "a tap opens the job in the jobs list (Career, openJobId)", JSON.stringify(nav));
  mapi.recommendedJobs = async () => { throw new Error("offline"); };
  root = mount(React.createElement(RecommendedJobs, { navigation, refreshKey: 1 }));
  await settle(root);
  ok(root.tree == null || textOf(root.tree) === "", "a failed request: nothing shown (no error on the hub)");

  console.log("── placement");
  const career = read("app/src/components/Career.js");
  ok(career.includes('import RecommendedJobs from "./RecommendedJobs"') && career.includes("<RecommendedJobs navigation={navigation} refreshKey={refreshing} />") && career.indexOf("<RecommendedJobs") < career.indexOf("jobs found") && read("app/src/navigation/DrawerNavigator.js").includes('<Stack.Screen name="Career" component={Career} />'), "shown at the top of the jobs list (Career, a registered screen: the one pushes and the Daily Drop open), refreshed with it");
  ok(!fs.existsSync(path.join(APP, "app/src/components/CareerHub.js")), "CareerHub.js is gone (nothing showed it; chore/app-cleanup)");
  ok(career.includes("useOpenFromParams('openJobId'"), "Career opens a job from openJobId (the route the tap uses)");

  console.log(`
${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
