// Q-3i: every remote picture goes through ui/RemoteImage (expo-image: memory + disk cache, Cloudinary sizes).
// react-native's <Image> stays only for pictures bundled with the app (require(...)) and for a file just picked on
// the phone (the event payment receipt). A new <Image source={{ uri: … }}> anywhere else fails this test.
//   node tests/app/remote-images.test.js
const fs = require("fs");
const path = require("path");
const APP = require("../paths").APP;
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 400) : ""}`); };

// files whose react-native <Image source={{ uri }}> shows a file just picked on the phone (a preview before upload)
const LOCAL_FILE_OK = new Set([
  "screens/Events/RegisterSheet.js", // payment receipt
  "components/PaymentScreen.js", // payment receipt
  "screens/Events/Events.js", // event cover picked for a new event
  "screens/ProfileScreen.js", // new profile photo before upload
  "screens/skillshare/CreateListingScreen.js", // listing attachments before upload
  "screens/Social/ConfessionComposer.js", // confession photo before posting
]);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".js") ? [path.join(d, e.name)] : []));
const SRC = path.join(APP, "app/src");
const offenders = [];
let rnImageFiles = 0;
for (const f of walk(SRC)) {
  const s = fs.readFileSync(f, "utf8");
  if (!/import\s*\{[^}]*\bImage\b[^}]*\}\s*from\s*["']react-native["']/.test(s)) continue;
  rnImageFiles++;
  const rel = path.relative(SRC, f).split(path.sep).join("/");
  if (/<Image\b[^>]*source=\{\{\s*uri:/.test(s) && !LOCAL_FILE_OK.has(rel)) offenders.push(rel);
}
ok(rnImageFiles > 0, `files importing react-native's Image found (${rnImageFiles})`);
ok(offenders.length === 0, "no remote picture uses react-native's <Image> (RemoteImage instead)", offenders.join(", "));
const jd = fs.readFileSync(path.join(SRC, "screens/Career/JobDetails.js"), "utf8");
const sb = fs.readFileSync(path.join(SRC, "screens/SurpriseBoxes.js"), "utf8");
ok(/<RemoteImage source=\{\{ uri: job\.companyLogo \}\} size="logo"/.test(jd), "job details: the company logo is a RemoteImage (logo size)");
ok(/<RemoteImage source=\{\{ uri: photoUri\(l\.image\) \}\} size="card"/.test(sb) && /<RemoteImage source=\{\{ uri: photoUri\(listing\.image\) \}\} size="banner"/.test(sb), "surprise boxes: list and detail photos are RemoteImages (card / banner sizes)");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
