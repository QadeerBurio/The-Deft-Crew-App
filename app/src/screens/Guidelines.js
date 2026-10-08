// screens/CommunityGuidelinesScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const C = {
  bg: '#ffffff',
  dark: '#1a1a1a',
  gold: '#f9c349',
  goldSoft: '#fff8e6',
  surface: '#F7F9F8',
  border: '#E8E8E8',
  divider: '#f2f2f2',
  muted: '#8a8a8a',
  secondary: '#5f5f5f',
  danger: '#e11d48',
};

const STEPS = ['terms', 'guidelines', 'sign in'];

const PROHIBITED = [
  'Harassment or bullying',
  'Hate speech',
  'Threats',
  'Sexual or explicit content',
  'Violence',
  'Spam',
  'Scams or fraudulent content',
  'Impersonation',
  'Illegal content',
  'Abusive behavior',
];

const MODERATION = [
  { icon: 'flag-outline', text: 'Users can report content or block other users' },
  { icon: 'eye-outline', text: 'Reported content is reviewed by our moderation team' },
  { icon: 'trash-outline', text: 'Content violating these rules may be removed' },
  { icon: 'ban-outline', text: 'Accounts may be suspended or permanently banned' },
];

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

export default function CommunityGuidelinesScreen({ navigation }) {
  const [agreed, setAgreed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleContinue = () => {
    if (agreed) {
      setModalVisible(true);
    }
  };

  const handleModalConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Mark that user has accepted guidelines
      await AsyncStorage.setItem("guidelinesAccepted", "true");
      // Also mark onboarding as complete for backward compatibility
      await AsyncStorage.setItem("onboardingComplete", "true");
      setModalVisible(false);
      // Navigate to Login screen
      navigation.replace('Login');
    } catch (e) {
      console.log('Error saving guidelines status:', e);
      setModalVisible(false);
      navigation.replace('Login');
    }
  };

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

      <StepBar active={1} />

      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconTile}>
            <Ionicons name="people" size={26} color={C.gold} />
          </View>
          <Text style={styles.title}>community guidelines</Text>
          <Text style={styles.subtitle}>
            tdc is committed to creating a safe, inclusive, and respectful environment for all users.
            We do not tolerate any form of harmful behavior.
          </Text>

          <View style={styles.chip}>
            <Ionicons name="heart-outline" size={16} color={C.dark} />
            <Text style={styles.chipText}>Keeping our community safe and respectful</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.smallTile}>
                <Ionicons name="hand-left" size={14} color={C.gold} />
              </View>
              <Text style={styles.cardTitle}>We do not tolerate</Text>
            </View>
            <View style={styles.tagWrap}>
              {PROHIBITED.map((t) => (
                <View key={t} style={styles.tag}>
                  <Ionicons name="close" size={13} color={C.danger} />
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.smallTile}>
                <Ionicons name="flag" size={14} color={C.gold} />
              </View>
              <Text style={styles.cardTitle}>Reporting & Moderation</Text>
            </View>
            {MODERATION.map((m, i) => (
              <View key={m.text} style={[styles.modRow, i === MODERATION.length - 1 && styles.modRowLast]}>
                <Ionicons name={m.icon} size={18} color={C.dark} />
                <Text style={styles.bodyText}>{m.text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.version}>
            v1.0 · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Text>
        </ScrollView>
      </Animated.View>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed && <Ionicons name="checkmark" size={15} color={C.gold} />}
          </View>
          <Text style={styles.checkText}>
            I have read and agree to follow the <Text style={styles.bold}>Community Guidelines</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, !agreed && styles.primaryBtnDisabled]}
          onPress={handleContinue}
          disabled={!agreed}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={C.gold} />
        </TouchableOpacity>
      </SafeAreaView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.iconTile}>
              <Ionicons name="checkmark-circle" size={26} color={C.gold} />
            </View>
            <Text style={styles.modalTitle}>you're all set</Text>
            <Text style={styles.modalText}>
              Thanks for reading the Community Guidelines. Sign in to get started.
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, styles.modalBtn, saving && styles.primaryBtnDisabled]}
              onPress={handleModalConfirm}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color={C.gold} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => setModalVisible(false)}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.ghostText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 12,
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
    fontWeight: '900',
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
    backgroundColor: '#ededed',
  },
  stepBarOn: {
    backgroundColor: C.dark,
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#b0b0b0',
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
    fontWeight: '900',
    letterSpacing: -0.6,
    color: C.dark,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14.5,
    color: C.secondary,
    lineHeight: 21,
  },
  chip: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.goldSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: C.dark,
  },
  card: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#efefef',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  smallTile: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: C.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '900',
    color: C.dark,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.dark,
  },
  modRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  modRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  bodyText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
  },
  version: {
    textAlign: 'center',
    color: C.muted,
    fontSize: 11,
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
    borderColor: '#cfcfcf',
    backgroundColor: '#ffffff',
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
    fontSize: 13.5,
    color: C.secondary,
    lineHeight: 19,
  },
  bold: {
    fontWeight: '800',
    color: C.dark,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: C.dark,
  },
  modalText: {
    marginTop: 6,
    fontSize: 14.5,
    color: C.secondary,
    lineHeight: 21,
    textAlign: 'center',
  },
  modalBtn: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
  ghostBtn: {
    alignSelf: 'stretch',
    height: 48,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.dark,
  },
});
