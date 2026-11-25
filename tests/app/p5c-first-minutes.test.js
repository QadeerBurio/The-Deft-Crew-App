// P5c (flags off by default):
//   homeNextAction: one mission-style card at the top of Home from GET /engagement/next-action; nothing → nothing
//   onboardingGoals: once, for a student without goals: 3 "what tdc does" cards, then pick up to 2 goals →
//     POST /engagement/goals and Home's engagement data refreshes; "later" hides it on this phone for good
// Real NextActionCard / GoalsSheet; api, flags, account, phone storage and React Query are small fakes.
//   node tests/app/p5c-first-minutes.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const { React, mount } = H.makeReact();
  const { rn } = H.makeRN();
  const flags = { homeNextAction: false, onboardingGoals: false };
  const calls = []; let action = null; let goals = []; const invalidated = []; const store = new Map();
  const api = {
    get: async (url) => { calls.push(["GET", url]); if (url === "/engagement/next-action") return { data: { action } }; if (url === "/engagement/home") return { data: { goals } }; return { data: {} }; },
    post: async (url, body) => { calls.push(["POST", url, body]); return { data: { goals: body.goals } }; },
  };
  // React Query stand-in: runs queryFn once when enabled
  const rq = {
    useQuery: ({ queryFn, enabled }) => { const [d, setD] = React.useState(undefined); React.useEffect(() => { if (enabled) Promise.resolve(queryFn()).then(setD); }, [enabled]); return { data: d }; },
    useQueryClient: () => ({ setQueryData() {}, invalidateQueries: (q) => invalidated.push(q.queryKey) }),
  };
  const account = { user: { _id: "u1" }, isGuest: false };
  const load = H.loader({
    react: React, "react-native": rn, "@tanstack/react-query": rq,
    "../../api/api": { __esModule: true, default: api },
    "../../hooks/useFlag": { __esModule: true, default: (n) => flags[n] },
    "../../context/AuthContext": { AuthContext: { _default: account } },
    "../../engagement/components/MissionCard": { __esModule: true, default: (p) => React.createElement("MissionCard", p) },
    "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, v); } } },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "../../ui": { Sheet: (p) => React.createElement("Sheet", p, p.children, p.footer), Button: (p) => React.createElement("Button", p), Chip: (p) => React.createElement("Chip", p) },
  });
  const N = load(path.join(H.SRC, "screens/home/NextActionCard.js"));
  const Gs = load(path.join(H.SRC, "screens/home/GoalsSheet.js"));
  const text = (t) => { const out = []; (function w(x) { if (x == null || x === false) return; if (typeof x === "string") return out.push(x); if (Array.isArray(x)) return x.forEach(w); w(x.props?.children); })(t); return out.join(" "); };

  // next action
  let m = mount(React.createElement(N.default, { signedIn: true }));
  await H.tick(10);
  ok(m.tree == null && !calls.some((c) => c[1] === "/engagement/next-action"), "next action, flag off: nothing, nothing asked");
  m.unmount();
  flags.homeNextAction = true; action = { kind: "finish_resume", mood: "sorted", line: "your resume is 55% done. finish it.", cta: { label: "finish it", route: "Resume", params: {} } };
  m = mount(React.createElement(N.default, { signedIn: true }));
  await H.tick(10);
  const card = H.find(m.tree, (n) => n.type === "MissionCard");
  ok(card && card.props.line === "your resume is 55% done. finish it." && card.props.ctaRoute === "Resume" && card.props.ctaLabel === "finish it" && card.props.feature === "resume", "flag on: a mission-style card with the server's line and its screen", JSON.stringify(card?.props));
  m.unmount();
  action = null;
  m = mount(React.createElement(N.default, { signedIn: true }));
  await H.tick(10);
  ok(m.tree == null, "the server has nothing to suggest: nothing shown");
  m.unmount();
  m = mount(React.createElement(N.default, { signedIn: false }));
  await H.tick(10);
  ok(m.tree == null, "a guest: nothing");
  m.unmount();
  ok(N.NEXT_ACTION_KEY[0] === "engagement", "its query sits under 'engagement' (Home's refresh refreshes it)");

  // goals
  calls.length = 0;
  m = mount(React.createElement(Gs.default));
  await H.tick(10);
  ok(m.tree == null && !calls.length, "goals, flag off: nothing, nothing asked");
  m.unmount();
  flags.onboardingGoals = true; goals = ["internship"];
  m = mount(React.createElement(Gs.default));
  await H.tick(10);
  ok(m.tree == null, "goals already picked: nothing");
  m.unmount();
  goals = [];
  m = mount(React.createElement(Gs.default));
  await H.tick(10);
  ok(m.tree?.type === "Sheet" && m.tree.props.title === "what tdc does for you" && /deals near you/.test(text(m.tree)) && /get hired/.test(text(m.tree)) && /your campus/.test(text(m.tree)), "no goals yet: the sheet, three cards first", text(m.tree));
  H.find(m.tree, (n) => n.type === "Button" && n.props.title === "next").props.onPress();
  await H.tick(5);
  ok(m.tree.props.title === "what do you want from tdc?" && H.find(m.tree, (n) => n.type === "Button" && n.props.title === "done").props.disabled === true, "'next' → pick your goals; 'done' waits for one");
  const chip = (label) => H.find(m.tree, (n) => n.type === "Chip" && n.props.label === label);
  chip("meet people").props.onPress(); await H.tick(2);
  chip("find an internship").props.onPress(); await H.tick(2);
  chip("save money").props.onPress(); await H.tick(2);
  ok(chip("meet people").props.selected && chip("find an internship").props.selected && !chip("save money").props.selected, "at most two can be picked");
  goals = ["meet_people", "internship"];
  H.find(m.tree, (n) => n.type === "Button" && n.props.title === "done").props.onPress();
  await H.tick(10);
  ok(JSON.stringify(calls.find((c) => c[0] === "POST")) === '["POST","/engagement/goals",{"goals":["meet_people","internship"]}]' && invalidated.some((k) => k.join() === "engagement"), "'done' → POST /engagement/goals and Home's engagement data refreshes");
  m.unmount();
  goals = [];
  m = mount(React.createElement(Gs.default));
  await H.tick(10);
  H.find(m.tree, (n) => n.type === "Button" && n.props.title === "later").props.onPress();
  await H.tick(5);
  ok(m.tree == null && store.get(Gs.LATER_KEY("u1")) === "1", "'later' closes it and remembers on this phone");
  m.unmount();
  m = mount(React.createElement(Gs.default));
  await H.tick(10);
  ok(m.tree == null, "…not asked again");
  m.unmount();

  const home = H.read("app/src/screens/Home.js");
  ok(/<NextActionCard signedIn=\{signedIn\} \/>/.test(home) && /\{signedIn && <GoalsSheet \/>\}/.test(home), "Home shows both (above the daily drop)");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
