// P3c step 2: the template studio (flags resumeV2 + resumeTemplatesV2)
//   gallery: only the five + the library templates the owner approved (all unapproved today → only the five)
//   recommend(): up to 3, each with a reason, only templates in the gallery; fresher / projects / activities / target
//   badges: ATS-safe from the real-PDF test (resume-ats.test.js); all five (Minimal since its headings went 0.08em → 0.05em)
//   the template screen: flags off (or loading) → today's picker, untouched; both on → the studio
//   the studio: recommended row with reasons, tabs, "ATS-safe only", pick + "use this template" saves the template,
//     funnel template_previewed / template_selected / resume_ats_badge_safe, then the preview; long-press two → compare
//   the customise sheet: nothing saved until "save"; only the changed keys are sent; a custom colour must be readable
//     (≥ 4.5:1); the photo only from an https profile photo; "reset" sends null for the studio keys; funnel per key
//   node tests/app/resume-studio.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

const RESUME = {
  _id: "r1", template: "modern_ats",
  personalInfo: { firstName: "Sara", lastName: "Example", email: "sara@example.com" },
  education: [{ institution: "Sample University", degree: "BS", fieldOfStudy: "Computer Science", startDate: "2022-09", endDate: "2026-06" }],
  projects: [{ title: "Bus tracker" }, { title: "Notes app" }], activities: [], volunteering: [], skills: [{ name: "Python" }],
  workExperience: [], certifications: [], languages: [], achievements: [], settings: { track: "fresher" },
};

function setup({ flags = { resumeV2: true, resumeTemplatesV2: true }, resume = RESUME, user = { profileImage: "https://res.cloudinary.com/x/me.jpg" } } = {}) {
  const { React, mount, contexts } = H.makeReact();
  const { rn } = H.makeRN();
  const puts = []; const events = []; const nav = { calls: [], goBack() {}, navigate: (...a) => nav.calls.push(a) };
  const ResumeContext = { _default: {} }; const AuthContext = { _default: {} };
  const el = (type) => (p) => ({ type, props: { ...p, accessibilityLabel: p.accessibilityLabel || p.label || p.title, children: p.children ?? null } });
  const load = H.loader({
    react: React, "react-native": rn,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "react-native-webview": { WebView: "WebView" },
    "@react-navigation/native": { useRoute: () => ({ params: { resumeId: "r1" } }), useNavigation: () => nav },
    "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } },
    "/context/ResumeContext": { ResumeContext },
    "/context/AuthContext": { AuthContext },
    "/hooks/useFlag": { __esModule: true, default: (name) => flags[name] ?? null },
    "/analytics/funnel": { __esModule: true, funnel: async (name, meta) => { events.push([name, meta]); }, default: async () => {} },
    "/ui/ScreenHeader": { __esModule: true, default: (p) => ({ type: "Header", props: { title: p.title, onBack: p.onBack, children: null } }) },
    "/ui/Chip": { __esModule: true, default: el("Chip") },
    "/ui/Button": { __esModule: true, default: el("Button") },
    "/ui/Input": { __esModule: true, default: el("Input") },
    "/ui/Sheet": { __esModule: true, default: (p) => ({ type: "Sheet", props: { visible: p.visible, title: p.title, children: p.visible ? p.children : null } }) },
    "/studio/TemplateThumb": { __esModule: true, default: (p) => ({ type: "Thumb", props: { templateId: p.templateId, styles: p.styles, resume: p.resume, children: null } }) },
  });
  let current = JSON.parse(JSON.stringify(resume));
  contexts.set(ResumeContext, { resumes: [current], updateResume: async (id, ch) => { puts.push([id, ch]); current = { ...current, ...ch }; return current; } });
  contexts.set(AuthContext, { user });
  return { React, mount, load, puts, events, nav };
}

(async () => {
  const load0 = setup().load;
  const studio = load0(path.join(H.SRC, "resume/studio.js"));
  const lib = load0(path.join(H.SRC, "services/templates/library.js"));

  console.log("── gallery");
  let g = studio.galleryTemplates();
  ok(g.length === 5 && g.every((t) => t.older), "nothing approved yet: the gallery is today's five", g.map((t) => t.id).join());
  ok(g.filter((t) => t.ats === "safe").length === 5 && studio.badgeOf("rezi") === "safe" && studio.badgeOf("modern_ats") === "safe", "badges: all five ATS-safe (the real-PDF test; Minimal since its 0.05em headings)");
  lib.LIBRARY.find((t) => t.id === "campus").approved = true;
  lib.LIBRARY.find((t) => t.id === "harvard").approved = true;
  g = studio.galleryTemplates();
  ok(g.length === 7 && g.some((t) => t.id === "campus" && t.collection === "fresher" && t.ats === "safe") && g.some((t) => t.id === "harvard" && t.collection === "ats"), "an approved template joins its collection, with its badge", g.map((t) => t.id).join());
  ok(!g.some((t) => t.id === "scholar"), "…an unapproved one stays out");

  console.log("── recommend");
  let rec = studio.recommend(RESUME, g);
  ok(rec.length === 3 && rec.every((r) => r.reason && g.some((t) => t.id === r.id)), "3, each with a reason, only gallery templates", JSON.stringify(rec));
  ok(rec[0].id === "campus" && rec.some((r) => r.id === "modern_ats"), "fresher (project_first not approved): Campus first, then the safe five", JSON.stringify(rec));
  const five = studio.galleryTemplates().filter((t) => t.older);
  rec = studio.recommend(RESUME, five);
  ok(rec.map((r) => r.id).join() === "modern_ats,stanford,jakes", "with only the five: Modern, Classic, Compact", JSON.stringify(rec));
  lib.LIBRARY.forEach((t) => { t.approved = true; });
  rec = studio.recommend(RESUME, studio.galleryTemplates());
  ok(rec[0].id === "project_first" && /projects/.test(rec[0].reason), "two projects, no activities: Project First, 'your projects are your strongest section'", JSON.stringify(rec));
  rec = studio.recommend({ ...RESUME, settings: { track: "experienced" }, workExperience: [{ company: "A" }, { company: "B" }], targetJob: { jobTitle: "Research assistant" } }, studio.galleryTemplates());
  ok(rec[0].id === "scholar" && rec.some((r) => r.id === "harvard"), "research target: Scholar first; experienced: Harvard", JSON.stringify(rec));
  lib.LIBRARY.forEach((t) => { t.approved = false; });

  console.log("── the template screen: flags");
  for (const [flags, label] of [[{ resumeV2: false, resumeTemplatesV2: true }, "resumeV2 off"], [{ resumeV2: true, resumeTemplatesV2: false }, "resumeTemplatesV2 off"], [{ resumeV2: null, resumeTemplatesV2: null }, "flags loading"]]) {
    const t = setup({ flags });
    const m = t.mount(t.React.createElement(t.load(path.join(H.SRC, "screens/Resume/ResumeTemplate.js")).default));
    await H.tick(3);
    ok(H.findAll(m.tree, (n) => n.type === "WebView").length === 5 && !/recommended for you/.test(H.textOf(m.tree)), `${label}: today's picker (5 cards), no studio`);
    m.unmount();
  }

  console.log("── the studio");
  {
    const t = setup();
    const L = t.load(path.join(H.SRC, "services/templates/library.js")).LIBRARY; // this copy of the module
    L.find((x) => x.id === "campus").approved = true;
    Object.assign(L.find((x) => x.id === "two_tone"), { approved: true, ats: "design" }); // test only: a template without the badge
    const m = t.mount(t.React.createElement(t.load(path.join(H.SRC, "screens/Resume/ResumeTemplate.js")).default));
    await H.tick(3);
    const text = () => H.textOf(m.tree);
    ok(/recommended for you/.test(text()) && /made for students/.test(text()), "both flags on: the studio, recommended row with the reason", text().slice(0, 200));
    const gridIds = () => H.findAll(m.tree, (n) => n.type === "Thumb").map((n) => n.props.templateId);
    ok(gridIds().filter((id) => id === "campus").length === 2 && gridIds().length === 3 + 7, "recommended (3) + gallery (the five + Campus + Two-tone)", gridIds().join());
    ok(H.findAll(m.tree, (n) => n.type === "Thumb").every((n) => n.props.resume._id === "r1"), "every card is the student's own resume");
    H.byLabel(m.tree, "ATS Pro").props.onPress();
    ok(gridIds().length === 3 + 6 && !gridIds().slice(3).includes("campus"), "tab ATS Pro: the five + Two-tone");
    H.byLabel(m.tree, "ATS-safe only").props.onPress();
    ok(gridIds().length === 3 + 5 && !gridIds().slice(3).includes("two_tone") && gridIds().slice(3).includes("rezi"), "ATS-safe only: a template without the badge drops out (Minimal now stays)");
    H.byLabel(m.tree, "all").props.onPress(); H.byLabel(m.tree, "ATS-safe only").props.onPress();
    H.find(m.tree, (n) => n.props?.testID === "template-campus").props.onPress();
    ok(t.events.some((e) => e[0] === "template_previewed" && e[1].refId === "campus"), "a tap previews: template_previewed");
    H.byLabel(m.tree, "use this template").props.onPress();
    await H.tick(10);
    ok(t.puts[0]?.[1]?.template === "campus" && Object.keys(t.puts[0][1]).join() === "template", "use this template: only the template is saved (content never changes)", JSON.stringify(t.puts));
    ok(t.events.some((e) => e[0] === "template_selected") && t.events.some((e) => e[0] === "resume_ats_badge_safe"), "funnel: template_selected + resume_ats_badge_safe", JSON.stringify(t.events.map((e) => e[0])));
    ok(t.nav.calls.some((c) => c[0] === "ResumeView" && c[1].resumeId === "r1"), "then the preview opens");
    H.find(m.tree, (n) => n.props?.testID === "template-jakes").props.onLongPress();
    H.find(m.tree, (n) => n.props?.testID === "template-stanford").props.onLongPress();
    const modal = H.find(m.tree, (n) => n.type === "Modal");
    ok(modal.props.visible && H.findAll(modal, (n) => n.type === "Thumb").map((n) => n.props.templateId).join() === "jakes,stanford", "long-press two: side by side");
    m.unmount();
  }

  console.log("── the customise sheet");
  {
    const t = setup();
    const CS = t.load(path.join(H.SRC, "screens/Resume/studio/CustomiseSheet.js"));
    ok(CS.contrastOnWhite("#FFFF00") < 4.5 && CS.contrastOnWhite("#1E6B3A") >= 4.5 && CS.contrastOnWhite("blue") === 0, "contrast check: yellow fails, dark green passes, not a colour → 0");
    ok(JSON.stringify(CS.changesFrom({ palette: "ocean", size: "S", font: "Inter" }, { size: "S", density: "airy", font: "Inter" })) === JSON.stringify({ palette: null, density: "airy" }), "changesFrom: only changed studio keys, null for a removed one");
    let closed = 0;
    const m = t.mount(t.React.createElement(CS.default, { visible: true, onClose: () => closed++, resume: RESUME, templateId: "modern_ats", updateResume: async (id, ch) => { t.puts.push([id, ch]); } }));
    await H.tick(2);
    H.byLabel(m.tree, "save these changes").props.onPress();
    await H.tick(2);
    ok(t.puts.length === 0 && closed === 1, "nothing changed: save just closes (no request)");
    H.byLabel(m.tree, "Ocean colour").props.onPress();
    H.byLabel(m.tree, "small").props.onPress();
    const thumb = H.find(m.tree, (n) => n.type === "Thumb");
    ok(thumb.props.styles.palette === "ocean" && thumb.props.styles.size === "S" && t.puts.length === 0, "the preview shows each change live; nothing saved yet");
    H.find(m.tree, (n) => n.type === "Input" && n.props.accessibilityLabel === "a custom colour").props.onChangeText("#FFEE00");
    H.byLabel(m.tree, "use colour").props.onPress();
    ok(/too light to read/.test(H.textOf(m.tree)) && H.find(m.tree, (n) => n.type === "Thumb").props.styles.palette === "ocean", "a custom colour too light (< 4.5:1): refused with the reason");
    H.byLabel(m.tree, "show Languages").props.onValueChange(false);
    H.byLabel(m.tree, "move Projects up").props.onPress();
    H.byLabel(m.tree, "rounded").props.onPress();
    ok(H.find(m.tree, (n) => n.type === "Thumb").props.resume.personalInfo.photoUrl === "https://res.cloudinary.com/x/me.jpg", "photo on: the preview uses the profile photo");
    H.byLabel(m.tree, "save these changes").props.onPress();
    await H.tick(5);
    const [id, patch] = t.puts[0] || [];
    const cs = patch?.customStyles || {};
    ok(id === "r1" && cs.palette === "ocean" && cs.size === "S" && cs.hiddenSections.join() === "languages" && cs.sectionOrder.indexOf("projects") < cs.sectionOrder.indexOf("education") && cs.photo.on && cs.photo.shape === "rounded", "save: palette, size, hidden, order and photo sent", JSON.stringify(patch));
    ok(Object.keys(cs).sort().join() === "hiddenSections,palette,photo,sectionOrder,size" && patch.personalInfo?.photoUrl === "https://res.cloudinary.com/x/me.jpg", "…only the changed keys, plus the photo link", JSON.stringify(patch));
    ok(["palette", "size", "hiddensections", "sectionorder", "photo"].every((k) => t.events.some((e) => e[0] === `template_customised_${k}`)), "funnel: template_customised_<key> per change", JSON.stringify(t.events.map((e) => e[0])));
    m.unmount();
  }
  {
    const t = setup({ user: { profileImage: "" } });
    const CS = t.load(path.join(H.SRC, "screens/Resume/studio/CustomiseSheet.js"));
    const saved = { ...RESUME, customStyles: { font: "Inter", accentColor: "#1E3A8A", palette: "ocean", size: "L", hiddenSections: ["languages"] } };
    const m = t.mount(t.React.createElement(CS.default, { visible: true, onClose() {}, resume: saved, templateId: "campus", updateResume: async (id, ch) => { t.puts.push([id, ch]); } }));
    await H.tick(2);
    ok(!H.byLabel(m.tree, "rounded") && /add a profile photo/.test(H.textOf(m.tree)), "no https profile photo: no photo choice, a hint instead");
    H.byLabel(m.tree, "reset to the template's look").props.onPress();
    H.byLabel(m.tree, "save these changes").props.onPress();
    await H.tick(5);
    ok(JSON.stringify(t.puts[0]?.[1]) === JSON.stringify({ customStyles: { palette: null, size: null, hiddenSections: null } }), "reset: null for each studio key (the server clears them); the older keys untouched", JSON.stringify(t.puts));
    m.unmount();
  }
  done();
})().catch((e) => { console.error(e); process.exit(1); });
