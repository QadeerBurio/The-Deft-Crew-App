// ResumeContext (app/src/context/ResumeContext.js): per-action pending state instead of one shared
// `loading`, saves of one resume run one after another on the latest data, a failed refresh keeps
// the list, errors keep the server's answer.
//   node tests/app/resume-context.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const { React, mount, contexts } = H.makeReact();
  const { rn, alerts } = H.makeRN();
  const store = {};
  const calls = [];
  const server = { list: [], failGet: false, delays: {}, gates: [] };
  const later = (v, ms = 0) => new Promise((r) => setTimeout(() => r(v), ms));
  const resumeApi = {
    getResumes: async () => { calls.push(["GET"]); if (server.getGate) await server.getGate.promise; if (server.failGet) throw Object.assign(new Error("timeout of 20000ms exceeded"), { code: "ECONNABORTED", request: {} }); return { success: true, data: server.list.map((r) => ({ ...r })), creationsUsed: server.list.length }; },
    updateResume: async (id, changes) => {
      calls.push(["PUT", id, Object.keys(changes).join(",")]);
      const g = server.gates.shift();
      if (g) await g.promise;
      const r = server.list.find((x) => x._id === id);
      if (changes.__fail) throw { response: { status: 400, data: { message: "that date isn't valid" } } };
      Object.assign(r, JSON.parse(JSON.stringify(changes)));
      return { success: true, data: JSON.parse(JSON.stringify(r)) };
    },
    createResume: async () => { throw { response: { status: 403, data: { code: "RESUME_CREATION_LIMIT_REACHED", error: "limit" } } }; },
    deleteResume: async (id) => { server.list = server.list.filter((r) => r._id !== id); return { success: true }; },
  };
  const AuthContext = { _default: {} };
  const load = H.loader({
    react: React, "react-native": rn,
    "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; } } },
    "../api/resumeApi": { __esModule: true, default: resumeApi },
    "../analytics/metaEvents": { metaEvents: { aiResumeCreated() {} } },
    "./AuthContext": { AuthContext },
  });
  const { default: ResumeProvider } = load(path.join(H.SRC, "context/ResumeContext.js"));
  contexts.set(AuthContext, { token: "tok", isGuest: false, user: { name: "Sana Khan" } });
  server.list = [
    { _id: "r1", personalInfo: { firstName: "Sana" }, education: [], skills: [{ name: "JS" }], professionalSummary: { summary: "keep" } },
    { _id: "r2", personalInfo: { firstName: "Sana" }, education: [], skills: [] },
  ];
  const m = mount(React.createElement(ResumeProvider, null, "child"));
  const ctx = () => m.tree.props.value;
  await H.tick(10);

  console.log("── loading is per action");
  ok(ctx().resumes.length === 2 && ctx().loading === false, "first load done: 2 resumes, loading off");
  const g1 = H.gate();
  server.gates.push(g1);
  const p1 = ctx().updateResume("r1", { skills: [{ name: "JS" }, { name: "React" }] });
  await H.tick(5);
  ok(ctx().loading === false, "a background save does NOT turn on the screen-wide loading (no blank screen)");
  ok(ctx().isPending("update", "r1") && !ctx().isPending("update", "r2") && !ctx().isPending("fetch"), "only 'update r1' is pending");
  server.getGate = H.gate();
  const pf = ctx().fetchResumes();
  await H.tick(5);
  ok(ctx().isPending("fetch") && ctx().isPending("update", "r1"), "a refresh during the save: both pending, separately");
  server.getGate.resolve(); server.getGate = null;
  await pf;
  await H.tick(5);
  ok(!ctx().isPending("fetch") && ctx().isPending("update", "r1"), "the refresh finishing does not clear the save's pending state");
  g1.resolve(); await p1; await H.tick(5);
  ok(!ctx().isPending("update", "r1"), "the save finishing clears its own pending state");

  console.log("── saves of one resume run in order, on the latest data");
  calls.length = 0;
  const gA = H.gate(); server.gates.push(gA);
  const add = (deg) => ctx().updateResume("r1", (latest) => ({ education: [...(latest?.education || []), { degree: deg }] }));
  const a = add("BS"), b = add("MS");
  await H.tick(5);
  ok(calls.filter((c) => c[0] === "PUT").length === 1, "the second save waits for the first (one request at a time per resume)", JSON.stringify(calls));
  gA.resolve(); await Promise.all([a, b]); await H.tick(5);
  const edu = ctx().resumes.find((r) => r._id === "r1").education.map((e) => e.degree).join(",");
  ok(edu === "BS,MS" && server.list[0].education.length === 2, "two quick adds: both kept (BS,MS), on screen and on the server", edu);
  ok(ctx().currentResume === null || ctx().currentResume._id !== "r1" || ctx().currentResume.education.length === 2, "the open resume shows the same");
  ok(calls.filter((c) => c[0] === "PUT").every((c) => c[2] === "education"), "each save sends only the changed field", JSON.stringify(calls));
  const gS = H.gate(); server.gates.push(gS);
  const s1 = ctx().updateResume("r1", (l) => ({ skills: [...l.skills, { name: "Node" }] }));
  const s2 = ctx().updateResume("r2", { skills: [{ name: "Go" }] });
  await H.tick(5);
  ok(calls.filter((c) => c[1] === "r2").length === 1, "another resume's save doesn't wait for r1's", JSON.stringify(calls.slice(-2)));
  gS.resolve(); await Promise.all([s1, s2]);
  ok(server.list[0].professionalSummary.summary === "keep", "nothing else of the resume was sent or changed");

  console.log("── errors");
  let err = null;
  await ctx().updateResume("r1", { __fail: true }).catch((e) => (err = e));
  ok(err?.response?.status === 400 && !ctx().isPending("update", "r1"), "a failed save rejects with the server's answer (for a plain message) and clears pending");
  const ok2 = await ctx().updateResume("r1", (l) => ({ skills: [...l.skills, { name: "SQL" }] }));
  ok(ok2?.skills?.some((x) => x.name === "SQL"), "the next save after a failure still runs");

  console.log("── a failed refresh keeps the list");
  server.failGet = true;
  const res = await ctx().fetchResumes();
  await H.tick(5);
  ok(res === false && ctx().resumes.length === 2 && !!ctx().error && ctx().loading === false, "refresh fails: still 2 resumes, error set, no endless loading");
  server.failGet = false;

  console.log("── limit");
  alerts.length = 0;
  let le = null;
  await ctx().createResume({}, { alert: false }).catch((e) => (le = e));
  ok(le?.code === "RESUME_LIMIT" && alerts.length === 0, "at the limit: an error with code RESUME_LIMIT, no alert when the screen shows its own");
  await ctx().createResume({}).catch(() => {});
  ok(alerts.length === 1 && /limit/i.test(alerts[0].title), "…and the old alert when asked");

  console.log("── delete");
  await ctx().deleteResume("r2");
  ok(ctx().resumes.length === 1 && !ctx().isPending("delete", "r2"), "delete: removed from the list, pending cleared");

  console.log("── source");
  const src = H.read("app/src/context/ResumeContext.js");
  ok(!/setLoading\(/.test(src), "no shared setLoading left");
  ok(!/setResumes\(\s*(resumes|\[[^\]]*\.\.\.resumes)/.test(src) && !/resumes\.map\(r => r\._id === resumeId/.test(src), "no list update from a stale closure");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
