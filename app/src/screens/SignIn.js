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
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";

// Dark sign-in (SignIn design). DARK = primary text on ink.
const GOLD = T.yellow;
const DARK = "#F5F2EA";
const ERR = "#FF8F85"; // red that reads on ink

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
      <StatusBar barStyle="light-content" backgroundColor={T.ink} />
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
                <Ionicons name="close" size={18} color={T.textMuted} />
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
              <Text style={styles.logoText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                tdc<Text style={{ color: GOLD }}>.</Text>
              </Text>
              <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                student life is noise<Text style={{ color: GOLD }}>.</Text>
                {"\n"}{"let's sort it."}
              </Text>
              <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>free for every student. forever.</Text>
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
                  color={errors.email ? ERR : focusedInput === 'email' ? GOLD : T.onInkMuted}
                />
              </View>
              <TextInput
                placeholder="email"
                placeholderTextColor={errors.email ? ERR : "#8C877C"}
                accessibilityLabel="email"
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
              {errors.email && <Ionicons name="alert-circle" size={20} color={ERR} style={styles.checkmarkContainer} />}
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
                  color={errors.password ? ERR : focusedInput === 'password' ? GOLD : T.onInkMuted}
                />
              </View>
              <TextInput
                ref={passwordRef}
                placeholder="password"
                placeholderTextColor={errors.password ? ERR : "#8C877C"}
                accessibilityLabel="password"
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
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "hide password" : "show password"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={errors.password ? ERR : T.onInkMuted}
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
              <Text style={styles.forgotText}>forgot password?</Text>
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
                  <ActivityIndicator color={T.ink} size="small" />
                ) : (
                  <Text style={styles.buttonText} maxFontSizeMultiplier={MAX_FONT_SCALE}>sign in</Text>
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
                  <Text style={styles.guestButtonText} maxFontSizeMultiplier={MAX_FONT_SCALE}>browse as guest</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{"new here? "}</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")} hitSlop={8} accessibilityRole="button" accessibilityLabel="create account">
                <Text style={styles.signupLink}>create account</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Bottom branding */}
          <View style={styles.brandingFooter}>
            <Text style={styles.brandingText}>
              <Text>tdc</Text>
              <Text style={{ color: GOLD }}>.</Text> pakistan
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.ink },
  keyboardView: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: "center" },

  // Top notification (light card so error copy stays easy to read)
  notificationContainer: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.line,
  },
  notificationContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  notificationIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  notificationTextContainer: { flex: 1 },
  notificationTitle: { fontFamily: F.bodyBold, fontSize: 14.5, color: T.ink },
  notificationMessage: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, lineHeight: 17, marginTop: 1 },
  notificationClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  card: { paddingHorizontal: 24, paddingVertical: 16, width: '100%', maxWidth: 440, alignSelf: 'center' },
  header: { marginBottom: 28 },
  logoText: { fontFamily: F.heading, fontSize: 40, color: T.white },
  title: { fontFamily: F.heading, fontSize: 36, lineHeight: 38, letterSpacing: -1.2, color: DARK, marginTop: 24 },
  subtitle: { fontFamily: F.body, color: T.onInkMuted, marginTop: 12, fontSize: 15 },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.inkSoft,
    borderWidth: 1,
    borderColor: T.inkLine,
    borderRadius: 18,
    paddingHorizontal: 12,
    marginBottom: 10,
    height: 54,
    width: '100%',
  },
  inputFocused: { borderColor: GOLD, borderWidth: 1.5 },
  inputError: { borderColor: ERR, borderWidth: 1.5 },
  inputIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  inputIconError: {},
  input: { flex: 1, paddingVertical: 6, fontFamily: F.body, fontSize: 15, color: DARK },
  inputTextError: { color: ERR },
  eyeButton: { padding: 8, marginLeft: 4 },
  checkmarkContainer: { marginLeft: 4 },

  forgotBtn: { alignSelf: "flex-end", marginBottom: 18, marginTop: 2, minHeight: 32, justifyContent: 'center' },
  forgotText: { fontFamily: F.bodySemi, color: GOLD, fontSize: 13 },

  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    width: '100%',
  },
  buttonBusy: { opacity: 0.85 },
  buttonText: { fontFamily: F.heading, color: T.ink, fontSize: 16 },

  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    marginBottom: 6,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: T.inkLine,
    backgroundColor: 'transparent',
  },
  guestButtonText: { fontFamily: F.bodyBold, color: DARK, fontSize: 15 },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: 'center', marginTop: 14, marginBottom: 6, minHeight: 44 },
  footerText: { fontFamily: F.body, color: T.onInkMuted, fontSize: 14 },
  signupLink: { fontFamily: F.bodyBold, color: DARK, fontSize: 14 },

  brandingFooter: { alignItems: 'center', marginTop: 4, marginBottom: 14 },
  brandingText: { fontFamily: F.bodySemi, color: T.textMuted, fontSize: 12, letterSpacing: 2 },
});
