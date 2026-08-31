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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createListing, uploadListingAttachment } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import useMyProfessionalProfile from '../../hooks/useMyProfessionalProfile';

const BRAND = '#f9c349';
const INK = '#1C1C1E';
const MUTED = '#8E8E93';

const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function CreateListingScreen({ route, navigation }) {
   const { getCurrentUserId } = useContext(AuthContext);
  const { fullName: myName, photoUrl: myPhoto } = useMyProfessionalProfile();
  const { type } = route.params; // 'barter' | 'paid' | 'job'
  const isBarter = type === 'barter';
  const isJob = type === 'job';
  const isPaid = type === 'paid';

  // ---------- Common fields ----------
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // ---------- Skill (barter + paid) ----------
  const [skillOfferedName, setSkillOfferedName] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [proficiencyLevel, setProficiencyLevel] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');

  // ---------- Barter specific ----------
  const [deliverables, setDeliverables] = useState([]);
  const [deliverableInput, setDeliverableInput] = useState('');
  const [showDeliverableInput, setShowDeliverableInput] = useState(false);
  const [skillWantedName, setSkillWantedName] = useState('');
  const [skillWantedNotes, setSkillWantedNotes] = useState('');

  // ---------- Paid specific ----------
  const [price, setPrice] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [attachments, setAttachments] = useState([]); // { id, uri, url, type, uploading }

  // ---------- Job specific ----------
  const [jobSkills, setJobSkills] = useState([]);
  const [jobSkillInput, setJobSkillInput] = useState('');
  const [jobExperienceLevel, setJobExperienceLevel] = useState('');
  const [budget, setBudget] = useState('');
  const [positionsAvailable, setPositionsAvailable] = useState('1');

  // ---------- UI state ----------
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  // ---------- Media picker (Paid) ----------
  // Uploads happen the moment a file is picked, not at final submit — so the
  // payload only ever carries a real hosted url, never a local device uri.
  const handlePickMedia = async () => {
    if (attachments.length >= 6) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const type = asset.type === 'video' ? 'video' : 'image';
    const tempId = `${Date.now()}-${Math.random()}`;

    // Show an immediate local preview with an uploading spinner over it
    setAttachments((prev) => [
      ...prev,
      { id: tempId, uri: asset.uri, url: null, type, uploading: true },
    ]);

    try {
      const fileName = asset.fileName || asset.uri.split('/').pop() || `upload_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg');
      const uploaded = await uploadListingAttachment(asset.uri, mimeType, fileName);

      setAttachments((prev) =>
        prev.map((att) =>
          att.id === tempId ? { ...att, url: uploaded.url, type: uploaded.type, uploading: false } : att
        )
      );
    } catch (err) {
      console.error('Attachment upload failed:', err);
      setAttachments((prev) => prev.filter((att) => att.id !== tempId));
      Alert.alert('Upload Failed', 'Could not upload this file. Please try again.');
    }
  };

  const handleRemoveMedia = (id) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  // ---------- Deliverables (Barter) ----------
  const addDeliverable = () => {
    const val = deliverableInput.trim();
    if (!val) return;
    setDeliverables((prev) => [...prev, val]);
    setDeliverableInput('');
  };

  const removeDeliverable = (index) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- Job skill chips ----------
  const addJobSkill = () => {
    const val = jobSkillInput.trim();
    if (!val) return;
    if (!jobSkills.includes(val)) setJobSkills((prev) => [...prev, val]);
    setJobSkillInput('');
  };

  const removeJobSkill = (index) => {
    setJobSkills((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- Validation ----------
  const isFormValid = () => {
    if (!title.trim() || !description.trim()) return false;

    if (isBarter) {
      if (!skillOfferedName.trim() || !proficiencyLevel) return false;
      const years = parseInt(yearsOfExperience, 10);
      if (isNaN(years) || years < 0) return false;
      if (!skillWantedName.trim()) return false;
      return true;
    }

    if (isPaid) {
      if (!skillOfferedName.trim() || !proficiencyLevel) return false;
      const years = parseInt(yearsOfExperience, 10);
      if (isNaN(years) || years < 0) return false;
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) return false;
      const parsedDays = parseInt(deliveryDays, 10);
      if (isNaN(parsedDays) || parsedDays < 1) return false;
      if (attachments.some((a) => a.uploading)) return false; // wait for uploads to finish
      return true;
    }

    if (isJob) {
      if (jobSkills.length === 0) return false;
      const parsedBudget = parseFloat(budget);
      if (isNaN(parsedBudget) || parsedBudget < 0) return false;
      const parsedPositions = parseInt(positionsAvailable, 10);
      if (isNaN(parsedPositions) || parsedPositions < 1) return false;
      return true;
    }

    return false;
  };

  // ---------- Submit ----------
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
      let finalDescription = description.trim();
      if (isBarter && deliverables.length > 0) {
        finalDescription += `\n\nDeliverables:\n${deliverables.map((d) => `- ${d}`).join('\n')}`;
      }

      const payload = {
        ownerId,
        type,
        title: title.trim(),
        description: finalDescription,
      };

      if (isBarter || isPaid) {
        payload.skillOffered = {
          skillName: skillOfferedName.trim(),
          yearsOfExperience: parseInt(yearsOfExperience, 10),
          proficiencyLevel: proficiencyLevel.toLowerCase(),
          experienceDetails: '',
          portfolioLinks: portfolioLink.trim() ? [portfolioLink.trim()] : [],
        };
      }

      if (isBarter) {
        payload.skillWanted = {
          skillName: skillWantedName.trim(),
          notes: skillWantedNotes.trim(),
        };
      } else if (isJob) {
        payload.skillNeeded = {
          skillName: jobSkills.join(', '),
          experienceLevel: jobExperienceLevel ? jobExperienceLevel.toLowerCase() : undefined,
          notes: '',
        };
        payload.budget = parseFloat(budget);
        payload.positionsAvailable = parseInt(positionsAvailable, 10);
      } else if (isPaid) {
        payload.price = parseFloat(price);
        payload.duration = `${deliveryDays} day${deliveryDays === '1' ? '' : 's'}`;
        payload.attachments = attachments
          .filter((a) => a.url) // drop anything that never finished uploading
          .map((a) => ({ url: a.url, type: a.type }));
        if (syllabus.trim()) payload.syllabus = syllabus.trim();
      }

      await createListing(payload);

      Alert.alert(
        '🎉 Success!',
        'Your listing has been posted successfully!',
        [
          {
            text: 'View Dashboard',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard', params: { refreshTimestamp: Date.now() } }],
              });
            },
          },
        ],
        { cancelable: false }
      );
    } catch (err) {
      const serverError = err.response?.data?.error || err.message || 'An unexpected error occurred';
      setError(serverError);
      setSubmitting(false);
    }
  };

  // ---------- Header config per type ----------
  const headerTitle = isBarter ? 'Exchange Service' : isJob ? 'Hire Someone' : 'Paid Service';
  const pageTitle = isJob ? 'Post a Hire Listing' : isPaid ? 'Offer a Paid Service' : null;
  const pageSubtitle = isJob
    ? 'Find the perfect skills for your project.'
    : isPaid
    ? 'Fill in the details below to start earning.'
    : null;
  const submitLabel = isBarter ? 'Post Exchange' : isJob ? 'Post Job' : 'Post Service';

  // A level is "hinted" (black) when nothing has been chosen yet — it's a visual
  // nudge, not an actual selection. isFormValid() still requires a real tap.
  const DEFAULT_HINT_LEVEL = 'Intermediate';

  // ---------- Shared: 2x2 level grid (Job / Paid) ----------
  const renderLevelGrid = (currentLevel, setLevel) => (
    <View style={styles.levelGrid}>
      {PROFICIENCY_LEVELS.map((level) => {
        const active = currentLevel === level;
        const isHint = !currentLevel && level === DEFAULT_HINT_LEVEL;
        return (
          <TouchableOpacity
            key={level}
            style={[
              styles.levelGridBtn,
              isHint && styles.levelGridBtnHint,
              active && styles.levelGridBtnActive,
            ]}
            onPress={() => setLevel(level)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.levelGridText,
                isHint && styles.levelGridTextHint,
                active && styles.levelGridTextActive,
              ]}
            >
              {level}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ---------- Shared: pill chips (Barter) ----------
  const renderLevelChips = (currentLevel, setLevel) => (
    <View style={styles.chipContainer}>
      {PROFICIENCY_LEVELS.map((level) => {
        const active = currentLevel === level;
        const isHint = !currentLevel && level === DEFAULT_HINT_LEVEL;
        return (
          <TouchableOpacity
            key={level}
            style={[styles.chip, isHint && styles.chipHint, active && styles.chipActive]}
            onPress={() => setLevel(level)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, isHint && styles.chipTextHint, active && styles.chipTextActive]}>
              {level}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ================= BARTER (Exchange) =================
  const renderBarterForm = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Image
              source={require('../../../../assets/icons/offer-hand-stars.png')}
              style={styles.sectionIconImg}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.sectionTitle}>What will you do for Them</Text>
        </View>

        <Field label="Title">
          <TextInput
            style={styles.input}
            placeholder="What's your listing about?"
            placeholderTextColor={MUTED}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        <Field label="Description">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe what you offer in detail..."
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </Field>

        {deliverables.map((d, i) => (
          <View key={i} style={styles.deliverableRow}>
            <Text style={styles.deliverableText}>• {d}</Text>
            <TouchableOpacity onPress={() => removeDeliverable(i)}>
              <Ionicons name="close-circle" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        {showDeliverableInput ? (
          <View style={styles.linkInputContainer}>
            <TextInput
              style={[styles.input, styles.inputWrapper, { flex: 1 }]}
              placeholder="e.g., Source files, 3 revisions"
              placeholderTextColor={MUTED}
              value={deliverableInput}
              onChangeText={setDeliverableInput}
              onSubmitEditing={addDeliverable}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addLinkButton} onPress={addDeliverable}>
              <Ionicons name="checkmark-circle" size={22} color={BRAND} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addLinkButton}
            onPress={() => setShowDeliverableInput(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={16} color={BRAND} />
            <Text style={styles.addLinkText}>Add custom deliverables</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="ribbon-outline" size={16} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>Your Skill</Text>
        </View>

        <Field label="Skill Name">
          <TextInput
            style={styles.input}
            placeholder="e.g., React Native Application development"
            placeholderTextColor={MUTED}
            value={skillOfferedName}
            onChangeText={setSkillOfferedName}
          />
        </Field>

        <Field label="Years of Exp.">
          <TextInput
            style={styles.input}
            placeholder="e.g., 3"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            value={yearsOfExperience}
            onChangeText={setYearsOfExperience}
          />
        </Field>

        <Field label="Level">{renderLevelChips(proficiencyLevel, setProficiencyLevel)}</Field>

        <Field label="Portfolio Link (Optional)">
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            keyboardType="url"
            value={portfolioLink}
            onChangeText={setPortfolioLink}
          />
        </Field>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="swap-horizontal-outline" size={16} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>What would you Like in Return</Text>
        </View>

        <Field label="Skill Name">
          <TextInput
            style={styles.input}
            placeholder="e.g., UI/UX Design"
            placeholderTextColor={MUTED}
            value={skillWantedName}
            onChangeText={setSkillWantedName}
          />
        </Field>

        <Field label="Notes (Optional)">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What other supported files or formats of the work you want or additional requirements"
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={3}
            value={skillWantedNotes}
            onChangeText={setSkillWantedNotes}
          />
        </Field>
      </View>
    </>
  );

  // ================= JOB (Hire) =================
  const renderJobForm = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="document-text-outline" size={16} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>Basic Info</Text>
        </View>

        <Field label="Job Title">
          <TextInput
            style={styles.input}
            placeholder="e.g., Looking for Graphic Designer"
            placeholderTextColor={MUTED}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        <Field label="Description">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the role, responsibilities, and project goals..."
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </Field>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="briefcase-outline" size={16} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>Job Details</Text>
        </View>

        <Field label="Skills Needed">
          <View style={styles.chipContainer}>
            {jobSkills.map((skill, i) => (
              <View key={i} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill}</Text>
                <TouchableOpacity onPress={() => removeJobSkill(i)}>
                  <Ionicons name="close" size={14} color="#555" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Add a skill..."
            placeholderTextColor={MUTED}
            value={jobSkillInput}
            onChangeText={setJobSkillInput}
            onSubmitEditing={addJobSkill}
            returnKeyType="done"
          />
        </Field>

        <Field label="Experience Level">{renderLevelGrid(jobExperienceLevel, setJobExperienceLevel)}</Field>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="cash-outline" size={16} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>Compensation</Text>
        </View>

        <Field label="Budget">
          <View style={styles.prefixRow}>
            <Text style={styles.prefixText}>$</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="0.00"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />
            <Ionicons name="chevron-down" size={16} color={MUTED} />
          </View>
        </Field>

        <Field label="Number of Positions">
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { flex: 1, paddingHorizontal: 0 }]}
              placeholder="e.g., 1"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              value={positionsAvailable}
              onChangeText={(text) => setPositionsAvailable(text.replace(/[^0-9]/g, ''))}
            />
          </View>
        </Field>
      </View>
    </>
  );

  // ================= PAID =================
  const renderPaidForm = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="document-text-outline" size={16} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>Basic Info</Text>
        </View>

        <Field label="Service Title">
          <TextInput
            style={styles.input}
            placeholder="e.g., Logo Design & Branding"
            placeholderTextColor={MUTED}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        <Field label="Description">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe what you will deliver in detail..."
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </Field>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="ribbon-outline" size={16} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>Your Skill</Text>
        </View>

        <Field label="Skill Name">
          <TextInput
            style={styles.input}
            placeholder="e.g., Graphic Design"
            placeholderTextColor={MUTED}
            value={skillOfferedName}
            onChangeText={setSkillOfferedName}
          />
        </Field>

        <Field label="Years of Experience">
          <View style={styles.prefixRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="0"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
            />
            <Text style={styles.suffixText}>Years</Text>
          </View>
        </Field>

        <Field label="Skill Level">{renderLevelGrid(proficiencyLevel, setProficiencyLevel)}</Field>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="images-outline" size={16} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>Previous Work</Text>
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={13} color="#C62828" style={{ marginTop: 1 }} />
          <Text style={styles.warningText}>
            Only attach work that belongs to you or is included in your professional portfolio link
            provided below to build customer trust
          </Text>
        </View>

        <TouchableOpacity style={styles.uploadBox} onPress={handlePickMedia} activeOpacity={0.7}>
          <Ionicons name="cloud-upload-outline" size={28} color={MUTED} />
          <Text style={styles.uploadTitle}>Tap to upload files or images</Text>
          <Text style={styles.uploadSubtitle}>JPG, PNG, PDF up to 10MB</Text>
        </TouchableOpacity>

        {attachments.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {attachments.map((att) => (
              <View key={att.id} style={styles.thumb}>
                <Image source={{ uri: att.uri }} style={{ width: '100%', height: '100%' }} />
                {att.uploading && (
                  <View style={styles.thumbUploadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                {!att.uploading && att.type === 'video' && (
                  <View style={{ position: 'absolute', top: 4, right: 4 }}>
                    <Ionicons name="videocam" size={14} color="#fff" />
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => handleRemoveMedia(att.id)}
                  style={{ position: 'absolute', top: 2, right: 2 }}
                >
                  <Ionicons name="close-circle" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Field label="Attach Portfolio Link (URL)">
          <View style={styles.prefixRow}>
            <Ionicons name="link-outline" size={16} color={MUTED} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="https://yourportfolio.com"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
              keyboardType="url"
              value={portfolioLink}
              onChangeText={setPortfolioLink}
            />
          </View>
        </Field>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="pricetag-outline" size={16} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>Pricing & Delivery</Text>
        </View>

        <Field label="Starting Price (Rs)">
          <View style={styles.prefixRow}>
            <Text style={styles.prefixText}>Rs</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="0.00"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>
        </Field>

        <Field label="Delivery Time (Days)">
          <View style={styles.prefixRow}>
            <Ionicons name="time-outline" size={16} color={MUTED} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="e.g., 7"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              value={deliveryDays}
              onChangeText={(text) => setDeliveryDays(text.replace(/[^0-9]/g, ''))}
            />
            <Text style={styles.suffixText}>days</Text>
          </View>
        </Field>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="map-outline" size={16} color={BRAND} />
          </View>
          <Text style={styles.sectionTitle}>Service Roadmap (Optional)</Text>
        </View>
        <Text style={styles.roadmapHint}>Break down the steps you'll take to complete the service.</Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="1. Initial consultation..."
          placeholderTextColor={MUTED}
          multiline
          numberOfLines={3}
          value={syllabus}
          onChangeText={setSyllabus}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="notifications-outline" size={20} color={INK} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
  <View style={styles.postingAsRow}>
    {myPhoto ? (
      <Image source={{ uri: myPhoto }} style={styles.postingAsAvatar} />
    ) : (
      <View style={[styles.postingAsAvatar, styles.postingAsAvatarFallback]}>
        <Ionicons name="person" size={16} color="#999" />
      </View>
    )}
    <Text style={styles.postingAsText}>
      Posting as <Text style={styles.postingAsName}>{myName || 'You'}</Text>
    </Text>
  </View>

  {pageTitle && (
    <>
      <Text style={styles.pageTitle}>{pageTitle}</Text>
      <Text style={styles.pageSubtitle}>{pageSubtitle}</Text>
    </>
  )}
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#FF3B30" />
                <Text style={styles.errorBannerText}>{error}</Text>
                <TouchableOpacity onPress={() => setError(null)}>
                  <Ionicons name="close" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )}

            {isBarter && renderBarterForm()}
            {isJob && renderJobForm()}
            {isPaid && renderPaidForm()}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (!isFormValid() || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid() || submitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[BRAND, '#f5a623']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>{submitLabel}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Small helper for label + input wrapper
function Field({ label, children }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginTop: Platform.OS === 'android' ? 34 : 0,
  },
  headerBtn: { width: 32, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: INK },

  content: { padding: 16, paddingBottom: 100 },

  pageTitle: { fontSize: 24, fontWeight: '800', color: INK, marginTop: 4 },
  pageSubtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 16 },

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
  errorBannerText: { color: '#C62828', fontWeight: '500', fontSize: 13, flex: 1 },

  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#f9c34918',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: INK, flexShrink: 1 },
  sectionIconImg: { width: 16, height: 16, tintColor: BRAND },

  inputGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 },

  input: { fontSize: 14, color: INK, paddingVertical: 12, paddingHorizontal: 12 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    backgroundColor: '#fff',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    backgroundColor: '#fff',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingLeft: 12,
    minHeight: 46,
  },
  prefixText: { fontSize: 14, fontWeight: '700', color: '#555', marginRight: 4 },
  suffixText: { fontSize: 13, color: MUTED, paddingRight: 12 },

  // Barter pill chips
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  chipHint: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  chipText: { fontSize: 12, color: '#555', fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  chipTextHint: { color: '#fff', fontWeight: '700' },

  // Job/Paid 2x2 level grid
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelGridBtn: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  levelGridBtnActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  levelGridBtnHint: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  levelGridText: { fontSize: 13, fontWeight: '600', color: '#555' },
  levelGridTextActive: { color: '#fff', fontWeight: '700' },
  levelGridTextHint: { color: '#fff', fontWeight: '700' },

  // Job skill tags
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skillTagText: { fontSize: 12, color: INK, fontWeight: '600' },

  // Barter deliverables
  deliverableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  deliverableText: { fontSize: 13, color: INK, flex: 1 },
  linkInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addLinkButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  addLinkText: { color: BRAND, fontSize: 13, fontWeight: '700' },

  // Paid: previous work
  warningBox: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  warningText: { flex: 1, fontSize: 11.5, color: '#C62828', lineHeight: 16 },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#D8D8DC',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 26,
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
  },
  uploadTitle: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 8 },
  uploadSubtitle: { fontSize: 11, color: MUTED, marginTop: 2 },
  thumb: { width: 64, height: 64, borderRadius: 10, overflow: 'hidden' },
  thumbUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  roadmapHint: { fontSize: 12, color: MUTED, marginBottom: 10, marginTop: -8 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  postingAsRow: {
  flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
},
postingAsAvatar: { width: 28, height: 28, borderRadius: 14 },
postingAsAvatarFallback: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
postingAsText: { fontSize: 12, color: MUTED, fontWeight: '600' },
postingAsName: { color: INK, fontWeight: '800' },
});