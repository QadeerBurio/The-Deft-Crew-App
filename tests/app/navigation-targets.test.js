// Every navigation target in the app is a registered route: each literal navigate / push / replace / jumpTo on a
// navigation object (navigation, nav, navigationRef, props.navigation, a destructured navigate), and each nested
// { screen: "Y" } passed with it, names a <X.Screen name="..."> registered somewhere in app/src. A button that points
// at a route nobody registered does nothing when tapped (the old floating menu, settings' privacy links).
//   node tests/app/navigation-targets.test.js
const fs = require("fs");
const path = require("path");
const APP = require("../paths").APP;
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 600) : ""}`); };

const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.js$/.test(f.name)) files.push(p); } };
walk(path.join(APP, "app", "src"));
files.push(path.join(APP, "App.js"));
const rel = (f) => path.relative(APP, f).split(path.sep).join("/");
const src = files.map((f) => [rel(f), fs.readFileSync(f, "utf8")]);

// registered routes: <Stack.Screen name="X" ...>, <Tab.Screen ...>, <Drawer.Screen ...> (names may have spaces)
const registered = new Set();
for (const [, s] of src) for (const m of s.matchAll(/<\w+\.Screen\s[^>]*?\bname=\{?\s*["']([^"']+)["']/gs)) registered.add(m[1]);

// targets: calls on a navigation object, or a bare navigate( from useNavigation
const CALL = /(?:\b(?:navigation|nav|navigationRef(?:\.current)?|props\.navigation)\s*\??\.\s*(?:navigate|push|replace|jumpTo)|(?<![.\w])navigate)\s*\??\.?\(\s*["']([^"']+)["']\s*(?:,\s*\{\s*screen\s*:\s*["']([^"']+)["'])?/g;
const targets = [];
for (const [f, s] of src) s.split("\n").forEach((line, i) => {
  if (/^\s*(\/\/|\*)/.test(line)) return; // comments
  for (const m of line.matchAll(CALL)) {
    targets.push({ name: m[1], where: `${f}:${i + 1}` });
    if (m[2]) targets.push({ name: m[2], where: `${f}:${i + 1} (nested screen)` });
  }
});

ok(registered.size > 100, `routes registered in app/src (${registered.size})`);
ok(targets.length > 60, `navigation targets found (${targets.length})`);
// a name built at run time (`${route}`) is checked where it's built, not here
const missing = targets.filter((t) => !t.name.includes("${") && !registered.has(t.name));
ok(missing.length === 0, "every navigation target is a registered route", missing.map((t) => `${t.name} <- ${t.where}`).join("; "));
// the specific dead links fixed in fix/app-dead-links
const seen = (n) => targets.some((t) => t.name === n);
ok(seen("Privacy Policy") && seen("Terms & Conditions") && !seen("PrivacyPolicy") && !seen("TermsAndConditions"), "settings: privacy policy and terms open the registered screens");
ok(seen("FAQ") && registered.has("FAQ"), "settings: help & FAQ opens the FAQ screen");
ok(!seen("EditProfile") && seen("EditProfileScreen"), "own profile: edit opens EditProfileScreen");
ok(!seen("FounderApply") && seen("FounderCircle"), "points: the founder tier opens FounderCircle");
ok(!registered.has("EnhancedCareer") && !fs.existsSync(path.join(APP, "app/src/screens/Resume/EnhanceCareer.js")), "Enhance Career is retired (no screen, no route)");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
