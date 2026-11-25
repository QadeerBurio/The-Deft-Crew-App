// screens/home/GoalsSheet.js — P5-1 "first 60 seconds" (flag onboardingGoals, off by default).
// Once, for a signed-in student who hasn't picked goals: three cards on what tdc does for them, then "pick up to 2"
// (save money / find an internship / meet people / build my resume) → POST /api/engagement/goals; Home's missions then
// put the matching cards first (the server orders them). Shown once only (owner): "skip", done or closing it, and it never comes back.
import React, { useContext, useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/api";
import { AuthContext } from "../../context/AuthContext";
import useFlag from "../../hooks/useFlag";
import { Sheet, Button, Chip } from "../../ui";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { plainError } from "../../utils/plainError";

export const GOAL_OPTIONS = [
  ["save_money", "save money"],
  ["internship", "find an internship"],
  ["meet_people", "meet people"],
  ["resume", "build my resume"],
];
const INTRO = [
  ["pricetag-outline", "deals near you", "student prices at places around you."],
  ["briefcase-outline", "get hired", "internships and jobs that fit you."],
  ["people-outline", "your campus", "confessions, events and people from your university."],
];
export const LATER_KEY = (uid) => `@tdc_goals_later:${uid}`;
export const GOALS_KEY = ["engagement", "goals"];

export default function GoalsSheet() {
  const on = useFlag("onboardingGoals") === true;
  const { user, isGuest } = useContext(AuthContext) || {};
  const uid = !isGuest && user ? String(user._id || user.id || "") : "";
  const queryClient = useQueryClient();
  const [later, setLater] = useState(null); // null = not read yet
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return;
    AsyncStorage.getItem(LATER_KEY(uid)).then((v) => setLater(v === "1")).catch(() => setLater(false));
  }, [uid]);

  // the server's answer (only with the flag on): goals, and goalsAsked = the sheet was shown once already
  const { data } = useQuery({
    queryKey: GOALS_KEY,
    queryFn: async () => { const d = (await api.get("/engagement/home")).data || {}; return { goals: d.goals, asked: d.goalsAsked }; },
    enabled: on && !!uid,
    staleTime: 5 * 60_000,
    retry: 0,
  });
  // owner (25 Nov 2026): shown once only. It opens when never asked and no goals; from then on it stays open until
  // "skip" / done / closed, and the server records it as asked at once (also on this phone, in case that fails)
  const eligible = on && !!uid && later === false && !!data && data.asked !== true && Array.isArray(data.goals) && data.goals.length === 0;
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!eligible || open || closed) return;
    setOpen(true);
    AsyncStorage.setItem(LATER_KEY(uid), "1").catch(() => {});
    api.post("/engagement/goals", { asked: true }).catch(() => {});
  }, [eligible, open, closed, uid]);
  const visible = open && !closed;

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? p : [...p, id]));
  const dismiss = () => { setClosed(true); setLater(true); };
  const save = async () => {
    if (busy || !picked.length) return;
    setBusy(true); setError("");
    try {
      await api.post("/engagement/goals", { goals: picked });
      queryClient.setQueryData(GOALS_KEY, { goals: picked, asked: true });
      setClosed(true);
      queryClient.invalidateQueries({ queryKey: ["engagement"] }); // Home's missions follow the goals
    } catch (e) {
      setError(plainError(e, "couldn't save that. try again."));
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;
  return (
    <Sheet
      visible
      onClose={dismiss}
      title={step === 0 ? "what tdc does for you" : "what do you want from tdc?"}
      footer={step === 0
        ? <Button title="next" onPress={() => setStep(1)} />
        : <Button title="done" onPress={save} loading={busy} disabled={!picked.length} accessibilityLabel={`done, ${picked.length} picked`} />}
    >
      {step === 0 ? (
        INTRO.map(([icon, title, line]) => (
          <View key={title} style={s.row} accessible accessibilityLabel={`${title}. ${line}`}>
            <View style={s.icon}><Ionicons name={icon} size={20} color={T.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
              <Text style={s.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>{line}</Text>
            </View>
          </View>
        ))
      ) : (
        <>
          <Text style={s.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>pick up to 2. your home follows them.</Text>
          <View style={s.chips}>
            {GOAL_OPTIONS.map(([id, label]) => (
              <Chip key={id} label={label} selected={picked.includes(id)} onPress={() => toggle(id)} />
            ))}
          </View>
          {!!error && <Text style={s.error} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityLiveRegion="polite">{error}</Text>}
        </>
      )}
      <Button title="skip" variant="ghost" onPress={dismiss} accessibilityLabel="skip, don't ask again" />
    </Sheet>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.yellowSoft, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: F.heading, fontSize: 15, color: T.ink },
  line: { fontFamily: F.body, fontSize: 13.5, color: T.textMuted, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 8 },
  error: { fontFamily: F.body, fontSize: 13, color: T.danger, marginTop: 8 },
});
