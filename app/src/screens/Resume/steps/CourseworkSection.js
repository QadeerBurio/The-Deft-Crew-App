// app/src/screens/Resume/steps/CourseworkSection.js
// P3-3 (flag resumeV2): "relevant coursework" under education (coursework[], strings): type a course, add it as a
// chip, tap a chip to remove it. Printed under Education as "Relevant coursework: …".
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Chip from "../../../ui/Chip";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import { saveList, clean } from "./sectionList";

export default function CourseworkSection({ resume, io }) {
  const items = (Array.isArray(resume?.coursework) ? resume.coursework : []).filter((c) => String(c || "").trim());
  const [course, setCourse] = useState("");
  const [err, setErr] = useState("");
  const add = async () => {
    const c = clean(course, 80);
    if (!c) return;
    if (items.some((x) => x.toLowerCase() === c.toLowerCase())) { setCourse(""); return; }
    try { await saveList(io, "coursework", (list) => [...list, c].slice(0, 12)); setCourse(""); setErr(""); } catch { setErr("not saved. try again."); }
  };
  const remove = (c) => saveList(io, "coursework", (list) => list.filter((x) => x !== c)).catch(() => setErr("not deleted. try again."));
  return (
    <View style={s.wrap}>
      <Text style={s.h} maxFontSizeMultiplier={MAX_FONT_SCALE}>relevant coursework (optional)</Text>
      <Text style={s.sub} maxFontSizeMultiplier={MAX_FONT_SCALE}>courses that fit the job you want. tap one to remove it.</Text>
      <View style={s.chips}>{items.map((c) => <Chip key={c} label={c} selected onPress={() => remove(c)} />)}</View>
      <Input value={course} onChangeText={setCourse} placeholder="e.g. Data Structures" maxLength={80} accessibilityLabel="a course" onSubmitEditing={add} returnKeyType="done" />
      {!!err && <Text style={s.err} maxFontSizeMultiplier={MAX_FONT_SCALE}>{err}</Text>}
      <Button title="add course" variant="secondary" size="small" full={false} onPress={add} disabled={!course.trim()} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: T.lineSoft },
  h: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  sub: { fontFamily: F.body, fontSize: 13, color: T.textMuted, marginTop: 2, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  err: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, marginBottom: 8 },
});
