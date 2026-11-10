// CareerRatings.js: mutual ratings in the app (FLAG_CAREER_RATINGS).
//   RateEmployer       on an application's timeline: after a completed interview, and again after a verified
//                      hire, rate the employer once (communication, respect, clarity of the process, 1-5) with
//                      an optional comment, within 14 days. Private; the employer only ever sees an average
//                      from 5 ratings, never who said what.
//   RatingsReceived    in "my applications": the ratings employers gave the student (once released), each
//                      reportable as unfair. Never shown to other employers.
//   EmployerRating     on job details: the employer's average, only when it has 5 or more ratings.
// Each renders nothing when ratings aren't on for the student.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { ratingsApi, ratingsEnabled } from "../api/ratingsApi";

const KIND = { interview: "the interview", hire: "the hire" };

function useEnabled() {
  const [on, setOn] = useState(false);
  useEffect(() => { let alive = true; ratingsEnabled().then((v) => alive && setOn(v)); return () => { alive = false; }; }, []);
  return on;
}

// 1-5 stars for one question: each star is its own 44 pt button with a label and state
function Stars({ question, value, onChange }) {
  return (
    <View style={styles.question}>
      <Text style={styles.qLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{question.label}</Text>
      <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel={`${question.label}, 1 to 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => onChange(n)} style={styles.star} accessibilityRole="radio" accessibilityLabel={`${question.label}: ${n} of 5 stars`} accessibilityState={{ selected: value === n, checked: value === n }}>
            <Ionicons name={value >= n ? "star" : "star-outline"} size={26} color={T.ink} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function RateEmployer({ applicationId }) {
  const on = useEnabled();
  const [d, setD] = useState(null);
  const [answers, setAnswers] = useState({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => ratingsApi.forApplication(applicationId).then(setD).catch(() => setD(null)), [applicationId]);
  useEffect(() => { if (on) load(); }, [on, load]);
  if (!on || !d || !d.events?.length) return null;
  const open = d.events.find((e) => e.open);
  const done = d.events.filter((e) => e.myRating);
  if (!open && !done.length) return null;
  const complete = open && d.questions.every((q) => answers[q.id]);
  const submit = async () => {
    setBusy(true);
    try {
      await ratingsApi.rate({ applicationId, kind: open.kind, ref: open.ref, answers, comment: comment.trim() });
      setAnswers({});
      setComment("");
      Alert.alert("thanks", "your rating is private. the employer only sees an average from 5 ratings, never who said what.");
      load();
    } catch (err) {
      Alert.alert("not saved", err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.box}>
      <Text style={styles.boxTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>rate the employer</Text>
      {done.map((e) => (
        <Text key={`${e.kind}:${e.ref}`} style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          you rated {KIND[e.kind]}: {d.questions.map((q) => `${q.label.toLowerCase()} ${e.myRating.answers[q.id]}/5`).join(", ")}
        </Text>
      ))}
      {open && (
        <>
          <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>how was {KIND[open.kind]}? private: the employer only ever sees an average from 5 ratings. no rating changes anything automatically.</Text>
          {d.questions.map((q) => <Stars key={q.id} question={q} value={answers[q.id]} onChange={(n) => setAnswers((a) => ({ ...a, [q.id]: n }))} />)}
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            maxLength={300}
            multiline
            placeholder="a short comment (optional)"
            placeholderTextColor={T.textFaint}
            accessibilityLabel={`comment, optional, ${300 - comment.length} characters left`}
          />
          <TouchableOpacity onPress={submit} disabled={!complete || busy} style={[styles.btn, styles.btnPrimary, (!complete || busy) && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel="save my rating" accessibilityState={{ disabled: !complete || busy }}>
            <Text style={[styles.btnText, styles.btnTextPrimary]} maxFontSizeMultiplier={MAX_FONT_SCALE}>save my rating</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export function RatingsReceived() {
  const on = useEnabled();
  const [d, setD] = useState(null);
  const load = useCallback(() => ratingsApi.received().then(setD).catch(() => setD(null)), []);
  useEffect(() => { if (on) load(); }, [on, load]);
  if (!on || !d?.ratings?.length) return null;
  const report = (r) => Alert.prompt
    ? Alert.prompt("report this rating", "why is it unfair? tdc reviews it and may hide it.", async (reason) => {
      try { await ratingsApi.report(r.id, reason || ""); Alert.alert("reported", "tdc will review it."); } catch (err) { Alert.alert("not sent", err.message); }
    })
    : Alert.alert("report this rating", "tdc will review it and may hide it.", [
      { text: "not now", style: "cancel" },
      { text: "report", onPress: async () => { try { await ratingsApi.report(r.id, "reported from the app as unfair"); Alert.alert("reported", "tdc will review it."); } catch (err) { Alert.alert("not sent", err.message); } } },
    ]);
  return (
    <View>
      <Text style={styles.h2} maxFontSizeMultiplier={MAX_FONT_SCALE}>ratings from employers</Text>
      <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>only you see these. other employers never do.</Text>
      {d.ratings.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{r.job?.title || "a job"}{r.job?.company ? ` · ${r.job.company.toLowerCase()}` : ""}</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={MAX_FONT_SCALE}>after {KIND[r.kind]}: communication {r.answers.communication}/5, punctuality {r.answers.punctuality}/5, preparation {r.answers.preparation}/5</Text>
          {!!r.comment && <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>“{r.comment}”</Text>}
          <TouchableOpacity onPress={() => report(r)} style={styles.btn} accessibilityRole="button" accessibilityLabel={`report the rating for ${r.job?.title || "this job"} as unfair`}>
            <Text style={styles.btnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>this is unfair: report</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export function EmployerRating({ jobId }) {
  const on = useEnabled();
  const [d, setD] = useState(null);
  useEffect(() => {
    let alive = true;
    if (on && jobId) ratingsApi.employerForJob(jobId).then((x) => alive && setD(x)).catch(() => alive && setD(null));
    return () => { alive = false; };
  }, [on, jobId]);
  if (!on || !d?.shown) return null;
  return (
    <View style={styles.rating} accessible accessibilityLabel={`employer rated ${d.average} out of 5 by ${d.count} candidates`}>
      <Ionicons name="star" size={16} color={T.ink} />
      <Text style={styles.ratingText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{d.average} / 5 from {d.count} candidates</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginTop: 12 },
  boxTitle: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink, marginBottom: 4 },
  h2: { fontFamily: F.heading, fontSize: 16, color: T.ink, marginTop: 16, marginBottom: 2 },
  card: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginTop: 8 },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  muted: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 4 },
  body: { fontFamily: F.body, fontSize: 14, color: T.ink, marginTop: 4 },
  question: { marginTop: 10 },
  qLabel: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.ink },
  stars: { flexDirection: "row", gap: 2, marginTop: 2 },
  star: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 70, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 10, fontFamily: F.body, fontSize: 14, color: T.ink, textAlignVertical: "top", marginTop: 10 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, minHeight: 44, justifyContent: "center", alignSelf: "flex-start", marginTop: 10 },
  btnPrimary: { backgroundColor: T.ink, borderColor: T.ink },
  btnText: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.ink },
  btnTextPrimary: { color: T.white },
  rating: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: T.sand },
  ratingText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
});
