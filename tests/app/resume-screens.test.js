// Resume screens (fix/resume-screens): the resume view never blanks while sharing and never spins
// forever, a failed counter never fails the PDF, one PDF at a time; the dashboard's file sheet always
// closes and recommendations load once per resume; Resume Studio's PDF / delete buttons run one at a
// time; every resume screen keeps its header inside the safe area on Android too.
//   node tests/app/resume-screens.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  console.log("── resume view (behaviour)");
  {
    const { React, mount, contexts } = H.makeReact();
    const alerts = [];
    const { rn } = H.makeRN({ Alert: { alert: (title, text) => alerts.push({ title, text }) }, Share: { share: async () => ({}) } });
    const state = { getFails: true, printGate: null, prints: 0, shares: 0, counterFails: true, puts: 0 };
    const ResumeContext = { _default: {} };
    const AuthContext = { _default: {} };
    const load = H.loader({
      react: React, "react-native": rn,
      "@expo/vector-icons": { Ionicons: "Icon" },
      "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
      "@react-navigation/native": { useRoute: () => ({ params: { resumeId: "r9" } }), useNavigation: () => ({ goBack() {}, navigate() {} }) },
      "../../context/ResumeContext": { ResumeContext },
      "../../context/AuthContext": { AuthContext },
      "../../guest/GuestGate": { useGuestGate: () => ({ requireAccount: () => true, isGuest: false }) },
      "../../services/templateService": { renderResumeHTML: () => "<html></html>" },
      "../../api/resumeApi": { __esModule: true, default: { getResume: async () => { if (state.getFails) throw Object.assign(new Error("Network Error"), { request: {} }); return { success: true, data: { _id: "r9", personalInfo: { firstName: "Sana", lastName: "Khan" }, updatedAt: "1" } }; } } },
      "expo-print": { printToFileAsync: async () => { state.prints++; if (state.printGate) await state.printGate.promise; return { uri: "file:///tmp/x.pdf" }; } },
      "expo-sharing": { isAvailableAsync: async () => true, shareAsync: async () => { state.shares++; } },
      "expo-file-system/legacy": { cacheDirectory: "file:///cache/", copyAsync: async () => {} },
      "react-native-webview": { WebView: "WebView" },
      "../../ui/ScreenHeader": { __esModule: true, default: (p) => ({ type: "Header", props: { children: p.right || null } }) },
      "../../ui/FlatGradient": { LinearGradient: "View" },
    });
    contexts.set(AuthContext, { user: {} });
    contexts.set(ResumeContext, { resumes: [], currentResume: null, loadResume: () => null, updateResume: async () => { state.puts++; if (state.counterFails) throw new Error("x"); return {}; } });
    const View = load(path.join(H.SRC, "screens/Resume/ViewResume.js")).default;
    const m = mount(React.createElement(View));
    await H.tick(20);
    const text = () => H.textOf(m.tree);
    ok(/couldn't open this resume/.test(text()) && H.byLabel(m.tree, "try again"), "not fetched and not cached: a plain message with 'try again' (no endless spinner)");
    state.getFails = false;
    H.byLabel(m.tree, "try again").props.onPress();
    await H.tick(20);
    ok(H.find(m.tree, (n) => n.type === "WebView"), "try again: the resume opens");

    state.printGate = H.gate();
    H.byLabel(m.tree, "share pdf").props.onPress();
    await H.tick(5);
    ok(H.find(m.tree, (n) => n.type === "WebView") && !/loading resume/.test(text()), "while the PDF is made the resume stays on screen (no blank 'loading resume')");
    const toolbarShare = H.find(m.tree, (n) => n.type === "TouchableOpacity" && /share pdf/.test(H.textOf(n)) && n.props.accessibilityLabel !== "share pdf");
    ok(toolbarShare?.props.disabled === true, "the other PDF buttons wait (one share sheet at a time)");
    toolbarShare.props.onPress();
    await H.tick(5);
    ok(state.prints === 1, "a second tap meanwhile makes no second PDF", state.prints);
    state.printGate.resolve(); state.printGate = null;
    await H.tick(20);
    ok(state.shares === 1 && state.puts === 1 && alerts.length === 0, "the PDF is shared; the share counter failed in the background and nothing was shown", JSON.stringify(alerts));
    ok(toolbarShare && !H.find(m.tree, (n) => n.type === "TouchableOpacity" && /share pdf/.test(H.textOf(n)) && n.props.accessibilityLabel !== "share pdf").props.disabled, "the buttons work again");
  }

  console.log("── source");
  const v = H.read("app/src/screens/Resume/ViewResume.js");
  ok(!/if \(loading \|\| !resume\)/.test(v) && /\}, \[resumeId, guestMode, attempt\]\);/.test(v), "view: no screen-wide loading flag; fetched once per resume (not on every list change)");
  ok(/withTimeout\(Print\.printToFileAsync\(\{ html \}\), TIMEOUT\.PDF/.test(v), "view: PDF generation has the 120 s limit");
  const d = H.read("app/src/screens/Resume/ResumeDashboard.js");
  ok(!/setTimeout\(\(\) => \{\s*setDownloadModalVisible\(false\)/.test(d) && !/setDownloading\(/.test(d), "dashboard: no timed resets of the file sheet (no state after leaving)");
  ok(/const exporter = useAction\([\s\S]{0,200}finally \{\s*setDownloadModalVisible\(false\);/.test(d), "dashboard: the file sheet always closes (finally), errors shown once");
  ok(/\}, \[selectedResume\?\._id\]\);/.test(d) && !/loadResume\(firstResume\._id\);\n\s*fetchRecommendations/.test(d), "dashboard: recommendations once per selected resume, not on every save");
  ok(/\}, \[\]\)\r?\n  \);/.test(d) && !/\[safeResumes\.length\]/.test(d), "dashboard: refresh on focus only (not again whenever the count changes)");
  ok(!/await updateResume\(resume\._id, \{ (download|share)Count/.test(d) && /const bump = /.test(d), "dashboard: counters never block or fail a download");
  ok(/if \(deletingRef\.current\) return;/.test(d), "dashboard: delete runs once per tap");
  const s = H.read("app/src/screens/Resume/ResumeStudio.js");
  ok((s.match(/pdfAction\.run\(\(\) => openPdf\(/g) || []).length === 4 && !/openPdf\([^;]*\)\.catch\(/.test(s), "studio: every PDF goes through one action (one at a time, errors shown once)");
  ok(/removeAction\.run\(\(\) => studioApi\.deleteVersion/.test(s) && /removeAction\.run\(\(\) => studioApi\.deleteDraft/.test(s), "studio: deletes one at a time");
  ok((s.match(/disabled=\{pdfAction\.running\}/g) || []).length === 2 && (s.match(/disabled=\{busy \|\| pdfAction\.running\}/g) || []).length === 2 && (s.match(/disabled=\{removeAction\.running\}/g) || []).length === 2, "studio: download / preview / delete buttons are disabled while theirs runs");
  for (const f of ["ResumeAnalytics", "ResumeBuilder", "ResumeSetting", "ResumeShare", "ResumeTemplate", "ViewResume"]) {
    const src = H.read(`app/src/screens/Resume/${f}.js`);
    const rnImport = (src.match(/import \{([^}]*)\} from 'react-native';/) || [])[1] || "";
    ok(!/\bSafeAreaView\b/.test(rnImport) && /import \{ SafeAreaView \} from 'react-native-safe-area-context';/.test(src), `${f}: SafeAreaView from react-native-safe-area-context (header below the status bar on Android too)`);
  }
  done();
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
