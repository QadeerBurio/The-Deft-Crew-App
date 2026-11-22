// P1 invite links, signup prefill, leaderboard and share cards (upgrade/p1-growth):
//   growth/inviteLinks.js: links (gettdc.pk/i/CODE?c=), the owner's share text, link parsing, opening a link by state
//     (signed out → saved + Signup; guest → saved; signed in → nothing), pasted-text parsing
//   growth/InviteCodeExtras: a saved code fills the empty field, "invited by <first name> ✓ code X", "paste invite
//     code" only when the server's invite features are on and the field is empty, the clipboard read only on tap
//   components/crew/ReferralLeaderboard: this month by default, first names, my rank / who to pass, empty month, campus
//   ui/ShareCard: invite card with the code and a QR of the link; confession card with the text only; share = capture
//     + expo-sharing
//   wiring (source): App.js handles invite links first; Signup shows the extras and clears the saved code once the
//     account exists; Points.js changes only behind growthV2 / shareCards, today's text kept with the flags off
//   node tests/app/invite-link.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

const store = {};
const AsyncStorage = { getItem: async (k) => (k in store ? store[k] : null), setItem: async (k, v) => { store[k] = v; }, removeItem: async (k) => { delete store[k]; } };
const asMock = { "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage } };

(async () => {
  console.log("── growth/inviteLinks.js");
  const L = H.loader(asMock)(path.join(H.SRC, "growth/inviteLinks.js"));
  ok(L.inviteLink("aisha1", "wa") === "https://gettdc.pk/i/AISHA1?c=wa" && L.inviteLink("X1Y2Z3", "sms") === "https://gettdc.pk/i/X1Y2Z3?c=direct", "share link: gettdc.pk/i/CODE?c=<channel> (unknown channel → direct)");
  const msg = L.inviteMessage("aisha1", "wa");
  ok(msg.includes("use my code: AISHA1") && msg.includes("you both get 100 points when your friend starts using tdc.") && msg.endsWith("https://gettdc.pk/i/AISHA1?c=wa"), "share text: the code, the owner's line, the link", msg);
  const parse = [["tdcapp://i/aisha1", "AISHA1"], ["https://gettdc.pk/i/AISHA1?c=wa", "AISHA1"], ["https://www.gettdc.pk/i/abc123/", "ABC123"], ["https://evil.example/i/AISHA1", null], ["tdcapp://post/123", null], ["https://gettdc.pk/i/a", null]];
  ok(parse.every(([u, want]) => L.inviteCodeFromUrl(u) === want), "link parsing: tdcapp:// and gettdc.pk only, codes 4–12 letters / digits", JSON.stringify(parse.map(([u]) => L.inviteCodeFromUrl(u))));
  ok(L.codeFromText("use my code: abc123\nyou both…") === "ABC123" && L.codeFromText("https://gettdc.pk/i/XYZ789?c=copy") === "XYZ789" && L.codeFromText("QWE456") === "QWE456" && L.codeFromText("hello there friend") === null, "pasted text: 'code: X', a link, or the code alone");

  const navs = [];
  const nav = (names) => ({ isReady: () => true, getRootState: () => ({ routeNames: names }), navigate: (n) => navs.push(n) });
  for (const k of Object.keys(store)) delete store[k];
  let code = await L.handleInviteUrl("https://gettdc.pk/i/aisha1?c=wa", { storage: AsyncStorage, navigationRef: nav(["Splash", "Login", "Signup"]) });
  ok(code === "AISHA1" && store["@tdc_pending_ref"] === "AISHA1" && navs.join() === "Signup", "signed out: code saved, Signup opens");
  for (const k of Object.keys(store)) delete store[k]; navs.length = 0;
  store.isGuest = "true";
  code = await L.handleInviteUrl("tdcapp://i/BILAL2", { storage: AsyncStorage, navigationRef: nav(["Drawer"]) });
  ok(code === "BILAL2" && store["@tdc_pending_ref"] === "BILAL2" && navs.length === 0, "guest: code saved for later, no jump");
  for (const k of Object.keys(store)) delete store[k];
  store.token = "tok"; store.isGuest = "false";
  code = await L.handleInviteUrl("tdcapp://i/BILAL2", { storage: AsyncStorage, navigationRef: nav(["Drawer"]) });
  ok(code === null && !("@tdc_pending_ref" in store), "signed in: already a member, nothing saved");
  for (const k of Object.keys(store)) delete store[k];

  console.log("── growth/InviteCodeExtras.js");
  {
    const { React, mount } = H.makeReact();
    const { rn } = H.makeRN();
    const gets = []; let config = { enabled: false }; let clip = ""; let clipReads = 0;
    const api = { __esModule: true, default: { get: async (url) => { gets.push(url); if (url === "/invites/config") return { data: config }; if (/validate\/AISHA1/.test(url)) return { data: { valid: true, referrer: { name: "Aisha", profileImage: null } } }; return { data: { valid: false } }; } } };
    const load = H.loader({ react: React, "react-native": rn, "@expo/vector-icons": { Ionicons: "Icon" }, "expo-clipboard": { getStringAsync: async () => { clipReads++; return clip; } }, "../api/api": api, ...asMock });
    const X = load(path.join(H.SRC, "growth/InviteCodeExtras.js")).default;
    store["@tdc_pending_ref"] = "AISHA1";
    let value = ""; const set = (v) => { value = v; };
    const Host = () => { const [c, setC] = React.useState(""); value = c; return React.createElement(X, { code: c, onCode: (v) => { set(v); setC(v); } }); };
    const m = mount(React.createElement(Host));
    await tick(80); m.rerender(); await tick(60); m.rerender();
    ok(value === "AISHA1", "a code saved from an invite link fills the empty field");
    ok(H.textOf(m.tree).includes("invited by aisha ✓ code AISHA1") && H.textOf(m.tree).includes("you both get 100 points when you start using tdc."), "…'invited by aisha ✓ code AISHA1' and the owner's line", H.textOf(m.tree));
    ok(!H.byLabel(m.tree, "paste invite code"), "no paste button when the field has a code");
    ok(clipReads === 0, "the clipboard is never read on its own");
    m.unmount();
    for (const k of Object.keys(store)) delete store[k];
    // paste flow: config on, empty field
    config = { enabled: true }; clip = "use my code: aisha1 …";
    const m2 = mount(React.createElement(Host));
    await tick(80); m2.rerender();
    const btn = H.byLabel(m2.tree, "paste invite code");
    ok(!!btn && clipReads === 0, "invite features on + empty field: 'paste invite code' shows, nothing read yet");
    await btn.props.onPress(); await tick(60); m2.rerender(); await tick(60); m2.rerender();
    ok(clipReads === 1 && value === "AISHA1", "tap → reads the clipboard once and fills the code");
    m2.unmount();
    config = { enabled: false };
    const m3 = mount(React.createElement(Host));
    await tick(80); m3.rerender();
    ok(!H.byLabel(m3.tree, "paste invite code") && !H.textOf(m3.tree).includes("invited by"), "features off and no invite: nothing shows (today's signup)");
  }

  console.log("── components/crew/ReferralLeaderboard.js");
  {
    const { React, mount } = H.makeReact();
    const { rn } = H.makeRN({ ActivityIndicator: "ActivityIndicator" });
    const calls = []; let reply = { leaderboard: [{ rank: 1, userId: "a", name: "Bilal", profileImage: null, verifiedCount: 3 }, { rank: 2, userId: "me", name: "Mehr", profileImage: null, verifiedCount: 2 }], period: "month", me: { rank: 2, count: 2 }, next: { name: "Bilal", more: 2 } };
    const engagementApi = { getReferralLeaderboard: async (p) => { calls.push(p); return reply; } };
    const load = H.loader({ react: React, "react-native": rn, "../../engagement/api/engagementApi": { engagementApi } });
    const LB = load(path.join(H.SRC, "components/crew/ReferralLeaderboard.js")).default;
    const m = mount(React.createElement(LB, { universityId: "U1" }));
    await tick(60); m.rerender();
    const t = H.textOf(m.tree);
    ok(calls[0]?.period === "month" && !("university" in calls[0]), "this month by default, everyone", JSON.stringify(calls));
    ok(t.includes("bilal") && t.includes("mehr") && t.includes("you're #2 with 2") && t.includes("invite 2 more to pass bilal"), "rows (first names), my rank, who to pass", t);
    H.byLabel(m.tree, "my campus").props.onPress(); await tick(60); m.rerender();
    ok(calls.at(-1)?.university === "U1", "my campus → the university filter");
    reply = { leaderboard: [], period: "all", me: null, next: null };
    H.byLabel(m.tree, "all time").props.onPress(); await tick(60); m.rerender();
    ok(calls.at(-1)?.period === "all" && H.textOf(m.tree).includes("no one yet. be the first."), "all time; an empty list says so (no made-up rows)");
  }

  console.log("── ui/ShareCard.js");
  {
    const { React, mount } = H.makeReact();
    const { rn } = H.makeRN({ ActivityIndicator: "ActivityIndicator" });
    const shared = []; let captured = 0;
    const ViewShot = React.forwardRef(function ViewShot(p, ref) { if (ref && typeof ref === "object") ref.current = { capture: async () => { captured++; return "file:///card.png"; } }; return React.createElement("ViewShot", { options: p.options }, p.children); });
    const load = H.loader({ react: React, "react-native": rn, "react-native-view-shot": { __esModule: true, default: ViewShot }, "expo-sharing": { isAvailableAsync: async () => true, shareAsync: async (u, o) => shared.push({ u, o }) }, "react-native-qrcode-svg": { __esModule: true, default: function QRCode(p) { return React.createElement("QRCode", p); } }, "@expo/vector-icons": { Ionicons: "Icon" }, ...asMock });
    const SC = load(path.join(H.SRC, "ui/ShareCard.js"));
    const done2 = [];
    const m = mount(React.createElement(SC.default, { visible: true, onClose() {}, variant: "invite", code: "aisha1", onShared: (v) => done2.push(v) }));
    await tick();
    const qr = H.find(m.tree, (x) => x.type === "QRCode");
    const shot = H.find(m.tree, (x) => x.type === "ViewShot");
    ok(qr && qr.props.value === "https://gettdc.pk/i/AISHA1?c=direct" && H.textOf(m.tree).includes("code AISHA1") && H.textOf(m.tree).includes("join me on tdc"), "invite card: the code and a QR of the invite link");
    ok(shot && shot.props.options.width === 1080 && shot.props.options.height === 1350, "captured at 1080 × 1350");
    await H.byLabel(m.tree, "share the card").props.onPress(); await tick();
    ok(captured === 1 && shared[0]?.u === "file:///card.png" && shared[0].o.mimeType === "image/png" && done2[0] === "invite", "share: capture → expo-sharing (png) → onShared('invite')");
    const c = mount(React.createElement(SC.ShareCardView, { variant: "confession", code: "AISHA1", data: { text: "the canteen chai is elite", handle: "@ziddi-project-343" } }));
    ok(H.textOf(c.tree).includes("the canteen chai is elite") && !H.textOf(c.tree).includes("ziddi") && H.textOf(c.tree).includes("sent from tdc confessions"), "confession card: the text only, never a handle");
  }

  console.log("── wiring (source)");
  const app = H.read("App.js");
  ok(/if \(inviteCodeFromUrl\(url\)\) \{\s*handleInviteUrl\(url, \{ navigationRef \}\)/.test(app) && app.indexOf("inviteCodeFromUrl(url)") < app.indexOf("Linking.parse(url)"), "App.js: invite links handled before the other deep links");
  const su = H.read("app/src/screens/SignupScreen.js");
  ok(/<InviteCodeExtras code=\{referralCode\} onCode=\{setReferralCode\}/.test(su) && /await api\.post\("\/auth\/signup", body[^\n]*\n\s*clearPendingRef\(\);/.test(su), "Signup: the extras under the code field; the saved code cleared once the account exists");
  const pts = H.read("app/src/components/Points.js");
  ok(/const growth = useFlag\(FLAGS\.growthV2\) === true;/.test(pts) && /const cardsOn = useFlag\(FLAGS\.shareCards\) === true;/.test(pts), "Points: reads growthV2 and shareCards");
  ok(/if \(growth && referralCode\) return inviteLink\(referralCode, 'direct'\);/.test(pts) && /const msg = growth && referralCode \? inviteMessage\(referralCode, 'direct'\) :\s*`join the crew\./.test(pts), "…share link and text change only with growthV2 (today's text kept)");
  ok(/\{growth && \(\s*<TouchableOpacity onPress=\{onShareWhatsApp\}/.test(pts) && /\{growth && <ReferralLeaderboard/.test(pts) && /\{cardsOn && !!referralCode && \(\s*<ShareCardSheet/.test(pts), "…WhatsApp button and leaderboard only with growthV2; the share card only with shareCards");
  ok(/'friend joins: \+50 pts\. friend sorts first card: \+100 more\.'/.test(pts), "…flag off: today's code hint unchanged");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
