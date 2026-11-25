// r8 (owner): the crew screen (components/Points.js, drawer "the crew") crashed in a dev build: "Property
// 'InteractionManager' doesn't exist" (the split file crew/PointsCards.js used it without its import). This renders the
// real screen with its real split files (PointsCards, levels, pointsStyles, ReferralLeaderboard) and the real crew
// helpers, with the P1 / P2 flags off and on, and real-shaped data:
//   engagement not loaded yet (me null), a student with no level and no points, empty referrals, a first-name-only
//   student, a guest, a full student (level, next tier, referrals), an approved ambassador
// Every render must complete without an exception (a missing import throws here, as it did on the phone).
//   node tests/app/crew-screen-render.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

// the server's real /api/engagement/me shape (routes/engagement.routes.js; nextTier from services/engagement/levels.js)
const TIER = { id: "insider", label: "insider", points: 1000, activityFloor: 400, referrals: 3, reward: null, discount: null, requiresApply: false };
const FULL_ME = {
  points: { balance: 340, lifetime: 520, lifetimeReferral: 120, activityPoints: 400, level: "member" },
  level: { id: "member", reachedAt: null, tiersIssued: ["member"] },
  tierDiscount: null,
  nextTier: { tier: TIER, missing: { points: 480, activity: 0, referrals: 1 }, applyAvailable: false, progress: { points: 0.52, activity: 1, referrals: 0.67 } },
  stats: { totalSaved: 0 }, badges: { earned: [], total: 12 }, referralCount: 3, referralCode: "AYESHA9", verifiedReferralCount: 2,
};
const APPLY_ME = { ...FULL_ME, nextTier: { tier: { ...TIER, id: "ambassador", label: "ambassador", requiresApply: true }, missing: { points: 0, activity: 0, referrals: 0 }, applyAvailable: true, progress: { points: 1, activity: 1, referrals: 1 } } };
const NEW_ME = { points: { balance: 0, lifetime: 0, lifetimeReferral: 0, activityPoints: 0, level: "member" }, level: { id: "member", reachedAt: null, tiersIssued: [] }, tierDiscount: null, nextTier: { tier: { ...TIER, id: "member", label: "member", points: 0, activityFloor: 0, referrals: 0 }, missing: { points: 0, activity: 0, referrals: 0 }, applyAvailable: false, progress: { points: 1, activity: 1, referrals: 1 } }, stats: { totalSaved: 0 }, badges: { earned: [], total: 12 }, referralCount: 0, referralCode: null, verifiedReferralCount: 0 };
const TOP_ME = { ...FULL_ME, nextTier: null }; // every tier issued
const CASES = [
  ["engagement not loaded (me null), empty referrals", { me: null, refs: {} }],
  ["a brand-new student: no tiers, no points, empty referrals", { me: NEW_ME, refs: { referralCode: null, rawCount: 0, verifiedCount: 0, pendingCount: 0, referees: [] } }],
  ["older / partial reply: no level, no next tier", { me: { points: {}, level: null, nextTier: null }, refs: { referralCode: null, rawCount: 0, verifiedCount: 0, pendingCount: 0, referees: [] } }],
  ["every tier cleared (nextTier null)", { me: TOP_ME, refs: { referralCode: "TOP1", rawCount: 9, verifiedCount: 9, pendingCount: 0, referees: [] } }],
  ["first-name-only student, a referral code, no referees", { me: NEW_ME, user: { _id: "U2", name: "Sara" }, refs: { referralCode: "SARA12", rawCount: 0, verifiedCount: 0, pendingCount: 0, referees: [] } }],
  ["full student: level, next tier, referrals", { me: FULL_ME, refs: { referralCode: "AYESHA9", rawCount: 3, verifiedCount: 2, pendingCount: 1, referees: [{ _id: "r1", name: "Bilal", verified: true, createdAt: new Date().toISOString() }, { _id: "r2", name: null, verified: false }] } }],
  ["next tier needs an application (apply available)", { me: APPLY_ME, refs: { referralCode: "X1", rawCount: 1, verifiedCount: 1, pendingCount: 0, referees: [] } }],
  ["guest", { me: null, guest: true, refs: {} }],
];
const FLAGSETS = [
  ["P1 / P2 flags off", {}],
  ["growthV2 + shareCards on", { growthV2: true, shareCards: true }],
  ["ambassadorV2 + squadMission on", { ambassadorV2: true, squadMission: true }],
  ["all P1 / P2 flags on", { growthV2: true, shareCards: true, ambassadorV2: true, squadMission: true }],
];

function render({ me, refs, user = { _id: "U1", name: "Ayesha Khan", firstName: "Ayesha" }, guest = false, flags = {}, application = null }) {
  const { React, mount, contexts } = H.makeReact();
  const { rn } = H.makeRN({
    InteractionManager: { runAfterInteractions: (cb) => { cb && cb(); return { cancel() {} }; } },
    Share: { share: async () => ({}) }, Linking: { openURL: async () => {}, canOpenURL: async () => true },
  });
  const AuthContext = { _default: {} };
  const store = new Map();
  const navs = [];
  const errors = [];
  const realError = console.error;
  console.error = (...a) => { errors.push(a.map(String).join(" ")); };
  const load = H.loader({
    react: React, "react-native": rn,
    "@react-navigation/native": { useNavigation: () => ({ navigate: (...a) => navs.push(a), goBack() {} }), useFocusEffect: (cb) => React.useEffect(() => cb(), [cb]), useIsFocused: () => true },
    "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, removeItem: async () => {} } },
    "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "MIcon" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "/ui/FlatGradient": { LinearGradient: "LinearGradient" },
    "/context/AuthContext": { AuthContext },
    "/api/api": { __esModule: true, default: { get: async () => ({ data: { success: true, data: null } }), post: async () => ({ data: { success: true } }) } },
    "/engagement/hooks/useEngagement": { useEngagement: () => ({ me, refresh: async () => {} }) },
    "/engagement/hooks/useReferrals": { useReferrals: () => ({ ...refs, refresh: async () => {} }) },
    "/engagement/components/Dot": { __esModule: true, default: "Dot" },
    "/components/GuestGuard": { __esModule: true, default: (p) => ({ type: "GuestGuard", props: { children: p.children ?? null } }) },
    "/hooks/useFlag": { __esModule: true, default: (name) => flags[name] === true },
    "/analytics/funnel": { __esModule: true, funnel: () => {} },
    "/utils/clipboard": { __esModule: true, copyToClipboard: async () => true },
    "/ui/ShareCard": { __esModule: true, default: "ShareCardSheet" },
    "/components/AmbassadorForm": { __esModule: true, default: "AmbassadorForm", isAllowed: (u) => /^https:\/\/(forms\.gle|docs\.google\.com\/forms)\//.test(u) },
    "/crew/crew": { __esModule: true, myApplication: async () => application }, // Points.js uses only this
    "/crew/SquadCard": { __esModule: true, default: (p) => ({ type: "SquadCard", props: { ...p, children: null } }) },
  });
  contexts.set(AuthContext, guest ? { token: null, user: null, isGuest: true } : { token: "tok", user, isGuest: false });
  let m = null;
  let threw = null;
  try {
    m = mount(React.createElement(load(path.join(H.SRC, "components/Points.js")).default));
  } catch (e) { threw = e; }
  return { m, threw, errors, navs, restore: () => { console.error = realError; } };
}

(async () => {
  for (const [fl, flags] of FLAGSETS) {
    console.log(`── ${fl}`);
    for (const [label, c] of CASES) {
      const r = render({ ...c, flags });
      await H.tick(10);
      r.restore();
      const text = r.m ? H.textOf(r.m.tree) : "";
      ok(!r.threw && r.errors.length === 0 && text.length > 0, `${label}: renders, no error`, r.threw ? String(r.threw.stack || r.threw).split("\n").slice(0, 3).join(" | ") : r.errors.slice(0, 2).join(" | "));
      if (r.m) r.m.unmount();
    }
  }
  console.log("── ambassador button with ambassadorV2 (approved → the hub)");
  {
    const r = render({ me: FULL_ME, refs: {}, flags: { ambassadorV2: true }, application: { status: "approved" } });
    await H.tick(10);
    r.restore();
    ok(!r.threw && r.m && H.textOf(r.m.tree).length > 0, "an approved ambassador: renders", String(r.threw || ""));
    if (r.m) r.m.unmount();
  }
  console.log("── the split files themselves import what they use (the crash)");
  {
    const src = H.read("app/src/components/crew/PointsCards.js");
    ok(/import \{[^}]*\bInteractionManager\b[^}]*\} from 'react-native'/.test(src), "PointsCards.js imports InteractionManager");
  }
  done();
})().catch((e) => { process.stderr.write(String((e && e.stack) || e) + String.fromCharCode(10)); process.exit(1); });
