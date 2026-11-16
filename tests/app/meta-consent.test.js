// Mounts the real MetaEventsHost (the ads pre-screen) with a small hook runtime; the module behind it is a fake whose
// state the test controls. The pre-screen shows once, only after onboarding and value; Apple's prompt only after
// "continue"; never at first launch.
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

// hook runtime
const hooks = new Map(); let cur = null, pendingEffects = []; const roots = new Map(); let auth = {};
const slot = (init) => { const list = hooks.get(cur.path) || hooks.set(cur.path, []).get(cur.path); const i = cur.i++; if (!(i in list)) list[i] = init(); return [list, i]; };
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }),
  Fragment: "Fragment",
  useState(init) { const [l, i] = slot(() => ({ v: typeof init === "function" ? init() : init })); const owner = cur.path.split("/")[0]; return [l[i].v, (v) => { l[i].v = typeof v === "function" ? v(l[i].v) : v; roots.get(owner)?.(); }]; },
  useContext() { return auth; },
  useEffect(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, cleanup: null })); const s = l[i]; if (!deps || !s.deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) pendingEffects.push(() => { if (s.cleanup) s.cleanup(); s.deps = deps; s.cleanup = fn() || null; }); },
};
React.default = React;
function expand(el, p) {
  if (el == null || typeof el !== "object") return el;
  if (Array.isArray(el)) return el.map((c, k) => expand(c, `${p}.${k}`));
  if (typeof el.type === "function") { const prev = cur; const np = p + "/" + (el.type.name || "C"); cur = { path: np, i: 0 }; const out = el.type(el.props); cur = prev; return expand(out, np); }
  return { type: el.type, props: { ...el.props, children: expand(el.props.children, p + "." + el.type) } };
}
function mount(element) { let tree = null; const root = "root" + Math.random(); const render = () => { tree = expand(element, root); const fx = pendingEffects; pendingEffects = []; fx.forEach((f) => f()); }; roots.set(root, render); render(); return { get tree() { return tree; }, rerender: render }; }
const all = (t, pred, out = []) => { if (t == null || typeof t !== "object") return out; if (Array.isArray(t)) { t.forEach((x) => all(x, pred, out)); return out; } if (pred(t)) out.push(t); all(t.props?.children, pred, out); return out; };
const text = (t) => { const parts = []; (function w(x) { if (x == null || typeof x === "boolean") return; if (typeof x === "string" || typeof x === "number") return void parts.push(String(x)); if (Array.isArray(x)) return x.forEach(w); w(x.props?.children); })(t); return parts.join(" "); };

// fake module state (the real rules for the pre-screen: shouldShowPrescreen, mirrored from metaEvents.js)
const meta = { available: true, measurement: true, ids: null, value: false, user: undefined, matching: null, refreshed: 0, set: [], idsSet: [], appStates: [], tracked: 0, redemptionChecks: 0, listeners: new Set() };
let appStateListener = null;
const platform = { OS: "android" };
const held = new Set();
const store = new Map([["@tdc_tour_device_v1_done", "pending"]]); // a fresh install: the tour isn't finished yet
const emit = () => meta.listeners.forEach((f) => f());
const fakeMeta = {
  metaAvailable: () => meta.available,
  measurementAllowed: () => meta.measurement,
  setConsent: async (v) => { meta.set.push(v); meta.measurement = !!v; emit(); return true; },
  getIdsChoice: () => meta.ids,
  setIdsChoice: async (v) => { meta.idsSet.push(v); meta.ids = v ? "allowed" : "declined"; emit(); return true; },
  identifiersOn: () => meta.ids === "allowed",
  trackingStatus: () => null,
  shouldShowPrescreen: ({ onboardingDone }) => meta.available && meta.measurement && !!meta.user && meta.ids == null && meta.value && onboardingDone === true,
  setMetaUser: async (u, matching) => { meta.user = u; meta.matching = matching; },
  refreshFlags: async () => { meta.refreshed++; },
  subscribe: (fn) => { meta.listeners.add(fn); return () => meta.listeners.delete(fn); },
  onAppState: async (st) => { meta.appStates.push(st); },
  requestTracking: async () => { meta.tracked++; return "granted"; },
};
const MOCKS = {
  react: React,
  "react-native": { View: "View", Text: "Text", Platform: platform, StyleSheet: { create: (x) => x }, AppState: { currentState: "active", addEventListener: (ev, fn) => { appStateListener = fn; return { remove() {} }; } } },
  "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async (k) => (store.has(k) ? store.get(k) : null) } },
  "../context/AuthContext": { AuthContext: {} },
  "../ui": { Sheet: "Sheet", Button: "Button" },
  "../theme/tokens": { color: { ink: "#111", yellow: "#F9C349" }, font: { body: "b" }, MAX_FONT_SCALE: 1.3 },
  "../engagement/tour/tourGate": { holdTour: (k) => held.add(k), releaseTour: (k) => held.delete(k) },
  "./metaEvents": fakeMeta,
  "./metaRedemptions": { checkRedemptions: async () => { meta.redemptionChecks++; return 0; } },
};
const file = path.join(SRC, "analytics/MetaConsent.js");
const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [[reqApp.resolve("@babel/plugin-transform-react-jsx"), { runtime: "classic" }], reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
const mod = new Module(file); mod.filename = file; mod.require = (id) => { if (id in MOCKS) return MOCKS[id]; throw new Error("unexpected " + id); }; mod._compile(code, file);
const Host = mod.exports.default;
const sheet = (t) => all(t, (n) => n.type === "Sheet")[0];
const btn = (t, title) => all(t, (n) => n.type === "Button" && n.props.title === title)[0];

(async () => {
  const PRE = "allow tdc to show you better student deals in ads";
  const settle = async (m, ms = 1600) => { await tick(ms); m.rerender(); await tick(30); m.rerender(); };
  auth = { user: { _id: "u1", email: "sana@student.example", phone: "03001234567" }, token: "t", isGuest: false };
  let m = mount(React.createElement(Host));
  ok(meta.user === "u1" && meta.appStates[0] === "active", "follows the signed-in student; app state forwarded at launch (switch re-read, 5-minute check)", JSON.stringify(meta.appStates));
  ok(meta.matching?.email === "sana@student.example", "the student's email / phone are handed over for advanced matching (used only if identifiers are allowed)");
  await settle(m);
  ok(meta.redemptionChecks === 1, "signed in → redemptions checked once (tdc_discount_redeemed)", meta.redemptionChecks);
  appStateListener("background"); await tick();
  appStateListener("active"); await tick();
  ok(meta.redemptionChecks === 2 && meta.appStates.slice(-2).join() === "background,active", "back to the front → switch re-read, then redemptions checked");

  console.log("── never at first launch: only after onboarding AND value");
  ok(sheet(m.tree).props.visible === false, "first launch (tour not finished, no value yet) → no pre-screen");
  meta.value = true; emit(); await settle(m);
  ok(sheet(m.tree).props.visible === false, "value seen but onboarding still running → no pre-screen");
  meta.value = false; store.set("@tdc_tour_device_v1_done", "1"); m = mount(React.createElement(Host)); await settle(m);
  ok(sheet(m.tree).props.visible === false, "onboarding finished but no value yet (no job opened, offer claimed or discount redeemed) → no pre-screen");
  meta.value = true; emit(); await settle(m);
  const sh = sheet(m.tree);
  ok(sh.props.visible === true && sh.props.title === PRE, `onboarding finished + value seen → the pre-screen: "${PRE}"`, sh.props.title);
  ok(!!btn(m.tree, "continue") && !!btn(m.tree, "not now") && all(m.tree, (n) => n.type === "Button").length === 2, "two plain choices: continue / not now (no reward, nothing else)");
  ok(!/Apple|iPhone will ask/.test(text(sh)), "Android: no mention of the iPhone prompt");
  ok(held.has("meta-prescreen"), "the onboarding tour waits while it's up (it never covers the tour)");
  ok(meta.tracked === 0, "showing the pre-screen asks Apple nothing");

  console.log("── Android: continue / not now");
  await btn(m.tree, "continue").props.onPress(); await settle(m, 700);
  ok(meta.idsSet.join() === "true" && sheet(m.tree).props.visible === false && !held.has("meta-prescreen"), "continue → identifiers allowed, closes, tour released");
  ok(meta.tracked === 0, "Android: no tracking prompt");
  m = mount(React.createElement(Host)); await settle(m);
  ok(sheet(m.tree).props.visible === false, "answered → never shown again");
  meta.ids = null; meta.idsSet = []; m = mount(React.createElement(Host)); await settle(m);
  btn(m.tree, "not now").props.onPress(); await settle(m, 700);
  ok(meta.idsSet.join() === "false" && sheet(m.tree).props.visible === false, "not now → saved as declined, closes");
  meta.ids = null; meta.idsSet = []; m = mount(React.createElement(Host)); await settle(m);
  sheet(m.tree).props.onClose();
  ok(meta.idsSet.join() === "false", "closing it counts as 'not now' (identifiers stay off)");
  meta.ids = null; meta.idsSet = [];
  meta.measurement = false; m = mount(React.createElement(Host)); await settle(m);
  ok(sheet(m.tree).props.visible === false, "ad measurement switched off → never shown");
  meta.measurement = true; meta.available = false; m = mount(React.createElement(Host)); await settle(m);
  ok(sheet(m.tree).props.visible === false, "Meta off (build or server switch) → never shown");
  meta.available = true; auth = { user: null, token: null, isGuest: true }; m = mount(React.createElement(Host)); await settle(m);
  ok(sheet(m.tree).props.visible === false && meta.user === null, "guest → no student, never shown");

  console.log("── iPhone: Apple's prompt only after continue");
  platform.OS = "ios";
  auth = { user: { _id: "u1" }, token: "t", isGuest: false };
  meta.ids = null; meta.idsSet = []; meta.tracked = 0;
  m = mount(React.createElement(Host)); await settle(m);
  ok(/your iPhone will ask/.test(text(sheet(m.tree))), "iPhone: one short line says the iPhone will ask next");
  btn(m.tree, "not now").props.onPress(); await tick(700);
  ok(meta.idsSet.join() === "false" && meta.tracked === 0, "iPhone: not now → no Apple prompt, ever");
  meta.ids = null; meta.idsSet = []; m = mount(React.createElement(Host)); await settle(m);
  sheet(m.tree).props.onClose(); await tick(700);
  ok(meta.tracked === 0, "iPhone: closing it → no Apple prompt");
  meta.ids = null; meta.idsSet = []; m = mount(React.createElement(Host)); await settle(m);
  await btn(m.tree, "continue").props.onPress(); m.rerender();
  ok(meta.idsSet.join() === "true" && meta.tracked === 0 && sheet(m.tree).props.visible === false, "iPhone: continue → choice saved, closes, Apple's prompt not yet (the sheet closes first)");
  await tick(700);
  ok(meta.tracked === 1, "…then Apple's prompt is requested once");

  console.log("── Settings → privacy");
  let probe = null;
  const Probe = () => { probe = mod.exports.useMetaConsent(); return null; };
  meta.tracked = 0; meta.set = []; meta.idsSet = [];
  mount(React.createElement(Probe));
  await probe.setAllowed(false); await tick(50);
  ok(meta.set.join() === "false" && meta.tracked === 0, "ad measurement off → saved; no prompt");
  await probe.setIdsAllowed(true); await tick(700);
  ok(meta.idsSet.join() === "true" && meta.tracked === 1, "iPhone: 'ads with your details' on → identifiers allowed, then Apple's prompt (if never answered)");
  await probe.setIdsAllowed(false);
  ok(meta.idsSet.join() === "true,false", "…switched off → identifiers declined");
  platform.OS = "android";
  const settings = fs.readFileSync(path.join(SRC, "screens/Social/SettingItem.js"), "utf8");
  ok(/label="ad measurement \(Meta\)"/.test(settings) && /value=\{meta\.allowed\}/.test(settings) && /label="ads with your details"/.test(settings) && /value=\{meta\.idsChoice === "allowed"\}/.test(settings) && /meta\.setIdsAllowed\(/.test(settings), "Settings → privacy: 'ad measurement (Meta)' and 'ads with your details'");
  ok(/iPhone settings → privacy → tracking/.test(settings), "…when iOS doesn't allow tracking, it says where to change it");
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.stack); process.exit(1); });
