// Invites to apply in the careers hub (FLAG_CAREER_MATCHING): app/src/components/CareerInvites.js and its calls in
// app/src/api/matchingApi.js. Hidden outside the pilot; the "let employers invite me to apply" switch (off by default,
// saved on the professional profile); each invite with the job and its status; the student decides: "view job"
// (interested, opens the job) or "not interested"; placed in CareerHub.js.
//   node tests/app/career-invites.test.js
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
  console.log("── the API calls (api/matchingApi.js)");
  const calls = [];
  const api = {
    get: async (url) => { calls.push({ m: "GET", url }); if (url === "/career/invites/me") return { data: { success: true, data: { discoverable: false, invites: [] } } }; return { data: {} }; },
    post: async (url, body) => { calls.push({ m: "POST", url, body }); if (url === "/professional-profile") return { data: { profile: { discoverable: body.discoverable } } }; return { data: { success: true, data: { status: body.response } } }; },
  };
  const loadApi = loader({ "@react-native-async-storage/async-storage": { getItem: async () => null }, "./api": { __esModule: true, default: api } });
  const M = loadApi(path.join(SRC, "api/matchingApi.js"));
  await M.myInvites(); await M.respondInvite("i1", "declined"); const on = await M.setDiscoverable(true);
  ok(calls[0].url === "/career/invites/me" && calls[1].url === "/career/invites/i1/respond" && calls[1].body.response === "declined" && calls[2].url === "/professional-profile" && calls[2].body.discoverable === true && on === true, "GET /career/invites/me, POST …/respond, and the opt-in through the existing POST /professional-profile", JSON.stringify(calls));

  console.log("── CareerInvites");
  const { React, mount } = makeReact();
  const alerts = [];
  const { rn } = makeRN({ Switch: "Switch", Alert: { alert: (t, m) => alerts.push({ t, m }) } });
  const icons = { "@expo/vector-icons": { Ionicons: "Ionicons" } };
  let enabled = false;
  let reply = { discoverable: false, invites: [] };
  const sent = [];
  const mapi = {
    matchingEnabled: async () => enabled,
    myInvites: async () => reply,
    respondInvite: async (id, response) => { sent.push({ id, response }); return { id, status: response }; },
    setDiscoverable: async (v) => { sent.push({ discoverable: v }); return v; },
  };
  const load = loader({ react: React, "react-native": rn, ...icons, "../api/matchingApi": mapi });
  const CareerInvites = load(path.join(SRC, "components/CareerInvites.js")).default;
  const settle = async (root) => { for (let i = 0; i < 5; i++) { await tick(); root.rerender(); } };
  const nav = []; const navigation = { navigate: (s, p) => nav.push({ s, p }) };

  let root = mount(React.createElement(CareerInvites, { navigation }));
  await settle(root);
  ok(root.tree == null || textOf(root.tree) === "", "outside the pilot: nothing shown (the hub is unchanged)");
  enabled = true;
  root = mount(React.createElement(CareerInvites, { navigation }));
  await settle(root);
  let t = textOf(root.tree);
  const sw = () => all(root.tree, (x) => x.type === "Switch")[0];
  ok(t.includes("invites to apply") && t.includes("let employers invite me to apply") && sw()?.props.value === false, "the switch, off by default", t.slice(0, 160));
  ok(/employers see your skills only, never your name, photo, university or contacts/.test(t) && /turn it on to get invites/.test(t), "says what employers see, and how to get invites");
  ok(sw().props.accessibilityLabel === "let employers invite me to apply" && /never your name/.test(sw().props.accessibilityHint || ""), "the switch has a spoken label and hint");
  sw().props.onValueChange(true);
  await settle(root);
  ok(sent.some((x) => x.discoverable === true) && sw().props.value === true && /no invites yet/.test(textOf(root.tree)), "turning it on saves it; 'no invites yet'");

  reply = { discoverable: true, invites: [
    { id: "i1", job: { id: "j1", title: "React intern", companyName: "Bright Labs", location: "Karachi", type: "Internship" }, status: "sent", sentAt: new Date().toISOString() },
    { id: "i2", job: { id: "j2", title: "Node intern", companyName: "Hire Co", location: "", type: "" }, status: "applied", sentAt: new Date().toISOString() },
  ] };
  sent.length = 0;
  root = mount(React.createElement(CareerInvites, { navigation, refreshKey: 1 }));
  await settle(root);
  t = textOf(root.tree);
  ok(t.includes("React intern") && t.includes("Bright Labs · Karachi · new") && t.includes("Node intern") && t.includes("Hire Co · you applied") && t.includes("1 open invite"), "each invite with the job, company, place and status", t.slice(0, 260));
  const view = byLabel(root.tree, "view React intern at Bright Labs"), no = byLabel(root.tree, "not interested in React intern");
  ok(view && no && !byLabel(root.tree, "view Node intern at Hire Co"), "an open invite has 'view job' and 'not interested'; an applied one has neither");
  view.props.onPress();
  await settle(root);
  ok(sent.some((x) => x.id === "i1" && x.response === "interested") && nav.some((n) => n.s === "Career" && n.p.openJobId === "j1"), "'view job': marked interested, opens the job (where they can apply)", JSON.stringify({ sent, nav }));
  byLabel(root.tree, "not interested in React intern").props.onPress();
  await settle(root);
  ok(sent.some((x) => x.id === "i1" && x.response === "declined") && textOf(root.tree).includes("not interested") && !byLabel(root.tree, "view React intern at Bright Labs"), "'not interested': saved, and the buttons go");
  mapi.myInvites = async () => { throw new Error("offline"); };
  root = mount(React.createElement(CareerInvites, { navigation, refreshKey: 2 }));
  await settle(root);
  ok(root.tree == null || textOf(root.tree) === "", "a failed request: nothing shown (no error on the hub)");

  console.log("── placement");
  const career = read("app/src/components/Career.js");
  ok(career.includes('import CareerInvites from "./CareerInvites"') && career.includes("<CareerInvites navigation={navigation} refreshKey={refreshing} />") && career.indexOf("<CareerInvites") < career.indexOf("jobs found") && read("app/src/navigation/DrawerNavigator.js").includes('<Stack.Screen name="Career" component={Career} />'), "shown at the top of the jobs list (Career, a registered screen), under 'recommended for you', refreshed with it");
  ok(!fs.existsSync(path.join(APP, "app/src/components/CareerHub.js")), "CareerHub.js is gone (nothing showed it; chore/app-cleanup)");

  console.log(`
${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
