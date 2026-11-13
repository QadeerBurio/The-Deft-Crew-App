// Error messages (chore/error-messages), the 10 files with the most swallowed errors: failures the
// student caused and can retry show a short plain message; background failures stay silent for the
// student but are logged; no catch is left empty without a reason.
//   node tests/app/error-messages.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

const TOP10 = ["screens/OfferScreen.js", "context/AuthContext.js", "screens/Social/ChatDetails.js", "screens/MyDiscountScreen.js", "analytics/metaEvents.js", "components/TravelChatBot.js", "context/ChatContext.js", "screens/Social/SearchScreen.js", "utils/pushNotifications.js", "api/api.js"];

(async () => {
  console.log("── no silent catch without a reason");
  for (const f of TOP10) {
    const s = H.read(`app/src/${f}`);
    const empty = [...s.matchAll(/catch\s*(\(\w*\))?\s*\{\s*\}/g)].map((m) => s.slice(0, m.index).split("\n").length);
    ok(empty.length === 0, `${f}: every catch logs, shows a message, or says why it doesn't`, `empty at ${empty.join(",")}`);
  }
  const all = TOP10.map((f) => H.read(`app/src/${f}`)).join("\n");
  ok(!/console\.warn\("\[\w[\w ]*\] (s|meId|msg|stale|perm|dataObj|saved|filteredOffers|outgoingUserId) failed/.test(all), "log lines say which step failed (no variable names as labels)");

  console.log("── messages the student sees (source)");
  const cd = H.read("app/src/screens/Social/ChatDetails.js");
  ok(/Alert\.alert\("couldn't load the messages", plainError\(err, /.test(cd), "a chat that can't load says so (it used to open empty)");
  ok(/Alert\.alert\("voice message not sent", plainError\(uploadErr, /.test(cd), "a voice message that didn't go out says so (it used to vanish)");
  ok(/console\.log\('Message notif create failed \(non-blocking\):'/.test(cd), "the recipient's notification after a send stays a background log");

  console.log("── AI chat (behaviour)");
  {
    const { React, mount } = H.makeReact();
    const alerts = [];
    const { rn } = H.makeRN({ Alert: { alert: (title, text) => alerts.push({ title, text }) } });
    const warned = []; const warn = console.warn; console.warn = (...a) => warned.push(a.join(" "));
    const fail = (status) => Object.assign(new Error("x"), status ? { response: { status, data: { message: "MongoServerError E11000 dup key" } } } : { request: {}, message: "timeout of 20000ms exceeded", code: "ECONNABORTED" });
    const aiService = {
      getSessions: async () => { throw fail(500); },
      getHistory: async () => { throw fail(); },
      getSuggestions: async () => ({ success: true, data: [] }),
      deleteSession: async () => { throw fail(500); },
      streamMessage: () => ({ abort() {} }),
    };
    const load = H.loader({
      react: React, "react-native": rn,
      "@react-native-community/netinfo": { __esModule: true, default: { addEventListener: (cb) => { cb({ isConnected: true, isInternetReachable: true }); return () => {}; } } },
      "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async () => null, setItem: async () => {} } },
      "../services/aiService": { __esModule: true, default: aiService },
      "../analytics/metaEvents": { metaEvents: { aiChatUsed() {} } },
    });
    const { ChatProvider } = load(path.join(H.SRC, "context/ChatContext.js"));
    const m = mount(React.createElement(ChatProvider, null, "child"));
    await H.tick(10);
    const ctx = () => m.tree.props.value;
    await ctx().loadSessions?.();
    await H.tick(5);
    ok(alerts.length === 0, "the chat list failing to refresh in the background: no message");
    await ctx().loadSessionDetails("s1");
    await H.tick(5);
    ok(alerts.some((a) => a.title === "couldn't open this chat" && a.text === "taking too long, try again"), "opening a past chat that times out: 'couldn't open this chat' — 'taking too long, try again'", JSON.stringify(alerts));
    await ctx().deleteSession("s1");
    ok(alerts.some((a) => a.title === "chat not deleted" && !/mongo|e11000/i.test(a.text)), "deleting fails: 'chat not deleted' with no technical text", JSON.stringify(alerts.slice(-1)));
    console.warn = warn;
    ok(warned.some((w) => /\[ai chat\] history not loaded/.test(w)) && warned.some((w) => /\[ai chat\] chat not deleted/.test(w)), "both are logged too");
  }
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
