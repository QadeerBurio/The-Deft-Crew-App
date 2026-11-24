// Q-3i, flag lowDataImages (off by default): on a slow mobile connection (2G / 3G) sized Cloudinary pictures come
// 40% narrower at Cloudinary's "eco" quality. Flag off (and every other connection): the exact URLs as before.
// Real utils/imageUrl.js and lib/lowDataImages.js; NetInfo and the flag are fakes.
//   node tests/app/low-data-images.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const { React, mount } = H.makeReact();
  const listeners = [];
  const NetInfo = { addEventListener: (fn) => { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; } };
  let flag = false;
  const load = H.loader({ react: React, "@react-native-community/netinfo": { __esModule: true, default: NetInfo }, "../hooks/useFlag": { __esModule: true, default: () => flag }, "../config/server": { SERVER_ORIGIN: "https://srv.test" } });
  const img = load(path.join(H.SRC, "utils/imageUrl.js"));
  const L = load(path.join(H.SRC, "lib/lowDataImages.js"));

  const CL = "https://res.cloudinary.com/decaxpera/image/upload/v17/TDC/a.jpg";
  const before = { card: img.sizedImageUrl(CL, "card"), logo: img.sizedImageUrl(CL, "logo"), px: img.sizedImageUrl(CL, 300) };
  ok(before.card === "https://res.cloudinary.com/decaxpera/image/upload/w_480,c_limit,f_auto,q_auto/v17/TDC/a.jpg" && before.logo.includes("w_120,c_limit,f_auto,q_auto/") && before.px.includes("w_300,"), "low data off: the same URLs as before (card 480, logo 120, q_auto)", JSON.stringify(before));

  img.setLowDataImages(true);
  ok(img.sizedImageUrl(CL, "card") === "https://res.cloudinary.com/decaxpera/image/upload/w_288,c_limit,f_auto,q_auto:eco/v17/TDC/a.jpg", "low data on: card 288 wide, eco quality", img.sizedImageUrl(CL, "card"));
  ok(img.sizedImageUrl(CL, "logo").includes("w_72,") && img.sizedImageUrl(CL, 50).includes("w_60,"), "…logo 72; never below 60");
  ok(img.sizedImageUrl(CL) === CL && img.sizedImageUrl("https://srv.test/uploads/x.jpg", "card") === "https://srv.test/uploads/x.jpg", "…no size (full-screen viewers) and non-Cloudinary pictures unchanged");
  img.setLowDataImages(false);
  ok(img.sizedImageUrl(CL, "card") === before.card, "switched back: the normal URL again");

  ok(L.isSlowConnection({ type: "cellular", details: { cellularGeneration: "3g" } }) && L.isSlowConnection({ type: "cellular", details: { cellularGeneration: "2g" } }), "2G / 3G mobile counts as slow");
  ok(!L.isSlowConnection({ type: "cellular", details: { cellularGeneration: "4g" } }) && !L.isSlowConnection({ type: "cellular", details: { cellularGeneration: "5g" } }) && !L.isSlowConnection({ type: "wifi", details: {} }) && !L.isSlowConnection({ type: "cellular", details: {} }) && !L.isSlowConnection(null), "4G / 5G, Wi-Fi, unknown generation, no state: not slow");

  // the host: flag off → no watching, normal pictures
  flag = false;
  let m = mount(React.createElement(L.default));
  await H.tick(5);
  ok(listeners.length === 0 && !img.lowDataImagesOn(), "flag off: nothing watched, normal pictures");
  m.unmount();

  // flag on → watches; 3G → low data; 4G → normal; leaving → normal and no watcher left
  flag = true;
  m = mount(React.createElement(L.default));
  await H.tick(5);
  ok(listeners.length === 1, "flag on: the connection is watched");
  listeners[0]({ type: "cellular", details: { cellularGeneration: "3g" } });
  ok(img.lowDataImagesOn() && img.sizedImageUrl(CL, "card").includes("q_auto:eco"), "…on 3G: low-data pictures");
  listeners[0]({ type: "cellular", details: { cellularGeneration: "4g" } });
  ok(!img.lowDataImagesOn() && img.sizedImageUrl(CL, "card") === before.card, "…back on 4G: normal pictures");
  listeners[0]({ type: "cellular", details: { cellularGeneration: "2g" } });
  m.unmount();
  ok(listeners.length === 0 && !img.lowDataImagesOn(), "unmounted: watcher removed, normal pictures");

  const app = H.read("App.js");
  ok(/import LowDataImagesHost from "\.\/app\/src\/lib\/lowDataImages";/.test(app) && /<LowDataImagesHost \/>/.test(app), "App.js mounts the host once");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
