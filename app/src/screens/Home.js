import React, { useState, useCallback, useRef, useEffect, useContext, useMemo } from "react";
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
  Dimensions,
  Easing,
  Alert,
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
const GOLD = "#f9c349";
const DARK = "#1a1a1a";
const WHITE = "#ffffff";
const MUTED = "#888888";
const LIGHT = "#fafafa";
const BORDER = "#f0f0f0";

// ─── Static Data ─────────────────────────────────────────────────────────────
const FEATURES = [
  { id: "discount", title: "Discounts", icon: "pricetag-outline", desc: "Save on top brands", screen: "Brands", gradient: ["#FF6B6B", "#FF8E53"] },
  { id: "traveling", title: "Travelling", icon: "airplane", desc: "Flights & hotels", screen: "Travelling", gradient: ["#4FC3F7", "#29B6F6"] },
  { id: "dashboard", title: "SkillsShare", icon: "people-circle", desc: "Skill Share", screen: "Dashboard", gradient: ["#81C784", "#4CAF50"] },
  { id: "events", title: "Events", icon: "calendar", desc: "Local events", screen: "Events", gradient: ["#CE93D8", "#AB47BC"] },
  { id: "resume", title: "Resume", icon: "document-text-outline", desc: "Build your CV", screen: "Resume", gradient: ["#FFA726", "#FF9800"] },
  { id: "jobs", title: "Jobs", icon: "briefcase", desc: "Dream careers", screen: "Career", gradient: ["#EF5350", "#D32F2F"] },
  { id: "scholar", title: "Scholarships", icon: "school-outline", desc: "Education funds", screen: "Exchange", gradient: ["#42A5F5", "#1A237E"] },
  { id: "social", title: "Social Activity", icon: "globe", desc: "Post & share", screen: "Social", gradient: ["#EC407A", "#AD1457"] },
];

const OFFERS = [
  {
    id: "1",
    title: "Brand Partners",
    amount: "UPTO 50% OFF",
    icon: "storefront-outline",
    bg: "#1e1e2e",
    text: WHITE,
    accent: GOLD,
    description: "Exclusive partner discounts",
    features: ["50+ Brands", "Premium Deals", "Member Only"],
    screen: "Brands"
  },
  {
    id: "4",
    title: "Resume Builder",
    amount: "Professional CV",
    icon: "document-text-outline",
    bg: "#f8f8f8",
    text: DARK,
    accent: DARK,
    description: "Create your perfect resume",
    features: ["Templates", "ATS Friendly", "Export PDF"],
    screen: "Resume"
  },
  {
    id: "2",
    title: "Career & Jobs",
    amount: "Top Opportunities",
    icon: "briefcase-outline",
    bg: WHITE,
    text: DARK,
    accent: DARK,
    description: "Find your dream career",
    features: ["500+ Jobs", "Remote Work", "Internships"],
    screen: "Career"
  },
  {
    id: "3",
    title: "Skills & Events",
    amount: "Learn & Connect",
    icon: "school-outline",
    bg: "#1e1e2e",
    text: WHITE,
    accent: GOLD,
    description: "Skillshare + Events combo",
    features: ["100+ Courses", "Live Events", "Networking"],
    screen: "Dashboard"
  },
];

// ─── Optimized FadeInView ──────────────────────────────────────────────────
const FadeInView = React.memo(({ delay = 0, children, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
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

// ─── Feature Card ──────────────────────────────────────────────────────────
const FeatureCard = React.memo(({ feature, onPress }) => {
  const gradientColors = feature.gradient || ['#f9c349', '#f9c349'];

  return (
    <View style={{ width: (width - 48) / 3 }}>
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
          <Ionicons name={feature.icon} size={22} color={gradientColors[0]} />
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
});

// ─── Offer Card ────────────────────────────────────────────────────────────
const ModernOfferCard = React.memo(({ offer, index, onPress }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDiscount = index === 0;

  useEffect(() => {
    const delay = Math.min(index * 100, 300);
    Animated.timing(translateY, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  const yOffset = translateY.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View style={{
      width: (width - 50) / 2,
      transform: [{ translateY: yOffset }],
    }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <Animated.View
          style={[
            styles.offerCard,
            {
              backgroundColor: offer.bg,
              transform: [{ scale: scaleAnim }],
              borderColor: offer.accent + '30',
            }
          ]}
        >
          <View style={styles.offerHeader}>
            <View style={[styles.offerIconWrap, { backgroundColor: offer.accent + "22", borderColor: offer.accent + '40' }]}>
              <Ionicons name={offer.icon} size={18} color={offer.accent} />
            </View>
            {isDiscount ? (
              <View style={[styles.offerBadge, { backgroundColor: offer.accent }]}>
                <Text style={[styles.offerBadgeText, { color: offer.bg }]}>DISCOUNT</Text>
              </View>
            ) : (
              <View style={[styles.offerBadge, { backgroundColor: offer.accent }]}>
                <Text style={[styles.offerBadgeText, { color: index === 3 ? WHITE : offer.bg }]}>
                  {index === 3 ? 'PRO' : 'HOT'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.offerBody}>
            <Text style={[styles.offerAmount, { color: offer.text }]}>{offer.amount}</Text>
            <Text style={[styles.offerLabel, { color: offer.text + "99" }]}>{offer.title}</Text>
            <Text style={[styles.offerDescription, { color: offer.text + "77" }]}>{offer.description}</Text>
          </View>

          <View style={styles.offerFooter}>
            <View style={styles.offerTags}>
              {offer.features.slice(0, 2).map((feature, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.offerTag,
                    { backgroundColor: offer.accent + '20' }
                  ]}
                >
                  <Text style={[styles.offerTagText, { color: offer.accent }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.offerProgress}>
            <View style={[styles.offerProgressBar, { backgroundColor: offer.accent + '20' }]}>
              <Animated.View
                style={[
                  styles.offerProgressFill,
                  {
                    backgroundColor: offer.accent,
                    width: `${Math.min((index + 1) * 25, 100)}%`,
                  }
                ]}
              />
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Section Header ────────────────────────────────────────────────────────
const SectionHeader = React.memo(({ title, sub, onViewAll }) => {
  return (
    <View style={sectionStyles.row}>
      <View>
        <Text style={sectionStyles.title}>{title}</Text>
        {!!sub && <Text style={sectionStyles.sub}>{sub}</Text>}
      </View>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll}>
          <Text style={sectionStyles.link}>View all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const sectionStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "800", color: DARK, letterSpacing: -0.2 },
  sub: { fontSize: 12, color: MUTED, marginTop: 2 },
  link: { fontSize: 13, color: GOLD, fontWeight: "700" },
});

// ─── Main Home Component ──────────────────────────────────────────────────
export default function Home({ navigation }) {
  const [isChatVisible, setChatVisible] = useState(false);
  const { isGuest } = useContext(AuthContext);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  const parentNavigation = navigation.getParent();

  // Animations
  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

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

    animations.forEach(anim => anim.start());

    Animated.timing(badgeAnim, {
      toValue: 1,
      duration: 400,
      delay: 1000,
      useNativeDriver: true,
    }).start();

    return () => {
      animations.forEach(anim => anim.stop());
    };
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

  // Query for slider data only
  const { data: homeData, refetch, isRefetching } = useQuery({
    queryKey: ["homeData"],
    queryFn: async () => {
      const res = await api.get("/home-endpoint");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });

  const onRefresh = useCallback(() => refetch(), [refetch]);

  const handleFeaturePress = useCallback((screen) => {
    if (!navigation) return;

    const screensWithoutHeader = ['Brands', 'Travelling', 'Social', 'Dashboard', 'Events', 'Profile'];
    
    if (screensWithoutHeader.includes(screen)) {
      if (parentNavigation) {
        parentNavigation.navigate(screen, { timestamp: Date.now() });
      } else {
        navigation.navigate(screen);
      }
    } else {
      navigation.navigate(screen);
    }
  }, [navigation, parentNavigation]);

  const handleOfferPress = useCallback((offer) => {
    if (!navigation) return;
    
    if (offer.screen) {
      const screensWithoutHeader = ['Brands', 'Travelling', 'Social', 'Dashboard', 'Events', 'Profile', 'Resume', 'Career'];
      
      if (screensWithoutHeader.includes(offer.screen)) {
        if (parentNavigation) {
          parentNavigation.navigate(offer.screen, {
            timestamp: Date.now(),
            fromOffer: offer.title
          });
        } else {
          navigation.navigate(offer.screen);
        }
      } else {
        navigation.navigate(offer.screen);
      }
    } else {
      Alert.alert("Coming Soon", `${offer.title} - More details coming soon!`, [{ text: "OK" }]);
    }
  }, [navigation, parentNavigation]);

  const handleViewAll = useCallback(() => {
    Alert.alert("Coming Soon", "More features are on their way!", [{ text: "OK" }]);
  }, []);

  // Memoized offer rows
  const offerRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < OFFERS.length; i += 2) {
      rows.push(OFFERS.slice(i, i + 2));
    }
    return rows;
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
              refreshing={isRefetching}
              onRefresh={onRefresh}
              colors={[GOLD]}
              tintColor={GOLD}
              progressBackgroundColor={WHITE}
            />
          }
        >
          <Animated.View style={{ 
            opacity: headerFade, 
            transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] 
          }}>
            <Slider data={homeData?.sliders} />
          </Animated.View>

          <View style={styles.content}>
            {/* Features - Static content, no skeleton needed */}
            <FadeInView delay={200}>
              <SectionHeader title="Explore Features" sub="All you need in one place" onViewAll={handleViewAll} />
            </FadeInView>

            <View style={styles.featuresGrid}>
              {FEATURES.map((feat) => (
                <FeatureCard
                  key={feat.id}
                  feature={feat}
                  onPress={() => handleFeaturePress(feat.screen)}
                />
              ))}
            </View>

           

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </View>

      {/* Floating AI Button */}
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

      {/* Chat Modal */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  scrollContent: { paddingBottom: 20 },
  content: { paddingHorizontal: 16 },
  bottomSpacer: { height: 100 },

  featuresGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 8, 
    justifyContent: 'flex-start' 
  },
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

  offersRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  offerCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 155,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  offerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offerBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  offerBody: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 6,
  },
  offerAmount: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  offerLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 2,
  },
  offerDescription: {
    fontSize: 9,
    fontWeight: "400",
    marginTop: 2,
    lineHeight: 12,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  offerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  offerTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offerTagText: {
    fontSize: 7,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  offerProgress: {
    marginTop: 8,
  },
  offerProgressBar: {
    height: 2.5,
    borderRadius: 2,
    overflow: 'hidden',
  },
  offerProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

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