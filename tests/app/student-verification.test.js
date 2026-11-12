// fix/student-verification: the verification signup actually uses is the email code (SignupScreen → POST
// /auth/signup → SignupVerify → POST /auth/signup/verify-otp, resend: /auth/signup/resend-otp). It stays.
// The document upload screen (VerificationScreen: profile photo, CNIC, student ID card → PUT /auth/verify-student-docs)
// was registered but never opened, and the server has no such route: it's removed. Signup uses no document
// verification, so none is built.
//   node tests/app/student-verification.test.js
const fs = require("fs");
const path = require("path");
const { APP, SERVER } = require("../paths");
let failed = 0, passed = 0;
const ok = (c, l, x = "") => { c ? passed++ : failed++; console.log(`${c ? "ok  " : "FAIL"}  ${l}${!c && x ? "  → " + String(x).slice(0, 400) : ""}`); };
const read = (rel) => fs.readFileSync(path.join(APP, rel), "utf8").replace(/\r\n/g, "\n");

const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.js$/.test(f.name)) files.push(p); } };
walk(path.join(APP, "app/src"));
files.push(path.join(APP, "App.js"));
const all = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");

console.log("── the live flow (kept)");
const signup = read("app/src/screens/SignupScreen.js");
ok(/api\.post\("\/auth\/signup", body/.test(signup) && /navigation\.navigate\("SignupVerify", \{/.test(signup), "signup: POST /auth/signup, then the email code screen (SignupVerify)");
const verify = read("app/src/screens/SignupVerifyScreen.js");
ok(/"\/auth\/signup\/verify-otp"/.test(verify) && /"\/auth\/signup\/resend-otp"/.test(verify), "SignupVerify: checks the code (/auth/signup/verify-otp), can resend it (/auth/signup/resend-otp)");
const auth = read("app/src/navigation/AuthNavigator.js");
ok(/<Stack\.Screen name="SignupVerify" component=\{SignupVerifyScreen\} \/>/.test(auth) && /<Stack\.Screen name="Signup" component=\{SignupScreen\} \/>/.test(auth), "Signup and SignupVerify are registered");
const authRoutes = path.join(SERVER, "routes/auth.routes.js");
if (fs.existsSync(authRoutes)) {
  const s = fs.readFileSync(authRoutes, "utf8");
  ok(/router\.post\("\/signup", /.test(s) && /router\.post\("\/signup\/verify-otp", /.test(s) && /router\.post\("\/signup\/resend-otp", /.test(s), "server: /signup, /signup/verify-otp and /signup/resend-otp exist");
  ok(!/verify-student-docs/.test(s), "server: no document verification route (nothing to send documents to)");
} else ok(false, "server repo available", authRoutes);

console.log("── the dead flow (removed)");
ok(!fs.existsSync(path.join(APP, "app/src/screens/VerificationScreen.js")), "VerificationScreen.js is gone");
ok(!/VerificationScreen/.test(auth), "…and its route and import");
ok(!/verify-student-docs/.test(all) && !/["']VerificationScreen["']/.test(all), "nothing in the app calls /auth/verify-student-docs or opens VerificationScreen");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
