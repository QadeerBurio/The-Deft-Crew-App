import React, { useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,  
  TouchableOpacity, 
  StatusBar,
  Animated,
  Linking,
  Dimensions,
  Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import { SafeAreaView } from "react-native-safe-area-context";

import { color as T, font as F } from "../theme/tokens";
const { width, height } = Dimensions.get("window");

export default function PrivacyScreen() {
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.9)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const cardAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;
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

  const openEmail = () => Linking.openURL("mailto:info@thedeftcrew.com");

  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  const privacyPoints = [
    {
      icon: "database-lock-outline",
      title: "Data Collection",
      content: "Only what we need, like your university ID, to verify you're a student.",
      color: T.yellow
    },
    {
      icon: "eye-off-outline",
      title: "We don't sell your data",
      content: "Your personal details stay with us.",
      color: "#4ecdc4"
    },
    {
      icon: "shield-key-outline",
      title: "End-to-End Encryption",
      content: "Your sensitive info and student profile are protected.",
      color: "#6c5ce7"
    },
    {
      icon: "bell-ring-outline",
      title: "Notifications",
      content: "We only message you about internships, exchange programs and deals.",
      color: "#fd79a8"
    },
    {
      icon: "account-cancel-outline",
      title: "Delete Any Time",
      content: "Delete your account and all your data whenever you want.",
      color: "#ffa502"
    },
  ];

  const PrivacyCard = ({ icon, title, content, color, index }) => {
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
          styles.privacyWrapper,
          {
            opacity: cardAnims[index],
            transform: [{ translateX }, { scale }],
          },
        ]}
      >
        <View style={styles.privacyCard}>
          <Animated.View 
            style={[
              styles.privacyIconBox,
              { 
                backgroundColor: color + '12',
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <LinearGradient
              colors={[color, color]}
              style={styles.privacyIconGradient}
            >
              <MaterialCommunityIcons name={icon} size={18} color={T.white} />
            </LinearGradient>
          </Animated.View>
          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>{title}</Text>
            <Text style={styles.privacyText}>{content}</Text>
            <View style={[styles.privacyLine, { backgroundColor: color }]} />
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
        <Text style={styles.headerTitle}>Privacy Center</Text>
        <View style={{ width: 34 }} />
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Banner - Compact */}
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
              
              
              
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>TRUST & SAFETY</Text>
              </View>
              <Text style={styles.heroTitle}>Your Privacy Matters</Text>
              <Text style={styles.heroSubtitle}>
                Your data is encrypted and stays private.
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

          {/* Privacy Points - Compact */}
          <View style={styles.privacySection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Data Handling</Text>
              <View style={styles.sectionLine} />
            </View>
            {privacyPoints.map((point, index) => (
              <PrivacyCard key={index} {...point} index={index} />
            ))}
          </View>

          {/* Contact Support - Compact */}
          <Animated.View 
            style={[
              styles.contactWrapper,
              {
                transform: [{ translateY: slideUpAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            <LinearGradient
              colors={[T.ink, T.ink]}
              style={styles.contactCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.contactIconBox}>
                <LinearGradient
                  colors={[T.yellow, '#e6b800']}
                  style={styles.contactIconGradient}
                >
                  <MaterialCommunityIcons name="email-outline" size={20} color={T.ink} />
                </LinearGradient>
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>Have Questions?</Text>
                <Text style={styles.contactText}>info@gettdc.pk</Text>
              </View>
              <TouchableOpacity 
                style={styles.contactArrow}
                onPress={openEmail}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-forward" size={16} color={T.yellow} />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

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
    fontSize: 8,
    fontFamily: F.bodyBold,
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: F.heading,
    color: T.white,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
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
  
  // Privacy Section - Compact
  privacySection: {
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
  privacyWrapper: {
    marginBottom: 8,
  },
  privacyCard: {
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
  privacyIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  privacyIconGradient: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 13,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  privacyText: {
    fontSize: 11,
    color: T.textFaint,
    lineHeight: 16,
    fontFamily: F.body,
  },
  privacyLine: {
    height: 2,
    width: 30,
    borderRadius: 1,
    marginTop: 6,
    opacity: 0.3,
  },
  
  // Contact Section - Compact
  contactWrapper: {
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
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  contactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  contactIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 13,
    fontFamily: F.bodyBold,
    color: T.white,
    marginBottom: 1,
    letterSpacing: 0.2,
  },
  contactText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: F.body,
  },
  contactArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
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