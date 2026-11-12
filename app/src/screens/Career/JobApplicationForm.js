// app/src/screens/Career/JobApplicationForm.js
// Apply for one job (route "JobApplicationForm", params { jobId, job }; "ApplicationForm" is the scholarship form).
// The fields and checks the jobs list's apply form had: full name, email, phone and cover letter required, a resume
// required. The resume: a file (PDF / DOC / DOCX, 10 MB max) or, when Resume Studio is on and has an approved
// version tailored for this job, that version (sent with the application once the server has it). Jobs have no
// custom questions, so there are none to show.
// Keyboard-safe and scrollable; each error sits under its field. Submit is disabled while sending and can't send
// twice; back is held while sending.
//   success: the server confirmed → Meta SubmitApplication (once) → "application sent" → the jobs list, which marks
//            the job "Applied" (utils/careerNav.backToJobsList)
//   failure: stay, keep everything typed, show the error
import React, { useContext, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { ScreenHeader, Button, Input } from "../../ui";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import api from "../../api/api";
import { studioEnabled, studioApi } from "../../api/resumeStudioApi";
import { metaEvents } from "../../analytics/metaEvents";
import { AuthContext } from "../../context/AuthContext";
import { backToJobsList } from "../../utils/careerNav";
import { plainError } from "../../utils/plainError";

export const REQUIRED = { fullName: "Full name", email: "Email", phone: "Phone", coverLetter: "Cover letter" };
export const EMPTY_FORM = {
  fullName: "", email: "", phone: "", address: "", city: "", country: "",
  coverLetter: "", portfolioUrl: "", linkedInUrl: "", githubUrl: "",
  currentCompany: "", currentPosition: "", yearsOfExperience: "",
  expectedSalary: "", noticePeriod: "", workAuthorization: "Citizen",
};
const FILE_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_FILE = 10 * 1024 * 1024;

/** errors by field: the required fields, and a resume (a file, or the tailored version) */
export function validate(form, resume) {
  const errors = {};
  for (const [k, label] of Object.entries(REQUIRED)) if (!String(form[k] || "").trim()) errors[k] = `${label} is required`;
  if (!resume || (resume.kind === "file" && !resume.file) || (resume.kind === "tailored" && !resume.version)) errors.resume = "Choose a resume to send";
  return errors;
}

/** the multipart body the server's POST /jobs/apply/:jobId reads (the file only when one was chosen) */
export function buildBody(form, resume, makeFormData = () => new FormData()) {
  const body = makeFormData();
  for (const [k, v] of Object.entries(form)) body.append(k, typeof v === "string" ? v.trim() : v == null ? "" : String(v));
  if (resume?.kind === "file" && resume.file) body.append("resume", { uri: resume.file.uri, type: resume.file.mimeType || "application/octet-stream", name: resume.file.name });
  return body;
}

export default function JobApplicationForm({ navigation, route }) {
  const jobId = String(route?.params?.jobId || "");
  const job = route?.params?.job || {};
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext) || {};
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, fullName: user?.name || "", email: user?.email || "" }));
  const [errors, setErrors] = useState({});
  const [tailored, setTailored] = useState(null); // an approved Resume Studio version for this job
  const [resume, setResume] = useState({ kind: "file", file: null });
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [serverError, setServerError] = useState(null);
  const sendingRef = useRef(false); // no double submit, even before the re-render
  const doneRef = useRef(false);

  useEffect(() => {
    let live = true;
    studioEnabled()
      .then((on) => (on ? studioApi.versions() : []))
      .then((versions) => {
        const v = (versions || []).find((x) => x.target?.kind === "tdc_job" && String(x.target.jobId) === jobId);
        if (live && v) { setTailored(v); setResume({ kind: "tailored", version: v }); }
      })
      .catch(() => {});
    return () => { live = false; };
  }, [jobId]);

  // back (Android button, iOS swipe, header) waits while the application is being sent
  useEffect(() => navigation.addListener("beforeRemove", (e) => {
    if (sendingRef.current && !doneRef.current) e.preventDefault();
  }), [navigation]);

  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const pickFile = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: FILE_TYPES, copyToCacheDirectory: true });
      const file = r?.assets?.[0] || (r?.type === "success" ? r : null);
      if (!file) return;
      const ext = String(file.name || "").split(".").pop().toLowerCase();
      if (!["pdf", "doc", "docx"].includes(ext)) { setErrors((e) => ({ ...e, resume: "Only PDF, DOC or DOCX files" })); return; }
      if (file.size && file.size > MAX_FILE) { setErrors((e) => ({ ...e, resume: "The file is over 10 MB" })); return; }
      setResume({ kind: "file", file: { uri: file.uri, name: file.name, mimeType: file.mimeType || file.type, size: file.size } });
      setErrors((e) => { const n = { ...e }; delete n.resume; return n; });
    } catch {
      setErrors((e) => ({ ...e, resume: "Couldn't open that file. Try another one." }));
    }
  };

  const submit = async () => {
    if (sendingRef.current || doneRef.current) return;
    const found = validate(form, resume);
    setErrors(found);
    if (Object.keys(found).length) { setServerError("Fix the fields marked below."); return; }
    sendingRef.current = true;
    setSending(true); setServerError(null); setProgress(0);
    let applicationId = null;
    try {
      const res = await api.post(`/jobs/apply/${encodeURIComponent(jobId)}`, buildBody(form, resume), {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => e?.total && setProgress(Math.round((e.loaded * 100) / e.total)),
        timeout: 60000,
      });
      applicationId = res?.data?.application?._id || null;
    } catch (err) {
      sendingRef.current = false;
      setSending(false);
      setServerError(plainError(err, "Your application wasn't sent. Check your connection and try again."));
      return;
    }
    // the server has the application: count it once, then the tailored version (if chosen)
    doneRef.current = true;
    metaEvents.jobApplied(jobId);
    let note = "The employer will see it in their candidates list.";
    if (resume.kind === "tailored" && resume.version && applicationId) {
      try { await studioApi.attachVersion(applicationId, resume.version.id); note = "Your tailored resume went with it."; } catch (e) { note = `It was sent, but your tailored resume couldn't be attached: ${e?.message || "try again from Resume Studio"}.`; }
    }
    setSending(false);
    Alert.alert("Application sent", note);
    backToJobsList(navigation, jobId);
  };

  const field = (k, label, props = {}) => (
    <Input
      key={k}
      label={REQUIRED[k] ? `${label} *` : label}
      value={form[k]}
      onChangeText={set(k)}
      error={errors[k]}
      editable={!sending}
      style={styles.field}
      {...props}
    />
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="apply" />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
        <View style={styles.jobBox}>
          <Text style={styles.jobTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{job.title || "this job"}</Text>
          {!!(job.companyName || job.location) && <Text style={styles.jobMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>{[job.companyName, job.location].filter(Boolean).join(" · ")}</Text>}
        </View>
        <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>* required</Text>

        {field("fullName", "Full name", { autoComplete: "name", textContentType: "name" })}
        {field("email", "Email", { keyboardType: "email-address", autoCapitalize: "none", autoComplete: "email", textContentType: "emailAddress" })}
        {field("phone", "Phone", { keyboardType: "phone-pad", autoComplete: "tel", textContentType: "telephoneNumber" })}
        {field("address", "Address")}
        <View style={styles.row}>
          {field("city", "City", { style: [styles.field, styles.half] })}
          {field("country", "Country", { style: [styles.field, styles.half] })}
        </View>
        {field("currentCompany", "Current company")}
        {field("currentPosition", "Current position")}
        {field("yearsOfExperience", "Years of experience", { keyboardType: "numeric" })}
        {field("expectedSalary", "Expected salary")}
        {field("noticePeriod", "Notice period")}
        {field("coverLetter", "Cover letter", { multiline: true, numberOfLines: 5, placeholder: "Why are you a good fit for this role?" })}
        {field("linkedInUrl", "LinkedIn URL", { autoCapitalize: "none", keyboardType: "url" })}

        <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>Resume *</Text>
        {tailored && (
          <TouchableOpacity
            style={[styles.choice, resume.kind === "tailored" && styles.choiceOn]}
            onPress={() => { setResume({ kind: "tailored", version: tailored }); setErrors((e) => { const n = { ...e }; delete n.resume; return n; }); }}
            disabled={sending}
            accessibilityRole="radio"
            accessibilityState={{ checked: resume.kind === "tailored", disabled: sending }}
            accessibilityLabel={`send my tailored resume ${tailored.label || ""}`}
          >
            <Ionicons name={resume.kind === "tailored" ? "radio-button-on" : "radio-button-off"} size={20} color={T.ink} />
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>my tailored resume (Resume Studio)</Text>
              <Text style={styles.choiceSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>{tailored.label || job.title}: the employer sees exactly this version</Text>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.choice, resume.kind === "file" && styles.choiceOn, errors.resume && styles.choiceError]}
          onPress={() => (resume.kind === "file" ? pickFile() : setResume({ kind: "file", file: null }))}
          disabled={sending}
          accessibilityRole={tailored ? "radio" : "button"}
          accessibilityState={tailored ? { checked: resume.kind === "file", disabled: sending } : { disabled: sending }}
          accessibilityLabel={resume.kind === "file" && resume.file ? `resume file ${resume.file.name}, tap to change` : "upload a resume file, PDF, DOC or DOCX"}
        >
          <Ionicons name={tailored ? (resume.kind === "file" ? "radio-button-on" : "radio-button-off") : "document-attach-outline"} size={20} color={T.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.choiceTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{resume.kind === "file" && resume.file ? resume.file.name : "upload a file"}</Text>
            <Text style={styles.choiceSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>{resume.kind === "file" && resume.file?.size ? `${(resume.file.size / 1024).toFixed(0)} KB · tap to change` : "PDF, DOC or DOCX, up to 10 MB"}</Text>
          </View>
          {resume.kind === "file" && resume.file ? (
            <TouchableOpacity onPress={() => setResume({ kind: "file", file: null })} disabled={sending} accessibilityRole="button" accessibilityLabel="remove the file" hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={T.danger} />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
        {!!errors.resume && <Text style={styles.error} maxFontSizeMultiplier={MAX_FONT_SCALE}>{errors.resume}</Text>}

        {!!serverError && (
          <View style={styles.serverError} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={18} color={T.danger} />
            <Text style={styles.serverErrorText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{serverError}</Text>
          </View>
        )}
        {sending && progress > 0 && progress < 100 && (
          <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>uploading {progress}%</Text>
        )}
        <Button
          title="send application"
          accessibilityLabel={sending ? "sending your application" : "send application"}
          onPress={submit}
          disabled={sending}
          loading={sending}
          icon={<Ionicons name="paper-plane-outline" size={17} color={T.white} />}
          style={{ marginTop: 18 }}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.paper },
  jobBox: { backgroundColor: T.card, borderRadius: 18, borderWidth: 1, borderColor: T.line, padding: 14 },
  jobTitle: { fontFamily: F.headingBold, fontSize: 17, color: T.ink },
  jobMeta: { fontFamily: F.body, fontSize: 13.5, color: T.textMuted, marginTop: 2 },
  note: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 10 },
  field: { marginTop: 14 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  label: { fontFamily: F.bodySemi, fontSize: 13, color: T.textMuted, marginTop: 18, marginBottom: 6 },
  choice: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 14, marginBottom: 8 },
  choiceOn: { borderColor: T.ink, borderWidth: 1.5 },
  choiceError: { borderColor: T.danger, borderWidth: 1.5 },
  choiceTitle: { fontFamily: F.bodySemi, fontSize: 14.5, color: T.ink },
  choiceSub: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  error: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.danger, marginTop: 2 },
  serverError: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: T.dangerBg, borderRadius: 14, padding: 12, marginTop: 16 },
  serverErrorText: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.danger, flexShrink: 1 },
});
