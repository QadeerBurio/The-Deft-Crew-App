// tests/run-all.js
// Runs every suite in its own process and prints one line each.
//   node tests/run-all.js            all groups
//   node tests/run-all.js app        one group (server | app | admin)
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const groups = process.argv[2] ? [process.argv[2]] : ["server", "app", "admin"];
const nodeMajor = Number(process.versions.node.split(".")[0]);
let failedSuites = 0;

for (const g of groups) {
  const dir = path.join(__dirname, g);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".test.js")).sort()) {
    const args = [];
    if (g === "admin" && nodeMajor < 22) args.push("--experimental-websocket"); // CDP over WebSocket
    args.push(path.join(dir, f));
    const r = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 10 * 60 * 1000, maxBuffer: 64 << 20 });
    const outText = `${r.stdout || ""}\n${r.stderr || ""}`;
    const summary =
      (outText.match(/^SKIP .*$/m) || [])[0] ||
      [...outText.matchAll(/^.*(\d+ passed, \d+ failed|all checks passed|first push reached: .*)$/gm)].map((m) => m[0].trim()).pop() ||
      "(no summary)";
    const ok = r.status === 0;
    if (!ok) failedSuites++;
    console.log(`${ok ? "ok  " : "FAIL"}  ${g}/${f.padEnd(30)} ${summary}`);
    if (!ok) outText.split("\n").filter((l) => /^FAIL|Error|CRASH/.test(l)).slice(0, 5).forEach((l) => console.log(`        ${l}`));
  }
}
console.log(failedSuites ? `\n${failedSuites} suite(s) failed` : "\nall suites passed");
process.exit(failedSuites ? 1 : 0);
