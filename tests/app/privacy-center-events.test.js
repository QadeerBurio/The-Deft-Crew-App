// The Privacy Center's "Ad measurement" names every activity the app sends to Meta: the SDK's install and app opens
// and each event in app/src/analytics/metaEvents.js (17 in all), in the same words as gettdc.pk/privacy, and says the
// install is counted when the app first connects (the SDK starts once the server's switch is read).
//   node tests/app/privacy-center-events.test.js
const fs = require("fs");
const path = require("path");
const APP = require("../paths").APP;
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 600) : ""}`); };

const privacy = fs.readFileSync(path.join(APP, "app/src/components/Privacy.js"), "utf8");
const events = fs.readFileSync(path.join(APP, "app/src/analytics/metaEvents.js"), "utf8");
const LIST = "the install (counted when the app first connects), app opens, sign-up, finishing the app tour, offer claims, discounts redeemed, job applications, AI resumes, event registrations, scholarship applications, new posts, new confessions, likes and comments, AI chat use, travel assistant use, new skillshare listings and new skillshare offers";

ok(privacy.includes(LIST), "the Privacy Center lists the 17 activities in the website's words");
ok(!/first time you open the app/.test(privacy), "…and no longer says the install is counted the first time you open the app");
ok(/never what you wrote/.test(privacy), "…never what you wrote");

// each event the code sends has its words in the list (a new event fails this test until the text names it)
const block = events.slice(events.indexOf("export const metaEvents = {"), events.indexOf("\n};", events.indexOf("export const metaEvents = {")));
const sent = [...block.matchAll(/^\s{2}(\w+): (?:async )?\(/gm)].map((m) => m[1]);
const WORDS = {
  registration: "sign-up", offerClaimed: "offer claims", jobApplied: "job applications", aiResumeCreated: "AI resumes",
  onboardingCompleted: "finishing the app tour", eventRegistered: "event registrations", scholarshipApplied: "scholarship applications",
  discountRedeemed: "discounts redeemed", postCreated: "new posts", confessionCreated: "new confessions", socialEngaged: "likes and comments",
  aiChatUsed: "AI chat use", travelAssistantUsed: "travel assistant use", skillshareListingCreated: "new skillshare listings",
  skillshareOfferCreated: "new skillshare offers",
};
ok(sent.length === 15, "the code sends 15 events of its own (plus the SDK's install and app opens: 17)", sent.join(", "));
const missing = sent.filter((n) => !WORDS[n] || !LIST.includes(WORDS[n]));
ok(missing.length === 0, "every event the code sends is named in the list", missing.join(", "));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
