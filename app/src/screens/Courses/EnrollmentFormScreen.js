import React, { useState, useContext, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../../context/AuthContext";
import { courseAPI } from "../../api/api";

export default function EnrollmentFormScreen({ route, navigation }) {
  const { course } = route.params || {};
  const { token, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    goal: "",
    phone: user?.phone || "",
  });

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(40)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const inputAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  const benefitsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      // Staggered input animations
      ...inputAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(200 + i * 100),
          Animated.spring(anim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        ])
      ),
      Animated.sequence([
        Animated.delay(600),
        Animated.spring(benefitsAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();

    // Pulse animation for button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleEnroll = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    if (!formData.fullName || !formData.email) {
      Alert.alert("Required", "Please fill in your name and email to proceed.");
      return;
    }

    if (!course || !course.id) {
      Alert.alert("Error", "Course information is missing.");
      return;
    }

    setLoading(true);

    try {
      const response = await courseAPI.enrollCourse(course.id);
      
      if (response.data.success) {
        Alert.alert(
          "Success! 🎉",
          `You are now enrolled in ${course.title}. Happy learning!`,
          [
            { 
              text: "Start Learning", 
              onPress: () => navigation.replace("AISkillsHomeScreen") 
            },
            { 
              text: "Continue Browsing", 
              onPress: () => navigation.goBack(),
              style: "cancel"
            }
          ]
        );
      } else {
        Alert.alert("Enrollment Failed", response.data.message || "Could not enroll in course.");
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      
      if (error.response?.status === 400 && error.response?.data?.message === "Already enrolled in this course") {
        Alert.alert("Already Enrolled", "You are already enrolled in this course!", [{ text: "OK", onPress: () => navigation.goBack() }]);
      } else if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again to enroll.");
        navigation.replace("Login");
      } else {
        Alert.alert("Error", "Failed to enroll. Please check your internet connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!course) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="alert-circle" size={50} color="#f9c349" />
          </View>
          <Text style={styles.errorText}>Course information not found</Text>
          <TouchableOpacity style={styles.backRetryBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.backRetryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.backRetryText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: headerFade }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Complete Enrollment</Text>
            <View style={styles.headerRight} />
          </Animated.View>

          {/* Course Summary Card */}
          <Animated.View style={[styles.courseCard, { opacity: fadeAnim, transform: [{ scale: cardScale }] }]}>
            <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.courseGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.courseCardTop}>
                <View style={styles.courseIconCircle}>
                  <Ionicons name="school" size={28} color="#1a1a1a" />
                </View>
                <View style={styles.courseBadge}>
                  <Text style={styles.courseBadgeText}>FREE</Text>
                </View>
              </View>
              <View style={styles.courseTextContent}>
                <Text style={styles.courseLabel}>ENROLLING IN</Text>
                <Text style={styles.courseTitle}>{course.title}</Text>
                <Text style={styles.courseProvider}>{course.provider}</Text>
              </View>
              <View style={styles.decorCircle1} />
              <View style={styles.decorCircle2} />
            </LinearGradient>
          </Animated.View>

          {/* Form Fields */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
            
            {/* Full Name */}
            <Animated.View style={{ opacity: inputAnims[0], transform: [{ translateX: inputAnims[0].interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <View style={[styles.inputContainer, focusedInput === 'name' && styles.inputFocused]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="person-outline" size={18} color={focusedInput === 'name' ? "#f9c349" : "#999"} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#999"
                  value={formData.fullName}
                  onChangeText={(txt) => setFormData({ ...formData, fullName: txt })}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!loading}
                />
              </View>
            </Animated.View>

            {/* Email */}
            <Animated.View style={{ opacity: inputAnims[1], transform: [{ translateX: inputAnims[1].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <View style={[styles.inputContainer, focusedInput === 'email' && styles.inputFocused]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="mail-outline" size={18} color={focusedInput === 'email' ? "#f9c349" : "#999"} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(txt) => setFormData({ ...formData, email: txt })}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!loading}
                />
              </View>
            </Animated.View>

            {/* Phone */}
            <Animated.View style={{ opacity: inputAnims[2], transform: [{ translateX: inputAnims[2].interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }}>
              <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
              <View style={[styles.inputContainer, focusedInput === 'phone' && styles.inputFocused]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="call-outline" size={18} color={focusedInput === 'phone' ? "#f9c349" : "#999"} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="+1234567890"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(txt) => setFormData({ ...formData, phone: txt })}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!loading}
                />
              </View>
            </Animated.View>

            {/* Learning Goal */}
            <Animated.View style={{ opacity: inputAnims[3], transform: [{ translateX: inputAnims[3].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
              <Text style={styles.inputLabel}>Learning Goal (Optional)</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer, focusedInput === 'goal' && styles.inputFocused]}>
                <TextInput
                  style={styles.textArea}
                  placeholder="I want to master React Native and build amazing mobile apps..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  value={formData.goal}
                  onChangeText={(txt) => setFormData({ ...formData, goal: txt })}
                  onFocus={() => setFocusedInput('goal')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!loading}
                />
              </View>
            </Animated.View>
          </Animated.View>

          {/* Benefits Section */}
          <Animated.View style={[styles.benefitsSection, { opacity: benefitsAnim, transform: [{ translateY: benefitsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <View style={styles.benefitsHeader}>
              <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
              <Text style={styles.benefitsTitle}>What you'll get</Text>
            </View>
            {[
              { icon: 'infinite-outline', text: 'Full lifetime access to course content' },
              { icon: 'ribbon-outline', text: 'Certificate of completion' },
              { icon: 'cloud-download-outline', text: 'Downloadable resources' },
              { icon: 'people-outline', text: 'Community access & support' },
            ].map((benefit, index) => (
              <Animated.View 
                key={index} 
                style={[
                  styles.benefitRow,
                  { 
                    opacity: benefitsAnim,
                    transform: [{ translateX: benefitsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                  }
                ]}
              >
                <View style={styles.benefitIconCircle}>
                  <Ionicons name={benefit.icon} size={16} color="#f9c349" />
                </View>
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Policy Note */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.policyText}>
              By enrolling, you agree to the <Text style={styles.link}>Terms of Service</Text> and will receive a certificate upon completion.
            </Text>
          </Animated.View>

          {/* Enroll Button */}
          <Animated.View style={{ transform: [{ scale: Animated.multiply(buttonScale, pulseAnim) }] }}>
            <TouchableOpacity 
              style={styles.enrollBtn}
              onPress={handleEnroll}
              activeOpacity={0.8}
              disabled={loading}
            >
              <LinearGradient
                colors={['#f9c349', '#1a1a1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.enrollBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.enrollBtnText}>Confirm Enrollment</Text>
                    <View style={styles.enrollIconCircle}>
                      <Ionicons name="arrow-forward" size={18} color="#1a1a1a" />
                    </View>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1a1a1a", letterSpacing: 0.5 },
  headerRight: { width: 40 },

  // Course Card
  courseCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 28,
    elevation: 10,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  courseGradient: { padding: 20, position: 'relative', overflow: 'hidden' },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 15,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 10,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  courseCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  courseIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  courseBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  courseTextContent: {},
  courseLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  courseTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  courseProvider: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  // Form Fields
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#666", marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 18,
    height: 54,
  },
  inputFocused: {
    borderColor: "#f9c349",
    backgroundColor: "#fff",
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  textAreaContainer: { height: 110, alignItems: "flex-start", paddingTop: 12 },
  inputIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  input: { flex: 1, fontSize: 14, color: "#1a1a1a", fontWeight: '500' },
  textArea: { flex: 1, fontSize: 14, color: "#1a1a1a", fontWeight: '500', textAlignVertical: "top", paddingTop: 4 },

  // Benefits
  benefitsSection: {
    backgroundColor: "#f8f8f8",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  benefitsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  benefitsTitle: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
  benefitRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  benefitIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  benefitText: { fontSize: 13, color: "#666", fontWeight: '500', flex: 1 },

  // Policy
  policyText: { fontSize: 12, color: "#999", textAlign: "center", lineHeight: 18, marginBottom: 24, fontWeight: '500' },
  link: { color: "#f9c349", fontWeight: "700" },

  // Enroll Button
  enrollBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  enrollBtnGradient: {
    height: 58,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  enrollBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  enrollIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error State
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: '#ffffff' },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  errorText: { fontSize: 15, color: "#666", marginBottom: 20, textAlign: "center", fontWeight: '500' },
  backRetryBtn: { borderRadius: 12, overflow: 'hidden', elevation: 5 },
  backRetryGradient: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', gap: 8 },
  backRetryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

