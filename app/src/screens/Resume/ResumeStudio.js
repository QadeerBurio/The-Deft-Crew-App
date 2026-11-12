// ResumeStudio.js: AI Resume Studio (FLAG_RESUME_STUDIO_V2). Tailor one of your resumes for a TDC job or
// a pasted job description, review every change, approve a version, send it with your application.
//   A start: pick a resume and a job (a parsed upload is checked and confirmed first)
//   B tailoring: the request runs on the server; this screen polls it
//   C review: each change with the reason and the resume facts behind it; "not in your resume" changes
//     need "this is true", blocked ones can only be rejected; the coaching panel says what matches, what's
//     missing and what we can't tell (no scores, no hiring predictions)
//   D preview: the ATS Classic PDF, marked DRAFT
//   E approve: two confirmations; the approved version never changes afterwards
//   F send: attach the version to your application for that job (the employer sees exactly this one)
//   G versions: your approved versions, export as PDF, delete one you never sent
// Route params: { jobId, jobTitle } from a job's details, { view: "versions" }, or nothing.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Switch, ActivityIndicator, Alert, StyleSheet } from "react-native";
// the focused field scrolls above the keyboard (KeyboardProvider is at the app root)
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../ui";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import resumeApi from "../../api/resumeApi";
import { studioEnabled, studioApi, newKey, waitForTailoring, saveDecisions, flushPending, rememberDraft, lastDraft, openPdf } from "../../api/resumeStudioApi";

const M = MAX_FONT_SCALE;
const fieldLabel = (p) => {
  if (p === "professionalSummary.summary") return "summary";
  if (p === "order.skills") return "order of your skills";
  if (p === "order.projects") return "order of your projects";
  let m = /^workExperience\[(\d+)\]\.achievements\[(\d+)\]$/.exec(p);
  if (m) return `experience ${+m[1] + 1} · point ${+m[2] + 1}`;
  m = /^order\.workExperience\[(\d+)\]\.achievements$/.exec(p);
  if (m) return `experience ${+m[1] + 1} · order of points`;
  m = /^(workExperience|projects|education)\[(\d+)\]\.description$/.exec(p);
  if (m) return `${{ workExperience: "experience", projects: "project", education: "education" }[m[1]]} ${+m[2] + 1}`;
  return p;
};
const FLAG_TEXT = {
  new_number: "a number that isn't in your resume", new_date: "a date that isn't in your resume", new_skill: "a skill that isn't in your resume",
  new_name: "a name that isn't in your resume", new_link: "a link that isn't in your resume", new_email: "an e-mail that isn't in your resume",
  new_claim: "a claim your resume doesn't make", much_longer: "much longer than your original", no_evidence: "no fact from your resume backs it",
  original_mismatch: "your resume changed since", not_a_reorder: "it would add or drop items", unknown_field: "a field that can't be tailored", empties_field: "it would empty the field",
};
const flagsText = (flags = []) => flags.map((f) => `${FLAG_TEXT[f.flag] || f.flag}${f.values?.length ? `: ${f.values.join(", ")}` : ""}`).join("; ");
const STATUS = {
  ok: { label: "from your resume", tone: T.successBg },
  needs_user_confirmation: { label: "not in your resume", tone: T.yellowSoft },
  blocked: { label: "can't be used", tone: T.dangerBg },
};
const orderText = (s, draft) => {
  try {
    const list = s.fieldPath === "order.skills" ? draft.facts.filter((f) => f.type === "skill").map((f) => f.value) : null; // skill facts keep the resume's order
    const order = JSON.parse(s.proposed);
    return list ? order.map((i) => list[i]).join(", ") : `new order: ${order.map((i) => i + 1).join(", ")}`;
  } catch { return s.proposed; }
};

// before exporting: if the server can't put Urdu in the PDF right now, say so and let the student choose
const urduWarning = (pdf) => (pdf?.urdu === "not_included" ? pdf.message || "Urdu text can't be included in this PDF right now." : null);
function confirmExport(pdf, go) {
  const w = urduWarning(pdf);
  if (!w) return go();
  Alert.alert("urdu won't be in this pdf", w, [{ text: "not now", style: "cancel" }, { text: "export without urdu", onPress: go }]);
}

export default function ResumeStudio({ route, navigation }) {
  const params = route?.params || {};
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(null);
  const [step, setStep] = useState(params.view === "versions" ? "versions" : "start");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // A
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState(null);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [source, setSource] = useState(null); // unverified upload to check
  const tapKey = useRef(newKey());
  // B / C
  const [progress, setProgress] = useState("");
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(null); // { suggestionId, text, confirmTrue }
  const [trueFor, setTrueFor] = useState({}); // suggestionId -> "this is true" switch
  const [queued, setQueued] = useState(false);
  const cancelled = useRef({ cancelled: false });
  // E / F / G
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [label, setLabel] = useState("");
  const [version, setVersion] = useState(null);
  const [application, setApplication] = useState(undefined); // undefined: not looked up, null: none
  const [attached, setAttached] = useState(null);
  const [versions, setVersions] = useState(null);

  const jobId = params.jobId || null;
  const jobTitle = params.jobTitle || "";

  const loadVersions = useCallback(() => studioApi.versions().then(setVersions).catch((e) => { setVersions([]); setMessage(e.message); }), []);
  const showDraft = (d) => {
    setDraft(d);
    setLabel(d.target?.title ? `${d.target.title}` : "");
    setStep(d.status === "approved" ? "approved" : "review");
  };

  useEffect(() => {
    let live = true;
    (async () => {
      const on = await studioEnabled();
      if (!live) return;
      setEnabled(on);
      if (!on) return;
      if (params.view === "versions") return loadVersions();
      const r = await resumeApi.getResumes(true).catch(() => null);
      const list = Array.isArray(r?.data) ? r.data : [];
      if (!live) return;
      setResumes(list);
      setResumeId(params.resumeId || list.find((x) => x.isPrimary)?._id || list[0]?._id || null);
      if (!params.jobId && !params.fresh) {
        // reopen the draft the student was working on (decisions kept offline are sent first)
        const id = await lastDraft();
        if (id && live) {
          try {
            const { draft: d, dropped } = await flushPending(id);
            if (d && d.status === "open" && live) { showDraft(d); if (dropped) setMessage("this draft changed on another device; we reloaded it."); }
          } catch {}
        }
      }
    })();
    return () => { live = false; cancelled.current.cancelled = true; };
  }, []);

  // ---------- A + B ----------
  const startTailoring = async () => {
    if (!resumeId) return Alert.alert("choose a resume", "pick the resume to tailor first.");
    if (!jobId && pasteText.trim().length < 80) return Alert.alert("paste the job description", "paste the full job description (at least a few sentences).");
    setBusy(true); setMessage("");
    try {
      const body = jobId ? { resumeId, jobId } : { resumeId, jobTitle: pasteTitle.trim(), jobDescription: pasteText };
      const job = await studioApi.startTailoring(body, tapKey.current);
      setStep("working"); setProgress("queued");
      cancelled.current = { cancelled: false };
      const done = await waitForTailoring(job.id, { onTick: setProgress, signal: cancelled.current });
      if (!done) return;
      tapKey.current = newKey();
      if (done.status !== "succeeded") {
        setStep("start");
        setMessage(done.errorCode === "TIMED_OUT" ? "this took too long. please try again." : "we couldn't tailor it this time. your resume is unchanged; try again.");
        return;
      }
      const d = await studioApi.draft(done.draftId);
      rememberDraft(d.id);
      showDraft(d);
    } catch (e) {
      if (e.code === "SOURCE_UNVERIFIED") {
        const s = await studioApi.source(resumeId).catch(() => null);
        setSource(s); setStep("verify");
      } else {
        setStep("start");
        setMessage(e.code === "RATE_LIMITED" || e.code === "TOO_MANY_RUNNING" ? e.message : e.message || "something went wrong, try again");
      }
    } finally { setBusy(false); }
  };
  const confirmSource = async () => {
    setBusy(true);
    try {
      await studioApi.confirmSource(source.resumeId, source.revisionHash);
      setSource(null); setStep("start");
      await startTailoring();
    } catch (e) { Alert.alert("not confirmed", e.message); } finally { setBusy(false); }
  };

  // ---------- C ----------
  const decide = async (s, decision, extra = {}) => {
    setBusy(true);
    try {
      const r = await saveDecisions(draft.id, draft.revision, [{ suggestionId: s.suggestionId, decision, ...extra }]);
      if (r.queued) {
        setQueued(true);
        setDraft((d) => ({ ...d, suggestions: d.suggestions.map((x) => (x.suggestionId === s.suggestionId ? { ...x, decision, editedText: extra.editedText || "", confirmedTrue: !!extra.confirmTrue } : x)), unresolved: d.suggestions.filter((x) => x.suggestionId !== s.suggestionId && x.decision === "pending").length }));
      } else {
        setQueued(false);
        setDraft(r.draft);
        if (r.conflict) Alert.alert("reloaded", "this draft changed on another device. check it and try again.");
      }
      setEditing(null);
    } catch (e) {
      Alert.alert(e.code === "CONFIRMATION_REQUIRED" ? "is this true?" : "not saved", e.riskFlags?.length ? `${e.message}\n\n${flagsText(e.riskFlags)}` : e.message);
    } finally { setBusy(false); }
  };

  // ---------- E ----------
  const approve = async () => {
    setBusy(true); setMessage("");
    try {
      const r = await studioApi.approve(draft.id, { revision: draft.revision, confirmAccurate, confirmReviewed, label: label.trim() });
      setVersion(r.version);
      rememberDraft("");
      setStep("approved");
      if (r.version.target?.kind === "tdc_job") findApplication(r.version.target.jobId);
    } catch (e) {
      if (e.code === "SOURCE_CHANGED") setMessage("your resume changed after this draft was made. start a new tailoring to use the latest version.");
      else if (e.code === "STALE_REVISION") { setDraft(await studioApi.draft(draft.id)); setMessage("this draft changed on another device; we reloaded it."); setStep("review"); }
      else setMessage(e.message);
    } finally { setBusy(false); }
  };

  // ---------- F ----------
  const findApplication = async (forJob) => {
    const list = await resumeApi.getMyApplications().catch(() => []);
    const a = (Array.isArray(list) ? list : []).find((x) => String(x.jobId?._id || x.jobId) === String(forJob));
    setApplication(a || null);
    if (a) studioApi.applicationResume(a._id).then(setAttached).catch(() => setAttached(null));
  };
  const attach = async () => {
    setBusy(true);
    try {
      setAttached(await studioApi.attachVersion(application._id, version.id));
    } catch (e) { Alert.alert("not sent", e.message); } finally { setBusy(false); }
  };

  const frame = (children) => (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="resume studio" showBack onBack={() => navigation?.goBack?.()} />
      {children}
    </View>
  );
  if (enabled === null) return frame(<View style={styles.center}><ActivityIndicator color={T.ink} accessibilityLabel="loading" /></View>);
  if (!enabled) return frame(<View style={styles.center}><Text style={styles.muted} maxFontSizeMultiplier={M}>resume studio isn't available for your account yet.</Text></View>);

  return frame(
    <KeyboardAwareScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} bottomOffset={24} keyboardShouldPersistTaps="handled">
      <View style={styles.tabs} accessibilityRole="tablist">
        <Tab label="tailor" on={step !== "versions"} onPress={() => setStep(draft ? (draft.status === "approved" ? "approved" : "review") : "start")} />
        <Tab label="my versions" on={step === "versions"} onPress={() => { setStep("versions"); loadVersions(); }} />
      </View>
      {!!message && <Text style={styles.notice} accessibilityLiveRegion="polite" accessibilityRole="alert" maxFontSizeMultiplier={M}>{message}</Text>}

      {step === "start" && (
        <View>
          <Text style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={M}>{jobId ? `tailor for ${jobTitle || "this job"}` : "tailor for a job"}</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={M}>we only reword and reorder what's already in your resume. you review every change; nothing is added without you.</Text>
          <Text style={styles.h2} maxFontSizeMultiplier={M}>your resume</Text>
          {resumes.length === 0 && <Text style={styles.muted} maxFontSizeMultiplier={M}>build or upload a resume first.</Text>}
          {resumes.map((r) => (
            <TouchableOpacity key={r._id} style={[styles.option, resumeId === r._id && styles.optionOn]} onPress={() => setResumeId(r._id)} accessibilityRole="radio" accessibilityState={{ checked: resumeId === r._id }} accessibilityLabel={`resume ${r.title || r.professionalSummary?.title || "untitled"}`}>
              <Ionicons name={resumeId === r._id ? "radio-button-on" : "radio-button-off"} size={20} color={T.ink} />
              <Text style={styles.body} maxFontSizeMultiplier={M}>{r.title || r.professionalSummary?.title || "untitled resume"}</Text>
            </TouchableOpacity>
          ))}
          {!jobId && (
            <View>
              <Text style={styles.h2} maxFontSizeMultiplier={M}>the job</Text>
              <TextInput style={styles.inputLine} value={pasteTitle} onChangeText={setPasteTitle} placeholder="job title" placeholderTextColor={T.textFaint} accessibilityLabel="job title" maxFontSizeMultiplier={M} />
              <TextInput style={styles.input} value={pasteText} onChangeText={setPasteText} multiline placeholder="paste the job description" placeholderTextColor={T.textFaint} accessibilityLabel="job description" maxFontSizeMultiplier={M} />
              <Text style={styles.muted} maxFontSizeMultiplier={M}>a pasted job isn't linked to a tdc application.</Text>
            </View>
          )}
          <View style={styles.actions}><Button primary label="tailor my resume" disabled={busy || !resumeId} onPress={startTailoring} /></View>
        </View>
      )}

      {step === "verify" && source && (
        <View>
          <Text style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={M}>check your details first</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={M}>this resume was read from an uploaded file. check that everything below is right; fix anything wrong in the resume builder before you continue.</Text>
          <View style={styles.box}>
            {source.facts.map((f) => <Text key={f.factId} style={styles.body} maxFontSizeMultiplier={M}>• {f.value}</Text>)}
          </View>
          <View style={styles.actions}>
            <Button primary label="these details are correct" disabled={busy} onPress={confirmSource} />
            <Button label="edit my resume" onPress={() => navigation?.navigate?.("ResumeBuilder", { resumeId: source.resumeId })} />
          </View>
        </View>
      )}

      {step === "working" && (
        <View style={styles.center} accessibilityLiveRegion="polite">
          <ActivityIndicator color={T.ink} />
          <Text style={styles.body} maxFontSizeMultiplier={M}>{progress === "running" ? "tailoring your resume…" : "starting…"}</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={M}>you can leave this screen; your draft will be waiting.</Text>
          <Button label="cancel" onPress={() => { cancelled.current.cancelled = true; setStep("start"); }} />
        </View>
      )}

      {step === "review" && draft && (
        <View>
          <Text style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={M}>review the changes</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={M}>{draft.target?.title ? `for ${draft.target.title} · ` : ""}{draft.unresolved ? `${draft.unresolved} left to review` : "all reviewed"}</Text>
          {queued && <Text style={styles.notice} accessibilityLiveRegion="polite" maxFontSizeMultiplier={M}>saved on your phone; it syncs when you're back online.</Text>}
          {draft.warnings?.map((w, i) => <Text key={i} style={styles.notice} maxFontSizeMultiplier={M}>{w}</Text>)}

          <Coaching draft={draft} />

          {draft.suggestions.length === 0 && (
            <Text style={styles.body} maxFontSizeMultiplier={M}>{draft.aiSuggestions === "insufficient_information" ? "no ai suggestions right now: insufficient information. your resume stays as you wrote it; you can still approve it in the ats layout." : "no changes suggested: your resume already fits this job well."}</Text>
          )}
          {draft.suggestions.map((s) => {
            const st = STATUS[s.status];
            const isEditing = editing?.suggestionId === s.suggestionId;
            const evidence = (s.sourceFactIds || []).map((id) => draft.facts.find((f) => f.factId === id)?.value).filter(Boolean);
            return (
              <View key={s.suggestionId} style={styles.card} accessible={false}>
                <View style={styles.row}>
                  <Text style={styles.title} maxFontSizeMultiplier={M}>{fieldLabel(s.fieldPath)}</Text>
                  <View style={[styles.pill, { backgroundColor: st.tone }]}><Text style={styles.pillText} maxFontSizeMultiplier={M}>{st.label}</Text></View>
                </View>
                {s.kind === "reword" ? (
                  <View>
                    <Text style={styles.label} maxFontSizeMultiplier={M}>now</Text>
                    <Text style={styles.body} maxFontSizeMultiplier={M}>{s.original}</Text>
                    <Text style={styles.label} maxFontSizeMultiplier={M}>suggested</Text>
                    <Text style={styles.body} maxFontSizeMultiplier={M}>{s.decision === "edited" ? s.editedText : s.proposed}</Text>
                  </View>
                ) : (
                  <Text style={styles.body} maxFontSizeMultiplier={M}>{orderText(s, draft)}</Text>
                )}
                {!!s.reason && <Text style={styles.muted} maxFontSizeMultiplier={M}>why: {s.reason}</Text>}
                {evidence.length > 0 && <Text style={styles.muted} maxFontSizeMultiplier={M}>from your resume: {evidence.join(" · ")}</Text>}
                {s.status !== "ok" && <Text style={styles.warn} maxFontSizeMultiplier={M}>{s.status === "blocked" ? "can't be used: " : "check: "}{flagsText(s.riskFlags)}</Text>}

                {isEditing ? (
                  <View>
                    <TextInput style={styles.input} multiline value={editing.text} onChangeText={(text) => setEditing({ ...editing, text })} accessibilityLabel={`edit ${fieldLabel(s.fieldPath)}`} maxFontSizeMultiplier={M} />
                    <TrueSwitch value={!!editing.confirmTrue} onChange={(v) => setEditing({ ...editing, confirmTrue: v })} label="my edit is true" />
                    <View style={styles.actions}>
                      <Button primary label="save edit" disabled={busy} onPress={() => decide(s, "edited", { editedText: editing.text, confirmTrue: !!editing.confirmTrue })} />
                      <Button label="cancel edit" onPress={() => setEditing(null)} />
                    </View>
                  </View>
                ) : (
                  <View>
                    {s.status === "needs_user_confirmation" && s.decision === "pending" && (
                      <TrueSwitch value={!!trueFor[s.suggestionId]} onChange={(v) => setTrueFor({ ...trueFor, [s.suggestionId]: v })} label={`this is true: ${fieldLabel(s.fieldPath)}`} />
                    )}
                    <Text style={styles.decision} maxFontSizeMultiplier={M}>{s.decision === "pending" ? "" : `you ${s.decision === "edited" ? "edited it" : s.decision === "accepted" ? "accepted it" : "kept your original"}`}</Text>
                    <View style={styles.actions}>
                      {s.status !== "blocked" && (
                        <Button primary label={`accept ${fieldLabel(s.fieldPath)}`} text="accept" disabled={busy || (s.status === "needs_user_confirmation" && !trueFor[s.suggestionId])}
                          onPress={() => decide(s, "accepted", s.status === "needs_user_confirmation" ? { confirmTrue: true } : {})} />
                      )}
                      <Button label={`reject ${fieldLabel(s.fieldPath)}`} text={s.status === "blocked" ? "keep my original" : "reject"} disabled={busy} onPress={() => decide(s, "rejected")} />
                      {s.kind === "reword" && s.status !== "blocked" && <Button label={`edit ${fieldLabel(s.fieldPath)}`} text="edit" disabled={busy} onPress={() => setEditing({ suggestionId: s.suggestionId, text: s.decision === "edited" ? s.editedText : s.proposed, confirmTrue: false })} />}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
          {urduWarning(draft.pdf) && <Text style={styles.warn} accessibilityRole="alert" maxFontSizeMultiplier={M}>{urduWarning(draft.pdf)}</Text>}
          <View style={styles.actions}>
            <Button label="preview pdf" disabled={busy} onPress={() => confirmExport(draft.pdf, () => openPdf(`drafts/${draft.id}/preview.pdf`, `DRAFT ${draft.target?.title || "resume"}`).catch((e) => Alert.alert("no preview", e.message)))} />
            <Button primary label="continue to approve" disabled={busy || draft.unresolved > 0 || queued} onPress={() => setStep("approve")} />
          </View>
          {draft.unresolved > 0 && <Text style={styles.muted} maxFontSizeMultiplier={M}>accept or reject every change to continue.</Text>}
          <View style={styles.actions}>
            <Button label="discard this draft" onPress={() => Alert.alert("discard this draft?", "your resume stays as it is.", [{ text: "no" }, { text: "yes", onPress: () => studioApi.deleteDraft(draft.id).then(() => { rememberDraft(""); setDraft(null); setStep("start"); }).catch((e) => Alert.alert("not deleted", e.message)) }])} />
          </View>
        </View>
      )}

      {step === "approve" && draft && (
        <View>
          <Text style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={M}>approve this version</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={M}>once approved it never changes. employers you send it to see exactly this version.</Text>
          {urduWarning(draft.pdf) && <Text style={styles.warn} accessibilityRole="alert" maxFontSizeMultiplier={M}>{urduWarning(draft.pdf)}</Text>}
          <Button label="preview pdf" disabled={busy} onPress={() => confirmExport(draft.pdf, () => openPdf(`drafts/${draft.id}/preview.pdf`, `DRAFT ${draft.target?.title || "resume"}`).catch((e) => Alert.alert("no preview", e.message)))} />
          <Text style={styles.h2} maxFontSizeMultiplier={M}>name</Text>
          <TextInput style={styles.inputLine} value={label} onChangeText={setLabel} placeholder="e.g. frontend developer, bright labs" placeholderTextColor={T.textFaint} accessibilityLabel="version name" maxFontSizeMultiplier={M} />
          <TrueSwitch value={confirmAccurate} onChange={setConfirmAccurate} label="everything in this resume is true" />
          <TrueSwitch value={confirmReviewed} onChange={setConfirmReviewed} label="i reviewed every change" />
          <View style={styles.actions}>
            <Button label="back to the changes" onPress={() => setStep("review")} />
            <Button primary label="approve" disabled={busy || !confirmAccurate || !confirmReviewed} onPress={approve} />
          </View>
        </View>
      )}

      {step === "approved" && (
        <View>
          <Text style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={M}>approved</Text>
          {version && <Text style={styles.body} maxFontSizeMultiplier={M}>{version.label}</Text>}
          {version && urduWarning(draft?.pdf) && <Text style={styles.warn} accessibilityRole="alert" maxFontSizeMultiplier={M}>{urduWarning(draft.pdf)}</Text>}
          {version && <Button label="download pdf" onPress={() => confirmExport(draft?.pdf, () => openPdf(`versions/${version.id}/export.pdf`, version.label || "resume").catch((e) => Alert.alert("no pdf", e.message)))} />}
          {version?.target?.kind === "tdc_job" && application === null && (
            <View style={styles.box}>
              <Text style={styles.body} maxFontSizeMultiplier={M}>you haven't applied for this job yet. apply, then send this version with your application.</Text>
              <Button primary label="apply for this job" onPress={() => navigation?.navigate?.("Career", { openJobId: version.target.jobId })} />
            </View>
          )}
          {version?.target?.kind === "tdc_job" && application && !attached && (
            <View style={styles.box}>
              <Text style={styles.body} maxFontSizeMultiplier={M}>send this version with your application? the employer sees exactly this version.</Text>
              <Button primary label="send with my application" disabled={busy} onPress={attach} />
            </View>
          )}
          {attached && (
            <View style={styles.box} accessibilityLiveRegion="polite">
              <Text style={styles.title} maxFontSizeMultiplier={M}>{attached.versionId === version?.id ? "sent with your application" : "another version was already sent with this application"}</Text>
              <Text style={styles.muted} maxFontSizeMultiplier={M}>{attached.label} · snapshot {String(attached.contentHash || "").slice(0, 8)} · {new Date(attached.attachedAt).toLocaleDateString()}</Text>
              <Text style={styles.muted} maxFontSizeMultiplier={M}>it's kept for 2 years with your application. follow it on your application timeline.</Text>
            </View>
          )}
          {version?.target?.kind === "pasted" && <Text style={styles.muted} maxFontSizeMultiplier={M}>tailored for a pasted job: download the pdf to apply there.</Text>}
          <View style={styles.actions}><Button label="tailor another" onPress={() => { setDraft(null); setVersion(null); setApplication(undefined); setAttached(null); setConfirmAccurate(false); setConfirmReviewed(false); setStep("start"); }} /></View>
        </View>
      )}

      {step === "versions" && (
        <View>
          <Text style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={M}>my versions</Text>
          {versions === null && <ActivityIndicator color={T.ink} accessibilityLabel="loading" />}
          {versions?.length === 0 && <Text style={styles.muted} maxFontSizeMultiplier={M}>no approved versions yet.</Text>}
          {versions?.map((v) => (
            <View key={v.id} style={styles.card}>
              <Text style={styles.title} maxFontSizeMultiplier={M}>{v.label || "tailored resume"}</Text>
              <Text style={styles.muted} maxFontSizeMultiplier={M}>{v.target?.kind === "pasted" ? "pasted job" : "tdc job"} · approved {new Date(v.approvedAt).toLocaleDateString()}{v.usedInApplication ? " · sent with an application, kept 2 years" : ""}</Text>
              <View style={styles.actions}>
                <Button label={`download ${v.label || "version"}`} text="download pdf" onPress={() => studioApi.version(v.id).catch(() => null).then((full) => confirmExport(full?.pdf, () => openPdf(`versions/${v.id}/export.pdf`, v.label || "resume").catch((e) => Alert.alert("no pdf", e.message))))} />
                {v.deletable && <Button label={`delete ${v.label || "version"}`} text="delete" onPress={() => Alert.alert("delete this version?", "you can't undo this.", [{ text: "no" }, { text: "yes", onPress: () => studioApi.deleteVersion(v.id).then(loadVersions).catch((e) => Alert.alert("not deleted", e.message)) }])} />}
              </View>
            </View>
          ))}
        </View>
      )}
    </KeyboardAwareScrollView>
  );
}

function Coaching({ draft }) {
  const m = draft.match || {};
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.box}>
      <TouchableOpacity onPress={() => setOpen(!open)} hitSlop={{ top: 6, bottom: 6 }} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel="how your resume matches this job" style={[styles.row, { minHeight: 32 }]}>
        <Text style={styles.title} maxFontSizeMultiplier={M}>how your resume matches</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={T.ink} />
      </TouchableOpacity>
      {open && (
        <View>
          <Text style={styles.muted} maxFontSizeMultiplier={M}>no scores and no hiring predictions: just what your resume shows.</Text>
          {(m.matched || []).length > 0 && <Text style={styles.label} maxFontSizeMultiplier={M}>in your resume</Text>}
          {(m.matched || []).map((x) => <Text key={`m-${x.requirement}`} style={styles.body} maxFontSizeMultiplier={M}>✓ {x.requirement}{x.evidenceFactIds?.length ? ` (${x.evidenceFactIds.map((id) => draft.facts.find((f) => f.factId === id)?.value).filter(Boolean).slice(0, 2).join("; ")})` : ""}</Text>)}
          {(m.missing || []).length > 0 && <Text style={styles.label} maxFontSizeMultiplier={M}>not in your resume</Text>}
          {(m.missing || []).map((x) => (
            <View key={`x-${x.requirement}`}>
              <Text style={styles.body} maxFontSizeMultiplier={M}>– {x.requirement}</Text>
              {!!x.coachingNote && <Text style={styles.muted} maxFontSizeMultiplier={M}>{x.coachingNote}</Text>}
            </View>
          ))}
          {(m.unknown || []).length > 0 && <Text style={styles.label} maxFontSizeMultiplier={M}>we can't tell</Text>}
          {(m.unknown || []).map((x) => <Text key={`u-${x.requirement}`} style={styles.body} maxFontSizeMultiplier={M}>? {x.requirement}</Text>)}
        </View>
      )}
    </View>
  );
}

function TrueSwitch({ value, onChange, label }) {
  return (
    <View style={styles.switchRow}>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} accessibilityRole="switch" trackColor={{ true: T.yellow, false: T.line }} />
      <Text style={styles.body} maxFontSizeMultiplier={M}>{label}</Text>
    </View>
  );
}

function Tab({ label, on, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tab, on && styles.tabOn]} hitSlop={{ top: 4, bottom: 4 }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}>
      <Text style={[styles.tabText, on && styles.tabTextOn]} maxFontSizeMultiplier={M}>{label}</Text>
    </TouchableOpacity>
  );
}

function Button({ label, text, onPress, primary, disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.btn, primary && styles.btnPrimary, disabled && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]} maxFontSizeMultiplier={M}>{text || label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: T.sand, minHeight: 36, justifyContent: "center" },
  tabOn: { backgroundColor: T.ink },
  tabText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
  tabTextOn: { color: T.white },
  h1: { fontFamily: F.heading, fontSize: 20, color: T.ink, marginTop: 4 },
  h2: { fontFamily: F.heading, fontSize: 16, color: T.ink, marginTop: 16, marginBottom: 6 },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink, flex: 1 },
  body: { fontFamily: F.body, fontSize: 14, color: T.ink, marginTop: 2, flexShrink: 1 },
  label: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted, marginTop: 10, textTransform: "uppercase" },
  muted: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 4 },
  warn: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink, backgroundColor: T.yellowSoft, borderRadius: 12, padding: 10, marginTop: 8 },
  warn: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.danger, marginTop: 6 },
  notice: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink, backgroundColor: T.yellowSoft, padding: 10, borderRadius: 12, marginVertical: 6 },
  decision: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.success, marginTop: 6 },
  card: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginTop: 10 },
  box: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginTop: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.ink },
  option: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, marginTop: 6, minHeight: 44 },
  optionOn: { borderColor: T.ink },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, minHeight: 44 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, minHeight: 44, justifyContent: "center" },
  btnPrimary: { backgroundColor: T.ink, borderColor: T.ink },
  btnText: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.ink },
  btnTextPrimary: { color: T.white },
  input: { minHeight: 90, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 10, fontFamily: F.body, fontSize: 14, color: T.ink, textAlignVertical: "top", marginTop: 6, backgroundColor: T.card },
  inputLine: { minHeight: 44, borderWidth: 1, borderColor: T.line, borderRadius: 14, paddingHorizontal: 10, fontFamily: F.body, fontSize: 14, color: T.ink, marginTop: 6, backgroundColor: T.card },
});
