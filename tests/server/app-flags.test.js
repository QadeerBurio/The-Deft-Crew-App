// GET /api/app/flags: real router, mounted the way server.js mounts it.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const SERVER = require("../paths").SERVER;
const reqS = Module.createRequire(path.join(SERVER, "server.js"));
const express = reqS("express");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + x : ""}`); };

(async () => {
  const router = require(path.join(SERVER, "routes/appFlags.routes.js"));
  const app = express();
  app.use("/api/app", router);
  const srv = app.listen(0, "127.0.0.1");
  await new Promise((r) => srv.once("listening", r));
  const url = `http://127.0.0.1:${srv.address().port}/api/app/flags`;
  const get = async (env) => {
    if (env === undefined) delete process.env.META_EVENTS_ENABLED; else process.env.META_EVENTS_ENABLED = env;
    const res = await fetch(url);
    return { status: res.status, body: await res.json(), cache: res.headers.get("cache-control") };
  };
  let r = await get(undefined);
  ok(r.status === 200 && r.body.metaEvents === false, "variable not set → metaEvents false (off by default)", JSON.stringify(r));
  ok(Object.keys(r.body).join() === "metaEvents", "only the switch, nothing else");
  r = await get("true");
  ok(r.body.metaEvents === true, "META_EVENTS_ENABLED=true → on");
  r = await get(" TRUE ");
  ok(r.body.metaEvents === true, "case and spaces ignored");
  for (const v of ["false", "1", "yes", "on", ""]) {
    r = await get(v);
    ok(r.body.metaEvents === false, `META_EVENTS_ENABLED="${v}" → off (only "true" turns it on)`);
  }
  ok(/max-age=60/.test(r.cache), "short cache (a switch-off reaches phones within minutes)", r.cache);
  const res = await fetch(url); // no Authorization header at all
  ok(res.status === 200, "public: no sign-in needed");
  const serverJs = fs.readFileSync(path.join(SERVER, "server.js"), "utf8");
  ok(/app\.use\("\/api\/app", require\("\.\/routes\/appFlags\.routes"\)\)/.test(serverJs), "mounted at /api/app in server.js");
  srv.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
