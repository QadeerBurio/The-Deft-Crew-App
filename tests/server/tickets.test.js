// Tickets check. Real routes/event.routes.js + services/events/tickets.js + real schemas on the
// in-memory fake models (harness.js). Mail and push are recorded, never sent.
const crypto = require("crypto");
const fs = require("fs");
const H = require("../harness/tickets-harness.js");
const { admin, students, stores, mongoose, sent, mail, tickets: T } = H;
const [s1, s2, s3, s4, s5, s6] = students;

let failed = 0, passed = 0;
const ok = (cond, label, extra = "") => {
  if (cond) passed++; else failed++;
  console.log(`${cond ? "ok  " : "FAIL"}  ${label}${!cond && extra ? "   → " + extra : ""}`);
};
const short = (r) => `${r.status} ${JSON.stringify(r.json || r.text).slice(0, 200)}`;
const tick = () => new Promise((r) => setTimeout(r, 60));
const RECEIPT = "https://res.cloudinary.com/decaxpera/image/upload/v1/receipts/abc.jpg";
const ACCOUNTS = [{ method: "easypaisa", accountTitle: "TDC Events", accountNumber: "0300 1234567" }];
const v2reg = (eventId, who, extra = {}) => ({
  eventId, formVersion: 2,
  studentName: who.name, email: who.email, whatsapp: "0312-3456789", studentId: "21CS001",
  answers: { university: "MUET" }, ...extra,
});
const pay = (txn) => ({ method: "easypaisa", transactionId: txn, receiptUrl: RECEIPT });
const regOf = (who, eventId) => stores.Registration.find((x) => String(x.userId) === String(who._id) && String(x.eventId) === String(eventId));
const notifsFor = (regId) => stores.Notification.filter((n) => n.metadata && String(n.metadata.registrationId) === String(regId));

(async () => {
  const { srv, call, base } = await H.start();
  const create = (body) => call("POST", "/create", admin, { organizer: "TDC", city: "Karachi", ...body });

  // events
  let r = await create({
    title: "night gig", type: "Concerts", date: "12 Nov 2026", location: "Expo Centre",
    details: { artists: ["Band"], maxTicketsPerStudent: 4, gateOpenTime: "18:30" },
    ticketTiers: [{ name: "GA", price: 1500, quantity: 50 }, { name: "VIP", price: 5000, quantity: 10 }],
    paymentAccounts: ACCOUNTS,
  });
  ok(r.status === 201, "create paid concert", short(r));
  const gig = r.json._id;
  r = await create({ title: "free talk", type: "Seminar" });
  const free = r.json._id;
  r = await create({ title: "online class", type: "Seminar", location: "https://meet.example.com/abc" });
  const online = r.json._id;

  console.log("── free event: ticket at registration");
  r = await call("POST", "/register", s1, v2reg(free, s1));
  ok(r.status === 201 && !("ticketsReady" in r.json), "free register → 201, reply unchanged", short(r));
  await tick();
  let reg = regOf(s1, free);
  ok(reg.tickets?.length === 1 && T.TICKET_CODE_RE.test(reg.tickets[0].code) && reg.tickets[0].status === "valid" && reg.tickets[0].seat === 1 && reg.tickets[0].of === 1, "one valid ticket, code TDC-XXXX-XXXX", JSON.stringify(reg.tickets));
  ok(notifsFor(reg._id).length === 1 && notifsFor(reg._id)[0].title === "your ticket is ready" && notifsFor(reg._id)[0].metadata.ticketRegistrationId === String(reg._id) && notifsFor(reg._id)[0].metadata.route === "Events", "one in-app record: 'your ticket is ready', opens Events with ticketRegistrationId", JSON.stringify(notifsFor(reg._id)));
  ok(sent.mail.length === 1 && sent.mail[0].to === s1.email && sent.mail[0].html.includes(reg.tickets[0].code) && sent.mail[0].html.includes("<table"), "ticket email sent once with the code and a table QR", sent.mail.length);
  ok(!!reg.ticketDelivery?.emailedAt && !!reg.ticketDelivery?.notifiedAt, "delivery times stored");
  // old app payload on a free event: also a ticket (it simply never shows it)
  r = await call("POST", "/register", s2, { eventId: free, studentName: s2.name, whatsapp: "0300", email: s2.email });
  ok(r.status === 201 && regOf(s2, free).tickets?.length === 1, "old payload on a free event → ticket too", short(r));
  await tick();

  console.log("── paid: pending has no ticket");
  r = await call("POST", "/register", s3, v2reg(gig, s3, { ticket: { tier: "GA", quantity: 1 }, payment: { ...pay("TXN-300001"), amount: 1 } }));
  ok(r.status === 201, "paid register → pending", short(r));
  reg = regOf(s3, gig);
  ok(!reg.tickets && reg.payment.amount === 1500, "pending: no tickets; amount from the tier (client's 1 ignored)", JSON.stringify(reg.payment));
  r = await call("GET", `/registrations/${reg._id}/ticket`, s3);
  ok(r.status === 404 && r.json.noTicket && r.json.paymentStatus === "pending" && /verified/.test(r.json.error), "GET ticket while pending → 404 'comes when the payment is verified'", short(r));

  console.log("── verify creates exactly one ticket");
  const mailBefore = sent.mail.length;
  r = await call("PATCH", `/registrations/${reg._id}/payment`, admin, { action: "verify" });
  await tick();
  reg = regOf(s3, gig);
  ok(r.status === 200 && reg.tickets?.length === 1 && r.json.registration.tickets?.length === 1, "verify → 1 ticket (also in the admin response)", short(r));
  const code3 = reg.tickets[0].code;
  ok(notifsFor(reg._id).length === 1 && notifsFor(reg._id)[0].title === "your ticket is ready", "one record: 'your ticket is ready' (replaces 'payment verified')", JSON.stringify(notifsFor(reg._id).map((n) => n.title)));
  ok(sent.mail.length === mailBefore + 1, "one email");
  r = await call("PATCH", `/registrations/${reg._id}/payment`, admin, { action: "verify" });
  reg = regOf(s3, gig);
  ok(r.status === 400 && reg.tickets.length === 1 && reg.tickets[0].code === code3, "verify twice → 400, still the same single ticket", short(r));

  console.log("── reject then verify again: same ticket, no second one");
  r = await call("PATCH", `/registrations/${reg._id}/payment`, admin, { action: "reject", reason: "wrong amount" });
  reg = regOf(s3, gig);
  ok(r.status === 200 && reg.tickets.length === 1 && reg.tickets[0].status === "cancelled" && reg.tickets[0].cancelReason === "payment_rejected", "reject → ticket cancelled (payment_rejected)", JSON.stringify(reg.tickets));
  r = await call("GET", `/registrations/${reg._id}/ticket`, s3);
  ok(r.status === 404 && r.json.paymentStatus === "rejected", "rejected → no ticket shown", short(r));
  r = await call("PATCH", `/registrations/${reg._id}/payment`, admin, { action: "verify" });
  await tick();
  reg = regOf(s3, gig);
  ok(r.status === 200 && reg.tickets.length === 1 && reg.tickets[0].code === code3 && reg.tickets[0].status === "valid", "verify again → the same code, valid again", JSON.stringify(reg.tickets));
  ok(notifsFor(reg._id).filter((n) => n.title === "your ticket is ready").length === 1, "'ticket is ready' record still only once");

  console.log("── reject first, then verify: first issue");
  r = await call("POST", "/register", s4, v2reg(gig, s4, { ticket: { tier: "GA", quantity: 1 }, payment: pay("TXN-400001") }));
  let reg4 = regOf(s4, gig);
  await call("PATCH", `/registrations/${reg4._id}/payment`, admin, { action: "reject" });
  ok(!regOf(s4, gig).tickets, "rejected (never verified) → no ticket");
  r = await call("PATCH", `/registrations/${reg4._id}/payment`, admin, { action: "verify" });
  await tick();
  reg4 = regOf(s4, gig);
  ok(r.status === 200 && reg4.tickets?.length === 1 && notifsFor(reg4._id).filter((n) => n.title === "your ticket is ready").length === 1, "then verify → exactly 1 ticket, 1 record", short(r));

  console.log("── multi-seat");
  r = await call("POST", "/register", s5, v2reg(gig, s5, { ticket: { tier: "VIP", quantity: 3 }, payment: pay("TXN-500001") }));
  let reg5 = regOf(s5, gig);
  await call("PATCH", `/registrations/${reg5._id}/payment`, admin, { action: "verify" });
  await tick();
  reg5 = regOf(s5, gig);
  const codes5 = reg5.tickets.map((t) => t.code);
  ok(reg5.tickets.length === 3 && new Set(codes5).size === 3 && reg5.tickets.every((t, i) => t.seat === i + 1 && t.of === 3 && t.tier === "VIP" && t.status === "valid"), "VIP × 3 → 3 tickets, seats 1..3 of 3, own codes", JSON.stringify(reg5.tickets));
  ok(notifsFor(reg5._id).length === 1 && notifsFor(reg5._id)[0].title === "your tickets are ready", "one record for the 3 tickets: 'your tickets are ready'");

  console.log("── access");
  r = await call("GET", `/registrations/${reg5._id}/ticket`, s5);
  const v = r.json?.ticket || {};
  ok(r.status === 200 && v.event.title === "night gig" && v.event.category === "Concerts" && v.event.date === "12 Nov 2026" && v.event.time === "18:30" && v.event.venue === "Expo Centre" && v.event.city === "Karachi" && v.attendee === s5.name && v.tier === "VIP" && v.amountPaid === 15000 && v.paymentStatus === "paid" && v.tickets.length === 3, "owner → 200 with the stored event and registration data", short(r));
  ok(!r.text.includes("accountNumber") && !r.text.includes("0300 1234567") && !r.text.includes("paymentAccounts") && !r.text.includes("transactionId"), "no payment accounts or transaction id in the ticket");
  r = await call("GET", `/registrations/${reg5._id}/ticket`, s6);
  ok(r.status === 404, "another student → 404", short(r));
  r = await call("GET", `/registrations/${reg5._id}/ticket`, admin);
  ok(r.status === 200 && r.json.ticket.tickets.length === 3, "admin → 200", short(r));
  r = await call("GET", `/registrations/${reg5._id}/ticket`, null);
  ok(r.status === 401, "signed out → 401", short(r));
  r = await call("GET", `/registrations/nope/ticket`, s5);
  ok(r.status === 404, "bad id → 404");
  r = await call("GET", `/registrations/${regOf(s1, free)._id}/ticket`, s1);
  ok(r.status === 200 && r.json.ticket.paymentStatus === "free" && r.json.ticket.amountPaid === 0 && !("date" in r.json.ticket.event) && !("venue" in r.json.ticket.event), "free ticket: 'free', placeholder date / venue left out", short(r));
  r = await call("POST", "/register", s6, v2reg(online, s6));
  r = await call("GET", `/registrations/${regOf(s6, online)._id}/ticket`, s6);
  ok(r.status === 200 && r.json.ticket.event.onlineLink === "https://meet.example.com/abc" && !("venue" in r.json.ticket.event), "online event: link, no venue", short(r));

  console.log("── admin cancel / restore / resend");
  const c0 = codes5[0];
  r = await call("PATCH", `/registrations/${reg5._id}/tickets/${c0}`, s5, { action: "cancel" });
  ok(r.status === 403, "student can't cancel → 403", short(r));
  r = await call("PATCH", `/registrations/${reg5._id}/tickets/${c0.toLowerCase()}`, admin, { action: "cancel" });
  reg5 = regOf(s5, gig);
  ok(r.status === 200 && reg5.tickets[0].status === "cancelled" && reg5.tickets[0].cancelReason === "admin" && reg5.tickets[1].status === "valid", "admin cancels seat 1 only", short(r));
  r = await call("GET", `/registrations/${reg5._id}/ticket`, s5);
  ok(r.json.ticket.tickets[0].status === "cancelled", "owner sees seat 1 as cancelled");
  // reject + verify must not bring back a ticket the admin cancelled
  await call("PATCH", `/registrations/${reg5._id}/payment`, admin, { action: "reject" });
  await call("PATCH", `/registrations/${reg5._id}/payment`, admin, { action: "verify" });
  reg5 = regOf(s5, gig);
  ok(reg5.tickets[0].status === "cancelled" && reg5.tickets[1].status === "valid" && reg5.tickets.length === 3, "reject + verify keeps the admin-cancelled seat cancelled", JSON.stringify(reg5.tickets.map((t) => t.status)));
  r = await call("PATCH", `/registrations/${reg5._id}/tickets/${c0}`, admin, { action: "restore" });
  ok(r.status === 200 && regOf(s5, gig).tickets[0].status === "valid", "restore → valid", short(r));
  r = await call("PATCH", `/registrations/${reg5._id}/tickets/TDC-AAAA-AAAA`, admin, { action: "cancel" });
  ok(r.status === 404, "unknown code → 404");
  const recBefore = stores.Notification.length, mailB = sent.mail.length, pushB = sent.push.length;
  r = await call("POST", `/registrations/${reg5._id}/tickets/resend`, admin, {});
  ok(r.status === 200 && sent.mail.length === mailB + 1 && sent.push.length === pushB + 1 && stores.Notification.length === recBefore && /push: sent/.test(r.json.message) && /email: sent/.test(r.json.message), "resend → 1 email + 1 push, no new in-app record", short(r));
  const p = sent.push[sent.push.length - 1];
  ok(p.data.type === "event" && p.data.ticketRegistrationId === String(reg5._id) && p.data.route === "Events" && p.data.params.ticketRegistrationId === String(reg5._id), "push data: route Events + ticketRegistrationId (old builds open events)", JSON.stringify(p.data));
  r = await call("POST", `/registrations/${reg5._id}/tickets/resend`, s5, {});
  ok(r.status === 403, "student can't resend → 403");
  r = await call("POST", `/registrations/${regOf(s3, gig)._id}/tickets/resend`, admin, { email: false });
  ok(r.status === 200 && !/email/.test(r.json.message), "resend push only", short(r));
  mail.failNext = true;
  r = await call("POST", `/registrations/${regOf(s4, gig)._id}/tickets/resend`, admin, { push: false });
  ok(r.status === 200 && /email: failed/.test(r.json.message) && /test/.test(regOf(s4, gig).ticketDelivery.emailError), "email failure: reported and stored, not thrown", short(r));

  console.log("── admin list / CSV / search by code");
  r = await call("GET", `/admin/registrations?q=${encodeURIComponent(codes5[1])}`, admin);
  ok(r.status === 200 && r.json.registrations.length === 1 && String(r.json.registrations[0]._id) === String(reg5._id) && r.json.registrations[0].tickets.length === 3, "search by ticket code finds the registration", short(r));
  r = await call("GET", `/admin/registrations.csv`, admin);
  ok(r.status === 200 && r.text.includes('"Ticket codes","Ticket status"') && r.text.includes(codes5.join(" / ")) && r.text.includes('"valid / valid / valid"'), "CSV has ticket codes and status");
  r = await call("GET", `/my-registrations`, s5);
  ok(r.status === 200 && Array.isArray(r.json) && r.json[0].tickets?.length === 3 && r.json[0].eventId?.title === "night gig", "my-registrations: same array shape, plus tickets", short(r));

  console.log("── once only under a race, and code uniqueness");
  const raceId = new mongoose.Types.ObjectId();
  stores.Registration.push({ _id: raceId, eventId: new mongoose.Types.ObjectId(gig), studentName: "Race", email: "race@uni.pk", whatsapp: "0300", studentId: "x", userId: s6._id, ticket: { tier: "GA", quantity: 2 }, seats: 2, payment: { status: "verified", amount: 3000 }, createdAt: new Date() });
  const both = await Promise.all([T.issueTickets(raceId), T.issueTickets(raceId), T.issueTickets(raceId)]);
  const raceReg = stores.Registration.find((x) => String(x._id) === String(raceId));
  ok(both.filter((x) => x.issued).length === 1 && raceReg.tickets.length === 2, "3 issues at once → 1 issue, 2 tickets", JSON.stringify(both.map((x) => x.reason || "issued")));
  // force a clash: the first codes generated equal an existing code
  const taken = raceReg.tickets[0].code;
  const seq = [...taken.replace(/-/g, "").slice(3)].map((ch) => "23456789ABCDEFGHJKLMNPQRSTUVWXYZ".indexOf(ch));
  const realRandomInt = crypto.randomInt;
  let calls = 0;
  crypto.randomInt = (n) => (calls++ < seq.length ? seq[calls - 1] : realRandomInt(n));
  const clashId = new mongoose.Types.ObjectId();
  stores.Registration.push({ _id: clashId, eventId: new mongoose.Types.ObjectId(gig), studentName: "Clash", email: "c@uni.pk", whatsapp: "0300", studentId: "x", userId: s4._id, payment: { status: "verified", amount: 1500 }, createdAt: new Date() });
  const cl = await T.issueTickets(clashId);
  crypto.randomInt = realRandomInt;
  const clReg = stores.Registration.find((x) => String(x._id) === String(clashId));
  ok(cl.issued && clReg.tickets[0].code !== taken && calls > seq.length, "code clash → retried with a new code", `${clReg.tickets?.[0]?.code} vs ${taken}`);
  crypto.randomInt = () => 0; // every code TDC-2222-2222
  const a = new mongoose.Types.ObjectId(), b = new mongoose.Types.ObjectId();
  for (const id of [a, b]) stores.Registration.push({ _id: id, eventId: new mongoose.Types.ObjectId(free), studentName: "Z", email: "z@uni.pk", whatsapp: "0300", studentId: "x", userId: new mongoose.Types.ObjectId(), payment: { status: "not_required" }, createdAt: new Date() });
  await T.issueTickets(a);
  let threw = null;
  try { await T.issueTickets(b); } catch (e) { threw = e.message; }
  crypto.randomInt = realRandomInt;
  ok(/Could not issue/.test(threw || "") && !stores.Registration.find((x) => String(x._id) === String(b)).tickets, "always clashing → gives up after 5 tries, nothing half-written", threw);
  const many = new Set(Array.from({ length: 20000 }, T.newTicketCode));
  ok(many.size === 20000 && [...many].every((c) => T.TICKET_CODE_RE.test(c)), "20,000 codes: all unique, all TDC-XXXX-XXXX (no 0/O/1/I)");

  console.log("── backfill (old verified registrations)");
  const oldIds = [0, 1, 2].map(() => new mongoose.Types.ObjectId());
  stores.Registration.push({ _id: oldIds[0], eventId: new mongoose.Types.ObjectId(gig), studentName: "Old V", email: "ov@uni.pk", whatsapp: "0300", studentId: "x", userId: new mongoose.Types.ObjectId(), ticket: { tier: "GA", quantity: 2 }, payment: { status: "verified", amount: 3000 }, createdAt: new Date() });
  stores.Registration.push({ _id: oldIds[1], eventId: new mongoose.Types.ObjectId(free), studentName: "Old F", email: "of@uni.pk", whatsapp: "0300", studentId: "x", userId: new mongoose.Types.ObjectId(), createdAt: new Date() });
  stores.Registration.push({ _id: oldIds[2], eventId: new mongoose.Types.ObjectId(gig), studentName: "Old P", email: "op@uni.pk", whatsapp: "0300", studentId: "x", userId: new mongoose.Types.ObjectId(), payment: { status: "pending", amount: 1500 }, createdAt: new Date() });
  const snap = { mail: sent.mail.length, push: sent.push.length, rec: stores.Notification.length };
  r = await call("POST", `/admin/tickets/backfill`, s1, {});
  ok(r.status === 403, "student → 403");
  r = await call("POST", `/admin/tickets/backfill`, admin, {});
  ok(r.status === 200 && r.json.dryRun === true && r.json.verified === 1 && r.json.issued === 0 && !stores.Registration.find((x) => String(x._id) === String(oldIds[0])).tickets, "dry run by default: counts (1 verified), creates nothing", short(r));
  r = await call("POST", `/admin/tickets/backfill`, admin, { apply: true });
  const ov = stores.Registration.find((x) => String(x._id) === String(oldIds[0]));
  ok(r.status === 200 && r.json.issued === 1 && ov.tickets?.length === 2 && !stores.Registration.find((x) => String(x._id) === String(oldIds[1])).tickets && !stores.Registration.find((x) => String(x._id) === String(oldIds[2])).tickets, "apply: verified only (2 seats), not free, not pending", short(r));
  r = await call("POST", `/admin/tickets/backfill`, admin, { apply: true, includeFree: true });
  ok(r.status === 200 && stores.Registration.find((x) => String(x._id) === String(oldIds[1])).tickets?.length === 1 && !stores.Registration.find((x) => String(x._id) === String(oldIds[2])).tickets, "includeFree: the old free one too; pending never", short(r));
  r = await call("POST", `/admin/tickets/backfill`, admin, { apply: true, includeFree: true });
  ok(r.json.issued === 0, "running it again issues nothing");
  await tick();
  ok(sent.mail.length === snap.mail && sent.push.length === snap.push && stores.Notification.length === snap.rec, "backfill sent nothing (no email, push or record)");

  console.log("── email html");
  const html = T.ticketEmailHtml(T.ticketView({ _id: "x", studentName: "<script>x</script>", tickets: [{ code: "TDC-2345-6789", seat: 1, of: 1, status: "valid" }], payment: { status: "verified", amount: 1500 } }, { title: "a & b", type: "Concerts", location: "Hall" }));
  ok(html.includes("&lt;script&gt;") && !html.includes("<script>") && html.includes("a &amp; b") && html.includes("TDC-2345-6789") && html.includes("Rs 1,500"), "email escapes names and shows code + amount");
  const four = T.ticketEmailHtml(T.ticketView({ _id: "x", studentName: "A", tickets: [1, 2, 3, 4].map((i) => ({ code: T.newTicketCode(), seat: i, of: 4, tier: "VIP", status: "valid" })), payment: { status: "verified", amount: 20000 } }, { title: "gig", type: "Concerts" }));
  ok(four.length < 100000, `4-seat email ${four.length} bytes (< Gmail's 102 KB clip)`);
  // the drawn QR is the real QR: rebuild the matrix from the table and compare
  const QR = require("module").createRequire(require("../paths").SERVER + "/server.js")("qrcode");
  const code = "TDC-2345-6789";
  const tbl = T.qrTableHtml(code);
  const rows = [...tbl.matchAll(/<tr height="[1-9]\d*"[^>]*>(.*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<td( colspan="(\d+)")?( bgcolor="#111111")?><\/td>/g)].flatMap((t) => Array(Number(t[2] || 1)).fill(t[3] ? 1 : 0)));
  const mod = QR.create(code, { errorCorrectionLevel: "M" }).modules;
  ok(rows.length === mod.size && rows.every((r, y) => r.length === mod.size && r.every((v, x) => v === (mod.get(y, x) ? 1 : 0))), `table QR = qrcode matrix (${mod.size}×${mod.size})`);
  fs.writeFileSync(require("../paths").out("email-sample.html"), four);

  console.log("── ticket page link (token)");
  {
    const raw = async (url, headers = {}) => {
      const res = await fetch(base + "/api/events" + url, { headers });
      return { status: res.status, text: await res.text(), headers: res.headers };
    };
    const gigReg = regOf(s5, gig);
    const toks = gigReg.tickets.map((t) => t.pageToken);
    ok(toks.every((t) => T.PAGE_TOKEN_RE.test(t)) && new Set(toks).size === toks.length && gigReg.tickets.every((t) => t.pageToken !== t.code && !t.pageToken.includes(t.code)), "each seat has its own 43-char random page token (not the code)", JSON.stringify(toks));
    // created once: reject + verify and re-send keep the same tokens
    await call("PATCH", `/registrations/${gigReg._id}/payment`, admin, { action: "reject" });
    await call("PATCH", `/registrations/${gigReg._id}/payment`, admin, { action: "verify" });
    r = await call("POST", `/registrations/${gigReg._id}/tickets/resend`, admin, {});
    ok(regOf(s5, gig).tickets.map((t) => t.pageToken).join() === toks.join(), "tokens are created once (same after reject + verify and re-send)");
    ok(r.status === 200 && r.json.links.length === 3 && r.json.links.every((l, i) => l.url === `https://the-deft-crew-production.up.railway.app/api/events/ticket/${toks[i]}` && l.code === gigReg.tickets[i].code), "re-send returns each seat's link", JSON.stringify(r.json.links));
    const mail = sent.mail[sent.mail.length - 1].html;
    ok(toks.filter((t, i) => regOf(s5, gig).tickets[i].status === "valid").every((t) => mail.includes(`/api/events/ticket/${t}`)) && (mail.match(/>download ticket</g) || []).length === regOf(s5, gig).tickets.filter((t) => t.status === "valid").length, "email: a 'download ticket' button per valid seat, linking to its page");
    r = await call("GET", `/registrations/${gigReg._id}/ticket`, s5);
    ok(!r.text.includes("pageToken") && !toks.some((t) => r.text.includes(t)), "the app's ticket data carries no page tokens");

    // the page
    const p = await raw(`/ticket/${toks[1]}`);
    const seat2 = regOf(s5, gig).tickets[1];
    ok(p.status === 200 && /text\/html/.test(p.headers.get("content-type")) && p.text.includes("night gig") && p.text.includes(seat2.code) && p.text.includes("<svg") && p.text.includes("download / print") && p.text.includes("seat 2 of 3") && p.text.includes("Expo Centre, Karachi") && p.text.includes("18:30") && p.text.includes("12 Nov 2026") && p.text.includes("Rs 15,000 · paid") && p.text.includes(s5.name), "page: logo, title, date, time, venue, name, tier + seat, amount, code, QR, print button", p.text.slice(0, 200));
    {
      const QRm = require("module").createRequire(require("../paths").SERVER + "/server.js")("qrcode").create(seat2.code, { errorCorrectionLevel: "M" }).modules;
      const cells = new Set([...p.text.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map((m) => `${m[1]},${m[2]}`));
      let same = true;
      for (let y = 0; y < QRm.size; y++) for (let x = 0; x < QRm.size; x++) if (!!QRm.get(y, x) !== cells.has(`${x},${y}`)) same = false;
      ok(same, `page QR (svg) = the qrcode matrix of the seat's code (${QRm.size}×${QRm.size})`);
      fs.writeFileSync(require("../paths").out("page-sample.html"), p.text);
    }
    const csp = p.headers.get("content-security-policy") || "";
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    ok(nonce && p.text.includes(`<script nonce="${nonce}">`) && /default-src 'none'/.test(csp) && p.headers.get("cache-control") === "no-store" && /noindex/.test(p.headers.get("x-robots-tag") || "") && p.headers.get("referrer-policy") === "no-referrer", "page headers: CSP with a nonce for the print script, no-store, noindex, no-referrer");
    ok(/@media print/.test(p.text) && /\.btn[^{]*\{display:none\}/.test(p.text.replace(/\s+/g, "")) || /\.btn,\.note\.screen\{display:none\}/.test(p.text.replace(/\s+/g, "")), "print CSS hides the button (clean pdf)");
    const priv = [s5.email, "0312-3456789", "03123456789", "TXN-500001", "res.cloudinary.com", "0300 1234567", "accountNumber", "easypaisa", "whatsapp", "@uni.edu.pk"];
    ok(priv.every((x) => !p.text.toLowerCase().includes(String(x).toLowerCase())), "page has no email, phone, transaction id, receipt or payment account", priv.filter((x) => p.text.toLowerCase().includes(String(x).toLowerCase())).join());
    // cancelled seat
    await call("PATCH", `/registrations/${gigReg._id}/tickets/${seat2.code}`, admin, { action: "cancel" });
    let c = await raw(`/ticket/${toks[1]}`);
    ok(c.status === 200 && c.text.includes("this ticket was cancelled") && !c.text.includes("<svg") && !c.text.includes(seat2.code) && !c.text.includes("download / print"), "cancelled seat: 'this ticket was cancelled', no QR, no code, no print", c.text.slice(-400));
    await call("PATCH", `/registrations/${gigReg._id}/tickets/${seat2.code}`, admin, { action: "restore" });
    // payment rejected → every seat's page says cancelled
    await call("PATCH", `/registrations/${gigReg._id}/payment`, admin, { action: "reject" });
    c = await raw(`/ticket/${toks[2]}`);
    ok(c.text.includes("this ticket was cancelled") && !c.text.includes("<svg"), "payment rejected: the page says cancelled");
    await call("PATCH", `/registrations/${gigReg._id}/payment`, admin, { action: "verify" });
    c = await raw(`/ticket/${toks[2]}`);
    ok(c.text.includes("<svg"), "verified again: the same link works again");
    // unknown / malformed / deleted
    const nf1 = await raw(`/ticket/${"A".repeat(43)}`);
    const nf2 = await raw(`/ticket/not-a-token`);
    const nf3 = await raw(`/ticket/${seat2.code}`);
    ok(nf1.status === 404 && nf2.status === 404 && nf3.status === 404 && nf1.text === nf2.text && nf2.text === nf3.text && nf1.text.includes("ticket not found.") && !/registration|cancel|event|TDC-[A-Z0-9]{4}/i.test(nf1.text.replace("ticket not found", "").replace(/tdc\./g, "").replace(/the tdc app/g, "")), "unknown, malformed or code-as-token → the same 404 page, no details");
    // free ticket page
    const freeTok = regOf(s2, free).tickets[0].pageToken;
    c = await raw(`/ticket/${freeTok}`);
    ok(c.status === 200 && c.text.includes("free talk") && c.text.includes(">free<") && !c.text.includes("TBA") && !c.text.includes("Venue TBD"), "free ticket page: 'free', placeholders hidden");
    // rate limit: 30 a minute per visitor (the address Railway's proxy adds last)
    let last = null;
    for (let i = 0; i < 31; i++) last = await raw(`/ticket/${freeTok}`, { "x-forwarded-for": "1.2.3.4, 9.9.9.9" });
    const other = await raw(`/ticket/${freeTok}`, { "x-forwarded-for": "1.2.3.4, 8.8.8.8" });
    ok(last.status === 429 && other.status === 200, "rate limit: the 31st request in a minute → 429; another visitor still 200", `${last.status} ${other.status}`);
  }

  console.log("── email never blocks the ticket");
  {
    mail.failNext = true;
    r = await call("POST", "/register", s3, v2reg(online, s3));
    await tick();
    const rg = regOf(s3, online);
    ok(r.status === 201 && rg.tickets?.length === 1 && rg.ticketDelivery.emailStatus === "failed" && /mail service did not accept/.test(rg.ticketDelivery.emailError), "mail fails → registration 201, ticket issued, emailStatus 'failed' with a reason", JSON.stringify(rg.ticketDelivery));
    r = await call("POST", `/registrations/${rg._id}/tickets/resend`, admin, { push: false });
    ok(r.status === 200 && regOf(s3, online).ticketDelivery.emailStatus === "sent" && !regOf(s3, online).ticketDelivery.emailError && r.json.registration.ticketDelivery.emailStatus === "sent", "admin re-send → 'sent', error cleared, row returned", JSON.stringify(regOf(s3, online).ticketDelivery));
    const words = [
      ["No email provider configured (set RESEND_API_KEY)", /not set up/],
      ["Email send failed (resend): {\"statusCode\":403,\"message\":\"The gettdc.pk domain is not verified\"}", /domain is not verified/],
      ["Email send failed (resend): {\"statusCode\":401,\"message\":\"API key is invalid\"}", /refused the API key/],
      ["timeout of 15000ms exceeded", /did not answer in time/],
    ];
    ok(words.every(([m, re]) => re.test(T.describeMailError(new Error(m)))), "mail errors in words (not set up / domain / key / timeout)", words.map(([m]) => T.describeMailError(new Error(m))).join(" | "));
  }

  console.log("── old tickets get links (backfill) and creators never see them");
  {
    const oldId = new mongoose.Types.ObjectId();
    stores.Registration.push({ _id: oldId, eventId: new mongoose.Types.ObjectId(gig), studentName: "Pre Link", email: "pl@uni.pk", whatsapp: "0300", studentId: "x", userId: new mongoose.Types.ObjectId(), payment: { status: "verified", amount: 1500 }, ticketsIssuedAt: new Date(), tickets: [{ code: "TDC-2345-6789", seat: 1, of: 2, status: "valid", issuedAt: new Date() }, { code: "TDC-2345-678A", seat: 2, of: 2, status: "cancelled", cancelReason: "admin", issuedAt: new Date() }], createdAt: new Date() });
    const snap = { mail: sent.mail.length, push: sent.push.length, rec: stores.Notification.length };
    r = await call("POST", "/admin/tickets/backfill", admin, {});
    ok(r.json.dryRun && r.json.registrationsWithoutLink >= 1 && !stores.Registration.find((x) => String(x._id) === String(oldId)).tickets[0].pageToken, "dry run counts tickets without a link, adds none", JSON.stringify(r.json));
    r = await call("POST", "/admin/tickets/backfill", admin, { apply: true });
    const o = stores.Registration.find((x) => String(x._id) === String(oldId));
    ok(r.json.linksAdded >= 2 && o.tickets.every((t) => T.PAGE_TOKEN_RE.test(t.pageToken)) && o.tickets[1].status === "cancelled" && o.tickets[1].cancelReason === "admin", "apply: every old ticket gets a link; status untouched", JSON.stringify(r.json));
    r = await call("POST", "/admin/tickets/backfill", admin, { apply: true });
    ok(r.json.linksAdded === 0 && r.json.registrationsWithoutLink === 0, "again: nothing left to add");
    await tick();
    ok(sent.mail.length === snap.mail && sent.push.length === snap.push && stores.Notification.length === snap.rec, "link backfill sent nothing");
    // an event created by a student organiser: its registrations list has no page tokens
    const ev = stores.Event.find((e) => String(e._id) === String(gig));
    const creatorBefore = ev.creator;
    ev.creator = s6._id;
    r = await call("GET", `/registrations/${gig}`, s6);
    ok(r.status === 200 && r.text.includes("TDC-") && !r.text.includes("pageToken"), "event creator (not admin): codes yes, page tokens no", r.text.slice(0, 120));
    r = await call("GET", `/registrations/${gig}`, admin);
    ok(r.text.includes("pageToken"), "admin: page tokens included (copy link)");
    ev.creator = creatorBefore;
  }

  console.log("── user cancels a free registration: tickets go with it");
  r = await call("DELETE", `/register/${free}`, s1);
  ok(r.status === 200 && !regOf(s1, free), "cancel → registration and its ticket removed", short(r));

  srv.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
