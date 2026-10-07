// app/src/screens/Home.js
import React, {
  useState, useCallback, useRef, useEffect, useContext, useMemo,
} from "react";
import {
  ScrollView, StyleSheet, View, TouchableOpacity, Modal, Text,
  RefreshControl, Animated, StatusBar, Dimensions, Easing, Alert, AppState,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import ChatBotInterface from "./ChatBotInterface";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api from "../api/api";
import Slider from "../screens/Slider";

// 🆕 engagement
import MissionStack from "../engagement/components/MissionStack";
import DailyDropCard from "../engagement/components/DailyDropCard";
import StreakSheet from "../engagement/components/StreakSheet";
import FeatureDot from "../engagement/components/FeatureDot";
import { useEngagement } from "../engagement/hooks/useEngagement";
import { useMissions } from "../engagement/hooks/useMissions";
import { FEATURE_ID_TO_MISSION } from "../engagement/utils/mood";

const { width } = Dimensions.get("window");

const GOLD = "#f9c349";
const GOLD_DARK = "#e0a82e";
const DARK = "#1a1a1a";
const WHITE = "#ffffff";
const MUTED = "#888888";
const LIGHT = "#fafafa";
const BORDER = "#f0f0f0";

const FEATURES = [
  { id: "discount",  title: "Discounts",       icon: "pricetag-outline",      desc: "Save at top brands",  screen: "Brands",     gradient: ["#FF6B6B", "#FF8E53"] },
  { id: "traveling", title: "Travelling",      icon: "airplane",              desc: "Plan trips with AI",    screen: "Travelling", gradient: ["#4FC3F7", "#29B6F6"] },
  { id: "dashboard", title: "SkillsShare",     icon: "people-circle",         desc: "Learn from peers",         screen: "Dashboard",  gradient: ["#81C784", "#4CAF50"] },
  { id: "events",    title: "Events",          icon: "calendar",              desc: "What's on near you",        screen: "Events",     gradient: ["#CE93D8", "#AB47BC"] },
  { id: "resume",    title: "Resume",          icon: "document-text-outline", desc: "Build yours in minutes",   screen: "Resume",     gradient: ["#FFA726", "#FF9800"] },
  { id: "jobs",      title: "Jobs",            icon: "briefcase",             desc: "Internships, & jobs",       screen: "Career",     gradient: ["#EF5350", "#D32F2F"] },
  { id: "scholar",   title: "Scholarships",    icon: "school-outline",        desc: "Find Scholarships",     screen: "Exchange",   gradient: ["#42A5F5", "#1A237E"] },
  { id: "social",    title: "Social Activity", icon: "globe",                 desc: "Post, Confess, & Connect",        screen: "Social",     gradient: ["#EC407A", "#AD1457"] },
];

import * as Notifications from "expo-notifications";

// ─── FadeInView ─────────────────────────────────────────────────────────
const FadeInView = React.memo(({ delay = 0, children, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <Animated.View style={[{ opacity: anim, transform: [{ translateY: slide }] }, style]}>
      {children}
    </Animated.View>
  );
});

// ─── FeatureCard with "sorted." pill ────────────────────────────────────
const FeatureCard = React.memo(({ feature, onPress, sorted }) => {
  const gradientColors = feature.gradient || [GOLD, GOLD];
  const missionKey = FEATURE_ID_TO_MISSION[feature.id];

  // Pop animation for the "sorted." pill
  const pillScale = useRef(new Animated.Value(sorted ? 1 : 0)).current;
  const pillFade = useRef(new Animated.Value(sorted ? 1 : 0)).current;

  useEffect(() => {
    if (sorted) {
      Animated.parallel([
        Animated.spring(pillScale, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(pillFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(pillScale, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(pillFade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [sorted]);

  return (
    <TouchableOpacity
      style={[
        styles.featureCard,
        sorted && styles.featureCardSorted,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[
          styles.featureIcon,
          {
            backgroundColor: gradientColors[0] + "18",
            borderColor: gradientColors[0] + "30",
          },
        ]}
      >
        <Ionicons name={feature.icon} size={22} color={gradientColors[0]} />
        {missionKey && (
          <View style={styles.moodDotWrap}>
            <FeatureDot missionKey={missionKey} sorted={sorted} />
          </View>
        )}
      </View>

      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureDesc} numberOfLines={1}>{feature.desc}</Text>

      {/* "sorted." pill inside the card, bottom-right */}
      {sorted && (
        <Animated.View
          style={[
            styles.sortedPill,
            {
              opacity: pillFade,
              transform: [{ scale: pillScale }],
            },
          ]}
        >
          <Text style={styles.sortedPillText}>
            sorted<Text style={styles.sortedPillDot}>.</Text>
          </Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
});

const SectionHeader = React.memo(({ title, sub, onViewAll }) => (
  <View style={sectionStyles.row}>
    <View style={sectionStyles.left}>
      <View style={sectionStyles.accentBar} />
      <View>
        <Text style={sectionStyles.title}>{title}</Text>
        {!!sub && <Text style={sectionStyles.sub}>{sub}</Text>}
      </View>
    </View>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} style={sectionStyles.linkWrap}>
        <Text style={sectionStyles.link}>View all</Text>
        <Ionicons name="arrow-forward" size={12} color={GOLD} />
      </TouchableOpacity>
    )}
  </View>
));

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 14,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  accentBar: {
    width: 3,
    height: 26,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: DARK,
    letterSpacing: -0.3,
  },
  sub: { fontSize: 11, color: MUTED, marginTop: 1, fontWeight: "500" },
  linkWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { fontSize: 12, color: GOLD, fontWeight: "700" },
});

// ─── Main Screen ────────────────────────────────────────────────────────
export default function Home({ navigation }) {
  const [isChatVisible, setChatVisible] = useState(false);
  const [streakSheetVisible, setStreakSheetVisible] = useState(false);
  const { isGuest, user } = useContext(AuthContext);
  const queryClient = useQueryClient();

  // ── user-scoped id, used for cache keys & the Slider
  const userId = user?._id || user?.id || (isGuest ? "guest" : "anon");

  // 🆕 engagement
  const { flags } = useEngagement();
  const { missions, sortedCount, isFullySorted } = useMissions();
  const showMissions = flags?.missions && !isFullySorted;

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  const parentNavigation = navigation.getParent();

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    const animations = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(sparkleAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ),
    ];

    animations.forEach((anim) => anim.start());

    Animated.timing(badgeAnim, {
      toValue: 1,
      duration: 400,
      delay: 1000,
      useNativeDriver: true,
    }).start();

    return () => animations.forEach((anim) => anim.stop());
  }, []);

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const sparkleOp = sparkleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1, 0.2] });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.88, friction: 5, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const handleChatOpen = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();
    setChatVisible(true);
  };

  // ── Engagement home query (user-scoped, abort-safe)
  const { refetch: refetchEngagement } = useQuery({
    queryKey: ["engagement", "home", userId],
    queryFn: async ({ signal }) => {
      try {
        const res = await api.get("/engagement/home", { signal });
        return res.data;
      } catch (e) {
        const isAbort =
          axios.isCancel?.(e) ||
          e?.code === "ERR_CANCELED" ||
          e?.name === "CanceledError" ||
          e?.name === "AbortError";
        if (isAbort) return null;
        // Real error → return null, don't crash the UI
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    enabled: !isGuest && !!userId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Pull to refresh: missions, streak, daily drop, everything engagement
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([
        refetchEngagement(),
        queryClient.invalidateQueries({ queryKey: ["engagement"] }),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }, [refetchEngagement, queryClient]);

  // Auto refresh whenever Home is opened again (max once every 15s), so a
  // new drop / finished mission shows without pulling down
  const lastFocusRefreshRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      const now = Date.now();
      if (now - lastFocusRefreshRef.current < 15000) return;
      lastFocusRefreshRef.current = now;
      queryClient.invalidateQueries({ queryKey: ["engagement"] });
    }, [isGuest, queryClient])
  );

  // App back from background → refresh too
  useEffect(() => {
    if (isGuest) return;
    let prev = AppState.currentState;
    const sub = AppState.addEventListener("change", (next) => {
      if (prev.match(/inactive|background/) && next === "active") {
        queryClient.invalidateQueries({ queryKey: ["engagement"] });
      }
      prev = next;
    });
    return () => sub.remove();
  }, [isGuest, queryClient]);

  const sortedFeatureIds = useMemo(() => {
    if (!missions?.cards) return new Set();
    const s = new Set();
    for (const c of missions.cards) if (c.sorted) s.add(c.feature);
    return s;
  }, [missions?.cards]);

  const handleFeaturePress = useCallback(
    (screen) => {
      if (!navigation) return;
      const screensWithoutHeader = ["Brands", "Travelling", "Social", "Dashboard", "Events", "Profile"];
      if (screensWithoutHeader.includes(screen)) {
        if (parentNavigation) parentNavigation.navigate(screen, { timestamp: Date.now() });
        else navigation.navigate(screen);
      } else {
        navigation.navigate(screen);
      }
    },
    [navigation, parentNavigation]
  );

  const handleViewAll = useCallback(() => {
    Alert.alert("Coming Soon", "More features are on their way!", [{ text: "OK" }]);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={{ flex: 1, backgroundColor: WHITE }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={onRefresh}
              colors={[GOLD]}
              tintColor={GOLD}
              progressBackgroundColor={WHITE}
            />
          }
        >
          {/* Slider — self-fetching, user-scoped */}
          <Animated.View style={{ opacity: headerFade }}>
            <Slider userId={userId} isGuest={isGuest} />
          </Animated.View>

          <View style={styles.content}>
            {/* 🆕 Mission Stack */}
            {showMissions && (
              <FadeInView delay={100}>
                <MissionStack />
              </FadeInView>
            )}

            {/* 🆕 Fully sorted — modern bordered celebration card */}
            {isFullySorted && flags?.missions && (
              <FadeInView delay={100}>
                <View style={styles.fullySortedCard}>
                  <View style={styles.fullySortedAccent} />

                  <View style={styles.fullySortedInner}>
                    <View style={styles.fullySortedIconWrap}>
                      <MaterialCommunityIcons name="check-decagram" size={20} color={GOLD} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.fullySortedEyebrow}>ALL DONE</Text>
                      <Text style={styles.fullySortedTitle}>
                        fully sorted<Text style={styles.fullySortedDot}>.</Text>
                      </Text>
                      <Text style={styles.fullySortedSub}>
                        all 8 missions. every card checked.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.fullySortedBar}>
                    <View style={[styles.fullySortedBarFill, { width: '100%' }]} />
                  </View>
                </View>
              </FadeInView>
            )}

            {/* 🆕 Daily Drop */}
            {flags?.dailyDrop && (
              <FadeInView delay={150}>
                <DailyDropCard />
              </FadeInView>
            )}

            {/* Section Header */}
            <FadeInView delay={200}>
              <SectionHeader
                title="Explore Features"
                sub="Everything you need, one app"
                onViewAll={handleViewAll}
              />
            </FadeInView>

            {/* Features Grid */}
            <View style={styles.featuresGrid}>
              {FEATURES.map((feat) => {
                const missionKey = FEATURE_ID_TO_MISSION[feat.id];
                const isSorted = missionKey && sortedFeatureIds.has(missionKey);
                return (
                  <FeatureCard
                    key={feat.id}
                    feature={feat}
                    sorted={isSorted}
                    onPress={() => handleFeaturePress(feat.screen)}
                  />
                );
              })}
            </View>
            

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </View>

      {/* FAB */}
      <Animated.View
        style={[styles.fab, { transform: [{ translateY: floatY }, { scale: pulseAnim }] }]}
        pointerEvents="box-none"
      >
        <View style={styles.ring1} />
        <View style={styles.ring2} />

        {[
          { top: -12, right: 6, size: 8 },
          { top: 10, left: -10, size: 6 },
          { bottom: -2, right: -6, size: 10 },
        ].map((sp, i) => (
          <Animated.View key={i} style={[styles.sparkle, sp, { opacity: sparkleOp }]}>
            <MaterialCommunityIcons name="star-four-points" size={sp.size} color={GOLD} />
          </Animated.View>
        ))}

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={handleChatOpen}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <MaterialCommunityIcons name="robot-outline" size={26} color={GOLD} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[styles.aiBadge, { opacity: badgeAnim, transform: [{ scale: badgeAnim }] }]}
        >
          <View style={styles.greenDot} />
          <Text style={styles.aiText}>AI</Text>
        </Animated.View>
      </Animated.View>

      {/* Streak sheet */}
      <StreakSheet
        visible={streakSheetVisible}
        onClose={() => setStreakSheetVisible(false)}
      />

      <Modal
        visible={isChatVisible}
        animationType="slide"
        onRequestClose={() => setChatVisible(false)}
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: WHITE }}>
          <ChatBotInterface onClose={() => setChatVisible(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const CARD_GAP = 10;
const H_PADDING = 16;
const CARD_WIDTH = (width - H_PADDING * 2 - CARD_GAP * 2) / 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  scrollContent: { paddingBottom: 20 },
  content: { paddingHorizontal: H_PADDING },
  bottomSpacer: { height: 100 },

  // ── Feature grid ─────────────────────────────────────
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    justifyContent: "flex-start",
  },
  featureCard: {
    width: CARD_WIDTH,
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 26,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    position: "relative",
    overflow: "visible",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  featureCardSorted: {
    backgroundColor: "#fffdf5",
    borderColor: GOLD + "55",
    shadowColor: GOLD,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    position: "relative",
    borderWidth: 1.5,
  },
  moodDotWrap: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: DARK,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  featureDesc: {
    fontSize: 9,
    color: MUTED,
    textAlign: "center",
    marginTop: 3,
    fontWeight: "500",
    paddingHorizontal: 2,
  },

  // ── "sorted." pill ────────────────────────────────────
  sortedPill: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: DARK,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sortedPillText: {
    fontSize: 8,
    fontWeight: "900",
    color: WHITE,
    letterSpacing: 0.4,
    textTransform: "lowercase",
  },
  sortedPillDot: {
    color: GOLD,
    fontWeight: "900",
  },

  // ── Fully sorted — bordered card ─────────────────────
  fullySortedCard: {
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 18,
    backgroundColor: "#fffbee",
    borderWidth: 1.5,
    borderColor: GOLD + "66",
    overflow: "hidden",
    position: "relative",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  fullySortedAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: GOLD,
  },
  fullySortedInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 14,
    gap: 12,
  },
  fullySortedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GOLD + "20",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: GOLD + "50",
  },
  fullySortedEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    color: GOLD_DARK,
    letterSpacing: 1.6,
    marginBottom: 1,
  },
  fullySortedTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: DARK,
    letterSpacing: -0.3,
  },
  fullySortedDot: {
    color: GOLD,
    fontWeight: "900",
  },
  fullySortedSub: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: -0.1,
  },
  fullySortedBar: {
    height: 3,
    backgroundColor: GOLD + "25",
  },
  fullySortedBarFill: {
    height: "100%",
    backgroundColor: GOLD,
  },

  // ── FAB ──────────────────────────────────────────────
  fab: { position: "absolute", bottom: 30, right: 16 },
  ring1: {
    position: "absolute",
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "rgba(249,195,73,0.10)",
    top: -6, left: -6,
  },
  ring2: {
    position: "absolute",
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(249,195,73,0.05)",
    top: -12, left: -12,
  },
  sparkle: { position: "absolute", zIndex: 2 },
  fabBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: DARK,
    justifyContent: "center", alignItems: "center",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5, borderColor: GOLD + "33",
    marginBottom: 40,
  },
  aiBadge: {
    position: "absolute",
    top: -24, right: -4,
    backgroundColor: DARK,
    borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 2,
    flexDirection: "row", alignItems: "center", gap: 3,
    borderWidth: 1.5, borderColor: WHITE,
    elevation: 5,
  },
  greenDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#4CAF50" },
  aiText: { fontSize: 7, fontWeight: "900", color: WHITE, letterSpacing: 0.5 },
});