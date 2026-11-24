// Q-a (plan Q-7): the Maestro flows in e2e/maestro stay in step with the app. Every flow names the app, has a name
// and tags (except subflows), uses only the documented variables, and every plain label it taps / waits for /
// asserts exists in the app's code (so renaming a button fails this run, not only the emulator run). Regex labels
// ("(?i)…") and variables are skipped; they are checked on the emulator.
//   node tests/app/maestro-flows.test.js
const fs = require("fs");
const path = require("path");
const APP = require("../paths").APP;
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 400) : ""}`); };

const DIR = path.join(APP, "e2e/maestro");
const VARS = new Set(["TDC_EMAIL", "TDC_PASSWORD", "TDC_INVITE_CODE", "TDC_AMBASSADOR_CODE", "TDC_BRAND"]);
const flows = fs.readdirSync(DIR).filter((f) => f.endsWith(".yaml")).sort();
const subflows = fs.readdirSync(path.join(DIR, "subflows")).filter((f) => f.endsWith(".yaml")).map((f) => `subflows/${f}`);
const perf = fs.readdirSync(path.join(DIR, "perf")).filter((f) => f.endsWith(".yaml")).map((f) => `perf/${f}`); // PERF-BASELINE.md helpers
ok(flows.length === 8 && flows.every((f, i) => f.startsWith(String(i + 1).padStart(2, "0") + "-")), "8 flows, numbered 01-08 (plan Q-7)", flows.join(", "));

// the app's own text: every .js under app/src and App.js
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".js") ? [path.join(d, e.name)] : []));
const appText = walk(path.join(APP, "app/src")).concat(path.join(APP, "App.js")).map((f) => fs.readFileSync(f, "utf8")).join("\n");

const readme = fs.readFileSync(path.join(DIR, "README.md"), "utf8");
for (const f of [...flows, ...subflows, ...perf]) {
  const src = fs.readFileSync(path.join(DIR, f), "utf8").replace(/\r\n/g, "\n");
  ok(/^appId: com\.aqkhan110\.tdc$/m.test(src) && /\n---\n/.test(src), `${f}: the tdc app (com.aqkhan110.tdc)`);
  if (!f.includes("/")) ok(/^name: .+$/m.test(src) && /^tags:\n(  - [a-z-]+\n)+/m.test(src), `${f}: has a name and tags`);
  const vars = [...src.matchAll(/\$\{(\w+)\}/g)].map((m) => m[1]);
  const unknown = vars.filter((v) => !VARS.has(v));
  ok(unknown.length === 0 && vars.every((v) => readme.includes("`" + v + "`")), `${f}: only documented variables`, unknown.join());
  const used = [...new Set([...src.matchAll(/runFlow: (subflows\/[\w-]+\.yaml)/g)].map((m) => m[1]))];
  ok(used.every((u) => subflows.includes(u)), `${f}: its subflows exist (${used.join(", ") || "none"})`, used.filter((u) => !subflows.includes(u)).join());
  // plain labels: tapOn / longPressOn / assertVisible / assertNotVisible / visible / element / text with a literal
  const labels = [...src.matchAll(/^\s*-?\s*(?:tapOn|longPressOn|assertVisible|assertNotVisible|visible|element|text):\s*"([^"]+)"/gm)].map((m) => m[1]);
  const typed = new Set([...src.matchAll(/inputText:\s*"([^"]+)"/g)].map((m) => m[1])); // text the flow itself enters
  const plain = labels.filter((l) => !/^\(\?i\)|[.*|\\^$]/.test(l) && !/\$\{/.test(l) && !typed.has(l));
  const missing = plain.filter((l) => !appText.includes(l));
  ok(missing.length === 0, `${f}: its ${plain.length} plain labels exist in the app`, missing.join(" | "));
}
ok(!fs.readdirSync(DIR).some((f) => /^\.env/.test(f)), "no .env file in e2e/maestro (accounts are passed with -e)");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
