// Q-4 (flag tabletLayout, off by default): on a tablet every screen sits in a centred column of at most 600 pt.
//   phone (any rotation) or the flag off: the children exactly as given (no extra view)
//   tablet (short side >= 600 pt) with the flag on: sand outside, a paper column, maxWidth 600, full height
// Real ui/TabletFrame.js; the window size and the flag are fakes.
//   node tests/app/tablet-frame.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const { React, mount } = H.makeReact();
  const { rn } = H.makeRN();
  let win = { width: 390, height: 844 }; let flag = false;
  rn.useWindowDimensions = () => win;
  const load = H.loader({ react: React, "react-native": rn, "../hooks/useFlag": { __esModule: true, default: () => flag } });
  const F = load(path.join(H.SRC, "ui/TabletFrame.js"));
  const child = React.createElement("Screen", { id: "app" });
  const render = () => mount(React.createElement(F.default, null, child)).tree;

  ok(F.isTabletWindow({ width: 820, height: 1180 }) && F.isTabletWindow({ width: 1180, height: 820 }) && !F.isTabletWindow({ width: 390, height: 844 }) && !F.isTabletWindow({ width: 844, height: 390 }), "tablet = short side 600 pt or more (iPad either way round; a phone on its side is still a phone)");
  let t = render();
  ok(t.type === "Screen" && t.props.id === "app", "phone, flag off: the app as is");
  flag = true;
  t = render();
  ok(t.type === "Screen", "phone, flag on: the app as is (no extra view)");
  win = { width: 844, height: 390 };
  ok(render().type === "Screen", "phone on its side, flag on: as is");
  win = { width: 820, height: 1180 }; flag = false;
  ok(render().type === "Screen", "iPad, flag off: as before");
  flag = true;
  t = render();
  const col = t.props.children;
  ok(t.type === "View" && t.props.style.alignItems === "center" && t.props.style.flex === 1, "iPad, flag on: a full-size view that centres its column", JSON.stringify(t.props.style));
  ok(col && col.type === "View" && col.props.style.maxWidth === 600 && col.props.style.width === "100%" && col.props.style.flex === 1 && col.props.children.type === "Screen", "…the column: at most 600 pt wide, full height, the app inside");
  win = { width: 1180, height: 820 };
  ok(render().props.children.props.style.maxWidth === 600, "…turned sideways: still the centred column");

  const app = H.read("App.js").replace(/\r\n/g, "\n");
  ok(/<TabletFrame>\n\s*<NavigationContainer ref=\{navigationRef\} theme=\{MyTheme\}>\n\s*<AppNavigator \/>\n\s*<\/NavigationContainer>\n\s*<\/TabletFrame>/.test(app), "App.js: the whole navigator sits in the frame");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
