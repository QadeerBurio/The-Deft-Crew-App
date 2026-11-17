// Android Meta config from prebuild (fix/android-prebuild):
//   - .easignore keeps /android and /ios out of EAS uploads (EAS prebuilds from app.json / app.config.js)
//   - plugins/withAndroidAdIdDefault.js: with the Meta entries present, AdvertiserIDCollectionEnabled becomes "true" and
//     the AD_ID permission is declared; without them nothing changes; listed before the Meta plugin in app.config.js
//     (Expo runs the manifest changes last-listed first)
//   - app.json declares AD_ID and doesn't block it; the old docs about a hand-maintained android/ are gone
//   node tests/app/android-ad-id-default.test.js
const fs = require("fs");
const path = require("path");
const Module = require("module");
const APP = require("../paths").APP;
const reqApp = Module.createRequire(path.join(APP, "package.json"));
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 600) : ""}`); };

const easignore = fs.readFileSync(path.join(APP, ".easignore"), "utf8").split(/\r?\n/).map((l) => l.trim());
ok(easignore.includes("/android") && easignore.includes("/ios"), ".easignore keeps /android and /ios out: EAS prebuilds");

const plugin = reqApp(path.join(APP, "plugins/withAndroidAdIdDefault.js"));
const manifest = (metas = [], perms = []) => ({ manifest: { "uses-permission": perms.map((n) => ({ $: { "android:name": n } })), application: [{ $: { "android:name": ".MainApplication" }, "meta-data": metas.map(([n, v]) => ({ $: { "android:name": n, "android:value": v } })) }] } });
const meta = (m, n) => m.manifest.application[0]["meta-data"].find((x) => x.$["android:name"] === n)?.$["android:value"];
const perm = (m, n) => m.manifest["uses-permission"].some((x) => x.$["android:name"] === n);

let m = plugin.setAdIdDefault(manifest([["com.facebook.sdk.ApplicationId", "@string/facebook_app_id"], ["com.facebook.sdk.AdvertiserIDCollectionEnabled", "false"]]));
ok(meta(m, "com.facebook.sdk.AdvertiserIDCollectionEnabled") === "true", "with the Meta entries: ad-ID collection turned ON");
ok(perm(m, "com.google.android.gms.permission.AD_ID"), "…and the AD_ID permission declared");
m = plugin.setAdIdDefault(manifest([["com.facebook.sdk.ApplicationId", "@string/facebook_app_id"]], ["com.google.android.gms.permission.AD_ID"]));
ok(meta(m, "com.facebook.sdk.AdvertiserIDCollectionEnabled") === "true" && m.manifest["uses-permission"].length === 1, "missing entry: added as true; the permission isn't added twice");
m = plugin.setAdIdDefault(manifest([["expo.modules.updates.EXPO_UPDATE_URL", "x"]]));
ok(meta(m, "com.facebook.sdk.AdvertiserIDCollectionEnabled") === undefined && !perm(m, "com.google.android.gms.permission.AD_ID"), "without the Meta SDK (no IDs at build): nothing changes");

const cfg = fs.readFileSync(path.join(APP, "app.config.js"), "utf8");
const iPlugin = cfg.indexOf('"./plugins/withAndroidAdIdDefault"');
const iMeta = cfg.indexOf('"react-native-fbsdk-next"');
ok(iPlugin > 0 && iMeta > 0 && iPlugin < iMeta, "app.config.js lists it before the Meta plugin (so it runs after it)");
ok(/advertiserIDCollectionEnabled: false/.test(cfg), "the Meta plugin itself keeps false (iOS default: Apple's Allow first)");

const appJson = JSON.parse(fs.readFileSync(path.join(APP, "app.json"), "utf8")).expo;
ok((appJson.android.permissions || []).includes("com.google.android.gms.permission.AD_ID") && !(appJson.android.blockedPermissions || []).includes("com.google.android.gms.permission.AD_ID"), "app.json declares AD_ID and doesn't block it");
ok(!fs.existsSync(path.join(APP, "docs/native-patches")), "the old hand-maintained android/ docs and patches are gone");
ok(/prebuild/.test(fs.readFileSync(path.join(APP, "docs/android-native.md"), "utf8")), "docs/android-native.md says Android is prebuilt");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
