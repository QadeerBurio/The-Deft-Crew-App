// iOS Meta attribution without App Tracking Transparency (feat/ios-meta-attribution):
// - the prebuild (expo config, introspected with placeholder Meta IDs): Meta's SKAdNetwork IDs in Info.plist,
//   NSUserTrackingUsageDescription in plain words, the SDK's native defaults off (identifiers and automatic logging
//   are decided by the app at runtime), and nothing turns the SDK's SKAdNetwork reporting off
// - plugins/withMetaAttribution.js: the SKAdNetwork IDs (once, lower case) and the AEM deep-link line in Expo's Swift
//   AppDelegate (once; an unknown AppDelegate is left alone)
// - events use Meta's standard names where one exists; AEM is left to the SDK (no second AEMReporter call)
// - the server sends nothing to Meta (no Conversions API): nothing about a student reaches Meta from the server
// - the value moments that let the pre-screen show (job opened, offer claimed, discount redeemed) are wired
//   node tests/app/meta-attribution.test.js
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const APP = require("../paths").APP;
const SERVER = process.env.TDC_SERVER_DIR || path.resolve(APP, "..", "server");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 400) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8");
const META_IDS = ["v9wttpbfk9.skadnetwork", "n38lu8286q.skadnetwork"];

console.log("── the prebuild: Info.plist");
let cfg = null;
try {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const out = execFileSync(npx, ["expo", "config", "--type", "introspect", "--json"], {
    cwd: APP, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 240000, shell: process.platform === "win32",
    env: { ...process.env, META_APP_ID: "1234567890", META_CLIENT_TOKEN: "placeholder-token-for-tests" },
  });
  cfg = JSON.parse(out.slice(out.indexOf("{")));
} catch (e) {
  ok(false, "expo config --type introspect runs", String(e.stderr || e.message).slice(0, 300));
}
if (cfg) {
  const ip = cfg.ios?.infoPlist || {};
  const ids = (ip.SKAdNetworkItems || []).map((i) => i.SKAdNetworkIdentifier);
  ok(META_IDS.every((id) => ids.includes(id)), "Meta's SKAdNetwork IDs are in Info.plist (v9wttpbfk9, n38lu8286q)", JSON.stringify(ids));
  ok(ids.length === new Set(ids).size, "…each once (our plugin and the SDK's don't add duplicates)", JSON.stringify(ids));
  ok(/^tdc uses this to show you better student deals in ads on other apps, and to know which of our ads brought you here\.$/.test(ip.NSUserTrackingUsageDescription || ""), "NSUserTrackingUsageDescription in plain words", ip.NSUserTrackingUsageDescription);
  ok(ip.FacebookAdvertiserIDCollectionEnabled === false && ip.FacebookAutoLogAppEventsEnabled === false && ip.FacebookAutoInitEnabled === false, "native defaults off: no advertising ID or logging before the app decides at runtime", JSON.stringify({ a: ip.FacebookAdvertiserIDCollectionEnabled, l: ip.FacebookAutoLogAppEventsEnabled, i: ip.FacebookAutoInitEnabled }));
  ok(!Object.keys(ip).some((k) => /SKAdNetworkReportEnabled/i.test(k) && ip[k] === false), "the SDK's SKAdNetwork reporting isn't turned off (it's on by default: conversion values for sign-up and first redemption)");
  ok(cfg.version === "1.2.1", "ships as 1.2.1 (a new native build: new runtime version)", cfg.version);
}

console.log("── plugins/withMetaAttribution.js");
const plugin = require(path.join(APP, "plugins/withMetaAttribution.js"));
const plist = plugin.addSkAdNetworkIds({ SKAdNetworkItems: [{ SKAdNetworkIdentifier: "V9WTTPBFK9.skadnetwork" }, { SKAdNetworkIdentifier: "cstr6suwn9.skadnetwork" }] });
ok(JSON.stringify(plist.SKAdNetworkItems.map((i) => i.SKAdNetworkIdentifier)) === JSON.stringify(["V9WTTPBFK9.skadnetwork", "cstr6suwn9.skadnetwork", "n38lu8286q.skadnetwork"]), "adds only the missing Meta ID, keeps other networks' IDs, no duplicate (case-insensitive)", JSON.stringify(plist.SKAdNetworkItems));
const EXPO_APPDELEGATE = `import Expo
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }
}
`;
const once = plugin.addAemDeepLink(EXPO_APPDELEGATE);
ok(once.changed && /^import Expo\nimport FBSDKCoreKit$/m.test(once.contents) && /\n    _ = ApplicationDelegate\.shared\.application\(app, open: url, options: options\)\n    return super\.application\(app, open: url, options: options\)/.test(once.contents), "AEM: the opening URL goes to the Meta SDK first, then Expo / React Native handle it as before", once.contents);
const twice = plugin.addAemDeepLink(once.contents);
ok(!twice.changed && twice.contents === once.contents, "…added once (a second prebuild doesn't add it again)");
const odd = plugin.addAemDeepLink("import UIKit\nclass AppDelegate {}\n");
ok(!odd.changed && odd.contents === "import UIKit\nclass AppDelegate {}\n", "an AppDelegate it doesn't recognise is left exactly as it is");
const appConfig = read("app.config.js");
ok(appConfig.includes('"./plugins/withMetaAttribution"') && /isAutoInitEnabled: false/.test(appConfig) && /advertiserIDCollectionEnabled: false/.test(appConfig), "app.config.js: the plugin runs with the Meta SDK; auto init and advertising ID stay off natively");

console.log("── events: standard names; AEM left to the SDK");
const ev = read("app/src/analytics/metaEvents.js");
ok(/CompletedRegistration \|\| "fb_mobile_complete_registration"/.test(ev) && /SubmitApplication \|\| "SubmitApplication"/.test(ev) && /CompletedTutorial \|\| "fb_mobile_tutorial_completion"/.test(ev), "sign-up, job application and tutorial use Meta's standard event names");
ok(/setAutoLogAppEventsEnabled\(true\)/.test(ev) && /initializeSDK\(\)/.test(ev), "install and fb_mobile_activate_app come from the SDK's automatic logging");
const appSrc = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? appSrc(path.join(dir, d.name)) : d.name.endsWith(".js") ? [path.join(dir, d.name)] : []));
const files = appSrc(path.join(APP, "app/src"));
ok(!files.some((f) => /AEMReporterIOS|logAEMEvent/.test(fs.readFileSync(f, "utf8"))), "no second AEM recording (the SDK records AEM for the events it logs: no double counting)");
ok(!files.some((f) => /graph\.facebook\.com|facebook\.com\/tr\b/.test(fs.readFileSync(f, "utf8"))), "the app never calls Meta's servers itself (only through the SDK)");
ok(!/setUserID\(/.test(ev) && /setUserData\?\.\(matching \?/.test(ev) && /const matching = matchingAllowed\(\) && state\.matching/.test(ev) && /const matchingAllowed = \(\) => \(isIOS\(\) \? iosIdsAllowed\(\) : active\(\) && !!state\.userId && state\.ids === "allowed"\);/.test(ev) && /const iosIdsAllowed = \(\) => active\(\) && !!state\.userId && state\.ids === "allowed" && state\.tracking === "granted";/.test(ev), "advanced matching only after 'continue' (and Apple's Allow on iPhone); never a user id");
  ok(/const adIdAllowed = \(\) => \(isIOS\(\) \? iosIdsAllowed\(\) : active\(\) && !idsDeclined\(\)\);/.test(ev), "advertising ID: iPhone only with 'continue' + Apple's Allow; Android on unless the student said no");

console.log("── the server: no Conversions API");
const serverFiles = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? (["node_modules", "tests", ".git", "chat-service", "uploads"].includes(d.name) ? [] : serverFiles(path.join(dir, d.name))) : d.name.endsWith(".js") ? [path.join(dir, d.name)] : [])) : [];
const sf = serverFiles(SERVER);
ok(sf.length > 50, `the server code is here to check (${sf.length} files)`, SERVER);
const meta = sf.filter((f) => /graph\.facebook\.com|facebook\.com\/tr\b|\/events\?access_token|conversions?[-_ ]?api|business\.facebook|fbevents/i.test(fs.readFileSync(f, "utf8")));
ok(meta.length === 0, "the server sends nothing to Meta (no Conversions API): no email, phone or other identifier of a student leaves the server for Meta, whatever they chose", meta.map((f) => path.relative(SERVER, f)).join(", "));

console.log("── value moments (the pre-screen waits for one)");
ok(/markValue\("offer_claimed"\)\.then\(\(\) => log\(/.test(ev) && /await markValue\("discount_redeemed"\);/.test(ev), "an offer claimed or a discount redeemed counts as value");
ok(/meta\.markValue\?\.\("job_view"\)/.test(read("app/src/screens/Career/JobDetails.js")), "a job opened (JobDetails loaded) counts as value");
ok(/export const shouldShowPrescreen = \(\{ onboardingDone \}\) =>\s*metaAvailable\(\) && measurementOn\(\) && !!state\.userId && state\.ids == null && !!state\.value && onboardingDone === true;/.test(ev), "the pre-screen needs: Meta on, measurement on, a student, not answered, value seen, onboarding done");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
