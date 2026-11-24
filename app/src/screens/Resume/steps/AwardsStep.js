// app/src/screens/Resume/steps/AwardsStep.js
// P3-3 (flag resumeV2): awards (title, who gave it, month + year, one line) and achievements (the model's existing
// achievements[]: one line each). Printed as "Awards" and "Achievements".
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Card from "../../../ui/Card";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import MonthYearField from "./MonthYearField";
import { monthYearLabel } from "../../../resume/resumeV2";
import { saveList, addOrReplace, removeKey, clean, keyOf } from "./sectionList";

const EMPTY = { title: "", issuer: "", date: "", note: "" };

export default function AwardsStep({ resume, io, registerAdd }) {
  const awards = Array.isArray(resume?.awards) ? resume.awards : [];
  const achievements = (Array.isArray(resume?.achievements) ? resume.achievements : []).filter((a) => String(a || "").trim());
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [line, setLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (p) => setForm((f) => ({ ...f, ...p }));

  const addAward = async ({ quiet } = {}) => {
    if (!form.title.trim()) { if (!quiet) setErr("add the award's name first."); return; }
    setBusy(true); setErr("");
    try {
      await saveList(io, "awards", addOrReplace({ title: clean(form.title, 150), issuer: clean(form.issuer, 120), date: form.date || undefined, note: clean(form.note, 240) }, editing));
      setForm(EMPTY); setEditing(null);
    } catch { setErr("not saved. check your connection and try again."); } finally { setBusy(false); }
  };
  const addLine = async ({ quiet } = {}) => {
    const t = clean(line, 240);
    if (!t) { if (!quiet) setErr("type the achievement first."); return; }
    setErr("");
    try { await saveList(io, "achievements", (list) => [...list.filter((a) => String(a || "").trim()), t]); setLine(""); } catch { setErr("not saved. try again."); }
  };
  useEffect(() => { registerAdd?.(async (o) => { await addAward(o); await addLine(o); }); });

  return (
    <View>
      <Text style={s.h} maxFontSizeMultiplier={MAX_FONT_SCALE}>awards</Text>
      {awards.map((a) => (
        <Card key={keyOf(a)} small style={s.item}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{a.title}</Text>
              <Text style={s.meta} maxFontSizeMultiplier={MAX_FONT_SCALE}>{[a.issuer, monthYearLabel(a.date)].filter(Boolean).join(" · ")}</Text>
              {!!a.note && <Text style={s.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>{a.note}</Text>}
            </View>
            <Pressable onPress={() => { setEditing(keyOf(a)); setForm({ title: a.title || "", issuer: a.issuer || "", date: a.date || "", note: a.note || "" }); }} accessibilityRole="button" accessibilityLabel={`edit ${a.title}`} style={s.icon}><Ionicons name="create-outline" size={18} color={T.ink} /></Pressable>
            <Pressable onPress={() => saveList(io, "awards", removeKey(keyOf(a))).catch(() => setErr("not deleted. try again."))} accessibilityRole="button" accessibilityLabel={`delete ${a.title}`} style={s.icon}><Ionicons name="trash-outline" size={18} color={T.danger} /></Pressable>
          </View>
        </Card>
      ))}
      <Input label="award" value={form.title} onChangeText={(v) => set({ title: v })} placeholder="e.g. 1st place, NED hackathon" maxLength={150} />
      <Input label="given by (optional)" value={form.issuer} onChangeText={(v) => set({ issuer: v })} placeholder="e.g. NED University" maxLength={120} />
      <MonthYearField label="when (optional)" value={form.date} onChange={(v) => set({ date: v })} />
      <Input label="one line about it (optional)" value={form.note} onChangeText={(v) => set({ note: v })} maxLength={240} />
      <Button title={editing ? "save changes" : "add award"} variant="secondary" onPress={() => addAward()} loading={busy} disabled={!form.title.trim()} />

      <Text style={[s.h, { marginTop: 20 }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>achievements</Text>
      {achievements.map((a, i) => (
        <View key={`${i}:${a}`} style={s.lineRow}>
          <Text style={[s.note, { flex: 1 }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`• ${a}`}</Text>
          <Pressable onPress={() => saveList(io, "achievements", (list) => { const j = list.indexOf(a); return j < 0 ? list : [...list.slice(0, j), ...list.slice(j + 1)]; }).catch(() => setErr("not deleted. try again."))} accessibilityRole="button" accessibilityLabel={`delete ${a}`} style={s.icon}><Ionicons name="trash-outline" size={18} color={T.danger} /></Pressable>
        </View>
      ))}
      <Input label="an achievement, one line (optional)" value={line} onChangeText={setLine} placeholder="e.g. top 5% in the matric board exam" maxLength={240} />
      <Button title="add achievement" variant="secondary" onPress={() => addLine()} disabled={!line.trim()} />
      {!!err && <Text style={s.err} accessibilityLiveRegion="polite" maxFontSizeMultiplier={MAX_FONT_SCALE}>{err}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink, marginBottom: 8 },
  item: { marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  lineRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  meta: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  note: { fontFamily: F.body, fontSize: 13.5, color: T.ink, marginTop: 4 },
  icon: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  err: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, marginTop: 8 },
});
