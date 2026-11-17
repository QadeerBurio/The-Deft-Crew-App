// app/src/screens/Resume/ResumeImportReview.js — right after an upload: "we filled in X sections, please check",
// each section with its status (filled / check / empty), then into the builder at that section.
// The report comes from the server (resume.importReport); a partial import says why and what was kept.
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ResumeContext } from '../../context/ResumeContext';
import ScreenHeader from '../../ui/ScreenHeader';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../../theme/tokens';

const STATUS = {
  filled: { icon: 'checkmark-circle', tint: T.success, text: 'filled' },
  check: { icon: 'alert-circle', tint: '#8A5A00', text: 'check' },
  empty: { icon: 'ellipse-outline', tint: T.textMuted, text: 'empty' },
};

export default function ResumeImportReview() {
  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId } = route.params || {};
  const { resumes = [], currentResume } = useContext(ResumeContext);
  const resume = resumes.find((r) => r._id === resumeId) || (currentResume?._id === resumeId ? currentResume : null);
  const report = resume?.importReport || route.params?.report || {};
  const sections = Array.isArray(report.sections) ? report.sections : [];
  const filled = sections.filter((s) => s.status !== 'empty').length;
  const partial = report.status === 'partial';

  const openBuilder = (step) => navigation.replace
    ? navigation.replace('ResumeBuilder', { resumeId, step: step || 1 })
    : navigation.navigate('ResumeBuilder', { resumeId, step: step || 1 });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="check your resume" />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={M} testID="import-headline">
          {partial ? 'we filled in part of your resume' : `we filled in ${filled} section${filled === 1 ? '' : 's'}, please check`}
        </Text>
        <Text style={styles.line} maxFontSizeMultiplier={M}>
          {partial
            ? report.message || 'we couldn\'t read all of it, so we kept what we found. please fill in the rest.'
            : 'we only copied what is in your file. nothing was added or rewritten.'}
        </Text>

        {sections.map((s) => {
          const st = STATUS[s.status] || STATUS.empty;
          return (
            <TouchableOpacity
              key={s.key}
              style={styles.row}
              onPress={() => openBuilder(s.step)}
              accessibilityRole="button"
              accessibilityLabel={`${s.label}: ${st.text}. open in the builder`}
              testID={`import-${s.key}`}
            >
              <Ionicons name={st.icon} size={22} color={st.tint} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} maxFontSizeMultiplier={M}>{s.label}</Text>
                <Text style={[styles.rowSub, { color: st.tint }]} maxFontSizeMultiplier={M}>
                  {st.text}{s.count > 1 ? ` · ${s.count} items` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} onPress={() => openBuilder(1)} accessibilityRole="button" accessibilityLabel="check and continue" testID="import-continue">
          <Text style={styles.ctaText} maxFontSizeMultiplier={M}>check and continue</Text>
          <Ionicons name="arrow-forward" size={18} color={T.ink} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  body: { padding: 16, paddingBottom: 24 },
  title: { fontFamily: F.heading, fontSize: 22, color: T.ink, marginBottom: 6 },
  line: { fontFamily: F.body, fontSize: 14, color: T.textMuted, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.line, padding: 12, marginBottom: 8, minHeight: 56 },
  rowTitle: { fontFamily: F.bodySemi, fontSize: 15, color: T.ink },
  rowSub: { fontFamily: F.body, fontSize: 12.5, marginTop: 2 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.paper },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.yellow, borderRadius: 14, minHeight: 52 },
  ctaText: { fontFamily: F.bodyBold, fontSize: 16, color: T.ink },
});
