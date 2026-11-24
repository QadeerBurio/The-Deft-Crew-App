// The resume builder (app/src/screens/Resume/ResumeBuilder.js) on the real ResumeContext with a fake
// server: two buttons in a row both finish, double taps save once, quick adds keep every item,
// delete asks and never hits the wrong item, a failed save never traps the student, nothing is
// created until something is saved, the 2-resume limit links to the existing resumes, leaving
// with unsaved changes asks first, saves send only the changed fields.
//   node tests/app/resume-builder.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const { React, mount } = H.makeReact();
  const alerts = [];
  const { rn } = H.makeRN({ Alert: { alert: (title, text, buttons) => alerts.push({ title, text, buttons }) } });
  const press = (alertTitle, button) => {
    const a = [...alerts].reverse().find((x) => (alertTitle instanceof RegExp ? alertTitle.test(x.title) : x.title === alertTitle));
    const b = a?.buttons?.find((x) => x.text === button);
    if (!b) throw new Error(`no "${button}" on alert ${alertTitle}: ${JSON.stringify(alerts.map((x) => x.title))}`);
    b.onPress && b.onPress();
  };

  // ── fake server ──
  const server = { list: [], puts: [], creates: 0, failPut: false, gates: [], aiGate: null, suggestions: ["Docker", "Go"], count: null };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  let nextId = 1;
  const resumeApi = {
    getResumes: async () => ({ success: true, data: clone(server.list), creationsUsed: server.count ?? server.list.length }),
    createResume: async (data) => {
      if ((server.count ?? server.list.length) >= 2) throw { response: { status: 403, data: { code: "RESUME_CREATION_LIMIT_REACHED" } } };
      server.creates++;
      const r = { _id: `new${nextId++}`, education: [], workExperience: [], projects: [], certifications: [], skills: [], targetJobs: [], professionalSummary: {}, ...clone(data) };
      server.list.push(r);
      return { success: true, data: clone(r) };
    },
    updateResume: async (id, changes) => {
      server.puts.push({ id, changes: clone(changes) });
      const g = server.gates.shift();
      if (g) await g.promise;
      if (server.failPut) throw Object.assign(new Error("timeout of 20000ms exceeded"), { code: "ECONNABORTED", request: {} });
      const r = server.list.find((x) => x._id === id);
      for (const [k, v] of Object.entries(clone(changes))) {
        if (["personalInfo", "professionalSummary", "customStyles"].includes(k)) r[k] = { ...(r[k] || {}), ...v };
        else r[k] = Array.isArray(v) ? v.map((it) => (it && typeof it === "object" && !it._id ? { ...it, _id: `s${nextId++}` } : it)) : v;
      }
      return { success: true, data: clone(r) };
    },
    enhanceText: async () => { if (server.aiGate) await server.aiGate.promise; return { enhanced: "AI text" }; },
    suggestSkills: async () => { if (server.aiGate) await server.aiGate.promise; return { suggestions: server.suggestions }; },
    deleteResume: async () => ({ success: true }),
    uploadResume: async () => { server.creates++; const r = { _id: `up${nextId++}`, personalInfo: { firstName: "Parsed" } }; server.list.push(r); return { success: true, data: r }; },
  };

  const nav = { calls: [], prevent: null, canGoBack: () => true };
  nav.navigate = (...a) => nav.calls.push(["navigate", ...a]);
  nav.goBack = () => { nav.calls.push(["goBack"]); if (nav.prevent?.enabled) nav.prevent.cb({ data: { action: { type: "GO_BACK" } } }); };
  nav.dispatch = (a) => nav.calls.push(["dispatch", a.type]);
  let route = { params: {} };
  const AuthContext = { _default: { user: { name: "Sana Khan", email: "sana@example.test" }, token: "tok", isGuest: false } };
  const picked = { file: null };
  // AsyncStorage on the phone (drafts, saves waiting for a connection)
  const store = new Map();
  const storage = { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, String(v)); }, removeItem: async (k) => { store.delete(k); } };
  const load = H.loader({
    react: React, "react-native": rn,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "react-native-keyboard-controller": { KeyboardAwareScrollView: "KeyboardAwareScrollView" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) },
    "/app/src/context/AuthContext": { AuthContext },
    "../../guest/GuestGate": { useGuestGate: () => ({ requireAccount: () => true, isGuest: false }) },
    "@react-navigation/native": { useNavigation: () => nav, useRoute: () => route, usePreventRemove: (enabled, cb) => { nav.prevent = { enabled, cb }; } },
    "expo-document-picker": { getDocumentAsync: async () => (picked.file ? { canceled: false, assets: [picked.file] } : { canceled: true }) },
    "react-native-webview": { WebView: "WebView" },
    "../../services/templateService": { renderResumeHTML: () => "<html></html>" },
    "/app/src/api/resumeApi": { __esModule: true, default: resumeApi },
    "@react-native-async-storage/async-storage": { __esModule: true, default: storage },
    "../analytics/metaEvents": { metaEvents: { aiResumeCreated() {} } },
  });
  const { default: ResumeProvider } = load(path.join(H.SRC, "context/ResumeContext.js"));
  const { default: Builder, keyOf, indexOfKey } = load(path.join(H.SRC, "screens/Resume/ResumeBuilder.js"));
  const open = async (params) => {
    route = { params };
    alerts.length = 0; nav.calls.length = 0; server.puts.length = 0;
    const m = mount(React.createElement(ResumeProvider, null, React.createElement(Builder)));
    await H.tick(30);
    return m;
  };
  const btn = (m, text) => H.find(m.tree, (n) => (n.type === "TouchableOpacity" || n.type === "Pressable") && (n.props.accessibilityLabel === text || H.textOf(n).includes(text)));
  const tap = async (m, text, ms = 15) => { const b = btn(m, text); if (!b) throw new Error(`no button "${text}"`); b.props.onPress(); await H.tick(ms); };
  const input = (m, placeholder) => H.find(m.tree, (n) => n.type === "TextInput" && n.props.placeholder === placeholder);
  const type = async (m, placeholder, value) => { input(m, placeholder).props.onChangeText(value); await H.tick(2); };
  const busy = (m, text) => { const b = btn(m, text); return !!(b?.props.disabled || b?.props.accessibilityState?.busy); };
  const step = async (m, n) => { await tap(m, `step ${n}: ${["", "Personal", "Education", "Experience", "Projects", "Certificates", "Summary", "Skills"][n]}`, 30); };
  const R = () => server.list.find((x) => x._id === "r1");

  console.log("── item keys");
  ok(keyOf({ _id: "a1", degree: "BS" }) === "id:a1" && keyOf({ degree: "BS" }) === 'v:{"degree":"BS"}', "an item is known by its _id (or its content), not its position");
  ok(indexOfKey([{ _id: "a" }, { _id: "b" }], "id:b") === 1 && indexOfKey([{ _id: "a" }], "id:z") === -1, "indexOfKey finds by key");

  console.log("── two buttons in a row (skills: AI suggestions, then add a skill)");
  server.list = [{ _id: "r1", personalInfo: { firstName: "Sana", lastName: "Khan", title: "Dev" }, professionalSummary: { title: "Dev", summary: "old summary" }, education: [], workExperience: [], projects: [], certifications: [], skills: [{ _id: "k1", name: "JS" }], targetJobs: [{ jobTitle: "Frontend Developer" }] }];
  let m = await open({ resumeId: "r1" });
  ok(!nav.calls.some((c) => c[0] === "goBack") && server.creates === 0, "an existing resume opens; nothing is created");
  await step(m, 7);
  server.aiGate = H.gate();
  await tap(m, "ai skill suggestions", 5);
  ok(busy(m, "ai skill suggestions"), "tap 1 (AI suggestions): its button spins and is disabled");
  await type(m, "Type a skill and press Enter or comma...", "SQL");
  await tap(m, "add skill", 20);
  ok(!busy(m, "add skill") && busy(m, "ai skill suggestions"), "tap 2 (add skill) runs and finishes while the AI is still working");
  server.aiGate.resolve(); server.aiGate = null;
  await H.tick(40);
  const names = R().skills.map((s) => s.name).join(",");
  ok(!busy(m, "ai skill suggestions") && !busy(m, "add skill"), "the AI finishes too: no spinner left on either button");
  ok(names === "JS,SQL,Docker,Go", "both results kept: SQL and the AI's skills, none lost or doubled", names);
  ok(alerts.some((a) => /Skills Added/.test(a.title) && /2 new skills/.test(a.text)), "the AI says how many it added");

  console.log("── double tap saves once");
  await step(m, 2);
  await type(m, "e.g. Bachelor of Science", "BS");
  await type(m, "e.g. Massachusetts Institute of Technology", "SZABIST");
  const gEdu = H.gate(); server.gates.push(gEdu);
  const add = btn(m, "add education").props.onPress;
  add(); add(); add();
  await H.tick(10);
  ok(busy(m, "add education"), "while saving, the add button is disabled");
  gEdu.resolve();
  await H.tick(30);
  ok(R().education.length === 1 && server.puts.filter((p) => p.changes.education).length === 1, "three taps: one education saved, one request", R().education.length);
  ok(server.puts.filter((p) => p.changes.education).every((p) => Object.keys(p.changes).join() === "education"), "the save sends only the education list");

  console.log("── delete asks, and never hits the wrong item");
  await type(m, "e.g. Bachelor of Science", "MS"); await type(m, "e.g. Massachusetts Institute of Technology", "NED");
  await tap(m, "add education", 30);
  ok(R().education.map((e) => e.degree).join() === "BS,MS", "second education added", R().education.map((e) => e.degree).join());
  // edit #2 (MS), then delete #1 (BS), then update: MS changes, BS is gone
  const editBtns = H.findAll(m.tree, (n) => n.type === "TouchableOpacity" && H.find(n, (c) => c.props?.name === "create-outline"));
  editBtns[1].props.onPress(); await H.tick(5);
  ok(input(m, "e.g. Bachelor of Science").props.value === "MS" && /Edit Education #2/.test(H.textOf(m.tree)), "editing #2 (MS)");
  await tap(m, "delete education 1", 5);
  ok(alerts.some((a) => a.title === "delete this education?"), "delete asks first");
  press("delete this education?", "cancel"); await H.tick(10);
  ok(R().education.length === 2, "cancel: nothing deleted");
  await tap(m, "delete education 1", 5);
  press("delete this education?", "delete"); await H.tick(30);
  ok(R().education.map((e) => e.degree).join() === "MS", "delete: BS removed");
  ok(/Edit Education #1/.test(H.textOf(m.tree)), "the form still edits MS (now #1)");
  await type(m, "e.g. Bachelor of Science", "MS (Hons)");
  await tap(m, "update education", 30);
  ok(R().education.length === 1 && R().education[0].degree === "MS (Hons)" && R().education[0].institution === "NED", "update changes MS, not some other item", JSON.stringify(R().education));

  console.log("── no connection: the save is kept on the phone and sent later (never lost, never traps)");
  await step(m, 1);
  await type(m, "e.g. Senior Software Engineer", "Frontend Engineer");
  server.failPut = true;
  const alertsBefore = alerts.length;
  await tap(m, "Continue", 40);
  ok(alerts.length === alertsBefore, "Continue offline: no error popup", JSON.stringify(alerts.slice(alertsBefore)));
  ok(/Education/.test(H.textOf(m.tree)) && /2\/7/.test(H.textOf(m.tree)), "…and the next step opens");
  ok(!busy(m, "Continue"), "the Continue button works again");
  const waiting = JSON.parse(store.get("resumePendingSaves") || "{}");
  ok(waiting.r1?.personalInfo?.title === "Frontend Engineer", "the change is kept on the phone (survives closing the app)", store.get("resumePendingSaves"));
  server.failPut = false;
  await step(m, 1);
  ok(input(m, "e.g. Senior Software Engineer").props.value === "Frontend Engineer", "back on step 1 the title is still there (not overwritten by old data)");
  ok(R().personalInfo.title === "Dev", "…and not on the server yet");
  await type(m, "e.g. John Doe", "Sana A. Khan");
  await tap(m, "save personal information", 30);
  const lastPut = server.puts[server.puts.length - 1];
  ok(Object.keys(lastPut.changes).join() === "personalInfo" && lastPut.changes.personalInfo.title === "Frontend Engineer" && lastPut.changes.personalInfo.lastName === "A. Khan", "back online: the waiting change goes with the next save, only personalInfo", JSON.stringify(lastPut.changes));
  ok(R().personalInfo.title === "Frontend Engineer" && !JSON.parse(store.get("resumePendingSaves") || "{}").r1, "…the server has it and nothing is waiting any more");
  ok(R().professionalSummary.summary === "old summary", "the summary is untouched by a personal-info save");
  const before = server.puts.length;
  input(m, "e.g. John Doe").props.onBlur(); await H.tick(20);
  ok(server.puts.length === before, "leaving a field without changing anything sends nothing");

  console.log("── back never loses what was typed");
  await step(m, 3);
  await type(m, "e.g. Google", "Hire Co");
  await H.tick(350);
  ok(nav.prevent?.enabled === true, "typed experience, not added: leaving goes through the keep check");
  nav.calls.length = 0;
  const askedBefore = alerts.length;
  nav.goBack();
  await H.tick(20);
  ok(alerts.length === askedBefore && nav.calls.some((c) => c[0] === "dispatch"), "back leaves right away (no 'discard' question)");
  ok(JSON.parse(store.get("resumeBuilderDraft:r1") || "{}").workCompany === "Hire Co", "…and what was typed is kept on the phone");
  m.unmount();
  m = await open({ resumeId: "r1" });
  await step(m, 3);
  await H.tick(20);
  ok(input(m, "e.g. Google").props.value === "Hire Co", "opening the resume again: the typed experience is back");

  console.log("── continue adds what is typed (no 'click add first' wall)");
  await type(m, "e.g. Software Engineer", "Intern");
  await tap(m, "Continue", 60);
  ok(R().workExperience.some((w) => w.company === "Hire Co" && w.position === "Intern") && /4\/7/.test(H.textOf(m.tree)), "Continue saved the experience and moved on", JSON.stringify(R().workExperience));

  console.log("── skip for now on optional sections");
  ok(btn(m, "skip for now"), "projects (optional) has 'skip for now'");
  await tap(m, "skip for now", 30);
  ok(/5\/7/.test(H.textOf(m.tree)), "skip moves on without asking anything");
  await step(m, 1);
  ok(!btn(m, "skip for now"), "personal info (required) has no skip");

  console.log("── required fields: only on finish, only the truly required ones");
  ok(!H.find(m.tree, (n) => n.props?.testID === "finish-problems") && !/to finish, please add/.test(H.textOf(m.tree)), "no missing-field errors while editing");
  m.unmount();
  server.list.push({ _id: "r3", personalInfo: { firstName: "", email: "" }, education: [], workExperience: [], projects: [], certifications: [], skills: [] });
  m = await open({ resumeId: "r3" });
  await type(m, "e.g. John Doe", "");
  await step(m, 7);
  ok(!/to finish, please add/.test(H.textOf(m.tree)), "the last step before finishing: still no errors");
  nav.calls.length = 0;
  await tap(m, "Finish", 40);
  const probs = H.find(m.tree, (n) => n.props?.testID === "finish-problems");
  const ptext = H.textOf(probs);
  ok(probs && /add your full name/.test(ptext) && /add your email or phone/.test(ptext) && /education, experience or a project/.test(ptext), "finish: name, email-or-phone and one of education/experience/projects", ptext);
  ok(!/skill|summary|title|city|certificate/i.test(ptext), "optional sections never block finishing", ptext);
  ok(!nav.calls.some((c) => c[1] === "ResumeView"), "finish didn't continue to the preview");
  await tap(m, "go to field: add your full name", 30);
  const fieldMsg = H.findAll(m.tree, (n) => n.type === "Text" && n.props?.accessibilityRole === "alert").map(H.textOf).join(" | ");
  ok(/1\/7/.test(H.textOf(m.tree)) && /add your full name/.test(fieldMsg), "'go to field' opens personal info with the message on the field", fieldMsg);
  await type(m, "e.g. John Doe", "Ali Raza");
  await type(m, "+92 301 0000000", "03001234567");
  await step(m, 4);
  await type(m, "e.g. AI Resume Builder", "Library app");
  await tap(m, "add project", 30);
  await step(m, 7);
  nav.calls.length = 0;
  await tap(m, "Finish", 60);
  ok(nav.calls.some((c) => c[0] === "navigate" && c[1] === "ResumeView"), "with name, phone and a project: finish opens the preview", JSON.stringify(nav.calls));
  m.unmount();

  console.log("── a new resume is created only when something is saved");
  server.list = [{ _id: "r1", personalInfo: {}, education: [] }];
  server.creates = 0;
  m = await open({});
  ok(server.creates === 0 && nav.prevent?.enabled === false, "opening a new resume creates nothing and holds nothing");
  ok(input(m, "e.g. John Doe").props.value === "Sana Khan", "the name is prefilled from the profile");
  nav.calls.length = 0;
  nav.goBack();
  ok(server.creates === 0 && nav.calls.some((c) => c[0] === "goBack"), "leaving without changes: no resume made");
  m.unmount();
  m = await open({});
  await type(m, "e.g. Senior Software Engineer", "Designer");
  const s1 = btn(m, "save personal information").props.onPress;
  s1(); s1();
  await H.tick(40);
  ok(server.creates === 1, "first save: exactly one resume created", server.creates);
  await step(m, 7);
  await type(m, "Type a skill and press Enter or comma...", "Figma");
  await tap(m, "add skill", 30);
  ok(server.creates === 1 && server.list.find((x) => x._id.startsWith("new")).skills.some((s) => s.name === "Figma"), "later saves go to that same resume");
  m.unmount();

  console.log("── upload & auto-fill makes one resume, not two");
  server.list = [{ _id: "r1" }];
  server.creates = 0;
  picked.file = { uri: "file:///cv.pdf", name: "cv.pdf", size: 1000, mimeType: "application/pdf" };
  m = await open({});
  await tap(m, "upload & auto-fill", 900);
  ok(server.creates === 1 && nav.calls.some((c) => c[0] === "navigate" && c[1] === "ResumeImportReview"), "upload: one parsed resume, then the 'please check' review; no blank one", `${server.creates} ${JSON.stringify(nav.calls)}`);
  ok(!alerts.some((a) => /Missing Fields/i.test(a.title)), "no 'missing fields' popup after an upload");
  picked.file = null;
  m.unmount();

  console.log("── the 2-resume limit");
  server.list = [{ _id: "r1" }, { _id: "r2" }];
  server.creates = 0;
  m = await open({});
  ok(alerts.some((a) => a.title === "you already have 2 resumes" && /delete one to make a new one/.test(a.text)), "opening 'new' at the limit says so right away");
  press("you already have 2 resumes", "see my resumes");
  ok(nav.calls.some((c) => c[0] === "navigate" && c[1] === "ResumeDashboard"), "…with a link to the existing resumes");
  ok(server.creates === 0, "nothing created");
  m.unmount();

  console.log("── source");
  // the builder and its step files (P3a moved the 7 steps to screens/Resume/steps/, unchanged)
  const stepDir = require("path").join(H.APP, "app/src/screens/Resume/steps");
  const src = [H.read("app/src/screens/Resume/ResumeBuilder.js"), ...require("fs").readdirSync(stepDir).filter((f) => f.endsWith(".js")).map((f) => H.read(`app/src/screens/Resume/steps/${f}`))].join("\n");
  ok(!/aiProcessing|savingStep1|savingStep6/.test(src), "no shared loading flags left");
  ok(!/items\.filter\(\(_, i\) => i !== index\)/.test(src) && !/updated\[editing\w+Index\]/.test(src), "no position-based edits or deletes");
  ok(!/onBlur=\{savePersonalInfo\}/.test(src) && (src.match(/onBlur=\{savePersonalQuietly\}/g) || []).length === 8, "field blur saves in the background (errors logged, never unhandled)");
  ok(/usePreventRemove\(leaveUnsaved/.test(src), "header back, iOS swipe and Android back go through the unsaved-changes check");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
