// Q-3d / Q-3e (flags optimisticActions, prefetchDetails; both off by default).
//   prefetch: touching an event card starts GET /api/events/:id; opening the details within 5 s uses that request
//             (still the latest copy); later, or after a failed prefetch, a new request as before; each used once
//   optimistic save: a post's bookmark changes at once and goes back if the server says no. Flag off: unchanged
// Real eventsV2.js / EventCards.js / toggleId.js; source checks on Events.js and PostCard.js.
//   node tests/app/qc-instant.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const calls = [];
  const get = (url, cfg) => { calls.push(url); return url.endsWith("/bad") ? Promise.reject(new Error("offline")) : Promise.resolve({ data: { _id: url.split("/").pop(), title: "t" } }); };
  const load = H.loader({ axios: { get } , "../../config/server": { SERVER_ORIGIN: "https://srv.test" } });
  const E = load(path.join(H.SRC, "screens/Events/eventsV2.js"));
  let t = 1000; const now = () => t;

  E.prefetchEvent("e1", get, now);
  E.prefetchEvent("e1", get, now);
  ok(calls.length === 1 && /\/api\/events\/e1$/.test(calls[0]), "touching a card starts one request (a second touch doesn't start another)", calls.join());
  t += 3000;
  const p = E.takePrefetchedEvent("e1", now);
  ok(p && (await p)._id === "e1" && calls.length === 1, "opening within 5 s uses that request (no second request)");
  ok(E.takePrefetchedEvent("e1", now) === null, "…used once");
  E.prefetchEvent("e2", get, now);
  t += 6000;
  ok(E.takePrefetchedEvent("e2", now) === null, "opened after more than 5 s: not used (a new request, as before)");
  E.prefetchEvent("bad", get, now);
  await H.tick(5);
  ok(E.takePrefetchedEvent("bad", now) === null, "a failed prefetch is forgotten (the open makes a normal request)");
  E.prefetchEvent("", get, now);
  ok(calls.filter((c) => /events\/$/.test(c)).length === 0, "no id: nothing requested");

  // the card passes the touch on only when given a handler (flag off: no onPressIn, as before)
  const { React, mount } = H.makeReact();
  const loadC = H.loader({
    react: React, "react-native": { View: "View", Text: "Text", TouchableOpacity: "TouchableOpacity", ActivityIndicator: "ActivityIndicator", StyleSheet: { create: (x) => x, hairlineWidth: 1, absoluteFillObject: {} }, Platform: { OS: "android", select: (o) => o.android ?? o.default }, Animated: { Value: function V() {}, View: "Animated.View", timing: () => ({ start() {} }) }, Dimensions: { get: () => ({ width: 400, height: 800 }) } },
    axios: { get }, "../../config/server": { SERVER_ORIGIN: "https://srv.test" },
    "expo-haptics": { impactAsync: async () => {}, ImpactFeedbackStyle: {} },
    "@expo/vector-icons": { Ionicons: "Ionicons", MaterialCommunityIcons: "Icon" },
    "../../ui": { PressScale: "PressScale", SkeletonBlock: "SkeletonBlock" },
    "../../ui/RemoteImage": { __esModule: true, default: "RemoteImage" },
    "../../ui/FlatGradient": { LinearGradient: "LinearGradient" },
    "./TicketButton": { __esModule: true, default: "TicketButton" },
  });
  const C = loadC(path.join(H.SRC, "screens/Events/EventCards.js"));
  const item = { _id: "e9", title: "Hack night", date: "2026-12-01", city: "Karachi", type: "Hackathons" };
  const touched = [];
  const find = (el, type) => { if (!el || typeof el !== "object") return null; if (Array.isArray(el)) { for (const c of el) { const f = find(c, type); if (f) return f; } return null; } if (el.type === type) return el; return find(el.props?.children, type); };
  const withH = find(mount(React.createElement(C.EventCard, { item, onOpen() {}, onPressIn: (ev) => touched.push(ev._id), onRegister() {} })).tree, "PressScale");
  ok(withH && typeof withH.props.onPressIn === "function", "card with a touch handler: PressScale gets onPressIn");
  withH.props.onPressIn();
  ok(touched.join() === "e9", "…which passes the event on");
  const without = find(mount(React.createElement(C.EventCard, { item, onOpen() {}, onRegister() {} })).tree, "PressScale");
  ok(without && without.props.onPressIn === undefined, "flag off (no handler): no onPressIn, exactly as before");

  const ev = H.read("app/src/screens/Events/Events.js").replace(/\r\n/g, "\n");
  ok(/const prefetchFlag = useFlag\("prefetchDetails"\) === true;/.test(ev) && /onPressIn=\{prefetchFlag \? rowPressIn : undefined\}/.test(ev), "Events: the touch handler only with prefetchDetails on");
  ok(/\(\(prefetchFlag && takePrefetchedEvent\(id\)\) \|\| fetchEvent\(id\)\)/.test(ev), "Events: opening uses the prefetched request only with the flag on, else fetchEvent as before");

  // optimistic save
  const T = H.loader({})(path.join(H.SRC, "utils/toggleId.js"));
  ok(JSON.stringify(T.toggleId(["a", "b"], "c")) === '["a","b","c"]' && JSON.stringify(T.toggleId(["a", "b"], "a")) === '["b"]', "toggleId adds / removes");
  ok(JSON.stringify(T.toggleId([{ toString: () => "u1" }], "u1")) === "[]" && JSON.stringify(T.toggleId(null, "u1")) === '["u1"]' && JSON.stringify(T.toggleId(["a"], null)) === '["a"]', "…compares as strings (ObjectId-like), handles no list / no id");
  const pc = H.read("app/src/screens/Social/PostCard.js").replace(/\r\n/g, "\n");
  ok(/const optimisticFlag = useFlag\("optimisticActions"\) === true;/.test(pc), "PostCard reads optimisticActions");
  ok(/const before = favorites;\n\s*if \(optimisticFlag\) \{\n\s*setFavorites\(\(list\) => toggleId\(list, uid\)\);\n\s*setShowMenu\(false\);\n\s*\}/.test(pc), "flag on: the bookmark changes before the request");
  ok(/\} catch \(err\) \{\n\s*if \(optimisticFlag\) setFavorites\(before\);\n\s*soundError\(\);\n\s*Alert\.alert\("Error", "Save action failed"\);/.test(pc) && /\} else if \(optimisticFlag\) \{\n\s*setFavorites\(before\);/.test(pc), "…and goes back if the request fails or the server says no");
  ok(/if \(res\.data\.success\) \{\n\s*setFavorites\(Array\.isArray\(res\.data\.favorites\) \? res\.data\.favorites : \[\]\);\n\s*setShowMenu\(false\);/.test(pc), "flag off: the server's answer sets the bookmark, as before");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
