// Mounts the real MetaEventsHost (no consent sheet since 2026-11-15: on by default, opt-out in
// Settings → privacy) with a small hook runtime; the module behind it is a fake the test controls.
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

// fake module state
const meta = { available: true, consent: null, user: undefined, refreshed: 0, set: [], appStates: [], tracked: 0, redemptionChecks: 0, listeners: new Set() };
let appStateListener = null;
const platform = { OS: "android" };
const held = new Set();
const fakeMeta = {
  metaAvailable: () => meta.available,
  getConsent: () => meta.consent,
  setConsent: async (v) => { meta.set.push(v); meta.consent = v ? "granted" : "denied"; meta.listeners.forEach((f) => f()); return true; },
  setMetaUser: async (u) => { meta.user = u; },
  refreshFlags: async () => { meta.refreshed++; },
  subscribe: (fn) => { meta.listeners.add(fn); return () => meta.listeners.delete(fn); },
  onAppState: async (st) => { meta.appStates.push(st); },
  requestTracking: async () => { meta.tracked++; return "granted"; },
};
const MOCKS = {
  react: React,
  "react-native": { View: "View", Text: "Text", Platform: platform, StyleSheet: { create: (x) => x }, AppState: { currentState: "active", addEventListener: (ev, fn) => { appStateListener = fn; return { remove() {} }; } } },
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

(async () => {
  auth = { user: { _id: "u1" }, token: "t", isGuest: false };
  let m = mount(React.createElement(Host));
  ok(meta.user === "u1" && meta.appStates[0] === "active", "follows the signed-in student; app state forwarded at launch (switch re-read, 5-minute check)", JSON.stringify(meta.appStates));
  ok(m.tree == null, "renders nothing: no consent sheet");
  await tick();
  ok(meta.redemptionChecks === 1, "signed in → redemptions checked once (tdc_discount_redeemed)", meta.redemptionChecks);
  appStateListener("background"); await tick();
  ok(meta.redemptionChecks === 1, "app to the background → no redemption check");
  appStateListener("active"); await tick();
  ok(meta.redemptionChecks === 2 && meta.appStates.slice(-2).join() === "background,active", "back to the front → switch re-read, then redemptions checked", JSON.stringify(meta.appStates));
  await tick(4200);
  ok(meta.tracked === 0 && meta.set.length === 0, "Android: no tracking prompt and nothing saved on its own");
  ok(!held.size, "the onboarding tour is never held");

  // iPhone: Apple's prompt a few seconds after sign-in, unless switched off or Meta is off
  platform.OS = "ios";
  meta.consent = null; meta.tracked = 0;
  m = mount(React.createElement(Host)); await tick(1000);
  ok(meta.tracked === 0, "iPhone: not on top of the first screen's load");
  await tick(3300);
  ok(meta.tracked === 1, "iPhone: Apple's tracking prompt requested once, about 4 s after sign-in", meta.tracked);
  meta.consent = "denied"; meta.tracked = 0;
  m = mount(React.createElement(Host)); await tick(4300);
  ok(meta.tracked === 0, "iPhone: switched off in settings → no prompt");
  meta.consent = null; meta.available = false; meta.tracked = 0;
  m = mount(React.createElement(Host)); await tick(4300);
  ok(meta.tracked === 0, "iPhone: Meta off (build or server switch) → no prompt");
  meta.available = true;
  auth = { user: null, token: null, isGuest: true }; meta.tracked = 0;
  m = mount(React.createElement(Host)); await tick(4300);
  ok(meta.tracked === 0 && meta.user === null, "iPhone: guest → no student, no prompt");
  auth = { user: { _id: "u1" }, token: "t", isGuest: false };

  // Settings → privacy switch
  let probe = null;
  const Probe = () => { probe = mod.exports.useMetaConsent(); return null; };
  meta.consent = null; meta.tracked = 0; meta.set = [];
  mount(React.createElement(Probe));
  ok(probe.allowed === true, "never touched → the switch shows on");
  await probe.setAllowed(false); await tick(700);
  ok(meta.set.join() === "false" && meta.tracked === 0, "iPhone Settings: switching off → saved, no prompt");
  mount(React.createElement(Probe));
  ok(probe.allowed === false, "…and the switch shows off");
  await probe.setAllowed(true); await tick(700);
  ok(meta.set.join() === "false,true" && meta.tracked === 1, "iPhone Settings: switching on → saved, then the prompt (if never answered)");
  platform.OS = "android";

  const settings = fs.readFileSync(path.join(SRC, "screens/Social/SettingItem.js"), "utf8");
  ok(/const meta = useMetaConsent\(\);/.test(settings) && /\{meta\.available && \(\s*<Group title="privacy">/.test(settings) && /value=\{meta\.allowed\}/.test(settings) && /onToggle=\{\(\) => meta\.setAllowed\(!meta\.allowed\)\}/.test(settings), "Settings → privacy: 'ad measurement (Meta)' switch bound to the same choice (shown only while Meta is on)");
  ok(/switch off to stop sharing anything with Meta/.test(settings), "the switch says what turning it off does");
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.stack); process.exit(1); });
