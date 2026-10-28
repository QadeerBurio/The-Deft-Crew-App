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
// auth middleware: findById(id).select(fields), awaited directly (before) or .lean() (a fresh copy)
const userQuery = (u) => { const p = Promise.resolve(u); p.lean = async () => (u ? { ...u } : null); return p; };
const User = { findById: (id) => ({ select: () => userQuery(users.get(String(id)) || null) }) };

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

// ── client + checks ───────────────────────────────────────────
let base;
const call = async (method, url, who, body) => {
  const headers = { "content-type": "application/json" };
  if (who) headers.authorization = `Bearer ${who.token}`;
  const res = await fetch(base + "/api/events" + url, { method, headers, body: body && method !== "GET" ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, headers: res.headers };
};
let failed = 0, passed = 0;
const ok = (cond, label, extra = "") => {
  if (cond) passed++; else failed++;
  console.log(`${cond ? "ok  " : "FAIL"}  ${label}${!cond && extra ? "   → " + extra : ""}`);
};
const short = (r) => `${r.status} ${JSON.stringify(r.json || r.text).slice(0, 160)}`;
const RECEIPT = "https://res.cloudinary.com/decaxpera/image/upload/v1/receipts/abc.jpg";
const ACCOUNTS = [
  { method: "easypaisa", accountTitle: "TDC Events", accountNumber: "0300 1234567" },
  { method: "bank", bankName: "Standard Chartered", accountTitle: "TDC", iban: "PK36 SCBL 0000 0011 2345 6702" },
];
const v2reg = (eventId, who, answers, extra = {}) => ({
  eventId, formVersion: 2,
  studentName: who.name, email: who.email, whatsapp: "0312-3456789", studentId: "21CS001",
  answers: { university: "MUET", ...answers }, ...extra,
});

(async () => {
  const srv = app.listen(0, "127.0.0.1");
  await new Promise((r) => srv.once("listening", r));
  base = `http://127.0.0.1:${srv.address().port}`;

  // seed: an OLD event and an OLD registration exactly as stored today (no v2 fields)
  const oldEventId = new mongoose.Types.ObjectId();
  stores.Event.push({ _id: oldEventId, title: "old meetup", type: "General", city: "Karachi", status: "approved", isExpired: false, prize: "TBD", deadline: "Limited spots", date: "TBA", teamSize: "1-4 Members", creator: admin._id, createdAt: new Date() });
  stores.Registration.push({ _id: new mongoose.Types.ObjectId(), eventId: oldEventId, studentName: "Old Reg", email: "old@uni.pk", whatsapp: "0300", studentId: "Not provided", userId: s5._id, createdAt: new Date() });

  console.log("── templates / create");
  const t = await call("GET", "/category-templates", null);
  ok(t.status === 200 && t.json.categories.map((c) => c.name).join() === "Hackathons,Workshops,Conferences,Competitions,Career Fairs,Concerts", "GET /category-templates is public with the 6 categories");

  const create = (body) => call("POST", "/create", admin, { organizer: "TDC", city: "Karachi", ...body });
  const events = {};
  const mk = async (name, body) => {
    const r = await create(body);
    ok(r.status === 201, `create ${name}`, short(r));
    events[name] = r.json;
    return r;
  };
  await mk("Hackathons", { title: "hack", type: "Hackathons", details: { teamSizeMin: 2, teamSizeMax: 4, tracks: ["AI", "Fintech"], prizePool: 100000 } });
  ok(events.Hackathons?.prize === "PKR 100,000" && events.Hackathons?.teamSize === "2-4 Members", "old text fields filled from details (prize, teamSize)", JSON.stringify({ p: events.Hackathons?.prize, t: events.Hackathons?.teamSize }));
  await mk("Workshops", { title: "ws", type: "Workshops", details: { level: "Beginner", durationHours: 3, certificate: "Yes" }, fee: 500, paymentAccounts: ACCOUNTS });
  await mk("Conferences", { title: "conf", type: "Conferences", details: { speakers: ["A", "B"] }, ticketTiers: [{ name: "Student", price: 0, quantity: 100 }, { name: "Pro", price: 2000, quantity: 20 }], paymentAccounts: ACCOUNTS });
  await mk("Competitions", { title: "comp", type: "Competitions", details: { domain: "Programming", mode: "Team", teamSizeMax: 3 } });
  await mk("Career Fairs", { title: "fair", type: "Career Fairs", details: { companies: ["Acme", "Globex"] }, capacity: 200 });
  await mk("Concerts", { title: "gig", type: "Concerts", details: { artists: ["Band"], maxTicketsPerStudent: 4, gateOpenTime: "18:30" }, ticketTiers: [{ name: "GA", price: 1500, quantity: 2 }, { name: "VIP", price: 5000, quantity: 10 }], paymentAccounts: ACCOUNTS });
  ok(!("paymentAccounts" in (events.Concerts || {})) && events.Concerts?.ticketTiers?.find((x) => x.name === "VIP")?.price === 5000, "create response: tier prices public, no payment accounts");

  let r = await create({ title: "x", type: "Workshops", fee: 300 });
  ok(r.status === 400 && /payment account/i.test(r.json?.message) && r.json?.error, "paid event without a payment account: 400", short(r));
  r = await create({ title: "x", type: "Hackathons", details: { teamSizeMin: 2, teamSizeMax: 4, secret: 1 } });
  ok(r.status === 400 && /not a field/.test(r.json?.message), "unknown details key rejected", short(r));
  r = await create({ title: "x", type: "Workshops", fee: 99.5, paymentAccounts: ACCOUNTS });
  ok(r.status === 400, "decimal fee rejected", short(r));
  r = await create({ title: "x", type: "Workshops", fee: 100, paymentAccounts: [{ method: "jazzcash", accountNumber: "12345" }] });
  ok(r.status === 400 && /mobile number/.test(r.json?.message), "bad JazzCash number rejected", short(r));
  r = await create({ title: "x", type: "Workshops", fee: 100, paymentAccounts: [{ method: "bank", bankName: "HBL", accountTitle: "TDC", iban: "PK00SCBL0000001123456702" }] });
  ok(r.status === 400 && /IBAN/.test(r.json?.message), "invalid IBAN rejected", short(r));
  // legacy create (today's admin web): no v2 fields → today's form, old app can register
  r = await create({ title: "legacy hack", type: "Hackathons", prize: "50k" });
  events.legacy = r.json;
  ok(r.status === 201 && !r.json.registrationForm, "legacy create keeps today's form (no registrationForm)", short(r));

  console.log("── old payload (today's app)");
  const oldBody = (eventId, who) => ({ eventId, studentName: who.name, email: who.email, whatsapp: "03001234567", studentId: "" });
  r = await call("POST", "/register", s1, oldBody(String(oldEventId), s1));
  ok(r.status === 201 && JSON.stringify(Object.keys(r.json)) === JSON.stringify(["message", "registration", "engagement"]) && ["_id", "eventId", "studentName", "email", "whatsapp", "studentId", "createdAt"].every((k) => k in r.json.registration), "old payload, old free event: 201, same reply fields", short(r));
  r = await call("POST", "/register", s1, oldBody(events.legacy._id, s1));
  ok(r.status === 201, "old payload, event created by today's admin web: 201", short(r));
  r = await call("POST", "/register", s1, oldBody(String(oldEventId), s1));
  ok(r.status === 400 && r.json?.alreadyRegistered === true && r.json?.error === "You have already registered for this event", "registering twice: today's alreadyRegistered reply", short(r));
  r = await call("POST", "/register", s1, oldBody(events.Workshops._id, s1));
  ok(r.status === 400 && r.json?.message === "update tdc to register for this event" && r.json?.error === r.json?.message, "paid event + old payload: plain 'update tdc' 400", short(r));
  r = await call("POST", "/register", s1, oldBody(events.Hackathons._id, s1));
  ok(r.status === 400 && r.json?.error === "update tdc to register for this event", "required extra questions + old payload: 'update tdc'", short(r));
  r = await call("POST", "/register", s1, oldBody(events.Conferences._id, s1));
  ok(r.status === 400 && r.json?.error === "update tdc to register for this event", "ticketed event + old payload: 'update tdc'", short(r));

  console.log("── new payload, each category");
  r = await call("POST", "/register", s2, v2reg(events.Hackathons._id, s2, { teamName: "Bits", teamMembers: "A a@x.pk\nB b@x.pk", skills: "React", portfolioUrl: "https://github.com/x" }));
  ok(r.status === 201 && r.json.registration.payment.status === "not_required", "Hackathons v2: 201, no payment", short(r));
  r = await call("POST", "/register", s2, v2reg(events.Workshops._id, s2, { experienceLevel: "Beginner" }, { payment: { method: "easypaisa", transactionId: "EP-12345678", receiptUrl: RECEIPT, amount: 1 } }));
  ok(r.status === 201 && r.json.registration.payment.status === "pending" && r.json.registration.payment.amount === 500, "Workshops v2 (paid): pending, amount 500 from the server (client sent 1)", short(r));
  r = await call("POST", "/register", s2, v2reg(events.Conferences._id, s2, { designation: "Student", organization: "MUET" }, { ticket: { tier: "Student", quantity: 1 } }));
  ok(r.status === 201 && r.json.registration.payment.status === "not_required" && r.json.registration.ticket.tier === "Student", "Conferences v2, free tier: not_required", short(r));
  r = await call("POST", "/register", s3, v2reg(events.Conferences._id, s3, { designation: "Engineer", organization: "Acme" }, { ticket: { tier: "pro", quantity: 1, price: 0 }, payment: { method: "bank", transactionId: "FT 2026 0001", receiptUrl: RECEIPT } }));
  ok(r.status === 201 && r.json.registration.payment.amount === 2000 && r.json.registration.ticket.tier === "Pro", "Conferences v2, paid tier: 2000 from the server (client price 0 ignored)", short(r));
  r = await call("POST", "/register", s2, v2reg(events.Competitions._id, s2, { entryCategory: "Team A", teamName: "x" }));
  ok(r.status === 201, "Competitions v2: 201", short(r));
  r = await call("POST", "/register", s2, v2reg(events["Career Fairs"]._id, s2, { degree: "BSCS", graduationYear: 2027, fieldOfInterest: "Backend", cvUrl: "https://drive.google.com/x" }));
  ok(r.status === 201, "Career Fairs v2: 201", short(r));
  r = await call("POST", "/register", s2, v2reg(events.Concerts._id, s2, {}, { ticket: { tier: "VIP", quantity: 3 }, payment: { method: "jazzcash", transactionId: "JC99887766", receiptUrl: RECEIPT, amount: 10 } }));
  ok(r.status === 403 || r.status === 400, "Concerts: method the event doesn't take (jazzcash) is rejected", short(r));
  r = await call("POST", "/register", s2, v2reg(events.Concerts._id, s2, {}, { ticket: { tier: "VIP", quantity: 3 }, payment: { method: "easypaisa", transactionId: "EP99887766", receiptUrl: RECEIPT, amount: 10 } }));
  ok(r.status === 201 && r.json.registration.payment.amount === 15000 && r.json.registration.ticket.quantity === 3, "Concerts v2: 3 x VIP = 15000 (client amount 10 ignored)", short(r));
  r = await call("POST", "/register", s3, v2reg(events.Concerts._id, s3, {}, { ticket: { tier: "VIP", quantity: 5 }, payment: { method: "easypaisa", transactionId: "EP11112222", receiptUrl: RECEIPT } }));
  ok(r.status === 400 && /1 to 4/.test(r.json?.message), "Concerts: more than maxTicketsPerStudent rejected", short(r));

  console.log("── form validation");
  r = await call("POST", "/register", s3, v2reg(events.Hackathons._id, s3, { teamMembers: "x", skills: "y" }));
  ok(r.status === 400 && /Team name is required/.test(r.json?.message) && r.json?.error, "required answer missing: 400 with the field name", short(r));
  r = await call("POST", "/register", s3, v2reg(events.Hackathons._id, s3, { teamName: "a", teamMembers: "x", skills: "y", hacked: "1" }));
  ok(r.status === 400 && /not a question/.test(r.json?.message), "unknown answer key rejected", short(r));
  r = await call("POST", "/register", s3, { ...v2reg(events.Hackathons._id, s3, { teamName: "a", teamMembers: "x", skills: "y" }), whatsapp: "12345" });
  ok(r.status === 400 && /Pakistani mobile/.test(r.json?.message), "v2 WhatsApp must be a Pakistani mobile", short(r));
  r = await call("POST", "/register", s3, v2reg(events.Workshops._id, s3, { experienceLevel: "Beginner" }, { payment: { method: "easypaisa", transactionId: "EP-55554444", receiptUrl: "https://evil.example.com/r.jpg" } }));
  ok(r.status === 400 && /receipt/i.test(r.json?.message), "receipt from another host rejected", short(r));
  r = await call("POST", "/register", s3, v2reg(events.Workshops._id, s3, { experienceLevel: "Beginner" }, { payment: { method: "easypaisa", transactionId: "EP-55554444", receiptUrl: "http://res.cloudinary.com/decaxpera/image/upload/x.jpg" } }));
  ok(r.status === 400, "receipt over http (not https) rejected", short(r));
  r = await call("POST", "/register", s3, v2reg(events.Workshops._id, s3, { experienceLevel: "Beginner" }, { payment: { method: "easypaisa", transactionId: "EP-55554444", receiptUrl: "https://res.cloudinary.com/othercloud/image/upload/x.jpg" } }));
  ok(r.status === 400, "receipt from another Cloudinary cloud rejected", short(r));

  console.log("── transaction IDs");
  r = await call("POST", "/register", s3, v2reg(events.Workshops._id, s3, { experienceLevel: "Advanced" }, { payment: { method: "easypaisa", transactionId: "ep-12345678", receiptUrl: RECEIPT } }));
  ok(r.status === 409 && /already been used/.test(r.json?.message), "same transaction ID (any case) on the same event: 409", short(r));
  const race = await Promise.all([s3, s4].map((w) => call("POST", "/register", w, v2reg(events.Workshops._id, w, { experienceLevel: "Beginner" }, { payment: { method: "easypaisa", transactionId: "RACE-0001", receiptUrl: RECEIPT } }))));
  ok(race.map((x) => x.status).sort().join() === "201,409", "two students racing with one transaction ID: one 201, one 409", race.map(short).join(" | "));

  console.log("── seats");
  r = await create({ title: "tiny", type: "Workshops", details: { level: "Beginner", durationHours: 1 }, capacity: 1 });
  const tiny = r.json._id;
  const last = await Promise.all([s1, s2].map((w) => call("POST", "/register", w, v2reg(tiny, w, { experienceLevel: "Beginner" }))));
  ok(last.map((x) => x.status).sort().join() === "201,409", "two concurrent registrations for the last seat: one 201, one 409", last.map(short).join(" | "));
  const winner = last[0].status === 201 ? s1 : s2, loser = winner === s1 ? s2 : s1;
  ok(stores.Event.find((e) => String(e._id) === tiny).registeredCount === 1, "registeredCount = 1");
  r = await call("DELETE", `/register/${tiny}`, winner);
  ok(r.status === 200 && stores.Event.find((e) => String(e._id) === tiny).registeredCount === 0, "cancel releases the seat", short(r));
  r = await call("POST", "/register", loser, v2reg(tiny, loser, { experienceLevel: "Beginner" }));
  ok(r.status === 201, "after cancel the other student gets the seat", short(r));
  // old payload also respects capacity
  r = await create({ title: "tiny old", type: "Seminar", capacity: 1 });
  const tinyOld = r.json._id;
  await call("POST", "/register", s1, oldBody(tinyOld, s1));
  r = await call("POST", "/register", s2, oldBody(tinyOld, s2));
  ok(r.status === 409 && r.json?.error === "This event is full.", "old payload on a full event: plain 'This event is full.'", short(r));
  // tier stock: GA has 2
  r = await call("POST", "/register", s4, v2reg(events.Concerts._id, s4, {}, { ticket: { tier: "GA", quantity: 2 }, payment: { method: "easypaisa", transactionId: "GA-000001", receiptUrl: RECEIPT } }));
  ok(r.status === 201, "GA x2 (all of the tier)", short(r));
  r = await call("POST", "/register", s5, v2reg(events.Concerts._id, s5, {}, { ticket: { tier: "GA", quantity: 1 }, payment: { method: "easypaisa", transactionId: "GA-000002", receiptUrl: RECEIPT } }));
  ok(r.status === 409 && /sold out/.test(r.json?.message), "GA sold out: 409 'GA tickets are sold out.'", short(r));
  // reject releases tier seats
  const gaReg = stores.Registration.find((x) => x.payment?.transactionId === "GA-000001");
  r = await call("PATCH", `/registrations/${gaReg._id}/payment`, admin, { action: "reject", reason: "amount didn't arrive" });
  const gaTier = stores.Event.find((e) => String(e._id) === events.Concerts._id).ticketTiers.find((x) => x.name === "GA");
  ok(r.status === 200 && gaTier.remaining === 2 && gaTier.sold === 0, "reject gives the 2 GA tickets back", short(r) + " tier=" + JSON.stringify(gaTier));
  const note = stores.Notification.find((n) => String(n.recipient) === s4.id);
  ok(!!note && note.title === "payment not accepted" && /amount didn't arrive/.test(note.description), "student gets a plain 'payment not accepted' notification", JSON.stringify(note));
  r = await call("POST", "/register", s5, v2reg(events.Concerts._id, s5, {}, { ticket: { tier: "GA", quantity: 2 }, payment: { method: "easypaisa", transactionId: "GA-000002", receiptUrl: RECEIPT } }));
  ok(r.status === 201, "after the reject another student buys the GA tickets", short(r));
  r = await call("PATCH", `/registrations/${gaReg._id}/payment-proof`, s4, { transactionId: "GA-000009", receiptUrl: RECEIPT });
  ok(r.status === 409 && /sold out/.test(r.json?.message), "rejected student resubmits but GA is gone: 409", short(r));
  r = await call("PATCH", `/registrations/${gaReg._id}/payment-proof`, s5, { transactionId: "GA-000010" });
  ok(r.status === 403, "someone else's payment proof: 403", short(r));

  console.log("── admin review / lists");
  const ws = stores.Registration.find((x) => x.payment?.transactionId === "EP-12345678");
  for (const [m, u] of [["GET", "/admin/registrations"], ["GET", "/all-registrations"], ["GET", "/admin/registrations.csv"], ["PATCH", `/registrations/${ws._id}/payment`]]) {
    const a = await call(m, u, null, { action: "verify" });
    const b = await call(m, u, s1, { action: "verify" });
    ok(a.status === 401 && b.status === 403, `${m} ${u.replace(/[a-f0-9]{24}/, ":id")}: no token 401, student 403`, `${a.status}/${b.status}`);
  }
  r = await call("PATCH", `/registrations/${ws._id}/payment`, admin, { action: "verify" });
  const wsAfter = stores.Registration.find((x) => String(x._id) === String(ws._id));
  ok(r.status === 200 && wsAfter.payment.status === "verified" && String(wsAfter.payment.reviewedBy) === admin.id && wsAfter.payment.reviewedAt, "admin verifies: status, reviewedBy, reviewedAt set", short(r));
  // first verify: the "ticket is ready" record (says the payment is verified) replaces "payment verified"
  ok(stores.Notification.some((n) => String(n.recipient) === s2.id && /ticket(s)? (is|are) ready/.test(n.title) && /payment verified/.test(n.description)), "student gets 'your ticket is ready' (payment verified)");
  r = await call("PATCH", `/registrations/${ws._id}/payment-proof`, s2, { transactionId: "EP-00000000" });
  ok(r.status === 400 && /already verified/.test(r.json?.message), "proof can't change a verified payment", short(r));
  r = await call("GET", "/admin/registrations?status=pending&limit=2&page=1", admin);
  ok(r.status === 200 && r.json.registrations.length <= 2 && r.json.total >= 3 && r.json.registrations.every((x) => x.payment.status === "pending" && x.eventTitle), "admin list: status filter, pagination, eventTitle", short(r));
  r = await call("GET", "/admin/registrations?q=ep-1234", admin);
  ok(r.status === 200 && r.json.total === 1, "admin list: search by transaction ID", short(r));
  r = await call("GET", "/admin/registrations?eventId=nope", admin);
  ok(r.status === 400, "admin list: bad eventId → 400", short(r));
  r = await call("GET", "/all-registrations", admin);
  const oldRow = r.json?.find((x) => x.studentName === "Old Reg");
  ok(r.status === 200 && Array.isArray(r.json) && oldRow?.eventTitle === "old meetup" && oldRow?.payment?.status === "not_required", "/all-registrations: array with eventTitle; old rows show not_required", short(r));

  console.log("── CSV");
  r = await call("POST", "/register", s4, v2reg(events.Hackathons._id, s4, { teamName: "+cmd|calc", teamMembers: "@SUM(1)", skills: "-1+1" }, { studentName: '=HYPERLINK("http://x","click")' }));
  ok(r.status === 201, "registration with formula-looking text", short(r));
  r = await call("GET", "/admin/registrations.csv", admin);
  const csv = r.text || "";
  ok(r.status === 200 && /text\/csv/.test(r.headers.get("content-type")), "GET /admin/registrations.csv (Express 5 path with a dot) works", short(r));
  ok(csv.includes(`"'=HYPERLINK(""http://x"",""click"")"`) && !/(^|,)"=HYPERLINK/m.test(csv), "=… is prefixed with ' and quotes are doubled");
  ok(csv.includes("teamName: +cmd|calc") && !/(^|,)"[+\-@]/m.test(csv.replace(/^\uFEFF/, "")), "no cell starts with = + - @");

  console.log("── privacy / old reads");
  for (const u of ["/feed", "/latest", "/category/Concerts", "/provider/manual", `/${events.Concerts._id}`, "/search?q=gig"]) {
    r = await call("GET", u, null);
    const body = JSON.stringify(r.json);
    const list = Array.isArray(r.json) ? r.json : r.json?.events || r.json?.results || [r.json];
    const gig = list.find((e) => e && e.title === "gig");
    ok(
      r.status === 200 && !body.includes("paymentAccounts") && !body.includes("03001234567") && !body.includes("accountNumber") &&
        gig && gig.ticketTiers.find((t) => t.name === "VIP").price === 5000 && "remaining" in gig.ticketTiers[0] && "maxPerStudent" in gig.ticketTiers[0] &&
        !("sold" in gig.ticketTiers[0]) && gig.fee?.currency === "PKR" && "seatsLeft" in gig && "registrationCloses" in gig,
      `public GET ${u.replace(/[a-f0-9]{24}/, ":id")}: prices, seatsLeft, registrationCloses; no payment accounts`,
      r.status + " " + body.slice(0, 200)
    );
  }
  r = await call("GET", "/feed", null);
  const feedList = Array.isArray(r.json) ? r.json : r.json?.events || [];
  const fair = feedList.find((e) => e.title === "fair");
  const hackPub = feedList.find((e) => e.title === "hack");
  ok(fair && fair.capacity === 200 && fair.seatsLeft === 200 - (fair.registeredCount || 0) && fair.registeredCount >= 1, "seatsLeft = capacity - registeredCount", JSON.stringify({ c: fair?.capacity, n: fair?.registeredCount, s: fair?.seatsLeft }));
  ok(hackPub && hackPub.seatsLeft === null && hackPub.fee.amount === 0, "unlimited event: seatsLeft null, fee 0");
  { const fj = JSON.stringify(feedList); ok(!fj.includes(s2.email) && !fj.includes("0312") && !fj.includes("21CS001") && !fj.includes("EP-12345678"), "public feed has counts only, no registrant data (emails, numbers, IDs, transaction IDs)"); }
  r = await call("GET", "/my-registrations", s2);
  const body = JSON.stringify(r.json);
  ok(r.status === 200 && Array.isArray(r.json) && !body.includes("paymentAccounts") && !body.includes("accountNumber"), "my-registrations: no payment accounts in the populated events");
  const conc = r.json?.find((x) => x.ticket?.tier === "VIP");
  ok(conc && conc.payment?.status === "pending" && conc.payment?.amount === 15000 && conc.studentName && conc.whatsapp, "my-registrations: payment status and ticket added, old fields kept", JSON.stringify(conc).slice(0, 200));
  r = await call("GET", "/my-registrations", s5);
  ok(r.json?.find((x) => x.studentName === "Old Reg")?.payment?.status === "not_required", "an old registration shows payment not_required");
  r = await call("GET", "/my-registrations/details", s2);
  ok(r.status === 200 && r.json.every((x) => x.event && x.registration && x.registration.payment), "my-registrations/details: { event, registration } with payment");
  r = await call("GET", `/${events.Concerts._id}/payment-info`, null);
  ok(r.status === 401, "payment-info without sign-in: 401", short(r));
  r = await call("GET", `/${events.Concerts._id}/payment-info`, s1);
  ok(r.status === 200 && r.json.paymentAccounts.length === 2 && r.json.paymentAccounts[0].accountNumber === "03001234567" && r.json.ticketTiers.find((x) => x.name === "VIP").price === 5000 && r.json.paid === true, "payment-info signed in: accounts (normalised), tier prices", short(r));
  r = await call("GET", `/${oldEventId}`, null);
  ok(r.status === 200 && r.json.prize === "TBD" && r.json.fee?.amount === 0 && r.json.title === "old meetup", "old event document still reads fine (defaults filled)", short(r));

  console.log("── university (base field) / which events need an app update");
  const s6 = students[5], s7 = students[6], s8 = students[7];
  // top-level university on a v2 payload
  r = await call("POST", "/register", s6, { ...v2reg(events["Career Fairs"]._id, s6, { degree: "BE", graduationYear: 2026, fieldOfInterest: "Data" }), answers: { degree: "BE", graduationYear: 2026, fieldOfInterest: "Data" }, university: "NED" });
  let saved = stores.Registration.find((x) => String(x.userId) === s6.id && String(x.eventId) === events["Career Fairs"]._id);
  ok(r.status === 201 && saved?.university === "NED" && r.json.registration.university === "NED", "v2: top-level university stored as its own field", short(r));
  // university inside answers (step 2 style) still works and is stored on the field too
  saved = stores.Registration.find((x) => String(x.userId) === s2.id && String(x.eventId) === events.Hackathons._id);
  ok(saved?.university === "MUET" && saved?.answers?.university === "MUET", "v2: university sent inside answers is stored on the field (copy kept in answers)", JSON.stringify({ u: saved?.university, a: saved?.answers?.university }));
  // v2 without university → required
  r = await call("POST", "/register", s7, { ...v2reg(events["Career Fairs"]._id, s7, {}), answers: { degree: "BE", graduationYear: 2026, fieldOfInterest: "Data" } });
  ok(r.status === 400 && /University is required/.test(r.json?.message), "v2 without university: 'University is required'", short(r));
  // v2 event whose only extras are optional: old payload registers (university doesn't block)
  r = await create({ title: "open ws", type: "Workshops", details: { level: "Beginner", durationHours: 2 }, registrationForm: [{ key: "experienceLevel", label: "Your experience", type: "select", options: ["Beginner", "Advanced"], required: false }] });
  const openWs = r.json;
  ok(r.status === 201 && openWs.registrationForm.find((f) => f.key === "university")?.store === "base", "category form: university saved as a base field", JSON.stringify(openWs.registrationForm?.find((f) => f.key === "university")));
  r = await call("POST", "/register", s7, oldBody(openWs._id, s7));
  saved = stores.Registration.find((x) => String(x.userId) === s7.id && String(x.eventId) === openWs._id);
  ok(r.status === 201 && !saved?.university, "old payload, v2 event with no required extras: 201 (university optional, not asked)", short(r));
  r = await call("POST", "/register", s8, { ...oldBody(openWs._id, s8), university: "IBA" });
  saved = stores.Registration.find((x) => String(x.userId) === s8.id && String(x.eventId) === openWs._id);
  ok(r.status === 201 && saved?.university === "IBA", "old payload that happens to send university: kept", short(r));
  // a form saved before this change (university under answers, required) doesn't block old builds
  const legacyFormId = new mongoose.Types.ObjectId();
  stores.Event.push({ _id: legacyFormId, title: "saved earlier", type: "Workshops", city: "Karachi", status: "approved", isExpired: false, creator: admin._id, createdAt: new Date(), fee: { amount: 0, currency: "PKR" }, ticketTiers: [], registeredCount: 0,
    registrationForm: [
      { key: "studentName", label: "Full name", type: "text", required: true, options: [], helpText: "", store: "base" },
      { key: "email", label: "University email", type: "email", required: true, options: [], helpText: "", store: "base" },
      { key: "whatsapp", label: "WhatsApp number", type: "phone", required: true, options: [], helpText: "", store: "base" },
      { key: "university", label: "University", type: "text", required: true, options: [], helpText: "", store: "answers" },
    ] });
  r = await call("POST", "/register", s8, oldBody(String(legacyFormId), s8));
  ok(r.status === 201, "form saved with university under answers: old payload not blocked", short(r));
  // which events still need an app update (old payload)
  const needs = async (label, eventId, who) => {
    const x = await call("POST", "/register", who, oldBody(eventId, who));
    ok(x.status === 400 && x.json?.error === "update tdc to register for this event", label, short(x));
  };
  await needs("old build, Hackathons from the template: update (teamName, teamMembers, skills are required extras)", events.Hackathons._id, s7);
  await needs("old build, Career Fairs from the template: update (degree, graduationYear, fieldOfInterest)", events["Career Fairs"]._id, s7);
  await needs("old build, Competitions from the template: update (entryCategory)", events.Competitions._id, s7);
  await needs("old build, paid Workshops: update (fee)", events.Workshops._id, s7);
  await needs("old build, Concerts: update (ticket tiers)", events.Concerts._id, s7);
  r = await create({ title: "conf no tiers", type: "Conferences", details: { speakers: ["A"] } });
  await needs("old build, Conferences without tiers: update (designation, organization)", r.json._id, s7);
  r = await create({ title: "conf optional", type: "Conferences", details: {}, registrationForm: [{ key: "designation", label: "Designation", type: "text", required: false }, { key: "ticketTier", label: "Ticket", type: "select", options: ["x"], required: true }] });
  const confOpt = r.json._id;
  r = await call("POST", "/register", s7, oldBody(confOpt, s7));
  ok(r.status === 201, "ticket fields alone (no tiers) don't block old builds", short(r));

  console.log("── update");
  r = await call("PUT", `/event/${events.Workshops._id}`, admin, { paymentAccounts: [] });
  ok(r.status === 400 && /payment account/.test(r.json?.message), "can't remove the last account from a paid event", short(r));
  r = await call("PUT", `/event/${events["Career Fairs"]._id}`, admin, { capacity: 0 });
  ok(r.status === 400, "capacity 0 rejected", short(r));
  r = await call("PUT", `/event/${tiny}`, admin, { registrationCloses: "2000-01-01" });
  r = await call("POST", "/register", s3, v2reg(tiny, s3, { experienceLevel: "Beginner" }));
  ok(r.status === 400 && /closed/.test(r.json?.message), "after registrationCloses: 'Registration for this event has closed.'", short(r));
  r = await call("PUT", `/event/${events.Hackathons._id}`, s1, { title: "mine now" });
  ok(r.status === 403, "student can't edit an admin's event (step 1 still holds)", short(r));

  srv.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
