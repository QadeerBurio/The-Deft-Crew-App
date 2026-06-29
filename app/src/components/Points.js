import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Share,
  Alert,
  RefreshControl,
  Animated,
  InteractionManager,
  Platform,
  Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import GuestGuard from "./GuestGuard";

const { width, height } = Dimensions.get("window");

// ==========================================
// ULTRA-FAST CACHE SYSTEM
// ==========================================
const MEMORY_CACHE = new Map();
const CACHE_KEY = "points_data";
const CACHE_TTL = 2 * 60 * 1000;
let pendingFetchPromise = null;
const FETCH_DEBOUNCE = 5000;
let lastFetchTime = 0;

// ==========================================
// STORE CONFIGURATION
// ==========================================
const PLAY_STORE_PACKAGE = "com.aqkhan110.tdc";
const APP_STORE_ID = "6765877675";
const APP_STORE_URL = `https://apps.apple.com/br/app/the-deft-crew/id${APP_STORE_ID}`;

// ==========================================
// TIER DEFINITIONS
// ==========================================
const TIERS = [
  {
    id: "tdc_card",
    name: "TDC PRIVILEGE CARD",
    minDownloads: 10,
    icon: "card-account-details-star",
    color: "#f9c349",
    bgColor: "#f9c34915",
    gradient: ["#f9c349", "#f5a623"],
    perks: ["TDC Privilege Card", "Exclusive Discounts", "Partner Brand Access"],
    reward: "TDC Privilege Card Unlocked",
    isCardTier: true,
  },
  {
    id: "rookie",
    name: "DEFT ROOKIE",
    minDownloads: 50,
    icon: "shield-star",
    color: "#6C63FF",
    bgColor: "#6C63FF15",
    gradient: ["#6C63FF", "#5A52D5"],
    perks: [
      "Digital Badge",
      "VIP Access to Partner Brands",
      "Professional Community Access",
    ],
    reward: "Digital Badge + VIP Access",
  },
  {
    id: "main_character",
    name: "DEFT MAIN CHARACTER",
    minDownloads: 100,
    icon: "account-star",
    color: "#FF6B6B",
    bgColor: "#FF6B6B15",
    gradient: ["#FF6B6B", "#E55A5A"],
    perks: [
      "PKR 2,000 Cash",
      "Experience Certificate",
      "Recommendation Letter",
      "Priority VIP Access",
      "All Previous Perks",
    ],
    reward: "PKR 2,000 + Certificate",
  },
  {
    id: "pro",
    name: "DEFT PRO",
    minDownloads: 500,
    icon: "crown",
    color: "#FFD93D",
    bgColor: "#FFD93D15",
    gradient: ["#FFD93D", "#F5C800"],
    perks: [
      "PKR 5,000 Cash",
      "Instagram Feature",
      "Internship Consideration",
      "Leadership Mentorship",
      "Unlimited VIP Access",
      "All Previous Perks",
    ],
    reward: "PKR 5,000 + Mentorship",
  },
  {
    id: "goat",
    name: "DEFT GOAT",
    minDownloads: 2000,
    icon: "trophy",
    color: "#FF6B35",
    bgColor: "#FF6B3515",
    gradient: ["#FF6B35", "#E55A2A"],
    perks: [
      "PKR 10,000 Cash",
      "Guaranteed Paid Internship",
      "Expanded Leadership Access",
      "All Previous Perks",
    ],
    reward: "PKR 10,000 + Internship",
  },
  {
    id: "founder",
    name: "DEFT FOUNDER CIRCLE",
    minDownloads: 5000,
    icon: "crown-circle",
    color: "#FFD700",
    bgColor: "#FFD70015",
    gradient: ["#FFD700", "#FFC000"],
    perks: [
      "PKR 15,000 Cash",
      "Founder Job Recommendation Letter",
      "Founder LinkedIn Recommendation",
      "Lifetime Founder Mentorship",
      "All Previous Perks",
    ],
    reward: "PKR 15,000 + Mentorship",
  },
];

// ==========================================
// SKELETON LOADER
// ==========================================
const SkeletonLoader = memo(() => (
  <SafeAreaView style={styles.container} edges={["top"]}>
    <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
    <View style={styles.header}>
      <View style={{ width: 38, height: 38, backgroundColor: "#E8ECF1", borderRadius: 12 }} />
      <View style={{ width: 100, height: 20, backgroundColor: "#E8ECF1", borderRadius: 6 }} />
      <View style={{ width: 38, height: 38, backgroundColor: "#E8ECF1", borderRadius: 12 }} />
    </View>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={{ margin: 16, padding: 24, backgroundColor: "#E8ECF1", borderRadius: 24, height: 200 }} />
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ width: 120, height: 14, backgroundColor: "#E8ECF1", borderRadius: 4, marginBottom: 14 }} />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={{ flexDirection: "row", backgroundColor: "#F5F5F5", padding: 16, borderRadius: 16, marginBottom: 12 }}>
            <View style={{ width: 50, height: 50, backgroundColor: "#E8ECF1", borderRadius: 14, marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <View style={{ width: "70%", height: 14, backgroundColor: "#E8ECF1", borderRadius: 4, marginBottom: 6 }} />
              <View style={{ width: "90%", height: 10, backgroundColor: "#E8ECF1", borderRadius: 4 }} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
));

// ==========================================
// HERO PROGRESS CARD
// ==========================================
const HeroProgressCard = memo(({ referred, isCardUnlocked, cardPulse, onClaimCard }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const glowInterpolate = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const progress = Math.min(referred / 10, 1);

  return (
    <Animated.View
      style={[
        styles.heroCard,
        {
          transform: [{ scale: cardPulse }],
          shadowOpacity: glowInterpolate.interpolate({
            inputRange: [0, 8],
            outputRange: [0.2, 0.5],
          }),
        },
      ]}
    >
      <LinearGradient
        colors={isCardUnlocked ? ["#1a1a1a", "#2d2d2d"] : ["#1a1a1a", "#2d2d2d"]}
        style={styles.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated Background Orbs */}
        <Animated.View
          style={[
            styles.heroOrb1,
            {
              transform: [{ rotate: rotateInterpolate }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.heroOrb2,
            {
              transform: [{ rotate: rotateInterpolate }],
            },
          ]}
        />

        <View style={styles.heroContent}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroLabel}>YOUR PROGRESS</Text>
              <View style={styles.heroCountContainer}>
                <Text style={styles.heroCount}>{referred}</Text>
                <Text style={styles.heroCountLabel}>Referrals</Text>
              </View>
            </View>
            {isCardUnlocked ? (
              <View style={styles.heroBadgeActive}>
                <MaterialCommunityIcons
                  name="card-account-details-star"
                  size={20}
                  color="#1a1a1a"
                />
                <Text style={styles.heroBadgeText}>CARD ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.heroBadgeLocked}>
                <Ionicons name="lock-closed" size={16} color="#999" />
                <Text style={styles.heroBadgeLockedText}>LOCKED</Text>
              </View>
            )}
          </View>

          {/* Circular Progress */}
          <View style={styles.heroProgressContainer}>
            <View style={styles.heroProgressCircle}>
              <Animated.View
                style={[
                  styles.heroProgressRing,
                  {
                    transform: [{ rotate: `${progress * 360}deg` }],
                  },
                ]}
              >
                <LinearGradient
                  colors={isCardUnlocked ? ["#f9c349", "#f5a623"] : ["#666", "#444"]}
                  style={styles.heroRingGradient}
                />
              </Animated.View>
              <View style={styles.heroProgressInner}>
                <MaterialCommunityIcons
                  name={isCardUnlocked ? "card-account-details-star" : "card-outline"}
                  size={32}
                  color={isCardUnlocked ? "#f9c349" : "#666"}
                />
                <Text style={[styles.heroProgressPercent, isCardUnlocked && styles.heroProgressPercentActive]}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
            </View>

            <View style={styles.heroProgressText}>
              <Text style={styles.heroProgressTitle}>
                {isCardUnlocked
                  ? "🎉 TDC Privilege Card Unlocked!"
                  : `${10 - referred} more referral${10 - referred > 1 ? "s" : ""} to unlock`}
              </Text>
              <Text style={styles.heroProgressSubtitle}>
                {isCardUnlocked
                  ? "Show your card at partner brands for exclusive discounts"
                  : "Keep sharing your referral link to unlock the TDC Card"}
              </Text>
            </View>
          </View>

          {isCardUnlocked && (
            <TouchableOpacity style={styles.heroClaimBtn} onPress={onClaimCard} activeOpacity={0.8}>
              <LinearGradient
                colors={["#f9c349", "#f5a623"]}
                style={styles.heroClaimGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.heroClaimText}>View My TDC Card →</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

// ==========================================
// ANIMATED TIER CARD
// ==========================================
const AnimatedTierCard = memo(
  ({ tier, index, currentDownloads, isUnlocked, isNext }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const hasAnimated = useRef(false);

    useEffect(() => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      const delay = Math.min(index * 60, 200);

      InteractionManager.runAfterInteractions(() => {
        Animated.parallel([
          Animated.timing(cardAnim, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            delay,
            useNativeDriver: true,
          }),
        ]).start();
      });

      if (isUnlocked) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(shimmerAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: false,
            }),
            Animated.timing(shimmerAnim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: false,
            }),
          ])
        ).start();
      }

      return () => {
        // Cleanup
      };
    }, []);

    const progress = Math.min(currentDownloads / tier.minDownloads, 1);
    const isCardTier = tier.isCardTier || false;

    const shimmerInterpolate = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0%", "100%"],
    });

    return (
      <Animated.View
        style={[
          styles.tierCard,
          isUnlocked && styles.tierCardUnlocked,
          isNext && styles.tierCardNext,
          isCardTier && styles.tierCardSpecial,
          {
            opacity: cardAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Shimmer effect for unlocked cards */}
        {isUnlocked && (
          <Animated.View
            style={[
              styles.tierShimmer,
              {
                transform: [{ translateX: shimmerInterpolate }],
              },
            ]}
          />
        )}

        <LinearGradient
          colors={
            isUnlocked
              ? [tier.color, tier.color + "CC"]
              : ["#f0f0f0", "#e8e8e8"]
          }
          style={[styles.tierIconContainer, isCardTier && styles.tierIconSpecial]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons
            name={tier.icon}
            size={isCardTier ? 32 : 28}
            color={isUnlocked ? "#fff" : "#999"}
          />
        </LinearGradient>

        <View style={styles.tierContent}>
          <View style={styles.tierHeader}>
            <Text style={[styles.tierName, isUnlocked && styles.tierNameActive, isCardTier && styles.tierNameSpecial]}>
              {tier.name}
            </Text>
            {isUnlocked ? (
              <View style={styles.unlockedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={styles.unlockedText}>UNLOCKED</Text>
              </View>
            ) : isNext ? (
              <View style={styles.nextBadge}>
                <Text style={styles.nextText}>NEXT</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.tierReward, isCardTier && styles.tierRewardSpecial]}>
            {tier.reward}
          </Text>

          <View style={styles.tierProgressContainer}>
            <View style={styles.tierProgressTrack}>
              <Animated.View
                style={[
                  styles.tierProgressBar,
                  {
                    width: `${Math.min(progress * 100, 100)}%`,
                    backgroundColor: isUnlocked ? tier.color : "#ddd",
                  },
                ]}
              />
            </View>
            <Text style={styles.tierProgressText}>
              {isUnlocked
                ? "✓ Unlocked"
                : `${currentDownloads}/${tier.minDownloads} ${isCardTier ? "referrals" : "downloads"}`}
            </Text>
          </View>

          <View style={styles.perksList}>
            {tier.perks.slice(0, 3).map((perk, i) => (
              <View key={i} style={styles.perkItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={isUnlocked ? tier.color : "#ccc"}
                />
                <Text
                  style={[styles.perkText, isUnlocked && styles.perkTextActive]}
                  numberOfLines={1}
                >
                  {perk}
                </Text>
              </View>
            ))}
            {tier.perks.length > 3 && (
              <Text style={styles.perkMore}>+{tier.perks.length - 3} more</Text>
            )}
          </View>
        </View>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.tier.id === nextProps.tier.id &&
      prevProps.isUnlocked === nextProps.isUnlocked &&
      prevProps.currentDownloads === nextProps.currentDownloads
    );
  },
);

// ==========================================
// MAIN COMPONENT
// ==========================================
const PointsScreen = () => {
  const navigation = useNavigation();
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState({
    referralCount: 0,
    referralCode: "",
    canApplyForTdcCard: false,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const shareScale = useRef(new Animated.Value(1)).current;
  const cardPulse = useRef(new Animated.Value(1)).current;
  const isMounted = useRef(true);
  const hasInitialFetch = useRef(false);

  // ==========================================
  // GET DOWNLOAD LINK
  // ==========================================
  const getDownloadLink = useCallback(() => {
    if (Platform.OS === "ios") {
      return `${APP_STORE_URL}?referrer=utm_source%3Dcopy%26utm_medium%3Dreferral%26utm_campaign%3D${userData.referralCode}`;
    } else {
      return `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}&referrer=utm_source%3Dcopy%26utm_medium%3Dreferral%26utm_campaign%3D${userData.referralCode}`;
    }
  }, [userData.referralCode]);

  // ==========================================
  // OPEN STORE
  // ==========================================
  const openStore = useCallback(async () => {
    try {
      if (Platform.OS === "ios") {
        const appStoreUrl = `itms-apps://apps.apple.com/br/app/id${APP_STORE_ID}`;
        const webFallbackUrl = APP_STORE_URL;
        const supported = await Linking.canOpenURL(appStoreUrl);
        if (supported) {
          await Linking.openURL(appStoreUrl);
        } else {
          await Linking.openURL(webFallbackUrl);
        }
      } else {
        const playStoreUrl = `market://details?id=${PLAY_STORE_PACKAGE}`;
        const webFallbackUrl = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
        const supported = await Linking.canOpenURL(playStoreUrl);
        if (supported) {
          await Linking.openURL(playStoreUrl);
        } else {
          await Linking.openURL(webFallbackUrl);
        }
      }
    } catch (error) {
      console.error("Error opening store:", error);
      const webUrl =
        Platform.OS === "ios"
          ? APP_STORE_URL
          : `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
      await Linking.openURL(webUrl);
    }
  }, []);

  // ==========================================
  // FETCH USER DATA
  // ==========================================
  const fetchUserData = useCallback(
    async (forceRefresh = false) => {
      const now = Date.now();

      if (!token) {
        if (isMounted.current) setLoading(false);
        return;
      }

      if (!forceRefresh && MEMORY_CACHE.has(CACHE_KEY)) {
        const cached = MEMORY_CACHE.get(CACHE_KEY);
        if (now - cached.timestamp < CACHE_TTL) {
          if (isMounted.current) {
            setUserData(cached.data);
            setLoading(false);
            InteractionManager.runAfterInteractions(() => animateContent());
          }
          return;
        }
      }

      if (pendingFetchPromise) {
        const result = await pendingFetchPromise;
        if (isMounted.current && result) {
          setUserData(result);
          setLoading(false);
          InteractionManager.runAfterInteractions(() => animateContent());
        }
        return;
      }

      if (!forceRefresh && now - lastFetchTime < FETCH_DEBOUNCE) return;
      lastFetchTime = now;

      pendingFetchPromise = (async () => {
        try {
          const response = await axios.get(
            "https://the-deft-crew-production.up.railway.app/api/auth/profile/me",
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 8000,
            },
          );

          const data = response.data;
          const newUserData = {
            referralCount: data.referralCount || 0,
            referralCode: data.referralCode || "GENERATING...",
            canApplyForTdcCard: data.canApplyForTdcCard || false,
          };

          MEMORY_CACHE.set(CACHE_KEY, {
            data: newUserData,
            timestamp: now,
          });

          pendingFetchPromise = null;
          return newUserData;
        } catch (error) {
          pendingFetchPromise = null;
          const cached = MEMORY_CACHE.get(CACHE_KEY);
          return cached?.data || null;
        }
      })();

      const result = await pendingFetchPromise;

      if (isMounted.current) {
        if (result) {
          setUserData(result);
        } else if (!forceRefresh) {
          const cached = MEMORY_CACHE.get(CACHE_KEY);
          if (cached?.data) setUserData(cached.data);
        }
        setLoading(false);
        InteractionManager.runAfterInteractions(() => animateContent());
      }
    },
    [token],
  );

  // ==========================================
  // ANIMATIONS
  // ==========================================
  const animateContent = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, headerFade]);

  // Card pulse animation when unlocked
  useEffect(() => {
    if (userData.referralCount >= 10 && !loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(cardPulse, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(cardPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [userData.referralCount, loading, cardPulse]);

  // ==========================================
  // INITIAL FETCH
  // ==========================================
  useEffect(() => {
    isMounted.current = true;
    if (token && !hasInitialFetch.current) {
      hasInitialFetch.current = true;
      fetchUserData();
    } else if (!token) {
      setLoading(false);
    }
    return () => {
      isMounted.current = false;
    };
  }, [token, fetchUserData]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData(true).finally(() => {
      if (isMounted.current) setRefreshing(false);
    });
  }, [fetchUserData]);

  const onShare = useCallback(async () => {
    if (userData.referralCode === "GENERATING...") {
      Alert.alert("Wait", "Your unique code is still being generated.");
      return;
    }

    Animated.sequence([
      Animated.timing(shareScale, {
        toValue: 0.95,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shareScale, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      let downloadUrl;
      let storeName;

      if (Platform.OS === "ios") {
        downloadUrl = `${APP_STORE_URL}?referrer=utm_source%3Dshare%26utm_medium%3Dreferral%26utm_campaign%3D${userData.referralCode}`;
        storeName = "App Store";
      } else {
        downloadUrl = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}&referrer=utm_source%3Dshare%26utm_medium%3Dreferral%26utm_campaign%3D${userData.referralCode}`;
        storeName = "Play Store";
      }

      const shareMessage = `Join The Deft Crew \n\nUse my referral code: ${userData.referralCode}\n\nDownload the app from ${storeName}: ${downloadUrl}`;

      await Share.share({
        message: shareMessage,
        title: "Join TDC - Refer & Earn",
      });
    } catch (error) {
      if (error.message !== "User did not share") {
        Alert.alert("Error", error.message);
      }
    }
  }, [userData.referralCode, shareScale]);

  const copyToClipboard = useCallback(async () => {
    const shareLink = getDownloadLink();
    await Clipboard.setStringAsync(shareLink);
    const storeName = Platform.OS === "ios" ? "App Store" : "Play Store";
    Alert.alert(
      "Copied!",
      `${storeName} download link copied to clipboard.\nShare it with your friends!`,
    );
  }, [getDownloadLink]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClaimCard = useCallback(() => {
    Alert.alert(
      "🎉 TDC Privilege Card Unlocked!",
      "Congratulations! You've reached 10 referrals. Your TDC Privilege Card is now active. Show this to partner brands for exclusive discounts!",
    );
  }, []);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================
  const referred = userData.referralCount;
  const shareLink = getDownloadLink();
  const storeName = Platform.OS === "ios" ? "App Store" : "Google Play";
  const storeIcon = Platform.OS === "ios" ? "logo-apple" : "google-play";
  const isCardUnlocked = referred >= 10;

  // ==========================================
  // RENDER
  // ==========================================
  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <GuestGuard
      title="View Your Discounts"
      message="Sign in to see your claimed offers and discounts."
    >
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.headerBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
          <View style={{ width: 38 }} />
        </Animated.View>

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#f9c349"
              colors={["#f9c349"]}
              progressViewOffset={Platform.OS === "android" ? 20 : 0}
            />
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === "android"}
          scrollEventThrottle={16}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Hero Progress Card */}
            <HeroProgressCard
              referred={referred}
              isCardUnlocked={isCardUnlocked}
              cardPulse={cardPulse}
              onClaimCard={handleClaimCard}
            />

            {/* Tier List */}
            <View style={styles.tierSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Achievement Tiers</Text>
                <Text style={styles.sectionSubtitle}>
                  Unlock rewards as you grow your referrals
                </Text>
              </View>

              {TIERS.map((tier, index) => {
                const isUnlocked = referred >= tier.minDownloads;
                const isNext =
                  !isUnlocked &&
                  (index === 0 || referred >= TIERS[index - 1].minDownloads);
                return (
                  <AnimatedTierCard
                    key={tier.id}
                    tier={tier}
                    index={index}
                    currentDownloads={referred}
                    isUnlocked={isUnlocked}
                    isNext={isNext}
                  />
                );
              })}
            </View>

            {/* Download App Link */}
            <View style={styles.linkCard}>
              <Text style={styles.linkLabel}>Download TDC App</Text>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={openStore}
                activeOpacity={0.7}
              >
                <Ionicons name={storeIcon} size={20} color="#f9c349" />
                <Text style={styles.linkText} numberOfLines={1}>
                  Get it on {storeName}
                </Text>
                <View style={styles.copyBtn}>
                  <Ionicons name="open-outline" size={18} color="#f9c349" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Referral Link */}
            <View style={styles.linkCard}>
              <Text style={styles.linkLabel}>Your Referral Link</Text>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={copyToClipboard}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText} numberOfLines={1}>
                  {shareLink}
                </Text>
                <View style={styles.copyBtn}>
                  <Ionicons name="copy-outline" size={18} color="#f9c349" />
                </View>
              </TouchableOpacity>
              <Text style={styles.referralCodeText}>
                Referral Code:{" "}
                <Text style={styles.codeHighlight}>
                  {userData.referralCode}
                </Text>
              </Text>
            </View>

            {/* Share Button */}
            <View style={styles.actionSection}>
              <Animated.View style={{ transform: [{ scale: shareScale }] }}>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={onShare}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#f9c349", "#1a1a1a"]}
                    style={styles.shareGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={20}
                      color="#1a1a1a"
                    />
                    <Text style={styles.shareBtnText}>
                      Share My Referral Link
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Footer Note */}
            <Text style={styles.footerNote}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color="#f9c349"
              />{" "}
              Rewards are performance-based and tied to verified app downloads
              through your unique referral link.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GuestGuard>
  );
};

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fc" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },
  scrollContent: { paddingBottom: 40 },

  // Hero Card
  heroCard: {
    margin: 16,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
  },
  heroGradient: {
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  heroOrb1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(249,195,73,0.05)",
    top: -80,
    right: -60,
  },
  heroOrb2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(249,195,73,0.03)",
    bottom: -40,
    left: -40,
  },
  heroContent: { position: "relative", zIndex: 1 },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroCountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  heroCount: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    marginTop: 2,
  },
  heroCountLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "600",
  },
  heroBadgeActive: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9c349",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
  },
  heroBadgeText: {
    color: "#1a1a1a",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroBadgeLocked: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
  },
  heroBadgeLockedText: {
    color: "#999",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroProgressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  heroProgressRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
  },
  heroRingGradient: {
    width: "50%",
    height: "100%",
    borderTopLeftRadius: 40,
    borderBottomLeftRadius: 40,
  },
  heroProgressInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  heroProgressPercent: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
  },
  heroProgressPercentActive: {
    color: "#f9c349",
  },
  heroProgressText: {
    flex: 1,
  },
  heroProgressTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroProgressSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  heroClaimBtn: {
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  heroClaimGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  heroClaimText: {
    color: "#1a1a1a",
    fontSize: 15,
    fontWeight: "800",
  },

  // Tier Section
  tierSection: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },

  // Tier Card
  tierCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#f0f0f0",
    alignItems: "flex-start",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tierCardUnlocked: {
    borderColor: "#f9c349",
    backgroundColor: "#FFFDF5",
    shadowColor: "#f9c349",
    shadowOpacity: 0.08,
  },
  tierCardNext: {
    borderColor: "#f9c349",
    borderStyle: "dashed",
  },
  tierCardSpecial: {
    borderColor: "#f9c349",
    borderWidth: 3,
    backgroundColor: "#FFFDF5",
    shadowColor: "#f9c349",
    shadowOpacity: 0.12,
  },
  tierShimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "30%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.3)",
    transform: [{ skewX: "-20deg" }],
  },
  tierIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    flexShrink: 0,
  },
  tierIconSpecial: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  tierContent: { flex: 1 },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  tierName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  tierNameActive: {
    color: "#f9c349",
  },
  tierNameSpecial: {
    color: "#f9c349",
    fontSize: 15,
  },
  unlockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9c349",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  unlockedText: {
    color: "#1a1a1a",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  nextBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  nextText: {
    color: "#666",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tierReward: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginTop: 2,
  },
  tierRewardSpecial: {
    color: "#f9c349",
    fontWeight: "700",
  },
  tierProgressContainer: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tierProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  tierProgressBar: {
    height: "100%",
    borderRadius: 2,
  },
  tierProgressText: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    minWidth: 60,
    textAlign: "right",
  },
  perksList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },
  perkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  perkText: {
    fontSize: 10,
    color: "#999",
    fontWeight: "500",
  },
  perkTextActive: {
    color: "#1a1a1a",
  },
  perkMore: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    paddingHorizontal: 4,
  },

  // Link Card
  linkCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  linkLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkText: { flex: 1, fontSize: 13, color: "#f9c349", fontWeight: "600" },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },

  referralCodeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 10,
    textAlign: "center",
    fontWeight: "500",
  },
  codeHighlight: {
    color: "#f9c349",
    fontWeight: "800",
    fontSize: 13,
  },

  // Action
  actionSection: { paddingHorizontal: 16, marginTop: 20 },
  shareBtn: {
    borderRadius: 18,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#f9c349",
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  shareGradient: {
    flexDirection: "row",
    paddingVertical: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  shareBtnText: {
    color: "#1a1a1a",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.5,
  },

  footerNote: {
    textAlign: "center",
    color: "#999",
    fontSize: 11,
    marginTop: 20,
    paddingHorizontal: 20,
    fontWeight: "500",
  },
});

export default PointsScreen;