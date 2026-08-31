// screens/CreateOfferScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createSkillOffer } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#8E8E93';
const BORDER = '#e5e5e5';

const MESSAGE_MAX = 500;

export default function CreateOfferScreen({ route, navigation }) {
  const { getCurrentUserId, isGuest } = useContext(AuthContext);
  const { listing } = route.params;

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

  const handleSubmit = async () => {
    const userId = getCurrentUserId();
    if (!userId || isGuest) {
      Alert.alert('Login Required', 'Please login to make an offer');
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
          setSubmitting(false);
          return;
        }
        payload.proposedPrice = price;
      }

      if (isJob) {
        payload.applicationNotes = applicationNotes.trim();
      }

      await createSkillOffer(payload);

      Alert.alert('Success!', 'Your offer has been submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to submit offer';
      Alert.alert('Error', errorMsg);
    } finally {
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Submit Offer</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                <Text style={styles.listingTitle}>{listing.title}</Text>
              </View>
            </View>
            <Text style={styles.listingSubtext}>Responding to listing request</Text>
          </View>

          {/* Offer Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>
              {isBarter ? 'Propose Your Trade' : isJob ? 'Your Application' : 'Make Your Offer'}
            </Text>
            <View style={styles.formDivider} />

            {isBarter && (
              <>
                <Text style={styles.label}>Your Skill</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={MUTED} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="What skill are you offering?"
                    placeholderTextColor="#aaa"
                    value={offeredSkillName}
                    onChangeText={setOfferedSkillName}
                  />
                </View>

                <Text style={[styles.label, { marginTop: 16 }]}>Your Level</Text>
                {renderLevelChips(offeredSkillLevel, setOfferedSkillLevel)}
              </>
            )}

            {isPaid && (
              <>
                <Text style={styles.label}>Proposed Price</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.pricePrefix}>Rs.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    placeholderTextColor="#aaa"
                    keyboardType="numeric"
                    value={proposedPrice}
                    onChangeText={setProposedPrice}
                  />
                </View>
              </>
            )}

            {isJob && (
              <>
                <Text style={styles.label}>Why You're a Good Fit</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your experience and qualifications..."
                  placeholderTextColor="#aaa"
                  multiline
                  numberOfLines={4}
                  value={applicationNotes}
                  onChangeText={setApplicationNotes}
                  maxLength={MESSAGE_MAX}
                />
              </>
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Your Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={messagePlaceholder}
              placeholderTextColor="#aaa"
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 34 : 8, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  topHeaderTitle: { fontSize: 20, fontWeight: '700', color: INK },

  content: { padding: 20, paddingBottom: 30 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 18, marginBottom: 16,
  },

  listingRow: { flexDirection: 'row', gap: 14 },
  listingIconBox: {
    width: 54, height: 54, borderRadius: 14, backgroundColor: '#F0F0F0',
    justifyContent: 'center', alignItems: 'center',
  },
  typePill: {
    alignSelf: 'flex-start', backgroundColor: '#FFF3D6',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginBottom: 6,
  },
  typePillText: { fontSize: 12, fontWeight: '700', color: '#8a6d1d' },
  listingTitle: { fontSize: 19, fontWeight: '800', color: INK, lineHeight: 24 },
  listingSubtext: { fontSize: 13, color: MUTED, marginTop: 12 },

  formTitle: { fontSize: 19, fontWeight: '800', color: INK },
  formDivider: { height: 1, backgroundColor: '#eee', marginTop: 12, marginBottom: 18 },

  label: { fontSize: 14, fontWeight: '700', color: INK, marginBottom: 8 },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, paddingHorizontal: 14, minHeight: 50, backgroundColor: '#fff',
  },
  pricePrefix: { fontSize: 15, fontWeight: '700', color: INK, marginRight: 6 },
  input: { flex: 1, fontSize: 15, color: INK, paddingVertical: 0 },
  textArea: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 14,
    minHeight: 120, textAlignVertical: 'top', fontSize: 14,
  },
  charCount: { fontSize: 12, color: MUTED, textAlign: 'right', marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: INK, fontWeight: '800' },

  submitBtn: {
    flexDirection: 'row', backgroundColor: BRAND, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: INK },

  termsText: { fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 14 },

  
});