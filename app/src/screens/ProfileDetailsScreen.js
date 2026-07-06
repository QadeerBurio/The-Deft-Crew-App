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
  Share,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import { Ionicons, FontAwesome5, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get('window');

// ==========================================
// SKELETON LOADER
// ==========================================
const ProfileSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.5, width * 0.5],
  });

  const ShimmerBlock = ({ style, borderRadius = 0 }) => (
    <View style={[style, { overflow: 'hidden', backgroundColor: '#f0f0f0', borderRadius }]}>
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.7)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonBackBtn} />
          <View style={styles.skeletonHeaderContent}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonHeaderRight}>
              <ShimmerBlock style={{ width: 140, height: 20, borderRadius: 10, marginBottom: 6 }} />
              <ShimmerBlock style={{ width: 100, height: 14, borderRadius: 7, marginBottom: 6 }} />
              <ShimmerBlock style={{ width: 80, height: 12, borderRadius: 6 }} />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.skeletonStatsRow}>
            <View style={styles.skeletonStatBox}>
              <ShimmerBlock style={{ width: 50, height: 12, borderRadius: 6, marginBottom: 8 }} />
              <ShimmerBlock style={{ width: 80, height: 18, borderRadius: 9 }} />
            </View>
            <View style={styles.skeletonStatBox}>
              <ShimmerBlock style={{ width: 50, height: 12, borderRadius: 6, marginBottom: 8 }} />
              <ShimmerBlock style={{ width: 80, height: 18, borderRadius: 9 }} />
            </View>
            <View style={styles.skeletonStatBox}>
              <ShimmerBlock style={{ width: 50, height: 12, borderRadius: 6, marginBottom: 8 }} />
              <ShimmerBlock style={{ width: 80, height: 18, borderRadius: 9 }} />
            </View>
          </View>

          <View style={styles.detailsCard}>
            <ShimmerBlock style={{ width: 160, height: 18, borderRadius: 9, marginBottom: 16 }} />
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <View key={i} style={styles.skeletonInfoItem}>
                <ShimmerBlock style={{ width: 32, height: 32, borderRadius: 10, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <ShimmerBlock style={{ width: 60, height: 10, borderRadius: 5, marginBottom: 4 }} />
                  <ShimmerBlock style={{ width: '80%', height: 14, borderRadius: 7 }} />
                </View>
              </View>
            ))}
            <ShimmerBlock style={{ height: 50, borderRadius: 16, marginTop: 12 }} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default function ProfileDetailsScreen({ navigation }) {
  const { user, token, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [showAllDetails, setShowAllDetails] = useState(false);

  // Animation refs
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const avatarScale = useRef(new Animated.Value(0.8)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;
  const statsScale = useRef(new Animated.Value(0.95)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;

  const [profile, setProfile] = useState({
    name: user?.name || "",
    rollNo: user?.rollNo || "",
    phone: user?.phone || "",
    email: user?.email || "",
    university: user?.university?.name || "Not Assigned",
    profileImage: user?.profileImage || null,
    isAlumni: user?.isAlumni || false,
    isVip: user?.isVip || false,
    vipExpiry: user?.vipExpiry || null,
    status: user?.status || "Not Verified",
    address: user?.address || "Not Provided",
    instagram: user?.instagram || "Not Provided",
    referralCode: user?.referralCode || null,
    referralCount: user?.referralCount || 0,
    referredBy: user?.referredBy || null,
    cardStatus: user?.cardStatus || "None",
    paymentStatus: user?.paymentStatus || "None",
    role: user?.role || "student",
    bio: user?.bio || "",
    headline: user?.headline || "",
    location: user?.location || "Not Provided",
    skills: user?.skills || [],
    education: user?.education || [],
    connections: user?.connections || [],
    enrolledCourses: user?.enrolledCourses || [],
    canApplyForTdcCard: user?.canApplyForTdcCard || false,
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
        name: d.name || "",
        rollNo: d.rollNo || "",
        phone: d.phone || "",
        email: d.email || "",
        university: d.university?.name || "Not Assigned",
        profileImage: d.profileImage || null,
        isAlumni: d.isAlumni || false,
        isVip: d.isVip || false,
        vipExpiry: d.vipExpiry || null,
        status: d.status || "Not Verified",
        address: d.address || "Not Provided",
        instagram: d.instagram || "Not Provided",
        referralCode: d.referralCode || null,
        referralCount: d.referralCount || 0,
        referredBy: d.referredBy || null,
        cardStatus: d.cardStatus || "None",
        paymentStatus: d.paymentStatus || "None",
        role: d.role || "student",
        bio: d.bio || "",
        headline: d.headline || "",
        location: d.location || "Not Provided",
        skills: d.skills || [],
        education: d.education || [],
        connections: d.connections || [],
        enrolledCourses: d.enrolledCourses || [],
        canApplyForTdcCard: d.canApplyForTdcCard || false,
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
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(statsScale, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);

    setTimeout(() => {
      Animated.spring(cardSlide, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }).start();
    }, 200);
  };

  const getProfileImageSource = () => {
    if (profile.profileImage) {
      return { uri: profile.profileImage };
    }
    return null;
  };

  const handleShareReferral = async () => {
    if (profile.referralCode) {
      try {
        await Share.share({
          message: `Join The Deft Crew using my referral code: ${profile.referralCode}\nDownload the app to get started!`,
          title: 'Share Referral Code',
        });
      } catch (error) {
        console.log('Share error:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Verified': return '#4CAF50';
      case 'Pending': return '#FF9800';
      default: return '#f44336';
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        {/* Header Section - Avatar Left, Info Right */}
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerSlide }]
            }
          ]}
        >
          <LinearGradient
            colors={['#ffffff', '#fafafa']}
            style={styles.headerGradient}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.goBack();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Profile</Text>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleShareReferral}
                activeOpacity={0.7}
              >
                <Feather name="share-2" size={20} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            {/* Profile Header - Avatar + Info */}
            <View style={styles.profileHeader}>
              <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={profile.isVip ? ['#f9c349', '#f5a623', '#e8961e'] : ['#f9c349', '#f5a623']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarBorder}
                  >
                    <View style={styles.avatarInner}>
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
                      {profile.isVip && (
                        <View style={styles.vipBadge}>
                          <MaterialCommunityIcons name="crown" size={14} color="#1a1a1a" />
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              </Animated.View>

              <View style={styles.headerInfo}>
                <Text style={styles.userName}>{profile.name}</Text>
                
                <View style={styles.universityRow}>
                  <FontAwesome5 name="university" size={12} color="#f9c349" />
                  <Text style={styles.universityText} numberOfLines={1}>
                    {profile.university}
                  </Text>
                </View>

                <View style={styles.badgesContainer}>
                  <View style={[styles.badge, profile.isAlumni ? styles.alumniBadge : styles.studentBadge]}>
                    <View style={[styles.badgeDot, profile.isAlumni ? styles.alumniDot : styles.studentDot]} />
                    <Text style={[styles.badgeText, profile.isAlumni ? styles.alumniText : styles.studentText]}>
                      {profile.isAlumni ? 'Alumni' : 'Student'}
                    </Text>
                  </View>
                  
                  <View style={[styles.badge, { backgroundColor: `${getStatusColor(profile.status)}12` }]}>
                    <View style={[styles.badgeDot, { backgroundColor: getStatusColor(profile.status) }]} />
                    <Text style={[styles.badgeText, { color: getStatusColor(profile.status) }]}>
                      {profile.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.content}>
          {/* Stats Cards - 3 columns */}
          <Animated.View
            style={[
              styles.statsRow,
              {
                opacity: contentFade,
                transform: [{ scale: statsScale }]
              }
            ]}
          >
            <View style={styles.statItem}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="card-outline" size={20} color="#f9c349" />
              </View>
              <Text style={styles.statLabel}>Roll No.</Text>
              <Text style={styles.statValue} numberOfLines={1}>{profile.rollNo || "N/A"}</Text>
            </View>

            <View style={[styles.statItem, styles.statDivider]}>
              <View style={styles.statIconWrapper}>
                <MaterialCommunityIcons
                  name={profile.isAlumni ? "school" : "school-outline"}
                  size={20}
                  color="#f9c349"
                />
              </View>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={[styles.statValue, { color: profile.isAlumni ? "#f9c349" : "#1a1a1a" }]}>
                {profile.isAlumni ? "Alumni" : "Student"}
              </Text>
            </View>

            <View style={[styles.statItem, styles.statDivider]}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="people-outline" size={20} color="#f9c349" />
              </View>
              <Text style={styles.statLabel}>Referrals</Text>
              <Text style={styles.statValue}>{profile.referralCount || 0}</Text>
            </View>
          </Animated.View>

          {/* Account Details Card */}
          <Animated.View
            style={[
              styles.detailsCard,
              {
                opacity: contentFade,
                transform: [{ translateY: cardSlide }]
              }
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="person-circle-outline" size={22} color="#f9c349" />
              </View>
              <Text style={styles.cardTitle}>Account Details</Text>
            </View>

            {/* All Account Details */}
            <View style={styles.infoList}>
              <InfoItem
                icon="mail-outline"
                label="Email"
                value={profile.email}
              />
              <InfoItem
                icon="call-outline"
                label="Phone"
                value={profile.phone || "Not Provided"}
              />
              <InfoItem
                icon="location-outline"
                label="Location"
                value={profile.location || "Not Provided"}
              />
              <InfoItem
                icon="home-outline"
                label="Address"
                value={profile.address || "Not Provided"}
              />
              
              <InfoItem
                icon="ribbon-outline"
                label="Role"
                value={profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1) || "N/A"}
              />
              {profile.isVip && (
                <InfoItem
                  icon="crown-outline"
                  label="VIP Status"
                  value={`Active${profile.vipExpiry ? ` until ${new Date(profile.vipExpiry).toLocaleDateString()}` : ''}`}
                  valueColor="#f9c349"
                />
              )}
              <InfoItem
                icon="code-outline"
                label="Referral Code"
                value={profile.referralCode || "Not Generated"}
                valueColor="#f9c349"
              />
              <InfoItem
                icon="people-outline"
                label="Referral Count"
                value={String(profile.referralCount || 0)}
              />
              <InfoItem
                icon="card-outline"
                label="TDC Card"
                value={profile.cardStatus || "None"}
                valueColor={profile.cardStatus === 'Delivered' ? '#4CAF50' : '#f9c349'}
              />
              <InfoItem
                icon="cash-outline"
                label="Payment"
                value={profile.paymentStatus || "None"}
                valueColor={profile.paymentStatus === 'Verified' ? '#4CAF50' : '#f9c349'}
              />
              <InfoItem
                icon="chatbox-outline"
                label="Bio"
                value={profile.bio || "No bio set"}
              />
              
            </View>

            {/* Skills Section */}
            {profile.skills && profile.skills.length > 0 && (
              <View style={styles.skillsSection}>
                <Text style={styles.skillsLabel}>Skills</Text>
                <View style={styles.skillsRow}>
                  {profile.skills.map((skill, index) => (
                    <View key={index} style={styles.skillTag}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Education Section */}
            {profile.education && profile.education.length > 0 && (
              <View style={styles.educationSection}>
                <Text style={styles.skillsLabel}>Education</Text>
                {profile.education.map((edu, index) => (
                  <View key={index} style={styles.educationItem}>
                    <Text style={styles.educationSchool}>{edu.school}</Text>
                    <Text style={styles.educationDegree}>{edu.degree}</Text>
                    <Text style={styles.educationYear}>
                      {edu.startYear} - {edu.endYear || 'Present'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Connections */}
            {profile.connections && profile.connections.length > 0 && (
              <InfoItem
                icon="people"
                label="Connections"
                value={String(profile.connections.length)}
              />
            )}

            {/* TDC Card Eligibility */}
            {profile.canApplyForTdcCard && (
              <View style={styles.tdcCardContainer}>
                <MaterialCommunityIcons name="gift" size={18} color="#f9c349" />
                <Text style={styles.tdcCardText}>You are eligible for TDC Card!</Text>
              </View>
            )}

            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate("EditProfile", { profile });
              }}
            >
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.editButtonGradient}
              >
                <Ionicons name="create-outline" size={20} color="#1a1a1a" style={{ marginRight: 8 }} />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// INFO ITEM COMPONENT
// ==========================================
const InfoItem = ({ icon, label, value, valueColor }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.infoItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#f9c349" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor && { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Animated.View>
  );
};

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa"
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },

  // Profile Header - Avatar Left, Info Right
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 2.5,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 38,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f9c349',
  },
  vipBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#f9c349',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  universityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  universityText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginRight: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  studentBadge: {
    backgroundColor: '#4CAF5012',
  },
  studentDot: {
    backgroundColor: '#4CAF50',
  },
  studentText: {
    color: '#4CAF50',
  },
  alumniBadge: {
    backgroundColor: '#f9c34912',
  },
  alumniDot: {
    backgroundColor: '#f9c349',
  },
  alumniText: {
    color: '#f9c349',
  },

  // Content
  content: {
    paddingHorizontal: 16,
    marginTop: -8,
  },

  // Stats Row - 3 columns
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f9c34910',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f9c34910',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },

  // Info Items - Clean List
  infoList: {
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#f9c34908',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },

  // Skills
  skillsSection: {
    paddingTop: 4,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    marginTop: 4,
  },
  skillsLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 6,
    marginTop: 8,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skillTag: {
    backgroundColor: '#f9c34910',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(249, 195, 73, 0.15)',
    marginRight: 4,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a1a1a',
  },

  // Education
  educationSection: {
    paddingTop: 4,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    marginTop: 4,
  },
  educationItem: {
    backgroundColor: '#fafafa',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginBottom: 6,
  },
  educationSchool: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  educationDegree: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  educationYear: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },

  // TDC Card
  tdcCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9c34910',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f9c349',
    marginTop: 8,
    marginBottom: 4,
  },
  tdcCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f9c349',
    marginLeft: 8,
  },

  // Edit Button
  editButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  editButtonGradient: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  editButtonText: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Skeleton
  skeletonHeader: {
    backgroundColor: '#ffffff',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  skeletonBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  skeletonHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    marginRight: 16,
  },
  skeletonHeaderRight: {
    flex: 1,
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 16,
  },
  skeletonStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  skeletonInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
});