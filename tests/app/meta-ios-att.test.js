// The real app/src/analytics/metaEvents.js on a fake iPhone: a fake Meta SDK and a fake
// expo-tracking-transparency. Checks: the tracking prompt is only asked after consent, the
// advertising ID only goes on with consent AND tracking granted, and it follows changes made in
// iOS Settings. Android never touches the prompt.
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
    initializeSDK: () => { calls.init++; calls.order.push("init"); },
    setAdvertiserIDCollectionEnabled: (v) => { calls.adId.push(v); calls.order.push("adId:" + v); },
    setAdvertiserTrackingEnabled: (v) => { calls.att.push(v); calls.order.push("att:" + v); },
    setAutoLogAppEventsEnabled: (v) => { calls.autoLog.push(v); calls.order.push("autoLog:" + v); },
  },
  AppEventsLogger: {
    AppEvents: { CompletedRegistration: "fb_mobile_complete_registration", SubmitApplication: "SubmitApplication", CompletedTutorial: "fb_mobile_tutorial_completion" },
    AppEventParams: { RegistrationMethod: "fb_registration_method", ContentType: "fb_content_type", ContentID: "fb_content_id" },
    logEvent: (name, params) => { calls.events.push({ name, params }); },
    flush: () => { calls.flush++; },
  },
};
// Apple's prompt: status as iOS reports it, and what the student taps if asked
let att;
const fakeTracking = {
  getTrackingPermissionsAsync: async () => { att.reads++; return { status: att.status }; },
  requestTrackingPermissionsAsync: async () => { att.asked++; att.status = att.answer; return { status: att.status }; },
};
let os = "ios";
let trackingMissing = false;

const file = path.join(APP, "app/src/analytics/metaEvents.js");
const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
const m = new Module(file); m.filename = file;
m.require = (id) => ({
  "@react-native-async-storage/async-storage": { __esModule: true, default: storage },
  axios: { __esModule: true, default: { get: async () => { throw new Error("use deps"); } } },
  "expo-constants": { __esModule: true, default: { expoConfig: { extra: { meta: { enabled: true } } } } },
  "../api/api": { BASE_URL: "https://example.test/api" },
  "react-native": { Platform: { OS: "ios" } },
}[id] || (() => { throw new Error("unexpected require " + id); })());
m._compile(code, file);
const M = m.exports;
const E = M.metaEvents;

const setup = async ({ platform = "ios", status = "undetermined", answer = "granted", consent, missing = false } = {}) => {
  M._test.reset();
  store.clear();
  calls = { init: 0, adId: [], att: [], autoLog: [], flush: 0, events: [], order: [] };
  att = { status, answer, reads: 0, asked: 0 };
  os = platform; trackingMissing = missing;
  Object.assign(M._test.deps, {
    storage,
    get: async () => ({ data: { metaEvents: true } }),
    buildEnabled: () => true,
    loadSdk: () => fakeSdk,
    platform: () => os,
    loadTracking: () => { if (trackingMissing) throw new Error("module not linked"); return fakeTracking; },
    every: () => () => {},
    now: () => 1_000_000,
  });
  await M.refreshFlags({ force: true });
  await M.setMetaUser("u1");
  if (consent !== undefined) await M.setConsent(consent);
};

(async () => {
  console.log("── the prompt follows 'allow', never 'not now'");
  await setup({});
  let r = await M.requestTracking();
  ok(r === null && att.asked === 0 && calls.init === 0, "not decided yet → no prompt, SDK not started");
  await M.setConsent(false);
  r = await M.requestTracking();
  ok(r === null && att.asked === 0 && calls.adId.every((v) => v === false), "'not now' → no prompt, no advertising ID");
  await setup({ consent: true });
  ok(calls.init === 1 && calls.autoLog[0] === true, "allow → SDK started with automatic logging on (install, activate)", JSON.stringify(calls.order));
  ok(calls.att.at(-1) === false && calls.adId.at(-1) === false, "allow, prompt not answered yet → advertising tracking off, advertising ID off", JSON.stringify(calls.order));
  ok(calls.order.indexOf("autoLog:true") < calls.order.indexOf("init") && calls.order.indexOf("att:false") < calls.order.indexOf("init"), "settings applied before initializeSDK", calls.order.join());
  r = await E.offerClaimed("o1");
  ok(r === "sent" && calls.events.length === 1 && calls.flush === 1, "events are still sent with consent (no advertising ID), and flushed");
  r = await M.requestTracking();
  ok(r === "granted" && att.asked === 1, "then Apple's prompt is asked once");
  ok(calls.att.at(-1) === true && calls.adId.at(-1) === true, "prompt granted → advertising tracking on, advertising ID on", JSON.stringify(calls.order));
  ok(calls.order.lastIndexOf("att:true") < calls.order.lastIndexOf("adId:true"), "tracking flag set before the advertising ID switch", calls.order.join());
  ok(calls.init === 1, "the SDK isn't started a second time");
  r = await M.requestTracking();
  ok(att.asked === 1 && r === "granted", "asking again → iOS answer reused, no second prompt");

  console.log("── prompt denied");
  await setup({ consent: true, answer: "denied" });
  r = await M.requestTracking();
  ok(r === "denied" && att.asked === 1, "student taps 'ask app not to track'");
  ok(calls.att.at(-1) === false && calls.adId.at(-1) === false && !calls.adId.includes(true), "→ advertising tracking and advertising ID stay off", JSON.stringify(calls.order));
  r = await E.jobApplied("j1");
  ok(r === "sent", "events with consent still go (no advertising ID)");

  console.log("── answered before / changed in iOS Settings");
  await setup({ status: "granted", consent: true });
  ok(calls.att.at(-1) === true && calls.adId.at(-1) === true && att.asked === 0, "tracking already allowed in iOS → advertising ID on at start, no prompt", JSON.stringify(calls.order));
  att.status = "denied";
  await M.onAppState("active");
  ok(calls.att.at(-1) === false && calls.adId.at(-1) === false, "turned off in iOS Settings → off on the next return to the app", JSON.stringify(calls.order));
  att.status = "granted";
  await M.onAppState("active");
  ok(calls.att.at(-1) === true && calls.adId.at(-1) === true, "turned back on in iOS Settings → on again");
  await setup({ status: "restricted", consent: true });
  r = await M.requestTracking();
  ok(att.asked === 0 && calls.adId.at(-1) === false && r === "restricted", "restricted (parental controls etc.) → never asked, advertising ID off");

  console.log("── withdraw / switch off");
  await setup({ status: "granted", consent: true });
  await M.setConsent(false);
  ok(calls.autoLog.at(-1) === false && calls.att.at(-1) === false && calls.adId.at(-1) === false, "withdraw → automatic logging, advertising tracking and advertising ID off", JSON.stringify(calls.order));
  r = await M.requestTracking();
  ok(r === null && att.asked === 0, "after withdrawing → no prompt");

  console.log("── Android");
  await setup({ platform: "android", consent: true });
  r = await M.requestTracking();
  ok(r === null && att.reads === 0 && att.asked === 0, "Android → the tracking module is never used");
  ok(calls.att.length === 0 && calls.adId.at(-1) === true && calls.autoLog[0] === true, "Android → advertising ID on with consent; no iOS tracking flag", JSON.stringify(calls.order));

  console.log("── never throws");
  await setup({ consent: true, missing: true });
  let threw = false;
  try { r = await M.requestTracking(); await M.onAppState("active"); } catch { threw = true; }
  ok(!threw && r === null && calls.adId.at(-1) === false && calls.init === 1, "tracking module missing → treated as not granted, no crash", JSON.stringify(calls.order));
  await setup({ consent: true });
  fakeTracking.requestTrackingPermissionsAsync = async () => { throw new Error("native boom"); };
  threw = false;
  try { r = await M.requestTracking(); } catch { threw = true; }
  ok(!threw && r === null && calls.adId.at(-1) === false, "prompt failing → no crash, advertising ID stays off");

  // no personal data in anything sent here
  ok(calls.events.every((e) => !/@|name|phone|mail"/i.test(JSON.stringify(e.params))), "no name, email or phone in any event");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.stack); process.exit(1); });
