// screens/skillshare/profile/ProfileSetupScreen.js
import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../../context/AuthContext';
import {
  getMyProfessionalProfile,
  saveProfessionalProfile,
  completeProfessionalProfile,
} from '../../../api/profileApi';

import { color as T, font as F } from "../../../theme/tokens";
const BRAND = T.yellow;
const BRAND_DARK = T.yellow;
const INK = T.ink;
const MUTED = T.textMuted;
const BORDER = T.line;

const TOTAL_STEPS = 5;
const SUGGESTED_SKILLS = ['UI Design', 'JavaScript', 'Copywriting', 'Data Analysis', 'Marketing'];
const SERVICE_CHOICES = ['Web Development', 'UI/UX Design', 'Copywriting', 'Data Analysis'];
const CATEGORY_CHOICES = ['Programming', 'Graphic Design', 'Tutoring', 'Writing', 'Marketing', 'Business'];
const AVAILABILITY_OPTIONS = ['<10 hrs/week', '10-20 hrs/week', '20-30 hrs/week', '30+ hrs/week'];

export default function ProfileSetupScreen({ navigation, route }) {
  const { user, getUserName, getUserEmail } = useContext(AuthContext);
  const startStep = route?.params?.step || 1;
  const insets = useSafeAreaInsets();
  const busyRef = useRef(false);
  const scrollRef = useRef(null);

  const [step, setStep] = useState(startStep);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---- Step 1 ----
  const [photoUrl, setPhotoUrl] = useState(null);
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [university, setUniversity] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [bio, setBio] = useState('');

  // ---- Step 2 ----
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState([]);

  // ---- Step 3 ----
  const [portfolioLinks, setPortfolioLinks] = useState(['']);

  // ---- Step 4 ----
  const [interestedCategories, setInterestedCategories] = useState([]);

  // ---- Step 5 ----
  const [servicesProvided, setServicesProvided] = useState([]);
  const [startingRate, setStartingRate] = useState('');
  const [workMode, setWorkMode] = useState('both');
  const [availabilityPerWeek, setAvailabilityPerWeek] = useState('10-20 hrs/week');


   // add local state near the other step-5 state:
const [customServiceInput, setCustomServiceInput] = useState('');
const [showCustomInput, setShowCustomInput] = useState(false);
const [customServices, setCustomServices] = useState([]); // user-added services not in SERVICE_CHOICES

const addCustomService = () => {
  const trimmed = customServiceInput.trim();
  if (!trimmed) return;
  if (!servicesProvided.includes(trimmed)) {
    setServicesProvided((prev) => [...prev, trimmed]);
  }
  if (!customServices.includes(trimmed)) {
    setCustomServices((prev) => [...prev, trimmed]);
  }
  setCustomServiceInput('');
  setShowCustomInput(false);
};

  

  // Autofill from the logged-in user + hydrate any progress already saved
  useEffect(() => {
    const hydrate = async () => {
      const defaultName = getUserName ? getUserName() : user?.name || user?.fullName || '';
      setFullName(defaultName || '');
      // inside hydrate(), right after setting defaultName:
const defaultUniversity = user?.university?.name || (typeof user?.university === 'string' ? user.university : '') || '';
setUniversity(defaultUniversity);



      try {
        const { profile } = await getMyProfessionalProfile();
        if (profile) {
          setPhotoUrl(profile.photoUrl || user?.profileImage || null);
          setFullName(profile.fullName || defaultName || '');
          setHeadline(profile.headline || '');
          setUniversity(profile.university || defaultUniversity || '');
          setFieldOfStudy(profile.fieldOfStudy || '');
          setBio(profile.bio || '');
          setSkills((profile.skills || []).map((s) => s.name || s));
          setPortfolioLinks(profile.portfolioLinks?.length ? profile.portfolioLinks : ['']);
          setInterestedCategories(profile.interestedCategories || []);
          setServicesProvided(profile.servicesProvided || []);
          setStartingRate(profile.startingRate ? String(profile.startingRate) : '');
          setWorkMode(profile.workMode || 'both');
          setAvailabilityPerWeek(profile.availabilityPerWeek || '10-20 hrs/week');
        } else {
          setPhotoUrl(user?.profileImage || null);
        }
      } catch (err) {
        // No profile yet — that's fine, fields stay autofilled from user only
        setPhotoUrl(user?.profileImage || null);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, []);

 
  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUrl(result.assets[0].uri);
    }
  };

  const addSkill = (name) => {
    const trimmed = name.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills((prev) => [...prev, trimmed]);
    setSkillInput('');
  };
  const removeSkill = (name) => setSkills((prev) => prev.filter((s) => s !== name));

  const toggleCategory = (cat) => {
    setInterestedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };
  const toggleService = (svc) => {
    setServicesProvided((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  };

  const updateLink = (text, idx) => {
    const next = [...portfolioLinks];
    next[idx] = text;
    setPortfolioLinks(next);
  };
  const addLinkField = () => setPortfolioLinks((prev) => [...prev, '']);

  const buildPayload = useCallback(
    () => ({
      photoUrl,
      fullName,
      headline,
      university,
      fieldOfStudy,
      bio,
      skills,
      portfolioLinks: portfolioLinks.filter((l) => l.trim()),
      interestedCategories,
      servicesProvided,
      startingRate: startingRate ? parseFloat(startingRate) : 0,
      workMode,
      availabilityPerWeek,
      lastCompletedStep: step,
    }),
    [
      photoUrl, fullName, headline, university, fieldOfStudy, bio, skills,
      portfolioLinks, interestedCategories, servicesProvided, startingRate,
      workMode, availabilityPerWeek, step,
    ]
  );

  const isStepValid = () => {
    if (step === 1) return fullName.trim().length > 0;
    if (step === 2) return skills.length >= 3;
    return true; // steps 3, 4, 5 are optional / have sane defaults
  };

  const saveProgress = async (overrides = {}) => {
    try {
      setSaving(true);
      await saveProfessionalProfile({ ...buildPayload(), ...overrides });
    } catch (err) {
      console.error('Failed to save profile step:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (!isStepValid()) {
      Alert.alert('Almost there', step === 2 ? 'Add at least 3 skills to continue.' : 'Please fill this step.');
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await saveProgress();
      if (step < TOTAL_STEPS) {
        setStep(step + 1);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      } else {
        try {
          setSaving(true);
          await completeProfessionalProfile();
          // Replace so the finished form can't be reached with back.
          navigation.replace('ProfileSuccess');
          return;
        } catch (err) {
          Alert.alert('Error', 'Could not complete your profile. Please try again.');
        } finally {
          setSaving(false);
        }
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handleBack = useCallback(() => {
    if (busyRef.current) return;
    if (step === 1) {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('DashboardMain');
      return;
    }
    setStep((s) => Math.max(1, s - 1));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [navigation, step]);

  // Android back button steps back through the form before leaving it.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [handleBack])
  );

  const handleSaveAndExit = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await saveProgress();
      navigation.reset({ index: 0, routes: [{ name: 'DashboardMain' }] });
    } finally {
      busyRef.current = false;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  const progressPct = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={styles.topBar}>
          <Text style={styles.brand}>skillshare</Text>
          <TouchableOpacity
            onPress={handleSaveAndExit}
            disabled={saving}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.saveExit}>Save &amp; Exit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 12) + 28 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.progressRow}>
              <Text style={styles.stepLabel}>STEP {step} OF {TOTAL_STEPS}</Text>
              <Text style={styles.stepPct}>{progressPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>

            {step === 1 && (
              <StepBasicInfo
                photoUrl={photoUrl}
                onPickPhoto={pickPhoto}
                fullName={fullName}
                setFullName={setFullName}
                headline={headline}
                setHeadline={setHeadline}
                university={university}
                setUniversity={setUniversity}
                fieldOfStudy={fieldOfStudy}
                setFieldOfStudy={setFieldOfStudy}
                bio={bio}
                setBio={setBio}
              />
            )}

            {step === 2 && (
              <StepSkills
                skillInput={skillInput}
                setSkillInput={setSkillInput}
                skills={skills}
                addSkill={addSkill}
                removeSkill={removeSkill}
              />
            )}

            {step === 3 && (
              <StepPortfolio
                portfolioLinks={portfolioLinks}
                updateLink={updateLink}
                addLinkField={addLinkField}
              />
            )}

            {step === 4 && (
              <StepPreferences
                interestedCategories={interestedCategories}
                toggleCategory={toggleCategory}
              />
            )}

            {step === 5 && (
  <StepAvailability
    servicesProvided={servicesProvided}
    toggleService={toggleService}
    startingRate={startingRate}
    setStartingRate={setStartingRate}
    workMode={workMode}
    setWorkMode={setWorkMode}
    availabilityPerWeek={availabilityPerWeek}
    setAvailabilityPerWeek={setAvailabilityPerWeek}
    customServices={customServices}
    showCustomInput={showCustomInput}
    setShowCustomInput={setShowCustomInput}
    customServiceInput={customServiceInput}
    setCustomServiceInput={setCustomServiceInput}
    addCustomService={addCustomService}
  />
)}
            <TouchableOpacity
              style={[styles.continueButton, saving && { opacity: 0.6 }]}
              onPress={handleNext}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={T.white} />
              ) : (
                <Text style={styles.continueText}>
                  {step === TOTAL_STEPS ? 'Complete Profile' : 'Continue'}
                </Text>
              )}
              {step < TOTAL_STEPS && !saving && (
                <Ionicons name="arrow-forward" size={16} color={T.white} style={{ marginLeft: 6 }} />
              )}
              {step === TOTAL_STEPS && !saving && (
                <Ionicons name="checkmark-circle" size={18} color={T.white} style={{ marginLeft: 6 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={handleBack} disabled={saving}>
              <Text style={styles.backLinkText}>back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------- Step Components ----------------

function StepBasicInfo({
  photoUrl, onPickPhoto, fullName, setFullName, headline, setHeadline,
  university, setUniversity, fieldOfStudy, setFieldOfStudy, bio, setBio,
}) {
  return (
    <View>
      <Text style={styles.title}>create your professional profile</Text>
      <Text style={styles.subtitle}>
        Your professional profile helps other students understand your skills, experience and
        what you can offer.
      </Text>

      <TouchableOpacity style={styles.photoUpload} onPress={onPickPhoto} activeOpacity={0.8}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photoImage} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={26} color={MUTED} />
            <Text style={styles.photoUploadText}>upload photo</Text>
          </>
        )}
      </TouchableOpacity>

      <Field label="Full Name" value={fullName} onChangeText={setFullName} placeholder="e.g. Jane Doe" />
      <Field label="Professional Headline" value={headline} onChangeText={setHeadline} placeholder="e.g. UI/UX Designer & Computer Science" />
      <Field label="University" value={university} onChangeText={setUniversity} placeholder="e.g. Stanford University" />
      <Field label="Field of Study" value={fieldOfStudy} onChangeText={setFieldOfStudy} placeholder="e.g. Interaction Design" />

      <Text style={styles.label}>professional bio</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Tell other students about your background, interests, and what kind of projects you're looking for..."
        placeholderTextColor={T.textFaint}
        multiline
        maxLength={500}
        value={bio}
        onChangeText={setBio}
      />
      <Text style={styles.charCount}>{bio.length} / 500</Text>
    </View>
  );
}
function StepSkills({ skillInput, setSkillInput, skills, addSkill, removeSkill }) {
  const suggestions = SUGGESTED_SKILLS.filter((s) => !skills.includes(s));
  return (
    <View>
      <Text style={styles.title}>skills & expertise</Text>
      <Text style={styles.subtitle}>
        What are your core strengths? Add at least 3 skills to help others find you.
      </Text>

      <View style={styles.searchInputWrapper}>
        <Ionicons name="search" size={16} color={MUTED} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search or add a skill (e.g. Graphic Design)"
          placeholderTextColor={T.textFaint}
          value={skillInput}
          onChangeText={setSkillInput}
          onSubmitEditing={() => addSkill(skillInput)}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={() => addSkill(skillInput)}
          disabled={!skillInput.trim()}
          style={{ paddingHorizontal: 8, paddingVertical: 4, opacity: skillInput.trim() ? 1 : 0.4 }}
        >
          <Ionicons name="add-circle" size={22} color={BRAND_DARK} />
        </TouchableOpacity>
      </View>

      <View style={styles.chipWrap}>
        {skills.map((skill) => (
          <View key={skill} style={styles.skillChip}>
            <Text style={styles.skillChipText}>{skill}</Text>
            <TouchableOpacity onPress={() => removeSkill(skill)}>
              <Ionicons name="close" size={14} color={T.ink} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {suggestions.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>suggested for you</Text>
          <View style={styles.chipWrap}>
            {suggestions.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestChip} onPress={() => addSkill(s)}>
                <Text style={styles.suggestChipText}>+ {s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function StepPortfolio({ portfolioLinks, updateLink, addLinkField }) {
  return (
    <View>
      <Text style={styles.title}>portfolio & links</Text>
      <Text style={styles.subtitle}>
        Optional. Share links to work samples, GitHub, Behance, or a personal site.
      </Text>
      {portfolioLinks.map((link, idx) => (
        <Field
          key={idx}
          label={idx === 0 ? 'Portfolio Link' : `Link ${idx + 1}`}
          value={link}
          onChangeText={(t) => updateLink(t, idx)}
          placeholder="https://..."
          keyboardType="url"
          autoCapitalize="none"
        />
      ))}
      <TouchableOpacity style={styles.addLinkButton} onPress={addLinkField}>
        <Ionicons name="add-circle" size={16} color={BRAND_DARK} />
        <Text style={styles.addLinkText}>add another link</Text>
      </TouchableOpacity>
    </View>
  );
}

function StepPreferences({ interestedCategories, toggleCategory }) {
  return (
    <View>
      <Text style={styles.title}>what are you interested in?</Text>
      <Text style={styles.subtitle}>
        Pick a few categories so we can recommend relevant listings to you.
      </Text>
      <View style={styles.chipWrap}>
        {CATEGORY_CHOICES.map((cat) => {
          const active = interestedCategories.includes(cat);
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.serviceChip, active && styles.serviceChipActive]}
              onPress={() => toggleCategory(cat)}
            >
              <Text style={[styles.serviceChipText, active && styles.serviceChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
function StepAvailability({
  servicesProvided, toggleService, startingRate, setStartingRate,
  workMode, setWorkMode, availabilityPerWeek, setAvailabilityPerWeek,
  customServices, showCustomInput, setShowCustomInput,
  customServiceInput, setCustomServiceInput, addCustomService,
}) {
  return (
    <View>
      <Text style={styles.title}>availability & earning</Text>
      <Text style={styles.subtitle}>Let's set up how and when you want to collaborate.</Text>

      <Text style={styles.label}>services you provide</Text>
      <View style={styles.chipWrap}>
        {[...SERVICE_CHOICES, ...customServices].map((svc) => {
          const active = servicesProvided.includes(svc);
          return (
            <TouchableOpacity
              key={svc}
              style={[styles.serviceChip, active && styles.serviceChipActive]}
              onPress={() => toggleService(svc)}
            >
              <Text style={[styles.serviceChipText, active && styles.serviceChipTextActive]}>{svc}</Text>
            </TouchableOpacity>
          );
        })}
        {!showCustomInput && (
          <TouchableOpacity style={styles.addCustomChip} onPress={() => setShowCustomInput(true)}>
            <Text style={styles.addCustomChipText}>+ Add Custom</Text>
          </TouchableOpacity>
        )}
      </View>

      {showCustomInput && (
        <View style={[styles.searchInputWrapper, { marginBottom: 16 }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Type a custom service..."
            placeholderTextColor={T.textFaint}
            value={customServiceInput}
            onChangeText={setCustomServiceInput}
            onSubmitEditing={addCustomService}
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity onPress={addCustomService} disabled={!customServiceInput.trim()}>
            <Ionicons name="add-circle" size={22} color={BRAND_DARK} />
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.label}>Starting Rate (PKR / hr)</Text>
      <View style={styles.rateWrapper}>
        <Text style={styles.ratePrefix}>pkr</Text>
        <TextInput
          style={styles.rateInput}
          placeholder="2500"
          placeholderTextColor={T.textFaint}
          keyboardType="numeric"
          value={startingRate}
          onChangeText={setStartingRate}
        />
      </View>
      <Text style={styles.helperText}>
        You can always negotiate this per project or agree to a skill exchange.
      </Text>

      <Text style={styles.label}>work mode</Text>
      <View style={styles.workModeTrack}>
        {['remote', 'on-site', 'both'].map((mode) => {
          const active = workMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[styles.workModeOption, active && styles.workModeOptionActive]}
              onPress={() => setWorkMode(mode)}
            >
              <Text style={[styles.workModeText, active && styles.workModeTextActive]}>
                {mode === 'on-site' ? 'On-site' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>availability</Text>
      <View style={styles.chipWrap}>
        {AVAILABILITY_OPTIONS.map((opt) => {
          const active = availabilityPerWeek === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.serviceChip, active && styles.serviceChipActive]}
              onPress={() => setAvailabilityPerWeek(opt)}
            >
              <Text style={[styles.serviceChipText, active && styles.serviceChipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Field({ label, ...inputProps }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={T.textFaint} {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.paper },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  brand: { fontSize: 18, fontFamily: F.heading, color: INK },
  saveExit: { fontSize: 13, color: MUTED, fontFamily: F.bodyMedium },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.line,
    padding: 20,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stepLabel: { fontSize: 11, fontFamily: F.bodyBold, color: MUTED, letterSpacing: 0.5 },
  stepPct: { fontSize: 12, fontFamily: F.bodyBold, color: BRAND_DARK },
  progressTrack: { height: 6, backgroundColor: T.sand, borderRadius: 3, marginBottom: 20 },
  progressFill: { height: 6, backgroundColor: BRAND, borderRadius: 3 },
  title: { fontSize: 20, fontFamily: F.heading, color: INK, marginBottom: 6 },
  subtitle: { fontSize: 13, fontFamily: F.body, color: MUTED, lineHeight: 19, marginBottom: 18 },
  photoUpload: {
    width: 96, height: 96, borderRadius: 48, alignSelf: 'center',
    borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginBottom: 22, overflow: 'hidden',
  },
  photoImage: { width: 96, height: 96, borderRadius: 48 },
  photoUploadText: { fontSize: 11, fontFamily: F.body, color: MUTED, marginTop: 4 },
  label: { fontSize: 13, fontFamily: F.bodySemi, color: INK, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: F.body, color: INK,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  charCount: { fontSize: 11, fontFamily: F.body, color: MUTED, textAlign: 'right', marginTop: 4 },
  searchInputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: F.body, color: INK },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  skillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BRAND, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8,
  },
  skillChipText: { color: T.ink, fontFamily: F.bodyBold, fontSize: 13 },
  sectionLabel: { fontSize: 11, fontFamily: F.bodyBold, color: MUTED, letterSpacing: 0.5, marginBottom: 8 },
  suggestChip: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8,
  },
  suggestChipText: { color: INK, fontFamily: F.bodySemi, fontSize: 13 },
  addLinkButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  addLinkText: { color: BRAND_DARK, fontFamily: F.bodySemi, fontSize: 13 },
  serviceChip: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9,
  },
  serviceChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  serviceChipText: { color: INK, fontFamily: F.bodySemi, fontSize: 13 },
  serviceChipTextActive: { color: T.ink },
  addCustomChip: {
    borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  addCustomChipText: { color: MUTED, fontFamily: F.bodySemi, fontSize: 13 },
  rateWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, marginBottom: 4,
  },
  ratePrefix: { fontSize: 14, color: MUTED, fontFamily: F.bodySemi, marginRight: 8 },
  rateInput: { flex: 1, fontSize: 14, fontFamily: F.body, color: INK, paddingVertical: 10 },
  helperText: { fontSize: 11, fontFamily: F.body, color: MUTED, marginBottom: 16 },
  workModeTrack: {
    flexDirection: 'row', backgroundColor: T.sand, borderRadius: 12, padding: 4, marginBottom: 16,
  },
  workModeOption: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  workModeOptionActive: { backgroundColor: T.card, shadowColor: T.ink, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  workModeText: { fontSize: 13, color: MUTED, fontFamily: F.bodySemi },
  workModeTextActive: { color: INK },
  dropdownField: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 20,
  },
  dropdownText: { fontSize: 14, fontFamily: F.body, color: INK },
  continueButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND, borderRadius: 14, paddingVertical: 15, marginTop: 4,
  },
  continueText: { color: T.white, fontSize: 15, fontFamily: F.bodyBold },
  backLink: { alignItems: 'center', paddingVertical: 14 },
  backLinkText: { color: MUTED, fontFamily: F.bodySemi, fontSize: 14 },
});