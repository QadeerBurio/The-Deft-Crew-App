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
const calls = { init: 0, adId: [], att: [], autoLog: [], flush: 0, events: [] };
let sdkThrows = false;
const fakeSdk = {
  Settings: {
    initializeSDK: () => { if (sdkThrows) throw new Error("native boom"); calls.init++; },
    setAdvertiserIDCollectionEnabled: (v) => calls.adId.push(v),
    setAutoLogAppEventsEnabled: (v) => calls.autoLog.push(v),
    setAdvertiserTrackingEnabled: (v) => calls.att.push(v),
  },
  AppEventsLogger: {
    AppEvents: { CompletedRegistration: "fb_mobile_complete_registration", SubmitApplication: "SubmitApplication", CompletedTutorial: "fb_mobile_tutorial_completion" },
    AppEventParams: { RegistrationMethod: "fb_registration_method", ContentType: "fb_content_type", ContentID: "fb_content_id" },
    logEvent: (name, params) => { if (sdkThrows) throw new Error("native boom"); calls.events.push({ name, params }); },
    flush: () => { calls.flush++; },
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
  "react-native": { Platform: { OS: "android" } },
}[id] || (() => { throw new Error("unexpected require " + id); })());
m._compile(code, file);
const M = m.exports;
const E = M.metaEvents;
// app/src/analytics/metaRedemptions.js, on top of the same metaEvents instance
let redApi = async () => ({ data: { redemptions: [] } });
const redCalls = [];
const rfile = path.join(APP, "app/src/analytics/metaRedemptions.js");
const rm = new Module(rfile); rm.filename = rfile;
rm.require = (id) => ({
  "../api/api": { __esModule: true, default: { get: async (url, cfg) => { redCalls.push(url); return redApi(url, cfg); } } },
  "./metaEvents": M,
}[id] || (() => { throw new Error("unexpected require " + id); })());
rm._compile(babel.transformSync(fs.readFileSync(rfile, "utf8"), { filename: rfile, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-transform-modules-commonjs")] }).code, rfile);
const R = rm.exports;
// Karachi wall-clock time → epoch ms (Asia/Karachi is UTC+5, no daylight saving)
const pkt = (iso) => Date.parse(iso + "+05:00");
const sentKeys = () => JSON.parse(store.get("tdc.metaSent.v1") || "[]");
const noPersonal = (evs) => evs.every((e) => !/@|name|phone|mail"|text|content|message/i.test(JSON.stringify(e.params)));
let buildOn = true;
const setup = async ({ build = true, remote = true, user = "u1", consent } = {}) => {
  M._test.reset();
  store.clear();
  Object.assign(calls, { init: 0, adId: [], att: [], autoLog: [], flush: 0, events: [] });
  sdkThrows = false; flagsDown = false; buildOn = build; flags = { metaEvents: remote };
  Object.assign(M._test.deps, {
    storage,
    get: async (url) => { if (flagsDown) throw new Error("offline"); if (!/\/api\/app\/flags$/.test(url)) throw new Error("bad url " + url); return { data: flags }; },
    buildEnabled: () => buildOn,
    loadSdk: () => fakeSdk,
    platform: () => "android",
    loadTracking: () => { throw new Error("no tracking prompt on Android"); },
    every: () => () => {},
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
  ok(calls.init === 1 && calls.autoLog[0] === true && calls.adId[0] === true && calls.att.length === 0, "SDK started only now: automatic logging (install, activate) on, then advertising ID on (Android, after consent)", JSON.stringify(calls));
  ok(calls.flush === 1, "flushed right after the event", calls.flush);
  ok(!calls.events.some((e) => e.name === "fb_mobile_activate_app"), "manual activate fallback is off by default (the SDK logs it)");
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
  ok(calls.adId.at(-1) === false && calls.autoLog.at(-1) === false, "withdraw → automatic logging and advertising ID collection switched off");
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
  ok(r === "off" && calls.events.length === 1 && calls.adId.at(-1) === false && calls.autoLog.at(-1) === false && !M.metaAvailable(), "switch turned off on the server → nothing more sent, automatic logging and advertising ID off");
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
  ok(n === 0, "within 5 minutes the switch isn't asked again (unless forced)");
  now += 5 * 60 * 1000 + 1;
  await M.refreshFlags();
  ok(n === 1, "after 5 minutes it is asked again", n);

  console.log("── onboarding completed / event registered / scholarship applied");
  // gates: each of the 3 is off without the build IDs, off with the switch off, waits before consent
  for (const [label, fire] of [["onboarding", () => E.onboardingCompleted()], ["event", () => E.eventRegistered("e1")], ["scholarship", () => E.scholarshipApplied("p1")]]) {
    await setup({ build: false, consent: true });
    const a = await fire();
    await setup({ remote: false, consent: true });
    const b = await fire();
    await setup({});
    const c = await fire();
    ok(a === "off" && b === "off" && c === "queued" && calls.events.length === 0 && calls.init === 0, `${label}: build off → off, switch off → off, not asked yet → waits (SDK not started)`, [a, b, c].join());
    await M.setConsent(false);
    ok((await fire()) === "no_consent" && calls.events.length === 0, `${label}: 'not now' → nothing sent`);
  }
  await setup({ consent: true });
  r = await E.onboardingCompleted();
  ok(r === "sent" && calls.events[0].name === "fb_mobile_tutorial_completion" && Object.keys(calls.events[0].params).length === 0, "fb_mobile_tutorial_completion (SDK constant), no parameters", JSON.stringify(calls.events[0]));
  ok(JSON.parse(store.get("tdc.metaSent.v1")).includes("u1:onboarding"), "once-key is still 'onboarding' (students who already finished aren't sent it again)");
  ok((await E.onboardingCompleted()) === "duplicate" && calls.events.length === 1, "onboarding: once per student (replaying the tour doesn't send it again)");
  await M.setMetaUser("u2"); await M.setConsent(true);
  ok((await E.onboardingCompleted()) === "sent", "…another student on the same phone gets their own");
  await setup({ consent: true });
  r = await E.eventRegistered("ev1");
  ok(r === "sent" && calls.events[0].name === "tdc_event_registered" && JSON.stringify(calls.events[0].params) === '{"feature_name":"events"}', "tdc_event_registered with feature_name only (no event id, title or name sent)", JSON.stringify(calls.events[0]));
  ok((await E.eventRegistered("ev1")) === "duplicate" && (await E.eventRegistered("ev2")) === "sent" && calls.events.length === 2, "one per event per student: same event → duplicate, another event → sent");
  r = await E.scholarshipApplied("prog1");
  ok(r === "sent" && calls.events[2].name === "tdc_scholarship_applied" && calls.events[2].params.fb_content_type === "scholarship" && calls.events[2].params.fb_content_id === "prog1", "tdc_scholarship_applied (content type scholarship, program id)", JSON.stringify(calls.events[2]));
  ok((await E.scholarshipApplied("prog1")) === "duplicate" && calls.events.length === 3, "one per program per student");
  ok(calls.events.every((e) => !/@|name|phone|mail"/i.test(JSON.stringify(e.params).replace('"feature_name"', '"f"'))), "no personal data in any of the new events");
  // never throws
  sdkThrows = true;
  let threwNew = false;
  try { r = [await E.onboardingCompleted(), await E.eventRegistered("ev9"), await E.scholarshipApplied("p9")]; } catch { threwNew = true; }
  ok(!threwNew && r.every((x) => x === "error" || x === "duplicate"), "native error → returned, never thrown", JSON.stringify(r));
  sdkThrows = false;
  threwNew = false;
  try { await E.eventRegistered(undefined); await E.scholarshipApplied(null); } catch { threwNew = true; }
  ok(!threwNew, "missing ids → no crash");

  console.log("── once-a-day keys: Karachi date");
  ok(M.dayKey(pkt("2026-10-28T00:30:00")) === "2026-10-28", "00:30 in Karachi is the new day (UTC is still the 27th)", M.dayKey(pkt("2026-10-28T00:30:00")));
  ok(M.dayKey(pkt("2026-10-27T23:59:00")) === "2026-10-27", "23:59 in Karachi is still the same day");
  ok(M.dayKey(Date.parse("2026-10-27T20:00:00Z")) === "2026-10-28", "the phone's time zone doesn't matter (20:00 UTC = 01:00 PKT next day)");

  console.log("── tdc_social_engaged");
  await setup({ consent: true });
  now = pkt("2026-10-27T10:00:00");
  r = [await E.socialEngaged("like"), await E.socialEngaged("like")];
  ok(r.join() === "sent,duplicate" && calls.events.length === 1 && JSON.stringify(calls.events[0]) === '{"name":"tdc_social_engaged","params":{"type":"like"}}', "like twice in a day = one event, type only", JSON.stringify({ r, ev: calls.events }));
  r = [await E.socialEngaged("comment"), await E.socialEngaged("comment")];
  ok(r.join() === "sent,duplicate" && calls.events.length === 2 && calls.events[1].params.type === "comment", "comment counted on its own, once a day");
  ok((await E.socialEngaged("unlike")) === "invalid" && (await E.socialEngaged(undefined)) === "invalid" && calls.events.length === 2, "anything but like/comment (e.g. unlike) → nothing");
  now = pkt("2026-10-27T23:59:00");
  ok((await E.socialEngaged("like")) === "duplicate", "23:59 Karachi, same day → still one");
  now = pkt("2026-10-28T00:01:00");
  ok((await E.socialEngaged("like")) === "sent" && calls.events.length === 3, "00:01 Karachi → a new day, a new event");
  ok(!sentKeys().some((k) => k.includes("2026-10-27")) && sentKeys().includes("u1:social:like:day:2026-10-28"), "yesterday's day keys are dropped from the phone", sentKeys().join());
  await M.setMetaUser("u2"); await M.setConsent(true);
  ok((await E.socialEngaged("like")) === "sent", "another student on the same phone, same day → their own");

  console.log("── AI chat / travel assistant (once a day)");
  await setup({ consent: true });
  now = pkt("2026-10-27T12:00:00");
  r = [await E.aiChatUsed(), await E.aiChatUsed(), await E.travelAssistantUsed(), await E.travelAssistantUsed()];
  ok(r.join() === "sent,duplicate,sent,duplicate" && calls.events.length === 2, "each once per day", r.join());
  ok(JSON.stringify(calls.events[0]) === '{"name":"tdc_ai_chat_used","params":{"feature_name":"ai_chat"}}' && JSON.stringify(calls.events[1]) === '{"name":"tdc_travel_assistant_used","params":{"feature_name":"travel_assistant"}}', "feature_name ai_chat / travel_assistant only", JSON.stringify(calls.events));
  now = pkt("2026-10-28T08:00:00");
  ok((await E.aiChatUsed()) === "sent" && (await E.travelAssistantUsed()) === "sent", "next Karachi day → again");

  console.log("── posts and confessions");
  await setup({ consent: true });
  r = [await E.postCreated("p1"), await E.postCreated("p1"), await E.postCreated("p2")];
  ok(r.join() === "sent,duplicate,sent" && calls.events.every((e) => e.name === "tdc_post_created" && JSON.stringify(e.params) === "{}"), "tdc_post_created once per post, no params", r.join());
  calls.events.length = 0;
  r = [await E.confessionCreated("CONF-SECRET-ID"), await E.confessionCreated("CONF-SECRET-ID")];
  ok(r.join() === "sent,sent" && calls.events.length === 2 && calls.events.every((e) => e.name === "tdc_confession_created" && JSON.stringify(e.params) === "{}"), "tdc_confession_created: each confession counts, no params", r.join());
  ok(!JSON.stringify([...store.values()]).includes("CONF-SECRET-ID") && !JSON.stringify(calls.events).includes("CONF-SECRET-ID"), "confession event has no id: not in params, once-keys or anything stored on the phone");
  ok(M.metaEvents.confessionCreated.length === 0, "confessionCreated takes no arguments at all");
  await setup({});
  await E.confessionCreated("CONF-SECRET-ID");
  const q = store.get("tdc.metaQueue.v1.u1") || "";
  ok(/tdc_confession_created/.test(q) && !q.includes("CONF-SECRET-ID") && JSON.parse(q)[0].key.startsWith("u1:confession:") && JSON.stringify(JSON.parse(q)[0].params) === "{}", "before consent: the waiting confession event has no id either", q);

  console.log("── skillshare");
  await setup({ consent: true });
  r = [await E.skillshareListingCreated("L1"), await E.skillshareListingCreated("L1"), await E.skillshareOfferCreated("O1"), await E.skillshareListingCreated(undefined), await E.skillshareOfferCreated(null)];
  ok(r.join() === "sent,duplicate,sent,no_id,no_id" && calls.events.length === 2, "once per item; no id from the server → nothing (never one shared key)", r.join());
  ok(JSON.stringify(calls.events[0].params) === '{"fb_content_type":"skillshare_listing","fb_content_id":"L1"}' && JSON.stringify(calls.events[1].params) === '{"fb_content_type":"skillshare_offer","fb_content_id":"O1"}', "content type and item id only", JSON.stringify(calls.events));

  console.log("── tdc_discount_redeemed");
  await setup({ consent: true });
  now = pkt("2026-10-27T18:00:00");
  const hAgo = (h) => new Date(now - h * 3600e3).toISOString();
  r = [await E.discountRedeemed("R1", "offerA", hAgo(1)), await E.discountRedeemed("R1", "offerA", hAgo(1)), await E.discountRedeemed("R2", "offerA", hAgo(25)), await E.discountRedeemed("R3", "offerA", "garbage"), await E.discountRedeemed(null, "offerA", hAgo(1))];
  ok(r.join() === "sent,duplicate,old,old,old" && calls.events.length === 1, "once per redemption; older than 24 h, bad date or no id → nothing", r.join());
  ok(JSON.stringify(calls.events[0]) === '{"name":"tdc_discount_redeemed","params":{"fb_content_type":"offer","fb_content_id":"offerA"}}' && sentKeys().includes("u1:redeem:R1"), "content type offer + offer id; once-key redeem:<redemptionId>", JSON.stringify(calls.events[0]));

  console.log("── metaRedemptions (server list → events)");
  await setup({ consent: true });
  now = pkt("2026-10-27T18:00:00");
  R._test.reset(); R._test.deps.now = () => now; redCalls.length = 0;
  redApi = async () => ({ data: { redemptions: [
    { redemptionId: "X1", offerId: "o1", redeemedAt: new Date(now - 3600e3).toISOString() },
    { redemptionId: "X2", offerId: "o2", redeemedAt: new Date(now - 2 * 3600e3).toISOString() },
    { redemptionId: "X0", offerId: "o0", redeemedAt: new Date(now - 30 * 3600e3).toISOString() },
  ] } });
  r = await R.checkRedemptions();
  ok(r === 2 && calls.events.length === 2 && calls.events.every((e) => e.name === "tdc_discount_redeemed"), "unseen redemptions of the last 24 h → one event each (the 30 h one is skipped)", JSON.stringify({ r, ev: calls.events }));
  ok(redCalls.length === 1 && redCalls[0] === "/offers/my-redemptions?since=" + encodeURIComponent(new Date(now - 864e5).toISOString()), "asks only for the last 24 h", redCalls[0]);
  r = await R.checkRedemptions();
  ok(r === 0 && redCalls.length === 1, "again within a minute (foreground + savings refresh) → no second request");
  now += 61e3;
  r = await R.checkRedemptions();
  ok(r === 0 && redCalls.length === 2 && calls.events.length === 2, "a minute later: asked again, already-sent ones are not resent");
  ok((await R.onRedemptionPush({ type: "new_offer" })) === 0 && redCalls.length === 2, "other pushes → nothing");
  await R.onRedemptionPush({ type: "redemption", redemptionId: "X1" });
  ok(redCalls.length === 3, "the payment push → checks at once (even within the minute)");
  await Promise.all([R.checkRedemptions({ force: true }), R.checkRedemptions({ force: true })]);
  ok(redCalls.length === 4, "two at the same moment → one request");
  redApi = async () => { const e = new Error("http 500"); e.response = { status: 500 }; throw e; };
  let threwR = false; try { r = await R.checkRedemptions({ force: true }); } catch { threwR = true; }
  ok(!threwR && r === 0 && calls.events.length === 2, "server error → no event, no crash");
  redApi = async () => ({ data: { redemptions: [{ redemptionId: "X9", offerId: "o9", redeemedAt: new Date(now).toISOString() }] } });
  await M.setConsent(false); redCalls.length = 0;
  ok((await R.checkRedemptions({ force: true })) === 0 && redCalls.length === 0, "'not now' → the server isn't even asked");
  await setup({ remote: false, consent: true }); R._test.reset();
  ok((await R.checkRedemptions({ force: true })) === 0 && redCalls.length === 0, "server switch off → not asked");
  await setup({ user: null }); R._test.reset();
  ok((await R.checkRedemptions({ force: true })) === 0 && redCalls.length === 0, "signed out → not asked");
  await setup({}); R._test.reset(); now = pkt("2026-10-27T18:00:00"); R._test.deps.now = () => now;
  r = await R.checkRedemptions({ force: true });
  ok(r === 0 && calls.events.length === 0 && /tdc_discount_redeemed/.test(store.get("tdc.metaQueue.v1.u1") || ""), "not asked yet → waits on the phone like every other event");

  ok(noPersonal(calls.events), "no name, email, phone, text or message in any of the new events");

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
