// The Meta build guard (chore/meta-build-guard):
//   app.config.js  a production build on EAS (EAS_BUILD=true, EAS_BUILD_PROFILE=production) without META_APP_ID /
//                  META_CLIENT_TOKEN stops with a clear error; with them it builds with Meta on; previews, local
//                  runs and `eas update` (no EAS_BUILD) are never stopped
//   metaBuildReport.js  once per build per install, POST /app/meta-build { platform, appVersion, build, enabled }
//                  (nothing else); again after a new build; a failed report is retried; Expo Go / dev: skipped
//   MetaConsent.js calls it at launch
//   node tests/app/meta-build-guard.test.js
const fs = require("fs");
const path = require("path");
const Module = require("module");
const APP = require("../paths").APP;
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 600) : ""}`); };

// ---------- app.config.js ----------
const cfgFile = path.join(APP, "app.config.js");
const withEnv = (env, fn) => {
  const keys = ["EAS_BUILD", "EAS_BUILD_PROFILE", "META_APP_ID", "META_CLIENT_TOKEN"];
  const old = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  Object.assign(process.env, env);
  try { return fn(); } finally { for (const k of keys) { if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]; } }
};
const resolve = () => { delete require.cache[cfgFile]; return require(cfgFile)({ config: { name: "tdc", plugins: [] } }); };
const IDS = { META_APP_ID: "123456789012345", META_CLIENT_TOKEN: "testtoken0123456789" };

let err = null;
withEnv({ EAS_BUILD: "true", EAS_BUILD_PROFILE: "production" }, () => { try { resolve(); } catch (e) { err = e; } });
ok(!!err && /production build needs META_APP_ID and META_CLIENT_TOKEN/.test(err.message), "production on EAS without the Meta IDs: the build stops with a clear error", err && err.message);
let out = withEnv({ EAS_BUILD: "true", EAS_BUILD_PROFILE: "production", ...IDS }, resolve);
ok(out.extra.meta.enabled === true && out.plugins.some((p) => Array.isArray(p) && p[0] === "react-native-fbsdk-next"), "production on EAS with the IDs: Meta on, the SDK plugin in");
out = withEnv({ EAS_BUILD: "true", EAS_BUILD_PROFILE: "preview" }, resolve);
ok(out.extra.meta.enabled === false, "a preview build without the IDs isn't stopped (Meta off)");
out = withEnv({ EAS_BUILD_PROFILE: "production" }, resolve);
ok(out.extra.meta.enabled === false, "outside the EAS worker (local runs, eas update) it's never stopped");
err = null;
withEnv({ EAS_BUILD: "true", EAS_BUILD_PROFILE: "production", META_APP_ID: "123456789012345", META_CLIENT_TOKEN: "short" }, () => { try { resolve(); } catch (e) { err = e; } });
ok(!!err, "a production build with a token that isn't one is stopped too");

// ---------- metaBuildReport.js ----------
const file = path.join(APP, "app/src/analytics/metaBuildReport.js");
const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
const m = new Module(file); m.filename = file;
m.require = (id) => ({
  "@react-native-async-storage/async-storage": { __esModule: true, default: {} },
  axios: { __esModule: true, default: {} },
  "expo-constants": { __esModule: true, default: {} },
  "expo-application": {},
  "react-native": { Platform: { OS: "android" } },
  "../api/api": { BASE_URL: "https://example.test/api" },
}[id] || (() => { throw new Error("unexpected require " + id); })());
m._compile(code, file);
const { reportMetaBuild, _test } = m.exports;
const store = new Map();
const posts = [];
let down = false;
let env = { platform: "android", version: "1.2.1", build: "90", enabled: true };
Object.assign(_test.deps, {
  storage: { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, v); } },
  post: async (url, body) => { if (down) throw new Error("offline"); posts.push({ url, body }); return { status: 204 }; },
  url: () => "https://example.test/api/app/meta-build",
  enabled: () => env.enabled, platform: () => env.platform, version: () => env.version, build: () => env.build,
});

(async () => {
  let r = await reportMetaBuild();
  ok(r === "sent" && posts.length === 1 && posts[0].url.endsWith("/app/meta-build"), "first launch: one report sent", r);
  ok(JSON.stringify(Object.keys(posts[0].body).sort()) === JSON.stringify(["appVersion", "build", "enabled", "platform"]) && posts[0].body.enabled === true && posts[0].body.build === "90", "…with only platform, version, build and enabled", JSON.stringify(posts[0].body));
  r = await reportMetaBuild();
  ok(r === "already" && posts.length === 1, "next launch: nothing sent again");
  env = { ...env, build: "91", enabled: false };
  r = await reportMetaBuild();
  ok(r === "sent" && posts.length === 2 && posts[1].body.enabled === false && posts[1].body.build === "91", "a new build reports again (here: Meta off)");
  env = { ...env, build: "92" }; down = true;
  r = await reportMetaBuild();
  ok(r === "error" && posts.length === 2, "offline: not marked as reported, never throws");
  down = false;
  r = await reportMetaBuild();
  ok(r === "sent" && posts.length === 3, "…and the next launch sends it");
  env = { ...env, platform: "web" };
  ok((await reportMetaBuild()) === "skipped", "web: skipped");
  env = { ...env, platform: "ios", build: null };
  ok((await reportMetaBuild()) === "skipped", "no native build number (Expo Go / dev): skipped");

  const host = fs.readFileSync(path.join(APP, "app/src/analytics/MetaConsent.js"), "utf8");
  ok(/import \{ reportMetaBuild \} from "\.\/metaBuildReport"/.test(host) && /useEffect\(\(\) => \{ reportMetaBuild\(\); \}, \[\]\)/.test(host), "the Meta host reports at launch");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
