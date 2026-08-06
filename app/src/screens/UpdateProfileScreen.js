import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Switch,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

export default function UpdateProfileScreen({ navigation, route }) {
  const { user, token, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    rollNo: "",
    address: "",
    location: "",
    instagram: "",
    bio: "",
    headline: "",
    isAlumni: false,
  });

  // Refs for TextInputs
  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const rollNoInputRef = useRef(null);
  const locationInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const headlineInputRef = useRef(null);
  const bioInputRef = useRef(null);
  const instagramInputRef = useRef(null);

  // Fetch profile data
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      if (!token || !user?._id) {
        throw new Error('Authentication required');
      }

      let response;
      try {
        response = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (meError) {
        response = await api.get(`/auth/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const data = response.data.user || response.data;
      
      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        rollNo: data.rollNo || "",
        address: data.address || "",
        location: data.location || "",
        instagram: data.instagram || "",
        bio: data.bio || "",
        headline: data.headline || "",
        isAlumni: data.isAlumni || false,
      });

      setProfileData(data);
      startEntranceAnimations();
    } catch (error) {
      console.error("Error fetching profile:", error);
      
      if (user) {
        setFormData({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          rollNo: user.rollNo || "",
          address: user.address || "",
          location: user.location || "",
          instagram: user.instagram || "",
          bio: user.bio || "",
          headline: user.headline || "",
          isAlumni: user.isAlumni || false,
        });
        startEntranceAnimations();
      } else {
        Alert.alert(
          "Error Loading Profile",
          "Unable to load your profile data. Please try again.",
          [{ text: "Retry", onPress: fetchProfileData }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Dismiss keyboard function
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    // Blur all input fields
    Object.values({
      nameInputRef,
      phoneInputRef,
      rollNoInputRef,
      locationInputRef,
      addressInputRef,
      headlineInputRef,
      bioInputRef,
      instagramInputRef
    }).forEach(ref => {
      if (ref.current) {
        ref.current.blur();
      }
    });
  };

  const handleSave = async () => {
    dismissKeyboard();
    
    if (!formData.name?.trim()) {
      Alert.alert("Validation Error", "Name is required");
      return;
    }

    if (!token || !user?._id) {
      Alert.alert("Error", "Please login again to update your profile");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone || "",
        address: formData.address || "",
        location: formData.location || "",
        instagram: formData.instagram || "",
        bio: formData.bio || "",
        headline: formData.headline || "",
        isAlumni: formData.isAlumni,
        rollNo: formData.rollNo || "",
      };

      const response = await api.put(
        `/auth/update/${user._id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success && response.data.user) {
        await setUser(response.data.user);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          "Success! 🎉",
          "Your profile has been updated successfully.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error("Update error:", error);
      
      let errorMessage = "Failed to update profile. Please try again.";
      
      if (error.response) {
        switch (error.response.status) {
          case 403:
            errorMessage = "You don't have permission to update this profile.";
            break;
          case 400:
            errorMessage = error.response.data.message || "Invalid data provided.";
            break;
          case 404:
            errorMessage = "User account not found. Please login again.";
            break;
          default:
            errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      Alert.alert("Update Failed", errorMessage, [
        { text: "Retry", onPress: handleSave },
        { text: "Cancel", style: "cancel" },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({
    label,
    value,
    onChange,
    placeholder,
    icon,
    keyboardType = "default",
    multiline = false,
    numberOfLines = 1,
    editable = true,
    required = false,
    inputRef,
    onSubmitEditing,
    returnKeyType = "next",
    blurOnSubmit = true,
  }) => (
    <Animated.View style={[styles.inputGroup, { opacity: fadeAnim }]}>
      <View style={styles.inputLabelContainer}>
        <Text style={styles.inputLabel}>
          {label}
          {required && <Text style={styles.requiredStar}> *</Text>}
        </Text>
      </View>
      <View style={[styles.inputWrapper, !editable && styles.inputDisabled]}>
        {icon && (
          <View style={styles.inputIcon}>
            <Ionicons name={icon} size={20} color="#FFD700" />
          </View>
        )}
        <TextInput
          ref={inputRef}
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#bbb"
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          selectionColor="#FFD700"
          returnKeyType={multiline ? "default" : returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
        />
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={true}
              bounces={true}
            >
              {/* Header */}
              <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    dismissKeyboard();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.goBack();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => {
                    dismissKeyboard();
                    fetchProfileData();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={22} color="#FFD700" />
                </TouchableOpacity>
              </Animated.View>

              {/* Personal Information Card */}
              <Animated.View style={[styles.mainCard, { opacity: fadeAnim }]}>
                <LinearGradient
                  colors={['#FFD700', '#FFC107']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardAccent}
                />
                
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <Ionicons name="person-outline" size={22} color="#FFD700" />
                  </View>
                  <Text style={styles.cardTitle}>Personal Information</Text>
                </View>

                <InputField
                  label="Full Name"
                  value={formData.name}
                  onChange={(val) => handleChange("name", val)}
                  placeholder="Enter your full name"
                  icon="person-outline"
                  required
                  inputRef={nameInputRef}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    phoneInputRef.current?.focus();
                  }}
                  blurOnSubmit={false}
                />

                <InputField
                  label="Email Address"
                  value={formData.email}
                  onChange={() => {}}
                  placeholder="Enter your email"
                  icon="mail-outline"
                  editable={false}
                />

                <InputField
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(val) => handleChange("phone", val)}
                  placeholder="Enter your phone number"
                  icon="call-outline"
                  keyboardType="phone-pad"
                  inputRef={phoneInputRef}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    rollNoInputRef.current?.focus();
                  }}
                  blurOnSubmit={false}
                />

                <InputField
                  label="Roll Number"
                  value={formData.rollNo}
                  onChange={(val) => handleChange("rollNo", val)}
                  placeholder="Enter your roll number"
                  icon="card-outline"
                  inputRef={rollNoInputRef}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    locationInputRef.current?.focus();
                  }}
                  blurOnSubmit={false}
                />

                <InputField
                  label="Location"
                  value={formData.location}
                  onChange={(val) => handleChange("location", val)}
                  placeholder="Enter your city/state"
                  icon="location-outline"
                  inputRef={locationInputRef}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    addressInputRef.current?.focus();
                  }}
                  blurOnSubmit={false}
                />

                <InputField
                  label="Address"
                  value={formData.address}
                  onChange={(val) => handleChange("address", val)}
                  placeholder="Enter your full address"
                  icon="home-outline"
                  multiline
                  numberOfLines={2}
                  inputRef={addressInputRef}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    headlineInputRef.current?.focus();
                  }}
                  blurOnSubmit={false}
                />
              </Animated.View>

              {/* Professional Details Card */}
              <Animated.View style={[styles.mainCard, { opacity: fadeAnim }]}>
                <LinearGradient
                  colors={['#FFD700', '#FFC107']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardAccent}
                />
                
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <Ionicons name="briefcase-outline" size={22} color="#FFD700" />
                  </View>
                  <Text style={styles.cardTitle}>Professional Details</Text>
                </View>

                <InputField
                  label="Headline"
                  value={formData.headline}
                  onChange={(val) => handleChange("headline", val)}
                  placeholder="e.g. CS Student | Tech Enthusiast"
                  icon="trending-up-outline"
                  inputRef={headlineInputRef}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    bioInputRef.current?.focus();
                  }}
                  blurOnSubmit={false}
                />

                <InputField
                  label="Bio"
                  value={formData.bio}
                  onChange={(val) => handleChange("bio", val)}
                  placeholder="Tell us about yourself..."
                  icon="chatbox-outline"
                  multiline
                  numberOfLines={3}
                  inputRef={bioInputRef}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    instagramInputRef.current?.focus();
                  }}
                  blurOnSubmit={false}
                />

                <InputField
                  label="Instagram Handle"
                  value={formData.instagram}
                  onChange={(val) => handleChange("instagram", val)}
                  placeholder="@yourusername"
                  icon="logo-instagram"
                  inputRef={instagramInputRef}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    dismissKeyboard();
                  }}
                  blurOnSubmit={true}
                />

                {/* Alumni Status Switch */}
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <MaterialCommunityIcons
                      name="school-outline"
                      size={20}
                      color="#FFD700"
                    />
                    <Text style={styles.switchLabel}>Alumni Status</Text>
                  </View>
                  <View style={styles.switchContainer}>
                    <Switch
                      value={formData.isAlumni}
                      onValueChange={(val) => handleChange("isAlumni", val)}
                      trackColor={{ false: "#e0e0e0", true: "#FFD700" }}
                      thumbColor={formData.isAlumni ? "#1a1a1a" : "#fff"}
                      ios_backgroundColor="#e0e0e0"
                    />
                  </View>
                </View>
              </Animated.View>

              {/* Save Button */}
              <Animated.View 
                style={[
                  styles.saveButtonContainer,
                  { opacity: fadeAnim }
                ]}
              >
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["#FFD700", "#FFC107", "#FFA000"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    {saving ? (
                      <>
                        <ActivityIndicator size="small" color="#1a1a1a" />
                        <Text style={[styles.saveButtonText, { marginLeft: 10 }]}>
                          Saving...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Feather name="check" size={22} color="#1a1a1a" />
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.bottomSpacer} />
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  content: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFD70015",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD70020",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.3,
  },
  mainCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  cardAccent: {
    height: 4,
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFD70015",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.3,
  },
  inputGroup: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  inputLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    letterSpacing: 0.2,
  },
  requiredStar: {
    color: "#EF4444",
    fontSize: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputDisabled: {
    backgroundColor: "#f0f0f0",
    borderColor: "rgba(0,0,0,0.02)",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1a1a1a",
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    paddingHorizontal: 0,
    fontWeight: "500",
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    marginTop: 4,
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a1a",
    marginLeft: 10,
  },
  switchContainer: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  saveButtonContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  saveButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  saveButtonText: {
    color: "#1a1a1a",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  bottomSpacer: {
    height: 20,
  },
});