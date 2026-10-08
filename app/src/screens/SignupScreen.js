// app/src/screens/SignupScreen.js
// Create account. Same look as Sign in / Forgot / Verify (components/AuthShell).
// - Errors show under each field, server errors in a small banner (no popups)
// - No entrance animations or loading overlay: the button spinner is enough
// - requiresVerification → SignupVerify (6-digit email code)
// - Otherwise auto-login; setting the user switches the app by itself

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { AuthShell, AuthInput, AuthButton, AUTH } from "../components/AuthShell";

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

const RULES = [
  { key: "len", label: "6+ characters", test: (p) => p.length >= 6 },
  { key: "num", label: "a number", test: (p) => /\d/.test(p) },
  { key: "case", label: "upper and lower case", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
];

const STRENGTH = [
  { label: "too short", color: "#e5e5e5" },
  { label: "weak", color: AUTH.danger },
  { label: "okay", color: "#f59e0b" },
  { label: "strong", color: AUTH.ok },
];

const EMPTY_ERRORS = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  university: "",
  gender: "",
  academicLevel: "",
  city: "",
  phone: "",
};

const validateEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).toLowerCase());

const validatePassword = (value) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(value);

const validatePhone = (value) => /^0\d{10}$/.test(value);

// ─── small building blocks ────────────────────────────────────

function SectionLabel({ children }) {
  return <Text style={styles.section}>{children}</Text>;
}

function PickerField({ label, icon, value, placeholder, error, onPress, active, disabled }) {
  const selected = !!value;
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.picker,
          (active || selected) && styles.pickerOn,
          !!error && styles.pickerError,
        ]}
      >
        <Ionicons name={icon} size={18} color={active || selected ? AUTH.dark : AUTH.muted} />
        <Text style={[styles.pickerText, !selected && styles.pickerPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={AUTH.muted} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function PickerSheet({ visible, title, options, selected, onSelect, onClose, searchable, searchPlaceholder }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const data = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetWrap}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, searchable && styles.sheetTall, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose} hitSlop={10}>
              <Ionicons name="close" size={18} color={AUTH.dark} />
            </TouchableOpacity>
          </View>

          {searchable ? (
            <View style={styles.search}>
              <Ionicons name="search" size={17} color={AUTH.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholder || "search"}
                placeholderTextColor="#a8a8a8"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={17} color={AUTH.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <FlatList
            data={data}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            style={searchable ? { flex: 1 } : undefined}
            ListEmptyComponent={<Text style={styles.empty}>No matches. Try another spelling.</Text>}
            renderItem={({ item }) => {
              const on = item === selected;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onSelect(item)}
                  style={[styles.row, on && styles.rowOn]}
                >
                  <Text style={[styles.rowText, on && styles.rowTextOn]} numberOfLines={2}>
                    {item}
                  </Text>
                  {on ? <Ionicons name="checkmark-circle" size={20} color={AUTH.dark} /> : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── screen ───────────────────────────────────────────────────

export default function SignupScreen({ navigation }) {
  const route = useRoute();
  const { setUser, setToken } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(null); // 'university' | 'city' | 'gender' | 'academicLevel'

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

  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [banner, setBanner] = useState(null); // { title, message }

  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const rollRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const referralRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (route.params?.ref) {
      setReferralCode(route.params.ref);
    }
  }, [route.params?.ref]);

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // password strength (same as ResetPassword)
  const passed = RULES.filter((r) => r.test(password)).length;
  const level = password.length === 0 ? 0 : password.length < 6 ? 1 : passed;
  const strength = STRENGTH[Math.min(level, 3)];
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const openSheet = (key) => {
    Keyboard.dismiss();
    setSheet(key);
  };
  const closeSheet = () => setSheet(null);

  const selectRole = (alumni) => {
    setIsAlumni(alumni);
    if (alumni) {
      // Alumni → academic level is not needed
      setAcademicLevel("");
      setErrors((prev) => ({ ...prev, academicLevel: "" }));
    }
  };

  const onSelect = (value) => {
    if (sheet === "university") setUniversity(value);
    else if (sheet === "city") setCity(value);
    else if (sheet === "gender") setGender(value);
    else if (sheet === "academicLevel") setAcademicLevel(value);
    clearError(sheet);
    closeSheet();
  };

  const validate = () => {
    const e = { ...EMPTY_ERRORS };
    const em = email.trim();
    const ph = phone.trim();

    if (!name.trim()) e.name = "Enter your full name";
    if (!gender) e.gender = "Pick your gender";
    if (ph && !validatePhone(ph)) e.phone = "Enter an 11-digit number starting with 0";
    if (!university) e.university = "Pick your university";
    if (!city) e.city = "Pick your city";
    // Academic Level is only required for Students (not Alumni)
    if (!isAlumni && !academicLevel) e.academicLevel = "Pick your academic level";
    if (!em) e.email = "Enter your email";
    else if (!validateEmail(em)) e.email = "That email doesn't look right";
    if (!password.trim()) e.password = "Create a password";
    else if (!validatePassword(password)) e.password = "Use 6+ characters with upper case, lower case and a number";
    if (!confirmPassword.trim()) e.confirmPassword = "Confirm your password";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords don't match";

    return e;
  };

  const handleSignup = async () => {
    if (loading) return;
    Keyboard.dismiss();
    setBanner(null);

    const e = validate();
    setErrors(e);
    const firstError = Object.keys(e).find((k) => e[k]);
    if (firstError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // focusing the first bad text field scrolls it into view
      const refs = {
        name: nameRef,
        phone: phoneRef,
        email: emailRef,
        password: passwordRef,
        confirmPassword: confirmRef,
      };
      refs[firstError]?.current?.focus();
      return;
    }

    try {
      setLoading(true);

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

      // STEP 1: signup (only this one can show an error)
      const signupResponse = await api.post("/auth/signup", body, { timeout: 25000 });

      // Email verification: backend sent a 6-digit code.
      // The account logs in after the code on SignupVerify.
      if (signupResponse.data?.requiresVerification) {
        if (mounted.current) setLoading(false);
        navigation.navigate("SignupVerify", {
          userId: signupResponse.data.userId,
          email: email.trim().toLowerCase(),
          maskedEmail: signupResponse.data.email,
          emailSent: signupResponse.data.emailSent !== false,
          retryAfter: signupResponse.data.retryAfter || 0,
          resumed: !!signupResponse.data.resumed,
        });
        return;
      }

      // STEP 2: auto-login. Setting the user switches to the app by itself.
      try {
        const loginResponse = await api.post("/auth/login", {
          email: email.trim().toLowerCase(),
          password: password,
        });
        const { token: newToken, user: newUser } = loginResponse.data || {};
        if (newToken && newUser) {
          api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setToken(newToken);
          setUser(newUser);
          return;
        }
      } catch (loginError) {
        // signup already succeeded, fall through to Login
        console.log("Auto-login failed (non-fatal):", loginError?.response?.data || loginError?.message);
      }

      if (mounted.current) setLoading(false);
      Alert.alert("Account created", "Sign in with your email and password.");
      navigation.replace("Login");
    } catch (err) {
      // only runs if /auth/signup itself failed
      if (mounted.current) setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message;

      if (serverMsg) {
        showBannerSafe("Couldn't create account", serverMsg);
      } else if (!err?.response) {
        showBannerSafe(
          "No connection",
          err?.code === "ECONNABORTED"
            ? "The server took too long. Please try again."
            : "Cannot reach the server. Check your internet and try again."
        );
      } else if (status >= 500) {
        showBannerSafe("Server busy", "Something went wrong on our side. Please try again.");
      } else {
        showBannerSafe("Couldn't create account", err?.message || "Something went wrong. Please try again.");
      }
      console.log("Signup error:", status, serverMsg || err?.message);
    }
    // on auto-login success the auth stack unmounts, so loading is left on
  };

  function showBannerSafe(title, message) {
    if (mounted.current) setBanner({ title, message });
  }

  const sheetConfig = {
    university: { title: "select university", options: UNIVERSITIES, selected: university, searchable: true, searchPlaceholder: "search university" },
    city: { title: "select city", options: CITIES, selected: city, searchable: true, searchPlaceholder: "search city" },
    gender: { title: "select gender", options: GENDER_OPTIONS, selected: gender },
    academicLevel: { title: "academic level", options: ACADEMIC_LEVELS, selected: academicLevel },
  };
  const cfg = sheet ? sheetConfig[sheet] : null;

  return (
    <AuthShell
      step={0}
      icon="person-add-outline"
      title="create your account"
      subtitle="Takes a minute. Your student perks unlock right after."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : null}
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")} hitSlop={8}>
            <Text style={styles.footerLink}>sign in</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {banner ? (
        <View style={styles.banner}>
          <Ionicons name="alert-circle" size={18} color={AUTH.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            {banner.message ? <Text style={styles.bannerText}>{banner.message}</Text> : null}
          </View>
          <TouchableOpacity onPress={() => setBanner(null)} hitSlop={10}>
            <Ionicons name="close" size={16} color={AUTH.muted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── about you ── */}
      <SectionLabel>about you</SectionLabel>

      <Text style={styles.fieldLabel}>I am a</Text>
      <View style={styles.segment}>
        {[
          { alumni: false, label: "Student", icon: "school-outline" },
          { alumni: true, label: "Alumni", icon: "ribbon-outline" },
        ].map((o) => {
          const on = isAlumni === o.alumni;
          return (
            <TouchableOpacity
              key={o.label}
              activeOpacity={0.85}
              onPress={() => selectRole(o.alumni)}
              disabled={loading}
              style={[styles.segmentPill, on && styles.segmentPillOn]}
            >
              <Ionicons name={o.icon} size={16} color={on ? AUTH.gold : AUTH.text2} />
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <AuthInput
        ref={nameRef}
        label="Full name"
        icon="person-outline"
        placeholder="your full name"
        value={name}
        onChangeText={(t) => {
          setName(t);
          clearError("name");
        }}
        autoCapitalize="words"
        autoCorrect={false}
        textContentType="name"
        autoComplete="name"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        editable={!loading}
        error={errors.name}
      />

      <PickerField
        label="Gender"
        icon="male-female-outline"
        value={gender}
        placeholder="select gender"
        error={errors.gender}
        active={sheet === "gender"}
        disabled={loading}
        onPress={() => openSheet("gender")}
      />

      <AuthInput
        ref={phoneRef}
        label="Phone (optional)"
        icon="call-outline"
        placeholder="03XXXXXXXXX"
        value={phone}
        onChangeText={(t) => {
          setPhone(t);
          clearError("phone");
        }}
        keyboardType="phone-pad"
        autoCapitalize="none"
        textContentType="telephoneNumber"
        autoComplete="tel"
        maxLength={11}
        returnKeyType="next"
        onSubmitEditing={() => rollRef.current?.focus()}
        editable={!loading}
        error={errors.phone}
      />

      {/* ── your campus ── */}
      <SectionLabel>your campus</SectionLabel>

      <PickerField
        label="University"
        icon="school-outline"
        value={university}
        placeholder="select university"
        error={errors.university}
        active={sheet === "university"}
        disabled={loading}
        onPress={() => openSheet("university")}
      />

      <PickerField
        label="City"
        icon="location-outline"
        value={city}
        placeholder="select city"
        error={errors.city}
        active={sheet === "city"}
        disabled={loading}
        onPress={() => openSheet("city")}
      />

      {!isAlumni ? (
        <PickerField
          label="Academic level"
          icon="layers-outline"
          value={academicLevel}
          placeholder="select academic level"
          error={errors.academicLevel}
          active={sheet === "academicLevel"}
          disabled={loading}
          onPress={() => openSheet("academicLevel")}
        />
      ) : null}

      <AuthInput
        ref={rollRef}
        label={isAlumni ? "Old roll no (optional)" : "Roll no / student ID (optional)"}
        icon="id-card-outline"
        placeholder={isAlumni ? "your old roll no" : "your roll no or ID"}
        value={rollNo}
        onChangeText={setRollNo}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        editable={!loading}
      />

      {/* ── login details ── */}
      <SectionLabel>login details</SectionLabel>

      <AuthInput
        ref={emailRef}
        label="Email"
        icon="mail-outline"
        placeholder="you@university.edu.pk"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          clearError("email");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!loading}
        error={errors.email}
        right={
          email.length > 0 && validateEmail(email.trim()) && !errors.email ? (
            <Ionicons name="checkmark-circle" size={18} color={AUTH.ok} />
          ) : null
        }
      />

      <AuthInput
        ref={passwordRef}
        label="Password"
        icon="lock-closed-outline"
        placeholder="create a password"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          clearError("password");
        }}
        secure
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="password-new"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        editable={!loading}
        error={errors.password}
      />

      {password.length > 0 ? (
        <>
          <View style={styles.meterRow}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.meter, { backgroundColor: level >= i ? strength.color : "#ededed" }]} />
            ))}
            <Text style={[styles.meterLabel, { color: level ? strength.color : AUTH.muted }]}>{strength.label}</Text>
          </View>
          <View style={styles.rules}>
            {RULES.map((r) => {
              const ok = r.test(password);
              return (
                <View key={r.key} style={styles.rule}>
                  <Ionicons name={ok ? "checkmark-circle" : "ellipse-outline"} size={15} color={ok ? AUTH.ok : "#c4c4c4"} />
                  <Text style={[styles.ruleText, ok && { color: AUTH.dark }]}>{r.label}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <AuthInput
        ref={confirmRef}
        label="Confirm password"
        icon="checkmark-done-outline"
        placeholder="type it again"
        value={confirmPassword}
        onChangeText={(t) => {
          setConfirmPassword(t);
          clearError("confirmPassword");
        }}
        secure
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => referralRef.current?.focus()}
        editable={!loading}
        error={errors.confirmPassword || (mismatch ? "Passwords don't match" : "")}
      />

      {/* ── extras ── */}
      <SectionLabel>extras</SectionLabel>

      <AuthInput
        ref={referralRef}
        label="Referral code (optional)"
        icon="gift-outline"
        placeholder="got a code from a friend?"
        value={referralCode}
        onChangeText={setReferralCode}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={handleSignup}
        editable={!loading}
      />

      <AuthButton title="create account" onPress={handleSignup} loading={loading} />

      <Text style={styles.terms}>
        By creating an account you agree to the tdc terms and privacy policy.
      </Text>

      <PickerSheet
        visible={!!cfg}
        title={cfg?.title || ""}
        options={cfg?.options || []}
        selected={cfg?.selected}
        searchable={!!cfg?.searchable}
        searchPlaceholder={cfg?.searchPlaceholder}
        onSelect={onSelect}
        onClose={closeSheet}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 12,
    fontWeight: "800",
    color: AUTH.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 12,
  },
  fieldLabel: { fontSize: 12.5, fontWeight: "800", color: AUTH.dark, marginBottom: 8 },
  errorText: { color: AUTH.danger, fontSize: 12, fontWeight: "600", marginTop: 6, marginLeft: 4 },

  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fdecef",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  bannerTitle: { fontSize: 13.5, fontWeight: "800", color: AUTH.dark },
  bannerText: { fontSize: 12.5, color: AUTH.text2, marginTop: 2, lineHeight: 18 },

  segment: {
    flexDirection: "row",
    gap: 8,
    padding: 4,
    borderRadius: 16,
    backgroundColor: AUTH.soft,
    borderWidth: 1.5,
    borderColor: AUTH.border,
    marginBottom: 14,
  },
  segmentPill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  segmentPillOn: { backgroundColor: AUTH.dark },
  segmentText: { fontSize: 14.5, fontWeight: "800", color: AUTH.text2 },
  segmentTextOn: { color: AUTH.gold },

  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: AUTH.soft,
    borderWidth: 1.5,
    borderColor: AUTH.border,
  },
  pickerOn: { borderColor: AUTH.dark, backgroundColor: "#fff" },
  pickerError: { borderColor: AUTH.danger, backgroundColor: "#fff" },
  pickerText: { flex: 1, fontSize: 15.5, color: AUTH.dark, fontWeight: "600" },
  pickerPlaceholder: { color: "#a8a8a8" },

  meterRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4, marginBottom: 10 },
  meter: { flex: 1, height: 4, borderRadius: 2 },
  meterLabel: { fontSize: 11.5, fontWeight: "800", marginLeft: 6, minWidth: 54, textAlign: "right" },
  rules: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  rule: { flexDirection: "row", alignItems: "center", gap: 5 },
  ruleText: { fontSize: 12, color: AUTH.muted, fontWeight: "600" },

  terms: {
    fontSize: 11.5,
    color: AUTH.muted,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 14,
    paddingHorizontal: 12,
  },

  footerRow: { flexDirection: "row", alignItems: "center" },
  footerText: { color: AUTH.muted, fontSize: 14 },
  footerLink: { color: AUTH.dark, fontSize: 14, fontWeight: "900" },

  // bottom sheet
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "80%",
  },
  sheetTall: { height: "80%" },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e2e2e2",
    marginBottom: 12,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 19, fontWeight: "900", color: AUTH.dark, letterSpacing: -0.4 },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: AUTH.soft,
    borderWidth: 1,
    borderColor: AUTH.border,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: AUTH.soft,
    borderWidth: 1.5,
    borderColor: AUTH.border,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: AUTH.dark, fontWeight: "600", paddingVertical: 0 },
  row: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginVertical: 1,
  },
  rowOn: { backgroundColor: AUTH.goldSoft },
  rowText: { flex: 1, fontSize: 15, color: AUTH.dark, fontWeight: "600" },
  rowTextOn: { fontWeight: "800" },
  empty: { textAlign: "center", color: AUTH.muted, fontSize: 13.5, paddingVertical: 24 },
});
