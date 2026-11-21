// N-5 simpler notification settings (flag notifSettingsV2; upgrade/phase-n), on the real settings screen:
//   flag off (the server sends no "mode"): the screen as today: "what you get" and every switch, no modes
//   flag on: "how often" (everything · only important · quiet) and the daily digest on top; the switches under
//     "fine-tune · N" (N = the real number of switches this account has), closed until tapped; choosing a mode or the
//     digest saves it (PUT notification-prefs { mode } / { digest })
//   node tests/app/notif-modes.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

const all = (t, pred, out = []) => { if (t == null || typeof t !== "object") return out; if (Array.isArray(t)) { t.forEach((x) => all(x, pred, out)); return out; } if (pred(t)) out.push(t); all(t.props?.children, pred, out); return out; };

async function screenWith(serverPrefs) {
  const { React, mount } = H.makeReact();
  const { rn } = H.makeRN({ Linking: { openSettings() {} }, Pressable: "Pressable", Switch: "Switch" });
  const saved = [];
  let prefs = { ...serverPrefs };
  const engagementApi = { getNotificationPrefs: async () => ({ ...prefs }), updateNotificationPrefs: async (p) => { saved.push(p); prefs = { ...prefs, ...p }; return prefs; } };
  const load = H.loader({
    react: React, "react-native": rn,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon" },
    "../../ui/FlatGradient": { LinearGradient: "LinearGradient" },
    "@react-navigation/native": { useNavigation: () => ({ goBack() {} }) },
    "../components/Dot": "Dot",
    "../api/engagementApi": { __esModule: true, default: engagementApi },
    "../../api/api": { __esModule: true, default: {} },
    "../../utils/pushNotifications": { registerForPushNotificationsAsync: async () => null, savePushTokenToServer: async () => ({}) },
    "../../ui": { ScreenHeader: "ScreenHeader", Skeleton: "Skeleton" },
    "../../utils/plainError": { plainError: (e) => String(e) },
    "../../hooks/useFlag": { __esModule: true, default: () => false },
    "../../push/PushPermissionRow": { __esModule: true, default: () => null },
  });
  const Screen = load(path.join(H.SRC, "engagement/screens/NotificationSettingsScreen.js")).default;
  const s = mount(React.createElement(Screen));
  await H.tick(30); s.rerender();
  return { s, saved, switches: () => all(s.tree, (n) => n.type === "Switch" && /notifications$/.test(n.props.accessibilityLabel || "") && n.props.accessibilityLabel !== "daily digest notifications") };
}
const base = { streaks: true, dailyDrop: true, deals: true, jobsScholarships: true, social: true, posts: true, confessions: true, skillshare: true, osPermission: "granted" };

(async () => {
  console.log("-- flag off");
  let r = await screenWith(base);
  ok(r.switches().length === 8 && H.textOf(r.s.tree).includes("what you get"), "the screen as today: 'what you get' and the 8 switches", r.switches().length);
  ok(!H.textOf(r.s.tree).includes("how often") && !H.textOf(r.s.tree).includes("fine-tune"), "no modes, no digest, no fine-tune");

  console.log("-- flag on");
  r = await screenWith({ ...base, messages: true, loyalty: true, mode: "everything", digest: false });
  const text = H.textOf(r.s.tree);
  ok(text.includes("how often") && text.includes("everything") && text.includes("only important") && text.includes("quiet") && text.includes("daily digest"), "'how often' with the three modes and the daily digest on top");
  const radios = all(r.s.tree, (n) => n.props?.accessibilityRole === "radio");
  ok(radios.length === 3 && radios[0].props.accessibilityState.selected === true, "three choices, 'everything' selected");
  ok(text.includes("fine-tune · 10") && r.switches().length === 0, "the switches under 'fine-tune · 10' (the real number for this account), closed", r.switches().length);
  const header = all(r.s.tree, (n) => n.props?.accessibilityLabel === "fine-tune, 10 switches")[0];
  header.props.onPress(); r.s.rerender();
  ok(r.switches().length === 10, "tapping 'fine-tune' opens the 10 switches", r.switches().length);
  radios[2].props.onPress(); await H.tick(10); r.s.rerender();
  ok(JSON.stringify(r.saved[0]) === JSON.stringify({ mode: "quiet" }), "choosing 'quiet' saves { mode: 'quiet' }", JSON.stringify(r.saved));
  ok(all(r.s.tree, (n) => n.props?.accessibilityRole === "radio")[2].props.accessibilityState.selected === true, "…and shows it selected");
  const dig = all(r.s.tree, (n) => n.type === "Switch" && n.props.accessibilityLabel === "daily digest notifications")[0];
  dig.props.onValueChange(true); await H.tick(10);
  ok(JSON.stringify(r.saved[1]) === JSON.stringify({ digest: true }), "turning the digest on saves { digest: true }", JSON.stringify(r.saved));
  r = await screenWith({ ...base, mode: "important", digest: true });
  ok(all(r.s.tree, (n) => n.props?.accessibilityRole === "radio")[1].props.accessibilityState.selected === true && all(r.s.tree, (n) => n.props?.accessibilityLabel === "daily digest notifications")[0].props.value === true && H.textOf(r.s.tree).includes("fine-tune · 8"), "a saved mode and digest are shown; 8 switches for an account without the pilot ones");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
