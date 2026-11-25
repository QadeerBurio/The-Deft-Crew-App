// Q-3a (flag nativeStackDrawer, off by default): the home stack (65 screens) can run on the native stack.
//   chosen once per app start (useState initialiser) from the flags known then; unknown or off → the JS stack with
//   exactly its old options (no header, paper background, the fade); the native options match them (no header, paper,
//   fade, swipe back on); the same <HS.Screen> list under either; the other stacks are unchanged (JS stack)
//   @react-navigation/native-stack is an explicit dependency (approved in Q-3a), at the version already installed
//   node tests/app/qd-navigation.test.js
const H = require("./harness");
const { ok, done } = H.counter();

const d = H.read("app/src/navigation/DrawerNavigator.js").replace(/\r\n/g, "\n");
const pkg = JSON.parse(H.read("package.json"));
const span = d.slice(d.indexOf("function HomeStackNavigator() {"), d.indexOf("export default function DrawerNavigator()"));

ok(/^\^?7\.19\.0$/.test(pkg.dependencies["@react-navigation/native-stack"] || ""), "native-stack is an explicit dependency (7.19.0, the version already installed through expo-router)", pkg.dependencies["@react-navigation/native-stack"]);
ok(/import \{ createNativeStackNavigator \} from '@react-navigation\/native-stack';/.test(d) && /const NativeStack = createNativeStackNavigator\(\);/.test(d), "the drawer file creates a native stack");
ok(/const \[native\] = useState\(\(\) => knownFlag\('nativeStackDrawer'\) === true\);\n\s*const HS = native \? NativeStack : Stack;/.test(span), "home stack: native only when the flag is known to be on at start (chosen once: a useState initialiser)");
ok(/screenOptions=\{native \? NATIVE_HOME_OPTIONS : \{\n\s*headerShown: false,\n\s*cardStyle: \{ backgroundColor: T\.paper \},\n\s*cardStyleInterpolator: \(\{ current: \{ progress \} \}\) => \(\{\n\s*cardStyle: \{ opacity: progress \},\n\s*\}\),\n\s*\}\}/.test(span), "flag off: the JS stack's options exactly as before (no header, paper, the fade)");
ok(/const NATIVE_HOME_OPTIONS = \{ headerShown: false, contentStyle: \{ backgroundColor: T\.paper \}, animation: 'fade', gestureEnabled: true \};/.test(d), "native options match: no header, paper background, fade, swipe back on");
const hs = (span.match(/<HS\.Screen/g) || []).length;
ok(hs === 65 && !/<Stack\.Screen/.test(span) && /<HS\.Navigator/.test(span) && /<\/HS\.Navigator>/.test(span), `all ${hs} home-stack screens render under the chosen stack`);
const rest = d.slice(0, d.indexOf("function HomeStackNavigator() {")) + d.slice(d.indexOf("export default function DrawerNavigator()"));
ok((rest.match(/<Stack\.Screen/g) || []).length === 44 && !/<HS\./.test(rest), "the SkillShare and social stacks are unchanged (JS stack, 44 screens): one stack per release (plan Q-3a)");
done();
