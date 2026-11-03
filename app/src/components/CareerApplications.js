// CareerApplications.js: "my applications" on the hiring timeline (FLAG_CAREER_TIMELINE), inside the Jobs
// area's applications sheet (TDCCareers). Active / closed lists; an application opens its timeline with the
// next step: answer an interview invite (accept, ask for another time, decline, add to calendar), report
// an interview that didn't happen or dispute a recorded one, answer an offer, see a confirmed hire and
// dispute it within 7 days, withdraw. "Hired / Interviewed via TDC" outcomes are private unless the
// student shows them. Times are shown in the interview's time zone (Asia/Karachi by default).
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Switch, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { careerApi, addInterviewToCalendar } from "../api/careerApi";

const STAGE = {
  applied: { label: "applied", tone: T.sand },
  reviewed: { label: "reviewed", tone: T.sand },
  shortlisted: { label: "shortlisted", tone: T.yellowSoft },
  interview: { label: "interview", tone: T.yellowSoft },
  offer: { label: "offer", tone: T.yellowSoft },
  hired: { label: "hired via tdc", tone: T.successBg },
  rejected: { label: "not selected", tone: T.sand },
  withdrawn: { label: "withdrawn", tone: T.sand },
};
const EVENT = {
  APPLIED: "you applied", LEGACY_STATUS: "status before the timeline", REVIEWED: "the employer reviewed it", SHORTLISTED: "you were shortlisted", REJECTED: "not selected", WITHDRAWN: "you withdrew",
  INTERVIEW_INVITED: "interview invitation", INTERVIEW_RESCHEDULED: "interview moved", INTERVIEW_CANCELLED: "interview cancelled", INTERVIEW_ACCEPTED: "you accepted the interview",
  INTERVIEW_DECLINED: "you declined the interview", INTERVIEW_RESCHEDULE_REQUESTED: "you asked for another time", INTERVIEW_COMPLETED: "interview recorded as completed",
  CANDIDATE_NO_SHOW_REPORTED: "the employer reported you didn't join", EMPLOYER_NO_SHOW_REPORTED: "you reported the interview didn't happen", INTERVIEW_DISPUTED: "you disputed the interview record",
  OFFER_SENT: "you got an offer", OFFER_WITHDRAWN: "the offer was withdrawn", OFFER_ACCEPTED: "you accepted the offer", OFFER_DECLINED: "you declined the offer",
  HIRE_CONFIRMED: "hire confirmed: hired via tdc", HIRE_DISPUTED: "you disputed the hire", HIRE_REVOKED: "hire record corrected by tdc",
};
const when = (iso, tz = "Asia/Karachi") => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-GB", { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return new Date(iso).toLocaleString();
  }
};
const nextStep = (a) => {
  const n = a.nextAllowedActions || [];
  if (a.external) return a.externalLabel;
  if (n.includes("INTERVIEW_ACCEPTED")) return "answer the interview invitation";
  if (n.includes("OFFER_ACCEPTED")) return `answer the offer by ${when(a.offer?.expiresAt)}`;
  if (n.includes("HIRE_DISPUTED")) return "hired: something wrong? you can dispute it for 7 days";
  if (a.stage === "offer" && a.offer?.status === "accepted") return "you accepted; waiting for the employer to confirm the hire";
  if (a.stage === "interview" && a.interview?.status === "accepted") return `interview on ${when(a.interview.startsAt)}`;
  if (a.closed) return "";
  return "waiting for the employer";
};
const failed = (err, reload) => {
  Alert.alert("not done", err.code === "VERSION_CONFLICT" ? "this changed meanwhile. we reloaded it; try again." : err.message);
  if (err.code === "VERSION_CONFLICT") reload();
};

export default function CareerApplications() {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [tab, setTab] = useState("active");
  const [openId, setOpenId] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setApps((await careerApi.myApplications())?.applications || []);
    } catch (err) {
      Alert.alert("couldn't load your applications", err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (openId) return <Timeline applicationId={openId} onBack={() => { setOpenId(null); load(); }} />;
  const shown = apps.filter((a) => (tab === "active" ? !a.closed : a.closed));
  return (
    <View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {["active", "closed"].map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t} ({apps.filter((a) => (t === "active" ? !a.closed : a.closed)).length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator color={T.ink} style={{ marginVertical: 24 }} /> : shown.length === 0 ? (
        <Text style={styles.empty} maxFontSizeMultiplier={MAX_FONT_SCALE}>{tab === "active" ? "no active applications" : "nothing closed yet"}</Text>
      ) : shown.map((a) => (
        <TouchableOpacity key={a.applicationId} style={styles.card} onPress={() => setOpenId(a.applicationId)} accessibilityRole="button" accessibilityLabel={`${a.job.title}, ${STAGE[a.stage]?.label}. ${nextStep(a)}`}>
          <View style={styles.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{a.job.title || "job"}</Text>
              <Text style={styles.muted} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{(a.job.company || "").toLowerCase()} · applied {new Date(a.appliedAt).toLocaleDateString("en-GB")}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: STAGE[a.stage]?.tone || T.sand }]}>
              <Text style={styles.pillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{STAGE[a.stage]?.label || a.stage}</Text>
            </View>
          </View>
          {!!nextStep(a) && <Text style={styles.next} maxFontSizeMultiplier={MAX_FONT_SCALE}>{nextStep(a)}</Text>}
        </TouchableOpacity>
      ))}
      <Outcomes />
    </View>
  );
}

function Timeline({ applicationId, onBack }) {
  const [t, setT] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [asking, setAsking] = useState(null); // reschedule | dispute_interview | dispute_hire
  const load = useCallback(async () => {
    try {
      setT(await careerApi.timeline(applicationId));
    } catch (err) {
      Alert.alert("couldn't load it", err.message);
    }
  }, [applicationId]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, done) => {
    setBusy(true);
    try {
      await fn();
      setAsking(null);
      setMessage("");
      if (done) Alert.alert("done", done);
      await load();
    } catch (err) {
      failed(err, load);
    } finally {
      setBusy(false);
    }
  };
  const confirmThen = (title, text, fn, done) => Alert.alert(title, text, [{ text: "not now", style: "cancel" }, { text: "yes", onPress: () => act(fn, done) }]);

  if (!t) return <ActivityIndicator color={T.ink} style={{ marginVertical: 24 }} />;
  const can = (a) => t.nextAllowedActions.includes(a);
  const iv = t.interviewDetails;
  const of = t.offerDetails;
  const v = t.version;
  return (
    <View>
      <TouchableOpacity onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="back to my applications">
        <Ionicons name="chevron-back" size={18} color={T.ink} /><Text style={styles.backText}>my applications</Text>
      </TouchableOpacity>
      <Text style={styles.h1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t.job.title}</Text>
      <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>{(t.job.company || "").toLowerCase()}{t.job.archived ? " · this job was closed" : ""}</Text>
      {t.external && <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t.externalLabel}</Text>}

      {t.stage === "hired" && t.hire?.status === "verified" && (
        <View style={[styles.box, { backgroundColor: T.successBg }]}>
          <Text style={styles.boxTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>hired via tdc 🎉</Text>
          <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>the employer confirmed your hire. the record is private; you choose who sees it (below in my applications).</Text>
          {can("HIRE_DISPUTED") && <SmallButton label="something's wrong: dispute" onPress={() => setAsking("dispute_hire")} disabled={busy} />}
        </View>
      )}

      {iv && !["cancelled", "declined"].includes(iv.status) && (
        <View style={styles.box}>
          <Text style={styles.boxTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>interview · {iv.status.replace(/_/g, " ")}</Text>
          <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>{when(iv.startsAt, iv.timezone)} ({iv.timezone})</Text>
          <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>{iv.mode === "online" ? iv.meetingLink : iv.mode === "in-person" ? iv.location : "phone call"}</Text>
          {!!iv.note && <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>“{iv.note}”</Text>}
          <View style={styles.actions}>
            {can("INTERVIEW_ACCEPTED") && <SmallButton primary label="accept" disabled={busy} onPress={() => act(() => careerApi.respondInterview(iv.id, { version: v, response: "accept" }), "interview accepted")} />}
            {can("INTERVIEW_RESCHEDULE_REQUESTED") && <SmallButton label="ask for another time" disabled={busy} onPress={() => setAsking("reschedule")} />}
            {can("INTERVIEW_DECLINED") && <SmallButton label="decline" disabled={busy} onPress={() => confirmThen("decline the interview?", "the employer is told.", () => careerApi.respondInterview(iv.id, { version: v, response: "decline" }))} />}
            {["invited", "accepted", "reschedule_requested"].includes(iv.status) && <SmallButton label="add to calendar" disabled={busy} onPress={() => addInterviewToCalendar(iv.id).catch((e) => Alert.alert("calendar", e.message))} />}
            {can("EMPLOYER_NO_SHOW_REPORTED") && <SmallButton label="it didn't happen" disabled={busy} onPress={() => confirmThen("report that the interview didn't happen?", "it's a report to the employer and tdc; nothing happens automatically.", () => careerApi.respondInterview(iv.id, { version: v, response: "employer_no_show" }))} />}
            {can("INTERVIEW_DISPUTED") && <SmallButton label="dispute the record" disabled={busy} onPress={() => setAsking("dispute_interview")} />}
          </View>
        </View>
      )}

      {of && (
        <View style={styles.box}>
          <Text style={styles.boxTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>offer · {of.status}</Text>
          <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>{of.title}</Text>
          {!!of.terms && <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>{of.terms}</Text>}
          {of.status === "sent" && <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>answer by {when(of.expiresAt)}</Text>}
          {of.status === "accepted" && t.stage !== "hired" && <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>you accepted. it becomes a hire once the employer confirms it.</Text>}
          <View style={styles.actions}>
            {can("OFFER_ACCEPTED") && <SmallButton primary label="accept the offer" disabled={busy} onPress={() => confirmThen("accept this offer?", of.title, () => careerApi.respondOffer(of.id, { version: v, response: "accept" }), "offer accepted. the employer confirms the hire next.")} />}
            {can("OFFER_DECLINED") && <SmallButton label="decline" disabled={busy} onPress={() => confirmThen("decline this offer?", "the employer is told.", () => careerApi.respondOffer(of.id, { version: v, response: "decline" }))} />}
          </View>
        </View>
      )}

      {asking && (
        <View style={styles.box}>
          <Text style={styles.boxTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{asking === "reschedule" ? "which times work for you?" : "what's wrong?"}</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            style={styles.input}
            multiline
            maxLength={500}
            placeholder={asking === "reschedule" ? "e.g. any weekday after 3 pm" : "tell tdc and the employer what happened"}
            placeholderTextColor={T.textFaint}
            accessibilityLabel={asking === "reschedule" ? "times that work for you" : "what's wrong"}
          />
          <View style={styles.actions}>
            <SmallButton
              primary
              label="send"
              disabled={busy || (asking !== "reschedule" && message.trim().length < 5)}
              onPress={() => act(() => (asking === "reschedule"
                ? careerApi.respondInterview(iv.id, { version: v, response: "reschedule", message })
                : asking === "dispute_interview"
                  ? careerApi.respondInterview(iv.id, { version: v, response: "dispute", message })
                  : careerApi.event(applicationId, { type: "HIRE_DISPUTED", version: v, note: message })), "sent")}
            />
            <SmallButton label="cancel" onPress={() => { setAsking(null); setMessage(""); }} />
          </View>
        </View>
      )}

      <Text style={styles.h2} maxFontSizeMultiplier={MAX_FONT_SCALE}>timeline</Text>
      {[...t.events].reverse().map((e) => (
        <View key={e.id} style={styles.event} accessible accessibilityLabel={`${EVENT[e.type] || e.type}, ${when(e.occurredAt)}`}>
          <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>{EVENT[e.type] || e.type.toLowerCase()}</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>{when(e.occurredAt)}{e.actorRole === "employer" ? " · the employer" : e.actorRole === "admin" ? " · tdc" : ""}</Text>
          {!!e.metadata?.note && <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>“{e.metadata.note}”</Text>}
        </View>
      ))}
      {t.events.length === 0 && <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>no updates yet ({t.legacyStatus})</Text>}
      {can("WITHDRAWN") && (
        <SmallButton label="withdraw my application" disabled={busy} onPress={() => confirmThen("withdraw your application?", "you can't undo this.", () => careerApi.event(applicationId, { type: "WITHDRAWN", version: v }), "withdrawn")} />
      )}
    </View>
  );
}

// "Hired / Interviewed via TDC": private by default; the student chooses
function Outcomes() {
  const [outcomes, setOutcomes] = useState([]);
  const load = useCallback(() => careerApi.myOutcomes().then((d) => setOutcomes(d?.outcomes || [])).catch(() => setOutcomes([])), []);
  useEffect(() => { load(); }, [load]);
  if (!outcomes.length) return null;
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.h2} maxFontSizeMultiplier={MAX_FONT_SCALE}>career outcomes</Text>
      {outcomes.map((o) => (
        <View key={o.id} style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{o.label.toLowerCase()}</Text>
              <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>{o.verificationLevel === "revoked" ? "revoked" : o.verificationLevel === "verified" ? "verified" : "recorded by the employer"} · {o.visibility}</Text>
            </View>
            {o.verificationLevel !== "revoked" && (
              <Switch
                value={o.visibility === "public"}
                onValueChange={(on) => careerApi.setOutcomeVisibility(o.id, on ? "public" : "private").then(load).catch((e) => Alert.alert("not changed", e.message))}
                accessibilityLabel={`show ${o.label} publicly`}
                trackColor={{ true: T.yellow, false: T.line }}
              />
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function SmallButton({ label, onPress, primary, disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.btn, primary && styles.btnPrimary, disabled && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, marginVertical: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: T.sand },
  tabOn: { backgroundColor: T.ink },
  tabText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
  tabTextOn: { color: T.white },
  empty: { fontFamily: F.body, fontSize: 14, color: T.textMuted, textAlign: "center", marginVertical: 24 },
  card: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  muted: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  next: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink, marginTop: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.ink },
  back: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8 },
  backText: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.ink },
  h1: { fontFamily: F.heading, fontSize: 20, color: T.ink, marginTop: 4 },
  h2: { fontFamily: F.heading, fontSize: 16, color: T.ink, marginTop: 16, marginBottom: 6 },
  note: { fontFamily: F.bodySemi, fontSize: 13, color: T.textMuted, marginTop: 8 },
  box: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginTop: 12 },
  boxTitle: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink, marginBottom: 4 },
  body: { fontFamily: F.body, fontSize: 14, color: T.ink, marginTop: 2 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, minHeight: 44, justifyContent: "center" },
  btnPrimary: { backgroundColor: T.ink, borderColor: T.ink },
  btnText: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.ink },
  btnTextPrimary: { color: T.white },
  input: { minHeight: 70, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 10, fontFamily: F.body, fontSize: 14, color: T.ink, textAlignVertical: "top", marginTop: 6 },
  event: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.lineSoft },
});
