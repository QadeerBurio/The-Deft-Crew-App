// screens/Social/SecurityAnd Access.js — security & access. Same rows and actions; design system layout.
// The old "security status: protected · 85% · strong" card was hard-coded (not read from the account), so it's gone.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Alert } from 'react-native';
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

export default function SecurityAndAccess({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      <ScreenHeader title="security & access" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={26} color={T.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>account security</Text>
            <Text style={styles.heroLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {"Manage your account's security, keep track of your usage, and monitor connected apps and active sessions."}
            </Text>
          </View>
        </View>

        <Group title="security settings">
          <ListRow
            icon="key-outline"
            title="two-factor authentication"
            meta="Add an extra layer of security to your account"
            onPress={() => Alert.alert("2FA", "Setup two-factor authentication")}
          />
          <ListRow
            icon="lock-closed-outline"
            title="change password"
            meta="Update your login credentials regularly"
            onPress={() => navigation.navigate("ChangePassword")}
          />
          <ListRow
            icon="finger-print-outline"
            title="biometric login"
            meta="Use fingerprint or face ID to login"
            onPress={() => Alert.alert("Biometric", "Setup biometric authentication")}
            divider={false}
          />
        </Group>

        <Group title="apps & sessions">
          <ListRow
            icon="phone-portrait-outline"
            title="active sessions"
            meta="See where you're currently logged in"
            onPress={() => Alert.alert("Sessions", "View active sessions")}
          />
          <ListRow
            icon="apps-outline"
            title="connected apps"
            meta="Manage apps linked to your TDC account"
            onPress={() => Alert.alert("Apps", "View connected applications")}
          />
          <ListRow
            icon="time-outline"
            title="login history"
            meta="Review your recent login activity"
            onPress={() => Alert.alert("History", "View login history")}
            divider={false}
          />
        </Group>

        <Group title="quick actions">
          <ListRow
            icon="log-out-outline"
            title="sign out all devices"
            danger
            onPress={() => Alert.alert("Sign Out", "Sign out of all devices?")}
          />
          <ListRow
            icon="warning-outline"
            title="report suspicious activity"
            onPress={() => Alert.alert("Report", "Report suspicious activity")}
            divider={false}
          />
        </Group>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={T.ink} />
          <Text style={styles.noteText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            If you notice suspicious activity, change your password immediately.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16, borderRadius: 24, backgroundColor: T.ink, marginTop: 4 },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: T.yellow, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: F.heading, fontSize: 19, color: T.white },
  heroLine: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: T.onInkMuted, marginTop: 4 },
  group: { marginTop: 20 },
  groupTitle: { fontFamily: F.heading, fontSize: 17, color: T.ink, marginBottom: 10, paddingLeft: 4 },
  card: { borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, overflow: 'hidden' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, padding: 14, borderRadius: 18, backgroundColor: T.yellowSoft },
  noteText: { flex: 1, fontFamily: F.bodyMedium, fontSize: 13.5, lineHeight: 19, color: T.ink },
});
