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

// SEC-1: every chat socket tells the server who it is: the token at the handshake (auth: { token }) or
// useSocketAuth(socket, token) ('authenticate' now and after each reconnect). Events.js only subscribes to public events.
const CHAT = ["screens/Social/ChatDetails.js", "screens/Social/MessageScreen.js", "screens/skillshare/InquiryChatScreen.js", "screens/skillshare/MatchChatScreen.js"];
for (const f of CHAT) {
  const src = fs.readFileSync(path.join(H.SRC, f), "utf8");
  const handshake = /io\([^)]*\{[^}]*auth:\s*\{\s*token\s*\}/s.test(src);
  const hook = /useSocketAuth\(socket, token\)/.test(src);
  ok(handshake || hook, `${f}: the socket identifies with the token (${handshake ? "handshake" : hook ? "authenticate" : "none"})`);
}
const cd = fs.readFileSync(path.join(H.SRC, "screens/Social/ChatDetails.js"), "utf8");
ok(cd.indexOf("useSocketAuth(socket, token)") > 0 && cd.indexOf("useSocketAuth(socket, token)") < cd.indexOf('socket.emit("join_chat"'), "ChatDetails: authenticate is set up before the join");

(async () => {
  const { React, mount } = H.makeReact();
  const hook = H.loader({ react: React })(path.join(H.SRC, "hooks/useSocketAuth.js")).default;
  const sent = []; const handlers = {};
  const socket = { connected: true, emit: (ev, t) => sent.push([ev, t]), on: (ev, fn) => { handlers[ev] = fn; }, off: (ev) => { delete handlers[ev]; } };
  const C = () => { hook(socket, "tok-1"); return null; };
  const m = mount(React.createElement(C));
  ok(sent.length === 1 && sent[0][0] === "authenticate" && sent[0][1] === "tok-1", "useSocketAuth: 'authenticate' with the token at once");
  handlers.connect();
  ok(sent.length === 2, "…and again after a reconnect");
  m.unmount();
  ok(!handlers.connect, "…stops listening on unmount");
  const none = []; const C2 = () => { hook({ emit: (e) => none.push(e), on() {}, off() {} }, null); return null; };
  mount(React.createElement(C2));
  ok(none.length === 0, "no token (guest): nothing sent");
  done();
})();
