// Job pushes and the single apply flow (fix/tdccareers-to-jobdetails): every job push type (the data each server push
// sends, old route names TDCCareers / MyApplications included) opens the job (Career { openJobId } → JobDetails →
// JobApplicationForm); the old names stay registered as redirects; TDCCareers and its apply form are gone; one apply
// form; Meta SubmitApplication from that form only, after the server confirmed.
//   node tests/app/job-pushes.test.js
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SRC = path.join(APP, "app/src");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 400) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8").replace(/\r\n/g, "\n");
global.__DEV__ = false;
// (helpers copied from tests/app/responsiveness.test.js)
// ── hook runtime ──
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

// ── react-native fakes ──
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

const all = (n, pred, out = []) => {
  if (n == null || typeof n !== "object") return out;
  if (Array.isArray(n)) { n.forEach((c) => all(c, pred, out)); return out; }
  if (pred(n)) out.push(n);
  all(n.props?.children, pred, out);
  return out;
};
const byLabel = (tree, label) => all(tree, (x) => x.props?.accessibilityLabel === label)[0];


(async () => {
  const navMocks = { "@react-navigation/native": { CommonActions: { reset: (state) => ({ type: "RESET", payload: state }) } } };
  const nav = loader(navMocks)(path.join(SRC, "utils/careerNav.js"));
  const J = "6a0000000000000000000001", APPL = "6a00000000000000000000a1";

  // the push data each server push type sends (server: models/Notification.js, services/career/*)
  const PUSHES = [
    ["application submitted (Application Status)", { route: "TDCCareers", params: {}, jobId: J, applicationId: APPL, type: "new_job" }],
    ["application status update", { route: "TDCCareers", params: {}, jobId: J, applicationId: APPL }],
    ["bulk status update", { route: "TDCCareers", params: {}, jobId: J, applicationId: APPL }],
    ["interview scheduled", { route: "TDCCareers", params: {}, jobId: J, applicationId: APPL }],
    ["interview rescheduled", { route: "TDCCareers", params: {}, jobId: J, applicationId: APPL }],
    ["interview cancelled", { route: "TDCCareers", params: {}, jobId: J, applicationId: APPL }],
    ["new application (employer)", { route: "TDCCareers", params: {}, jobId: J, applicationId: APPL }],
    ["new job posted (admin)", { route: "TDCCareers", params: {}, jobId: J }],
    ["hiring timeline (interview invite, offer, ...)", { screen: "MyApplications", applicationId: APPL, jobId: J, eventType: "INTERVIEW_INVITED" }],
    ["invite to apply", { careerInviteId: "i1", screen: "Career", params: { openJobId: J } }],
    ["job alert (matches your skills)", { careerJobId: J, screen: "Career", params: { openJobId: J } }],
    ["Daily Drop job", { route: "Career", params: { openJobId: J, jobId: J } }],
  ];

  console.log("── utils/careerNav.jobTarget: every job push type → the job");
  for (const [label, data] of PUSHES) {
    const t = nav.jobTarget(data.route || data.screen, data.params || {}, data);
    ok(t.route === "Career" && t.params.openJobId === J && Object.keys(t.params).length === 1, `${label} → Career { openJobId } → JobDetails`, JSON.stringify(t));
  }
  // already sent before this change (no jobId): not lost
  let t = nav.jobTarget("MyApplications", {}, { applicationId: APPL });
  ok(t.route === "Career" && t.params.openApplications === true, "an old timeline push (no jobId) → the jobs list with 'my applications' open", JSON.stringify(t));
  t = nav.jobTarget("TDCCareers", {}, { applicationId: APPL });
  ok(t.route === "Career" && t.params.openApplications === true, "an old interview-cancelled / status push (no jobId) → 'my applications'", JSON.stringify(t));
  t = nav.jobTarget("TDCCareers", {}, {});
  ok(t.route === "Career" && t.params.tdc === true, "the old TDC careers list with nothing else → the jobs list, TDC jobs", JSON.stringify(t));
  t = nav.jobTarget("TDCCareers", { jobId: { _id: J } }, {});
  ok(t.params.openJobId === J, "a populated job id is accepted");
  t = nav.jobTarget("Career", { search: "x" }, {});
  ok(t.route === "Career" && t.params.search === "x", "the jobs list without a job: unchanged");
  t = nav.jobTarget("Events", { openEventId: "e1" }, { jobId: J });
  ok(t.route === "Events" && t.params.openEventId === "e1", "other routes pass through unchanged");
  ok([...nav.OLD_JOB_ROUTES].sort().join() === "MyApplications,TDCCareers", "old names accepted: TDCCareers, MyApplications");

  console.log("── utils/pushNotifications.getRouteFromNotificationData (the push tap)");
  const push = loader({
    ...navMocks,
    "expo-notifications": {}, "expo-device": {}, "expo-constants": { default: {} },
    "react-native": { Platform: { OS: "android", select: (o) => o.android ?? o.default } },
    "@react-native-async-storage/async-storage": { default: { getItem: async () => null, setItem: async () => {} } },
  })(path.join(SRC, "utils/pushNotifications.js"));
  for (const [label, data] of PUSHES) {
    const r = push.getRouteFromNotificationData(data);
    ok(r.route === "Career" && r.params.openJobId === J, `tap: ${label} → JobDetails`, JSON.stringify(r));
  }
  const ev = push.getRouteFromNotificationData({ route: "Events", params: { openEventId: "e1" } });
  ok(ev.route === "Events" && ev.params.openEventId === "e1", "tap: a non-job push is unchanged");
  const tk = push.getRouteFromNotificationData({ ticketRegistrationId: "r1", route: "Events" });
  ok(tk.route === "EventTicket", "tap: the ticket push is unchanged");

  console.log("── the old names stay registered as redirects");
  {
    const { React, mount } = makeReact();
    const load = loader({ react: React, ...navMocks });
    const Redirect = load(path.join(SRC, "screens/Career/JobRouteRedirect.js")).default;
    for (const [name, params, want] of [
      ["TDCCareers", { jobId: J }, { openJobId: J }],
      ["TDCCareers", {}, { tdc: true }],
      ["MyApplications", { applicationId: APPL, jobId: J }, { openJobId: J }],
      ["MyApplications", { applicationId: APPL }, { openApplications: true }],
    ]) {
      const replaced = [];
      mount(React.createElement(Redirect, { navigation: { replace: (r, p) => replaced.push([r, p]) }, route: { name, params } }));
      ok(replaced.length === 1 && replaced[0][0] === "Career" && JSON.stringify(replaced[0][1]) === JSON.stringify(want), `navigate("${name}", ${JSON.stringify(params)}) → Career ${JSON.stringify(want)}`, JSON.stringify(replaced));
    }
    const drawer = read("app/src/navigation/DrawerNavigator.js");
    ok(drawer.includes('<Stack.Screen name="TDCCareers" component={JobRouteRedirect} />') && drawer.includes('<Stack.Screen name="MyApplications" component={JobRouteRedirect} />'), "TDCCareers and MyApplications are registered as the redirect");
  }

  console.log("── every notification consumer maps job routes");
  for (const [f, re] of [
    ["app/src/utils/pushNotifications.js", /return jobTarget\(route, params, data\);/],
    ["app/src/components/NotificationBanner.js", /const t = jobTarget\(route, params, meta\);\n\s*(?:navigationRef\.navigate\(|navigateAnywhere\(navigationRef, )t\.route, t\.params\);/],
    ["app/src/components/NotificationModal.js", /const t = jobTarget\(screen, m\.params \|\| item\.params \|\| \{\}, m\);/],
    ["app/src/components/NotificationSkillshare.js", /const t = jobTarget\(screen, m\.params \|\| \{\}, m\);/],
    ["app/src/hooks/useNotificationPopup.js", /const t = jobTarget\(route, params, data\);\n\s*(?:navigationRef\.navigate\(|navigateAnywhere\(navigationRef, )t\.route, t\.params\);/],
  ]) ok(re.test(read(f)), `${path.basename(f)} sends job notifications to the job`);
  ok(/useOpenFromParams\('openJobId', async \(id\) => \{\n\s*const job = jobs\.find\(\(j\) => String\(j\._id\) === String\(id\)\);\n\s*openJobDetails\(navigation, job \|\| String\(id\)\);/.test(read("app/src/components/Career.js")), "Career { openJobId } opens JobDetails (Apply → JobApplicationForm)");

  console.log("── one jobs area, one apply form, one Meta call");
  ok(!fs.existsSync(path.join(SRC, "components/TDCCareers.js")), "TDCCareers.js (the second jobs list and its apply form) is gone");
  const career = read("app/src/components/Career.js");
  ok(/const openApplications = route\?\.params\?\.openApplications;/.test(career) && /setShowApplicationsModal\(true\);/.test(career) && /const tdcOnly = route\?\.params\?\.tdc;/.test(career) && /setFilters\(\(f\) => \(\{ \.\.\.f, isTdc: true \}\)\);/.test(career), "the jobs list opens 'my applications' ({ openApplications }) and shows TDC jobs ({ tdc })");
  ok(career.includes("<CareerApplications />") && career.includes("timeline={careerOn}"), "…and its 'my applications' sheet has the hiring timeline (from TDCCareers)");
  ok(/onPress=\{\(\) => openMyApplications\(navigation\)\}/.test(read("app/src/screens/Career/JobDetails.js")), "JobDetails: an applied job links to 'my application' (interviews, offers)");
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.js$/.test(f.name)) files.push(p); } };
  walk(SRC);
  const relOf = (p) => path.relative(APP, p).split(path.sep).join("/");
  const applyPosts = files.filter((p) => /\.post\(\s*`[^`]*\/apply\/\$\{/.test(fs.readFileSync(p, "utf8"))).map(relOf);
  ok(applyPosts.join() === "app/src/screens/Career/JobApplicationForm.js", "exactly one apply form posts a job application (JobApplicationForm)", applyPosts.join());
  const pickers = files.filter((p) => /getDocumentAsync/.test(fs.readFileSync(p, "utf8")) && /coverLetter/.test(fs.readFileSync(p, "utf8"))).map(relOf);
  ok(pickers.join() === "app/src/screens/Career/JobApplicationForm.js", "no other screen has a job application form (cover letter + resume file)", pickers.join());
  const meta = files.filter((p) => /metaEvents\.jobApplied\(/.test(fs.readFileSync(p, "utf8"))).map(relOf);
  ok(meta.join() === "app/src/screens/Career/JobApplicationForm.js", "Meta SubmitApplication is sent from that form only", meta.join());
  const form = read("app/src/screens/Career/JobApplicationForm.js");
  const post = form.indexOf("await api.post(`/jobs/apply/"), fire = form.indexOf("metaEvents.jobApplied(jobId)"), done = form.indexOf("doneRef.current = true;");
  ok(post > 0 && fire > post && done > post && done < fire && (form.match(/metaEvents\.jobApplied\(/g) || []).length === 1, "…once, after the server confirmed (behaviour: tests/app/job-details.test.js)");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("FAIL  crashed  → " + e.stack); process.exit(1); });
