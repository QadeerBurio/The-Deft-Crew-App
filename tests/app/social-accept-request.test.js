// Accepting a connection request from a post (app/src/screens/Social/PostCard.js "accept"). The server has no
// accept-by-user route: a request is accepted through its notification (POST /social/notifications/respond).
// app/src/utils/connectionRequests.js finds the pending request from that person and answers it.
//   node tests/app/social-accept-request.test.js
// Real module (Babel) with a fake http client; plus source checks on PostCard.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 400) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8");

const load = (rel) => {
  const file = path.join(APP, rel);
  const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), { filename: file, babelrc: false, configFile: false, presets: [], plugins: [reqApp.resolve("@babel/plugin-transform-modules-commonjs")] });
  const m = new Module(file, module); m.filename = file; m.paths = Module._nodeModulePaths(path.dirname(file));
  m._compile(code, file); return m.exports;
};
const { acceptRequestFrom } = load("app/src/utils/connectionRequests.js");

const API = "https://x.test/api/social";
const CONFIG = { headers: { Authorization: "Bearer t" } };
const fakeHttp = (list, postImpl) => {
  const calls = [];
  return {
    calls,
    get: async (url, cfg) => { calls.push(["get", url, cfg]); return { data: list }; },
    post: async (url, body, cfg) => { calls.push(["post", url, body, cfg]); return postImpl ? postImpl() : { data: { success: true, status: "accepted" } }; },
  };
};
const reqN = (id, sender, extra = {}) => ({ _id: id, type: "request", sender: { _id: sender, name: "S" }, status: "pending", isProcessed: false, ...extra });

(async () => {
  // 1. finds the pending request from that person and accepts it
  {
    const h = fakeHttp([reqN("n1", "u-other"), { _id: "n0", type: "like", sender: { _id: "u1" } }, reqN("n2", "u1")]);
    const r = await acceptRequestFrom(h, API, CONFIG, "u1");
    ok(r.ok === true, "accepts the pending request", JSON.stringify(r));
    ok(h.calls[0][0] === "get" && h.calls[0][1] === `${API}/notifications` && h.calls[0][2].params.types === "request" && h.calls[0][2].headers.Authorization === "Bearer t", "reads the request notifications with the login", JSON.stringify(h.calls[0]));
    const p = h.calls[1];
    ok(p && p[1] === `${API}/notifications/respond` && p[2].notificationId === "n2" && p[2].action === "accepted" && p[3] === CONFIG, "answers that person's notification with 'accepted'", JSON.stringify(p));
    ok(h.calls.length === 2, "one read, one answer");
  }
  // 2. sender given as a plain id; requester given as an object
  {
    const h = fakeHttp([{ ...reqN("n3", "u2"), sender: "u2" }]);
    const r = await acceptRequestFrom(h, API, CONFIG, { _id: "u2" });
    ok(r.ok && h.calls[1][2].notificationId === "n3", "matches the sender by id, populated or not");
  }
  // 3. nothing pending: no answer sent, clear reason
  for (const [label, list] of [
    ["no request from them", [reqN("n1", "u-other")]],
    ["their request already processed", [reqN("n1", "u1", { isProcessed: true, status: "accepted" })]],
    ["their request declined", [reqN("n1", "u1", { status: "declined" })]],
    ["empty list", []],
    ["unexpected reply", { error: "x" }],
  ]) {
    const h = fakeHttp(list);
    const r = await acceptRequestFrom(h, API, CONFIG, "u1");
    ok(!r.ok && r.reason === "not_pending" && h.calls.length === 1, `not pending (${label}): nothing sent`, JSON.stringify(r));
  }
  // 4. already accepted a moment ago counts as accepted
  {
    const h = fakeHttp([reqN("n1", "u1")], () => { const e = new Error("400"); e.response = { status: 400, data: { error: "This request has already been processed", status: "accepted" } }; throw e; });
    const r = await acceptRequestFrom(h, API, CONFIG, "u1");
    ok(r.ok === true, "already accepted (400, status accepted) counts as connected");
  }
  // 5. other failures come back as an error
  {
    const h = fakeHttp([reqN("n1", "u1")], () => { const e = new Error("500"); e.response = { status: 500, data: { error: "boom" } }; throw e; });
    const r = await acceptRequestFrom(h, API, CONFIG, "u1");
    ok(!r.ok && r.reason === "error" && r.error?.message === "500", "server error is returned as an error");
    const h2 = fakeHttp([reqN("n1", "u1")], () => { const e = new Error("400"); e.response = { status: 400, data: { status: "declined" } }; throw e; });
    const r2 = await acceptRequestFrom(h2, API, CONFIG, "u1");
    ok(!r2.ok && r2.reason === "error", "declined elsewhere is not treated as connected");
  }

  // PostCard uses it; the dead accept-by-user call is gone
  const pc = read("app/src/screens/Social/PostCard.js");
  ok(/import \{ acceptRequestFrom \} from ["']\.\.\/\.\.\/utils\/connectionRequests["']/.test(pc), "PostCard imports the helper");
  ok(!/\/user\/accept\//.test(pc), "PostCard no longer calls the missing /user/accept route");
  const h = pc.slice(pc.indexOf("const handleAcceptRequest"), pc.indexOf("const handleAcceptRequest") + 1600);
  ok(/acceptRequestFrom\(axios, API_URL, config, post\.author\._id\)/.test(h), "accept uses the helper with the post's author");
  ok(/not_pending/.test(h) && /setConnectionStatus\('connected'\)/.test(h) && /finally\s*\{\s*setIsConnecting\(false\)/.test(h), "accept: not-pending message, connected state, spinner always cleared");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("FAIL  crashed  → " + e.stack); process.exit(1); });
