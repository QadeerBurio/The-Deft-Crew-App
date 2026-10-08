// app/src/screens/Home.js
// Wires data + section order. Sections live in ./home/ (see tdc-ui-handoff/HOME_SPEC.md).
import React, {
  useState, useCallback, useRef, useEffect, useContext, useMemo,
} from "react";
import {
  ScrollView, StyleSheet, View, Modal,
  RefreshControl, Animated, StatusBar, Easing, AppState, AccessibilityInfo,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import ChatBotInterface from "./ChatBotInterface";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api from "../api/api";
import Slider from "../screens/Slider";
import { navigationRef } from "../navigation/navigationRef";

// 🆕 engagement
// MissionStack is no longer rendered on Home (file kept, import kept)
import MissionStack from "../engagement/components/MissionStack"; // eslint-disable-line no-unused-vars
import DailyDropCard from "../engagement/components/DailyDropCard";
import StreakSheet from "../engagement/components/StreakSheet";
import { useEngagement } from "../engagement/hooks/useEngagement";
import { useMissions } from "../engagement/hooks/useMissions";
import { useStreak } from "../engagement/hooks/useStreak";
import { FEATURE_ID_TO_MISSION } from "../engagement/utils/mood";

// 🆕 home sections
import HomeHello from "./home/HomeHello";
import HomeCampus from "./home/HomeCampus";
import HomeTools from "./home/HomeTools";
import HomeNearMe from "./home/HomeNearMe";
import AiFab, { AI_FAB_BOTTOM } from "./home/AiFab";
import {
  LATEST_CONFESSION_KEY, DEALS_KEY, fetchLatestConfession, fetchDeals, devLogOnce,
} from "./home/homeData";
import { color } from "../theme/tokens";

// ids + screens unchanged; labels and colours per HOME_SPEC §2.5
const FEATURES = [
  { id: "discount",  label: "discounts",    icon: "pricetag-outline",      screen: "Brands",     well: "#FDE3E1", stroke: "#D9443F" },
  { id: "traveling", label: "travel",       icon: "airplane-outline",      screen: "Travelling", well: "#DDF0F8", stroke: "#1F86C4" },
  { id: "dashboard", label: "skillsshare",  icon: "people-circle-outline", screen: "Dashboard",  well: "#E2F3E4", stroke: "#2E8B3E" },
  { id: "events",    label: "events",       icon: "calendar-outline",      screen: "Events",     well: "#F1E6F5", stroke: "#8E44AD" },
  { id: "resume",    label: "resume",       icon: "document-text-outline", screen: "Resume",     well: "#FFF0DC", stroke: "#C77700" },
  { id: "jobs",      label: "jobs",         icon: "briefcase-outline",     screen: "Career",     well: "#FDE6E2", stroke: "#D1383D" },
  { id: "scholar",   label: "scholarships", icon: "school-outline",        screen: "Exchange",   well: "#E1F1FA", stroke: "#2B7FC0" },
  { id: "social",    label: "social",       icon: "globe-outline",         screen: "Social",     well: "#FCE4EC", stroke: "#C2185B" },
];

import * as Notifications from "expo-notifications"; // eslint-disable-line no-unused-vars

// ─── FadeInView ─────────────────────────────────────────────────────────
// Fades up once on mount (450 ms, from 10 below). Skipped with "reduce motion".
const FadeInView = React.memo(function FadeInView({ delay = 0, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    let cancelled = false;
    let timeout;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          anim.setValue(1);
          slide.setValue(0);
          return;
        }
        timeout = setTimeout(() => {
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]).start();
        }, delay);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [delay, anim, slide]);

  return (
    <Animated.View style={[{ opacity: anim, transform: [{ translateY: slide }] }, style]}>
      {children}
    </Animated.View>
  );
});

// ─── Main Screen ────────────────────────────────────────────────────────
export default function Home({ navigation }) {
  const [isChatVisible, setChatVisible] = useState(false);
  const [streakSheetVisible, setStreakSheetVisible] = useState(false);
  const { isGuest, user, token } = useContext(AuthContext);
  const queryClient = useQueryClient();

  // ── user-scoped id, used for cache keys & the Slider
  const userId = user?._id || user?.id || (isGuest ? "guest" : "anon");

  // 🆕 engagement
  const { flags, me } = useEngagement();
  const { missions } = useMissions();
  const { count: streakCount, enabled: streakEnabled } = useStreak();

  const headerFade = useRef(new Animated.Value(0)).current;
  const parentNavigation = navigation.getParent();

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [headerFade]);

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

  // ── Latest confession + deals (signed-in only; failures hide the section)
  const signedIn = !isGuest && !!token;

  const { data: latestConfession, refetch: refetchConfession } = useQuery({
    queryKey: LATEST_CONFESSION_KEY(userId),
    queryFn: async ({ signal }) => {
      try {
        return await fetchLatestConfession(token, signal);
      } catch (e) {
        devLogOnce("latest confession", e);
        return null;
      }
    },
    enabled: signedIn,
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: DEALS_KEY(userId),
    queryFn: async () => {
      try {
        return await fetchDeals(token, userId);
      } catch (e) {
        devLogOnce("deals", e);
        return [];
      }
    },
    enabled: signedIn,
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Pull to refresh: missions, streak, daily drop, everything engagement,
  // plus the confession and deals sections
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([
        refetchEngagement(),
        queryClient.invalidateQueries({ queryKey: ["engagement"] }),
        signedIn ? refetchConfession() : null,
        signedIn
          ? fetchDeals(token, userId, true)
              .then((fresh) => queryClient.setQueryData(DEALS_KEY(userId), fresh))
              .catch((e) => devLogOnce("deals refresh", e))
          : null,
        signedIn ? queryClient.invalidateQueries({ queryKey: ["home", "nearby"] }) : null,
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }, [refetchEngagement, queryClient, signedIn, refetchConfession, token, userId]);

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

  // Confessions feed: same route + params the Daily Drop uses
  const openFeedScreen = useCallback(
    (params) => {
      try {
        if (navigationRef.isReady()) navigationRef.navigate("FeedScreen", params);
        else navigation.navigate("FeedScreen", params);
      } catch (e) {
        if (__DEV__) console.log("[Home] open feed error:", e?.message);
      }
    },
    [navigation]
  );
  const openLatestConfession = useCallback(() => {
    if (latestConfession?._id) openFeedScreen({ postId: latestConfession._id });
  }, [latestConfession?._id, openFeedScreen]);
  const openConfessionFeed = useCallback(() => openFeedScreen({ tab: "Confession" }), [openFeedScreen]);

  const openDeal = useCallback(
    (brand) => navigation.navigate("OfferScreen", { brand }),
    [navigation]
  );
  const openAllDeals = useCallback(() => handleFeaturePress("Brands"), [handleFeaturePress]);

  // ── Derived copy
  const displayName = user?.name || user?.fullName || user?.username || "";
  const firstName = isGuest ? "" : String(displayName).trim().split(/\s+/)[0] || "";

  const sortedCount = FEATURES.filter((f) => sortedFeatureIds.has(FEATURE_ID_TO_MISSION[f.id])).length;
  const sortedLabel = !isGuest && flags?.missions ? `${sortedCount} of ${FEATURES.length} sorted` : null;

  const totalSaved = Number(me?.stats?.totalSaved) || 0;
  const savedLabel =
    flags?.savingsCounter && totalSaved > 0
      ? `rs ${Math.round(totalSaved).toLocaleString()} saved · see all`
      : "see all";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={color.white} />

      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={onRefresh}
              colors={[color.yellow]}
              tintColor={color.yellow}
              progressBackgroundColor={color.white}
            />
          }
        >
          {/* Slider — self-fetching, user-scoped (Slider adds 8 more on top) */}
          <Animated.View style={[styles.sliderWrap, { opacity: headerFade }]}>
            <Slider userId={userId} isGuest={isGuest} />
          </Animated.View>

          <FadeInView delay={0}>
            <HomeHello
              name={firstName}
              streakCount={streakCount}
              showStreak={!isGuest && streakEnabled}
              onStreakPress={() => setStreakSheetVisible(true)}
            />
          </FadeInView>

          {/* 🆕 Daily Drop */}
          {flags?.dailyDrop && (
            <FadeInView delay={50}>
              <DailyDropCard variant="home" />
            </FadeInView>
          )}

          {signedIn && !!latestConfession && (
            <FadeInView delay={100}>
              <HomeCampus
                confession={latestConfession}
                onOpenPost={openLatestConfession}
                onOpenFeed={openConfessionFeed}
              />
            </FadeInView>
          )}

          <FadeInView delay={150}>
            <HomeTools
              features={FEATURES}
              sortedFeatureIds={sortedFeatureIds}
              sortedLabel={sortedLabel}
              onFeaturePress={handleFeaturePress}
            />
          </FadeInView>

          {signedIn && (
            <FadeInView delay={200}>
              <HomeNearMe
                signedIn={signedIn}
                userId={userId}
                allDeals={deals}
                dealsLoading={dealsLoading}
                savedLabel={savedLabel}
                onSeeAll={openAllDeals}
                onOpenDeal={openDeal}
              />
            </FadeInView>
          )}
        </ScrollView>
      </View>

      <AiFab onPress={() => setChatVisible(true)} />

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
        <View style={{ flex: 1, backgroundColor: color.white }}>
          <ChatBotInterface onClose={() => setChatVisible(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.paper },
  // room below the last section for the AI button + the tab bar it sits above
  scrollContent: { paddingBottom: AI_FAB_BOTTOM + 48 + 24 },
  sliderWrap: { paddingTop: 8 },
});
