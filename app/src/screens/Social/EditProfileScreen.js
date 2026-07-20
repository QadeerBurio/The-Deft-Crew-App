import React, { useState, useContext, useEffect, useRef } from "react";
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, ActivityIndicator, Alert, Platform, 
  StatusBar, Animated, KeyboardAvoidingView
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from "../../context/AuthContext"; 
import * as ImagePicker from 'expo-image-picker';
import axios from "axios";

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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close-outline" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
          <TouchableOpacity onPress={handleUpdate} disabled={loading} style={styles.saveBtn}>
            <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.saveGradient}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
            
            {/* Profile Image Section */}
            <View style={styles.imageSection}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8} disabled={uploadingImage}>
                <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.avatarRing}>
                  {uploadingImage ? (
                    <View style={styles.avatarPlaceholder}>
                      <ActivityIndicator size="large" color="#fff" />
                    </View>
                  ) : (
                    <Image 
                      source={{ uri: profileImage || `https://ui-avatars.com/api/?name=${name}&background=1a1a1a&color=f9c349&size=200` }} 
                      style={styles.avatar} 
                    />
                  )}
                </LinearGradient>
                <View style={styles.cameraBadge}>
                  <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.cameraBadgeGradient}>
                    <Ionicons name="camera" size={16} color="#f9c349" />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
              <Text style={styles.changePhotoText}>Tap to change photo</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.inputWrapper, nameFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="person-outline" size={18} color={nameFocused ? "#f9c349" : "#999"} />
                  </View>
                  <TextInput 
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Abdul Qadeer"
                    placeholderTextColor="#999"
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                  />
                </View>
              </View>

              {/* Headline Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Headline</Text>
                <View style={[styles.inputWrapper, headlineFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="briefcase-outline" size={18} color={headlineFocused ? "#f9c349" : "#999"} />
                  </View>
                  <TextInput 
                    style={styles.input}
                    value={headline}
                    onChangeText={setHeadline}
                    placeholder="Computer Systems Engineer"
                    placeholderTextColor="#999"
                    onFocus={() => setHeadlineFocused(false)}
                    onBlur={() => setHeadlineFocused(false)}
                  />
                </View>
              </View>

              {/* Bio Input - Multiline */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bio</Text>
                <View style={[styles.inputWrapper, bioFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="information-circle-outline" size={18} color={bioFocused ? "#f9c349" : "#999"} />
                  </View>
                  <TextInput 
                    style={[styles.input, styles.multiline]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="MERN Stack Developer | React Native | Open Source..."
                    placeholderTextColor="#999"
                    multiline={false}
                    numberOfLines={1}
                    textAlignVertical="top"
                    onFocus={() => setBioFocused(false)}
                    onBlur={() => setBioFocused(false)}
                  />
                </View>
              </View>
              
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Education</Text>
              
              {/* School Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>University / School</Text>
                <View style={[styles.inputWrapper, schoolFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="school-outline" size={18} color={schoolFocused ? "#f9c349" : "#999"} />
                  </View>
                  <TextInput 
                    style={styles.input}
                    value={school}
                    onChangeText={setSchool}
                    placeholder="MUET, Jamshoro"
                    placeholderTextColor="#999"
                    onFocus={() => setSchoolFocused(false)}
                    onBlur={() => setSchoolFocused(false)}
                  />
                </View>
              </View>

              {/* Degree Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Degree Program</Text>
                <View style={[styles.inputWrapper, degreeFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="ribbon-outline" size={18} color={degreeFocused ? "#f9c349" : "#999"} />
                  </View>
                  <TextInput 
                    style={styles.input}
                    value={degree}
                    onChangeText={setDegree}
                    placeholder="BS Software Engineering"
                    placeholderTextColor="#999"
                    onFocus={() => setDegreeFocused(false)}
                    onBlur={() => setDegreeFocused(false)}
                  />
                </View>
              </View>

              {/* Roll Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Roll Number</Text>
                <View style={[styles.inputWrapper, rollNoFocused && styles.inputFocused]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="id-card-outline" size={18} color={rollNoFocused ? "#f9c349" : "#999"} />
                  </View>
                  <TextInput 
                    style={styles.input}
                    value={rollNo}
                    onChangeText={setRollNo}
                    placeholder="21CS042"
                    placeholderTextColor="#999"
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
  container: { flex: 1, backgroundColor: "#ffffff" },
  
  // Header
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' 
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  saveBtn: { borderRadius: 12, overflow: 'hidden', elevation: 5, shadowColor: "#f9c349", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveGradient: { paddingHorizontal: 20, paddingVertical: 10 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  
  // Image Section
  imageSection: { alignItems: 'center', marginVertical: 25 },
  avatarRing: { width: 110, height: 110, borderRadius: 55, padding: 4, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, borderRadius: 12, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' },
  cameraBadgeGradient: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  changePhotoText: { color: '#f9c349', marginTop: 10, fontWeight: '700', fontSize: 13 },
  
  // Form
  form: { paddingHorizontal: 20, paddingTop: 10 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  
  // Input
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  requiredStar: { color: '#f9c349' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8',
    borderRadius: 14, paddingHorizontal: 14, borderWidth: 2, borderColor: 'transparent',
    minHeight: 52,
  },
  inputFocused: { 
    borderColor: '#f9c349', backgroundColor: '#fff',
    shadowColor: "#f9c349", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3 
  },
  inputIconContainer: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center', marginRight: 10
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  multiline: { 
    minHeight: 50, 
    textAlignVertical: 'top', 
    paddingTop: 12,
    paddingBottom: 12,
  },
});