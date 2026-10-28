// App speed (perf/app): A0 to A8.
//   node tests/app/perf-app.test.js
// Real modules where they run in Node (lib/perf, lib/homeCache, utils/imageUrl, ui/RemoteImage,
// utils/pushNotifications, api/brandApi with a local axios adapter); source checks for screens that
// need a phone (App.js startup order, Home, Slider, AuthContext). Fakes only: phone storage,
// expo-notifications, expo-image. Nothing leaves the process.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = require("../paths").APP;
const SRC = path.join(APP, "app/src");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 300) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8");

// ── fakes ──
const store = new Map();
const AsyncStorage = {
  getItem: async (k) => (store.has(k) ? store.get(k) : null),
  setItem: async (k, v) => { store.set(k, String(v)); },
  removeItem: async (k) => { store.delete(k); },
  multiGet: async (ks) => ks.map((k) => [k, store.has(k) ? store.get(k) : null]),
  multiRemove: async (ks) => { ks.forEach((k) => store.delete(k)); },
};
const imageProps = [];
const ExpoImage = function ExpoImage() {};
ExpoImage.prefetch = async (urls, policy) => { imageProps.push({ prefetch: urls, policy }); return true; };
const React = { createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children } }) };
React.default = React;
const notif = { created: [], deleted: [] };
const Notifications = {
  setNotificationChannelAsync: async (id) => { notif.created.push(id); },
  deleteNotificationChannelAsync: async (id) => { notif.deleted.push(id); },
  AndroidImportance: { MAX: 5 }, AndroidNotificationVisibility: { PUBLIC: 1 },
};

function loader(mocks) {
  const cache = new Map();
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports;
    const { code } = babel.transformSync(fs.readFileSync(file, "utf8"), {
      filename: file, babelrc: false, configFile: false,
      plugins: [[reqApp.resolve("@babel/plugin-transform-react-jsx"), { runtime: "classic" }], reqApp.resolve("@babel/plugin-transform-modules-commonjs")],
    });
    const m = new Module(file);
    m.filename = file;
    m.require = (id) => {
      if (id in mocks) return mocks[id];
      if (id.startsWith(".")) return load(require.resolve(path.resolve(path.dirname(file), id).replace(/(\.js)?$/, ".js")));
      return reqApp(id);
    };
    cache.set(file, m);
    m._compile(code, file);
    return m.exports;
  };
  return load;
}
global.__DEV__ = false;
const BASE_MOCKS = {
  react: React,
  "expo-image": { Image: ExpoImage },
  "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage },
  "react-native": { Platform: { OS: "android" } },
  "expo-notifications": Notifications,
  "expo-device": { isDevice: true },
  "expo-constants": { __esModule: true, default: { expoConfig: { extra: {} } } },
};

(async () => {
  // ═════ A0 perf marks ═════
  console.log("── A0 [perf] marks");
  {
    const lines = [];
    const warn = console.warn; console.warn = (l) => lines.push(l);
    const { perfMark } = loader(BASE_MOCKS)(path.join(SRC, "lib/perf.js"));
    perfMark("splash-hidden"); perfMark("splash-hidden"); perfMark("deals-shown");
    console.warn = warn;
    ok(lines.length === 2 && /^\[perf\] splash-hidden \d+ms$/.test(lines[0]) && /^\[perf\] deals-shown \d+ms$/.test(lines[1]), "each mark logged once, '[perf] <name> <n>ms', console.warn in release", lines.join(" | "));
    ok(/^\/\/ \[perf\][^\n]*\nimport '\.\/app\/src\/lib\/perf';\nimport \{ registerRootComponent \}/.test(read("index.js")), "index.js loads lib/perf before anything else");
    const home = read("app/src/screens/Home.js"), app = read("App.js");
    ok(/perfMark\("home-first-render"\)/.test(home) && /perfMark\("deals-shown"\)/.test(home) && /await SplashScreen\.hideAsync\(\);\s*perfMark\("splash-hidden"\)/.test(app), "marks: splash-hidden (after hideAsync), home-first-render, deals-shown");
  }

  // ═════ A1 startup ═════
  console.log("── A1 splash waits for fonts only");
  {
    const app = read("App.js");
    const prepare = app.slice(app.indexOf("async function prepare()"), app.indexOf("prepare();"));
    const beforeHide = prepare.slice(0, prepare.indexOf("SplashScreen.hideAsync"));
    const awaits = [...beforeHide.matchAll(/await ([\w.]+)\(/g)].map((m) => m[1]);
    ok(JSON.stringify(awaits) === JSON.stringify(["Font.loadAsync"]), "only Font.loadAsync is awaited before the splash hides", awaits.join(","));
    ok(!/setTimeout\(resolve, 1200\)/.test(app), "the fixed 1200 ms delay is gone");
    ok(!/await setupAndroidChannels\(\)/.test(app) && /^setupAndroidChannels\(\);/m.test(app), "channels start at module load and are not awaited");
    const hot = app.match(/const HOT_SOUNDS = (\[[^\]]*\])/)[1];
    const later = app.match(/const LATER_SOUNDS = (\[[^\]]*\])/)[1];
    ok(JSON.stringify(eval(hot)) === JSON.stringify(["tdc_tap", "tdc_success"]), "preloaded right after the splash: tdc_tap, tdc_success");
    const before = ["tdc_tap", "tdc_success", "tdc_error", "tdc_nope", "tdc_like", "tdc_send", "tdc_popup_open", "tdc_popup_close", "tdc_notification_in_app", "tdc_push_default", "tdc_push_message", "tdc_push_deal", "tdc_push_confession", "tdc_push_streak", "tdc_push_level_up"];
    ok(JSON.stringify([...eval(hot), ...eval(later)].sort()) === JSON.stringify([...before].sort()), "the other 13 still preload, after the first screen (same 15 as before)");
    ok(/afterFirstScreen\(\(\) => \{ preloadSounds\(LATER_SOUNDS\)/.test(app) && /InteractionManager\.runAfterInteractions\(run\)/.test(app) && /setTimeout\(run, maxMs\)/.test(app), "later sounds wait for interactions, or 1.5 s at most");
    ok(/warmUpSounds\(Date\.now\(\)\);\s*\} catch \(e\) \{\s*console\.warn\("\[App\] prepare error:", e\);\s*setAppIsReady\(true\);\s*warmUpSounds\(Date\.now\(\)\);/.test(app), "sounds warm up after the splash, also when prepare fails");

    // legacy channel removal once per channel set (real pushNotifications.js)
    store.clear();
    const file = path.join(SRC, "utils/pushNotifications.js");
    const first = loader(BASE_MOCKS)(file);
    await first.setupAndroidChannels();
    const created1 = notif.created.length, deleted1 = notif.deleted.length;
    notif.created.length = 0; notif.deleted.length = 0;
    await loader(BASE_MOCKS)(file).setupAndroidChannels(); // next app start
    ok(created1 === 21 && deleted1 === 32, "first start: 21 sound channels created, 32 legacy channels removed", `${created1} ${deleted1}`);
    ok(notif.created.length === 21 && notif.deleted.length === 0, "next start: channels created again, no legacy removal", `${notif.created.length} ${notif.deleted.length}`);
    ok(store.get("tdc.legacyChannelsCleaned") === first.CHANNEL_SET, "remembered per channel set");
  }

  // ═════ A2 Home requests ═════
  console.log("── A2 Home stops two unused requests");
  {
    const home = read("app/src/screens/Home.js");
    ok(!home.includes('"/engagement/home"') && !home.includes('["engagement", "home"'), "Home no longer requests /engagement/home itself");
    ok(/useDailyDrop[\s\S]*engagementApi\.getHome/.test(read("app/src/engagement/hooks/useDailyDrop.js")), "DailyDropCard still fetches it (useDailyDrop)");
    ok(/const SHOW_LATEST_CONFESSION = false;/.test(home) && /enabled: signedIn && SHOW_LATEST_CONFESSION,/.test(home) && /signedIn && SHOW_LATEST_CONFESSION \? refetchConfession\(\) : null/.test(home), "latest-confession feed request off while its section is commented out");
    ok(/\{\/\* \{signedIn && !!latestConfession && \(/.test(home), "the section is still commented out (flag and section match)");
    ok(/invalidateQueries\(\{ queryKey: \["engagement"\] \}\)/.test(home.slice(home.indexOf("const onRefresh"))), "pull to refresh still refreshes engagement data");
  }

  // ═════ A3 phone cache ═════
  console.log("── A3 Home shows the last saved data at once");
  {
    store.clear();
    const hc = loader(BASE_MOCKS)(path.join(SRC, "lib/homeCache.js"));
    hc.writeHomeCache("deals", "u1", [{ _id: "b1" }]);
    await tick();
    const hit = await hc.readHomeCache("deals", "u1");
    ok(hit && hit.data[0]._id === "b1" && typeof hit.savedAt === "number", "saved and read back for the same user");
    ok((await hc.readHomeCache("deals", "u2")) === null, "another user never gets it");
    hc.writeHomeCache("deals", "u1", []);
    await tick();
    ok((await hc.readHomeCache("deals", "u1"))?.data?.length === 1, "an empty list never overwrites the saved one");
    const raw = JSON.parse(store.get("tdc.homeCache.v1.deals"));
    store.set("tdc.homeCache.v1.deals", JSON.stringify({ ...raw, savedAt: Date.now() - 25 * 3600 * 1000 }));
    ok((await hc.readHomeCache("deals", "u1")) === null, "older than 24 h is ignored");
    store.set("tdc.homeCache.v1.deals", "{not json");
    ok((await hc.readHomeCache("deals", "u1")) === null, "broken storage → no cache, no throw");

    // hydrate into a (fake) React Query client
    const qd = new Map(); const sets = [];
    const qc = { getQueryData: (k) => qd.get(JSON.stringify(k)), setQueryData: (k, v, o) => { qd.set(JSON.stringify(k), v); sets.push(o); } };
    hc.writeHomeCache("deals", "u1", [{ _id: "b2" }]); await tick();
    const seeded = await hc.hydrateQuery(qc, ["home", "deals", "u1"], "deals", "u1");
    ok(seeded?.[0]?._id === "b2" && qd.get('["home","deals","u1"]')?.[0]?._id === "b2" && typeof sets[0]?.updatedAt === "number" && sets[0].updatedAt < Date.now() + 1, "seeds React Query with the save time (still stale → refetches)");
    qd.set('["home","deals","u1"]', [{ _id: "fresh" }]);
    ok((await hc.hydrateQuery(qc, ["home", "deals", "u1"], "deals", "u1")) === null && qd.get('["home","deals","u1"]')[0]._id === "fresh", "never replaces data the network already brought");

    // prune: other users' entries go, the shared slider stays
    store.clear();
    hc.writeHomeCache("deals", "u1", [1]); hc.writeHomeCache("engagementMe", "u1", { a: 1 }); hc.writeHomeCache("publicDeals", "guest", [1]); hc.writeHomeCache("slider", "all", [1]);
    await tick();
    await hc.pruneHomeCache("u2");
    ok(!store.has("tdc.homeCache.v1.deals") && !store.has("tdc.homeCache.v1.engagementMe") && !store.has("tdc.homeCache.v1.publicDeals") && store.has("tdc.homeCache.v1.slider"), "opening Home as someone else deletes the previous user's copies (slider kept)");

    const home = read("app/src/screens/Home.js");
    ok(/pruneHomeCache\(userId\);/.test(home) && /seed\(DEALS_KEY\(userId\), "deals"\)/.test(home) && /seed\(\["engagement", "me"\], "engagementMe"\)/.test(home) && /seed\(PUBLIC_DEALS_KEY, "publicDeals"\)/.test(home), "Home seeds deals + engagement (signed in) or public deals (guest)");
    ok(/writeHomeCache\("engagementMe", userId, \{ \.\.\.engagementMe, popups: \[\] \}\)/.test(home), "engagement copy is saved without popups (an old copy never shows one again)");
    ok(/return queryClient\.getQueryData\(DEALS_KEY\(userId\)\) \?\? \[\];/.test(home) && /return queryClient\.getQueryData\(PUBLIC_DEALS_KEY\) \?\? \[\];/.test(home), "a failing deals request keeps what is on screen");
    const slider = read("app/src/screens/Slider.js");
    ok(/const FETCH_TIMEOUT = 8000;/.test(slider) && /writeHomeCache\('slider', 'all', visibleData\)/.test(slider) && /readHomeCache\('slider', 'all'\)/.test(slider), "slider: 8 s timeout, saved on the phone and shown from it");
    ok(/if \(!isRefresh && !shownFromPhoneRef\.current\) setLoading\(true\);/.test(slider), "slider: no skeleton over phone-cache slides while fetching");
  }

  // ═════ A4–A6 images ═════
  console.log("── A4–A6 images: expo-image, cache, Cloudinary sizes");
  {
    const { sizedImageUrl, IMAGE_WIDTHS } = loader(BASE_MOCKS)(path.join(SRC, "utils/imageUrl.js"));
    const cl = "https://res.cloudinary.com/demo/image/upload/v1785952666/TDC_Offers/TDC_Offers/offer_x.jpg";
    ok(sizedImageUrl(cl, "card") === "https://res.cloudinary.com/demo/image/upload/w_300,c_limit,f_auto,q_auto/v1785952666/TDC_Offers/TDC_Offers/offer_x.jpg", "versioned Cloudinary URL → w_300,c_limit,f_auto,q_auto", sizedImageUrl(cl, "card"));
    ok(IMAGE_WIDTHS.logo === 120 && IMAGE_WIDTHS.avatar === 120 && IMAGE_WIDTHS.card === 300 && IMAGE_WIDTHS.banner === 800, "widths: logo/avatar 120, card 300, banner 800");
    ok(sizedImageUrl(cl, 450).includes("/upload/w_450,c_limit,f_auto,q_auto/v1785952666/"), "a number is a pixel width");
    const same = [
      "https://the-deft-crew-production.up.railway.app/uploads/brands/logo.png",
      "https://res.cloudinary.com/demo/image/upload/w_200,c_fill/v1/x.jpg",
      "https://res.cloudinary.com/demo/image/upload/x.jpg",
      "https://res.cloudinary.com/demo/video/upload/v1/x.mp4",
      "https://ui-avatars.com/api/?name=a",
      "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
    ];
    ok(same.every((u) => sizedImageUrl(u, "card") === u), "unchanged: /uploads, already transformed, unversioned, video, other hosts");
    ok(sizedImageUrl(cl, undefined) === cl && sizedImageUrl(cl, "huge") === cl && sizedImageUrl(null, "card") === null, "no or unknown size → unchanged");

    const RI = loader(BASE_MOCKS)(path.join(SRC, "ui/RemoteImage.js"));
    const el = RI.default({ source: { uri: cl }, size: "logo", resizeMode: "contain", style: { width: 48 }, onError: () => {}, fadeDuration: 0, loading: "eager", accessibilityIgnoresInvertColors: true });
    const p = el.props;
    ok(el.type === ExpoImage, "renders expo-image");
    ok(p.cachePolicy === "memory-disk" && p.transition === 200 && p.placeholder?.blurhash === "00RW0b", "memory + disk cache, 200 ms fade, light grey placeholder");
    ok(p.source.uri.includes("/upload/w_120,c_limit,f_auto,q_auto/") && p.contentFit === "contain" && typeof p.onError === "function" && p.style.width === 48 && p.accessibilityIgnoresInvertColors, "size → sized URL; resizeMode → contentFit; style and handlers pass through");
    ok(!("fadeDuration" in p) && !("loading" in p) && !("resizeMode" in p) && !("size" in p), "react-native-only props are not passed on");
    const fits = ["cover", "contain", "stretch", "center"].map((m) => RI.default({ source: { uri: "x" }, resizeMode: m }).props.contentFit);
    ok(JSON.stringify(fits) === JSON.stringify(["cover", "contain", "fill", "scale-down"]) && RI.default({ source: { uri: "x" } }).props.contentFit === "cover", "resizeMode map: cover, contain, stretch→fill, center→scale-down; default cover");
    ok(RI.default({ source: 7, size: "card" }).props.source === 7, "require()'d local sources pass through untouched");
    await RI.prefetchRemoteImages([cl, null], "card");
    const pf = imageProps.find((x) => x.prefetch);
    ok(pf && pf.policy === "memory-disk" && pf.prefetch.length === 1 && pf.prefetch[0].includes("w_300"), "prefetch warms the same cache with the same sized URL");

    // every RemoteImage in the app: a known size, and no react-native-only prop
    const parser = reqApp("@babel/parser"); const traverse = reqApp("@babel/traverse").default;
    const files = require("child_process").execSync("git ls-files app/src components", { cwd: APP }).toString().split("\n").filter((f) => f.endsWith(".js"));
    let count = 0; const bad = []; let rnRemote = 0;
    for (const f of files) {
      const src = read(f); if (!src.includes("<RemoteImage") && !/\bImage\b/.test(src)) continue;
      const ast = parser.parse(src, { sourceType: "module", plugins: ["jsx", "classProperties", "optionalChaining"] });
      traverse(ast, { JSXOpeningElement(pth) {
        const n = pth.node; const name = n.name.name;
        const attr = (k) => n.attributes.find((a) => a.name?.name === k);
        if (name === "RemoteImage") {
          count++;
          const s = attr("size");
          const v = s && (s.value.type === "StringLiteral" ? s.value.value : "expr");
          if (s && !["logo", "avatar", "card", "banner", "expr"].includes(v)) bad.push(`${f}:${n.loc.start.line} size=${v}`);
          for (const k of ["defaultSource", "loadingIndicatorSource", "resizeMethod", "progressiveRenderingEnabled"]) if (attr(k)) bad.push(`${f}:${n.loc.start.line} ${k}`);
        } else if (name === "Image" && /uri/.test(attr("source") ? src.slice(attr("source").value.start, attr("source").value.end) : "")) rnRemote++;
      } });
    }
    ok(count >= 75 && bad.length === 0, `${count} RemoteImage uses, every size known, no unsupported prop`, bad.join(", "));
    ok(rnRemote <= 16, `react-native Image left only for local previews, viewers and the cache-busted avatar (${rnRemote})`);
  }

  // ═════ A7 parallel brands + summary ═════
  console.log("── A7 /brands and /offers/summary in parallel");
  {
    store.clear(); store.set("token", "tok-1"); store.set("isGuest", "false");
    const brandApi = loader(BASE_MOCKS)(path.join(SRC, "api/brandApi.js"));
    const log = []; let failSummary = false;
    brandApi.default.defaults.adapter = async (config) => {
      const url = config.url; const t0 = Date.now(); log.push({ url, start: t0, auth: config.headers?.Authorization });
      await tick(120);
      log.find((x) => x.url === url && x.start === t0).end = Date.now();
      if (url.includes("summary") && failSummary) { const e = new Error("boom"); e.config = config; e.response = { status: 500, data: {} }; throw e; }
      const data = url.includes("summary")
        ? { b1: [{ _id: "o1", title: "20%", discountPercentage: 20, claimedBy: ["u1"] }] }
        : [{ _id: "b1", name: "Brand One", logo: "https://res.cloudinary.com/d/image/upload/v1/l.png", createdAt: new Date().toISOString() }];
      return { data, status: 200, statusText: "OK", headers: {}, config };
    };
    const t0 = Date.now();
    const list = await brandApi.optimizedAPI.getBrandsFast("tok-1", "u1", { forceRefresh: true });
    const took = Date.now() - t0;
    const b = log.find((x) => x.url.startsWith("/brands")), s = log.find((x) => x.url.includes("/offers/summary"));
    ok(b && s && s.start < b.end && b.start < s.end, "both requests are in flight at the same time");
    ok(took < 220, `one round trip, not two (${took} ms for two 120 ms requests)`);
    ok(list[0]?.offers?.[0]?._id === "o1" && list[0].hasOffer === true && list[0].offers[0].isClaimed === true, "same result: brand with its offers and my claim");
    log.length = 0; failSummary = true;
    const list2 = await brandApi.optimizedAPI.getBrandsFast("tok-1", "u1", { forceRefresh: true });
    ok(list2.length === 1 && list2[0].offers.length === 0 && list2[0].hasOffer === false, "a failing summary still gives the brands (no offers), as before");
  }

  // ═════ A8 unread count ═════
  console.log("── A8 unread badge from /unread-count");
  {
    const auth = read("app/src/context/AuthContext.js");
    const fn = auth.slice(auth.indexOf("const updateUnreadCount"), auth.indexOf("// BOOT"));
    ok(/api\.get\("\/notification\/unread-count"/.test(fn) && /Number\(res\.data\?\.count\) \|\| 0/.test(fn) && !fn.includes("my-notifications"), "updateUnreadCount asks only for the count");
    ok(/setUnreadCount\(unread\);\s*return unread;/.test(fn) && /return 0;/.test(fn), "still sets the badge and returns the number (0 on error)");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log("FAIL  (stopped)", e?.stack || e); process.exit(1); });
