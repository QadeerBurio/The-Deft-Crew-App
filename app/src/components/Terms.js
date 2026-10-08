import React, { useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Animated,
  Dimensions,
  Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import { SafeAreaView } from "react-native-safe-area-context";

import { color as T, font as F } from "../theme/tokens";
const { width, height } = Dimensions.get("window");

export default function TermsScreen() {
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.9)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const cardAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hero rotation animation
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

    // Glow pulse animation
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

    // Pulse animation
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

    // Main entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      ...cardAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(150 + i * 100),
          Animated.spring(anim, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  const terms = [
    {
      icon: "account-check-outline",
      title: "Student Eligibility",
      content: "tdc is only for verified university students & alumni. You'll need valid student credentials.",
      color: T.yellow
    },
    {
      icon: "briefcase-search-outline",
      title: "Career & Internships",
      content: "We connect you with employers. We can't guarantee you a job.",
      color: "#4ecdc4"
    },
    {
      icon: "airplane-takeoff",
      title: "AI Travel & Exchange",
      content: "Travel suggestions are AI-generated. Check prices, bookings and visa rules before you go.",
      color: "#6c5ce7"
    },
    {
      icon: "tag-text-outline",
      title: "Brand Redemption",
      content: "Deals depend on the brand. tdc isn't responsible for their service.",
      color: "#fd79a8"
    },
    {
      icon: "shield-key-outline",
      title: "Account Integrity",
      content: "Sharing your account with non-verfied user can get it permanently banned.",
      color: "#ffa502"
    },
    {
      icon: "gavel",
      title: "Governing Law",
      content: "These terms follow Pakistani law. Disputes go to Pakistani courts",
      color: T.danger
    },
  ];

  const TermCard = ({ icon, title, content, color, index }) => {
    const translateX = cardAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [index % 2 === 0 ? -25 : 25, 0],
    });

    const scale = cardAnims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.85, 1.02, 1],
    });

    return (
      <Animated.View
        style={[
          styles.termWrapper,
          {
            opacity: cardAnims[index],
            transform: [{ translateX }, { scale }],
          },
        ]}
      >
        <View style={styles.termCard}>
          <Animated.View 
            style={[
              styles.termIconBox,
              { 
                backgroundColor: color + '12',
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <LinearGradient
              colors={[color, color]}
              style={styles.termIconGradient}
            >
              <MaterialCommunityIcons name={icon} size={18} color={T.white} />
            </LinearGradient>
          </Animated.View>
          <View style={styles.termContent}>
            <Text style={styles.termTitle}>{title}</Text>
            <Text style={styles.termText}>{content}</Text>
            <View style={[styles.termLine, { backgroundColor: color }]} />
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Header - Compact */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={T.ink} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <Text style={styles.headerSubtitle}>Updated March 2026</Text>
        </View>
        <View style={{ width: 34 }} />
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Section - Compact */}
          <Animated.View 
            style={[
              styles.heroWrapper,
              { 
                transform: [
                  { scale: heroScale },
                  { translateY: slideUpAnim },
                ] 
              }
            ]}
          >
            <LinearGradient
              colors={[T.ink, T.ink]}
              style={styles.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.View
                style={[
                  styles.heroGlow,
                  { opacity: glowOpacity },
                ]}
              />
              
              
              
             
              <Text style={styles.heroTitle}>The Rules</Text>
              <Text style={styles.heroSubtitle}>
                By using tdc, you agree to these terms. Here's the short version.
              </Text>
              
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>

              {/* Floating particles */}
              <View style={styles.particlesContainer}>
                {[...Array(6)].map((_, i) => {
                  const particleAnim = useRef(new Animated.Value(0)).current;
                  
                  useEffect(() => {
                    Animated.loop(
                      Animated.sequence([
                        Animated.timing(particleAnim, {
                          toValue: 1,
                          duration: 1500 + Math.random() * 1000,
                          useNativeDriver: true,
                        }),
                        Animated.timing(particleAnim, {
                          toValue: 0,
                          duration: 1500 + Math.random() * 1000,
                          useNativeDriver: true,
                        }),
                      ])
                    ).start();
                  }, []);

                  const particleTranslateY = particleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10 - Math.random() * 15],
                  });

                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.particle,
                        {
                          top: 10 + Math.random() * 80,
                          left: 10 + Math.random() * 80,
                          backgroundColor: [T.yellow, '#4ecdc4', '#6c5ce7', T.danger, '#a29bfe', '#fd79a8'][i % 6],
                          transform: [{ translateY: particleTranslateY }],
                          opacity: particleAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.15, 0.5, 0.15],
                          }),
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Terms Sections - Compact */}
          <View style={styles.termsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Terms & Conditions</Text>
              <View style={styles.sectionLine} />
            </View>
            {terms.map((item, index) => (
              <TermCard key={index} {...item} index={index} />
            ))}
          </View>

         

          {/* Footer - Compact */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>tdc<Text style={{color:T.yellow}}>.</Text></Text>
            <Text style={styles.footerText}>Building a Stronger Student Economy.</Text>
            <Text style={styles.footerSubText}>© 2026 tdc Privilege Program</Text>
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
  
  // Header - Compact
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.line,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.ink,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 9,
    color: T.textFaint,
    marginTop: 1,
    fontFamily: F.bodyMedium,
  },
  scrollContent: {
    paddingBottom: 30,
    paddingTop: 4,
  },
  
  // Hero - Compact
  heroWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroCard: {
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: T.yellow,
    opacity: 0.3,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  heroIconCircle: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroBadge: {
    backgroundColor: T.yellowSoft,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: T.line,
  },
  heroBadgeText: {
    color: T.yellow,
    fontSize: 14,
    fontFamily: F.bodyBold,
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 25,
    fontFamily: F.heading,
    color: T.white,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: T.yellow,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: F.body,
    paddingHorizontal: 4,
  },
  decorLine: {
    flexDirection: 'row',
    alignItems: 'center',
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
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 8,
  },
  
  // Terms Section - Compact
  termsSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  termWrapper: {
    marginBottom: 8,
  },
  termCard: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  termIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  termIconGradient: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termContent: {
    flex: 1,
  },
  termTitle: {
    fontSize: 13,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  termText: {
    fontSize: 11,
    color: T.textFaint,
    lineHeight: 16,
    fontFamily: F.body,
  },
  termLine: {
    height: 2,
    width: 30,
    borderRadius: 1,
    marginTop: 6,
    opacity: 0.3,
  },
  
  // Notice Card - Compact
  noticeWrapper: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  noticeCard: {
    padding: 18,
    alignItems: 'center',
  },
  noticeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  noticeIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeTitle: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.white,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  noticeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: F.body,
    marginBottom: 10,
  },
  noticeCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.yellowSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.line,
  },
  noticeCheckText: {
    fontSize: 11,
    fontFamily: F.bodySemi,
    color: T.white,
    marginLeft: 6,
  },
  
  // Footer - Compact
  footer: {
    alignItems: 'center',
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
    textAlign: 'center',
  },
  footerSubText: {
    fontSize: 9,
    color: T.textMuted,
    marginTop: 4,
    fontFamily: F.body,
    letterSpacing: 0.3,
  },
});