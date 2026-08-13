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
        <SkeletonItem style={[styles.skeletonCard, { height: 80 }]} />
        <SkeletonItem style={[styles.skeletonCard, { height: 300 }]} />
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
      case 'Verified': return '#10B981';
      case 'Pending': return '#F59E0B';
      default: return '#EF4444';
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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

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
                <Ionicons name="arrow-back" size={22} color="#1E293B" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Profile</Text>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleShareReferral}
                activeOpacity={0.7}
              >
                <Feather name="share-2" size={18} color="#1E293B" />
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
                          <MaterialCommunityIcons name="crown" size={12} color="#1E293B" />
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </Animated.View>

              <View style={styles.headerInfo}>
                <Text style={styles.userName}>{profile.name}</Text>
                
                {profile.headline && (
                  <View style={styles.headlineContainer}>
                    <Ionicons name="sparkles" size={12} color="#F59E0B" />
                    <Text style={styles.headlineText} numberOfLines={1}>{profile.headline}</Text>
                  </View>
                )}

                <View style={styles.universityRow}>
                  <FontAwesome5 name="university" size={11} color="#94A3B8" />
                  <Text style={styles.universityText} numberOfLines={1}>
                    {profile.university}
                  </Text>
                </View>

                <View style={styles.badgesContainer}>
                  <View style={[styles.badge, { backgroundColor: `${getStatusColor(profile.status)}15` }]}>
                    <Ionicons name={getStatusIcon(profile.status)} size={10} color={getStatusColor(profile.status)} />
                    <Text style={[styles.badgeText, { color: getStatusColor(profile.status), marginLeft: 3 }]}>
                      {profile.status}
                    </Text>
                  </View>

                  {profile.isVip && (
                    <View style={[styles.badge, styles.vipBadgeStyle]}>
                      <MaterialCommunityIcons name="crown" size={10} color="#F59E0B" />
                      <Text style={[styles.badgeText, { color: '#F59E0B', marginLeft: 3 }]}>VIP</Text>
                    </View>
                  )}

                  {profile.referralCode && (
                    <TouchableOpacity 
                      style={styles.referralChip}
                      onPress={handleShareReferral}
                      activeOpacity={0.7}
                    >
                      <Feather name="share-2" size={10} color="#F59E0B" />
                      <Text style={styles.referralChipText}>Refer</Text>
                    </TouchableOpacity>
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
                <Ionicons name="card-outline" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.statLabel}>Roll No.</Text>
              <Text style={styles.statValue} numberOfLines={1}>{profile.rollNo || "N/A"}</Text>
            </View>

            <View style={[styles.statItem, styles.statDivider]}>
              <View style={styles.statIconWrapper}>
                <MaterialCommunityIcons
                  name={profile.isAlumni ? "school" : "school-outline"}
                  size={18}
                  color="#F59E0B"
                />
              </View>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={[styles.statValue, { color: profile.isAlumni ? "#F59E0B" : "#1E293B" }]}>
                {profile.isAlumni ? "Alumni" : "Student"}
              </Text>
            </View>

            <View style={[styles.statItem, styles.statDivider]}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="people-outline" size={18} color="#F59E0B" />
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
                <Ionicons name="person-circle-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>

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
                  valueColor="#F59E0B"
                />
              )}
            </View>

            {/* Bio Section */}
            {profile.bio && (
              <View style={styles.bioSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbox-ellipses-outline" size={14} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>About</Text>
                </View>
                <View style={styles.bioCard}>
                  <Text style={styles.bioText}>{profile.bio}</Text>
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
                colors={['#000', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.editButtonGradient}
              >
                <Ionicons name="create-outline" size={18} color="#ffffff" />
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
        <Ionicons name={icon} size={16} color="#F59E0B" />
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
    backgroundColor: "#F8FAFC"
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },

  // Skeleton Styles
  skeletonContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  skeletonHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 16,
    paddingBottom: 20,
  },
  skeletonTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  skeletonText: {
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E2E8F0',
    marginRight: 14,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonBadge: {
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    marginBottom: 14,
  },

  // Header
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: -0.2,
  },

  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginRight: 14,
  },
  avatarBorder: {
    width: 74,
    height: 74,
    borderRadius: 37,
    padding: 2,
    backgroundColor: '#E2E8F0',
  },
  avatarBorderVip: {
    backgroundColor: '#F59E0B',
  },
  avatarInner: {
    flex: 1,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
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
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
  },
  vipBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  headlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  headlineText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  universityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  universityText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 5,
    fontWeight: '500',
    flex: 1,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  vipBadgeStyle: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B30',
  },
  referralChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B30',
    gap: 3,
  },
  referralChipText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Content
  content: {
    paddingHorizontal: 16,
    marginTop: -4,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: -0.2,
  },

  // Info Items
  infoList: {
    marginBottom: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 1,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },

  // Bio Section
  bioSection: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.2,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  bioCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  bioText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 20,
  },

  // Edit Button
  editButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  editButtonGradient: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});