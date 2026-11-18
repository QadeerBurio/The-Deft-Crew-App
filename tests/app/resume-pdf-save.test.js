// Resume PDF, templates and saving (fix/resume-builder):
//   - utils/resumeRules.js is the server's file byte for byte (same strength / name / required fields everywhere)
//   - the five templates: single column, real text, no layout tables, A4, entries never split across pages
//     (checked in a real Chrome print when Chrome is installed), preview HTML === PDF HTML
//   - utils/resumeFiles: Android saves "<Full name> Resume.pdf" into the folder picked once (Downloads first),
//     iPhone opens the Files save dialog (or the share sheet on a build without it), share is separate,
//     a refused permission or a cancel never throws
//   node tests/app/resume-pdf-save.test.js
const path = require("path");
const fs = require("fs");
const os = require("os");
const Module = require("module");
const { spawnSync } = require("child_process");
const H = require("./harness");
const { SERVER } = require("../paths");
const { ok, done } = H.counter();
global.__DEV__ = false;

const norm = (s) => s.replace(/\r\n/g, "\n");

(async () => {
  console.log("── one set of rules for the server and the app");
  const appRules = H.read("app/src/utils/resumeRules.js");
  const serverRules = fs.readFileSync(path.join(SERVER, "utils", "resumeRules.js"), "utf8");
  ok(norm(appRules) === norm(serverRules), "app/src/utils/resumeRules.js is the server's utils/resumeRules.js (same strength % everywhere)");
  const rules = require(path.join(H.SRC, "utils/resumeRules.js"));
  ok(rules.resumeName({ personalInfo: { firstName: "Ayesha", lastName: "Khan", title: "HR Intern" } }) === "Ayesha Khan – HR Intern", "default name '<Full name> – <title>'");
  ok(rules.resumeName({ name: "Untitled", nameCustom: true, personalInfo: { firstName: "Ayesha" } }) === "Ayesha – Resume" && rules.resumeName({ name: "cv_final.docx", nameCustom: true }) === "cv final", "never 'Untitled', never a file extension");

  // ---------- templates ----------
  console.log("── templates");
  const { React } = H.makeReact();
  const { rn } = H.makeRN();
  const load = H.loader({ react: React, "react-native": rn });
  const tpl = load(path.join(H.SRC, "services/templateService.js"));
  const long = {
    template: "jakes",
    personalInfo: { firstName: "Ayesha", lastName: "Khan", title: "HR Intern", email: "ayesha@example.com", phone: "+92 300 1234567", city: "Karachi", linkedin: "linkedin.com/in/ayesha" },
    professionalSummary: { summary: "Business student who enjoys hiring and onboarding. <script>alert(1)</script>" },
    workExperience: Array.from({ length: 14 }, (_, i) => ({
      company: `Company${String(i).padStart(2, "0")} Pvt Ltd`, position: `ROLE${String(i).padStart(2, "0")} Intern`, startDate: "2023-06-01T00:00:00.000Z", endDate: "2023-08-01T00:00:00.000Z",
      description: "", achievements: [`Screened candidates and scheduled interviews for team ${i}`, `Kept records of donation drives and payroll files for unit ${i}`, `ENDMARK${String(i).padStart(2, "0")} closing line`],
    })),
    education: [{ institution: "Institute of Business Administration", degree: "BBA", fieldOfStudy: "HRM", grade: "3.6/4.0", startDate: "2021", endDate: "2025" }],
    skills: [{ name: "Recruitment" }, { name: "MS Excel" }, { name: "اردو ٹائپنگ" }],
    languages: [{ name: "Urdu", proficiency: "Native" }],
    achievements: ["Dean's List 2023"],
    otherNotes: "Cricket and debate club",
  };
  ok(tpl.TEMPLATES.length === 5 && tpl.TEMPLATES.map((t) => t.id).join() === "modern_ats,stanford,jakes,rezi,faang", "five templates", tpl.TEMPLATES.map((t) => t.id).join());
  ok(["modern", "classic", "creative", "canva", "flowcv", "reactive", "minimal", "professional", undefined, "nope"].every((x) => tpl.TEMPLATES.some((t) => t.id === tpl.canonicalTemplate(x))), "every old template id maps to one of the five (old resumes still render)");
  for (const t of tpl.TEMPLATES) {
    const html = tpl.renderResumeHTML(long, t.id, {});
    ok(html === tpl.renderResumeHTML(long, t.id, {}, true) && html === tpl.renderResumeHTML(long, t.id, {}, false), `${t.name}: the preview and the PDF get the same HTML`);
    ok(/@page \{ size: A4;/.test(html) && !/<table|<td|column-count|columns:|grid-template|float:|position: ?absolute|<img/i.test(html), `${t.name}: A4, no tables / columns / floats / images for layout`);
    ok(/\.entry \{[^}]*break-inside: avoid; page-break-inside: avoid;/.test(html) && /h2 \{[^}]*break-after: avoid/.test(html), `${t.name}: an entry is never split, a heading never ends a page`);
    ok((html.match(/class="entry"/g) || []).length === 14 + 1, `${t.name}: every experience / education item is one entry block`);
    ok(!/<script>alert/.test(html) && /&lt;script&gt;/.test(html), `${t.name}: text is escaped (a typed '<script>' is just text)`);
    ok(/dir="auto"[^>]*>[^<]*اردو/.test(html) || /اردو ٹائپنگ/.test(html), `${t.name}: Urdu text kept, with dir=auto`);
    ok(/ENDMARK13/.test(html) && /Cricket and debate club/.test(html) && /3\.6\/4\.0/.test(html), `${t.name}: bullets, other notes and the grade as written are printed`);
  }
  ok(tpl.formatDate("2023-06-01T00:00:00.000Z") === "Jun 2023" && tpl.formatDate("Jun 2023") === "Jun 2023" && tpl.formatDate("2025") === "2025", "dates: ISO -> 'Jun 2023'; typed dates stay as typed (no 'Invalid Date')");
  const tailoredOrder = tpl.renderResumeHTML({ ...long, projects: [{ name: "ShopEase", description: "web app" }], sectionOrder: ["experience", "projects", "skills", "education"] }, "modern_ats", {});
  const at = (h) => tailoredOrder.indexOf(`<h2>${h}</h2>`);
  ok(at("Experience") < at("Projects") && at("Projects") < at("Skills") && at("Skills") < at("Education"), "a tailored version's section order is followed (Resume Studio: projects above education)", [at("Experience"), at("Projects"), at("Skills"), at("Education")].join(","));

  // a real print: A4 pages, no entry split across two pages (Chrome's print engine = Android WebView's)
  const chrome = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => p && fs.existsSync(p));
  if (!chrome) {
    console.log("SKIP-PART real print: Chrome not installed (the CSS checks above still ran)");
  } else {
    const reqS = Module.createRequire(path.join(SERVER, "server.js"));
    const pdfParse = reqS("pdf-parse/lib/pdf-parse.js");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tdc-resume-print-"));
    try {
      for (const t of tpl.TEMPLATES) {
        const htmlFile = path.join(dir, `${t.id}.html`);
        const pdfFile = path.join(dir, `${t.id}.pdf`);
        fs.writeFileSync(htmlFile, tpl.renderResumeHTML(long, t.id, {}));
        const r = spawnSync(chrome, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${path.join(dir, "profile")}`, "--no-pdf-header-footer", `--print-to-pdf=${pdfFile}`, `file:///${htmlFile.replace(/\\/g, "/")}`], { timeout: 90000, encoding: "utf8" });
        if (!fs.existsSync(pdfFile)) { ok(false, `${t.name}: Chrome printed the PDF`, (r.stderr || "").slice(0, 300)); continue; }
        const buf = fs.readFileSync(pdfFile);
        const pages = [];
        const bytes = new Uint8Array(buf.length); bytes.set(buf);
        await pdfParse(bytes, { pagerender: (p) => p.getTextContent().then((c) => { const s = c.items.map((i) => i.str).join(""); pages.push(s.replace(/\s+/g, "")); return s; }) });
        const boxes = buf.toString("latin1").match(/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g) || [];
        ok(boxes.length > 0 && boxes.every((b) => /0 0 59[4-6](\.\d+)? 84[1-3](\.\d+)?/.test(b)), `${t.name}: every page is A4 (210 × 297 mm)`, boxes.slice(0, 2).join(" "));
        const split = [];
        for (let i = 0; i < 14; i++) {
          const id = String(i).padStart(2, "0");
          const first = pages.findIndex((s) => s.includes(`ROLE${id}`));
          const last = pages.findIndex((s) => s.includes(`ENDMARK${id}`));
          if (first < 0 || first !== last) split.push(`${id}: ${first}/${last}`);
        }
        ok(pages.length >= 2 && split.length === 0, `${t.name}: ${pages.length} pages, no experience split across two pages`, split.join(", "));
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }

  // ---------- saving and sharing ----------
  for (const OS of ["android", "ios"]) {
    console.log(`── save and share (${OS})`);
    const s = { prints: [], copies: [], asked: [], granted: true, dirOk: true, created: [], written: [], shares: 0, saveDocs: [], pickerCancel: false, picker: true, intents: [] };
    const store = new Map();
    const fsMock = {
      cacheDirectory: "file:///cache/",
      EncodingType: { Base64: "base64" },
      deleteAsync: async () => {}, copyAsync: async (a) => { s.copies.push(a); },
      readAsStringAsync: async () => "JVBERi0xLjQ=",
      writeAsStringAsync: async (uri, data, o) => { s.written.push({ uri, data, enc: o?.encoding }); },
      StorageAccessFramework: {
        getUriForDirectoryInRoot: (n) => `content://com.android.externalstorage.documents/tree/primary%3A${n}`,
        requestDirectoryPermissionsAsync: async (start) => { s.asked.push(start); return s.granted ? { granted: true, directoryUri: "content://com.android.externalstorage.documents/tree/primary%3ADownload" } : { granted: false }; },
        readDirectoryAsync: async () => { if (!s.dirOk) throw new Error("no permission"); return []; },
        createFileAsync: async (dir, name, mime) => { s.created.push({ dir, name, mime }); return `${dir}/document/${encodeURIComponent(name)}.pdf`; },
      },
    };
    const { React: R2 } = H.makeReact();
    const { rn: rn2 } = H.makeRN({ Platform: { OS, select: (o) => o[OS] ?? o.default }, TurboModuleRegistry: { get: (n) => (n === "RNDocumentPicker" && s.picker ? {} : null) } });
    const load2 = H.loader({
      react: R2, "react-native": rn2,
      "expo-print": { printToFileAsync: async (o) => { s.prints.push(o); return { uri: "file:///print/x.pdf", numberOfPages: 2 }; } },
      "expo-sharing": { isAvailableAsync: async () => true, shareAsync: async (uri, o) => { s.shares++; s.lastShare = { uri, o }; } },
      "expo-file-system/legacy": fsMock,
      "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } } },
      "@react-native-documents/picker": { saveDocuments: async (o) => { s.saveDocs.push(o); if (s.pickerCancel) throw Object.assign(new Error("user canceled the document picker"), { code: "OPERATION_CANCELED" }); return [{ uri: "file:///Files/Ayesha Khan Resume.pdf", name: o.fileName, error: null }]; } },
      "expo-intent-launcher": { startActivityAsync: async (a, o) => { s.intents.push({ a, o }); } },
    });
    const F = load2(path.join(H.SRC, "utils/resumeFiles.js"));
    const resume = { template: "stanford", personalInfo: { firstName: "Ayesha", lastName: "Khan", title: "HR Intern" }, education: [{ institution: "IBA" }] };
    const pdf = await F.makeResumePdf(resume);
    const tpl2 = load2(path.join(H.SRC, "services/templateService.js"));
    ok(s.prints[0]?.html === tpl2.renderResumeHTML(resume, "stanford", {}) && F.resumeHtml(resume) === s.prints[0]?.html, "the PDF is printed from the exact preview HTML (chosen template applied)");
    ok(s.prints[0]?.width === 595 && s.prints[0]?.height === 842, "A4 paper size passed to the printer");
    ok(OS === "ios" ? !!s.prints[0]?.margins : !s.prints[0]?.margins, OS === "ios" ? "iPhone: page margins passed (iOS ignores CSS @page margins)" : "Android: margins come from CSS @page");
    ok(pdf.name === "Ayesha Khan Resume.pdf" && pdf.uri === "file:///cache/Ayesha%20Khan%20Resume.pdf" && pdf.pages === 2, "file named '<Full name> Resume.pdf', page count kept", JSON.stringify(pdf));

    if (OS === "android") {
      const r1 = await F.saveResumePdf(pdf);
      ok(s.asked.length === 1 && /primary%3ADownload$/.test(s.asked[0]), "first save: the folder picker opens at Downloads", JSON.stringify(s.asked));
      ok(r1.status === "saved" && r1.message === "Saved to Downloads" && s.created[0]?.name === "Ayesha Khan Resume" && s.created[0]?.mime === "application/pdf", "saved as 'Ayesha Khan Resume' (.pdf) in Downloads", JSON.stringify({ r1, c: s.created }));
      ok(s.written[0]?.uri === r1.uri && s.written[0]?.enc === "base64" && s.written[0]?.data === "JVBERi0xLjQ=", "the PDF bytes are written to that file");
      const r2 = await F.saveResumePdf(pdf);
      ok(r2.status === "saved" && s.asked.length === 1, "next save: same folder, no question again");
      await F.openSavedPdf(r1.uri);
      ok(s.intents[0]?.a === "android.intent.action.VIEW" && s.intents[0]?.o?.data === r1.uri && s.intents[0]?.o?.type === "application/pdf" && s.intents[0]?.o?.flags === 1, "'open' views the saved file with read permission");
      s.dirOk = false; s.granted = false;
      let threw = false; let r3;
      try { r3 = await F.saveResumePdf(pdf); } catch { threw = true; }
      ok(!threw && r3.status === "denied" && /allow access/.test(r3.message) && s.asked.length === 2, "folder access taken away and refused: a clear message, no crash", JSON.stringify(r3));
      fsMock.StorageAccessFramework.requestDirectoryPermissionsAsync = async () => { throw new Error("activity not found"); };
      const r4 = await F.saveResumePdf(pdf);
      ok(r4.status === "denied" && /share/.test(r4.message), "the picker can't open at all: a message pointing to share, no crash");
      ok(s.shares === 0, "saving never opens the share sheet on Android");
    } else {
      const r1 = await F.saveResumePdf(pdf);
      ok(r1.status === "saved" && r1.message === "Saved to Files" && s.saveDocs[0]?.fileName === "Ayesha Khan Resume.pdf" && s.saveDocs[0]?.sourceUris?.[0] === pdf.uri && s.saveDocs[0]?.copy === true, "iPhone: the Files save dialog with 'Ayesha Khan Resume.pdf'", JSON.stringify(s.saveDocs));
      ok(s.shares === 0, "Save to Files is not the share sheet");
      s.pickerCancel = true;
      const r2 = await F.saveResumePdf(pdf);
      ok(r2.status === "cancelled", "closing the dialog: cancelled, nothing shown, no crash");
      s.picker = false; s.pickerCancel = false;
      const r3 = await F.saveResumePdf(pdf);
      ok(r3.status === "shared" && s.shares === 1 && /Save to Files/.test(r3.message), "a build without the dialog module: the share sheet (with 'Save to Files'), no crash");
    }
    const before = s.shares;
    const sh = await F.shareResumePdf(pdf);
    ok(sh.status === "shared" && s.shares === before + 1 && s.lastShare.uri === pdf.uri && s.lastShare.o.mimeType === "application/pdf", "Share is its own action: the share sheet with the PDF");
    ok(F.nativePdfView() === null, "no blob-util in this build: the preview falls back (no crash)");
  }

  console.log("── source");
  const files = H.read("app/src/utils/resumeFiles.js");
  ok(/TurboModuleRegistry\.get\('RNDocumentPicker'\)|has\('RNDocumentPicker'\)/.test(files) && /has\('ReactNativeBlobUtil'\)/.test(files) && !/^import .*@react-native-documents\/picker/m.test(files) && !/^import .*react-native-pdf/m.test(files), "native modules are only required when the build has them (an eas update on today's build can't crash)");
  const pkg = JSON.parse(H.read("package.json"));
  ok(pkg.dependencies["@react-native-documents/picker"] === "12.0.3" && pkg.dependencies["react-native-blob-util"] === "0.25.0" && !!pkg.dependencies["react-native-pdf"], "native deps pinned for the 1.2.1 build (picker 12.0.3, blob-util 0.25.0, react-native-pdf)");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
