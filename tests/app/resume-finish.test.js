// P3d (resume finish), app side:
//   feedback (resumeV2 + resumeFeedback): the screen shows what works / what to fix / next steps; "fix it" opens the
//     builder at that section (stepKey; step 1-7 too for the older param); the fresher steps (8-11) by stepKey; a
//     failed load says so with "try again"; too many requests → a plain line; rules only → says so; the dashboard
//     button only with both flags; the builder reads stepKey only with resumeV2
//   node tests/app/resume-finish.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

function setup({ params = { resumeId: "r1" }, api = {} } = {}) {
  const { React, mount, contexts } = H.makeReact();
  const { rn } = H.makeRN();
  const nav = { calls: [], goBack() {}, navigate: (...a) => nav.calls.push(a) };
  const events = [];
  const el = (type) => (p) => ({ type, props: { ...p, accessibilityLabel: p.accessibilityLabel || p.label || p.title, children: p.children ?? null } });
  const load = H.loader({
    react: React, "react-native": rn,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@react-navigation/native": { useRoute: () => ({ params }), useNavigation: () => nav },
    "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async () => null, setItem: async () => {} } },
    "/analytics/funnel": { __esModule: true, funnel: async (name, meta) => { events.push([name, meta]); }, default: async () => {} },
    "/ui/ScreenHeader": { __esModule: true, default: (p) => ({ type: "Header", props: { title: p.title, children: null } }) },
    "/ui/Card": { __esModule: true, default: (p) => ({ type: "Card", props: { children: p.children } }) },
    "/ui/Button": { __esModule: true, default: el("Button") },
    "/ui/Skeleton": { __esModule: true, default: () => ({ type: "Skeleton", props: { children: null } }) },
    "/resume/finishApi": { __esModule: true, ...api },
  });
  return { React, mount, contexts, load, nav, events };
}

(async () => {
  console.log("── feedback screen");
  const FEEDBACK = {
    ai: true, cached: false,
    strong: [{ text: "your education is complete, with dates.", source: "rules" }],
    weak: [{ text: "1 line starts with \"responsible for…\"", stepKey: "experience", source: "rules" }],
    improvements: [
      { text: "add a project", stepKey: "projects", points: 15, source: "rules" },
      { text: "add a society or club you're part of", stepKey: "activities", source: "rules" },
      { text: "for your daraz listings work: did this save time or money? if yes, add it.", stepKey: "experience", source: "ai" },
      { text: "a general point", stepKey: null, source: "ai" },
    ],
  };
  {
    let calls = 0;
    const t = setup({ api: { getFeedback: async (id) => { calls++; if (id !== "r1") throw new Error("wrong id"); return FEEDBACK; } } });
    const m = t.mount(t.React.createElement(t.load(path.join(H.SRC, "screens/Resume/ResumeFeedback.js")).default));
    ok(/reading your resume like a recruiter/.test(H.textOf(m.tree)), "while loading: a plain line and a skeleton");
    await H.tick(5);
    const text = H.textOf(m.tree);
    ok(calls === 1 && /what works/.test(text) && /what to fix/.test(text) && /next steps/.test(text) && /how a recruiter would read it/.test(text), "three sections, with the AI", text.slice(0, 160));
    ok(t.events.some((e) => e[0] === "resume_feedback_opened" && e[1].refId === "r1"), "funnel: resume_feedback_opened");
    const fixes = H.findAll(m.tree, (n) => n.type === "Button" && n.props.title === "fix it");
    ok(fixes.length === 4, "fix it on weak points and next steps with a section (not on strong points, not without a section)", fixes.length);
    H.byLabel(m.tree, "fix it: add a project").props.onPress();
    ok(JSON.stringify(t.nav.calls[0]) === JSON.stringify(["ResumeBuilder", { resumeId: "r1", stepKey: "projects", step: 4 }]), "fix it (projects) → the builder at step 4 (stepKey + the older step param)", JSON.stringify(t.nav.calls[0]));
    H.byLabel(m.tree, "fix it: add a society or club you're part of").props.onPress();
    ok(JSON.stringify(t.nav.calls[1]) === JSON.stringify(["ResumeBuilder", { resumeId: "r1", stepKey: "activities" }]), "fix it (activities, a fresher step) → stepKey only", JSON.stringify(t.nav.calls[1]));
    ok(t.events.some((e) => e[0] === "resume_feedback_fix_projects") && t.events.some((e) => e[0] === "resume_feedback_fix_activities"), "funnel: resume_feedback_fix_<section>");
    m.unmount();
  }
  {
    let fail = { response: { status: 502 } };
    const t = setup({ api: { getFeedback: async () => { if (fail) throw fail; return { ...FEEDBACK, ai: false, strong: [], weak: [], improvements: FEEDBACK.improvements.slice(0, 1) }; } } });
    const m = t.mount(t.React.createElement(t.load(path.join(H.SRC, "screens/Resume/ResumeFeedback.js")).default));
    await H.tick(5);
    ok(/feedback didn't load/.test(H.textOf(m.tree)) && H.byLabel(m.tree, "try again"), "a failed load: says so, with try again");
    fail = null;
    H.byLabel(m.tree, "try again").props.onPress();
    await H.tick(5);
    ok(/a quick check from the rules/.test(H.textOf(m.tree)) && !/what works/.test(H.textOf(m.tree)) && /next steps/.test(H.textOf(m.tree)), "try again → rules only: says so; empty sections are hidden");
    m.unmount();
    const t2 = setup({ api: { getFeedback: async () => { throw { response: { status: 429 } }; } } });
    const m2 = t2.mount(t2.React.createElement(t2.load(path.join(H.SRC, "screens/Resume/ResumeFeedback.js")).default));
    await H.tick(5);
    ok(/a lot of help this hour/.test(H.textOf(m2.tree)), "too many requests → a plain line");
    m2.unmount();
  }
  {
    const dash = H.read("app/src/screens/Resume/ResumeDashboard.js");
    ok(/const feedbackOn = useFlag\("resumeFeedback"\) === true && resumeV2;/.test(dash) && /\{feedbackOn && \(/.test(dash), "dashboard: 'get recruiter feedback' only with resumeV2 + resumeFeedback");
    const b = H.read("app/src/screens/Resume/ResumeBuilder.js");
    ok(/useEffect\(\(\) => \{ if \(v2 && startKey && KEY_TO_ID\[startKey\]\) setActiveStep\(KEY_TO_ID\[startKey\]\); \}, \[v2, startKey\]\);/.test(b), "builder: stepKey opens that section only with resumeV2 (the step param as before)");
    ok(/name="ResumeFeedback"/.test(H.read("app/src/navigation/ResumeNavigator.js")) && /'ResumeFeedback',/.test(H.read("app/src/navigation/DrawerNavigator.js")), "ResumeFeedback registered (full screen)");
  }
  done();
})().catch((e) => { console.error(e); process.exit(1); });
