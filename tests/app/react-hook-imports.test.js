// Every React hook a file calls is in scope: imported from "react" (or another module), taken from React
// (const { useX } = React), or called as React.useX. A hook used but never imported crashes the screen when it renders
// ("Property 'useEffect' doesn't exist": JobWebView.js, opened with the jobs list). Unit tests that fake React don't
// catch it, so this checks the source of every app file.
//   node tests/app/react-hook-imports.test.js
const fs = require("fs");
const path = require("path");
const Module = require("module");
const APP = require("../paths").APP;
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 800) : ""}`); };

const HOOKS = ["useState", "useEffect", "useLayoutEffect", "useRef", "useCallback", "useMemo", "useContext", "useReducer", "useImperativeHandle", "useId", "useTransition", "useDeferredValue", "useSyncExternalStore", "useInsertionEffect", "useDebugValue"];
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(f.name)) files.push(p); } };
walk(path.join(APP, "app/src"));
files.push(path.join(APP, "App.js"));

const problems = [];
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  if (!HOOKS.some((h) => src.includes(h))) continue;
  const ast = babel.parseSync(src, { filename: file, babelrc: false, configFile: false, sourceType: "module", plugins: [reqApp.resolve("@babel/plugin-syntax-jsx")] });
  const declared = new Set();
  const used = new Map(); // hook → first line
  const visit = (node, parent) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "ImportDeclaration") for (const s of node.specifiers) declared.add(s.local.name);
    if (node.type === "VariableDeclarator") {
      const collect = (id) => { if (!id) return; if (id.type === "Identifier") declared.add(id.name); else if (id.type === "ObjectPattern") id.properties.forEach((p) => collect(p.value || p.argument)); else if (id.type === "ArrayPattern") id.elements.forEach(collect); };
      collect(node.id);
    }
    if ((node.type === "FunctionDeclaration") && node.id) declared.add(node.id.name);
    // a bare hook call (not React.useX, not obj.useX)
    if (node.type === "CallExpression" && node.callee.type === "Identifier" && HOOKS.includes(node.callee.name) && !used.has(node.callee.name)) used.set(node.callee.name, node.loc.start.line);
    for (const k of Object.keys(node)) {
      if (k === "loc" || k === "start" || k === "end") continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c) => visit(c, node)); else if (v && typeof v.type === "string") visit(v, node);
    }
  };
  visit(ast.program, null);
  for (const [hook, line] of used) if (!declared.has(hook)) problems.push(`${path.relative(APP, file).split(path.sep).join("/")}:${line} ${hook}`);
}
ok(files.length > 200, `app files scanned (${files.length})`);
ok(problems.length === 0, "every React hook a file calls is imported (or declared) in that file", problems.join("; "));
ok(/^import React, \{[^}]*\buseEffect\b[^}]*\} from "react";/m.test(fs.readFileSync(path.join(APP, "app/src/components/career/JobWebView.js"), "utf8")), "JobWebView.js (the jobs list's in-app browser) imports useEffect");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
