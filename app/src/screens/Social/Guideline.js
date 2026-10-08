// screens/Social/Guideline.js — Community Guidelines (Social settings). Wording unchanged; design system layout.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DocScreen, DocHero, DocSection, DocCard } from '../../ui/DocPage';
import { color as T, font as F, MAX_FONT_SCALE } from '../../theme/tokens';

const guidelines = [
  { icon: 'heart-outline', title: 'Be Respectful', desc: 'Treat everyone with kindness. No harassment, bullying, or discrimination.' },
  { icon: 'shield-checkmark-outline', title: 'Be Authentic', desc: 'Share genuine content. No impersonation or misinformation.' },
  { icon: 'lock-closed-outline', title: 'Protect Privacy', desc: "Respect others' privacy. Don't share personal info without consent." },
  { icon: 'alert-circle-outline', title: 'No Harmful Content', desc: 'No violence, self-harm, or illegal activities.' },
  { icon: 'document-text-outline', title: 'Respect Copyright', desc: 'Share only content you have rights to. Give proper credit.' },
  { icon: 'chatbubbles-outline', title: 'Be Constructive', desc: 'Engage positively. Respect different viewpoints.' },
  { icon: 'megaphone-outline', title: 'No Spam', desc: 'Post meaningful content. No spam or manipulation.' },
  { icon: 'flag-outline', title: 'Report Violations', desc: 'Help keep our community safe. Report violations.' },
];

const prohibited = [
  'Harassment & Bullying',
  'Hate Speech',
  'Threats & Intimidation',
  'Explicit Content',
  'Violence',
  'Spam',
  'Scams',
  'Impersonation',
  'Illegal Activities',
];

const ion = (name) => <Ionicons name={name} size={19} color={T.ink} />;

export default function CommunityGuidelinesScreen({ navigation }) {
  return (
    <DocScreen title="Guidelines" onBack={() => navigation.goBack()}>
      <DocHero title="Community Guidelines" line="Keeping TDC safe and respectful">
        <Text style={styles.intro} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          tdc<Text style={{ color: T.yellow }}>.</Text>{" is for everyone. Treat people with respect. Harmful behaviour isn't allowed here."}
        </Text>
      </DocHero>

      <DocSection title="Our Guidelines" />
      {guidelines.map((g) => (
        <DocCard key={g.title} iconNode={ion(g.icon)} title={g.title} body={g.desc} />
      ))}

      <DocSection title="Not Tolerated" />
      <View style={styles.card}>
        <View style={styles.grid}>
          {prohibited.map((p) => (
            <View key={p} style={styles.pill}>
              <View style={styles.pillDot} />
              <Text style={styles.pillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{p}</Text>
            </View>
          ))}
        </View>
      </View>

      <DocSection title="Moderation" />
      <DocCard iconNode={ion('flag-outline')}>
        <Text style={styles.modText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          <Text style={styles.strong}>Report</Text> content or
          <Text style={styles.strong}> block</Text> users
        </Text>
      </DocCard>
      <DocCard iconNode={ion('shield-outline')}>
        <Text style={styles.modText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          Violations may result in <Text style={styles.strong}>removal</Text>,{' '}
          <Text style={styles.strong}>suspension</Text>, or{' '}
          <Text style={styles.strong}>ban</Text>
        </Text>
      </DocCard>

    </DocScreen>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: F.bodyMedium, fontSize: 14, lineHeight: 20, color: T.white, marginTop: 12 },
  card: { borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, padding: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: T.dangerBg },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.danger },
  pillText: { fontFamily: F.bodySemi, fontSize: 13, color: T.danger },
  modText: { fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: T.ink, marginTop: 9 },
  strong: { fontFamily: F.bodyBold },
  version: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, textAlign: 'center', marginTop: 20 },
});
