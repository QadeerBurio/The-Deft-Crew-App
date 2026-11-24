// app/src/screens/Resume/coach/SuggestionList.js
// P3-4b: what the coach wrote, each line with ✓ keep · ✎ edit · ✕ remove. Nothing is saved until the student keeps it.
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "../../../ui/Button";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";

export default function SuggestionList({ items = [], onKeep, keepLabel = "keep", single = false }) {
  const [lines, setLines] = useState(items);
  const [editing, setEditing] = useState(-1);
  const [kept, setKept] = useState([]);
  // new suggestions: start again (even when the parent doesn't change the key)
  const sig = items.join("\u0001");
  useEffect(() => { setLines(items); setKept([]); setEditing(-1); }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = (i) => setLines((l) => l.filter((_, j) => j !== i));
  const keep = (i) => {
    const t = lines[i];
    if (!t) return;
    onKeep?.(single ? t : [t]);
    setKept((k) => [...k, t]);
    remove(i);
  };
  if (!lines.length) return kept.length ? <Text style={s.done} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`kept ${kept.length}.`}</Text> : null;
  return (
    <View style={s.wrap} accessibilityLabel="suggestions">
      {lines.map((t, i) => (
        <View key={`${i}:${t.slice(0, 20)}`} style={s.item}>
          {editing === i ? (
            <TextInput value={t} onChangeText={(v) => setLines((l) => l.map((x, j) => (j === i ? v : x)))} multiline style={s.input} accessibilityLabel={`edit suggestion ${i + 1}`} onBlur={() => setEditing(-1)} />
          ) : (
            <Text style={s.text} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t}</Text>
          )}
          <View style={s.row}>
            <Pressable onPress={() => keep(i)} style={s.btn} accessibilityRole="button" accessibilityLabel={`${keepLabel}: ${t}`}><Ionicons name="checkmark" size={18} color={T.success} /><Text style={[s.btnText, { color: T.success }]}>{keepLabel}</Text></Pressable>
            <Pressable onPress={() => setEditing(editing === i ? -1 : i)} style={s.btn} accessibilityRole="button" accessibilityLabel={`edit: ${t}`}><Ionicons name="create-outline" size={18} color={T.ink} /><Text style={s.btnText}>edit</Text></Pressable>
            <Pressable onPress={() => remove(i)} style={s.btn} accessibilityRole="button" accessibilityLabel={`remove: ${t}`}><Ionicons name="close" size={18} color={T.danger} /><Text style={[s.btnText, { color: T.danger }]}>remove</Text></Pressable>
          </View>
        </View>
      ))}
      {!single && lines.length > 1 && <Button title="keep all" variant="secondary" size="small" full={false} onPress={() => { onKeep?.(lines); setKept((k) => [...k, ...lines]); setLines([]); }} />}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 8 },
  item: { borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 10, marginBottom: 8, backgroundColor: T.card },
  text: { fontFamily: F.body, fontSize: 14.5, color: T.ink, lineHeight: 20 },
  input: { fontFamily: F.body, fontSize: 14.5, color: T.ink, minHeight: 44, borderWidth: 1, borderColor: T.ink, borderRadius: 10, padding: 8 },
  row: { flexDirection: "row", gap: 4, marginTop: 6 },
  btn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingHorizontal: 8 },
  btnText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
  done: { fontFamily: F.bodyMedium, fontSize: 13, color: T.success, marginVertical: 6 },
});
