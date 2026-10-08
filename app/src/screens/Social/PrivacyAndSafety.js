// screens/Social/PrivacyAndSafety.js — privacy policy (Social settings). Wording unchanged; design system layout.
import React from "react";
import { Text, StyleSheet } from "react-native";
import { DocScreen, DocHero, DocCard } from "../../ui/DocPage";
import { color as T, font as F } from "../../theme/tokens";

const privacyData = [
  { num: '01', title: 'Information We Collect', text: '• Name, email, phone number\n• Profile information & preferences\n• Content you create or share\n• Device & usage data' },
  { num: '02', title: 'How We Use Data', text: '• Provide & improve services\n• Personalize experience\n• Send updates & promotions\n• Prevent fraud' },
  { num: '03', title: 'Information Sharing', text: '• No selling of data\n• Shared with service providers\n• When required by law\n• With your consent' },
  { num: '04', title: 'Data Security', text: 'We implement strong security measures to protect your data. However, no method is 100% secure.' },
  { num: '05', title: 'Your Rights', text: '• Access & update data\n• Request deletion\n• Opt-out of marketing\n• Withdraw consent' },
  { num: '06', title: 'Cookies', text: 'We use cookies to enhance experience, analyze usage, and deliver personalized content.' },
  { num: '07', title: 'Data Retention', text: 'We retain data as long as necessary for services, legal obligations, and dispute resolution.' },
  { num: '08', title: "Children's Privacy", text: 'Services not for under 13. We do not knowingly collect data from children.' },
  { num: '09', title: 'Policy Changes', text: 'We may update this policy. Changes will be posted here with updated date.' },
  { num: '10', title: 'Contact Us', text: 'privacy@thedeftcrew.com\nKarachi, Pakistan' },
];
export default function PrivacyScreen({ navigation }) {
  return (
    <DocScreen title="privacy policy" onBack={() => navigation.goBack()}>
      <DocHero title="privacy policy" line="Your data is safe with us" />
      <Text style={styles.spacer} />
      {privacyData.map((item) => (
        <DocCard
          key={item.num}
          iconNode={<Text style={styles.num}>{item.num}</Text>}
          title={item.title}
          body={item.text}
        />
      ))}
      {/* the old "updated <date>" came from the phone clock, so only the version is shown */}
      <Text style={styles.version}>v2.0</Text>
    </DocScreen>
  );
}

const styles = StyleSheet.create({
  spacer: { height: 12 },
  num: { fontFamily: F.heading, fontSize: 15, color: T.ink },
  version: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, textAlign: "center", marginTop: 20 },
});
