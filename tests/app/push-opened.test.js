// N-6 push open tracking (upgrade/phase-n): a tapped push that carries a pushLogId is reported once
// (POST /notification/push-opened/<id>); pushes without one (every push while the server's pushOpenTracking flag is
// off) report nothing. Both tap paths call it: the cold-start tap (App.js) and the tray tap (GlobalNotificationLayer).
//   node tests/app/push-opened.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();

const posts = [];
let fail = false;
const api = { post: (url, body, opts) => { posts.push({ url, body, opts }); return fail ? Promise.reject(new Error("offline")) : Promise.resolve({ data: { ok: true } }); } };
const load = H.loader({ "../api/api": { __esModule: true, default: api } });
const { reportPushOpened } = load(path.join(H.SRC, "utils", "pushOpened.js"));

(async () => {
  const id = "6b0224d7346757a2f1ee4cc7";
  ok(reportPushOpened({ type: "reply", pushLogId: id }) === true && posts.length === 1 && posts[0].url === `/notification/push-opened/${id}`, "a push with a pushLogId: reported to /notification/push-opened/<id> (the server's real path)", JSON.stringify(posts));
  ok(reportPushOpened({ pushLogId: id }) === false && posts.length === 1, "…once per push (cold start + listener can both see it)");
  for (const [name, data] of [["no pushLogId (flag off)", { type: "reply", route: "Home" }], ["no data", undefined], ["not an id", { pushLogId: "../admin" }], ["a number", { pushLogId: 12 }]]) {
    ok(reportPushOpened(data) === false && posts.length === 1, `${name}: nothing sent`);
  }
  fail = true;
  let threw = false;
  try { reportPushOpened({ pushLogId: "6b0224d7346757a2f1ee4cc8" }); await new Promise((r) => setTimeout(r, 5)); } catch { threw = true; }
  ok(!threw && posts.length === 2, "offline: the report fails quietly, the tap goes on");

  const app = H.read("App.js");
  ok(/import \{ reportPushOpened \} from "\.\/app\/src\/utils\/pushOpened";/.test(app) && /if \(!claimNotificationResponse\(response\)\) return;\s*\n\s*const data = [^\n]+\n\s*reportPushOpened\(data\);/.test(app), "App.js cold start: reported after the tap is claimed");
  const layer = H.read("app/src/components/GlobalNotificationLayer.js");
  ok(/if \(!claimNotificationResponse\(response\)\) return;\s*\n\s*onRedemptionPush\(data\);\s*\n\s*loyaltyMoment\(data\)[^\n]*\n\s*reportPushOpened\(data\);/.test(layer), "GlobalNotificationLayer tray tap: reported after the tap is claimed (after the redemption and loyalty checks)");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
