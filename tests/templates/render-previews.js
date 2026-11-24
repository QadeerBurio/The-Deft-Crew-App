// tests/templates/render-previews.js — P3c step 1 (owner): PNG previews of the first 10 new templates (7 Fresher + 3
// ATS Pro), each filled with the same SAMPLE fresher resume (tests/templates/sample.js: a made-up person), and one
// contact sheet with all 10 side by side and their names. Written to tdc-upgrade-v2/template-previews/.
//   node tests/templates/render-previews.js
// The HTML is exactly what the app prints (templateService.renderResumeHTML), with DM Sans / Outfit embedded from
// the app's own font packages (the final embedded font pairs come in step 2).
const fs = require("fs");
const path = require("path");
const H = require("../app/harness");
const { launch, executable } = require("./browser");
const { FRESHER_SAMPLE } = require("./sample");

const APP = H.APP;
const OUT = path.join(APP, "tdc-upgrade-v2", "template-previews");
const svc = H.loader({})(path.join(H.SRC, "services", "templateService.js"));
const { LIBRARY, COLLECTIONS } = H.loader({})(path.join(H.SRC, "services", "templates", "library.js"));

function fontCss() {
  const face = (family, file, weight) => {
    const p = path.join(APP, "node_modules", "@expo-google-fonts", family === "DM Sans" ? "dm-sans" : "outfit", file);
    return `@font-face { font-family: '${family}'; font-weight: ${weight}; font-style: normal; src: url(data:font/ttf;base64,${fs.readFileSync(p).toString("base64")}) format('truetype'); }`;
  };
  return [
    face("DM Sans", "400Regular/DMSans_400Regular.ttf", 400), face("DM Sans", "600SemiBold/DMSans_600SemiBold.ttf", 600), face("DM Sans", "700Bold/DMSans_700Bold.ttf", 700),
    face("Outfit", "600SemiBold/Outfit_600SemiBold.ttf", 600), face("Outfit", "700Bold/Outfit_700Bold.ttf", 700),
  ].join("\n");
}

(async () => {
  if (!executable()) { console.log("no Chrome / Edge found: set PUPPETEER_EXECUTABLE_PATH"); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const css = fontCss();
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
  const made = [];
  for (const t of LIBRARY) {
    const html = svc.renderResumeHTML(FRESHER_SAMPLE, t.id, undefined, false, { fontCss: css });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$("main.page");
    const file = `${String(made.length + 1).padStart(2, "0")}-${t.id}.png`;
    await el.screenshot({ path: path.join(OUT, file) });
    const height = await page.evaluate(() => document.querySelector("main.page").scrollHeight);
    made.push({ ...t, file, onePage: height <= 1123 + 2, height });
    console.log(`${file}  ${t.name} (${COLLECTIONS[t.collection]})  ${height <= 1125 ? "fits one A4 page" : `taller than one page (${height}px > 1123px)`}`);
  }
  // the contact sheet: all 10 side by side (5 x 2), the name and collection under each
  const cell = (m) => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(OUT, m.file)).toString("base64")}"><figcaption><b>${m.name}</b><span>${COLLECTIONS[m.collection]}${m.onePage ? "" : " · longer than one page"}</span></figcaption></figure>`;
  const sheet = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}
    body { margin: 0; padding: 28px; background: #F5F2EA; font-family: 'DM Sans', Arial, sans-serif; }
    h1 { font-family: 'Outfit', sans-serif; font-size: 30px; margin: 0 0 4px; } p { margin: 0 0 22px; color: #6B675E; font-size: 15px; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 22px; }
    figure { margin: 0; } img { width: 100%; display: block; border-radius: 6px; box-shadow: 0 4px 18px rgba(0,0,0,0.18); background: #fff; }
    figcaption { margin-top: 8px; font-size: 16px; display: flex; flex-direction: column; } figcaption span { color: #6B675E; font-size: 13px; }
  </style></head><body><h1>tdc template studio: first 10 for approval</h1><p>every template is filled with the same SAMPLE resume (a made-up student, "Sara Example"). 7 Fresher &amp; Student + 3 ATS Pro.</p><div class="grid">${made.map(cell).join("")}</div></body></html>`;
  await page.setViewport({ width: 2200, height: 1400, deviceScaleFactor: 1 });
  await page.setContent(sheet, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, "00-contact-sheet.png"), fullPage: true });
  fs.writeFileSync(path.join(OUT, "README.md"), [
    "# Template previews (P3c step 1, for approval)",
    "",
    "Made by `node tests/templates/render-previews.js` from the app's own renderer (`templateService.renderResumeHTML`).",
    "Every preview uses the same **sample** resume (`tests/templates/sample.js`): a made-up student, not a real person.",
    "",
    "| # | Template | Collection | One A4 page |",
    "|---|---|---|---|",
    ...made.map((m, i) => `| ${i + 1} | ${m.name} (\`${m.id}\`): ${m.description} | ${COLLECTIONS[m.collection]} | ${m.onePage ? "yes" : `no (${m.height}px)`} |`),
    "",
    "`00-contact-sheet.png` shows all 10 side by side. Fonts: DM Sans / Outfit (already in the app) and Georgia for the",
    "serif ones; the final embedded font pairs come in step 2.",
    "",
  ].join("\n"));
  await browser.close();
  console.log(`\nwrote ${made.length} previews + 00-contact-sheet.png + README.md to ${path.relative(APP, OUT)}`);
})().catch((e) => { console.error(e); process.exit(1); });
