// tests/app/harness.js
// Shared helpers for app tests (not a suite: run-all.js only runs *.test.js).
// The hook runtime, Babel loader and react-native fakes are the same as in
// tests/app/surprise-box.test.js / responsiveness.test.js, plus unmount() (runs effect
// cleanups and stops re-renders, like a screen leaving).
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SRC = path.join(APP, "app/src");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8");

function counter() {
  let failed = 0, passed = 0;
  const ok = (c, l, x = "") => {
    c ? passed++ : failed++;
    console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 400) : ""}`);
  };
  const done = () => {
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  };
  return { ok, done, get failed() { return failed; } };
}

function makeReact() {
  const hooks = new Map(); let cur = null; let pending = []; const roots = new Map(); const renders = {};
  const slot = (init) => { const l = hooks.get(cur.path) || hooks.set(cur.path, []).get(cur.path); const i = cur.i++; if (!(i in l)) l[i] = init(); return [l, i]; };
  const contexts = new Map();
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }),
    Fragment: "Fragment",
    // a Provider hands its value to everything rendered after it (and keeps it on the tree as props.value)
    createContext: (dflt) => {
      const c = { _default: dflt };
      c.Provider = function Provider(props) { contexts.set(c, props.value); return { type: "Provider", props: { value: props.value, children: props.children } }; };
      return c;
    },
    useState(init) {
      const [l, i] = slot(() => ({ v: typeof init === "function" ? init() : init }));
      const root = cur.path.split("/")[0];
      return [l[i].v, (v) => { const nv = typeof v === "function" ? v(l[i].v) : v; if (Object.is(nv, l[i].v)) return; l[i].v = nv; roots.get(root)?.(); }];
    },
    useReducer(reducer, init) { const [v, set] = React.useState(init); return [v, (a) => set((s) => reducer(s, a))]; },
    useRef(init) { const [l, i] = slot(() => ({ current: init })); return l[i]; },
    useMemo(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, v: undefined })); const s = l[i]; if (!s.deps || !deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) { s.v = fn(); s.deps = deps; } return s.v; },
    useCallback(fn, deps) { return React.useMemo(() => fn, deps); },
    useContext(ctx) { return contexts.has(ctx) ? contexts.get(ctx) : ctx?._default ?? {}; },
    useEffect(fn, deps) {
      const [l, i] = slot(() => ({ fx: true, deps: undefined, cleanup: null }));
      const s = l[i];
      if (!deps || !s.deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) pending.push(() => { if (s.cleanup) s.cleanup(); s.deps = deps; s.cleanup = fn() || null; });
    },
    memo: (c) => c,
    forwardRef: (c) => { const f = (props) => c(props, props.ref); Object.defineProperty(f, "name", { value: c.name || "ForwardRef" }); return f; },
    useImperativeHandle(ref, fn) { if (ref && typeof ref === "object") ref.current = fn(); },
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
    return {
      get tree() { return tree; },
      rerender: (el) => { if (el) element = el; render(); },
      unmount: () => {
        roots.delete(root);
        for (const [p, list] of hooks) {
          if (!p.startsWith(root)) continue;
          list.forEach((s) => { if (s && s.fx && s.cleanup) { s.cleanup(); s.cleanup = null; } });
          hooks.delete(p);
        }
      },
    };
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
      if (/\.(png|jpe?g|gif|webp|wav|mp3|ttf|otf)$/i.test(id)) return { uri: id }; // assets
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

const flat = (st) => (Array.isArray(st) ? Object.assign({}, ...st.flat(Infinity).filter(Boolean)) : st || {});
function makeRN(extra = {}) {
  class Value { constructor(v) { this.v = v; } setValue(v) { this.v = v; } interpolate() { return this; } stopAnimation() {} }
  const anim = () => ({ start: (cb) => cb && cb({ finished: true }), stop() {} });
  const alerts = [];
  const rn = {
    View: "View", Text: "Text", Pressable: "Pressable", TouchableOpacity: "TouchableOpacity", Image: "Image", ScrollView: "ScrollView", FlatList: "FlatList", Modal: "Modal", TextInput: "TextInput", ActivityIndicator: "ActivityIndicator", RefreshControl: "RefreshControl", KeyboardAvoidingView: "KeyboardAvoidingView", StatusBar: "StatusBar", Switch: "Switch",
    StyleSheet: { create: (x) => x, flatten: flat, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    Platform: { OS: "ios", select: (o) => o.ios ?? o.default },
    AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) },
    Keyboard: { dismiss() {}, addListener: () => ({ remove() {} }) },
    BackHandler: { addEventListener: () => ({ remove() {} }) },
    Alert: { alert: (title, text, buttons) => alerts.push({ title, text, buttons }) },
    Animated: { Value, View: "Animated.View", Text: "Animated.Text", ScrollView: "Animated.ScrollView", spring: anim, timing: anim, parallel: anim, sequence: anim, loop: () => ({ start() {}, stop() {} }), event: () => () => {}, multiply: () => new Value(1) },
    Easing: { bezier: () => (x) => x, out: (f) => f, in: (f) => f, inOut: (f) => f, cubic: (x) => x, ease: (x) => x, linear: (x) => x },
    ...extra,
  };
  return { rn, alerts };
}

const textOf = (n) => (n == null || n === false ? "" : typeof n === "string" || typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(textOf).join("") : textOf(n.props?.children));
const find = (n, pred) => { let hit = null; (function w(x) { if (!x || hit || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(w); if (pred(x)) { hit = x; return; } w(x.props?.children); })(n); return hit; };
const findAll = (n, pred) => { const out = []; (function w(x) { if (!x || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(w); if (pred(x)) out.push(x); w(x.props?.children); })(n); return out; };
const byLabel = (tree, label) => find(tree, (x) => x.props?.accessibilityLabel === label);

/** a promise you resolve / reject from the test */
function gate() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

module.exports = { APP, SRC, reqApp, tick, read, counter, makeReact, loader, makeRN, textOf, find, findAll, byLabel, gate };
