// SignIn.js - same tdc design, made smooth
// - No spinning logo / sliding inputs on open (one quick 180ms fade)
// - No full-screen "Signing In..." overlay; the button shows the spinner
// - No 2 second wait after a correct password: you go straight into the app
// - Errors: quick top bar + red field, light shake
// - Unverified accounts still go to SignupVerify; session-expired messages still show
import React, { useState, useContext, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Keyboard,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api, { injectSessionErrorHandler } from "../api/api";
import { AuthContext } from "../context/AuthContext";

const GOLD = "#f9c349";
const DARK = "#1a1a1a";

const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim().toLowerCase());

export default function SignIn({ navigation }) {
  const { setUser, setToken, loginAsGuest } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [errors, setErrors] = useState({ email: false, password: false });
  const [notification, setNotification] = useState(null); // { title, message }

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const noteAnim = useRef(new Animated.Value(0)).current;
  const passwordRef = useRef(null);
  const isMountedRef = useRef(true);
  const noteTimer = useRef(null);

  // ── one quick fade on open ──
  useEffect(() => {
    isMountedRef.current = true;
    Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    return () => {
      isMountedRef.current = false;
      clearTimeout(noteTimer.current);
      injectSessionErrorHandler(null);
    };
  }, [fadeAnim]);

  // ── top bar ──
  const hideNotification = useCallback(() => {
    clearTimeout(noteTimer.current);
    Animated.timing(noteAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      if (isMountedRef.current) setNotification(null);
    });
  }, [noteAnim]);

  const showNotification = useCallback(
    (title, message) => {
      if (!isMountedRef.current) return;
      setNotification({ title, message });
      noteAnim.setValue(0);
      Animated.timing(noteAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => isMountedRef.current && hideNotification(), 4000);
    },
    [noteAnim, hideNotification]
  );

  // session-expired messages from the API (re-attached when coming back here)
  useFocusEffect(
    useCallback(() => {
      injectSessionErrorHandler((title, message) => showNotification(title, message));
    }, [showNotification])
  );

  const shake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: false }));
    if (notification) hideNotification();
  };

  const handleGuestBrowse = async () => {
    if (guestLoading || loading) return;
    setGuestLoading(true);
    try {
      await loginAsGuest();
    } catch (error) {
      showNotification("Couldn't open guest mode", "Please try again.");
    } finally {
      if (isMountedRef.current) setGuestLoading(false);
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    Keyboard.dismiss();

    const newErrors = { email: !email.trim(), password: !password.trim() };
    setErrors(newErrors);
    if (newErrors.email || newErrors.password) {
      shake();
      return showNotification("Missing information", "Enter your email and password.");
    }
    if (!validateEmail(email)) {
      setErrors({ email: true, password: false });
      shake();
      return showNotification("Invalid email", "Please enter a valid email address.");
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email: email.trim(), password });
      const { token, user } = res.data || {};

      if (!token || !user) {
        showNotification("Login failed", "Unexpected response from the server. Please try again.");
        return;
      }
      if (user.role && user.role !== "student") {
        showNotification("Access denied", "This app is for student accounts only.");
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // straight into the app (the navigator switches screens by itself)
      setToken(token);
      setUser(user);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data || {};

      // Signed up but email not verified yet: backend sent a code
      if (status === 403 && data.needsVerification) {
        navigation.navigate("SignupVerify", {
          userId: data.userId,
          email: email.trim().toLowerCase(),
          maskedEmail: data.email,
          retryAfter: data.retryAfter || 0,
          fromLogin: true,
        });
        return;
      }

      let title = "Login failed";
      let message = "Please try again.";
      if (status === 401 || status === 400) {
        setErrors({ email: false, password: true });
        message = status === 400 && data.message ? data.message : "Wrong email or password.";
      } else if (status === 404) {
        setErrors({ email: true, password: false });
        title = "Account not found";
        message = "No account with this email. Create one below.";
      } else if (status === 429) {
        message = "Too many attempts. Please wait a minute.";
      } else if (status >= 500) {
        message = "Server error. Please try again shortly.";
      } else if (!err.response) {
        title = "No connection";
        message = "Check your internet and try again.";
      } else if (data.message) {
        message = data.message;
      }
      shake();
      showNotification(title, message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const emailOk = email.length > 0 && validateEmail(email) && !errors.email;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        {/* Top notification bar */}
        {notification && (
          <Animated.View
            style={[
              styles.notificationContainer,
              {
                opacity: noteAnim,
                transform: [{ translateY: noteAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
              },
            ]}
          >
            <View style={styles.notificationContent}>
              <View style={styles.notificationIconCircle}>
                <Ionicons name="alert-circle" size={22} color={GOLD} />
              </View>
              <View style={styles.notificationTextContainer}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                {notification.message ? (
                  <Text style={styles.notificationMessage} numberOfLines={2}>{notification.message}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={hideNotification} style={styles.notificationClose} hitSlop={8}>
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            {/* Header with logo */}
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>tdc<Text style={{ color: GOLD }}>.</Text></Text>
              </View>
              <Text style={styles.title}>The Deft Crew</Text>
              <Text style={styles.subtitle}>Sign in to manage your account</Text>
              <View style={styles.decorativeLine}>
                <View style={styles.lineSegment} />
                <View style={styles.diamond} />
                <View style={styles.lineSegment} />
              </View>
            </View>

            {/* Email */}
            <View
              style={[
                styles.inputWrapper,
                focusedInput === 'email' && !errors.email && styles.inputFocused,
                errors.email && styles.inputError,
              ]}
            >
              <View style={[styles.inputIconContainer, errors.email && styles.inputIconError]}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={errors.email ? "#ff4444" : focusedInput === 'email' ? GOLD : "#999"}
                />
              </View>
              <TextInput
                placeholder="Email Address"
                placeholderTextColor={errors.email ? "#ff8a8a" : "#999"}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearError('email');
                }}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                style={[styles.input, errors.email && styles.inputTextError]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!loading}
              />
              {emailOk && <Ionicons name="checkmark-circle" size={20} color={GOLD} style={styles.checkmarkContainer} />}
              {errors.email && <Ionicons name="alert-circle" size={20} color="#ff4444" style={styles.checkmarkContainer} />}
            </View>

            {/* Password */}
            <View
              style={[
                styles.inputWrapper,
                focusedInput === 'password' && !errors.password && styles.inputFocused,
                errors.password && styles.inputError,
              ]}
            >
              <View style={[styles.inputIconContainer, errors.password && styles.inputIconError]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={errors.password ? "#ff4444" : focusedInput === 'password' ? GOLD : "#999"}
                />
              </View>
              <TextInput
                ref={passwordRef}
                placeholder="Password"
                placeholderTextColor={errors.password ? "#ff8a8a" : "#999"}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  clearError('password');
                }}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                style={[styles.input, errors.password && styles.inputTextError]}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={errors.password ? "#ff4444" : "#999"}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => navigation.navigate("ForgotPassword")}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
              <Ionicons name="arrow-forward" size={14} color={GOLD} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {/* Sign in */}
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonBusy]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={GOLD} size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>SIGN IN</Text>
                    <Ionicons name="log-in-outline" size={18} color={GOLD} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Guest */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestBrowse}
              activeOpacity={0.7}
              disabled={guestLoading || loading}
            >
              {guestLoading ? (
                <ActivityIndicator color={DARK} size="small" />
              ) : (
                <>
                  <Ionicons name="globe-outline" size={18} color={DARK} style={{ marginRight: 8 }} />
                  <Text style={styles.guestButtonText}>Browse as Guest</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")} hitSlop={8}>
                <Text style={styles.signupLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Bottom branding */}
          <View style={styles.brandingFooter}>
            <Text style={styles.brandingText}>
              <Text style={{ fontSize: 14 }}>tdc</Text>
              <Text style={{ color: GOLD, fontSize: 20 }}>.</Text> PAKISTAN
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  keyboardView: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: "center" },

  notificationContainer: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f1f1',
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  notificationContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  notificationIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DARK,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  notificationTextContainer: { flex: 1 },
  notificationTitle: { fontSize: 14.5, fontWeight: '800', color: DARK },
  notificationMessage: { fontSize: 12.5, color: '#666', lineHeight: 17, marginTop: 1 },
  notificationClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  card: { backgroundColor: "#fff", paddingHorizontal: 24, paddingVertical: 16, width: '100%', maxWidth: 440, alignSelf: 'center' },
  header: { alignItems: "center", marginBottom: 24 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DARK,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    elevation: 8,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  logoText: { fontSize: 25, color: "#fff", fontWeight: "900", letterSpacing: -1 },
  title: { fontSize: 23, fontWeight: "900", color: DARK, letterSpacing: 0.3 },
  subtitle: { color: "#777", marginTop: 4, fontSize: 13.5 },
  decorativeLine: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  lineSegment: { width: 25, height: 2, backgroundColor: GOLD, borderRadius: 1 },
  diamond: { width: 7, height: 7, backgroundColor: DARK, transform: [{ rotate: '45deg' }], marginHorizontal: 8 },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 52,
    width: '100%',
  },
  inputFocused: { borderColor: GOLD, backgroundColor: "#fff" },
  inputError: { borderColor: "#ff4444", backgroundColor: "#fff5f5" },
  inputIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inputIconError: { backgroundColor: '#ffebee' },
  input: { flex: 1, paddingVertical: 6, fontSize: 14.5, color: DARK, fontWeight: '500' },
  inputTextError: { color: '#ff4444' },
  eyeButton: { padding: 8, marginLeft: 4 },
  checkmarkContainer: { marginLeft: 4 },

  forgotBtn: { alignSelf: "flex-end", marginBottom: 18, marginTop: 2, flexDirection: 'row', alignItems: 'center' },
  forgotText: { color: GOLD, fontWeight: "700", fontSize: 13, letterSpacing: 0.5 },

  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: DARK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    width: '100%',
    elevation: 4,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  buttonBusy: { opacity: 0.85 },
  buttonText: { color: GOLD, fontSize: 15, fontWeight: "800", letterSpacing: 1.5, marginRight: 8 },

  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: DARK,
    backgroundColor: 'transparent',
  },
  guestButtonText: { color: DARK, fontSize: 15, fontWeight: '700' },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 14, marginBottom: 6 },
  footerText: { color: "#999", fontSize: 13.5 },
  signupLink: { color: DARK, fontWeight: "800", fontSize: 13.5, textDecorationLine: 'underline' },

  brandingFooter: { alignItems: 'center', marginTop: 4, marginBottom: 14 },
  brandingText: { color: '#ccc', fontSize: 11, letterSpacing: 3, fontWeight: '600' },
});
