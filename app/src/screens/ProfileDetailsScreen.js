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
  Easing,
  Dimensions,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get('window');

// ==========================================
// ENHANCED SKELETON LOADER COMPONENT
// ==========================================
const ProfileSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
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
    outputRange: [-200, 200],
  });

  const ShimmerBlock = ({ style }) => (
    <View style={[style, { overflow: 'hidden', backgroundColor: '#E8ECF1' }]}>
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* Skeleton Header */}
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonHeaderGradient}>
          <View style={styles.skeletonBackButton} />
          
          <View style={styles.skeletonAvatarContainer}>
            <View style={styles.skeletonAvatar}>
              <Ionicons name="person" size={50} color="#D0D0D0" />
            </View>
            <View style={styles.skeletonAvatarRing} />
          </View>
          
          <View style={styles.skeletonBadge}>
            <ShimmerBlock style={{ width: 140, height: 20, borderRadius: 10 }} />
          </View>
          
          <ShimmerBlock style={styles.skeletonName} />
          <ShimmerBlock style={{ width: 100, height: 14, borderRadius: 7, marginTop: 8 }} />
        </View>
      </View>

      {/* Skeleton Content */}
      <View style={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <ShimmerBlock style={{ width: 60, height: 12, borderRadius: 6, marginBottom: 10 }} />
            <ShimmerBlock style={{ width: 90, height: 18, borderRadius: 6 }} />
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderColor: "#E8ECF1" }]}>
            <ShimmerBlock style={{ width: 70, height: 12, borderRadius: 6, marginBottom: 10 }} />
            <ShimmerBlock style={{ width: 80, height: 18, borderRadius: 6 }} />
          </View>
        </View>

        <View style={styles.formContainer}>
          <ShimmerBlock style={{ width: 150, height: 18, borderRadius: 6, marginBottom: 25 }} />
          
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.infoGroup}>
              <ShimmerBlock style={{ width: 80, height: 13, borderRadius: 6, marginBottom: 10, marginLeft: 5 }} />
              <View style={[styles.infoWrapper, { backgroundColor: '#F7F8FA', borderColor: '#E8ECF1' }]}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#E8ECF1', marginRight: 12 }} />
                <ShimmerBlock style={{ flex: 1, height: 18, borderRadius: 6 }} />
              </View>
            </View>
          ))}
          
          <ShimmerBlock style={{ height: 55, borderRadius: 16, marginTop: 15 }} />
        </View>
      </View>
    </View>
  );
};

export default function ProfileDetailsScreen({ navigation }) {
  const { user, token, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerSlide = useRef(new Animated.Value(-100)).current;
  const avatarScale = useRef(new Animated.Value(0)).current;
  const avatarRotate = useRef(new Animated.Value(0)).current;
  const uniSlide = useRef(new Animated.Value(-30)).current;
  const statsScale = useRef(new Animated.Value(0.8)).current;
  const formSlide = useRef(new Animated.Value(60)).current;
  const buttonScale = useRef(new Animated.Value(0.85)).current;
  const shimmerValue = useRef(new Animated.Value(0)).current;
  const headerGlow = useRef(new Animated.Value(0)).current;

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
    startShimmerAnimation();
  }, []);

  const startShimmerAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

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
    // Glowing header effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlow, {
          toValue: 1,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(headerGlow, {
          toValue: 0,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Staggered entrance animations
    Animated.sequence([
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(avatarScale, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(avatarRotate, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(uniSlide, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(statsScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(formSlide, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
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

  const rotateInterpolate = avatarRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const headerGlowOpacity = headerGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* Floating particles effect */}
      <Animated.View style={[styles.headerGlow, { opacity: headerGlowOpacity }]} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        bounces={false}
      >
        {/* Animated Header */}
        <Animated.View style={{ transform: [{ translateY: headerSlide }] }}>
          <LinearGradient 
            colors={['#1a1a1a', '#2d2d2d', '#0a0a0a']} 
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Animated dots pattern */}
            <View style={styles.headerPattern}>
              {[...Array(20)].map((_, i) => (
                <View key={i} style={[styles.dot, { 
                  top: Math.random() * 100 + '%', 
                  left: Math.random() * 100 + '%',
                  opacity: Math.random() * 0.3 + 0.1,
                }]} />
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              activeOpacity={0.7}
            >
              <BlurView intensity={30} style={styles.backButtonBlur}>
                <Ionicons name="chevron-back" size={22} color="#FFD700" />
              </BlurView>
            </TouchableOpacity>

            {/* Avatar with ring animation */}
            <Animated.View 
              style={[
                styles.avatarWrapper, 
                { 
                  transform: [
                    { scale: avatarScale },
                  ]
                }
              ]}
            >
              <View style={styles.avatarRing}>
                <Animated.View style={[
                  styles.avatarRingInner,
                  { transform: [{ rotate: rotateInterpolate }] }
                ]}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500', '#FFD700']}
                    style={styles.ringGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
              </View>
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
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: uniSlide }]
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(255,215,0,0.2)', 'rgba(255,165,0,0.1)']}
                style={styles.uniBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <FontAwesome5 name="university" size={14} color="#FFD700" style={{ marginRight: 8 }} />
                <Text style={styles.headerUniText}>{profile.university}</Text>
              </LinearGradient>
            </Animated.View>

            {/* User Name */}
            <Animated.View style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}>
              <Text style={styles.headerName}>{profile.name}</Text>
            </Animated.View>
            
            {/* Status Badge */}
            <Animated.View style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: profile.isAlumni ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.1)' }
              ]}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: profile.isAlumni ? '#FFD700' : '#4CAF50' }
                ]} />
                <Text style={[
                  styles.statusText,
                  { color: profile.isAlumni ? '#FFD700' : '#4CAF50' }
                ]}>
                  {profile.isAlumni ? 'Alumni' : 'Active Student'}
                </Text>
              </View>
            </Animated.View>
          </LinearGradient>
        </Animated.View>

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
              <View style={styles.statIconContainer}>
                <Ionicons name="card-outline" size={24} color="#FFD700" />
              </View>
              <Text style={styles.statLabel}>Roll Number</Text>
              <Text style={styles.statValue}>{profile.rollNo || "N/A"}</Text>
            </View>
            <View style={[styles.statBox, { borderLeftWidth: 1, borderColor: "#E8ECF1" }]}>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons 
                  name={profile.isAlumni ? "school" : "school-outline"} 
                  size={24} 
                  color="#FFD700" 
                />
              </View>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={[styles.statValue, { color: profile.isAlumni ? "#FFD700" : "#000" }]}>
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
              <View style={styles.sectionIcon}>
                <Ionicons name="person-circle-outline" size={24} color="#FFD700" />
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
              delay={100}
            />
            <InfoItem 
              icon="call-outline" 
              label="Phone Number" 
              value={profile.phone || "Not Provided"} 
              delay={200}
            />

            <InfoItem 
              icon="shield-checkmark-outline" 
              label="Account Status" 
              value={profile.isAlumni ? "Verified Alumni" : "Verified Student"} 
              delay={300}
              valueColor={profile.isAlumni ? "#FFD700" : "#4CAF50"}
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
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.editButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="create-outline" size={20} color="#000" style={{ marginRight: 8 }} />
                  <Text style={styles.editButtonText}>Update Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

// Reusable Info Item Component with Animation
const InfoItem = ({ icon, label, value, delay, valueColor }) => {
  const itemFade = useRef(new Animated.Value(0)).current;
  const itemSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFade, {
        toValue: 1,
        duration: 500,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(itemSlide, {
        toValue: 0,
        duration: 500,
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
        <View style={styles.infoIconContainer}>
          <Ionicons name={icon} size={20} color="#FFD700" />
        </View>
        <Text style={[styles.infoText, valueColor && { color: valueColor }]}>{value}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { 
    flex: 1, 
    backgroundColor: "#F8F9FA" 
  },
  
  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
  },
  headerGlow: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    height: 400,
    backgroundColor: '#FFD700',
    borderRadius: 200,
    opacity: 0.1,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 50,
    zIndex: 10,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    overflow: 'hidden',
  },
  
  // Avatar
  avatarWrapper: { 
    marginBottom: 20,
    position: 'relative',
  },
  avatarRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRingInner: {
    width: '100%',
    height: '100%',
    borderRadius: 58,
  },
  ringGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 58,
    opacity: 0.3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  avatarImage: { 
    width: "100%", 
    height: "100%", 
    resizeMode: "cover" 
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  
  // University Badge
  uniBadge: {
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
  },
  uniBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  headerUniText: { 
    color: "#FFD700", 
    fontSize: 13, 
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  
  // User Name
  headerName: { 
    color: "#fff", 
    fontSize: 28, 
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  
  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  
  // Content
  content: { 
    marginTop: -30, 
    paddingHorizontal: 20 
  },
  
  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 25,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 25,
  },
  statBox: { 
    flex: 1, 
    alignItems: "center", 
    paddingHorizontal: 10 
  },
  statIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: { 
    fontSize: 11, 
    color: "#888", 
    textTransform: "uppercase", 
    fontWeight: "700", 
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  statValue: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#333",
    marginTop: 2,
  },
  
  // Form
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#1a1a1a",
    letterSpacing: -0.3,
  },
  
  infoGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#999", 
    marginBottom: 8, 
    marginLeft: 5,
    letterSpacing: 0.3,
  },
  infoWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8ECF1",
    borderRadius: 16,
    paddingHorizontal: 15,
    backgroundColor: "#F8F9FA",
    height: 58,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: { 
    flex: 1, 
    color: "#1a1a1a", 
    fontSize: 15, 
    fontWeight: "600" 
  },
  
  // Button
  editButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  editButtonGradient: {
    height: 55,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: 'row',
  },
  editButtonText: { 
    color: "#000", 
    fontSize: 16, 
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // Skeleton Styles
  skeletonHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  skeletonHeaderGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  skeletonBackButton: {
    position: "absolute",
    left: 20,
    top: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,215,0,0.1)",
  },
  skeletonAvatarContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  skeletonAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  skeletonAvatarRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.1)',
  },
  skeletonBadge: {
    marginBottom: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  skeletonName: {
    width: 160,
    height: 28,
    borderRadius: 8,
    marginBottom: 10,
  },
});

