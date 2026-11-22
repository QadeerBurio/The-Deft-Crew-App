// Sign-in for a suspended / banned account (upgrade/p4-1-followups, plan P4-1b appeals): the server's reason in an
// alert, and an "appeal" button that opens an e-mail to the server's appealEmail (with the account e-mail filled in);
// no appeal button when the server sends no address; other errors unchanged.
//   node tests/app/signin-appeal.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

async function attempt(reply) {
  const { React, mount } = H.makeReact();
  const opened = [];
  const { rn, alerts } = H.makeRN({ KeyboardAvoidingView: "KAV", StatusBar: "StatusBar", Linking: { openURL: async (u) => { opened.push(u); } } });
  const notes = [];
  const api = { __esModule: true, default: { post: async () => { const e = new Error("refused"); e.response = reply; throw e; } }, injectSessionErrorHandler() {} };
  const load = H.loader({
    react: React, "react-native": rn,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@react-navigation/native": { useFocusEffect: () => {} },
    "expo-haptics": { notificationAsync: async () => {}, impactAsync: async () => {}, NotificationFeedbackType: {}, ImpactFeedbackStyle: {} },
    "../api/api": api,
    "../context/AuthContext": { AuthContext: { _default: { loginAsGuest: async () => {}, isGuest: false } } },
    "../guest/accountRoutes": { enterAccount: async () => {} },
  });
  const Screen = load(path.join(H.SRC, "screens/SignIn.js")).default;
  const root = mount(React.createElement(Screen, { navigation: { navigate() {}, goBack() {}, reset() {} }, route: { params: {} } }));
  await tick();
  H.find(root.tree, (x) => x.props?.accessibilityLabel === "email").props.onChangeText("Sana@Uni.edu.pk");
  H.find(root.tree, (x) => x.props?.accessibilityLabel === "password").props.onChangeText("secret-pass");
  await tick();
  const btn = H.find(root.tree, (x) => typeof x.props?.onPress === "function" && /^(log in|sign in|login)$/i.test(H.textOf(x).trim()));
  if (!btn) throw new Error("no sign-in button");
  await btn.props.onPress();
  await tick(60);
  return { alerts, opened, tree: root.tree };
}

(async () => {
  let r = await attempt({ status: 403, data: { code: "ACCOUNT_SUSPENDED", message: "Your account is paused until 2026-12-01 because: confession safety: 3 strikes.", appealEmail: "safety@gettdc.pk" } });
  let a = r.alerts.pop();
  ok(a && a.title === "account paused" && /paused until 2026-12-01/.test(a.text), "suspended: 'account paused' with the server's reason", JSON.stringify(a));
  ok(a && a.buttons.map((b) => b.text).join("|") === "appeal|ok", "…buttons: appeal, ok", JSON.stringify(a?.buttons?.map((b) => b.text)));
  await a.buttons[0].onPress(); await tick();
  ok(/^mailto:safety@gettdc\.pk\?subject=appeal%3A%20account%20paused&body=/.test(r.opened[0] || "") && decodeURIComponent(r.opened[0]).includes("sana@uni.edu.pk"), "appeal opens an e-mail to safety@gettdc.pk with the account e-mail", r.opened[0]);

  r = await attempt({ status: 403, data: { code: "ACCOUNT_BANNED", message: "This account has been closed for breaking tdc's community rules." } });
  a = r.alerts.pop();
  ok(a && a.title === "account closed" && a.buttons.map((b) => b.text).join("|") === "ok", "banned, no appeal address from the server: 'account closed', no appeal button", JSON.stringify(a));

  r = await attempt({ status: 403, data: { code: "ACCOUNT_BANNED", message: "closed", appealEmail: "javascript:alert(1)" } });
  a = r.alerts.pop();
  ok(a && a.buttons.length === 1, "a malformed appeal address is ignored");

  r = await attempt({ status: 401, data: { message: "Invalid password" } });
  ok(!r.alerts.some((x) => /account (paused|closed)/.test(x.title)), "a wrong password: no account alert (unchanged handling)");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
