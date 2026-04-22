import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  StatusBar
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Picker } from "@react-native-picker/picker";
import { useRoute } from "@react-navigation/native";
import api from "../api/api";

export default function SignupScreen({ navigation }) {
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isAlumni, setIsAlumni] = useState(false); // Default to Student

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Capture Referral Code from Link
  useEffect(() => {
    if (route.params?.ref) {
      setReferralCode(route.params.ref);
    }
  }, [route.params?.ref]);

  const universities = [
    "Aga Khan University", "Baqai Medical University", "Bahria University Karachi",
    "NED University of Engineering & Technology", "University of Karachi", "IBA Karachi",
    "IoBM", "SZABIST", "FAST-NUCES Karachi", "Sir Syed University", "Dawood UET",
    "Hamdard University", "Iqra University", "Jinnah Sindh Medical University", "Dow University"
    // ... add more as needed
  ];

  const validatePassword = (pass) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(pass);
  const validatePhone = (num) => /^[0]\d{10}$/.test(num);

  const handleSignup = async () => {
    if (!email || !password || !name || !university) {
      return Alert.alert("Required Fields", "Please complete the mandatory fields.");
    }
    if (password !== confirmPassword) {
      return Alert.alert("Mismatch", "Passwords do not match.");
    }
    if (!validatePassword(password)) {
      return Alert.alert("Weak Password", "Use 6+ characters with uppercase, lowercase, and a number.");
    }
    if (!validatePhone(phone)) {
      return Alert.alert("Invalid Phone", "Enter an 11-digit number starting with 0.");
    }

    try {
      setLoading(true);
      const body = {
        role: "student",
        email: email.trim().toLowerCase(),
        password,
        fullName: name,
        rollNo,
        phone,
        universityName: university,
        referralCodeInput: referralCode,
        isAlumni: isAlumni, // Correctly passing to backend
      };

      await api.post("/auth/signup", body);
      setShowSuccessModal(true);
    } catch (err) {
      Alert.alert("Signup Error", err.response?.data?.error || "Connection error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>tdc</Text>
            </View>
            <Text style={styles.title}>Join The Crew</Text>
            <Text style={styles.subtitle}>Unlock exclusive student & alumni deals</Text>
          </View>

          {/* Student / Alumni Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleButton, !isAlumni && styles.toggleActive]} 
              onPress={() => setIsAlumni(false)}
            >
              <Text style={[styles.toggleLabel, !isAlumni && styles.toggleLabelActive]}>Current Student</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, isAlumni && styles.toggleActive]} 
              onPress={() => setIsAlumni(true)}
            >
              <Text style={[styles.toggleLabel, isAlumni && styles.toggleLabelActive]}>Alumni</Text>
            </TouchableOpacity>
          </View>

          

          {/* Full Name */}
          <View style={[styles.inputWrapper, focusedInput === 'name' && styles.inputFocused]}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
              style={styles.input}
            />
          </View>

          {/* Roll No / ID */}
          <View style={[styles.inputWrapper, focusedInput === 'roll' && styles.inputFocused]}>
            <Ionicons name="id-card-outline" size={20} color="#666" />
            <TextInput
              placeholder={isAlumni ? "Old Roll No (Optional)" : "Current Roll No / ID"}
              placeholderTextColor="#999"
              value={rollNo}
              onChangeText={setRollNo}
              onFocus={() => setFocusedInput('roll')}
              onBlur={() => setFocusedInput(null)}
              style={styles.input}
            />
          </View>

          {/* Phone */}
          <View style={[styles.inputWrapper, focusedInput === 'phone' && styles.inputFocused]}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <TextInput
              placeholder="Phone Number (03xxxxxxxxx)"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              onFocus={() => setFocusedInput('phone')}
              onBlur={() => setFocusedInput(null)}
              style={styles.input}
            />
          </View>

          {/* University Picker */}
          <View style={[styles.pickerOuterContainer, focusedInput === 'uni' && styles.inputFocused]}>
            <Ionicons name="school-outline" size={20} color="#000000" style={{marginLeft: 15}} />
            <Picker
              selectedValue={university}
              onValueChange={(v) => setUniversity(v)}
              style={{ flex: 1 }}
              onFocus={() => setFocusedInput('uni')}
              onBlur={() => setFocusedInput(null)}
            >
              <Picker.Item label="Select University" value="" color="#000000" />
              {universities.map((uni, i) => <Picker.Item key={i} label={uni} value={uni} />)}
            </Picker>
          </View>

          {/* Email */}
          <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputFocused]}>
            <Ionicons name="mail-outline" size={20} color="#414040" />
            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              style={styles.input}
            />
          </View>

          {/* Password */}
          <View style={[styles.inputWrapper, focusedInput === 'pass' && styles.inputFocused]}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedInput('pass')}
              onBlur={() => setFocusedInput(null)}
              style={styles.input}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={[styles.inputWrapper, focusedInput === 'confirm' && styles.inputFocused]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setFocusedInput('confirm')}
              onBlur={() => setFocusedInput(null)}
              style={styles.input}
            />
          </View>
          <View style={[styles.inputWrapper, styles.referralWrapper, focusedInput === 'ref' && styles.inputFocused]}>
            <Ionicons name="gift-outline" size={20} color="#08634f" />
            <TextInput
              placeholder="Referral Code (Optional)"
              placeholderTextColor="#999"
              value={referralCode}
              onChangeText={setReferralCode}
              onFocus={() => setFocusedInput('ref')}
              onBlur={() => setFocusedInput(null)}
              style={styles.input}
            />
          </View>

          {/* Signup Button */}
          <TouchableOpacity 
            style={[styles.button, loading && { opacity: 0.7 }]} 
            onPress={handleSignup} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already in the crew? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.signupLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.alertIconCircle}>
              <Ionicons name="checkmark-circle" size={50} color="#000" />
            </View>
            <Text style={styles.alertTitle}>Welcome to the Crew!</Text>
            <Text style={styles.alertMessage}>Account created. Login to explore exclusive campus deals.</Text>
            <TouchableOpacity 
              style={styles.alertButton} 
              onPress={() => { setShowSuccessModal(false); navigation.replace("Login"); }}
            >
              <Text style={styles.alertButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f4f7f6" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20, paddingVertical: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  header: { alignItems: "center", marginBottom: 25 },
  logoBadge: { width: 50, height: 50, backgroundColor: "#e8f2f0", borderRadius: 15, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  logoText: { fontSize: 20, color: "#000", fontWeight: "900" },
  title: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },
  subtitle: { color: "#7a7a7a", marginTop: 4, textAlign: 'center', fontSize: 13 },
  
  // Toggle Styles
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleActive: { backgroundColor: '#fff', elevation: 2, shadowOpacity: 0.1 },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: '#7a7a7a' },
  toggleLabelActive: { color: '#000' },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  referralWrapper: { backgroundColor: "#e8f2f0", borderColor: "#08634f30", marginBottom: 15 },
  inputFocused: { borderColor: "#000", backgroundColor: "#fff" },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 15, color: "#333" },
  
  pickerOuterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 15,
    marginBottom: 12,
  },

  button: { backgroundColor: "#000", padding: 18, borderRadius: 15, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: "#7a7a7a" },
  signupLink: { color: "#000", fontWeight: "800" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  alertCard: { width: "100%", backgroundColor: "#fff", borderRadius: 25, padding: 30, alignItems: "center" },
  alertIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e6f4ea', justifyContent: "center", alignItems: "center", marginBottom: 20 },
  alertTitle: { fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 10 },
  alertMessage: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 25 },
  alertButton: { backgroundColor: "#000", paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12 },
  alertButtonText: { color: "#fff", fontWeight: "700" }
});