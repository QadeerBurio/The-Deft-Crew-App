// The real app/src/analytics/metaEvents.js with a fake Meta SDK, fake timers and a fake
// GET /api/app/flags. Checks the kill switch: re-read on every return to the app and every
// 5 minutes while it is open, everything off within one check, and the manual
// fb_mobile_activate_app fallback (off unless the constant is switched on).
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 300) : ""}`); };
console.warn = () => {};

// fakes
const store = new Map();
const storage = { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } };
let calls;
const fakeSdk = {
  Settings: {
    initializeSDK: () => { calls.init++; },
    setAdvertiserIDCollectionEnabled: (v) => calls.adId.push(v),
    setAdvertiserTrackingEnabled: (v) => calls.att.push(v),
    setAutoLogAppEventsEnabled: (v) => calls.autoLog.push(v),
  },
  AppEventsLogger: {
    AppEvents: { CompletedRegistration: "fb_mobile_complete_registration", SubmitApplication: "SubmitApplication", CompletedTutorial: "fb_mobile_tutorial_completion" },
    AppEventParams: { RegistrationMethod: "fb_registration_method", ContentType: "fb_content_type", ContentID: "fb_content_id" },
    logEvent: (name, params) => { calls.events.push({ name, params }); },
    flush: () => { calls.flush++; },
  },
};
let flags, requests, now;
let timers; // fake setInterval: { fn, ms, live }
const tickTimers = async () => { for (const t of timers.filter((x) => x.live)) await t.fn(); await new Promise((r) => setTimeout(r, 5)); };

const file = path.join(APP, "app/src/analytics/metaEvents.js");
const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
const m = new Module(file); m.filename = file;
m.require = (id) => ({
  "@react-native-async-storage/async-storage": { __esModule: true, default: storage },
  axios: { __esModule: true, default: { get: async () => { throw new Error("use deps"); } } },
  "expo-constants": { __esModule: true, default: { expoConfig: { extra: { meta: { enabled: true } } } } },
  "../api/api": { BASE_URL: "https://example.test/api" },
  "react-native": { Platform: { OS: "android" } },
}[id] || (() => { throw new Error("unexpected require " + id); })());
m._compile(code, file);
const M = m.exports;
const E = M.metaEvents;
const live = () => timers.filter((t) => t.live);
let r;

const setup = async ({ remote = true, consent = true, manual = false } = {}) => {
  M._test.reset();
  store.clear();
  calls = { init: 0, adId: [], att: [], autoLog: [], flush: 0, events: [] };
  flags = { metaEvents: remote }; requests = 0; now = 1_000_000; timers = [];
  Object.assign(M._test.deps, {
    storage,
    get: async (url) => { if (!/\/api\/app\/flags$/.test(url)) throw new Error("bad url " + url); requests++; return { data: flags }; },
    buildEnabled: () => true,
    loadSdk: () => fakeSdk,
    platform: () => "android",
    loadTracking: () => { throw new Error("no tracking prompt on Android"); },
    every: (fn, ms) => { const t = { fn, ms, live: true }; timers.push(t); return () => { t.live = false; }; },
    now: () => now,
  });
  M._test.config.manualActivate = manual;
  await M.refreshFlags({ force: true });
  await M.setMetaUser("u1");
  if (consent !== null) await M.setConsent(consent);
};

(async () => {
  console.log("── re-checked every 5 minutes while open");
  await setup({});
  requests = 0;
  await M.onAppState("active");
  ok(requests === 1, "app opened / returned → the switch is read at once (even if fresh)", requests);
  ok(live().length === 1 && live()[0].ms === 5 * 60 * 1000 && M._test.FLAGS_EVERY === 300000, "…and a 5-minute check starts", JSON.stringify(timers.map((t) => t.ms)));
  await M.onAppState("active");
  ok(live().length === 1, "a second 'active' doesn't start a second check");
  await tickTimers();
  ok(requests === 3, "each 5-minute tick asks the server (forced, not served from the cache)", requests);

  console.log("── switch turned off on the server");
  r = await E.offerClaimed("a1");
  ok(r === "sent" && calls.events.length === 1, "before: events sent");
  flags = { metaEvents: false };
  await tickTimers();
  ok(!M.metaAvailable() && calls.autoLog.at(-1) === false && calls.adId.at(-1) === false, "within one 5-minute check → automatic logging and advertising ID off", JSON.stringify(calls));
  r = await E.offerClaimed("a2");
  ok(r === "off" && calls.events.length === 1, "…and nothing more is sent or kept");
  flags = { metaEvents: true };
  await tickTimers();
  ok(M.metaAvailable() && calls.autoLog.at(-1) === true && calls.adId.at(-1) === true, "switched back on → automatic logging and advertising ID on again (consent kept)", JSON.stringify(calls));
  r = await E.offerClaimed("a3");
  ok(r === "sent", "…and events are sent again");

  console.log("── background and return");
  await M.onAppState("background");
  ok(live().length === 0, "app in the background → no checks (no traffic while closed)");
  flags = { metaEvents: false };
  const before = requests;
  await M.onAppState("active");
  ok(requests === before + 1 && !M.metaAvailable() && calls.autoLog.at(-1) === false, "switch turned off while away → off on the return, before anything else", JSON.stringify(calls.autoLog));
  ok(live().length === 1, "…and the 5-minute check runs again");
  await M.onAppState("inactive");
  ok(live().length === 0, "'inactive' (iOS app switcher) also stops the check");
  // offline: the last answer is used
  await setup({});
  await M.onAppState("active");
  M._test.deps.get = async () => { requests++; throw new Error("offline"); };
  await tickTimers();
  ok(M.metaAvailable(), "server unreachable on a tick → the last answer it gave is kept");

  console.log("── cache");
  await setup({});
  requests = 0;
  await M.refreshFlags(); await M.refreshFlags();
  ok(requests === 0, "non-forced reads within 5 minutes use the cache");
  now += 5 * 60 * 1000 + 1;
  await M.refreshFlags();
  ok(requests === 1, "after 5 minutes a normal read asks again");

  console.log("── manual activate fallback");
  await setup({});
  await M.onAppState("active");
  ok(M._test.config.manualActivate === false && !calls.events.some((e) => e.name === "fb_mobile_activate_app"), "off by default → we never log fb_mobile_activate_app ourselves (the SDK does)");
  await setup({ consent: null, manual: true });
  await M.onAppState("active");
  ok(!calls.events.length && calls.init === 0, "on, but not asked yet → nothing");
  await M.setConsent(true);
  ok(calls.events.filter((e) => e.name === "fb_mobile_activate_app").length === 1 && calls.flush >= 1, "on + allow → one fb_mobile_activate_app at start, flushed", JSON.stringify(calls.events));
  ok(JSON.stringify(calls.events.find((e) => e.name === "fb_mobile_activate_app").params) === "{}", "…with no parameters");
  await M.onAppState("background");
  await M.onAppState("active");
  ok(calls.events.filter((e) => e.name === "fb_mobile_activate_app").length === 2, "on → one more on each return to the app");
  await M.onAppState("active");
  ok(calls.events.filter((e) => e.name === "fb_mobile_activate_app").length === 2, "on → never twice in one open (start + return don't double-count)");
  await setup({ manual: true });
  await M.onAppState("active");
  ok(calls.events.filter((e) => e.name === "fb_mobile_activate_app").length === 1, "on, already allowed at launch → exactly one for the open", JSON.stringify(calls.events));
  flags = { metaEvents: false };
  await M.onAppState("background");
  await M.onAppState("active");
  ok(calls.events.filter((e) => e.name === "fb_mobile_activate_app").length === 1, "on, switch turned off → none on the next open");
  await setup({ consent: false, manual: true });
  await M.onAppState("active");
  ok(!calls.events.length && calls.init === 0, "on, 'not now' → none, SDK never started");

  console.log("── never throws");
  await setup({});
  M._test.deps.get = async () => { throw new Error("boom"); };
  M._test.deps.storage = { getItem: async () => { throw new Error("disk"); }, setItem: async () => { throw new Error("disk"); }, removeItem: async () => { throw new Error("disk"); } };
  let threw = false;
  try { await M.onAppState("active"); await tickTimers(); await M.onAppState("background"); await M.onAppState(undefined); } catch { threw = true; }
  ok(!threw, "server and storage failing during app state changes → no crash");

  ok(calls.events.every((e) => !/@|name|phone|mail"/i.test(JSON.stringify(e.params))), "no name, email or phone in any event");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.stack); process.exit(1); });
