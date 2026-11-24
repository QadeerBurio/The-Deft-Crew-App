// app/src/screens/Resume/coach/StepTip.js
// P3-4b: one short tip per step, shown until dismissed (once per phone), and "see a good example": a sample for the
// student's programme, clearly labelled, never copied into the resume.
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Sheet from "../../../ui/Sheet";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import { TIPS, tipSeen, dismissTip, exampleFor } from "../../../resume/coach";

const SECTION_OF = { 3: "workExperience", 4: "projects", 6: "summary", 8: "activities", 9: "activities" };

export default function StepTip({ step, programme }) {
  const [hidden, setHidden] = useState(true);
  const [example, setExample] = useState(false);
  useEffect(() => { let live = true; setHidden(true); tipSeen(step).then((seen) => live && setHidden(seen)); return () => { live = false; }; }, [step]);
  const tip = TIPS[step];
  const ex = SECTION_OF[step] ? exampleFor(programme, SECTION_OF[step]) : "";
  if ((!tip || hidden) && !ex) return null;
  return (
    <View style={s.wrap}>
      {!!tip && !hidden && (
        <View style={s.tip}>
          <Ionicons name="bulb-outline" size={16} color={T.ink} />
          <Text style={s.tipText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{tip}</Text>
          <Pressable onPress={() => { setHidden(true); dismissTip(step); }} style={s.close} accessibilityRole="button" accessibilityLabel="hide this tip"><Ionicons name="close" size={16} color={T.textMuted} /></Pressable>
        </View>
      )}
      {!!ex && (
        <Pressable onPress={() => setExample(true)} style={s.exBtn} accessibilityRole="button" accessibilityLabel="see a good example">
          <Text style={s.exBtnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>see a good example</Text>
        </Pressable>
      )}
      <Sheet visible={example} onClose={() => setExample(false)} title="an example" scroll={false}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>example only: not added to your resume</Text>
          <Text style={s.example} maxFontSizeMultiplier={MAX_FONT_SCALE}>{ex}</Text>
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 10 },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: T.sand, borderRadius: 12, padding: 10 },
  tipText: { flex: 1, fontFamily: F.body, fontSize: 13, color: T.ink, lineHeight: 18 },
  close: { minWidth: 44, minHeight: 32, alignItems: "flex-end" },
  exBtn: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  exBtnText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink, textDecorationLine: "underline" },
  label: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted, marginBottom: 8 },
  example: { fontFamily: F.body, fontSize: 15, color: T.ink, lineHeight: 22, fontStyle: "italic" },
});
