// r7, plan P3-9 (flags resumeV2 + resumeWriter): the cover letter + LinkedIn screen (screens/Resume/ResumeWriter.js)
//   cover letter: "write" needs the job title and the company; the body sent; the paragraphs editable; "copy" gives the
//     greeting (the company typed), the edited paragraphs and the student's name; "save as pdf" prints the letter in the
//     resume's design (coverLetterHtmlWithFonts) and shares it; nothing written (ai: false) → only "try again"; a 400
//     shows the server's sentence; 429 → "try again later"
//   linkedin: headline + about, each with "copy"
//   the dashboard button only with both flags
//   node tests/app/resume-writer.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

const RESUME = { _id: "r1", template: "campus", personalInfo: { firstName: "Sara", lastName: "Example", email: "sara@example.com" }, customStyles: {} };

function setup({ letterReply, liReply, letterError } = {}) {
  const { React, mount, contexts } = H.makeReact();
  const { rn } = H.makeRN();
  const calls = { letter: [], li: 0, html: [], printed: 0, shared: 0, copied: [], events: [] };
  const ResumeContext = { _default: {} };
  const el = (type) => (p) => ({ type, props: { ...p, accessibilityLabel: p.accessibilityLabel || p.label || p.title, children: p.children ?? null } });
  const load = H.loader({
    react: React, "react-native": rn,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@react-navigation/native": { useRoute: () => ({ params: { resumeId: "r1" } }), useNavigation: () => ({ navigate() {}, goBack() {} }) },
    "expo-print": { printToFileAsync: async () => { calls.printed++; return { uri: "file:///letter.pdf" }; } },
    "expo-sharing": { isAvailableAsync: async () => true, shareAsync: async () => { calls.shared++; } },
    "/context/ResumeContext": { ResumeContext },
    "/ui/ScreenHeader": { __esModule: true, default: (p) => ({ type: "Header", props: { title: p.title, children: null } }) },
    "/ui/Card": { __esModule: true, default: (p) => ({ type: "Card", props: { children: p.children } }) },
    "/ui/Button": { __esModule: true, default: el("Button") },
    "/ui/Chip": { __esModule: true, default: el("Chip") },
    "/ui/Input": { __esModule: true, default: el("Input") },
    "/resume/finishApi": { __esModule: true,
      writeCoverLetter: async (id, body) => { calls.letter.push([id, body]); if (letterError) throw letterError; return letterReply; },
      writeLinkedin: async () => { calls.li++; return liReply; } },
    "/services/templates/print": { __esModule: true, coverLetterHtmlWithFonts: async (resume, letter) => { calls.html.push([resume, letter]); return "<html>letter</html>"; } },
    "/utils/clipboard": { __esModule: true, copyToClipboard: async (text) => { calls.copied.push(text); return true; } },
    "/analytics/funnel": { __esModule: true, funnel: (n) => calls.events.push(n) },
  });
  contexts.set(ResumeContext, { resumes: [RESUME] });
  const m = mount(React.createElement(load(path.join(H.SRC, "screens/Resume/ResumeWriter.js")).default));
  return { m, calls, React };
}
const input = (m, label) => H.find(m.tree, (n) => n.type === "Input" && n.props.accessibilityLabel === label);
const button = (m, title) => H.find(m.tree, (n) => n.type === "Button" && n.props.title === title);

(async () => {
  console.log("── cover letter");
  {
    const { m, calls } = setup({ letterReply: { paragraphs: ["I am applying for the role.", "At IEEE I ran workshops."], ai: true } });
    await H.tick(2);
    ok(button(m, "write my cover letter").props.disabled === true, "'write' waits for the job title and the company");
    input(m, "job title").props.onChangeText("Marketing Intern");
    input(m, "company").props.onChangeText(" Acme ");
    await H.tick(2);
    ok(button(m, "write my cover letter").props.disabled === false, "…then it can be pressed");
    await button(m, "write my cover letter").props.onPress();
    await H.tick(5);
    ok(JSON.stringify(calls.letter[0]) === JSON.stringify(["r1", { jobTitle: "Marketing Intern", company: "Acme" }]), "the job is sent (trimmed; no description when empty)", JSON.stringify(calls.letter));
    ok(input(m, "paragraph 1")?.props.value === "I am applying for the role." && input(m, "paragraph 2"), "the paragraphs show, each editable");
    input(m, "paragraph 2").props.onChangeText("At IEEE I ran three workshops.");
    await H.tick(2);
    await button(m, "copy the text").props.onPress();
    ok(calls.copied[0] === "Dear hiring team at Acme,\n\nI am applying for the role.\n\nAt IEEE I ran three workshops.\n\nSincerely,\nSara Example", "copy: the greeting with the company, the edited text, the student's name", JSON.stringify(calls.copied[0]));
    await button(m, "save as pdf").props.onPress();
    await H.tick(5);
    const [res, letter] = calls.html[0] || [];
    ok(res?._id === "r1" && letter?.company === "Acme" && letter.paragraphs[1] === "At IEEE I ran three workshops." && /\d{4}$/.test(letter.date), "save as pdf: the letter in the resume's design, with the edits and today's date", JSON.stringify(letter));
    ok(calls.printed === 1 && calls.shared === 1, "…printed and shared");
    ok(["resume_writer_letter", "resume_writer_copied", "resume_writer_pdf"].every((e) => calls.events.includes(e)), "funnel: letter, copied, pdf", calls.events.join());
    m.unmount();
  }
  {
    const { m, calls } = setup({ letterReply: { paragraphs: [], ai: false, message: "the writer is busy right now. try again in a minute." } });
    input(m, "job title").props.onChangeText("Intern"); input(m, "company").props.onChangeText("Acme"); await H.tick(2);
    await button(m, "write my cover letter").props.onPress(); await H.tick(5);
    ok(/try again in a minute/.test(H.textOf(m.tree)) && !input(m, "paragraph 1") && !button(m, "save as pdf"), "nothing written (ai: false): only 'try again', no letter");
    ok(!calls.events.includes("resume_writer_letter"), "…and no 'written' event");
    m.unmount();
  }
  for (const [err, re, label] of [[{ response: { status: 400, data: { message: "add a bit more to your resume first (a project, an activity or your education), then try again." } } }, /add a bit more to your resume/, "a 400: the server's sentence"], [{ response: { status: 429 } }, /a lot of help this hour/, "429: try again later"]]) {
    const { m } = setup({ letterError: err });
    input(m, "job title").props.onChangeText("Intern"); input(m, "company").props.onChangeText("Acme"); await H.tick(2);
    await button(m, "write my cover letter").props.onPress(); await H.tick(5);
    ok(re.test(H.textOf(m.tree)), label);
    m.unmount();
  }

  console.log("── linkedin");
  {
    const { m, calls } = setup({ liReply: { headline: "BBA student | Events Lead at IEEE", about: ["I study marketing.", "I lead events."], ai: true } });
    H.byLabel(m.tree, "linkedin").props.onPress(); await H.tick(2);
    await button(m, "write my headline and about").props.onPress(); await H.tick(5);
    ok(calls.li === 1 && /Events Lead at IEEE/.test(H.textOf(m.tree)) && /I lead events/.test(H.textOf(m.tree)), "the headline and the about show");
    await button(m, "copy headline").props.onPress();
    await button(m, "copy about").props.onPress();
    ok(calls.copied[0] === "BBA student | Events Lead at IEEE" && calls.copied[1] === "I study marketing.\n\nI lead events.", "each has its own copy", JSON.stringify(calls.copied));
    m.unmount();
  }

  console.log("── the dashboard button (source)");
  {
    const src = require("fs").readFileSync(path.join(H.SRC, "screens/Resume/ResumeDashboard.js"), "utf8");
    ok(/const writerOn = useFlag\("resumeWriter"\) === true && resumeV2;/.test(src) && /\{writerOn && \(/.test(src) && /navigate\('ResumeWriter', \{ resumeId: selectedResume\._id \}\)/.test(src), "shown only with resumeV2 + resumeWriter; opens ResumeWriter with the resume");
  }
  done();
})().catch((e) => { console.error(e); process.exit(1); });
