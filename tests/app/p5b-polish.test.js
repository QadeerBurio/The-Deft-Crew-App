// P5b polish (flags off by default):
//   cityCheck: once on Home, "is your city right?" for a signed-in student whose server-side city is the old
//              automatic "Karachi" and not yet confirmed; "yes, karachi" / another city → POST /api/me/city, then gone
//   headerSearch: the header's brand search button (the search box and its submit already existed; Brands reads
//              the query); a close button while searching; no button with the flag off
// Real CityCheckCard.js (api, flag, account and the dropdown are fakes); source checks on DrawerNavigator / Home.
//   node tests/app/p5b-polish.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const { React, mount } = H.makeReact();
  const { rn } = H.makeRN();
  let flag = false; let me = { role: "student", city: "Karachi" }; let failPost = false;
  const calls = [];
  const api = {
    get: async (url) => { calls.push(["GET", url]); return { data: me }; },
    post: async (url, body) => { calls.push(["POST", url, body]); if (failPost) { const e = new Error("x"); e.response = { status: 400, data: { error: "that doesn't look like a city name." } }; throw e; } return { data: { ok: true } }; },
  };
  const account = { token: "tok", isGuest: false };
  const load = H.loader({
    react: React, "react-native": rn,
    "../../api/api": { __esModule: true, default: api },
    "../../context/AuthContext": { AuthContext: { _default: account } },
    "../../hooks/useFlag": { __esModule: true, default: () => flag },
    "../../ui": { Card: (p) => React.createElement("Card", p, p.children), Button: (p) => React.createElement("Button", p) },
    "../../components/CityDropdown": { __esModule: true, default: (p) => React.createElement("CityDropdown", p) },
  });
  const M = load(path.join(H.SRC, "screens/home/CityCheckCard.js"));
  const Card = M.default;
  const text = (t) => { const out = []; (function w(x) { if (x == null || x === false) return; if (typeof x === "string") return out.push(x); if (Array.isArray(x)) return x.forEach(w); w(x.props?.children); })(t); return out.join(" "); };

  ok(M.needsCityCheck({ role: "student", city: "Karachi" }) && !M.needsCityCheck({ role: "student", city: "Karachi", cityConfirmedAt: "2026-11-25" }) && !M.needsCityCheck({ role: "student", city: "Lahore" }) && !M.needsCityCheck({ role: "student", city: "" }) && !M.needsCityCheck({ role: "brand", city: "Karachi" }) && !M.needsCityCheck(null), "asked only: a student, city Karachi, never confirmed");

  let m = mount(React.createElement(Card));
  await H.tick(10);
  ok(m.tree == null && calls.length === 0, "flag off: nothing shown, nothing asked of the server");
  m.unmount();

  flag = true;
  m = mount(React.createElement(Card));
  await H.tick(10);
  ok(calls[0]?.[1] === "/auth/me" && /is your city right\?/.test(text(m.tree)) && /we have karachi/.test(text(m.tree)), "flag on, Karachi never confirmed: the card", text(m.tree));
  const btn = H.find(m.tree, (n) => n.type === "Button");
  const dd = H.find(m.tree, (n) => n.type === "CityDropdown");
  ok(btn && btn.props.accessibilityLabel === "yes, my city is karachi" && dd && dd.props.selected === "Karachi" && dd.props.options.includes("Lahore"), "…'yes, karachi' and the city list (Karachi selected)");
  btn.props.onPress();
  await H.tick(10);
  ok(JSON.stringify(calls.at(-1)) === '["POST","/me/city",{"confirm":true}]' && m.tree == null, "'yes, karachi' → POST /me/city { confirm: true }, the card goes away");
  m.unmount();

  calls.length = 0;
  m = mount(React.createElement(Card));
  await H.tick(10);
  H.find(m.tree, (n) => n.type === "CityDropdown").props.onSelect("Lahore");
  await H.tick(10);
  ok(JSON.stringify(calls.at(-1)) === '["POST","/me/city",{"city":"Lahore"}]' && m.tree == null, "another city → POST /me/city { city }, then gone");
  m.unmount();

  failPost = true;
  m = mount(React.createElement(Card));
  await H.tick(10);
  H.find(m.tree, (n) => n.type === "Button").props.onPress();
  await H.tick(10);
  ok(m.tree != null && /that doesn't look like a city name/.test(text(m.tree)), "the server says no: the card stays with its sentence", text(m.tree));
  m.unmount(); failPost = false;

  for (const [label, who] of [["confirmed already", { role: "student", city: "Karachi", cityConfirmedAt: "2026-11-25" }], ["another city", { role: "student", city: "Lahore" }], ["a brand", { role: "brand", city: "Karachi" }]]) {
    me = who;
    m = mount(React.createElement(Card));
    await H.tick(10);
    ok(m.tree == null, `${label}: nothing shown`);
    m.unmount();
  }
  account.isGuest = true; me = { role: "student", city: "Karachi" }; calls.length = 0;
  m = mount(React.createElement(Card));
  await H.tick(10);
  ok(m.tree == null && calls.length === 0, "a guest: nothing shown, nothing asked");
  m.unmount(); account.isGuest = false;

  const home = H.read("app/src/screens/Home.js");
  ok(/import CityCheckCard from "\.\/home\/CityCheckCard";/.test(home) && /\{signedIn && <CityCheckCard \/>\}/.test(home), "Home shows it to signed-in students, above near me");
  const signup = H.read("app/src/screens/SignupScreen.js");
  ok(/import \{ CITIES \} from "\.\/pkCities";/.test(signup) && /export const CITIES = \[/.test(H.read("app/src/screens/pkCities.js")), "the city list is shared with signup (moved unchanged)");

  // header search
  const dn = H.read("app/src/navigation/DrawerNavigator.js").replace(/\r\n/g, "\n");
  ok(/const headerSearchOn = useFlag\('headerSearch'\) === true;/.test(dn), "header: reads headerSearch");
  ok(/\{headerSearchOn && \(\n\s*<TouchableOpacity\n\s*onPress=\{toggleSearch\}[\s\S]{0,200}accessibilityLabel="search brands"/.test(dn), "flag on: a 'search brands' button opens the search");
  ok(/\{searchVisible && headerSearchOn && \([\s\S]{0,300}accessibilityLabel="close search"/.test(dn), "…and a 'close search' button while it is open");
  ok((dn.match(/hitSlop=\{4\}/g) || []).length >= 2, "both are 40 pt with a 4 pt hit slop (48 pt to touch)");
  ok(/navigation\.navigate\('Brands', \{\n\s*query: trimmedQuery,/.test(dn) && /const \{ query \} = route\.params \|\| \{\};/.test(H.read("app/src/screens/Brands.js")) && /if \(query\) setSearchQuery\(query\);/.test(H.read("app/src/screens/Brands.js")), "the submitted search opens Brands with the query, which Brands applies");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
