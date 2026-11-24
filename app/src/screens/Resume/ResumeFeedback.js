// app/src/screens/Resume/ResumeFeedback.js
// P3d (plan P3-7, flags resumeV2 + resumeFeedback): recruiter-style feedback on one resume: what works, what to fix,
// next steps. The rules part is instant and the same for everyone; one AI pass adds points from the resume's own
// text (never an invented number). Each next step has "fix it", which opens the builder at that section.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../../ui/ScreenHeader';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Skeleton from '../../ui/Skeleton';
import { color as T, font as F, MAX_FONT_SCALE as M } from '../../theme/tokens';
import { getFeedback } from '../../resume/finishApi';
import { KEY_TO_ID } from '../../resume/resumeV2';
import { funnel } from '../../analytics/funnel';

const SECTIONS = [
  ['strong', 'what works', 'checkmark-circle', T.success],
  ['weak', 'what to fix', 'alert-circle', T.danger],
  ['improvements', 'next steps', 'arrow-forward-circle', T.ink],
];

export default function ResumeFeedback() {
  const navigation = useNavigation();
  const { resumeId } = useRoute().params || {};
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  const load = useCallback(async () => {
    setState({ loading: true, data: null, error: '' });
    try {
      const data = await getFeedback(resumeId);
      setState({ loading: false, data, error: '' });
    } catch (e) {
      const status = e?.response?.status;
      setState({ loading: false, data: null, error: status === 429 ? 'you\'ve asked for a lot of help this hour. try again a little later.' : 'feedback didn\'t load. check your connection and try again.' });
    }
  }, [resumeId]);
  useEffect(() => { funnel('resume_feedback_opened', { refId: String(resumeId || '') }); load(); }, [load, resumeId]);

  const fix = (item) => {
    funnel(`resume_feedback_fix_${item.stepKey}`, { refId: String(resumeId || '') });
    const id = KEY_TO_ID[item.stepKey];
    // step (1-7) for the builder's older param; stepKey opens the fresher steps too
    navigation.navigate('ResumeBuilder', { resumeId, stepKey: item.stepKey, ...(id <= 7 ? { step: id } : {}) });
  };

  const { loading, data, error } = state;
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="feedback" />
      <ScrollView contentContainerStyle={s.body}>
        {loading && (
          <View accessibilityLabel="loading your feedback">
            <Text style={s.lead} maxFontSizeMultiplier={M}>reading your resume like a recruiter…</Text>
            <Skeleton rows={3} height={96} />
          </View>
        )}
        {!!error && (
          <Card>
            <Text style={s.item} maxFontSizeMultiplier={M} accessibilityLiveRegion="polite">{error}</Text>
            <Button title="try again" variant="secondary" onPress={load} style={{ marginTop: 12 }} />
          </Card>
        )}
        {data && (
          <>
            <Text style={s.lead} maxFontSizeMultiplier={M}>
              {data.ai ? 'here\'s how a recruiter would read it.' : 'a quick check from the rules. the detailed review is busy right now: try again later for more.'}
            </Text>
            {SECTIONS.map(([key, title, icon, tint]) => {
              const items = Array.isArray(data[key]) ? data[key] : [];
              if (!items.length) return null;
              return (
                <Card key={key} style={s.card}>
                  <Text style={s.h} accessibilityRole="header" maxFontSizeMultiplier={M}>{title}</Text>
                  {items.map((it, i) => (
                    <View key={`${key}-${i}`} style={s.row}>
                      <Ionicons name={icon} size={18} color={tint} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.item} maxFontSizeMultiplier={M}>{it.text}</Text>
                        {key !== 'strong' && it.stepKey && KEY_TO_ID[it.stepKey] ? (
                          <Button title="fix it" size="small" variant="secondary" full={false} onPress={() => fix(it)} style={{ marginTop: 6 }} accessibilityLabel={`fix it: ${it.text}`} />
                        ) : null}
                      </View>
                    </View>
                  ))}
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  body: { padding: 16, paddingBottom: 32, gap: 12 },
  lead: { fontFamily: F.body, fontSize: 14, color: T.textMuted, marginBottom: 4 },
  card: { gap: 10 },
  h: { fontFamily: F.bodyBold, fontSize: 16, color: T.ink, marginBottom: 2 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  item: { fontFamily: F.body, fontSize: 14.5, lineHeight: 20, color: T.ink },
});
