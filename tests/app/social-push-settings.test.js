// Social pushes in the app (feat/social-push-settings): the three new switches, the push types'
// emoji/sound, and where a tap on each push opens.
//   node tests/app/social-push-settings.test.js
// Real screen / modules with fakes for native parts and the API. Nothing leaves the process.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SRC = path.join(APP, "app/src");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 300) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8").replace(/\r\n/g, "\n");
global.__DEV__ = false;

// hook runtime
const hooks = new Map(); let cur = null, pending = []; const roots = new Map();
const slot = (init) => { const l = hooks.get(cur.path) || hooks.set(cur.path, []).get(cur.path); const i = cur.i++; if (!(i in l)) l[i] = init(); return [l, i]; };
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }),
  Fragment: "Fragment",
  useState(init) { const [l, i] = slot(() => ({ v: typeof init === "function" ? init() : init })); const root = cur.path.split("/")[0]; return [l[i].v, (v) => { const nv = typeof v === "function" ? v(l[i].v) : v; if (Object.is(nv, l[i].v)) return; l[i].v = nv; roots.get(root)?.(); }]; },
  useRef(init) { const [l, i] = slot(() => ({ current: init })); return l[i]; },
  useMemo(fn) { return fn(); }, useCallback(fn) { return fn; }, useContext() { return {}; },
  useEffect(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, cleanup: null })); const s = l[i]; if (!deps || !s.deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) pending.push(() => { if (s.cleanup) s.cleanup(); s.deps = deps; s.cleanup = fn() || null; }); },
};
React.default = React;
function expand(el, p) {
  if (el == null || typeof el !== "object") return el;
  if (Array.isArray(el)) return el.map((c, k) => expand(c, `${p}.${k}`));
  if (typeof el.type === "function") { const prev = cur; const np = p + "/" + (el.type.name || "C"); cur = { path: np, i: 0 }; const out = el.type(el.props); cur = prev; return expand(out, np); }
  return { type: el.type, props: { ...el.props, children: expand(el.props.children, p + "." + el.type) } };
}
function mount(element) { const root = "r" + Math.random(); let tree = null; const render = () => { tree = expand(element, root); const fx = pending; pending = []; fx.forEach((f) => f()); }; roots.set(root, render); render(); return { get tree() { return tree; } }; }
const all = (t, pred, out = []) => { if (t == null || typeof t !== "object") return out; if (Array.isArray(t)) { t.forEach((x) => all(x, pred, out)); return out; } if (pred(t)) out.push(t); all(t.props?.children, pred, out); return out; };

function loader(mocks) {
  const cache = new Map();
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports;
    const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [[reqApp.resolve("@babel/plugin-transform-react-jsx"), { runtime: "classic" }], reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
    const m = new Module(file); m.filename = file;
    m.require = (id) => { if (id in mocks) return mocks[id]; if (id.startsWith(".")) return load(require.resolve(path.resolve(path.dirname(file), id).replace(/(\.js)?$/, ".js"))); return reqApp(id); };
    cache.set(file, m); m._compile(code, file); return m.exports;
  };
  return load;
}

(async () => {
  // ═════ 1. settings screen ═════
  console.log("── 1. notification settings: posts, confessions, skillshare");
  {
    class Value { constructor(v) { this.v = v; } interpolate() { return this; } }
    const anim = () => ({ start() {} });
    const rn = { View: "View", Text: "Text", StyleSheet: { create: (x) => x }, Switch: "Switch", ScrollView: "ScrollView", TouchableOpacity: "TouchableOpacity", Linking: { openSettings() {} }, ActivityIndicator: "ActivityIndicator", Animated: { Value, View: "AnimatedView", timing: anim, parallel: anim, spring: anim }, Platform: { OS: "android" }, Alert: { alert() {} } };
    const saved = [];
    let serverPrefs = { streaks: true, dailyDrop: true, deals: true, jobsScholarships: true, social: true, osPermission: "granted" }; // an old server: no new keys
    const engagementApi = { getNotificationPrefs: async () => ({ ...serverPrefs }), updateNotificationPrefs: async (p) => { saved.push(p); return p; } };
    const load = loader({
      react: React, "react-native": rn,
      "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
      "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon" },
      "../../ui/FlatGradient": { LinearGradient: "LinearGradient" },
      "@react-navigation/native": { useNavigation: () => ({ goBack() {} }) },
      "../components/Dot": "Dot",
      "../api/engagementApi": { __esModule: true, default: engagementApi },
      "../../api/api": { __esModule: true, default: {} },
      "../../utils/pushNotifications": { registerForPushNotificationsAsync: async () => null, savePushTokenToServer: async () => ({}) },
      "../../ui": { ScreenHeader: "ScreenHeader", Skeleton: "Skeleton" },
      "../../utils/plainError": { plainError: (e) => String(e) },
    });
    const Screen = load(path.join(SRC, "engagement/screens/NotificationSettingsScreen.js")).default;
    const screen = mount(React.createElement(Screen));
    await tick(40);
    const switches = () => all(screen.tree, (n) => n.type === "Switch");
    const byLabel = (l) => switches().find((s) => s.props.accessibilityLabel === `${l} notifications`);
    ok(switches().length === 8, "8 switches: the 5 before + new posts, confessions, skillshare", switches().map((s) => s.props.accessibilityLabel).join(", "));
    ok(["new posts", "confessions", "skillshare"].every((l) => byLabel(l)?.props.value === true), "the new ones show on when the server has no value yet (old profiles)");
    byLabel("new posts").props.onValueChange(false);
    await tick();
    ok(JSON.stringify(saved.at(-1)) === JSON.stringify({ posts: false }) && byLabel("new posts").props.value === false, "turning \"new posts\" off saves { posts: false } and shows off");
    byLabel("confessions").props.onValueChange(false);
    byLabel("skillshare").props.onValueChange(false);
    await tick();
    ok(saved.some((p) => p.confessions === false) && saved.some((p) => p.skillshare === false), "confessions and skillshare save their own keys (the server's names)");
    const src = read("app/src/engagement/screens/NotificationSettingsScreen.js");
    ok(/sub: 'new confessions at your university'/.test(src), "the confessions row says it is your university only");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("FAIL  (stopped)", e?.stack || e); process.exit(1); });
