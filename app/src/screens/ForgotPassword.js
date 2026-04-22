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
import { Ionicons } from "@expo/vector-icons"; // Ensure you have expo/vector-icons

export default function ForgotPassword({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [loading, setLoading] = useState(false);

 // ForgotPassword.js - Updated version
const handleSendOTP = async () => {
  if (!emailOrPhone) {
    return Alert.alert("Error", "Please enter your registered email or phone");
  }

  try {
    setLoading(true);

    console.log("Sending:", emailOrPhone);

    // FIX: Match the backend expected field name
    const res = await api.post("/auth/forgot-password", {
      emailOrPhone: emailOrPhone.trim(), // This is correct - matches backend
    });

    console.log("Response:", res.data);

    Alert.alert("Success", res.data.message || "OTP sent successfully");

    // FIX: Check if userId exists in response
    if (res.data.userId) {
      navigation.navigate("VerifyOTP", { userId: res.data.userId });
    } else {
      Alert.alert("Error", "User ID not found in response");
    }

  } catch (err) {
    console.log("Full error:", err);
    console.log("Error response:", err.response);
    console.log("Error message:", err.message);
    
    // Better error handling
    let errorMessage = "Server not reachable";
    if (err.response) {
      errorMessage = err.response.data?.message || err.response.data?.error || "Server error";
    } else if (err.request) {
      errorMessage = "No response from server. Please check your connection.";
    }
    
    Alert.alert("Error", errorMessage);
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
          <Ionicons name="arrow-back" size={24} color="#08634f" />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-open-outline" size={40} color="#000000" />
          </View>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your details below and we'll send you an OTP to reset your account.
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              placeholder="Email or Phone Number"
              value={emailOrPhone}
              onChangeText={setEmailOrPhone}
              style={styles.input}
              autoCapitalize="none"
              placeholderTextColor="#aaa"
            />
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleSendOTP} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send OTP Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate("Login")} 
            style={styles.footerLink}
          >
            <Text style={styles.footerText}>
              Remember your password? <Text style={styles.linkBold}>Login</Text>
            </Text>
          </TouchableOpacity>
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
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fafafa",
    marginBottom: 25,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
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
  footerLink: {
    marginTop: 25,
  },
  footerText: {
    color: "#555",
    fontSize: 14,
  },
  linkBold: {
    color: "#000000",
    fontWeight: "bold",
  },
});