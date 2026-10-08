import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import { SafeAreaView } from "react-native-safe-area-context";

import { color as T, font as F } from "../theme/tokens";
const { width, height } = Dimensions.get("window");

const STEPS = [
  {
    number: "01",
    icon: "account-check-outline",
    title: "Verify You're a Student",
    desc: "Sign up with your university details to unlock student-only deals.",
    color: T.yellow,
    tag: "Start",
  },
  {
    number: "02",
    icon: "ticket-percent-outline",
    title: "Save on Brands",
    desc: "Scan with your tdc app at 100+ brands and save on the spot.",
    color: "#4ecdc4",
    tag: "Discounts",
  },
  {
    number: "03",
    icon: "account-group-outline",
    title: "Skills Share",
    desc: "Team up with other students, share what you know, build projects.",
    color: "#a29bfe",
    tag: "Collaborate",
  },
  {
    number: "04",
    icon: "calendar-star-outline",
    title: "Events",
    desc: "Get into workshops, seminars and networking events.",
    color: "#fd79a8",
    tag: "Events",
  },
  {
    number: "05",
    icon: "file-document-outline",
    title: "Resume Builder",
    desc: "Build an ATS-friendly resume with AI suggestions.",
    color: "#00b894",
    tag: "Career",
  },
  {
    number: "06",
    icon: "briefcase-search-outline",
    title: "Career Growth",
    desc: "Get early access to internships, jobs and exchange programs.",
    color: "#6c5ce7",
    tag: "Growth",
  },
  {
    number: "07",
    icon: "airplane-takeoff",
    title: "Travel AI Assistant",
    desc: "Plan trips with AI, plus rewards as you level up in tdc Privilege",
    color: T.danger,
    tag: "Rewards",
  },
  {
    number: "08",
    icon: "account-multiple-outline",
    title: "Social Media Hub",
    desc: "Post, Confess, Connect and grow your network across tdc social feeds.",
    color: "#0984e3",
    tag: "Social",
  },
];

const STEP_COUNT = STEPS.length;

export default function HowItWorks() {
  const navigation = useNavigation();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.9)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Step animations — exactly STEP_COUNT entries
  const stepAnims = useRef(
    Array.from({ length: STEP_COUNT }, () => new Animated.Value(0))
  ).current;

  // Particle animations
  const particleAnims = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Hero rotation
    const rotateHero = Animated.loop(
      Animated.sequence([
        Animated.timing(heroRotate, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true,
        }),
        Animated.timing(heroRotate, {
          toValue: 0,
          duration: 20000,
          useNativeDriver: true,
        }),
      ])
    );
    rotateHero.start();

    // Glow pulse
    const glowPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    glowPulse.start();

    // Pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Particles
    particleAnims.forEach((anim) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 1500 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1500 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false, // width % is not supported by native driver
    }).start();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(heroScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      ...stepAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(150 + i * 100),
          Animated.spring(anim, {
            toValue: 1,
            friction: 6,
            tension: 45,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    return () => {
      rotateHero.stop();
      glowPulse.stop();
      pulse.stop();
    };
  }, [
    fadeAnim,
    headerFade,
    heroScale,
    slideUpAnim,
    heroRotate,
    glowAnim,
    pulseAnim,
    progressAnim,
    stepAnims,
    particleAnims,
  ]);

  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // ----- Step -----
  const Step = ({ number, title, desc, icon, color, index, isLast, tag }) => {
    const anim = stepAnims[index];

    // Guard: if animation is somehow undefined, render with a static value
    const safeAnim = anim || new Animated.Value(1);

    const translateX = safeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [index % 2 === 0 ? -30 : 30, 0],
    });

    const scale = safeAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.85, 1.02, 1],
    });

    const lineHeight = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0%", "100%"],
    });

    return (
      <Animated.View
        style={[
          styles.stepWrapper,
          {
            opacity: safeAnim,
            transform: [{ translateX }, { scale }],
          },
        ]}
      >
        <View style={styles.stepContainer}>
          <View style={styles.leftColumn}>
            <Animated.View
              style={[
                styles.iconCircle,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <LinearGradient colors={[color, color]} style={styles.iconGradient}>
                <MaterialCommunityIcons name={icon} size={20} color={T.white} />
              </LinearGradient>
              <View style={[styles.numberBadge, { backgroundColor: color }]}>
                <Text style={styles.numberText}>{number}</Text>
              </View>
            </Animated.View>

            {!isLast && (
              <Animated.View
                style={[
                  styles.verticalLine,
                  {
                    height: lineHeight,
                    backgroundColor: color,
                  },
                ]}
              />
            )}
          </View>

          <View style={styles.rightColumn}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{title}</Text>
              <View style={[styles.stepTag, { backgroundColor: color + "15" }]}>
                <Text style={[styles.stepTagText, { color }]}>{tag}</Text>
              </View>
            </View>
            <Text style={styles.stepDesc}>{desc}</Text>
            <View style={styles.stepProgress}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: progressWidth, backgroundColor: color },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  // ----- Particle -----
  const Particle = ({ index }) => {
    const particleColors = [
      T.yellow,
      "#4ecdc4",
      "#6c5ce7",
      T.danger,
      "#a29bfe",
      "#fd79a8",
    ];
    const color = particleColors[index % particleColors.length];
    const anim = particleAnims[index];

    // Guard against undefined
    const safeAnim = anim || new Animated.Value(0);

    const translateY = safeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -10 - (index + 1) * 3],
    });

    const opacity = safeAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.15, 0.5, 0.15],
    });

    return (
      <Animated.View
        style={[
          styles.particle,
          {
            top: 10 + ((index * 13) % 80),
            left: 10 + ((index * 17) % 80),
            backgroundColor: color,
            transform: [{ translateY }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={T.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>how it works</Text>
        <View style={{ width: 34 }} />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Hero */}
          <Animated.View
            style={[
              styles.heroWrapper,
              {
                transform: [{ scale: heroScale }, { translateY: slideUpAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[T.ink, T.ink]}
              style={styles.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.View style={[styles.heroGlow, { opacity: glowOpacity }]} />

              <Animated.View
                style={[styles.heroIconCircle, { transform: [{ rotate: spin }] }]}
              >
                <LinearGradient
                  colors={[T.yellow, "#e6b800"]}
                  style={styles.heroIconGradient}
                >
                  <MaterialCommunityIcons
                    name="lightbulb-on-outline"
                    size={28}
                    color={T.ink}
                  />
                </LinearGradient>
              </Animated.View>

              <Text style={styles.heroLabel}>tdc ecosystem</Text>
              <Text style={styles.heroTitle}>start here</Text>
              <Text style={styles.heroSubtitle}>
                {STEP_COUNT} steps to get the most out of tdc.
              </Text>

              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>

              <View style={styles.particlesContainer}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Particle key={i} index={i} />
                ))}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>your journey</Text>
              <View style={styles.sectionLine} />
            </View>

            {STEPS.map((step, index) => (
              <Step
                key={index}
                {...step}
                index={index}
                isLast={index === STEPS.length - 1}
              />
            ))}
          </View>

          {/* CTA */}
          <Animated.View
            style={[
              styles.ctaWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.ctaButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("HomeTabs")}
            >
              <LinearGradient
                colors={[T.yellow, "#e6b800"]}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaText}>get started</Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={T.ink}
                  style={{ marginLeft: 8 }}
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>
              tdc<Text style={{ color: T.yellow }}>.</Text>
            </Text>
            <Text style={styles.footerText}>
              building a stronger student economy.
            </Text>
            <Text style={styles.footerSubText}>
              © 2026 tdc Privilege Program
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.paper,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: T.sand,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.line,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.ink,
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingBottom: 30,
    paddingTop: 4,
  },

  heroWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroCard: {
    padding: 20,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    minHeight: 190,
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: T.yellow,
    opacity: 0.3,
  },
  particlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  heroIconCircle: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  heroIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroLabel: {
    color: T.yellow,
    fontSize: 8,
    fontFamily: F.bodyBold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroTitle: {
    color: T.white,
    fontSize: 18,
    fontFamily: F.heading,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: F.body,
    paddingHorizontal: 4,
  },
  decorLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    opacity: 0.4,
  },
  decorSegment: {
    width: 20,
    height: 1.5,
    backgroundColor: T.yellow,
    borderRadius: 1,
  },
  decorDiamond: {
    width: 5,
    height: 5,
    backgroundColor: T.yellow,
    transform: [{ rotate: "45deg" }],
    marginHorizontal: 8,
  },

  timelineContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.yellow,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.ink,
    letterSpacing: 0.3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.sand,
    marginLeft: 10,
  },

  stepWrapper: {
    marginBottom: 4,
  },
  stepContainer: {
    flexDirection: "row",
    padding: 2,
  },
  leftColumn: {
    alignItems: "center",
    marginRight: 12,
    width: 48,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  numberBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: T.white,
  },
  numberText: {
    color: T.ink,
    fontSize: 9,
    fontFamily: F.bodyBold,
  },
  verticalLine: {
    width: 2.5,
    flex: 1,
    backgroundColor: T.sand,
    marginVertical: 4,
    borderRadius: 1.5,
    minHeight: 20,
  },
  rightColumn: {
    flex: 1,
    paddingBottom: 20,
    paddingTop: 2,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontFamily: F.bodyBold,
    color: T.ink,
    flex: 1,
    letterSpacing: 0.2,
  },
  stepTag: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  stepTagText: {
    fontSize: 8,
    fontFamily: F.bodyBold,
    letterSpacing: 0.3,
  },
  stepDesc: {
    fontSize: 11,
    color: T.textFaint,
    lineHeight: 16,
    fontFamily: F.body,
    marginBottom: 4,
  },
  stepProgress: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 2.5,
    backgroundColor: T.sand,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },

  ctaWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ctaButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  ctaGradient: {
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  ctaText: {
    color: T.ink,
    fontSize: 14,
    fontFamily: F.bodyBold,
    letterSpacing: 0.5,
    textTransform: 'none',
  },

  footer: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 4,
  },
  footerLogo: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.ink,
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 10,
    color: T.textMuted,
    marginTop: 4,
    fontFamily: F.body,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  footerSubText: {
    fontSize: 9,
    color: T.textMuted,
    marginTop: 4,
    fontFamily: F.body,
    letterSpacing: 0.3,
  },
});