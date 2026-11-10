// Brand loyalty in the app (FLAG_LOYALTY_V2): the flags gate, the loyalty card on the brand screen,
// and the visits list in My discounts.
//   node tests/app/loyalty.test.js
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

(async () => {
  console.log("── the flags gate (api/loyaltyApi.js)");
  {
    const store = { token: null, isGuest: null };
    const calls = [];
    let flagOn = true;
    const api = {
      get: async (url) => {
        calls.push(url);
        if (url === "/app/flags/me") return { data: { loyaltyV2: flagOn } };
        if (url.startsWith("/loyalty/brands/")) return { data: { success: true, data: { enabled: true, program: {}, progress: {} } } };
        if (url === "/loyalty/me/credits") return { data: { success: true, data: { enabled: true, credits: [{ redemptionId: "r1", status: "credited" }] } } };
        throw new Error("unexpected " + url);
      },
    };
    const load = loader({ "@react-native-async-storage/async-storage": { getItem: async (k) => store[k] }, "./api": api });
    const L = load(path.join(SRC, "api/loyaltyApi.js"));
    ok((await L.getBrandLoyalty("b1")).enabled === false && calls.length === 0, "signed out: no card, no request");
    store.token = "tok-guest"; store.isGuest = "true";
    ok((await L.getBrandLoyalty("b1")).enabled === false && calls.length === 0, "guest: no card, no request");
    store.isGuest = "false"; store.token = "tok-a";
    const a = await L.getBrandLoyalty("b1");
    const b = await L.getMyLoyaltyCredits();
    ok(a.enabled === true && b.length === 1 && calls.filter((c) => c === "/app/flags/me").length === 1, "pilot student: card data and visits; /flags/me asked once for both", calls.join());
    store.token = "tok-b"; flagOn = false; calls.length = 0;
    ok((await L.getBrandLoyalty("b1")).enabled === false && calls.join() === "/app/flags/me", "another account outside the pilot: flags asked again, no loyalty request", calls.join());
  }

  const { React, mount } = makeReact();
  const { rn } = makeRN();
  const nav = { "@react-navigation/native": { useFocusEffect() {} } };
  const icons = { "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon" } };

  console.log("── the loyalty card (components/LoyaltyCard.js)");
  {
    const program = { tiers: [{ name: "Member", minVisit: 1, maxVisit: 5, discountPct: 15 }, { name: "Regular", minVisit: 6, maxVisit: null, discountPct: 25 }], maxVisitsPerDay: 1, resetMonths: 12, terms: "dine-in only." };
    let reply = { enabled: true, program, progress: { visits: 2, nextVisitNumber: 3, currentTier: { name: "Member", discountPct: 15 }, nextTier: { name: "Regular", minVisit: 6, discountPct: 25 }, visitsBeforeNextTier: 3 } };
    const asked = [];
    const load = loader({ react: React, "react-native": rn, ...nav, ...icons, "../api/loyaltyApi": { getBrandLoyalty: async (id) => { asked.push(id); return reply; } } });
    const LoyaltyCard = load(path.join(SRC, "components/LoyaltyCard.js")).default;
    let root = mount(React.createElement(LoyaltyCard, { brandId: "b1", refreshKey: 0 }));
    await tick(30); root.rerender();
    let t = textOf(root.tree);
    ok(asked[0] === "b1", "asks for this brand");
    ok(t.includes("2verified visits") && t.includes("15%on your next visit"), "2 visits, 15% on the next visit", t);
    ok(t.includes("3 more visits, then 25% from visit 6 (regular)."), "progress: 3 more visits, then 25% from visit 6", t);
    ok(t.includes("visits 1–5: 15%") && t.includes("visit 6 onward: 25%"), "the tiers", t);
    ok(t.includes("claiming or showing your qr doesn't count") && t.includes("1 visit a day counts") && t.includes("visits count for 12 months") && t.includes("dine-in only."), "the terms: confirmed bills only, daily limit, expiry, brand terms", t);
    reply = { ...reply, progress: { visits: 5, nextVisitNumber: 6, currentTier: { name: "Regular", discountPct: 25 }, nextTier: null, visitsBeforeNextTier: null } };
    root = mount(React.createElement(LoyaltyCard, { brandId: "b2", refreshKey: 0 }));
    await tick(30); root.rerender();
    t = textOf(root.tree);
    ok(t.includes("25%on your next visit") && t.includes("you're on the top tier."), "after 5 visits: 25% on visit 6, top tier", t);
    reply = { enabled: false, reason: "not-enabled" };
    root = mount(React.createElement(LoyaltyCard, { brandId: "b3", refreshKey: 0 }));
    await tick(30); root.rerender();
    ok(textOf(root.tree) === "", "outside the pilot: nothing rendered", textOf(root.tree));
    // reward mode (a stamp card): progress null, stamps given
    const stamps = { mode: "reward", stamps: 2, needed: 5, visitsToReward: 3, reward: { visitsNeeded: 5, kind: "item", label: "a free coffee", maxPerMonth: 2 }, available: null, limitReached: null };
    reply = { enabled: true, program: { ...program, mode: "reward" }, progress: null, stamps };
    root = mount(React.createElement(LoyaltyCard, { brandId: "b4", refreshKey: 0 }));
    await tick(30); root.rerender();
    t = textOf(root.tree);
    ok(t.includes("2 of 5 visits") && t.includes("stamp card") && t.includes("3 more visits to a free coffee."), "stamp card: 2 of 5 visits, 3 more visits to a free coffee", t);
    ok(t.includes("5 verified visits = a free coffee") && t.includes("after you use the reward the card starts again") && t.includes("up to 2 rewards a month") && !t.includes("on your next visit"), "stamp card terms (no tier %)", t);
    const stampDots = (n) => { let c = 0; const walk = (x) => { if (!x || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(walk); if (Array.isArray(x.props?.style) && x.props.style[1]) c++; walk(x.props?.children); }; walk(n); return c; };
    ok(stampDots(root.tree) === 2, "2 stamps filled", stampDots(root.tree));
    reply = { ...reply, stamps: { ...stamps, stamps: 5, visitsToReward: 0, available: { id: "rw1", label: "a free coffee" } } };
    root = mount(React.createElement(LoyaltyCard, { brandId: "b5", refreshKey: 0 }));
    await tick(30); root.rerender();
    t = textOf(root.tree);
    ok(t.includes("5 of 5 visits") && t.includes("reward waiting") && t.includes("your reward is waiting: a free coffee. show your qr on your next visit."), "a full card: the reward is waiting", t);
    reply = { ...reply, stamps: { ...stamps, stamps: 5, visitsToReward: 0, limitReached: "monthly-limit" } };
    root = mount(React.createElement(LoyaltyCard, { brandId: "b6", refreshKey: 0 }));
    await tick(30); root.rerender();
    ok(textOf(root.tree).includes("you've had this month's rewards"), "monthly limit reached: says so", textOf(root.tree));
    const card = read("app/src/components/LoyaltyCard.js");
    ok(/accessibilityLabel=\{`loyalty stamp card: \$\{have\} of \$\{n\} visits/.test(card), "the stamp card reads out \"loyalty stamp card: 2 of 5 visits…\" for screen readers");
  }

  console.log("── the visits list (components/LoyaltyVisits.js)");
  {
    let credits = [
      { redemptionId: "r3", brand: "b1", status: "credited", visitNumber: 3, discountPct: 15, at: "2026-11-03T10:00:00Z" },
      { redemptionId: "r2", brand: "b1", status: "not-counted", visitNumber: null, discountPct: 15, at: "2026-11-02T12:00:00Z" },
      { redemptionId: "r1", brand: "b9", status: "reversed", visitNumber: 2, discountPct: 15, at: "2026-11-01T10:00:00Z" },
    ];
    const load = loader({ react: React, "react-native": rn, ...nav, ...icons, "../api/loyaltyApi": { getMyLoyaltyCredits: async () => credits } });
    const LoyaltyVisits = load(path.join(SRC, "components/LoyaltyVisits.js")).default;
    let root = mount(React.createElement(LoyaltyVisits, { brandNames: { b1: "Alpha Cafe" }, refreshKey: false }));
    await tick(30); root.rerender();
    const t = textOf(root.tree);
    ok(t.includes("visit credited") && t.includes("visit 3 · 15% off"), "a counted bill: visit credited, visit 3, 15%", t);
    ok(t.includes("didn't count") && t.includes("one visit a day counts"), "a second bill the same day: didn't count", t);
    ok(t.includes("reversed") && t.includes("a brand"), "a refunded visit: reversed (unknown brand name: 'a brand')", t);
    ok(t.includes("alpha cafe"), "brand names from the claimed offers", t);
    // a brand with a stamp card gets its progress line; a tiers brand doesn't
    const load2 = loader({ react: React, "react-native": rn, ...nav, ...icons, "../api/loyaltyApi": { getMyLoyaltyCredits: async () => credits, getBrandLoyalty: async (b) => (b === "b1" ? { enabled: true, program: {}, progress: null, stamps: { stamps: 4, needed: 5, visitsToReward: 1, reward: { label: "a free coffee" }, available: null } } : { enabled: true, program: {}, progress: {} }) } });
    const LoyaltyVisits2 = load2(path.join(SRC, "components/LoyaltyVisits.js")).default;
    root = mount(React.createElement(LoyaltyVisits2, { brandNames: { b1: "Alpha Cafe" }, refreshKey: false }));
    await tick(40); root.rerender();
    const t2 = textOf(root.tree);
    ok(t2.includes("4 of 5 stamps") && t2.includes("1 to a free coffee") && (t2.match(/stamps/g) || []).length === 1, "My discounts: the stamp card's progress for that brand only", t2);
    credits = [];
    root = mount(React.createElement(LoyaltyVisits, { brandNames: {}, refreshKey: false }));
    await tick(30); root.rerender();
    ok(textOf(root.tree) === "", "no confirmed bills yet (or outside the pilot): nothing rendered", textOf(root.tree));
  }

  console.log("── placement: the existing Discounts area, no new tab");
  {
    const offer = read("app/src/screens/OfferScreen.js");
    ok(offer.includes("<LoyaltyCard brandId={initialBrand?._id} refreshKey={claimVersion} />"), "the brand's offer screen shows the loyalty card");
    ok(read("app/src/screens/MyDiscountScreen.js").includes("<LoyaltyVisits brandNames={loyaltyBrandNames}"), "My discounts shows the visits list");
    ok(!/loyalty/i.test(read("app/src/navigation/TabNavigator.js")), "no loyalty tab in the tab bar");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
