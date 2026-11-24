// app/src/screens/Resume/ResumeTemplate.js — pick one of the five ATS templates. Each card is the student's own
// resume in that template (the same HTML as the PDF, scaled down), so what they pick is what they get in the
// preview, the PDF and when sharing. "use this template" saves it (works offline) and opens the preview.
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { ResumeContext } from '../../context/ResumeContext';
import { renderResumeHTML, TEMPLATES, canonicalTemplate } from '../../services/templateService';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../../theme/tokens';
import ScreenHeader from '../../ui/ScreenHeader';
import useAction from '../../hooks/useAction';
import useFlag from '../../hooks/useFlag';

const CARD_W = Math.floor((Dimensions.get('window').width - 16 * 2 - 12) / 2);
const CARD_H = Math.round((CARD_W - 16) * 1.414); // A4

const ResumeTemplateScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId } = route.params || {};
  const { resumes = [], currentResume, updateResume } = useContext(ResumeContext);
  const resume = resumes.find((r) => r._id === resumeId) || (currentResume?._id === resumeId ? currentResume : null) || (!resumeId ? resumes[0] : null);
  const applied = canonicalTemplate(resume?.template);
  const [selected, setSelected] = useState(applied);

  const apply = useAction(async () => {
    if (!resume?._id) return;
    await updateResume(resume._id, { template: selected });
    navigation.navigate('ResumeView', { resumeId: resume._id });
  }, { errorTitle: 'template not saved', fallback: 'please try again.' });

  if (!resume) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="templates" />
        <View style={styles.center}><Text style={styles.muted}>open a resume first, then pick its template.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="templates" />
      <Text style={styles.intro} maxFontSizeMultiplier={M}>all five are single-column and easy for hiring software to read. this is your resume in each one.</Text>
      <ScrollView contentContainerStyle={styles.grid}>
        {TEMPLATES.map((t) => {
          const on = selected === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.card, on && styles.cardOn]}
              onPress={() => setSelected(t.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${t.name} template${applied === t.id ? ', in use' : ''}`}
              testID={`template-${t.id}`}
            >
              <View style={styles.thumb} pointerEvents="none">
                <WebView
                  originWhitelist={['*']}
                  source={{ html: renderResumeHTML(resume, t.id, resume.customStyles || {}) }}
                  scalesPageToFit
                  scrollEnabled={false}
                  style={{ width: CARD_W - 16, height: CARD_H, backgroundColor: T.white }}
                />
              </View>
              <View style={styles.cardFoot}>
                <Text style={styles.name} maxFontSizeMultiplier={M}>{t.name}</Text>
                {applied === t.id ? <Text style={styles.badge} maxFontSizeMultiplier={M}>in use</Text> : null}
                {on ? <Ionicons name="checkmark-circle" size={20} color={T.ink} /> : null}
              </View>
              <Text style={styles.desc} maxFontSizeMultiplier={M}>{t.description}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, apply.running && { opacity: 0.6 }]}
          disabled={apply.running}
          onPress={() => apply.run()}
          accessibilityRole="button"
          accessibilityLabel="use this template"
          accessibilityState={{ busy: apply.running }}
        >
          {apply.running ? <ActivityIndicator color={T.ink} /> : <Text style={styles.ctaText} maxFontSizeMultiplier={M}>use this template</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { fontFamily: F.body, fontSize: 14, color: T.textMuted, textAlign: 'center' },
  intro: { fontFamily: F.body, fontSize: 13, color: T.textMuted, paddingHorizontal: 16, paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingBottom: 24 },
  card: { width: CARD_W, backgroundColor: T.card, borderRadius: 12, borderWidth: 2, borderColor: T.line, padding: 6 },
  cardOn: { borderColor: T.ink },
  thumb: { width: CARD_W - 16, height: CARD_H, overflow: 'hidden', borderRadius: 6, borderWidth: 1, borderColor: T.lineSoft, alignSelf: 'center' },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  name: { flex: 1, fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  badge: { fontFamily: F.bodySemi, fontSize: 11, color: T.success },
  desc: { fontFamily: F.body, fontSize: 11.5, color: T.textMuted, marginTop: 2 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: T.line },
  cta: { backgroundColor: T.yellow, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: F.bodyBold, fontSize: 16, color: T.ink },
});

// P3-6: with resumeV2 + resumeTemplatesV2 on, the template studio; otherwise (and while the flags load) the picker above,
// exactly as before. Same route name and params either way. The studio is loaded only when it is shown.
export default function ResumeTemplate(props) {
  const v2 = useFlag('resumeV2');
  const studio = useFlag('resumeTemplatesV2');
  if (v2 && studio) {
    const TemplateStudio = require('./studio/TemplateStudio').default;
    return <TemplateStudio {...props} />;
  }
  return <ResumeTemplateScreen {...props} />;
}

