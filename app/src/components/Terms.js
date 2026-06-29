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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function TermsScreen() {
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.8)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
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
          toValue: 1.1,
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
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      ...cardAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(200 + i * 120),
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
    outputRange: [0.3, 0.6],
  });

  const terms = [
    {
      icon: "account-check-outline",
      title: "Student Eligibility",
      content: "Access is strictly for verified university students. You must provide valid academic credentials to unlock exclusive ecosystem perks.",
      gradient: ['#f9c349', '#f5a623'],
      color: "#f9c349"
    },
    {
      icon: "briefcase-search-outline",
      title: "Career & Internships",
      content: "tdc facilitates connections with employers. We do not guarantee employment and are not liable for the recruitment policies of partner companies.",
      gradient: ['#4ecdc4', '#45b7aa'],
      color: "#4ecdc4"
    },
    {
      icon: "airplane-takeoff",
      title: "Travel & Exchange",
      content: "Travel packages and exchange programs are subject to third-party provider terms and visa regulations of the respective countries.",
      gradient: ['#6c5ce7', '#5a4bd1'],
      color: "#6c5ce7"
    },
    {
      icon: "tag-text-outline",
      title: "Brand Redemption",
      content: "Discounts and offers are subject to brand availability. tdc is a facilitator and is not responsible for inventory or service quality at partner outlets.",
      gradient: ['#fd79a8', '#e84393'],
      color: "#fd79a8"
    },
    {
      icon: "shield-key-outline",
      title: "Account Integrity",
      content: "Your account is personal. Sharing student-exclusive QR codes or credentials with non-students may lead to permanent suspension from the Crew.",
      gradient: ['#ffa502', '#f9a825'],
      color: "#ffa502"
    },
    {
      icon: "gavel",
      title: "Governing Law",
      content: "These terms are governed by the laws of Pakistan. Any disputes shall be settled within the jurisdiction of Pakistani courts.",
      gradient: ['#ff6b6b', '#ee5a24'],
      color: "#ff6b6b"
    },
  ];

  const TermCard = ({ icon, title, content, gradient, color, index }) => {
    const translateX = cardAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [index % 2 === 0 ? -30 : 30, 0],
    });

    const scale = cardAnims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1.05, 1],
    });

    return (
      <Animated.View
        style={[
          styles.termWrapper,
          {
            opacity: cardAnims[index],
            transform: [
              { translateX },
              { scale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#fafafa']}
          style={styles.termCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View 
            style={[
              styles.termIconBox,
              { 
                backgroundColor: color + '15',
                borderColor: color + '30',
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <LinearGradient
              colors={gradient}
              style={styles.termIconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name={icon} size={22} color="#fff" />
            </LinearGradient>
          </Animated.View>
          <View style={styles.termContent}>
            <Text style={styles.termTitle}>{title}</Text>
            <Text style={styles.termText}>{content}</Text>
            <View style={styles.termFooter}>
              <LinearGradient
                colors={gradient}
                style={styles.termLine}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <Text style={styles.headerSubtitle}>Last updated: March 2026</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={22} color="#1a1a1a" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Section */}
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
              colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
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
              
              <Animated.View style={[styles.heroIconCircle, { transform: [{ rotate: spin }] }]}>
                <LinearGradient
                  colors={['#f9c349', '#f5a623']}
                  style={styles.heroIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="file-document-outline" size={40} color="#fff" />
                </LinearGradient>
              </Animated.View>
              
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>THE DEFT CREW ECOSYSTEM</Text>
              </View>
              <Text style={styles.heroTitle}>Legal Framework</Text>
              <Text style={styles.heroSubtitle}>
                By joining the Crew, you agree to these terms. We provide a platform connecting students 
                to global opportunities, discounts, and career growth..
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
                    outputRange: [0, -15 - Math.random() * 20],
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
                            outputRange: [0.2, 0.7, 0.2],
                          }),
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </LinearGradient>
          </Animated.View>

          

          {/* Terms Sections */}
          <View style={styles.termsSection}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.sectionDot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.sectionTitle}>Terms & Conditions</Text>
              <View style={styles.sectionLine} />
            </View>
            {terms.map((item, index) => (
              <TermCard key={index} {...item} index={index} />
            ))}
          </View>

          {/* Agreement Notice */}
          <Animated.View 
            style={[
              styles.noticeWrapper,
              {
                transform: [{ translateY: slideUpAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            <LinearGradient
              colors={['#1a1a1a', '#2d2d2d']}
              style={styles.noticeCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.noticeIconCircle}>
                <LinearGradient
                  colors={['#f9c349', '#f5a623']}
                  style={styles.noticeIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="handshake-outline" size={28} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.noticeTitle}>Your Agreement</Text>
              <Text style={styles.noticeText}>
                By using tdc services, you acknowledge that you have read, understood, and agree to be bound 
                by these terms and conditions.
              </Text>
              <View style={styles.noticeCheckRow}>
                <Ionicons name="checkmark-circle" size={20} color="#f9c349" />
                <Text style={styles.noticeCheckText}>I understand and agree</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Footer */}
          <Animated.View 
            style={[
              styles.footer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#f8f9fa', '#f8f9fa']}
              style={styles.footerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="shield-check" size={28} color="#f9c349" />
              <Text style={styles.footerNote}>
                Designed to protect the interests of the student community.
              </Text>
              <View style={styles.footerLine} />
              <View style={styles.footerBrand}>
                <Text style={styles.footerLogo}>
                  tdc<Text style={styles.footerLogoAccent}>.</Text>
                </Text>
                <Text style={styles.footerText}>Building a Stronger Student Economy</Text>
              </View>
              
              <Text style={styles.footerSubText}>© 2026 tdc Privilege Program</Text>
            </LinearGradient>
          </Animated.View>
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
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 1,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  
  // Hero
  heroWrapper: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#f9c349',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  heroCard: {
    padding: 30,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 320,
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroIconCircle: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#f9c349',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  heroBadge: {
    backgroundColor: "rgba(249, 195, 73, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(249, 195, 73, 0.3)",
  },
  heroBadgeText: {
    color: "#f9c349",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    paddingHorizontal: 5,
  },
  decorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    opacity: 0.6,
  },
  decorSegment: {
    width: 30,
    height: 2,
    backgroundColor: '#f9c349',
    borderRadius: 1,
  },
  decorDiamond: {
    width: 8,
    height: 8,
    backgroundColor: '#f9c349',
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 10,
  },
  
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statCardGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Terms Section
  termsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginLeft: 12,
  },
  termWrapper: {
    marginBottom: 12,
  },
  termCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  termIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  termIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termContent: {
    flex: 1,
  },
  termTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  termText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontWeight: '500',
  },
  termFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  termLine: {
    height: 2,
    width: 40,
    borderRadius: 1,
    opacity: 0.3,
  },
  
  // Notice Card
  noticeWrapper: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  noticeCard: {
    padding: 24,
    alignItems: 'center',
  },
  noticeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  noticeIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  noticeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 16,
  },
  noticeCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249,195,73,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249,195,73,0.2)',
  },
  noticeCheckText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  
  // Footer
  footer: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  footerGradient: {
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 20,
  },
  footerNote: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.6)',
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 10,
    lineHeight: 18,
    marginTop: 8,
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: 12,
  },
  footerBrand: {
    alignItems: 'center',
    marginTop: 12,
  },
  footerLogo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  footerLogoAccent: {
    color: '#f9c349',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.6)',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  
  footerSubText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.3)',
    marginTop: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});