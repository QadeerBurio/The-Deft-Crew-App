// P3c template studio, step 1 (upgrade/p3c-templates):
//   the engine: the five looks render byte for byte as before: 395 outputs frozen before the change (v1: 35, v2: 360:
//     every old id, three colour settings, the P3a sections on both tracks) compared by sha256
//   the library: 10 new templates (7 Fresher & Student, 3 ATS Pro), unique ids, each a single column of real text;
//     each renders the SAMPLE fresher resume with every section, in its own order, with its own headings
//   not selectable yet: the picker (TEMPLATES) still lists the five; canonicalTemplate unchanged
//   in a real browser (Chrome / Edge on the machine; skipped with a note when none): the sample fits one A4 page in
//     all 10, and no text sits side by side (one column: reading order = document order)
//   node tests/app/resume-templates.test.js
const path = require("path");
const crypto = require("crypto");
const H = require("./harness");
const { ok, done } = H.counter();

(async () => {
  const svc = H.loader({})(path.join(H.SRC, "services", "templateService.js"));
  const { LIBRARY, COLLECTIONS } = H.loader({})(path.join(H.SRC, "services", "templates", "library.js"));
  const { FRESHER_SAMPLE } = require("../templates/sample");
  const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

  console.log("── the five looks, byte for byte");
  const v1 = require("./fixtures-renderer-v1.json");
  const v2 = require("./fixtures-renderer-v2.json");
  const diff = [];
  for (const [k, h] of Object.entries(v1.hashes)) { const [n, t] = k.split(":"); if (sha(svc.renderResumeHTML(v1.resumes[n], t, { accentColor: "#123456" })) !== h) diff.push(k); }
  for (const [k, h] of Object.entries(v2.hashes)) {
    const [n, t, si] = k.split(":");
    const st = v2.styles[Number(si)];
    if (sha(svc.renderResumeHTML(v2.resumes[n], t === "undefined" ? undefined : t, st === null ? undefined : st)) !== h) diff.push(k);
  }
  const total = Object.keys(v1.hashes).length + Object.keys(v2.hashes).length;
  ok(total === 395 && diff.length === 0, `${total} frozen outputs of the five looks (every old id, colours, tracks, the new sections): identical`, diff.slice(0, 5).join(", "));
  ok(svc.TEMPLATES.map((t) => t.id).join() === "modern_ats,stanford,jakes,rezi,faang", "the picker still lists the five (the library comes with resumeTemplatesV2 in step 2)");
  ok(svc.canonicalTemplate("campus") === "modern_ats" && svc.canonicalTemplate("classic") === "stanford", "canonicalTemplate unchanged (older apps map unknown ids to Modern)");

  console.log("── the library");
  const ids = LIBRARY.map((t) => t.id);
  ok(LIBRARY.length === 10 && new Set(ids).size === 10 && !ids.some((id) => svc.TEMPLATES.some((t) => t.id === id)), "10 templates, unique ids, none clashing with the five");
  ok(LIBRARY.filter((t) => t.collection === "fresher").length === 7 && LIBRARY.filter((t) => t.collection === "ats").length === 3 && LIBRARY.every((t) => COLLECTIONS[t.collection] && t.name && t.description), "7 Fresher & Student + 3 ATS Pro, each named and described");
  const SECTIONS = ["Summary", "Education", "Skills", "Volunteering", "Certifications", "Languages"];
  for (const t of LIBRARY) {
    const html = svc.renderResumeHTML(FRESHER_SAMPLE, t.id);
    const heads = [...html.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    const order = (t.look.order || []).map((k) => ({ education: "Education", projects: (t.look.headings || {}).projects || "Projects", activities: "Leadership & Activities", volunteering: "Volunteering", skills: "Skills", awards: (t.look.headings || {}).awards || "Awards", certifications: "Certifications", languages: "Languages", experience: "Experience" }[k])).filter((h) => heads.includes(h));
    const inOrder = order.every((h, i) => i === 0 || heads.indexOf(order[i - 1]) < heads.indexOf(h));
    ok(html.includes(`data-template="${t.id}"`) && SECTIONS.every((s) => heads.includes(s)) && heads.length >= 9 && inOrder && !/<table|position:\s*absolute|float:/i.test(html), `${t.name}: every section of the sample, in its order, one column of real text`, heads.join(" / "));
  }
  ok(svc.renderResumeHTML(FRESHER_SAMPLE, "scholar").includes("<h2>Research &amp; Projects</h2>"), "a template can name its sections (Scholar: Research & Projects)");
  ok(svc.renderResumeHTML(FRESHER_SAMPLE, "campus").includes("Python · JavaScript"), "…and its skill separator");
  ok(/Sara Example/.test(svc.renderResumeHTML(FRESHER_SAMPLE, "campus")) && /example\.com/.test(JSON.stringify(FRESHER_SAMPLE)) && /Sample University/.test(JSON.stringify(FRESHER_SAMPLE)), "the preview resume is clearly sample data (Sara Example, example.com, Sample University)");

  console.log("── in a browser");
  const { executable, launch } = require("../templates/browser");
  if (!executable()) {
    console.log("   skipped: no Chrome / Edge on this machine (set PUPPETEER_EXECUTABLE_PATH to run it)");
  } else {
    const browser = await launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1200 });
    for (const t of LIBRARY) {
      await page.setContent(svc.renderResumeHTML(FRESHER_SAMPLE, t.id), { waitUntil: "load" });
      const m = await page.evaluate(() => {
        const pg = document.querySelector("main.page");
        // text blocks that share a line but sit in different columns (two columns would interleave when read)
        const blocks = [...pg.querySelectorAll("p, li, h1, h2, .t, .sub, .title, .contact")].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
        let sideBySide = 0;
        for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
          const a = blocks[i], b = blocks[j];
          const sameLine = a.top < b.bottom - 2 && b.top < a.bottom - 2;
          if (sameLine && (a.right <= b.left || b.right <= a.left) && Math.min(a.width, b.width) > 120) sideBySide++;
        }
        return { height: pg.scrollHeight, sideBySide };
      });
      ok(m.height <= 1125, `${t.name}: the sample fits one A4 page (${m.height}px of 1123)`);
      ok(m.sideBySide === 0, `${t.name}: no text side by side (ATS reading order = document order)`, String(m.sideBySide));
    }
    await browser.close();
  }
  done();
})().catch((e) => { console.error(e); process.exit(1); });
