// app/src/components/ResumeStrength.js — "resume strength": one number with a line saying what it means, and
// a tap that lists exactly what is missing ("add 2 more skills", "add dates to your experience at …").
// The number is utils/resumeRules (the same file the server uses for completionPercentage).
//   <ResumeStrength resume={r} onGoTo={(step) => …} compact? dark? />
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resumeStrength } from '../utils/resumeRules';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../theme/tokens';

export const STRENGTH_LINE = 'how ready your resume is for employers. tap to see what to add.';

export default function ResumeStrength({ resume, onGoTo, compact = false, dark = false, style }) {
  const [open, setOpen] = useState(false);
  const s = resumeStrength(resume);
  const tint = s.score >= 80 ? T.success : s.score >= 50 ? '#8A5A00' : T.danger;
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.box, dark && styles.boxDark, compact && styles.boxCompact, style]}
        accessibilityRole="button"
        accessibilityLabel={`resume strength ${s.score} percent, ${s.label}. ${STRENGTH_LINE}`}
        testID="resume-strength"
      >
        <View style={styles.row}>
          <Text style={[styles.label, dark && styles.onDark]} maxFontSizeMultiplier={M}>resume strength</Text>
          <Text style={[styles.score, { color: dark ? T.yellow : tint }]} maxFontSizeMultiplier={M}>{s.score}%</Text>
        </View>
        <View style={styles.bar}><View style={[styles.fill, { width: `${s.score}%`, backgroundColor: dark ? T.yellow : tint }]} /></View>
        {!compact && <Text style={[styles.line, dark && styles.onDarkMuted]} maxFontSizeMultiplier={M}>{s.label} · {STRENGTH_LINE}</Text>}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle} accessibilityRole="header" maxFontSizeMultiplier={M}>resume strength: {s.score}%</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="close" style={styles.close}>
                <Ionicons name="close" size={24} color={T.ink} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetLine} maxFontSizeMultiplier={M}>{STRENGTH_LINE.replace(' tap to see what to add.', '')} each item below adds points.</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {s.missing.length === 0 ? (
                <Text style={styles.done} maxFontSizeMultiplier={M}>nothing missing. your resume is complete.</Text>
              ) : s.missing.map((m) => (
                <View key={m.key} style={styles.item} testID={`missing-${m.key}`}>
                  <Text style={styles.itemText} maxFontSizeMultiplier={M}>{m.text}</Text>
                  <Text style={styles.points} maxFontSizeMultiplier={M}>+{m.points}</Text>
                  {onGoTo ? (
                    <TouchableOpacity onPress={() => { setOpen(false); onGoTo(m.step, m.key, m.stepKey); }} accessibilityRole="button" accessibilityLabel={`go to field: ${m.text}`} hitSlop={6} style={styles.go}>
                      <Text style={styles.goText} maxFontSizeMultiplier={M}>go to field</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.line, padding: 12, minHeight: 44 },
  boxDark: { backgroundColor: T.inkSoft, borderColor: T.inkLine },
  boxCompact: { paddingVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
  onDark: { color: T.white },
  onDarkMuted: { color: T.onInkMuted },
  score: { fontFamily: F.heading, fontSize: 18 },
  bar: { height: 6, borderRadius: 3, backgroundColor: T.lineSoft, marginTop: 6, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  line: { fontFamily: F.body, fontSize: 11.5, color: T.textMuted, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: T.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 34 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontFamily: F.heading, fontSize: 20, color: T.ink },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sheetLine: { fontFamily: F.body, fontSize: 13, color: T.textMuted, marginBottom: 10 },
  done: { fontFamily: F.bodySemi, fontSize: 14, color: T.success, paddingVertical: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.line, gap: 8 },
  itemText: { flex: 1, fontFamily: F.body, fontSize: 14, color: T.ink },
  points: { fontFamily: F.bodySemi, fontSize: 12, color: T.textMuted },
  go: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  goText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, textDecorationLine: 'underline' },
});
