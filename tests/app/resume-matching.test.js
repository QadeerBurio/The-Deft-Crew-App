// "Recommended for you" and "invites to apply" on the Resume dashboard (chore/career-remove-recommended-invites):
// the jobs list (Career) shows neither; the Resume dashboard shows both only when careerMatching is on for the student
// (recommendations from GET /jobs/recommendations/:resumeId, which the server answers with the skill-evidence matcher
// for those students) and hides both, without asking for recommendations, when it's off; an invite push with a job
// opens its JobDetails, one without a job opens the Resume dashboard scrolled to the invites.
//   node tests/app/resume-matching.test.js
const path = require("path");
const fs = require("fs");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  console.log("── the jobs list (Career): neither card");
  const career = H.read("app/src/components/Career.js");
  ok(!/RecommendedJobs|CareerInvites/.test(career), "Career.js neither imports nor renders 'recommended for you' or 'invites to apply'");
  ok(/ListHeaderComponent=\{\(\s*<View>\s*\{filteredData\.length > 0 && \(/.test(career), "the list header starts with the results line (right after the search and tabs)");
  ok(!fs.existsSync(path.join(H.SRC, "components/RecommendedJobs.js")), "RecommendedJobs.js is gone (nothing imported it any more)");
  ok(!/RecommendedJobs/.test(require("child_process").execSync("git grep -l RecommendedJobs -- app/src App.js || true", { cwd: H.APP }).toString()), "…and nothing in the app names it");
  ok(career.includes("useOpenFromParams('openJobId'"), "Career still opens a job from openJobId (pushes, invites, 'view job')");

  console.log("── the Resume dashboard");
  const { React, mount } = H.makeReact();
  const { rn } = H.makeRN({ Share: { share: async () => ({}) }, Linking: { openURL: async () => {} } });
  let matching = true;
  const recCalls = [];
  const resume = { _id: "r1", title: "My resume", personalInfo: { fullName: "Sana" }, atsScore: 70, atsKeywords: ["React"], updatedAt: new Date().toISOString() };
  const ResumeContext = { _default: {
    resumes: [resume], creationsUsed: 1, loading: false,
    fetchResumes: async () => [resume], loadResume: async () => resume, deleteResume: async () => {}, updateResume: async () => {},
    optimizeResume: async () => ({}), checkResumeFit: async () => ({}), duplicateResume: async () => {}, getRecommendedJobs: async () => [],
    getJobRecommendations: async (id, params) => { recCalls.push({ id, params }); return { recommendations: [{ _id: "j1", title: "React intern", companyName: "Bright Labs", matchPercentage: 100, matchedSkills: ["React"], matchReasons: ["React: in your resume"] }], engine: "skill-evidence-1" }; },
  } };
  const C = (name) => { const f = (props) => ({ type: name, props: { ...props, children: props.children } }); Object.defineProperty(f, "name", { value: name }); return f; };
  const mocks = {
    react: React, "react-native": rn,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    "@expo/vector-icons": { Ionicons: "Ionicons", MaterialCommunityIcons: "MCI" },
    "../../context/AuthContext": { AuthContext: { _default: { user: { _id: "u1", role: "student" }, isGuest: false } } },
    "../../guest/GuestGate": { useGuestGate: () => ({ requireAccount: () => true }) },
    "../../context/ResumeContext": { ResumeContext },
    "../../ui/FlatGradient": { LinearGradient: "LinearGradient" },
    "expo-print": { printToFileAsync: async () => ({ uri: "x" }) },
    "expo-file-system/legacy": { documentDirectory: "/d/", moveAsync: async () => {} },
    "expo-sharing": { shareAsync: async () => {}, isAvailableAsync: async () => true },
    "../../services/templateService": { renderResumeHTML: () => "<html></html>" },
    "@react-navigation/native": { useFocusEffect: (cb) => React.useEffect(() => cb(), []) }, // like a first focus
    "react-native-svg": { __esModule: true, default: "Svg", Circle: "Circle" },
    "../../hooks/useFlag": { __esModule: true, default: () => matching },
    "../../api/matchingApi": { matchingEnabled: async () => matching },
    "../../components/CareerInvites": { __esModule: true, default: C("CareerInvites") },
    "../../api/resumeStudioApi": { studioEnabled: async () => false },
  };
  const load = H.loader(mocks);
  const Dashboard = load(path.join(H.SRC, "screens/Resume/ResumeDashboard.js")).default;
  const settle = async (m) => { for (let i = 0; i < 6; i++) { await H.tick(); m.rerender(); } };
  const navigation = { navigate() {}, goBack() {}, addListener: () => () => {}, setOptions() {} };
  const byTest = (tree, id) => H.find(tree, (x) => x.props?.testID === id);

  matching = false;
  let m = mount(React.createElement(Dashboard, { navigation, route: { params: {} } }));
  await settle(m);
  let t = H.textOf(m.tree);
  ok(t.includes("resume completion") && t.includes("1 / 2 resumes used"), "the dashboard renders its resume", t.slice(0, 160));
  ok(!byTest(m.tree, "resume-recommended") && !t.includes("recommended for you") && !H.find(m.tree, (x) => x.type === "CareerInvites"), "careerMatching off: no 'recommended for you', no invites card");
  ok(recCalls.length === 0, "…and no recommendations request", JSON.stringify(recCalls));

  matching = true;
  m = mount(React.createElement(Dashboard, { navigation, route: { params: {} } }));
  await settle(m);
  t = H.textOf(m.tree);
  ok(!!byTest(m.tree, "resume-recommended") && t.includes("recommended for you") && t.includes("React intern") && t.includes("100% match"), "careerMatching on: 'recommended for you' with the matcher's jobs", t.slice(0, 300));
  ok(recCalls.some((c) => c.id === "r1"), "…asked for the selected resume (GET /jobs/recommendations/:resumeId: the skill-evidence matcher for these students)", JSON.stringify(recCalls));
  const inv = byTest(m.tree, "resume-invites");
  ok(inv && H.find(inv, (x) => x.type === "CareerInvites" && x.props.navigation === navigation), "…and 'invites to apply' (the switch + the invites) below the resumes");
  const scroll = H.find(m.tree, (x) => x.type === "ScrollView" && !x.props.horizontal);
  const kids = (n) => (Array.isArray(n) ? n.flat(Infinity) : [n]).filter(Boolean);
  const order = kids(scroll.props.children);
  ok(order.indexOf(inv) > 0 && order.indexOf(inv) === order.length - 2, "…the invites card is after the resume section, last before the spacer");

  // an invite push without a job: scrolled to the invites
  const scrolls = [];
  m = mount(React.createElement(Dashboard, { navigation, route: { params: { openInvites: true } } }));
  await settle(m);
  const sv = H.find(m.tree, (x) => x.type === "ScrollView" && !x.props.horizontal);
  if (sv.props.ref && typeof sv.props.ref === "object") sv.props.ref.current = { scrollTo: (o) => scrolls.push(o) };
  byTest(m.tree, "resume-invites").props.onLayout({ nativeEvent: { layout: { y: 900 } } });
  ok(scrolls.length === 1 && scrolls[0].y === 888, "openInvites: scrolls to the invites card", JSON.stringify(scrolls));

  const src = H.read("app/src/components/CareerInvites.js");
  ok(src.includes('navigation?.navigate?.("Career", { openJobId: inv.job.id })'), "the card's 'view job' still opens the job in Career (JobDetails)");

  console.log("── invite pushes");
  const { jobTarget } = load(path.join(H.SRC, "utils/jobRoutes.js"));
  const withJob = jobTarget("Career", { openJobId: "j9" }, { careerInviteId: "i1", screen: "Career", params: { openJobId: "j9" } });
  ok(withJob.route === "Career" && withJob.params.openJobId === "j9", "an invite push with a job (what the server sends): the job's JobDetails", JSON.stringify(withJob));
  const noJob = jobTarget("Career", {}, { careerInviteId: "i1", screen: "Career" });
  ok(noJob.route === "Resume" && noJob.params.screen === "ResumeDashboard" && noJob.params.params.openInvites === true, "an invite push without a job: the Resume dashboard, invites section", JSON.stringify(noJob));
  const routes = load(path.join(H.SRC, "navigation/routes.js"));
  ok(JSON.stringify(routes.pathTo(noJob.route, noJob.params)) === JSON.stringify(["Resume", { screen: "ResumeDashboard", params: { openInvites: true } }]), "…a path the push navigation can follow (root 'Resume' → ResumeDashboard)");
  const app = jobTarget("MyApplications", { applicationId: "a1" }, {});
  ok(app.route === "Career" && app.params.openApplications === true, "a job push about an application still opens 'my applications'", JSON.stringify(app));
  const jobPush = jobTarget("TDCCareers", {}, { jobId: "j2" });
  ok(jobPush.route === "Career" && jobPush.params.openJobId === "j2", "a job push still opens its JobDetails");

  console.log("── 'your match' on JobDetails unchanged");
  ok(/your match/.test(H.read("app/src/screens/Career/JobDetails.js")), "JobDetails still shows 'your match'");
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
