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
import { Ionicons } from '@expo/vector-icons';
import { createListing } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Get user data
  const userName = getUserName ? getUserName() : user?.name || user?.fullName || user?.username || 'User';
  const userEmail = getUserEmail ? getUserEmail() : user?.email || '';
  const userImage = user?.profileImage || null;
  const userInitial = userName.charAt(0).toUpperCase();

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

  const handleAddLink = () => {
    setPortfolioLinks([...portfolioLinks, '']);
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
      // Paid
      if (!duration.trim()) return false;
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    // Get the actual user ID from context
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
          proficiencyLevel,
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
          experienceLevel: jobExperienceLevel || undefined,
          notes: jobNotes.trim()
        };
        payload.budget = parseFloat(budget);
        payload.positionsAvailable = parseInt(positionsAvailable, 10);
      } else {
        // Paid
        payload.price = parseFloat(price);
        payload.duration = duration.trim();
        if (syllabus.trim()) {
          payload.syllabus = syllabus.trim();
        }
      }

      await createListing(payload);
      
      Alert.alert(
        "🎉 Listing Posted!",
        "Your listing is now live and ready for others to see.",
        [{ text: "OK", onPress: () => navigation.navigate('Dashboard', { refreshTimestamp: Date.now() }) }]
      );
    } catch (err) {
      const serverError = err.response?.data?.error || err.message || 'An unexpected error occurred';
      setError(serverError);
    } finally {
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
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const getTypeIcon = () => {
    if (isBarter) return 'swap-horizontal-outline';
    if (isJob) return 'briefcase-outline';
    return 'cash-outline';
  };

  const getTypeColor = () => {
    if (isBarter) return '#f9c349';
    if (isJob) return '#FF6B6B';
    return '#34C759';
  };

  const getTypeTitle = () => {
    if (isBarter) return 'Barter Listing';
    if (isJob) return 'Job Listing';
    return 'Paid Listing';
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
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
            size={24} 
            color="#1C1C1E" 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Create Listing</Text>
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
          keyboardShouldPersistTaps="handled"
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
            {/* User Profile Card */}
            <View style={styles.userCard}>
              <LinearGradient
                colors={['#FFFFFF', '#FFF8F0']}
                style={styles.userCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.userCardContent}>
                  {userImage ? (
                    <Image source={{ uri: userImage }} style={styles.userAvatar} />
                  ) : (
                    <LinearGradient
                      colors={['#f9c349', '#f7b731']}
                      style={styles.userAvatar}
                    >
                      <Text style={styles.userAvatarText}>{userInitial}</Text>
                    </LinearGradient>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{userName}</Text>
                    <Text style={styles.userEmail}>{userEmail}</Text>
                    {isGuest && (
                      <View style={styles.guestBadge}>
                        <Text style={styles.guestBadgeText}>Guest Mode</Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <View style={[styles.headerBox, { borderColor: getTypeColor() }]}>
              <View style={styles.headerBoxContent}>
                <View style={[styles.typeIconContainer, { backgroundColor: getTypeColor() + '15' }]}>
                  <Ionicons name={getTypeIcon()} size={24} color={getTypeColor()} />
                </View>
                <View>
                  <Text style={[styles.headerTitleText, { color: getTypeColor() }]}>
                    {getTypeTitle()}
                  </Text>
                  <Text style={styles.headerSubtitleText}>
                    Fill in the details below
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>The Basics</Text>
              
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Need Logo, Offer Backend"
                placeholderTextColor="#8E8E93"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what you want and what you're offering..."
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {!isJob && (
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>What are you offering? *</Text>
                
                <Text style={styles.label}>Skill Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. NodeJS"
                  placeholderTextColor="#8E8E93"
                  value={skillOfferedName}
                  onChangeText={setSkillOfferedName}
                />

                <Text style={styles.label}>Years of Experience *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 5"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  value={yearsOfExperience}
                  onChangeText={setYearsOfExperience}
                />

                <Text style={styles.label}>Proficiency Level *</Text>
                {renderProficiencyChips(proficiencyLevel, setProficiencyLevel)}

                <Text style={styles.label}>Experience Details (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell them about your past work..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                  value={experienceDetails}
                  onChangeText={setExperienceDetails}
                />

                <Text style={styles.label}>Portfolio Links (Optional)</Text>
                {portfolioLinks.map((link, index) => (
                  <TextInput
                    key={index}
                    style={[styles.input, styles.linkInput]}
                    placeholder="https://..."
                    placeholderTextColor="#8E8E93"
                    autoCapitalize="none"
                    keyboardType="url"
                    value={link}
                    onChangeText={(text) => handleLinkChange(text, index)}
                  />
                ))}
                <TouchableOpacity style={styles.addLinkButton} onPress={handleAddLink} activeOpacity={0.7}>
                  <Ionicons name="add-circle-outline" size={20} color="#f9c349" />
                  <Text style={styles.addLinkText}>Add another link</Text>
                </TouchableOpacity>
              </View>
            )}

            {isBarter ? (
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>What do you want to learn in exchange?</Text>
                
                <Text style={styles.label}>Skill Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Figma"
                  placeholderTextColor="#8E8E93"
                  value={skillWantedName}
                  onChangeText={setSkillWantedName}
                />

                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any specific requirements..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                  value={skillWantedNotes}
                  onChangeText={setSkillWantedNotes}
                />
              </View>
            ) : isJob ? (
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>What skill do you need? *</Text>
                
                <Text style={styles.label}>Skill Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Graphic Design"
                  placeholderTextColor="#8E8E93"
                  value={jobSkillName}
                  onChangeText={setJobSkillName}
                />

                <Text style={styles.label}>Experience Level (Optional)</Text>
                {renderProficiencyChips(jobExperienceLevel, setJobExperienceLevel)}

                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Details about what you need..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                  value={jobNotes}
                  onChangeText={setJobNotes}
                />

                <View style={styles.divider} />
                
                <Text style={styles.sectionTitle}>Pricing & Setup</Text>
                
                <Text style={styles.label}>Budget ($) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 200"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  value={budget}
                  onChangeText={setBudget}
                />

                <Text style={styles.label}>Positions Available *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="How many people do you want to hire?"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  value={positionsAvailable}
                  onChangeText={setPositionsAvailable}
                />
              </View>
            ) : (
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Pricing & Setup</Text>
                
                <Text style={styles.label}>Price ($) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 100"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />

                <Text style={styles.label}>Duration *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 4 weeks"
                  placeholderTextColor="#8E8E93"
                  value={duration}
                  onChangeText={setDuration}
                />

                <Text style={styles.label}>Roadmap / what you'll teach (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Week 1: Basics..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                  value={syllabus}
                  onChangeText={setSyllabus}
                />
              </View>
            )}
          </Animated.View>
        </ScrollView>
        
        <View style={styles.footer}>
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
              colors={['#f9c349', '#f7b731']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Post Listing</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 20,
  },
  mainContent: {
    flex: 1,
  },
  userCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  userCardGradient: {
    padding: 16,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  userEmail: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 1,
  },
  guestBadge: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  guestBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorBannerText: {
    color: '#C62828',
    fontWeight: '500',
    fontSize: 14,
    flex: 1,
  },
  headerBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
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
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitleText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 1,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    marginTop: 16,
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
  linkInput: {
    marginBottom: 8,
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
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  addLinkText: {
    color: '#f9c349',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});