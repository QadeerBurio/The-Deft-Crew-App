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
// every string in a rendered tree (text and props), skipping refs
function strings(node, out = [], seen = new Set()) {
  if (node == null) return out;
  if (typeof node === "string" || typeof node === "number") { out.push(String(node)); return out; }
  if (typeof node !== "object" || seen.has(node)) return out;
  seen.add(node);
  if (Array.isArray(node)) { node.forEach((n) => strings(n, out, seen)); return out; }
  for (const [k, v] of Object.entries(node.props || {})) if (k !== "ref" && k !== "style") strings(v, out, seen);
  return out;
}
const has = (tree, s) => strings(tree).includes(s);
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
    try {
      // 280205a = perf/round2, the tab bar before this branch
      const src = require("child_process").execSync("git show 280205a:app/src/navigation/TabNavigator.js", { cwd: APP }).toString().replace("const CustomTabBar = (", "export const CustomTabBar = (");
      // next to the real one so its relative imports resolve; removed right after
      const oldIn = path.join(SRC, "navigation", "__old_TabNavigator.js"); fs.writeFileSync(oldIn, src);
      let r; try { r = check(oldIn, 0); } finally { fs.unlinkSync(oldIn); }
      const oldRise = r.rise;
      ok(Math.abs(oldRise - (14 + 5 / 2)) < 0.01, "old bar has the same circle position (look unchanged)", `rise ${oldRise}`);
      ok(!r.hits.every(Boolean) && !r.hits[0], "before this fix the circle's top part did nothing (dead zone reproduced)", JSON.stringify(r.hits));
    } catch (e) { ok(false, "old tab bar comparison", e.message); }
  }

  // ═════ P1-2 lazy tabs, freezeOnBlur, tour still works ═════
  console.log("── P1-2 lazy tabs + freezeOnBlur; the tour's targets");
  {
    const { React, mount } = makeReact();
    const { rn } = makeRN();
    const captured = { nav: null, screens: [] };
    const Nav = function Nav(props) { captured.nav = props; return props.children; };
    const Screen = function Screen(props) { captured.screens.push(props); return null; };
    const registered = [];
    const stub = () => null;
    const load = loader({
      react: React, "react-native": rn, axios: { get: async () => ({ data: [] }) },
      "@react-navigation/bottom-tabs": { createBottomTabNavigator: () => ({ Navigator: Nav, Screen }) },
      "@expo/vector-icons": { Octicons: "Icon", MaterialCommunityIcons: "Icon", MaterialIcons: "Icon", Foundation: "Icon" },
      "react-native-safe-area-context": { SafeAreaProvider: function SAP(p) { return p.children; }, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
      "./HomeStack": stub, "../screens/Social/Social": stub, "../screens/StudentDashboard": stub, "../screens/Explore": stub, "../screens/ProfileScreen": stub,
      "../guest": { accountOnly: (c) => c },
      "../engagement/tour/TourProvider": { useTour: () => ({ registerTarget: (id) => registered.push(id) }) },
      "../context/AuthContext": { AuthContext: { _default: { token: null, isGuest: true } } },
      "../hooks/useMessageUnread": { useMessageUnread: () => ({ unread: 0, refresh() {} }) },
    });
    const TabMod = load(path.join(SRC, "navigation/TabNavigator.js"));
    mount(React.createElement(TabMod.default, {}));
    const so = captured.nav?.screenOptions || {};
    ok(so.lazy === true && so.freezeOnBlur === true, "tabs are lazy and freeze when not on screen");
    const byName = (n) => captured.screens.find((x) => x.name === n);
    ok(captured.nav?.initialRouteName === "Home" && byName("Home")?.options?.lazy === false, "Home is the first tab and stays eager");
    ok(["Explore", "Social", "Campus", "Profile"].every((n) => byName(n) && byName(n).options?.lazy !== false), "Explore, Social, Campus, Profile are lazy");

    // the tour: every step's target is a tab bar icon, registered while the bar is mounted
    const state = { index: 0, routes: ["Home", "Explore", "Social", "Campus", "Profile"].map((name) => ({ name, key: name })) };
    mount(React.createElement(TabMod.CustomTabBar, { state, descriptors: {}, navigation: { navigate() {} } }));
    await tick(150);
    const { TOUR_STEPS } = loader({})(path.join(SRC, "engagement/tour/tourSteps.js"));
    const stepIds = TOUR_STEPS.map((x) => x.id);
    ok(stepIds.length === 5 && stepIds.every((id) => registered.includes(id)) && registered.includes("tab_bar_surface"), "every tour step (home, explore, social, campus, profile) targets a tab bar icon the bar registers", `steps ${stepIds} registered ${registered}`);
    const owners = require("child_process").execSync('git grep -l "registerTarget(" -- app/src', { cwd: APP }).toString().trim().split("\n");
    ok(owners.length === 1 && owners[0].endsWith("navigation/TabNavigator.js"), "no tour target lives inside a (now lazy) tab screen", owners.join(", "));
    const tourSrc = read("app/src/engagement/tour/TourProvider.js") + read("app/src/engagement/tour/TourOverlay.js");
    ok(!/navigate\(|jumpTo\(/.test(tourSrc) && /if \(!shouldAutoStart \|\| running \|\| !homeReady\) return/.test(tourSrc), "the tour never switches tabs and starts only on Home (bar mounted)");
  }

  // ═════ P1-3 header visibility without drawer re-renders ═════
  console.log("── P1-3 header visibility: renders only when it flips; header stays mounted");
  {
    const { React, mount, renders } = makeReact();
    const { useHeaderVisibility } = loader({ react: React })(path.join(SRC, "navigation/useHeaderVisibility.js"));
    let api = null;
    function Host() { api = useHeaderVisibility(["Brands", "OfferScreen", "Social"]); return null; }
    mount(React.createElement(Host));
    const base = renders.Host;
    const cbs = { t: api.onTabChange, r: api.onRouteChange };
    // a normal tap sequence: focus + nested state events for tabs that keep the header
    for (const tab of ["Explore", "Campus", "Profile", "Home", "Explore"]) { api.onTabChange(tab); api.onRouteChange(tab); api.onRouteChange(tab); }
    ok(renders.Host === base && api.hidden === false, "10 tab switches without Social: 0 extra renders", `${renders.Host - base}`);
    api.onTabChange("Social");
    ok(api.hidden === true && renders.Host === base + 1, "Social hides it: exactly 1 render");
    api.onRouteChange("FeedScreen"); api.onRouteChange("Messages");
    ok(renders.Host === base + 1, "moving inside Social: no render");
    api.onTabChange("Home"); api.onRouteChange("HomeStackMain");
    ok(api.hidden === false && renders.Host === base + 2, "back to Home: 1 render, header back");
    api.onRouteChange("Brands");
    ok(api.hidden === true, "a full-screen screen inside Home (Brands) hides it too");
    ok(cbs.t === api.onTabChange && cbs.r === api.onRouteChange, "callbacks keep their identity (the memoised TabNavigator does not re-render)");

    const drawer = read("app/src/navigation/DrawerNavigator.js");
    const block = drawer.slice(drawer.indexOf("const CustomHeaderMemo"), drawer.indexOf("// SKILLSHARE GATE"));
    ok(/const CustomHeaderMemo = memo\(CustomHeader\);/.test(block) && /const TabNavigatorMemo = memo\(TabNavigator\);/.test(block), "header and tab navigator are memoised");
    ok(/<View style=\{hidden \? HEADER_HIDDEN : null\}>\s*<CustomHeaderMemo navigation=\{navigation\} \/>/.test(block) && /HEADER_HIDDEN = \{ display: 'none' \}/.test(block) && !/!hide\w* && <CustomHeader/.test(block), "header stays mounted and is hidden with display: none (no remount when leaving Social)");
    ok(/<TabNavigatorMemo onTabChange=\{onTabChange\} onRouteChange=\{onRouteChange\} \/>/.test(block) && !/\{\.\.\.props\}/.test(block), "tab navigator gets only the two stable callbacks (not the route prop)");
    ok(!/setActiveTab|setDeepestRoute/.test(drawer), "no per-event state left in the drawer");
  }

  // ═════ P1-4 AuthContext value + header effect + pulse ═════
  console.log("── P1-4 AuthContext value stays the same object; one unread fetch; pulse stops");
  {
    const { React, mount } = makeReact();
    const store = new Map([["user", JSON.stringify({ _id: "u1", name: "Ali" })], ["token", "tok.u1"], ["tdc.installedAt", "1"]]);
    const AsyncStorage = {
      getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => store.set(k, String(v)),
      removeItem: async (k) => store.delete(k), multiRemove: async (ks) => ks.forEach((k) => store.delete(k)), multiGet: async (ks) => ks.map((k) => [k, store.get(k) ?? null]),
    };
    const calls = [];
    let nextCount = 2; // 2 at boot, then 3
    const api = { get: async (url) => { calls.push(url); return { data: url.includes("unread-count") ? { count: nextCount++ } : {} }; } };
    const load = loader({
      react: React, "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage },
      "../api/api": { __esModule: true, default: api, injectLogout() {}, setGuestMode() {}, notifyUserChanged() {} },
      "jwt-decode": { jwtDecode: () => ({ exp: Date.now() / 1000 + 3600, id: "u1" }) },
      "../hooks/useNotifications": { resetNotificationBaseline() {} },
      "../screens/OfferScreen": { clearClaimedRegistry() {} },
      "expo-application": { getInstallationTimeAsync: async () => new Date(1) },
    });
    const { default: AuthProvider } = load(path.join(SRC, "context/AuthContext.js"));
    const root = mount(React.createElement(AuthProvider, { children: null }));
    await tick(60);
    const v1 = root.tree?.props?.value;
    ok(v1 && v1.token === "tok.u1" && v1.user?._id === "u1", "provider loaded the saved session", JSON.stringify(v1 && { t: v1.token }));
    const callsAfterBoot = calls.length;
    root.rerender();
    const v2 = root.tree.props.value;
    ok(v2 === v1, "a provider render with nothing changed keeps the same value object (consumers skip)");
    const fn = v1.updateUnreadCount;
    await v1.updateUnreadCount();
    await tick();
    const v3 = root.tree.props.value;
    ok(v3 !== v1 && v3.unreadCount === 3, "a new unread count gives a new value (consumers see it)");
    ok(v3.updateUnreadCount === fn, "updateUnreadCount keeps its identity across renders");
    ok(calls.length - callsAfterBoot === 1 && calls.at(-1) === "/notification/unread-count", "one request per update", calls.join(", "));

    const drawer = read("app/src/navigation/DrawerNavigator.js");
    const hdr = drawer.slice(drawer.indexOf("function CustomHeader("), drawer.indexOf("const toggleSearch"));
    ok(/\}, \[token, isGuest, updateUnreadCount\]\);/.test(hdr), "header's unread effect depends on the (now stable) updateUnreadCount, token, isGuest");
    ok(/const showUnreadBadge = !isGuest && unreadCount > 0;/.test(hdr) && /if \(!showUnreadBadge\) return undefined;/.test(hdr) && /pulse\.stop\(\);/.test(hdr), "badge pulse runs only while the badge shows and is stopped on hide/unmount");
    const entrance = hdr.slice(hdr.indexOf("Animated.parallel(["), hdr.indexOf("const showUnreadBadge"));
    ok(!/Animated\.loop/.test(entrance), "no endless loop left in the entrance animation");
  }

  // ═════ P1-5 one shared message-unread count ═════
  console.log("── P1-5 shared unread count: no request on tab taps, one poll, Messages feeds it");
  {
    const { React, mount } = makeReact();
    const { rn } = makeRN();
    let appListener = null;
    rn.AppState = { currentState: "active", addEventListener: (ev, fn) => { appListener = fn; return { remove() { appListener = null; } }; } };
    const inbox = []; let reply = [{ unreadCount: 2 }, { unreadCount: 1 }]; let gate = null;
    const axios = { get: async (url, cfg) => { inbox.push(cfg?.headers?.Authorization); if (gate) await gate; return { data: reply }; } };
    const stub = () => null;
    const mocks = {
      react: React, "react-native": rn, axios,
      "@react-navigation/bottom-tabs": { createBottomTabNavigator: () => ({ Navigator: "Nav", Screen: "Screen" }) },
      "@expo/vector-icons": { Octicons: "Icon", MaterialCommunityIcons: "Icon", MaterialIcons: "Icon", Foundation: "Icon" },
      "react-native-safe-area-context": { SafeAreaProvider: "SAP", useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
      "./HomeStack": stub, "../screens/Social/Social": stub, "../screens/StudentDashboard": stub, "../screens/Explore": stub, "../screens/ProfileScreen": stub,
      "../guest": { accountOnly: (c) => c },
      "../engagement/tour/TourProvider": { useTour: () => ({ registerTarget() {} }) },
      "../context/AuthContext": { AuthContext: { _default: { token: "tok-A", isGuest: false } } },
    };
    const load = loader(mocks);
    const store = load(path.join(SRC, "hooks/useMessageUnread.js"));
    const { CustomTabBar } = load(path.join(SRC, "navigation/TabNavigator.js"));
    const routes = ["Home", "Explore", "Social", "Campus", "Profile"].map((name) => ({ name, key: name }));
    const el = (index) => React.createElement(CustomTabBar, { state: { index, routes }, descriptors: {}, navigation: { navigate() {} } });
    const bar = mount(el(0));
    await tick();
    const badge = () => has(bar.tree, "social, 3 unread");
    ok(inbox.length === 1 && badge(), "first use: one /inbox request, badge shows 3", `${inbox.length}`);
    for (const i of [1, 3, 4, 0, 1, 3, 0, 4, 1, 0]) bar.rerender(el(i));
    await tick();
    ok(inbox.length === 1, "10 tab taps: no extra /inbox request (was one per tap)", `${inbox.length}`);
    ok(store._test.timerRunning, "one 60 s poll runs while the badge is shown");
    // a second consumer (Social) shares it: no new request
    function SocialLike() { const { unread } = store.useMessageUnread("tok-A", false); return React.createElement("Text", null, String(unread)); }
    const soc = mount(React.createElement(SocialLike));
    await tick();
    ok(inbox.length === 1 && has(soc.tree, "3"), "Social's Messages badge reads the same number, no request");
    // Messages screen reports its own total
    store.setMessageUnread(0); await tick(); bar.rerender(el(0));
    ok(!badge() && has(soc.tree, "0") && inbox.length === 1, "reading messages in Messages clears every badge without a request");
    // back from background: one forced refresh
    reply = [{ unreadCount: 5 }];
    appListener?.("background"); appListener?.("active"); await tick(); bar.rerender(el(0));
    ok(inbox.length === 2 && has(bar.tree, "social, 5 unread"), "back to the app: one refresh", `${inbox.length}`);
    // two calls at once share one request; calls within 5 s are skipped
    await Promise.all([store.refreshMessageUnread({ force: true }), store.refreshMessageUnread({ force: true })]);
    await store.refreshMessageUnread();
    ok(inbox.length === 3, "concurrent refreshes share one request; a refresh within 5 s is skipped", `${inbox.length}`);
    // account switch while a request is in flight: the old answer is dropped
    let open; gate = new Promise((r) => { open = r; }); reply = [{ unreadCount: 9 }];
    const p = store.refreshMessageUnread({ force: true });
    function Other() { store.useMessageUnread("tok-B", false); return null; }
    mount(React.createElement(Other)); await tick();
    open(); gate = null; await p; await tick();
    ok(inbox.at(-1) === "Bearer tok-B" && store.useMessageUnread !== undefined, "switching account asks again with the new token");
    store._test.reset();
    ok(!store._test.timerRunning, "timers stop when nothing shows the number");
    const src = read("app/src/navigation/TabNavigator.js") + read("app/src/screens/Social/Social.js");
    ok(!/axios\.get\(/.test(src) && !/setInterval\(/.test(read("app/src/screens/Social/Social.js")), "tab bar and Social no longer request /inbox or poll themselves");
    ok(/setMessageUnread\(totalUnread\)/.test(read("app/src/screens/Social/MessageScreen.js")), "Messages screen feeds its total into the shared count");
  }

  // ═════ P2-6 Feed polls only while on screen; pushes still open fresh ═════
  console.log("── P2-6 Feed polls only while focused; focus (push, link, tab) refreshes");
  {
    const { React, mount } = makeReact();
    const { rn } = makeRN({ LayoutAnimation: { configureNext() {}, Presets: {} }, Keyboard: { dismiss() {}, addListener: () => ({ remove() {} }) }, Alert: { alert() {} } });
    let appListener = null;
    rn.AppState = { currentState: "active", addEventListener: (ev, fn) => { appListener = fn; return { remove() {} }; } };
    const feedCalls = [];
    const axios = { get: async (url) => { if (url.includes("/feed")) feedCalls.push(url); return { data: { posts: [], hasMore: false } }; }, post: async () => ({ data: {} }) };
    const nav = { focused: false };
    // timers: capture the 15 s poll instead of waiting
    const realSI = global.setInterval, realCI = global.clearInterval;
    const intervals = new Map(); let nextId = 1;
    global.setInterval = (fn, ms) => { if (ms >= 1000) { const id = nextId++; intervals.set(id, { fn, ms }); return id; } return realSI(fn, ms); };
    global.clearInterval = (id) => { if (intervals.has(id)) intervals.delete(id); else realCI(id); };
    const polls = () => [...intervals.values()].filter((x) => x.ms === 15000);
    try {
      const AuthContext = { _default: { user: { _id: "me" }, isGuest: false, token: "tok", unreadCount: 0, updateUnreadCount() {} } };
      const load = loader({
        react: React, "react-native": rn, axios,
        "../../ui/RemoteImage": "RemoteImage",
        "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
        "@react-navigation/native": {
          useIsFocused: () => nav.focused,
          useFocusEffect: (cb) => React.useEffect(() => (nav.focused ? cb() : undefined), [nav.focused, cb]),
          useRoute: () => ({ params: {} }), useNavigation: () => ({ setParams() {} }),
        },
        "../../engagement/hooks/useOpenFromParams": { useOpenFromParams() {} },
        "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon" },
        "../../ui/FlatGradient": { LinearGradient: "LinearGradient" },
        "../../ui/EmptyState": "EmptyState",
        "../../guest": { useGuestGate: () => ({ requireAccount() {} }), GuestLocked: "GuestLocked" },
        "../../ui/ScreenHeader": { __esModule: true, default: "ScreenHeader", HeaderIconButton: "HeaderIconButton" },
        "../../context/AuthContext": { AuthContext },
        "./PostCard": { __esModule: true, default: "PostCard", PostCardSkeleton: "PostCardSkeleton" },
        "./ConfessionScreen": "ConfessionScreen",
        "./StoriesSection": "StoriesSection",
      });
      const FeedScreen = load(path.join(SRC, "screens/Social/FeedScreen.js")).default;
      const el = () => React.createElement(FeedScreen, { navigation: { navigate() {}, goBack() {} } });
      const screen = mount(el());
      await tick(30);
      const afterMount = feedCalls.length;
      ok(polls().length === 0, "mounted but not on screen: no 15 s poll", `${polls().length}`);
      appListener?.("background"); appListener?.("active"); await tick(30);
      ok(feedCalls.length === afterMount, "back to the app while Social is not on screen: no feed request");
      // focus (tab tap, push into Social, deep link): fresh data at once + poll starts
      nav.focused = true; screen.rerender(el()); await tick(30);
      ok(feedCalls.length === afterMount + 1, "focusing the feed (tab, push, link) fetches fresh posts at once", `${feedCalls.length - afterMount}`);
      ok(polls().length === 1, "and the 15 s poll runs only now");
      { const realNow = Date.now; Date.now = () => realNow() + 15_000; try { polls()[0].fn(); await tick(30); } finally { Date.now = realNow; } }
      ok(feedCalls.length === afterMount + 2, "the poll fetches while on screen (15 s later)");
      // blur: poll stops
      nav.focused = false; screen.rerender(el()); await tick(30);
      ok(polls().length === 0, "leaving Social stops the poll");
      // a later push/link brings it back: fresh again (past the 3 s silent-fetch guard)
      const realNow = Date.now; Date.now = () => realNow() + 40_000;
      try { nav.focused = true; screen.rerender(el()); await tick(30); } finally { Date.now = realNow; }
      ok(feedCalls.length === afterMount + 3 && polls().length === 1, "coming back later (push into Social) fetches fresh posts again", `${feedCalls.length - afterMount}`);
    } finally {
      global.setInterval = realSI; global.clearInterval = realCI;
    }
    const pd = read("app/src/screens/Social/PostDetailScreen.js");
    ok(/useEffect\(\(\) => \{\s*if \(postId\)/.test(pd) && /\}, \[postId\]\);/.test(pd) && /if \(token && postId\) fetchPostDetails\(true\);/.test(pd), "a push to a post: PostDetailScreen loads it on open, on a new postId and on focus");
    const fs2 = read("app/src/screens/Social/FeedScreen.js");
    ok(/useOpenFromParams\('tab'/.test(fs2) && /useOpenFromParams\('postId'/.test(fs2), "a push to a confession (FeedScreen tab + postId) still opens that tab and post");
  }

  // ═════ P2-7 confessions: one 20 s poll, comments from the same answer, no refetch loop ═════
  console.log("── P2-7 confessions: one 20 s poll while on screen, comments reuse it");
  const runConfessions = async (file, ms = 400) => {
    const { React, mount } = makeReact();
    const { rn } = makeRN({ Share: { share: async () => ({}) }, Keyboard: { dismiss() {}, addListener: () => ({ remove() {} }) }, Alert: { alert() {} }, TouchableWithoutFeedback: "TWF" });
    const feedHits = [];
    const post = (id, comments) => ({ _id: id, text: "t " + id, visibility: "public", likes: 0, comments, createdAt: new Date().toISOString() });
    let comments = [{ _id: "c1", text: "first", createdAt: new Date().toISOString() }];
    global.fetch = async (url) => {
      if (url.includes("/confessions/feed")) feedHits.push(url);
      return { ok: true, json: async () => [post("p1", comments), post("p2", [])] };
    };
    const nav = { focused: true };
    const realSI = global.setInterval, realCI = global.clearInterval;
    const intervals = new Map(); let nextId = 1;
    global.setInterval = (fn, t) => { if (t >= 1000) { const id = nextId++; intervals.set(id, { fn, t }); return id; } return realSI(fn, t); };
    global.clearInterval = (id) => { if (intervals.has(id)) intervals.delete(id); else realCI(id); };
    try {
      const load = loader({
        react: React, "react-native": rn,
        "../../ui/RemoteImage": "RemoteImage",
        "@react-navigation/native": { useIsFocused: () => nav.focused, useFocusEffect: (cb) => React.useEffect(() => (nav.focused ? cb() : undefined), [nav.focused, cb]) },
        "@expo/vector-icons": { Ionicons: "Icon" }, "../../ui/FlatGradient": { LinearGradient: "LinearGradient" },
        "expo-image-picker": {}, "../../context/AuthContext": { AuthContext: { _default: { token: "tok", user: { _id: "me", university: { name: "U" } }, isGuest: false } } },
        "../../lib/tdcSounds": new Proxy({}, { get: () => () => {} }),
        "../../engagement/engagementBus": { engagementBus: { emit() {} }, ENGAGEMENT_EVENTS: {} },
        "../../analytics/metaEvents": { metaEvents: new Proxy({}, { get: () => () => {} }) },
      });
      const Screen = load(file).default;
      const el = () => React.createElement(Screen, { navigation: { navigate() {} } });
      const root = mount(el());
      await tick(ms);
      const settled = feedHits.length;
      const polls = [...intervals.values()].filter((x) => x.t >= 1000).map((x) => x.t);
      return { root, settled, polls, intervals, feedHits, setComments: (c) => { comments = c; }, nav, rerender: () => root.rerender(el()), restore: () => { global.setInterval = realSI; global.clearInterval = realCI; } };
    } catch (e) { global.setInterval = realSI; global.clearInterval = realCI; throw e; }
  };
  {
    const file = path.join(SRC, "screens/Social/ConfessionScreen.js");
    const r = await runConfessions(file);
    ok(r.settled <= 2, `opening confessions: the feed loads once or twice, then stops (${r.settled} requests in 400 ms)`, r.settled);
    ok(r.polls.length === 1 && r.polls[0] === 20000, "one poll, every 20 s (was 8 s, plus 6 s for comments)", JSON.stringify(r.polls));
    // the poll updates the open comments sheet from the same answer
    const src = read("app/src/screens/Social/ConfessionScreen.js").replace(/\r\n/g, "\n");
    ok(!/COMMENTS_POLL_INTERVAL/.test(src) && /The open comments sheet takes its post's comments from the same answer/.test(src) && /setSelectedPost\(prev => \{\s*if \(!prev \|\| prev\._id !== openFresh\._id\) return prev;/.test(src), "no second poll for comments; the open sheet is updated from the confessions poll");
    ok(/useEffect\(\(\) => \{\s*if \(!commentModalVisible \|\| !selectedPost\?\._id\) return;\s*fetchPostComments\(selectedPost\._id, true\);\s*\}, \[commentModalVisible/.test(src), "opening a comments sheet still loads fresh comments once");
    // off screen: the poll stops
    try {
      r.nav.focused = false; r.rerender(); await tick(30);
      ok([...r.intervals.values()].filter((x) => x.t >= 1000).length === 0, "leaving the confessions stops the poll");
    } finally { r.restore(); }

    // the old screen: whole feed every 8 s (and every 6 s more with comments open)
    const oldIn = path.join(SRC, "screens/Social/__old_ConfessionScreen.js");
    fs.writeFileSync(oldIn, require("child_process").execSync("git show 280205a:app/src/screens/Social/ConfessionScreen.js", { cwd: APP }).toString());
    let o; try { o = await runConfessions(oldIn); o.restore(); } finally { fs.unlinkSync(oldIn); }
    ok(o.polls.includes(8000), "before: the same model shows the old 8 s whole-feed poll", JSON.stringify(o.polls));
  }

  // ═════ P2-8 search text is encoded ═════
  console.log("── P2-8 search text encoded in feed and people search");
  {
    const src = read("app/src/screens/Social/FeedScreen.js");
    const feedTpl = src.match(/let url = `\$\{API_URL\}\/feed\?([^`]*)`/)[1];
    const usersTpl = src.match(/users\/search\?([^`]*)`/)[1];
    // evaluate the real templates with a nasty search text and parse them back
    const build = (tpl, vars) => new Function(...Object.keys(vars), "return `" + tpl + "`;")(...Object.values(vars));
    const nasty = "c&a #exam 50%+";
    const q1 = new URLSearchParams(build(feedTpl, { category: "Events & Fun", search: nasty }));
    ok(q1.get("search") === nasty && q1.get("category") === "Events & Fun" && q1.get("limit") === "10", "feed search: \"c&a #exam 50%+\" reaches the server intact", build(feedTpl, { category: "Events & Fun", search: nasty }));
    const q2 = new URLSearchParams(build(usersTpl, { query: nasty, page: 2 }));
    ok(q2.get("q") === nasty && q2.get("page") === "2", "people search: same", build(usersTpl, { query: nasty, page: 2 }));
    const before = new URLSearchParams(build(feedTpl.replace(/encodeURIComponent/g, ""), { category: "All", search: nasty }));
    ok(before.get("search") !== nasty, "without encoding the same text arrives broken (what students got before)", before.get("search"));
  }

  // ═════ P3-9 story delete failure is handled ═════
  console.log("── P3-9 failed story delete: message, viewer stays, no unhandled rejection");
  {
    // run the real onPress of the "Delete" button, cut out of StoriesSection, with a failing request
    const src = read("app/src/screens/Social/StoriesSection.js").replace(/\r\n/g, "\n");
    const m = src.match(/\{ text: "Delete", style: "destructive", onPress: (async \(\) => \{[\s\S]*?\n {6}\})\}/);
    ok(!!m, "found the Delete button handler");
    if (m) {
      const calls = { alert: [], closed: 0, refetched: 0 };
      const make = (axiosDelete) => new Function("axios", "API_URL", "storyId", "config", "Alert", "closeViewer", "fetchStories", `return ${m[1]};`)(
        { delete: axiosDelete }, "https://x/api/social", "s1", {}, { alert: (...a) => calls.alert.push(a) }, () => calls.closed++, () => calls.refetched++);
      let unhandled = null; const onUnhandled = (e) => { unhandled = e; }; process.on("unhandledRejection", onUnhandled);
      await make(async () => { throw new Error("Network Error"); })(); await tick();
      process.off("unhandledRejection", onUnhandled);
      ok(!unhandled && calls.alert.length === 1 && calls.closed === 0 && calls.refetched === 0, "offline: one clear message, the viewer stays open, nothing thrown", JSON.stringify(calls));
      await make(async () => ({ data: {} }))();
      ok(calls.closed === 1 && calls.refetched === 1 && calls.alert.length === 1, "success: viewer closes and stories reload, as before");
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("FAIL  (stopped)", e?.stack || e); process.exit(1); });
