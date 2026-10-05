// SignupScreen.js - Updated: hide Academic Level when Alumni is selected
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
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
import { AuthContext } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");
const isTablet = Math.min(width, height) >= 768;

const UNIVERSITIES = [
  "Aga Khan Higher Secondary School",
  "Aga Khan University",
  "Air University",
  "Allama Iqbal Open University",
  "Alpha College",
  "Aror University of Art, Architecture, Design & Heritage",
  "Bahria University Islamabad",
  "Bahria University Karachi",
  "Baqai Medical University",
  "Beaconhouse",
  "Cedar College",
  "City School",
  "COMMECS College",
  "COMSATS University Islamabad",
  "COMSATS University Lahore Campus",
  "COMSATS University Sahiwal Campus",
  "COMSATS University Vehari Campus",
  "Dawood University of Engineering & Technology Karachi",
  "DHA Suffa University",
  "Dow International Medical College",
  "Faisalabad Medical University",
  "FAST-NUCES Karachi",
  "FAST-NUCES Lahore",
  "Fatima Jinnah Medical University",
  "FMH College of Medicine & Dentistry",
  "Foundation University Medical College",
  "Gambat Institute of Medical Sciences (GIMS)",
  "Gilgit Medical College",
  "Government College University Faisalabad",
  "Government College University Lahore",
  "Greenwich University",
  "Habib University Karachi",
  "Hamdard University Karachi",
  "Ilma University Karachi",
  "Indus Medical College",
  "Indus University",
  "Indus Valley School of Art and Architecture (IVS)",
  "Institute of Business Administration (IBA Karachi)",
  "Institute of Business Management (IoBM)",
  "International Islamic University Islamabad",
  "Iqra University",
  "Islamabad Medical & Dental College",
  "Isra Medical College",
  "Isra University",
  "Jhalawan Medical College",
  "Jinnah Medical & Dental College",
  "Jinnah Sindh Medical University",
  "Jinnah University for Women",
  "Karakoram International University",
  "Karachi Institute of Economics and Technology (KIET)",
  "Karachi Institute of Medical Sciences",
  "Karachi Medical & Dental College",
  "Karachi School of Business and Leadership (KSBL)",
  "KASBIT",
  "Khawaja Muhammad Safdar Medical College",
  "Khyber Medical College",
  "Khyber Medical University",
  "King Edward Medical University",
  "Lahore Medical & Dental College",
  "Lahore University of Management Sciences (LUMS)",
  "Liaquat College of Medicine & Dentistry",
  "Liaquat University of Medical & Health Sciences",
  "Loralai Medical College",
  "Lyceum",
  "Makran Medical College",
  "Mehran University of Engineering & Technology (MUET)",
  "Meritorious College",
  "Mohtarma Benazir Bhutto Shaheed Medical College",
  "Muhammad Ali Jinnah University",
  "National Defence University",
  "National Textile University",
  "National University of Medical Sciences (NUMS)",
  "National University of Modern Languages (NUML)",
  "National University of Sciences & Technology (NUST)",
  "NCR-CET College",
  "NED University of Engineering & Technology",
  "Newports Institute of Communications and Economics",
  "Nixor College",
  "Pakistan Institute of Engineering & Applied Sciences (PIEAS)",
  "Pakistan Institute of Medical Sciences (PIMS)",
  "Peoples University of Medical & Health Sciences",
  "Pir Mehr Ali Shah Arid Agriculture University",
  "Punjab Medical College",
  "Quaid-e-Awam University of Engineering, Science & Technology (QUEST)",
  "Quaid-e-Azam Medical College",
  "Quaid-i-Azam University",
  "Rawalpindi Medical University",
  "Riphah International University",
  "Salim Habib University",
  "Salim Sohail University",
  "Sceptre College",
  "Shah Abdul Latif University",
  "Shaheed Benazir Bhutto University Nawabshah",
  "Shaheed Mohtarma Benazir Bhutto Medical University Larkana",
  "Sindh Madressatul Islam University",
  "Sir Syed University of Engineering & Technology",
  "Southshore School",
  "Sukkur IBA University",
  "SZABIST",
  "Tabani's School & College",
  "The Islamia University of Bahawalpur",
  "Titan College",
  "United Medical and Dental College (UMDC)",
  "University of Agriculture Faisalabad",
  "University of Azad Jammu & Kashmir",
  "University of Balochistan",
  "University of Central Punjab",
  "University of Chakwal",
  "University of Engineering & Technology Lahore",
  "University of Engineering & Technology Peshawar",
  "University of Gujrat",
  "University of Karachi",
  "University of Lahore",
  "University of Management & Technology",
  "University of Okara",
  "University of Peshawar",
  "University of Sahiwal",
  "University of Sindh Jamshoro",
  "University of South Asia",
  "University of the Punjab",
  "Women University Multan",
  "Ziauddin Medical College",
  "Ziauddin University",
  "Ziauddin University Sukkur"
];

const GENDER_OPTIONS = ["Male", "Female"];

const ACADEMIC_LEVELS = [
  "Metric / O-levels",
  "Intermediate / A-levels",
  "1st year",
  "2nd year",
  "3rd year",
  "4th year",
  "5th year",
];

const CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Hyderabad",
  "Gujranwala",
  "Sialkot",
  "Sukkur",
  "Larkana",
  "Nawabshah",
  "Bahawalpur",
  "Sargodha",
  "Mirpur Khas",
  "Abbottabad",
  "Mardan",
  "Gujrat",
  "Kasur",
  "Rahim Yar Khan",
  "Sahiwal",
  "Okara",
  "Wah Cantt",
  "Dera Ghazi Khan",
  "Mingora",
  "Chiniot",
  "Kamoke",
  "Sheikhupura",
  "Jhang",
  "Dera Ismail Khan",
  "Kohat",
  "Muzaffarabad",
  "Gilgit",
  "Skardu",
];

export default function SignupScreen({ navigation }) {
  const route = useRoute();
  const { setUser, setToken } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [showUniversityModal, setShowUniversityModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showAcademicLevelModal, setShowAcademicLevelModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [citySearchQuery, setCitySearchQuery] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [city, setCity] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isAlumni, setIsAlumni] = useState(false);
  const [gender, setGender] = useState("");
  const [academicLevel, setAcademicLevel] = useState("");

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
    gender: false,
    academicLevel: false,
    city: false,
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
    Array.from({ length: 13 }, () => new Animated.Value(0))
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

  // Filter universities based on search query
  const filteredUniversities = useMemo(() => {
    if (!searchQuery.trim()) return UNIVERSITIES;
    const query = searchQuery.toLowerCase().trim();
    return UNIVERSITIES.filter(uni =>
      uni.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) return CITIES;
    const query = citySearchQuery.toLowerCase().trim();
    return CITIES.filter(c =>
      c.toLowerCase().includes(query)
    );
  }, [citySearchQuery]);

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
          Animated.delay(300 + index * 60),
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

    // Academic Level is only required for Students (not Alumni)
    const newErrors = {
      name: !name.trim(),
      email: !email.trim(),
      password: !password.trim(),
      confirmPassword: !confirmPassword.trim(),
      university: !university,
      gender: !gender,
      academicLevel: !isAlumni && !academicLevel,
      city: !city,
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
        gender,
        academicLevel: isAlumni ? undefined : academicLevel,
        city: city || undefined,
      };

      // ═══════════════════════════════════════════════════════════
      // STEP 1: SIGNUP — only this can throw "Connection error"
      // ═══════════════════════════════════════════════════════════
      const signupResponse = await api.post("/auth/signup", body);
      console.log("Signup successful:", signupResponse.data);

      // ═══════════════════════════════════════════════════════════
      // STEP 2: AUTO-LOGIN — isolated try/catch, NEVER shows
      // "Connection error" even if it fails
      // ═══════════════════════════════════════════════════════════
      let autoLoginSucceeded = false;

      try {
        const loginResponse = await api.post("/auth/login", {
          email: email.trim().toLowerCase(),
          password: password,
        });

        const { token: newToken, user: newUser } = loginResponse.data || {};

        if (newToken && newUser) {
          api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          setToken(newToken);
          setUser(newUser);
          autoLoginSucceeded = true;
        }
      } catch (loginError) {
        // Swallow the error — signup already succeeded
        console.log(
          "Auto-login failed (non-fatal):",
          loginError?.response?.data || loginError?.message
        );
        autoLoginSucceeded = false;
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 3: NAVIGATE — based on auto-login result
      // ═══════════════════════════════════════════════════════════
      hideLoadingOverlay();
      setLoading(false);

      if (autoLoginSucceeded) {
        // Success path: user is signed in
        showNotification(
          "Welcome to the Crew! 🎉",
          "Account created and signed in successfully!",
          "success"
        );

        setTimeout(() => {
          hideNotification();
          navigation.reset({
            index: 0,
            routes: [{ name: "Drawer" }],
          });
        }, 1500);
      } else {
        // Signup succeeded but auto-login failed — send to Login
        showNotification(
          "Account Created! 🎉",
          "Please sign in with your credentials.",
          "success"
        );

        setTimeout(() => {
          hideNotification();
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        }, 2000);
      }
    } catch (err) {
      // ═══════════════════════════════════════════════════════════
      // This catch ONLY runs if /auth/signup itself failed
      // ═══════════════════════════════════════════════════════════
      hideLoadingOverlay();
      setLoading(false);
      handleShake();

      const status = err?.response?.status;
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message;

      let message;
      if (serverMsg) {
        message = serverMsg;
      } else if (err?.request) {
        message = "Cannot reach server. Check your internet connection.";
      } else {
        message = "Something went wrong. Please try again.";
      }

      console.log("Signup error:", status, message);
      showNotification("Signup Error", message, "error");
    }
  };

  const openUniversityModal = () => {
    setSearchQuery("");
    setFocusedInput("uni");
    setShowUniversityModal(true);
  };

  const closeUniversityModal = () => {
    setShowUniversityModal(false);
    setFocusedInput(null);
    setSearchQuery("");
  };

  const selectUniversity = (uni) => {
    setUniversity(uni);
    clearError("university");
    closeUniversityModal();
  };

  const openRoleModal = () => {
    setFocusedInput("role");
    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setFocusedInput(null);
  };

  // ─────────────────────────────────────────────
  // ROLE SELECT — clears academic level when Alumni
  // ─────────────────────────────────────────────
  const selectRole = (alumni) => {
    setIsAlumni(alumni);
    if (alumni) {
      // Alumni → academic level is not needed
      setAcademicLevel("");
      setErrors((prev) => ({ ...prev, academicLevel: false }));
    }
    closeRoleModal();
  };

  const openGenderModal = () => {
    setFocusedInput("gender");
    setShowGenderModal(true);
  };

  const closeGenderModal = () => {
    setShowGenderModal(false);
    setFocusedInput(null);
  };

  const selectGender = (value) => {
    setGender(value);
    clearError("gender");
    closeGenderModal();
  };

  const openAcademicLevelModal = () => {
    setFocusedInput("academicLevel");
    setShowAcademicLevelModal(true);
  };

  const closeAcademicLevelModal = () => {
    setShowAcademicLevelModal(false);
    setFocusedInput(null);
  };

  const selectAcademicLevel = (value) => {
    setAcademicLevel(value);
    clearError("academicLevel");
    closeAcademicLevelModal();
  };

  const openCityModal = () => {
    setCitySearchQuery("");
    setFocusedInput("city");
    setShowCityModal(true);
  };

  const closeCityModal = () => {
    setShowCityModal(false);
    setFocusedInput(null);
    setCitySearchQuery("");
  };

  const selectCity = (value) => {
    setCity(value);
    clearError("city");
    closeCityModal();
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
      placeholder: "Phone (Optional)",
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

  // Generic selector row component
  const renderSelector = (options) => (
    options.map((option) => (
      <TouchableOpacity
        key={option.value}
        style={[styles.modalOption, option.selected && styles.modalOptionActive]}
        onPress={option.onPress}
        activeOpacity={0.7}
      >
        <View style={styles.modalOptionContent}>
          <Ionicons
            name={option.selected ? "checkmark-circle" : option.icon || "ellipse-outline"}
            size={18}
            color={option.selected ? "#f9c349" : "#999"}
            style={styles.modalOptionIcon}
          />
          <Text
            style={[
              styles.modalOptionText,
              option.selected && styles.modalOptionTextActive
            ]}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </View>
        {option.selected && (
          <Ionicons name="checkmark" size={18} color="#f9c349" />
        )}
      </TouchableOpacity>
    ))
  );

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

        <View style={styles.mainContainer}>
          {/* Fixed Header */}
          <Animated.View
            style={[
              styles.fixedHeader,
              isTablet && styles.fixedHeaderTablet,
              {
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

              <Text style={styles.title}>The Deft Crew</Text>
              <Text style={styles.subtitle}>Create Your Account</Text>

              <View style={styles.decorativeLine}>
                <View style={styles.lineSegment} />
                <View style={styles.diamond} />
                <View style={styles.lineSegment} />
              </View>
            </View>
          </Animated.View>

          {/* Scrollable Fields */}
          <ScrollView
            style={styles.fieldsScrollView}
            contentContainerStyle={styles.fieldsScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            scrollEventThrottle={16}
            decelerationRate="normal"
          >
            {/* Role Dropdown (Student/Alumni) */}
            <Animated.View
              style={[
                styles.inputWrapper,
                isTablet && styles.inputWrapperTablet,
                {
                  opacity: inputAnims[0],
                  backgroundColor: focusedInput === "role" ? "#fff" : "#f8f8f8",
                  borderColor: focusedInput === "role" ? "#f9c349" : "transparent",
                  borderWidth: focusedInput === "role" ? 1.5 : 0,
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name={isAlumni ? "ribbon-outline" : "school-outline"}
                  size={18}
                  color={focusedInput === "role" ? "#f9c349" : "#999"}
                />
              </View>
              <TouchableOpacity
                style={styles.selectorButton}
                activeOpacity={0.8}
                onPress={openRoleModal}
              >
                <Text style={styles.selectorText}>
                  {isAlumni ? "Alumni" : "Student"}
                </Text>
                <Ionicons
                  name={showRoleModal ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#999"
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Input Fields */}
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
                    borderWidth: focusedInput === field.key || (field.errorKey && errors[field.errorKey]) ? 1.5 : 0,
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
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
                  style={[
                    styles.input,
                    field.errorKey && errors[field.errorKey] && { color: "#ff4444" }
                  ]}
                  keyboardType={field.keyboardType}
                  autoCapitalize={field.autoCapitalize}
                  autoCorrect={false}
                  textContentType={field.key === "email" ? "emailAddress" : "none"}
                  importantForAutofill="yes"
                  returnKeyType="next"
                />

                {field.key === "email" && field.value.length > 0 && validateEmail(field.value) && !errors.email && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark-circle" size={18} color="#f9c349" />
                  </View>
                )}

                {field.errorKey && errors[field.errorKey] && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="alert-circle" size={18} color="#ff4444" />
                  </View>
                )}
              </Animated.View>
            ))}

            {/* Gender Dropdown */}
            <Animated.View
              style={[
                styles.inputWrapper,
                isTablet && styles.inputWrapperTablet,
                {
                  opacity: inputAnims[5],
                  backgroundColor: errors.gender ? "#fff5f5" : focusedInput === "gender" ? "#fff" : "#f8f8f8",
                  borderColor: errors.gender ? "#ff4444" : focusedInput === "gender" ? "#f9c349" : "transparent",
                  borderWidth: focusedInput === "gender" || errors.gender ? 1.5 : 0,
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={errors.gender ? "#ff4444" : focusedInput === "gender" ? "#f9c349" : "#999"}
                />
              </View>
              <TouchableOpacity
                style={styles.selectorButton}
                activeOpacity={0.8}
                onPress={openGenderModal}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !gender && styles.selectorPlaceholder,
                    errors.gender && styles.selectorError,
                  ]}
                  numberOfLines={1}
                >
                  {gender || "Select Gender"}
                </Text>
                <Ionicons
                  name={showGenderModal ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={errors.gender ? "#ff4444" : "#999"}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Academic Level Dropdown — HIDDEN FOR ALUMNI */}
            {!isAlumni && (
              <Animated.View
                style={[
                  styles.inputWrapper,
                  isTablet && styles.inputWrapperTablet,
                  {
                    opacity: inputAnims[6],
                    backgroundColor: errors.academicLevel ? "#fff5f5" : focusedInput === "academicLevel" ? "#fff" : "#f8f8f8",
                    borderColor: errors.academicLevel ? "#ff4444" : focusedInput === "academicLevel" ? "#f9c349" : "transparent",
                    borderWidth: focusedInput === "academicLevel" || errors.academicLevel ? 1.5 : 0,
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
                  <Ionicons
                    name="school-outline"
                    size={18}
                    color={errors.academicLevel ? "#ff4444" : focusedInput === "academicLevel" ? "#f9c349" : "#999"}
                  />
                </View>
                <TouchableOpacity
                  style={styles.selectorButton}
                  activeOpacity={0.8}
                  onPress={openAcademicLevelModal}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      !academicLevel && styles.selectorPlaceholder,
                      errors.academicLevel && styles.selectorError,
                    ]}
                    numberOfLines={1}
                  >
                    {academicLevel || "Select Academic Level"}
                  </Text>
                  <Ionicons
                    name={showAcademicLevelModal ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={errors.academicLevel ? "#ff4444" : "#999"}
                  />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* University Dropdown */}
            <Animated.View
              style={[
                styles.inputWrapper,
                styles.universityWrapper,
                isTablet && styles.inputWrapperTablet,
                {
                  opacity: inputAnims[7],
                  backgroundColor: errors.university ? "#fff5f5" : focusedInput === "uni" ? "#fff" : "#f8f8f8",
                  borderColor: errors.university ? "#ff4444" : focusedInput === "uni" ? "#f9c349" : "transparent",
                  borderWidth: focusedInput === "uni" || errors.university ? 1.5 : 0,
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="school-outline"
                  size={18}
                  color={errors.university ? "#ff4444" : focusedInput === "uni" ? "#f9c349" : "#999"}
                />
              </View>

              <TouchableOpacity
                style={styles.selectorButton}
                activeOpacity={0.8}
                onPress={openUniversityModal}
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
                <Ionicons
                  name={showUniversityModal ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={errors.university ? "#ff4444" : "#999"}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* City Dropdown */}
            <Animated.View
              style={[
                styles.inputWrapper,
                isTablet && styles.inputWrapperTablet,
                {
                  opacity: inputAnims[8],
                  backgroundColor: errors.city ? "#fff5f5" : focusedInput === "city" ? "#fff" : "#f8f8f8",
                  borderColor: errors.city ? "#ff4444" : focusedInput === "city" ? "#f9c349" : "transparent",
                  borderWidth: focusedInput === "city" || errors.city ? 1.5 : 0,
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={errors.city ? "#ff4444" : focusedInput === "city" ? "#f9c349" : "#999"}
                />
              </View>
              <TouchableOpacity
                style={styles.selectorButton}
                activeOpacity={0.8}
                onPress={openCityModal}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !city && styles.selectorPlaceholder,
                    errors.city && styles.selectorError,
                  ]}
                  numberOfLines={1}
                >
                  {city || "Select City"}
                </Text>
                <Ionicons
                  name={showCityModal ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={errors.city ? "#ff4444" : "#999"}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Password Field */}
            <Animated.View
              style={[
                styles.inputWrapper,
                isTablet && styles.inputWrapperTablet,
                {
                  opacity: inputAnims[9],
                  backgroundColor: errors.password ? "#fff5f5" : focusedInput === "pass" ? "#fff" : "#f8f8f8",
                  borderColor: errors.password ? "#ff4444" : focusedInput === "pass" ? "#f9c349" : "transparent",
                  borderWidth: focusedInput === "pass" || errors.password ? 1.5 : 0,
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
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

            {/* Confirm Password Field */}
            <Animated.View
              style={[
                styles.inputWrapper,
                isTablet && styles.inputWrapperTablet,
                {
                  opacity: inputAnims[10],
                  backgroundColor: errors.confirmPassword ? "#fff5f5" : focusedInput === "confirm" ? "#fff" : "#f8f8f8",
                  borderColor: errors.confirmPassword ? "#ff4444" : focusedInput === "confirm" ? "#f9c349" : "transparent",
                  borderWidth: focusedInput === "confirm" || errors.confirmPassword ? 1.5 : 0,
                },
              ]}
            >
              <View style={styles.inputIconContainer}>
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

            {/* Referral Code Field */}
            <Animated.View
              style={[
                styles.inputWrapper,
                styles.referralWrapper,
                isTablet && styles.inputWrapperTablet,
                {
                  opacity: inputAnims[11],
                  borderWidth: focusedInput === "ref" ? 1.5 : 0,
                },
              ]}
            >
              <View style={[styles.inputIconContainer, styles.referralIconContainer]}>
                <Ionicons name="gift-outline" size={18} color="#f9c349" />
              </View>
              <TextInput
                placeholder="Referral Code (Optional)"
                placeholderTextColor="#999"
                value={referralCode}
                onChangeText={setReferralCode}
                onFocus={() => setFocusedInput("ref")}
                onBlur={() => setFocusedInput(null)}
                style={[styles.input, styles.referralInput]}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </Animated.View>

            {/* Spacer for bottom padding */}
            <View style={styles.scrollBottomSpacer} />
          </ScrollView>

          {/* Fixed Footer */}
          <Animated.View
            style={[
              styles.fixedFooter,
              isTablet && styles.fixedFooterTablet,
              {
                opacity: fadeAnim,
              },
            ]}
          >
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

            <View style={styles.brandingFooter}>
              <Text style={styles.brandingText}>
                <Text style={{ fontSize: 14 }}>tdc</Text>
                <Text style={{ color: "#f9c349", fontSize: 20 }}>.</Text> PAKISTAN
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* University Modal */}
        <Modal
          visible={showUniversityModal}
          transparent
          animationType="fade"
          onRequestClose={closeUniversityModal}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeUniversityModal}
          >
            <Pressable style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Ionicons name="school-outline" size={22} color="#1a1a1a" />
                  <Text style={styles.modalTitle}>Select University</Text>
                </View>
                <TouchableOpacity onPress={closeUniversityModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                  <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search universities..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={true}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchButton}>
                      <Ionicons name="close-circle" size={18} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={styles.resultsCount}>
                {filteredUniversities.length} {filteredUniversities.length === 1 ? 'university' : 'universities'} found
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.modalScrollView}
              >
                {filteredUniversities.length > 0 ? (
                  filteredUniversities.map((uni) => (
                    <TouchableOpacity
                      key={uni}
                      style={[styles.modalOption, university === uni && styles.modalOptionActive]}
                      onPress={() => selectUniversity(uni)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modalOptionContent}>
                        <Ionicons
                          name={university === uni ? "checkmark-circle" : "school-outline"}
                          size={18}
                          color={university === uni ? "#f9c349" : "#999"}
                          style={styles.modalOptionIcon}
                        />
                        <Text
                          style={[
                            styles.modalOptionText,
                            university === uni && styles.modalOptionTextActive
                          ]}
                          numberOfLines={1}
                        >
                          {uni}
                        </Text>
                      </View>
                      {university === uni && (
                        <Ionicons name="checkmark" size={18} color="#f9c349" />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="school-outline" size={48} color="#ddd" />
                    <Text style={styles.noResultsText}>No universities found</Text>
                    <Text style={styles.noResultsSubtext}>Try adjusting your search</Text>
                  </View>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Role Modal */}
        <Modal
          visible={showRoleModal}
          transparent
          animationType="fade"
          onRequestClose={closeRoleModal}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeRoleModal}
          >
            <Pressable style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Ionicons name="people-outline" size={22} color="#1a1a1a" />
                  <Text style={styles.modalTitle}>Select Role</Text>
                </View>
                <TouchableOpacity onPress={closeRoleModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScrollView}
              >
                {renderSelector([
                  {
                    value: "student",
                    label: "Student",
                    selected: !isAlumni,
                    icon: "school-outline",
                    onPress: () => selectRole(false),
                  },
                  {
                    value: "alumni",
                    label: "Alumni",
                    selected: isAlumni,
                    icon: "ribbon-outline",
                    onPress: () => selectRole(true),
                  },
                ])}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Gender Modal */}
        <Modal
          visible={showGenderModal}
          transparent
          animationType="fade"
          onRequestClose={closeGenderModal}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeGenderModal}
          >
            <Pressable style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Ionicons name="person-outline" size={22} color="#1a1a1a" />
                  <Text style={styles.modalTitle}>Select Gender</Text>
                </View>
                <TouchableOpacity onPress={closeGenderModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScrollView}
              >
                {renderSelector(GENDER_OPTIONS.map((option) => ({
                  value: option,
                  label: option,
                  selected: gender === option,
                  onPress: () => selectGender(option),
                })))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Academic Level Modal */}
        <Modal
          visible={showAcademicLevelModal}
          transparent
          animationType="fade"
          onRequestClose={closeAcademicLevelModal}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeAcademicLevelModal}
          >
            <Pressable style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Ionicons name="school-outline" size={22} color="#1a1a1a" />
                  <Text style={styles.modalTitle}>Select Academic Level</Text>
                </View>
                <TouchableOpacity onPress={closeAcademicLevelModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScrollView}
              >
                {renderSelector(ACADEMIC_LEVELS.map((option) => ({
                  value: option,
                  label: option,
                  selected: academicLevel === option,
                  onPress: () => selectAcademicLevel(option),
                })))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* City Modal */}
        <Modal
          visible={showCityModal}
          transparent
          animationType="fade"
          onRequestClose={closeCityModal}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeCityModal}
          >
            <Pressable style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Ionicons name="location-outline" size={22} color="#1a1a1a" />
                  <Text style={styles.modalTitle}>Select City</Text>
                </View>
                <TouchableOpacity onPress={closeCityModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                  <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search cities..."
                    placeholderTextColor="#999"
                    value={citySearchQuery}
                    onChangeText={setCitySearchQuery}
                    autoFocus={true}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                  {citySearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setCitySearchQuery("")} style={styles.clearSearchButton}>
                      <Ionicons name="close-circle" size={18} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={styles.resultsCount}>
                {filteredCities.length} {filteredCities.length === 1 ? 'city' : 'cities'} found
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.modalScrollView}
              >
                {filteredCities.length > 0 ? (
                  filteredCities.map((cityName) => (
                    <TouchableOpacity
                      key={cityName}
                      style={[styles.modalOption, city === cityName && styles.modalOptionActive]}
                      onPress={() => selectCity(cityName)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modalOptionContent}>
                        <Ionicons
                          name={city === cityName ? "checkmark-circle" : "location-outline"}
                          size={18}
                          color={city === cityName ? "#f9c349" : "#999"}
                          style={styles.modalOptionIcon}
                        />
                        <Text
                          style={[
                            styles.modalOptionText,
                            city === cityName && styles.modalOptionTextActive
                          ]}
                          numberOfLines={1}
                        >
                          {cityName}
                        </Text>
                      </View>
                      {city === cityName && (
                        <Ionicons name="checkmark" size={18} color="#f9c349" />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="location-outline" size={48} color="#ddd" />
                    <Text style={styles.noResultsText}>No cities found</Text>
                    <Text style={styles.noResultsSubtext}>Try adjusting your search</Text>
                  </View>
                )}
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
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  fixedHeader: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#fff",
    zIndex: 10,
  },
  fixedHeaderTablet: {
    paddingHorizontal: 36,
    paddingTop: 12,
  },
  fieldsScrollView: {
    flex: 1,
  },
  fieldsScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  scrollBottomSpacer: {
    height: 8,
  },
  fixedFooter: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    zIndex: 10,
  },
  fixedFooterTablet: {
    paddingHorizontal: 36,
  },
  header: {
    alignItems: "center",
    marginBottom: 8,
    marginTop: 2,
  },
  logoBadge: {
    marginBottom: 12,
    borderRadius: 50,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  logoGradient: {
    width: 56,
    height: 56,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "900",
    letterSpacing: -1,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1a1a1a",
    letterSpacing: 1,
  },
  subtitle: {
    color: "#666",
    marginTop: 2,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  decorativeLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  lineSegment: {
    width: 20,
    height: 2,
    backgroundColor: "#f9c349",
    borderRadius: 1,
  },
  diamond: {
    width: 6,
    height: 6,
    backgroundColor: "#1a1a1a",
    transform: [{ rotate: "45deg" }],
    marginHorizontal: 8,
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
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    height: 48,
  },
  inputWrapperTablet: {
    height: 54,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  universityWrapper: {
    marginBottom: 10,
  },
  referralWrapper: {
    backgroundColor: "#fffbf0",
    borderColor: "#f9c34930",
    marginBottom: 12,
  },
  referralIconContainer: {
    backgroundColor: "#f9c34920",
  },
  referralInput: {
    color: "#1a1a1a",
  },
  inputIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: isTablet ? 15 : 14,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  eyeButton: {
    padding: 6,
    marginLeft: 4,
  },
  checkmarkContainer: {
    marginLeft: 4,
  },
  selectorButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  selectorText: {
    flex: 1,
    color: "#1a1a1a",
    fontSize: isTablet ? 15 : 14,
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
    borderRadius: 12,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  buttonText: {
    color: "#f9c349",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginRight: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  footerText: {
    color: "#999",
    fontSize: 13,
  },
  signupLink: {
    color: "#1a1a1a",
    fontWeight: "800",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  brandingFooter: {
    alignItems: "center",
    marginBottom: 4,
  },
  brandingText: {
    color: "#ccc",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: height * 0.7,
    width: "100%",
    padding: 20,
  },
  modalCardTablet: {
    maxWidth: 560,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#eee",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1a1a1a",
  },
  clearSearchButton: {
    padding: 4,
  },
  resultsCount: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  modalScrollView: {
    maxHeight: height * 0.5,
  },
  modalOption: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  modalOptionActive: {
    backgroundColor: "#f9c34915",
  },
  modalOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalOptionIcon: {
    marginRight: 10,
  },
  modalOptionText: {
    flex: 1,
    color: "#1a1a1a",
    fontSize: 14,
    fontWeight: "500",
  },
  modalOptionTextActive: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  noResultsSubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
});