// AI Resume Studio in the app (FLAG_RESUME_STUDIO_V2): the flags gate, polling, decisions saved offline
// and sent later (409 reloads), and the screen: start, checking an uploaded resume, review with
// confirmations and the coaching panel, DRAFT preview, approval with two confirmations, sending the
// version with the application, versions, 'insufficient information', accessibility, placement.
//   node tests/app/resume-studio.test.js
// Real app modules (Babel) with fakes for React Native, phone storage and the network.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SRC = path.join(APP, "app/src");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  \u2192 " + String(x).slice(0, 400) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8");
global.__DEV__ = false;

// (helpers copied from tests/app/responsiveness.test.js)
// \u2500\u2500 hook runtime \u2500\u2500
function makeReact() {
  const hooks = new Map(); let cur = null; let pending = []; const roots = new Map(); const renders = {};
  const slot = (init) => { const l = hooks.get(cur.path) || hooks.set(cur.path, []).get(cur.path); const i = cur.i++; if (!(i in l)) l[i] = init(); return [l, i]; };
  const contexts = new Map();
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }),
    Fragment: "Fragment",
    createContext: (dflt) => { const c = { _default: dflt, Provider: "Provider" }; return c; },
    useState(init) { const [l, i] = slot(() => ({ v: typeof init === "function" ? init() : init })); const root = cur.path.split("/")[0]; return [l[i].v, (v) => { const nv = typeof v === "function" ? v(l[i].v) : v; if (Object.is(nv, l[i].v)) return; l[i].v = nv; roots.get(root)?.(); }]; },
    useRef(init) { const [l, i] = slot(() => ({ current: init })); return l[i]; },
    useMemo(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, v: undefined })); const s = l[i]; if (!s.deps || !deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) { s.v = fn(); s.deps = deps; } return s.v; },
    useCallback(fn, deps) { return React.useMemo(() => fn, deps); },
    useContext(ctx) { return contexts.has(ctx) ? contexts.get(ctx) : ctx?._default ?? {}; },
    useEffect(fn, deps) { const [l, i] = slot(() => ({ deps: undefined, cleanup: null })); const s = l[i]; if (!deps || !s.deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) pending.push(() => { if (s.cleanup) s.cleanup(); s.deps = deps; s.cleanup = fn() || null; }); },
    memo: (c) => c,
    forwardRef: (c) => c,
    useSyncExternalStore(subscribe, getSnapshot) {
      const [l, i] = slot(() => ({ unsub: null }));
      const [, force] = React.useState(0);
      if (!l[i].unsub) l[i].unsub = subscribe(() => force((x) => x + 1));
      return getSnapshot();
    },
  };
  React.useLayoutEffect = React.useEffect;
  React.default = React;
  const expand = (el, p) => {
    if (el == null || typeof el !== "object") return el;
    if (Array.isArray(el)) return el.map((c, k) => expand(c, `${p}.${k}`));
    if (typeof el.type === "function") { const prev = cur; const np = p + "/" + (el.type.name || "C"); cur = { path: np, i: 0 }; renders[el.type.name] = (renders[el.type.name] || 0) + 1; const out = el.type(el.props); cur = prev; return expand(out, np); }
    const out = { type: el.type, props: { ...el.props, children: expand(el.props.children, p + "." + (el.type?.displayName || el.type)) } };
    // host refs (React 19: ref is a prop): point them at the expanded node
    const ref = el.props?.ref;
    if (ref && typeof ref === "object" && "current" in ref) ref.current = out;
    else if (typeof ref === "function") ref(out);
    return out;
  };
  const mount = (element) => {
    const root = "r" + Math.random().toString(36).slice(2); let tree = null;
    const render = () => { tree = expand(element, root); const fx = pending; pending = []; fx.forEach((f) => f()); };
    roots.set(root, render); render();
    return { get tree() { return tree; }, rerender: (el) => { if (el) element = el; render(); } };
  };
  return { React, mount, renders, contexts };
}

function loader(mocks) {
  const cache = new Map();
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports;
    const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), {
      filename: file, babelrc: false, configFile: false,
      plugins: [[reqApp.resolve("@babel/plugin-transform-react-jsx"), { runtime: "classic" }], reqApp.resolve("@babel/plugin-transform-modules-commonjs")],
    });
    const m = new Module(file); m.filename = file;
    m.require = (id) => {
      if (id in mocks) return mocks[id];
      if (id.startsWith(".")) {
        const abs = path.resolve(path.dirname(file), id);
        for (const key of Object.keys(mocks)) if (key.startsWith("/") && abs.replace(/\\/g, "/").endsWith(key)) return mocks[key];
        return load(require.resolve(abs.replace(/(\.js)?$/, ".js")));
      }
      return reqApp(id);
    };
    cache.set(file, m); m._compile(code, file);
    return m.exports;
  };
  return load;
}

// \u2500\u2500 react-native fakes \u2500\u2500
const flat = (st) => (Array.isArray(st) ? Object.assign({}, ...st.flat(Infinity).filter(Boolean)) : st || {});
function makeRN(extra = {}) {
  class Value { constructor(v) { this.v = v; } setValue(v) { this.v = v; } interpolate() { return this; } stopAnimation() {} }
  const anim = () => ({ start: (cb) => cb && cb({ finished: true }), stop() {} });
  const loops = { started: 0, stopped: 0 };
  return {
    loops,
    rn: {
      View: "View", Text: "Text", Pressable: "Pressable", TouchableOpacity: "TouchableOpacity", Image: "Image", ScrollView: "ScrollView", FlatList: "FlatList", Modal: "Modal", TextInput: "TextInput", ActivityIndicator: "ActivityIndicator", RefreshControl: "RefreshControl", KeyboardAvoidingView: "KeyboardAvoidingView", StatusBar: "StatusBar",
      StyleSheet: { create: (x) => x, flatten: flat, absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, absoluteFillObject: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, hairlineWidth: 1 },
      Dimensions: { get: () => ({ width: 390, height: 844 }) },
      Platform: { OS: "android", select: (o) => o.android ?? o.default },
      AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) },
      Animated: { Value, View: "Animated.View", Text: "Animated.Text", spring: anim, timing: anim, parallel: anim, sequence: anim, loop: () => ({ start() { loops.started++; }, stop() { loops.stopped++; } }), event: () => () => {} },
      Easing: { bezier: () => (x) => x, out: (f) => f, in: (f) => f, inOut: (f) => f, cubic: (x) => x, ease: (x) => x, linear: (x) => x },
      ...extra,
    },
  };
}

const textOf = (n) => (n == null || n === false ? "" : typeof n === "string" || typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(textOf).join("") : textOf(n.props?.children));
const find = (n, pred) => { let hit = null; (function w(x) { if (!x || hit || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(w); if (pred(x)) { hit = x; return; } w(x.props?.children); })(n); return hit; };
const byLabel = (tree, label) => find(tree, (x) => x.props?.accessibilityLabel === label);

(async () => {
  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 api/resumeStudioApi.js \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  console.log("\u2500\u2500 the flags gate, polling and offline decisions (api/resumeStudioApi.js)");
  const store = { token: null, isGuest: null };
  const calls = [];
  let flagOn = true;
  let online = true;
  let serverRevision = 3;
  const offline = () => Object.assign(new Error("Network Error"), { response: undefined });
  const refuse = (status, error) => Object.assign(new Error("refused"), { response: { status, data: { success: false, error } } });
  let pollStatuses = ["queued", "running", "succeeded"];
  const api = {
    get: async (url) => {
      calls.push(["GET", url]);
      if (url === "/app/flags/me") return { data: { resumeStudioV2: flagOn } };
      if (!online) throw offline();
      if (url.startsWith("/career/resume/tailor-jobs/")) { const s = pollStatuses.shift() || "succeeded"; return { data: { success: true, data: { id: "tj1", status: s, draftId: s === "succeeded" ? "d1" : null, pollAfterMs: 1 } } }; }
      if (url.startsWith("/career/resume/drafts/")) return { data: { success: true, data: { id: "d1", revision: serverRevision, suggestions: [] } } };
      return { data: { success: true, data: {} } };
    },
    patch: async (url, body) => {
      calls.push(["PATCH", url, body]);
      if (!online) throw offline();
      if (body.revision !== serverRevision) throw refuse(409, { code: "STALE_REVISION", message: "changed", current: serverRevision });
      serverRevision++;
      return { data: { success: true, data: { id: "d1", revision: serverRevision, decided: body.decisions } } };
    },
    post: async (url, body) => { calls.push(["POST", url, body]); if (!online) throw offline(); return { data: { success: true, data: { id: "tj1", status: "queued" } } }; },
    delete: async () => ({ data: { success: true, data: {} } }),
  };
  const storage = new Map();
  const AsyncStorage = { getItem: async (k) => (k in store ? store[k] : storage.has(k) ? storage.get(k) : null), setItem: async (k, v) => { storage.set(k, v); }, removeItem: async (k) => { storage.delete(k); } };
  const loadA = loader({ "@react-native-async-storage/async-storage": AsyncStorage, "./api": { __esModule: true, default: api, BASE_URL: "https://x.test/api" }, "expo-file-system/legacy": {}, "expo-sharing": {} });
  const S = loadA(path.join(SRC, "api/resumeStudioApi.js"));
  ok((await S.studioEnabled()) === false && calls.length === 0, "signed out: off, no request");
  store.token = "g"; store.isGuest = "true";
  ok((await S.studioEnabled()) === false && calls.length === 0, "guest: off, no request");
  store.token = "tok-a"; store.isGuest = "false";
  ok((await S.studioEnabled()) === true && (await S.studioEnabled()) === true && calls.filter((c) => c[1] === "/app/flags/me").length === 1, "pilot student: on, /flags/me asked once");
  store.token = "tok-b"; flagOn = false;
  ok((await S.studioEnabled()) === false, "another account outside the pilot: off");

  const ticks = [];
  const job = await S.waitForTailoring("tj1", { onTick: (s) => ticks.push(s), wait: async () => {} });
  ok(job.status === "succeeded" && job.draftId === "d1" && ticks.join(",") === "queued,running,succeeded", "polling until the tailoring is done", ticks.join());

  let r = await S.saveDecisions("d1", 3, [{ suggestionId: "s1", decision: "accepted" }]);
  ok(r.draft?.revision === 4 && calls.at(-1)[2].revision === 3, "online: a decision is saved with the revision the screen saw");
  online = false;
  r = await S.saveDecisions("d1", 4, [{ suggestionId: "s2", decision: "rejected" }]);
  ok(r.queued === true && (await S.hasPending("d1")), "offline: the decision waits on the phone");
  r = await S.saveDecisions("d1", 4, [{ suggestionId: "s3", decision: "edited", editedText: "x", confirmTrue: true }]);
  ok(r.queued === true && JSON.parse(storage.get("resumeStudio:pending:d1")).decisions.length === 2, "offline: later decisions join the waiting ones");
  online = true;
  r = await S.flushPending("d1");
  const sentFlush = calls.at(-1)[2];
  ok(r.flushed === true && sentFlush.revision === 4 && sentFlush.decisions.map((d) => d.suggestionId).join() === "s2,s3" && !(await S.hasPending("d1")), "back online: the waiting decisions are sent together", JSON.stringify(sentFlush));
  online = false;
  await S.saveDecisions("d1", 5, [{ suggestionId: "s4", decision: "accepted" }]);
  online = true;
  serverRevision = 9; // changed on another device meanwhile
  r = await S.flushPending("d1");
  ok(r.dropped === true && r.draft.revision === 9 && !(await S.hasPending("d1")), "changed on another device: waiting decisions dropped, the draft reloads");
  r = await S.saveDecisions("d1", 2, [{ suggestionId: "s5", decision: "accepted" }]);
  ok(r.conflict === true && r.draft.revision === 9, "a stale revision (409) reloads the draft instead of overwriting");

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 screens/Resume/ResumeStudio.js \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const { React, mount } = makeReact();
  const alerts = [];
  const { rn } = makeRN({ Alert: { alert: (title, text, buttons) => { alerts.push({ title, text }); const yes = (buttons || []).find((b) => b.text === "yes"); if (yes) yes.onPress(); } }, Switch: "Switch", TextInput: "TextInput" });
  const icons = { "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon" } };
  const sent = [];
  let enabled = true;
  let draftState;
  const freshDraft = () => ({
    id: "d1", resumeId: "r1", status: "open", revision: 1, target: { kind: "tdc_job", jobId: "j1", title: "Frontend Developer" }, provenance: "user_entered_resume",
    facts: [{ factId: "fact_4", type: "achievement", value: "Built a React page for order tracking" }, { factId: "fact_9", type: "skill", value: "JavaScript" }, { factId: "fact_10", type: "skill", value: "React" }],
    suggestions: [
      { suggestionId: "s1", kind: "reword", fieldPath: "workExperience[0].achievements[0]", original: "Built a React page for order tracking", proposed: "Built an order-tracking page in React", reason: "clearer", sourceFactIds: ["fact_4"], status: "ok", riskFlags: [], decision: "pending" },
      { suggestionId: "s2", kind: "reword", fieldPath: "professionalSummary.summary", original: "Student who builds web apps.", proposed: "Student who builds web apps with TypeScript.", reason: "matches", sourceFactIds: [], status: "needs_user_confirmation", riskFlags: [{ flag: "new_skill", values: ["TypeScript"] }], decision: "pending" },
      { suggestionId: "s3", kind: "reword", fieldPath: "workExperience[0].description", original: "Worked on the dashboard.", proposed: "Worked on the dashboard since 2019.", reason: "tenure", sourceFactIds: [], status: "blocked", riskFlags: [{ flag: "new_date", values: ["2019"] }], decision: "pending" },
      { suggestionId: "s4", kind: "reorder", fieldPath: "order.skills", original: "", proposed: "[1,0]", reason: "React first", sourceFactIds: [], status: "ok", riskFlags: [], decision: "pending" },
    ],
    match: { matched: [{ requirement: "React", kind: "skill", evidenceFactIds: ["fact_10"] }], missing: [{ requirement: "TypeScript", kind: "skill", coachingNote: "a small typescript project would show this." }], unknown: [{ requirement: "2+ years of experience", kind: "experience" }] },
    warnings: ["Some lines in the job description looked like instructions to the AI and were ignored."], aiSuggestions: "available", fallback: null, unresolved: 4, approvedVersionId: null,
  });
  let startError = null;
  let attachedState = null;
  const studioMock = {
    studioEnabled: async () => enabled,
    newKey: () => "key-1",
    studioApi: {
      source: async (id) => ({ resumeId: id, provenance: "parsed_upload", verified: false, revisionHash: "h1", facts: [{ factId: "fact_1", value: "Frontend Intern at Bright Labs (2025-06 to 2025-08)" }] }),
      confirmSource: async (id, hash) => { sent.push({ what: "confirm", id, hash }); startError = null; return { verified: true }; },
      startTailoring: async (body, key) => { sent.push({ what: "start", body, key }); if (startError) throw startError; return { id: "tj1", status: "queued" }; },
      draft: async () => draftState,
      approve: async (id, body) => { sent.push({ what: "approve", id, body }); return { version: { id: "v1", label: body.label, target: { kind: "tdc_job", jobId: "j1", title: "Frontend Developer" } }, created: true }; },
      deleteDraft: async () => ({}),
      versions: async () => [{ id: "v1", label: "Frontend - Bright", target: { kind: "tdc_job" }, approvedAt: "2026-11-03T00:00:00Z", usedInApplication: true, deletable: false }, { id: "v2", label: "Pasted role", target: { kind: "pasted" }, approvedAt: "2026-11-02T00:00:00Z", usedInApplication: false, deletable: true }],
      deleteVersion: async (id) => { sent.push({ what: "deleteVersion", id }); return {}; },
      version: async (id) => ({ id, pdf: { urdu: "none", message: null } }),
      attachVersion: async (appId, versionId) => { sent.push({ what: "attach", appId, versionId }); attachedState = { applicationId: appId, versionId, label: "Frontend - Bright", contentHash: "abcdef1234567890", attachedAt: "2026-11-03T10:00:00Z" }; return attachedState; },
      applicationResume: async () => { if (!attachedState) throw Object.assign(new Error("none"), { code: "NOT_FOUND" }); return attachedState; },
    },
    waitForTailoring: async () => ({ status: "succeeded", draftId: "d1" }),
    saveDecisions: async (id, revision, decisions) => {
      sent.push({ what: "decide", id, revision, decisions });
      const d = decisions[0];
      const s = draftState.suggestions.find((x) => x.suggestionId === d.suggestionId);
      if (d.decision === "accepted" && s.status === "needs_user_confirmation" && !d.confirmTrue) throw Object.assign(new Error("is it true?"), { code: "CONFIRMATION_REQUIRED" });
      s.decision = d.decision;
      draftState = { ...draftState, revision: draftState.revision + 1, unresolved: draftState.suggestions.filter((x) => x.decision === "pending").length };
      return { draft: draftState };
    },
    flushPending: async () => ({ draft: null }),
    rememberDraft: () => {},
    lastDraft: async () => null,
    openPdf: async (p, name) => { sent.push({ what: "pdf", p, name }); },
  };
  const resumeApiMock = { __esModule: true, default: { getResumes: async () => ({ data: [{ _id: "r1", title: "My resume", isPrimary: true }, { _id: "r2", title: "Second" }] }), getMyApplications: async () => [{ _id: "app1", jobId: { _id: "j1" } }] } };
  const load = loader({
    react: React, "react-native": rn, ...icons,
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "../../ui": { ScreenHeader: (p) => React.createElement("Header", { accessibilityLabel: "header" }, p.title) },
    "../../api/resumeApi": resumeApiMock,
    "../../api/resumeStudioApi": studioMock,
  });
  const ResumeStudio = load(path.join(SRC, "screens/Resume/ResumeStudio.js")).default;
  const settle = async (root) => { for (let i = 0; i < 4; i++) { await tick(15); root.rerender(); } };
  const navs = [];
  const navigation = { navigate: (...a) => navs.push(a), goBack: () => navs.push(["back"]) };

  console.log("\u2500\u2500 flag off");
  enabled = false;
  let root = mount(React.createElement(ResumeStudio, { route: { params: { jobId: "j1", jobTitle: "Frontend Developer" } }, navigation }));
  await settle(root);
  ok(textOf(root.tree).includes("isn't available for your account"), "flag off: the screen says it isn't available, nothing is sent", textOf(root.tree).slice(0, 100));
  ok(!sent.length, "flag off: no request");

  console.log("\u2500\u2500 A start, an unverified upload, B tailoring");
  enabled = true;
  draftState = freshDraft();
  startError = Object.assign(new Error("check first"), { code: "SOURCE_UNVERIFIED" });
  root = mount(React.createElement(ResumeStudio, { route: { params: { jobId: "j1", jobTitle: "Frontend Developer" } }, navigation }));
  await settle(root);
  let t = textOf(root.tree);
  ok(t.includes("tailor for Frontend Developer") && t.includes("nothing is added without you"), "start: for the job from its details, with the promise", t.slice(0, 200));
  ok(find(root.tree, (x) => x.props?.accessibilityRole === "radio" && x.props.accessibilityState?.checked && x.props.accessibilityLabel === "resume My resume"), "start: the primary resume is picked");
  byLabel(root.tree, "tailor my resume").props.onPress();
  await settle(root);
  t = textOf(root.tree);
  ok(t.includes("check your details first") && t.includes("Frontend Intern at Bright Labs"), "an unconfirmed upload: the details read from it are shown first", t.slice(0, 200));
  byLabel(root.tree, "these details are correct").props.onPress();
  await settle(root);
  ok(sent.some((s) => s.what === "confirm" && s.id === "r1" && s.hash === "h1"), "confirming sends the exact revision");
  const starts = sent.filter((s) => s.what === "start");
  ok(starts.length === 2 && starts.every((s) => s.key === "key-1" && s.body.jobId === "j1" && s.body.resumeId === "r1"), "tailoring starts again with the same idempotency key (a double tap is one job)");

  console.log("\u2500\u2500 C review: statuses, confirmations, coaching");
  t = textOf(root.tree);
  ok(t.includes("review the changes") && t.includes("4 left to review"), "review: how many are left", t.slice(0, 200));
  ok(t.includes("from your resume") && t.includes("not in your resume") && t.includes("can't be used"), "each change says where it stands");
  ok(t.includes("a skill that isn't in your resume: TypeScript") && t.includes("a date that isn't in your resume: 2019"), "the risk is explained in plain words");
  ok(t.includes("from your resume: Built a React page for order tracking"), "the fact behind a change is shown");
  ok(t.includes("looked like instructions to the AI"), "the injection warning is shown");
  ok(t.includes("no scores and no hiring predictions") && t.includes("\u2713 React") && t.includes("\u2013 TypeScript") && t.includes("a small typescript project") && t.includes("? 2+ years"), "coaching panel: matched with evidence, missing with a note, unknown");
  ok(!/\b\d{1,3}%|percentile|hire probability|shortlist/i.test(t), "no scores, percentages or hiring verdicts anywhere");
  ok(t.includes("React, JavaScript"), "a reorder is shown as the new order");
  ok(byLabel(root.tree, "accept summary").props.disabled === true, "a 'not in your resume' change can't be accepted until 'this is true' is on");
  ok(!byLabel(root.tree, "accept experience 1") && byLabel(root.tree, "reject experience 1") && textOf(byLabel(root.tree, "reject experience 1")) === "keep my original", "a blocked change can only be rejected (keep my original)");
  ok(!byLabel(root.tree, "edit experience 1"), "a blocked change can't be edited into the resume");
  ok(byLabel(root.tree, "continue to approve").props.disabled === true, "approve stays off until every change is decided");
  byLabel(root.tree, "accept experience 1 \u00b7 point 1").props.onPress();
  await settle(root);
  ok(sent.some((s) => s.what === "decide" && s.revision === 1 && s.decisions[0].suggestionId === "s1" && s.decisions[0].decision === "accepted"), "accepting sends the revision the screen saw");
  find(root.tree, (x) => x.type === "Switch" && x.props.accessibilityLabel === "this is true: summary").props.onValueChange(true);
  root.rerender();
  ok(byLabel(root.tree, "accept summary").props.disabled === false, "with 'this is true' on, it can be accepted");
  byLabel(root.tree, "accept summary").props.onPress();
  await settle(root);
  ok(sent.some((s) => s.what === "decide" && s.decisions[0].suggestionId === "s2" && s.decisions[0].confirmTrue === true), "the confirmation goes with the decision");
  byLabel(root.tree, "reject experience 1").props.onPress();
  await settle(root);
  byLabel(root.tree, "accept order of your skills").props.onPress();
  await settle(root);
  t = textOf(root.tree);
  ok(t.includes("all reviewed") && byLabel(root.tree, "continue to approve").props.disabled === false, "all decided: approve is open", t.slice(0, 120));

  console.log("\u2500\u2500 D preview, E approve, F send with the application");
  byLabel(root.tree, "preview pdf").props.onPress();
  await tick(5);
  ok(sent.some((s) => s.what === "pdf" && s.p === "drafts/d1/preview.pdf" && /DRAFT/.test(s.name)), "the preview is the DRAFT pdf");
  byLabel(root.tree, "continue to approve").props.onPress();
  root.rerender();
  ok(textOf(root.tree).includes("once approved it never changes"), "approval says the version is final");
  ok(byLabel(root.tree, "approve").props.disabled === true, "approve needs both confirmations");
  find(root.tree, (x) => x.type === "Switch" && x.props.accessibilityLabel === "everything in this resume is true").props.onValueChange(true);
  root.rerender();
  ok(byLabel(root.tree, "approve").props.disabled === true, "one confirmation is not enough");
  find(root.tree, (x) => x.type === "Switch" && x.props.accessibilityLabel === "i reviewed every change").props.onValueChange(true);
  root.rerender();
  byLabel(root.tree, "approve").props.onPress();
  await settle(root);
  const ap = sent.find((s) => s.what === "approve");
  ok(ap && ap.body.confirmAccurate === true && ap.body.confirmReviewed === true && ap.body.revision === draftState.revision, "approve sends both confirmations and the revision", JSON.stringify(ap));
  t = textOf(root.tree);
  ok(t.includes("approved") && t.includes("send this version with your application?"), "approved: offers to send it with the application for this job", t.slice(0, 200));
  byLabel(root.tree, "send with my application").props.onPress();
  await settle(root);
  ok(sent.some((s) => s.what === "attach" && s.appId === "app1" && s.versionId === "v1"), "sending attaches this version to that application");
  t = textOf(root.tree);
  ok(t.includes("sent with your application") && t.includes("snapshot abcdef12") && t.includes("kept for 2 years") && t.includes("application timeline"), "confirmation shows the snapshot and points to the timeline", t.slice(-300));

  console.log("\u2500\u2500 G versions");
  root = mount(React.createElement(ResumeStudio, { route: { params: { view: "versions" } }, navigation }));
  await settle(root);
  t = textOf(root.tree);
  ok(t.includes("Frontend - Bright") && t.includes("sent with an application, kept 2 years") && t.includes("Pasted role"), "versions: label, sent ones kept 2 years", t.slice(0, 300));
  ok(!byLabel(root.tree, "delete Frontend - Bright") && !!byLabel(root.tree, "delete Pasted role"), "only a version never sent can be deleted");
  byLabel(root.tree, "delete Pasted role").props.onPress();
  await tick(10);
  ok(sent.some((s) => s.what === "deleteVersion" && s.id === "v2") && alerts.some((a) => a.title === "delete this version?"), "delete asks first");
  byLabel(root.tree, "download Frontend - Bright").props.onPress();
  await tick(5);
  ok(sent.some((s) => s.what === "pdf" && s.p === "versions/v1/export.pdf"), "download is the approved pdf (no DRAFT)");

  console.log("\u2500\u2500 no AI answer: insufficient information");
  draftState = { ...freshDraft(), suggestions: [], unresolved: 0, aiSuggestions: "insufficient_information", fallback: "no_model", warnings: [] };
  studioMock.lastDraft = async () => "d1";
  studioMock.flushPending = async () => ({ draft: draftState });
  root = mount(React.createElement(ResumeStudio, { route: { params: {} }, navigation }));
  await settle(root);
  t = textOf(root.tree);
  ok(t.includes("insufficient information") && !/\b50\b/.test(t), "no ai suggestions: says insufficient information, no made-up numbers", t.slice(0, 300));
  ok(byLabel(root.tree, "continue to approve").props.disabled === false, "the student's own resume can still be approved in the ats layout");

  console.log("\u2500\u2500 accessibility");
  const all = [];
  (function walk(x) { if (!x || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(walk); all.push(x); walk(x.props?.children); })(root.tree);
  const src = read("app/src/screens/Resume/ResumeStudio.js");
  ok(/btn: \{[^}]*minHeight: 44/.test(src) && /function Button[\s\S]*?accessibilityRole="button" accessibilityLabel=\{label\} accessibilityState=\{\{ disabled/.test(src) && all.filter((x) => x.props?.accessibilityRole === "button").length >= 3, "buttons are 44 pt, announced as buttons with their state");
  ok(/accessibilityLiveRegion="polite"/.test(src) && /accessibilityRole="switch"/.test(src) && /accessibilityRole="radio"/.test(src), "live updates, switches and radio choices are announced");
  ok(all.filter((x) => x.type === "Text").every((x) => x.props.maxFontSizeMultiplier), "every text caps its font scale (large fonts stay readable)");

  console.log("\u2500\u2500 placement");
  const career = read("app/src/components/Career.js");
  ok(/studioOn && selectedJob\?\._id/.test(career) && career.includes('navigation.navigate("ResumeStudio", { jobId: selectedJob._id'), "job details: 'tailor my resume' only for pilot students, opens the studio for that job");
  ok(/offerTailoredVersion\(applied\?\.data\?\.application\?\._id/.test(career), "after applying: offers to send a version tailored for that job");
  const dash = read("app/src/screens/Resume/ResumeDashboard.js");
  ok(/studioOn && \(/.test(dash) && dash.includes("navigation.navigate('ResumeStudio', { resumeId: selectedResume._id, fresh: true })") && dash.includes("{ view: 'versions' }"), "resume dashboard: 'tailor for a job' and 'my versions' only for pilot students");
  ok(read("app/src/navigation/ResumeNavigator.js").includes('name="ResumeStudio"') && read("app/src/navigation/DrawerNavigator.js").includes('name="ResumeStudio"'), "the screen is registered in the resume stack and next to the jobs screen");
  ok(read("app/src/navigation/TabNavigator.js").includes('"ResumeStudio"') && read("app/src/navigation/DrawerNavigator.js").includes("'ResumeStudio',"), "full screen: tab bar and drawer header hidden");
  const babel2 = reqApp("@babel/core");
  let parsed = 0;
  for (const f of ["app/src/components/Career.js", "app/src/screens/Resume/ResumeDashboard.js", "app/src/navigation/ResumeNavigator.js", "app/src/navigation/DrawerNavigator.js", "app/src/navigation/TabNavigator.js"]) {
    try { babel2.transformSync(read(f), { filename: f, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-transform-react-jsx"), reqApp.resolve("@babel/plugin-transform-modules-commonjs")] }); parsed++; } catch (e) { console.log(e.message.slice(0, 200)); }
  }
  ok(parsed === 5, "the changed app files compile (jsx)");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
