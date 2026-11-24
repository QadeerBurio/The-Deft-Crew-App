// P5a (Q-3g): release builds print nothing from console.log / info / debug (App.js), and console.warn / error,
// which reach the phone's system log, print a scrubbed copy of their arguments (lib/safeConsole.js): an axios
// error becomes "name: message · status · METHOD /path" (never the request body, Authorization header or query);
// secret-looking keys are hidden; Bearer / Expo push / JWT values in text are hidden. Real module, real axios error.
//   node tests/app/safe-console.test.js
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 400) : ""}`); };

const file = path.join(APP, "app/src/lib/safeConsole.js");
const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
const m = new Module(file); m.filename = file; m.require = (id) => reqApp(id); m._compile(code, file);
const { safeArg, scrubText, installSafeConsole } = m.exports;

(async () => {
  // a real axios error from change-password (request body has the passwords, headers the token)
  const axios = reqApp("axios");
  const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjY1YWJjZGVmIn0.c2lnbmF0dXJlc2lnbmF0dXJl";
  let axErr;
  try {
    await axios.post("https://api.example.test/api/users/change-password?token=abc", { currentPassword: "OldSecret#1", newPassword: "NewSecret#2" }, {
      headers: { Authorization: `Bearer ${JWT}` },
      adapter: async (config) => { const e = new axios.AxiosError("Request failed with status code 400", "ERR_BAD_REQUEST", config, {}, { status: 400, data: { message: "wrong password" }, config, headers: {} }); throw e; },
    });
  } catch (e) { axErr = e; }
  const s = safeArg(axErr);
  ok(typeof s === "string" && /Request failed with status code 400/.test(s) && /status 400/.test(s) && /POST https:\/\/api\.example\.test\/api\/users\/change-password/.test(s), "an axios error becomes one line: message · status · METHOD path", s);
  ok(!/OldSecret|NewSecret|eyJ|Bearer|token=abc/.test(JSON.stringify(s)), "…without the passwords, the token or the query", s);
  ok(/^TypeError: boom$/.test(safeArg(new TypeError("boom"))), "a plain Error: name and message");
  ok(safeArg(new Error(`auth failed for Bearer ${JWT}`)) === "Error: auth failed for Bearer [hidden]", "a token inside an error message is hidden");

  const obj = safeArg({ user: { name: "Ayesha", password: "x", pushToken: "ExponentPushToken[abc]" }, token: JWT, Authorization: "Bearer z", count: 3, ok: true, nested: { a: { b: { c: { d: 1 } } } } });
  ok(obj.user.name === "Ayesha" && obj.user.password === "[hidden]" && obj.user.pushToken === "[hidden]" && obj.token === "[hidden]" && obj.Authorization === "[hidden]", "secret-looking keys hidden at any depth, other fields kept", JSON.stringify(obj));
  ok(obj.count === 3 && obj.ok === true && obj.nested.a.b === "[object]", "numbers / booleans kept; deep objects cut at 3 levels", JSON.stringify(obj));
  ok(scrubText(`push ExponentPushToken[xyz] and ${JWT}`) === "push ExponentPushToken[hidden] and [jwt hidden]", "push tokens and JWTs in text hidden");
  const loop = { a: 1 }; loop.self = loop;
  ok(safeArg(loop).self === "[circular]", "circular objects don't crash");
  ok(safeArg("plain message") === "plain message" && safeArg(null) === null && safeArg(undefined) === undefined, "ordinary values unchanged");

  // install: warn / error still print (scrubbed), once even if installed twice; log untouched by this module
  const printed = [];
  const fake = { warn: (...a) => printed.push(["warn", ...a]), error: (...a) => printed.push(["error", ...a]), log: () => {} };
  const origLog = fake.log;
  installSafeConsole(fake); installSafeConsole(fake);
  fake.error("Change password error:", axErr);
  fake.warn("[push] saved", { pushToken: "ExponentPushToken[q]" });
  ok(printed.length === 2 && printed[0][0] === "error" && printed[0][1] === "Change password error:" && /status 400/.test(printed[0][2]) && !/OldSecret/.test(JSON.stringify(printed)), "console.error still prints, scrubbed", JSON.stringify(printed));
  ok(printed[1][2].pushToken === "[hidden]", "console.warn still prints, scrubbed");
  ok(fake.warn.__tdcSafe && fake.log === origLog, "installed once; console.log untouched by it");

  // App.js: release silences log / info / debug and installs the scrubber; dev keeps everything
  const appJs = fs.readFileSync(path.join(APP, "App.js"), "utf8");
  ok(/if \(!__DEV__\) \{ console\.log = \(\) => \{\}; console\.info = \(\) => \{\}; console\.debug = \(\) => \{\}; \}/.test(appJs), "App.js: release builds silence console.log / info / debug");
  ok(/if \(!__DEV__\) installSafeConsole\(console\);/.test(appJs) && /import \{ installSafeConsole \} from "\.\/app\/src\/lib\/safeConsole";/.test(appJs), "App.js: release builds install the scrubber for warn / error");
  ok(!/console\.(warn|error)\s*=\s*\(\)\s*=>\s*\{\}/.test(appJs), "warn / error are never silenced");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("FAIL  (crash) " + e.stack); process.exit(1); });
