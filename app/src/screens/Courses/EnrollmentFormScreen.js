import React, { useState, useContext } from "react";
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
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../../context/AuthContext";
import { courseAPI } from "../../api/api";

export default function EnrollmentFormScreen({ route, navigation }) {
  const { course } = route.params || {};
  const { token, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    goal: "",
    phone: user?.phone || "",
  });

  const handleEnroll = async () => {
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
      // Call the actual enrollment API
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
        Alert.alert(
          "Already Enrolled",
          "You are already enrolled in this course!",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again to enroll.");
        navigation.replace("Login");
      } else {
        Alert.alert(
          "Error",
          "Failed to enroll. Please check your internet connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!course) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle" size={60} color="#EF4444" />
        <Text style={styles.errorText}>Course information not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Enrollment</Text>
          <View style={{ width: 40 }} /> 
        </View>

        {/* COURSE SUMMARY CARD */}
        <View style={styles.courseCard}>
          <LinearGradient
            colors={[course.color + "20", course.color + "05"]}
            style={styles.courseGradient}
          />
          <MaterialCommunityIcons name="school" size={32} color={course.color} />
          <View style={styles.courseTextContent}>
            <Text style={styles.courseLabel}>Enrolling in:</Text>
            <Text style={styles.courseTitle}>{course.title}</Text>
            <Text style={styles.courseProvider}>{course.provider}</Text>
          </View>
        </View>

        {/* FORM FIELDS */}
        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.input}
              placeholder="e.g. John Doe"
              value={formData.fullName}
              onChangeText={(txt) => setFormData({ ...formData, fullName: txt })}
              editable={!loading}
            />
          </View>

          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(txt) => setFormData({ ...formData, email: txt })}
              editable={!loading}
            />
          </View>

          <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="phone-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.input}
              placeholder="+1234567890"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(txt) => setFormData({ ...formData, phone: txt })}
              editable={!loading}
            />
          </View>

          <Text style={styles.inputLabel}>What is your learning goal? (Optional)</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="I want to master React Native and build amazing mobile apps..."
              multiline
              numberOfLines={4}
              value={formData.goal}
              onChangeText={(txt) => setFormData({ ...formData, goal: txt })}
              editable={!loading}
            />
          </View>
        </View>

        {/* COURSE INFO */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What you'll get:</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
            <Text style={styles.infoText}>Full lifetime access to course content</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
            <Text style={styles.infoText}>Certificate of completion</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
            <Text style={styles.infoText}>Downloadable resources</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
            <Text style={styles.infoText}>Community access</Text>
          </View>
        </View>

        {/* POLICY NOTE */}
        <Text style={styles.policyText}>
          By enrolling, you agree to the <Text style={styles.link}>Terms of Service</Text> and 
          will receive a certificate upon completion.
        </Text>

        {/* ENROLL BUTTON */}
        <TouchableOpacity 
          style={[styles.mainBtn, { backgroundColor: course.color || "#0F172A" }]} 
          onPress={handleEnroll}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.mainBtnText}>Confirm Enrollment</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { padding: 24, paddingBottom: 40 },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 30,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },

  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    marginBottom: 35,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  courseGradient: { ...StyleSheet.absoluteFillObject },
  courseTextContent: { marginLeft: 15, flex: 1 },
  courseLabel: { fontSize: 12, color: "#64748B", fontWeight: "600", textTransform: "uppercase" },
  courseTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginTop: 2 },
  courseProvider: { fontSize: 12, color: "#94A3B8", marginTop: 2 },

  formSection: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 8, marginLeft: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    height: 56,
  },
  textAreaContainer: { height: 100, alignItems: "flex-start", paddingTop: 15 },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: "#1E293B" },
  textArea: { height: 80, textAlignVertical: "top" },

  infoSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  infoText: { fontSize: 13, color: "#475569", marginLeft: 10 },

  policyText: { fontSize: 12, color: "#94A3B8", textAlign: "center", lineHeight: 18, marginBottom: 30 },
  link: { color: "#6366F1", fontWeight: "600" },

  mainBtn: {
    height: 60,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mainBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", marginRight: 10 },

  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { fontSize: 16, color: "#EF4444", marginTop: 12, textAlign: "center" },
  backBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#0F172A", borderRadius: 8 },
  backBtnText: { color: "#fff", fontWeight: "600" },
});