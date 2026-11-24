// Confessions v2, P4-1 safety in the app (upgrade/p4-1-safety, flag confessionSafety), with a fake server:
//   flag OFF: the screen renders exactly as the split-only commit c4a6416 (feed, composer open, comments open)
//   flag ON:
//     - each card has "more options": someone else's → report / don't show me this person; mine → delete (confirm)
//     - report opens ReportModal for that confession; a comment's "report" for that comment (postId:commentId)
//     - my held post shows "under review · only you can see this"; my held comment "under review"
//     - first post: the rules sheet first; "i agree" stores it and opens the composer
//     - 422 NEEDS_EDIT: the text stays, the reasons show in the composer, funnel confession_precheck_edit
//     - held with support: the support sheet with the helplines; held without: an "under review" notice
//     - a refused comment shows the server's sentence
//   ReportModal: Confession / ConfessionComment endpoints, evidence sent, confession reasons; posts unchanged
//   node tests/app/confessions-v2.test.js
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const H = require("./harness");
const { APP } = require("../paths");
const { ok, done } = H.counter();
global.__DEV__ = false;
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const SCREEN = path.join(H.SRC, "screens/Social/ConfessionScreen.js");
const now = new Date("2026-11-20T10:00:00Z").toISOString();

const baseFeed = () => [
  { _id: "p1", text: "someone else's post", visibility: "public", likes: 1, comments: [
    { _id: "c1", text: "a comment by someone", createdAt: now, isMyComment: false, parentComment: null },
    { _id: "c2", text: "my held comment", createdAt: now, isMyComment: true, parentComment: null, status: "pending" },
  ], createdAt: now },
  { _id: "p2", text: "my live post", visibility: "public", likes: 0, comments: [], createdAt: now },
  { _id: "p3", text: "my held post", visibility: "public", likes: 0, comments: [], createdAt: now, status: "pending" },
];

function setup(file, { flag, v2 = false, flags = {}, server = {}, picker = null }) {
  const { React, mount } = H.makeReact();
  const { rn, alerts } = H.makeRN({ Share: { share: async () => ({}) }, Keyboard: { dismiss() {}, addListener: () => ({ remove() {} }) }, TouchableWithoutFeedback: "TWF", KeyboardAvoidingView: "KAV", RefreshControl: "RefreshControl", Linking: { openURL: async () => {} } });
  const calls = [];
  global.fetch = async (url, opts = {}) => {
    const method = (opts.method || "GET").toUpperCase();
    calls.push({ url, method, body: opts.body ? JSON.parse(opts.body) : null });
    const reply = (status, json) => ({ ok: status < 400, status, json: async () => json });
    if (url.includes("/confessions/feed")) return reply(200, server.feed ? server.feed() : baseFeed());
    if (url.endsWith("/confessions/v2/config")) return reply(200, server.config || null);
    if (/\/confessions\/[^/]+\/metoo$/.test(url) && method === "PUT") return reply(200, { meToo: true, meTooCount: 4 });
    if (/\/confessions\/[^/]+\/poll$/.test(url) && method === "PUT") return reply(200, { poll: { options: [{ text: "chai", votes: 3 }, { text: "coffee", votes: 1 }], total: 4, myVote: 0 } });
    if (/\/confessions\/[^/]+\/follow$/.test(url) && method === "PUT") { const b = JSON.parse(opts.body || "{}"); return reply(200, { following: b.on !== false }); }
    if (/\/confessions\/[^/]+\/save$/.test(url) && method === "PUT") { const b = JSON.parse(opts.body || "{}"); return reply(200, { saved: b.on !== false }); }
    if (url.includes("/confessions/create")) return server.create ? server.create() : reply(201, { confession: { _id: "new" } });
    if (/\/confessions\/comment\/[^/]+$/.test(url) && method === "POST") return server.comment ? server.comment() : reply(200, { _id: "p1", comments: [] });
    if (url.endsWith("/confessions/safety/me")) return reply(200, { rulesAcceptedAt: server.rulesAccepted ? now : null, helplines: [{ name: "x", number: "1166" }] });
    if (url.endsWith("/confessions/rules/accept")) return reply(200, { success: true, acceptedAt: now });
    if (url.endsWith("/confessions/my-confessions")) return reply(200, [{ _id: "p2" }, { _id: "p3" }]);
    if (/\/confessions\/p\d$/.test(url) && method === "DELETE") return reply(200, { message: "deleted" });
    if (url.includes("/mute-author")) return reply(200, { success: true, muted: true, message: "you won't see posts from this person." });
    return reply(200, {});
  };
  const realSI = global.setInterval; global.setInterval = () => 0;
  const funnels = [];
  const mocks = {
    react: React, "react-native": rn,
    "../../push/pushAsk": { pushMoment: () => {} }, // N-3 (pushAskV2): the flag off here
    "../../ui/RemoteImage": "RemoteImage",
    "@react-navigation/native": { useIsFocused: () => true, useFocusEffect: (cb) => React.useEffect(() => cb(), [cb]) },
    "@expo/vector-icons": { Ionicons: "Icon" }, "../../ui/FlatGradient": { LinearGradient: "LinearGradient" },
    "expo-image-picker": picker || {}, "../../context/AuthContext": { AuthContext: { _default: { token: "tok", user: { _id: "me", university: { name: "U" } }, isGuest: false } } },
    "../../lib/tdcSounds": new Proxy({}, { get: () => () => {} }),
    "../../engagement/engagementBus": { engagementBus: { emit() {} }, ENGAGEMENT_EVENTS: {} },
    "../../analytics/metaEvents": { metaEvents: new Proxy({}, { get: () => () => {} }) },
    "../../hooks/useFlag": { __esModule: true, default: (name) => (name === "confessionsV2" ? v2 : name in flags ? flags[name] : name === "confessionSafety" ? flag : false) }, // flag = confessionSafety; flags: the P4b ones
    "../../analytics/funnel": { funnel: (n) => funnels.push(n) },
    "./ReportModal": function ReportModal(p) { return React.createElement("ReportModal", p); },
  };
  const load = H.loader(mocks);
  const Screen = load(file).default;
  const root = mount(React.createElement(Screen, { navigation: { navigate() {} } }));
  return { React, root, alerts, calls, funnels, mount, restore: () => { global.setInterval = realSI; } };
}

const find = (n, pred) => H.find(n, (x) => x?.props && pred(x));
const findAll = (n, pred) => H.findAll(n, (x) => x?.props && pred(x));
const expand = (ctx, el) => { const m = ctx.mount(el); const t = m.tree; m.unmount(); return t; };
const rows = (ctx) => { const list = find(ctx.root.tree, (x) => x.type === "FlatList"); return list.props.data.map((item, index) => ({ item, tree: expand(ctx, list.props.renderItem({ item, index })) })); };
const press = async (n, label) => { const b = find(n, (x) => x.props.accessibilityLabel === label); if (!b) throw new Error(`no "${label}"`); await b.props.onPress(); await tick(60); };

// serialise for the flag-off comparison (as the split check did). Children that React Native draws as nothing
// (false, null, undefined, true from `{flag && …}`) are left out, and a one-child list is the child itself.
const drawn = (c) => !(c === false || c === true || c == null);
let SKIP = new Set(); // accessibility labels of nodes left out of a comparison (P4a: the new photo button)
const skipped = (x) => !!(x && x.props && SKIP.has(x.props.accessibilityLabel));
function ser(ctx, n) {
  if (n == null || typeof n !== "object") return n;
  if (Array.isArray(n)) { const kept = n.flat(Infinity).filter(drawn).filter((x) => !skipped(x)); return kept.length === 1 ? ser(ctx, kept[0]) : kept.map((x) => ser(ctx, x)); }
  const out = { type: n.type, props: {} };
  for (const [k, v] of Object.entries(n.props || {})) {
    if (k === "children" || v === undefined) continue; // an undefined prop draws nothing (flag-on trees have some)
    if (typeof v === "function") out.props[k] = "[fn]";
    else if (v && typeof v === "object" && v.type !== undefined) out.props[k] = ser(ctx, expand(ctx, v));
    else if (v && typeof v === "object" && "current" in v && Object.keys(v).length === 1) out.props[k] = "[ref]";
    else if (v && typeof v === "object" && typeof v.interpolate === "function") out.props[k] = "[anim]";
    else out.props[k] = JSON.parse(JSON.stringify(v, (kk, vv) => (typeof vv === "function" ? "[fn]" : vv && typeof vv === "object" && typeof vv.interpolate === "function" ? "[anim]" : vv)));
  }
  if (n.type === "FlatList" && typeof n.props.renderItem === "function" && Array.isArray(n.props.data)) out.rows = n.props.data.map((item, index) => ser(ctx, expand(ctx, n.props.renderItem({ item, index }))));
  out.children = ser(ctx, n.props?.children);
  return out;
}
async function snapshots(file, flag, v2 = false) {
  const ctx = setup(file, { flag, v2 });
  await tick(80);
  const feed = JSON.stringify(ser(ctx, ctx.root.tree));
  await press(ctx.root.tree, "confess"); await tick(300);
  const composer = JSON.stringify(ser(ctx, ctx.root.tree));
  await press(ctx.root.tree, "close"); await tick(50);
  await press(rows(ctx)[0].tree, "comments"); await tick(500);
  const comments = JSON.stringify(ser(ctx, ctx.root.tree));
  ctx.restore();
  return { feed, composer, comments };
}

(async () => {
  console.log("── flag off: exactly the screen of the split-only commit (c4a6416)");
  const dir = path.dirname(SCREEN);
  const files = ["ConfessionScreen", "ConfessionCard", "ConfessionCommentThread", "ConfessionComposer", "ConfessionComments", "confessionStyles"];
  const oldDir = path.join(dir, "..", "__c4a6416"); // same depth as screens/Social: the imports stay the same
  fs.mkdirSync(oldDir, { recursive: true });
  let before, after;
  try {
    for (const f of files) fs.writeFileSync(path.join(oldDir, `${f}.js`), execSync(`git show c4a6416:app/src/screens/Social/${f}.js`, { cwd: APP }).toString());
    before = await snapshots(path.join(oldDir, "ConfessionScreen.js"), false);
  } finally { fs.rmSync(oldDir, { recursive: true, force: true }); }
  after = await snapshots(SCREEN, false);
  for (const k of ["feed", "composer", "comments"]) ok(before[k] === after[k], `flag off: ${k} identical to before (${after[k].length} chars)`);

  console.log("── P4 split-only commit 488b340 (ConfessionFeed.js + confessionApi.js): exactly the screen before it (cb1e5f8)");
  const fromGit = (rev, files, into) => { fs.mkdirSync(into, { recursive: true }); for (const f of files) { try { fs.writeFileSync(path.join(into, `${f}.js`), execSync(`git show ${rev}:app/src/screens/Social/${f}.js`, { cwd: APP, stdio: ["ignore", "pipe", "ignore"] }).toString()); } catch { /* not in that commit */ } } };
  const preFiles = ["ConfessionScreen", "ConfessionCard", "ConfessionCommentThread", "ConfessionComposer", "ConfessionComments", "confessionStyles", "ConfessionSupportSheet", "ConfessionRulesSheet", "confessionSafetyApi"];
  const preDir = path.join(dir, "..", "__presplit");
  const splitDir = path.join(dir, "..", "__split");
  const pre = {};
  try {
    fromGit("cb1e5f8", preFiles, preDir);
    fromGit("488b340", [...preFiles, "ConfessionFeed", "confessionApi"], splitDir);
    for (const flagValue of [false, true]) {
      pre[flagValue] = await snapshots(path.join(preDir, "ConfessionScreen.js"), flagValue);
      const sp = await snapshots(path.join(splitDir, "ConfessionScreen.js"), flagValue);
      for (const k of ["feed", "composer", "comments"]) ok(pre[flagValue][k] === sp[k], `split: confessionSafety ${flagValue ? "on" : "off"}, ${k} identical (${sp[k].length} chars)`);
    }
  } finally { fs.rmSync(preDir, { recursive: true, force: true }); fs.rmSync(splitDir, { recursive: true, force: true }); }

  console.log("── P4a with confessionsV2 off: the screen as before the split; with confessionSafety only the photo button is new");
  const nowOff = await snapshots(SCREEN, false);
  for (const k of ["feed", "composer", "comments"]) ok(nowOff[k] === pre[false][k], `both flags off: ${k} identical to before P4a`);
  const nowSafety = await snapshots(SCREEN, true);
  SKIP = new Set(["add a photo"]);
  const nowSafetyNoPhoto = await snapshots(SCREEN, true);
  SKIP = new Set();
  for (const k of ["feed", "composer", "comments"]) ok(nowSafetyNoPhoto[k] === pre[true][k], `confessionSafety on, confessionsV2 off: ${k} identical to before P4a apart from the photo button`);
  ok(nowSafety.composer.includes('"accessibilityLabel":"add a photo"') && !pre[true].composer.includes("add a photo"), "…the composer has the new 'add a photo' button (confessionSafety: images are checked)");

  console.log("── flag on");
  let ctx = setup(SCREEN, { flag: true, server: { rulesAccepted: false } });
  await tick(120);
  let r = rows(ctx);
  ok(r.every((x) => find(x.tree, (n) => n.props.accessibilityLabel === "more options")), "every card has a 'more options' button");
  ok(H.textOf(r[2].tree).includes("under review · only you can see this") && !H.textOf(r[0].tree).includes("under review"), "my held post shows 'under review', others don't");
  ok(ctx.calls.some((c) => c.url.endsWith("/confessions/safety/me")) && ctx.calls.some((c) => c.url.endsWith("/confessions/my-confessions")), "safety/me and my confession ids are read");

  await press(r[0].tree, "more options");
  let a = ctx.alerts.pop();
  ok(a && a.buttons.map((b) => b.text).join("|") === "report|don't show me this person|cancel", "someone else's: report / don't show me this person / cancel", JSON.stringify(a?.buttons?.map((b) => b.text)));
  a.buttons[0].onPress(); await tick(60);
  let rm = find(ctx.root.tree, (x) => x.type === "ReportModal");
  ok(rm && rm.props.visible === true && rm.props.contentType === "Confession" && rm.props.contentId === "p1", "report → ReportModal for that confession", JSON.stringify(rm?.props && { v: rm.props.visible, t: rm.props.contentType, id: rm.props.contentId }));
  rm.props.onSuccess(); rm.props.onClose(); await tick(30);
  ok(ctx.funnels.includes("confession_reported"), "…funnel confession_reported on success");
  await press(rows(ctx)[0].tree, "more options");
  a = ctx.alerts.pop(); await a.buttons[1].onPress(); await tick(80);
  ok(ctx.calls.some((c) => c.url.endsWith("/confessions/p1/mute-author") && c.method === "POST"), "don't show me this person → mute-author");

  r = rows(ctx);
  const mine = r.find((x) => x.item._id === "p2");
  await press(mine.tree, "more options");
  a = ctx.alerts.pop();
  ok(a && a.buttons.map((b) => b.text).join("|") === "cancel|delete", "mine: delete (with cancel)", JSON.stringify(a?.buttons?.map((b) => b.text)));
  await a.buttons[1].onPress(); await tick(80);
  ok(ctx.calls.some((c) => c.url.endsWith("/confessions/p2") && c.method === "DELETE") && !rows(ctx).some((x) => x.item._id === "p2"), "delete → DELETE, gone from the list");

  console.log("── rules, then the composer");
  await press(ctx.root.tree, "confess");
  let rules = find(ctx.root.tree, (x) => x.type === "Modal" && H.textOf(x).includes("before you confess"));
  ok(rules && rules.props.visible === true, "first post: the rules sheet opens (not the composer)");
  await press(rules, "i agree"); await tick(80);
  ok(ctx.calls.some((c) => c.url.endsWith("/confessions/rules/accept") && c.method === "POST"), "i agree → stored on the server");
  const composerOpen = () => find(ctx.root.tree, (x) => x.type === "Modal" && H.textOf(x).includes("share confession"))?.props.visible === true;
  ok(composerOpen(), "…and the composer opens");
  ctx.restore();

  console.log("── posting");
  ctx = setup(SCREEN, { flag: true, server: { rulesAccepted: true, create: () => ({ ok: false, status: 422, json: async () => ({ code: "NEEDS_EDIT", error: "this has a phone number, e-mail or id number. remove it to post.", reasons: [{ code: "personal_info", message: "this has a phone number, e-mail or id number. remove it to post.", span: "0300-1234567" }] }) }) } });
  await tick(120);
  await press(ctx.root.tree, "confess"); await tick(300);
  let input = find(ctx.root.tree, (x) => x.type === "TextInput" && x.props.maxLength === 1000);
  input.props.onChangeText("call me 0300-1234567"); await tick(30);
  let submit = find(ctx.root.tree, (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("post confession"));
  await submit.props.onPress(); await tick(120);
  const issueBox = find(ctx.root.tree, (x) => x.props.accessibilityRole === "alert");
  ok(issueBox && H.textOf(issueBox).includes("remove it to post") && H.textOf(issueBox).includes("0300-1234567"), "422 NEEDS_EDIT: the reason and the flagged words show in the composer", H.textOf(issueBox || {}));
  input = find(ctx.root.tree, (x) => x.type === "TextInput" && x.props.maxLength === 1000);
  ok(input.props.value === "call me 0300-1234567", "…the text stays");
  ok(ctx.funnels.includes("confession_precheck_edit") && !ctx.alerts.some((x) => /couldn't post/i.test(x.title)), "…funnel confession_precheck_edit, no extra alert");
  input.props.onChangeText("call me later"); await tick(30);
  ok(!find(ctx.root.tree, (x) => x.props.accessibilityRole === "alert"), "…editing the text clears the reasons");
  ctx.restore();

  ctx = setup(SCREEN, { flag: true, server: { rulesAccepted: true, create: () => ({ ok: true, status: 201, json: async () => ({ held: true, status: "pending", support: { helplines: [{ name: "national mental health helpline", number: "1166", note: "" }, { name: "Umang Pakistan", number: "0311-7786264", note: "24/7" }] } }) }) } });
  await tick(120);
  await press(ctx.root.tree, "confess"); await tick(300);
  find(ctx.root.tree, (x) => x.type === "TextInput" && x.props.maxLength === 1000).props.onChangeText("a heavy day");
  await tick(30);
  await find(ctx.root.tree, (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("post confession")).props.onPress(); await tick(150);
  const sup = find(ctx.root.tree, (x) => x.type === "Modal" && H.textOf(x).includes("you're not alone"));
  ok(sup && sup.props.visible === true && H.textOf(sup).includes("1166") && H.textOf(sup).includes("0311-7786264"), "held with support → the support sheet with the helplines");
  ok(find(sup, (x) => x.props.accessibilityLabel === "call national mental health helpline, 1166"), "…each helpline is a 44 px+ call button with a label");
  ok(ctx.funnels.includes("confession_precheck_hold"), "…funnel confession_precheck_hold");
  ctx.restore();

  ctx = setup(SCREEN, { flag: true, server: { rulesAccepted: true, create: () => ({ ok: true, status: 201, json: async () => ({ held: true, status: "pending", message: "your confession is under review." }) }) } });
  await tick(120);
  await press(ctx.root.tree, "confess"); await tick(300);
  find(ctx.root.tree, (x) => x.type === "TextInput" && x.props.maxLength === 1000).props.onChangeText("checker down");
  await tick(30);
  await find(ctx.root.tree, (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("post confession")).props.onPress(); await tick(150);
  ok(ctx.alerts.some((x) => x.title === "under review" && /under review/.test(x.text)), "held without support → an 'under review' notice");
  ctx.restore();

  console.log("── comments");
  ctx = setup(SCREEN, { flag: true, server: { rulesAccepted: true, comment: () => ({ ok: false, status: 403, json: async () => ({ code: "CONFESSION_BANNED", error: "you can't post confessions or comments until 2026-11-22 10:00 (community rules)." }) }) } });
  await tick(120);
  await press(rows(ctx)[0].tree, "comments"); await tick(500);
  const sheet = find(ctx.root.tree, (x) => x.type === "FlatList" && Array.isArray(x.props.data) && x.props.data.some((c) => c._id === "c1"));
  const c1 = expand(ctx, sheet.props.renderItem({ item: sheet.props.data.find((c) => c._id === "c1") }));
  const c2 = expand(ctx, sheet.props.renderItem({ item: sheet.props.data.find((c) => c._id === "c2") }));
  ok(find(c1, (x) => x.props.accessibilityLabel === "report comment") && !find(c2, (x) => x.props.accessibilityLabel === "report comment"), "someone else's comment has 'report', mine doesn't");
  ok(H.textOf(c2).includes("under review") && !H.textOf(c1).includes("under review"), "my held comment shows 'under review'");
  await press(c1, "report comment");
  rm = find(ctx.root.tree, (x) => x.type === "ReportModal");
  ok(rm && rm.props.visible && rm.props.contentType === "ConfessionComment" && rm.props.contentId === "p1:c1", "comment report → ReportModal for p1:c1");
  find(ctx.root.tree, (x) => x.type === "TextInput" && /anonymous comment/.test(x.props.placeholder || "")).props.onChangeText("hello"); await tick(30);
  // the comments sheet comes after the composer: its send button is the last one
  const sends = findAll(ctx.root.tree, (x) => x.type === "TouchableOpacity" && find(x, (y) => y.props?.name === "send"));
  await sends[sends.length - 1].props.onPress(); await tick(120);
  ok(ctx.alerts.some((x) => x.title === "couldn't post" && /until 2026-11-22/.test(x.text)), "a refused comment shows the server's sentence", JSON.stringify(ctx.alerts.map((x) => x.title)));
  ctx.restore();

  console.log("── precheck before the image upload (source: the composer has no image button today, so it's dormant)");
  {
    const src = fs.readFileSync(SCREEN, "utf8").replace(/\r\n/g, "\n");
    const post = src.slice(src.indexOf("const handlePost = useCallback("), src.indexOf("const resetForm = useCallback("));
    const pre = post.indexOf("precheckText(token, newConfession.trim())");
    const up = post.indexOf("await uploadToCloudinary(selectedImage)");
    ok(pre > 0 && up > pre, "handlePost asks the precheck before uploading the image");
    ok(/if \(safety && selectedImage && newConfession\.trim\(\)\) \{/.test(post) && /if \(pre\?\.verdict === "edit" && Array\.isArray\(pre\.reasons\)\) \{[\s\S]{0,160}setComposerIssues\(pre\.reasons\);[\s\S]{0,80}return;/.test(post), "…only with the flag on and an image; 'edit' shows the reasons and stops before the upload");
  }

  console.log("── ReportModal");
  {
    const { React, mount } = H.makeReact();
    const { rn } = H.makeRN({ KeyboardAvoidingView: "KAV" });
    const posts = [];
    const axios = { post: async (url, body) => { posts.push({ url, body }); return { data: { success: true, outcome: "action_taken", message: "thank you. action taken." } }; } };
    const load = H.loader({ react: React, "react-native": rn, axios, "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" }, "@expo/vector-icons": { Ionicons: "Icon" }, "../../context/AuthContext": { AuthContext: { _default: { token: "tok" } } } });
    const RM = load(path.join(H.SRC, "screens/Social/ReportModal.js")).default;
    const open = async (props) => { const m = mount(React.createElement(RM, { visible: true, ...props })); await tick(30); return m; };
    let m = await open({ contentType: "Confession", contentId: "p1" });
    ok(H.textOf(m.tree).includes("it names or identifies someone") && H.textOf(m.tree).includes("someone may be at risk") && H.textOf(m.tree).includes("the exact words"), "confession: confession reasons and the evidence box");
    find(m.tree, (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("it names or identifies someone")).props.onPress(); await tick(20);
    find(m.tree, (x) => x.props.accessibilityLabel === "the exact words, as evidence").props.onChangeText("  ali from bs-cs  "); await tick(20);
    await find(m.tree, (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("submit report")).props.onPress(); await tick(40);
    ok(posts[0]?.url.endsWith("/api/social/confessions/p1/report") && posts[0].body.reason === "Identifies A Person" && posts[0].body.evidence === "ali from bs-cs", "→ POST /confessions/p1/report with reason and trimmed evidence", JSON.stringify(posts[0]));
    ok(H.textOf(m.tree).includes("thank you. action taken."), "…shows the server's outcome");
    m.unmount();
    m = await open({ contentType: "ConfessionComment", contentId: "p1:c9" });
    find(m.tree, (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("spam")).props.onPress(); await tick(20);
    await find(m.tree, (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("submit report")).props.onPress(); await tick(40);
    ok(posts[1]?.url.endsWith("/api/social/confessions/comment/p1/c9/report") && !("evidence" in posts[1].body), "comment → POST /confessions/comment/p1/c9/report (no evidence when empty)", JSON.stringify(posts[1]));
    m.unmount();
    m = await open({ contentType: "Post", contentId: "post1" });
    ok(!H.textOf(m.tree).includes("the exact words") && H.textOf(m.tree).includes("fake account"), "post: the original reasons, no evidence box (unchanged)");
    find(m.tree, (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("spam")).props.onPress(); await tick(20);
    await find(m.tree, (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("submit report")).props.onPress(); await tick(40);
    ok(posts[2]?.url.endsWith("/api/social/posts/report/post1") && JSON.stringify(Object.keys(posts[2].body).sort()) === '["description","reason"]', "…same endpoint and body as before", JSON.stringify(posts[2]));
    m.unmount();
  }

  console.log("── P4a confessionsV2 on");
  {
    const CONFIG = { tags: [{ id: "rant", label: "rant" }, { id: "food", label: "food" }], prompts: ["a hostel story nobody believes", "the class you'd drop if you could", "a small win this week"], moods: ["excited", "broke", "panic", "sus", "shook", "sleepy", "cheeky", "sorted"], maxLength: 500, handle: { enabled: true, handle: "chill-samosa-343" } };
    const v2Feed = () => baseFeed().map((c, i) => (i === 0 ? { ...c, handle: "brave-kitab-512", handleVerified: true, tag: "rant", mood: "sus", meTooCount: 3, meTooByCurrentUser: false } : { ...c, meTooCount: 0, meTooByCurrentUser: false }));
    const ctx = setup(SCREEN, { flag: false, v2: true, server: { config: CONFIG, feed: v2Feed } });
    await tick(150);
    const feedCalls = () => ctx.calls.filter((c) => c.url.includes("/confessions/feed"));
    ok(ctx.calls.some((c) => c.url.endsWith("/confessions/v2/config")), "the composer config is read");
    ok(feedCalls().some((c) => /scope=all&sort=hot&limit=50$/.test(c.url)), "the feed: hot by default (top 50)", feedCalls().map((c) => c.url).join(" | "));
    let r = rows(ctx);
    const first = H.textOf(r[0].tree);
    ok(first.includes("@brave-kitab-512") && first.includes("✓") && first.includes("#rant") && first.includes("sus"), "card: the handle with the verified tick, the tag, the mood", first.slice(0, 200));
    ok(H.textOf(r[1].tree).includes("anon.") && !H.textOf(r[1].tree).includes("@"), "…a post without a handle stays anon.");
    ok(find(r[0].tree, (x) => x.props.accessibilityLabel === "me too, 3"), "card: me too with the count");
    await press(r[0].tree, "me too, 3"); await tick(60);
    ok(ctx.calls.some((c) => c.method === "PUT" && /\/confessions\/p1\/metoo$/.test(c.url)), "me too → PUT /confessions/p1/metoo");
    r = rows(ctx);
    ok(find(r[0].tree, (x) => /^me too, 4, tap to undo$/.test(x.props.accessibilityLabel || "")), "…then the server's count, marked as mine");
    const header = () => expand(ctx, find(ctx.root.tree, (x) => x.type === "FlatList").props.ListHeaderComponent);
    ok(find(header(), (x) => x.props.accessibilityLabel === "sort: hot")?.props.accessibilityState?.selected === true && find(header(), (x) => x.props.accessibilityLabel === "sort: top this week"), "header: sort chips (hot selected) and the tag chips");
    await press(header(), "sort: new"); await tick(120);
    ok(feedCalls().some((c) => /scope=all&sort=new$/.test(c.url)), "sort: new → ?sort=new (the whole feed, as today)", feedCalls().slice(-1)[0]?.url);
    await press(header(), "show #rant"); await tick(120);
    ok(feedCalls().some((c) => /scope=all&sort=new&tag=rant$/.test(c.url)), "tag chip → ?tag=rant", feedCalls().slice(-1)[0]?.url);

    console.log("── P4a composer");
    await press(ctx.root.tree, "confess"); await tick(300);
    const tree = () => ctx.root.tree;
    ok(H.textOf(tree()).includes("not sure where to start?") && find(tree(), (x) => x.props.accessibilityLabel === "start with: a small win this week"), "empty: this week's prompt chips");
    await press(tree(), "start with: a small win this week"); await tick(40);
    const input = () => find(tree(), (x) => x.type === "TextInput" && x.props.placeholder === "What's on your mind? 🤔");
    ok(input().props.value === "a small win this week: " && input().props.maxLength === 500 && !H.textOf(tree()).includes("not sure where to start?"), "a prompt starts the text; 500 characters; the prompts go away once typing");
    await press(tree(), "tag food"); await tick(30);
    await press(tree(), "mood sleepy"); await tick(30);
    ok(H.textOf(tree()).includes("@chill-samosa-343") && H.textOf(tree()).includes("fully anon"), "post as: @handle or fully anon (handles approved)");
    await press(tree(), "post as @chill-samosa-343"); await tick(30);
    ok(H.textOf(tree()).includes("your handle, never your name"), "…with what that means");
    input().props.onChangeText("a small win this week: passed stats"); await tick(30);
    const submit = find(tree(), (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("post confession"));
    await submit.props.onPress(); await tick(200);
    const sent = ctx.calls.find((c) => c.url.includes("/confessions/create"));
    ok(sent && JSON.stringify(sent.body) === JSON.stringify({ text: "a small win this week: passed stats", image: "", visibility: "public", tag: "food", mood: "sleepy", postAs: "handle" }), "post → text, tag, mood, post as", JSON.stringify(sent?.body));
    ok(!find(tree(), (x) => x.props.accessibilityLabel === "add a photo"), "no photo button without confessionSafety");
    ctx.restore();
  }
  {
    const ctx = setup(SCREEN, { flag: false, v2: true, server: { config: { ...{ tags: [], prompts: [], moods: [], maxLength: 500 }, handle: { enabled: false, handle: null } } } });
    await tick(150);
    await press(ctx.root.tree, "confess"); await tick(300);
    ok(!H.textOf(ctx.root.tree).includes("post as") && !H.textOf(ctx.root.tree).includes("fully anon"), "handles not approved: no 'post as' choice (anon., as today)");
    ctx.restore();
  }

  console.log("── photo button (confessionSafety) and the permission check");
  {
    const ctx = setup(SCREEN, { flag: true, server: { rulesAccepted: true }, picker: { requestMediaLibraryPermissionsAsync: async () => ({ status: "denied" }), requestCameraPermissionsAsync: async () => ({ status: "denied" }), MediaTypeOptions: { Images: "Images" } } });
    await tick(150);
    await press(ctx.root.tree, "confess"); await tick(300);
    await press(ctx.root.tree, "add a photo"); await tick(30);
    const sheet = ctx.alerts.pop();
    ok(sheet && sheet.buttons.map((b) => b.text).join("|") === "Camera|Gallery|Cancel", "add a photo → camera / gallery / cancel");
    await sheet.buttons.find((b) => b.text === "Gallery").onPress(); await tick(30);
    const denied = ctx.alerts.pop();
    ok(denied?.title === "Permission required", "…photos denied → 'Permission required' (the check works now)", JSON.stringify(denied));
    ctx.restore();
  }

  console.log("── P4b: polls, follow, save");
  {
    const p4bFeed = () => baseFeed().map((c, i) => (i === 0
      ? { ...c, meTooCount: 0, meTooByCurrentUser: false, poll: { options: [{ text: "chai", votes: 2 }, { text: "coffee", votes: 1 }], total: 3, myVote: null }, following: false, saved: false }
      : { ...c, meTooCount: 0, meTooByCurrentUser: false, following: i === 1, saved: false }));
    const ctx = setup(SCREEN, { flag: false, v2: true, flags: { confessionPolls: true, confessionFollow: true }, server: { config: { tags: [], prompts: [], moods: [], maxLength: 500, handle: { enabled: false } }, feed: p4bFeed } });
    await tick(150);
    let r = rows(ctx);
    ok(find(r[0].tree, (x) => x.props.accessibilityLabel === "vote: chai") && find(r[0].tree, (x) => x.props.accessibilityLabel === "vote: coffee") && H.textOf(r[0].tree).includes("3 votes · anonymous"), "a poll: one button per option, the total, 'anonymous'");
    await press(r[0].tree, "vote: chai"); await tick(80);
    const vote = ctx.calls.find((c) => /\/confessions\/p1\/poll$/.test(c.url));
    ok(vote && vote.method === "PUT" && JSON.stringify(vote.body) === JSON.stringify({ option: 0 }), "vote → PUT /confessions/p1/poll { option: 0 }", JSON.stringify(vote));
    r = rows(ctx);
    ok(find(r[0].tree, (x) => x.props.accessibilityLabel === "chai, 75 percent, your vote") && H.textOf(r[0].tree).includes("tap to change"), "…then the results (75%), mine marked, can be changed");
    ok(ctx.funnels.includes("confession_poll_voted"), "funnel confession_poll_voted");
    await press(r[0].tree, "follow replies"); await tick(60);
    const fol = ctx.calls.find((c) => /\/confessions\/p1\/follow$/.test(c.url));
    ok(fol && JSON.stringify(fol.body) === JSON.stringify({ on: true }) && find(rows(ctx)[0].tree, (x) => x.props.accessibilityLabel === "following replies, tap to mute"), "the bell → follow (PUT { on: true }); then 'following, tap to mute'");
    ok(find(rows(ctx)[1].tree, (x) => x.props.accessibilityLabel === "following replies, tap to mute"), "my own post: already followed (the author follows it), one tap mutes");
    await press(rows(ctx)[1].tree, "following replies, tap to mute"); await tick(60);
    ok(ctx.calls.some((c) => /\/confessions\/p2\/follow$/.test(c.url) && c.body?.on === false) && ctx.funnels.includes("confession_unfollowed"), "mute → PUT { on: false }; funnel confession_unfollowed");
    await press(rows(ctx)[0].tree, "save"); await tick(60);
    ok(ctx.calls.some((c) => /\/confessions\/p1\/save$/.test(c.url) && c.body?.on === true) && find(rows(ctx)[0].tree, (x) => x.props.accessibilityLabel === "saved, tap to unsave") && ctx.funnels.includes("confession_saved"), "save → PUT { on: true }; the bookmark fills");
    const header = () => expand(ctx, find(ctx.root.tree, (x) => x.type === "FlatList").props.ListHeaderComponent);
    await press(header(), "show saved"); await tick(150);
    ok(ctx.calls.some((c) => c.url.includes("/confessions/feed") && /&saved=1/.test(c.url)), "header 'saved' → the feed with saved=1", ctx.calls.filter((c) => c.url.includes("/feed")).slice(-1)[0]?.url);

    console.log("── P4b composer: the poll");
    await press(ctx.root.tree, "confess"); await tick(300);
    await press(ctx.root.tree, "add a poll"); await tick(30);
    const opt = (i) => find(ctx.root.tree, (x) => x.type === "TextInput" && x.props.accessibilityLabel === `poll option ${i}`);
    ok(opt(1) && opt(2) && !opt(3), "add a poll → two option fields");
    await press(ctx.root.tree, "add an option"); await tick(30);
    ok(opt(3) && opt(3).props.maxLength === 60, "+ option → a third (60 characters each)");
    opt(1).props.onChangeText("chai"); opt(2).props.onChangeText("coffee"); opt(3).props.onChangeText(" "); await tick(30);
    find(ctx.root.tree, (x) => x.type === "TextInput" && x.props.placeholder === "What's on your mind? 🤔").props.onChangeText("chai or coffee before class?"); await tick(30);
    await find(ctx.root.tree, (x) => x.type === "TouchableOpacity" && H.textOf(x).includes("post confession")).props.onPress(); await tick(200);
    const sent = ctx.calls.find((c) => c.url.includes("/confessions/create"));
    ok(sent && JSON.stringify(sent.body.poll) === JSON.stringify({ options: ["chai", "coffee"] }), "post → the poll's filled options (an empty one dropped)", JSON.stringify(sent?.body));
    ctx.restore();
  }
  {
    const ctx = setup(SCREEN, { flag: false, v2: true, flags: { confessionPolls: false, confessionFollow: false }, server: { config: { tags: [], prompts: [], moods: [], maxLength: 500, handle: { enabled: false } }, feed: () => baseFeed().map((c, i) => (i === 0 ? { ...c, poll: { options: [{ text: "chai", votes: 1 }, { text: "tea", votes: 0 }], total: 1, myVote: null } } : c)) } });
    await tick(150);
    const r0 = rows(ctx)[0].tree;
    ok(!find(r0, (x) => /^vote: /.test(x.props.accessibilityLabel || "")) && !find(r0, (x) => x.props.accessibilityLabel === "follow replies"), "polls / follow flags off: no vote buttons, no bell");
    await press(ctx.root.tree, "confess"); await tick(300);
    ok(!find(ctx.root.tree, (x) => x.props.accessibilityLabel === "add a poll"), "…and no 'add a poll'");
    ctx.restore();
  }

  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
