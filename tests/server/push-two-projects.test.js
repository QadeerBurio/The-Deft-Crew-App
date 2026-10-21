// Push for two EAS projects: real utils/expoProjects.js, utils/pushNotification.js,
// pushGateway.js and routes/notification.routes.js (save-token, test-push) with a fake Expo
// that behaves per project, and in-memory models. No database, no network, no real pushes.
const path = require("path");
const Module = require("module");
const SERVER = require("../paths").SERVER;
const reqS = Module.createRequire(path.join(SERVER, "server.js"));
const express = reqS("express");
const jwt = reqS("jsonwebtoken");
process.env.JWT_SECRET = "test-only";

let failed = 0, passed = 0;
const out = console.log;
const ok = (c, label, extra = "") => { c ? passed++ : failed++; out(`${c ? "ok  " : "FAIL"}  ${label}${!c && extra ? "  → " + String(extra).slice(0, 400) : ""}`); };
const logs = [];
console.warn = (...a) => logs.push(a.join(" "));
console.log = (...a) => logs.push(a.join(" "));
console.error = (...a) => logs.push("ERR " + a.join(" "));
const realSetTimeout = global.setTimeout;
global.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, ms >= 4000 ? 0 : ms, ...a);
const tick = (ms = 30) => new Promise((r) => realSetTimeout(r, ms));

// ── fake Expo: knows each phone's project, each account's access token, security on/off ──
const A = "112506b0-7553-4a1b-afeb-6a37019cc15f"; // @aqkhan622/Testting
const B = "d14cdf3a-2494-4d4f-bee0-90f862bf3389"; // @aqkhan621/tdc
const NAME = { [A]: "@aqkhan622/Testting", [B]: "@aqkhan621/tdc" };
const SECRET = { [A]: "tok-622-secret-value", [B]: "tok-621-secret-value" }; // valid access tokens
const ORG = "tok-org-both-projects"; // a token that can send for both (e.g. an org robot)
const expoState = { security: { [A]: true, [B]: true }, sends: [], receiptCalls: [] };
const tok = (s) => `ExponentPushToken[${s}]`;
const projectOfToken = (t) => (/-a\d*\]$/.test(t) ? A : /-b\d*\]$/.test(t) ? B : A);
const authErr = (msg) => Object.assign(new Error(msg), { statusCode: 401, code: "UNAUTHORIZED" });
const canUse = (accessToken, pid) => (accessToken ? accessToken === SECRET[pid] || accessToken === ORG : !expoState.security[pid]);
class Expo {
  static isExpoPushToken(t) { return /^ExponentPushToken\[/.test(t); }
  constructor(opts = {}) { this.accessToken = opts.accessToken; }
  chunkPushNotifications(m) { const c = []; for (let i = 0; i < m.length; i += 100) c.push(m.slice(i, i + 100)); return c; }
  chunkPushNotificationReceiptIds(ids) { const c = []; for (let i = 0; i < ids.length; i += 300) c.push(ids.slice(i, i + 300)); return c; }
  async sendPushNotificationsAsync(chunk) {
    const groups = {};
    chunk.forEach((m) => (groups[NAME[projectOfToken(m.to)]] = groups[NAME[projectOfToken(m.to)]] || []).push(m.to));
    if (Object.keys(groups).length > 1) throw Object.assign(new Error("mixed"), { code: "PUSH_TOO_MANY_EXPERIENCE_IDS", details: groups });
    const pid = projectOfToken(chunk[0].to);
    if (!canUse(this.accessToken, pid)) throw authErr("The bearer token is invalid for this project");
    expoState.sends.push({ project: pid, accessToken: this.accessToken || null, tokens: chunk.map((m) => m.to) });
    return chunk.map((m) => ({ status: "ok", id: `${pid.slice(0, 8)}:${m.to}` }));
  }
  async getPushNotificationReceiptsAsync(ids) {
    expoState.receiptCalls.push({ accessToken: this.accessToken || null, ids });
    const pids = new Set(ids.map((id) => (id.startsWith(A.slice(0, 8)) ? A : B)));
    for (const p of pids) if (!canUse(this.accessToken, p)) throw authErr("refused");
    return Object.fromEntries(ids.map((id) => [id, { status: "ok" }]));
  }
}

// ── in-memory users (enough of Mongoose for these files) ──
const users = new Map();
const thenable = (v) => ({ select: () => thenable(v), lean: () => thenable(v), then: (a, b) => Promise.resolve(v).then(a, b), catch: (f) => Promise.resolve(v).catch(f) });
const findByToken = (t) => [...users.values()].find((u) => u.pushTokens.some((e) => e.token === t));
const User = {
  findById: (id) => thenable(users.get(String(id)) || null),
  findOne: (q, proj) => {
    const u = q["pushTokens.token"] ? findByToken(q["pushTokens.token"]) : null;
    if (!u) return thenable(null);
    const e = u.pushTokens.find((x) => x.token === q["pushTokens.token"]);
    return thenable(proj && proj["pushTokens.$"] ? { _id: u._id, pushTokens: [e] } : u);
  },
  find: () => thenable([...users.values()]),
  updateMany: async (filter, upd) => {
    let n = 0;
    for (const u of users.values()) {
      if (filter._id && String(filter._id) !== u.id) continue;
      if (upd.$set && filter["pushTokens.token"]) {
        const e = u.pushTokens.find((x) => x.token === filter["pushTokens.token"]);
        if (e) { for (const [k, v] of Object.entries(upd.$set)) e[k.replace("pushTokens.$.", "")] = v; n++; }
      }
      const p = upd.$pull?.pushTokens?.token;
      if (p) { const list = p.$in || [p]; const b = u.pushTokens.length; u.pushTokens = u.pushTokens.filter((t) => !list.includes(t.token)); n += b - u.pushTokens.length; }
    }
    return { modifiedCount: n };
  },
  updateOne: async (filter, upd) => {
    const u = users.get(String(filter._id));
    if (!u) return { modifiedCount: 0 };
    const p = upd.$pull?.pushTokens?.token;
    if (p) { const list = p.$in || [p]; u.pushTokens = u.pushTokens.filter((t) => !list.includes(t.token)); }
    if (upd.$push?.pushTokens) {
      const v = upd.$push.pushTokens;
      if (v.$each) { u.pushTokens.sort((a, b) => b.updatedAt - a.updatedAt); u.pushTokens = u.pushTokens.slice(0, v.$slice); } else u.pushTokens.push({ ...v });
    }
    return { modifiedCount: 1 };
  },
};
const addUser = (id, tokens) => users.set(id, { _id: id, id, role: "student", name: id, pushTokens: tokens.map((t) => (typeof t === "string" ? { token: tok(t), channels: "snd_v2", updatedAt: new Date() } : { channels: "snd_v2", updatedAt: new Date(), ...t, token: tok(t.token) })) });
const stub = { find: () => thenable([]), findOne: () => thenable(null), countDocuments: async () => 0, updateMany: async () => ({}), updateOne: async () => ({}), create: async (d) => ({ _id: "x", ...d }) };
const origLoad = Module._load;
Module._load = function (req, parent, isMain) {
  if (req === "expo-server-sdk") return { Expo };
  if (/models\/User$/.test(req)) return User;
  if (/models\/(EngagementProfile|PushLog|SocialNotification|Notification)$/.test(req)) return stub;
  return origLoad.call(this, req, parent, isMain);
};

const setEnv = (env) => {
  for (const k of ["EXPO_ACCESS_TOKEN", "EXPO_ACCESS_TOKEN_112506B0", "EXPO_ACCESS_TOKEN_D14CDF3A"]) delete process.env[k];
  Object.assign(process.env, env);
  EP._reset();
  expoState.sends.length = 0;
  expoState.receiptCalls.length = 0;
  logs.length = 0;
};
const EP = require(path.join(SERVER, "utils/expoProjects.js"));
const P = require(path.join(SERVER, "utils/pushNotification.js"));
const msg = (t) => ({ to: tok(t), title: "t", body: "b", data: {} });
const sendsBy = (pid) => expoState.sends.filter((s) => s.project === pid);
const noSecretsLogged = () => !logs.some((l) => Object.values(SECRET).concat(ORG).some((s) => l.includes(s)));

(async () => {
  try {
    out("── both projects, one token each");
    setEnv({ EXPO_ACCESS_TOKEN_112506B0: SECRET[A], EXPO_ACCESS_TOKEN_D14CDF3A: SECRET[B] });
    let r = await EP.sendByProject([msg("p1-a"), msg("p2-b"), msg("p3-a")]);
    ok(r.tickets.every((t) => t.status === "ok") && sendsBy(A)[0]?.accessToken === SECRET[A] && sendsBy(B)[0]?.accessToken === SECRET[B], "unknown projects: Expo's grouping splits the batch; each project sent with its own token", JSON.stringify(expoState.sends));
    ok(r.learned[tok("p1-a")] === A && r.learned[tok("p2-b")] === B && r.tickets[1].projectId === B, "the project of each phone is learned (and returned on the ticket)");
    expoState.sends.length = 0;
    r = await EP.sendByProject([msg("p1-a"), msg("p2-b")], { [tok("p1-a")]: A, [tok("p2-b")]: B });
    ok(r.tickets.every((t) => t.status === "ok") && expoState.sends.length === 2 && !logs.some((l) => /several|mixed/.test(l)), "stored projects: one request per project, no mixed-batch error");
    let rc = await EP.getReceipts(r.tickets.map((t) => t.id), Object.fromEntries(r.tickets.map((t) => [t.id, t.projectId])));
    ok(Object.keys(rc).length === 2 && Object.values(rc).every((x) => x.status === "ok") && expoState.receiptCalls.every((c) => c.ids.length === 1), "receipts: each project's ids asked with its own token", JSON.stringify(expoState.receiptCalls.map((c) => [c.accessToken && c.accessToken.slice(4, 7), c.ids.length])));
    expoState.receiptCalls.length = 0;
    rc = await EP.getReceipts(r.tickets.map((t) => t.id));
    ok(Object.keys(rc).length === 2, "receipts with unknown projects: a refused group is split until each token answers its own", JSON.stringify(expoState.receiptCalls.map((c) => c.ids.length)));
    ok(noSecretsLogged(), "no access token value in any log line");

    out("── wrong token for one project");
    setEnv({ EXPO_ACCESS_TOKEN_112506B0: SECRET[A], EXPO_ACCESS_TOKEN_D14CDF3A: SECRET[A] /* wrong account */ });
    r = await EP.sendByProject([msg("w1-a"), msg("w2-b")], { [tok("w1-a")]: A, [tok("w2-b")]: B });
    ok(r.tickets[0].status === "ok" && r.tickets[1].status === "error" && r.tickets[1].details.error === "UNAUTHORIZED", "project A sent; project B: UNAUTHORIZED ticket (nothing thrown)", JSON.stringify(r.tickets));
    ok(logs.some((l) => /project d14cdf3a \(@aqkhan621\/tdc\): Expo refused the send with the token from EXPO_ACCESS_TOKEN_D14CDF3A .*Set EXPO_ACCESS_TOKEN_D14CDF3A to an access token of the account that owns this project/.test(l)), "readable log names the project and the env var", logs.join(" | "));
    ok(noSecretsLogged(), "…without the token value");

    out("── no token set");
    setEnv({});
    expoState.security = { [A]: true, [B]: false };
    r = await EP.sendByProject([msg("n1-a"), msg("n2-b")], { [tok("n1-a")]: A, [tok("n2-b")]: B });
    ok(r.tickets[0].status === "error" && r.tickets[0].details.error === "UNAUTHORIZED" && r.tickets[1].status === "ok" && sendsBy(B)[0].accessToken === null, "no tokens: A (security on) refused, B (security off) sent without a token", JSON.stringify(r.tickets));
    ok(logs.some((l) => /project 112506b0 \(@aqkhan622\/Testting\): no access token set \(EXPO_ACCESS_TOKEN_112506B0 or EXPO_ACCESS_TOKEN\)/.test(l)) && logs.some((l) => /project d14cdf3a \(@aqkhan621\/tdc\): no access token set/.test(l)), "readable 'no access token set' line per project", logs.join(" | "));
    await EP.sendByProject([msg("n3-a")], { [tok("n3-a")]: A });
    ok(logs.filter((l) => /112506b0.*no access token set/.test(l)).length === 1, "each warning once per process (no log flood)");
    expoState.security = { [A]: true, [B]: true };

    out("── only EXPO_ACCESS_TOKEN, plus a project token");
    setEnv({ EXPO_ACCESS_TOKEN: SECRET[A], EXPO_ACCESS_TOKEN_D14CDF3A: SECRET[B] });
    r = await EP.sendByProject([msg("f1-a"), msg("f2-b")], { [tok("f1-a")]: A, [tok("f2-b")]: B });
    ok(r.tickets.every((t) => t.status === "ok") && sendsBy(A)[0].accessToken === SECRET[A] && sendsBy(B)[0].accessToken === SECRET[B], "A falls back to EXPO_ACCESS_TOKEN, B uses its own");
    // an old build's phone of project B alone (no mixed error to learn from): the fallback is refused, B's token works
    expoState.sends.length = 0;
    r = await EP.sendByProject([msg("solo-b")]);
    ok(r.tickets[0].status === "ok" && r.learned[tok("solo-b")] === B && sendsBy(B)[0].accessToken === SECRET[B], "unknown single-project phone: refused with the fallback, sent with B's token, project learned", JSON.stringify({ t: r.tickets, l: r.learned }));
    ok(!logs.some((l) => /refused/.test(l)), "no 'refused' warning when the retry worked");

    out("── one token for both (org / robot token)");
    setEnv({ EXPO_ACCESS_TOKEN: ORG });
    r = await EP.sendByProject([msg("o1-a"), msg("o2-b")]);
    ok(r.tickets.every((t) => t.status === "ok") && expoState.sends.every((s) => s.accessToken === ORG), "EXPO_ACCESS_TOKEN alone is enough when it can send for both");

    out("── sendToUser: learned once, stored, then no guessing");
    setEnv({ EXPO_ACCESS_TOKEN_112506B0: SECRET[A], EXPO_ACCESS_TOKEN_D14CDF3A: SECRET[B] });
    addUser("u1", ["u1-a", "u1-b"]);
    let res = await P.sendToUser("u1", "hi", "there", { type: "message" });
    await tick();
    const pts = users.get("u1").pushTokens;
    ok(res.sent && res.count === 2 && pts.find((e) => e.token === tok("u1-a")).projectId === A && pts.find((e) => e.token === tok("u1-b")).projectId === B, "old builds (no project stored): both delivered, projects stored on the tokens", JSON.stringify(pts));
    logs.length = 0; expoState.sends.length = 0;
    res = await P.sendToUser("u1", "again", "x", { type: "message" });
    ok(res.count === 2 && expoState.sends.length === 2 && !logs.some((l) => /several|mixed/i.test(l)), "next send: straight to each project, no mixed-batch round trip");
    await tick();
    ok(expoState.receiptCalls.length >= 1 && noSecretsLogged(), "receipts checked; no token values logged");

    out("── engagement gateway");
    const G = require(path.join(SERVER, "services/engagement/pushGateway.js"));
    addUser("u2", [{ token: "g1-a", projectId: A }, { token: "g2-b", projectId: B }]);
    expoState.sends.length = 0;
    const gr = await G.send("u2", { type: "message", title: "hey", body: "x", skipCaps: true, priority: 3 }).catch((e) => ({ error: e.message }));
    ok(sendsBy(A).length === 1 && sendsBy(B).length === 1 && sendsBy(B)[0].accessToken === SECRET[B], "pushGateway sends each project with its own token", JSON.stringify({ gr, s: expoState.sends }));

    out("── save-token: the app sends its project");
    const router = require(path.join(SERVER, "routes/notification.routes.js"));
    const app = express(); app.use(express.json()); app.use("/api/notification", router);
    const srv = app.listen(0, "127.0.0.1"); await new Promise((r2) => srv.once("listening", r2));
    const base = `http://127.0.0.1:${srv.address().port}/api/notification`;
    addUser("u3", []);
    const jwtFor = (id) => jwt.sign({ id, role: "student" }, process.env.JWT_SECRET);
    const put = (body) => fetch(base + "/save-token", { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${jwtFor("u3")}` }, body: JSON.stringify(body) });
    let h = await put({ token: tok("s1-b"), platform: "android", channels: "snd_v2", projectId: B.toUpperCase() });
    ok(h.status === 200 && users.get("u3").pushTokens[0].projectId === B, "new build: projectId stored (normalised)", JSON.stringify(users.get("u3").pushTokens));
    h = await put({ token: tok("s1-b"), platform: "android", channels: "snd_v2" });
    ok(h.status === 200 && users.get("u3").pushTokens[0].projectId === B, "old build re-saving the same token: the known project is kept");
    h = await put({ token: tok("s2-a"), platform: "android", channels: "snd_v2", projectId: "not-a-uuid" });
    ok(h.status === 200 && users.get("u3").pushTokens.find((e) => e.token === tok("s2-a")) && !users.get("u3").pushTokens.find((e) => e.token === tok("s2-a")).projectId, "old build / junk projectId: saved without a project (learned on first send)");
    srv.close();

    out("── project names Expo uses");
    ok(EP.projectFromExperience("@aqkhan621/tdc") === B && EP.projectFromExperience(A) === A && EP.projectFromExperience("@someone/else") === null && EP.envName(B) === "EXPO_ACCESS_TOKEN_D14CDF3A", "experience '@owner/slug' or id → project; unknown → null");
  } catch (e) {
    ok(false, "stopped", e.stack);
  }
  out(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
