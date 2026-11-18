// The university dropdown (feat/universities, fix/universities-rules): one component for signup and profile edit.
// It opens on the FULL list A–Z with no typing; the search box filters (name, short name, alias, city); the list is
// never empty (the bundled HEC list when offline or when the server returns nothing; the server's list, with an
// admin's additions, when it loads); students can't add a university: "can't find your university? contact support".
//   node tests/app/university-picker.test.js
const path = require("path");
const fs = require("fs");
const H = require("./harness");
const { SERVER } = require("../paths");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const { React, mount } = H.makeReact();
  const FlatList = ({ data, renderItem, ListEmptyComponent }) => React.createElement("View", null, data && data.length ? data.map((item, index) => React.createElement(React.Fragment, { key: index }, renderItem({ item, index }))) : ListEmptyComponent || null);
  const opened = [];
  const { rn } = H.makeRN({ FlatList, Linking: { openURL: async (u) => { opened.push(u); } } });
  const BUNDLED = JSON.parse(fs.readFileSync(path.join(H.SRC, "data/universities-pk.json"), "utf8"));
  const server = { mode: "ok", list: null, gets: 0 };
  const apiMock = {
    __esModule: true,
    default: {
      get: async (url) => {
        server.gets++;
        if (server.mode === "offline") throw Object.assign(new Error("Network Error"), { request: {} });
        if (server.mode === "empty") return { data: { success: true, data: [] } };
        return { data: { success: true, data: server.list } };
      },
      put: async () => ({ data: { data: {} } }),
    },
  };
  const nav = { routeNames: [], calls: [] };
  const load = H.loader({
    react: React, "react-native": rn,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "@react-navigation/native": { useNavigation: () => ({ getState: () => ({ routeNames: nav.routeNames }), navigate: (n) => nav.calls.push(n) }) },
    "./api": apiMock,
    "../data/universities-pk.json": BUNDLED,
    "./ContactUs": { SUPPORT_WHATSAPP: "https://wa.me/923249287649" },
  });
  const uapi = load(path.join(H.SRC, "api/universitiesApi.js"));
  const Picker = load(path.join(H.SRC, "components/UniversityPicker.js")).default;

  console.log("── the bundled list is the server's seed");
  const seed = JSON.parse(fs.readFileSync(path.join(SERVER, "seeds", "universities-pk.json"), "utf8"));
  const seedNames = seed.universities.filter((u) => u.status === "approved").map((u) => u.name).sort();
  ok(JSON.stringify(BUNDLED.universities.map((u) => u.name).sort()) === JSON.stringify(seedNames) && BUNDLED.universities.length >= 280, `bundled list = the server seed's approved universities (${BUNDLED.universities.length})`);
  ok(BUNDLED.universities.every((u) => u.name && "shortName" in u && "city" in u && Array.isArray(u.aliases)), "each with name, short name, city and aliases");

  // the server's list: the seed (with ids) plus one the admin added
  server.list = [...BUNDLED.universities.map((u, i) => ({ id: `s${i}`, ...u, status: "approved" })), { id: "new1", name: "Aaa Test Institute of Design", shortName: "ATID", city: "Lahore", aliases: [], status: "approved" }];
  let picked = null;
  let value = null;
  const el = () => React.createElement(Picker, { value, onChange: (u) => { picked = u; value = u; } });
  const m = mount(el());
  const byId = (id) => H.find(m.tree, (n) => n.props?.testID === id);
  const rows = () => H.findAll(m.tree, (n) => typeof n.props?.testID === "string" && n.props.testID.startsWith("university-") && !["university-field", "university-count", "university-support"].includes(n.props.testID));
  const search = (q) => H.find(m.tree, (n) => n.type === "TextInput" && n.props.accessibilityLabel === "search universities").props.onChangeText(q);

  console.log("── opens on the full list, no typing");
  byId("university-field").props.onPress();
  const firstPaint = rows().length;
  ok(firstPaint === BUNDLED.universities.length, "the first paint (before the server answers) is already the full bundled list", firstPaint);
  await H.tick(10);
  const names = rows().map((r) => r.props.testID.replace("university-", ""));
  ok(names.length === server.list.length, `then the server's full list: ${names.length} universities`, names.length);
  ok(names.every((n, i) => i === 0 || names[i - 1].localeCompare(n) <= 0), "A–Z");
  ok(names[0] === "Aaa Test Institute of Design", "an admin's addition is in the dropdown (no app update)", names[0]);
  ok(/IoBM · Karachi/.test(H.textOf(byId("university-Institute of Business Management"))), "each row: name, short name and city");
  ok(/universities, A–Z/.test(H.textOf(byId("university-count"))), "says how many, A–Z");

  console.log("── the search box filters as you type");
  search("iobm"); await H.tick(2);
  ok(rows().length === 1 && byId("university-Institute of Business Management"), "short name: 'iobm'");
  search("fast-nuces"); await H.tick(2);
  ok(byId("university-National University of Computer & Emerging Sciences"), "alias: 'fast-nuces'");
  search("karachi university"); await H.tick(2);
  ok(byId("university-University of Karachi"), "alias words: 'karachi university'");
  search("jamshoro"); await H.tick(2);
  ok(rows().length > 0 && rows().every((r) => /Jamshoro/.test(H.textOf(r))), "city: 'jamshoro'");
  search("ned engineering"); await H.tick(2);
  ok(byId("university-NED University of Engineering & Technology"), "words of the name: 'ned engineering'");
  search("zzzz nothing"); await H.tick(2);
  ok(rows().length === 0 && /no match/.test(H.textOf(m.tree)), "no match: says so");
  search(""); await H.tick(2);
  ok(rows().length === server.list.length, "clearing the search: the full list again");
  byId("university-Institute of Business Management").props.onPress();
  await H.tick(2);
  m.rerender(el());
  ok(picked?.id && picked.name === "Institute of Business Management" && /Institute of Business Management \(IoBM\) · Karachi/.test(H.textOf(byId("university-field"))), "picked: the field shows it (with the server's id)");

  console.log("── never empty");
  uapi._resetForTests();
  server.mode = "offline";
  byId("university-field").props.onPress();
  await H.tick(10);
  ok(rows().length === BUNDLED.universities.length, "offline: the bundled list", rows().length);
  byId("university-Habib University").props.onPress();
  await H.tick(2);
  ok(picked?.name === "Habib University" && picked.id === null, "…a bundled pick has the name (signup sends it; the server matches it)");
  uapi._resetForTests();
  server.mode = "empty";
  m.rerender(el());
  byId("university-field").props.onPress();
  await H.tick(10);
  ok(rows().length === BUNDLED.universities.length, "the server returns nothing: the bundled list");
  ok((await uapi.loadUniversities({ force: true })).length === BUNDLED.universities.length, "loadUniversities: bundled when the server's list is empty");

  console.log("── students can't add a university");
  ok(!byId("university-not-listed") && !H.byLabel(m.tree, "my university isn't listed") && !H.find(m.tree, (n) => n.type === "TextInput" && n.props.accessibilityLabel === "university name"), "no 'my university isn't listed', no form");
  ok(/can't find your university\? contact support/.test(H.textOf(byId("university-support"))), "instead: 'can't find your university? contact support'");
  byId("university-support").props.onPress();
  ok(opened.includes("https://wa.me/923249287649"), "signup (no help screen here): opens tdc support on WhatsApp, as on the help screen");
  nav.routeNames = ["Home", "ContactUs"];
  byId("university-field").props.onPress();
  await H.tick(5);
  byId("university-support").props.onPress();
  ok(nav.calls.includes("ContactUs"), "signed in: opens the help & support screen");
  const apiSrc = H.read("app/src/api/universitiesApi.js");
  ok(!/\/universities\/request/.test(apiSrc) && !/request\s*:/.test(apiSrc), "the app has no way to send a university request");

  console.log("── one component, one list");
  const signup = H.read("app/src/screens/SignupScreen.js");
  const edit = H.read("app/src/screens/Social/EditProfileScreen.js");
  ok(/import UniversityPicker from "\.\.\/components\/UniversityPicker"/.test(signup) && /<UniversityPicker/.test(signup), "signup uses UniversityPicker");
  ok(/import UniversityPicker from "\.\.\/\.\.\/components\/UniversityPicker"/.test(edit) && /<UniversityPicker/.test(edit) && /universitiesApi\.setMine\(uni\.id\)/.test(edit), "profile edit uses the same dropdown and saves through /universities/mine");
  ok(!/const UNIVERSITIES = \[/.test(signup), "no other university list in the app");
  ok(/universityId: university\?\.id \|\| undefined/.test(signup) && /universityName: university\?\.name/.test(signup), "signup sends the id (or, offline, the bundled name)");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
