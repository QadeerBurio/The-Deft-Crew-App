// The real app/src/analytics/metaEvents.js with a fake Meta SDK, fake phone storage and a
// fake GET /api/app/flags. Checks: the 3 gates, strict consent, waiting events, duplicates,
// the kill switch, and that nothing ever throws.
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
const calls = { init: 0, adId: [], autoLog: [], events: [] };
let sdkThrows = false;
const fakeSdk = {
  Settings: {
    initializeSDK: () => { if (sdkThrows) throw new Error("native boom"); calls.init++; },
    setAdvertiserIDCollectionEnabled: (v) => calls.adId.push(v),
    setAutoLogAppEventsEnabled: (v) => calls.autoLog.push(v),
  },
  AppEventsLogger: {
    AppEvents: { CompletedRegistration: "fb_mobile_complete_registration", SubmitApplication: "SubmitApplication" },
    AppEventParams: { RegistrationMethod: "fb_registration_method", ContentType: "fb_content_type", ContentID: "fb_content_id" },
    logEvent: (name, params) => { if (sdkThrows) throw new Error("native boom"); calls.events.push({ name, params }); },
  },
};
let flags = { metaEvents: true };
let flagsDown = false;
let now = 1_000_000;

const file = path.join(APP, "app/src/analytics/metaEvents.js");
const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
const m = new Module(file); m.filename = file;
m.require = (id) => ({
  "@react-native-async-storage/async-storage": { __esModule: true, default: storage },
  axios: { __esModule: true, default: { get: async () => { throw new Error("use deps"); } } },
  "expo-constants": { __esModule: true, default: { expoConfig: { extra: { meta: { enabled: true } } } } },
  "../api/api": { BASE_URL: "https://example.test/api" },
}[id] || (() => { throw new Error("unexpected require " + id); })());
m._compile(code, file);
const M = m.exports;
const E = M.metaEvents;
let buildOn = true;
const setup = async ({ build = true, remote = true, user = "u1", consent } = {}) => {
  M._test.reset();
  store.clear();
  Object.assign(calls, { init: 0, adId: [], autoLog: [], events: [] });
  sdkThrows = false; flagsDown = false; buildOn = build; flags = { metaEvents: remote };
  Object.assign(M._test.deps, {
    storage,
    get: async (url) => { if (flagsDown) throw new Error("offline"); if (!/\/api\/app\/flags$/.test(url)) throw new Error("bad url " + url); return { data: flags }; },
    buildEnabled: () => buildOn,
    loadSdk: () => fakeSdk,
    now: () => now,
  });
  await M.refreshFlags({ force: true });
  if (user) await M.setMetaUser(user);
  if (consent !== undefined) await M.setConsent(consent);
};

(async () => {
  console.log("── the three gates");
  await setup({ consent: true });
  let r = await E.offerClaimed("o1");
  ok(r === "sent" && calls.events.length === 1 && calls.events[0].name === "tdc_offer_claimed" && calls.events[0].params.fb_content_id === "o1", "build on + switch on + allowed → sent", JSON.stringify({ r, calls }));
  ok(calls.init === 1 && calls.autoLog[0] === false && calls.adId[0] === true, "SDK started only now: automatic events off, advertising ID on (after consent)", JSON.stringify(calls));
  await setup({ build: false, consent: true });
  r = await E.offerClaimed("o1");
  ok(r === "off" && calls.events.length === 0 && calls.init === 0 && !M.metaAvailable(), "build without Meta IDs → off, SDK never started");
  await setup({ remote: false, consent: true });
  r = await E.jobApplied("j1");
  ok(r === "off" && calls.events.length === 0 && calls.init === 0, "server switch off (default) → off, SDK never started");
  await setup({ user: null });
  r = await E.offerClaimed("o1");
  ok(r === "no_user" && calls.events.length === 0, "signed out / guest → nothing");

  console.log("── strict consent");
  await setup({});
  r = await E.offerClaimed("o1");
  ok(r === "queued" && calls.events.length === 0 && calls.init === 0 && calls.adId.length === 0, "not asked yet → waits on the phone; SDK not started, no advertising ID", JSON.stringify(calls));
  await M.setConsent(true);
  ok(calls.events.length === 1 && calls.events[0].params.fb_content_id === "o1" && calls.init === 1, "allow → the waiting event is sent once");
  r = await E.offerClaimed("o1");
  ok(r === "duplicate" && calls.events.length === 1, "the same offer again → duplicate, not sent twice");
  await setup({});
  await E.jobApplied("j9");
  await M.setConsent(false);
  ok(calls.events.length === 0 && calls.init === 0 && store.get("tdc.metaQueue.v1.u1") == null, "not now → waiting events dropped, SDK never started");
  r = await E.jobApplied("j10");
  ok(r === "no_consent" && calls.events.length === 0, "after 'not now' → nothing is sent or kept");
  await M.setConsent(true);
  ok(calls.events.length === 0, "allowing later does not bring back dropped events");
  r = await E.jobApplied("j10");
  ok(r === "sent" && calls.events[0].name === "SubmitApplication" && calls.events[0].params.fb_content_type === "job", "after allowing: new events are sent");
  await M.setConsent(false);
  ok(calls.adId.at(-1) === false, "withdraw → advertising ID collection switched off");
  r = await E.jobApplied("j11");
  ok(r === "no_consent" && calls.events.length === 1, "withdraw → nothing more is sent");

  console.log("── sign-up (before the session and the choice)");
  await setup({ user: null });
  r = await E.registration("newbie");
  ok(r === "queued" && calls.events.length === 0, "sign-up confirmed, student not asked yet → waits", r);
  await M.setMetaUser("newbie");
  ok(calls.events.length === 0, "signed in, still not asked → still waiting");
  await M.setConsent(true);
  ok(calls.events.length === 1 && calls.events[0].name === "fb_mobile_complete_registration" && calls.events[0].params.fb_registration_method === "email", "allow → fb_mobile_complete_registration (method email), once");
  r = await E.registration("newbie");
  ok(r === "duplicate" && calls.events.length === 1, "a second sign-up call for the same account → duplicate");
  ok(calls.events.every((e) => !/@|name|phone|mail"/i.test(JSON.stringify(e.params).replace('"email"', '"method"'))), "no email address, name or phone in any event's parameters", JSON.stringify(calls.events));
  // waiting events expire after 24 h
  await setup({});
  await E.offerClaimed("old");
  now += 25 * 60 * 60 * 1000;
  await M.setConsent(true);
  ok(calls.events.length === 0, "an event waiting more than 24 h is not sent");

  console.log("── duplicates per item");
  await setup({ consent: true });
  await E.offerClaimed("A"); await E.offerClaimed("A"); await E.offerClaimed("B");
  await E.jobApplied("A");
  await E.aiResumeCreated("r1", "upload_parse"); await E.aiResumeCreated("r1", "upload_parse"); await E.aiResumeCreated("r1:j1", "tailor");
  ok(calls.events.length === 5, "offer A once, offer B, job A (different kind), resume parse once, tailor once", JSON.stringify(calls.events.map((e) => e.name + ":" + JSON.stringify(e.params))));
  const keys = JSON.parse(store.get("tdc.metaSent.v1"));
  ok(keys.includes("u1:offer:A") && keys.every((k) => k.startsWith("u1:")), "sent keys kept on the phone, per student", keys.join());
  // the kept keys survive an app restart
  M._test.reset();
  Object.assign(M._test.deps, { loadSdk: () => fakeSdk });
  await M.refreshFlags({ force: true }); await M.setMetaUser("u1");
  r = await E.offerClaimed("A");
  ok(r === "duplicate", "after an app restart, the same offer is still a duplicate");
  // another student on the same phone: their own consent and keys
  await M.setMetaUser("u2");
  r = await E.offerClaimed("A");
  ok(r === "queued", "second student on the phone: not asked yet → waits (u1's choice doesn't apply)");

  console.log("── kill switch");
  await setup({ consent: true });
  await E.offerClaimed("k1");
  flags = { metaEvents: false };
  await M.refreshFlags({ force: true });
  r = await E.offerClaimed("k2");
  ok(r === "off" && calls.events.length === 1 && calls.adId.at(-1) === false && !M.metaAvailable(), "switch turned off on the server → nothing more sent, advertising ID off");
  flags = { metaEvents: true };
  await M.refreshFlags({ force: true });
  r = await E.offerClaimed("k3");
  ok(r === "sent", "switch back on → sent again (consent kept)");
  flagsDown = true; flags = { metaEvents: false };
  now += 60 * 60 * 1000;
  await M.refreshFlags();
  ok(M.metaAvailable() === true, "server unreachable → the last answer it gave is used");
  await setup({ remote: true });
  flagsDown = true;
  store.clear();
  M._test.reset();
  Object.assign(M._test.deps, { loadSdk: () => fakeSdk });
  await M.refreshFlags({ force: true });
  ok(M.metaAvailable() === false, "unreachable and never answered → off");
  r = await E.offerClaimed("x");
  ok(r === "off", "…so nothing is queued or sent");
  // refresh is skipped while fresh (no request storm)
  await setup({ consent: true });
  let n = 0;
  M._test.deps.get = async () => { n++; return { data: { metaEvents: true } }; };
  await M.refreshFlags(); await M.refreshFlags(); await M.refreshFlags();
  ok(n === 0, "within 15 minutes the switch isn't asked again (unless forced)");

  console.log("── never throws");
  await setup({ consent: true });
  sdkThrows = true;
  let threw = false;
  try { r = await E.offerClaimed("t1"); } catch { threw = true; }
  ok(!threw && r === "error", "native error while logging → 'error', not thrown", r);
  await setup({});
  sdkThrows = true;
  threw = false;
  try { await M.setConsent(true); r = await E.jobApplied("t2"); } catch { threw = true; }
  ok(!threw && calls.events.length === 0, "native error while starting → not thrown, nothing sent", r);
  await setup({ consent: true });
  M._test.deps.loadSdk = () => { throw new Error("module not linked"); };
  M._test.state.sdk = undefined;
  M._test.state.started = false;
  threw = false;
  try { r = await E.offerClaimed("t3"); } catch { threw = true; }
  ok(!threw && (r === "queued" || r === "off"), "Meta module missing in this build → no crash", r);
  await setup({ consent: true });
  M._test.deps.storage = { getItem: async () => { throw new Error("disk"); }, setItem: async () => { throw new Error("disk"); }, removeItem: async () => { throw new Error("disk"); } };
  M._test.state.sent = null;
  threw = false;
  try { r = await E.offerClaimed("t4"); await M.setConsent(false); await M.setMetaUser("u9"); await M.refreshFlags({ force: true }); } catch { threw = true; }
  ok(!threw, "phone storage failing → no crash", r);
  threw = false;
  try { await E.offerClaimed(undefined); await E.jobApplied(null); await E.aiResumeCreated(); await E.registration(); } catch { threw = true; }
  ok(!threw, "missing ids → no crash");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("CRASH", e.stack); process.exit(1); });
