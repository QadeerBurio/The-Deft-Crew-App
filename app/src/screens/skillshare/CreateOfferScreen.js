// screens/CreateOfferScreen.js
import React, { useState, useContext, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createSkillOffer } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function CreateOfferScreen({ route, navigation }) {
  const { getCurrentUserId, isGuest } = useContext(AuthContext);
  const { listing } = route.params;

  const [message, setMessage] = useState('');
  const [offeredSkillName, setOfferedSkillName] = useState('');
  const [offeredSkillLevel, setOfferedSkillLevel] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [applicationNotes, setApplicationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const isBarter = listing.type === 'barter';
  const isJob = listing.type === 'job';
  const isPaid = listing.type === 'paid';

  const handleSubmit = async () => {
    const userId = getCurrentUserId();
    if (!userId || isGuest) {
      Alert.alert('Login Required', 'Please login to make an offer');
      return;
    }

    // Validate based on listing type
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
        message: message.trim()
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

      Alert.alert(
        '🎉 Offer Submitted!',
        'Your offer has been submitted. The listing owner will review it.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to submit offer';
      Alert.alert('Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderProficiencyChips = (currentLevel, setLevel) => {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    return (
      <View style={styles.chipContainer}>
        {levels.map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.chip, currentLevel === level && styles.chipActive]}
            onPress={() => setLevel(level)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, currentLevel === level && styles.chipTextActive]}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getOfferTitle = () => {
    if (isBarter) return 'Make a Barter Offer';
    if (isJob) return 'Apply for This Job';
    return 'Request to Enroll';
  };

  const getOfferIcon = () => {
    if (isBarter) return 'swap-horizontal-outline';
    if (isJob) return 'briefcase-outline';
    return 'cash-outline';
  };

  const getOfferColor = () => {
    if (isBarter) return '#f9c349';
    if (isJob) return '#FF6B6B';
    return '#34C759';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={Platform.OS === 'ios' ? 'chevron-back' : 'chevron-back'} 
            size={24} 
            color="#1C1C1E" 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Create Offer</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.mainContent,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <View style={[styles.headerBox, { borderColor: getOfferColor() }]}>
              <View style={styles.headerBoxContent}>
                <View style={[styles.iconContainer, { backgroundColor: getOfferColor() + '15' }]}>
                  <Ionicons name={getOfferIcon()} size={28} color={getOfferColor()} />
                </View>
                <View style={styles.headerBoxText}>
                  <Text style={[styles.headerTitleText, { color: getOfferColor() }]}>
                    {getOfferTitle()}
                  </Text>
                  <Text style={styles.listingTitle} numberOfLines={2}>
                    {listing.title}
                  </Text>
                </View>
              </View>
            </View>

            {isBarter && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="star-outline" size={20} color="#f9c349" />
                  <Text style={styles.sectionTitle}>Skill You're Offering</Text>
                </View>

                <Text style={styles.label}>Skill Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. React Native"
                  placeholderTextColor="#8E8E93"
                  value={offeredSkillName}
                  onChangeText={setOfferedSkillName}
                />

                <Text style={styles.label}>Your Skill Level *</Text>
                {renderProficiencyChips(offeredSkillLevel, setOfferedSkillLevel)}
              </View>
            )}

            {isPaid && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="cash-outline" size={20} color="#34C759" />
                  <Text style={styles.sectionTitle}>Proposed Price</Text>
                </View>

                <Text style={styles.label}>Your Price ($) *</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceSymbol}>$</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    placeholder="100"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                    value={proposedPrice}
                    onChangeText={setProposedPrice}
                  />
                </View>
              </View>
            )}

            {isJob && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text-outline" size={20} color="#FF6B6B" />
                  <Text style={styles.sectionTitle}>Why You're a Good Fit</Text>
                </View>

                <Text style={styles.label}>Application Notes *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your experience and why you're interested..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                  value={applicationNotes}
                  onChangeText={setApplicationNotes}
                />
              </View>
            )}

            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="chatbubble-outline" size={20} color="#f9c349" />
                <Text style={styles.sectionTitle}>Your Message</Text>
              </View>

              <Text style={styles.label}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={
                  isBarter ? 'Why do you want to trade skills?' : 
                  isJob ? 'Any additional information about your application...' :
                  'Any questions or additional information...'
                }
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Submit Offer</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginTop:34
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  mainContent: {
    flex: 1,
  },
  headerBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#f9c349',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerBoxContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerBoxText: {
    flex: 1,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9c349',
    marginBottom: 2,
  },
  listingTitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chipActive: {
    backgroundColor: '#f9c349',
    borderColor: '#f9c349',
  },
  chipText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  priceSymbol: {
    position: 'absolute',
    left: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#8E8E93',
    zIndex: 1,
  },
  priceInput: {
    paddingLeft: 32,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#f9c349',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#F5E5C8',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});