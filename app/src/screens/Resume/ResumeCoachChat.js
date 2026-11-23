// app/src/screens/Resume/ResumeCoachChat.js
// P3-4b chat mode (flags resumeV2 + resumeCoach): "build my resume by chatting". A short friendly interview; each
// answer is pulled into the resume's fields on the server (a value is kept only if the student said it) and saved
// as they go, so the resume fills up live below. Lines the coach writes are shown to keep, never saved silently.
// "no" / "skip" moves on. Speak mode (resumeSpeak): hold to talk instead of typing. Then the builder, to check.
//   params: { resumeId } an existing resume, or { track } for a new one
import React, { useContext, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useNavigation, useRoute } from "@react-navigation/native";
import Screen from "../../ui/Screen";
import ScreenHeader from "../../ui/ScreenHeader";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import { AuthContext } from "../../context/AuthContext";
import { ResumeContext } from "../../context/ResumeContext";
import { resumeStrength } from "../../utils/resumeRules";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { coachCall, meterStart, meterAdd, meterCheck } from "../../resume/coach";
import { funnel } from "../../analytics/funnel";
import SuggestionList from "./coach/SuggestionList";
import HoldToTalk from "./coach/HoldToTalk";

// the interview: key = the server's extract question; then = a follow-up asked only after a real answer
export const SCRIPT = Object.freeze([
  { key: "study", text: "hi! what are you studying, and where?" },
  { key: "target", text: "what job or internship do you want next?" },
  { key: "society", text: "any society, club or team? tell me which one and your role (or say no).", then: { key: "did", section: "activities", text: "nice. what did you do there?" } },
  { key: "project", text: "a class, final-year or personal project you're proud of? what was it?", then: { key: "did", section: "projects", text: "what did you do in it?" } },
  { key: "work", text: "any job, internship, tuition or freelancing? where, and what was your role? (or say no)", then: { key: "did", section: "workExperience", text: "what did you do there?" } },
]);
const SKIP = /^\s*(no|nope|not yet|nothing|skip|none|nah)\b/i;

export default function ResumeCoachChat() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext) || {};
  const { createResume, updateResume, resumes = [], currentResume } = useContext(ResumeContext) || {};
  const [resumeId, setResumeId] = useState(route.params?.resumeId || null);
  const resume = resumes.find((r) => r._id === resumeId) || (currentResume?._id === resumeId ? currentResume : null);
  const [msgs, setMsgs] = useState([{ from: "tdc", text: SCRIPT[0].text }]);
  const [step, setStep] = useState({ i: 0, follow: null, entry: null }); // entry: { section, index, name, role }
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState(null); // coach lines waiting to be kept
  const scroll = useRef(null);
  const done = step.i >= SCRIPT.length;

  useEffect(() => { funnel("resume_coach_chat"); }, []);
  useEffect(() => { if (resumeId) meterStart(resumeId, "chat"); }, [resumeId]);
  const say = (from, text) => setMsgs((m) => [...m, { from, text }]);

  const ensure = async () => {
    if (resumeId) return resumeId;
    const [firstName, ...rest] = String(user?.name || "").trim().split(/\s+/);
    const created = await createResume({ personalInfo: { firstName: firstName || "", lastName: rest.join(" "), email: user?.email || "", phone: user?.phone || "" }, template: "modern_ats", settings: { track: route.params?.track === "experienced" ? "experienced" : "fresher" } }, { alert: false });
    setResumeId(created._id);
    return created._id;
  };
  const patchList = async (id, field, fn) => updateResume(id, (latest) => ({ [field]: fn(Array.isArray(latest?.[field]) ? latest[field] : []) }));

  const next = (follow = null, entry = null) => {
    setStep((st) => {
      const ni = follow ? st.i : st.i + 1;
      const q = follow || SCRIPT[ni];
      if (q) say("tdc", q.text); else say("tdc", "that's a great start. let's check it in the builder.");
      return { i: ni, follow, entry };
    });
  };

  const send = async (raw = answer) => {
    const text = String(raw || "").trim();
    if (!text || busy) return;
    setAnswer(""); say("me", text); setBusy(true);
    try {
      const id = await ensure();
      meterAdd(id, { typed: text.length });
      const q = step.follow || SCRIPT[step.i];
      if (SKIP.test(text)) { next(); return; }
      if (step.follow) {
        const r = await coachCall("extract", { question: "did", answer: text });
        const did = r?.fields?.did?.length ? r.fields.did : [text];
        const b = await coachCall("bullets", { section: step.entry.section, role: step.entry.role, organisation: step.entry.name, did });
        if (b?.suggestions?.length) { setLines({ entry: step.entry, items: b.suggestions }); say("tdc", "here's how i'd write it. keep what's right:"); }
        else next();
        return;
      }
      const r = await coachCall("extract", { question: q.key, answer: text });
      const f = r?.fields || {};
      let entry = null;
      if (q.key === "study") {
        if (f.university || f.programme) await patchList(id, "education", (l) => [...l, { institution: f.university || "", degree: f.programme || "", current: true }]);
      } else if (q.key === "target") {
        if (f.targetRole) await updateResume(id, { targetJob: { jobTitle: f.targetRole }, targetJobs: [{ jobTitle: f.targetRole }] });
      } else if (q.key === "society") {
        const name = f.organisation || text;
        await patchList(id, "activities", (l) => [...l, { organisation: name, role: f.role || "", bullets: [] }]);
        entry = { section: "activities", name, role: f.role || "" };
      } else if (q.key === "project") {
        const name = f.name || text;
        await patchList(id, "projects", (l) => [...l, { name, description: "" }]);
        entry = { section: "projects", name, role: "" };
      } else if (q.key === "work") {
        const name = f.organisation || text;
        await patchList(id, "workExperience", (l) => [...l, { company: name, position: f.role || "", achievements: [] }]);
        entry = { section: "workExperience", name, role: f.role || "" };
      }
      if (entry && q.then) next(q.then, entry); else next();
    } catch (e) {
      say("tdc", e?.response?.status === 429 ? "too many answers at once. wait a few minutes and carry on." : "i couldn't save that. check your connection and send it again.");
    } finally { setBusy(false); }
  };

  const keep = async (kept) => {
    const { entry } = lines;
    const id = await ensure();
    meterAdd(id, { taps: 1 });
    const key = entry.section === "workExperience" ? "achievements" : entry.section === "projects" ? "description" : "bullets";
    await patchList(id, entry.section, (l) => {
      const out = l.slice();
      for (let i = out.length - 1; i >= 0; i -= 1) {
        const e = out[i];
        if ((e.organisation || e.company || e.name) === entry.name) {
          out[i] = { ...e, [key]: key === "description" ? [e.description, ...kept].filter(Boolean).join(" ") : [...(e[key] || []), ...kept] };
          break;
        }
      }
      return out;
    });
  };
  const doneLines = () => { setLines(null); next(); };

  useEffect(() => {
    if (!resume || !resumeId) return;
    meterCheck(resumeId, resume).then((m) => { if (m) funnel("resume_one_page_ready", { refId: String(resumeId), ...m }); }).catch(() => {});
  }, [resume, resumeId]);

  const st = resume ? resumeStrength(resume) : null;
  const filled = resume ? [["education", "education"], ["activities", "activities"], ["projects", "projects"], ["workExperience", "experience"], ["skills", "skills"]].filter(([k]) => (resume[k] || []).length).map(([, l]) => l) : [];
  return (
    <Screen>
      <ScreenHeader title="build by chatting" />
      <ScrollView ref={scroll} contentContainerStyle={s.body} onContentSizeChange={() => scroll.current?.scrollToEnd?.({ animated: true })} keyboardShouldPersistTaps="handled">
        {msgs.map((m, i) => (
          <View key={i} style={[s.msg, m.from === "me" ? s.me : s.tdc]}>
            <Text style={[s.msgText, m.from === "me" && { color: T.white }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{m.text}</Text>
          </View>
        ))}
        {lines && (
          <View>
            <SuggestionList key={lines.items.join("|")} items={lines.items} onKeep={keep} />
            <Button title="next question" variant="secondary" size="small" full={false} onPress={doneLines} />
          </View>
        )}
        <View style={s.live} accessibilityLabel="your resume so far">
          <Text style={s.liveTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>your resume so far</Text>
          <Text style={s.liveText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{filled.length ? filled.join(" · ") : "nothing yet"}{st ? ` · strength ${st.score}` : ""}</Text>
        </View>
        {done && <Button title="check it in the builder" variant="accent" onPress={() => navigation.replace("ResumeBuilder", { resumeId })} disabled={!resumeId} style={{ marginTop: 12 }} />}
      </ScrollView>
      {!done && !lines && (
        <KeyboardStickyView>
          <View style={s.composer}>
            <HoldToTalk onText={(t) => send(t)} />
            <View style={s.inputRow}>
              <View style={{ flex: 1 }}><Input value={answer} onChangeText={setAnswer} placeholder="type your answer" maxLength={600} accessibilityLabel="your answer" onSubmitEditing={() => send()} returnKeyType="send" /></View>
              <Button title="send" variant="accent" size="small" full={false} onPress={() => send()} loading={busy} disabled={!answer.trim() || busy} />
            </View>
          </View>
        </KeyboardStickyView>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: 16, paddingBottom: 24 },
  msg: { maxWidth: "85%", borderRadius: 16, padding: 12, marginBottom: 8 },
  tdc: { alignSelf: "flex-start", backgroundColor: T.sand },
  me: { alignSelf: "flex-end", backgroundColor: T.ink },
  msgText: { fontFamily: F.body, fontSize: 15, color: T.ink, lineHeight: 21 },
  live: { marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: T.line, backgroundColor: T.card },
  liveTitle: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted },
  liveText: { fontFamily: F.bodySemi, fontSize: 14, color: T.ink, marginTop: 2 },
  composer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: T.paper, borderTopWidth: 1, borderTopColor: T.line },
  inputRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
});
