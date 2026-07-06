import React, { useState, useCallback, useRef, useEffect, useContext } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  Text,
  RefreshControl,
  Animated,
  StatusBar,
  FlatList,
  Dimensions,
  Easing,
  Image,
  Alert,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import ChatBotInterface from "./ChatBotInterface";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import Slider from "../screens/Slider";

const { width, height } = Dimensions.get("window");

// ─── Theme ───────────────────────────────────────────────────────────────────
const GOLD   = "#f9c349";
const DARK   = "#1a1a1a";
const WHITE  = "#ffffff";
const MUTED  = "#888888";
const LIGHT  = "#fafafa";
const BORDER = "#f0f0f0";
const SHADOW = "rgba(0,0,0,0.08)";

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { id: "discount",     title: "Discounts",    icon: "pricetag-outline", iconType: "Ionicons", desc: "Save on top brands", screen: "Brands", gradient: ["#FF6B6B", "#FF8E53"] },
  { id: "traveling",   title: "Travelling",   icon: "airplane",        iconType: "Ionicons",               desc: "Flights & hotels", screen: "Travelling", gradient: ["#4FC3F7", "#29B6F6"] },
  { id: "learning",    title: "SkillsShare",   icon: "book",           iconType: "Ionicons",               desc: "Courses & tutorials", screen: "AiSkillsScreen", gradient: ["#81C784", "#4CAF50"] },
  { id: "events",      title: "Events",       icon: "calendar",        iconType: "Ionicons",               desc: "Local events", screen: "Events", gradient: ["#CE93D8", "#AB47BC"] },
  { id: "resume",      title: "Resume",       icon: "document-text-outline", iconType: "Ionicons", desc: "Build your CV", screen: "ResumeDashboard", gradient: ["#FFA726", "#FF9800"] },
  { id: "jobs",        title: "Jobs",         icon: "briefcase",       iconType: "FontAwesome5",           desc: "Dream careers", screen: "Career", gradient: ["#EF5350", "#D32F2F"] },
  { id: "scholar",     title: "Scholarships", icon: "school-outline",  iconType: "Ionicons",           desc: "Education funds", screen: "Exchange", gradient: ["#42A5F5", "#1A237E"] },
  { id: "social",      title: "Social Activity", icon: "people", iconType: "Ionicons",              desc: "Post & share", screen: "Social", gradient: ["#EC407A", "#AD1457"] },
];

const OFFERS = [
  { id: "1", title: "Travel Packages", amount: "10% OFF", icon: "airplane-outline", bg: DARK, text: WHITE, accent: GOLD },
  { id: "2", title: "Online Courses",  amount: "15% OFF", icon: "school-outline", bg: GOLD, text: DARK, accent: DARK },
  { id: "3", title: "Brand Partners",  amount: "10% OFF", icon: "storefront-outline", bg: "#1e1e2e", text: WHITE, accent: GOLD },
];

// ─── Animated Section Wrapper ─────────────────────────────────────────────────
function FadeInView({ delay = 0, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: anim, transform: [{ translateY: slide }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Static Feature Card (No Animations) ──────────────────────────────────
function FeatureCard({ feature, onPress }) {
  const gradientColors = feature.gradient || ['#f9c349', '#f9c349'];

  return (
    <View style={{ 
      width: (width - 48) / 3,
    }}>
      <TouchableOpacity
        style={styles.featureCard}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View 
          style={[
            styles.featureIcon,
            { 
              backgroundColor: gradientColors[0] + '18',
              borderColor: gradientColors[0] + '30',
            }
          ]}
        >
          <Ionicons 
            name={feature.icon} 
            size={22} 
            color={gradientColors[0]} 
          />
          <View style={[styles.featureIconDot, { backgroundColor: gradientColors[0] }]} />
        </View>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDesc} numberOfLines={1}>{feature.desc}</Text>
        <View style={[styles.featureHover, { backgroundColor: gradientColors[0] + '10' }]}>
          <Text style={[styles.featureHoverText, { color: gradientColors[0] }]}>→</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Animated Offer Card ────────────────────────────────────────────────────
function AnimatedOfferCard({ offer, index }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 200;
    Animated.timing(translateY, {
      toValue: 1,
      duration: 600,
      delay,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const yOffset = translateY.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.8, 0.3],
  });

  return (
    <Animated.View style={{ 
      flex: 1,
      transform: [{ translateY: yOffset }],
    }}>
      <TouchableOpacity 
        style={[styles.offerCard, { backgroundColor: offer.bg }]} 
        activeOpacity={0.85}
      >
        <Animated.View 
          style={[
            styles.offerShimmer,
            { opacity: shimmerOpacity }
          ]} 
        />
        <View style={[styles.offerIconWrap, { backgroundColor: offer.accent + "22" }]}>
          <Ionicons name={offer.icon} size={16} color={offer.accent} />
        </View>
        <Text style={[styles.offerAmount, { color: offer.text }]}>{offer.amount}</Text>
        <Text style={[styles.offerLabel, { color: offer.text + "99" }]}>{offer.title}</Text>
        <View style={[styles.offerCta, { backgroundColor: offer.accent + "25" }]}>
          <Text style={[styles.offerCtaText, { color: offer.accent }]}>Get →</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Home ────────────────────────────────────────────────────────────────
export default function Home({ navigation }) {
  const [isChatVisible, setChatVisible] = useState(false);
  const { isGuest } = useContext(AuthContext);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(badgeAnim, {
      toValue: 1,
      duration: 600,
      delay: 1500,
      useNativeDriver: true,
    }).start();
  }, []);

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const sparkleOp = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 1, 0.2],
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
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

  const handleChatOpen = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();
    setChatVisible(true);
  };

  const { data: homeData, refetch, isRefetching } = useQuery({
    queryKey: ["homeData"],
    queryFn: async () => {
      const res = await api.get("/home-endpoint");
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const onRefresh = useCallback(() => refetch(), [refetch]);

  const handleFeaturePress = (screen) => {
   
    if (navigation && screen) {
      navigation.navigate(screen);
    }
  };

  const handleViewAll = () => {
    Alert.alert("Coming Soon", "More features are on their way! We're working hard to bring you an even better experience.", [{ text: "OK" }]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={{ flex: 1, backgroundColor: WHITE }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              colors={[GOLD]}
              tintColor={GOLD}
              progressBackgroundColor={WHITE}
            />
          }
        >
          <Animated.View style={{ opacity: headerFade, transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
            <Slider data={homeData?.sliders} />
          </Animated.View>

          <View style={styles.content}>
            {/* ── Explore Features ── */}
            <FadeInView delay={250}>
              <SectionHeader title="Explore Features" sub="All you need in one place" onViewAll={handleViewAll} />
            </FadeInView>

            <View style={styles.featuresGrid}>
              {FEATURES.map((feat, i) => (
                <FeatureCard
                  key={feat.id}
                  feature={feat}
                  onPress={() => handleFeaturePress(feat.screen)}
                />
              ))}
            </View>

            {/* ── Exclusive Offers ── */}
            <FadeInView delay={450}>
              <SectionHeader title="Exclusive Offers" sub="Special deals just for you" />
            </FadeInView>

            <View style={styles.offersRow}>
              {OFFERS.map((o, i) => (
                <AnimatedOfferCard key={o.id} offer={o} index={i} />
              ))}
            </View>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </View>

      {/* ── Floating AI Button ── */}
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

        <Animated.View style={[styles.aiBadge, { opacity: badgeAnim, transform: [{ scale: badgeAnim }] }]}>
          <View style={styles.greenDot} />
          <Text style={styles.aiText}>AI</Text>
        </Animated.View>
      </Animated.View>

      {/* ── Chat Modal ── */}
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

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub, link, onViewAll }) {
  return (
    <View style={sectionStyles.row}>
      <View>
        <Text style={sectionStyles.title}>{title}</Text>
        {!!sub && <Text style={sectionStyles.sub}>{sub}</Text>}
      </View>
      {(!!link || onViewAll) && (
        <TouchableOpacity onPress={onViewAll}>
          <Text style={sectionStyles.link}>{link || "View all"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "800", color: DARK, letterSpacing: -0.2 },
  sub: { fontSize: 12, color: MUTED, marginTop: 2 },
  link: { fontSize: 13, color: GOLD, fontWeight: "700" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  scrollContent: { paddingBottom: 20 },
  content: { paddingHorizontal: 16 },
  bottomSpacer: { height: 100 },

  // Features
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: 'flex-start' },
  featureCard: {
    width: (width - 48) / 3,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
    overflow: 'hidden',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    position: 'relative',
    borderWidth: 1.5,
  },
  featureIconDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: WHITE,
  },
  featureTitle: { fontSize: 10, fontWeight: "700", color: DARK, textAlign: "center" },
  featureDesc: { fontSize: 8, color: MUTED, textAlign: "center", marginTop: 2 },
  featureHover: {
    position: 'absolute',
    bottom: -2,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featureHoverText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Offers
  offersRow: { flexDirection: "row", gap: 8 },
  offerCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 110,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  offerShimmer: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ rotate: '45deg' }],
  },
  offerIconWrap: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  offerAmount: { fontSize: 17, fontWeight: "900", letterSpacing: -0.3 },
  offerLabel: { fontSize: 9, fontWeight: "600", lineHeight: 12 },
  offerCta: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  offerCtaText: { fontSize: 10, fontWeight: "700" },

  // FAB
  fab: { position: "absolute", bottom: 30, right: 16 },
  ring1: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(249,195,73,0.10)",
    top: -6,
    left: -6,
  },
  ring2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(249,195,73,0.05)",
    top: -12,
    left: -12,
  },
  sparkle: { position: "absolute", zIndex: 2 },
  fabBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: DARK,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: GOLD + "33",
    marginBottom: 40,
  },
  aiBadge: {
    position: "absolute",
    top: -24,
    right: -4,
    backgroundColor: DARK,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1.5,
    borderColor: WHITE,
    elevation: 5,
  },
  greenDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#4CAF50" },
  aiText: { fontSize: 7, fontWeight: "900", color: WHITE, letterSpacing: 0.5 },
});