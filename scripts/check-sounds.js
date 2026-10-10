// scripts/check-sounds.js
// Checks the in-app sound kit without a device:  node scripts/check-sounds.js
//
// Runs the real app code (sound kit, AppAlert, shared ui pieces, back hook, copy helper)
// in Node against fakes: expo-av, expo-haptics, expo-clipboard and a small stand-in for
// react / react-native (enough hooks to mount AppAlert and press the shared pieces).
// Each event must play exactly one sound:
//   popup open / popup close (button, backdrop, Android back) · tap · back · copy
// It cannot check that the phone actually makes a sound (see the note at the end).

const fs = require("fs");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "app/src");
let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}`);
  if (!ok) failed++;
};
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

// fake clock: AppAlert skips its open sound < 250 ms after another sound
let skew = 0;
const realNow = Date.now;
Date.now = () => realNow() + skew;
const quiet = () => { skew += 1000; };

// ── fakes ─────────────────────────────────────────────────────
const log = []; // ["load"|"play"|"unload", file, volume]
let breakNext = 0;
const fakeAv = {
  Audio: {
    setAudioModeAsync: async () => {},
    Sound: {
      createAsync: async (source) => {
        log.push(["load", source.asset]);
        let vol = 1;
        return {
          sound: {
            setVolumeAsync: async (v) => { vol = v; },
            setRateAsync: async () => {},
            replayAsync: async () => {
              if (breakNext > 0) { breakNext--; throw new Error("Player does not exist."); }
              log.push(["play", source.asset, vol]);
            },
            stopAsync: async () => {},
            unloadAsync: async () => { log.push(["unload", source.asset]); },
          },
        };
      },
    },
  },
};
const fakeHaptics = new Proxy({}, { get: (_, k) => (typeof k === "string" && k.endsWith("Async") ? async () => {} : {}) });
let clipboard = null;
let clipboardFails = false;
const fakeClipboard = {
  setStringAsync: async (t) => { if (clipboardFails) throw new Error("no clipboard"); clipboard = t; return true; },
};

// tiny hook runtime: components are called directly, host elements are plain objects
const hooks = new Map(); // path -> [slots]
let cur = null; // { path, i }
let pendingEffects = [];
const roots = new Map(); // root id -> re-render (each mounted tree re-renders itself)
const slot = (init) => {
  const list = hooks.get(cur.path) || hooks.set(cur.path, []).get(cur.path);
  const i = cur.i++;
  if (!(i in list)) list[i] = init();
  return [list, i];
};
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }),
  Fragment: "Fragment",
  useState(init) {
    const [list, i] = slot(() => ({ v: typeof init === "function" ? init() : init }));
    const owner = cur.path.split("/")[0];
    const set = (v) => { list[i].v = typeof v === "function" ? v(list[i].v) : v; roots.get(owner)?.(); };
    return [list[i].v, set];
  },
  useRef(init) { const [list, i] = slot(() => ({ current: init })); return list[i]; },
  useCallback(fn) { return fn; },
  useMemo(fn) { return fn(); },
  useContext() { return {}; },
  useEffect(fn, deps) {
    const [list, i] = slot(() => ({ deps: undefined, cleanup: null }));
    const s = list[i];
    const changed = !deps || !s.deps || deps.some((d, k) => !Object.is(d, s.deps[k]));
    if (changed) pendingEffects.push(() => { if (s.cleanup) s.cleanup(); s.deps = deps; s.cleanup = fn() || null; });
  },
};
function expand(el, p) {
  if (el == null || typeof el !== "object") return el;
  if (Array.isArray(el)) return el.map((c, k) => expand(c, `${p}.${k}`));
  if (typeof el.type === "function") {
    const prev = cur;
    cur = { path: p + "/" + (el.type.name || "C"), i: 0 };
    const out = el.type(el.props);
    cur = prev;
    return expand(out, p + "/" + (el.type.name || "C"));
  }
  return { type: el.type, props: { ...el.props, children: expand(el.props.children, p + "." + el.type) } };
}
function mount(element) {
  let tree = null;
  const root = "root" + Math.random();
  const render = () => {
    tree = expand(element, root);
    const effects = pendingEffects; pendingEffects = [];
    effects.forEach((f) => f());
  };
  roots.set(root, render);
  render();
  return { get tree() { return tree; } };
}
function find(tree, pred, out = []) {
  if (tree == null || typeof tree !== "object") return out;
  if (Array.isArray(tree)) { tree.forEach((t) => find(t, pred, out)); return out; }
  if (pred(tree)) out.push(tree);
  find(tree.props?.children, pred, out);
  return out;
}
// press like RN does: disabled pressables don't call onPress
const press = (el) => { if (!el.props.disabled) el.props.onPress?.({}); };

const backListeners = [];
const animDone = () => ({ start: (cb) => cb && cb({ finished: true }) });
class AnimValue { constructor(v) { this.v = v; } setValue(v) { this.v = v; } }
const fakeRN = {
  Alert: { alert: () => {} },
  Modal: "Modal", View: "View", Text: "Text", ScrollView: "ScrollView", Pressable: "Pressable",
  TouchableOpacity: "TouchableOpacity", ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (s) => s, absoluteFill: {}, hairlineWidth: 1 },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  Platform: { OS: "android", select: (o) => o.android ?? o.default },
  Animated: { Value: AnimValue, View: "Animated.View", timing: animDone, spring: animDone, parallel: animDone },
  BackHandler: {
    addEventListener(name, fn) { const sub = { name, fn }; backListeners.push(sub); return { remove: () => backListeners.splice(backListeners.indexOf(sub), 1) }; },
  },
};
// Android: newest listener first, stop at the first true
const hardwareBack = () => { for (let k = backListeners.length - 1; k >= 0; k--) if (backListeners[k].fn() === true) return true; return false; };
const navigation = { goBack: () => { navigation.backs++; }, canGoBack: () => true, backs: 0 };

const MOCKS = {
  "expo-av": fakeAv,
  "expo-haptics": fakeHaptics,
  "expo-clipboard": fakeClipboard,
  react: React,
  "react-native": fakeRN,
  "@expo/vector-icons": new Proxy({}, { get: (_, k) => (k === "__esModule" ? false : String(k)) }),
  "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
  "@react-navigation/native": { useNavigation: () => navigation },
};
const origLoad = Module._load;
Module._load = function (req, parent, isMain) {
  if (req in MOCKS) return MOCKS[req];
  if (/tour\/tourGate$/.test(req)) return { holdTour() {}, releaseTour() {} };
  return origLoad.call(this, req, parent, isMain);
};
Module._extensions[".wav"] = (m, file) => {
  if (!fs.existsSync(file)) throw new Error("missing sound file " + file);
  m.exports = { asset: path.basename(file) };
};
const origJs = Module._extensions[".js"];
Module._extensions[".js"] = (m, file) => {
  if (!file.startsWith(SRC)) return origJs(m, file);
  const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), {
    filename: file, babelrc: false, configFile: false,
    plugins: [["@babel/plugin-transform-react-jsx", { runtime: "classic" }], "@babel/plugin-transform-modules-commonjs"],
  });
  m._compile(code, file);
};
const origWarn = console.warn;
const warnings = [];
console.warn = (...a) => warnings.push(a.join(" "));

const played = () => log.filter((e) => e[0] === "play").map((e) => e[1].replace(/^tdc_|\.wav$/g, ""));
const reset = () => { log.length = 0; };
const expectSounds = async (label, fn, want) => {
  quiet(); reset();
  await fn();
  await tick(20);
  const got = played();
  check(JSON.stringify(got) === JSON.stringify(want), `${label} → ${want.length ? want.join(", ") : "no sound"}${JSON.stringify(got) === JSON.stringify(want) ? "" : `  (got: ${got.join(", ") || "none"})`}`);
};
const req = (rel) => require(path.join(SRC, rel));

// ── 1. the sound helper ───────────────────────────────────────
async function helperChecks() {
  const sm = req("lib/soundManager.js");
  const ts = req("lib/tdcSounds.js");
  const ids = Object.keys(sm.SOUNDS);
  check(ids.length > 0 && ids.every((id) => sm.SOUNDS[id]?.asset === `${id}.wav`), `all ${ids.length} sound files found`);

  for (const [fn, file] of [["soundPopupOpen", "popup_open"], ["soundPopupClose", "popup_close"], ["soundTap", "tap"], ["soundCopy", "copy"]]) {
    reset();
    await ts[fn]();
    check(played().join() === file && log.length === 2, `${fn}() loads and plays once`);
    check(log.find((e) => e[0] === "play")?.[2] === 0.5, `${fn}() plays at low volume (0.5)`);
  }

  // broken cached player: dropped, reloaded, played once; error logged with console.warn
  reset(); warnings.length = 0; breakNext = 1;
  await ts.soundTap();
  check(played().join() === "tap", "broken cached player: reloaded and played once");
  check(warnings.some((w) => w.includes("play error")), "play errors are logged with console.warn (kept in release)");
  reset(); breakNext = 2;
  let threw = false;
  try { await ts.soundTap(); } catch { threw = true; }
  check(!threw && played().length === 0, "broken twice: no crash, no sound");
  reset(); await ts.soundTap();
  check(played().join() === "tap", "and the next tap works again");

  // user's mute flag: every sound path goes through playSound, which honours it
  sm.setSoundEnabled(false);
  await expectSounds("muted: tap", () => ts.soundTap(), []);
  sm.setSoundEnabled(true);
}

// ── 2. popup ──────────────────────────────────────────────────
async function popupChecks() {
  const { AppAlertHost, installAppAlert } = req("components/AppAlert.js");
  installAppAlert();
  const host = mount(React.createElement(AppAlertHost));
  const Alert = fakeRN.Alert;
  const modal = () => find(host.tree, (e) => e.type === "Modal")[0];
  const buttons = () => find(host.tree, (e) => e.type === "TouchableOpacity");
  const backdrop = () => find(host.tree, (e) => e.type === "Pressable")[0];

  await expectSounds("popup open", () => Alert.alert("Saved", "done"), ["popup_open"]);
  await expectSounds("popup close (button)", () => press(buttons()[0]), ["popup_close"]);
  check(!modal(), "popup closed");

  await expectSounds("popup open (two buttons)", () => Alert.alert("Delete?", "sure", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive" }]), ["popup_open"]);
  await expectSounds("popup close (Android back)", () => modal().props.onRequestClose(), ["popup_close"]);

  Alert.alert("Note", "tap outside");
  await tick(20);
  await expectSounds("popup close (backdrop)", () => press(backdrop()), ["popup_close"]);

  // a toast that now uses the popup: same open / close
  await expectSounds("toast popup open", () => Alert.alert("Submitted!", "Your application has been submitted."), ["popup_open"]);
  await expectSounds("toast popup close", () => press(buttons()[0]), ["popup_close"]);

  // double press on a button: still one close
  Alert.alert("Once", "x");
  await tick(20);
  await expectSounds("popup double press → one close", () => { const b = buttons()[0]; press(b); press(b); }, ["popup_close"]);

  // error sound right before the popup: no second sound
  const ts = req("lib/tdcSounds.js");
  await expectSounds("error sound + error popup → one sound", async () => { ts.soundError(); Alert.alert("Error", "x"); }, ["error"]);
  press(buttons()[0]);
  await tick(20);
  return { buttons, modal };
}

// ── 3. taps ───────────────────────────────────────────────────
async function tapChecks() {
  const Button = req("ui/Button.js").default;
  const PressScale = req("ui/PressScale.js").default;
  const ListRow = req("ui/ListRow.js").default;
  const Chip = req("ui/Chip.js").default;
  const { HeaderIconButton } = req("ui/ScreenHeader.js");
  const pressFirst = (el) => press(find(mount(el).tree, (e) => e.type === "Pressable")[0]);
  let pressed = 0;
  const onPress = () => { pressed++; };

  for (const [name, el] of [
    ["Button", React.createElement(Button, { title: "go", onPress })],
    ["PressScale", React.createElement(PressScale, { onPress })],
    ["ListRow", React.createElement(ListRow, { title: "row", onPress })],
    ["Chip", React.createElement(Chip, { label: "chip", onPress })],
    ["HeaderIconButton", React.createElement(HeaderIconButton, { icon: "x", label: "x", onPress })],
  ]) {
    pressed = 0;
    await expectSounds(`tap: ${name}`, () => pressFirst(el), ["tap"]);
    check(pressed === 1, `tap: ${name} still runs its onPress once`);
  }
  pressed = 0;
  await expectSounds("tap: disabled Button", () => pressFirst(React.createElement(Button, { title: "no", onPress, disabled: true })), []);
  await expectSounds("tap: loading Button", () => pressFirst(React.createElement(Button, { title: "no", onPress, loading: true })), []);
  check(pressed === 0, "disabled / loading Button: onPress not called");
  await expectSounds("tap: sound={false}", () => pressFirst(React.createElement(Button, { title: "q", onPress, sound: false })), []);

  // tab bar items (TabNavigator needs the whole navigator, so its handlers are run from source)
  const tab = fs.readFileSync(path.join(SRC, "navigation/TabNavigator.js"), "utf8").replace(/\r\n/g, "\n");
  const ts = req("lib/tdcSounds.js");
  const sideTab = tab.match(/style=\{styles\.tabItem\}\s*\n\s*onPress=\{(\(\) => \{[\s\S]*?\n {8}\})\}/);
  check(!!sideTab, "tab bar: side tab press handler found");
  if (sideTab) {
    let navigated = 0;
    // eslint-disable-next-line no-new-func
    const fn = new Function("soundTap", "onPress", `return (${sideTab[1]});`)(ts.soundTap, () => { navigated++; });
    await expectSounds("tap: tab bar item", () => fn(), ["tap"]);
    check(navigated === 1, "tab bar item still navigates once");
  }
  const social = tab.match(/const handleSocialPress = (\(\) => \{[\s\S]*?\n {2}\});/);
  check(!!social, "tab bar: social button handler found");
  if (social) {
    // eslint-disable-next-line no-new-func
    const fn = new Function("soundTap", "navigation", `return (${social[1]});`)(ts.soundTap, { navigate() {} });
    await expectSounds("tap: tab bar social button", () => fn(), ["tap"]);
  }
}

// ── 4. back ───────────────────────────────────────────────────
async function backChecks() {
  const ScreenHeader = req("ui/ScreenHeader.js").default;
  navigation.backs = 0;
  const header = mount(React.createElement(ScreenHeader, { title: "t" }));
  await expectSounds("back: ScreenHeader back button", () => press(find(header.tree, (e) => e.type === "Pressable")[0]), ["tap"]);
  check(navigation.backs === 1, "ScreenHeader back still goes back once");
  let custom = 0;
  const header2 = mount(React.createElement(ScreenHeader, { title: "t", onBack: () => { custom++; } }));
  await expectSounds("back: ScreenHeader with onBack", () => press(find(header2.tree, (e) => e.type === "Pressable")[0]), ["tap"]);
  check(custom === 1, "custom onBack runs once");

  const { installBackSound } = req("lib/backSound.js");
  installBackSound();
  installBackSound(); // twice: still one wrapper
  const navSub = fakeRN.BackHandler.addEventListener("hardwareBackPress", () => true); // React Navigation went back
  await expectSounds("back: hardware back, navigation goes back", () => hardwareBack(), ["tap"]);
  const screenSub = fakeRN.BackHandler.addEventListener("hardwareBackPress", () => true); // screen closes its sheet
  await expectSounds("back: hardware back, screen closes a sheet (one sound, not two)", () => hardwareBack(), ["tap"]);
  screenSub.remove(); navSub.remove();
  const noneSub = fakeRN.BackHandler.addEventListener("hardwareBackPress", () => false);
  await expectSounds("back: hardware back does nothing (app exits)", () => hardwareBack(), []);
  noneSub.remove();

  const Sheet = req("ui/Sheet.js").default;
  let closed = 0;
  const sheet = mount(React.createElement(Sheet, { visible: true, onClose: () => { closed++; }, title: "s" }));
  await expectSounds("back: Android back on a Sheet", () => find(sheet.tree, (e) => e.type === "Modal")[0].props.onRequestClose(), ["tap"]);
  check(closed === 1, "Sheet closes once");
}

// ── 5. copy ───────────────────────────────────────────────────
async function copyChecks(popup) {
  const { copyToClipboard } = req("utils/clipboard.js");
  let ok;
  await expectSounds("copy (with popup)", async () => { ok = await copyToClipboard("TDC-1", { title: "Copied!", message: "Promo code copied" }); }, ["copy"]);
  check(ok === true && clipboard === "TDC-1", "copy: text is on the clipboard");
  check(!!popup.modal(), "copy: the copied popup is shown");
  await expectSounds("copy popup close (silent, copy was the one sound)", () => press(popup.buttons()[0]), []);
  await expectSounds("copy (no popup)", async () => { await copyToClipboard("hello"); }, ["copy"]);
  check(!popup.modal(), "copy without popup: no popup");
  clipboardFails = true;
  await expectSounds("copy fails", async () => { ok = await copyToClipboard("x"); }, []);
  clipboardFails = false;
  check(ok === false, "failed copy resolves false");

  // every copy action in the app goes through the helper
  const raw = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(".js") && !p.endsWith(path.join("utils", "clipboard.js"))) {
        const s = fs.readFileSync(p, "utf8");
        if (/Clipboard\.|setStringAsync|\bsetString\(/.test(s)) raw.push(path.relative(SRC, p));
      }
    }
  })(SRC);
  check(raw.length === 0, `no copy outside copyToClipboard${raw.length ? ": " + raw.join(", ") : ""}`);
}

// ── 6. no double sound left in screens ────────────────────────
function duplicateChecks() {
  const offenders = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(".js")) {
        const s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
        const rel = path.relative(SRC, p);
        if (/onBack=\{\(\) => \{[^}]*soundTap\(\)/.test(s)) offenders.push(rel + " (ScreenHeader onBack)");
        if (/style: ['"]cancel['"], onPress: \(\) => soundTap\(\)/.test(s)) offenders.push(rel + " (popup cancel button)");
        if (/<(Button|PressScale|ListRow|Chip|HeaderIconButton)\b[^>]*?onPress=\{\(\) => \{\s*soundTap\(\)/.test(s)) offenders.push(rel + " (shared piece)");
      }
    }
  })(SRC);
  check(offenders.length === 0, `no screen plays its own tap on a press that already sounds${offenders.length ? ": " + offenders.join(", ") : ""}`);
}

(async () => {
  await helperChecks();
  const popup = await popupChecks();
  await tapChecks();
  await backChecks();
  await copyChecks(popup);
  duplicateChecks();
  console.warn = origWarn;
  Date.now = realNow;
  console.log(failed ? `\n${failed} check(s) failed` : "\nall sound checks passed");
  console.log("not checked here (needs a phone): real audio output, media volume, audio focus, background/resume, how it feels.");
  process.exit(failed ? 1 : 0);
})();
