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
import { metaEvents } from "../analytics/metaEvents";
import { AuthContext } from "../context/AuthContext";
import { enterAccount } from "../guest/accountRoutes";
import { AuthShell, AuthInput, AuthButton, AUTH } from "../components/AuthShell";

const UNIVERSITIES = [
  // ==================== KARACHI ====================
  "Adamjee Government Science College — Karachi",
  "Aga Khan Higher Secondary School — Karachi",
  "Aga Khan University — Karachi",
  "Alpha College — Karachi",
  "Bahria College — Karachi",
  "Bahria University — Karachi",
  "Baqai Medical University — Karachi",
  "Bay View Academy — Karachi",
  "Bay View High School - A Level — Karachi",
  "Beaconhouse College Programme Karachi Branch",
  "Beaconhouse School System — Karachi",
  "Beaconhouse School System - A Level — Karachi",
  "Benazir Bhutto Shaheed University Lyari Lyari Campus — Karachi",
  "Cedar College — Karachi",
  "COMMECS College — Karachi",
  "D.J. Sindh Government Science College — Karachi",
  "Dawood University of Engineering and Technology — Karachi",
  "DHA College for Women — Karachi",
  "DHA Suffa University DHA Campus — Karachi",
  "DJ Sindh Government Science College — Karachi",
  "Dow University of Health Sciences Dow Medical College Campus — Karachi",
  "Dow University of Health Sciences OJHA — Karachi",
  "Eden College — Karachi",
  "FAST-NUCES — Karachi",
  "Federal Urdu University Abdul Haq Campus — Karachi",
  "Federal Urdu University Gulshan Campus — Karachi",
  "Generation's School - A Level — Karachi",
  "Greenwich University — Karachi",
  "Habib University Gulistan-e-Jauhar Campus — Karachi",
  "Hamdard University City Campus — Karachi",
  "Hamdard University Madinat al-Hikmah Campus — Karachi",
  "Ilma University — Karachi",
  "Indus University Gulshan Campus — Karachi",
  "Indus University North Campus — Karachi",
  "Indus Valley School of Art and Architecture Clifton Campus — Karachi",
  "Institute of Business Administration Karachi",
  "Institute of Business Administration Karachi City Campus",
  "Institute of Business Management Korangi Creek Campus — Karachi",
  "Iqra University — Karachi",
  "Iqra University Airport Campus — Karachi",
  "Iqra University Gulshan Campus — Karachi",
  "Iqra University M-9 Campus — Karachi",
  "Iqra University North Campus — Karachi",
  "Isra University — Karachi",
  "Jinnah Medical and Dental College — Karachi",
  "Jinnah Sindh Medical University — Karachi",
  "Jinnah University for Women — Karachi",
  "Karachi Grammar School - College Section",
  "Karachi Grammar School College Section",
  "Karachi Institute of Economics and Technology City Campus",
  "Karachi Institute of Economics and Technology North Nazimabad Campus",
  "Karachi Institute of Economics and Technology PAF Korangi Creek Campus",
  "Karachi School for Business and Leadership",
  "KASBIT — Karachi",
  "Lahore Grammar School A Level Karachi Branch",
  "Liaquat College of Medicine and Dentistry — Karachi",
  "Meritorious College — Karachi",
  "Muhammad Ali Jinnah University — Karachi",
  "National Textile University — Karachi",
  "National University of Sciences and Technology Pakistan Navy Engineering College — Karachi",
  "NCR-CET College — Karachi",
  "NED University of Engineering and Technology — Karachi",
  "NED University of Engineering and Technology City Campus — Karachi",
  "Newports Institute — Karachi",
  "Nixor College — Karachi",
  "NUML — Karachi",
  "PECHS Government College for Women — Karachi",
  "Salim Habib University — Karachi",
  "Sceptre College — Karachi",
  "Sindh Madressatul Islam University — Karachi",
  "Sir Syed University of Engineering and Technology — Karachi",
  "Southshore College — Karachi",
  "Southshore School — Karachi",
  "St. Joseph's College for Women — Karachi",
  "St. Patrick's High School — Karachi",
  "St. Patrick's High School - College Section — Karachi",
  "SZABIST University — Karachi",
  "Tabanis School and College — Karachi",
  "Tabani's College — Karachi",
  "Tabani's School & College — Karachi",
  "The Academy - A Level — Karachi",
  "The Avicenna School - A Level — Karachi",
  "The Avicenna School A-Level Section — Karachi",
  "The C.A.S. School - A Level — Karachi",
  "The C.A.S. School A-Level Section — Karachi",
  "The City School — Karachi",
  "The City School - A Level — Karachi",
  "The City School A Level Karachi Branch",
  "The Educators - College Section — Karachi",
  "The International School - A Level — Karachi",
  "The Learning Alliance - A Level — Karachi",
  "The Lyceum — Karachi",
  "Titan College — Karachi",
  "United Medical and Dental College — Karachi",
  "University of Karachi",
  "Whales College — Karachi",
  "Ziauddin College — Karachi",
  "Ziauddin University Clifton Campus — Karachi",
  "Ziauddin University Link Road Campus — Karachi",
  "Ziauddin University North Nazimabad Campus — Karachi",

  // ==================== LAHORE ====================
  "Aitchison College — Lahore",
  "Akhtar Saeed Medical and Dental College — Lahore",
  "Aspire College — Lahore",
  "Bahria University — Lahore",
  "Beaconhouse College Programme — Lahore",
  "Beaconhouse College Programme Lahore Branch",
  "Beaconhouse National University Tarogil Campus — Lahore",
  "COMSATS University Islamabad — Lahore",
  "Concordia College — Lahore",
  "Concordia Colleges — Lahore",
  "Crescent Model Higher Secondary School — Lahore",
  "Divisional Public School and College — Lahore",
  "FAST-NUCES — Lahore",
  "Fatima Jinnah Medical University — Lahore",
  "FMH College of Medicine and Dentistry — Lahore",
  "Forman Christian College — Lahore",
  "Forman Christian College University — Lahore",
  "Government College University Lahore",
  "Government College University Lahore Intermediate",
  "Government College University Lahore Kala Shah Kaku Campus",
  "International School Lahore (ISL)",
  "International School Lahore - A Level",
  "International School Lahore A Level Lahore Branch",
  "King Edward Medical University — Lahore",
  "Kinnaird College for Women — Lahore",
  "KIPS College — Lahore",
  "LACAS — Lahore",
  "LACAS - A Level — Lahore",
  "Lahore College of Arts and Sciences",
  "Lahore Garrison University",
  "Lahore Grammar School (LGS)",
  "Lahore Grammar School - A Level",
  "Lahore Grammar School A Level Lahore Branch",
  "Lahore Leads University",
  "Lahore Medical and Dental College",
  "Lahore School of Economics",
  "Learning Alliance - A Level — Lahore",
  "Learning Alliance Lahore Branch",
  "LUMS — Lahore",
  "Minhaj University Lahore",
  "National College of Arts — Lahore",
  "NUML — Lahore",
  "Pak-Turk Maarif International Schools & Colleges — Lahore",
  "Punjab Group of Colleges — Lahore",
  "Queen Mary College — Lahore",
  "Riphah International University — Lahore",
  "Roots International Schools & Colleges — Lahore",
  "Roots International Schools and Colleges — Lahore",
  "Roots Millennium Schools and Colleges Lahore Branch",
  "Shalamar Medical and Dental College — Lahore",
  "SICAS — Lahore",
  "SICAS - A Level — Lahore",
  "Superior College — Lahore",
  "Superior University — Lahore",
  "The City School — Lahore",
  "The City School - A Level — Lahore",
  "The City School A Level Lahore Branch",
  "The Learning Alliance — Lahore",
  "The Punjab School — Lahore",
  "The Punjab School - College Section — Lahore",
  "The Punjab School College Wing Lahore Branch",
  "Unique College — Lahore",
  "University of Central Punjab — Lahore",
  "University of Engineering and Technology Lahore",
  "University of Engineering and Technology Lahore Kala Shah Kaku Campus",
  "University of Health Sciences Lahore",
  "University of Home Economics — Lahore",
  "University of Lahore",
  "University of Lahore Defence Road Campus",
  "University of Management and Technology — Lahore",
  "University of South Asia — Lahore",
  "University of the Punjab Allama Iqbal Campus — Lahore",
  "University of the Punjab Quaid-e-Azam Campus — Lahore",
  "University of Veterinary and Animal Sciences — Lahore",

  // ==================== HYDERABAD ====================
  "County Girls College Thandi Sarak — Hyderabad",
  "Government College University Hyderabad",
  "Iqra University — Hyderabad",
  "Isra University — Hyderabad",
  "Latif Niazi Memorial Girls College Latifabad Unit 11 — Hyderabad",
  "Pakistan Pilot College Latifabad Unit 2 — Hyderabad",
  "Punjab College Fatah Chowk — Hyderabad",
  "Saifee College Hyderabad City",
  "Saifee College of Computer Science Latifabad Unit 2 — Hyderabad",
  "Superior College of Science for Boys G.O.R. Colony — Hyderabad",
  "SZABIST — Hyderabad",
  "The Smart College Latifabad Unit 6 — Hyderabad",
  "The Smart College Qasimabad — Hyderabad",
  "University of EAST — Hyderabad",

  // ==================== ISLAMABAD ====================
  "Abasyn University — Islamabad",
  "Air University — Islamabad",
  "Allama Iqbal Open University — Islamabad",
  "Bahria University E-8 Campus — Islamabad",
  "Bahria University H-11 Campus — Islamabad",
  "Beaconhouse College Programme — Islamabad",
  "Beaconhouse College Programme Islamabad Branch",
  "Capital University of Science and Technology — Islamabad",
  "COMSATS University Islamabad",
  "Concordia College — Islamabad",
  "Concordia Colleges — Islamabad",
  "FAST-NUCES — Islamabad",
  "Federal Urdu University — Islamabad",
  "Foundation University Islamabad",
  "Froebels International School A Level Islamabad Branch",
  "Froebel's International School — Islamabad",
  "Froebel's International School - A Level — Islamabad",
  "Headstart School — Islamabad",
  "Headstart School - A Level — Islamabad",
  "Headstart School A Level Islamabad Branch",
  "Imperial International School & College — Islamabad",
  "Institute of Space Technology — Islamabad",
  "International Islamic University Islamabad",
  "Iqra University — Islamabad",
  "Iqra University Chak Shahzad Campus — Islamabad",
  "Islamabad College for Boys",
  "Islamabad College for Girls",
  "Islamabad Medical and Dental College",
  "Isra University — Islamabad",
  "KIPS College — Islamabad",
  "Lahore Grammar School A Level Islamabad Branch",
  "National Defence University — Islamabad",
  "National University of Sciences and Technology H-12 Campus — Islamabad",
  "NUML — Islamabad",
  "OPF Girls College — Islamabad",
  "Pak-Turk Maarif International Schools & Colleges — Islamabad",
  "Pakistan Institute of Engineering and Applied Sciences — Islamabad",
  "Punjab College — Islamabad",
  "Punjab Group of Colleges — Islamabad",
  "Quaid-i-Azam University — Islamabad",
  "Riphah International University — Islamabad",
  "Roots International Schools & Colleges — Islamabad",
  "Roots International Schools and Colleges Islamabad Branch",
  "Roots Millennium Schools — Islamabad",
  "Roots Millennium Schools and Colleges Islamabad Branch",
  "Shifa Tameer-e-Millat University — Islamabad",
  "SuperNova School — Islamabad",
  "SuperNova School - A Level — Islamabad",
  "SZABIST University — Islamabad",
  "The City School — Islamabad",
  "The City School - A Level — Islamabad",
  "The City School A Level Islamabad Branch",
  "The Science School - A Level — Islamabad",
  "Westminster School & College — Islamabad",
  "Westminster School and College — Islamabad",

  // ==================== RAWALPINDI ====================
  "Army Public School & College — Rawalpindi",
  "Army Public School and College - Senior Section — Rawalpindi",
  "Beaconhouse College Programme — Rawalpindi",
  "Concordia Colleges — Rawalpindi",
  "F.G. Sir Syed College — Rawalpindi",
  "Fatima Jinnah Women University — Rawalpindi",
  "Fauji Foundation College — Rawalpindi",
  "Foundation University Islamabad Foundation University Medical College — Rawalpindi",
  "Froebels International School A Level Rawalpindi Branch",
  "Froebel's International School — Rawalpindi",
  "Gordon College — Rawalpindi",
  "KIPS College — Rawalpindi",
  "National College of Arts — Rawalpindi",
  "National University of Medical Sciences — Rawalpindi",
  "National University of Sciences and Technology College of Electrical and Mechanical Engineering — Rawalpindi",
  "National University of Sciences and Technology Military College of Signals — Rawalpindi",
  "PMAS Arid Agriculture University — Rawalpindi",
  "Punjab College — Rawalpindi",
  "Punjab Group of Colleges — Rawalpindi",
  "Rawalpindi Medical University",
  "Rawalpindi Women University",
  "Riphah International University — Rawalpindi",
  "Roots International Schools & Colleges — Rawalpindi",
  "Roots International Schools and Colleges Rawalpindi Branch",
  "Roots Millennium Schools — Rawalpindi",
  "Roots Millennium Schools and Colleges Rawalpindi Branch",
  "Superior College — Rawalpindi",
  "The City School — Rawalpindi",
  "The City School - A Level — Rawalpindi",

  // ==================== BADIN ====================
  "University of Sindh — Badin",
  "University of Sindh City Campus — Badin",

  // ==================== BAHAWALPUR ====================
  "Government Sadiq College Women University — Bahawalpur",
  "Punjab College — Bahawalpur",
  "Quaid-e-Azam Medical College — Bahawalpur",
  "The Islamia University of Bahawalpur",

  // ==================== BHITSHAH ====================
  "University of Sufism and Modern Sciences — Bhitshah",

  // ==================== DADU ====================
  "University of Sindh — Dadu",
  "University of Sindh City Campus — Dadu",

  // ==================== FAISALABAD ====================
  "Beaconhouse School System — Faisalabad",
  "Government College University Faisalabad",
  "National Textile University — Faisalabad",
  "Punjab College — Faisalabad",
  "Riphah International University — Faisalabad",
  "Superior College — Faisalabad",
  "The City School — Faisalabad",
  "University of Agriculture Faisalabad",
  "University of Faisalabad",

  // ==================== GHOTKI ====================
  "Shah Abdul Latif University — Ghotki",
  "The Career College Ghotki City",

  // ==================== GUJRANWALA ====================
  "Beaconhouse School System — Gujranwala",
  "GIFT University — Gujranwala",
  "Punjab College — Gujranwala",
  "Superior College — Gujranwala",
  "University of Chenab — Gujranwala",
  "University of the Punjab Gujranwala Campus",

  // ==================== GUJRAT ====================
  "Punjab College — Gujrat",
  "University of Gujrat",
  "University of Lahore Gujrat Campus",

  // ==================== JAMSHORO ====================
  "Liaquat University of Medical and Health Sciences — Jamshoro",
  "Mehran University of Engineering and Technology — Jamshoro",
  "Shaheed Allah Buksh Soomro University of Art Design and Heritages — Jamshoro",
  "University of Sindh — Jamshoro",

  // ==================== JHELUM ====================
  "Punjab College — Jhelum",
  "University of the Punjab Jhelum Campus",

  // ==================== KANDHKOT ====================
  "Sukkur IBA University — Kandhkot",

  // ==================== KHAIRPUR ====================
  "Benazir Bhutto Shaheed University of Technology and Skill Development — Khairpur",
  "Gambat Institute of Medical Sciences — Khairpur",
  "Mehran University of Engineering and Technology — Khairpur",
  "Shah Abdul Latif University — Khairpur",
  "Sukkur IBA University City Campus — Khairpur",

  // ==================== LARKANA ====================
  "Chandka Medical College — Larkana",
  "Quaid-e-Awam University of Engineering Science and Technology — Larkana",
  "QUEST University City Campus — Larkana",
  "Shaheed Mohtarma Benazir Bhutto Medical University — Larkana",
  "University of Larkano — Larkana",

  // ==================== MIRPURKHAS ====================
  "The Mirpurkhas University",
  "University of Sindh — Mirpurkhas",
  "University of Sindh City Campus — Mirpurkhas",

  // ==================== MITHI ====================
  "NED University of Engineering and Technology - TIEST — Mithi",

  // ==================== MULTAN ====================
  "Air University Multan Campus",
  "Bahauddin Zakariya University — Multan",
  "Beaconhouse School System — Multan",
  "Institute of Southern Punjab — Multan",
  "Nishtar Medical University — Multan",
  "NUML Multan Campus",
  "Punjab College — Multan",
  "The City School — Multan",
  "University of Southern Punjab — Multan",

  // ==================== NAUSHAHRO FEROZE ====================
  "Shaheed Benazir Bhutto University — Naushahro Feroze",

  // ==================== RAHIM YAR KHAN ====================
  "Khwaja Fareed University of Engineering and Information Technology — Rahim Yar Khan",
  "Punjab College — Rahim Yar Khan",
  "Sheikh Zayed Medical College — Rahim Yar Khan",

  // ==================== SAHIWAL ====================
  "COMSATS University Islamabad Sahiwal Campus",
  "Punjab College — Sahiwal",
  "University of Sahiwal",

  // ==================== SAKRAND ====================
  "Shaheed Benazir Bhutto University of Veterinary and Animal Sciences — Sakrand",

  // ==================== SARGODHA ====================
  "Punjab College — Sargodha",
  "Superior College — Sargodha",
  "University of Lahore Sargodha Campus",
  "University of Sargodha",

  // ==================== SHAHDADKOT ====================
  "Shah Abdul Latif University — Shahdadkot",

  // ==================== SHAHEED BENAZIRABAD ====================
  "Peoples University of Medical and Health Sciences for Women — Shaheed Benazirabad",
  "Quaid-e-Awam University of Engineering Science and Technology — Shaheed Benazirabad",
  "Shaheed Benazir Bhutto University — Shaheed Benazirabad",

  // ==================== SHEIKHUPURA ====================
  "Punjab College — Sheikhupura",
  "Superior College — Sheikhupura",

  // ==================== SHIKARPUR ====================
  "Shaikh Ayaz University — Shikarpur",

  // ==================== SIALKOT ====================
  "Government College Women University Sialkot",
  "Punjab College — Sialkot",
  "The City School — Sialkot",
  "University of Applied Engineering and Emerging Technologies — Sialkot",
  "University of Management and Technology Sialkot",
  "University of Sialkot",

  // ==================== SUKKUR ====================
  "Aror University of Art Architecture Design and Heritage — Sukkur",
  "Begum Nusrat Bhutto Women University — Sukkur",
  "Ghulam Muhammad Mahar Medical College — Sukkur",
  "Sukkur IBA University",

  // ==================== TANDOJAM ====================
  "Sindh Agriculture University — Tandojam",

  // ==================== TAXILA ====================
  "HITEC University — Taxila",
  "University of Engineering and Technology Taxila",

  // ==================== UMERKOT ====================
  "Sindh Agriculture University — Umerkot",

  // ==================== WAH CANTT ====================
  "COMSATS University Islamabad Wah Campus — Wah Cantt",
  "University of Wah — Wah Cantt",
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
  // --- Major metros (original) ---
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

  // --- Previously added (earlier CSV) ---
  "Gharo",
  "Attock",
  "Vehari",
  "Kamra",
  "Malakand",
  "Narowal",
  "Pattoki",
  "Taxila",
  "Chakwal",
  "Risalpur",
  "Swat",
  "Chakdara",
  "Mansehra",
  "Khairpur",
  "Jamshoro",
  "Turbat",
  "Hunza",
  "Chilas",
  "Ghizer",
  "Neelum",
  "Mirpur",
  "Rawalakot",
  "Kotli",
  "Jhelum",

  // --- Added from latest Excel sheet (cities not yet in list) ---
  "Badin",
  "Bhitshah",
  "Dadu",
  "Ghotki",
  "Kandhkot",
  "Mirpurkhas",
  "Mithi",
  "Naushahro Feroze",
  "Sakrand",
  "Shahdadkot",
  "Shaheed Benazirabad",
  "Shikarpur",
  "Tandojam",
  "Umerkot",
];

const RULES = [
  { key: "len", label: "6+ characters", test: (p) => p.length >= 6 },
  { key: "num", label: "a number", test: (p) => /\d/.test(p) },
  { key: "case", label: "upper and lower case", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
];

const STRENGTH = [
  { label: "too short", color: AUTH.border },
  { label: "weak", color: AUTH.danger },
  { label: "okay", color: AUTH.gold },
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
                placeholderTextColor={AUTH.placeholder}
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
  const auth = useContext(AuthContext);

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

      // account created (no email code needed): Meta sign-up event, sent only after consent
      metaEvents.registration(signupResponse.data?.user?._id || signupResponse.data?.user?.id);

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
          await enterAccount(auth, newToken, newUser);
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
              <View key={i} style={[styles.meter, { backgroundColor: level >= i ? strength.color : AUTH.border }]} />
            ))}
            <Text style={[styles.meterLabel, { color: level ? strength.color : AUTH.muted }]}>{strength.label}</Text>
          </View>
          <View style={styles.rules}>
            {RULES.map((r) => {
              const ok = r.test(password);
              return (
                <View key={r.key} style={styles.rule}>
                  <Ionicons name={ok ? "checkmark-circle" : "ellipse-outline"} size={15} color={ok ? AUTH.ok : AUTH.muted} />
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

      {/* info only: no checkbox, never blocks sign up. Links open the drawer's legal pages. */}
      <Text style={styles.terms}>
        by signing up you agree to our{" "}
        <Text
          style={styles.termsLink}
          onPress={() => navigation.navigate("LegalTerms")}
          accessibilityRole="link"
          suppressHighlighting
        >
          terms
        </Text>
        {" "}and{" "}
        <Text
          style={styles.termsLink}
          onPress={() => navigation.navigate("LegalPrivacy")}
          accessibilityRole="link"
          suppressHighlighting
        >
          privacy policy
        </Text>
        .
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
    fontFamily: 'DMSans_700Bold',
    color: AUTH.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 12,
  },
  fieldLabel: { fontSize: 12.5, fontFamily: 'DMSans_700Bold', color: AUTH.dark, marginBottom: 8 },
  errorText: { color: AUTH.danger, fontSize: 12, fontFamily: 'DMSans_600SemiBold', marginTop: 6, marginLeft: 4 },

  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255,143,133,0.12)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  bannerTitle: { fontSize: 13.5, fontFamily: 'DMSans_700Bold', color: AUTH.dark },
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
  segmentPillOn: { backgroundColor: AUTH.gold },
  segmentText: { fontSize: 14.5, fontFamily: 'DMSans_700Bold', color: AUTH.text2 },
  segmentTextOn: { color: "#111111" },

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
  pickerOn: { borderColor: AUTH.gold },
  pickerError: { borderColor: AUTH.danger },
  pickerText: { flex: 1, fontSize: 15.5, color: AUTH.dark, fontFamily: 'DMSans_600SemiBold' },
  pickerPlaceholder: { color: AUTH.placeholder },

  meterRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4, marginBottom: 10 },
  meter: { flex: 1, height: 4, borderRadius: 2 },
  meterLabel: { fontSize: 11.5, fontFamily: 'DMSans_700Bold', marginLeft: 6, minWidth: 54, textAlign: "right" },
  rules: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  rule: { flexDirection: "row", alignItems: "center", gap: 5 },
  ruleText: { fontSize: 12, color: AUTH.muted, fontFamily: 'DMSans_600SemiBold' },

  terms: {
    fontSize: 11.5,
    color: AUTH.muted,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 14,
    paddingHorizontal: 12,
  },
  termsLink: {
    color: AUTH.dark,
    textDecorationLine: "underline",
  },

  footerRow: { flexDirection: "row", alignItems: "center" },
  footerText: { color: AUTH.muted, fontSize: 14 },
  footerLink: { color: AUTH.dark, fontSize: 14, fontFamily: 'DMSans_700Bold' },

  // bottom sheet
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: AUTH.bg,
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
    backgroundColor: AUTH.border,
    marginBottom: 12,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 19, fontFamily: 'DMSans_700Bold', color: AUTH.dark, letterSpacing: -0.4 },
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
  searchInput: { flex: 1, fontSize: 15, color: AUTH.dark, fontFamily: 'DMSans_600SemiBold', paddingVertical: 0 },
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
  rowText: { flex: 1, fontSize: 15, color: AUTH.dark, fontFamily: 'DMSans_600SemiBold' },
  rowTextOn: { fontFamily: 'DMSans_700Bold' },
  empty: { textAlign: "center", color: AUTH.muted, fontSize: 13.5, paddingVertical: 24 },
});
