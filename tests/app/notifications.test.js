// App push token flow + foreground handler. Real App.js (PushRegistration exported for the
// test only, at load time), real utils/pushNotifications.js, real GlobalNotificationLayer.js,
// against the REAL server routes /notification/save-token and /remove-token (server branch
// fix/notifications-all, in-memory users, real JWT auth). Fake expo-notifications.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SERVER = require("../paths").SERVER;
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const reqS = Module.createRequire(path.join(SERVER, "server.js"));
const babel = reqApp("@babel/core");
const express = reqS("express");
const jwt = reqS("jsonwebtoken");
process.env.JWT_SECRET = "test-only";
global.__DEV__ = true;
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

let failed = 0, passed = 0;
const out = console.log;
const ok = (c, label, extra = "") => { c ? passed++ : failed++; out(`${c ? "ok  " : "FAIL"}  ${label}${!c && extra ? "  → " + String(extra).slice(0, 300) : ""}`); };
const warns = [], errors = [];
console.warn = (...a) => warns.push(a.join(" "));
console.error = (...a) => errors.push(a.join(" "));
console.log = () => {};

// ── server: real routes, in-memory users ───────────────────────
const users = new Map();
const pullTok = (u, upd) => { const p = upd.$pull?.pushTokens?.token; if (!p) return 0; const list = p.$in || [p]; const b = u.pushTokens.length; u.pushTokens = u.pushTokens.filter((t) => !list.includes(t.token)); return b - u.pushTokens.length; };
const q = (v) => ({ select: () => ({ lean: async () => v, then: (a, b) => Promise.resolve(v).then(a, b) }), lean: async () => v, then: (a, b) => Promise.resolve(v).then(a, b) });
const User = {
  findById: (id) => q(users.get(String(id)) || null),
  // save-token reads the token's earlier entry (to keep a learned EAS project)
  findOne: (filter, proj) => {
    const t = filter["pushTokens.token"];
    const u = [...users.values()].find((x) => x.pushTokens.some((e) => e.token === t));
    if (!u) return q(null);
    return q(proj && proj["pushTokens.$"] ? { _id: u._id, pushTokens: [u.pushTokens.find((e) => e.token === t)] } : u);
  },
  updateMany: async (filter, upd) => { let n = 0; for (const u of users.values()) { if (filter["pushTokens.token"] && !u.pushTokens.some((t) => t.token === filter["pushTokens.token"])) continue; n += pullTok(u, upd); } return { modifiedCount: n }; },
  updateOne: async (filter, upd) => {
    const u = users.get(String(filter._id)); if (!u) return { modifiedCount: 0 };
    if (upd.$pull) return { modifiedCount: pullTok(u, upd) };
    if (upd.$push?.pushTokens?.token) { u.pushTokens.push(upd.$push.pushTokens); return { modifiedCount: 1 }; }
    return { modifiedCount: 0 }; // $sort / $slice housekeeping
  },
};
const origLoad = Module._load;
let serverSide = true;
Module._load = function (req, parent, isMain) {
  if (serverSide && /models\/User$/.test(req)) return User;
  if (serverSide && /models\/(Notification|SocialNotification|EngagementProfile|PushLog)$/.test(req)) return { findOne: () => q(null), find: () => q([]) };
  return origLoad.call(this, req, parent, isMain);
};
const router = require(path.join(SERVER, "routes/notification.routes.js"));
serverSide = false;
const srvApp = express(); srvApp.use(express.json()); srvApp.use("/api/notification", router);

// ── fake expo-notifications ────────────────────────────────────
const handlerCalls = [];
let phoneToken = "ExponentPushToken[phone-T1]";
const tokenListeners = [];
const Notifications = {
  setNotificationHandler: (h) => handlerCalls.push(h),
  setNotificationChannelAsync: async () => {}, deleteNotificationChannelAsync: async () => {},
  getPermissionsAsync: async () => ({ status: "granted" }), requestPermissionsAsync: async () => ({ status: "granted" }),
  getExpoPushTokenAsync: async () => ({ data: phoneToken }),
  addPushTokenListener: (cb) => { tokenListeners.push(cb); return { remove: () => tokenListeners.splice(tokenListeners.indexOf(cb), 1) }; },
  addNotificationReceivedListener: () => ({ remove() {} }), addNotificationResponseReceivedListener: () => ({ remove() {} }),
  getLastNotificationResponseAsync: async () => null, registerTaskAsync: async () => {}, dismissNotificationAsync: async () => {},
  AndroidImportance: { MAX: 5 }, AndroidNotificationVisibility: { PUBLIC: 1 },
};

// ── hook runtime (as in the events tests) ──────────────────────
const hooks = new Map(); let cur = null, pendingEffects = []; const roots = new Map();
const slot = (init) => { const l = hooks.get(cur.path) || hooks.set(cur.path, []).get(cur.path); const i = cur.i++; if (!(i in l)) l[i] = init(); return [l, i]; };
let ctxValue = {};
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }),
  Fragment: "Fragment", createContext: () => ({ Provider: "Provider" }),
  useState(init) { const [l, i] = slot(() => ({ v: typeof init === "function" ? init() : init })); const o = cur.path.split("/")[0]; return [l[i].v, (v) => { l[i].v = typeof v === "function" ? v(l[i].v) : v; roots.get(o)?.(); }]; },
  useRef(init) { const [l, i] = slot(() => ({ current: init })); return l[i]; },
  useMemo(fn) { return fn(); }, useCallback(fn) { return fn; },
  useContext() { return ctxValue; },
  useEffect(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, cleanup: null })); const s = l[i]; if (!deps || !s.deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) pendingEffects.push(() => { if (s.cleanup) s.cleanup(); s.deps = deps; s.cleanup = fn() || null; }); },
};
React.default = React;
function mount(el) { const root = "r" + Math.random(); const render = () => { const prev = cur; cur = { path: root + "/" + el.type.name, i: 0 }; el.type(el.props); cur = prev; const fx = pendingEffects; pendingEffects = []; fx.forEach((f) => f()); }; roots.set(root, render); render(); return { rerender: render }; }

// ── loading app files with mocks ───────────────────────────────
const anyThing = new Proxy(function () {}, { get: (t, k) => (k === "__esModule" ? false : k === Symbol.toPrimitive ? () => "" : k === "then" ? undefined : anyThing), apply: () => anyThing, construct: () => anyThing });
const anyModule = new Proxy({}, { get: (t, k) => (k === "__esModule" ? true : k === "then" ? undefined : anyThing) });
let apiBase = "";
const appApi = { put: async (url, body) => axiosReal.put(apiBase + url, body, { headers: { Authorization: `Bearer ${ctxValue.token}` } }), defaults: { get baseURL() { return apiBase; } } };
const axiosReal = reqApp("axios");
const real = new Set([path.join(APP, "App.js"), path.join(APP, "app/src/utils/pushNotifications.js"), path.join(APP, "app/src/components/GlobalNotificationLayer.js")].map((p) => p.toLowerCase()));
const cache = new Map();
function load(file, exportExtra) {
  if (cache.has(file)) return cache.get(file);
  let src = fs.readFileSync(file, "utf8");
  if (exportExtra) src += `\nexport { ${exportExtra} as __testExport };\n`;
  const { code } = babel.transformSync(src, { filename: file, babelrc: false, configFile: false, plugins: [[reqApp.resolve("@babel/plugin-transform-react-jsx"), { runtime: "classic" }], reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
  const m = new Module(file); m.filename = file;
  m.require = (id) => {
    if (id === "react") return React;
    if (id === "expo-notifications") return Notifications;
    if (id === "expo-device") return { isDevice: true };
    if (id === "expo-constants") return { default: { expoConfig: { extra: { eas: { projectId: "d14cdf3a-2494-4d4f-bee0-90f862bf3389" } } } }, expoConfig: { extra: { eas: { projectId: "d14cdf3a-2494-4d4f-bee0-90f862bf3389" } } } };
    if (id === "react-native") return { Platform: { OS: "android", select: (o) => o.android }, AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) }, StatusBar: "StatusBar", View: "View", Text: "Text" };
    if (id === "axios") return axiosReal;
    if (/api\/api$/.test(id)) return { default: appApi, __esModule: true };
    if (/context\/AuthContext$/.test(id)) return { AuthContext: {}, default: anyThing, __esModule: true };
    if (id === "expo-task-manager") return { __esModule: true, isTaskDefined: () => false, defineTask() {} };
    if (id.startsWith(".")) {
      const p = path.resolve(path.dirname(file), id).replace(/(\.js)?$/, ".js");
      if (real.has(p.toLowerCase())) return load(p);
      return anyModule;
    }
    return anyModule;
  };
  cache.set(file, m.exports);
  m._compile(code, file);
  return m.exports;
}

(async () => {
  const srv = srvApp.listen(0, "127.0.0.1"); await new Promise((r) => srv.once("listening", r));
  apiBase = `http://127.0.0.1:${srv.address().port}/api`;
  const A = "64b0000000000000000000a1", B = "64b0000000000000000000b2";
  users.set(A, { _id: A, id: A, role: "student", pushTokens: [] });
  users.set(B, { _id: B, id: B, role: "student", pushTokens: [] });
  const tokA = jwt.sign({ id: A }, "test-only"), tokB = jwt.sign({ id: B }, "test-only");
  const tokensOf = (id) => users.get(id).pushTokens.map((t) => t.token);
  try {
    // 1. one foreground handler
    const AppMod = load(path.join(APP, "App.js"), "PushRegistration");
    ok(handlerCalls.length === 1, "App.js sets the foreground handler once at load", handlerCalls.length);
    const h = await handlerCalls[0].handleNotification();
    ok(h.shouldShowBanner === false && h.shouldPlaySound === false, "foreground: no system popup / sound (the in-app popup plays the sound once)");
    const GNL = load(path.join(APP, "app/src/components/GlobalNotificationLayer.js"));
    ctxValue = { token: tokA, isGuest: false, updateUnreadCount() {} };
    try { mount(React.createElement(GNL.default)); } catch (e) { /* its UI parts are stubs; the effects are what matter */ }
    ok(handlerCalls.length === 1, "GlobalNotificationLayer no longer sets a second handler", handlerCalls.length);

    // 2. login → token saved for A
    const PushRegistration = AppMod.__testExport;
    ctxValue = { token: tokA, isGuest: false };
    const pr = mount(React.createElement(PushRegistration));
    await tick(150);
    ok(tokensOf(A).join() === "ExponentPushToken[phone-T1]" && users.get(A).pushTokens[0].channels === "snd_v2", "login: this phone's token saved for the user (channels snd_v2)", JSON.stringify(users.get(A).pushTokens));
    ok(users.get(A).pushTokens[0].projectId === "d14cdf3a-2494-4d4f-bee0-90f862bf3389", "login: the token is saved with this build's EAS project", JSON.stringify(users.get(A).pushTokens));

    // 3. token changes → new one saved
    phoneToken = "ExponentPushToken[phone-T2]";
    await tokenListeners[tokenListeners.length - 1]({ data: "fcm-new" });
    await tick(100);
    ok(tokensOf(A).includes("ExponentPushToken[phone-T2]"), "token change: the new token is saved", tokensOf(A).join());

    // 4. logout → removed from A
    ctxValue = { token: null, isGuest: false };
    pr.rerender();
    await tick(150);
    ok(!tokensOf(A).includes("ExponentPushToken[phone-T2]"), "logout: this phone removed from the account (no more pushes)", tokensOf(A).join());

    // 5. another account on the same phone
    ctxValue = { token: tokB, isGuest: false };
    pr.rerender();
    await tick(150);
    ok(tokensOf(B).join() === "ExponentPushToken[phone-T2]" && !tokensOf(A).includes("ExponentPushToken[phone-T2]"), "second account on the same phone: only that account has the phone", JSON.stringify({ A: tokensOf(A), B: tokensOf(B) }));

    // 6. switching to guest also removes it
    ctxValue = { token: null, isGuest: true };
    pr.rerender();
    await tick(150);
    ok(tokensOf(B).length === 0, "switch to guest: the phone is removed from the account", tokensOf(B).join());

    // 7. save failure: plain reason, warn (no red screen), no throw
    const PN = load(path.join(APP, "app/src/utils/pushNotifications.js"));
    errors.length = 0; warns.length = 0;
    const r = await PN.savePushTokenToServer({ put: async () => { const e = new Error("Request failed with status code 401"); e.response = { status: 401 }; throw e; } }, "ExponentPushToken[x]");
    ok(!r.ok && r.reason === "not signed in any more" && warns.some((w) => /could not be saved for notifications: not signed in any more/.test(w)) && errors.length === 0, "save failure: plain reason in the log (console.warn), no console.error", JSON.stringify({ r, warns, errors }));
    const rr = await PN.removePushTokenFromServer(apiBase, "bad.jwt", "ExponentPushToken[x]");
    ok(!rr.ok && errors.length === 0, "remove failure never throws, no console.error");
  } catch (e) {
    failed++;
    out("FAIL  (stopped) " + (e.stack || e.message).split("\n").slice(0, 6).join(" | "));
  } finally {
    srv.close();
    out(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
})();
