// Resume screens (fix/resume-screens, fix/resume-builder): the preview never blanks while saving and never spins
// forever, a failed counter never fails the PDF, one PDF at a time; the dashboard's file sheet always
// closes and recommendations load once per resume; Resume Studio's PDF / delete buttons run one at a
// time; every resume screen keeps its header inside the safe area on Android too.
//   node tests/app/resume-screens.test.js
const path = require("path");
const H = require("./harness");
const { ok, done } = H.counter();
global.__DEV__ = false;

(async () => {
  // the preview screen on iPhone and on Android (the PDF itself is made by utils/resumeFiles: tested in resume-pdf-save)
  for (const OS of ["ios", "android"]) {
    console.log(`── resume preview (${OS})`);
    const { React, mount, contexts } = H.makeReact();
    const alerts = [];
    const { rn } = H.makeRN({ Platform: { OS, select: (o) => o[OS] ?? o.default }, Alert: { alert: (title, text, buttons) => alerts.push({ title, text, buttons }) } });
    const state = { getFails: true, gate: null, makes: 0, saves: 0, shares: 0, opened: 0, puts: 0, saveResult: null };
    const ResumeContext = { _default: {} };
    const nav = { calls: [], goBack() {}, navigate: (...a) => nav.calls.push(a) };
    const load = H.loader({
      react: React, "react-native": rn,
      "@expo/vector-icons": { Ionicons: "Icon" },
      "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
      "@react-navigation/native": { useRoute: () => ({ params: { resumeId: "r9" } }), useNavigation: () => nav },
      "../../context/ResumeContext": { ResumeContext },
      "../../guest/GuestGate": { useGuestGate: () => ({ requireAccount: () => true, isGuest: false }) },
      "../../services/templateService": { TEMPLATES: [{ id: "modern_ats", name: "Modern" }, { id: "jakes", name: "Compact" }], canonicalTemplate: (x) => x || "modern_ats" },
      "../../api/resumeApi": { __esModule: true, default: { getResume: async () => { if (state.getFails) throw Object.assign(new Error("Network Error"), { request: {} }); return { success: true, data: { _id: "r9", template: "jakes", personalInfo: { firstName: "Sana", lastName: "Khan", title: "HR Intern" }, updatedAt: "1" } }; } } },
      "../../utils/resumeFiles": {
        makeResumePdf: async () => { state.makes++; if (state.gate) await state.gate.promise; return { uri: "file:///cache/Sana%20Khan%20Resume.pdf", name: "Sana Khan Resume.pdf", pages: 2 }; },
        saveResumePdf: async () => { state.saves++; return state.saveResult; },
        shareResumePdf: async () => { state.shares++; return { status: "shared" }; },
        openSavedPdf: async () => { state.opened++; return true; },
        nativePdfView: () => null, canSaveToFilesDialog: () => true, resumeHtml: () => "<html>same html</html>", resumeHtmlAsync: async () => "<html>same html</html>", // P3-6: the preview with fonts
      },
      "react-native-webview": { WebView: "WebView" },
      "../../ui/ScreenHeader": { __esModule: true, default: (p) => ({ type: "Header", props: { title: p.title, children: null } }) },
      "../../components/ResumeStrength": { __esModule: true, default: () => null },
    });
    contexts.set(ResumeContext, { resumes: [], loadResume: () => null, updateResume: async () => { state.puts++; throw new Error("counter down"); } });
    const View = load(path.join(H.SRC, "screens/Resume/ViewResume.js")).default;
    const m = mount(React.createElement(View));
    await H.tick(20);
    const text = () => H.textOf(m.tree);
    ok(/couldn't open this resume/.test(text()) && H.byLabel(m.tree, "try again"), "not fetched and not cached: a plain message with 'try again' (no endless spinner)");
    state.getFails = false;
    H.byLabel(m.tree, "try again").props.onPress();
    await H.tick(30);
    const header = H.find(m.tree, (n) => n.type === "Header");
    ok(header?.props.title === "Sana Khan – HR Intern", "the title is the resume's name ('<Full name> – <title>')", header?.props.title);
    ok(state.makes === 1, "the preview PDF is made once, right away", state.makes);
    ok(/2 pages/.test(text()) && /Compact · A4/.test(text()), "page count, template and A4 are shown", text());
    const viewer = H.find(m.tree, (n) => n.type === "WebView");
    if (OS === "ios") ok(viewer?.props.source?.uri === "file:///cache/Sana%20Khan%20Resume.pdf", "iPhone: the preview is the PDF file itself (pinch zoom in WKWebView)", JSON.stringify(viewer?.props.source));
    else ok(viewer?.props.source?.html === "<html>same html</html>" && viewer.props.setBuiltInZoomControls, "Android without the PDF module: the same HTML as the PDF, with zoom", JSON.stringify(viewer?.props));

    console.log("   edit goes back to any section");
    H.byLabel(m.tree, "edit experience").props.onPress();
    H.byLabel(m.tree, "edit template").props.onPress();
    ok(nav.calls.some((c) => c[0] === "ResumeBuilder" && c[1].step === 3 && c[1].resumeId === "r9") && nav.calls.some((c) => c[0] === "ResumeTemplate"), "edit chips open the builder at that section / the template picker", JSON.stringify(nav.calls));

    console.log("   save and share are separate; one at a time");
    const saveLabel = OS === "android" ? "Save to phone" : "Save to Files";
    ok(H.byLabel(m.tree, saveLabel) && H.byLabel(m.tree, "Share"), `two buttons: "${saveLabel}" and "Share"`);
    state.saveResult = OS === "android"
      ? { status: "saved", where: "Downloads", uri: "content://downloads/Sana%20Khan%20Resume.pdf", message: "Saved to Downloads" }
      : { status: "saved", where: "Files", uri: "file:///Files/Sana Khan Resume.pdf", message: "Saved to Files" };
    state.gate = null;
    H.byLabel(m.tree, saveLabel).props.onPress();
    H.byLabel(m.tree, "Share").props.onPress(); // while the save runs: ignored
    await H.tick(20);
    ok(state.saves === 1 && state.shares === 0, "save ran once; share pressed meanwhile did nothing", `${state.saves} ${state.shares}`);
    const savedAlert = alerts.find((a) => a.title === (OS === "android" ? "Saved to Downloads" : "Saved to Files"));
    ok(savedAlert && /Sana Khan Resume\.pdf/.test(savedAlert.text), "a clear 'Saved to …' with the file name", JSON.stringify(alerts));
    if (OS === "android") {
      const open = savedAlert?.buttons?.find((b) => b.text === "open");
      open && open.onPress();
      await H.tick(5);
      ok(open && state.opened === 1, "Android: 'open' opens the saved file");
    }
    H.byLabel(m.tree, "Share").props.onPress();
    await H.tick(20);
    ok(state.shares === 1 && state.saves === 1, "share is its own button (it doesn't save, save doesn't share)");
    ok(state.makes === 1, "save and share reuse the preview PDF (no second PDF for the same resume)", state.makes);

    console.log("   permission denied: a message, no crash");
    state.saveResult = { status: "denied", message: "not saved: pick a folder (like Downloads) and allow access to save your resume there. you can also use share." };
    const before = alerts.length;
    H.byLabel(m.tree, saveLabel).props.onPress();
    await H.tick(20);
    const denied = alerts.slice(before).find((a) => a.title === "not saved");
    ok(denied && /allow access/.test(denied.text), "denied: 'not saved' with what to do", JSON.stringify(alerts.slice(before)));
    ok(!H.find(m.tree, (n) => n.props?.accessibilityLabel === saveLabel)?.props.disabled, "the buttons work again");
    state.saveResult = { status: "cancelled", message: "" };
    const before2 = alerts.length;
    H.byLabel(m.tree, saveLabel).props.onPress();
    await H.tick(20);
    ok(alerts.length === before2, "cancelled: nothing shown");
    ok(state.puts >= 2 && !alerts.some((a) => /counter/.test(a.text || "")), "the download/share counters failed in the background and nothing was shown");
    m.unmount();
  }

  console.log("── source");
  const v = H.read("app/src/screens/Resume/ViewResume.js");
  ok(!/if \(loading \|\| !resume\)/.test(v) && /\}, \[resumeId, guestMode, attempt\]\);/.test(v), "view: no screen-wide loading flag; fetched once per resume (not on every list change)");
  ok(/withTimeout\(Print\.printToFileAsync\(\{ html, [^\n]*\), TIMEOUT\.PDF\)/.test(H.read("app/src/utils/resumeFiles.js")) && /makeResumePdf/.test(v), "view: the PDF (utils/resumeFiles) has the 120 s limit");
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
