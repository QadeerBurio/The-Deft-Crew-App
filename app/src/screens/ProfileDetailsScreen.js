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
  Platform,
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
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const SkeletonItem = ({ style }) => {
    const opacity = shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });
    return <Animated.View style={[style, { opacity }]} />;
  };

  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonTopBar}>
          <SkeletonItem style={styles.skeletonIcon} />
          <SkeletonItem style={[styles.skeletonText, { width: 100 }]} />
          <SkeletonItem style={styles.skeletonIcon} />
        </View>
        <View style={styles.skeletonProfileRow}>
          <SkeletonItem style={styles.skeletonAvatar} />
          <View style={styles.skeletonInfo}>
            <SkeletonItem style={[styles.skeletonText, { width: 150, height: 24 }]} />
            <SkeletonItem style={[styles.skeletonText, { width: 100, height: 14, marginTop: 6 }]} />
            <SkeletonItem style={[styles.skeletonText, { width: 120, height: 14, marginTop: 6 }]} />
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
              <SkeletonItem style={[styles.skeletonBadge, { width: 70 }]} />
              <SkeletonItem style={[styles.skeletonBadge, { width: 80 }]} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.skeletonContent}>
        <SkeletonItem style={[styles.skeletonCard, { height: 100 }]} />
        <SkeletonItem style={[styles.skeletonCard, { height: 350 }]} />
      </View>
    </View>
  );
};

export default function ProfileDetailsScreen({ navigation }) {
  const { user, token, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);

  // Animation refs
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const avatarScale = useRef(new Animated.Value(0.5)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(50)).current;
  const statsScale = useRef(new Animated.Value(0.9)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;

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
    role: user?.role || "student",
    bio: user?.bio || "",
    headline: user?.headline || "",
    location: user?.location || "Not Provided",
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
        role: d.role || "student",
        bio: d.bio || "",
        headline: d.headline || "",
        location: d.location || "Not Provided",
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
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(statsScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, 150);

    setTimeout(() => {
      Animated.spring(cardSlide, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }, 300);
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
          message: `✨ Join The Deft Crew using my referral code: ${profile.referralCode}\nDownload the app to get started! 🚀`,
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
      case 'Pending': return '#f9c349';
      default: return '#F44336';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Verified': return 'checkmark-circle';
      case 'Pending': return 'time-outline';
      default: return 'close-circle';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
        {/* Header Section */}
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerSlide }]
            }
          ]}
        >
          <View style={styles.headerGradient}>
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
                <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>My Profile</Text>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleShareReferral}
                activeOpacity={0.7}
              >
                <Feather name="share-2" size={20} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                <View style={styles.avatarWrapper}>
                  <View style={[styles.avatarBorder, profile.isVip && styles.avatarBorderVip]}>
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
                  </View>
                </View>
              </Animated.View>

              <View style={styles.headerInfo}>
                <Text style={styles.userName}>{profile.name}</Text>
                
                

                <View style={styles.universityRow}>
                  <FontAwesome5 name="university" size={13} color="#666" />
                  <Text style={styles.universityText} numberOfLines={2}>
                    {profile.university}
                  </Text>
                </View>

                <View style={styles.badgesContainer}>
                  
                  
                  <View style={[styles.badge, { backgroundColor: `${getStatusColor(profile.status)}15` }]}>
                    <Ionicons name={getStatusIcon(profile.status)} size={12} color={getStatusColor(profile.status)} />
                    <Text style={[styles.badgeText, { color: getStatusColor(profile.status), marginLeft: 4 }]}>
                      {profile.status}
                    </Text>
                  </View>

                  {profile.isVip && (
                    <View style={[styles.badge, styles.vipBadgeStyle]}>
                      <MaterialCommunityIcons name="crown" size={12} color="#f9c349" />
                      <Text style={[styles.badgeText, { color: '#f9c349', marginLeft: 4 }]}>VIP</Text>
                    </View>
                  )}
                </View>

               
              </View>
            </View>
          </View>
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
                <Ionicons name="card-outline" size={22} color="#f9c349" />
              </View>
              <Text style={styles.statLabel}>Roll No.</Text>
              <Text style={styles.statValue} numberOfLines={1}>{profile.rollNo || "N/A"}</Text>
            </View>

            <View style={[styles.statItem, styles.statDivider]}>
              <View style={styles.statIconWrapper}>
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

            <View style={[styles.statItem, styles.statDivider]}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="people-outline" size={22} color="#f9c349" />
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
                <Ionicons name="person-circle-outline" size={24} color="#f9c349" />
              </View>
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>

            <View style={styles.infoList}>
              <InfoItem
                icon="mail-outline"
                label="Email Address"
                value={profile.email}
              />
              <InfoItem
                icon="call-outline"
                label="Phone Number"
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
              <InfoItem
                icon="calendar-outline"
                label="Member Since"
                value={formatDate(user?.createdAt) || "N/A"}
              />
              {profile.isVip && profile.vipExpiry && (
                <InfoItem
                  icon="crown-outline"
                  label="VIP Membership"
                  value={`Expires ${formatDate(profile.vipExpiry)}`}
                  valueColor="#f9c349"
                />
              )}
            </View>

            {/* Bio Section */}
            {profile.bio && (
              <View style={styles.bioSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbox-ellipses-outline" size={16} color="#f9c349" />
                  <Text style={styles.sectionTitle}>About Me</Text>
                </View>
                <View style={styles.bioCard}>
                  <Text style={styles.bioText}>{profile.bio}</Text>
                </View>
              </View>
            )}
            {/* Bio Section */}
            {profile.headline && (
              <View style={styles.bioSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="sparkles-outline" size={14} color="#f9c349" />
                  <Text style={styles.sectionTitle}>Headline</Text>
                </View>
                <View style={styles.bioCard}>
                  <Text style={styles.headlineText}>{profile.headline}</Text>
                </View>
              </View>
            )}
           

            {/* Edit Profile Button */}
            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate("EditProfileScreen", { profile });
              }}
            >
              <LinearGradient
                colors={['#f9c349', '#e6b800']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.editButtonGradient}
              >
                <Ionicons name="create-outline" size={22} color="#1a1a1a" />
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
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
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
        <Ionicons name={icon} size={20} color="#f9c349" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor && { color: valueColor }]} numberOfLines={1}>
          {value || "Not Provided"}
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },

  // Skeleton Styles
  skeletonContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  skeletonHeader: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 16,
    paddingBottom: 24,
  },
  skeletonTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  skeletonText: {
    height: 16,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  skeletonProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    marginRight: 16,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonBadge: {
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    marginBottom: 16,
  },

  // Header
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },

  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarWrapper: {
    marginRight: 16,
  },
  avatarBorder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    padding: 3,
    backgroundColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarBorderVip: {
    backgroundColor: '#f9c349',
  },
  avatarInner: {
    flex: 1,
    borderRadius: 42,
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
    color: '#1a1a1a',
  },
  vipBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headlineText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  universityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  universityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
    flex: 1,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  studentBadge: {
    backgroundColor: '#e8f5e9',
  },
  studentDot: {
    backgroundColor: '#4CAF50',
  },
  studentText: {
    color: '#4CAF50',
  },
  alumniBadge: {
    backgroundColor: '#fef9f0',
  },
  alumniDot: {
    backgroundColor: '#f9c349',
  },
  alumniText: {
    color: '#f9c349',
  },
  vipBadgeStyle: {
    backgroundColor: '#fef9f0',
    borderColor: '#f9c34930',
  },
  referralChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9f0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f9c34930',
    alignSelf: 'flex-start',
    gap: 6,
  },
  referralChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f9c349',
  },

  // Content
  content: {
    paddingHorizontal: 16,
    marginTop: -8,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
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
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fef9f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  cardHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fef9f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },

  // Info Items
  infoList: {
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef9f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },

  // Bio Section
  bioSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  bioCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  bioText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 22,
  },

  // Edit Button
  editButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  editButtonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  editButtonText: {
    color: '#1a1a1a',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});