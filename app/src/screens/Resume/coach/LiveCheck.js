// app/src/screens/Resume/coach/LiveCheck.js
// P3-4b live checks: under a field, a short hint with a one-tap fix (starts with "I", no verb, tense, too long,
// vague words, spelling, an informal e-mail, the phone in +92 format, a missing LinkedIn). Asked 0.7 s after the
// student stops typing; the server caches spelling by text. Advice only: nothing changes unless "fix" is tapped.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import { checkField } from "../../../resume/coach";

export const DEBOUNCE_MS = 700;

export default function LiveCheck({ field, text, current, onFix, max = 2 }) {
  const [issues, setIssues] = useState([]);
  const seq = useRef(0);
  useEffect(() => {
    const value = String(text || "");
    if (field !== "linkedin" && value.trim().length < 3) { setIssues([]); return undefined; }
    const n = ++seq.current;
    const t = setTimeout(() => {
      checkField(field, value, current).then((list) => { if (n === seq.current) setIssues(list); }).catch(() => {});
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [field, text, current]);
  if (!issues.length) return null;
  return (
    <View style={s.wrap} accessibilityLiveRegion="polite">
      {issues.slice(0, max).map((i) => (
        <View key={`${i.code}:${i.message}`} style={s.row}>
          <View style={s.line} />
          <Text style={s.text} maxFontSizeMultiplier={MAX_FONT_SCALE}>{i.message}</Text>
          {i.fix != null && onFix && (
            <Pressable onPress={() => { onFix(i.fix); setIssues((l) => l.filter((x) => x !== i)); }} style={s.fix} accessibilityRole="button" accessibilityLabel={`fix: ${i.message}`}>
              <Text style={s.fixText} maxFontSizeMultiplier={MAX_FONT_SCALE}>fix</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: -6, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32 },
  line: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: "#E0A100" },
  text: { flex: 1, fontFamily: F.body, fontSize: 12.5, color: T.textMuted },
  fix: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  fixText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, textDecorationLine: "underline" },
});
