import React, { useContext, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Animated,
  StatusBar,
  Image,
  TouchableOpacity,
  Easing,
  Dimensions,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get('window');

// ==========================================
// FAST SKELETON LOADER COMPONENT
// ==========================================
const ProfileSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150],
  });

  const ShimmerBlock = ({ style }) => (
    <View style={[style, { overflow: 'hidden', backgroundColor: '#F0F0F0' }]}>
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Skeleton Header */}
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonBackBtn} />
        
        <View style={styles.skeletonAvatarWrapper}>
          <View style={styles.skeletonAvatar}>
            <Ionicons name="person" size={45} color="#D0D0D0" />
          </View>
        </View>
        
        <ShimmerBlock style={{ width: 130, height: 18, borderRadius: 9, marginBottom: 12 }} />
        <ShimmerBlock style={{ width: 160, height: 24, borderRadius: 12, marginBottom: 8 }} />
        <ShimmerBlock style={{ width: 90, height: 14, borderRadius: 7 }} />
      </View>

      {/* Skeleton Content */}
      <View style={styles.content}>
        <View style={styles.skeletonStatsRow}>
          <View style={styles.skeletonStatBox}>
            <ShimmerBlock style={{ width: 50, height: 10, borderRadius: 5, marginBottom: 8 }} />
            <ShimmerBlock style={{ width: 80, height: 16, borderRadius: 8 }} />
          </View>
          <View style={styles.skeletonStatBox}>
            <ShimmerBlock style={{ width: 50, height: 10, borderRadius: 5, marginBottom: 8 }} />
            <ShimmerBlock style={{ width: 80, height: 16, borderRadius: 8 }} />
          </View>
        </View>

        <View style={styles.formContainer}>
          <ShimmerBlock style={{ width: 140, height: 16, borderRadius: 8, marginBottom: 20 }} />
          
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.infoGroup}>
              <ShimmerBlock style={{ width: 70, height: 11, borderRadius: 5, marginBottom: 8, marginLeft: 5 }} />
              <View style={styles.skeletonInfoWrapper}>
                <ShimmerBlock style={{ width: 30, height: 30, borderRadius: 10, marginRight: 10 }} />
                <ShimmerBlock style={{ flex: 1, height: 16, borderRadius: 8 }} />
              </View>
            </View>
          ))}
          
          <ShimmerBlock style={{ height: 50, borderRadius: 14, marginTop: 15 }} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default function ProfileDetailsScreen({ navigation }) {
  const { user, token, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const avatarScale = useRef(new Animated.Value(0)).current;
  const uniSlide = useRef(new Animated.Value(-20)).current;
  const statsScale = useRef(new Animated.Value(0.85)).current;
  const formSlide = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

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
    } catch (e) {
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
      startEntranceAnimations();
    }
  };

  const startEntranceAnimations = () => {
    // Fast staggered entrance animations
    Animated.sequence([
      Animated.parallel([
        Animated.spring(avatarScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(uniSlide, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(statsScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(formSlide, {
        toValue: 0,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 4,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getProfileImageSource = () => {
    if (profile.profileImage) {
      return { uri: profile.profileImage };
    }
    return null;
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        bounces={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 38 }} />

          {/* Avatar Section */}
          <Animated.View 
            style={[
              styles.avatarWrapper, 
              { transform: [{ scale: avatarScale }] }
            ]}
          >
            <View style={styles.avatar}>
              {profile.profileImage ? (
                <Image
                  source={getProfileImageSource()}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {profile.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              )}
            </View>
          </Animated.View>

          {/* University Badge */}
          <Animated.View 
            style={[
              styles.uniBadge,
              { transform: [{ translateY: uniSlide }] }
            ]}
          >
            <FontAwesome5 name="university" size={12} color="#f9c349" style={{ marginRight: 6 }} />
            <Text style={styles.uniText}>{profile.university}</Text>
          </Animated.View>

          {/* User Name */}
          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}>
            <Text style={styles.userName}>{profile.name}</Text>
          </Animated.View>
          
          {/* Status Badge */}
          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: profile.isAlumni ? '#f9c34915' : '#f9c34910' }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: profile.isAlumni ? '#f9c349' : '#4CAF50' }
              ]} />
              <Text style={[
                styles.statusText,
                { color: profile.isAlumni ? '#f9c349' : '#4CAF50' }
              ]}>
                {profile.isAlumni ? 'Alumni' : 'Active Student'}
              </Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.content}>
          {/* Stats Cards */}
          <Animated.View 
            style={[
              styles.statsRow, 
              { 
                opacity: fadeAnim,
                transform: [{ scale: statsScale }] 
              }
            ]}
          >
            <View style={styles.statBox}>
              <View style={styles.statIconBox}>
                <Ionicons name="card-outline" size={22} color="#f9c349" />
              </View>
              <Text style={styles.statLabel}>Roll Number</Text>
              <Text style={styles.statValue}>{profile.rollNo || "N/A"}</Text>
            </View>
            <View style={[styles.statBox, { borderLeftWidth: 1, borderColor: "#f0f0f0" }]}>
              <View style={styles.statIconBox}>
                <MaterialCommunityIcons 
                  name={profile.isAlumni ? "school" : "school-outline"} 
                  size={22} 
                  color="#f9c349" 
                />
              </View>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={[styles.statValue, { color: profile.isAlumni ? "#f9c349" : "#1a1a1a" }]}>
                {profile.isAlumni ? "Alumni" : "Student"}
              </Text>
            </View>
          </Animated.View>

          {/* Account Details */}
          <Animated.View 
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: formSlide }]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ionicons name="person-circle-outline" size={22} color="#f9c349" />
              </View>
              <Text style={styles.sectionTitle}>Account Information</Text>
            </View>

            <InfoItem 
              icon="person-outline" 
              label="Full Name" 
              value={profile.name} 
              delay={0}
            />
            <InfoItem 
              icon="mail-outline" 
              label="Email Address" 
              value={profile.email} 
              delay={80}
            />
            <InfoItem 
              icon="call-outline" 
              label="Phone Number" 
              value={profile.phone || "Not Provided"} 
              delay={160}
            />
            <InfoItem 
              icon="shield-checkmark-outline" 
              label="Account Status" 
              value={profile.isAlumni ? "Verified Alumni" : "Verified Student"} 
              delay={240}
              valueColor={profile.isAlumni ? "#f9c349" : "#4CAF50"}
            />

            {/* Edit Button */}
            <Animated.View style={{ 
              transform: [{ scale: buttonScale }],
              marginTop: 20,
            }}>
              <TouchableOpacity 
                style={styles.editButton} 
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate("EditProfile", { profile });
                }}
              >
                <Ionicons name="create-outline" size={18} color="#1a1a1a" style={{ marginRight: 8 }} />
                <Text style={styles.editButtonText}>Update Profile</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Reusable Info Item Component with Animation
const InfoItem = ({ icon, label, value, delay, valueColor }) => {
  const itemFade = useRef(new Animated.Value(0)).current;
  const itemSlide = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFade, {
        toValue: 1,
        duration: 350,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(itemSlide, {
        toValue: 0,
        duration: 350,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.infoGroup,
      {
        opacity: itemFade,
        transform: [{ translateY: itemSlide }]
      }
    ]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.infoWrapper}>
        <View style={styles.infoIconBox}>
          <Ionicons name={icon} size={18} color="#f9c349" />
        </View>
        <Text style={[styles.infoText, valueColor && { color: valueColor }]}>{value}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#ffffff" 
  },
  
  // Header
  header: {
    paddingTop: 8,
    paddingBottom: 30,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  backButton: {
    position: "absolute",
    left: 14,
    top: 14,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 6,
    marginBottom: 20,
  },
  
  // Avatar
  avatarWrapper: { 
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: '#f9c349',
    elevation: 8,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  avatarImage: { 
    width: "100%", 
    height: "100%", 
    resizeMode: "cover" 
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f9c349',
  },
  
  // University Badge
  uniBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f9c34915',
    borderWidth: 1,
    borderColor: 'rgba(249, 195, 73, 0.3)',
    marginBottom: 12,
  },
  uniText: { 
    color: "#f9c349", 
    fontSize: 12, 
    fontWeight: "700",
  },
  
  // User Name
  userName: { 
    color: "#1a1a1a", 
    fontSize: 24, 
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  
  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(249, 195, 73, 0.2)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Content
  content: { 
    paddingHorizontal: 16,
    marginTop: 20,
  },
  
  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 22,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    elevation: 4,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  statBox: { 
    flex: 1, 
    alignItems: "center", 
    paddingHorizontal: 8 
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: { 
    fontSize: 10, 
    color: "#888", 
    textTransform: "uppercase", 
    fontWeight: "800", 
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: "#1a1a1a",
  },
  
  // Form
  formContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    elevation: 3,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: "800", 
    color: "#1a1a1a",
  },
  
  infoGroup: { 
    marginBottom: 16 
  },
  label: { 
    fontSize: 12, 
    fontWeight: "700", 
    color: "#999", 
    marginBottom: 6, 
    marginLeft: 4,
  },
  infoWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#f8f8f8",
    height: 52,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoText: { 
    flex: 1, 
    color: "#1a1a1a", 
    fontSize: 14, 
    fontWeight: "600" 
  },
  
  // Button
  editButton: {
    backgroundColor: '#f9c349',
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: 'row',
    elevation: 4,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  editButtonText: { 
    color: "#1a1a1a", 
    fontSize: 15, 
    fontWeight: "800",
  },

  // Skeleton Styles
  skeletonHeader: {
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  skeletonBackBtn: {
    position: "absolute",
    left: 14,
    top: 14,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  skeletonAvatarWrapper: {
    marginBottom: 16,
  },
  skeletonAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  skeletonStatsRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 22,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    marginBottom: 20,
  },
  skeletonStatBox: {
    flex: 1,
    alignItems: "center",
  },
  skeletonInfoWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#f8f8f8",
    height: 52,
  },
});