// The university picker (feat/universities): one component for signup and profile edit, on the shared list.
// Type to filter (name / short name / city), pick one; "my university isn't listed" -> a request: "did you mean …?"
// for one that's already there, else the student continues with it as "pending review".
//   node tests/app/university-picker.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  const { React, mount } = H.makeReact();
  const FlatList = ({ data, renderItem, ListEmptyComponent }) => React.createElement("View", null, data && data.length ? data.map((item, index) => React.createElement(React.Fragment, { key: index }, renderItem({ item, index }))) : ListEmptyComponent || null);
  const { rn } = H.makeRN({ FlatList });
  const calls = [];
  const LIST = [
    { id: "u1", name: "Institute of Business Management", shortName: "IoBM", city: "Karachi", status: "approved" },
    { id: "u2", name: "NED University of Engineering & Technology", shortName: "NED", city: "Karachi", status: "approved" },
  ];
  const api = {
    search: async (q) => { calls.push(["search", q]); if (api.fail) throw Object.assign(new Error("offline"), { offline: true }); return LIST.filter((u) => !q || `${u.name} ${u.shortName} ${u.city}`.toLowerCase().includes(q.toLowerCase())); },
    request: async (body) => { calls.push(["request", body]); return api.answer(body); },
    setMine: async () => ({}),
  };
  const load = H.loader({
    react: React, "react-native": rn,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "../api/universitiesApi": { universitiesApi: api, universityLabel: load0().universityLabel },
  });
  function load0() { return H.loader({ react: React, "react-native": rn, "./api": { __esModule: true, default: {} } })(path.join(H.SRC, "api/universitiesApi.js")); }
  const Picker = load(path.join(H.SRC, "components/UniversityPicker.js")).default;
  const { universityLabel } = load0();

  console.log("── how a university reads");
  ok(universityLabel(LIST[0]) === "Institute of Business Management (IoBM) · Karachi", "name, short name and city", universityLabel(LIST[0]));
  ok(universityLabel({ name: "Karachi Grammar College of Design", city: "Karachi", status: "pending" }).endsWith("· pending review"), "a requested one says 'pending review'");

  console.log("── pick from the list");
  let picked = null;
  let value = null;
  const el = () => React.createElement(Picker, { value, onChange: (u) => { picked = u; value = u; } });
  const m = mount(el());
  const byId = (id) => H.find(m.tree, (n) => n.props?.testID === id);
  ok(/select university/.test(H.textOf(byId("university-field"))), "empty: 'select university'");
  byId("university-field").props.onPress();
  await H.tick(20);
  ok(calls.some((c) => c[0] === "search" && c[1] === "") && byId("university-u1") && byId("university-u2"), "opening the sheet lists universities");
  H.find(m.tree, (n) => n.type === "TextInput" && n.props.accessibilityLabel === "search universities").props.onChangeText("iobm");
  await H.tick(300);
  ok(byId("university-u1") && !byId("university-u2"), "typing the short name filters (server search)");
  ok(/Institute of Business Management/.test(H.textOf(byId("university-u1"))) && /IoBM · Karachi/.test(H.textOf(byId("university-u1"))), "each row: name, short name and city");
  byId("university-u1").props.onPress();
  await H.tick(5);
  m.rerender(el());
  ok(picked?.id === "u1" && /Institute of Business Management \(IoBM\) · Karachi/.test(H.textOf(byId("university-field"))), "picked: the field shows it");

  console.log("── offline");
  api.fail = true;
  byId("university-field").props.onPress();
  await H.tick(20);
  ok(/couldn't load the list/.test(H.textOf(m.tree)) && H.byLabel(m.tree, "try again"), "the list can't load: says so, with 'try again'");
  api.fail = false;
  H.byLabel(m.tree, "try again").props.onPress();
  await H.tick(20);
  ok(byId("university-u1"), "try again: the list is back");

  console.log("── my university isn't listed");
  byId("university-not-listed").props.onPress();
  await H.tick(5);
  const input = (label) => H.find(m.tree, (n) => n.type === "TextInput" && n.props.accessibilityLabel === label);
  ok(input("university name") && input("city"), "a small form: name and city");
  H.byLabel(m.tree, "add my university").props.onPress();
  await H.tick(5);
  ok(/full name and its city/.test(H.textOf(m.tree)) && !calls.some((c) => c[0] === "request"), "empty: says what's missing, sends nothing");
  api.answer = () => ({ match: LIST[0], message: "Did you mean Institute of Business Management (Karachi)?" });
  input("university name").props.onChangeText("Inst of Business Mgmt");
  input("city").props.onChangeText("Karachi");
  await H.tick(2);
  H.byLabel(m.tree, "add my university").props.onPress();
  await H.tick(10);
  ok(/Did you mean Institute of Business Management/.test(H.textOf(m.tree)) && H.byLabel(m.tree, "use Institute of Business Management"), "already on the list: 'did you mean …?' with a button to use it");
  H.byLabel(m.tree, "use Institute of Business Management").props.onPress();
  await H.tick(5);
  ok(picked?.id === "u1", "…using it picks that one (no request made)");
  m.rerender(el());
  byId("university-field").props.onPress();
  await H.tick(20);
  byId("university-not-listed").props.onPress();
  await H.tick(5);
  api.answer = (b) => ({ university: { id: "p1", name: b.name, shortName: "", city: b.city, status: "pending" }, created: true });
  input("university name").props.onChangeText("Karachi Grammar College of Design");
  input("city").props.onChangeText("Karachi");
  await H.tick(2);
  H.byLabel(m.tree, "add my university").props.onPress();
  await H.tick(10);
  m.rerender(el());
  ok(picked?.id === "p1" && picked.status === "pending" && calls.some((c) => c[0] === "request" && c[1].name === "Karachi Grammar College of Design" && c[1].city === "Karachi"), "a new one: requested, and the student continues with it");
  ok(/Karachi Grammar College of Design · Karachi · pending review/.test(H.textOf(byId("university-field"))) && /we're checking this university/.test(H.textOf(m.tree)), "it shows as their university, marked pending review");

  console.log("── one component for signup and profile edit");
  const signup = H.read("app/src/screens/SignupScreen.js");
  const edit = H.read("app/src/screens/Social/EditProfileScreen.js");
  ok(/import UniversityPicker from "\.\.\/components\/UniversityPicker"/.test(signup) && /<UniversityPicker/.test(signup), "signup uses UniversityPicker");
  ok(/import UniversityPicker from "\.\.\/\.\.\/components\/UniversityPicker"/.test(edit) && /<UniversityPicker/.test(edit) && /universitiesApi\.setMine\(uni\.id\)/.test(edit), "profile edit uses the same picker and saves through /universities/mine");
  ok(!/const UNIVERSITIES = \[/.test(signup) && !/Aga Khan University — Karachi/.test(signup), "no hard-coded university list in the app any more");
  ok(/universityId: university\?\.id/.test(signup) && /if \(!university\?\.id\)/.test(signup), "signup sends the list's id and needs one");
  const shown = ["app/src/screens/ProfileScreen.js", "app/src/screens/ProfileDetailsScreen.js", "app/src/screens/Brands.js"].map(H.read).join("\n");
  ok((shown.match(/universityName/g) || []).length >= 3, "profile, details and brands fall back to the student's university name");
  m.unmount?.();
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
