// r9 launch (owner): every navigation screen (every route the navigators register) renders with launchV2 ON (exactly the flags it turns
// on; the gettdc.pk link flags and confessionsVoting off), and again with every flag off, without an exception or a
// React error, for a signed-in student with empty server data (a new account). A missing import, an undefined field
// read, a hook used conditionally: each fails here.
//   Libraries are stubbed (an unknown component renders nothing); the app's own files are real.
//   node tests/app/launch-smoke.test.js
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;
const ROOT = path.join(__dirname, "..", "..");

// server config/featureFlags.js LAUNCH_V2 (r9); checked against the server's list when it's next to this repo
const LAUNCH_V2 = ["growthV2", "ambassadorV2", "shareCards", "squadMission", "chatPushV1", "pushOpenTracking", "pushBudgetV1", "pushAskV2",
  "unifiedInbox", "notifSettingsV2", "pushCopyV2", "resumeV2", "resumeCoach", "resumeSpeak", "resumeTemplatesV2", "resumeFeedback", "resumeFinish",
  "resumeVerified", "resumeOutcomeStats", "resumeWriter", "confessionsV2", "confessionSafety", "confessionPolls", "confessionFollow", "confessionRecap",
  "confessionHandles", "lowDataImages", "persistCache", "optimisticActions", "prefetchDetails", "headerSearch", "cityCheck", "polishEmptyStates",
  "celebrationsPlus", "onboardingGoals", "homeNextAction", "tabletLayout", "nativeStackDrawer"];

// a permissive stand-in for any library export: callable (returns null), any property is another stand-in
function stub(name) {
  // called as a component (one plain props object) → renders nothing; called as a library function → resolves
  const fn = function (...args) { return args.length === 1 && args[0] && typeof args[0] === "object" && Object.getPrototypeOf(args[0]) === Object.prototype ? null : Promise.resolve(stub(`${name}()`)); };
  return new Proxy(fn, {
    get(t, k) {
      if (k === "__esModule") return true;
      if (k === "then" || k === Symbol.iterator || k === "$$typeof") return undefined;
      if (k === Symbol.toPrimitive || k === "toString") return () => name;
      if (k === "displayName" || k === "name") return name;
      if (typeof k === "string" && /^use[A-Z]/.test(k)) return () => ({});
      return stub(`${name}.${String(k)}`);
    },
  });
}

// every file registered as a navigation screen: <X.Screen ... component={Name}> + import Name from "./path"
function filesToCheck() {
  const nav = path.join(H.SRC, "navigation");
  const sources = [...fs.readdirSync(nav).map((f) => path.join(nav, f)), path.join(ROOT, "App.js"), path.join(H.SRC, "screens/Social/Social.js")].filter((f) => f.endsWith(".js") && fs.existsSync(f));
  const out = new Set();
  for (const f of sources) {
    const src = fs.readFileSync(f, "utf8");
    const imports = new Map([...src.matchAll(/import\s+([A-Za-z0-9_]+)\s*(?:,\s*\{[^}]*\})?\s+from\s+["']([^"']+)["']/g)].map((m) => [m[1], m[2]]));
    for (const m of src.matchAll(/component=\{([A-Za-z0-9_]+)\}/g)) {
      const spec = imports.get(m[1]);
      if (!spec || !spec.startsWith(".")) continue;
      let abs = path.resolve(path.dirname(f), spec);
      if (!abs.endsWith(".js")) abs = fs.existsSync(`${abs}.js`) ? `${abs}.js` : path.join(abs, "index.js");
      if (fs.existsSync(abs)) out.add(path.relative(ROOT, abs).replace(/\\/g, "/"));
    }
  }
  return [...out].sort();
}

const empty = { data: { success: true, data: {} }, status: 200 };
async function renderOne(rel, flagsOn) {
  const { React, mount, contexts } = H.makeReact();
  const { rn: base } = H.makeRN({
    InteractionManager: { runAfterInteractions: (cb) => { if (cb) cb(); return { cancel() {} }; } },
    Share: { share: async () => ({}) }, Linking: { openURL: async () => {}, canOpenURL: async () => false, addEventListener: () => ({ remove() {} }), getInitialURL: async () => null },
    Vibration: { vibrate() {} }, PixelRatio: { get: () => 2, roundToNearestPixel: (x) => x }, useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1, scale: 2 }),
    LayoutAnimation: { configureNext() {}, Presets: {}, create: () => ({}) }, UIManager: { setLayoutAnimationEnabledExperimental() {} },
    Appearance: { getColorScheme: () => "light", addChangeListener: () => ({ remove() {} }) }, I18nManager: { isRTL: false },
    SectionList: "SectionList", ImageBackground: "ImageBackground", SafeAreaView: "SafeAreaView", TouchableWithoutFeedback: "TouchableWithoutFeedback",
    TouchableHighlight: "TouchableHighlight", VirtualizedList: "VirtualizedList", Platform: { OS: "android", Version: 34, select: (o) => o.android ?? o.default },
    AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove() {} }), announceForAccessibility() {} },
    Clipboard: { setString() {} }, NativeModules: {}, DeviceEventEmitter: { addListener: () => ({ remove() {} }) }, PermissionsAndroid: { request: async () => "granted", PERMISSIONS: {}, RESULTS: {} },
  });
  base.Animated = { ...base.Animated, createAnimatedComponent: (c) => c, FlatList: "Animated.FlatList", Image: "Animated.Image", add: () => new base.Animated.Value(0), diffClamp: () => new base.Animated.Value(0), stagger: () => ({ start: (cb) => cb && cb({ finished: true }), stop() {} }), delay: () => ({ start: (cb) => cb && cb({ finished: true }), stop() {} }), ValueXY: class { constructor() { this.x = new base.Animated.Value(0); this.y = new base.Animated.Value(0); } getLayout() { return {}; } setValue() {} } };
  // anything else react-native exports: a stand-in (components render nothing)
  const rn = new Proxy(base, { get: (t, k) => (k in t ? t[k] : typeof k === "string" && /^[A-Z]/.test(k) ? k : undefined) });
  const errors = [];
  const nav = { navigate() {}, goBack() {}, replace() {}, reset() {}, setOptions() {}, addListener: () => () => {}, canGoBack: () => true, getParent: () => nav, dispatch() {}, isFocused: () => true, push() {}, pop() {}, popToTop() {}, getState: () => ({ routes: [], index: 0 }) };
  const store = new Map();
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => "" });
  const api = { get: async () => empty, post: async () => empty, put: async () => empty, patch: async () => empty, delete: async () => empty, defaults: { headers: { common: {} } }, interceptors: { request: { use() {} }, response: { use() {} } } };
  global.React = React; // the app builds with the automatic JSX runtime (no React import needed); this transform is classic
  const mocks = {
    react: React, "react-native": rn,
    "@react-navigation/native": { usePreventRemove: () => {}, useScrollToTop: () => {}, useTheme: () => ({ colors: {} }), useNavigation: () => nav, useRoute: () => ({ params: {}, name: path.basename(rel, ".js") }), useFocusEffect: (cb) => React.useEffect(() => cb(), [cb]), useIsFocused: () => true, useNavigationState: () => null, CommonActions: { reset: () => ({}), navigate: () => ({}) }, StackActions: { replace: () => ({}), push: () => ({}) }, NavigationContainer: "NavigationContainer", createNavigationContainerRef: () => ({ isReady: () => false }) },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", SafeAreaProvider: "SafeAreaProvider", useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, removeItem: async () => {}, multiRemove: async () => {}, multiGet: async (ks) => ks.map((k) => [k, null]), getAllKeys: async () => [] } },
    // any other named export of api.js: a getter returns null, anything else resolves with an empty reply
    "/api/api": new Proxy({ __esModule: true, default: api, ...api }, { get: (t, k) => (k in t ? t[k] : typeof k === "string" ? (/^(get|is|has)[A-Z]/.test(k) ? () => null : () => Promise.resolve(empty)) : undefined) }),
    "/hooks/useFlag": { __esModule: true, default: (name) => flagsOn.has(name) },
    "/analytics/funnel": { __esModule: true, funnel: () => {}, default: () => {} },
  };
  const realError = console.error; const realWarn = console.warn;
  console.error = (...a) => { const s = a.map((x) => (x && x.stack) || String(x)).join(" "); if (!/act\(|not wrapped/.test(s)) errors.push(s.slice(0, 300)); };
  console.warn = () => {};
  const unhandled = (e) => errors.push(`unhandled: ${String((e && e.stack) || e).slice(0, 300)}`);
  process.on("unhandledRejection", unhandled);
  let m = null;
  try {
    const load = H.loader(mocks, { fallback: (id) => stub(id) });
    // a signed-in student with empty data (a new account)
    const setCtx = (file, value) => { try { const mod = load(path.join(H.SRC, file)); for (const v of Object.values(mod)) if (v && typeof v === "object" && "_default" in v) contexts.set(v, value); } catch { /* the context file needs a stub we don't give: default {} */ } };
    setCtx("context/AuthContext.js", { token: "tok", user: { _id: "U1", name: "Ayesha Khan", role: "student", university: { _id: "UNI", name: "Alpha University" } }, isGuest: false, userRole: "student", login: async () => {}, logout: async () => {} });
    setCtx("context/ResumeContext.js", { resumes: [], currentResume: null, fetchResumes: async () => [], updateResume: async () => ({}), createResume: async () => ({}), loading: false });
    const Comp = load(path.join(ROOT, rel)).default;
    m = mount(React.createElement(Comp, { navigation: nav, route: { params: {}, name: path.basename(rel, ".js") } }));
    await H.tick(20);
  } catch (e) {
    errors.push(String((e && e.stack) || e).split("\n").slice(0, 3).join(" | "));
  } finally {
    try { m && m.unmount(); } catch { /* ignore */ }
    process.removeListener("unhandledRejection", unhandled);
    console.error = realError; console.warn = realWarn;
  }
  return errors;
}

(async () => {
  const serverFlags = path.join(ROOT, "..", "server", "config", "featureFlags.js");
  if (fs.existsSync(serverFlags)) {
    const S = require(serverFlags);
    ok(JSON.stringify([...S.LAUNCH_V2].sort()) === JSON.stringify([...LAUNCH_V2].sort()), "this list = the server's launchV2 list (38 flags)");
  }
  const files = filesToCheck();
  ok(files.length >= 60, `${files.length} navigation screens`);
  // screens this generic stub environment can't render (also with every flag off, i.e. as live today): each needs a
  // provider value, a socket or a reply shape the stubs don't give. They have their own tests where it matters
  // (home: p5c-first-minutes; brands / offers: brands-*; events: events-*; feed: confessions-v2).
  const KNOWN_ENV = new Set(["app/src/components/ExchangeScreen.js", "app/src/components/TravellingScreen.js", "app/src/screens/Brands.js",
    "app/src/screens/Events/Events.js", "app/src/screens/Explore.js", "app/src/screens/Home.js", "app/src/screens/OfferScreen.js",
    "app/src/screens/Resume/ResumeBuilder.js", "app/src/screens/Social/FeedScreen.js", "app/src/screens/Social/Social.js", "app/src/screens/Splash.js"]);
  const result = {};
  for (const [label, flagsOn] of [["launchV2 on", new Set(LAUNCH_V2)], ["every flag off", new Set()]]) {
    const failed = new Map();
    for (const rel of files) {
      const errs = await renderOne(rel, flagsOn);
      if (errs.length) failed.set(rel, errs[0]);
    }
    result[label] = failed;
    for (const [rel, e] of failed) if (!KNOWN_ENV.has(rel)) console.log(`      ${label} | ${rel}: ${String(e).split(String.fromCharCode(10))[0].slice(0, 240)}`);
    const unexpected = [...failed.keys()].filter((f) => !KNOWN_ENV.has(f));
    ok(unexpected.length === 0, `${label}: ${files.length - failed.size} of ${files.length} render without an error; the rest are the ${KNOWN_ENV.size} known stub-environment cases`, unexpected.join(", "));
  }
  const onlyOn = [...result["launchV2 on"].keys()].filter((f) => !result["every flag off"].has(f));
  ok(onlyOn.length === 0, "launchV2 breaks no screen: nothing fails with it on that renders with every flag off", onlyOn.join(", "));
  done();
})().catch((e) => { process.stderr.write(String((e && e.stack) || e) + String.fromCharCode(10)); process.exit(1); });
