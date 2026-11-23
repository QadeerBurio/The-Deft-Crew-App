// app/src/screens/Resume/steps/LanguagesStep.js
// P3-3 (flag resumeV2): languages (the model's existing languages[] { name, proficiency }), with a level picked from
// chips. Quick picks for the languages most students here speak.
// Keyboard: rendered inside the builder's KeyboardAwareScrollView (the focused field scrolls above the keyboard).
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Chip from "../../../ui/Chip";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import { saveList, clean, keyOf } from "./sectionList";

export const LEVELS = Object.freeze(["Native", "Fluent", "Intermediate", "Basic"]);
export const QUICK = Object.freeze(["English", "Urdu", "Punjabi", "Sindhi", "Pashto", "Arabic"]);

export default function LanguagesStep({ resume, io, registerAdd }) {
  const items = (Array.isArray(resume?.languages) ? resume.languages : []).filter((l) => l && String(l.name || "").trim());
  const [name, setName] = useState("");
  const [level, setLevel] = useState("Fluent");
  const [err, setErr] = useState("");
  const has = (n) => items.some((l) => String(l.name).toLowerCase() === String(n).toLowerCase());

  const add = async ({ quiet } = {}, n = name) => {
    const nm = clean(n, 60);
    if (!nm) { if (!quiet) setErr("type a language first."); return; }
    if (has(nm)) { setName(""); return; }
    setErr("");
    try { await saveList(io, "languages", (list) => [...list, { name: nm, proficiency: level }]); setName(""); } catch { setErr("not saved. try again."); }
  };
  useEffect(() => { registerAdd?.(add); });

  return (
    <View>
      {items.map((l) => (
        <View key={keyOf(l)} style={s.row}>
          <Text style={s.lang} maxFontSizeMultiplier={MAX_FONT_SCALE}>{l.name}</Text>
          <Text style={s.level} maxFontSizeMultiplier={MAX_FONT_SCALE}>{l.proficiency || ""}</Text>
          <Pressable onPress={() => saveList(io, "languages", (list) => list.filter((x) => keyOf(x) !== keyOf(l))).catch(() => setErr("not deleted. try again."))} accessibilityRole="button" accessibilityLabel={`delete ${l.name}`} style={s.icon}><Ionicons name="trash-outline" size={18} color={T.danger} /></Pressable>
        </View>
      ))}
      <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>how well</Text>
      <View style={s.chips}>{LEVELS.map((lv) => <Chip key={lv} label={lv.toLowerCase()} selected={level === lv} onPress={() => setLevel(lv)} />)}</View>
      <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>tap to add</Text>
      <View style={s.chips}>{QUICK.filter((q) => !has(q)).map((q) => <Chip key={q} label={q} onPress={() => add({}, q)} />)}</View>
      <Input label="another language" value={name} onChangeText={setName} placeholder="e.g. French" maxLength={60} />
      {!!err && <Text style={s.err} accessibilityLiveRegion="polite" maxFontSizeMultiplier={MAX_FONT_SCALE}>{err}</Text>}
      <Button title="add language" variant="secondary" onPress={() => add()} disabled={!name.trim()} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, borderBottomWidth: 1, borderBottomColor: T.lineSoft },
  lang: { fontFamily: F.bodySemi, fontSize: 15, color: T.ink, flex: 1 },
  level: { fontFamily: F.body, fontSize: 13, color: T.textMuted },
  icon: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted, marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  err: { fontFamily: F.bodyMedium, fontSize: 13, color: T.danger, marginTop: 8 },
});
