// r8 (owner): no undefined names in app/src. "Property 'InteractionManager' doesn't exist" (the crew screen, a split
// file without its import) can't happen again: every react-native API, component or helper used without its import
// fails here. Config: eslint.undef.config.js (no-undef + react/jsx-no-undef, Expo's parser, no browser globals on
// native files, because Keyboard / Image / Text are browser globals too and would hide a missing import).
// A self-check plants the mistakes in memory first, so a lint that stops reporting fails too.
//   node tests/app/lint-undef.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
const ROOT = path.join(__dirname, "..", "..");

(async () => {
  const { ESLint } = require(path.join(ROOT, "node_modules", "eslint"));
  const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: path.join(ROOT, "eslint.undef.config.js") });

  const probe = [
    "import React from 'react';",
    "import { View } from 'react-native';",
    "export default function P() { InteractionManager.runAfterInteractions(() => {}); Keyboard.dismiss(); return <View><Missing /></View>; }",
  ].join("\n");
  const [p] = await eslint.lintText(probe, { filePath: path.join(ROOT, "app/src/__probe__.js") });
  const found = p.messages.map((m) => m.message).join(" | ");
  ok(/'InteractionManager' is not defined/.test(found) && /'Keyboard' is not defined/.test(found) && /'Missing' is not defined/.test(found), "self-check: a missing react-native import (also Keyboard, a browser name) and a missing component are caught", found);

  const results = await eslint.lintFiles(["app/src"]);
  const problems = results.flatMap((r) => r.messages.map((m) => `${path.relative(ROOT, r.filePath)}:${m.line} ${m.message}`));
  ok(results.length > 300, `app/src linted (${results.length} files)`);
  ok(problems.length === 0, `no undefined names in app/src (${problems.length})`, problems.slice(0, 20).join("\n"));
  done();
})().catch((e) => { console.error(e); process.exit(1); });
