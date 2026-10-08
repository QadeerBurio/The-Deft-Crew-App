// screens/Social/AccessibilityDisplay.js — display & languages. Same rows; design system layout.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, ListRow } from '../../ui';
import { color as T, font as F, MAX_FONT_SCALE } from '../../theme/tokens';

const Group = ({ title, children }) => (
  <View style={styles.group}>
    <Text style={styles.groupTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

export default function AccessibilityDisplay({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      <ScreenHeader title="display & languages" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="color-palette-outline" size={24} color={T.ink} />
          </View>
          <Text style={styles.introText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Manage how TDC looks to you and select your preferred language settings.
          </Text>
        </View>

        <Group title="appearance">
          <ListRow icon="moon-outline" title="display" meta="Manage Dark Mode, Light Mode, and contrast." onPress={() => {}} />
          <ListRow icon="text-outline" title="text size" meta="Adjust the font size for better readability." onPress={() => {}} divider={false} />
        </Group>

        <Group title="localization">
          <ListRow icon="language-outline" title="languages" meta="Choose your primary language for TDC." onPress={() => {}} />
          <ListRow icon="globe-outline" title="region" meta="Set your preferred regional formats." onPress={() => {}} divider={false} />
        </Group>

        <Text style={styles.footer} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          These settings affect your experience on this device only.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginTop: 4 },
  introIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  introText: { flex: 1, fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.textMuted },
  group: { marginTop: 20 },
  groupTitle: { fontFamily: F.heading, fontSize: 17, color: T.ink, marginBottom: 10, paddingLeft: 4 },
  card: { borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, overflow: 'hidden' },
  footer: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, textAlign: 'center', marginTop: 20 },
});
