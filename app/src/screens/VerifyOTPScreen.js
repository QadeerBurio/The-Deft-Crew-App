import React, { useState, useEffect } from "react";
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
  ScrollView
} from "react-native";
import api from "../api/api";
import { Ionicons } from "@expo/vector-icons";

export default function VerifyOTP({ route, navigation }) {
  const { userId, emailOrPhone, sentTo, retryAfter } = route.params || {};
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(retryAfter || 60);

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerifyOTP = async () => {
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) return Alert.alert("Error", "Please enter the 6-digit code");

    try {
      setLoading(true);
      const res = await api.post("/auth/verify-otp", { userId, otp: code }, { timeout: 15000 });
      navigation.replace("ResetPassword", { resetToken: res.data.resetToken });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.code === "ECONNABORTED" ? "The server took too long. Please try again." : "Invalid or expired code");
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (!emailOrPhone) {
      navigation.goBack();
      return;
    }
    try {
      setResending(true);
      const res = await api.post("/auth/forgot-password", { emailOrPhone }, { timeout: 25000 });
      setOtp("");
      setCooldown(60);
      Alert.alert("Code sent", res.data?.message || "A new code is on its way.");
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldown(err.response.data?.retryAfter || 60);
      }
      Alert.alert("Error", err.response?.data?.message || "Couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark-outline" size={40} color="#000000" />
          </View>

          <Text style={styles.title}>Verification</Text>
          <Text style={styles.subtitle}>
            {sentTo
              ? `We sent a 6-digit code to ${sentTo}. Check inbox and spam.`
              : "We sent a 6-digit code to your email. Check inbox and spam."}
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="0 0 0 0 0 0"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, ""))}
              style={styles.input}
              keyboardType="numeric"
              maxLength={6}
              placeholderTextColor="#aaa"
              letterSpacing={10} // Makes it look like an OTP field
            />
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleVerifyOTP} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity onPress={handleResend} disabled={cooldown > 0 || resending}>
              <Text style={[styles.resendLink, (cooldown > 0 || resending) && { opacity: 0.4 }]}>
                {resending ? " Sending…" : cooldown > 0 ? ` Resend in ${cooldown}s` : " Resend OTP"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f9",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 25,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(8, 99, 79, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  inputWrapper: {
    width: '100%',
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fafafa",
    marginBottom: 25,
  },
  input: {
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
  },
  button: {
    backgroundColor: "#000000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    width: '100%',
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  resendContainer: {
    flexDirection: 'row',
    marginTop: 25,
  },
  resendText: {
    color: "#555",
    fontSize: 14,
  },
  resendLink: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 14,
  },
});