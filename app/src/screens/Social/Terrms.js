// screens/Social/Terrms.js — Terms & Conditions (Social settings). Wording unchanged; design system layout.
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { DocScreen, DocHero, DocCard } from '../../ui/DocPage';
import { color as T, font as F } from '../../theme/tokens';

const termsData = [
  { num: '01', title: 'Acceptance of Terms', text: 'By using The Deft Crew (TDC) application, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, please do not use our services.' },
  { num: '02', title: 'User Account', text: '• Must be 13+ years old\n• Maintain account confidentiality\n• Provide accurate information\n• Responsible for all account activity' },
  { num: '03', title: 'User-Generated Content', text: '• You retain ownership of content\n• Grant TDC license to use content\n• No content violating guidelines\n• TDC may remove violating content' },
  { num: '04', title: 'Intellectual Property', text: '• Content protected by copyright\n• No reproduction without permission\n• TDC trademarks are property of The Deft Crew' },
  { num: '05', title: 'Limitation of Liability', text: 'TDC is provided "as is" without warranties. We are not liable for any damages arising from use of our services.' },
  { num: '06', title: 'Termination', text: 'We reserve the right to terminate or suspend your account for violations of these terms or Community Guidelines.' },
  { num: '07', title: 'Changes to Terms', text: 'TDC may update these terms at any time. You will be notified of significant changes.' },
  { num: '08', title: 'Contact', text: 'support@thedeftcrew.com\nKarachi, Pakistan' },
  { num: '09', title: 'Governing Law', text: 'These terms are governed by the laws of Pakistan. Disputes resolved in Karachi, Pakistan.' },
];

export default function TermsScreen({ navigation }) {
  return (
    <DocScreen title="Terms & Conditions" onBack={() => navigation.goBack()}>
      <DocHero title="Terms & Conditions" line="Please review before continuing" />
      <Text style={styles.spacer} />
      {termsData.map((item) => (
        <DocCard
          key={item.num}
          iconNode={<Text style={styles.num}>{item.num}</Text>}
          title={item.title}
          body={item.text}
        />
      ))}
    </DocScreen>
  );
}

const styles = StyleSheet.create({
  spacer: { height: 12 },
  num: { fontFamily: F.heading, fontSize: 15, color: T.ink },
  version: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, textAlign: 'center', marginTop: 20 },
});
