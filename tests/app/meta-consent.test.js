// Mounts the real MetaEventsHost (consent sheet) with a small hook runtime; the module behind
// it is a fake whose state the test controls.
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
const meta = { available: true, consent: null, user: undefined, refreshed: 0, set: [], appStates: [], tracked: 0, listeners: new Set() };
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
  "react-native": { View: "View", Text: "Text", Platform: platform, StyleSheet: { create: (x) => x }, AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) } },
  "../context/AuthContext": { AuthContext: {} },
  "../ui": { Sheet: "Sheet", Button: "Button" },
  "../theme/tokens": { color: { ink: "#111", yellow: "#F9C349" }, font: { body: "b" }, MAX_FONT_SCALE: 1.3 },
  "../engagement/tour/tourGate": { holdTour: (k) => held.add(k), releaseTour: (k) => held.delete(k) },
  "./metaEvents": fakeMeta,
};
const file = path.join(SRC, "analytics/MetaConsent.js");
const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [[reqApp.resolve("@babel/plugin-transform-react-jsx"), { runtime: "classic" }], reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
const mod = new Module(file); mod.filename = file; mod.require = (id) => { if (id in MOCKS) return MOCKS[id]; throw new Error("unexpected " + id); }; mod._compile(code, file);
const Host = mod.exports.default;
const sheet = (t) => all(t, (n) => n.type === "Sheet")[0];
const btn = (t, title) => all(t, (n) => n.type === "Button" && n.props.title === title)[0];

(async () => {
  auth = { user: { _id: "u1" }, token: "t", isGuest: false };
  let m = mount(React.createElement(Host));
  ok(meta.user === "u1" && meta.appStates[0] === "active", "follows the signed-in student; app state forwarded at launch (switch re-read, 5-minute check)", JSON.stringify(meta.appStates));
  ok(sheet(m.tree).props.visible === false, "not shown immediately (waits a moment after sign-in)");
  await tick(1600); m.rerender();
  const sh = sheet(m.tree);
  ok(sh.props.visible === true && sh.props.title === "help us measure our ads", "then asks once: 'help us measure our ads'");
  const body = text(sh);
  ok(/advertising ID/.test(body) && /never shared/.test(body) && /settings → privacy/.test(body) && /nothing is sent unless you allow it/.test(body), "plain words: what is shared, what never is, where to change it", body);
  ok(!/Apple will ask/.test(body), "Android: no mention of the iPhone prompt");
  ok(held.has("meta-consent"), "the onboarding tour waits while the sheet is up");
  await btn(m.tree, "allow").props.onPress(); await tick(); m.rerender();
  ok(meta.set.join() === "true" && sheet(m.tree).props.visible === false && !held.has("meta-consent"), "allow → consent saved, sheet closes, tour released");
  await tick(700);
  ok(meta.tracked === 0, "Android: allow never shows a tracking prompt");

  meta.consent = null; meta.set = [];
  m = mount(React.createElement(Host)); await tick(1600); m.rerender();
  await btn(m.tree, "not now").props.onPress(); m.rerender();
  ok(meta.set.join() === "false" && sheet(m.tree).props.visible === false, "not now → saved as no");
  meta.consent = null; meta.set = [];
  m = mount(React.createElement(Host)); await tick(1600); m.rerender();
  await sheet(m.tree).props.onClose(); m.rerender();
  ok(meta.set.join() === "false", "closing the sheet counts as 'not now' (strict: no is the default)");

  meta.consent = "granted";
  m = mount(React.createElement(Host)); await tick(1600); m.rerender();
  ok(sheet(m.tree).props.visible === false, "already decided → not asked again");
  meta.consent = null; meta.available = false;
  m = mount(React.createElement(Host)); await tick(1600); m.rerender();
  ok(sheet(m.tree).props.visible === false, "Meta off (build or server switch) → never asks");
  meta.available = true;
  auth = { user: null, token: null, isGuest: true };
  m = mount(React.createElement(Host)); await tick(1600); m.rerender();
  ok(sheet(m.tree).props.visible === false && meta.user === null, "guest → no student, never asks");

  // iPhone: Apple's tracking prompt only after "allow"
  platform.OS = "ios";
  auth = { user: { _id: "u1" }, token: "t", isGuest: false };
  meta.consent = null; meta.set = []; meta.tracked = 0;
  m = mount(React.createElement(Host)); await tick(1600); m.rerender();
  ok(/Apple will ask whether tdc may track/.test(text(sheet(m.tree))) && /only shared if you say yes there too/.test(text(sheet(m.tree))), "iPhone: the sheet says Apple's prompt follows 'allow'", text(sheet(m.tree)));
  await btn(m.tree, "not now").props.onPress(); await tick(700); m.rerender();
  ok(meta.set.join() === "false" && meta.tracked === 0, "iPhone: 'not now' → no tracking prompt, ever");
  await sheet(m.tree).props.onClose(); await tick(700);
  ok(meta.tracked === 0, "iPhone: closing the sheet → no tracking prompt");
  meta.consent = null; meta.set = [];
  m = mount(React.createElement(Host)); await tick(1600); m.rerender();
  await btn(m.tree, "allow").props.onPress(); m.rerender();
  ok(meta.set.join() === "true" && meta.tracked === 0 && sheet(m.tree).props.visible === false, "iPhone: allow → consent saved first, sheet closes, prompt not yet on top of it");
  await tick(700);
  ok(meta.tracked === 1, "iPhone: …then Apple's tracking prompt is requested once");
  // Settings → privacy uses the same path
  let probe = null;
  const Probe = () => { probe = mod.exports.useMetaConsent(); return null; };
  meta.tracked = 0; meta.set = [];
  mount(React.createElement(Probe));
  await probe.setAllowed(false); await tick(700);
  ok(meta.set.join() === "false" && meta.tracked === 0, "iPhone Settings: switching off → no prompt");
  await probe.setAllowed(true); await tick(700);
  ok(meta.set.join() === "false,true" && meta.tracked === 1, "iPhone Settings: switching on → consent, then the prompt (if never answered)");
  platform.OS = "android";

  // Settings → privacy switch is the same choice
  const settings = fs.readFileSync(path.join(SRC, "screens/Social/SettingItem.js"), "utf8");
  ok(/const meta = useMetaConsent\(\);/.test(settings) && /\{meta\.available && \(\s*<Group title="privacy">/.test(settings) && /value=\{meta\.allowed\}/.test(settings) && /onToggle=\{\(\) => meta\.setAllowed\(!meta\.allowed\)\}/.test(settings), "Settings → privacy: 'ad measurement (Meta)' switch bound to the same consent (shown only while Meta is on)");
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.stack); process.exit(1); });
