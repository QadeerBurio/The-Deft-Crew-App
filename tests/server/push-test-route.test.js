// GET /api/notification/test-push with tokens from TWO Expo projects (old + new EAS project).
// Fake expo-server-sdk behaves like Expo: a request mixing projects is rejected with
// PUSH_TOO_MANY_EXPERIENCE_IDS (details: project → tokens). Real route + real auth + real
// utils/pushNotification.js. No database, no network.   node run.js [--main]
const path = require("path");
const fs = require("fs");
const Module = require("module");
const { execSync } = require("child_process");
const SERVER = require("../paths").SERVER;
const reqS = Module.createRequire(path.join(SERVER, "server.js"));
const express = reqS("express");
const jwt = reqS("jsonwebtoken");
process.env.JWT_SECRET = "test-only";

const OLD = ["ExponentPushToken[old-project-phone-1]"];
const NEW = ["ExponentPushToken[new-project-phone-1]", "ExponentPushToken[new-project-dead-2]"];
const projectOf = (t) => (OLD.includes(t) ? "@aqkhan622/old" : "@aqkhan621/tdc");
const sent = [];
let rejectedBatches = 0;
class Expo {
  static isExpoPushToken(t) { return /^ExponentPushToken\[/.test(t); }
  constructor() {}
  chunkPushNotifications(m) { return [m]; }
  chunkPushNotificationReceiptIds(ids) { return ids.length ? [ids] : []; }
  async sendPushNotificationsAsync(chunk) {
    const groups = {};
    chunk.forEach((m) => (groups[projectOf(m.to)] = groups[projectOf(m.to)] || []).push(m.to));
    if (Object.keys(groups).length > 1) {
      rejectedBatches++;
      const e = new Error("All push notification messages in the same request must be for the same project");
      e.code = "PUSH_TOO_MANY_EXPERIENCE_IDS";
      e.details = groups;
      throw e;
    }
    return chunk.map((m) => { sent.push(m.to); return { status: "ok", id: "r-" + m.to }; });
  }
  async getPushNotificationReceiptsAsync(ids) {
    return Object.fromEntries(ids.map((id) => [id, id.includes("dead") ? { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } } : { status: "ok" }]));
  }
}
const uid = "64b000000000000000000001";
const user = { _id: uid, id: uid, role: "student", name: "S", pushTokens: [...OLD, ...NEW].map((token) => ({ token, channels: "snd_v2" })) };
const q = (v) => ({ select: () => ({ lean: async () => v, then: (a, b) => Promise.resolve(v).then(a, b) }) });
const UserFake = { findById: () => q(user) };
const origLoad = Module._load;
Module._load = function (req, parent, isMain) {
  if (req === "expo-server-sdk") return { Expo };
  if (/models\/User$/.test(req)) return UserFake;
  return origLoad.call(this, req, parent, isMain);
};
let file = path.join(SERVER, "routes/notification.routes.js");
if (process.argv.includes("--main")) {
  file = path.join(SERVER, "routes", `.notif.main.${process.pid}.js`);
  fs.writeFileSync(file, execSync("git show main:routes/notification.routes.js", { cwd: SERVER }));
  process.on("exit", () => { try { fs.unlinkSync(file); } catch {} });
}
const app = express();
app.use(express.json());
app.use("/api/notification", require(file));
const srv = app.listen(0, "127.0.0.1", async () => {
  const token = jwt.sign({ id: uid }, process.env.JWT_SECRET);
  const res = await fetch(`http://127.0.0.1:${srv.address().port}/api/notification/test-push`, { headers: { authorization: `Bearer ${token}` } });
  const body = await res.json();
  console.log(process.argv.includes("--main") ? "── main (before)" : "── fix/push-test (after)");
  console.log("status", res.status, "ok", body.ok, "problem", body.problem || "-", "| Expo rejected mixed batches:", rejectedBatches);
  (body.results || []).forEach((r) => console.log("  ", r.token, "ticket", r.ticket, "receipt", r.receipt, r.error || "", r.fix ? "→ " + r.fix : ""));
  console.log("first push reached:", [...new Set(sent)].length, "of", OLD.length + NEW.length, "devices");
  srv.close();
  process.exit(0);
});
