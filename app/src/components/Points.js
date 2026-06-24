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

const { width } = Dimensions.get("window");

// ==========================================
// ULTRA-FAST CACHE SYSTEM
// ==========================================
const MEMORY_CACHE = new Map();
const CACHE_KEY = "points_data";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
let pendingFetchPromise = null;
const FETCH_DEBOUNCE = 5000; // 5 seconds
let lastFetchTime = 0;

// Image preloading (prevent multiple fetches)
const preloadedImages = new Set();
const preloadImage = (url) => {
  if (!url || preloadedImages.has(url)) return;
  preloadedImages.add(url);
};

// ==========================================
// STORE CONFIGURATION (Cross-Platform)
// ==========================================
const PLAY_STORE_PACKAGE = "com.aqkhan110.tdc";
const APP_STORE_ID = "6765877675";
const APP_STORE_URL = `https://apps.apple.com/br/app/the-deft-crew/id${APP_STORE_ID}`;

// ==========================================
// STATIC SKELETON BLOCK (No animation for speed)
// ==========================================
const SkeletonBlock = memo(({ style }) => (
  <View style={[style, { backgroundColor: "#E8ECF1", borderRadius: 12 }]} />
));

// ==========================================
// SKELETON LOADER (Static - renders instantly)
// ==========================================
const SkeletonLoader = memo(() => (
  <SafeAreaView style={styles.container} edges={["top"]}>
    <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

    {/* Header Skeleton */}
    <View style={styles.header}>
      <SkeletonBlock style={{ width: 38, height: 38, borderRadius: 12 }} />
      <SkeletonBlock style={{ width: 100, height: 20, borderRadius: 6 }} />
      <SkeletonBlock style={{ width: 38, height: 38, borderRadius: 12 }} />
    </View>

    <ScrollView
      contentContainerStyle={styles.scrollContent}
      scrollEnabled={false}
    >
      {/* Progress Card Skeleton */}
      <View
        style={[
          styles.progressCard,
          {
            backgroundColor: "#E8ECF1",
            margin: 16,
            borderRadius: 24,
            padding: 24,
          },
        ]}
      >
        <SkeletonBlock
          style={{
            width: "60%",
            height: 10,
            borderRadius: 4,
            alignSelf: "center",
            marginBottom: 20,
          }}
        />

        <View style={styles.milestoneRow}>
          <View style={styles.milestoneItem}>
            <SkeletonBlock
              style={{ width: 50, height: 50, borderRadius: 14 }}
            />
            <SkeletonBlock
              style={{ width: 30, height: 18, borderRadius: 4, marginTop: 8 }}
            />
            <SkeletonBlock
              style={{ width: 40, height: 10, borderRadius: 4, marginTop: 4 }}
            />
          </View>

          <View style={styles.milestoneArrow}>
            <SkeletonBlock
              style={{ width: 24, height: 24, borderRadius: 12 }}
            />
          </View>

          <View style={styles.milestoneItem}>
            <SkeletonBlock
              style={{ width: 50, height: 50, borderRadius: 14 }}
            />
            <SkeletonBlock
              style={{ width: 50, height: 10, borderRadius: 4, marginTop: 10 }}
            />
          </View>
        </View>

        <SkeletonBlock
          style={{ width: "100%", height: 8, borderRadius: 4, marginBottom: 8 }}
        />
        <SkeletonBlock
          style={{
            width: "40%",
            height: 12,
            borderRadius: 4,
            alignSelf: "center",
            marginBottom: 6,
          }}
        />
        <SkeletonBlock
          style={{
            width: "70%",
            height: 10,
            borderRadius: 4,
            alignSelf: "center",
          }}
        />
      </View>

      {/* Info Cards Skeleton */}
      <View style={styles.infoSection}>
        <SkeletonBlock
          style={{ width: 120, height: 14, borderRadius: 4, marginBottom: 14 }}
        />

        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.infoCard, { backgroundColor: "#F5F5F5" }]}
          >
            <SkeletonBlock
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                marginRight: 12,
              }}
            />
            <View style={{ flex: 1 }}>
              <SkeletonBlock
                style={{
                  width: "70%",
                  height: 14,
                  borderRadius: 4,
                  marginBottom: 6,
                }}
              />
              <SkeletonBlock
                style={{ width: "90%", height: 10, borderRadius: 4 }}
              />
              <SkeletonBlock
                style={{
                  width: "60%",
                  height: 10,
                  borderRadius: 4,
                  marginTop: 4,
                }}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Link Card Skeleton */}
      <View style={[styles.linkCard, { backgroundColor: "#F5F5F5" }]}>
        <SkeletonBlock
          style={{ width: 120, height: 10, borderRadius: 4, marginBottom: 8 }}
        />
        <SkeletonBlock
          style={{ width: "100%", height: 36, borderRadius: 10 }}
        />
      </View>

      {/* Button Skeleton */}
      <View style={styles.actionSection}>
        <SkeletonBlock
          style={{ width: "100%", height: 55, borderRadius: 16 }}
        />
      </View>

      {/* Footer Skeleton */}
      <SkeletonBlock
        style={{
          width: "80%",
          height: 10,
          borderRadius: 4,
          alignSelf: "center",
          marginTop: 20,
        }}
      />
    </ScrollView>
  </SafeAreaView>
));

// ==========================================
// OPTIMIZED INFO CARD (Memoized - No re-render)
// ==========================================
const InfoCard = memo(
  ({ icon, title, content, color, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const hasAnimated = useRef(false);

    useEffect(() => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;

      const delay = Math.min(index * 50, 150);
      const animation = InteractionManager.runAfterInteractions(() => {
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 200,
          delay,
          useNativeDriver: true,
        }).start();
      });

      return () => animation?.cancel();
    }, []);

    return (
      <Animated.View
        style={[
          styles.infoCard,
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View
          style={[styles.infoIconCircle, { backgroundColor: color + "15" }]}
        >
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoText}>{content}</Text>
        </View>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.index === nextProps.index && prevProps.title === nextProps.title
    );
  },
);

// ==========================================
// MAIN COMPONENT - ULTRA OPTIMIZED (Cross-Platform)
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

  // Optimized animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.98)).current;
  const shareScale = useRef(new Animated.Value(1)).current;
  const isMounted = useRef(true);
  const hasInitialFetch = useRef(false);

  // ==========================================
  // GET DOWNLOAD LINK BASED ON PLATFORM
  // ==========================================
  const getDownloadLink = useCallback(() => {
    if (Platform.OS === "ios") {
      return `${APP_STORE_URL}?referrer=utm_source%3Dcopy%26utm_medium%3Dreferral%26utm_campaign%3D${userData.referralCode}`;
    } else {
      return `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}&referrer=utm_source%3Dcopy%26utm_medium%3Dreferral%26utm_campaign%3D${userData.referralCode}`;
    }
  }, [userData.referralCode]);

  // ==========================================
  // OPEN STORE FUNCTION (Cross-Platform)
  // ==========================================
  const openStore = useCallback(async () => {
    try {
      if (Platform.OS === "ios") {
        // iOS - Open App Store
        const appStoreUrl = `itms-apps://apps.apple.com/br/app/id${APP_STORE_ID}`;
        const webFallbackUrl = APP_STORE_URL;
        
        const supported = await Linking.canOpenURL(appStoreUrl);
        
        if (supported) {
          await Linking.openURL(appStoreUrl);
        } else {
          await Linking.openURL(webFallbackUrl);
        }
      } else {
        // Android - Open Play Store
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
      const webUrl = Platform.OS === "ios" 
        ? APP_STORE_URL 
        : `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
      await Linking.openURL(webUrl);
    }
  }, []);

  // ==========================================
  // ULTRA-FAST FETCH WITH DEDUPLICATION
  // ==========================================
  const fetchUserData = useCallback(
    async (forceRefresh = false) => {
      const now = Date.now();

      if (!token) {
        if (isMounted.current) setLoading(false);
        return;
      }

      // ✅ Check memory cache first (fastest)
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

      // ✅ Deduplicate in-flight requests
      if (pendingFetchPromise) {
        const result = await pendingFetchPromise;
        if (isMounted.current && result) {
          setUserData(result);
          setLoading(false);
          InteractionManager.runAfterInteractions(() => animateContent());
        }
        return;
      }

      // ✅ Debounce
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

          // ✅ Cache data
          MEMORY_CACHE.set(CACHE_KEY, {
            data: newUserData,
            timestamp: now,
          });

          pendingFetchPromise = null;
          return newUserData;
        } catch (error) {
          pendingFetchPromise = null;
          // ✅ Return cached data on error
          const cached = MEMORY_CACHE.get(CACHE_KEY);
          return cached?.data || null;
        }
      })();

      const result = await pendingFetchPromise;

      if (isMounted.current) {
        if (result) {
          setUserData(result);
        } else if (!forceRefresh) {
          // Try cache fallback
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
  // OPTIMIZED ANIMATIONS (Run after interactions)
  // ==========================================
  const animateContent = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, headerFade, cardScale]);

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
  // PROGRESS ANIMATION
  // ==========================================
  useEffect(() => {
    if (userData.referralCount > 0 && !loading) {
      InteractionManager.runAfterInteractions(() => {
        Animated.timing(progressWidth, {
          toValue: Math.min(userData.referralCount / 10, 1),
          duration: 500,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [userData.referralCount, loading, progressWidth]);

  // ==========================================
  // HANDLERS (Memoized)
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

    // Quick haptic-like scale animation
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
      // Create platform-specific share message
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
      // User cancelled share - no need to show error
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
    Alert.alert("Application Sent", "We are reviewing your referrals!");
  }, []);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================
  const referred = userData.referralCount;
  const target = 10;
  const shareLink = getDownloadLink();
  const isMilestoneAchieved = referred >= target;
  const remainingReferrals = target - referred;
  const storeName = Platform.OS === "ios" ? "App Store" : "Google Play";
  const storeIcon = Platform.OS === "ios" ? "logo-apple" : "google-play";

  const progressWidthInterpolated = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  // ==========================================
  // SHOW SKELETON WHILE LOADING
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

        {/* Header */}
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
            {/* Progress Card */}
            <Animated.View
              style={[
                styles.progressCard,
                { transform: [{ scale: cardScale }] },
              ]}
            >
              <LinearGradient
                colors={["#f9c349", "#1a1a1a"]}
                style={styles.progressGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.progressLabel}>
                  tdc PRIVILEGE MILESTONE
                </Text>

                <View style={styles.milestoneRow}>
                  <View style={styles.milestoneItem}>
                    <MaterialCommunityIcons
                      name="account-multiple-plus"
                      size={28}
                      color="#fff"
                    />
                    <Text style={styles.milestoneNum}>{referred}</Text>
                    <Text style={styles.milestoneLabel}>Joins</Text>
                  </View>

                  <View style={styles.milestoneArrow}>
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="rgba(255,255,255,0.5)"
                    />
                  </View>

                  <View style={styles.milestoneItem}>
                    <View
                      style={[
                        styles.tdcCardIcon,
                        isMilestoneAchieved && styles.tdcCardActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="card-account-details-star"
                        size={28}
                        color={isMilestoneAchieved ? "#1a1a1a" : "#666"}
                      />
                    </View>
                    <Text
                      style={[
                        styles.milestoneLabel,
                        isMilestoneAchieved && styles.goldText,
                      ]}
                    >
                      tdc CARD
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressBar,
                      { width: progressWidthInterpolated },
                    ]}
                  />
                </View>

                <Text style={styles.progressCount}>
                  {referred}/{target} Referrals
                </Text>
                <Text style={styles.progressNote}>
                  {isMilestoneAchieved
                    ? "🎉 Milestone Achieved! Claim your card below."
                    : `${remainingReferrals} more referral${remainingReferrals > 1 ? "s" : ""} needed for the Privilege Card.`}
                </Text>
              </LinearGradient>
            </Animated.View>

            {/* Info Cards */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>
                <View style={styles.sectionDot} />
                How It Works
              </Text>
              <InfoCard
                icon="account-plus-outline"
                color="#f9c349"
                title="Invite Friends"
                content="Share your unique referral link with verified students to earn referral points."
                index={0}
              />
              <InfoCard
                icon="crown-outline"
                color="#f9c349"
                title="Unlock Privilege Card"
                content="Reach 10 successful referrals to activate your official tdc Privilege Card."
                index={1}
              />
              <InfoCard
                icon="pricetags-outline"
                color="#f9c349"
                title="Enjoy Exclusive Discounts"
                content="Use your tdc Privilege Card for special deals at partner brands across Pakistan."
                index={2}
              />
            </View>

            {/* Download App Link - Platform Specific */}
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

            {/* Action Button */}
            <View style={styles.actionSection}>
              {isMilestoneAchieved ? (
                <Animated.View style={{ transform: [{ scale: shareScale }] }}>
                  <TouchableOpacity
                    style={styles.claimBtn}
                    onPress={handleClaimCard}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#f9c349", "#1a1a1a"]}
                      style={styles.claimGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <MaterialCommunityIcons
                        name="card-account-details-star"
                        size={20}
                        color="#1a1a1a"
                      />
                      <Text style={styles.claimBtnText}>Claim My tdc Card</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
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
              )}
            </View>

            {/* Footer Note */}
            <Text style={styles.footerNote}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color="#f9c349"
              />{" "}
              Referrals are verified when students complete their registration
              through your link.
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
  container: { flex: 1, backgroundColor: "#ffffff" },

  // Header
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

  // Progress Card
  progressCard: {
    margin: 16,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  progressGradient: { padding: 24, alignItems: "center" },
  progressLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 20,
  },

  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 24,
  },
  milestoneItem: { alignItems: "center" },
  milestoneNum: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6,
  },
  milestoneLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  milestoneArrow: { paddingHorizontal: 10 },
  tdcCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  tdcCardActive: { backgroundColor: "#fff" },
  goldText: { color: "#f9c349", fontWeight: "700" },

  // Progress Bar
  progressTrack: {
    height: 8,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: "#fff", borderRadius: 4 },
  progressCount: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  progressNote: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },

  // Info Section
  infoSection: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f9c349",
    marginRight: 10,
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#f0f0f0",
    alignItems: "flex-start",
  },
  infoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 3,
  },
  infoText: { fontSize: 12, color: "#666", lineHeight: 18, fontWeight: "500" },

  // Link Card
  linkCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#f0f0f0",
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
    backgroundColor: "#fff",
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
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#f9c349",
    shadowOpacity: 0.3,
    shadowRadius: 15,
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
  claimBtn: { borderRadius: 16, overflow: "hidden", elevation: 8 },
  claimGradient: {
    flexDirection: "row",
    paddingVertical: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  claimBtnText: { color: "#1a1a1a", fontWeight: "800", fontSize: 15 },

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