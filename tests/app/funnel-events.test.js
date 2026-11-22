// Funnel events and error reporting for new features (upgrade/p0-safety, plan P0-3 and P0-5):
//   - analytics/funnel.js posts { name, meta } to /engagement/events for a signed-in student; nothing for a guest
//     or signed out; a bad name is dropped; a failing request never throws; never imports the Meta module
//   - every §11.2 name the app may send is accepted by the server's config/funnelEvents.js
//   - utils/reportError.js never throws and never logs tokens, passwords, e-mails or phone numbers
//   node tests/app/funnel-events.test.js
const path = require("path");
const fs = require("fs");
const H = require("./harness");
const { SERVER } = require("../paths");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  console.log("── analytics/funnel.js");
  const store = { token: "tok-a", isGuest: null };
  const AsyncStorage = { getItem: async (k) => (k in store ? store[k] : null), setItem: async () => {}, removeItem: async () => {} };
  const posts = []; let fail = false;
  const api = { post: async (url, body) => { if (fail) throw new Error("Network Error"); posts.push({ url, body }); return { status: 204 }; } };
  const load = H.loader({ "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage }, "../api/api": { __esModule: true, default: api } });
  const F = load(path.join(H.SRC, "analytics/funnel.js"));
  const warn = console.warn; const warned = []; console.warn = (...a) => warned.push(a.join(" "));

  ok((await F.funnel("invite_code_prefilled", { channel: "wa" })) === true, "signed in: sent");
  ok(posts.length === 1 && posts[0].url === "/engagement/events" && posts[0].body.name === "invite_code_prefilled" && posts[0].body.meta.channel === "wa", "…to /engagement/events with name and meta", JSON.stringify(posts));
  ok((await F.funnel("Bad Name!")) === false && posts.length === 1, "a malformed name is dropped, nothing sent");
  store.isGuest = "true";
  ok((await F.funnel("resume_finished")) === false && posts.length === 1, "guest: nothing sent");
  store.isGuest = null; delete store.token;
  ok((await F.funnel("resume_finished")) === false && posts.length === 1, "signed out: nothing sent");
  store.token = "tok-a"; fail = true;
  let threw = false;
  try { ok((await F.funnel("resume_finished")) === false, "request fails: false"); } catch { threw = true; }
  ok(!threw && warned.some((w) => w.includes("[funnel]")), "…never throws, one console.warn");
  fail = false;
  const src = fs.readFileSync(path.join(H.SRC, "analytics/funnel.js"), "utf8");
  ok(!/metaEvents|react-native-fbsdk|facebook/i.test(src.replace(/\/\/.*$/gm, "")), "funnel.js never touches Meta");

  console.log("── the server accepts every name the plan lists (config/funnelEvents.js)");
  const fe = path.join(SERVER, "config/funnelEvents.js");
  if (fs.existsSync(fe)) {
    const { isFunnelEvent } = require(fe);
    const names = ["invite_link_opened", "invite_code_prefilled", "signup_with_ref", "amb_invite_shown", "amb_invite_accepted", "amb_invite_not_now", "amb_invite_never",
      "amb_intro_card_1", "amb_intro_card_4", "amb_apply_submitted", "amb_approved", "resume_start_upload", "resume_start_profile", "resume_start_fresh",
      "resume_track_fresher", "resume_track_experienced", "resume_step_done_1", "resume_step_done_12", "resume_ai_bullets_used", "resume_finished", "resume_minutes_to_finish",
      "confession_precheck_ok", "confession_precheck_edit", "confession_precheck_hold", "confession_reported", "confession_shared_card", "confession_followed",
      "share_card_levelup", "share_card_resumeready", "share_card_savings", "share_card_confession", "share_card_invite",
      "template_previewed", "template_selected", "template_customised_palette", "resume_downloaded_campus", "resume_ats_badge_safe", "resume_ats_badge_design"];
    const missing = names.filter((n) => !isFunnelEvent(n));
    ok(missing.length === 0, `all ${names.length} plan names accepted`, missing.join(","));
    const bad = ["app_open", "amb_intro_card_5", "resume_step_done_", "share_card_", "points_awarded", "x".repeat(70), "share_card_A_B"].filter((n) => isFunnelEvent(n));
    ok(bad.length === 0, "others refused (incl. the older event app_open, which keeps its own list)", bad.join(","));
  } else {
    console.log("SKIP  server checks: server repo not found");
  }

  console.log("── utils/reportError.js");
  const R = H.loader({})(path.join(H.SRC, "utils/reportError.js"));
  warned.length = 0;
  let thrown = false;
  try {
    R.reportError("confessionSafety", new Error("boom"), { step: "report", token: "abc", userEmail: "a@b.c", phone: "0300", n: 3, obj: { x: 1 } });
    R.reportError(undefined, undefined, undefined);
    R.reportError("x", { get message() { throw new Error("nasty"); } });
  } catch { thrown = true; }
  ok(!thrown, "never throws (even on odd input)");
  const line = warned[0] || "";
  ok(/^\[error:confessionSafety\] boom/.test(line) && line.includes("report"), "one warn line: feature, message, safe context", line);
  ok(!/abc|a@b\.c|0300/.test(warned.join(" ")), "no token, e-mail or phone in the log");

  console.warn = warn;
  done();
})();
