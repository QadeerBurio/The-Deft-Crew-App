// screens/CreateListingScreen.js
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
  Dimensions,
  Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createListing } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function CreateListingScreen({ route, navigation }) {
  const { getCurrentUserId, isGuest, user, getUserName, getUserEmail } = useContext(AuthContext);
  const { type } = route.params;
  const isBarter = type === 'barter';
  const isJob = type === 'job';

  // Common Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillOfferedName, setSkillOfferedName] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [proficiencyLevel, setProficiencyLevel] = useState('');
  const [experienceDetails, setExperienceDetails] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState(['']);

  // Barter Specific
  const [skillWantedName, setSkillWantedName] = useState('');
  const [skillWantedNotes, setSkillWantedNotes] = useState('');

  // Paid Specific
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [syllabus, setSyllabus] = useState('');

  // Job Specific
  const [jobSkillName, setJobSkillName] = useState('');
  const [jobExperienceLevel, setJobExperienceLevel] = useState('');
  const [jobNotes, setJobNotes] = useState('');
  const [budget, setBudget] = useState('');
  const [positionsAvailable, setPositionsAvailable] = useState('1');

  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;
  const card4Anim = useRef(new Animated.Value(0)).current;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Get user data
  const userName = getUserName ? getUserName() : user?.name || user?.fullName || user?.username || 'User';
  const userEmail = getUserEmail ? getUserEmail() : user?.email || '';
  const userImage = user?.profileImage || null;
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    // Rotate animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 30000,
        useNativeDriver: true,
      })
    );
    rotate.start();

    // Main animations
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
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Card animations
    const cardAnimations = [
      { anim: card1Anim, delay: 150 },
      { anim: card2Anim, delay: 280 },
      { anim: card3Anim, delay: 400 },
      { anim: card4Anim, delay: 520 }
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

  const handleAddLink = () => {
    if (portfolioLinks.length < 5) {
      setPortfolioLinks([...portfolioLinks, '']);
    }
  };

  const handleRemoveLink = (index) => {
    const newLinks = portfolioLinks.filter((_, i) => i !== index);
    setPortfolioLinks(newLinks);
  };

  const handleLinkChange = (text, index) => {
    const newLinks = [...portfolioLinks];
    newLinks[index] = text;
    setPortfolioLinks(newLinks);
  };

  const isFormValid = () => {
    if (!title.trim() || !description.trim()) return false;

    if (isBarter || !isJob) {
      if (!skillOfferedName.trim() || !proficiencyLevel) return false;
      const years = parseInt(yearsOfExperience, 10);
      if (isNaN(years) || years < 0) return false;
    }

    if (isBarter) {
      if (!skillWantedName.trim()) return false;
    } else if (isJob) {
      if (!jobSkillName.trim()) return false;
      const parsedBudget = parseFloat(budget);
      if (isNaN(parsedBudget) || parsedBudget < 0) return false;
      const parsedPositions = parseInt(positionsAvailable, 10);
      if (isNaN(parsedPositions) || parsedPositions < 1) return false;
    } else {
      if (!duration.trim()) return false;
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    const ownerId = getCurrentUserId();
    
    if (!ownerId) {
      Alert.alert('Authentication Required', 'Please log in to create a listing.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ownerId: ownerId,
        type,
        title: title.trim(),
        description: description.trim(),
      };

      if (!isJob) {
        payload.skillOffered = {
          skillName: skillOfferedName.trim(),
          yearsOfExperience: parseInt(yearsOfExperience, 10),
          proficiencyLevel: proficiencyLevel.toLowerCase(),
          experienceDetails: experienceDetails.trim(),
          portfolioLinks: portfolioLinks.filter(link => link.trim() !== '')
        };
      }

      if (isBarter) {
        payload.skillWanted = {
          skillName: skillWantedName.trim(),
          notes: skillWantedNotes.trim()
        };
      } else if (isJob) {
        payload.skillNeeded = {
          skillName: jobSkillName.trim(),
          experienceLevel: jobExperienceLevel.toLowerCase() || undefined,
          notes: jobNotes.trim()
        };
        payload.budget = parseFloat(budget);
        payload.positionsAvailable = parseInt(positionsAvailable, 10);
      } else {
        payload.price = parseFloat(price);
        payload.duration = duration.trim();
        if (syllabus.trim()) {
          payload.syllabus = syllabus.trim();
        }
      }

      await createListing(payload);
      
      Alert.alert(
        "🎉 Success!",
        "Your listing has been posted successfully!",
        [
          { 
            text: "View Dashboard", 
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [
                  { 
                    name: 'Dashboard', 
                    params: { refreshTimestamp: Date.now() } 
                  }
                ],
              });
            }
          }
        ],
        { cancelable: false }
      );
    } catch (err) {
      const serverError = err.response?.data?.error || err.message || 'An unexpected error occurred';
      setError(serverError);
      setSubmitting(false);
    }
  };

  const renderProficiencyChips = (currentLevel, setLevel) => (
    <View style={styles.chipContainer}>
      {PROFICIENCY_LEVELS.map((level) => {
        const isActive = currentLevel === level;
        return (
          <TouchableOpacity 
            key={level}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => setLevel(level)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {level}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const getTypeIcon = () => {
    if (isBarter) return 'swap-horizontal';
    if (isJob) return 'briefcase';
    return 'cash';
  };

  const getTypeColor = () => {
    if (isBarter) return '#f9c349';
    if (isJob) return '#4A90D9';
    return '#34C759';
  };

  const getTypeGradient = () => {
    if (isBarter) return ['#f9c349', '#f5a623'];
    if (isJob) return ['#4A90D9', '#357ABD'];
    return ['#34C759', '#28A745'];
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
        <Animated.View style={[styles.bgOrb, styles.bgOrb2, { transform: [{ rotate: spin }] }]} />
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
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={22} color="#8E8E93" />
          </TouchableOpacity>
        </View>
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
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
            {/* Type & User Card */}
            <View style={styles.topCard}>
              <LinearGradient
                colors={['#FFFFFF', '#FFFDF5']}
                style={styles.topCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.topCardRow}>
                  <View style={styles.typeBadge}>
                    <View style={[styles.typeIcon, { backgroundColor: getTypeColor() + '15' }]}>
                      <Ionicons name={getTypeIcon()} size={18} color={getTypeColor()} />
                    </View>
                    <Text style={styles.typeText}>{isBarter ? 'Exchange' : isJob ? 'Job' : 'Paid'}</Text>
                  </View>
                  <View style={styles.userMini}>
                    {userImage ? (
                      <Image source={{ uri: userImage }} style={styles.userMiniAvatar} />
                    ) : (
                      <LinearGradient
                        colors={['#f9c349', '#f5a623']}
                        style={styles.userMiniAvatar}
                      >
                        <Text style={styles.userMiniText}>{userInitial}</Text>
                      </LinearGradient>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>

            {error && (
              <Animated.View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#FF3B30" />
                <Text style={styles.errorBannerText}>{error}</Text>
                <TouchableOpacity onPress={() => setError(null)}>
                  <Ionicons name="close" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Form Sections */}
            {renderAnimatedCard(card1Anim, (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="document-text" size={16} color="#f9c349" />
                  </View>
                  <Text style={styles.sectionTitle}>Basic Info</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Title</Text>
                  <View style={[styles.inputWrapper, focusedInput === 'title' && styles.inputWrapperFocused]}>
                    <TextInput
                      style={styles.input}
                      placeholder="What's your listing about?"
                      placeholderTextColor="#8E8E93"
                      value={title}
                      onChangeText={setTitle}
                      onFocus={() => setFocusedInput('title')}
                      onBlur={() => setFocusedInput(false)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <View style={[styles.inputWrapper, styles.inputTextArea, focusedInput === 'description' && styles.inputWrapperFocused]}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Describe your listing..."
                      placeholderTextColor="#8E8E93"
                      multiline
                      numberOfLines={3}
                      value={description}
                      onChangeText={setDescription}
                      onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>
              </View>
            ))}

            {!isJob && renderAnimatedCard(card2Anim, (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="star" size={16} color="#f9c349" />
                  </View>
                  <Text style={styles.sectionTitle}>Your Skill</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Skill Name</Text>
                  <View style={[styles.inputWrapper, focusedInput === 'skillOffered' && styles.inputWrapperFocused]}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., React Native"
                      placeholderTextColor="#8E8E93"
                      value={skillOfferedName}
                      onChangeText={setSkillOfferedName}
                      onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                    />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                    <Text style={styles.label}>Years</Text>
                    <View style={[styles.inputWrapper, focusedInput === 'years' && styles.inputWrapperFocused]}>
                      <TextInput
                        style={styles.input}
                        placeholder="5"
                        placeholderTextColor="#8E8E93"
                        keyboardType="numeric"
                        value={yearsOfExperience}
                        onChangeText={setYearsOfExperience}
                        onFocus={() => setFocusedInput(false)}
                        onBlur={() => setFocusedInput()}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                    <Text style={styles.label}>Level</Text>
                    {renderProficiencyChips(proficiencyLevel, setProficiencyLevel)}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Experience (Optional)</Text>
                  <View style={[styles.inputWrapper, styles.inputTextArea, focusedInput === 'experience' && styles.inputWrapperFocused]}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Share your experience..."
                      placeholderTextColor="#8E8E93"
                      multiline
                      numberOfLines={2}
                      value={experienceDetails}
                      onChangeText={setExperienceDetails}
                      onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Portfolio (Optional)</Text>
                  {portfolioLinks.map((link, index) => (
                    <View key={index} style={styles.linkInputContainer}>
                      <View style={[styles.inputWrapper, focusedInput === `link${index}` && styles.inputWrapperFocused, styles.linkInputWrapper]}>
                        <TextInput
                          style={styles.input}
                          placeholder="https://..."
                          placeholderTextColor="#8E8E93"
                          autoCapitalize="none"
                          keyboardType="url"
                          value={link}
                          onChangeText={(text) => handleLinkChange(text, index)}
                          onFocus={() => setFocusedInput(false)}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </View>
                      {index > 0 && (
                        <TouchableOpacity 
                          style={styles.removeLinkButton}
                          onPress={() => handleRemoveLink(index)}
                        >
                          <Ionicons name="close-circle" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {portfolioLinks.length < 5 && (
                    <TouchableOpacity style={styles.addLinkButton} onPress={handleAddLink} activeOpacity={0.7}>
                      <Ionicons name="add-circle" size={16} color="#f9c349" />
                      <Text style={styles.addLinkText}>Add link</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {isBarter && renderAnimatedCard(card3Anim, (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="swap-horizontal" size={16} color="#f9c349" />
                  </View>
                  <Text style={styles.sectionTitle}>Skill Wanted</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Skill Name</Text>
                  <View style={[styles.inputWrapper, focusedInput === 'skillWanted' && styles.inputWrapperFocused]}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., UI/UX Design"
                      placeholderTextColor="#8E8E93"
                      value={skillWantedName}
                      onChangeText={setSkillWantedName}
                      onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <View style={[styles.inputWrapper, styles.inputTextArea, focusedInput === 'wantedNotes' && styles.inputWrapperFocused]}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Any specific requirements..."
                      placeholderTextColor="#8E8E93"
                      multiline
                      numberOfLines={2}
                      value={skillWantedNotes}
                      onChangeText={setSkillWantedNotes}
                      onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                    />
                  </View>
                </View>
              </View>
            ))}

            {isJob && renderAnimatedCard(card3Anim, (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="briefcase" size={16} color="#f9c349" />
                  </View>
                  <Text style={styles.sectionTitle}>Job Details</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Skill Needed</Text>
                  <View style={[styles.inputWrapper, focusedInput === 'jobSkill' && styles.inputWrapperFocused]}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Graphic Design"
                      placeholderTextColor="#8E8E93"
                      value={jobSkillName}
                      onChangeText={setJobSkillName}
                      onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Experience Level (Optional)</Text>
                  {renderProficiencyChips(jobExperienceLevel, setJobExperienceLevel)}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <View style={[styles.inputWrapper, styles.inputTextArea, focusedInput === 'jobNotes' && styles.inputWrapperFocused]}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Describe the role..."
                      placeholderTextColor="#8E8E93"
                      multiline
                      numberOfLines={2}
                      value={jobNotes}
                      onChangeText={setJobNotes}
                     onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                    />
                  </View>
                </View>

                <View style={styles.divider} />
                
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="cash" size={16} color="#f9c349" />
                  </View>
                  <Text style={styles.sectionTitle}>Compensation</Text>
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 2, marginRight: 6 }]}>
                    <Text style={styles.label}>Budget ($)</Text>
                    <View style={[styles.inputWrapper, focusedInput === 'budget' && styles.inputWrapperFocused]}>
                      <TextInput
                        style={styles.input}
                        placeholder="200"
                        placeholderTextColor="#8E8E93"
                        keyboardType="numeric"
                        value={budget}
                        onChangeText={setBudget}
                       onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                    <Text style={styles.label}>Positions</Text>
                    <View style={[styles.inputWrapper, focusedInput === 'positions' && styles.inputWrapperFocused]}>
                      <TextInput
                        style={styles.input}
                        placeholder="1"
                        placeholderTextColor="#8E8E93"
                        keyboardType="numeric"
                        value={positionsAvailable}
                        onChangeText={setPositionsAvailable}
                        onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {!isBarter && !isJob && renderAnimatedCard(card3Anim, (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="cash" size={16} color="#f9c349" />
                  </View>
                  <Text style={styles.sectionTitle}>Pricing</Text>
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                    <Text style={styles.label}>Price ($)</Text>
                    <View style={[styles.inputWrapper, focusedInput === 'price' && styles.inputWrapperFocused]}>
                      <TextInput
                        style={styles.input}
                        placeholder="100"
                        placeholderTextColor="#8E8E93"
                        keyboardType="numeric"
                        value={price}
                        onChangeText={setPrice}
                        onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                    <Text style={styles.label}>Duration</Text>
                    <View style={[styles.inputWrapper, focusedInput === 'duration' && styles.inputWrapperFocused]}>
                      <TextInput
                        style={styles.input}
                        placeholder="4 weeks"
                        placeholderTextColor="#8E8E93"
                        value={duration}
                        onChangeText={setDuration}
                        onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Roadmap (Optional)</Text>
                  <View style={[styles.inputWrapper, styles.inputTextArea, focusedInput === 'syllabus' && styles.inputWrapperFocused]}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Week 1: Basics..."
                      placeholderTextColor="#8E8E93"
                      multiline
                      numberOfLines={2}
                      value={syllabus}
                      onChangeText={setSyllabus}
                      onFocus={() => setFocusedInput(false)}
                      onBlur={() => setFocusedInput(false)}
                    />
                  </View>
                </View>
              </View>
            ))}

            {renderAnimatedCard(card4Anim, (
              <View style={styles.footerCard}>
                <Text style={styles.footerCardText}>Ready to publish?</Text>
                <Text style={styles.footerCardSubtext}>Review your listing before posting</Text>
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
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              (!isFormValid() || submitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || submitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={getTypeGradient()}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Publish</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    marginTop: Platform.OS === 'android' ? 34 : 0,
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
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
  topCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  topCardGradient: {
    padding: 14,
  },
  topCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  userMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  userMiniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMiniText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorBannerText: {
    color: '#C62828',
    fontWeight: '500',
    fontSize: 13,
    flex: 1,
  },
  animatedCard: {
    marginBottom: 10,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  inputGroup: {
    marginBottom: 12,
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
  inputTextArea: {
    minHeight: 60,
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 10 : 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    padding: 0,
    height: Platform.OS === 'ios' ? 22 : 28,
  },
  textArea: {
    minHeight: 40,
    textAlignVertical: 'top',
    height: Platform.OS === 'ios' ? 60 : 50,
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  linkInputWrapper: {
    flex: 1,
  },
  removeLinkButton: {
    marginLeft: 8,
    padding: 2,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    gap: 4,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chipActive: {
    backgroundColor: '#f9c349',
    borderColor: '#f9c349',
  },
  chipText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 4,
    alignSelf: 'flex-start',
  },
  addLinkText: {
    color: '#f9c349',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  footerCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  footerCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  footerCardSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
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