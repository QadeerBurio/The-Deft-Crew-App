// P5a (owner): one privacy contact, privacy@gettdc.pk, on every privacy screen. The Privacy Center showed
// info@gettdc.pk but opened a mail to info@thedeftcrew.com; the privacy policy said privacy@thedeftcrew.com.
//   node tests/app/privacy-contact.test.js
const fs = require("fs");
const path = require("path");
const APP = require("../paths").APP;
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 300) : ""}`); };
const read = (p) => fs.readFileSync(path.join(APP, "app/src", p), "utf8");
const ADDR = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g;

const center = read("components/Privacy.js");
ok(/export const PRIVACY_EMAIL = "privacy@gettdc\.pk";/.test(center), "Privacy Center: PRIVACY_EMAIL is privacy@gettdc.pk");
ok(center.includes("Linking.openURL(`mailto:${PRIVACY_EMAIL}`)"), "…the mail button opens a mail to it");
ok(center.includes(">{PRIVACY_EMAIL}</Text>"), "…and the address shown is the same one");
ok((center.match(ADDR) || []).every((a) => a === "privacy@gettdc.pk"), "…no other address on the screen", (center.match(ADDR) || []).join(", "));

const policy = read("screens/Social/PrivacyAndSafety.js");
ok((policy.match(ADDR) || []).join(",") === "privacy@gettdc.pk", "privacy policy (settings): contact is privacy@gettdc.pk only", (policy.match(ADDR) || []).join(", "));

// no privacy screen anywhere in the app still names an old privacy address
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".js") ? [path.join(d, e.name)] : []));
const old = walk(path.join(APP, "app/src")).filter((f) => /privacy@thedeftcrew\.com|info@thedeftcrew\.com|info@gettdc\.pk/.test(fs.readFileSync(f, "utf8")));
ok(old.length === 0, "no file in the app names privacy@thedeftcrew.com, info@thedeftcrew.com or info@gettdc.pk", old.join(", "));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
