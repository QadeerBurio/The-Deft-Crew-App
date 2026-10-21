// Events security check: real routes/event.routes.js + real auth middleware + real JWTs,
// in-memory fake models. No database, no .env, no network beyond 127.0.0.1.
//   node run.js            (tests the working tree)
//   node run.js --before   (tests main's version, to show what was open)
const path = require("path");
const fs = require("fs");
const os = require("os");
const Module = require("module");
const { execSync } = require("child_process");

const SERVER = require("../paths").SERVER;
const reqServer = Module.createRequire(path.join(SERVER, "server.js"));
const express = reqServer("express");
const jwt = reqServer("jsonwebtoken");
process.env.JWT_SECRET = "test-only-secret"; // never the real one; .env is not loaded

// ── fake mongoose-ish layer ────────────────────────────────────
let seq = 0;
const oid = () => {
  const hex = (++seq).toString(16).padStart(24, "0");
  return { _hex: hex, toString: () => hex, equals: (o) => String(o) === hex };
};
const match = (doc, q = {}) =>
  Object.entries(q).every(([k, v]) => {
    if (k === "$or") return v.some((sub) => match(doc, sub));
    const dv = doc[k];
    if (v && typeof v === "object" && !v.toString().match(/^[0-9a-f]{24}$/)) {
      if ("$ne" in v) return String(dv) !== String(v.$ne);
      if ("$in" in v) return v.$in.map(String).includes(String(dv));
      return true; // other operators: not needed for these checks
    }
    return String(dv) === String(v);
  });
const query = (rows) => {
  const q = {
    sort: () => q, skip: () => q, limit: () => q, select: () => q, lean: () => q,
    populate: () => q,
    then: (res, rej) => Promise.resolve(rows).then(res, rej),
  };
  return q;
};
function model(name) {
  const rows = [];
  class M {
    constructor(data) { Object.assign(this, data); if (!this._id) this._id = oid(); if (!this.createdAt) this.createdAt = new Date(); }
    async save() { if (!rows.includes(this)) rows.push(this); return this; }
    toJSON() { const o = { ...this }; o._id = String(o._id); if (o.creator) o.creator = String(o.creator); return o; }
    static find(q) { return query(rows.filter((d) => match(d, q))); }
    static findOne(q) { return query(rows.find((d) => match(d, q)) || null); }
    static findById(id) { return query(rows.find((d) => String(d._id) === String(id)) || null); }
    static async findByIdAndDelete(id) { const i = rows.findIndex((d) => String(d._id) === String(id)); return i >= 0 ? rows.splice(i, 1)[0] : null; }
    static async findOneAndDelete(q) { const i = rows.findIndex((d) => match(d, q)); return i >= 0 ? rows.splice(i, 1)[0] : null; }
    static async deleteMany(q) { let n = 0; for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i], q)) { rows.splice(i, 1); n++; } return { deletedCount: n }; }
    static async countDocuments(q) { return rows.filter((d) => match(d, q)).length; }
    static async aggregate() { return []; }
    static async findOneAndUpdate(q, u) { const d = rows.find((x) => String(x._id) === String(q._id)); if (!d) return null; for (const [k, n] of Object.entries(u.$inc || {})) if (!k.includes('.')) d[k] = (d[k] || 0) + n; return d; }
    static async updateOne(q, u) { await M.findOneAndUpdate(q, u); return {}; }
    static async distinct(field) { return [...new Set(rows.map((d) => d[field]).flat().filter(Boolean))]; }
  }
  M.rows = rows;
  M.modelName = name;
  return M;
}
const Event = model("Event");
const Registration = model("Registration");
const EventNotification = model("EventNotification");
const users = new Map();
const User = { findById: (id) => ({ select: async () => users.get(String(id)) || null }) };
const calls = { sync: 0, expire: 0, purge: 0 };

const MOCKS = {
  "../models/Event": { Event, Registration, EventNotification },
  "../models/User": User,
  "../services/events/eventAggregator": { runAggregation: async () => { calls.sync++; return { ok: true }; }, getAggregationStats: () => ({}) },
  "../services/events/eventCleanup": { expirePastEvents: async () => { calls.expire++; return 0; }, purgeExpiredEvents: async () => { calls.purge++; return 0; } },
  "../services/events/csvImporter": { importEventsToDatabase: async () => ({ added: 0, skipped: 0 }) },
  "../services/engagement": { track: async () => null },
  // tickets have their own suite (tickets-test); here they are no-ops
  "../services/events/tickets": { issueAndDeliver: async () => ({ issued: false }), applyPaymentToTickets: () => false, hasTicketRight: () => false, ticketView: () => ({}), deliverTickets: async () => ({}), backfillTickets: async () => ({}) },
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request in MOCKS) return MOCKS[request];
  return origLoad.call(this, request, parent, isMain);
};

// which version of the routes file
let routesPath = path.join(SERVER, "routes/event.routes.js");
const before = process.argv.includes("--before");
if (before) {
  const tmp = path.join(SERVER, "routes", `.event.routes.main.${process.pid}.js`);
  fs.writeFileSync(tmp, execSync("git show main:routes/event.routes.js", { cwd: SERVER }));
  process.on("exit", () => { try { fs.unlinkSync(tmp); } catch {} });
  routesPath = tmp;
}
const router = require(routesPath);
const app = express();
app.use(express.json());
app.use("/api/events", router);

// ── people and data ────────────────────────────────────────────
const mkUser = (name, role) => {
  const _id = oid();
  const u = { _id, id: String(_id), name, email: `${name}@test.pk`, role };
  users.set(String(_id), u);
  return { ...u, token: jwt.sign({ id: String(_id), role }, process.env.JWT_SECRET) };
};
const student = mkUser("student", "student");
const creator = mkUser("creator", "student");
const admin = mkUser("admin", "admin");
const own = new Event({ title: "creator's event", type: "Workshops", city: "Karachi", creator: creator._id, status: "approved", isExpired: false });
const other = new Event({ title: "someone else's", type: "Hackathons", city: "Lahore", creator: admin._id, status: "approved", isExpired: false });
const imported = new Event({ title: "imported", type: "Conferences", city: "Karachi", creator: null, source: "csv", isImported: true, status: "approved", isExpired: false });
[own, other, imported].forEach((e) => Event.rows.push(e));
Registration.rows.push(new Registration({ eventId: imported._id, studentName: "Ali", email: "ali@uni.pk", whatsapp: "0300", userId: student._id }));

// ── tiny client ────────────────────────────────────────────────
let base;
const call = async (method, url, who, body) => {
  const headers = { "content-type": "application/json" };
  if (who === "guest") headers.authorization = "Bearer guest-token-2024";
  else if (who) headers.authorization = `Bearer ${who.token}`;
  const res = await fetch(base + "/api/events" + url, { method, headers, body: body && method !== "GET" ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};
let failed = 0;
const results = [];
const expect = async (label, method, url, who, want, body) => {
  const r = await call(method, url, who, body);
  const ok = Array.isArray(want) ? want.includes(r.status) : r.status === want;
  results.push(`${ok ? "ok  " : "FAIL"}  ${String(r.status).padEnd(3)} ${method.padEnd(6)} ${url.padEnd(34)} ${String(who?.name || who || "no token").padEnd(8)} ${label}`);
  if (!ok) failed++;
  return r;
};

(async () => {
  const srv = app.listen(0, "127.0.0.1");
  await new Promise((r) => srv.once("listening", r));
  base = `http://127.0.0.1:${srv.address().port}`;
  const ev = String(own._id), oth = String(other._id), imp = String(imported._id);

  // public, no token
  for (const u of ["/feed", "/latest", "/search?q=x", "/category/Workshops", "/provider/csv", `/${ev}`, "/categories", "/cities"]) {
    await expect("public read", "GET", u, null, 200);
  }

  // protected: no token and guest token → 401
  const protectedRoutes = [
    ["POST", "/create"], ["PUT", `/${ev}`], ["PUT", `/event/${ev}`], ["DELETE", `/${ev}`], ["DELETE", `/event/${ev}`],
    ["POST", "/register"], ["DELETE", `/register/${ev}`], ["GET", "/my-registrations"], ["GET", "/my-registrations/details"],
    ["GET", `/registrations/${imp}`], ["GET", "/my-events"], ["GET", "/notifications"],
  ];
  for (const [m, u] of protectedRoutes) {
    await expect("needs sign-in", m, u, null, 401, { eventId: ev, studentName: "x", whatsapp: "1", title: "t", organizer: "o", city: "c", type: "Workshops" });
    await expect("needs sign-in", m, u, "guest", 401, { eventId: ev, studentName: "x", whatsapp: "1", title: "t", organizer: "o", city: "c", type: "Workshops" });
  }
  const r401 = await call("POST", "/register", null, {});
  results.push(`${r401.json?.error && r401.json?.message ? "ok  " : "FAIL"}  401 body has plain error + message: ${JSON.stringify(r401.json)}`);
  if (!(r401.json?.error && r401.json?.message)) failed++;

  // admin routes: no token 401, student 403, admin ok
  const adminRoutes = [["POST", "/sync"], ["GET", "/admin/stats"], ["PATCH", `/admin/moderate/${oth}`], ["PATCH", "/expire"], ["DELETE", "/expired"], ["POST", "/admin/import-csv"]];
  for (const [m, u] of adminRoutes) {
    await expect("admin only", m, u, null, 401, {});
    await expect("admin only", m, u, student, 403, {});
  }
  await expect("admin", "POST", "/sync", admin, 200, {});
  await expect("admin", "GET", "/admin/stats", admin, 200);
  await expect("admin", "PATCH", `/admin/moderate/${oth}`, admin, 200, { featured: true });
  await expect("admin", "PATCH", "/expire", admin, 200, {});
  await expect("admin (now reachable)", "DELETE", "/expired", admin, 200);
  await expect("admin, no file", "POST", "/admin/import-csv", admin, 400, {});

  // ownership
  await expect("creator edits own", "PUT", `/${ev}`, creator, 200, { title: "renamed" });
  await expect("creator edits own (/event/)", "PUT", `/event/${ev}`, creator, 200, { title: "renamed 2" });
  await expect("creator, someone else's", "PUT", `/${oth}`, creator, 403, { title: "x" });
  await expect("student, imported event", "PUT", `/${imp}`, student, 403, { title: "x" });
  await expect("student deletes imported", "DELETE", `/${imp}`, student, 403);
  await expect("creator, own registrations", "GET", `/registrations/${ev}`, creator, 200);
  await expect("creator, others' registrations", "GET", `/registrations/${oth}`, creator, 403);
  await expect("student, imported registrations", "GET", `/registrations/${imp}`, student, 403);
  await expect("admin, imported registrations", "GET", `/registrations/${imp}`, admin, 200);
  await expect("admin edits imported", "PUT", `/${imp}`, admin, 200, { featured: true });
  await expect("admin edits someone's", "PUT", `/event/${ev}`, admin, 200, { pinned: true });

  // old app flow with a normal student token: same as before
  await expect("student feed", "GET", "/feed", student, 200);
  const reg = await expect("student registers", "POST", "/register", student, 201, { eventId: ev, studentName: "Sara", email: "sara@uni.pk", whatsapp: "0311", studentId: "Not provided" });
  const shapeOk = reg.json?.message && reg.json?.registration?.eventId && reg.json?.registration?.studentName === "Sara";
  results.push(`${shapeOk ? "ok  " : "FAIL"}  register response shape unchanged: ${Object.keys(reg.json || {}).join(", ")}`);
  if (!shapeOk) failed++;
  const dup = await expect("student registers twice", "POST", "/register", student, 400, { eventId: ev, studentName: "Sara", whatsapp: "0311" });
  if (!dup.json?.alreadyRegistered) { failed++; results.push("FAIL  duplicate no longer says alreadyRegistered"); }
  const mine = await expect("student my-registrations", "GET", "/my-registrations", student, 200);
  if (!Array.isArray(mine.json)) { failed++; results.push("FAIL  my-registrations is not an array"); }
  await expect("student my-registrations/details", "GET", "/my-registrations/details", student, 200);
  await expect("student cancels", "DELETE", `/register/${ev}`, student, 200);
  await expect("student creates (app post event)", "POST", "/create", student, 201, { title: "t", organizer: "o", city: "Karachi", type: "Workshops" });
  await expect("track-external stays as before", "POST", `/track-external/${imp}`, student, 200);
  await expect("track-external, no token (as before)", "POST", `/track-external/${imp}`, null, [200, 401, 500]);

  srv.close();
  console.log(`events routes: ${before ? "main (before)" : "working tree (after)"}\n`);
  results.forEach((l) => console.log(l));
  console.log(`\nsync=${calls.sync} expire=${calls.expire} purge=${calls.purge} (service calls that actually ran)`);
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
})();
