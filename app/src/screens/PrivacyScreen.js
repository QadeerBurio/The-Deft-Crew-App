// screens/TermsScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { color as T, font as F } from "../theme/tokens";
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const C = {
  bg: T.paper,
  dark: T.ink,
  gold: T.yellow,
  goldSoft: T.yellowSoft,
  surface: T.sand,
  border: T.line,
  divider: T.line,
  muted: T.textFaint,
  secondary: T.textMuted,
};

const STEPS = ['terms', 'guidelines', 'sign in'];

const TERMS = [
  { icon: 'checkmark-done-outline', title: 'Acceptance of Terms', text: 'By using tdc application, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, please do not use our services.' },
  { icon: 'person-outline', title: 'User Account', points: ['Must be 13+ years old', 'Maintain account confidentiality', 'Provide accurate information', 'Responsible for all account activity'] },
  { icon: 'create-outline', title: 'User-Generated Content', points: ['You retain ownership of content', 'Grant tdc license to use content', 'No content violating guidelines', 'TDC may remove violating content'] },
  { icon: 'ribbon-outline', title: 'Intellectual Property', points: ['Content protected by copyright', 'No reproduction without permission', 'tdc trademarks are property of The Deft Crew'] },
  { icon: 'warning-outline', title: 'Limitation of Liability', text: 'tdc is provided "as is" without warranties. We are not liable for any damages arising from use of our services.' },
  { icon: 'close-circle-outline', title: 'Termination', text: 'We reserve the right to terminate or suspend your account for violations of these terms or Community Guidelines.' },
  { icon: 'refresh-outline', title: 'Changes to Terms', text: 'tdc may update these terms at any time. You will be notified of significant changes.' },
  { icon: 'mail-outline', title: 'Contact', text: 'support@gettdc.pk\nPakistan' },
  { icon: 'business-outline', title: 'Governing Law', text: 'These terms are governed by the laws of Pakistan. Disputes resolved in Karachi, Pakistan.' },
];

const PRIVACY = [
  { icon: 'folder-open-outline', title: 'Information We Collect', points: ['Name, email, phone number', 'Profile information & preferences', 'Content you create or share', 'Device & usage data'] },
  { icon: 'sparkles-outline', title: 'How We Use Data', points: ['Provide & improve services', 'Personalize experience', 'Send updates & promotions', 'Prevent fraud'] },
  { icon: 'share-social-outline', title: 'Information Sharing', points: ['No selling of data', 'Shared with service providers', 'When required by law', 'With your consent'] },
  { icon: 'lock-closed-outline', title: 'Data Security', text: 'We implement strong security measures to protect your data. However, no method is 100% secure.' },
  { icon: 'hand-left-outline', title: 'Your Rights', points: ['Access & update data', 'Request deletion', 'Opt-out of marketing', 'Withdraw consent'] },
  { icon: 'analytics-outline', title: 'Cookies', text: 'We use cookies to enhance experience, analyze usage, and deliver personalized content.' },
  { icon: 'time-outline', title: 'Data Retention', text: 'We retain data as long as necessary for services, legal obligations, and dispute resolution.' },
  { icon: 'happy-outline', title: "Children's Privacy", text: 'Services not for under 13. We do not knowingly collect data from children.' },
  { icon: 'refresh-outline', title: 'Policy Changes', text: 'We may update this policy. Changes will be posted here with updated date.' },
  { icon: 'mail-outline', title: 'Contact Us', text: 'privacy@thedeftcrew.com\nKarachi, Pakistan' },
];

const HIGHLIGHTS = {
  terms: [
    { icon: 'person-outline', text: 'You need to be 13 or older' },
    { icon: 'create-outline', text: 'Your content stays yours' },
  ],
  privacy: [
    { icon: 'shield-checkmark-outline', text: 'We never sell your data' },
    { icon: 'trash-outline', text: 'You can ask us to delete it anytime' },
  ],
};

function StepBar({ active }) {
  return (
    <View style={styles.steps}>
      {STEPS.map((label, i) => {
        const on = i <= active;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepBar, on && styles.stepBarOn]} />
            <Text style={[styles.stepLabel, i === active && styles.stepLabelOn]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function AccordionRow({ item, open, onToggle, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <TouchableOpacity style={styles.rowHead} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.rowIcon}>
          <Ionicons name={item.icon} size={14} color={C.gold} />
        </View>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.rowBody}>
          {item.text ? <Text style={styles.bodyText}>{item.text}</Text> : null}
          {item.points
            ? item.points.map((p) => (
                <View key={p} style={styles.point}>
                  <View style={styles.pointDot} />
                  <Text style={styles.bodyText}>{p}</Text>
                </View>
              ))
            : null}
        </View>
      )}
    </View>
  );
}

export default function TermsScreen({ navigation }) {
  const [checking, setChecking] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [activeTab, setActiveTab] = useState('terms');
  const [openIndex, setOpenIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkLaunchStatus();
  }, []);

  useEffect(() => {
    if (!checking) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [checking]);

  const checkLaunchStatus = async () => {
    try {
      const termsAccepted = await AsyncStorage.getItem("termsAccepted");
      if (termsAccepted === "true") {
        // User already accepted terms, skip to guidelines if not completed
        const guidelinesAccepted = await AsyncStorage.getItem("guidelinesAccepted");
        if (guidelinesAccepted === "true") {
          // Both accepted, go directly to Login
          navigation.replace('Login');
        } else {
          // Go to guidelines
          navigation.replace('CommunityGuidelines');
        }
        return;
      }
    } catch (e) {
      console.log('Error checking launch status:', e);
    }
    setChecking(false);
  };

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setOpenIndex(0);
  };

  const toggleRow = (i) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(160, 'easeInEaseOut', 'opacity'));
    setOpenIndex((cur) => (cur === i ? -1 : i));
  };

  const handleContinue = async () => {
    if (!agreed || saving) return;
    setSaving(true);
    try {
      // Save that user accepted terms
      await AsyncStorage.setItem("termsAccepted", "true");
      // Navigate to Community Guidelines
      navigation.replace('CommunityGuidelines');
    } catch (e) {
      console.log('Error saving terms status:', e);
      navigation.replace('CommunityGuidelines');
    }
  };

  if (checking) {
    return <View style={styles.blank} />;
  }

  const items = activeTab === 'terms' ? TERMS : PRIVACY;
  const canGoBack = navigation.canGoBack && navigation.canGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={C.dark} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text style={styles.brand}>
          tdc<Text style={styles.brandDot}>.</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <StepBar active={0} />

      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconTile}>
            <Ionicons name="document-text" size={26} color={C.gold} />
          </View>
          <Text style={styles.title}>the fine print</Text>
          <Text style={styles.subtitle}>
            A quick read on how tdc works and how we look after your data. Tap any section to open it.
          </Text>

          <View style={styles.segment}>
            {[
              { key: 'terms', label: 'terms', icon: 'document-text-outline' },
              { key: 'privacy', label: 'privacy', icon: 'shield-outline' },
            ].map((t) => {
              const on = activeTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.segmentBtn, on && styles.segmentBtnOn]}
                  onPress={() => switchTab(t.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={t.icon} size={16} color={on ? C.gold : C.muted} />
                  <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.highlights}>
            {HIGHLIGHTS[activeTab].map((h) => (
              <View key={h.text} style={styles.chip}>
                <Ionicons name={h.icon} size={16} color={C.dark} />
                <Text style={styles.chipText}>{h.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            {items.map((item, i) => (
              <AccordionRow
                key={`${activeTab}-${item.title}`}
                item={item}
                open={openIndex === i}
                onToggle={() => toggleRow(i)}
                last={i === items.length - 1}
              />
            ))}
          </View>

        </ScrollView>
      </Animated.View>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed && <Ionicons name="checkmark" size={15} color={C.gold} />}
          </View>
          <Text style={styles.checkText}>
            I have read and agree to the <Text style={styles.bold}>Terms</Text>,{' '}
            <Text style={styles.bold}>Privacy Policy</Text> and{' '}
            <Text style={styles.bold}>Community Guidelines</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, (!agreed || saving) && styles.primaryBtnDisabled]}
          onPress={handleContinue}
          disabled={!agreed || saving}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={C.gold} />
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  brand: {
    fontSize: 22,
    fontFamily: F.heading,
    letterSpacing: -0.5,
    color: C.dark,
  },
  brandDot: {
    color: C.gold,
  },
  steps: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  stepItem: {
    flex: 1,
  },
  stepBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: T.sand,
  },
  stepBarOn: {
    backgroundColor: C.dark,
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: F.bodyBold,
    color: T.textFaint,
  },
  stepLabelOn: {
    color: C.dark,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: F.heading,
    letterSpacing: -0.6,
    color: C.dark,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14.5, fontFamily: F.body,
    color: C.secondary,
    lineHeight: 21,
  },
  segment: {
    flexDirection: 'row',
    marginTop: 20,
    padding: 4,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  segmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentBtnOn: {
    backgroundColor: C.dark,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: C.muted,
  },
  segmentTextOn: {
    color: T.white,
  },
  highlights: {
    marginTop: 14,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.goldSoft,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: F.bodyBold,
    color: C.dark,
  },
  card: {
    marginTop: 14,
    backgroundColor: T.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.line,
    paddingHorizontal: 16,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: C.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    flex: 1,
    fontSize: 15.5,
    fontFamily: F.bodyBold,
    color: C.dark,
  },
  rowBody: {
    paddingLeft: 40,
    paddingBottom: 14,
    gap: 6,
  },
  bodyText: {
    flex: 1,
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    lineHeight: 21,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pointDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.gold,
    marginTop: 8,
    marginRight: 10,
  },
  version: {
    textAlign: 'center',
    color: C.muted,
    fontSize: 11, fontFamily: F.body,
    marginTop: 18,
  },
  bottomBar: {
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: T.textFaint,
    backgroundColor: T.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxOn: {
    backgroundColor: C.dark,
    borderColor: C.dark,
  },
  checkText: {
    flex: 1,
    fontSize: 13.5, fontFamily: F.body,
    color: C.secondary,
    lineHeight: 19,
  },
  bold: {
    fontFamily: F.bodyBold,
    color: C.dark,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: C.dark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryText: {
    color: T.white,
    fontSize: 16,
    fontFamily: F.bodyBold,
  },
});
