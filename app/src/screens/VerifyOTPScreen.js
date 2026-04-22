import React, { useState } from "react";
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
  const { userId } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    if (!otp) return Alert.alert("Error", "Please enter the 6-digit OTP code");

    try {
      setLoading(true);
      const res = await api.post("/auth/verify-otp", { userId, otp });
      
      Alert.alert("Success", "OTP verified successfully");
      navigation.navigate("ResetPassword", { resetToken: res.data.resetToken });
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
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
            We've sent a 6-digit verification code to your registered contact. Please enter it below.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="0 0 0 0 0 0"
              value={otp}
              onChangeText={setOtp}
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
            <TouchableOpacity onPress={() => Alert.alert("Resend", "OTP Resent!")}>
              <Text style={styles.resendLink}> Resend OTP</Text>
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