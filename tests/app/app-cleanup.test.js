// chore/app-cleanup: dead files and screens are gone and stay gone; console.log is stripped from production bundles.
//  1. Import scan: every file in app/src is imported by App.js or by a file that is (no file only dead files import).
//  2. Route scan: every registered screen is opened by something: a string naming it elsewhere in the app (navigate,
//     lists, links), a server push route / screen, or it is the first / initial screen of its navigator.
//  3. metro.config.js: terser drops console.log / info / debug in minified (production) bundles; warn / error stay.
//   node tests/app/app-cleanup.test.js
const fs = require("fs");
const path = require("path");
const Module = require("module");
const { APP, SERVER } = require("../paths");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 600) : ""}`); };

const list = (root, skip) => { const out = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!skip.test(f.name)) walk(p); } else if (/\.(js|jsx|ts|tsx)$/.test(f.name)) out.push(p); } }; walk(root); return out; };
const files = [...list(path.join(APP, "app/src"), /node_modules/), path.join(APP, "App.js")];
const rel = (f) => path.relative(APP, f).split(path.sep).join("/");
const src = Object.fromEntries(files.map((f) => [rel(f), fs.readFileSync(f, "utf8")]));

// ── 1. import scan (to a fixed point) ──
const importsOf = (f) => {
  const out = new Set();
  for (const m of src[f].matchAll(/(?:from\s*|require\(\s*|import\(\s*)['"](\.[^'"]+)['"]/g)) {
    const p = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]));
    for (const c of [p, p + ".js", p + ".jsx", p + ".ts", p + ".tsx", p + "/index.js"]) out.add(c);
  }
  return out;
};
const dead = new Set();
for (;;) {
  const imported = new Set();
  for (const f of Object.keys(src)) if (!dead.has(f)) for (const c of importsOf(f)) imported.add(c);
  const now = Object.keys(src).filter((f) => f !== "App.js" && !dead.has(f) && !imported.has(f));
  if (!now.length) break;
  now.forEach((f) => dead.add(f));
}
ok(Object.keys(src).length > 200, `files scanned (${Object.keys(src).length})`);
ok(dead.size === 0, "every app file is imported by the app (no dead files)", [...dead].join(", "));

// ── 2. route scan ──
const registered = new Map(); // name → files
for (const [f, s] of Object.entries(src)) for (const m of s.matchAll(/<\w+\.Screen\s[^>]*?\bname=\{?\s*["']([^"']+)["']/gs)) registered.set(m[1], [...(registered.get(m[1]) || []), f]);
const named = new Set();
for (const s of Object.values(src)) for (const m of s.replace(/<\w+\.Screen\s[^>]*?\/>/gs, "").matchAll(/["'`]([^"'`\n]{2,60})["'`]/g)) named.add(m[1]);
// first screen of a navigator without initialRouteName, and initialRouteName targets
const starts = new Set();
for (const s of Object.values(src)) {
  for (const m of s.matchAll(/<(\w+)\.Navigator\b([^>]*)>([\s\S]*?)<\/\1\.Navigator>/g)) {
    const init = /initialRouteName=\{?\s*["']([^"']+)["']/.exec(m[2]);
    if (init) starts.add(init[1]);
    else { const first = /<\w+\.Screen\s[^>]*?\bname=\{?\s*["']([^"']+)["']/.exec(m[3]); if (first) starts.add(first[1]); }
  }
}
const pushed = new Set();
if (fs.existsSync(path.join(SERVER, "server.js"))) {
  for (const f of list(SERVER, /node_modules|^tests$|scratch|uploads|reports|^\.git$/)) for (const m of fs.readFileSync(f, "utf8").matchAll(/(?:route|screen)\s*:\s*["']([^"']+)["']/g)) pushed.add(m[1]);
}
ok(pushed.size > 10, `server push routes read (${pushed.size})`);
const unreachable = [...registered.keys()].filter((n) => !named.has(n) && !starts.has(n) && !pushed.has(n));
ok(registered.size > 100, `registered screens (${registered.size})`);
ok(unreachable.length === 0, "every registered screen is opened by something (navigate / link / push / start screen)", unreachable.map((n) => `${n} <- ${registered.get(n).join(", ")}`).join("; "));
ok(starts.has("Splash"), "the start screen (Splash) counts as reachable");
const removed = ["FloatingMenu", "AccessibilityDisplay", "Why EduBoost", "StudentDashboard", "DeftGoat", "EventNotification", "CityScreen", "TDCFlow", "TravellingScreen", "Privacy", "VerificationScreen"];
ok(removed.every((n) => !registered.has(n)), "the screens nothing opened are no longer registered", removed.filter((n) => registered.has(n)).join(", "));
const gone = ["app/src/components/CareerHub.js", "app/src/screens/Social/FloatingMenu.js", "app/src/screens/Social/StoriesSection.js", "app/src/screens/PrivacyScreen.js", "app/src/screens/SplashScren.js", "app/src/screens/UpdateProfileScreen.js", "app/src/utils/notificationSound.js"];
ok(gone.every((f) => !fs.existsSync(path.join(APP, f))), "examples of removed files are gone", gone.filter((f) => fs.existsSync(path.join(APP, f))).join(", "));
ok(fs.existsSync(path.join(APP, "app/src/components/Privacy.js")) && fs.existsSync(path.join(APP, "app/src/screens/SignupVerifyScreen.js")) && fs.existsSync(path.join(APP, "app/src/screens/StudentDashboard.js")), "files still in use stay (Privacy, SignupVerify, StudentDashboard)");

// ── 3. console.log in production ──
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const metro = reqApp(path.join(APP, "metro.config.js"));
const compress = metro?.transformer?.minifierConfig?.compress || {};
const pure = compress.pure_funcs || [];
ok(["console.log", "console.info", "console.debug"].every((f) => pure.includes(f)), "production: console.log / info / debug are dropped by the minifier", JSON.stringify(pure));
ok(!pure.includes("console.warn") && !pure.includes("console.error") && compress.drop_console !== true, "…console.warn and console.error stay");
ok(String(metro?.transformer?.minifierPath || "").includes("terser"), "the minifier is terser (pure_funcs applies)", metro?.transformer?.minifierPath);
ok(compress.reduce_funcs === false && metro.transformer.minifierConfig.mangle, "Expo's own minifier settings are kept");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
