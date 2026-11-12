// fix/profile-refresh-and-keyboard
//  1. A person's profile refreshes the logged-in user from a route the server has (GET /api/auth/profile/me, which
//     replies with the user itself). It used GET /api/social/user/me, which doesn't exist, so connect / accept /
//     comment never refreshed the connection lists.
//  2. Every screen with two or more text fields keeps the focused field above the keyboard
//     (react-native-keyboard-controller, KeyboardProvider at the app root, or KeyboardAvoidingView).
//   node tests/app/profile-refresh-and-keyboard.test.js
const fs = require("fs");
const path = require("path");
const { APP, SERVER } = require("../paths");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 600) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8");

// ── 1. profile refresh ──
const up = read("app/src/screens/Social/UserProfile.js");
const start = up.indexOf("const refreshCurrentUser");
const fn = up.slice(start, up.indexOf("}, [config, setUser]);", start));
ok(start > 0 && fn.length > 0, "UserProfile has refreshCurrentUser");
ok(/axios\.get\(`\$\{SERVER_ORIGIN\}\/api\/auth\/profile\/me`, config\)/.test(fn), "refresh reads GET /api/auth/profile/me with the login");
ok(!/\/user\/me/.test(up.replace(/\/\/.*$/gm, "")), "no call to the missing /api/social/user/me");
ok(/meRes\.data\?\._id \? meRes\.data : null/.test(fn), "the reply is the user itself (not { user })");
ok(/setUser\(\(prev\) => \(\{ \.\.\.\(prev \|\| \{\}\), \.\.\.me \}\)\)/.test(fn), "merges into the stored user (keeps fields the login added)");
const authRoutes = path.join(SERVER, "routes/auth.routes.js");
if (fs.existsSync(authRoutes)) {
  const a = fs.readFileSync(authRoutes, "utf8");
  const i = a.indexOf('router.get("/profile/me"');
  const body = a.slice(i, a.indexOf("\n});", i));
  ok(i > 0 && /authMiddleware/.test(body) && /res\.json\(userData\)/.test(body) && /\.\.\.user\.toObject\(\)/.test(body) && /select\("-password"\)/.test(body),
    "server: GET /api/auth/profile/me exists, needs a login, replies with the user (no password)");
} else ok(false, "server repo available for the route check", authRoutes);

// ── 2. keyboard ──
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.js$/.test(f.name)) files.push(p); } };
walk(path.join(APP, "app/src"));
const KB = /KeyboardAvoidingView|KeyboardAwareScrollView|react-native-keyboard-controller|KeyboardStickyView/;
// Career.js: its apply form moves to the JobApplicationForm screen (feat/job-details-screen), which handles the keyboard
const PENDING = new Set(["app/src/components/Career.js"]);
const missing = [];
for (const f of files) {
  const rel = path.relative(APP, f).split(path.sep).join("/");
  const s = fs.readFileSync(f, "utf8");
  if ((s.match(/<TextInput\b/g) || []).length >= 2 && !KB.test(s) && !PENDING.has(rel)) missing.push(rel);
}
ok(missing.length === 0, "every file with 2+ text fields handles the keyboard", missing.join(", "));
for (const rel of ["app/src/screens/Resume/ResumeBuilder.js", "app/src/screens/Resume/ResumeStudio.js"]) {
  const s = read(rel);
  ok(/import \{ KeyboardAwareScrollView \} from ['"]react-native-keyboard-controller['"]/.test(s)
    && (s.match(/<KeyboardAwareScrollView\b/g) || []).length === 1 && (s.match(/<\/KeyboardAwareScrollView>/g) || []).length === 1
    && /<KeyboardAwareScrollView[^>]*bottomOffset=\{\d+\}[^>]*keyboardShouldPersistTaps="handled"/.test(s)
    && !/<ScrollView\b/.test(s), `${path.basename(rel)}: the form scrolls the focused field above the keyboard`);
}
ok(/<KeyboardProvider\b/.test(read("App.js")), "KeyboardProvider wraps the app (needed by KeyboardAwareScrollView)");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
