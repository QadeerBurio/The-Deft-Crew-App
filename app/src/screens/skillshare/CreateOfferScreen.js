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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createSkillOffer } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [focusedInput, setFocusedInput] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const floatingY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;

  const floating = floatingY.interpolate({
    inputRange: [-8, 8],
    outputRange: [-8, 8],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    // Floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingY, {
          toValue: 8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatingY, {
          toValue: -8,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Rotate animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );
    rotate.start();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(fabAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Card animations
    const cardAnimations = [
      { anim: card1Anim, delay: 200 },
      { anim: card2Anim, delay: 400 },
      { anim: card3Anim, delay: 600 }
    ];

    cardAnimations.forEach(({ anim, delay }) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        delay: delay,
        useNativeDriver: true,
      }).start();
    });
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
        '🎉 Success!',
        'Your offer has been submitted successfully!',
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

  const getTypeColor = () => {
    if (isBarter) return '#f9c349';
    if (isJob) return '#FF6B6B';
    return '#34C759';
  };

  const getTypeGradient = () => {
    if (isBarter) return ['#f9c349', '#f5a623'];
    if (isJob) return ['#FF6B6B', '#EE5A24'];
    return ['#34C759', '#28A745'];
  };

  const getOfferTitle = () => {
    if (isBarter) return 'Trade Skills';
    if (isJob) return 'Apply Now';
    return 'Enroll Now';
  };

  const getOfferIcon = () => {
    if (isBarter) return 'swap-horizontal';
    if (isJob) return 'briefcase';
    return 'cash';
  };

  const renderAnimatedCard = (anim, children) => (
    <Animated.View
      style={[
        styles.animatedCard,
        {
          opacity: anim,
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.92, 1.02, 1]
              })
            },
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })
            }
          ]
        }
      ]}
    >
      {children}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
      
      {/* Background Decorations */}
      <View style={styles.bgDecorations}>
        <Animated.View style={[styles.bgOrb, styles.bgOrb1, { transform: [{ rotate: spin }] }]} />
        <Animated.View style={[styles.bgOrb, styles.bgOrb2, { transform: [{ translateY: floating }] }]} />
      </View>

      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-15, 0]
                })
              }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FC']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Submit Offer</Text>
            <View style={styles.headerPlaceholder} />
          </View>
        </LinearGradient>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.mainContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Listing Info Card */}
            {renderAnimatedCard(card1Anim, (
              <View style={styles.listingCard}>
                <LinearGradient
                  colors={['#FFFFFF', '#FFFDF5']}
                  style={styles.listingCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.listingCardContent}>
                    <View style={[styles.listingIcon, { backgroundColor: getTypeColor() + '15' }]}>
                      <Ionicons name={getOfferIcon()} size={22} color={getTypeColor()} />
                    </View>
                    <View style={styles.listingInfo}>
                      <View style={styles.listingBadge}>
                        <Text style={[styles.listingBadgeText, { color: getTypeColor() }]}>
                          {isBarter ? 'Barter' : isJob ? 'Job' : 'Paid'}
                        </Text>
                      </View>
                      <Text style={styles.listingTitle} numberOfLines={2}>
                        {listing.title}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ))}

            {/* Offer Type Card */}
            {renderAnimatedCard(card2Anim, (
              <View style={styles.offerTypeCard}>
                <LinearGradient
                  colors={getTypeGradient()}
                  style={styles.offerTypeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.offerTypeContent}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                      <Ionicons name={getOfferIcon()} size={28} color="#FFFFFF" />
                    </Animated.View>
                    <Text style={styles.offerTypeTitle}>{getOfferTitle()}</Text>
                    <Text style={styles.offerTypeSubtitle}>
                      {isBarter ? 'Trade your skill' : isJob ? 'Apply for position' : 'Enroll in service'}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ))}

            {/* Form Section */}
            {renderAnimatedCard(card3Anim, (
              <View style={styles.formSection}>
                {isBarter && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Your Skill</Text>
                      <View style={[styles.inputWrapper, focusedInput === 'skill' && styles.inputWrapperFocused]}>
                        <MaterialCommunityIcons name="lightbulb-on" size={20} color="#8E8E93" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="What skill are you offering?"
                          placeholderTextColor="#8E8E93"
                          value={offeredSkillName}
                          onChangeText={setOfferedSkillName}
                          onFocus={() => setFocusedInput(false)}
                          onBlur={() => setFocusedInput(false)}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Your Level</Text>
                      {renderProficiencyChips(offeredSkillLevel, setOfferedSkillLevel)}
                    </View>
                  </>
                )}

                {isPaid && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Proposed Price</Text>
                    <View style={[styles.inputWrapper, styles.priceWrapper, focusedInput === 'price' && styles.inputWrapperFocused]}>
                      <Text style={styles.priceSymbol}>$</Text>
                      <TextInput
                        style={[styles.input, styles.priceInput]}
                        placeholder="Enter amount"
                        placeholderTextColor="#8E8E93"
                        keyboardType="numeric"
                        value={proposedPrice}
                        onChangeText={setProposedPrice}
                        onFocus={() => setFocusedInput(false)}
                        onBlur={() => setFocusedInput(false)}
                      />
                    </View>
                  </View>
                )}

                {isJob && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Why You're a Good Fit</Text>
                    <View style={[styles.inputWrapper, styles.textAreaWrapper, focusedInput === 'notes' && styles.inputWrapperFocused]}>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe your experience and qualifications..."
                        placeholderTextColor="#8E8E93"
                        multiline
                        numberOfLines={4}
                        value={applicationNotes}
                        onChangeText={setApplicationNotes}
                        onFocus={() => setFocusedInput(false)}
                        onBlur={() => setFocusedInput(false)}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Your Message</Text>
                  <View style={[styles.inputWrapper, styles.textAreaWrapper, focusedInput === 'message' && styles.inputWrapperFocused]}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder={isBarter ? 'Why do you want to trade?' : isJob ? 'Any additional info...' : 'Any questions...'}
                      placeholderTextColor="#8E8E93"
                      multiline
                      numberOfLines={4}
                      value={message}
                      onChangeText={setMessage}
                      onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                    />
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
        </ScrollView>
        
        {/* Footer */}
        <Animated.View 
          style={[
            styles.footer,
            {
              transform: [{ translateY: fabAnim }],
              opacity: fabAnim
            }
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={styles.footerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={getTypeGradient()}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  bgDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bgOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.03,
  },
  bgOrb1: {
    width: 200,
    height: 200,
    top: -80,
    right: -80,
    backgroundColor: '#f9c349',
  },
  bgOrb2: {
    width: 150,
    height: 150,
    bottom: -50,
    left: -50,
    backgroundColor: '#34C759',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    marginTop: Platform.OS === 'android' ? 34 : 0,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  headerPlaceholder: {
    width: 36,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 80,
  },
  mainContent: {
    flex: 1,
  },
  animatedCard: {
    marginBottom: 12,
  },
  listingCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  listingCardGradient: {
    padding: 14,
  },
  listingCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listingInfo: {
    flex: 1,
  },
  listingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f9c34915',
    marginBottom: 2,
  },
  listingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  offerTypeCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  offerTypeGradient: {
    padding: 16,
  },
  offerTypeContent: {
    alignItems: 'center',
  },
  offerTypeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
    letterSpacing: -0.3,
  },
  offerTypeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 42,
  },
  inputWrapperFocused: {
    borderColor: '#f9c349',
    backgroundColor: '#FFFFFF',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    padding: 0,
    height: Platform.OS === 'ios' ? 22 : 28,
  },
  textAreaWrapper: {
    minHeight: 60,
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 10 : 6,
  },
  textArea: {
    minHeight: 40,
    textAlignVertical: 'top',
    height: Platform.OS === 'ios' ? 60 : 50,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chipActive: {
    backgroundColor: '#f9c349',
    borderColor: '#f9c349',
  },
  chipText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  priceWrapper: {
    paddingHorizontal: 8,
  },
  priceSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8E8E93',
    paddingHorizontal: 4,
  },
  priceInput: {
    paddingLeft: 0,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  footerGradient: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRadius: 12,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  submitGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});