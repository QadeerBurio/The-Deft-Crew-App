// app/src/screens/Resume/ResumeStart.js
// Plan P3-1 (flag resumeV2): how a new resume starts. Three cards:
//   upload my cv              → the builder's existing upload (then "check your resume", unchanged)
//   build from my tdc profile → a resume filled from the account and the professional profile (only what the student
//                               gave), then "check your resume" with what was filled
//   start fresh               → the builder
// Before "profile" and "fresh": one question, "have you done an internship or job yet?" → the experienced or the
// fresher track (resume.settings.track). The dashboard opens this screen only with the flag on.
import React, { useContext, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../ui/Screen";
import ScreenHeader from "../../ui/ScreenHeader";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { AuthContext } from "../../context/AuthContext";
import { ResumeContext } from "../../context/ResumeContext";
import { getMyProfessionalProfile } from "../../api/profileApi";
import { prefillFromProfile } from "../../resume/resumeV2";
import { errorMessage } from "../../hooks/useAction";
import useFlag from "../../hooks/useFlag";
import { COACH_FLAG } from "../../resume/coach";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";

const LIMIT_TITLE = "you already have 2 resumes";
const LIMIT_TEXT = "open one of them to edit it, or delete one to make a new one.";

const CARDS = [
  { key: "upload", icon: "cloud-upload-outline", title: "upload my cv", line: "we read your file and fill in the sections. you check them." },
  { key: "profile", icon: "person-circle-outline", title: "build from my tdc profile", line: "your name, contact, university and skills are already here. one tap." },
  { key: "fresh", icon: "create-outline", title: "start fresh", line: "a few quick steps, one card at a time." },
];
// P3b (resumeCoach): a fourth way, "build it by chatting"
const CHAT_CARD = { key: "chat", icon: "chatbubbles-outline", title: "build it by chatting", line: "answer a few questions. we write it, you check it." };

export default function ResumeStart() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext) || {};
  const { createResume, creationsUsed = 0, fetchResumes } = useContext(ResumeContext) || {};
  const [asking, setAsking] = useState(null); // "profile" | "fresh" while the track question shows
  const [busy, setBusy] = useState(false);
  const coachOn = useFlag(COACH_FLAG) === true;
  const cards = coachOn ? [...CARDS, CHAT_CARD] : CARDS;

  const limit = () => { Alert.alert(LIMIT_TITLE, LIMIT_TEXT); };

  const choose = (key) => {
    if (creationsUsed >= 2) return limit();
    if (key === "upload") return navigation.replace("ResumeBuilder", { autoUpload: true });
    setAsking(key);
  };

  const withTrack = async (track) => {
    if (asking === "fresh") { navigation.replace("ResumeBuilder", { track }); return; }
    if (asking === "chat") { navigation.replace("ResumeCoachChat", { track }); return; }
    setBusy(true);
    try {
      let profile = null;
      try { profile = (await getMyProfessionalProfile())?.profile || null; } catch { profile = null; } // no profile: the account only
      const { resume, report } = prefillFromProfile({ user: user || {}, profile, track });
      const created = await createResume(resume, { alert: false });
      if (!created?._id) throw new Error("not created");
      fetchResumes?.().catch?.(() => {});
      navigation.replace("ResumeImportReview", { resumeId: created._id, report });
    } catch (err) {
      if (err?.code === "RESUME_LIMIT" || err?.response?.data?.code === "RESUME_CREATION_LIMIT_REACHED") limit();
      else Alert.alert("couldn't start your resume", errorMessage(err, "please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="new resume" />
      <ScrollView contentContainerStyle={s.body}>
        {asking ? (
          <View>
            <Text style={s.q} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>have you done an internship or job yet?</Text>
            <Text style={s.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>no experience is fine. we'll lead with your studies, projects and activities.</Text>
            <Button title="not yet" variant="accent" onPress={() => withTrack("fresher")} loading={busy && asking === "profile"} disabled={busy} style={{ marginTop: 16 }} accessibilityLabel="not yet: build a fresher resume" />
            <Button title="yes" variant="secondary" onPress={() => withTrack("experienced")} disabled={busy} style={{ marginTop: 10 }} accessibilityLabel="yes: I've done an internship or job" />
            <Button title="back" variant="ghost" onPress={() => setAsking(null)} disabled={busy} style={{ marginTop: 6 }} />
          </View>
        ) : (
          cards.map((c) => (
            <Card key={c.key} onPress={() => choose(c.key)} style={s.card} accessibilityRole="button" accessibilityLabel={`${c.title}. ${c.line}`} testID={`start-${c.key}`}>
              <View style={s.row}>
                <View style={s.icon}><Ionicons name={c.icon} size={24} color={T.ink} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{c.title}</Text>
                  <Text style={s.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>{c.line}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: T.yellowSoft, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: F.bodyBold, fontSize: 16, color: T.ink },
  line: { fontFamily: F.body, fontSize: 14, color: T.textMuted, lineHeight: 20, marginTop: 2 },
  q: { fontFamily: F.heading, fontSize: 22, color: T.ink, marginBottom: 6 },
});
