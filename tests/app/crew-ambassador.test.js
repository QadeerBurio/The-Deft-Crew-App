// P2 ambassador programme in the app (flag ambassadorV2; squad: squadMission) (upgrade/p2-ambassador):
//   crew/crew.js: the server calls (/crew/...), the campus line (real count, "be the first at <uni>", or nothing), the
//     next real level name, application status words, re-apply rule, the form body, the draft and the old "applied"
//     key, the 6-hour invitation check
//   AmbassadorInviteHost: flag off / guest → nothing; never while the tour runs or is held; shows the server's moment,
//     holds the tour while open; "tell me more" → the intro; "don't ask again" → never
//   AmbassadorIntro: 4 cards, the real campus count or "be the first", no campus card when unknown
//   SquadCard / CrewDailyCard: nothing with the flag off or without the server's numbers; real numbers only
//   wiring (source): screens registered + in HOME_STACK, App mounts the host, Home the daily card, the drawer label,
//     Points keeps the Google Form and today's copy with the flag off
//   node tests/app/crew-ambassador.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

const store = new Map();
const AsyncStorage = {
  getItem: async (k) => (store.has(k) ? store.get(k) : null),
  setItem: async (k, v) => { store.set(k, String(v)); },
  removeItem: async (k) => { store.delete(k); },
};
const calls = [];
let replies = {};
const reply = (method, url) => {
  const r = replies[`${method} ${url}`];
  if (r instanceof Error) return Promise.reject(r);
  return Promise.resolve({ data: { success: true, data: typeof r === "function" ? r() : r ?? null } });
};
const api = {
  get: (url) => { calls.push(`GET ${url}`); return reply("GET", url); },
  post: (url, body) => { calls.push(`POST ${url} ${JSON.stringify(body || {})}`); return reply("POST", url); },
};

function setup({ flags = {}, auth = { token: "t", user: { _id: "U1", name: "Sana Malik", university: { name: "NED University" } }, isGuest: false }, tour = { running: false } } = {}) {
  const { React, mount } = H.makeReact();
  const { rn } = H.makeRN({ Share: { share: async () => ({}) }, Linking: { openURL: async () => {} } });
  const held = new Set(); const holds = [];
  const navs = [];
  const AuthContext = React.createContext(auth);
  const TourContext = React.createContext(tour);
  const comp = (name) => ({ __esModule: true, default: name });
  const mocks = {
    react: React, "react-native": rn,
    "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage },
    "../api/api": { __esModule: true, default: api },
    "expo-image-picker": {},
    "../ui/Sheet": comp("Sheet"), "../ui/Button": comp("Button"), "../ui/Card": comp("Card"),
    "../../ui/Screen": comp("Screen"), "../../ui/ScreenHeader": comp("ScreenHeader"), "../../ui/Card": comp("Card"), "../../ui/Button": comp("Button"),
    "../../ui/Skeleton": { SkeletonBlock: "SkeletonBlock" }, "../../engagement/components/Dot": comp("Dot"),
    "../context/AuthContext": { AuthContext }, "../../context/AuthContext": { AuthContext },
    "../engagement/tour/TourProvider": { TourContext },
    "../engagement/tour/tourGate": { holdTour: (k) => { held.add(k); holds.push(`hold:${k}`); }, releaseTour: (k) => { held.delete(k); holds.push(`release:${k}`); }, isTourHeld: () => held.size > 0 },
    "../hooks/useFlag": { __esModule: true, default: (n) => flags[n] ?? false },
    "../navigation/navigationRef": { navigationRef: {} },
    "../navigation/routes": { navigateAnywhere: (ref, name, params) => { navs.push([name, params]); return true; } },
  };
  const load = H.loader(mocks);
  return { React, mount, load, held, holds, navs };
}

(async () => {
  console.log("-- crew.js");
  let env = setup();
  const C = env.load(path.join(H.SRC, "crew", "crew.js"));
  ok(C.campusLine({ count: 3, university: "NED University" }) === "3 ambassadors at NED University already." && C.campusLine({ count: 1, university: "LUMS" }) === "1 ambassador at LUMS already.", "campus line: the real count");
  ok(C.campusLine({ count: 0, university: "NED University" }) === "be the first at NED University.", "…none yet: 'be the first at <uni>'");
  ok(C.campusLine(null) === null && C.campusLine({}) === null, "…unknown: nothing (no made-up number)");
  ok(C.nextLevel([])?.name === "deft rookie" && C.nextLevel(["rookie", "starter"]).name === "deft main character" && C.nextLevel(["rookie", "starter"]).discount.pct === 10, "next level: the real names from the level list (with its discount)");
  ok(C.nextLevel(["rookie", "starter", "silver", "gold", "platinum", "founder"]) === null, "…none at the top");
  ok(C.statusLine({ status: "pending" }).includes("7 working days") && C.statusLine({ status: "rejected", reviewNote: "tell us more", canApplyAgainAt: "2026-12-30T00:00:00Z" }) === "not this time. tell us more you can apply again from 2026-12-30.", "status words with the reviewer's note and the date");
  ok(C.canApply({ status: "none" }) && !C.canApply({ status: "pending" }) && !C.canApply({ status: "approved" }) && !C.canApply({ status: "rejected", canApplyAgainAt: new Date(Date.now() + 864e5).toISOString() }) && C.canApply({ status: "rejected", canApplyAgainAt: new Date(Date.now() - 1000).toISOString() }), "re-apply only after the 30 days");
  const b = C.applicationBody({ why: "  i run ieee ", whyChips: ["i love finding deals", "made up"], groups: "ieee, , debating", handle: "@sana" });
  ok(b.why === "i run ieee" && b.whyChips.join() === "i love finding deals" && b.groups.join("|") === "ieee|debating" && b.handle === "sana", "the form body: chips from the list only, groups split, handle without @", JSON.stringify(b));
  await C.saveDraft("U1", { why: "draft" });
  ok((await C.readDraft("U1")).why === "draft", "the draft is kept on the phone");
  await C.markApplied("U1");
  ok(store.get("@tdc_ambassador_applied:U1") === "1" && (await C.readDraft("U1")) === null, "sent: the old 'applied' key written (Points reads it), the draft cleared");
  const t0 = Date.UTC(2026, 10, 23, 10);
  ok((await C.inviteDue("U1", t0)) === true && (await C.inviteDue("U1", t0 + 3600e3)) === false && (await C.inviteDue("U1", t0 + 6 * 3600e3)) === true, "the invitation is checked at most every 6 hours per account");
  ok((await C.inviteDue(null, t0)) === false, "…never signed out");
  replies = { "GET /crew/daily-card": { card: { brand: "Chai Spot" } }, "POST /crew/credentials/C1/link": { url: "https://x/pdf" } };
  ok((await C.getDailyCard()).brand === "Chai Spot" && (await C.credentialLink("C1")).url === "https://x/pdf", "the calls go to /crew/... and read data");
  ok(calls.includes("GET /crew/daily-card") && calls.includes("POST /crew/credentials/C1/link {}"), "…paths", calls.join(" | "));
  ok(C.endsIn(new Date(Date.now() + 3.5 * 864e5).toISOString()) === "ends in 4 days" && C.endsIn(new Date(Date.now() - 1000).toISOString()) === "", "ends in N days; nothing once ended");
  const err = C.crewError({ response: { data: { code: "TOO_SOON", message: "you can apply again from 2026-12-30." } } });
  ok(err.code === "TOO_SOON" && err.message.startsWith("you can apply again"), "server errors keep the server's words");
  ok(C.crewError(new Error("Network Error")).code === "OFFLINE", "no reply: offline");

  console.log("-- the invitation sheet");
  const host = async (opts, rep) => {
    const e = setup(opts);
    replies = rep; calls.length = 0; store.clear();
    const Host = e.load(path.join(H.SRC, "crew", "AmbassadorInviteHost.js")).default;
    const realSetTimeout = global.setTimeout;
    global.setTimeout = (fn) => { fn(); return 0; }; // the 4 s wait
    const m = e.mount(e.React.createElement(Host));
    global.setTimeout = realSetTimeout;
    await H.tick(20); m.rerender();
    return { ...e, m };
  };
  let h = await host({ flags: {} }, { "GET /crew/invitation": { show: true, moment: "friend_joined" } });
  ok(!calls.length && h.m.tree == null, "flag off: no call, nothing shown");
  h = await host({ flags: { ambassadorV2: true }, auth: { isGuest: true } }, { "GET /crew/invitation": { show: true, moment: "friend_joined" } });
  ok(!calls.length, "guest: no call");
  h = await host({ flags: { ambassadorV2: true }, tour: { running: true } }, { "GET /crew/invitation": { show: true, moment: "friend_joined" } });
  ok(!calls.length, "the app tour is running: no call");
  h = await host({ flags: { ambassadorV2: true } }, { "GET /crew/invitation": { show: false, reason: "too_new" } });
  ok(calls.join() === "GET /crew/invitation" && h.m.tree == null && !h.held.size, "the server says no: nothing shown, the tour not held");
  h = await host({ flags: { ambassadorV2: true } }, { "GET /crew/invitation": { show: true, moment: "friend_joined" }, "POST /crew/invitation": { answer: "more" } });
  ok(h.m.tree?.type === "Sheet" && H.textOf(h.m.tree).includes("a friend just joined with your code"), "the server says yes: the sheet with the good moment", H.textOf(h.m.tree));
  ok(h.held.has("ambassador-invite"), "…the tour is held while it shows");
  H.find(h.m.tree, (n) => n.props?.title === "tell me more").props.onPress();
  await H.tick(10); h.m.rerender();
  ok(calls.includes('POST /crew/invitation {"answer":"more"}') && h.navs[0]?.[0] === "AmbassadorIntro" && h.m.tree == null && !h.held.size, "'tell me more' → answered, the intro opens, the tour released");
  h = await host({ flags: { ambassadorV2: true } }, { "GET /crew/invitation": { show: true, moment: "deals_claimed" }, "POST /crew/invitation": { answer: "never" } });
  H.find(h.m.tree, (n) => n.props?.title === "don't ask again").props.onPress();
  await H.tick(10); h.m.rerender();
  ok(calls.includes('POST /crew/invitation {"answer":"never"}') && !h.navs.length && h.m.tree == null, "'don't ask again' → never, nothing opens");

  console.log("-- the intro");
  const intro = async (cc) => {
    const e = setup({ flags: { ambassadorV2: true } });
    replies = { "GET /crew/campus-count": cc, "GET /crew/applications/me": { status: "none" } };
    const Intro = e.load(path.join(H.SRC, "screens", "Crew", "AmbassadorIntro.js")).default;
    const navs = [];
    const m = e.mount(e.React.createElement(Intro, { navigation: { navigate: (n) => navs.push(n) } }));
    await H.tick(20); m.rerender();
    return { m, navs, text: H.textOf(m.tree) };
  };
  let it = await intro({ count: 2, university: "NED University" });
  ok(H.findAll(it.m.tree, (n) => n.type === "Card").length === 4 && it.text.includes("2 ambassadors at NED University already."), "4 cards, the real campus count", it.text);
  ok(it.text.includes("your friend gets 100 points and you get 150 when they join and verify their email"), "the real amounts in the copy");
  H.find(it.m.tree, (n) => n.props?.title === "apply").props.onPress();
  ok(it.navs[0] === "AmbassadorApply", "apply → the form");
  it = await intro({ count: 0, university: "NED University" });
  ok(it.text.includes("be the first at NED University."), "no ambassadors yet: 'be the first at NED University'");
  it = await intro(null);
  ok(H.findAll(it.m.tree, (n) => n.type === "Card").length === 3 && !it.text.includes("already.") && !it.text.includes("be the first"), "unknown: no campus card (no made-up number)");

  console.log("-- squad and daily card");
  env = setup();
  const SQ = env.load(path.join(H.SRC, "crew", "SquadCard.js"));
  ok(SQ.squadLine({ target: 3, verified: 1, rewarded: false, rewardPoints: 100 }) === "2 more friends this week: +100 pts." && SQ.squadLine({ target: 3, verified: 2, rewardPoints: 100 }) === "1 more friend this week: +100 pts." && SQ.squadLine({ target: 3, verified: 3, rewarded: true, rewardPoints: 100 }).includes("+100 pts are yours"), "squad line: the server's numbers");
  replies = { "GET /crew/squad": { target: 3, verified: 1, rewarded: false, rewardPoints: 100, endsAt: new Date(Date.now() + 2 * 864e5).toISOString() } };
  calls.length = 0;
  let m = env.mount(env.React.createElement(SQ.default));
  await H.tick(10); m.rerender();
  ok(m.tree == null && !calls.length, "squadMission off: nothing, no call");
  env = setup({ flags: { squadMission: true } });
  m = env.mount(env.React.createElement(env.load(path.join(H.SRC, "crew", "SquadCard.js")).default));
  await H.tick(10); m.rerender();
  ok(H.textOf(m.tree).includes("1 of 3 verified") && H.textOf(m.tree).includes("2 more friends this week: +100 pts."), "on: 1 of 3 from the server", H.textOf(m.tree));
  env = setup({ flags: { ambassadorV2: true } });
  const DC = env.load(path.join(H.SRC, "crew", "CrewDailyCard.js"));
  ok(DC.shareText({ brand: "Chai Spot", followerPercent: 20, code: "SANA01" }) === "20% off at Chai Spot for tdc students. join tdc with my code SANA01.", "daily card share text: the real brand, % and code");
  replies = { "GET /crew/daily-card": { card: null } };
  m = env.mount(env.React.createElement(DC.default));
  await H.tick(10); m.rerender();
  ok(m.tree == null, "no live campaign: no card");
  replies = { "GET /crew/daily-card": { card: { brand: "Chai Spot", followerPercent: 20, code: "SANA01", line: "today: share Chai Spot's 20% off with your campus group.", endsAt: new Date(Date.now() + 864e5 * 3).toISOString() } } };
  env = setup({ flags: { ambassadorV2: true } });
  m = env.mount(env.React.createElement(env.load(path.join(H.SRC, "crew", "CrewDailyCard.js")).default));
  await H.tick(10); m.rerender();
  ok(H.textOf(m.tree).includes("today: share Chai Spot's 20% off"), "a live campaign: the card");

  console.log("-- wiring");
  const routes = H.read("app/src/navigation/routes.js");
  const drawer = H.read("app/src/navigation/DrawerNavigator.js");
  ok(["AmbassadorIntro", "AmbassadorApply", "AmbassadorHub"].every((n) => routes.includes(`"${n}"`) && (drawer.includes(`<Stack.Screen name="${n}"`) || drawer.includes(`<HS.Screen name="${n}"`))), "the three screens are registered and in HOME_STACK");
  ok(/ambassadorOn && item\.route === 'Points' \? 'the crew · ambassador' : item\.label/.test(drawer) && drawer.includes("key={item.label}"), "drawer: 'the crew · ambassador' with the flag on (same route, same key)");
  const app = H.read("App.js");
  ok(app.includes("<AmbassadorInviteHost />"), "App mounts the invitation host");
  const home = H.read("app/src/screens/Home.js");
  ok(home.includes("{signedIn && <CrewDailyCard />}"), "Home shows the daily card (signed in; the card checks the flag)");
  const pts = H.read("app/src/components/Points.js");
  ok(pts.includes("const AMBASSADOR_FORM_URL = 'https://forms.gle/") && /\) : AMBASSADOR_FORM_READY && \(\s*<AmbassadorCard applied=\{ambassadorApplied\} onPress=\{\(\) => setAmbassadorFormOpen\(true\)\} \/>/.test(pts), "Points: flag off keeps the Google Form card as today");
  ok(pts.includes("{ mood: 'cheeky', label: 'a friend joins with your code', value: '+50' }") && pts.includes("`friend joins: you get +50. friend sorts a card: +100 more.\\n\\n`"), "…and today's copy with the flags off");
  ok(pts.includes("'a friend joins and verifies their email', value: '+150'") && pts.includes("your friend gets 100 points and you get 150 when they join and verify their email."), "…the real amounts with the flags on");
  ok(H.read("app/src/crew/crew.js").includes("`@tdc_ambassador_applied:${userId}`") && pts.includes("`@tdc_ambassador_applied:${userId}`"), "the old 'applied' key is the same in both places");
  const hub = H.read("app/src/screens/Crew/AmbassadorHub.js");
  ok(hub.includes("uploadImageToCloudinary(photo)") && hub.includes("postMoment(caption.trim(), url)") && hub.includes("credentialLink(id)"), "hub: the moment uses the Cloudinary upload, PDFs open through the link");

  done();
})().catch((e) => { console.error(e); process.exit(1); });
