// P3a resume builder v2 (flag resumeV2; upgrade/p3a-resume):
//   resume/resumeV2.js: the step order per track (flag off: today's 1..7), next / previous, "~N min left", the
//     step for a missing item (stepKey), "build from my tdc profile" (only what the student gave: no account-default
//     city, no graduation month made up from a year), the one-page estimate, month + year
//   the renderer (templateService): every older resume renders byte for byte as before (35 frozen outputs); the new
//     sections print with recruiter headings, in the fresher order
//   the builder with the flag on: progress "step 1 of 11" (no minutes in the copy until measured) instead of the icons, the fresher order,
//     coursework under education, the new steps save their lists, "fits on 1 page ✓" and "saved ✓", finish on the
//     last step of the order; a new resume is created with its track; "upload my cv" opens the upload
//   ResumeStart: three cards, the track question, a profile resume created and reviewed
//   node tests/app/resume-v2.test.js
const path = require("path");
const crypto = require("crypto");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  console.log("── resumeV2.js");
  const V = H.loader({})(path.join(H.SRC, "resume", "resumeV2.js"));
  const fresher = { settings: { track: "fresher" } };
  ok(V.stepOrder(fresher, false).join() === "1,2,3,4,5,6,7" && V.stepOrder({}, false).join() === "1,2,3,4,5,6,7", "flag off: today's 7 steps for every resume");
  ok(V.stepOrder(fresher, true).join() === "1,2,4,8,9,7,10,5,11,6,3", "fresher: personal, education, projects, activities, volunteering, skills, awards, certificates, languages, summary, experience last");
  ok(V.stepOrder({}, true).join() === "1,2,3,4,5,6,7,11,10,8" && V.stepOrder({ settings: { track: "experienced" } }, true)[6] === 7, "experienced (or no track): today's 7, then languages, awards, activities");
  const o = V.ORDER.fresher;
  ok(V.nextStep(o, 2) === 4 && V.nextStep(o, 3) === 3 && V.prevStep(o, 4) === 2 && V.prevStep(o, 1) === 1, "next / previous follow the order and stop at the ends");
  ok(V.nextStep(V.ORDER.legacy, 6) === 7 && V.nextStep(V.ORDER.legacy, 7) === 7 && V.prevStep(V.ORDER.legacy, 1) === 1, "…legacy: the same as min(7, +1) / max(1, -1)");
  ok(V.minutesLeft(o, 1) === 9 && V.minutesLeft(o, 3) === 1, "~9 min left at the start of the fresher path, 1 on the last step");
  ok(V.stepIdFor(3, "activities", true) === 8 && V.stepIdFor(2, "education", true) === 2 && V.stepIdFor(3, "activities", false) === 3 && V.stepIdFor(7, undefined, true) === 7, "a missing item opens its step by key with the flag (the number without)");

  const user = { name: "Ayesha Noor Khan", email: "ayesha@x.co", phone: "03001234567", city: "Karachi", location: "Karachi, Pakistan", universityName: "IBA Karachi", headline: "", skills: ["Excel", "canva"], education: [{ school: "IBA Karachi", degree: "BBA", endYear: "2027" }, { school: "KGS", degree: "A levels" }] };
  const profile = { headline: "BBA student", fieldOfStudy: "Marketing", skills: ["Canva", "Public speaking"], portfolioLinks: ["https://linkedin.com/in/ayesha", "https://ayesha.design"] };
  const pf = V.prefillFromProfile({ user, profile, track: "fresher" });
  const pi = pf.resume.personalInfo;
  ok(pi.firstName === "Ayesha" && pi.lastName === "Noor Khan" && pi.email === "ayesha@x.co" && pi.phone === "03001234567" && pi.title === "BBA student", "name, contact and headline from the account / profile");
  ok(pi.city === "" && pi.location === "", "the account's default city ('Karachi' / 'Karachi, Pakistan') is never copied");
  ok(pi.linkedin === "https://linkedin.com/in/ayesha" && pi.portfolio === "https://ayesha.design" && pi.github === "", "links sorted into linkedin / portfolio");
  const e0 = pf.resume.education[0];
  ok(e0.institution === "IBA Karachi" && e0.degree === "BBA" && e0.fieldOfStudy === "Marketing" && !e0.endDate && pf.resume.education[1].institution === "KGS", "education: the university (with the degree from the account and the profile's field), then the others");
  ok(!JSON.stringify(pf.resume).includes("2027"), "no graduation date made up from a year (the review asks for it)");
  ok(pf.resume.skills.map((s) => s.name).join() === "Canva,Public speaking,Excel", "skills from the profile and the account, no duplicates (any case)");
  ok(pf.resume.settings.track === "fresher" && pf.report.source === "profile" && pf.report.sections.find((x) => x.key === "education").status === "check", "the track is set; the report says what was filled, education to check");
  const bare = V.prefillFromProfile({ user: { name: "Ali" }, profile: null, track: "experienced" });
  ok(bare.resume.education.length === 0 && bare.resume.skills.length === 0 && bare.resume.personalInfo.title === "" && bare.resume.settings.track === "experienced" && bare.report.sections.find((x) => x.key === "personal").status === "empty", "no profile: only what the account has, nothing invented");

  const short = { personalInfo: { firstName: "A" }, education: [{ institution: "IBA", degree: "BBA" }], skills: [{ name: "Excel" }] };
  const e1 = V.pageEstimate(short);
  ok(e1.fits && V.fitLine(e1) === "fits on 1 page ✓", "a short resume fits on one page");
  const long = { ...short, workExperience: Array.from({ length: 6 }, () => ({ company: "X", description: "x".repeat(400), achievements: ["y".repeat(200), "z".repeat(200)] })) };
  const e2 = V.pageEstimate(long);
  ok(!e2.fits && e2.over > 0 && /^spills by about \d+ lines?: shorten a few lines or pick Compact$/.test(V.fitLine(e2)), "a long one spills, with the number of lines", V.fitLine(e2));
  ok(V.fromMonthYear(0, 2026) === "2026-01-01" && V.monthYearLabel("2026-01-01") === "Jan 2026" && V.toMonthYear("junk") === null && V.monthYearLabel("") === "", "month + year: stored as the 1st, shown as 'Jan 2026'");

  console.log("── the renderer");
  const svc = H.loader({})(path.join(H.SRC, "services", "templateService.js"));
  const frozen = require("./fixtures-renderer-v1.json");
  const diffs = Object.entries(frozen.hashes).filter(([k, h]) => { const [n, t] = k.split(":"); return crypto.createHash("sha256").update(svc.renderResumeHTML(frozen.resumes[n], t, { accentColor: "#123456" })).digest("hex") !== h; });
  ok(diffs.length === 0, `every older resume renders exactly as before (${Object.keys(frozen.hashes).length} frozen outputs, 5 templates + old ids)`, diffs.map((d) => d[0]).join(", "));
  const fr = {
    settings: { track: "fresher" }, personalInfo: { firstName: "Ayesha" },
    workExperience: [{ company: "Daraz", position: "intern" }],
    education: [{ institution: "IBA", degree: "BBA" }], coursework: ["Marketing 101", "Statistics"],
    projects: [{ name: "Cafe plan" }],
    activities: [{ organisation: "Marketing Society", role: "events lead", startDate: "2025-09-01", current: true, bullets: ["organised the welcome week"] }],
    volunteering: [{ organisation: "Edhi", role: "volunteer", description: "packed food parcels" }],
    awards: [{ title: "Dean's list", issuer: "IBA", date: "2025-06-01", note: "two semesters" }],
    skills: [{ name: "Excel" }],
  };
  const html = svc.renderResumeHTML(fr, "modern_ats");
  const at = (h) => html.indexOf(`<h2>${h}</h2>`);
  ok(at("Leadership &amp; Activities") > 0 && at("Volunteering") > 0 && at("Awards") > 0, "the new sections print with recruiter headings ('Leadership & Activities', 'Volunteering', 'Awards')");
  ok(at("Education") < at("Projects") && at("Projects") < at("Leadership &amp; Activities") && at("Leadership &amp; Activities") < at("Skills") && at("Skills") < at("Awards") && at("Awards") < at("Experience"), "fresher: education, projects, activities, skills, awards … experience last");
  ok(/Relevant coursework: Marketing 101, Statistics/.test(html) && html.indexOf("Relevant coursework") < at("Projects"), "coursework under education");
  ok(/events lead/.test(html) && /Marketing Society/.test(html) && /organised the welcome week/.test(html) && /two semesters/.test(html), "entries with role, organisation, lines and notes");
  const ex = svc.renderResumeHTML({ ...fr, settings: {} }, "modern_ats");
  ok(ex.indexOf("<h2>Experience</h2>") < ex.indexOf("<h2>Education</h2>") && ex.indexOf("<h2>Leadership &amp; Activities</h2>") > ex.indexOf("<h2>Languages</h2>") - 1, "experienced: today's order, the new sections after");

  console.log("── the builder, flag on");
  const { React, mount } = H.makeReact();
  const alerts = [];
  const { rn } = H.makeRN({ Alert: { alert: (title, text, buttons) => alerts.push({ title, text, buttons }) } });
  const server = { list: [], puts: [], created: [] };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  let nextId = 1;
  const resumeApi = {
    getResumes: async () => ({ success: true, data: clone(server.list), creationsUsed: server.list.length }),
    createResume: async (data) => { const r = { _id: `new${nextId++}`, education: [], workExperience: [], projects: [], certifications: [], skills: [], professionalSummary: {}, ...clone(data) }; server.created.push(clone(data)); server.list.push(r); return { success: true, data: clone(r) }; },
    updateResume: async (id, changes) => {
      server.puts.push({ id, changes: clone(changes) });
      const r = server.list.find((x) => x._id === id);
      for (const [k, v] of Object.entries(clone(changes))) {
        if (["personalInfo", "professionalSummary", "customStyles", "settings"].includes(k)) r[k] = { ...(r[k] || {}), ...v };
        else r[k] = Array.isArray(v) ? v.map((it) => (it && typeof it === "object" && !it._id ? { ...it, _id: `s${nextId++}` } : it)) : v;
      }
      return { success: true, data: clone(r) };
    },
    enhanceText: async () => ({ enhanced: "x" }), suggestSkills: async () => ({ suggestions: [] }), deleteResume: async () => ({ success: true }),
    uploadResume: async () => { const r = { _id: `up${nextId++}`, personalInfo: { firstName: "Parsed" } }; server.list.push(r); return { success: true, data: r }; },
  };
  const nav = { calls: [], canGoBack: () => true };
  nav.navigate = (...a) => nav.calls.push(["navigate", ...a]);
  nav.replace = (...a) => nav.calls.push(["replace", ...a]);
  nav.goBack = () => nav.calls.push(["goBack"]);
  nav.dispatch = () => {};
  let route = { params: {} };
  const AuthContext = { _default: { user: { name: "Sana Khan", email: "sana@example.test" }, token: "tok", isGuest: false } };
  const picked = { file: null };
  const store = new Map();
  const storage = { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, String(v)); }, removeItem: async (k) => { store.delete(k); } };
  let flagOn = true;
  let coachOn = false;
  const load = H.loader({
    react: React, "react-native": rn,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "react-native-keyboard-controller": { KeyboardAwareScrollView: "KeyboardAwareScrollView", KeyboardStickyView: "KeyboardStickyView" },
    "../api/api": { __esModule: true, default: { post: async (url) => ({ data: { data: url === "/resume/ai/check" ? { issues: [] } : null } }) } },
    "../../analytics/funnel": { funnel: () => {} },
    "../../../analytics/funnel": { funnel: () => {} },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) },
    "/app/src/context/AuthContext": { AuthContext },
    "../../guest/GuestGate": { useGuestGate: () => ({ requireAccount: () => true, isGuest: false }) },
    "@react-navigation/native": { useNavigation: () => nav, useRoute: () => route, usePreventRemove: () => {} },
    "expo-document-picker": { getDocumentAsync: async () => (picked.file ? { canceled: false, assets: [picked.file] } : { canceled: true }) },
    "react-native-webview": { WebView: "WebView" },
    "../../services/templateService": { renderResumeHTML: () => "<html></html>" },
    "/app/src/api/resumeApi": { __esModule: true, default: resumeApi },
    "@react-native-async-storage/async-storage": { __esModule: true, default: storage },
    "../analytics/metaEvents": { metaEvents: { aiResumeCreated() {} } },
    "../../hooks/useFlag": { __esModule: true, default: (name) => (name === "resumeV2" ? flagOn : name === "resumeCoach" ? coachOn : false) },
  });
  const { default: ResumeProvider } = load(path.join(H.SRC, "context/ResumeContext.js"));
  const { default: Builder } = load(path.join(H.SRC, "screens/Resume/ResumeBuilder.js"));
  const open = async (params) => { route = { params }; alerts.length = 0; nav.calls.length = 0; server.puts.length = 0; const m = mount(React.createElement(ResumeProvider, null, React.createElement(Builder))); await H.tick(30); m.rerender(); return m; };
  const btn = (m, text) => H.find(m.tree, (n) => (n.type === "TouchableOpacity" || n.type === "Pressable") && (n.props.accessibilityLabel === text || H.textOf(n).includes(text)));
  const tap = async (m, text, ms = 25) => { const b = btn(m, text); if (!b) throw new Error(`no button "${text}"`); b.props.onPress(); await H.tick(ms); m.rerender(); };
  const input = (m, ph) => H.find(m.tree, (n) => n.type === "TextInput" && n.props.placeholder === ph);
  const type = async (m, ph, v) => { const i = input(m, ph); if (!i) throw new Error(`no input "${ph}"`); i.props.onChangeText(v); await H.tick(2); m.rerender(); };
  const text = (m) => H.textOf(m.tree);
  const title = (m) => H.textOf(H.find(m.tree, (n) => n.props?.style && n.type === "Text" && /Personal Info|Education|Projects|Leadership|Volunteering|Skills|Awards|Certificates|Languages|Summary|Experience/.test(H.textOf(n)) && H.textOf(n).length < 40));

  server.list = [{ _id: "r1", settings: { track: "fresher" }, personalInfo: { firstName: "Sana", lastName: "Khan", email: "s@x.co" }, professionalSummary: {}, education: [], workExperience: [], projects: [], certifications: [], skills: [], targetJobs: [] }];
  let m = await open({ resumeId: "r1" });
  ok(/step 1 of 11/.test(text(m)) && !/min left/.test(text(m)) && !btn(m, "step 2: Education"), "a progress line ('step 1 of 11', no minutes until they are measured) instead of the step icons");
  ok(/1\/11/.test(text(m)), "…the badge counts the track's steps");
  ok(/fits on 1 page ✓/.test(text(m)), "the one-page estimate shows");
  await tap(m, "Continue", 40);
  ok(/Education/.test(title(m)) && /relevant coursework/.test(text(m)), "continue → education, with relevant coursework under it", title(m));
  await type(m, "e.g. Data Structures", "Statistics");
  await tap(m, "add course", 40);
  ok(server.list[0].coursework?.join() === "Statistics" && server.puts.some((p) => Object.keys(p.changes).join() === "coursework"), "a course is saved on its own (only coursework sent)");
  ok(/saved ✓/.test(text(m)), "…and 'saved ✓' shows");
  await tap(m, "Continue", 40);
  ok(/Projects/.test(title(m)), "→ projects (experience is not next on the fresher track)", title(m));
  await tap(m, "Continue", 40);
  ok(/Leadership & activities/.test(text(m)) && /a society, a sports team, class rep/.test(text(m)), "→ leadership & activities (a new step)");
  await type(m, "e.g. IEEE student branch", "Marketing Society");
  await type(m, "e.g. events lead, member, captain", "events lead");
  await type(m, "e.g. organised the welcome week", "organised the welcome week");
  await tap(m, "add activity", 40);
  const act = server.list[0].activities || [];
  ok(act.length === 1 && act[0].organisation === "Marketing Society" && act[0].role === "events lead" && act[0].bullets.join() === "organised the welcome week" && act[0].current === false, "an activity is saved with its lines", JSON.stringify(act));
  await type(m, "e.g. IEEE student branch", "Debating club");
  await tap(m, "Continue", 60);
  ok((server.list[0].activities || []).length === 2 && /Volunteering/.test(text(m)), "continue adds what was typed (never lost), then → volunteering");
  for (const expected of ["Skills", "Awards", "Certificates", "Languages", "Summary"]) { await tap(m, "Continue", 40); if (!new RegExp(expected).test(text(m))) { ok(false, `→ ${expected}`, title(m)); break; } }
  await tap(m, "Continue", 40);
  ok(/Experience/.test(title(m)) && /Finish & Preview/.test(text(m)) && /11\/11/.test(text(m)), "experience is the last step (optional), with finish", title(m));
  m.unmount();

  console.log("── languages and awards steps");
  m = await open({ resumeId: "r1", step: 1 });
  server.list[0].languages = [];
  // go straight to languages through the order
  for (let i = 0; i < 8; i++) await tap(m, "Continue", 30);
  ok(/Languages/.test(text(m)), "→ languages");
  await tap(m, "native", 10);
  await tap(m, "Urdu", 40);
  ok(server.list[0].languages?.[0]?.name === "Urdu" && server.list[0].languages[0].proficiency === "Native", "a quick pick adds the language with the chosen level (proficiency)");
  m.unmount();

  console.log("── new resumes");
  server.created.length = 0;
  m = await open({ track: "fresher" });
  ok(/step 1 of 11/.test(text(m)), "a new resume from 'start fresh · not yet' follows the fresher order before it's saved");
  await type(m, "e.g. John Doe", "Hina Ali");
  await tap(m, "Continue", 60);
  ok(server.created[0]?.settings?.track === "fresher", "…and is created with its track", JSON.stringify(server.created[0]));
  m.unmount();
  server.list = server.list.filter((x) => x._id === "r1"); // under the 2-resume limit
  picked.file = { uri: "file:///cv.pdf", name: "cv.pdf", mimeType: "application/pdf" };
  m = await open({ autoUpload: true });
  await H.tick(900); m.rerender(); // the builder shows "structuring" for 600 ms before it moves on
  ok(nav.calls.some((c) => c[0] === "navigate" && c[1] === "ResumeImportReview"), "'upload my cv' opens the upload, then 'check your resume'", JSON.stringify(nav.calls));
  m.unmount();

  console.log("── the builder with the coach (P3b)");
  coachOn = true;
  server.list = server.list.filter((x) => x._id === "r1");
  server.list[0].education = [{ _id: "e1", institution: "IBA", degree: "BBA" }]; // finish needs education, experience or a project
  m = await open({ resumeId: "r1" });
  const sticky = H.find(m.tree, (n) => n.type === "KeyboardStickyView");
  const scrollV = H.find(m.tree, (n) => n.type === "KeyboardAwareScrollView");
  ok(sticky && H.textOf(sticky).includes("Continue") && !H.textOf(scrollV).includes("Continue"), "coach on: the step buttons are pinned above the keyboard, outside the scroll view");
  ok(/fix everything/.test(text(m)) && /build it by chatting/.test(text(m)), "…the coach bar (fix everything, build it by chatting)");
  for (let i = 0; i < 10; i++) await tap(m, "Continue", 30);
  await tap(m, "Finish & Preview", 60);
  ok(/ready to send?/.test(text(m)) && !nav.calls.some((c) => c[1] === "ResumeView"), "finish → 'ready to send?' first (advice), not the preview yet");
  await tap(m, "continue to the preview", 80);
  ok(nav.calls.some((c) => c[0] === "navigate" && c[1] === "ResumeView"), "continue → the same finish as before (the preview)", JSON.stringify(nav.calls));
  m.unmount();
  coachOn = false;

  console.log("── the builder, flag off");
  flagOn = false;
  m = await open({ resumeId: "r1" });
  ok(btn(m, "step 2: Education") && !/min left/.test(text(m)) && /1\/7/.test(text(m)) && !/fits on 1 page/.test(text(m)), "flag off: the 7 step icons, 1/7, no estimate");
  await tap(m, "step 7: Skills", 40);
  ok(/Finish & Preview/.test(text(m)), "…skills is still the last step");
  m.unmount();
  flagOn = true;

  console.log("── ResumeStart");
  const created = [];
  const RC = { _default: { createResume: async (data) => { created.push(clone(data)); return { _id: "p1", ...data }; }, creationsUsed: 0, fetchResumes: async () => {} } };
  const loadStart = H.loader({
    react: React, "react-native": rn,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "@react-navigation/native": { useNavigation: () => nav, useRoute: () => route },
    "../../context/AuthContext": { AuthContext: { _default: { user, token: "t" } } },
    "../../context/ResumeContext": { ResumeContext: RC },
    "../../api/profileApi": { getMyProfessionalProfile: async () => ({ profile }) },
    "../../hooks/useAction": { errorMessage: (e, f) => f },
  });
  const Start = loadStart(path.join(H.SRC, "screens", "Resume", "ResumeStart.js")).default;
  nav.calls.length = 0;
  m = mount(React.createElement(Start));
  ok(["upload my cv", "build from my tdc profile", "start fresh"].every((t) => text(m).includes(t)), "three cards");
  H.find(m.tree, (n) => n.props?.testID === "start-profile").props.onPress(); await H.tick(5); m.rerender();
  ok(/have you done an internship or job yet\?/.test(text(m)), "profile → the track question first");
  await tap(m, "not yet: build a fresher resume", 40);
  ok(created[0]?.settings?.track === "fresher" && created[0].personalInfo.firstName === "Ayesha" && created[0].personalInfo.city === "", "a fresher resume from the profile is created (no made-up city)");
  const rep = nav.calls.find((c) => c[0] === "replace" && c[1] === "ResumeImportReview");
  ok(rep && rep[2].resumeId === "p1" && rep[2].report.source === "profile", "…then 'check your resume' with what was filled");
  m.unmount();
  nav.calls.length = 0;
  m = mount(React.createElement(Start));
  H.find(m.tree, (n) => n.props?.testID === "start-fresh").props.onPress(); await H.tick(5); m.rerender();
  await tap(m, "yes: I've done an internship or job", 10);
  ok(nav.calls.some((c) => c[0] === "replace" && c[1] === "ResumeBuilder" && c[2].track === "experienced"), "start fresh · yes → the builder on the experienced track");
  m.unmount();
  nav.calls.length = 0;
  m = mount(React.createElement(Start));
  H.find(m.tree, (n) => n.props?.testID === "start-upload").props.onPress(); await H.tick(5);
  ok(nav.calls.some((c) => c[0] === "replace" && c[1] === "ResumeBuilder" && c[2].autoUpload === true), "upload my cv → the builder's upload");
  m.unmount();

  console.log("── wiring (source)");
  const dash = H.read("app/src/screens/Resume/ResumeDashboard.js");
  ok((dash.match(/navigation\.navigate\(newResumeScreen\)/g) || []).length === 2 && /const newResumeScreen = resumeV2 \? 'ResumeStart' : 'ResumeBuilder';/.test(dash), "dashboard: new resume → ResumeStart with the flag, the builder without");
  ok(/name="ResumeStart"/.test(H.read("app/src/navigation/ResumeNavigator.js")) && /'ResumeStart',/.test(H.read("app/src/navigation/DrawerNavigator.js")), "ResumeStart is registered (full screen)");
  ok(/onGoTo\(m\.step, m\.key, m\.stepKey\)/.test(H.read("app/src/components/ResumeStrength.js")), "ResumeStrength passes the step key (older callers ignore it)");
  done();
})().catch((e) => { console.error(e); process.exit(1); });
