// P3b resume coach (flags resumeV2 + resumeCoach; speak: resumeSpeak) (upgrade/p3b-coach):
//   resume/coach.js: joggers per programme (CS: hackathon / GitHub first; BBA: business plan), tips, labelled
//     examples, the ready-to-send checklist (advises), the meter (real seconds, typing and taps, recorded once)
//   StoryPrompt (tap mode): chips → "make my bullets" → keep / edit / remove; questions shown, never guessed
//   LiveCheck: asked after a pause, one-tap fix; MemoryJoggers: a tap becomes an entry with the lines kept
//   CoachBar: fix everything (preview, then one save), fit on one page; HoldToTalk: nothing with resumeSpeak off
//   the builder with the coach: the step buttons pinned above the keyboard (KeyboardStickyView), the tip, the bar,
//     finish → "ready to send?" (advice) → the same finish; without the coach: as before
//   chat mode: the interview fills the resume as it goes; "no" skips; lines kept only when tapped
//   MEASURED (owner): a first-time fresher through chat mode + "write my summary" + "suggest my skills": the
//     characters they type (contact details excluded) and their taps to a strong one-page resume
//   node tests/app/resume-coach.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

const store = new Map();
const AsyncStorage = { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, String(v)); }, removeItem: async (k) => { store.delete(k); } };
const clone = (x) => JSON.parse(JSON.stringify(x));

// the coach server (scripted, fact-locked like the real one: only words the student gave)
const posts = [];
const ai = {
  extract: ({ question, answer }) => {
    const a = answer.toLowerCase();
    if (question === "study") return { fields: { programme: /bba/.test(a) ? "BBA" : "", university: /iba/.test(a) ? "IBA" : "" } };
    if (question === "target") return { fields: { targetRole: answer.replace(/^(i want )?(a |an )?/i, "") } };
    if (question === "society") return { fields: { organisation: /marketing society/.test(a) ? "Marketing Society" : answer, role: /events lead/.test(a) ? "events lead" : "" } };
    if (question === "project") return { fields: { name: /cafe/.test(a) ? "Cafe business plan" : answer } };
    if (question === "did") return { fields: { did: answer.split(/,| and /).map((x) => x.trim()).filter(Boolean) } };
    return { fields: {} };
  },
  bullets: ({ did, organisation }) => ({ suggestions: did.map((d) => `${d.charAt(0).toUpperCase()}${d.slice(1)} for ${organisation}`), questions: [{ key: "size", text: "roughly how many people?" }] }),
  summary: ({ programme, targetRole }) => ({ suggestions: [`${programme} student at IBA aiming for a ${targetRole}, with events experience at Marketing Society.`, "Option two.", "Option three."], questions: [] }),
  skills: () => ({ suggestions: ["Canva", "Excel", "Market research", "Social media", "Public speaking"], soft: [{ skill: "leadership", where: "Marketing Society" }], questions: [] }),
  fit: () => ({ suggestions: [{ path: "workExperience[0].achievements", before: ["a", "b", "c", "d"], after: ["a", "b", "c"], linesSaved: 1 }] }),
};
const api = {
  post: async (url, body) => {
    posts.push({ url, body: body instanceof Object && !(body.append) ? clone(body) : "form" });
    if (url === "/resume/ai/coach") return { data: { data: ai[body.action](body.facts) } };
    if (url === "/resume/ai/check") return { data: { data: { issues: /^i /i.test(body.text) ? [{ code: "first_person", message: "start with what you did", fix: body.text.replace(/^i /i, "").replace(/^./, (c) => c.toUpperCase()) }] : [] } } };
    if (url === "/resume/ai/autofix") return { data: { data: { changes: [{ rule: "capitals", path: "workExperience[0].company", before: "daraz", after: "Daraz" }], patch: { workExperience: [{ company: "Daraz" }] } } } };
    if (url === "/resume/ai/transcribe") return { data: { data: { text: "i ran the welcome week" } } };
    return { data: { data: null } };
  },
};
const funnels = [];

function env({ coach = true, speak = false, user = { name: "Hina Ali", email: "hina@x.co", phone: "03001234567" } } = {}) {
  const { React, mount } = H.makeReact();
  const { rn } = H.makeRN({ Share: { share: async () => ({}) }, Linking: { openURL: async () => {} } });
  const nav = { calls: [] };
  nav.navigate = (...a) => nav.calls.push(["navigate", ...a]); nav.replace = (...a) => nav.calls.push(["replace", ...a]); nav.goBack = () => {};
  const recorded = { started: 0, deleted: [] };
  const mocks = {
    react: React, "react-native": rn,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "react-native-keyboard-controller": { KeyboardStickyView: "KeyboardStickyView", KeyboardAwareScrollView: "KeyboardAwareScrollView" },
    "@react-navigation/native": { useNavigation: () => nav, useRoute: () => env.route },
    "../api/api": { __esModule: true, default: api },
    "../analytics/funnel": { funnel: (n, m) => funnels.push([n, m]) },
    "../../analytics/funnel": { funnel: (n, m) => funnels.push([n, m]) },
    "../../../analytics/funnel": { funnel: (n, m) => funnels.push([n, m]) },
    "../../hooks/useFlag": { __esModule: true, default: (n) => (n === "resumeCoach" ? coach : n === "resumeSpeak" ? speak : n === "resumeV2") },
    "../../../hooks/useFlag": { __esModule: true, default: (n) => (n === "resumeCoach" ? coach : n === "resumeSpeak" ? speak : n === "resumeV2") },
    "expo-av": { Audio: { requestPermissionsAsync: async () => ({ granted: true }), setAudioModeAsync: async () => {}, RecordingOptionsPresets: { HIGH_QUALITY: {} }, Recording: { createAsync: async () => { recorded.started++; return { recording: { stopAndUnloadAsync: async () => {}, getURI: () => "file:///rec.m4a" } }; } } } },
    "expo-file-system/legacy": { deleteAsync: async (u) => { recorded.deleted.push(u); } },
  };
  return { React, mount, rn, nav, recorded, load: H.loader(mocks), mocks, user };
}
env.route = { params: {} };
const press = async (m, label, ms = 20) => { const b = H.find(m.tree, (n) => (n.type === "Pressable" || n.type === "TouchableOpacity") && (n.props.accessibilityLabel === label || H.textOf(n) === label)); if (!b) throw new Error(`no button "${label}"`); (b.props.onPress || b.props.onPressIn)(); await H.tick(ms); m.rerender(); };
const typeInto = async (m, label, v) => { const i = H.find(m.tree, (n) => n.type === "TextInput" && (n.props.accessibilityLabel === label || n.props.placeholder === label)); if (!i) throw new Error(`no input "${label}"`); i.props.onChangeText(v); await H.tick(2); m.rerender(); };

(async () => {
  console.log("── resume/coach.js");
  let e = env();
  const C = e.load(path.join(H.SRC, "resume", "coach.js"));
  ok(C.fieldOf("BS Computer Science") === "cs" && C.fieldOf("BBA") === "business" && C.fieldOf("BS Psychology") === "other", "the programme's field");
  const cs = C.joggersFor("BS Computer Science").map((j) => j.key);
  const bba = C.joggersFor("BBA").map((j) => j.key);
  ok(cs.slice(0, 2).join() === "hackathon,github" && !bba.includes("github") && bba[0] === "bizplan" && !cs.includes("bizplan"), "CS sees hackathon / GitHub first, BBA a business plan competition first");
  ok(C.joggersFor("BBA").length >= 14 && C.joggersFor("BBA", ["workExperience"]).every((j) => j.section === "workExperience"), "all 14 joggers from the plan, filtered by the step's sections");
  ok(C.exampleFor("BS CS", "projects").includes("React Native") && C.exampleFor("BBA", "projects").includes("business plan"), "examples for the student's programme");
  const full = { personalInfo: { firstName: "Hina", email: "h@x.co", phone: "0300" }, education: [{ institution: "IBA", current: true }], activities: [{ organisation: "MS", startDate: "2025-01-01" }], professionalSummary: { summary: "BBA student aiming for a marketing internship." }, targetJob: { jobTitle: "marketing internship" } };
  const ready = C.readyChecklist(full);
  ok(ready.length === 6 && ready.every((i) => i.ok), "ready to send: 6 checks, all green when true", JSON.stringify(ready.filter((i) => !i.ok)));
  const notReady = C.readyChecklist({ personalInfo: { firstName: "H" }, activities: [{ organisation: "MS" }] }, { spellingLeft: 2, atsSafe: false });
  ok(notReady.filter((i) => !i.ok).length === 5 && notReady.find((i) => i.key === "spelling").text === "2 spelling issues left", "…open items say what's left");
  await C.meterStart("r1", "chat", 1000);
  await C.meterAdd("r1", { typed: 40, taps: 3 });
  ok((await C.meterCheck("r1", { personalInfo: {} }, 5000)) === null, "meter: nothing until the resume is strong on one page");
  const strong = { settings: { track: "fresher" }, personalInfo: { firstName: "H", lastName: "A", email: "h@x.co", phone: "0300", city: "Karachi", title: "BBA student" }, professionalSummary: { summary: "x".repeat(60) }, education: [{ institution: "IBA", degree: "BBA", current: true }], projects: [{ name: "P", description: "a business plan for a cafe" }], activities: [{ organisation: "MS", bullets: ["ran events"] }], skills: ["a", "b", "c", "d", "e"].map((name) => ({ name })) };
  const m1 = await C.meterCheck("r1", strong, 181000);
  ok(m1 && m1.seconds === 180 && m1.typed === 40 && m1.taps === 3 && m1.mode === "chat", "…then the real seconds, typing and taps", JSON.stringify(m1));
  ok((await C.meterCheck("r1", strong, 999999)) === null, "…recorded once");

  console.log("── StoryPrompt and SuggestionList (tap mode)");
  e = env();
  const SP = e.load(path.join(H.SRC, "screens/Resume/coach/StoryPrompt.js")).default;
  const kept = [];
  let m = e.mount(e.React.createElement(SP, { section: "activities", role: "events lead", organisation: "Marketing Society", onKeep: (l) => kept.push(...l) }));
  ok(H.textOf(m.tree).includes("what did you do there?") && ["organised events", "managed social media", "led a team"].every((c) => H.textOf(m.tree).includes(c)), "chips for what they did");
  const mk = H.find(m.tree, (n) => n.props?.accessibilityLabel === "make my bullets");
  ok(mk.props.disabled === true || mk.props.accessibilityState?.disabled === true, "'make my bullets' waits for an answer");
  await press(m, "organised events"); await press(m, "managed social media");
  await press(m, "make my bullets", 30);
  const sent = posts.filter((p) => p.url === "/resume/ai/coach").pop().body;
  ok(sent.action === "bullets" && sent.facts.did.join() === "organised events,managed social media" && sent.facts.organisation === "Marketing Society", "only the student's answers are sent");
  ok(H.textOf(m.tree).includes("Organised events for Marketing Society") && H.textOf(m.tree).includes("roughly how many people?"), "the lines come back to keep, and the coach asks for a number instead of guessing");
  await press(m, "keep: Organised events for Marketing Society");
  await press(m, "remove: Managed social media for Marketing Society");
  ok(kept.join() === "Organised events for Marketing Society" && !H.textOf(m.tree).includes("Managed social media for"), "keep adds one line; remove drops one; nothing is added silently");
  m.unmount();

  console.log("── LiveCheck, MemoryJoggers, CoachBar, HoldToTalk");
  e = env();
  const LC = e.load(path.join(H.SRC, "screens/Resume/coach/LiveCheck.js")).default;
  let fixed = null;
  m = e.mount(e.React.createElement(LC, { field: "bullet", text: "i ran the welcome week", onFix: (v) => { fixed = v; } }));
  const before = posts.length;
  await H.tick(200); m.rerender();
  ok(posts.length === before, "no check while typing (debounced)");
  await H.tick(650); m.rerender();
  ok(H.textOf(m.tree).includes("start with what you did"), "after a pause: the hint");
  await press(m, "fix: start with what you did");
  ok(fixed === "Ran the welcome week", "one tap applies the fix");
  m.unmount();

  e = env();
  const MJ = e.load(path.join(H.SRC, "screens/Resume/coach/MemoryJoggers.js"));
  let saved = { workExperience: [] };
  const io = { ensureResume: async () => ({ _id: "r9" }), updateResume: async (id, fn) => { const p = typeof fn === "function" ? fn(saved) : fn; saved = { ...saved, ...clone(p) }; return saved; } };
  m = e.mount(e.React.createElement(MJ.default, { programme: "BBA", sections: ["workExperience"], io }));
  ok(H.textOf(m.tree).includes("students often forget these") && H.textOf(m.tree).includes("family business help") && !H.textOf(m.tree).includes("class representative"), "joggers for this step only (work)");
  await press(m, "tuition / teaching");
  await typeInto(m, "who did you teach? (e.g. O level maths, 3 students)", "O level maths");
  await press(m, "taught a subject"); await press(m, "helped with exams");
  await press(m, "add tuition / teaching", 30);
  await press(m, "keep: Taught a subject for O level maths");
  await press(m, "save tuition / teaching", 30);
  ok(saved.workExperience.length === 1 && saved.workExperience[0].company === "O level maths" && saved.workExperience[0].position === "Tutor" && saved.workExperience[0].achievements.join() === "Taught a subject for O level maths", "a tap becomes one written entry with only the kept line", JSON.stringify(saved));
  ok(MJ.entryFor({ section: "awards" }, { name: "Dean's list" }).title === "Dean's list" && MJ.entryFor({ section: "projects" }, { name: "App", lines: ["Built it"] }).description === "Built it", "entries in each section's shape");
  m.unmount();

  e = env();
  const CT = e.load(path.join(H.SRC, "screens/Resume/coach/CoachTools.js"));
  saved = { _id: "r9", workExperience: [{ company: "daraz", achievements: ["a", "b", "c", "d"] }] };
  const puts = [];
  const io2 = { ensureResume: async () => ({ _id: "r9" }), updateResume: async (id, p) => { puts.push(clone(p)); return {}; } };
  m = e.mount(e.React.createElement(CT.CoachBar, { resume: saved, io: io2 }));
  await press(m, "fix everything: preview the tidy-ups", 30);
  ok(H.textOf(m.tree).includes("capital letters") && H.textOf(m.tree).includes("daraz") && H.textOf(m.tree).includes("Daraz") && puts.length === 0, "fix everything: a preview of each change, nothing saved yet");
  await press(m, "apply these changes", 30);
  ok(puts.length === 1 && puts[0].workExperience[0].company === "Daraz" && funnels.some(([n]) => n === "resume_fix_everything"), "apply: one save with the server's patch");
  m.unmount();
  const patch = CT.applyFit({ workExperience: [{ achievements: ["a", "b", "c", "d"] }] }, [{ path: "workExperience[0].achievements", after: ["a", "b", "c"] }]);
  ok(patch.workExperience[0].achievements.join() === "a,b,c", "fit on one page: the trimmed lines as a patch");

  e = env({ speak: false });
  const HT = e.load(path.join(H.SRC, "screens/Resume/coach/HoldToTalk.js"));
  m = e.mount(e.React.createElement(HT.default, { onText: () => {} }));
  ok(m.tree == null, "resumeSpeak off: no talk button");
  e = env({ speak: true });
  const HT2 = e.load(path.join(H.SRC, "screens/Resume/coach/HoldToTalk.js"));
  let heard = "";
  m = e.mount(e.React.createElement(HT2.default, { onText: (t) => { heard = t; } }));
  ok(H.textOf(m.tree).includes(HT2.PRIVACY_LINE) && HT2.PRIVACY_LINE === "your voice is turned into text and not kept.", "on: the one-line privacy note");
  const talk = H.find(m.tree, (n) => n.props?.accessibilityLabel === "hold to talk: answer by speaking");
  await talk.props.onPressIn(); await H.tick(1100);
  await talk.props.onPressOut(); await H.tick(30); m.rerender();
  ok(heard === "i ran the welcome week" && e.recorded.deleted.includes("file:///rec.m4a"), "hold, talk, let go: the text comes back and the recording is deleted from the phone");
  m.unmount();

  console.log("── chat mode, measured");
  e = env();
  // a small ResumeContext: creates and saves like the real one
  const RCmod = { ResumeContext: e.React.createContext({}) };
  const Provider = ({ children }) => {
    const [list, setList] = e.React.useState([]);
    const value = {
      resumes: list, currentResume: list[0] || null,
      createResume: async (d) => { const r = { _id: "c1", education: [], activities: [], projects: [], workExperience: [], skills: [], ...clone(d) }; setList([r]); Provider.last = r; return r; },
      updateResume: async (id, p) => { const cur = Provider.last; const patchv = typeof p === "function" ? p(cur) : p; const next = { ...cur, ...clone(patchv) }; Provider.last = next; setList([next]); return next; },
    };
    return e.React.createElement(RCmod.ResumeContext.Provider, { value }, children);
  };
  const loadChat = H.loader({ ...e.mocks, "../../context/AuthContext": { AuthContext: { _default: { user: e.user, token: "t" } } }, "../../context/ResumeContext": RCmod, "../../ui/Screen": { __esModule: true, default: ({ children }) => e.React.createElement("Screen", null, children) }, "../../ui/ScreenHeader": { __esModule: true, default: () => null } });
  const Chat = loadChat(path.join(H.SRC, "screens/Resume/ResumeCoachChat.js"));
  env.route = { params: { track: "fresher" } };
  m = e.mount(e.React.createElement(Provider, null, e.React.createElement(Chat.default)));
  let typed = 0, taps = 0;
  const answer = async (t) => { typed += t.length; await typeInto(m, "your answer", t); await press(m, "send", 60); taps++; };
  const tap = async (label) => { await press(m, label, 40); taps++; };
  ok(H.textOf(m.tree).includes("what are you studying, and where?"), "chat: the first question");
  await answer("BBA at IBA");
  await answer("a marketing internship");
  await answer("marketing society, events lead");
  ok(H.textOf(m.tree).includes("what did you do there?"), "a real answer → the follow-up");
  await answer("organised the welcome week and managed instagram");
  ok(H.textOf(m.tree).includes("here's how i'd write it"), "the coach writes the lines, to keep");
  await tap("keep all");
  await tap("next question");
  await answer("cafe business plan for a class");
  await answer("researched prices");
  await tap("keep: Researched prices for Cafe business plan"); // one line: keep it
  await tap("next question");
  await answer("no");
  ok(H.textOf(m.tree).includes("check it in the builder"), "'no' skips; the interview ends");
  let r = Provider.last;
  ok(r.settings.track === "fresher" && r.personalInfo.firstName === "Hina" && r.education[0].institution === "IBA" && r.education[0].degree === "BBA" && r.targetJob.jobTitle === "marketing internship", "the resume filled as it went: track, name from the account, education, the job they want");
  ok(r.activities[0].organisation === "Marketing Society" && r.activities[0].role === "events lead" && r.activities[0].bullets.length === 2 && r.projects[0].name === "Cafe business plan" && /Researched prices/.test(r.projects[0].description), "…the society with its kept lines, the project with its line", JSON.stringify(r.activities));
  ok(!r.workExperience.length, "…nothing for 'no'");
  ok(funnels.some(([n]) => n === "resume_coach_chat"), "chat mode is counted");
  m.unmount();
  // then the builder's two done-for-you buttons: write my summary (keep one), suggest my skills (tap 5)
  const CT2 = env().load(path.join(H.SRC, "screens/Resume/coach/CoachTools.js"));
  const e2 = env();
  const CT3 = e2.load(path.join(H.SRC, "screens/Resume/coach/CoachTools.js"));
  let summaryPicked = "";
  m = e2.mount(e2.React.createElement(CT3.CoachSummary, { programme: "BBA", university: "IBA", targetRole: "marketing internship", strengths: ["events lead at Marketing Society"], onPick: (t) => { summaryPicked = t; } }));
  await press(m, "write my summary", 30); taps++;
  await press(m, `use this: ${ai.summary({ programme: "BBA", targetRole: "marketing internship" }).suggestions[0]}`); taps++;
  m.unmount();
  r = { ...r, professionalSummary: { summary: summaryPicked } };
  let skillSaved = r;
  const io3 = { ensureResume: async () => ({ _id: "c1" }), updateResume: async (id, fn) => { skillSaved = { ...skillSaved, ...(typeof fn === "function" ? fn(skillSaved) : fn) }; return skillSaved; } };
  m = e2.mount(e2.React.createElement(CT3.CoachSkills, { resume: r, programme: "BBA", targetRole: "marketing internship", io: io3 }));
  await press(m, "suggest my skills", 30); taps++;
  for (const sk of ["Canva", "Excel", "Market research", "Social media", "Public speaking"]) { await press(m, sk, 10); taps++; }
  m.unmount();
  r = skillSaved;
  const rules = env().load(path.join(H.SRC, "utils/resumeRules.js"));
  const V = env().load(path.join(H.SRC, "resume/resumeV2.js"));
  const score = rules.resumeStrength(r).score;
  ok(score >= 80 && V.pageEstimate(r).fits, `MEASURED: a fresher with no experience reaches a strong one-page resume (strength ${score})`, JSON.stringify(rules.resumeStrength(r).missing));
  ok(typed > 0 && taps > 0, `MEASURED (chat mode): ${typed} characters typed, ${taps} taps (chat is typing by nature; reported, not a pass mark)`);
  ok(JSON.stringify(r).includes("Organised the welcome week") && !/\d{2,}/.test(JSON.stringify(r.activities) + JSON.stringify(r.projects) + r.professionalSummary.summary), "every line is built from what they said (no numbers they didn't give)");
  console.log(`   measured: ${typed} characters typed, ${taps} taps, strength ${score}`);

  console.log("── tap mode, measured (the plan's exit path: profile prefill, memory joggers, chips, summary, skills)");
  {
    const et = env();
    const Vt = et.load(path.join(H.SRC, "resume/resumeV2.js"));
    const rulesT = et.load(path.join(H.SRC, "utils/resumeRules.js"));
    let res = { _id: "t1", ...Vt.prefillFromProfile({ user: { name: "Hina Ali", email: "hina@x.co", phone: "03001234567", universityName: "IBA" }, profile: { fieldOfStudy: "BBA" }, track: "fresher" }).resume };
    res.education[0].degree = "BBA"; // the review screen: tap to confirm the programme the profile shows (no typing)
    let tTyped = 0, tTaps = 1;
    const ioT = { ensureResume: async () => res, updateResume: async (id, fn) => { res = { ...res, ...clone(typeof fn === "function" ? fn(res) : fn) }; return res; } };
    const typeT = async (mm, label, v) => { tTyped += v.length; await typeInto(mm, label, v); };
    const tapT = async (mm, label, ms = 30) => { tTaps++; await press(mm, label, ms); };
    const MJt = et.load(path.join(H.SRC, "screens/Resume/coach/MemoryJoggers.js")).default;
    let mm = et.mount(et.React.createElement(MJt, { programme: "BBA", sections: ["activities", "projects"], io: ioT }));
    await tapT(mm, "society role");
    await typeT(mm, "which society, and your role?", "Marketing Society");
    await tapT(mm, "organised events"); await tapT(mm, "managed social media");
    await tapT(mm, "add society role");
    await tapT(mm, "keep all");
    await tapT(mm, "save society role");
    await tapT(mm, "final-year or semester project");
    await typeT(mm, "what was the project called?", "Cafe plan");
    await tapT(mm, "researched");
    await tapT(mm, "add final-year or semester project");
    await tapT(mm, "keep: Researched for Cafe plan");
    await tapT(mm, "save final-year or semester project");
    mm.unmount();
    res.targetJob = { jobTitle: "Marketing Intern" }; tTaps++; // the summary step's role chips: one tap
    const CTt = et.load(path.join(H.SRC, "screens/Resume/coach/CoachTools.js"));
    mm = et.mount(et.React.createElement(CTt.CoachSummary, { programme: "BBA", university: "IBA", targetRole: "Marketing Intern", strengths: ["Marketing Society"], onPick: (t) => { res.professionalSummary = { summary: t }; } }));
    await tapT(mm, "write my summary");
    await tapT(mm, `use this: ${ai.summary({ programme: "BBA", targetRole: "Marketing Intern" }).suggestions[0]}`);
    mm.unmount();
    mm = et.mount(et.React.createElement(CTt.CoachSkills, { resume: res, programme: "BBA", targetRole: "Marketing Intern", io: ioT }));
    await tapT(mm, "suggest my skills");
    for (const sk of ["Canva", "Excel", "Market research", "Social media", "Public speaking"]) await tapT(mm, sk, 10);
    mm.unmount();
    const sc = rulesT.resumeStrength(res).score;
    ok(sc >= 80 && Vt.pageEstimate(res).fits, `MEASURED (tap mode): strong one-page resume without experience (strength ${sc})`, JSON.stringify(rulesT.resumeStrength(res).missing));
    ok(tTyped < 100, `MEASURED (tap mode): ${tTyped} characters typed, ${tTaps} taps (plan's exit check: under 100 characters)`, `${tTyped}`);
    console.log(`   measured (tap mode): ${tTyped} characters typed, ${tTaps} taps, strength ${sc}`);
  }

  console.log("── wiring (source)");
  const b = H.read("app/src/screens/Resume/ResumeBuilder.js");
  ok(/\{!coachOn && footerEl\}/.test(b) && /\{coachOn && <KeyboardStickyView>\{footerEl\}<\/KeyboardStickyView>\}/.test(b), "builder: the step buttons pinned above the keyboard with the coach, in the scroll view without");
  ok(/const coachFlag = useFlag\(COACH_FLAG\) === true;/.test(b) && /const coachOn = v2 && coachFlag;/.test(b), "the coach needs resumeV2 too (hooks always called)");
  ok(/if \(activeStep === lastStep && coachOn\) \{\s*openReady\(\);/.test(b) && /onContinue=\{\(\) => \{ setReady\(\{ open: false, items: \[\], loading: false \}\); handleFinish\(\); \}\}/.test(b), "finish with the coach: 'ready to send?' first, then the same finish (never blocks)");
  ok(!/min left/.test(b), "no minutes in the builder's copy (not measured yet)");
  ok(/name="ResumeCoachChat"/.test(H.read("app/src/navigation/ResumeNavigator.js")) && /'ResumeCoachChat',/.test(H.read("app/src/navigation/DrawerNavigator.js")) && /build it by chatting/.test(H.read("app/src/screens/Resume/ResumeStart.js")), "chat mode registered and offered on the start screen (coach only)");
  const ht = H.read("app/src/screens/Resume/coach/HoldToTalk.js");
  ok(/require\("expo-av"\)/.test(ht) && !/^import .*expo-av/m.test(ht), "expo-av loads only when someone talks");
  done();
})().catch((e) => { console.error(e); process.exit(1); });
