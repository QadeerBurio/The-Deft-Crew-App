// app/src/screens/ProfileDetailsScreen.js
// CINEMATIC TDC · GOLD #f9c349 · BLACK #0f0f0f · WHITE
// Mesh hero · orbiting particles · holo badge card · progress ring · cascade skeleton

import React, {
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import Dot from "../engagement/components/Dot";
import BadgeShelf from "../engagement/components/BadgeShelf";
import StreakChip from "../engagement/components/StreakChip";
import StreakSheet from "../engagement/components/StreakSheet";
import { useEngagement } from "../engagement/hooks/useEngagement";
import { colors as tdcColors } from "../theme";

const { width } = Dimensions.get("window");

// ─── Theme ───
const GOLD = tdcColors.yellow;
const GOLD_DARK = "#e0a82e";
const GOLD_DEEP = "#b8860b";
const GOLD_LIGHT = "#fffbee";
const BLACK = "#0f0f0f";
const WHITE = "#ffffff";
const LIGHT = "#fafafa";
const BORDER = "#ececec";
const MUTED = "#888";
const DANGER = "#ef4444";
const SUCCESS = "#10b981";
const WARNING = "#f59e0b";

// ==========================================
// CASCADE SKELETON
// ==========================================
const ProfileSkeleton = () => {
  const sweep = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const cascade = useRef(
    [0, 1, 2, 3, 4, 5].map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Sweep shimmer
    Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    ).start();

    // Wave opacity for gold layer
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wave, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Cascade entrance
    Animated.stagger(
      80,
      cascade.map((v) =>
        Animated.spring(v, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const sweepX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width * 1.4],
  });
  const waveOpacity = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.55],
  });

  const Sk = ({ style, index = 0 }) => {
    const c = cascade[Math.min(index, cascade.length - 1)];
    const op = c.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const sl = c.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
    return (
      <Animated.View
        style={[
          style,
          {
            backgroundColor: "#f0f0f0",
            overflow: "hidden",
            opacity: op,
            transform: [{ translateY: sl }],
          },
        ]}
      >
        {/* Base sweep */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: width * 0.7,
            transform: [{ translateX: sweepX }],
          }}
        >
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.95)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
        {/* Gold wave overlay */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            opacity: waveOpacity,
          }}
        >
          <LinearGradient
            colors={[GOLD + "00", GOLD + "80", GOLD + "00"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonTopBar}>
          <Sk style={styles.skeletonIcon} index={0} />
          <Sk style={{ width: 70, height: 16, borderRadius: 6 }} index={0} />
          <Sk style={styles.skeletonIcon} index={0} />
        </View>

        <View style={styles.skeletonProfileRow}>
          <Sk style={styles.skeletonAvatar} index={1} />
          <View style={{ flex: 1, marginLeft: 20, gap: 10 }}>
            <Sk style={{ width: 150, height: 18, borderRadius: 6 }} index={1} />
            <Sk style={{ width: 100, height: 12, borderRadius: 4 }} index={1} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <Sk style={{ width: 70, height: 22, borderRadius: 11 }} index={2} />
              <Sk style={{ width: 80, height: 22, borderRadius: 11 }} index={2} />
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Sk style={{ width: 90, height: 32, borderRadius: 16 }} index={2} />
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: WHITE,
            borderRadius: 22,
            padding: 20,
            borderWidth: 1,
            borderColor: BORDER,
            gap: 12,
          }}
        >
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 10 }}>
              <Sk style={{ width: 40, height: 40, borderRadius: 14 }} index={3} />
              <Sk style={{ width: 42, height: 8, borderRadius: 4 }} index={3} />
              <Sk style={{ width: 52, height: 14, borderRadius: 4 }} index={3} />
            </View>
          ))}
        </View>

        <View style={{ marginTop: 16 }}>
          <Sk style={{ width: "100%", height: 160, borderRadius: 24 }} index={4} />
        </View>

        <View style={{ marginTop: 16 }}>
          <Sk style={{ width: "100%", height: 380, borderRadius: 24 }} index={5} />
        </View>
      </View>
    </SafeAreaView>
  );
};

// ==========================================
// INFO ROW
// ==========================================
const InfoRow = ({ icon, label, value, valueColor, isLast, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
    ]).start();

    // Shine sweep across row periodically
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2000 + delay),
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shineLoop.start();
    return () => shineLoop.stop();
  }, []);

  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.infoRow,
        !isLast && styles.infoRowBorder,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          overflow: "hidden",
        },
      ]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      {/* Subtle shine overlay */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 60,
          transform: [{ translateX: shineTranslate }],
        }}
      >
        <LinearGradient
          colors={["transparent", GOLD + "25", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <LinearGradient
        colors={[LIGHT, WHITE]}
        style={styles.infoIconBox}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={15} color={BLACK} />
      </LinearGradient>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[styles.infoValue, valueColor && { color: valueColor }]}
          numberOfLines={1}
        >
          {value || "not provided"}
        </Text>
      </View>

      <LinearGradient
        colors={[LIGHT, WHITE]}
        style={styles.infoChevron}
      >
        <Ionicons name="chevron-forward" size={13} color={BLACK} />
      </LinearGradient>
    </Animated.View>
  );
};

// ==========================================
// STAT CARD — ticker style
// ==========================================
const StatCard = ({ icon, label, value, color = BLACK, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        delay,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay + 200),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Icon rotate drift
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.4],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.2],
  });
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-6deg", "6deg"],
  });

  return (
    <Animated.View
      style={[
        styles.statCard,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Pulsing radial glow */}
      <Animated.View
        style={[
          styles.statGlow,
          {
            backgroundColor: color,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View style={{ transform: [{ rotate }] }}>
        <LinearGradient
          colors={[color + "25", color + "08"]}
          style={styles.statIconBox}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon} size={18} color={color} />
        </LinearGradient>
      </Animated.View>

      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </Animated.View>
  );
};

// ==========================================
// ORBITING PARTICLES (decoration)
// ==========================================
const OrbitingParticles = ({ spinValue }) => {
  const p1X = spinValue.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 40, 0, -40, 0],
  });
  const p1Y = spinValue.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-40, 0, 40, 0, -40],
  });
  const p2X = spinValue.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -30, 0, 30, 0],
  });
  const p2Y = spinValue.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [30, 0, -30, 0, 30],
  });

  return (
    <>
      <Animated.View
        style={[
          styles.particle,
          {
            transform: [{ translateX: p1X }, { translateY: p1Y }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particleSmall,
          {
            transform: [{ translateX: p2X }, { translateY: p2Y }],
          },
        ]}
      />
    </>
  );
};

// ==========================================
// MAIN
// ==========================================
export default function ProfileDetailsScreen({ navigation }) {
  const { user, token, setUser } = useContext(AuthContext);
  const { me } = useEngagement();
  const [loading, setLoading] = useState(true);
  const [streakSheetVisible, setStreakSheetVisible] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-24)).current;
  const avatarScale = useRef(new Animated.Value(0.5)).current;
  const avatarGlow = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(24)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const orbFloat = useRef(new Animated.Value(0)).current;
  const holoShine = useRef(new Animated.Value(0)).current;

  const [profile, setProfile] = useState({
    name: user?.name || "",
    rollNo: user?.rollNo || "",
    phone: user?.phone || "",
    email: user?.email || "",
    university: user?.university?.name || "not assigned",
    profileImage: user?.profileImage || null,
    isAlumni: user?.isAlumni || false,
    isVip: user?.isVip || false,
    vipExpiry: user?.vipExpiry || null,
    status: user?.status || "not verified",
    address: user?.address || "not provided",
    instagram: user?.instagram || "not provided",
    referralCode: user?.referralCode || null,
    referralCount: user?.referralCount || 0,
    referredBy: user?.referredBy || null,
    role: user?.role || "student",
    bio: user?.bio || "",
    headline: user?.headline || "",
    location: user?.location || "not provided",
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
        university: d.university?.name || "not assigned",
        profileImage: d.profileImage || null,
        isAlumni: d.isAlumni || false,
        isVip: d.isVip || false,
        vipExpiry: d.vipExpiry || null,
        status: d.status || "not verified",
        address: d.address || "not provided",
        instagram: d.instagram || "not provided",
        referralCode: d.referralCode || null,
        referralCount: d.referralCount || 0,
        referredBy: d.referredBy || null,
        role: d.role || "student",
        bio: d.bio || "",
        headline: d.headline || "",
        location: d.location || "not provided",
      });
      setUser(d);
    } catch (e) {
      Alert.alert("error", "failed to load profile data");
    } finally {
      setLoading(false);
      startEntranceAnimations();
    }
  };

  const startEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(headerFade, {
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
        friction: 4,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // Avatar glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(avatarGlow, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(avatarGlow, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Orbit spin
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Orb float
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloat, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(orbFloat, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Holo shine
    Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(holoShine, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(holoShine, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
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
    }, 250);
  };

  const getProfileImageSource = () => {
    if (profile.profileImage) return { uri: profile.profileImage };
    return null;
  };

  const handleShareReferral = async () => {
    if (!profile.referralCode) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `join the deft crew using my referral code: ${profile.referralCode}\n\ndownload tdc and start saving on student discounts.`,
        title: "share referral code",
      });
    } catch (error) {
      console.log("share error:", error);
    }
  };

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "verified") return SUCCESS;
    if (s === "pending") return WARNING;
    return DANGER;
  };

  const getStatusIcon = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "verified") return "checkmark-circle";
    if (s === "pending") return "time-outline";
    return "close-circle";
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) return <ProfileSkeleton />;

  const earnedBadges = me?.badges?.earned || 0;
  const totalBadges = me?.badges?.total || 17;
  const badgePercent = Math.round((earnedBadges / totalBadges) * 100);

  // Interpolations
  const orb1Y = orbFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -22],
  });
  const orb1X = orbFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 16],
  });
  const orb2Y = orbFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 16],
  });
  const orb2X = orbFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });
  const glowOpacity = avatarGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });
  const glowScale = avatarGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const holoTranslate = holoShine.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, width],
  });

  const progressRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        {/* ══════════════ HERO ══════════════ */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          {/* Mesh gradient base */}
          <LinearGradient
            colors={[GOLD_LIGHT, WHITE, WHITE]}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Floating gold orbs */}
          <Animated.View
            style={[
              styles.orb,
              styles.orb1,
              { transform: [{ translateX: orb1X }, { translateY: orb1Y }] },
            ]}
          >
            <LinearGradient
              colors={[GOLD + "70", GOLD + "00"]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.orb,
              styles.orb2,
              { transform: [{ translateX: orb2X }, { translateY: orb2Y }] },
            ]}
          >
            <LinearGradient
              colors={[GOLD_DARK + "55", GOLD_DARK + "00"]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.orb,
              styles.orb3,
              { transform: [{ translateX: orb2Y }, { translateY: orb1X }] },
            ]}
          >
            <LinearGradient
              colors={[GOLD + "30", GOLD + "00"]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color={BLACK} />
            </TouchableOpacity>

            <View style={styles.titlePill}>
              <View style={styles.titleDot} />
              <Text style={styles.headerTitle}>profile</Text>
            </View>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleShareReferral}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={18} color={BLACK} />
            </TouchableOpacity>
          </View>

          {/* Profile block */}
          <View style={styles.profileHeader}>
            <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
              <View style={styles.avatarWrap}>
                {/* Orbiting particles */}
                <OrbitingParticles spinValue={spin} />

                {/* Pulsing glow */}
                <Animated.View
                  style={[
                    styles.avatarGlow,
                    profile.isVip && { backgroundColor: GOLD },
                    {
                      opacity: glowOpacity,
                      transform: [{ scale: glowScale }],
                    },
                  ]}
                />

                {/* Rotating gradient ring */}
                <Animated.View
                  style={[
                    styles.avatarRingSpin,
                    { transform: [{ rotate: progressRotate }] },
                  ]}
                >
                  <LinearGradient
                    colors={
                      profile.isVip
                        ? [GOLD, "transparent", GOLD, GOLD_DARK, GOLD]
                        : [BORDER, "transparent", GOLD + "55", "transparent", BORDER]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>

                {/* Static gold ring */}
                <LinearGradient
                  colors={
                    profile.isVip
                      ? [GOLD, GOLD_DARK, GOLD]
                      : [BORDER, "#f5f5f5", BORDER]
                  }
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
                        {profile.name?.charAt(0)?.toUpperCase() || "?"}
                      </Text>
                    )}
                  </View>
                </LinearGradient>

                {/* VIP crown */}
                {profile.isVip && (
                  <LinearGradient
                    colors={[GOLD, GOLD_DARK]}
                    style={styles.vipCrown}
                  >
                    <MaterialCommunityIcons
                      name="crown"
                      size={12}
                      color={BLACK}
                    />
                  </LinearGradient>
                )}

                {/* Online dot */}
                <View style={styles.onlineDot} />
              </View>
            </Animated.View>

            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {profile.name}
                </Text>
                <Dot mood="sorted" size={14} animated={false} />
              </View>

              {!!profile.headline && (
                <Text style={styles.headlineText} numberOfLines={1}>
                  {profile.headline}
                </Text>
              )}

              <View style={styles.universityRow}>
                <MaterialCommunityIcons
                  name="school-outline"
                  size={12}
                  color={MUTED}
                />
                <Text style={styles.universityText} numberOfLines={1}>
                  {profile.university}
                </Text>
              </View>

              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getStatusColor(profile.status) + "15",
                    },
                  ]}
                >
                  <Ionicons
                    name={getStatusIcon(profile.status)}
                    size={10}
                    color={getStatusColor(profile.status)}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getStatusColor(profile.status) },
                    ]}
                  >
                    {profile.status}
                  </Text>
                </View>

                {profile.isVip && (
                  <View style={[styles.statusBadge, styles.vipBadge]}>
                    <MaterialCommunityIcons
                      name="crown"
                      size={10}
                      color={GOLD_DARK}
                    />
                    <Text
                      style={[styles.statusBadgeText, { color: GOLD_DARK }]}
                    >
                      vip
                    </Text>
                  </View>
                )}

                {profile.referralCode && (
                  <TouchableOpacity
                    style={styles.referralBadge}
                    onPress={handleShareReferral}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="share-outline"
                      size={10}
                      color={GOLD_DARK}
                    />
                    <Text style={styles.referralBadgeText}>refer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Streak chip */}
          <View style={{ marginTop: 18, alignItems: "flex-start" }}>
            <StreakChip onPress={() => setStreakSheetVisible(true)} />
          </View>
        </Animated.View>

        {/* ══════════════ CONTENT ══════════════ */}
        <View style={styles.content}>
          {/* Stats row */}
          <Animated.View
            style={[
              styles.statsRow,
              {
                opacity: contentFade,
                transform: [{ translateY: contentSlide }],
              },
            ]}
          >
            <StatCard
              icon="card-outline"
              label="roll no."
              value={profile.rollNo || "—"}
              color={BLACK}
              delay={50}
            />
            <StatCard
              icon={profile.isAlumni ? "school" : "school-outline"}
              label="status"
              value={profile.isAlumni ? "alumni" : "student"}
              color={profile.isAlumni ? GOLD_DARK : BLACK}
              delay={120}
            />
            <StatCard
              icon="people-outline"
              label="referrals"
              value={profile.referralCount || 0}
              color={GOLD_DARK}
              delay={190}
            />
          </Animated.View>

          {/* ── Holographic Badge Card ── */}
          <Animated.View
            style={[
              styles.heroCard,
              {
                opacity: contentFade,
                transform: [{ translateY: contentSlide }],
              },
            ]}
          >
            <LinearGradient
              colors={[WHITE, GOLD_LIGHT, WHITE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Holo shine sweep */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: 80,
                transform: [{ translateX: holoTranslate }],
              }}
            >
              <LinearGradient
                colors={["transparent", "rgba(255,255,255,0.9)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>

            {/* Corner decorations */}
            <View style={styles.heroCornerDotTL} />
            <View style={styles.heroCornerDotBR} />

            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={[GOLD, GOLD_DARK]}
                style={styles.sectionIconBox}
              >
                <Ionicons name="ribbon-outline" size={14} color={BLACK} />
              </LinearGradient>
              <Text style={styles.sectionTitle}>badges</Text>
              <View style={styles.sectionCountPill}>
                <Text style={styles.sectionCountText}>
                  {earnedBadges}/{totalBadges}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <BadgeShelf
                max={7}
                onSeeAll={() => navigation.navigate("Badges")}
              />
            </View>

            {/* Progress bar with glow */}
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(badgePercent, 100)}%` },
                  ]}
                >
                  <LinearGradient
                    colors={[GOLD, GOLD_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Shine at the tip */}
                  <View style={styles.progressGlowTip} />
                </Animated.View>
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressLabel}>
                  {badgePercent}% collected
                </Text>
                <Text style={styles.progressHint}>
                  {totalBadges - earnedBadges} to go
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Personal Information ── */}
          <Animated.View
            style={[
              styles.sectionCard,
              {
                opacity: contentFade,
                transform: [{ translateY: cardSlide }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={[GOLD, GOLD_DARK]}
                style={styles.sectionIconBox}
              >
                <Ionicons name="person-outline" size={14} color={BLACK} />
              </LinearGradient>
              <Text style={styles.sectionTitle}>personal information</Text>
            </View>

            <View style={styles.infoList}>
              <InfoRow icon="mail-outline" label="email" value={profile.email} delay={60} />
              <InfoRow
                icon="call-outline"
                label="phone"
                value={profile.phone || "not provided"}
                delay={120}
              />
              <InfoRow
                icon="location-outline"
                label="location"
                value={profile.location || "not provided"}
                delay={180}
              />
              <InfoRow
                icon="home-outline"
                label="address"
                value={profile.address || "not provided"}
                delay={240}
              />
              <InfoRow
                icon="ribbon-outline"
                label="role"
                value={
                  profile.role
                    ? profile.role.charAt(0).toUpperCase() +
                      profile.role.slice(1)
                    : "—"
                }
                delay={300}
              />
              <InfoRow
                icon="calendar-outline"
                label="member since"
                value={formatDate(user?.createdAt) || "—"}
                isLast={!profile.isVip || !profile.vipExpiry}
                delay={360}
              />
              {profile.isVip && profile.vipExpiry && (
                <InfoRow
                  icon="crown-outline"
                  label="vip membership"
                  value={`expires ${formatDate(profile.vipExpiry)}`}
                  valueColor={GOLD_DARK}
                  isLast
                  delay={420}
                />
              )}
            </View>
          </Animated.View>

          {/* ── Bio ── */}
          {!!profile.bio && (
            <Animated.View
              style={[
                styles.sectionCard,
                {
                  opacity: contentFade,
                  transform: [{ translateY: cardSlide }],
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={[GOLD, GOLD_DARK]}
                  style={styles.sectionIconBox}
                >
                  <Ionicons
                    name="chatbox-ellipses-outline"
                    size={14}
                    color={BLACK}
                  />
                </LinearGradient>
                <Text style={styles.sectionTitle}>about</Text>
              </View>
              <LinearGradient
                colors={[LIGHT, WHITE]}
                style={styles.bioBox}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.bioText}>{profile.bio}</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* ── Edit Profile ── */}
          <Animated.View
            style={{
              opacity: contentFade,
              transform: [{ translateY: cardSlide }],
            }}
          >
            <TouchableOpacity
              style={styles.editBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate("EditProfileScreen", { profile });
              }}
            >
              <LinearGradient
                colors={[GOLD, GOLD_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="create-outline" size={16} color={BLACK} />
              <Text style={styles.editBtnText}>edit profile</Text>
              <View style={styles.editArrow}>
                <Ionicons name="arrow-forward" size={13} color={GOLD} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      <StreakSheet
        visible={streakSheetVisible}
        onClose={() => setStreakSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  scrollContent: { paddingBottom: Platform.OS === "ios" ? 40 : 30 },

  // ─── Skeleton ───
  skeletonHeader: {
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  skeletonTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  skeletonIcon: { width: 36, height: 36, borderRadius: 12 },
  skeletonProfileRow: { flexDirection: "row", alignItems: "center" },
  skeletonAvatar: { width: 80, height: 80, borderRadius: 40 },

  // ─── Header ───
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },

  // Orbs
  orb: {
    position: "absolute",
    borderRadius: 200,
    overflow: "hidden",
  },
  orb1: { width: 180, height: 180, top: -60, right: -40 },
  orb2: { width: 120, height: 120, bottom: -40, left: -30 },
  orb3: { width: 80, height: 80, top: 80, left: -20 },

  // Particle (orbit)
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
    opacity: 0.8,
  },
  particleSmall: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD_DARK,
    opacity: 0.6,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  titlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  titleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: BLACK,
    letterSpacing: -0.2,
  },

  profileHeader: { flexDirection: "row", alignItems: "center" },
  avatarWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: GOLD + "40",
  },
  avatarRingSpin: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  avatarBorder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 39,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: WHITE,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: {
    fontSize: 30,
    fontWeight: "900",
    color: BLACK,
  },
  vipCrown: {
    position: "absolute",
    bottom: -2,
    right: -2,
    borderRadius: 14,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: WHITE,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  onlineDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: SUCCESS,
    borderWidth: 2.5,
    borderColor: WHITE,
  },

  headerInfo: { flex: 1, marginLeft: 22 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: {
    fontSize: 19,
    fontWeight: "900",
    color: BLACK,
    letterSpacing: -0.5,
    maxWidth: "85%",
  },
  headlineText: {
    fontSize: 12,
    color: MUTED,
    fontWeight: "600",
    marginTop: 4,
  },
  universityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  universityText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
    flex: 1,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 11,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "lowercase",
    letterSpacing: 0.2,
  },
  vipBadge: { backgroundColor: GOLD_LIGHT },
  referralBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 11,
    backgroundColor: GOLD_LIGHT,
    borderWidth: 1,
    borderColor: GOLD + "60",
  },
  referralBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: GOLD_DARK,
    textTransform: "lowercase",
  },

  // ─── Content ───
  content: { paddingHorizontal: 16, paddingTop: 16 },

  // ─── Stats ───
  statsRow: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  statGlow: {
    position: "absolute",
    top: -4,
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 9,
    color: MUTED,
    fontWeight: "700",
    textTransform: "lowercase",
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "900",
    color: BLACK,
    marginTop: 3,
  },

  // ─── Hero card (holographic) ───
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: GOLD + "50",
    overflow: "hidden",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 4,
  },
  heroCornerDotTL: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
    opacity: 0.6,
  },
  heroCornerDotBR: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
    opacity: 0.6,
  },

  // ─── Section card ───
  sectionCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: BLACK,
    textTransform: "lowercase",
    letterSpacing: -0.2,
    flex: 1,
  },
  sectionCountPill: {
    backgroundColor: BLACK,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sectionCountText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "900",
  },

  // ─── Progress ───
  progressWrap: { marginTop: 18 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BORDER,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  progressGlowTip: {
    position: "absolute",
    right: 0,
    top: -2,
    bottom: -2,
    width: 14,
    borderRadius: 7,
    backgroundColor: WHITE,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 10,
    color: BLACK,
    fontWeight: "800",
    textTransform: "lowercase",
    letterSpacing: 0.3,
  },
  progressHint: {
    fontSize: 10,
    color: MUTED,
    fontWeight: "600",
    textTransform: "lowercase",
  },

  // ─── Info rows ───
  infoList: { marginTop: 6 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 10,
    color: MUTED,
    fontWeight: "700",
    textTransform: "lowercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: BLACK,
    fontWeight: "800",
  },
  infoChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  // ─── Bio ───
  bioBox: {
    padding: 14,
    borderRadius: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bioText: {
    fontSize: 13,
    color: BLACK,
    lineHeight: 21,
    fontWeight: "500",
  },

  // ─── Edit button ───
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 17,
    borderWidth: 1.5,
    borderColor: BLACK,
    marginTop: 4,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  editBtnText: {
    color: BLACK,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  editArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BLACK,
    alignItems: "center",
    justifyContent: "center",
  },
});