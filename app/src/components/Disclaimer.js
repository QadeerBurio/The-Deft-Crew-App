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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function DisclaimerScreen() {
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

  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  const disclaimers = [
    {
      icon: "store-remove-outline",
      title: "Offer & Discount Accuracy",
      content: "tdc acts as a bridge between brands and students. We are not liable for the availability, quality, or fulfillment of discounts.",
      color: "#f9c349"
    },
    {
      icon: "briefcase-variant-outline",
      title: "Career Hub & Internships",
      content: "tdc does not guarantee employment or the accuracy of job descriptions provided by external recruiters.",
      color: "#4ecdc4"
    },
    {
      icon: "airplane-off",
      title: "Travel & Global Programs",
      content: "tdc is not responsible for visa rejections, travel delays, or changes in university exchange policies.",
      color: "#6c5ce7"
    },
    {
      icon: "clipboard-check-outline",
      title: "Status Verification",
      content: "Users are responsible for maintaining valid student credentials. tdc reserves the right to modify access.",
      color: "#fd79a8"
    },
    {
      icon: "information-outline",
      title: "Informational Scope",
      content: "tdc is provided 'as is.' We do not warrant that the app will be error-free or rewards redeemable at all times.",
      color: "#ffa502"
    },
  ];

  const DisclaimerCard = ({ icon, title, content, color, index }) => {
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
          styles.disclaimerWrapper,
          {
            opacity: cardAnims[index],
            transform: [{ translateX }, { scale }],
          },
        ]}
      >
        <View style={styles.disclaimerCard}>
          <View style={styles.cardHeader}>
            <Animated.View 
              style={[
                styles.cardIconBox,
                { 
                  backgroundColor: color + '12',
                  transform: [{ scale: pulseAnim }],
                }
              ]}
            >
              <LinearGradient
                colors={[color, color]}
                style={styles.cardIconGradient}
              >
                <MaterialCommunityIcons name={icon} size={18} color="#fff" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <Text style={styles.cardText}>{content}</Text>
          <View style={[styles.cardAccent, { backgroundColor: color }]} />
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa05" />

      {/* Header - Compact */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disclaimer</Text>
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
              colors={['#1a1a1a', '#2d2d2d']}
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
                <Text style={styles.heroBadgeText}>LEGAL NOTICE</Text>
              </View>
              <Text style={styles.heroTitle}>Important Disclaimer</Text>
              <Text style={styles.heroSubtitle}>
                Please read the following legal exclusions regarding the tdc Student Ecosystem.
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
                          backgroundColor: ['#f9c349', '#4ecdc4', '#6c5ce7', '#ff6b6b', '#a29bfe', '#fd79a8'][i % 6],
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

          {/* Warning Banner - Compact */}
          <Animated.View 
            style={[
              styles.warningWrapper,
              { transform: [{ translateY: slideUpAnim }] }
            ]}
          >
            <LinearGradient
              colors={['#f9c349', '#e6b800']}
              style={styles.warningBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.warningIconBox}>
                <Ionicons name="warning-outline" size={18} color="#1a1a1a" />
              </View>
              <Text style={styles.warningText}>
                The following outlines the limitations and exclusions of tdc services.
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Disclaimer Cards - Compact */}
          <View style={styles.disclaimerSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Legal Exclusions</Text>
              <View style={styles.sectionLine} />
            </View>
            {disclaimers.map((item, index) => (
              <DisclaimerCard key={index} {...item} index={index} />
            ))}
          </View>

          {/* Footer - Compact */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
            <Text style={styles.footerBrand}>© 2026 The Deft Crew. All Rights Reserved.</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  
  // Header - Compact
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
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
    backgroundColor: '#f9c349',
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
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  heroBadge: {
    backgroundColor: "rgba(249, 195, 73, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(249, 195, 73, 0.15)",
  },
  heroBadgeText: {
    color: "#f9c349",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
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
    backgroundColor: '#f9c349',
    borderRadius: 1,
  },
  decorDiamond: {
    width: 5,
    height: 5,
    backgroundColor: '#f9c349',
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 8,
  },
  
  // Warning Banner - Compact
  warningWrapper: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  warningIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: '#1a1a1a',
    fontWeight: '600',
    lineHeight: 16,
  },
  
  // Disclaimer Section - Compact
  disclaimerSection: {
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
    backgroundColor: '#f9c349',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginLeft: 10,
  },
  disclaimerWrapper: {
    marginBottom: 8,
  },
  disclaimerCard: {
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  cardIconGradient: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    letterSpacing: 0.2,
  },
  cardText: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    fontWeight: '400',
    paddingLeft: 44,
  },
  cardAccent: {
    height: 2,
    width: 30,
    borderRadius: 1,
    marginTop: 6,
    marginLeft: 44,
    opacity: 0.3,
  },
  
  // Footer - Compact
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 4,
  },
  footerLogo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  footerBrand: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.3)',
    marginTop: 4,
    fontWeight: '400',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});