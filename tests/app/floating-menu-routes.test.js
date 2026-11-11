// The floating menu's buttons (app/src/screens/Social/FloatingMenu.js) open registered screens: every target is a
// route registered in app/src/navigation, and a { name, params: { screen } } target names a registered navigator
// route and a screen registered in it. Career opens the jobs list (recommended jobs and invites at its top).
//   node tests/app/floating-menu-routes.test.js
const fs = require("fs");
const path = require("path");
const APP = require("../paths").APP;
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 300) : ""}`); };

const navDir = path.join(APP, "app/src/navigation");
const navSrc = fs.readdirSync(navDir).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(navDir, f), "utf8")).join("\n");
// every route name registered with <X.Screen name="..."> (same line or the next lines)
const registered = new Set([...navSrc.matchAll(/<\w+\.Screen\s+[^>]*?name=\{?["']([A-Za-z0-9_]+)["']/gs)].map((m) => m[1]));
const menu = fs.readFileSync(path.join(APP, "app/src/screens/Social/FloatingMenu.js"), "utf8");
const calls = [...menu.matchAll(/renderMiniBtn\(\s*\w+\s*,\s*'[^']*'\s*,\s*'([^']*)'\s*,\s*('([^']*)'|\{\s*name:\s*'([^']*)'\s*,\s*params:\s*\{\s*screen:\s*'([^']*)'\s*\}\s*\})/g)]
  .map((m) => ({ label: m[1], name: m[3] || m[4], screen: m[5] || null }));

ok(registered.size > 50, `routes found in app/src/navigation (${registered.size})`);
ok(calls.length === 4, "four menu buttons found", calls.map((c) => c.label).join(", "));
for (const c of calls) {
  ok(registered.has(c.name), `"${c.label}" → ${c.name}${c.screen ? ` › ${c.screen}` : ""}: ${c.name} is a registered route`);
  if (c.screen) ok(registered.has(c.screen), `"${c.label}" → its nested screen ${c.screen} is registered`);
}
ok(calls.find((c) => c.label === "Career")?.name === "Career", "Career opens the jobs list (the Career screen), not the unregistered CareerHub");
ok(!registered.has("CareerHub") && !registered.has("Traveling"), "(CareerHub and Traveling are not routes: the old targets were dead)");
ok(/<Stack\.Screen name="HomeTabs" component=\{HomeTabsScreen\} \/>/.test(navSrc) && /<Tab\.Screen name="Campus"/.test(navSrc), "Learn: Campus is a tab inside the HomeTabs route, so it is opened through HomeTabs");
ok(/typeof target === "string" \? navigation\.navigate\(target\) : navigation\.navigate\(target\.name, target\.params\)/.test(menu), "the button navigates with the name and params of a nested target");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
