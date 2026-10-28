// App responsiveness (fix/app-responsiveness): tab taps, re-renders, polling, bugs.
//   node tests/app/responsiveness.test.js
// Real app modules with fakes for native parts: a small hook runtime, a flex-layout model for the
// tab bar (row, centring, padding, margins, absolute children) with Android-style hit testing, fake
// phone storage, fake network. Nothing leaves the process.
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
  };
  React.useLayoutEffect = React.useEffect;
  React.default = React;
  const expand = (el, p) => {
    if (el == null || typeof el !== "object") return el;
    if (Array.isArray(el)) return el.map((c, k) => expand(c, `${p}.${k}`));
    if (typeof el.type === "function") { const prev = cur; const np = p + "/" + (el.type.name || "C"); cur = { path: np, i: 0 }; renders[el.type.name] = (renders[el.type.name] || 0) + 1; const out = el.type(el.props); cur = prev; return expand(out, np); }
    return { type: el.type, props: { ...el.props, children: expand(el.props.children, p + "." + (el.type?.displayName || el.type)) } };
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

// ── flex layout model + Android-style hit testing ──
// Supports what the tab bar uses: position absolute (top/bottom/left/right, width/height),
// flexDirection row with flex:1 children, alignItems center / flex-start, height, width,
// paddingTop/Bottom/Horizontal, marginTop, pointerEvents. Text and icons are leaves.
function layout(node, box, out = []) {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) { node.forEach((n) => layout(n, box, out)); return out; }
  const st = flat(node.props?.style);
  const me = { node, box, pe: node.props?.pointerEvents || "auto", children: [] };
  out.push(me);
  const kids = [].concat(node.props?.children ?? []).flat(Infinity).filter((k) => k && typeof k === "object");
  const pt = st.paddingTop ?? st.paddingVertical ?? st.padding ?? 0;
  const pb = st.paddingBottom ?? st.paddingVertical ?? st.padding ?? 0;
  const ph = st.paddingHorizontal ?? st.padding ?? 0;
  const inner = { x: box.x + ph, y: box.y + pt, w: box.w - 2 * ph, h: box.h - pt - pb };
  const flowKids = kids.filter((k) => flat(k.props?.style).position !== "absolute");
  const absKids = kids.filter((k) => flat(k.props?.style).position === "absolute");
  for (const k of absKids) {
    const ks = flat(k.props?.style);
    const w = ks.width ?? (ks.left != null && ks.right != null ? box.w - ks.left - ks.right : box.w);
    const h = ks.height ?? (ks.top != null && ks.bottom != null ? box.h - ks.top - ks.bottom : 58);
    const x = box.x + (ks.left ?? 0);
    const y = ks.top != null ? box.y + ks.top : box.y + box.h - (ks.bottom ?? 0) - h;
    layout(k, { x, y, w, h }, out);
  }
  if (st.flexDirection === "row") {
    const flexKids = flowKids.filter((k) => flat(k.props?.style).flex);
    const fixed = flowKids.filter((k) => !flat(k.props?.style).flex).reduce((s, k) => s + (flat(k.props?.style).width || 0), 0);
    const each = flexKids.length ? (inner.w - fixed) / flexKids.length : 0;
    let x = inner.x;
    for (const k of flowKids) {
      const ks = flat(k.props?.style); const w = ks.flex ? each : ks.width || 0;
      const mt = ks.marginTop || 0; const h = ks.height ?? inner.h;
      const outer = h + mt;
      const self = ks.alignSelf || st.alignItems || "stretch";
      const y = (self === "center" ? inner.y + (inner.h - outer) / 2 : inner.y) + mt;
      layout(k, { x, y, w, h }, out); x += w;
    }
  } else {
    let y = inner.y;
    for (const k of flowKids) {
      const ks = flat(k.props?.style); const h = ks.height ?? 0; const mt = ks.marginTop || 0;
      const w = ks.width ?? inner.w; const x = st.alignItems === "center" ? inner.x + (inner.w - w) / 2 : inner.x;
      layout(k, { x, y: y + mt, w, h }, out); y += mt + h;
    }
  }
  return out;
}
const inBox = (b, x, y) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
// Android: a ViewGroup only dispatches to children whose bounds contain the point; deepest touchable wins
function hitTest(tree, rootBox, x, y) {
  const boxes = new Map(layout(tree, rootBox).map((e) => [e.node, e]));
  const visit = (node) => {
    if (node == null || typeof node !== "object") return null;
    if (Array.isArray(node)) { for (let i = node.length - 1; i >= 0; i--) { const h = visit(node[i]); if (h) return h; } return null; }
    const e = boxes.get(node); if (!e || !inBox(e.box, x, y)) return null;
    if (e.pe === "none") return null;
    const kids = [].concat(node.props?.children ?? []).flat(Infinity);
    for (let i = kids.length - 1; i >= 0; i--) { const h = visit(kids[i]); if (h) return h; }
    if (e.pe === "box-none") return null;
    return node.props?.onPress ? node : null;
  };
  return visit(tree);
}

(async () => {
  // ═════ P1-1 the whole Social circle is tappable ═════
  console.log("── P1-1 Social button inside the tab bar's touch box");
  {
    const runTabBar = (file, insetsBottom) => {
      const { React, mount } = makeReact();
      const { rn } = makeRN();
      const stub = () => null;
      const load = loader({
        react: React, "react-native": rn, axios: { get: async () => ({ data: [] }) },
        "@react-navigation/bottom-tabs": { createBottomTabNavigator: () => ({ Navigator: "Nav", Screen: "Screen" }) },
        "@expo/vector-icons": { Octicons: "Icon", MaterialCommunityIcons: "Icon", MaterialIcons: "Icon", Foundation: "Icon" },
        "react-native-safe-area-context": { SafeAreaProvider: "SAP", useSafeAreaInsets: () => ({ top: 0, bottom: insetsBottom, left: 0, right: 0 }) },
        "./HomeStack": stub, "../screens/Social/Social": stub, "../screens/StudentDashboard": stub, "../screens/Explore": stub, "../screens/ProfileScreen": stub,
        "../guest": { accountOnly: (c) => c },
        "../engagement/tour/TourProvider": { useTour: () => ({ registerTarget() {} }) },
        "../context/AuthContext": { AuthContext: { _default: { token: null, isGuest: true } } },
        "../hooks/useMessageUnread": { useMessageUnread: () => ({ unread: 0, refresh() {} }) },
      });
      const { CustomTabBar } = load(file);
      const navs = [];
      const state = { index: 0, routes: ["Home", "Explore", "Social", "Campus", "Profile"].map((name) => ({ name, key: name })) };
      const root = mount(React.createElement(CustomTabBar, { state, descriptors: {}, navigation: { navigate: (n) => navs.push(n) } }));
      return { tree: root.tree, navs };
    };
    const SCREEN = { w: 390, h: 844 };
    const check = (file, insetsBottom) => {
      const { tree } = runTabBar(file, insetsBottom);
      const wrapH = flat(tree.props.style).height;
      const rootBox = { x: 0, y: SCREEN.h - wrapH, w: SCREEN.w, h: wrapH };
      const all = layout(tree, rootBox);
      const circle = all.find((e) => flat(e.node.props?.style).width === 58 && flat(e.node.props?.style).height === 58);
      const surface = all.find((e) => e.node.props && e.node.props.style && flat(e.node.props.style).borderTopWidth === 1);
      const social = (n) => !!n && !!n.props?.accessibilityLabel?.startsWith("social");
      const pts = []; for (let fy = 0.02; fy < 1; fy += 0.08) pts.push([circle.box.x + circle.box.w / 2, circle.box.y + circle.box.h * fy]);
      const hits = pts.map(([x, y]) => social(hitTest(tree, rootBox, x, y)));
      const aboveBar = circle.box.y < surface.box.y;
      // above the home tab (left of the circle), higher than the side tabs have always reached
      // (half the bottom padding above the white bar): the new strip must let it through
      const stripHit = hitTest(tree, rootBox, 30, surface.box.y - (insetsBottom + 5) / 2 - 3);
      const homeHit = hitTest(tree, rootBox, 30, surface.box.y + 20);
      return { hits, aboveBar, rise: surface.box.y - circle.box.y, stripHit, homeHit, circle, surface };
    };
    const file = path.join(SRC, "navigation/TabNavigator.js");
    for (const ib of [0, 24, 48]) {
      const r = check(file, ib);
      ok(r.aboveBar && Math.abs(r.rise - (14 + (ib + 5) / 2)) < 0.01, `bottom inset ${ib}: circle rises above the white bar exactly as before (14 + half the bottom padding)`, `rise ${r.rise}`);
      ok(r.hits.every(Boolean), `bottom inset ${ib}: every point of the circle, top edge included, opens Social`, JSON.stringify(r.hits));
      ok(r.stripHit === null, `bottom inset ${ib}: the strip above the bar beside the circle lets taps through to the screen`);
      ok(r.homeHit?.props?.accessibilityLabel === "home", `bottom inset ${ib}: the home tab still answers on the bar`, r.homeHit?.props?.accessibilityLabel);
    }
    // the same model on the old tab bar shows the dead zone (proves the test sees the bug)
    const old = path.join(require("os").tmpdir(), "tdc-tests-old-TabNavigator.js");
    try {
      const src = require("child_process").execSync("git show 280205a:app/src/navigation/TabNavigator.js", { cwd: APP }).toString().replace("const CustomTabBar = (", "export const CustomTabBar = (");
      fs.mkdirSync(path.dirname(old), { recursive: true }); fs.writeFileSync(old, src);
      // resolve the old file's relative imports from the real folder
      const oldIn = path.join(SRC, "navigation", "__old_TabNavigator.js"); fs.writeFileSync(oldIn, src);
      let r; try { r = check(oldIn, 0); } finally { fs.unlinkSync(oldIn); }
      const oldRise = r.rise;
      ok(Math.abs(oldRise - (14 + 5 / 2)) < 0.01, "old bar has the same circle position (look unchanged)", `rise ${oldRise}`);
      ok(!r.hits.every(Boolean) && !r.hits[0], "before this fix the circle's top part did nothing (dead zone reproduced)", JSON.stringify(r.hits));
    } catch (e) { ok(false, "old tab bar comparison", e.message); }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("FAIL  (stopped)", e?.stack || e); process.exit(1); });
