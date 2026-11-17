// app/src/screens/Resume/ViewResume.js — the full-screen preview of the exact PDF, then save / share.
// The PDF is made once from the same HTML as everywhere else (utils/resumeFiles -> templateService) and shown:
//   build with react-native-pdf + blob-util (1.2.1+): the PDF itself, pinch zoom, page count
//   iPhone without it: the PDF file in the WebView (WKWebView shows PDFs natively, pinch zoom)
//   Android without it: the same HTML in the WebView with zoom, page count from expo-print
// "edit" goes back to any builder section; "Save to phone" (Android) / "Save to Files" (iPhone) and "Share"
// are separate buttons. One PDF job at a time; the view/download/share counters never block anything.
import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { ResumeContext } from '../../context/ResumeContext';
import { useGuestGate } from '../../guest/GuestGate';
import resumeApi from '../../api/resumeApi';
import ScreenHeader from '../../ui/ScreenHeader';
import ResumeStrength from '../../components/ResumeStrength';
import useAction from '../../hooks/useAction';
import { resumeName } from '../../utils/resumeRules';
import { TEMPLATES, canonicalTemplate } from '../../services/templateService';
import { makeResumePdf, saveResumePdf, shareResumePdf, openSavedPdf, nativePdfView, canSaveToFilesDialog, resumeHtml } from '../../utils/resumeFiles';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../../theme/tokens';

export const EDIT_TARGETS = [
  { label: 'contact', step: 1 }, { label: 'education', step: 2 }, { label: 'experience', step: 3 }, { label: 'projects', step: 4 },
  { label: 'certificates', step: 5 }, { label: 'summary', step: 6 }, { label: 'skills', step: 7 }, { label: 'template', screen: 'ResumeTemplate' },
];

const ResumeViewScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { resumeId } = route.params || {};
  const { requireAccount, isGuest: guestMode } = useGuestGate();
  const { resumes, loadResume, updateResume } = useContext(ResumeContext);
  const [resume, setResume] = useState(null);
  // 'loading' | 'ready' | 'error' (never an endless spinner)
  const [loadState, setLoadState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [pdf, setPdf] = useState(null); // { uri, name, pages, key }
  const [pages, setPages] = useState(null);
  const PdfView = useRef(nativePdfView()).current;

  useEffect(() => {
    let isMounted = true;
    const fetchFresh = async () => {
      setLoadState('loading');
      let found = null;
      if (resumeId) {
        // guest resumes live on the device only: no server call for them
        if (!guestMode) {
          try {
            const res = await resumeApi.getResume(resumeId, true);
            if (res?.success && res?.data) found = res.data;
          } catch (err) {
            console.warn('[resume view] fresh copy not loaded, using the saved list:', err?.message);
          }
        }
        if (!found) found = loadResume(resumeId) || (Array.isArray(resumes) ? resumes.find((r) => r._id === resumeId) : null);
      } else if (resumes && resumes.length > 0) {
        found = resumes[0];
      }
      if (!isMounted) return;
      if (found) { setResume(found); setLoadState('ready'); }
      else setLoadState('error');
    };
    fetchFresh();
    return () => { isMounted = false; };
  }, [resumeId, guestMode, attempt]);

  // an edit saved elsewhere (builder, templates, offline copy) shows here without another request
  useEffect(() => {
    if (!resume?._id || !Array.isArray(resumes)) return;
    const fresh = resumes.find((r) => r._id === resume._id);
    if (fresh && fresh !== resume && fresh.updatedAt && fresh.updatedAt !== resume.updatedAt) setResume(fresh);
  }, [resumes]);

  // a background counter: never blocks or fails the PDF
  const bump = (field) => {
    if (!resume?._id || guestMode) return;
    updateResume(resume._id, { [field]: (resume[field] || 0) + 1 }).catch((e) => console.warn('[resume view] counter not saved:', e?.message));
  };

  const pdfKey = resume ? `${resume._id}|${resume.updatedAt || ''}|${canonicalTemplate(resume.template)}` : '';
  // the PDF for what is on screen (made again only when the resume or its template changed)
  const ensurePdf = async () => {
    if (pdf && pdf.key === pdfKey) return pdf;
    const made = { ...(await makeResumePdf(resume)), key: pdfKey };
    setPdf(made);
    if (made.pages) setPages(made.pages);
    return made;
  };

  // one job at a time: making the preview PDF, saving, sharing
  const job = useAction(async (_c, mode) => {
    const file = await ensurePdf();
    if (mode === 'preview') return;
    if (mode === 'share') {
      const r = await shareResumePdf(file);
      if (r.status === 'shared') bump('shareCount');
      else if (r.message) Alert.alert('not shared', r.message);
      return;
    }
    const r = await saveResumePdf(file);
    if (r.status === 'saved') {
      bump('downloadCount');
      const buttons = Platform.OS === 'android' && r.uri ? [{ text: 'ok', style: 'cancel' }, { text: 'open', onPress: () => { openSavedPdf(r.uri).then((ok) => { if (!ok) Alert.alert("couldn't open it", 'open it from your Files or Downloads app.'); }); } }] : [{ text: 'ok' }];
      Alert.alert(r.message, `${file.name}`, buttons);
    } else if (r.status === 'shared') {
      bump('downloadCount');
    } else if (r.status === 'denied') {
      Alert.alert('not saved', r.message);
    }
  }, { errorTitle: "couldn't make the pdf", fallback: 'please try again.' });
  const busy = job.running;

  // make the preview PDF as soon as the resume is here (and again after an edit or a template change)
  useEffect(() => {
    if (loadState === 'ready' && resume && (!pdf || pdf.key !== pdfKey)) {
      ensurePdf().catch((e) => console.warn('[resume view] preview pdf not made:', e?.message));
    }
  }, [loadState, pdfKey]);

  const handleSave = () => { if (requireAccount()) job.run('save'); };
  const handleShare = () => { if (requireAccount()) job.run('share'); };
  const goEdit = (t) => (t.screen ? navigation.navigate(t.screen, { resumeId: resume._id }) : navigation.navigate('ResumeBuilder', { resumeId: resume._id, step: t.step }));

  if (loadState === 'error' && !resume) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={T.ink} />
        <ScreenHeader dark title="preview" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.centerText} accessibilityRole="alert">couldn't open this resume. please check your connection.</Text>
          <TouchableOpacity onPress={() => setAttempt((n) => n + 1)} style={[styles.btn, styles.btnPrimary, { marginTop: 16, paddingHorizontal: 18 }]} accessibilityRole="button" accessibilityLabel="try again">
            <Text style={styles.btnPrimaryText}>try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!resume) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={T.ink} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.yellow} />
          <Text style={styles.centerText}>loading resume...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tpl = TEMPLATES.find((x) => x.id === canonicalTemplate(resume.template)) || TEMPLATES[0];
  const ready = pdf && pdf.key === pdfKey;
  const saveLabel = Platform.OS === 'android' ? 'Save to phone' : 'Save to Files';
  const pageText = pages ? `${pages} page${pages === 1 ? '' : 's'}` : ready ? '' : 'making pdf…';

  let viewer;
  if (PdfView && ready) {
    viewer = (
      <PdfView
        source={{ uri: pdf.uri }}
        style={styles.viewer}
        onLoadComplete={(n) => setPages(n)}
        enablePaging={false}
        minScale={1}
        maxScale={4}
        trustAllCerts={false}
        onError={(e) => console.warn('[resume view] pdf view:', e?.message || e)}
      />
    );
  } else if (Platform.OS === 'ios' && ready) {
    viewer = <WebView testID="pdf-file" originWhitelist={['*']} source={{ uri: pdf.uri }} allowingReadAccessToURL={pdf.uri} style={styles.viewer} />;
  } else {
    viewer = (
      <WebView
        testID="pdf-html"
        originWhitelist={['*']}
        source={{ html: resumeHtml(resume) }}
        style={styles.viewer}
        scalesPageToFit
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        startInLoadingState
        renderLoading={() => <View style={styles.center}><ActivityIndicator size="large" color={T.yellow} /></View>}
        onShouldStartLoadWithRequest={(req) => !/^(https?:|mailto:|tel:)/.test(req.url)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={T.ink} />
      <ScreenHeader dark title={resumeName(resume)} onBack={() => navigation.goBack()} />

      <View style={styles.meta}>
        <ResumeStrength resume={resume} compact dark style={{ flex: 1 }} onGoTo={(step) => navigation.navigate('ResumeBuilder', { resumeId: resume._id, step })} />
        <View style={styles.metaRight}>
          <Text style={styles.metaText} maxFontSizeMultiplier={M} testID="page-count">{pageText}</Text>
          <Text style={styles.metaSub} maxFontSizeMultiplier={M}>{tpl.name} · A4</Text>
        </View>
      </View>
      {pages > 2 ? <Text style={styles.tip} maxFontSizeMultiplier={M}>tip: employers prefer 1–2 pages. try the Compact template.</Text> : null}

      <View style={styles.viewerWrap}>{viewer}</View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.edits} style={styles.editsBar}>
        <Text style={styles.editsLabel} maxFontSizeMultiplier={M}>edit</Text>
        {EDIT_TARGETS.map((t) => (
          <TouchableOpacity key={t.label} onPress={() => goEdit(t)} style={styles.chip} accessibilityRole="button" accessibilityLabel={`edit ${t.label}`}>
            <Text style={styles.chipText} maxFontSizeMultiplier={M}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSave} disabled={busy} accessibilityRole="button" accessibilityLabel={saveLabel} accessibilityState={{ busy, disabled: busy }}>
          {busy ? <ActivityIndicator color={T.ink} /> : <Ionicons name="download-outline" size={18} color={T.ink} />}
          <Text style={styles.btnPrimaryText} maxFontSizeMultiplier={M}>{saveLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleShare} disabled={busy} accessibilityRole="button" accessibilityLabel="Share" accessibilityState={{ busy, disabled: busy }}>
          <Ionicons name="share-social-outline" size={18} color={T.white} />
          <Text style={styles.btnGhostText} maxFontSizeMultiplier={M}>Share</Text>
        </TouchableOpacity>
      </View>
      {Platform.OS === 'ios' && !canSaveToFilesDialog() ? (
        <Text style={styles.hint} maxFontSizeMultiplier={M}>Save to Files opens the share list: pick "Save to Files".</Text>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: T.ink },
  centerText: { color: T.white, marginTop: 10, fontSize: 14, fontFamily: F.body, textAlign: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  metaRight: { alignItems: 'flex-end', minWidth: 86 },
  metaText: { color: T.white, fontFamily: F.bodyBold, fontSize: 14 },
  metaSub: { color: T.onInkMuted, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  tip: { color: T.yellow, fontFamily: F.body, fontSize: 12, paddingHorizontal: 16, paddingBottom: 6 },
  viewerWrap: { flex: 1, backgroundColor: '#525659' },
  viewer: { flex: 1, backgroundColor: '#525659' },
  editsBar: { flexGrow: 0, borderTopWidth: 1, borderTopColor: T.inkLine },
  edits: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  editsLabel: { color: T.onInkMuted, fontFamily: F.bodySemi, fontSize: 12, marginRight: 2 },
  chip: { borderWidth: 1, borderColor: T.inkLine, borderRadius: 999, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  chipText: { color: T.white, fontFamily: F.bodySemi, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, minHeight: 50 },
  btnPrimary: { flex: 1.4, backgroundColor: T.yellow },
  btnPrimaryText: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  btnGhost: { flex: 1, borderWidth: 1, borderColor: T.inkLine },
  btnGhostText: { fontFamily: F.bodyBold, fontSize: 15, color: T.white },
  hint: { color: T.onInkMuted, fontFamily: F.body, fontSize: 11.5, textAlign: 'center', paddingBottom: 8, paddingHorizontal: 16 },
});

export default ResumeViewScreen;
