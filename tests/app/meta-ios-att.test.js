// The real app/src/analytics/metaEvents.js on a fake iPhone: a fake Meta SDK and a fake
// expo-tracking-transparency. Checks (feat/ios-meta-attribution): anonymous by default (install, app open, events
// with no identifier); Apple's prompt only after the pre-screen's "continue"; identifiers (advertising ID, advertiser
// tracking, advanced matching) only when allowed; declined / restricted → no identifier anywhere; follows iOS Settings;
// Android's opt-in is "continue".
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
  // advanced matching (only with identifiers allowed; {} clears it)
  AppEventsLogger: {
    AppEvents: { CompletedRegistration: "fb_mobile_complete_registration", SubmitApplication: "SubmitApplication", CompletedTutorial: "fb_mobile_tutorial_completion" },
    AppEventParams: { RegistrationMethod: "fb_registration_method", ContentType: "fb_content_type", ContentID: "fb_content_id" },
    logEvent: (name, params) => { calls.events.push({ name, params }); },
    flush: () => { calls.flush++; },
    setUserData: (d) => { calls.userData.push(d); calls.order.push("userData:" + JSON.stringify(d)); },
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
  calls = { init: 0, adId: [], att: [], autoLog: [], flush: 0, events: [], order: [], userData: [] };
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

// identifiers anywhere in what the app hands the SDK: user data (advanced matching), the advertising ID switches,
// event parameters (an email, phone or user id)
const EMAIL = "sana@student.example", PHONE = "+92 300 1234567";
const hasIdentifiers = () =>
  calls.adId.some((v) => v === true) || calls.att.some((v) => v === true) ||
  calls.userData.some((d) => Object.keys(d || {}).length > 0) ||
  calls.events.some((e) => /sana|student\.example|300 ?1234567|923001234567|\bu1\b/i.test(JSON.stringify(e.params)));

(async () => {
  console.log("── anonymous by default: install, app open and events with no identifier");
  await setup({});
  await M.setMetaUser("u1", { email: EMAIL, phone: PHONE });
  let r = await E.offerClaimed("o1");
  ok(r === "sent" && calls.init === 1 && calls.autoLog.at(-1) === true, "the SDK runs (install ping, fb_mobile_activate_app) and the event is sent", JSON.stringify(calls.order));
  ok(!hasIdentifiers(), "…with no advertising ID, no advertiser tracking, no advanced matching, no email / phone / user id in any event", JSON.stringify({ adId: calls.adId, att: calls.att, userData: calls.userData }));
  ok(calls.order.indexOf("att:false") < calls.order.indexOf("init") && calls.order.indexOf("adId:false") < calls.order.indexOf("init"), "identifiers are switched off BEFORE the SDK starts", calls.order.join());
  ok(att.asked === 0, "Apple's prompt is never asked on its own (not at launch, not with the first event)");

  console.log("── Apple's prompt only after the pre-screen's 'continue'");
  await setup({});
  r = await M.requestTracking();
  ok(r === null && att.asked === 0, "before the pre-screen: requestTracking asks nothing");
  await M.setIdsChoice(false);
  r = await M.requestTracking();
  ok(r === null && att.asked === 0 && !hasIdentifiers(), "'not now' → no prompt, ever; identifiers off");
  await setup({ answer: "granted" });
  await M.setMetaUser("u1", { email: EMAIL, phone: PHONE });
  await M.setIdsChoice(true);
  ok(att.asked === 0 && calls.adId.every((v) => v === false), "'continue' alone doesn't turn identifiers on (Apple hasn't answered)");
  r = await M.requestTracking();
  ok(r === "granted" && att.asked === 1, "then Apple's prompt is asked once");
  ok(calls.att.at(-1) === true && calls.adId.at(-1) === true, "allowed → setAdvertiserTrackingEnabled(true), advertising ID on", JSON.stringify(calls.order));
  ok(JSON.stringify(calls.userData.at(-1)) === JSON.stringify({ email: EMAIL, phone: "+923001234567" }), "…and advanced matching with the student's email and phone (the SDK hashes them)", JSON.stringify(calls.userData.at(-1)));
  r = await M.requestTracking();
  ok(att.asked === 1, "asking again → iOS answer reused, no second prompt");

  console.log("── Apple's prompt declined: no identifiers anywhere");
  await setup({ answer: "denied" });
  await M.setMetaUser("u1", { email: EMAIL, phone: PHONE });
  await M.setIdsChoice(true);
  r = await M.requestTracking();
  await E.jobApplied("j1"); await E.registration("u1"); await E.offerClaimed("o2");
  ok(r === "denied" && calls.events.length === 3, "'Ask App not to Track' → events still sent", JSON.stringify(calls.events.map((e) => e.name)));
  ok(!hasIdentifiers(), "…with no advertising ID, no advertiser tracking, no advanced matching and no email / phone / user id in any event", JSON.stringify({ adId: calls.adId, att: calls.att, userData: calls.userData }));
  ok(calls.userData.length > 0 && calls.userData.every((d) => JSON.stringify(d) === "{}"), "advanced matching is actively cleared (empty user data), not just left unset");
  await setup({ status: "restricted" });
  await M.setIdsChoice(true);
  r = await M.requestTracking();
  ok(r === "restricted" && att.asked === 0 && !hasIdentifiers(), "restricted (parental controls etc.) → never asked, no identifiers");

  console.log("── follows iOS Settings");
  await setup({ status: "granted" });
  await M.setMetaUser("u1", { email: EMAIL, phone: PHONE });
  await M.setIdsChoice(true);
  ok(calls.adId.at(-1) === true && att.asked === 0, "already allowed in iOS and 'continue' → identifiers on, no prompt");
  att.status = "denied";
  await M.onAppState("active");
  ok(calls.adId.at(-1) === false && calls.att.at(-1) === false && JSON.stringify(calls.userData.at(-1)) === "{}", "turned off in iOS Settings → back in the app: identifiers off, advanced matching cleared");
  att.status = "granted";
  await M.onAppState("active");
  ok(calls.adId.at(-1) === true, "turned back on → on again");
  await M.setConsent(false);
  ok(calls.adId.at(-1) === false && calls.autoLog.at(-1) === false && JSON.stringify(calls.userData.at(-1)) === "{}", "ad measurement switched off → everything off, advanced matching cleared");

  console.log("── Android: no Apple prompt; the pre-screen's 'continue' is the opt-in");
  await setup({ platform: "android" });
  await M.setMetaUser("u1", { email: EMAIL, phone: PHONE });
  await E.offerClaimed("a1");
  ok(calls.adId.at(-1) === true && calls.att.length === 0 && calls.userData.every((d) => JSON.stringify(d) === "{}") && !calls.events.some((e) => /student\.example|1234567/.test(JSON.stringify(e.params))), "before 'continue': Android advertising ID on by default; NO advanced matching (no email / phone); no iOS tracking flag", JSON.stringify({ adId: calls.adId, userData: calls.userData }));
  await M.setIdsChoice(true);
  r = await M.requestTracking();
  ok(r === null && att.asked === 0 && calls.adId.at(-1) === true && calls.userData.at(-1).email === EMAIL, "'continue' → advanced matching on too; no prompt", JSON.stringify(calls.userData.at(-1)));
  await M.setIdsChoice(false);
  ok(calls.adId.at(-1) === false && JSON.stringify(calls.userData.at(-1)) === "{}", "'ads with your details' off → advertising ID off and advanced matching cleared");
  // a student who said "not now" on the old sheet, opening the app: the "no" is known before the SDK starts, even before
  // the signed-in student is (no launch window)
  M._test.reset(); store.clear(); os = "android";
  calls = { init: 0, adId: [], att: [], autoLog: [], flush: 0, events: [], order: [], userData: [] };
  store.set("tdc.metaConsent.v1.u1", JSON.stringify("denied"));
  M._test.deps.storage = { ...storage, getAllKeys: async () => [...store.keys()] };
  await M.refreshFlags({ force: true });
  await M.setMetaUser("u1");
  await E.offerClaimed("x1");
  ok(calls.init === 0 && !calls.adId.some((v) => v === true) && !calls.events.length, "Android, 'not now' on the old sheet → from the first moment of launch: SDK not started, no advertising ID, nothing sent", JSON.stringify(calls));
  ok(store.get("tdc.metaMeasurement.device.v1") === JSON.stringify("denied"), "…and the phone now remembers it phone-wide");
  M._test.deps.storage = storage;

  console.log("── resilience");
  await setup({ missing: true });
  await M.setIdsChoice(true);
  r = await M.requestTracking();
  ok(r === null && !hasIdentifiers(), "tracking module missing in this build → no crash, identifiers off");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
