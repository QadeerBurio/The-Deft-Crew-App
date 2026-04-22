import React, { useContext, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  StatusBar,
  Image,
  TouchableOpacity,
  Platform,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileDetailsScreen({ navigation }) {
  const { user, token, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [profile, setProfile] = useState({
    name: user?.name || "",
    rollNo: user?.rollNo || "",
    phone: user?.phone || "",
    email: user?.email || "",
    university: user?.university?.name || "Not Assigned",
    profileImage: user?.profileImage || null,
    isAlumni: user?.isAlumni || false,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/auth/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = res.data;
      setProfile({
        name: d.name,
        rollNo: d.rollNo,
        phone: d.phone,
        email: d.email,
        university: d.university?.name || "Not Assigned",
        profileImage: d.profileImage,
        isAlumni: d.isAlumni,
      });
      setUser(d);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch (e) {
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  // Logic to determine whether to show Backend Image or Placeholder
  const getProfileImageSource = () => {
    if (profile.profileImage) {
      return { uri: profile.profileImage };
    }
    return null;
  };

  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0eb99c" />
      </View>
    );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header Section */}
        <LinearGradient colors={["#000000", "#164039"]} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              {profile.profileImage ? (
                <Image
                  source={getProfileImageSource()}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person" size={50} color="#ccc" />
              )}
            </View>
          </View>

          <Text style={styles.headerName}>{profile.name || "User Name"}</Text>
          <View style={styles.uniBadge}>
            <Ionicons name="school" size={14} color="#fff" style={{ marginRight: 5 }} />
            <Text style={styles.headerUniText}>{profile.university}</Text>
          </View>
        </LinearGradient>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Stats Row: Roll No & Status */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Roll Number</Text>
              <Text style={styles.statValue}>{profile.rollNo || "N/A"}</Text>
            </View>
            <View style={[styles.statBox, { borderLeftWidth: 1, borderColor: "#eee" }]}>
              <Text style={styles.statLabel}>Current Status</Text>
              <Text style={[styles.statValue, { color: profile.isAlumni ? "#0eb99c" : "#333" }]}>
                {profile.isAlumni ? "Alumni" : "Active Student"}
              </Text>
            </View>
          </View>

          {/* Details Section */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Account Information</Text>

            {/* Display Info Item - Name */}
            <View style={styles.infoGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.infoWrapper}>
                <Ionicons name="person-outline" size={20} color="#0eb99c" style={styles.inputIcon} />
                <Text style={styles.infoText}>{profile.name}</Text>
              </View>
            </View>

            {/* Display Info Item - Email */}
            <View style={styles.infoGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.infoWrapper}>
                <Ionicons name="mail-outline" size={20} color="#0eb99c" style={styles.inputIcon} />
                <Text style={styles.infoText}>{profile.email}</Text>
              </View>
            </View>

            {/* Display Info Item - Phone */}
            <View style={styles.infoGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.infoWrapper}>
                <Ionicons name="call-outline" size={20} color="#0eb99c" style={styles.inputIcon} />
                <Text style={styles.infoText}>{profile.phone || "Not Provided"}</Text>
              </View>
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity 
                style={styles.editButton} 
                activeOpacity={0.8}
                onPress={() => Alert.alert("Navigate", "update Successfully ")}
            >
              <Text style={styles.editButtonText}>Update Profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8f9fa" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarWrapper: { marginBottom: 15 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  headerName: { color: "#fff", fontSize: 24, fontWeight: "800" },
  uniBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
  },
  headerUniText: { color: "#fff", fontSize: 13, fontWeight: "500" },
  content: { marginTop: -30, paddingHorizontal: 20 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 25,
  },
  statBox: { flex: 1, alignItems: "center", paddingHorizontal: 10 },
  statLabel: { fontSize: 11, color: "#888", textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5 },
  statValue: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 4 },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 20 },
  infoGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#999", marginBottom: 8, marginLeft: 5 },
  infoWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    borderRadius: 15,
    paddingHorizontal: 15,
    backgroundColor: "#fafafa",
    height: 55,
  },
  inputIcon: { marginRight: 12 },
  infoText: { flex: 1, color: "#333", fontSize: 15, fontWeight: "600" },
  editButton: {
    backgroundColor: "#000000",
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  editButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});