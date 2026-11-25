// P5b polish (flags off by default):
//   cityCheck: once on Home, "is your city right?" for a signed-in student whose server-side city is the old
//              automatic "Karachi" and not yet confirmed; "yes, karachi" / another city → POST /api/me/city, then gone
//   headerSearch: the header's brand search button (the search box and its submit already existed; Brands reads
//              the query); a close button while searching; no button with the flag off
// Real CityCheckCard.js (api, flag, account and the dropdown are fakes); source checks on DrawerNavigator / Home.
//   node tests/app/p5b-polish.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const { React, mount } = H.makeReact();
  const { rn } = H.makeRN();
  let flag = false; let me = { role: "student", city: "Karachi" }; let failPost = false;
  const calls = [];
  const api = {
    get: async (url) => { calls.push(["GET", url]); return { data: me }; },
    post: async (url, body) => { calls.push(["POST", url, body]); if (failPost) { const e = new Error("x"); e.response = { status: 400, data: { error: "that doesn't look like a city name." } }; throw e; } return { data: { ok: true } }; },
  };
  const account = { token: "tok", isGuest: false };
  const load = H.loader({
    react: React, "react-native": rn,
    "../../api/api": { __esModule: true, default: api },
    "../../context/AuthContext": { AuthContext: { _default: account } },
    "../../hooks/useFlag": { __esModule: true, default: () => flag },
    "../../ui": { Card: (p) => React.createElement("Card", p, p.children), Button: (p) => React.createElement("Button", p) },
    "../../components/CityDropdown": { __esModule: true, default: (p) => React.createElement("CityDropdown", p) },
  });
  const M = load(path.join(H.SRC, "screens/home/CityCheckCard.js"));
  const Card = M.default;
  const text = (t) => { const out = []; (function w(x) { if (x == null || x === false) return; if (typeof x === "string") return out.push(x); if (Array.isArray(x)) return x.forEach(w); w(x.props?.children); })(t); return out.join(" "); };

  ok(M.needsCityCheck({ role: "student", city: "Karachi" }) && !M.needsCityCheck({ role: "student", city: "Karachi", cityConfirmedAt: "2026-11-25" }) && !M.needsCityCheck({ role: "student", city: "Lahore" }) && !M.needsCityCheck({ role: "student", city: "" }) && !M.needsCityCheck({ role: "brand", city: "Karachi" }) && !M.needsCityCheck(null), "asked only: a student, city Karachi, never confirmed");

  let m = mount(React.createElement(Card));
  await H.tick(10);
  ok(m.tree == null && calls.length === 0, "flag off: nothing shown, nothing asked of the server");
  m.unmount();

  flag = true;
  m = mount(React.createElement(Card));
  await H.tick(10);
  ok(calls[0]?.[1] === "/auth/me" && /is your city right\?/.test(text(m.tree)) && /we have karachi/.test(text(m.tree)), "flag on, Karachi never confirmed: the card", text(m.tree));
  const btn = H.find(m.tree, (n) => n.type === "Button");
  const dd = H.find(m.tree, (n) => n.type === "CityDropdown");
  ok(btn && btn.props.accessibilityLabel === "yes, my city is karachi" && dd && dd.props.selected === "Karachi" && dd.props.options.includes("Lahore"), "…'yes, karachi' and the city list (Karachi selected)");
  btn.props.onPress();
  await H.tick(10);
  ok(JSON.stringify(calls.at(-1)) === '["POST","/me/city",{"confirm":true}]' && m.tree == null, "'yes, karachi' → POST /me/city { confirm: true }, the card goes away");
  m.unmount();

  calls.length = 0;
  m = mount(React.createElement(Card));
  await H.tick(10);
  H.find(m.tree, (n) => n.type === "CityDropdown").props.onSelect("Lahore");
  await H.tick(10);
  ok(JSON.stringify(calls.at(-1)) === '["POST","/me/city",{"city":"Lahore"}]' && m.tree == null, "another city → POST /me/city { city }, then gone");
  m.unmount();

  failPost = true;
  m = mount(React.createElement(Card));
  await H.tick(10);
  H.find(m.tree, (n) => n.type === "Button").props.onPress();
  await H.tick(10);
  ok(m.tree != null && /that doesn't look like a city name/.test(text(m.tree)), "the server says no: the card stays with its sentence", text(m.tree));
  m.unmount(); failPost = false;

  for (const [label, who] of [["confirmed already", { role: "student", city: "Karachi", cityConfirmedAt: "2026-11-25" }], ["another city", { role: "student", city: "Lahore" }], ["a brand", { role: "brand", city: "Karachi" }]]) {
    me = who;
    m = mount(React.createElement(Card));
    await H.tick(10);
    ok(m.tree == null, `${label}: nothing shown`);
    m.unmount();
  }
  account.isGuest = true; me = { role: "student", city: "Karachi" }; calls.length = 0;
  m = mount(React.createElement(Card));
  await H.tick(10);
  ok(m.tree == null && calls.length === 0, "a guest: nothing shown, nothing asked");
  m.unmount(); account.isGuest = false;

  const home = H.read("app/src/screens/Home.js");
  ok(/import CityCheckCard from "\.\/home\/CityCheckCard";/.test(home) && /\{signedIn && <CityCheckCard \/>\}/.test(home), "Home shows it to signed-in students, above near me");
  const signup = H.read("app/src/screens/SignupScreen.js");
  ok(/import \{ CITIES \} from "\.\/pkCities";/.test(signup) && /export const CITIES = \[/.test(H.read("app/src/screens/pkCities.js")), "the city list is shared with signup (moved unchanged)");

  // empty states (polishEmptyStates): the design system's EmptyState (Dot face, one line, one action); off = as before
  {
    const { React: R2, mount: mount2 } = H.makeReact();
    const { rn: rn2 } = H.makeRN();
    let polish = false;
    const loadF = H.loader({
      react: R2, "react-native": rn2,
      "@expo/vector-icons": { Ionicons: "Icon" }, "../../ui/FlatGradient": { LinearGradient: "LinearGradient" },
      "../../lib/tdcSounds": new Proxy({}, { get: () => () => {} }),
      "../../ui": { EmptyState: "EmptyState" },
      "../../hooks/useFlag": { __esModule: true, default: () => polish },
    });
    const isEmptyState = (el) => !!el && (el.type === "EmptyState" || el.type?.name === "EmptyState");
    const Feed = loadF(path.join(H.SRC, "screens/Social/ConfessionFeed.js")).default;
    const empty = (props) => { const m2 = mount2(R2.createElement(Feed, { listData: [], firstLoad: false, scope: "all", renderConfession: () => null, switchScope() {}, setRefreshing() {}, fetchConfessions() {}, handleFabPress: () => "fab", ...props })); const list = H.find(m2.tree, (n) => n.type === "FlatList"); return list.props.ListEmptyComponent; };
    let e = empty({});
    ok(e && !isEmptyState(e) && /no confessions yet/.test(text(e)), "confessions, flag off: the old empty view", text(e));
    polish = true;
    e = empty({});
    ok(e && isEmptyState(e) && e.props.title === "no confessions yet" && e.props.mood === "sleepy" && e.props.actionLabel === "create confession" && e.props.onAction() === "fab", "flag on: EmptyState, same words, the same 'create confession' action");
    const shown = mount2(e).tree;
    ok(shown && shown.type === "EmptyState" && shown.props.title === "no confessions yet", "…rendered: the shared ui EmptyState (loaded only now, with the flag on)", JSON.stringify(shown && shown.type));
    e = empty({ scope: "campus", myUniName: "" });
    ok(isEmptyState(e) && e.props.title === "add your university" && e.props.actionLabel === "edit profile", "…campus without a university: 'add your university', 'edit profile'");
    e = empty({ scope: "campus", myUniName: "NED" });
    ok(isEmptyState(e) && /be the first from NED/.test(e.props.line), "…campus with nothing yet: 'be the first from NED.'");
    const rd = H.read("app/src/screens/Resume/ResumeDashboard.js").replace(/\r\n/g, "\n");
    ok(/const polishEmpty = useFlag\("polishEmptyStates"\) === true;/.test(rd) && /\) : polishEmpty \? \(\n\s*\/\/ P5-4[^\n]*\n\s*<EmptyState mood="sleepy" title="no resume yet" line="build your first one\. it takes a few minutes\." actionLabel="create resume" onAction=\{startNewResume\} \/>/.test(rd), "resumes, flag on: EmptyState with 'create resume'");
    ok(/const startNewResume = \(\) => \{\n\s*if \(!requireAccount\(\)\) return;\n\s*if \(limitReached\) \{[\s\S]{0,260}navigation\.navigate\(newResumeScreen\);\n\s*\};/.test(rd) && /<Text style=\{styles\.emptyTitle\}>no resume found<\/Text>/.test(rd), "…its action follows the same steps (account, the limit, the new-resume screen); flag off: the old view");
    ok(/<Dot mood="broke" size=\{56\} animated=\{false\} \/>/.test(H.read("app/src/screens/MyDiscountScreen.js")), "deals (my discounts) already had a Dot, one line and 'see brands' (unchanged)");
  }

  // celebrations (celebrationsPlus): level up / "cv ready" get "share it" (the share card); then no auto-close
  {
    const { React: R3, mount: mount3 } = H.makeReact();
    const { rn: rn3 } = H.makeRN();
    rn3.Animated = { Value: function V() { this.setValue = () => {}; }, View: "Animated.View", timing: () => ({ start: (cb) => cb && cb() }), spring: () => ({ start: (cb) => cb && cb() }), parallel: () => ({ start: (cb) => cb && cb() }) };
    let plus = false; const cards = [];
    const loadP = H.loader({
      react: R3, "react-native": rn3,
      "./Dot": { __esModule: true, default: "Dot" },
      "../utils/haptics": { pop() {}, success() {} },
      "../../hooks/useFlag": { __esModule: true, default: () => plus },
      "../../ui/ShareCard": { __esModule: true, default: (p) => { cards.push(p); return R3.createElement("ShareCardSheet", p); } },
    });
    const P = loadP(path.join(H.SRC, "engagement/components/CelebrationPopup.js"));
    const realST = global.setTimeout; const timers = [];
    // records the popup's 3 s auto-close (never run); every other timer (the harness's own waits) runs normally
    global.setTimeout = (fn, ms, ...a) => { timers.push(ms); return ms === 3000 ? 1 : realST(fn, ms, ...a); };
    const level = { kind: "tier_unlocked", mood: "hype", line: "you unlocked silver!", cta: { label: "view rewards" }, meta: { tierId: "silver" } };
    ok(JSON.stringify(P.shareCardFor(level)) === '{"variant":"levelUp","data":{"level":"silver"}}' && P.shareCardFor({ kind: "badge", payload: { badgeId: "feature_resume" } })?.variant === "resumeReady" && P.shareCardFor({ kind: "badge", payload: { badgeId: "streak_7" } }) === null && P.shareCardFor({ kind: "confession_likes" }) === null, "shareable: level up (levelUp card with the level) and 'cv ready' (resumeReady); nothing else");
    let m3 = mount3(R3.createElement(P.default, { popup: level, onClose() {}, onNotNow() {} }));
    ok(!H.byLabel(m3.tree, "share it") && timers.includes(3000), "flag off: no share button, closes itself after 3 s (as before)");
    m3.unmount(); timers.length = 0;
    plus = true;
    m3 = mount3(R3.createElement(P.default, { popup: { ...level, line: "you unlocked silver! " }, onClose() {}, onNotNow() {} }));
    const sh = H.byLabel(m3.tree, "share it");
    ok(sh && !timers.includes(3000), "flag on, level up: 'share it', and it stays until the student chooses");
    sh.props.onPress();
    await H.tick(5);
    ok(cards.length >= 1 && cards.at(-1).variant === "levelUp" && cards.at(-1).data.level === "silver" && cards.at(-1).visible === true, "'share it' opens the level-up share card with the level", JSON.stringify(cards.at(-1)));
    m3.unmount(); timers.length = 0;
    m3 = mount3(R3.createElement(P.default, { popup: { kind: "confession_likes", mood: "excited", line: "10 people liked your confession.", cta: { label: "see it", route: "FeedScreen" } }, onClose() {}, onNotNow() {} }));
    ok(/10 people liked your confession\./.test(text(m3.tree)) && /see it/.test(text(m3.tree)) && !H.byLabel(m3.tree, "share it") && timers.includes(3000), "the confession's 10-likes popup shows its line and 'see it' (no share: it stays anonymous)");
    m3.unmount();
    global.setTimeout = realST;
  }

  // P5-7: text scaling capped (MAX_FONT_SCALE, 1.3) on every Text of the upgrade's new screens; none of them animates
  {
    const NEW = ["screens/Resume/ResumeFinish.js", "screens/Resume/ResumeStart.js", "screens/Resume/ResumeCoachChat.js", "screens/Resume/ResumeFeedback.js", "screens/Resume/ResumeImportReview.js", "screens/Crew/AmbassadorIntro.js", "screens/Crew/AmbassadorHub.js", "screens/Crew/AmbassadorApply.js", "screens/Social/ConfessionComposer.js", "screens/Social/ConfessionCard.js", "ui/ShareCard.js", "push/PushAskHost.js", "screens/home/CityCheckCard.js"];
    const uncapped = [], animated = [];
    for (const f of NEW) {
      const s = H.read(`app/src/${f}`);
      const tags = s.match(/<Text\b[^>]*?(?:\/?>)/gs) || [];
      const n = tags.filter((t) => !/maxFontSizeMultiplier/.test(t)).length;
      if (n) uncapped.push(`${f} (${n})`);
      if (/Animated\.(timing|spring|loop|sequence)\(/.test(s) && !/isReduceMotionEnabled|useReducedMotion|reduceMotion/.test(s)) animated.push(f);
    }
    ok(uncapped.length === 0, `every Text in the ${NEW.length} new screens caps its scaling (maxFontSizeMultiplier)`, uncapped.join(", "));
    ok(animated.length === 0, "…and none animates without checking reduce motion", animated.join(", "));
    const cc = H.read("app/src/screens/Social/ConfessionCard.js");
    ok((cc.match(/<TouchableOpacity\s+hitSlop=\{6\}\s+style=\{\[?styles\.actionBtn/g) || []).length === 7, "confession card: the 7 action buttons get 6 pt hit slop (44 pt to touch; owner: for everyone)");
  }

  // header search
  const dn = H.read("app/src/navigation/DrawerNavigator.js").replace(/\r\n/g, "\n");
  ok(/const headerSearchOn = useFlag\('headerSearch'\) === true;/.test(dn), "header: reads headerSearch");
  ok(/\{headerSearchOn && \(\n\s*<TouchableOpacity\n\s*onPress=\{toggleSearch\}[\s\S]{0,200}accessibilityLabel="search brands"/.test(dn), "flag on: a 'search brands' button opens the search");
  ok(/\{searchVisible && headerSearchOn && \([\s\S]{0,300}accessibilityLabel="close search"/.test(dn), "…and a 'close search' button while it is open");
  ok((dn.match(/hitSlop=\{4\}/g) || []).length >= 2, "both are 40 pt with a 4 pt hit slop (48 pt to touch)");
  ok(/navigation\.navigate\('Brands', \{\n\s*query: trimmedQuery,/.test(dn) && /const \{ query \} = route\.params \|\| \{\};/.test(H.read("app/src/screens/Brands.js")) && /if \(query\) setSearchQuery\(query\);/.test(H.read("app/src/screens/Brands.js")), "the submitted search opens Brands with the query, which Brands applies");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
