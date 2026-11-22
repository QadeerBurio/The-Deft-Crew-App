// Upgrade v2 flags in the app (upgrade/p0-safety, plan P0-1): the names in api/upgradeFlags.js match the server's
// config/featureFlags.js; every one reads as off when the server leaves it out (an older server), when it says false,
// for a guest, and when the request fails with nothing known; on only when the server says true for this account.
//   node tests/app/upgrade-flags.test.js
const path = require("path");
const fs = require("fs");
const H = require("./harness");
const { SERVER } = require("../paths");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  console.log("── names (api/upgradeFlags.js ↔ server config/featureFlags.js)");
  const U = H.loader({})(path.join(H.SRC, "api/upgradeFlags.js"));
  const names = ["growthV2", "ambassadorV2", "resumeV2", "confessionsV2", "confessionSafety", "shareCards"];
  ok(JSON.stringify([...U.UPGRADE_FLAG_NAMES].sort()) === JSON.stringify([...names].sort()), "the six plan flags, each once", U.UPGRADE_FLAG_NAMES.join(","));
  ok(names.every((n) => U.FLAGS[n] === n) && Object.isFrozen(U.FLAGS), "FLAGS.<name> is the name itself (frozen)");
  const serverFlags = path.join(SERVER, "config/featureFlags.js");
  if (fs.existsSync(serverFlags)) {
    const S = require(serverFlags);
    ok(names.every((n) => S.FLAGS[n] && S.FLAGS[n].client === true && S.FLAGS[n].default === false), "the server defines each, sent to the app, off by default");
    ok(Object.values(S.ROLE_DEFAULTS).every((list) => names.every((n) => !list.includes(n))), "the server turns none of them on by default for a role");
  } else {
    console.log("SKIP  server checks: server repo not found");
  }

  console.log("── what useFlag / flagOn read (api/appFlags.js)");
  const store = { token: "tok-a", isGuest: null };
  const AsyncStorage = {
    getItem: async (k) => (k in store ? store[k] : null),
    setItem: async (k, v) => { store[k] = v; },
    removeItem: async (k) => { delete store[k]; },
  };
  let answer = { surplusBoxes: true, loyaltyV2: true }; // an older server: no upgrade flags at all
  let fail = false;
  const api = { get: async () => { if (fail) throw new Error("timeout of 15000ms exceeded"); return { data: { ...answer } }; } };
  const load = H.loader({ "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage }, "./api": { __esModule: true, default: api } });
  const F = load(path.join(H.SRC, "api/appFlags.js"));
  const warn = console.warn; console.warn = () => {};
  const realNow = Date.now; let now = realNow(); Date.now = () => now;
  const allOff = async () => { for (const n of names) if ((await F.flagOn(n)) !== false) return false; return true; };

  F._test.reset(); fail = true;
  ok(await allOff(), "request fails and nothing is known: every upgrade flag off");
  fail = false; now += 10 * 60 * 1000;
  F._test.reset();
  ok(await allOff(), "older server (flags missing from the answer): every upgrade flag off");
  ok((await F.flagOn("surplusBoxes")) === true, "…the older features still read as the server says");

  answer = { surplusBoxes: true, growthV2: false, ambassadorV2: false, resumeV2: false, confessionsV2: false, confessionSafety: false, shareCards: false };
  F._test.reset(); await F.refreshFlags({ force: true });
  ok(await allOff(), "server says false: every upgrade flag off");

  answer = { ...answer, confessionSafety: true };
  F._test.reset(); await F.refreshFlags({ force: true });
  ok((await F.flagOn("confessionSafety")) === true && (await F.flagOn("confessionsV2")) === false, "server says true for one flag: only that one on");

  store.isGuest = "true";
  F._test.reset();
  ok(await allOff(), "guest: every upgrade flag off (nothing asked)");
  delete store.token; store.isGuest = null;
  F._test.reset();
  ok(await allOff(), "signed out: every upgrade flag off");

  Date.now = realNow; console.warn = warn;
  done();
})();
