// iOS pickers and safe areas (fix/ios-pickers-and-safe-area): the booking and event-registration date /
// time pickers are readable on iOS (light variant, ink text, while app.json keeps the dark system style)
// and close with a "done" button; Android keeps its system dialog; no screen uses React Native's
// SafeAreaView (it does nothing on Android with edge-to-edge).
//   node tests/app/ios-pickers.test.js
const fs = require("fs");
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();

const norm = (rel) => H.read(rel).replace(/\r\n/g, "\n");
for (const [rel, closeCall, label] of [
  ["app/src/components/BookingScreen.js", "setShowDatePicker(false)", "booking travel date"],
  ["app/src/screens/Events/RegisterSheet.js", "setPicker(false)", "event date / time"],
]) {
  const s = norm(rel);
  const pick = s.slice(s.indexOf("<DateTimePicker"), s.indexOf("/>", s.indexOf("<DateTimePicker")));
  ok(/themeVariant="light"/.test(pick) && /textColor=\{T\.ink\}/.test(pick), `${label}: light picker with ink text (readable under the dark system style)`);
  ok(/display=\{Platform\.OS === ['"]ios['"] \? ['"]spinner['"] : ['"]default['"]\}/.test(pick), `${label}: iOS spinner, Android system dialog`);
  const sheet = s.slice(s.lastIndexOf("iosPickerSheet", s.indexOf("<DateTimePicker")) - 200, s.indexOf("<DateTimePicker"));
  ok(/Platform\.OS === ['"]ios['"] && \(/.test(sheet) && sheet.includes(`onPress={() => ${closeCall}}`) && /accessibilityLabel=/.test(sheet) && />done</.test(sheet), `${label}: a "done" button closes the iOS picker`);
  ok(/iosPickerDone: \{ minHeight: 44, minWidth: 64/.test(s), `${label}: the done button is at least 44 pt`);
}
ok(/setPicker\(Platform\.OS === "ios"\); \/\/ iOS: stays until "done"; Android: the dialog closed/.test(norm("app/src/screens/Events/RegisterSheet.js")), "Android: the picker closes after a choice, as before");
ok(JSON.parse(H.read("app.json")).expo.userInterfaceStyle === "dark", "app.json userInterfaceStyle unchanged (dark)");

// no React Native SafeAreaView anywhere in the app
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith(".js")) files.push(p); } })(H.SRC);
const rnSafe = files.filter((f) => {
  const s = fs.readFileSync(f, "utf8");
  return [...s.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]react-native['"]/g)].some((m) => /\bSafeAreaView\b/.test(m[1]));
}).map((f) => path.relative(H.APP, f));
ok(rnSafe.length === 0, "no screen imports SafeAreaView from react-native (Payment, Report and the resume screens use react-native-safe-area-context)", rnSafe.join(", "));
done();
