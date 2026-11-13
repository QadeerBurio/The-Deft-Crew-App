// useAction + ActionButton (app/src/hooks/useAction.js, app/src/ui/ActionButton.js) and the request
// time limits (app/src/config/timeouts.js, plainError): one spinner per button, two buttons in a row
// both finish, double taps run once, errors and timeouts reset the button with a plain message,
// leaving the screen aborts quietly, grouped actions run one after another.
//   node tests/app/use-action.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const { React, mount } = H.makeReact();
  const { rn, alerts } = H.makeRN();
  const load = H.loader({ react: React, "react-native": rn });
  const { default: useAction, runInGroup, ACTION_SAFETY_MS } = load(path.join(H.SRC, "hooks/useAction.js"));
  const ActionButton = load(path.join(H.SRC, "ui/ActionButton.js")).default;
  const T = load(path.join(H.SRC, "config/timeouts.js"));
  const { plainError } = load(path.join(H.SRC, "utils/plainError.js"));
  const press = (tree, label) => H.byLabel(tree, label).props.onPress();
  const busy = (tree, label) => !!H.byLabel(tree, label).props.accessibilityState?.busy;

  console.log("── limits");
  ok(T.TIMEOUT.DEFAULT === 20000 && T.TIMEOUT.AI === 90000 && T.TIMEOUT.UPLOAD === 120000 && T.TIMEOUT.PDF === 120000, "20 s default, 90 s AI, 120 s uploads and PDFs");
  ok(T.TOO_LONG === "taking too long, try again", "the timeout message");
  ok(ACTION_SAFETY_MS > T.TIMEOUT.UPLOAD, "an action's safety limit is above every request limit (requests time out first and say why)");
  const axiosTimeout = Object.assign(new Error("timeout of 20000ms exceeded"), { code: "ECONNABORTED", request: {} });
  ok(plainError(axiosTimeout) === T.TOO_LONG, "plainError: an axios timeout says 'taking too long, try again'");
  ok(/connection/.test(plainError(Object.assign(new Error("Network Error"), { request: {} }))), "plainError: offline still says 'check your connection'");
  ok(plainError({ response: { status: 409, data: { message: "event is full" } } }) === "event is full", "plainError: a 4xx message is still shown");

  console.log("── withTimeout / fetchWithTimeout");
  {
    let caught = null;
    await T.withTimeout(new Promise(() => {}), 30, "pdf").catch((e) => (caught = e));
    ok(T.isTimeout(caught) && caught.name === "TimeoutError", "withTimeout: a promise that never settles rejects with a timeout");
    ok((await T.withTimeout(Promise.resolve(7), 1000)) === 7, "withTimeout: a fast result passes through");
    const realFetch = global.fetch;
    let seenSignal = null;
    global.fetch = (url, init) => new Promise((resolve, reject) => {
      seenSignal = init.signal;
      init.signal.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
    });
    let fe = null;
    await T.fetchWithTimeout("https://x.test/a", {}, 30).catch((e) => (fe = e));
    ok(T.isTimeout(fe) && seenSignal?.aborted, "fetchWithTimeout: aborts the request and rejects as a timeout");
    const outer = new AbortController();
    const p = T.fetchWithTimeout("https://x.test/b", { signal: outer.signal }, 5000).catch((e) => e);
    outer.abort();
    const oe = await p;
    ok(oe?.name === "AbortError" && !T.isTimeout(oe), "fetchWithTimeout: the caller's own abort is not reported as a timeout");
    global.fetch = async (url, init) => ({ ok: true, init });
    global.FormData = class FormData {};
    const r = await T.fetchWithTimeout("https://x.test/c", { method: "POST", body: new FormData() });
    ok(r.ok && r.init.signal && !("timeout" in r.init), "fetchWithTimeout: passes a signal, never an unknown option");
    global.fetch = realFetch;
  }

  console.log("── two buttons in a row: both finish");
  {
    const gA = H.gate(), gB = H.gate();
    const results = [];
    function Two() {
      const a = useAction(async () => { const v = await gA.promise; results.push(v); return v; }, { errorTitle: "a failed" });
      const b = useAction(async () => { const v = await gB.promise; results.push(v); return v; }, { errorTitle: "b failed" });
      return React.createElement("View", null,
        React.createElement(ActionButton, { action: a, title: "save a", accessibilityLabel: "A" }),
        React.createElement(ActionButton, { action: b, title: "save b", accessibilityLabel: "B" }));
    }
    const m = mount(React.createElement(Two));
    press(m.tree, "A");
    await H.tick(5);
    ok(busy(m.tree, "A") && !busy(m.tree, "B"), "tap A: only A spins");
    press(m.tree, "B");
    await H.tick(5);
    ok(busy(m.tree, "A") && busy(m.tree, "B"), "tap B while A runs: B starts too (not blocked by A)");
    gB.resolve("B");
    await H.tick(5);
    ok(busy(m.tree, "A") && !busy(m.tree, "B"), "B finishes first: B's spinner stops, A keeps spinning");
    gA.resolve("A");
    await H.tick(5);
    ok(!busy(m.tree, "A") && !busy(m.tree, "B"), "A finishes: both buttons are free");
    ok(results.join() === "B,A" && alerts.length === 0, "both results landed, no error shown", results.join());
  }

  console.log("── double tap runs once");
  {
    let calls = 0; const g = H.gate();
    function One() {
      const a = useAction(async () => { calls++; await g.promise; });
      return React.createElement(ActionButton, { action: a, title: "go", accessibilityLabel: "go" });
    }
    const m = mount(React.createElement(One));
    const onPress = H.byLabel(m.tree, "go").props.onPress; // the same handler, tapped twice before any re-render
    onPress(); onPress();
    press(m.tree, "go");
    await H.tick(5);
    ok(calls === 1, "three fast taps: one request", calls);
    ok(H.byLabel(m.tree, "go").props.disabled === true, "the button is disabled while it runs");
    g.resolve();
    await H.tick(5);
    press(m.tree, "go");
    await H.tick(5);
    ok(calls === 2, "after it finishes, the next tap runs again", calls);
  }

  console.log("── errors and timeouts reset the button");
  {
    alerts.length = 0;
    let mode = "error";
    function Err() {
      const a = useAction(async () => {
        if (mode === "error") throw { response: { status: 400, data: { message: "that code is used" } } };
        if (mode === "timeout") throw Object.assign(new Error("timeout of 90000ms exceeded"), { code: "ECONNABORTED", request: {} });
        if (mode === "server") throw { response: { status: 500, data: { message: "MongoServerError E11000" } } };
      }, { errorTitle: "not saved" });
      return React.createElement(ActionButton, { action: a, title: "save", accessibilityLabel: "save" });
    }
    const m = mount(React.createElement(Err));
    press(m.tree, "save"); await H.tick(5);
    ok(!busy(m.tree, "save") && alerts[0]?.title === "not saved" && alerts[0]?.text === "that code is used", "a failed request: spinner off, plain message", JSON.stringify(alerts[0]));
    mode = "timeout"; press(m.tree, "save"); await H.tick(5);
    ok(!busy(m.tree, "save") && alerts[1]?.text === "taking too long, try again", "a timeout: spinner off, 'taking too long, try again'", JSON.stringify(alerts[1]));
    mode = "server"; press(m.tree, "save"); await H.tick(5);
    ok(alerts[2] && !/mongo|e11000/i.test(alerts[2].text), "a 500: no technical text", JSON.stringify(alerts[2]));
  }
  {
    alerts.length = 0;
    function Hang() {
      const a = useAction(() => new Promise(() => {}), { timeoutMs: 30, errorTitle: "no answer" });
      return React.createElement(ActionButton, { action: a, title: "ask", accessibilityLabel: "ask" });
    }
    const m = mount(React.createElement(Hang));
    press(m.tree, "ask"); await H.tick(5);
    ok(busy(m.tree, "ask"), "a request that never answers: spinning");
    await H.tick(60);
    ok(!busy(m.tree, "ask") && alerts[0]?.text === "taking too long, try again", "…until the action's limit: spinner off, 'taking too long, try again'", JSON.stringify(alerts[0]));
  }
  {
    alerts.length = 0; const warn = console.warn; const warned = []; console.warn = (...a) => warned.push(a.join(" "));
    function Bg() {
      const a = useAction(async () => { throw new Error("sync failed"); }, { silent: true, name: "background sync" });
      return React.createElement(ActionButton, { action: a, title: "sync", accessibilityLabel: "sync" });
    }
    const m = mount(React.createElement(Bg));
    press(m.tree, "sync"); await H.tick(5);
    console.warn = warn;
    ok(alerts.length === 0 && warned.some((w) => /background sync failed/.test(w)) && !busy(m.tree, "sync"), "silent action: no message, logged, button reset");
  }

  console.log("── leaving the screen");
  {
    alerts.length = 0;
    let signal = null; const g = H.gate(); let renders = 0;
    function Leave() {
      renders++;
      const a = useAction(async ({ signal: s }) => { signal = s; await g.promise; });
      return React.createElement(ActionButton, { action: a, title: "upload", accessibilityLabel: "upload" });
    }
    const m = mount(React.createElement(Leave));
    press(m.tree, "upload"); await H.tick(5);
    const before = renders;
    m.unmount();
    ok(signal?.aborted === true, "the request's AbortSignal is aborted when the screen closes");
    g.reject(Object.assign(new Error("canceled"), { name: "AbortError" }));
    await H.tick(5);
    ok(renders === before && alerts.length === 0, "no state update and no message after the screen is gone");
  }

  console.log("── grouped actions run one after another");
  {
    const order = []; const g1 = H.gate();
    const p1 = runInGroup("resume:1", async () => { order.push("start1"); await g1.promise; order.push("end1"); });
    const p2 = runInGroup("resume:1", async () => { order.push("start2"); });
    const p3 = runInGroup("other", async () => { order.push("other"); });
    await H.tick(5);
    ok(order.join() === "start1,other", "the second save of the same resume waits; another group doesn't", order.join());
    g1.resolve(); await Promise.all([p1, p2, p3]);
    ok(order.join() === "start1,other,end1,start2", "…and starts when the first is done", order.join());
    const g2 = H.gate();
    const f1 = runInGroup("r2", () => g2.promise).catch(() => "failed");
    const f2 = runInGroup("r2", async () => "second ran");
    g2.reject(new Error("x"));
    ok((await f1) === "failed" && (await f2) === "second ran", "a failed save doesn't block the next one");
  }

  console.log("── wiring (source)");
  {
    const api = H.read("app/src/api/api.js");
    ok(/axios\.defaults\.timeout = TIMEOUT\.DEFAULT/.test(api) && /timeout: TIMEOUT\.DEFAULT/.test(api), "api.js: axios default and the api instance use the 20 s default");
    ok(/timeout: TIMEOUT\.DEFAULT/.test(H.read("app/src/api/brandApi.js")), "brandApi: 20 s");
    const r = H.read("app/src/api/resumeApi.js");
    ok((r.match(/timeout: TIMEOUT\.AI/g) || []).length === 4 && /timeout: TIMEOUT\.UPLOAD/.test(r) && !/timeout: 60000/.test(r), "resumeApi: AI calls 90 s, resume upload 120 s");
    ok(/timeout: TIMEOUT\.AI/.test(H.read("app/src/services/aiService.js")), "AI chat message: 90 s");
    ok(/withTimeout\(\s*FileSystem\.downloadAsync[\s\S]*TIMEOUT\.PDF/.test(H.read("app/src/api/resumeStudioApi.js")), "Resume Studio PDF download: 120 s");
    ok(/timeout: TIMEOUT\.UPLOAD/.test(H.read("app/src/screens/Career/JobApplicationForm.js")) && /timeout: TIMEOUT\.UPLOAD/.test(H.read("app/src/screens/Social/ChatDetails.js")), "job application and chat media uploads: 120 s");
    // no request without a limit: every raw fetch goes through fetchWithTimeout (Slider has its own abort)
    const fs = require("fs");
    const files = [];
    (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith(".js")) files.push(p); } })(H.SRC);
    const raw = files.filter((f) => !/config[\\/]timeouts\.js$/.test(f)).filter((f) => {
      const s = fs.readFileSync(f, "utf8");
      if (!/(await |= |return )fetch\(/.test(s)) return false;
      return !(/Slider\.js$/.test(f) && /signal: controller\.signal/.test(s));
    });
    ok(raw.length === 0, "no raw fetch() without a time limit", raw.map((f) => path.relative(H.APP, f)).join(", "));
  }

  console.log("── travel and AI chat streams");
  {
    const t = H.read("app/src/components/TravelChatBot.js");
    ok(/idleTimer = setTimeout\(\(\) => stop\(TOO_LONG\), TIMEOUT\.AI\)/.test(t) && /if \(chunk\) armIdle\(\)/.test(t), "travel: 90 s without data ends the answer with 'taking too long, try again'");
    ok(/const closeChat[\s\S]{0,300}streamRef\.current\?\.stop\(\)/.test(t), "travel: closing the chat aborts the stream");
    ok(/useEffect\(\(\) => \(\) => streamRef\.current\?\.stop\(\), \[\]\)/.test(t) && /const startNewTrip[\s\S]{0,200}streamRef\.current\?\.stop\(\)/.test(t), "travel: leaving the screen and 'new trip' abort it too");
    ok(/setIsStreaming\(false\)/.test(t.slice(t.indexOf("const stop = (note)"), t.indexOf("const armIdle"))), "travel: stopping re-enables the input (isStreaming off)");
    const a = H.read("app/src/services/aiService.js");
    ok(/onError\(timeoutError\(TIMEOUT\.AI, 'chat stream'\)\)/.test(a) && /!completed && xhr\.status > 0 && onComplete/.test(a), "AI chat stream: 90 s without data is a timeout; a stream closed without [DONE] still finishes");
  }

  console.log("── travel stream (behaviour)");
  {
    // drive the real stop/armIdle code with a fake XHR and fake timers
    const xhrs = [];
    class FakeXHR {
      constructor() { this.readyState = 0; this.responseText = ""; this.status = 0; this.aborted = false; xhrs.push(this); }
      open() {} setRequestHeader() {} send(b) { this.body = b; }
      abort() { this.aborted = true; this.readyState = 4; this.onreadystatechange && this.onreadystatechange(); }
      push(text) { this.readyState = 3; this.status = 200; this.responseText += text; this.onreadystatechange(); }
    }
    const timers = [];
    const realST = global.setTimeout, realCT = global.clearTimeout;
    global.XMLHttpRequest = FakeXHR;
    const { React: R2, mount: mount2 } = H.makeReact();
    const { rn: rn2 } = H.makeRN();
    const store = { token: "tok", isGuest: "false" };
    const loadT = H.loader({
      react: R2, "react-native": rn2,
      "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) },
      "@expo/vector-icons": { Ionicons: "Icon", MaterialCommunityIcons: "Icon", Feather: "Icon" },
      "react-native-svg": { __esModule: true, default: "Svg", Path: "Path", Circle: "Circle" },
      "expo-haptics": { impactAsync: async () => {}, notificationAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} },
      "@react-native-async-storage/async-storage": { default: { multiGet: async (ks) => ks.map((k) => [k, store[k]]) }, multiGet: async (ks) => ks.map((k) => [k, store[k]]) },
      "@react-native-community/netinfo": { default: { addEventListener: () => () => {} }, addEventListener: () => () => {} },
      "../api/api": { __esModule: true, default: { defaults: { baseURL: "https://x.test/api" }, post: async () => ({ data: {} }) } },
      "../guest/GuestGate": { useGuestGate: () => ({ requireAccount: () => true, isGuest: false }) },
      "../context/AuthContext": { AuthContext: { _default: { token: "tok", isGuest: false } } },
      "../engagement/engagementBus": { engagementBus: { emit() {} }, ENGAGEMENT_EVENTS: {} },
      "../analytics/metaEvents": { metaEvents: { travelAssistantUsed() {} } },
      "../utils/clipboard": { copyToClipboard() {} },
    });
    let Chat;
    try { Chat = loadT(path.join(H.SRC, "components/TravelChatBot.js")).default; } catch (e) { ok(false, "travel chat loads in the test runtime", e.message); }
    if (Chat) {
      const ref = { current: null };
      const m = mount2(R2.createElement(Chat, { ref }));
      ref.current.open("plan hunza");
      await H.tick(5); // open + effect
      global.setTimeout = (fn, ms) => { const t = { fn, ms, done: false }; timers.push(t); return t; };
      global.clearTimeout = (t) => { if (t) t.done = true; };
      // the pending message is sent after 250 ms (real timer captured before the swap)
      await new Promise((r) => realST(r, 300));
      const fire = (ms) => timers.filter((t) => !t.done && t.ms === ms).forEach((t) => { t.done = true; t.fn(); });
      fire(250);
      await new Promise((r) => realST(r, 30));
      const x = xhrs[xhrs.length - 1];
      const input = () => H.find(m.tree, (n) => n.type === "TextInput");
      ok(x && input()?.props.editable === false, "while the answer streams, the input is off");
      x.push('data: {"token":"day 1"}\n\n');
      ok(timers.some((t) => !t.done && t.ms === 90000), "each piece of data restarts the 90 s limit");
      fire(90000);
      await new Promise((r) => realST(r, 10));
      ok(x.aborted && input()?.props.editable === true, "90 s without data: the request is aborted and the input works again");
      const all = JSON.stringify(m.tree);
      ok(/taking too long, try again/.test(all) && /day 1/.test(all), "…the answer keeps what arrived and says 'taking too long, try again'");
      // a new question, then close the chat mid-answer
      H.find(m.tree, (n) => n.type === "TextInput").props.onChangeText("visa for turkey");
      await new Promise((r) => realST(r, 5));
      H.byLabel(m.tree, "send").props.onPress();
      await new Promise((r) => realST(r, 30));
      const y = xhrs[xhrs.length - 1];
      ok(y !== x && !y.aborted, "a new question streams again");
      H.byLabel(m.tree, "close travel chat").props.onPress();
      await new Promise((r) => realST(r, 10));
      ok(y.aborted, "closing the chat aborts the stream");
    }
    global.setTimeout = realST; global.clearTimeout = realCT;
  }

  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
