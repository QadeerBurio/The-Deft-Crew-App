// Q-3c "instant reopen", flag persistCache (off by default): a few read-only, non-sensitive React Query results are
// saved on the phone so Home opens with the last deals / points and refreshes quietly. Real @tanstack/react-query and
// the approved @tanstack/query-async-storage-persister; phone storage, the flag and the account are fakes.
//   node tests/app/persisted-queries.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;
const reqApp = require("module").createRequire(path.join(H.APP || require("../paths").APP, "package.json"));

(async () => {
  const { QueryClient } = reqApp("@tanstack/react-query");
  const store = new Map();
  const AsyncStorage = { getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, String(v)); }, removeItem: async (k) => { store.delete(k); } };
  const { React, mount } = H.makeReact();
  let flag = null; let account = { user: null, isGuest: false };
  const load = H.loader({
    react: React,
    "@react-native-async-storage/async-storage": { __esModule: true, default: AsyncStorage },
    "../context/AuthContext": { AuthContext: { _default: account } },
    "../hooks/useFlag": { __esModule: true, default: () => flag },
  });
  const P = load(path.join(H.SRC, "lib/persistedQueries.js"));
  const KEY = P.STORAGE_KEY;
  const saved = () => (store.has(KEY) ? JSON.parse(store.get(KEY)) : null);
  const waitSave = () => H.tick(2300); // the persister writes at most every 2 s

  // what may be saved
  ok(P.persistable(["home", "deals", "u1"]) && P.persistable(["home", "publicDeals"]) && P.persistable(["engagement", "me"]) && P.persistable(["engagement", "drop", "u1"]), "saved: Home deals (personal, public), engagement summary, today's drop");
  ok(!P.persistable(["home", "nearby", "u1", 24.8, 67]) && !P.persistable(["home", "latestConfession", "u1"]) && !P.persistable(["engagement", "referrals", "me", "u1"]) && !P.persistable(["offers", "myTotalSavings", "u1"]) && !P.persistable("home"), "never: nearby (location), confession, referrals, savings, anything else");
  ok(KEY === "@tdc_query_cache_v1" && H.read("app/src/lib/queryCacheKey.js").includes('QUERY_CACHE_KEY = "@tdc_query_cache_v1"'), "one storage key, shared with sign-out");

  // save while running
  const qc1 = new QueryClient();
  const stop1 = await P.startQueryPersistence(qc1, "u1");
  qc1.setQueryData(["home", "deals", "u1"], [{ id: "d1", title: "20% off" }]);
  qc1.setQueryData(["engagement", "me"], { points: 120, streak: 4 });
  qc1.setQueryData(["home", "nearby", "u1", 24.8, 67.0], [{ id: "n1" }]);
  qc1.setQueryData(["home", "latestConfession", "u1"], { text: "secret" });
  await waitSave();
  const s = saved();
  const keys = (s?.clientState?.queries || []).map((q) => JSON.stringify(q.queryKey));
  ok(s && s.userId === "u1" && s.buster === P.BUSTER && keys.includes('["home","deals","u1"]') && keys.includes('["engagement","me"]'), "saved for u1: the deals and the engagement summary", keys.join(" "));
  ok(!keys.some((k) => /nearby|latestConfession/.test(k)) && !store.get(KEY).includes("secret") && !store.get(KEY).includes("24.8"), "…never the nearby list (location) or the confession");
  stop1();

  // reopen as the same account: the data is there at once
  const qc2 = new QueryClient();
  const stop2 = await P.startQueryPersistence(qc2, "u1");
  ok(JSON.stringify(qc2.getQueryData(["home", "deals", "u1"])) === '[{"id":"d1","title":"20% off"}]' && qc2.getQueryData(["engagement", "me"])?.points === 120, "reopen (same account): last deals and points shown at once");
  stop2();

  // another account: nothing restored, the copy deleted
  const qc3 = new QueryClient();
  const stop3 = await P.startQueryPersistence(qc3, "u2");
  ok(qc3.getQueryData(["engagement", "me"]) === undefined && saved() === null, "another account: nothing restored, the saved copy deleted");
  stop3();

  // too old: not restored
  const qc4 = new QueryClient();
  const stop4 = await P.startQueryPersistence(qc4, "u1");
  qc4.setQueryData(["engagement", "me"], { points: 7 });
  await waitSave();
  stop4();
  const qc5 = new QueryClient();
  const stop5 = await P.startQueryPersistence(qc5, "u1", { now: () => Date.now() + P.MAX_AGE_MS + 60000 });
  ok(qc5.getQueryData(["engagement", "me"]) === undefined && saved() === null, "older than 24 hours: not restored, deleted");
  stop5();

  // the root host: flag loading → nothing deleted; flag off → deleted; sign-out → deleted
  store.set(KEY, JSON.stringify({ timestamp: Date.now(), buster: P.BUSTER, userId: "u1", clientState: { queries: [], mutations: [] } }));
  const qc6 = new QueryClient();
  const Host = ({ uid, f }) => { P.useQueryPersistence(qc6, uid, f); return null; };
  let m = mount(React.createElement(Host, { uid: null, f: null }));
  await H.tick(10);
  ok(store.has(KEY), "app start (flag and account still loading): the saved copy is kept");
  m.rerender(React.createElement(Host, { uid: "u1", f: null }));
  await H.tick(10);
  ok(store.has(KEY), "…account known, flag still loading: kept");
  m.rerender(React.createElement(Host, { uid: "u1", f: true }));
  await H.tick(10);
  ok(store.has(KEY), "flag on, same account: kept (restored)");
  m.rerender(React.createElement(Host, { uid: null, f: true }));
  await H.tick(10);
  ok(!store.has(KEY), "sign-out: deleted");
  m.unmount();
  store.set(KEY, "{}");
  m = mount(React.createElement(Host, { uid: "u1", f: false }));
  await H.tick(10);
  ok(!store.has(KEY), "flag off: deleted (nothing stays on the phone)");
  m.unmount();

  const auth = H.read("app/src/context/AuthContext.js");
  ok(/import \{ QUERY_CACHE_KEY \} from "\.\.\/lib\/queryCacheKey";/.test(auth) && /await AsyncStorage\.removeItem\(QUERY_CACHE_KEY\);/.test(auth), "AuthContext's sign-out also removes the saved copy");
  const app = H.read("App.js");
  ok(/import QueryPersistHost from "\.\/app\/src\/lib\/persistedQueries";/.test(app) && /<QueryPersistHost \/>/.test(app), "App.js mounts the host (inside the query and auth providers)");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
