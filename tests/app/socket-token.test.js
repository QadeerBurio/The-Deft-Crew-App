// Socket identity (upgrade/p4-1-safety, plan P4-1b): every 'user_online' the app sends carries the sign-in token as
// the second argument, so the server can tell who it is (older servers ignore the extra argument). Without it, a
// student's online status would stop once the server's FLAG_ACCOUNT_STATUS_ENFORCE is on.
//   node tests/app/socket-token.test.js
const path = require("path");
const fs = require("fs");
const H = require("./harness");
const { ok, done } = H.counter();

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (p.endsWith(".js")) files.push(p);
  }
})(H.SRC);
const emits = [];
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/\.emit\(\s*["']user_online["']\s*,([^)]*)\)/g)) emits.push({ file: path.relative(H.SRC, f), args: m[1].split(",").map((s) => s.trim()) });
}
ok(emits.length >= 4, `the app's user_online emits were found (${emits.length})`, JSON.stringify(emits));
const bad = emits.filter((e) => e.args.length < 2 || !/token/i.test(e.args[1]));
ok(bad.length === 0, "every user_online sends the token as the 2nd argument", bad.map((b) => `${b.file}: ${b.args.join(", ")}`).join(" | "));
for (const f of ["screens/skillshare/InquiryChatScreen.js", "screens/skillshare/MatchChatScreen.js", "screens/Social/ChatDetails.js"]) {
  const src = fs.readFileSync(path.join(H.SRC, f), "utf8");
  ok(/const \{[^}]*\btoken\b[^}]*\} = useContext\(AuthContext\)/.test(src), `${f}: the token comes from AuthContext`);
}
done();
