// N-3 ask for notifications at a good moment (flag pushAskV2; upgrade/phase-n):
//   push/pushAsk.js: flag off → never shown; on: shown after a good moment when the phone hasn't allowed notifications
//     and the OS can still ask; "not now" → once more after 7 days, then never (Settings only); "turn on" → the OS
//     prompt + the token saved, never asked again; allowed or OS-denied phones → not shown
//   utils/pushNotifications.js: registerForPushNotificationsAsync({ prompt: false }) never shows the OS prompt
//   wiring (source): App.js asks on login only with the flag off; the sheet is mounted; the five good moments (3 deal
//     claims, a job application, a confession that isn't held); Settings shows PushPermissionRow and hides the old
//     warning only with the flag on
//   node tests/app/push-ask.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();

const store = new Map();
const AsyncStorage = { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, v); } };
let flag = false;
let perm = { status: "undetermined", canAskAgain: true };
let prompts = 0;
const Notifications = {
  getPermissionsAsync: async () => perm,
  requestPermissionsAsync: async () => { prompts++; return { status: "granted" }; },
  getExpoPushTokenAsync: async () => ({ data: "ExponentPushToken[x]" }),
  setNotificationChannelAsync: async () => {}, deleteNotificationChannelAsync: async () => {}, AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 }, AndroidNotificationVisibility: { PUBLIC: 1 },
};
const load = H.loader({
  "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage },
  "expo-notifications": Notifications,
  "../api/appFlags": { flagOn: async (n) => n === "pushAskV2" && flag },
});
const A = load(path.join(H.SRC, "push", "pushAsk.js"));

(async () => {
  const shown = [];
  A.onPushAsk((x) => shown.push(x));
  const DAY = 24 * 3600e3;
  const t0 = Date.UTC(2026, 10, 22, 12);

  console.log("-- flag off");
  ok((await A.pushMoment("deal", { now: t0 })) === false && shown.length === 0, "flag off: no sheet (login asks, as today)");

  console.log("-- flag on");
  flag = true;
  ok((await A.pushMoment("party", { now: t0 })) === false, "an unknown moment: nothing");
  ok((await A.pushMoment("deal", { now: t0 })) === true && shown.length === 1 && shown[0].reason === "we'll tell you when a deal near you drops", "first deal claimed: the sheet with the deal reason", JSON.stringify(shown));
  ok((await A.pushMoment("job", { now: t0 })) === false && shown.length === 1, "…not twice while it's open");
  await A.answer("not_now", { now: t0 });
  ok((await A.pushMoment("job", { now: t0 + 6 * DAY })) === false, "'not now': not again within 7 days");
  ok((await A.pushMoment("confession", { now: t0 + 7 * DAY })) === true && shown[1].reason === "know when someone replies", "…once more after 7 days (confession reason)");
  await A.answer("not_now", { now: t0 + 7 * DAY });
  ok((await A.pushMoment("job", { now: t0 + 60 * DAY })) === false, "'not now' twice: never again from a moment (Settings only)");

  store.clear(); A._test.reset(); A.onPushAsk((x) => shown.push(x));
  ok((await A.pushMoment("job", { now: t0 })) === true && shown[shown.length - 1].reason === "hear back from employers first", "first job applied: the job reason");
  const calls = [];
  const res = await A.answer("on", { register: async () => { calls.push("register"); return "ExponentPushToken[x]"; }, save: async (t) => { calls.push(`save:${t}`); }, now: t0 });
  ok(res.granted && calls.join(",") === "register,save:ExponentPushToken[x]", "'turn on': the OS prompt, then the token is saved");
  perm = { status: "undetermined", canAskAgain: true };
  ok((await A.pushMoment("deal", { now: t0 + 30 * DAY })) === false, "…and it's never asked again from a moment");

  store.clear(); A._test.reset(); A.onPushAsk((x) => shown.push(x));
  perm = { status: "granted", granted: true };
  ok((await A.pushMoment("deal", { now: t0 })) === false, "already allowed: no sheet");
  perm = { status: "denied", canAskAgain: false };
  ok((await A.pushMoment("deal", { now: t0 })) === false, "the OS said no: no sheet (Settings shows 'turn on in settings')");
  A._test.reset();
  perm = { status: "undetermined", canAskAgain: true };
  ok((await A.pushMoment("deal", { now: t0 })) === false, "no sheet mounted (signed out, guest): nothing");

  console.log("-- login registration");
  const P = H.loader({
    "expo-notifications": Notifications,
    "expo-device": { isDevice: true },
    "expo-constants": { __esModule: true, default: { expoConfig: { extra: { eas: { projectId: "p" } } } } },
    "react-native": { Platform: { OS: "android" } },
    "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage },
    "./jobRoutes": { jobTarget: () => null },
    "../navigation/routes": { navigateAnywhere: () => {}, pathTo: () => [] },
  })(path.join(H.SRC, "utils", "pushNotifications.js"));
  prompts = 0;
  perm = { status: "undetermined", canAskAgain: true };
  let t = await P.registerForPushNotificationsAsync({ prompt: false });
  ok(t === null && prompts === 0, "prompt: false and not allowed yet → no OS prompt, no token");
  perm = { status: "granted" };
  t = await P.registerForPushNotificationsAsync({ prompt: false });
  ok(t === "ExponentPushToken[x]" && prompts === 0, "prompt: false and already allowed → the token, as before");
  perm = { status: "undetermined", canAskAgain: true };
  t = await P.registerForPushNotificationsAsync();
  ok(t === "ExponentPushToken[x]" && prompts === 1, "no argument (flag off): the OS prompt, as today");

  console.log("-- wiring");
  const app = H.read("App.js");
  ok(/const askLater = await flagOn\("pushAskV2"\)\.catch\(\(\) => false\);\s*\n\s*expoPushToken = await registerForPushNotificationsAsync\(askLater \? \{ prompt: false \} : undefined\);/.test(app), "App.js: login asks only with the flag off (or unknown)");
  ok(/<PushAskHost \/>/.test(app) && /import PushAskHost from "\.\/app\/src\/push\/PushAskHost";/.test(app), "App.js: the sheet is mounted");
  const sites = [["app/src/screens/BrandOffersScreen.js", "deal"], ["app/src/screens/MyDiscountScreen.js", "deal"], ["app/src/screens/OfferScreen.js", "deal"], ["app/src/screens/Career/JobApplicationForm.js", "job"]];
  for (const [f, kind] of sites) ok(new RegExp(`(offerClaimed|jobApplied)\\(\\w+\\);\\s*\\n\\s*pushMoment\\("${kind}"\\);`).test(H.read(f)), `${f.split("/").pop()}: pushMoment("${kind}") right after the success`);
  ok(/metaEvents\.confessionCreated\(\);[^\n]*\n\s*if \(!result\?\.held\) pushMoment\("confession"\);/.test(H.read("app/src/screens/Social/ConfessionScreen.js")), "ConfessionScreen: pushMoment(\"confession\") after a post that isn't held");
  const settings = H.read("app/src/engagement/screens/NotificationSettingsScreen.js");
  ok(/<PushPermissionRow \/>\s*\n\s*\{!askOn && osPermission === 'denied' && \(/.test(settings), "Settings: PushPermissionRow; the old warning only with the flag off");
  const row = H.read("app/src/push/PushPermissionRow.js");
  ok(/if \(!on \|\| !perm \|\| perm\.status === "granted"/.test(row) && /Linking\.openSettings\(\)/.test(row) && /"turn on in settings"/.test(row), "PushPermissionRow: nothing when off or allowed; 'turn on in settings' opens the phone's settings");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
