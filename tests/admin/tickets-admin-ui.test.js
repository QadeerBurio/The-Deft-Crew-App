// Admin web (edu-boost production build) → tickets in the registrations tab.
// Headless Chrome over CDP (no packages). The build calls the production URL; EVERY request
// to it is intercepted here and answered by the REAL server routes on the in-memory store
// (harness.js). As a second guard, Chrome maps *.railway.app to a dead local port, so
// nothing can reach production even if interception missed a request.
//   node --experimental-websocket admin.test.js
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");
const H = require("../harness/tickets-harness.js");
// the admin web production build (edu-boost: BUILD_PATH=<folder> npm run build)
const BUILD = process.env.ADMIN_BUILD ? path.resolve(process.env.ADMIN_BUILD) : null;
if (!BUILD || !fs.existsSync(path.join(BUILD, "index.html"))) {
  console.log("SKIP  set ADMIN_BUILD to an edu-boost production build folder (BUILD_PATH=<folder> npm run build)");
  process.exit(0);
}
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROD = "https://the-deft-crew-production.up.railway.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0, passed = 0;
const ok = (c, label, extra = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${label}${!c && extra ? "  → " + String(extra).slice(0, 300) : ""}`); };
const apiLog = [];
const leaks = [];

(async () => {
  const { srv, call, base } = await H.start();

  // static admin build (SPA fallback)
  const web = http.createServer((req, res) => {
    let f = path.join(BUILD, decodeURIComponent(req.url.split("?")[0]));
    if (!f.startsWith(BUILD) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(BUILD, "index.html");
    const type = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".svg": "image/svg+xml" }[path.extname(f)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(f).pipe(res);
  }).listen(0, "127.0.0.1");
  await new Promise((r) => web.once("listening", r));
  const WEB = `http://127.0.0.1:${web.address().port}`;

  // ── real data through the real routes ──
  const admin = H.admin;
  const [s1, s2, s3] = H.students;
  const ACC = [{ method: "easypaisa", accountTitle: "TDC Events", accountNumber: "03001234567" }];
  const create = async (b) => (await call("POST", "/create", admin, { organizer: "TDC", city: "Karachi", ...b })).json;
  const gig = await create({ title: "Night Gig", type: "Concerts", date: "12 Nov 2026", location: "Expo Centre", details: { artists: ["Band"], maxTicketsPerStudent: 4 }, ticketTiers: [{ name: "VIP", price: 5000, quantity: 10 }], paymentAccounts: ACC });
  const talk = await create({ title: "Free Talk", type: "Seminar" });
  const reg = (ev, who, extra) => call("POST", "/register", who, { eventId: ev._id, formVersion: 2, studentName: who.name, email: who.email, whatsapp: "0312-3456789", answers: { university: "MUET" }, ...extra });
  await reg(gig, s1, { ticket: { tier: "VIP", quantity: 2 }, payment: { method: "easypaisa", transactionId: "TXN-900001", receiptUrl: "https://res.cloudinary.com/decaxpera/image/upload/v1/r/a.jpg" } });
  await reg(gig, s2, { ticket: { tier: "VIP", quantity: 1 }, payment: { method: "easypaisa", transactionId: "TXN-900002", receiptUrl: "https://res.cloudinary.com/decaxpera/image/upload/v1/r/b.jpg" } });
  await reg(talk, s3, {});
  const R = (who, ev) => H.stores.Registration.find((x) => String(x.userId) === String(who._id) && String(x.eventId) === String(ev._id));
  await call("PATCH", `/registrations/${R(s1, gig)._id}/payment`, admin, { action: "verify" });
  await sleep(80);
  const codes1 = R(s1, gig).tickets.map((t) => t.code);
  const code3 = R(s3, talk).tickets[0].code;

  // ── Chrome ──
  const profile = require("../paths").out("chrome-admin");
  fs.rmSync(profile, { recursive: true, force: true });
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--remote-debugging-port=9345", `--user-data-dir=${profile}`, "--window-size=1440,1000",
    "--host-resolver-rules=MAP *.railway.app 127.0.0.1:9, MAP railway.app 127.0.0.1:9", "about:blank"], { stdio: "ignore" });
  let target = null;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch("http://127.0.0.1:9345/json")).json()).find((t) => t.type === "page"); } catch {}
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); const errors = [];
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const cors = (origin) => [
    { name: "Access-Control-Allow-Origin", value: origin || "*" },
    { name: "Access-Control-Allow-Headers", value: "authorization, content-type, cache-control" },
    { name: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
  ];
  ws.onmessage = async (e) => {
    const m = JSON.parse(e.data);
    if (m.id) { pend.get(m.id)?.(m.result || m); pend.delete(m.id); return; }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method !== "Fetch.requestPaused") return;
    const { requestId, request } = m.params;
    const u = new URL(request.url);
    if (u.hostname === "127.0.0.1") return send("Fetch.continueRequest", { requestId });
    const origin = request.headers.Origin || request.headers.origin;
    if (request.url.startsWith(PROD + "/api/events")) {
      if (request.method === "OPTIONS") return send("Fetch.fulfillRequest", { requestId, responseCode: 204, responseHeaders: cors(origin) });
      // answered by the real routes on the local store
      const local = base + u.pathname + u.search;
      apiLog.push({ method: request.method, path: u.pathname.replace("/api/events", ""), query: Object.fromEntries(u.searchParams), body: request.postData ? JSON.parse(request.postData) : undefined });
      const r = await fetch(local, { method: request.method, headers: { authorization: request.headers.Authorization || request.headers.authorization || "", "content-type": "application/json" }, body: request.postData || undefined });
      const buf = Buffer.from(await r.arrayBuffer());
      return send("Fetch.fulfillRequest", { requestId, responseCode: r.status, responseHeaders: [...cors(origin), { name: "Content-Type", value: r.headers.get("content-type") || "application/json" }], body: buf.toString("base64") });
    }
    // anything else outside this machine: answered locally, never sent
    leaks.push(request.url);
    return send("Fetch.fulfillRequest", { requestId, responseCode: request.method === "OPTIONS" ? 204 : 404, responseHeaders: cors(origin), body: Buffer.from("{}").toString("base64") });
  };
  await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await send("Runtime.enable");
  await send("Page.enable");
  const evaluate = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(require("../paths").out(name), Buffer.from(r.data, "base64")); };
  const until = async (expr, ms = 6000) => { for (let t = 0; t < ms; t += 150) { if (await evaluate(expr)) return true; await sleep(150); } return false; };
  const body = () => evaluate("document.body.innerText");
  const HELP = `window.T = {
    click(sel, text) { const el = [...document.querySelectorAll(sel)].find((e) => e.innerText.trim().toLowerCase().includes(text.toLowerCase())); if (!el) throw new Error("no " + sel + " with " + text); el.click(); return true; },
    type(sel, value) { const el = document.querySelector(sel); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, value); el.dispatchEvent(new Event("input", { bubbles: true })); return true; },
  }; true`;

  try {
    await send("Page.navigate", { url: WEB + "/login" });
    await sleep(1200);
    await evaluate(`localStorage.setItem("token", ${JSON.stringify(admin.token)}); localStorage.setItem("user", JSON.stringify({ _id: ${JSON.stringify(String(admin._id))}, name: "Admin", email: "admin@tdc.pk", role: "admin" })); true`);
    await send("Page.navigate", { url: WEB + "/eventmanagement" });
    await until(`document.querySelectorAll('[role="tab"]').length > 1`, 10000);
    await evaluate(HELP);
    await evaluate(`T.click('[role="tab"]', "Registrations")`);
    ok(await until(`document.body.innerText.includes(${JSON.stringify(codes1[0])})`), "registrations tab lists the ticket codes", (await body()).slice(0, 300));
    let t = await body();
    ok(/ticket code/i.test(t) && t.includes(codes1[1]) && t.includes(code3) && /valid/.test(t), "column 'Ticket code' with each seat's code + status (paid ×2, free)");
    ok(await evaluate(`[...document.querySelectorAll('tbody tr')].some((tr) => tr.innerText.includes("Night Gig") && tr.innerText.includes("pending") && tr.innerText.includes("—"))`), "pending registration: no code (—)");
    ok(await evaluate(`document.querySelector('input[placeholder*="ticket code"]') != null`), "search box mentions ticket code");
    await shot("admin-registrations.png");

    // search by code (check-in)
    await evaluate(`T.type('input[placeholder*="ticket code"]', ${JSON.stringify(codes1[1].toLowerCase())})`);
    ok(await until(`document.querySelectorAll('tbody tr').length === 1`), "search a ticket code → one row", await evaluate(`document.querySelectorAll('tbody tr').length`));
    ok(apiLog.filter((c) => c.path === "/admin/registrations").pop()?.query.q === codes1[1].toLowerCase(), "search sends q=<code>");
    await evaluate(`T.type('input[placeholder*="ticket code"]', "")`);
    await until(`document.querySelectorAll('tbody tr').length === 3`);

    // panel: tickets, cancel, restore, re-send
    await evaluate(`[...document.querySelectorAll('tbody tr')].find((tr) => tr.innerText.includes(${JSON.stringify(codes1[0])})).click(); true`);
    ok(await until(`!!document.querySelector('[data-ticket="${codes1[0]}"]')`), "panel lists the tickets");
    t = await evaluate(`document.querySelector('.ev2-panel').innerText`);
    ok(t.includes("seat 1 of 2") && t.includes("seat 2 of 2") && t.includes("VIP") && /re-send ticket/i.test(t), "panel: tier, seat n of m, re-send button", t.slice(-400));
    await evaluate(`T.click('[data-ticket="${codes1[0]}"] button', "Cancel")`);
    ok(await until(`document.body.innerText.includes("Cancel this ticket?")`), "cancel asks first");
    await shot("admin-ticket-cancel.png");
    await evaluate(`T.click('[role="dialog"] button', "Cancel ticket")`);
    await until(`document.querySelector('[data-ticket="${codes1[0]}"]')?.innerText.includes("cancelled")`);
    const patch = apiLog.filter((c) => c.method === "PATCH").pop();
    ok(patch?.path === `/registrations/${R(s1, gig)._id}/tickets/${codes1[0]}` && patch.body.action === "cancel" && R(s1, gig).tickets[0].status === "cancelled", "Cancel ticket → PATCH …/tickets/<code> {cancel}; stored as cancelled", JSON.stringify(patch));
    ok(await evaluate(`/restore/i.test(document.querySelector('[data-ticket="${codes1[0]}"]').innerText)`), "cancelled seat shows Restore");
    await evaluate(`T.click('[data-ticket="${codes1[0]}"] button', "Restore")`);
    await until(`document.body.innerText.includes("Restore this ticket?")`);
    await evaluate(`T.click('[role="dialog"] button', "Restore ticket")`);
    ok(await until(`document.querySelector('[data-ticket="${codes1[0]}"]')?.innerText.includes("valid")`) && R(s1, gig).tickets[0].status === "valid", "Restore → valid again");
    const mailBefore = H.sent.mail.length, pushBefore = H.sent.push.length;
    await until(`[...document.querySelectorAll(".ev2-panel button")].some((b) => /re-send ticket/i.test(b.innerText) && !b.disabled)`); await evaluate(`T.click('.ev2-panel button', "Re-send ticket")`);
    ok(await until(`document.body.innerText.includes("Ticket sent again")`), "re-send → plain confirmation", (await body()).slice(-300));
    ok(H.sent.mail.length === mailBefore + 1 && H.sent.push.length === pushBefore + 1 && /push: sent · email: sent/.test(await body()), "re-send: one email + one push; says what happened");
    await evaluate(`document.querySelector('[data-ticket]').scrollIntoView({ block: "center" }); true`);
    await sleep(200);
    await shot("admin-ticket-panel.png");
    await evaluate(`document.querySelector('[aria-label="close"]').click(); true`);
    await sleep(300);

    // pending registration: no ticket yet
    await evaluate(`[...document.querySelectorAll('tbody tr')].find((tr) => tr.innerText.includes("pending")).click(); true`);
    ok(await until(`document.querySelector('.ev2-panel')?.innerText.includes("Issued when the payment is verified.")`), "pending: 'Issued when the payment is verified.'");
    // verify from the admin → ticket appears
    await evaluate(`T.click('.ev2-panel button', "Verify")`);
    await until(`document.body.innerText.includes("Verify this payment?")`);
    await evaluate(`T.click('.MuiDialog-root button', "Verify")`);
    await sleep(400);
    const got = await until(`[...document.querySelectorAll('tbody tr')].filter((tr) => /TDC-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(tr.innerText)).length === 3`);
    ok(got && R(s2, gig).tickets?.length === 1, "verify in the admin → the row gets its ticket code", JSON.stringify({ stored: R(s2, gig).tickets, rows: await evaluate(`[...document.querySelectorAll('tbody tr')].map((tr) => tr.innerText.replace(/\s+/g, " "))`), calls: apiLog.slice(-3) }));
    await shot("admin-after-verify.png");


    // ── copy ticket link, email status per ticket ──
    await evaluate(`document.querySelector('[aria-label="close"]')?.click(); true`);
    await sleep(300);
    await evaluate(`window.__copied = []; Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { window.__copied.push(t); } } }); true`);
    await evaluate(`[...document.querySelectorAll('tbody tr')].find((tr) => tr.innerText.includes(${JSON.stringify(codes1[0])})).click(); true`);
    await until(`!!document.querySelector('[data-ticket="${codes1[0]}"]')`);
    t = await evaluate(`document.querySelector('[data-ticket="${codes1[0]}"]').innerText`);
    ok(/copy ticket link/i.test(t) && /email sent/i.test(t), "each ticket: 'copy ticket link' and 'email sent'", t);
    await evaluate(`document.querySelector('[aria-label="copy ticket link for ${codes1[1]}"]').click(); true`);
    await until(`window.__copied.length === 1`);
    const link = await evaluate(`window.__copied[0]`);
    const tok1 = R(s1, gig).tickets[1].pageToken;
    ok(link === `${PROD}/api/events/ticket/${tok1}` && await until(`document.body.innerText.includes("Ticket link copied (${codes1[1]})")`), "copy → the seat's page link, 'Ticket link copied'", link);
    // email failed → shown per ticket, re-send fixes it
    H.mail.failNext = true;
    await until(`[...document.querySelectorAll(".ev2-panel button")].some((b) => /re-send ticket/i.test(b.innerText) && !b.disabled)`); await evaluate(`T.click('.ev2-panel button', "Re-send ticket")`);
    ok(await until(`document.querySelector('[data-ticket="${codes1[0]}"] [data-email-state="bad"]')?.innerText.includes("email failed")`), "mail fails → each ticket shows 'email failed: <reason>'", await evaluate(`document.querySelector('.ev2-panel').innerText.slice(-500)`));
    ok(await evaluate(`document.querySelector('.ev2-panel').innerText.includes("The ticket is still valid. Fix the cause, then re-send.")`), "…with what to do (re-send)");
    await sleep(200);
    await until(`[...document.querySelectorAll(".ev2-panel button")].some((b) => /re-send ticket/i.test(b.innerText) && !b.disabled)`); await evaluate(`T.click('.ev2-panel button', "Re-send ticket")`);
    ok(await until(`document.querySelector('[data-ticket="${codes1[0]}"] [data-email-state="ok"]')?.innerText.includes("email sent")`), "re-send → 'email sent' again");
    await shot("admin-ticket-links.png");
    await evaluate(`document.querySelector('[aria-label="close"]').click(); true`);
    await sleep(300);
    // a ticket from before page links: "no link yet", re-send creates it
    const oldReg = H.stores.Registration.find((x) => String(x._id) === String(R(s3, talk)._id));
    delete oldReg.tickets[0].pageToken;
    await evaluate(`T.type('input[placeholder*="ticket code"]', ${JSON.stringify(code3)})`);
    await until(`document.querySelectorAll('tbody tr').length === 1`);
    await evaluate(`document.querySelector('tbody tr').click(); true`);
    ok(await until(`document.querySelector('[data-ticket="${code3}"]')?.innerText.includes("No link yet: re-send creates it.")`), "old ticket: 'No link yet: re-send creates it.'");
    await until(`[...document.querySelectorAll(".ev2-panel button")].some((b) => /re-send ticket/i.test(b.innerText) && !b.disabled)`); await evaluate(`T.click('.ev2-panel button', "Re-send ticket")`);
    ok(await until(`!!document.querySelector('[aria-label="copy ticket link for ${code3}"]')`) && /^[A-Za-z0-9_-]{43}$/.test(R(s3, talk).tickets[0].pageToken || ""), "after re-send: link created, copy button shows");
    // the link itself opens the ticket page (answered by the real route, never production)
    const freeLink = `${PROD}/api/events/ticket/${R(s3, talk).tickets[0].pageToken}`;
    await send("Page.navigate", { url: freeLink });
    ok(await until(`document.body && document.body.innerText.includes(${JSON.stringify(code3)}) && document.body.innerText.includes("download / print")`), "opening the link shows the ticket page with 'download / print'", (await body()).slice(0, 200));
    await shot("ticket-page.png");
    ok(!errors.length, "no page errors", errors.join(" | "));
  } catch (e) {
    ok(false, "admin test stopped", e.stack);
    await shot("admin-error.png").catch(() => {});
  }
  console.log(`(other outside requests answered locally, never sent: ${leaks.length})`);
  ws.close(); chrome.kill(); srv.close(); web.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
