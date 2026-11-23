// P3c step 2: customisation and fonts (flag resumeTemplatesV2 in the screens; the renderer itself has no flag)
//   customise(): none of the studio's keys → the theme unchanged (the five render as before: resume-templates.test);
//     palette, font pair, size, density, margins, heading case / style, hidden sections, order, section names, photo
//     (only an https photo, only when on), date format, page size, link style; library templates read the model's
//     default colours as "not chosen"; a colour the student really picked stays
//   palettes: accent, heading and text all ≥ 4.5:1 on white
//   fonts: every pair's files exist with an OFL licence for each family; ~1 MB in all; only the look's fonts are
//     embedded; Noto Naskh Arabic only for an Urdu-script name; the five older templates embed nothing (identical HTML)
//   in a real browser: each pair's fonts load from the embedded data
//   node tests/app/resume-customise.test.js
const fs = require("fs");
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();

(async () => {
  const load = H.loader({});
  const svc = load(path.join(H.SRC, "services/templateService.js"));
  const ST = load(path.join(H.SRC, "services/templates/styles.js"));
  const F = load(path.join(H.SRC, "services/templates/fonts.js"));
  const P = load(path.join(H.SRC, "services/templates/print.js"));
  const { FRESHER_SAMPLE } = require("../templates/sample");
  const base = svc.templateOf("modern_ats");

  console.log("── customise()");
  ok(svc.customise(base.look, { font: "Inter", accentColor: "#123456" }).look === base.look, "no studio keys: the theme object itself comes back (nothing changes)");
  const all = svc.customise(base.look, { palette: "teal", fontPair: "lora_source", size: "L", density: "compact", margins: "narrow", headingCase: "title", headingStyle: "bar", hiddenSections: ["languages"], sectionOrder: ["projects"], headings: { activities: "Extracurriculars" }, dateFormat: "mm/yyyy", pageSize: "Letter", linkStyle: "short" });
  const L = all.look;
  ok(L.accent === "#0F766E" && /'Lora'/.test(L.head) && /'Source Sans 3'/.test(L.body) && L.size === base.look.size + 0.5 && L.gap < base.look.gap && L.margin === "10mm 11mm" && L.h2case === "title" && L.h2x === "bar-left", "palette, fonts, size, density, margins, heading case and style");
  ok(L.hidden.join() === "languages" && L.sectionOrder.join() === "projects" && L.headings.activities === "Extracurriculars" && L.dateFormat === "mm/yyyy" && L.pageSize === "Letter" && L.linkStyle === "short", "hidden, order, names, dates, page, links");
  ok(!("accentColor" in all.styles), "a palette replaces the stored colours");
  const html = svc.renderResumeHTML({ ...FRESHER_SAMPLE, customStyles: undefined }, "modern_ats", { palette: "teal", hiddenSections: ["languages"], sectionOrder: ["projects"], headings: { activities: "Extracurriculars" }, dateFormat: "mm/yyyy", pageSize: "Letter", linkStyle: "short" });
  ok(!/<h2>Languages<\/h2>/.test(html) && /<h2>Extracurriculars<\/h2>/.test(html) && html.indexOf("<h2>Projects</h2>") < html.indexOf("<h2>Education</h2>"), "rendered: a hidden section is gone, the order and the name apply");
  ok(/09\/2022 – 06\/2026/.test(html) && />LinkedIn<\/a>/.test(html) && />GitHub<\/a>/.test(html) && /@page \{ size: Letter; \}/.test(html) && /#0F766E/.test(html), "rendered: 09/2022 dates, short link labels, US Letter, the palette colour");
  const photoOn = svc.renderResumeHTML({ ...FRESHER_SAMPLE, personalInfo: { ...FRESHER_SAMPLE.personalInfo, photoUrl: "https://res.cloudinary.com/x/me.jpg" } }, "modern_ats", { photo: { on: true, shape: "rounded" } });
  ok(/<img class="photo" src="https:\/\/res\.cloudinary\.com\/x\/me\.jpg" alt="">/.test(photoOn) && /border-radius: 10px/.test(photoOn), "photo on: in the header, the chosen shape");
  ok(!/<img/.test(svc.renderResumeHTML({ ...FRESHER_SAMPLE, personalInfo: { ...FRESHER_SAMPLE.personalInfo, photoUrl: "javascript:alert(1)" } }, "modern_ats", { photo: { on: true } })) && !/<img/.test(svc.renderResumeHTML({ ...FRESHER_SAMPLE, personalInfo: { ...FRESHER_SAMPLE.personalInfo, photoUrl: "https://x/y.jpg" } }, "modern_ats", { photo: { on: false } })), "…only an https photo, only when on");
  const campusDefault = svc.renderResumeHTML(FRESHER_SAMPLE, "campus", { accentColor: "#1E3A8A", headingColor: "#0F172A", textColor: "#334155" });
  ok(/#0F766E/.test(campusDefault) && !/background: #1E3A8A/.test(campusDefault), "a library template ignores the model's default colours (its own teal shows)");
  ok(/background: #BE185D/.test(svc.renderResumeHTML(FRESHER_SAMPLE, "campus", { accentColor: "#BE185D" })), "…but keeps a colour the student picked");

  console.log("── palettes");
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (hex) => 1.05 / (lum(hex) + 0.05);
  const weak = ST.PALETTES.flatMap((p) => ["accent", "heading", "text"].filter((k) => ratio(p[k]) < 4.5).map((k) => `${p.id}.${k} ${ratio(p[k]).toFixed(2)}`));
  ok(ST.PALETTES.length === 12 && weak.length === 0, "12 palettes, every colour ≥ 4.5:1 on white", weak.join(", "));
  ok(ST.FONT_PAIRS.length === 8, "8 font pairs");

  console.log("── fonts");
  const dir = path.join(H.APP, "app/assets/resume-fonts");
  const ttfs = fs.readdirSync(dir).filter((f) => f.endsWith(".ttf"));
  const src = H.read("app/src/services/templates/fonts.js");
  const refs = [...src.matchAll(/require\('([^']+\.ttf)'\)/g)].map((m) => m[1]);
  const missing = refs.filter((r) => !fs.existsSync(r.startsWith("@") ? path.join(H.APP, "node_modules", r) : path.resolve(path.join(H.SRC, "services/templates"), r)));
  ok(refs.length >= 26 && missing.length === 0, `every font file the registry needs exists (${refs.length})`, missing.join(", "));
  const families = ["inter", "lora", "sourcesans3", "merriweather", "lato", "dmserifdisplay", "poppins", "opensans", "ibmplexserif", "ibmplexsans", "bitter", "roboto", "notosans", "notonaskharabic"];
  ok(families.every((f) => /SIL OPEN FONT LICENSE/i.test(fs.readFileSync(path.join(dir, `OFL-${f}.txt`), "utf8"))), "an OFL licence for every downloaded family");
  const kb = Math.round(ttfs.reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0) / 1024);
  ok(kb < 1200, `the bundled fonts: ${kb} KB in ${ttfs.length} files (Latin only; Arabic only for Noto Naskh)`);
  const pairLook = svc.customise(base.look, { fontPair: "plex" }).look;
  ok(F.familiesFor(pairLook, FRESHER_SAMPLE).join() === "IBM Plex Serif,IBM Plex Sans", "only the pair's two families are embedded");
  const urdu = { ...FRESHER_SAMPLE, personalInfo: { ...FRESHER_SAMPLE.personalInfo, firstName: "سارہ" } };
  ok(F.familiesFor(pairLook, urdu).includes("Noto Naskh Arabic") && !F.familiesFor(pairLook, FRESHER_SAMPLE).includes("Noto Naskh Arabic"), "Noto Naskh Arabic only for an Urdu-script name");
  const reads = [];
  const fakeRead = async (mod) => { reads.push(mod); return "AAAA"; };
  const css = await F.fontCssFor(pairLook, FRESHER_SAMPLE, fakeRead);
  ok((css.match(/@font-face/g) || []).length === 3 && /font-family: 'IBM Plex Serif'; font-style: normal; font-weight: 400 700;/.test(css) && /'IBM Plex Sans'; font-style: normal; font-weight: 400;/.test(css), "@font-face per file; a single-weight heading face covers 400–700 (no fake bold)");
  for (const id of ["modern_ats", "stanford", "jakes", "rezi", "faang"]) {
    const plain = svc.renderResumeHTML(urdu, id, {});
    const viaPrint = await P.resumeHtmlWithFonts(urdu, id, {}, { read: fakeRead });
    if (plain !== viaPrint) { ok(false, `${id}: the print path changed the HTML`); break; }
  }
  ok(true, "the five older templates: the print path's HTML is exactly renderResumeHTML's (nothing embedded, even for an Urdu name)");
  P._clearFontCache();
  const lib = await P.resumeHtmlWithFonts(FRESHER_SAMPLE, "campus", {}, { read: fakeRead });
  ok(/@font-face \{ font-family: 'Outfit'/.test(lib) && /@font-face \{ font-family: 'DM Sans'/.test(lib), "a library template embeds its own fonts (Campus: Outfit + DM Sans)");

  console.log("── in a browser");
  const { executable, launch } = require("../templates/browser");
  if (!executable()) console.log("   skipped: no Chrome / Edge on this machine");
  else {
    const browser = await launch();
    const page = await browser.newPage();
    const realRead = async (mod) => {
      const p = String(mod.uri || mod);
      const file = p.startsWith("@") ? path.join(H.APP, "node_modules", p) : path.resolve(path.join(H.SRC, "services/templates"), p);
      return fs.readFileSync(file).toString("base64");
    };
    for (const pair of ST.FONT_PAIRS) {
      P._clearFontCache();
      const look = svc.customise(base.look, { fontPair: pair.id }).look;
      const htmlP = await P.resumeHtmlWithFonts(FRESHER_SAMPLE, "modern_ats", { fontPair: pair.id }, { read: realRead });
      await page.setContent(htmlP, { waitUntil: "load" });
      const loaded = await page.evaluate(async (fams) => { await document.fonts.ready; return fams.map((f) => [f, document.fonts.check(`700 16px '${f}'`) && [...document.fonts].some((x) => x.family.replace(/["']/g, "") === f && x.status === "loaded")]); }, F.familiesFor(look, FRESHER_SAMPLE));
      ok(loaded.every(([, l]) => l), `${pair.name}: the embedded fonts load`, JSON.stringify(loaded));
    }
    await browser.close();
  }
  done();
})().catch((e) => { console.error(e); process.exit(1); });
