// scripts/check-sounds.js
// Checks the in-app sound kit without a device:  node scripts/check-sounds.js
//
// 1. Runs the real soundManager / tdcSounds against a fake expo-av and checks that each
//    helper loads + plays its .wav once, and that a broken cached player is reloaded.
// 2. Runs the real handlers for the four events (popup open, button press, back, copy)
//    with stubs and checks each one calls its sound helper exactly once.
// It cannot check that the phone actually makes a sound (see the notes at the end).

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

// ── 1. sound helper ───────────────────────────────────────────
const log = [];
let breakNext = 0; // how many next replayAsync calls should throw
const fakeAv = {
  Audio: {
    setAudioModeAsync: async () => {},
    Sound: {
      createAsync: async (source) => {
        log.push(["load", source.asset]);
        return {
          sound: {
            setVolumeAsync: async () => {},
            setRateAsync: async () => {},
            replayAsync: async () => {
              if (breakNext > 0) { breakNext--; throw new Error("Player does not exist."); }
              log.push(["play", source.asset]);
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

const origLoad = Module._load;
Module._load = function (req, parent, isMain) {
  if (req === "expo-av") return fakeAv;
  if (req === "expo-haptics") return fakeHaptics;
  return origLoad.call(this, req, parent, isMain);
};
Module._extensions[".wav"] = (m, file) => {
  if (!fs.existsSync(file)) throw new Error("missing sound file " + file);
  m.exports = { asset: path.basename(file) };
};
const origJs = Module._extensions[".js"];
Module._extensions[".js"] = (m, file) => {
  if (!file.startsWith(path.join(SRC, "lib"))) return origJs(m, file);
  const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), {
    filename: file, babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  m._compile(code, file);
};

const origWarn = console.warn;
const warnings = [];
console.warn = (...a) => warnings.push(a.join(" "));

async function helperChecks() {
  const sm = require(path.join(SRC, "lib/soundManager.js"));
  const ts = require(path.join(SRC, "lib/tdcSounds.js"));

  // every registered sound resolves to a real file (require() above throws if not)
  const ids = Object.keys(sm.SOUNDS);
  check(ids.length > 0 && ids.every((id) => sm.SOUNDS[id]?.asset === `${id}.wav`), `all ${ids.length} sound files found`);

  const plays = (f) => log.filter(([k, a]) => k === "play" && a === f).length;
  for (const [fn, file] of [
    ["soundPopupOpen", "tdc_popup_open.wav"],
    ["soundTap", "tdc_tap.wav"],
    ["soundCopy", "tdc_copy.wav"],
  ]) {
    log.length = 0;
    await ts[fn]();
    check(plays(file) === 1 && log.length === 2, `${fn}() loads and plays ${file} once`);
    log.length = 0;
    await ts[fn]();
    check(plays(file) === 1 && log.length === 1, `${fn}() again: plays once from cache`);
  }

  // a cached player that stopped working is dropped and reloaded (before: silent forever)
  log.length = 0; warnings.length = 0;
  breakNext = 1;
  await ts.soundTap();
  check(plays("tdc_tap.wav") === 1, "broken cached player: reloaded and played once");
  check(warnings.some((w) => w.includes("play error")), "the play error is logged with console.warn (kept in release)");
  log.length = 0;
  await ts.soundTap();
  check(plays("tdc_tap.wav") === 1 && log.length === 1, "next tap plays from the fresh cache");

  // still broken after the retry: no throw, nothing left cached
  log.length = 0;
  breakNext = 2;
  let threw = false;
  try { await ts.soundTap(); } catch { threw = true; }
  check(!threw && plays("tdc_tap.wav") === 0, "broken twice: no crash, no sound");
  log.length = 0;
  await ts.soundTap();
  check(plays("tdc_tap.wav") === 1, "and the next tap works again");
}

// ── 2. the four events ────────────────────────────────────────
// A stub scope: any name resolves to a callable, chainable stub; calls are counted.
function makeScope(values) {
  const calls = {};
  const stub = (name) => new Proxy(function () {}, {
    get: (_, k) => (k === Symbol.toPrimitive ? () => name : typeof k === "symbol" ? undefined : stub(`${name}.${k}`)),
    apply: () => { calls[name] = (calls[name] || 0) + 1; return stub(`${name}()`); },
  });
  const scope = new Proxy({}, {
    has: (_, k) => k !== "undefined" && !(k in globalThis && !(k in values) && /^[A-Z]/.test(k) && k !== "Animated" && k !== "Haptics" && k !== "Clipboard" && k !== "Alert"),
    get: (_, k) => (k === Symbol.unscopables ? undefined : k in values ? values[k] : stub(String(k))),
  });
  return { scope, calls };
}
// run a function's source text inside the stub scope (sloppy mode so `with` works)
function runSrc(src, values) {
  const { scope, calls } = makeScope(values);
  const fn = new Function("scope", `with (scope) { return (${src}); }`)(scope);
  return { fn, calls };
}
const soundCalls = (calls) => Object.fromEntries(Object.entries(calls).filter(([k]) => /^(sound[A-Z]\w*|playSound)$/.test(k)));

// source text of the function/arrow that starts at `start` (balanced braces/parens)
function grab(s, start) {
  let i = start, d = 0, q = null, seenBody = false;
  for (; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === "\\") { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{" || c === "(") { d++; seenBody = true; }
    else if (c === "}" || c === ")") { d--; if (seenBody && d === 0 && c === "}") return s.slice(start, i + 1); }
  }
  throw new Error("unbalanced at " + start);
}
const read = (f) => fs.readFileSync(path.join(SRC, f), "utf8").replace(/\r\n/g, "\n");

async function eventChecks() {
  // popup: NotificationModal open effect
  const nm = read("components/NotificationModal.js");
  const effAt = nm.indexOf("useEffect(() => {\n    if (visible) {");
  check(effAt > 0, "popup: NotificationModal open effect found");
  if (effAt > 0) {
    const src = grab(nm, effAt + "useEffect(".length);
    const { fn, calls } = runSrc(src, { visible: true, isScreen: false, mounted: false });
    fn();
    const sc = soundCalls(calls);
    check(JSON.stringify(sc) === '{"soundPopupOpen":1}', `popup open → soundPopupOpen once ${JSON.stringify(sc)}`);
  }

  const md = read("screens/MyDiscountScreen.js");
  // press: "browse brands" button
  const pressAt = md.indexOf("onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); soundTap(); navigation.navigate('Brands'); }}");
  check(pressAt > 0, "press: browse-brands button found");
  if (pressAt > 0) {
    const { fn, calls } = runSrc(grab(md, pressAt + "onPress={".length), {});
    fn();
    const sc = soundCalls(calls);
    check(JSON.stringify(sc) === '{"soundTap":1}', `button press → soundTap once ${JSON.stringify(sc)}`);
  }
  // back: header back button
  const backAt = md.indexOf("onBack={() => { soundTap(); navigation.goBack(); }}");
  check(backAt > 0, "back: header back button found");
  if (backAt > 0) {
    const { fn, calls } = runSrc(grab(md, backAt + "onBack={".length), {});
    fn();
    const sc = soundCalls(calls);
    check(JSON.stringify(sc) === '{"soundTap":1}' && calls["navigation.goBack"] === 1, `back → soundTap once, then goBack ${JSON.stringify(sc)}`);
  }
  // copy: promo code copy
  const copyAt = md.indexOf("const handleCopy = async () => {");
  check(copyAt > 0, "copy: handleCopy found");
  if (copyAt > 0) {
    const src = grab(md, copyAt + "const handleCopy = ".length);
    const { fn, calls } = runSrc(src, { promoCode: "TDC-TEST" });
    await fn();
    const sc = soundCalls(calls);
    check(JSON.stringify(sc) === '{"soundCopy":1}', `copy → soundCopy once ${JSON.stringify(sc)}`);
  }
}

(async () => {
  await helperChecks();
  await eventChecks();
  console.warn = origWarn;
  console.log(failed ? `\n${failed} check(s) failed` : "\nall sound checks passed");
  console.log("not checked here (needs a phone): real audio output, media volume, audio focus, background/resume.");
  process.exit(failed ? 1 : 0);
})();
