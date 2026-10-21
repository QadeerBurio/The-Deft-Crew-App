// App: savePushTokenToServer sends the build's EAS projectId with the token (real file).
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + x : ""}`); };
const anyThing = new Proxy(function () {}, { get: (t, k) => (k === "__esModule" ? false : k === "then" ? undefined : anyThing), apply: () => anyThing });
const anyModule = new Proxy({}, { get: (t, k) => (k === "__esModule" ? true : k === "then" ? undefined : anyThing) });

function load(constants) {
  const file = path.join(APP, "app/src/utils/pushNotifications.js");
  const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
  const m = new Module(file); m.filename = file;
  m.require = (id) => (id === "expo-constants" ? { __esModule: true, default: constants } : id === "react-native" ? { Platform: { OS: "android" } } : anyModule);
  m._compile(code, file);
  return m.exports;
}
(async () => {
  const appJson = require(path.join(APP, "app.json")).expo;
  const pid = appJson.extra.eas.projectId;
  const bodies = [];
  const api = { put: async (url, body) => { bodies.push({ url, body }); return { status: 200 }; } };
  let P = load({ expoConfig: { extra: { eas: { projectId: pid } } } });
  let r = await P.savePushTokenToServer(api, "ExponentPushToken[x]");
  ok(r.ok && bodies[0].url === "/notification/save-token" && bodies[0].body.projectId === pid && bodies[0].body.token === "ExponentPushToken[x]" && bodies[0].body.channels === "snd_v2", `save-token body carries this build's projectId (${pid.slice(0, 8)}, from app.json)`, JSON.stringify(bodies[0]));
  P = load({ easConfig: { projectId: "112506b0-7553-4a1b-afeb-6a37019cc15f" } });
  await P.savePushTokenToServer(api, "ExponentPushToken[y]");
  ok(bodies[1].body.projectId === "112506b0-7553-4a1b-afeb-6a37019cc15f", "falls back to easConfig.projectId");
  P = load({});
  await P.savePushTokenToServer(api, "ExponentPushToken[z]");
  ok(!("projectId" in JSON.parse(JSON.stringify(bodies[2].body))), "no project id known: the field is left out (server learns it)");
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
