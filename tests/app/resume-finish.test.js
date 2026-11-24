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

function setup({ params = { resumeId: "r1" }, api = {}, rnExtra = {} } = {}) {
  const { React, mount, contexts } = H.makeReact();
  const { rn } = H.makeRN(rnExtra);
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
  console.log("── verified by tdc");
  {
    const load = H.loader({});
    const P = load(path.join(H.SRC, "services/templates/print.js"));
    const svc = load(path.join(H.SRC, "services/templateService.js"));
    const r = { _id: "r1", personalInfo: { firstName: "Sana", lastName: "Malik" }, settings: { track: "fresher" } };
    const facts = [{ kind: "student", text: "verified student at Sample University" }, { kind: "ambassador", text: "campus ambassador", url: "https://gettdc.pk/verify/abc" }];
    const plain = svc.renderResumeHTML(r, "modern_ats", {});
    let asked = 0;
    const off = await P.resumeHtmlWithFonts(r, "modern_ats", {}, { verifiedFacts: async () => { asked++; return facts; } });
    ok(off === plain && asked === 0, "line off (the default): the same HTML as before, the facts not even asked for");
    const onHtml = await P.resumeHtmlWithFonts({ ...r, settings: { ...r.settings, verifiedLine: true } }, "modern_ats", {}, { verifiedFacts: async () => facts });
    ok(/✓ verified by tdc: verified student at Sample University · campus ambassador \(<a href="https:\/\/gettdc\.pk\/verify\/abc"/.test(onHtml), "line on: the facts in the header, with the verify link");
    const failed = await P.resumeHtmlWithFonts({ ...r, settings: { verifiedLine: true } }, "modern_ats", {}, { verifiedFacts: async () => { throw new Error("404"); } });
    ok(!/verified by tdc/.test(failed), "flag off on the server / no connection: no line, never a failed PDF");
    const none = await P.resumeHtmlWithFonts({ ...r, settings: { verifiedLine: true } }, "modern_ats", {}, { verifiedFacts: async () => [] });
    ok(!/verified by tdc/.test(none), "no verified fact: no line (nothing made up)");
  }
  for (const suggest of [false, true]) {
    const saves = [];
    const t = setup({ api: { verifiedFacts: async () => ({ facts: [{ kind: "student", text: "verified student at Sample University" }] }) } });
    const VL = t.load(path.join(H.SRC, "screens/Resume/finish/VerifiedLine.js")).default;
    const resume = { _id: "r1", settings: { track: "fresher" } };
    const m = t.mount(t.React.createElement(VL, { resume, suggest, updateResume: async (id, ch) => { saves.push([id, ch]); } }));
    await H.tick(3);
    ok(/verified student at Sample University/.test(H.textOf(m.tree)), `${suggest ? "finish (suggest)" : "switch"}: the facts are shown`);
    if (suggest) H.byLabel(m.tree, "add verified by tdc to my resume").props.onPress();
    else H.byLabel(m.tree, "show verified by tdc on my resume").props.onValueChange(true);
    await H.tick(3);
    ok(JSON.stringify(saves[0]) === JSON.stringify(["r1", { settings: { track: "fresher", verifiedLine: true } }]) && t.events.some((e) => e[0] === "resume_verified_added"), "one tap: verifiedLine saved (the track kept), funnel resume_verified_added", JSON.stringify(saves));
    if (suggest) ok(/added ✓/.test(H.textOf(m.tree)) && !H.byLabel(m.tree, "add verified by tdc to my resume"), "finish: then 'added ✓'");
    m.unmount();
  }
  {
    const t = setup({ api: { verifiedFacts: async () => ({ facts: [] }) } });
    const VL = t.load(path.join(H.SRC, "screens/Resume/finish/VerifiedLine.js")).default;
    const m = t.mount(t.React.createElement(VL, { resume: { _id: "r1" }, updateResume: async () => {} }));
    await H.tick(3);
    ok(m.tree == null, "no verified fact: nothing shown at all");
    m.unmount();
  }

  console.log("── public resume page (share screen)");
  {
    const URL1 = "https://gettdc.pk/r/AbCdEfGhIjKlMnOpQrStU_";
    const URL2 = "https://gettdc.pk/r/ZyXwVuTsRqPoNmLkJiHgF-";
    let server = { on: false, url: null, selfUrl: null, showPhone: false, showEmail: false, views: 0 };
    const sent = []; const opened = []; const alerts = []; const links = [];
    const t = setup({
      rnExtra: { Linking: { openURL: async (u) => { opened.push(u); } }, Alert: { alert: (title, text, buttons) => alerts.push({ title, text, buttons }) } },
      api: {
        getPublicPage: async () => server,
        setPublicPage: async (id, patch) => { sent.push([id, patch]); if (patch.on === true) server = { ...server, on: true, url: server.url || URL1, selfUrl: `${server.url || URL1}?k=self` }; if (patch.on === false) server = { ...server, on: false }; for (const k of ["showPhone", "showEmail"]) if (k in patch) server = { ...server, [k]: patch[k] }; return server.on ? server : { ...server, url: null, selfUrl: null }; },
        newPublicLink: async () => { server = { ...server, url: URL2, selfUrl: `${URL2}?k=self`, views: 0 }; return server; },
      },
    });
    const Card = t.load(path.join(H.SRC, "screens/Resume/finish/PublicPageCard.js")).default;
    const m = t.mount(t.React.createElement(Card, { resume: { _id: "r1" }, onLink: (u) => links.push(u) }));
    await H.tick(3);
    ok(/off: no one can see it/.test(H.textOf(m.tree)) && !/gettdc\.pk\/r/.test(H.textOf(m.tree)) && links[links.length - 1] === "", "off by default: no link anywhere (the share screen's link options stay hidden)");
    H.byLabel(m.tree, "share my resume page").props.onValueChange(true);
    await H.tick(3);
    const text = H.textOf(m.tree);
    ok(JSON.stringify(sent[0]) === JSON.stringify(["r1", { on: true }]) && text.includes(URL1) && links[links.length - 1] === URL1 && t.events.some((e) => e[0] === "resume_public_on"), "turn on → the link, handed to the share screen; funnel resume_public_on");
    ok(/0 views · your own visits aren't counted/.test(text), "views: the real number, own visits not counted");
    ok(/street address and postal code never show/.test(text), "says what never shows");
    H.byLabel(m.tree, "show my phone on the page").props.onValueChange(true);
    await H.tick(3);
    ok(JSON.stringify(sent[1]) === JSON.stringify(["r1", { showPhone: true }]), "phone: only when the student turns it on");
    H.byLabel(m.tree, "open my resume page").props.onPress();
    await H.tick(2);
    ok(opened[0] === `${URL1}?k=self`, "open my page → the link with the student's own key (not counted)");
    H.byLabel(m.tree, "make a new link").props.onPress();
    ok(alerts[0] && /old link stops working/.test(alerts[0].text), "new link asks first: the old link stops working");
    alerts[0].buttons.find((b) => b.text === "new link").onPress();
    await H.tick(3);
    ok(H.textOf(m.tree).includes(URL2) && links[links.length - 1] === URL2 && t.events.some((e) => e[0] === "resume_public_new_link"), "…then the new link everywhere");
    H.byLabel(m.tree, "share my resume page").props.onValueChange(false);
    await H.tick(3);
    ok(links[links.length - 1] === "" && /off: no one can see it/.test(H.textOf(m.tree)) && t.events.some((e) => e[0] === "resume_public_off"), "turn off → no link; funnel resume_public_off");
    m.unmount();
    const share = H.read("app/src/screens/Resume/ResumeShare.js");
    ok(/const pageFlag = useFlag\('resumePublicPage'\) === true;/.test(share) && /const pageOn = v2 && pageFlag;/.test(share) && /const shareLink = pageOn \? pageUrl : placeholderLink;/.test(share), "share screen: the flag hook always called; the page's link only with resumeV2 + resumePublicPage (else today's hidden placeholder)");
  }
  done();
})().catch((e) => { console.error(e); process.exit(1); });
