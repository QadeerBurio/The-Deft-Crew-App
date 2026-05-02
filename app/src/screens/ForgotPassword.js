import React, { useState, useRef, useEffect } from "react";
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
  Animated,
  StatusBar,
  Dimensions,
  Keyboard
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/api";

const { width } = Dimensions.get("window");

export default function ForgotPassword({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(false);
  const inputRef = useRef(null);

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Keyboard listeners
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setFocusedInput(false);
    });

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSendOTP = async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.92,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (!emailOrPhone || !emailOrPhone.trim()) {
      handleShake();
      return Alert.alert("Missing Information", "Please enter your registered email or phone number.");
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/forgot-password", {
        emailOrPhone: emailOrPhone.trim(),
      });

      Alert.alert(
        "OTP Sent! 📩",
        res.data.message || "A verification code has been sent to your email/phone.",
        [
          {
            text: "Continue",
            onPress: () => {
              if (res.data.userId) {
                navigation.navigate("VerifyOTP", { userId: res.data.userId });
              } else {
                Alert.alert("Error", "User ID not found. Please try again.");
              }
            }
          }
        ]
      );

    } catch (err) {
      handleShake();
      
      let errorMessage = "Server not reachable. Please try again.";
      if (err.response) {
        errorMessage = err.response.data?.message || err.response.data?.error || "Server error occurred.";
      } else if (err.request) {
        errorMessage = "No response from server. Please check your connection.";
      }
      
      Alert.alert("Request Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Wrap everything in a TouchableWithoutFeedback to allow keyboard dismiss */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Animated.View 
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            {/* Header with Logo */}
            <View style={styles.header}>
              <Animated.View 
                style={[
                  styles.logoBadge,
                  { 
                    transform: [
                      { scale: logoScale },
                      { rotate: logoSpin },
                    ] 
                  }
                ]}
              >
                <LinearGradient
                  colors={['#1a1a1a', '#1a1a1a']}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.logoText}>tdc<Text style={{color:"#f9c349"}}>.</Text></Text>
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter your email or phone to receive a verification code</Text>
              
              {/* Decorative Line */}
              <View style={styles.decorativeLine}>
                <View style={styles.lineSegment} />
                <View style={styles.diamond} />
                <View style={styles.lineSegment} />
              </View>
            </View>

            {/* Lock Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#1a1a1a', '#1a1a1a']}
                style={styles.iconGradient}
              >
                <Ionicons name="lock-open-outline" size={28} color="#f9c349" />
              </LinearGradient>
            </View>

            {/* Input Field - Fixed auto-close issue */}
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => inputRef.current?.focus()}
              style={[styles.inputWrapper, focusedInput && styles.inputFocused]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons 
                  name="mail-outline" 
                  size={18} 
                  color={focusedInput ? "#f9c349" : "#999"} 
                />
              </View>
              <TextInput
                ref={inputRef}
                placeholder="Email or Phone Number"
                placeholderTextColor="#999"
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocusedInput(true)}
                editable={!loading}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {emailOrPhone.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setEmailOrPhone('');
                    inputRef.current?.focus();
                  }} 
                  style={styles.clearBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color="#ccc" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Info Text */}
            <Text style={styles.infoText}>
              We'll send a 6-digit verification code to your registered email or phone number.
            </Text>

            {/* Send OTP Button with Shake Animation */}
            <Animated.View 
              style={[
                { 
                  transform: [
                    { translateX: shakeAnim }, 
                    { scale: buttonScale },
                  ] 
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleSendOTP} 
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#1a1a1a', '#1a1a1a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#f9c349" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>SEND OTP CODE</Text>
                      <Ionicons name="arrow-forward" size={20} color="#f9c349" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.signinLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Bottom Branding */}
          <Animated.View style={[styles.brandingFooter, { opacity: fadeAnim }]}>
            <Text style={styles.brandingText}>tdc<Text style={{color:'#f9c349'}}>.</Text> KARACHI • 2026</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 0,
  },

  // Full Width Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 0,
    padding: 30,
    paddingTop: 40,
    borderWidth: 0,
    borderColor: 'transparent',
    width: '100%',
  },

  // Header
  header: { 
    alignItems: "center", 
    marginBottom: 25 
  },
  logoBadge: { 
    marginBottom: 20,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: { 
    fontSize: 32, 
    color: "#fff", 
    fontWeight: "900",
    letterSpacing: -1,
  },
  title: { 
    fontSize: 26, 
    fontWeight: "900", 
    color: "#000",
    letterSpacing: 0.5,
  },
  subtitle: { 
    color: "#666", 
    marginTop: 8,
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  lineSegment: {
    width: 30,
    height: 2,
    backgroundColor: '#f9c349',
    borderRadius: 1,
  },
  diamond: {
    width: 8,
    height: 8,
    backgroundColor: '#000',
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 10,
  },

  // Lock Icon
  iconContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  iconGradient: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  // Input Styles
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 56,
    width: '100%',
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
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  input: { 
    flex: 1, 
    paddingVertical: 8, 
    fontSize: 15, 
    color: "#000",
    fontWeight: '500',
  },
  clearBtn: {
    padding: 6,
    marginLeft: 4,
  },

  // Info Text
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 20,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Button Styles
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    marginBottom: 10,
    width: '100%',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    width: '100%',
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "800",
    letterSpacing: 2,
    marginRight: 8,
  },

  // Footer
  footer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    marginTop: 25,
    width: '100%',
  },
  footerText: { 
    color: "#999",
    fontSize: 14,
  },
  signinLink: { 
    color: "#000", 
    fontWeight: "800",
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  // Branding
  brandingFooter: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  brandingText: {
    color: '#ccc',
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '600',
  },
});