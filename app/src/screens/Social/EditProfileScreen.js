import React, { useState, useContext, useEffect, useRef } from "react";
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, ActivityIndicator, Alert, Platform, 
  StatusBar, Animated, KeyboardAvoidingView
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { AuthContext } from "../../context/AuthContext"; 
import * as ImagePicker from 'expo-image-picker';
import axios from "axios";

import { color as T, font as F } from "../../theme/tokens";
import { ScreenHeader } from "../../ui";
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social'; 
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/decaxpera/auto/upload";
const UPLOAD_PRESET = "tdc_profiles";

export default function EditProfileScreen({ navigation }) {
  const { user, token, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [school, setSchool] = useState(""); 
  const [degree, setDegree] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [profileImage, setProfileImage] = useState(null);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [headlineFocused, setHeadlineFocused] = useState(false);
  const [bioFocused, setBioFocused] = useState(false);
  const [schoolFocused, setSchoolFocused] = useState(false);
  const [degreeFocused, setDegreeFocused] = useState(false);
  const [rollNoFocused, setRollNoFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const saveScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setHeadline(user.headline || "");
      setBio(user.bio || "");
      setRollNo(user.rollNo || "");
      const currentUni = user.education?.[0]?.school || user.university?.name || "";
      setSchool(currentUni);
      setDegree(user.education?.[0]?.degree || "");
      setProfileImage(user.profileImage || null);
    }
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append("file", {
        uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
        name: `profile_${Date.now()}`,
        type: "image/jpeg",
      });
      data.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
      const json = await res.json();
      if (json.secure_url) {
        setProfileImage(json.secure_url);
      }
    } catch (e) {
      Alert.alert("Upload Failed", "Could not upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required.");
      return;
    }

    Animated.sequence([
      Animated.timing(saveScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(saveScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/profile/update`,
        { name, headline, bio, school, degree, rollNo },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (response.data.user) {
        setUser({ ...response.data.user, profileImage: profileImage || response.data.user.profileImage });
        Alert.alert("Success", "Your profile has been updated!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Check your internet connection.";
      Alert.alert("Update Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      
      {/* Header */}
      <Animated.View style={{ opacity: headerFade }}>
        <ScreenHeader
          title="edit profile"
          onBack={() => navigation.goBack()}
          right={
        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
          <TouchableOpacity onPress={handleUpdate} disabled={loading} style={styles.saveBtn} accessibilityRole="button" accessibilityLabel="save profile">
            <LinearGradient colors={[T.ink, T.ink]} style={styles.saveGradient}>
              {loading ? (
                <ActivityIndicator size="small" color={T.white} />
              ) : (
                <Text style={styles.saveBtnText}>save</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
          }
        />
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
            
            {/* Profile Image Section */}
            <View style={styles.imageSection}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8} disabled={uploadingImage} accessibilityRole="button" accessibilityLabel="change profile photo">
                <LinearGradient colors={[T.yellow, T.yellow]} style={styles.avatarRing}>
                  {uploadingImage ? (
                    <View style={styles.avatarPlaceholder}>
                      <ActivityIndicator size="large" color={T.white} />
                    </View>
                  ) : (
                    <Image 
                      source={{ uri: profileImage || `https://ui-avatars.com/api/?name=${name}&background=111111&color=f9c349&size=200` }} 
                      style={styles.avatar} 
                    />
                  )}
                </LinearGradient>
                <View style={styles.cameraBadge}>
                  <LinearGradient colors={[T.ink, T.ink]} style={styles.cameraBadgeGradient}>
                    <Ionicons name="camera" size={16} color={T.yellow} />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
              <Text style={styles.changePhotoText}>tap to change photo</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>full name <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.inputWrapper, nameFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="person-outline" size={18} color={nameFocused ? T.ink : T.textFaint} />
                  </View>
                  <TextInput 
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Abdul Qadeer"
                    placeholderTextColor={T.textFaint}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                  />
                </View>
              </View>

              {/* Headline Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>headline</Text>
                <View style={[styles.inputWrapper, headlineFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="briefcase-outline" size={18} color={headlineFocused ? T.ink : T.textFaint} />
                  </View>
                  <TextInput 
                    style={styles.input}
                    value={headline}
                    onChangeText={setHeadline}
                    placeholder="Computer Systems Engineer"
                    placeholderTextColor={T.textFaint}
                    onFocus={() => setHeadlineFocused(false)}
                    onBlur={() => setHeadlineFocused(false)}
                  />
                </View>
              </View>

              {/* Bio Input - Multiline */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>bio</Text>
                <View style={[styles.inputWrapper, bioFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="information-circle-outline" size={18} color={bioFocused ? T.ink : T.textFaint} />
                  </View>
                  <TextInput 
                    style={[styles.input, styles.multiline]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="MERN Stack Developer | React Native | Open Source..."
                    placeholderTextColor={T.textFaint}
                    multiline={false}
                    numberOfLines={1}
                    textAlignVertical="top"
                    onFocus={() => setBioFocused(false)}
                    onBlur={() => setBioFocused(false)}
                  />
                </View>
              </View>
              
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>education</Text>
              
              {/* School Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>university / school</Text>
                <View style={[styles.inputWrapper, schoolFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="school-outline" size={18} color={schoolFocused ? T.ink : T.textFaint} />
                  </View>
                  <TextInput 
                    style={styles.input}
                    value={school}
                    onChangeText={setSchool}
                    placeholder="MUET, Jamshoro"
                    placeholderTextColor={T.textFaint}
                    onFocus={() => setSchoolFocused(false)}
                    onBlur={() => setSchoolFocused(false)}
                  />
                </View>
              </View>

              {/* Degree Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>degree program</Text>
                <View style={[styles.inputWrapper, degreeFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="ribbon-outline" size={18} color={degreeFocused ? T.ink : T.textFaint} />
                  </View>
                  <TextInput 
                    style={styles.input}
                    value={degree}
                    onChangeText={setDegree}
                    placeholder="BS Software Engineering"
                    placeholderTextColor={T.textFaint}
                    onFocus={() => setDegreeFocused(false)}
                    onBlur={() => setDegreeFocused(false)}
                  />
                </View>
              </View>

              {/* Roll Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>roll number</Text>
                <View style={[styles.inputWrapper, rollNoFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="id-card-outline" size={18} color={rollNoFocused ? T.ink : T.textFaint} />
                  </View>
                  <TextInput 
                    style={styles.input}
                    value={rollNo}
                    onChangeText={setRollNo}
                    placeholder="21CS042"
                    placeholderTextColor={T.textFaint}
                    onFocus={() => setRollNoFocused(false)}
                    onBlur={() => setRollNoFocused(false)}
                  />
                </View>
              </View>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  
  // Header
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.line 
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: F.heading, color: T.ink, letterSpacing: 0.5 },
  saveBtn: { borderRadius: 20, overflow: 'hidden' },
  saveGradient: { paddingHorizontal: 18, height: 40, justifyContent: 'center' },
  saveBtnText: { color: T.white, fontSize: 14, fontFamily: F.bodyBold, letterSpacing: 0.5 },
  
  // Image Section
  imageSection: { alignItems: 'center', marginVertical: 25 },
  avatarRing: { width: 110, height: 110, borderRadius: 55, padding: 4, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: T.white },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: T.overlay, justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, borderRadius: 12, overflow: 'hidden', borderWidth: 3, borderColor: T.white },
  cameraBadgeGradient: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  changePhotoText: { color: T.ink, marginTop: 10, fontFamily: F.bodyBold, fontSize: 13 },
  
  // Form
  form: { paddingHorizontal: 16, paddingTop: 10 },
  divider: { height: 1, backgroundColor: T.sand, marginVertical: 20 },
  sectionLabel: { fontSize: 17, fontFamily: F.heading, color: T.ink, marginBottom: 14 },
  
  // Input
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontFamily: F.bodySemi, color: T.textMuted, marginBottom: 6 },
  requiredStar: { color: T.danger },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: T.card,
    borderRadius: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: T.line,
    minHeight: 52,
  },
  inputFocused: { borderColor: T.ink, borderWidth: 1.5 },
  inputIconContainer: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: T.sand,
    justifyContent: 'center', alignItems: 'center', marginRight: 10
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: T.ink, fontFamily: F.bodyMedium },
  multiline: { 
    minHeight: 50, 
    textAlignVertical: 'top', 
    paddingTop: 12,
    paddingBottom: 12,
  },
});