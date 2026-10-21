// Events v2 check. Real routes/event.routes.js, real auth middleware, real JWTs, and the
// REAL Mongoose schemas (defaults, validation, toJSON) on top of an in-memory store.
// No database, no .env, nothing beyond 127.0.0.1.
const path = require("path");
const Module = require("module");

const SERVER = require("../paths").SERVER;
const reqServer = Module.createRequire(path.join(SERVER, "server.js"));
const express = reqServer("express");
const jwt = reqServer("jsonwebtoken");
const mongoose = reqServer("mongoose");
process.env.JWT_SECRET = "test-only-secret";

const realEventMod = reqServer("./models/Event");
const RealNotification = reqServer("./models/Notification");

// ── matcher over plain stored objects ─────────────────────────
const get = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : Array.isArray(a) && !/^\d+$/.test(k) ? a.map((x) => (x == null ? undefined : x[k])).flat() : a[k]), o);
const same = (a, b) => (a == null && b == null) || String(a) === String(b);
function evalExpr(e, doc) {
  if (typeof e === "string" && e.startsWith("$")) return get(doc, e.slice(1));
  if (e == null || typeof e !== "object") return e;
  const [op, args] = Object.entries(e)[0];
  const v = (x) => evalExpr(x, doc);
  switch (op) {
    case "$lte": { const [a, b] = args.map(v); return a != null && b != null && a <= b; }
    case "$add": return args.map(v).reduce((s, x) => s + (x || 0), 0);
    case "$ifNull": { const a = v(args[0]); return a == null ? v(args[1]) : a; }
    default: throw new Error("expr op not faked: " + op);
  }
}
function cond(val, c, doc) {
  if (c instanceof RegExp) return Array.isArray(val) ? val.some((x) => typeof x === "string" && c.test(x)) : typeof val === "string" && c.test(val);
  if (c && typeof c === "object" && !(c instanceof mongoose.Types.ObjectId) && !(c instanceof Date) && Object.keys(c).some((k) => k.startsWith("$"))) {
    return Object.entries(c).every(([op, a]) => {
      switch (op) {
        case "$ne": return !same(val, a);
        case "$in": return a.some((x) => (x === null ? val == null : same(val, x)));
        case "$gte": return val != null && val >= a;
        case "$gt": return val != null && val > a;
        case "$lte": return val != null && val <= a;
        case "$lt": return val != null && val < a;
        case "$type": return a === "string" ? typeof val === "string" : true;
        case "$exists": return (val !== undefined) === a;
        case "$elemMatch": return Array.isArray(val) && val.some((el) => match(el, a));
        default: throw new Error("op not faked: " + op);
      }
    });
  }
  if (Array.isArray(val) && !Array.isArray(c)) return val.some((x) => same(x, c));
  return same(val, c);
}
function match(doc, q) {
  return Object.entries(q || {}).every(([k, c]) => {
    if (k === "$or") return c.some((s) => match(doc, s));
    if (k === "$and") return c.every((s) => match(doc, s));
    if (k === "$expr") return !!evalExpr(c, doc);
    return cond(get(doc, k), c, doc);
  });
}
const clone = (o) => {
  const out = Array.isArray(o) ? [] : {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = v instanceof mongoose.Types.ObjectId || v instanceof Date || v == null || typeof v !== "object" ? v : clone(v);
  }
  return out;
};

// ── fake model around a real one ─────────────────────────────
const stores = {};
let M_ticketClash = () => {};
const setPath = (o, p, v) => { const parts = p.split("."); const last = parts.pop(); const t = parts.reduce((a, k) => (a[k] == null ? (a[k] = {}) : a[k]), o); if (v === undefined) delete t[last]; else t[last] = v; };
function fake(Real, { hidden = [], unique = [] } = {}) {
  const store = (stores[Real.modelName] = []);
  const persist = async (doc) => {
    await doc.validate();
    const raw = doc.toObject({ depopulate: true, transform: false, virtuals: false });
    for (const keys of unique) {
      const vals = keys.map((k) => get(raw, k));
      if (vals.some((v) => v == null || (keys.includes("payment.transactionId") && typeof get(raw, "payment.transactionId") !== "string"))) continue;
      const clash = store.find((o) => !same(o._id, raw._id) && keys.every((k, i) => same(get(o, k), vals[i])));
      if (clash) {
        const e = new Error("E11000 duplicate key");
        e.code = 11000;
        e.keyPattern = Object.fromEntries(keys.map((k) => [k, 1]));
        throw e;
      }
    }
    ticketClash(raw);
    const i = store.findIndex((o) => same(o._id, raw._id));
    if (i >= 0) store[i] = raw;
    else store.push(raw);
    return doc;
  };
  function ticketClash(raw) {
    const mine = (raw.tickets || []).map((t) => t && t.code).filter((c) => typeof c === "string");
    if (!mine.length) return;
    const clash = store.some((o) => !same(o._id, raw._id) && (o.tickets || []).some((t) => mine.includes(t.code)));
    if (clash || new Set(mine).size !== mine.length) {
      const e = new Error("E11000 duplicate key error index: tickets.code_1");
      e.code = 11000;
      e.keyPattern = { "tickets.code": 1 };
      throw e;
    }
  }
  if (Real.modelName === "Registration") M_ticketClash = ticketClash;
  const wrap = (doc) => { doc.save = () => persist(doc); return doc; };
  const hydrate = (raw, sel) => {
    const r = clone(raw);
    for (const h of hidden) if (!(sel || "").includes("+" + h)) delete r[h];
    return wrap(Real.hydrate(r));
  };
  class Q {
    constructor(rows, single) { this.rows = rows; this.single = single; this.sel = ""; this.pop = null; this.srt = null; this.sk = 0; this.lim = 0; }
    select(s) { this.sel = s; return this; }
    sort(s) { this.srt = s; return this; }
    skip(n) { this.sk = n; return this; }
    limit(n) { this.lim = n; return this; }
    lean() { return this; }
    populate(p) { this.pop = p; return this; }
    async exec() {
      let rows = this.rows.slice();
      if (this.srt && this.srt.createdAt) rows.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * this.srt.createdAt);
      if (this.sk) rows = rows.slice(this.sk);
      if (this.lim) rows = rows.slice(0, this.lim);
      let docs = rows.map((r) => hydrate(r, this.sel));
      if (this.pop) {
        const field = typeof this.pop === "string" ? this.pop : this.pop.path;
        docs = docs.map((d) => {
          const ev = stores.Event.find((e) => same(e._id, d[field]));
          if (ev) d[field] = REGISTRY.Event.hydrateDoc(ev);
          return d;
        });
      }
      return this.single ? docs[0] || null : docs;
    }
    then(res, rej) { return this.exec().then(res, rej); }
  }
  function M(data) { return wrap(new Real(data)); }
  M.modelName = Real.modelName;
  M.hydrateDoc = (raw) => hydrate(raw, "");
  M.find = (q) => new Q(store.filter((d) => match(d, q)), false);
  M.findOne = (q) => new Q(store.filter((d) => match(d, q)).slice(0, 1), true);
  M.findById = (id) => new Q(store.filter((d) => same(d._id, id)).slice(0, 1), true);
  M.countDocuments = async (q) => store.filter((d) => match(d, q)).length;
  M.aggregate = async () => [];
  M.distinct = async (f) => [...new Set(store.map((d) => d[f]).flat().filter(Boolean))];
  M.create = async (data) => persist(new Real(data));
  M.deleteMany = async (q) => { let n = 0; for (let i = store.length - 1; i >= 0; i--) if (match(store[i], q)) { store.splice(i, 1); n++; } return { deletedCount: n }; };
  M.findOneAndDelete = async (q) => { const i = store.findIndex((d) => match(d, q)); return i < 0 ? null : hydrate(store.splice(i, 1)[0], ""); };
  M.findByIdAndDelete = async (id) => M.findOneAndDelete({ _id: id });
  // atomic: match + apply with no await in between (like a single MongoDB update)
  const applyUpdate = (q, u) => {
    const doc = store.find((d) => match(d, q));
    if (!doc) return null;
    let pos = -1;
    for (const [k, c] of Object.entries(q)) if (c && c.$elemMatch) pos = get(doc, k).findIndex((el) => match(el, c.$elemMatch));
    if (u.$set) {
      const next = clone(doc);
      for (const [p, v] of Object.entries(u.$set)) setPath(next, p, v && typeof v === "object" && !(v instanceof Date) && !(v instanceof mongoose.Types.ObjectId) ? JSON.parse(JSON.stringify(v), (k, x) => (typeof x === "string" && /^\d{4}-\d\d-\d\dT/.test(x) ? new Date(x) : x)) : v);
      M_ticketClash(next);
      for (const [p, v] of Object.entries(u.$set)) setPath(doc, p, get(next, p));
    }
    for (const p of Object.keys(u.$unset || {})) setPath(doc, p, undefined);
    for (const [p, n] of Object.entries(u.$inc || {})) {
      const parts = p.split(".").map((x) => (x === "$" ? String(pos) : x));
      const last = parts.pop();
      const tgt = parts.reduce((a, k) => a[k], doc);
      tgt[last] = (tgt[last] || 0) + n;
    }
    return doc;
  };
  M.findOneAndUpdate = async (q, u) => { const d = applyUpdate(q, u); return d ? hydrate(d, "") : null; };
  M.updateOne = async (q, u) => ({ modifiedCount: applyUpdate(q, u) ? 1 : 0 });
  M.store = store;
  return M;
}
const REGISTRY = {};
const Event = (REGISTRY.Event = fake(realEventMod.Event, { hidden: ["paymentAccounts"] }));
const Registration = fake(realEventMod.Registration, { unique: [["eventId", "userId"], ["eventId", "payment.transactionId"]] });
const EventNotification = fake(realEventMod.EventNotification);
const Notification = fake(RealNotification);
const users = new Map();
const User = { findById: (id) => ({ select: async () => users.get(String(id)) || null }) };

const MOCKS = {
  "../models/Event": { Event, Registration, EventNotification },
  "../models/Notification": Notification,
  "../models/User": User,
  "../services/events/eventAggregator": { runAggregation: async () => ({}), getAggregationStats: () => ({}) },
  "../services/events/eventCleanup": { expirePastEvents: async () => 0, purgeExpiredEvents: async () => 0 },
  "../services/events/csvImporter": { importEventsToDatabase: async () => ({ added: 0, skipped: 0 }) },
  "../services/engagement": { track: async () => ({ popups: [] }) },
};
const sent = { mail: [], push: [] };
const mail = { failNext: false };
const SERVICE_MOCKS = {
  "../../models/Event": { Event, Registration, EventNotification },
  "../../models/Notification": Notification,
  "../../utils/mailer": { sendMail: async (m) => { if (mail.failNext) { mail.failNext = false; throw new Error("Email send failed (resend): test"); } sent.mail.push(m); return { ok: true }; } },
  "../../utils/pushNotification": { sendToUser: async (userId, title, body, data) => { sent.push.push({ userId: String(userId), title, body, data }); return { sent: true, count: 1 }; } },
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request in MOCKS && parent && parent.filename && parent.filename.includes(path.join("server", "routes"))) return MOCKS[request];
  if (request in SERVICE_MOCKS && parent && parent.filename && parent.filename.includes(path.join("services", "events", "tickets"))) return SERVICE_MOCKS[request];
  if (request === "../models/User" && parent && parent.filename && parent.filename.includes("middleware")) return User;
  return origLoad.call(this, request, parent, isMain);
};
const router = reqServer("./routes/event.routes.js");
const app = express();
app.use(express.json());
app.use("/api/events", router);

// ── people ────────────────────────────────────────────────────
const mkUser = (name, role) => {
  const _id = new mongoose.Types.ObjectId();
  const u = { _id, id: String(_id), name, email: `${name}@uni.edu.pk`, role };
  users.set(String(_id), u);
  return { ...u, token: jwt.sign({ id: String(_id), role }, process.env.JWT_SECRET) };
};
const admin = mkUser("admin", "admin");
const students = Array.from({ length: 8 }, (_, i) => mkUser(`student${i + 1}`, "student"));
const [s1, s2, s3, s4, s5] = students;


// ── exported for other tests (app logic test) ─────────────────
module.exports = {
  app, admin, students, stores, mongoose, sent, mail, Registration, Event, Notification,
  tickets: reqServer("./services/events/tickets"),
  start: async () => {
    const srv = app.listen(0, "127.0.0.1");
    await new Promise((r) => srv.once("listening", r));
    const base = `http://127.0.0.1:${srv.address().port}`;
    const call = async (method, url, who, body) => {
      const headers = { "content-type": "application/json" };
      if (who) headers.authorization = `Bearer ${who.token}`;
      const res = await fetch(base + "/api/events" + url, { method, headers, body: body && method !== "GET" ? JSON.stringify(body) : undefined });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      return { status: res.status, json, text };
    };
    return { srv, base, call };
  },
};
