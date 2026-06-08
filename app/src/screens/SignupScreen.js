import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import api from "../api/api";

const { width, height } = Dimensions.get("window");
const isTablet = Math.min(width, height) >= 768;

const UNIVERSITIES = [
  "Aga Khan University",
  "Baqai Medical University",
  "Bahria University Karachi",
  "NED University of Engineering & Technology",
  "University of Karachi",
  "Institute of Business Administration (IBA Karachi)",
  "Institute of Business Management (IoBM)",
  "SZABIST",
  "FAST-NUCES Karachi",
  "Sir Syed University of Engineering & Technology",
  "Dawood University of Engineering & Technology",
  "Hamdard University",
  "Iqra University",
  "Jinnah Sindh Medical University",
  "Dow University of Health Sciences",
  "Indus University",
  "Benazir Bhutto Shaheed University Lyari",
  "Federal Urdu University",
  "Karachi Institute of Economics & Technology (KIET)",
  "Muhammad Ali Jinnah University",
  "Habib University",
  "Shaheed Zulfikar Ali Bhutto Institute of Science & Technology",
  "Preston University Karachi",
  "Mohi-ud-Din Islamic University Karachi",
  "Greenwich University",
  "Newports Institute of Communications & Economics",
  "Textile Institute of Pakistan",
  "Sindh Madressatul Islam University",
  "DHA Suffa University",
  "Usman Institute of Technology",
  "Jinnah University for Women",
  "Ziauddin University",
  "Al-Hamd Islamic University Karachi Campus",
  "Virtual University of Pakistan Karachi Campus",
  "Allama Iqbal Open University Karachi Campus",
  "Iqra National University Karachi Campus",
  "Dadabhoy Institute of Higher Education",
  "KASBIT",
  "CAMS Institute of Business & Technology",
  "Pakistan Institute of Engineering & Applied Sciences Karachi Campus",
  "APWA Government College for Women",
  "Government College University Hyderabad Karachi Campus",
  "Royal Institute of Science & Technology",
  "Metropolitan University Karachi",
  "Ilma University",
  "The Millennium Universal College (TMUC) Karachi",
];

export default function SignupScreen({ navigation }) {
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [showUniversityModal, setShowUniversityModal] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isAlumni, setIsAlumni] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showLoading, setShowLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    university: false,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const notificationSlide = useRef(new Animated.Value(-200)).current;
  const notificationOpacity = useRef(new Animated.Value(0)).current;
  const notificationScale = useRef(new Animated.Value(0.9)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  const inputAnims = useRef(
    Array.from({ length: 9 }, () => new Animated.Value(0))
  ).current;

  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const loadingScaleX = loadingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cardWidth = useMemo(() => {
    if (isTablet) return Math.min(width - 72, 720);
    return width;
  }, []);

  useEffect(() => {
    if (route.params?.ref) {
      setReferralCode(route.params.ref);
    }
  }, [route.params?.ref]);

  useEffect(() => {
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
      ...inputAnims.map((anim, index) =>
        Animated.sequence([
          Animated.delay(300 + index * 80),
          Animated.spring(anim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const validateEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).toLowerCase());

  const validatePassword = (value) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(value);

  const validatePhone = (value) => /^0\d{10}$/.test(value);

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const showNotification = (title, message, type = "success") => {
    setNotification({ title, message, type });

    notificationSlide.setValue(-200);
    notificationOpacity.setValue(0);
    notificationScale.setValue(0.9);

    Animated.parallel([
      Animated.spring(notificationSlide, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(notificationScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (type === "success") {
      setTimeout(hideNotification, 3000);
    }
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(notificationSlide, {
        toValue: -200,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(notificationOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(notificationScale, {
        toValue: 0.9,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => setNotification(null));
  };

  const showLoadingOverlay = () => {
    setShowLoading(true);
    loadingProgress.setValue(0);

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(loadingProgress, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const hideLoadingOverlay = () => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowLoading(false));
  };

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

  const handleSignup = async () => {
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

    const newErrors = {
      name: !name.trim(),
      email: !email.trim(),
      password: !password.trim(),
      confirmPassword: !confirmPassword.trim(),
      university: !university,
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      handleShake();
      return showNotification("Required Fields", "Please complete all mandatory fields.", "error");
    }

    if (phone.trim() && !validatePhone(phone.trim())) {
      handleShake();
      return showNotification("Invalid Phone", "Enter an 11-digit number starting with 0.", "error");
    }

    if (!validateEmail(email.trim())) {
      handleShake();
      return showNotification("Invalid Email", "Please enter a valid email address.", "error");
    }

    if (!validatePassword(password)) {
      handleShake();
      return showNotification("Weak Password", "Use 6+ characters with uppercase, lowercase, and a number.", "error");
    }

    if (password !== confirmPassword) {
      handleShake();
      return showNotification("Password Mismatch", "Passwords do not match.", "error");
    }

    try {
      setLoading(true);
      showLoadingOverlay();

      const body = {
        role: "student",
        email: email.trim().toLowerCase(),
        password,
        fullName: name.trim(),
        rollNo: rollNo.trim() || undefined,
        phone: phone.trim() || undefined,
        universityName: university,
        referralCodeInput: referralCode.trim() || undefined,
        isAlumni,
      };

      await api.post("/auth/signup", body);

      hideLoadingOverlay();
      setLoading(false);
      showNotification("Welcome to the Crew!", "Account created successfully. Redirecting to login...", "success");

      setTimeout(() => {
        hideNotification();
        navigation.replace("Login");
      }, 2500);
    } catch (err) {
      hideLoadingOverlay();
      setLoading(false);
      handleShake();
      showNotification(
        "Signup Error",
        err?.response?.data?.error || "Connection error. Please try again.",
        "error"
      );
    }
  };

  const inputFields = [
    {
      key: "name",
      icon: "person-outline",
      placeholder: "Full Name",
      value: name,
      onChange: (text) => {
        setName(text);
        clearError("name");
      },
      keyboardType: "default",
      autoCapitalize: "words",
      errorKey: "name",
    },
    {
      key: "roll",
      icon: "id-card-outline",
      placeholder: isAlumni ? "Old Roll No (Optional)" : "Current Roll No / ID (Optional)",
      value: rollNo,
      onChange: setRollNo,
      keyboardType: "default",
      autoCapitalize: "characters",
    },
    {
      key: "phone",
      icon: "call-outline",
      placeholder: "Phone (Optional) 03xxxxxxxxx",
      value: phone,
      onChange: setPhone,
      keyboardType: "phone-pad",
      autoCapitalize: "none",
    },
    {
      key: "email",
      icon: "mail-outline",
      placeholder: "Email Address",
      value: email,
      onChange: (text) => {
        setEmail(text);
        clearError("email");
      },
      keyboardType: "email-address",
      autoCapitalize: "none",
      errorKey: "email",
    },
  ];

  const getBorderColor = (errorKey, fieldKey) => {
    if (errorKey && errors[errorKey]) return "#ff4444";
    if (focusedInput === fieldKey) return "#f9c349";
    return "transparent";
  };

  const getBackgroundColor = (errorKey, fieldKey) => {
    if (errorKey && errors[errorKey]) return "#fff5f5";
    if (focusedInput === fieldKey) return "#fff";
    return "#f8f8f8";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <StatusBar barStyle="dark-content" />

        {notification && (
          <Animated.View
            style={[
              styles.notificationContainer,
              {
                transform: [{ translateY: notificationSlide }, { scale: notificationScale }],
                opacity: notificationOpacity,
              },
            ]}
          >
            <LinearGradient
              colors={notification.type === "success" ? ["#fff", "#fff"] : ["#f0f0f0", "#e0e0e0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.notificationGradient}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationIconRow}>
                  <View style={styles.notificationIconCircle}>
                    <Ionicons
                      name={notification.type === "success" ? "checkmark-circle" : "alert-circle"}
                      size={24}
                      color="#f9c349"
                    />
                  </View>
                  <View style={styles.notificationTextContainer}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                  </View>
                </View>

                {notification.type === "error" && (
                  <TouchableOpacity onPress={hideNotification} style={styles.notificationClose}>
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {showLoading && (
          <Animated.View style={[styles.loadingOverlay, { opacity: overlayOpacity }]}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#f9c349" />
              <Text style={styles.loadingText}>Creating Account</Text>
              <View style={styles.loadingProgressContainer}>
                <Animated.View
                  style={[
                    styles.loadingProgressBar,
                    {
                      transform: [{ scaleX: loadingScaleX }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#f9c349", "#f7b733"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressGradient}
                  />
                </Animated.View>
              </View>
              <Text style={styles.loadingSubtext}>Please wait...</Text>
            </View>
          </Animated.View>
        )}

        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            isTablet && styles.scrollContainerTablet,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="always"
        >
          <Animated.View
            style={[
              styles.card,
              isTablet && styles.cardTablet,
              {
                width: cardWidth,
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            <View style={styles.header}>
              <Animated.View
                style={[
                  styles.logoBadge,
                  {
                    transform: [{ scale: logoScale }, { rotate: logoSpin }],
                  },
                ]}
              >
                <LinearGradient colors={["#1a1a1a", "#1a1a1a"]} style={styles.logoGradient}>
                  <Text style={styles.logoText}>
                    tdc<Text style={{ color: "#f9c349" }}>.</Text>
                  </Text>
                </LinearGradient>
              </Animated.View>

              <Text style={styles.title}>Join The Crew</Text>
              <Text style={styles.subtitle}>Unlock exclusive student & alumni deals</Text>

              <View style={styles.decorativeLine}>
                <View style={styles.lineSegment} />
                <View style={styles.diamond} />
                <View style={styles.lineSegment} />
              </View>
            </View>

            <Animated.View
              style={[
                styles.toggleContainer,
                isTablet && styles.toggleContainerTablet,
                {
                  opacity: inputAnims[0],
                  transform: [
                    {
                      translateX: inputAnims[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-60, 0],
                      }),
                    },
                    {
                      scale: inputAnims[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.toggleButton, !isAlumni && styles.toggleActive]}
                onPress={() => setIsAlumni(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleLabel, !isAlumni && styles.toggleLabelActive]}>
                  Current Student
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, isAlumni && styles.toggleActive]}
                onPress={() => setIsAlumni(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleLabel, isAlumni && styles.toggleLabelActive]}>
                  Alumni
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {inputFields.map((field, index) => (
              <Animated.View
                key={field.key}
                style={[
                  styles.inputWrapper,
                  isTablet && styles.inputWrapperTablet,
                  {
                    opacity: inputAnims[index + 1],
                    backgroundColor: field.errorKey
                      ? getBackgroundColor(field.errorKey, field.key)
                      : focusedInput === field.key
                        ? "#fff"
                        : "#f8f8f8",
                    borderColor: field.errorKey
                      ? getBorderColor(field.errorKey, field.key)
                      : focusedInput === field.key
                        ? "#f9c349"
                        : "transparent",
                  },
                  {
                    transform: [
                      {
                        translateX: inputAnims[index + 1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [index % 2 === 0 ? -60 : 60, 0],
                        }),
                      },
                      {
                        scale: inputAnims[index + 1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    styles.inputIconContainer,
                    field.errorKey && errors[field.errorKey] && { backgroundColor: "#ffebee" },
                  ]}
                >
                  <Ionicons
                    name={field.icon}
                    size={18}
                    color={
                      field.errorKey && errors[field.errorKey]
                        ? "#ff4444"
                        : focusedInput === field.key
                          ? "#f9c349"
                          : "#999"
                    }
                  />
                </View>

                <TextInput
                  placeholder={field.placeholder}
                  placeholderTextColor={field.errorKey && errors[field.errorKey] ? "#ff4444" : "#999"}
                  value={field.value}
                  onChangeText={field.onChange}
                  onFocus={() => {
                    setFocusedInput(field.key);
                    field.errorKey && clearError(field.errorKey);
                  }}
                  onBlur={() => setFocusedInput(null)}
                  style={[styles.input, field.errorKey && errors[field.errorKey] && { color: "#ff4444" }]}
                  keyboardType={field.keyboardType}
                  autoCapitalize={field.autoCapitalize}
                  autoCorrect={false}
                  textContentType={field.key === "email" ? "emailAddress" : "none"}
                  importantForAutofill="yes"
                  returnKeyType="next"
                />

                {field.key === "email" && field.value.length > 0 && validateEmail(field.value) && !errors.email && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark-circle" size={20} color="#f9c349" />
                  </View>
                )}

                {field.errorKey && errors[field.errorKey] && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="alert-circle" size={20} color="#ff4444" />
                  </View>
                )}
              </Animated.View>
            ))}

            <Animated.View
              style={[
                styles.inputWrapper,
                isTablet && styles.inputWrapperTablet,
                {
                  opacity: inputAnims[5],
                  backgroundColor: errors.university ? "#fff5f5" : focusedInput === "uni" ? "#fff" : "#f8f8f8",
                  borderColor: errors.university ? "#ff4444" : focusedInput === "uni" ? "#f9c349" : "transparent",
                  transform: [
                    {
                      translateX: inputAnims[5].interpolate({
                        inputRange: [0, 1],
                        outputRange: [60, 0],
                      }),
                    },
                    {
                      scale: inputAnims[5].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.inputIconContainer, errors.university && { backgroundColor: "#ffebee" }]}>
                <Ionicons
                  name="school-outline"
                  size={18}
                  color={errors.university ? "#ff4444" : focusedInput === "uni" ? "#f9c349" : "#999"}
                />
              </View>

              <TouchableOpacity
                style={styles.selectorButton}
                activeOpacity={0.8}
                onPress={() => {
                  setFocusedInput("uni");
                  setShowUniversityModal(true);
                }}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !university && styles.selectorPlaceholder,
                    errors.university && styles.selectorError,
                  ]}
                  numberOfLines={1}
                >
                  {university || "Select University"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={errors.university ? "#ff4444" : "#999"} />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.inputWrapper,
                isTablet && styles.inputWrapperTablet,
                {
                  opacity: inputAnims[6],
                  backgroundColor: errors.password ? "#fff5f5" : focusedInput === "pass" ? "#fff" : "#f8f8f8",
                  borderColor: errors.password ? "#ff4444" : focusedInput === "pass" ? "#f9c349" : "transparent",
                  transform: [
                    {
                      translateX: inputAnims[6].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-60, 0],
                      }),
                    },
                    {
                      scale: inputAnims[6].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.inputIconContainer, errors.password && { backgroundColor: "#ffebee" }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={errors.password ? "#ff4444" : focusedInput === "pass" ? "#f9c349" : "#999"}
                />
              </View>
              <TextInput
                placeholder="Password"
                placeholderTextColor={errors.password ? "#ff4444" : "#999"}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  clearError("password");
                }}
                onFocus={() => setFocusedInput("pass")}
                onBlur={() => setFocusedInput(null)}
                style={[styles.input, errors.password && { color: "#ff4444" }]}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={errors.password ? "#ff4444" : "#999"}
                />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.inputWrapper,
                isTablet && styles.inputWrapperTablet,
                {
                  opacity: inputAnims[7],
                  backgroundColor: errors.confirmPassword ? "#fff5f5" : focusedInput === "confirm" ? "#fff" : "#f8f8f8",
                  borderColor: errors.confirmPassword ? "#ff4444" : focusedInput === "confirm" ? "#f9c349" : "transparent",
                  transform: [
                    {
                      translateX: inputAnims[7].interpolate({
                        inputRange: [0, 1],
                        outputRange: [60, 0],
                      }),
                    },
                    {
                      scale: inputAnims[7].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.inputIconContainer, errors.confirmPassword && { backgroundColor: "#ffebee" }]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={errors.confirmPassword ? "#ff4444" : focusedInput === "confirm" ? "#f9c349" : "#999"}
                />
              </View>
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor={errors.confirmPassword ? "#ff4444" : "#999"}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  clearError("confirmPassword");
                }}
                onFocus={() => setFocusedInput("confirm")}
                onBlur={() => setFocusedInput(null)}
                style={[styles.input, errors.confirmPassword && { color: "#ff4444" }]}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={errors.confirmPassword ? "#ff4444" : "#999"}
                />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.inputWrapper,
                styles.referralWrapper,
                isTablet && styles.inputWrapperTablet,
                focusedInput === "ref" && styles.referralFocused,
                {
                  opacity: inputAnims[8],
                  transform: [
                    {
                      translateX: inputAnims[8].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-60, 0],
                      }),
                    },
                    {
                      scale: inputAnims[8].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons name="gift-outline" size={18} color="#f9c349" />
              </View>
              <TextInput
                placeholder="Referral Code (Optional)"
                placeholderTextColor="#999"
                value={referralCode}
                onChangeText={setReferralCode}
                onFocus={() => setFocusedInput("ref")}
                onBlur={() => setFocusedInput(null)}
                style={styles.input}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </Animated.View>

            <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: buttonScale }] }}>
              <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading} activeOpacity={0.9}>
                <LinearGradient colors={["#1a1a1a", "#1a1a1a"]} style={styles.buttonGradient}>
                  {loading ? (
                    <ActivityIndicator color="#f9c349" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
                      <Ionicons name="person-add-outline" size={20} color="#f9c349" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already in the crew? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.signupLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View style={[styles.brandingFooter, { opacity: fadeAnim }]}>
            <Text style={styles.brandingText}>
              <Text style={{ fontSize: 14 }}>tdc</Text>
              <Text style={{ color: "#f9c349", fontSize: 20 }}>.</Text> KARACHI • 2026
            </Text>
          </Animated.View>
        </ScrollView>

        <Modal
          visible={showUniversityModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowUniversityModal(false);
            setFocusedInput(null);
          }}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setShowUniversityModal(false);
              setFocusedInput(null);
            }}
          >
            <Pressable style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select University</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowUniversityModal(false);
                    setFocusedInput(null);
                  }}
                >
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {UNIVERSITIES.map((uni) => (
                  <TouchableOpacity
                    key={uni}
                    style={[styles.modalOption, university === uni && styles.modalOptionActive]}
                    onPress={() => {
                      setUniversity(uni);
                      clearError("university");
                      setShowUniversityModal(false);
                      setFocusedInput(null);
                    }}
                  >
                    <Text style={[styles.modalOptionText, university === uni && styles.modalOptionTextActive]}>
                      {uni}
                    </Text>
                    {university === uni && (
                      <Ionicons name="checkmark-circle" size={20} color="#f9c349" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
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
    paddingVertical: 12,
  },
  scrollContainerTablet: {
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 0,
    paddingHorizontal: 30,
    paddingVertical: 30,
    width: "100%",
    alignSelf: "center",
  },
  cardTablet: {
    borderRadius: 28,
    paddingHorizontal: 36,
    paddingVertical: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  notificationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  notificationGradient: {
    width: "100%",
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
  },
  notificationIconRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  notificationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#f9c349",
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 1,
    letterSpacing: 0.5,
    color: "#1a1a1a",
  },
  notificationMessage: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  notificationClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingContent: {
    width: isTablet ? 320 : 260,
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  loadingText: {
    color: "#f9c349",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 15,
    letterSpacing: 1,
  },
  loadingSubtext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 8,
    letterSpacing: 1,
  },
  loadingProgressContainer: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    marginTop: 20,
    overflow: "hidden",
  },
  loadingProgressBar: {
    width: "100%",
    height: "100%",
    transform: [{ scaleX: 0 }],
  },
  progressGradient: {
    width: "100%",
    height: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 12,
    marginTop: 2,
  },
  logoBadge: {
    marginBottom: 20,
    borderRadius: 50,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  logoGradient: {
    width: 70,
    height: 70,
    borderRadius: 50,
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
    fontSize: 28,
    fontWeight: "900",
    color: "#1a1a1a",
    letterSpacing: 1,
  },
  subtitle: {
    color: "#666",
    marginTop: 3,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  decorativeLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  lineSegment: {
    width: 25,
    height: 2,
    backgroundColor: "#f9c349",
    borderRadius: 1,
  },
  diamond: {
    width: 7,
    height: 7,
    backgroundColor: "#1a1a1a",
    transform: [{ rotate: "45deg" }],
    marginHorizontal: 8,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderRadius: 16,
    padding: 4,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#f0f0f0",
  },
  toggleContainerTablet: {
    marginBottom: 18,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 13,
  },
  toggleActive: {
    backgroundColor: "#1a1a1a",
    elevation: 4,
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.5,
  },
  toggleLabelActive: {
    color: "#f9c349",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 8,
    height: 56,
  },
  inputWrapperTablet: {
    height: 62,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  referralWrapper: {
    backgroundColor: "#fffbf0",
    borderColor: "#f9c34930",
    marginTop: 8,
  },
  referralFocused: {
    borderColor: "#f9c349",
    backgroundColor: "#fff",
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: isTablet ? 16 : 15,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  eyeButton: {
    padding: 8,
    marginLeft: 4,
  },
  checkmarkContainer: {
    marginLeft: 4,
  },
  selectorButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorText: {
    flex: 1,
    color: "#1a1a1a",
    fontSize: isTablet ? 16 : 15,
    fontWeight: "500",
    marginRight: 8,
  },
  selectorPlaceholder: {
    color: "#999",
  },
  selectorError: {
    color: "#ff4444",
  },
  button: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    marginTop: 18,
    marginBottom: 10,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 17,
  },
  buttonText: {
    color: "#f9c349",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    marginRight: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  footerText: {
    color: "#999",
    fontSize: 14,
  },
  signupLink: {
    color: "#1a1a1a",
    fontWeight: "800",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  brandingFooter: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  brandingText: {
    color: "#ccc",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    maxHeight: height * 0.7,
    padding: 18,
  },
  modalCardTablet: {
    alignSelf: "center",
    width: 560,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  modalOption: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalOptionActive: {
    backgroundColor: "#111",
  },
  modalOptionText: {
    flex: 1,
    color: "#1a1a1a",
    fontSize: 15,
    fontWeight: "500",
    marginRight: 12,
  },
  modalOptionTextActive: {
    color: "#fff",
  },
});