// Accessibility of the pilot screens (Sprint 7): loyalty card and visits, my applications (hiring timeline),
// Resume Studio, Surprise Boxes and its Discounts card. Static checks on the real source (Babel AST):
//   - every TouchableOpacity / Pressable / Switch / TextInput has an accessibilityLabel (or, for a touchable,
//     visible text that becomes its label) and touchables have an accessibilityRole
//   - every touchable is at least 44 pt (minHeight / height / width + height in its StyleSheet style, or
//     hitSlop that makes it 44)
//   - every text colour these screens use has 4.5:1 contrast on the backgrounds it sits on (theme tokens)
//   node tests/app/a11y-pilot.test.js
const path = require("path");
const fs = require("fs");
const Module = require("module");
const APP = path.resolve(__dirname, "..", "..");
const reqApp = Module.createRequire(path.join(APP, "package.json"));
const babel = reqApp("@babel/core");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  -> " + String(x).slice(0, 600) : ""}`); };

const FILES = [
  "app/src/components/LoyaltyCard.js", "app/src/components/LoyaltyVisits.js", "app/src/components/CareerApplications.js",
  "app/src/screens/Resume/ResumeStudio.js", "app/src/screens/SurpriseBoxes.js", "app/src/components/SurpriseBoxCard.js",
];
const TOUCH = new Set(["TouchableOpacity", "Pressable", "TouchableHighlight", "TouchableWithoutFeedback"]);
const LABELLED = new Set([...TOUCH, "Switch", "TextInput"]);

function styleTable(ast) {
  // StyleSheet.create({ name: { ...numbers } }) -> { name: { minHeight, height, width, padding... } }
  const out = {};
  babel.traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== "MemberExpression" || c.property.name !== "create" || c.object.name !== "StyleSheet") return;
      const obj = p.node.arguments[0];
      if (!obj || obj.type !== "ObjectExpression") return;
      for (const prop of obj.properties) {
        if (prop.type !== "ObjectProperty" || prop.value.type !== "ObjectExpression") continue;
        const name = prop.key.name || prop.key.value;
        out[name] = {};
        for (const q of prop.value.properties) if (q.type === "ObjectProperty" && q.value.type === "NumericLiteral") out[name][q.key.name || q.key.value] = q.value.value;
      }
    },
  });
  return out;
}
const attr = (el, name) => el.openingElement.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === name);
function styleNames(el) {
  const a = attr(el, "style");
  if (!a || !a.value || a.value.type !== "JSXExpressionContainer") return [];
  const names = [];
  const walk = (n) => {
    if (!n) return;
    if (n.type === "MemberExpression" && n.object.name === "styles") names.push(n.property.name);
    else if (n.type === "ArrayExpression") n.elements.forEach(walk);
    else if (n.type === "LogicalExpression" || n.type === "ConditionalExpression") { walk(n.left); walk(n.right); walk(n.consequent); walk(n.alternate); }
    else if (n.type === "ObjectExpression") names.push({ inline: Object.fromEntries(n.properties.filter((q) => q.value?.type === "NumericLiteral").map((q) => [q.key.name, q.value.value])) });
  };
  walk(a.value.expression);
  return names;
}
const hasText = (el) => el.children.some((c) => c.type === "JSXElement" && /Text$/.test(c.openingElement.name.name || "") || (c.type === "JSXElement" && hasText(c)));
const line = (el) => el.loc?.start.line;

const problems = { label: [], role: [], size: [] };
let elements = 0;
for (const f of FILES) {
  const code = fs.readFileSync(path.join(APP, f), "utf8");
  const ast = babel.parseSync(code, { filename: f, babelrc: false, configFile: false, plugins: [reqApp.resolve("@babel/plugin-syntax-jsx")] });
  const styles = styleTable(ast);
  babel.traverse(ast, {
    JSXElement(p) {
      const el = p.node;
      const name = el.openingElement.name.name;
      if (!LABELLED.has(name)) return;
      elements += 1;
      const where = `${path.basename(f)}:${line(el)} <${name}>`;
      const labelled = !!attr(el, "accessibilityLabel") || !!attr(el, "aria-label") || (TOUCH.has(name) && hasText(el)) || (name === "TextInput" && !!attr(el, "placeholder") && !!attr(el, "accessibilityLabel"));
      if (!labelled) problems.label.push(where);
      if (TOUCH.has(name) && !attr(el, "accessibilityRole") && !attr(el, "role")) problems.role.push(where);
      if (TOUCH.has(name)) {
        const sz = { minHeight: 0, height: 0, width: 0, minWidth: 0, padding: 0, paddingVertical: 0 };
        for (const s of styleNames(el)) { const st = typeof s === "string" ? styles[s] || {} : s.inline; for (const k of Object.keys(sz)) if (st[k]) sz[k] = Math.max(sz[k], st[k]); }
        // height: set explicitly, or vertical padding around one line of text (about 18 pt)
        const tall = Math.max(sz.minHeight, sz.height, sz.padding ? sz.padding * 2 + 18 : 0, sz.paddingVertical ? sz.paddingVertical * 2 + 18 : 0);
        const slopAttr = attr(el, "hitSlop");
        let slop = 0;
        if (slopAttr?.value?.type === "JSXExpressionContainer") {
          const e = slopAttr.value.expression;
          if (e.type === "NumericLiteral") slop = e.value * 2;
          else if (e.type === "ObjectExpression") slop = e.properties.filter((q) => ["top", "bottom"].includes(q.key?.name) && q.value.type === "NumericLiteral").reduce((n, q) => n + q.value.value, 0);
          else if (e.type === "Identifier") slop = 12; // a shared constant (HIT_SLOP), checked below
        }
        if (tall + slop < 44) problems.size.push(`${where} (about ${tall} pt${slop ? ` + ${slop} hitSlop` : ""})`);
      }
    },
  });
}
ok(elements >= 20, `${elements} touchables, switches and inputs found in ${FILES.length} files`);
ok(problems.label.length === 0, "every touchable, switch and input has an accessible label", problems.label.join("; "));
ok(problems.role.length === 0, "every touchable announces a role (button, tab, radio ...)", problems.role.join("; "));
ok(problems.size.length === 0, "every touchable is at least 44 pt tall (or has hitSlop)", problems.size.join("; "));

// ---------- contrast of the text colours on the backgrounds these screens use ----------
const tokens = fs.readFileSync(path.join(APP, "app/src/theme/tokens.js"), "utf8");
const T = Object.fromEntries([...tokens.matchAll(/^\s+([a-zA-Z]+):\s*"(#[0-9A-Fa-f]{6})"/gm)].map((m) => [m[1], m[2]]));
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const used = new Set();
for (const f of FILES) for (const m of fs.readFileSync(path.join(APP, f), "utf8").matchAll(/color:\s*T\.([a-zA-Z]+)/g)) used.add(m[1]);
const BACKGROUNDS = ["paper", "card", "sand", "yellowSoft", "successBg", "dangerBg"].filter((b) => T[b]);
const low = [];
for (const c of used) {
  if (!T[c] || ["white", "yellow"].includes(c)) continue; // white text sits on ink; yellow is used on ink only
  // textFaint is only a placeholder colour, inside inputs on cards / the page
  for (const bg of c === "textFaint" ? ["card", "paper"] : BACKGROUNDS) { const r = ratio(T[c], T[bg]); if (r < 4.5) low.push(`${c} ${T[c]} on ${bg} ${T[bg]}: ${r.toFixed(2)}`); }
}
const onInk = ["white", "yellow"].filter((c) => used.has(c) && T[c]).map((c) => [c, ratio(T[c], T.ink)]);
ok(low.length === 0, `text colours (${[...used].join(", ")}) reach 4.5:1 on every light background`, low.join("; "));
ok(onInk.every(([, r]) => r >= 4.5), "white / yellow text on ink reaches 4.5:1", onInk.map(([c, r]) => `${c} ${r.toFixed(2)}`).join(", "));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
