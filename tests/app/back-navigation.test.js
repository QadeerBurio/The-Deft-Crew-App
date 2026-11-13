// Back navigation (fix/back-navigation): every page lives in a stack (iOS swipe back works), the drawer
// keeps only its three navigators, the drawer's edge swipe is off whenever it would fight a back swipe
// or the travel chat is open, pushes / banners open their screen from anywhere by its full nested path
// (never past Splash / login), the travel chat is padded by the phone's insets and closes on back.
//   node tests/app/back-navigation.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const load = H.loader({});
  const R = load(path.join(H.SRC, "navigation/routes.js"));
  const drawerSrc = H.read("app/src/navigation/DrawerNavigator.js").replace(/\r\n/g, "\n");
  const names = (src) => [...new Set([...src.matchAll(/<\w+\.Screen\s[^>]*?\bname=\{?\s*["']([^"']+)["']/gs)].map((m) => m[1]))];
  const between = (src, a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a) + a.length));
  const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

  console.log("── the route map matches the navigators");
  const reg = {
    ROOT: names(H.read("app/src/navigation/AuthNavigator.js")),
    DRAWER: names(drawerSrc.slice(drawerSrc.indexOf("export default function DrawerNavigator()"))),
    HOME_STACK: names(between(drawerSrc, "function HomeStackNavigator()", "export default function DrawerNavigator()")),
    TABS: names(H.read("app/src/navigation/TabNavigator.js")),
    PROFILE: names(H.read("app/src/navigation/ProfileStack.js")),
    SKILLSHARE: names(between(drawerSrc, "function DashboardStackNavigator()", "function SocialStackNavigator()")),
  };
  for (const [k, v] of Object.entries(reg)) ok(same(R[k], v), `routes.js ${k} = the screens registered there (${v.length})`, JSON.stringify({ map: R[k], registered: v }));

  console.log("── every page in a stack");
  ok(same(reg.DRAWER, ["HomeTabs", "Profile", "Dashboard"]), "the drawer holds only its three navigators", reg.DRAWER.join());
  const dup = reg.DRAWER.filter((n) => reg.HOME_STACK.includes(n) && n !== "HomeTabs");
  ok(dup.length === 0, "no page is registered both in the drawer and a stack", dup.join());
  for (const n of ["Travelling", "Rewards", "NotificationSettings", "Points", "WhyPoints", "About", "Terms & Conditions", "Privacy Policy", "Disclaimer", "How It Works", "SocialStack"]) {
    ok(reg.HOME_STACK.includes(n), `${n} lives in the home stack (iOS swipe back, header back = goBack)`);
  }
  ok(/<Stack\.Screen name="Travelling" component=\{TravelingScreen\} options=\{\{ gestureEnabled: true \}\} \/>/.test(drawerSrc), "Travelling: swipe back on");
  ok(/navigation\.navigate\("HomeTabs", \{ screen: "About" \}\)/.test(H.read("app/src/screens/SettingScreen.js")), "Settings (profile stack) opens About in the home stack by its nested path");

  console.log("── drawer swipe");
  const st = (type, index, routes) => ({ type, index, routes });
  const homeTabs = (homeStack) => ({ name: "HomeTabs", state: homeStack });
  const tabs = (tabIndex, tabRoutes) => ({ name: "HomeTabs", state: st("tab", tabIndex, tabRoutes) });
  const FULL = ["Social", "Brands", "OfferScreen"];
  ok(R.drawerSwipeOff(homeTabs(st("stack", 0, [tabs(0, [{ name: "Home", state: st("stack", 0, [{ name: "HomeStackMain" }]) }])])), FULL) === false, "home, nothing to go back to: menu swipe on");
  ok(R.drawerSwipeOff(homeTabs(st("stack", 1, [tabs(0, [{ name: "Home" }]), { name: "Events" }])), FULL) === true, "Events pushed on the home stack: menu swipe off (the edge swipe goes back)");
  ok(R.drawerSwipeOff(homeTabs(st("stack", 0, [tabs(0, [{ name: "Home", state: st("stack", 1, [{ name: "HomeStackMain" }, { name: "University" }]) }])])), FULL) === true, "a page pushed inside the Home tab: off");
  ok(R.drawerSwipeOff(homeTabs(st("stack", 0, [tabs(2, [{ name: "Home" }, { name: "Explore" }, { name: "Campus" }])])), FULL) === false, "another tab (no back): on");
  ok(R.drawerSwipeOff(homeTabs(st("stack", 0, [tabs(1, [{ name: "Home" }, { name: "Social" }])])), FULL) === true, "a full-screen section: off");
  ok(R.drawerSwipeOff(homeTabs(st("stack", 1, [tabs(0, [{ name: "Home" }]), { name: "Travelling", params: { chatOpen: true } }])), FULL) === true, "travel chat open: off");
  ok(R.drawerSwipeOff({ name: "HomeTabs", state: { routes: [{ name: "HomeTabs" }, { name: "Rewards" }] } }, FULL) === true, "a stack state without index/type (opened with params): last route counts");
  ok(/screenOptions=\{\(\{ route \}\) => \{[\s\S]{0,300}drawerSwipeOff\(route, FULLSCREEN_SCREENS\)/.test(drawerSrc) && (drawerSrc.match(/drawerSwipeOff\(route, FULLSCREEN_SCREENS\)/g) || []).length === 2, "the drawer and its HomeTabs screen both use the rule");

  console.log("── pushes open from anywhere");
  const pushRoutes = ["Home", "FeedScreen", "Dashboard", "Career", "Events", "Brands", "Points", "Badges", "OfferScreen", "Exchange", "Travelling", "SurpriseBoxes", "Social", "Rewards", "Resume", "PostDetailScreen", "ListingDetail", "InquiryChat", "Notifications", "NotificationModal", "MessagesScreen", "ManageOffers", "EventTicket", "MatchChat"];
  const missing = pushRoutes.filter((n) => !R.pathTo(n));
  ok(missing.length === 0, "every screen the server's pushes name has a full path", missing.join());
  ok(JSON.stringify(R.pathTo("EventTicket", { registrationId: "r1" })) === JSON.stringify(["Drawer", { screen: "HomeTabs", params: { screen: "EventTicket", params: { registrationId: "r1" } } }]), "EventTicket → Drawer › HomeTabs › EventTicket (with its params)");
  ok(JSON.stringify(R.pathTo("Home")) === JSON.stringify(["Drawer", { screen: "HomeTabs", params: { screen: "HomeTabs", params: { screen: "Home" } } }]), "Home → the Home tab");
  ok(R.pathTo("ListingDetail", { id: 1 })[1].screen === "Dashboard" && R.pathTo("NotificationModal")[1].screen === "Profile" && R.pathTo("Resume")[0] === "Resume", "SkillShare, Profile and root screens get their own paths");
  ok(R.pathTo("NoSuchScreen") === null, "an unknown name: no path");

  const fakeRef = (rootRoutes) => { const calls = []; return { calls, ready: true, root: rootRoutes, isReady() { return this.ready; }, getRootState() { return { routes: this.root.map((name) => ({ name })) }; }, navigate(...a) { calls.push(a); } }; };
  let ref = fakeRef(["Splash"]);
  ok(R.navigateAnywhere(ref, "Events") === false && ref.calls.length === 0, "behind Splash / login: a push never jumps into the app");
  ref = fakeRef(["Drawer"]);
  ok(R.navigateAnywhere(ref, "Events", { id: 2 }) === true && ref.calls[0][0] === "Drawer" && ref.calls[0][1].params.screen === "Events", "in the app: navigates by the full path (works from the travel screen, profile stack, SkillShare…)");

  // the push handler waits for the app, then opens the screen
  {
    const realST = global.setTimeout; const timers = [];
    const pn = H.loader({
      "react-native": { Platform: { OS: "ios" } },
      "expo-notifications": {}, "expo-device": { isDevice: true }, "expo-constants": { default: {} },
      "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async () => null, setItem: async () => {} } },
    });
    let P;
    try { P = pn(path.join(H.SRC, "utils/pushNotifications.js")); } catch (e) { ok(false, "pushNotifications loads", e.message); }
    if (P) {
      global.setTimeout = (fn, ms) => { timers.push(fn); return timers.length; };
      ref = fakeRef(["Splash"]);
      P.navigateWhenReady(ref, "EventTicket", { registrationId: "r9" });
      ok(ref.calls.length === 0 && timers.length === 1, "a push tapped while the app opens: waits");
      ref.root = ["Drawer"];
      timers.shift()();
      ok(ref.calls.length === 1 && ref.calls[0][1].params.screen === "EventTicket", "…and opens the ticket once the app is up");
      const warn = console.warn; let warned = ""; console.warn = (m) => (warned = String(m));
      P.navigateWhenReady(ref, "NoSuchScreen");
      console.warn = warn;
      ok(timers.length === 0 && /not a screen/.test(warned), "an unknown screen: no retries, logged");
      global.setTimeout = realST;
    }
  }
  for (const f of ["components/NotificationBanner.js", "components/NotificationModal.js", "components/NotificationSkillshare.js", "engagement/components/CelebrationHost.js", "engagement/components/DailyDropCard.js", "guest/accountRoutes.js", "hooks/useNotificationPopup.js", "screens/Home.js", "utils/pushNotifications.js"]) {
    const s = H.read(`app/src/${f}`);
    ok(/navigateAnywhere\(navigationRef, /.test(s) && !/navigationRef\.navigate\(/.test(s), `${f}: opens screens by their full path`);
  }

  console.log("── travel chat");
  const t = H.read("app/src/components/TravelChatBot.js");
  ok(/animationType="slide"/.test(t) && !/animationType="none"/.test(t) && !/\btransparent\b\s*\n/.test(t.slice(t.indexOf("<Modal"), t.indexOf("<Modal") + 300)), "a full-screen modal with the system slide (no hand-made off-screen sheet)");
  ok(/paddingTop: insets\.top, paddingLeft: insets\.left, paddingRight: insets\.right/.test(t) && !/<SafeAreaView/.test(t) && !/modalSlide/.test(t), "header padded by the phone's insets (not a SafeAreaView measured off-screen)");
  ok(/paddingBottom: Math\.max\(insets\.bottom, 10\)/.test(t), "the input bar keeps the home-indicator inset (once, not twice)");
  ok(/onRequestClose=\{closeChat\}/.test(t) && /accessibilityLabel="close travel chat"/.test(t) && /width: 44, height: 44/.test(t), "back / Android back close the chat; the back button is 44 × 44");
  const ts = H.read("app/src/components/TravellingScreen.js");
  ok(/onOpenChange=\{\(open\) => navigation\.setParams\(\{ chatOpen: open \}\)\}/.test(ts), "the travel screen marks the chat open (menu swipe off)");
  ok(/if \(navigation\.canGoBack\(\)\) \{\s*navigation\.goBack\(\);/.test(ts) && /chatRef\.current\?\.isOpen\?\.\(\)\) \{\s*chatRef\.current\.close\(\);/.test(ts), "travel back: goBack (it is in a stack now); Android back closes the chat first");

  // behaviour: the chat's header sits below the notch, and closing reports it
  {
    const { React, mount } = H.makeReact();
    const { rn } = H.makeRN();
    const opened = [];
    const loadT = H.loader({
      react: React, "react-native": rn,
      "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) },
      "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon", Feather: "Icon" },
      "react-native-svg": { __esModule: true, default: "Svg", Path: "Path", Circle: "Circle" },
      "expo-haptics": { impactAsync: async () => {}, notificationAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} },
      "@react-native-async-storage/async-storage": { __esModule: true, default: { multiGet: async (ks) => ks.map((k) => [k, null]) } },
      "@react-native-community/netinfo": { __esModule: true, default: { addEventListener: () => () => {} } },
      "../api/api": { __esModule: true, default: { defaults: { baseURL: "https://x.test/api" }, post: async () => ({ data: {} }) } },
      "../guest/GuestGate": { useGuestGate: () => ({ requireAccount: () => true, isGuest: false }) },
      "../context/AuthContext": { AuthContext: { _default: { token: "t", isGuest: false } } },
      "../engagement/engagementBus": { engagementBus: { emit() {} }, ENGAGEMENT_EVENTS: {} },
      "../analytics/metaEvents": { metaEvents: { travelAssistantUsed() {} } },
      "../utils/clipboard": { copyToClipboard() {} },
    });
    const Chat = loadT(path.join(H.SRC, "components/TravelChatBot.js")).default;
    const ref = { current: null };
    const m = mount(React.createElement(Chat, { ref, onOpenChange: (o) => opened.push(o) }));
    ref.current.open(null);
    await H.tick(10);
    const modal = H.find(m.tree, (n) => n.type === "Modal");
    const padded = H.find(modal, (n) => { const st = Array.isArray(n.props?.style) ? Object.assign({}, ...n.props.style.filter(Boolean)) : n.props?.style; return st?.paddingTop === 59; });
    ok(modal?.props.visible === true && modal.props.animationType === "slide" && !!padded, "open on a notched iPhone: the header starts 59 pt down (below the Dynamic Island)");
    H.byLabel(m.tree, "close travel chat").props.onPress();
    await H.tick(10);
    ok(H.find(m.tree, (n) => n.type === "Modal").props.visible === false && opened.join() === "false,true,false", "the back button closes it at once and tells the screen", opened.join());
  }
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
