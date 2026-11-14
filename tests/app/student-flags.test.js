// Student feature flags in the app (fix/student-features): one copy of GET /api/app/flags/me, asked on login, on app
// open and when the app comes back to the foreground (at most once a minute); a failed request never switches a
// feature off; cleared on logout and when the app version changes; cards re-render when flags change; with a flag on
// the Surprise Box card shows an empty state ("no boxes in <city> today" + "all cities"), with it off nothing.
//   node tests/app/student-flags.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  console.log("── the shared flags (api/appFlags.js)");
  const store = { token: "tok-a", isGuest: null };
  const AsyncStorage = {
    getItem: async (k) => (k in store ? store[k] : null),
    setItem: async (k, v) => { store[k] = v; },
    removeItem: async (k) => { delete store[k]; },
  };
  let answer = { surplusBoxes: true, loyaltyV2: true, careerMatching: true };
  let fail = false; const calls = [];
  const api = { get: async (url) => { calls.push(url); if (fail) throw Object.assign(new Error("timeout of 15000ms exceeded"), { code: "ECONNABORTED" }); return { data: { ...answer } }; } };
  const load = H.loader({ "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage }, "./api": { __esModule: true, default: api } });
  const F = load(path.join(H.SRC, "api/appFlags.js"));
  const realNow = Date.now; let now = realNow(); Date.now = () => now;
  const warn = console.warn; console.warn = () => {};

  ok((await F.flagOn("surplusBoxes")) === true && calls.length === 1, "signed in: asked once, feature on");
  ok((await F.flagOn("loyaltyV2")) === true && calls.length === 1, "a second feature: no second request");
  store.isGuest = "true";
  ok((await F.flagOn("surplusBoxes")) === false, "guest: off");
  store.isGuest = null;

  // a failure keeps what was known
  now += 6 * 60 * 1000; fail = true;
  ok((await F.flagOn("surplusBoxes")) === true, "the server times out later: the feature stays on (the last answer is kept)");
  fail = false;

  // login: another account is asked at once
  store.token = "tok-b"; answer = { surplusBoxes: false };
  calls.length = 0;
  await F.refreshFlags({ force: true });
  ok(calls.length === 1 && (await F.flagOn("surplusBoxes")) === false, "login as another account: asked at once, its own answer");

  // foreground: at most once a minute
  const listeners = [];
  const AppState = { currentState: "active", addEventListener: (ev, fn) => { listeners.push(fn); return { remove() {} }; } };
  calls.length = 0;
  const stop = F.watchFlags(AppState, "1.2.0");
  await H.tick(5);
  ok(calls.length === 1, "app open: asked (watchFlags)");
  listeners[0]("background"); listeners[0]("active");
  await H.tick(5);
  ok(calls.length === 1, "back in the foreground within a minute: not asked again");
  now += 61 * 1000; answer = { surplusBoxes: true };
  listeners[0]("background"); listeners[0]("active");
  await H.tick(5);
  ok(calls.length === 2 && (await F.flagOn("surplusBoxes")) === true, "back in the foreground after a minute: asked again, and the new answer shows");
  stop();

  // nothing known + a failure: off for now, asked again a few seconds later (not cached as off)
  F._test.reset(); store.token = "tok-c"; fail = true; calls.length = 0;
  delete store["appFlags:v2"];
  ok((await F.flagOn("surplusBoxes")) === false, "first request fails: off for now");
  ok((await F.flagOn("surplusBoxes")) === false && calls.length === 1, "…not asked again within 5 s");
  now += 6000; fail = false; answer = { surplusBoxes: true };
  ok((await F.flagOn("surplusBoxes")) === true && calls.length === 2, "…asked again after 5 s: on (a failure is never cached as off)");

  // subscribe: cards re-render on a new answer
  let heard = null; const off = F.subscribeFlags((f) => (heard = f));
  answer = { surplusBoxes: false };
  await F.refreshFlags({ force: true });
  ok(heard && heard.surplusBoxes === false, "listeners hear a new answer");
  off();

  // kept on the phone per account and app version
  answer = { surplusBoxes: true };
  await F.refreshFlags({ force: true });
  const saved = JSON.parse(store["appFlags:v2"] || "null");
  ok(saved && saved.version === "1.2.0" && saved.flags.surplusBoxes === true && !JSON.stringify(saved).includes("tok-c"), "saved on the phone with the app version (never the token)");
  F._test.reset(); fail = true;
  ok((await F.refreshFlags()) && F.knownFlag("surplusBoxes") === true, "next open, server unreachable: the saved answer shows at once");
  // a new app version: the saved flags are dropped
  F._test.reset();
  const stop2 = F.watchFlags({ currentState: "active", addEventListener: () => ({ remove() {} }) }, "1.2.1");
  await H.tick(5);
  ok(F.knownFlag("surplusBoxes") === null && !store["appFlags:v2"], "after an app update: the saved flags are dropped (asked fresh)");
  stop2(); fail = false;

  // logout
  await F.refreshFlags({ force: true });
  await F.clearFlags();
  ok(F.knownFlag("surplusBoxes") === null && !store["appFlags:v2"], "logout: cleared in memory and on the phone");
  console.warn = warn; Date.now = realNow;

  console.log("── wiring (source)");
  const auth = H.read("app/src/context/AuthContext.js");
  ok(/clearAllData = useCallback\(async \(\) => \{\s*isLoggingOutRef\.current = true;\s*\/\/[^\n]*\n\s*clearFlags\(\);/.test(auth), "logout clears the flags");
  ok(/if \(flagsTokenRef\.current !== token\) \{\s*flagsTokenRef\.current = token;\s*refreshFlags\(\{ force: true \}\);/.test(auth), "a new sign-in asks for its flags at once");
  const appJs = H.read("App.js");
  ok(/function FlagWatch\(\) \{\s*useEffect\(\(\) => watchFlags\(AppState, APP_VERSION\), \[\]\);/.test(appJs) && /<FlagWatch \/>/.test(appJs), "App: asked on open and on every return to the foreground");
  for (const [f, fn, flag] of [["surplusApi", "surplusEnabled", "surplusBoxes"], ["loyaltyApi", "loyaltyEnabled", "loyaltyV2"], ["matchingApi", "matchingEnabled", "careerMatching"], ["careerApi", "careerEnabled", "careerTimeline"], ["ratingsApi", "ratingsEnabled", "careerRatings"], ["resumeStudioApi", "studioEnabled", "resumeStudioV2"]]) {
    const s = H.read(`app/src/api/${f}.js`);
    ok(new RegExp(`export async function ${fn}\\(\\) \\{\\s*return flagOn\\("${flag}"\\);`).test(s) && !/FLAGS_MAX_AGE/.test(s), `${f}: ${fn}() reads the shared flags (no private 5-minute cache)`);
  }

  console.log("── Surprise Box card (behaviour)");
  {
    const { React, mount } = H.makeReact();
    const { rn } = H.makeRN();
    let on = true; let listings = { listings: [], city: "Karachi" };
    const loadC = H.loader({
      react: React, "react-native": rn,
      "@expo/vector-icons": { Ionicons: "Icon" },
      "../api/surplusApi": { surplusEnabled: async () => on, surplusApi: { listings: async () => listings }, pkTime: () => "5:00 pm" },
      "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage },
    });
    const Card = loadC(path.join(H.SRC, "components/SurpriseBoxCard.js")).default;
    const opened = [];
    let m = mount(React.createElement(Card, { onOpen: () => opened.push("city"), onOpenAll: () => opened.push("all") }));
    await H.tick(20); m.rerender();
    ok(/no boxes in Karachi today/.test(H.textOf(m.tree)), "flag on, no boxes in the student's city: 'no boxes in Karachi today'", H.textOf(m.tree));
    H.byLabel(m.tree, "see surprise boxes in all cities").props.onPress();
    ok(opened.join() === "all", "'all cities' opens the screen for every city");
    listings = { listings: [{ available: true, pickupStart: "2026-11-14T12:00:00Z" }, { available: false }], city: "Karachi" };
    m = mount(React.createElement(Card, { onOpen: () => {}, refreshKey: 1 }));
    await H.tick(20); m.rerender();
    ok(/1 on sale · next pickup 5:00 pm/.test(H.textOf(m.tree)) && !H.byLabel(m.tree, "see surprise boxes in all cities"), "boxes on sale: the count and next pickup");
    on = false;
    m = mount(React.createElement(Card, { onOpen: () => {}, refreshKey: 2 }));
    await H.tick(20); m.rerender();
    ok(H.textOf(m.tree) === "", "flag off: nothing rendered");
    ok(/useState\(!!params\.allCities\)/.test(H.read("app/src/screens/SurpriseBoxes.js")) && /onOpenAll=\{\(\) => navigation\.navigate\("SurpriseBoxes", \{ allCities: true \}\)\}/.test(H.read("app/src/screens/Brands.js")), "'all cities' opens Surprise Boxes with every city shown");
  }
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
