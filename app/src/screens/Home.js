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
} from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import ChatBotInterface from "./ChatBotInterface";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import Slider from "../screens/Slider";

const { width } = Dimensions.get("window");

// ─── Theme ───────────────────────────────────────────────────────────────────
const GOLD   = "#f9c349";
const DARK   = "#1a1a1a";
const WHITE  = "#ffffff";
const MUTED  = "#888888";
const LIGHT  = "#fafafa";
const BORDER = "#f0f0f0";

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { id: "discount",     title: "Discounts",    icon: "tag",             iconType: "MaterialCommunityIcons", desc: "Save on top brands", screen: "Brands" },
  { id: "traveling",   title: "Travelling",   icon: "airplane",        iconType: "Ionicons",               desc: "Flights & hotels", screen: "Traveling" },
  { id: "learning",    title: "SkillsShare",   icon: "book",           iconType: "Ionicons",               desc: "Courses & tutorials", screen: "AiSkillsScreen" },
  { id: "events",      title: "Events",       icon: "calendar",        iconType: "Ionicons",               desc: "Local events", screen: "Events" },
  { id: "resume",      title: "Resume",       icon: "file-document",   iconType: "MaterialCommunityIcons", desc: "Build your CV", screen: "ResumeDashboard" },
  { id: "jobs",        title: "Jobs",         icon: "briefcase",       iconType: "FontAwesome5",           desc: "Dream careers", screen: "Career" },
  { id: "scholar",     title: "Scholarships", icon: "graduation-cap",  iconType: "FontAwesome5",           desc: "Education funds", screen: "Exchange" },
  { id: "social",      title: "Social Activity", icon: "people", iconType: "Ionicons",              desc: "Post & share", screen: "Social" },
];

const SLIDES = [
  {
    id: "1",
    title: "Scholarship\nOpportunities 2025",
    subtitle: "Find your perfect match",
    tag: "🎓 STUDY",
    accent: GOLD,
    bg: DARK,
    icon: "school-outline",
  },
  {
    id: "2",
    title: "Global Grants\n& Funding Programs",
    subtitle: "Apply for financial aid",
    tag: "💰 FUNDING",
    accent: "#4FC3F7",
    bg: "#0a2e5c",
    icon: "card-outline",
  },
  {
    id: "3",
    title: "Job Listings\nCurated For You",
    subtitle: "Discover your dream career",
    tag: "💼 CAREER",
    accent: DARK,
    bg: GOLD,
    icon: "briefcase-outline",
  },
  {
    id: "4",
    title: "Career Growth\n& Opportunities",
    subtitle: "Build your future",
    tag: "📈 GROWTH",
    accent: WHITE,
    bg: "#1a1a2e",
    icon: "trending-up-outline",
  },
  {
    id: "5",
    title: "Tech Events\n& Conferences",
    subtitle: "Stay ahead of the curve",
    tag: "🗓️ EVENTS",
    accent: "#FF6B6B",
    bg: "#1e1e2e",
    icon: "calendar-outline",
  },
  {
    id: "6",
    title: "Networking\nMeetups",
    subtitle: "Connect with industry experts",
    tag: "🤝 CONNECT",
    accent: GOLD,
    bg: "#0d0d0d",
    icon: "people-outline",
  },
  {
    id: "7",
    title: "Exclusive Deals\n& Discounts",
    subtitle: "Save big on premium services",
    tag: "🛍️ SAVE",
    accent: "#FF6B6B",
    bg: "#1a0a0a",
    icon: "pricetag-outline",
  },
  {
    id: "8",
    title: "Limited Time\nSpecial Offers",
    subtitle: "Don't miss out",
    tag: "⚡ FLASH",
    accent: GOLD,
    bg: "#0a2a1a",
    icon: "flash-outline",
  },
  {
    id: "9",
    title: "Travel Packages\n& Adventures",
    subtitle: "Explore the world",
    tag: "🌍 EXPLORE",
    accent: "#4FC3F7",
    bg: "#0a1a2a",
    icon: "airplane-outline",
  },
  {
    id: "10",
    title: "Vacation Deals\n& Getaways",
    subtitle: "Your next trip awaits",
    tag: "🏖️ RELAX",
    accent: GOLD,
    bg: "#0a0a1a",
    icon: "umbrella-outline",
  },
];

const OFFERS = [
  { id: "1", title: "Travel Packages", amount: "40% OFF", icon: "airplane-outline", bg: DARK, text: WHITE, accent: GOLD },
  { id: "2", title: "Online Courses",  amount: "25% OFF", icon: "school-outline", bg: GOLD, text: DARK, accent: DARK },
  { id: "3", title: "Brand Partners",  amount: "30% OFF", icon: "storefront-outline", bg: "#1e1e2e", text: WHITE, accent: GOLD },
];

const PROGRESS = [
  { id: "1", value: "80%", label: "Resume",       icon: "file-document-outline", color: GOLD, pct: 0.8 },
  { id: "2", value: "12",  label: "Applications", icon: "send-outline", color: "#4FC3F7", pct: 0.6 },
  { id: "3", value: "5",   label: "Events Held",  icon: "calendar-outline", color: "#FF6B6B", pct: 0.5 },
  { id: "4", value: "7",   label: "Opportunities", icon: "briefcase-outline", color: DARK, pct: 0.7 },
];

// ─── Hero Carousel ──────────────────────────────────────────────────────────
const CARD_W = width * 0.9;
const CARD_SPACING = 12;

function HeroCarousel() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef(null);
  const currentIdx = useRef(0);
  const intervalRef = useRef(null);

  const startAutoPlay = () => {
    intervalRef.current = setInterval(() => {
      currentIdx.current = (currentIdx.current + 1) % SLIDES.length;
      flatRef.current?.scrollToOffset({
        offset: currentIdx.current * (CARD_W + CARD_SPACING),
        animated: true,
      });
    }, 3200);
  };

  useEffect(() => {
    startAutoPlay();
    return () => clearInterval(intervalRef.current);
  }, []);

  const onMomentumScrollEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + CARD_SPACING));
    currentIdx.current = idx;
  };

  return (
    <View style={styles.carouselWrapper}>
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_W + CARD_SPACING}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: (width - CARD_W) / 2,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollBeginDrag={() => clearInterval(intervalRef.current)}
        onScrollEndDrag={startAutoPlay}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * (CARD_W + CARD_SPACING),
            index * (CARD_W + CARD_SPACING),
            (index + 1) * (CARD_W + CARD_SPACING),
          ];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.92, 1, 0.92],
            extrapolate: "clamp",
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              style={[
                styles.carouselCard,
                {
                  backgroundColor: item.bg,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={[styles.tag, { backgroundColor: item.accent + "22" }]}>
                    <Text style={[styles.tagText, { color: item.accent }]}>{item.tag}</Text>
                  </View>
                  <View style={[styles.iconCircle, { backgroundColor: item.accent + "18" }]}>
                    <Ionicons name={item.icon} size={28} color={item.accent} />
                  </View>
                </View>
                
                <Text style={[styles.cardTitle, { color: item.accent }]}>{item.title}</Text>
                <Text style={[styles.cardSubtitle, { color: item.accent + "AA" }]}>{item.subtitle}</Text>
                
                <TouchableOpacity 
                  style={[styles.cardButton, { backgroundColor: item.accent }]} 
                  activeOpacity={0.85}
                >
                  <Text style={[styles.cardButtonText, { color: item.bg }]}>Explore Now →</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        }}
      />

      <View style={styles.dotsContainer}>
        {SLIDES.map((_, i) => {
          const inputRange = [
            (i - 1) * (CARD_W + CARD_SPACING),
            i * (CARD_W + CARD_SPACING),
            (i + 1) * (CARD_W + CARD_SPACING),
          ];
          const dotScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: "clamp",
          });
          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { 
                  transform: [{ scale: dotScale }],
                  opacity: dotOpacity 
                }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

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

// ─── Main Home ────────────────────────────────────────────────────────────────
export default function Home({ navigation }) {
  const [isChatVisible, setChatVisible] = useState(false);
  const { isGuest } = useContext(AuthContext);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;

  const progressWidths = useRef(PROGRESS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
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

    progressWidths.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: PROGRESS[i].pct * 100,
        duration: 1000,
        delay: 800 + i * 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
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

  const renderIcon = (type, name, size, color) => {
    const iconMap = { Ionicons, MaterialCommunityIcons, FontAwesome5 };
    const IconComponent = iconMap[type] || Ionicons;
    return <IconComponent name={name} size={size} color={color} />;
  };

  const handleFeaturePress = (screen) => {
    if (screen === "Social" || screen === "Confession") {
      Alert.alert("Coming Soon", `The ${screen} feature is under development. Stay tuned!`, [{ text: "OK" }]);
      return;
    }
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
        <Slider data={homeData?.sliders} />

        <View style={styles.content}>
          {/* ── Explore Features ── */}
          <FadeInView delay={250}>
            <SectionHeader title="Explore Features" sub="All you need in one place" onViewAll={handleViewAll} />
          </FadeInView>

          <View style={styles.featuresGrid}>
            {FEATURES.map((feat, i) => (
              <FadeInView key={feat.id} delay={280 + i * 40}>
                <TouchableOpacity 
                  style={styles.featureCard} 
                  activeOpacity={0.75}
                  onPress={() => handleFeaturePress(feat.screen)}
                >
                  <View style={styles.featureIcon}>
                    {renderIcon(feat.iconType, feat.icon, 22, GOLD)}
                  </View>
                  <Text style={styles.featureTitle}>{feat.title}</Text>
                  <Text style={styles.featureDesc} numberOfLines={1}>{feat.desc}</Text>
                </TouchableOpacity>
              </FadeInView>
            ))}
          </View>

          {/* ── Hero Carousel ── */}
          <FadeInView delay={100}>
            <HeroCarousel />
          </FadeInView>

          {/* ── Exclusive Offers ── */}
          <FadeInView delay={450}>
            <SectionHeader title="Exclusive Offers" sub="Special deals just for you" />
          </FadeInView>

          <View style={styles.offersRow}>
            {OFFERS.map((o, i) => (
              <FadeInView key={o.id} delay={480 + i * 80} style={{ flex: 1 }}>
                <TouchableOpacity style={[styles.offerCard, { backgroundColor: o.bg }]} activeOpacity={0.85}>
                  <View style={[styles.offerIconWrap, { backgroundColor: o.accent + "22" }]}>
                    <Ionicons name={o.icon} size={16} color={o.accent} />
                  </View>
                  <Text style={[styles.offerAmount, { color: o.text }]}>{o.amount}</Text>
                  <Text style={[styles.offerLabel, { color: o.text + "99" }]}>{o.title}</Text>
                  <View style={[styles.offerCta, { backgroundColor: o.accent + "25" }]}>
                    <Text style={[styles.offerCtaText, { color: o.accent }]}>Get →</Text>
                  </View>
                </TouchableOpacity>
              </FadeInView>
            ))}
          </View>

          {/* ── Progress ── */}
          <FadeInView delay={550}>
            <SectionHeader title="Your Progress" sub="Track your achievements" />
          </FadeInView>

          <View style={styles.progressGrid}>
            {PROGRESS.map((p, i) => (
              <FadeInView key={p.id} delay={580 + i * 80} style={{ width: (width - 40) / 2 }}>
                <View style={styles.progressCard}>
                  <View style={[styles.progressIcon, { backgroundColor: p.color + "18" }]}>
                    <Ionicons name={p.icon} size={22} color={p.color} />
                  </View>
                  <Text style={styles.progressValue}>{p.value}</Text>
                  <Text style={styles.progressLabel}>{p.label}</Text>
                  <View style={styles.progressTrack}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        { backgroundColor: p.color, width: progressWidths[i].interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"]
                        })}
                      ]}
                    />
                  </View>
                </View>
              </FadeInView>
            ))}
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

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

  // Carousel
  carouselWrapper: { marginVertical: 8 },
  carouselCard: {
    width: CARD_W,
    borderRadius: 20,
    padding: 20,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 170,
  },
  cardContent: { flex: 1, justifyContent: "space-between" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  cardTitle: { fontSize: 17, fontWeight: "800", lineHeight: 22, letterSpacing: -0.2, marginBottom: 2 },
  cardSubtitle: { fontSize: 12, fontWeight: "500", marginBottom: 12 },
  cardButton: { alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  cardButtonText: { fontSize: 12, fontWeight: "700" },
  dotsContainer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center", 
    marginTop: 12, 
    gap: 6,
    height: 10,
  },
  dot: { 
    width: 8,
    height: 8, 
    borderRadius: 4, 
    backgroundColor: DARK,
  },

  // Features
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureCard: {
    width: (width - 48) / 3,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD + "18",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  featureTitle: { fontSize: 10, fontWeight: "700", color: DARK, textAlign: "center" },
  featureDesc: { fontSize: 8, color: MUTED, textAlign: "center", marginTop: 2 },

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
  },
  offerIconWrap: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  offerAmount: { fontSize: 17, fontWeight: "900", letterSpacing: -0.3 },
  offerLabel: { fontSize: 9, fontWeight: "600", lineHeight: 12 },
  offerCta: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  offerCtaText: { fontSize: 10, fontWeight: "700" },

  // Progress
  progressGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  progressCard: {
    width: (width - 40) / 2,
    backgroundColor: LIGHT,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  progressIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  progressValue: { fontSize: 20, fontWeight: "900", color: DARK },
  progressLabel: { fontSize: 10, color: MUTED, marginTop: 2, textAlign: "center" },
  progressTrack: { width: "100%", height: 4, backgroundColor: BORDER, borderRadius: 2, marginTop: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },

 
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
    marginBottom:40
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