import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StatusBar,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";

const { width, height } = Dimensions.get("window");

const ONBOARDING_DATA = [
  {
    id: "1",
    title: "Students Deals",
    tagline: "Pay Students Prices",
    description:
      "Discounts at favourite cafes, restaurants, salons and stores. Just.",
    offer: "Discount",
    icon: "pricetags-outline",
    stat: "Upto 50% Off",
    category: "Savings",
  },
  {
    id: "2",
    title: "Career",
    tagline: "Internships & Jobs",
    description:
      "Find internships, mentorship and career workshops before everyone else does",
    offer: "GET AHEAD",
    icon: "briefcase-outline",
    stat: "Career Hub",
    category: "CAREER HUB",
  },
  {
    id: "3",
    title: "SKILL UP",
    tagline: "Learn From Peers",
    description:
      "Teach what you know, learn what you don't. Team up with students on real projects.",
    offer: "SKILL UP",
    icon: "school-outline",
    stat: "LEARN, SHARE & EARN",
    category: "Learning",
  },
  {
    id: "4",
    title: "Resume Builder",
    tagline: "ATS-FRIENDLY",
    description:
      "Build a clean, ATS-friendly resume in minutes with AI suggestions.",
    offer: "STAND OUT",
    icon: "document-text-outline",
    stat: "AI-Powered",
    category: "Career",
  },
  {
    id: "5",
    title: "Events",
    tagline: "NETWORK & CONNECT",
    description:
      "Workshops, seminars and networking events. Meet people who can open doors.",
    offer: "GET IN",
    icon: "calendar-outline",
    stat: "Near You",
    category: "Events",
  },
  {
    id: "6",
    title: "Travel With AI",
    tagline: "TRAVEL ASSISTANT",
    description:
      "Plan trips, routes and budgets in seconds with your AI travel assistant.",
    offer: "PLAN SMART",
    icon: "airplane-outline",
    stat: "AI Planner",
    category: "AI Assistant",
  },
  {
    id: "7",
    title: "Global Reach",
    tagline: "SCHOLARSHIPS PROGRAMS",
    description:
      "Discover exchange programs and international university opportunities.",
    offer: "STUDY ABROAD",
    icon: "globe-outline",
    stat: "Go Global",
    category: "SCHOLARSHIPS",
  },
];

export default function Splash({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [videoFinished, setVideoFinished] = useState(false);

  const videoRef = useRef(null);

  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const cardEntry = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef(null);

  /* ------------------------------------------------------------
   * 1. Startup: kick off pulse animation for onboarding button
   *    (video handles the splash, so no splash logo animations here)
   * ------------------------------------------------------------ */
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Safety fallback: if video never signals finish, force it after 10s
    const fallback = setTimeout(() => {
      setVideoFinished(true);
    }, 10000);

    return () => clearTimeout(fallback);
  }, []);

  /* ------------------------------------------------------------
   * 2. When video finishes → decide next route
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (videoFinished) {
      proceedAfterSplash();
    }
  }, [videoFinished]);

  const proceedAfterSplash = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem("onboardingComplete");
      const alreadyLaunched = await AsyncStorage.getItem("alreadyLaunched");

      if (onboardingComplete === "true" || alreadyLaunched === "true") {
        // Returning user → skip onboarding
        navigation.replace("Privacy");
      } else {
        // First launch → show onboarding slides
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(logoRotate, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (e) {
      navigation.replace("Privacy");
    }
  };

  /* ------------------------------------------------------------
   * 3. Content entry animation on each slide change
   * ------------------------------------------------------------ */
  useEffect(() => {
    slideUp.setValue(50);
    cardEntry.setValue(0);

    Animated.parallel([
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(cardEntry, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex]);

  /* ------------------------------------------------------------
   * 4. Handlers
   * ------------------------------------------------------------ */
  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem("alreadyLaunched", "true");
      await AsyncStorage.setItem("onboardingComplete", "true");
      navigation.replace("Privacy");
    } catch (e) {
      navigation.replace("Privacy");
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  /* ------------------------------------------------------------
   * 5. VIDEO SPLASH SCREEN
   * ------------------------------------------------------------ */
  const VideoSplash = () => (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" />
      <View style={styles.splashContainer}>
        <Video
          ref={videoRef}
          source={require("../../../assets/tdc.mp4")}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          isMuted={false}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && status.didJustFinish) {
              setVideoFinished(true);
            }
            if (status.error) {
              console.warn("Video error:", status.error);
              setVideoFinished(true);
            }
          }}
        />
      </View>
    </View>
  );

  /* ------------------------------------------------------------
   * 6. LUXURY CARD (onboarding)
   * ------------------------------------------------------------ */
  const LuxuryCard = ({ item, index }) => {
    const cardScale = scrollX.interpolate({
      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
      outputRange: [0.88, 1, 0.88],
      extrapolate: "clamp",
    });

    const cardTranslateY = scrollX.interpolate({
      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
      outputRange: [20, 0, 20],
      extrapolate: "clamp",
    });

    const cardOpacity = scrollX.interpolate({
      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
      outputRange: [0.5, 1, 0.5],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.cardOuter,
          {
            opacity: cardOpacity,
            transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
          },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.cardBorder} />

          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={28} color="#f9c349" />
              </View>
              <View style={styles.statContainer}>
                <Text style={styles.statValue}>{item.stat}</Text>
              </View>
            </View>

            <View style={styles.cardMiddle}>
              <Text style={styles.offerText}>{item.offer}</Text>
              <View style={styles.taglineContainer}>
                <Text style={styles.taglineText}>{item.tagline}</Text>
              </View>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberLabel}>CATEGORY</Text>
                <Text style={styles.memberId}>{item.category}</Text>
              </View>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>ACTIVE</Text>
              </View>
            </View>
          </View>

          <View style={[styles.cornerAccent, styles.topLeftAccent]} />
          <View style={[styles.cornerAccent, styles.bottomRightAccent]} />
        </View>
      </Animated.View>
    );
  };

  /* ------------------------------------------------------------
   * 7. Render
   * ------------------------------------------------------------ */
  if (loading) return <VideoSplash />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {currentIndex < ONBOARDING_DATA.length - 1 && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={completeOnboarding}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.page}>
            <Animated.View
              style={{
                opacity: cardEntry,
                transform: [{ translateY: slideUp }],
              }}
            >
              <LuxuryCard item={item} index={index} />
            </Animated.View>

            <Animated.View
              style={[
                styles.textContainer,
                {
                  opacity: cardEntry,
                  transform: [{ translateY: slideUp }],
                },
              ]}
            >
              <View style={styles.titleAccent}>
                <View style={styles.accentDot} />
                <Text style={styles.titlePrefix}>
                  <Text style={{ color: "black" }}>tdc</Text>. PRIVILEGE
                </Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.titleUnderline} />
              <Text style={styles.description}>{item.description}</Text>
            </Animated.View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.progressContainer}>
          {ONBOARDING_DATA.map((_, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [8, 40, 8],
              extrapolate: "clamp",
            });

            const dotColor = i === currentIndex ? "#f9c349" : "#e0e0e0";

            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    backgroundColor: dotColor,
                  },
                ]}
              />
            );
          })}
        </View>

        <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#000", "#000"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {currentIndex === ONBOARDING_DATA.length - 1
                  ? "GET STARTED"
                  : "NEXT"}
              </Text>
              <Ionicons
                name={
                  currentIndex === ONBOARDING_DATA.length - 1
                    ? "checkmark-circle"
                    : "arrow-forward"
                }
                size={20}
                color="#000"
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.counter}>
          {currentIndex + 1} / {ONBOARDING_DATA.length}
        </Text>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------
 * STYLES
 * ------------------------------------------------------------ */
const styles = StyleSheet.create({
  flex: { flex: 1 },

  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },

  video: {
    width: width,
    height: height,
    position: "absolute",
    top: 0,
    left: 0,
  },

  logoWrapper: { marginBottom: 50 },

  logoOuterRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 5,
  },

  logoInnerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  logoText: {
    fontSize: 38,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -1,
  },

  brandName: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 8,
    marginBottom: 20,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  dividerLine: { width: 40, height: 2, backgroundColor: "#f9c349" },

  dividerDiamond: {
    width: 8,
    height: 8,
    backgroundColor: "#f9c349",
    transform: [{ rotate: "45deg" }],
    marginHorizontal: 10,
  },

  tagline: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    letterSpacing: 3,
    fontWeight: "300",
  },

  bottomInfo: { position: "absolute", bottom: 60 },

  estText: { color: "rgba(255,255,255,0.5)", fontSize: 10 },

  skipButton: {
    position: "absolute",
    top: 60,
    right: 25,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  skipText: {
    color: "#999",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },

  page: {
    width,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: height * 0.01,
  },

  cardOuter: {
    width: width * 0.82,
    height: 260,
    borderRadius: 25,
    elevation: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },

  card: {
    flex: 1,
    borderRadius: 25,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginTop: -30,
  },

  cardBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#f9c349",
  },

  cardContent: {
    flex: 1,
    padding: 30,
    justifyContent: "space-between",
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#f9c349",
  },

  statContainer: {
    backgroundColor: "#000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
  },

  statValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  cardMiddle: { alignItems: "center", paddingVertical: 4 },

  offerText: {
    color: "#000",
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1,
    marginBottom: 8,
  },

  taglineContainer: {
    backgroundColor: "#f9c349",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
  },

  taglineText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },

  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  memberInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  memberLabel: {
    color: "#999",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginRight: 6,
  },

  memberId: { color: "#000", fontSize: 16, fontWeight: "900" },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    marginRight: 6,
  },

  activeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  cornerAccent: { position: "absolute", width: 20, height: 20, borderColor: "#f9c349" },

  topLeftAccent: {
    top: 10,
    left: 10,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },

  bottomRightAccent: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },

  textContainer: {
    paddingHorizontal: 45,
    paddingTop: 20,
    alignItems: "center",
  },

  titleAccent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f9c349",
    marginRight: 8,
  },

  titlePrefix: {
    fontSize: 12,
    color: "#f9c349",
    fontWeight: "800",
    letterSpacing: 3,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#000",
    textAlign: "center",
    letterSpacing: -1,
    marginBottom: 5,
  },

  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: "#f9c349",
    marginBottom: 20,
    borderRadius: 1.5,
  },

  description: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 25,
  },

  footer: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  progressContainer: {
    flexDirection: "row",
    marginBottom: 30,
    alignItems: "center",
    height: 8,
  },

  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    marginTop: 45,
  },

  button: {
    borderRadius: 30,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    width: width * 0.7,
  },

  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 30,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginRight: 2,
    letterSpacing: 1,
    textAlign: "center",
    justifyContent: "center",
  },

  counter: {
    marginTop: 15,
    color: "#ccc",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
  },
});