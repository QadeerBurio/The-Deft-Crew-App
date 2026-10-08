// screens/CreateOfferScreen.js
import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// works on Android edge-to-edge too (the app is wrapped in KeyboardProvider)
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createSkillOffer } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { goToAuth } from '../../utils/goToAuth';

import { color as T, font as F } from "../../theme/tokens";
import ScreenHeader from "../../ui/ScreenHeader";
const BRAND = T.yellow;
const INK = T.ink;
const MUTED = T.textMuted;
const BORDER = T.line;

const MESSAGE_MAX = 500;

export default function CreateOfferScreen({ route, navigation }) {
  const { getCurrentUserId, isGuest, setIsGuest } = useContext(AuthContext);
  const { listing = {} } = route.params || {};
  const insets = useSafeAreaInsets();
  const submittingRef = useRef(false);

  const [message, setMessage] = useState('');
  const [offeredSkillName, setOfferedSkillName] = useState('');
  const [offeredSkillLevel, setOfferedSkillLevel] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [applicationNotes, setApplicationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isBarter = listing.type === 'barter';
  const isJob = listing.type === 'job';
  const isPaid = listing.type === 'paid';

  const typeLabel = isBarter ? 'Exchange' : isJob ? 'Hire' : 'Paid Service';
  const typeIcon = isBarter ? 'swap-horizontal' : isJob ? 'briefcase' : 'cash';
  const submitLabel = isBarter ? 'Propose Exchange' : isJob ? 'Submit Application' : 'Submit Offer';
  const messagePlaceholder = isBarter
    ? 'Write a message to the listing owner about your proposed trade...'
    : isJob
    ? 'Any additional info you want to add...'
    : 'Write a message to the listing owner detailing your approach...';

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DashboardMain');
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    const userId = getCurrentUserId();
    if (!userId || isGuest) {
      Alert.alert('Login Required', 'Please login to make an offer', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => goToAuth(setIsGuest) },
      ]);
      return;
    }

    if (isBarter && !offeredSkillName.trim()) {
      Alert.alert('Error', 'Please enter the skill you want to offer');
      return;
    }

    if (isBarter && !offeredSkillLevel) {
      Alert.alert('Error', 'Please select your skill level');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please include a message with your offer');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const payload = {
        listingId: listing._id,
        message: message.trim(),
      };

      if (isBarter) {
        payload.offeredSkillName = offeredSkillName.trim();
        payload.offeredSkillLevel = offeredSkillLevel;
      }

      if (isPaid) {
        const price = parseFloat(proposedPrice);
        if (isNaN(price) || price < 0) {
          Alert.alert('Error', 'Please enter a valid price');
          return;
        }
        payload.proposedPrice = price;
      }

      if (isJob) {
        payload.applicationNotes = applicationNotes.trim();
      }

      await createSkillOffer(payload);

      Alert.alert('Success!', 'Your offer has been submitted successfully!', [
        { text: 'OK', onPress: goBack },
      ], { cancelable: false });
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to submit offer';
      Alert.alert('Error', errorMsg);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const renderLevelChips = (currentLevel, setLevel) => {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    return (
      <View style={styles.chipRow}>
        {levels.map((level) => {
          const active = currentLevel === level;
          return (
            <TouchableOpacity
              key={level}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setLevel(level)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <ScreenHeader title="submit offer" onBack={goBack} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 30 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Listing Info Card */}
          <View style={styles.card}>
            <View style={styles.listingRow}>
              <View style={styles.listingIconBox}>
                <Ionicons name={typeIcon} size={22} color={INK} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>{typeLabel}</Text>
                </View>
                <Text style={styles.listingTitle}>{listing.title || 'Listing'}</Text>
              </View>
            </View>
            <Text style={styles.listingSubtext}>responding to listing request</Text>
          </View>

          {/* Offer Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>
              {isBarter ? 'Propose Your Trade' : isJob ? 'Your Application' : 'Make Your Offer'}
            </Text>
            <View style={styles.formDivider} />

            {isBarter && (
              <>
                <Text style={styles.label}>your skill</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={MUTED} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="What skill are you offering?"
                    placeholderTextColor={T.textFaint}
                    value={offeredSkillName}
                    onChangeText={setOfferedSkillName}
                  />
                </View>

                <Text style={[styles.label, { marginTop: 16 }]}>your level</Text>
                {renderLevelChips(offeredSkillLevel, setOfferedSkillLevel)}
              </>
            )}

            {isPaid && (
              <>
                <Text style={styles.label}>proposed price</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.pricePrefix}>rs.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    placeholderTextColor={T.textFaint}
                    keyboardType="numeric"
                    value={proposedPrice}
                    onChangeText={setProposedPrice}
                  />
                </View>
              </>
            )}

            {isJob && (
              <>
                <Text style={styles.label}>why you're a good fit</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your experience and qualifications..."
                  placeholderTextColor={T.textFaint}
                  multiline
                  numberOfLines={4}
                  value={applicationNotes}
                  onChangeText={setApplicationNotes}
                  maxLength={MESSAGE_MAX}
                />
              </>
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>your message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={messagePlaceholder}
              placeholderTextColor={T.textFaint}
              multiline
              numberOfLines={5}
              value={message}
              onChangeText={setMessage}
              maxLength={MESSAGE_MAX}
            />
            <Text style={styles.charCount}>{message.length}/{MESSAGE_MAX}</Text>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={INK} size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>{submitLabel}</Text>
                  <Ionicons name="arrow-forward" size={18} color={INK} />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.termsText}>By submitting, you agree to the Terms of Service.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },

  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
    backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.line,
  },
  topHeaderTitle: { fontSize: 20, fontFamily: F.headingBold, color: INK },

  content: { padding: 20, paddingBottom: 30 },

  card: {
    backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 18, marginBottom: 16,
  },

  listingRow: { flexDirection: 'row', gap: 14 },
  listingIconBox: {
    width: 54, height: 54, borderRadius: 14, backgroundColor: T.sand,
    justifyContent: 'center', alignItems: 'center',
  },
  typePill: {
    alignSelf: 'flex-start', backgroundColor: T.yellowSoft,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginBottom: 6,
  },
  typePillText: { fontSize: 12, fontFamily: F.bodyBold, color: T.ink },
  listingTitle: { fontSize: 19, fontFamily: F.heading, color: INK, lineHeight: 24 },
  listingSubtext: { fontSize: 13, fontFamily: F.body, color: MUTED, marginTop: 12 },

  formTitle: { fontSize: 19, fontFamily: F.heading, color: INK },
  formDivider: { height: 1, backgroundColor: T.sand, marginTop: 12, marginBottom: 18 },

  label: { fontSize: 14, fontFamily: F.bodyBold, color: INK, marginBottom: 8 },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, paddingHorizontal: 14, minHeight: 50, backgroundColor: T.card,
  },
  pricePrefix: { fontSize: 15, fontFamily: F.bodyBold, color: INK, marginRight: 6 },
  input: { flex: 1, fontSize: 15, fontFamily: F.body, color: INK, paddingVertical: 0 },
  textArea: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 14,
    minHeight: 120, textAlignVertical: 'top', fontSize: 14, fontFamily: F.body,
  },
  charCount: { fontSize: 12, fontFamily: F.body, color: MUTED, textAlign: 'right', marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: T.card, borderWidth: 1, borderColor: BORDER,
  },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, fontFamily: F.bodySemi, color: T.textMuted },
  chipTextActive: { color: INK, fontFamily: F.bodyBold },

  submitBtn: {
    flexDirection: 'row', backgroundColor: BRAND, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontFamily: F.bodyBold, color: INK },

  termsText: { fontSize: 12, fontFamily: F.body, color: MUTED, textAlign: 'center', marginTop: 14 },

  
});