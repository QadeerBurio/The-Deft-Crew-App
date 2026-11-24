// P5a (owner): the settings "privacy & safety" screen no longer shows switches that did nothing (private account, show
// online status, show last seen: on-screen state only, never saved or honoured). The rest of the screen stays.
//   node tests/app/privacy-toggles.test.js
const fs = require("fs");
const path = require("path");
const APP = require("../paths").APP;
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 300) : ""}`); };

const src = fs.readFileSync(path.join(APP, "app/src/screens/Social/SettingItem.js"), "utf8");
const start = src.indexOf("const PrivacyAndSafetyScreen");
const screen = src.slice(start, src.indexOf("\n};", start));
ok(start > 0, "the privacy & safety screen is still there");
for (const gone of ['label="private account"', 'label="show online status"', 'label="show last seen"', "isPrivate", "showOnlineStatus", "showLastSeen", '"privacy controls"'])
  ok(!screen.includes(gone), `no ${gone}`);
for (const kept of ['title="safety"', 'label="blocked users"', 'label="report history"', 'title="help"', 'title="legal"', 'label="privacy policy"', 'label="terms & conditions"', 'label="community guidelines"'])
  ok(screen.includes(kept), `keeps ${kept}`);
// no other screen offers the same do-nothing switches
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".js") ? [path.join(d, e.name)] : []));
const other = walk(path.join(APP, "app/src")).filter((f) => /label=["']show (online status|last seen)["']|label=["']private account["']/.test(fs.readFileSync(f, "utf8")));
ok(other.length === 0, "no screen in the app shows these switches", other.join(", "));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
