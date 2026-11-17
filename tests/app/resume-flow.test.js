// The resume flow around the builder (fix/resume-builder): the review screen after an upload ("we filled in X
// sections, please check" with filled / check / empty per section, into the builder at that section), "resume
// strength" with what is missing on tap, the template picker (the student's own resume in each template, the
// choice applies to the preview), and saves made offline that are sent when the connection is back.
//   node tests/app/resume-flow.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  console.log("── after an upload: the review screen");
  {
    const { React, mount, contexts } = H.makeReact();
    const { rn } = H.makeRN();
    const nav = { calls: [] };
    nav.replace = (...a) => nav.calls.push(["replace", ...a]);
    nav.navigate = (...a) => nav.calls.push(["navigate", ...a]);
    const ResumeContext = { _default: {} };
    let params = { resumeId: "u1" };
    const load = H.loader({
      react: React, "react-native": rn,
      "@expo/vector-icons": { Ionicons: "Icon" },
      "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
      "@react-navigation/native": { useNavigation: () => nav, useRoute: () => ({ params }) },
      "../../context/ResumeContext": { ResumeContext },
      "../../ui/ScreenHeader": { __esModule: true, default: () => null },
    });
    const sections = [
      { key: "personal", label: "contact details", step: 1, count: 4, status: "filled" },
      { key: "experience", label: "experience", step: 3, count: 2, status: "check" },
      { key: "skills", label: "skills", step: 7, count: 0, status: "empty" },
      { key: "education", label: "education", step: 2, count: 1, status: "filled" },
    ];
    contexts.set(ResumeContext, { resumes: [{ _id: "u1", importReport: { status: "ok", sections } }] });
    const Review = load(path.join(H.SRC, "screens/Resume/ResumeImportReview.js")).default;
    let m = mount(React.createElement(Review));
    await H.tick(5);
    const head = H.textOf(H.find(m.tree, (n) => n.props?.testID === "import-headline"));
    ok(head === "we filled in 3 sections, please check", "'we filled in 3 sections, please check' (filled + check)", head);
    ok(/nothing was added or rewritten/.test(H.textOf(m.tree)), "says nothing was made up");
    const row = (k) => H.find(m.tree, (n) => n.props?.testID === `import-${k}`);
    ok(/filled/.test(H.textOf(row("personal"))) && /check/.test(H.textOf(row("experience"))) && /empty/.test(H.textOf(row("skills"))), "each section shows filled / check / empty");
    row("experience").props.onPress();
    ok(nav.calls.some((c) => c[1] === "ResumeBuilder" && c[2].resumeId === "u1" && c[2].step === 3), "tapping a section opens the builder at that section", JSON.stringify(nav.calls));
    H.find(m.tree, (n) => n.props?.testID === "import-continue").props.onPress();
    ok(nav.calls.some((c) => c[1] === "ResumeBuilder" && c[2].step === 1), "'check and continue' opens the builder at the start");
    m.unmount();
    contexts.set(ResumeContext, { resumes: [{ _id: "u1", importReport: { status: "partial", message: "reading your resume took too long, so we only filled in your contact details. please check them and fill in the rest.", sections } }] });
    m = mount(React.createElement(Review));
    await H.tick(5);
    ok(/filled in part of your resume/.test(H.textOf(m.tree)) && /took too long/.test(H.textOf(m.tree)), "a partial import says so and why, with what was kept");
    m.unmount();
  }

  console.log("── resume strength: what the % means, what is missing");
  {
    const { React, mount } = H.makeReact();
    const { rn } = H.makeRN();
    const load = H.loader({ react: React, "react-native": rn, "@expo/vector-icons": { Ionicons: "Icon" } });
    const { default: Strength, STRENGTH_LINE } = load(path.join(H.SRC, "components/ResumeStrength.js"));
    const rules = load(path.join(H.SRC, "utils/resumeRules.js"));
    const resume = { personalInfo: { firstName: "Ayesha", email: "a@b.co" }, workExperience: [{ company: "Acme", position: "HR Intern" }], skills: [{ name: "Excel" }, { name: "Hiring" }, { name: "Payroll" }] };
    const went = [];
    const m = mount(React.createElement(Strength, { resume, onGoTo: (step, key) => went.push([step, key]) }));
    await H.tick(5);
    const score = rules.resumeStrength(resume).score;
    ok(new RegExp(`resume strength.*${score}%`).test(H.textOf(m.tree)) && H.textOf(m.tree).includes(STRENGTH_LINE), `labelled "resume strength ${score}%" with a line saying what it means`);
    const modal = () => H.find(m.tree, (n) => n.type === "Modal");
    ok(modal().props.visible === false, "the list is closed until tapped");
    H.find(m.tree, (n) => n.props?.testID === "resume-strength").props.onPress();
    await H.tick(5);
    const list = H.textOf(modal());
    ok(modal().props.visible && /add 2 more skills/.test(list) && /add dates to your experience at HR Intern at Acme/.test(list) && /add your phone number/.test(list), "tap: exactly what is missing ('add 2 more skills', 'add dates to your experience …')", list);
    H.byLabel(m.tree, "go to field: add 2 more skills").props.onPress();
    ok(went[0]?.[0] === 7 && went[0]?.[1] === "skills", "'go to field' opens that builder step");
    m.unmount();
    const D = H.read("app/src/screens/Resume/ResumeDashboard.js") + H.read("app/src/screens/Resume/ResumeShare.js") + H.read("app/src/screens/Resume/ViewResume.js");
    ok(!/completionPercentage \|\| 0\}%/.test(D) && !/% Complete/.test(D) && /resumeStrength\(/.test(D), "dashboard, share and preview show 'resume strength' from the shared rules (no bare '% complete')");
    ok(!/firstName \|\| 'untitled'|'Untitled'/.test(D) && /resumeName\(/.test(D), "resumes are shown by their name, never 'untitled'");
  }

  console.log("── template picker");
  {
    const { React, mount, contexts } = H.makeReact();
    const { rn } = H.makeRN();
    const nav = { calls: [], navigate: (...a) => nav.calls.push(a), goBack() {} };
    const ResumeContext = { _default: {} };
    const puts = [];
    const load = H.loader({
      react: React, "react-native": rn,
      "@expo/vector-icons": { Ionicons: "Icon" },
      "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
      "@react-navigation/native": { useNavigation: () => nav, useRoute: () => ({ params: { resumeId: "r1" } }) },
      "react-native-webview": { WebView: "WebView" },
      "../../context/ResumeContext": { ResumeContext },
      "../../ui/ScreenHeader": { __esModule: true, default: () => null },
    });
    const resume = { _id: "r1", template: "classic", personalInfo: { firstName: "Ayesha", lastName: "Khan" }, education: [{ institution: "IBA" }] };
    contexts.set(ResumeContext, { resumes: [resume], updateResume: async (id, ch) => { puts.push([id, ch]); return { ...resume, ...ch }; } });
    const Picker = load(path.join(H.SRC, "screens/Resume/ResumeTemplate.js")).default;
    const tpl = load(path.join(H.SRC, "services/templateService.js"));
    const m = mount(React.createElement(Picker));
    await H.tick(5);
    const views = H.findAll(m.tree, (n) => n.type === "WebView");
    ok(views.length === 5 && views.every((v, i) => v.props.source.html === tpl.renderResumeHTML(resume, tpl.TEMPLATES[i].id, {})), "5 thumbnails, each the student's own resume in that template (same HTML as the PDF)");
    ok(/in use/.test(H.textOf(H.find(m.tree, (n) => n.props?.testID === "template-stanford"))), "an old id ('classic') shows as its template (Classic) in use");
    H.find(m.tree, (n) => n.props?.testID === "template-jakes").props.onPress();
    await H.tick(2);
    H.byLabel(m.tree, "use this template").props.onPress();
    await H.tick(10);
    ok(puts[0]?.[1]?.template === "jakes" && nav.calls.some((c) => c[0] === "ResumeView" && c[1].resumeId === "r1"), "use this template: saved on the resume, then the preview opens with it", JSON.stringify({ puts, nav: nav.calls }));
    m.unmount();
  }

  console.log("── offline saves are sent when the connection is back");
  {
    const { React, mount, contexts } = H.makeReact();
    let appListener = null;
    const { rn } = H.makeRN({ AppState: { currentState: "active", addEventListener: (_e, cb) => { appListener = cb; return { remove() {} }; } } });
    const store = new Map();
    const server = { list: [{ _id: "r1", personalInfo: { firstName: "Sana" }, skills: [] }], offline: true, puts: [] };
    let netListener = null;
    const resumeApi = {
      getResumes: async () => ({ success: true, data: JSON.parse(JSON.stringify(server.list)), creationsUsed: 1 }),
      updateResume: async (id, changes) => {
        server.puts.push(changes);
        if (server.offline) throw Object.assign(new Error("Network Error"), { request: {} });
        const r = server.list.find((x) => x._id === id);
        for (const [k, v] of Object.entries(changes)) r[k] = k === "personalInfo" ? { ...r[k], ...v } : v;
        return { success: true, data: JSON.parse(JSON.stringify(r)) };
      },
    };
    const AuthContext = { _default: {} };
    const load = H.loader({
      react: React, "react-native": rn,
      "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } } },
      "@react-native-community/netinfo": { __esModule: true, default: { addEventListener: (cb) => { netListener = cb; return () => {}; } } },
      "../api/resumeApi": { __esModule: true, default: resumeApi },
      "../analytics/metaEvents": { metaEvents: { aiResumeCreated() {} } },
      "./AuthContext": { AuthContext },
    });
    const { default: Provider, ResumeContext, isOfflineError } = load(path.join(H.SRC, "context/ResumeContext.js"));
    contexts.set(AuthContext, { token: "tok", isGuest: false, user: {} });
    let ctx;
    const Probe = () => { ctx = React.useContext(ResumeContext); return null; };
    const m = mount(React.createElement(Provider, null, React.createElement(Probe)));
    await H.tick(10);
    await ctx.fetchResumes();
    await H.tick(5);
    const saved = await ctx.updateResume("r1", { personalInfo: { title: "HR Intern" } });
    await ctx.updateResume("r1", { skills: [{ name: "Excel" }] });
    await H.tick(5);
    ok(saved?.personalInfo?.title === "HR Intern" && saved._pendingSync, "offline: the save returns the changed resume (no error), marked as waiting");
    ok(ctx.resumes[0].skills[0]?.name === "Excel" && ctx.resumes[0].personalInfo.title === "HR Intern", "both offline edits show in the app right away");
    const waiting = JSON.parse(store.get("resumePendingSaves") || "{}").r1;
    ok(waiting?.personalInfo?.title === "HR Intern" && waiting?.skills?.[0]?.name === "Excel" && ctx.pendingSync === 1, "both are kept on the phone, merged into one waiting save");
    await ctx.fetchResumes();
    await H.tick(5);
    ok(ctx.resumes[0].personalInfo.title === "HR Intern", "a refresh from the server doesn't wipe the waiting edits");
    ok(isOfflineError(Object.assign(new Error("x"), { request: {} })) && !isOfflineError({ response: { status: 400 } }), "only 'no answer' errors wait; a server 'no' is shown");
    server.offline = false;
    netListener && netListener({ isConnected: true });
    await H.tick(20);
    ok(server.list[0].personalInfo.title === "HR Intern" && server.list[0].skills[0]?.name === "Excel", "connection back: the waiting save reaches the server", JSON.stringify(server.list[0]));
    ok(!JSON.parse(store.get("resumePendingSaves") || "{}").r1 && ctx.pendingSync === 0, "…and nothing is waiting any more");
    ok(typeof appListener === "function", "also sent when the app comes back to the front");
    m.unmount();
  }
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
