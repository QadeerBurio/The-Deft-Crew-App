// Social buttons and the AI chat (fix/social-buttons): likes send one request per tap-burst, a
// profile's message / connections / connection buttons have their own busy states with a guard that
// works before the next render, and the AI chat keeps opening a past chat and waiting for an answer
// apart (a late history never overwrites a message just sent).
//   node tests/app/social-buttons.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  console.log("── AI chat (behaviour)");
  {
    const { React, mount } = H.makeReact();
    const { rn } = H.makeRN();
    const history = H.gate();
    const streams = [];
    const aiService = {
      getSessions: async () => ({ success: true, data: [] }),
      getHistory: async () => history.promise,
      getSuggestions: async () => ({ success: true, data: [] }),
      streamMessage: (message, sid, cat, onToken, onComplete) => { const s = { onToken, onComplete, aborted: false, abort() { this.aborted = true; } }; streams.push(s); return s; },
    };
    const load = H.loader({
      react: React, "react-native": rn,
      "@react-native-community/netinfo": { __esModule: true, default: { addEventListener: (cb) => { cb({ isConnected: true, isInternetReachable: true }); return () => {}; } } },
      "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async () => null, setItem: async () => {} } },
      "../services/aiService": { __esModule: true, default: aiService },
      "../analytics/metaEvents": { metaEvents: { aiChatUsed() {} } },
    });
    const { ChatProvider, default: Default } = load(path.join(H.SRC, "context/ChatContext.js"));
    const Provider = ChatProvider || Default;
    const m = mount(React.createElement(Provider, null, "child"));
    await H.tick(10);
    const ctx = () => m.tree.props.value;
    const pLoad = ctx().loadSessionDetails("s1");
    await H.tick(5);
    ok(ctx().historyLoading === true && ctx().isLoading === false, "opening a past chat: historyLoading, not the answer spinner");
    ctx().sendMessage("plan my week");
    await H.tick(5);
    ok(ctx().isLoading === true && ctx().historyLoading === false, "sending meanwhile: the answer spinner, the history spinner off");
    history.resolve({ success: true, data: [{ _id: "old", role: "user", message: "old chat" }] });
    await pLoad; await H.tick(5);
    ok(ctx().messages.some((x) => x.message === "plan my week") && !ctx().messages.some((x) => x._id === "old"), "the late history does not replace the message just sent", JSON.stringify(ctx().messages.map((x) => x.message)));
    streams[0].onToken("hello"); streams[0].onComplete();
    await H.tick(10);
    ok(ctx().isLoading === false && ctx().messages.some((x) => x.message === "hello"), "the answer arrives; spinner off");
  }

  console.log("── likes (source)");
  const pc = H.read("app/src/screens/Social/PostCard.js").replace(/\r\n/g, "\n");
  ok(/if \(likeInFlight\.current\) return;/.test(pc) && /likeInFlight\.current = true;\n\s*try \{\n\s*const res = await axios\.put\(`\$\{API_URL\}\/posts\/like/.test(pc) && /\} finally \{\n\s*likeInFlight\.current = false;/.test(pc), "feed post: one like request at a time (a double tap can't send two toggles)");
  const pd = H.read("app/src/screens/Social/PostDetailScreen.js").replace(/\r\n/g, "\n");
  ok(/if \(isLiking \|\| likeInFlight\.current\) return;/.test(pd) && /likeInFlight\.current = false;\n\s*setIsLiking\(false\);/.test(pd), "post detail: the like guard works before the next render");
  const cf = H.read("app/src/screens/Social/ConfessionScreen.js").replace(/\r\n/g, "\n");
  ok(/if \(likesInFlight\.current\.has\(id\)\) return;/.test(cf) && /\} finally \{\n\s*likesInFlight\.current\.delete\(id\);/.test(cf), "confessions: one like request per confession at a time");

  console.log("── profile buttons (source)");
  const up = H.read("app/src/screens/Social/UserProfile.js").replace(/\r\n/g, "\n");
  ok((up.match(/if \(actionBusyRef\.current\) return;/g) || []).length === 5 && !/if \(isActionLoading\) return;/.test(up), "connect / accept / reject / cancel / disconnect: a guard set at once (double taps run once)");
  ok((up.match(/beginAction\(\);/g) || []).length === 5 && !/setIsActionLoading\(true\)/.test(up.replace(/const beginAction = [^\n]*/, "")), "…each begins and ends through one place");
  ok(/if \(chatBusyRef\.current\) return;/.test(up) && /setOpeningChat\(true\)/.test(up) && (up.match(/disabled=\{openingChat\}/g) || []).length === 2, "message: its own busy state (doesn't spin the connect button)");
  ok(/if \(isBlocked \|\| listBusyRef\.current\) return;/.test(up) && (up.match(/disabled=\{loadingConnections\}/g) || []).length === 2, "connections list: its own busy state");
  ok(/couldn't open the chat", plainError\(err/.test(up) && /couldn't load connections", plainError\(err/.test(up), "plain messages (timeouts say 'taking too long, try again')");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
