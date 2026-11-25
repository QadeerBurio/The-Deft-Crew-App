// P3-6 §4: the ATS-safe badge, tested on the real PDF (owner #2: puppeteer as a devDependency). For every template
// (the five + the library) and two resumes (the SAMPLE fresher and an experienced one), Chrome prints the PDF and
// pdftotext (xpdf / poppler: how most portals read PDFs) extracts the text. A template earns "ATS-safe" when the name,
// e-mail, phone, every section heading and every entry title come out, in the order of the document (two columns
// would interleave). The library's badges (library.js `ats`) must match what this finds.
// Needs Chrome / Edge and pdftotext on the machine; skips (with a note) when either is missing.
//   node tests/app/resume-ats.test.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const H = require("./harness");
const { ok, done } = H.counter();

const pdftotext = (() => { for (const c of [process.env.PDFTOTEXT, "pdftotext", "C:/Program Files/Git/mingw64/bin/pdftotext.exe", "/usr/bin/pdftotext", "/opt/homebrew/bin/pdftotext"]) { if (!c) continue; try { execFileSync(c, ["-v"], { stdio: "pipe" }); return c; } catch (e) { if (/pdftotext version/i.test(String(e.stderr || "") + String(e.stdout || ""))) return c; /* xpdf exits 99 on -v */ } } return null; })();

const EXPERIENCED = {
  personalInfo: { firstName: "Bilal", lastName: "Sample", title: "Software Engineer", email: "bilal.sample@example.com", phone: "+92 300 1111111", city: "Lahore", linkedin: "linkedin.com/in/bilal-sample" },
  professionalSummary: { summary: "Engineer with two years of backend work on payments and search." },
  workExperience: [
    { company: "Sample Payments", position: "Backend Engineer", startDate: "2024-07-15T00:00:00.000Z", current: true, achievements: ["Built the refunds service", "Cut checkout errors by a third"] },
    { company: "Sample Labs", position: "Software Intern", startDate: "2023-06-15T00:00:00.000Z", endDate: "2023-08-15T00:00:00.000Z", achievements: ["Wrote the search indexer"] },
  ],
  education: [{ institution: "Sample University", degree: "BS", fieldOfStudy: "Computer Science", startDate: "2019-09-15T00:00:00.000Z", endDate: "2023-06-15T00:00:00.000Z" }],
  projects: [{ name: "Budget Bot", technologies: ["Node.js"], description: "- A chat bot for monthly budgets" }],
  skills: ["Node.js", "PostgreSQL", "Redis", "Docker"].map((name) => ({ name })),
  certifications: [{ name: "AWS Cloud Practitioner", organization: "Amazon", issueDate: "2024-01-15T00:00:00.000Z" }],
  languages: [{ name: "English", proficiency: "Fluent" }],
};

(async () => {
  const { executable, launch } = require("../templates/browser");
  if (!executable() || !pdftotext) {
    console.log(`   skipped: ${!executable() ? "no Chrome / Edge" : "no pdftotext (poppler)"} on this machine`);
    ok(true, "ATS test skipped on this machine (not a pass mark)");
    return done();
  }
  const svc = H.loader({})(path.join(H.SRC, "services/templateService.js"));
  const { LIBRARY, OLD_BADGES } = H.loader({})(path.join(H.SRC, "services/templates/library.js"));
  const { FRESHER_SAMPLE } = require("../templates/sample");
  const ids = [...svc.TEMPLATES.map((t) => t.id), ...LIBRARY.map((t) => t.id)];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tdc-ats-"));
  const browser = await launch();
  const page = await browser.newPage();
  const norm = (s) => s.replace(/\s+/g, " ").replace(/[‐-―]/g, "-").toLowerCase();
  const results = {};
  const onePage = {}; // owner (25 Nov 2026): the one-page test, on the real PDF of the fresher sample
  const plainText = {}; // the fresher PDF's text, to compare with heading icons on
  for (const id of ids) {
    let safe = true;
    const why = [];
    for (const [label, resume] of [["fresher", FRESHER_SAMPLE], ["experienced", EXPERIENCED]]) {
      const html = svc.renderResumeHTML(resume, id);
      await page.setContent(html, { waitUntil: "load" });
      const file = path.join(tmp, `${id}-${label}.pdf`);
      await page.pdf({ path: file, format: "A4", printBackground: true, preferCSSPageSize: true });
      if (label === "fresher") onePage[id] = (fs.readFileSync(file).toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
      const text = norm(execFileSync(pdftotext, ["-enc", "UTF-8", file, "-"]).toString("utf8"));
      if (label === "fresher") plainText[id] = text;
      // what must come out, in document order: name, contact, then each heading and each entry title as the HTML has them
      const expected = await page.evaluate(() => [...document.querySelectorAll("h1, .contact, h2, .entry .t")].map((e) => e.innerText.replace(/\s+/g, " ").trim()).filter(Boolean));
      let at = -1;
      for (const want of expected) {
        const needle = norm(want).slice(0, 28);
        const i = text.indexOf(needle, at + 1);
        if (i < 0) { safe = false; why.push(`${label}: "${want.slice(0, 30)}" missing or out of order`); break; }
        at = i;
      }
      for (const must of [resume.personalInfo.email, resume.personalInfo.phone]) if (!text.includes(norm(must))) { safe = false; why.push(`${label}: ${must} missing`); }
    }
    results[id] = { safe, why };
    const old = svc.TEMPLATES.some((t) => t.id === id);
    // the five older templates: their recorded result (OLD_BADGES) must still be what the PDF shows; Minimal (rezi)
    // is safe since its headings went from 0.08em to 0.05em (owner OK, P3c); a change either way is noticed
    if (old) ok((OLD_BADGES[id] === "safe") === safe, `${id} (older): ${safe ? "ATS-safe" : "not ATS-safe"}, as recorded`, why.join(" | "));
    else ok(safe, `${id}: ATS-safe (name, contact, every heading and entry in reading order, both resumes)`, why.join(" | "));
  }
  // r7 heading icons (studio switch, off by default): vector drawings only, so the text an ATS reads and the page count
  // are exactly the same as without them, for every template
  const iconDiff = [];
  for (const id of ids) {
    const html = svc.renderResumeHTML(FRESHER_SAMPLE, id, { headingIcons: true });
    if (!/<h2><svg class="hi"/.test(html)) { iconDiff.push(`${id}: no icons drawn`); continue; }
    await page.setContent(html, { waitUntil: "load" });
    const file = path.join(tmp, `${id}-icons.pdf`);
    await page.pdf({ path: file, format: "A4", printBackground: true, preferCSSPageSize: true });
    const pages = (fs.readFileSync(file).toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
    const text = norm(execFileSync(pdftotext, ["-enc", "UTF-8", file, "-"]).toString("utf8"));
    if (text !== plainText[id]) iconDiff.push(`${id}: text differs`);
    if (pages !== onePage[id]) iconDiff.push(`${id}: ${onePage[id]} → ${pages} pages`);
  }
  ok(iconDiff.length === 0, `heading icons on: every template (${ids.length}) draws them, with the same PDF text and page count as without`, iconDiff.join(", "));
  await browser.close();
  // the 10 new templates (owner: each must pass it); the five older ones are reported, not required (today several
  // need two pages for this sample)
  const libIds = LIBRARY.map((t) => t.id);
  const notOne = libIds.filter((id) => onePage[id] !== 1).map((id) => `${id}: ${onePage[id]} pages`);
  ok(libIds.length === 10 && notOne.length === 0, `one-page test: each of the 10 new templates prints the fresher sample on exactly one A4 page`, notOne.join(", "));
  console.log(`   (older templates, for information: ${svc.TEMPLATES.map((t) => `${t.id} ${onePage[t.id]}`).join(", ")} pages)`);
  fs.rmSync(tmp, { recursive: true, force: true });
  const wrong = LIBRARY.filter((t) => (t.ats === "safe") !== results[t.id].safe).map((t) => `${t.id}: says ${t.ats}, test ${results[t.id].safe ? "safe" : "not safe"}`);
  ok(LIBRARY.every((t) => t.ats === "safe" || t.ats === "design") && wrong.length === 0, "every library template's badge matches the test", wrong.join(", "));
  done();
})().catch((e) => { console.error(e); process.exit(1); });
