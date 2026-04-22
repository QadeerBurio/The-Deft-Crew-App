import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Modal,
  Animated
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";

export default function SignIn({ navigation }) {
  const { setUser, setToken } = useContext(AuthContext);

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Alert States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "", type: "success" });

  const showAlert = (title, message, type = "success") => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const validateEmail = (email) => {
    return String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      return showAlert("Missing Info", "Please fill in all fields to continue.", "error");
    }
    if (!validateEmail(email)) {
      return showAlert("Invalid Email", "Please enter a valid student email address.", "error");
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/login", { email: email.trim(), password });
      const { token, user } = res.data;

      if (user.role !== "student") {
        setLoading(false);
        return showAlert("Access Denied", "This portal is for Students only.", "error");
      }

      // Success Logic
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      // Show attractive success alert then proceed
      showAlert("Welcome Back!", `Great to see you again, ${user.fullName || 'Student'}.`, "success");
      
      // Delay the actual state update to allow user to see success message
      setTimeout(() => {
        setAlertVisible(false);
        setToken(token);
        setUser(user);
      }, 2000);

    } catch (err) {
      const msg = err.response?.data?.message || "Invalid credentials. Please try again.";
      showAlert("Login Failed", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      
      {/* --- CUSTOM ATTRACTIVE ALERT MODAL --- */}
      <Modal transparent visible={alertVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIconCircle, { backgroundColor: alertConfig.type === 'success' ? '#e6f4ea' : '#fce8e6' }]}>
              <Ionicons 
                name={alertConfig.type === 'success' ? "checkmark-circle" : "alert-circle"} 
                size={50} 
                color={alertConfig.type === 'success' ? "#000000" : "#d93025"} 
              />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            
            {alertConfig.type === 'error' && (
              <TouchableOpacity 
                style={styles.alertButton} 
                onPress={() => setAlertVisible(false)}
              >
                <Text style={styles.alertButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              {/* <Ionicons name="school" size={32} color="#08634f" /> */}
              <Text style={{fontSize:30, color:"dark-blue", fontWeight:900, fontFamily:"Cardo"}}>tdc</Text>
            </View>
            <Text style={styles.title}>The Deft Crew</Text>
            <Text style={styles.subtitle}>Sign in to manage your partnerships</Text>
          </View>

          {/* Email */}
          <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputFocused]}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#000"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={[styles.inputWrapper, focusedInput === 'password' && styles.inputFocused]}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#000"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
              style={styles.input}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, loading && { opacity: 0.7 }]} 
            onPress={handleLogin} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have any account </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={styles.signupLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f4f7f6" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
  header: { alignItems: "center", marginBottom: 35 },
  logoBadge: { width: 60, height: 60, backgroundColor: "#e8f2f0", borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 15 },
  title: { fontSize: 24, fontWeight: "800", color: "#1a1a1a" },
  subtitle: { color: "#7a7a7a", marginTop: 5 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputFocused: { borderColor: "#08634f", backgroundColor: "#fff" },
  input: { flex: 1, paddingVertical: 15, paddingHorizontal: 10, fontSize: 16, color: "#333" },
  forgotBtn: { alignSelf: "flex-end", marginBottom: 25 },
  forgotText: { color: "#000000", fontWeight: "700" },
  button: { backgroundColor: "#000000", padding: 18, borderRadius: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 25 },
  footerText: { color: "#7a7a7a" },
  signupLink: { color: "#000000", fontWeight: "800" },

  // --- ALERT MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 30,
    alignItems: "center",
  },
  alertIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  alertTitle: { fontSize: 22, fontWeight: "800", color: "#1a1a1a", marginBottom: 10 },
  alertMessage: { fontSize: 16, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  alertButton: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  alertButtonText: { color: "#fff", fontWeight: "700" }
});