import React, { useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated, Dimensions, Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function WhyPointsScreen() {
  const navigation = useNavigation();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.8)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([...Array(9)].map(() => new Animated.Value(0))).current;
  const statScale = useRef(new Animated.Value(0.5)).current;
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

    // Pulse animation for icons
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
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 500,
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
      Animated.spring(statScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      ...cardAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(150 + i * 100),
          Animated.spring(anim, {
            toValue: 1,
            friction: 7,
            tension: 45,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const benefits = [
    { 
      icon: "briefcase-check-outline", 
      color: "#f9c349", 
      title: "Elite Career Hub Access", 
      desc: "Privilege members get first-look access to premium internships and direct referrals to top-tier partner companies.",
      gradient: ['#f9c349', '#f5a623'],
      category: "Career"
    },
    { 
      icon: "earth-arrow-right", 
      color: "#4ecdc4", 
      title: "Global Exchange Priority", 
      desc: "Unlock priority applications for international student exchange programs and global academic workshops.",
      gradient: ['#4ecdc4', '#45b7aa'],
      category: "Global"
    },
    { 
      icon: "airplane-settings", 
      color: "#6c5ce7", 
      title: "Exclusive Travel Tiers", 
      desc: "Access heavily subsidized student travel packages and 'Privilege-Only' group tours across Pakistan and beyond.",
      gradient: ['#6c5ce7', '#5a4bd1'],
      category: "Travel"
    },
    { 
      icon: "ticket-confirmation-outline", 
      color: "#ff6b6b", 
      title: "Boosted Brand Discounts", 
      desc: "Go beyond standard offers. Privilege status triggers higher percentage discounts at our premium partner brands.",
      gradient: ['#ff6b6b', '#ee5a24'],
      category: "Discounts"
    },
    { 
      icon: "shield-star-outline", 
      color: "#f9c349", 
      title: "Campus Leadership", 
      desc: "Elevation to Privilege status marks you as a verified campus leader with networking opportunities.",
      gradient: ['#f9c349', '#f5a623'],
      category: "Leadership"
    },
    { 
      icon: "account-group-outline", 
      color: "#a29bfe", 
      title: "Skills Share Network", 
      desc: "Connect with fellow students to share expertise, learn new skills, and collaborate on projects across all universities.",
      gradient: ['#a29bfe', '#6c5ce7'],
      category: "Skills"
    },
    { 
      icon: "calendar-star-outline", 
      color: "#fd79a8", 
      title: "Premium Events Access", 
      desc: "Get VIP access to exclusive workshops, seminars, and networking events across universities.",
      gradient: ['#fd79a8', '#e84393'],
      category: "Events"
    },
    { 
      icon: "file-document-outline", 
      color: "#00b894", 
      title: "Smart Resume Builder", 
      desc: "Create ATS-optimized resumes with premium templates, AI-powered suggestions, and instant feedback from industry professionals.",
      gradient: ['#00b894', '#00a381'],
      category: "Career"
    },
    { 
      icon: "star-circle-outline", 
      color: "#fdcb6e", 
      title: "Job Recommendations", 
      desc: "Get personalized job recommendations based on your skills, interests, and network. Exclusive listings from top companies.",
      gradient: ['#fdcb6e', '#f9a825'],
      category: "Career"
    },
  ];

  const statsData = [
    { value: "10", label: "Referrals Needed" },
    { value: "50+", label: "Partner Brands" },
    { value: "100%", label: "Free Access" },
    
  ];

  // Fixed interpolations
  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const BenefitCard = ({ icon, title, desc, color, gradient, index, category }) => {
    // Get the animated value for this card
    const cardAnim = cardAnims[index];
    
    // Create interpolations safely
    const translateX = cardAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [index % 2 === 0 ? -30 : 30, 0],
    });
    
    const scale = cardAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1.05, 1],
    });

    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: cardAnim,
            transform: [
              { translateX },
              { scale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#fafafa']}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            style={[
              styles.iconBox,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: color + '15',
                borderColor: color + '30',
              },
            ]}
          >
            <LinearGradient
              colors={gradient}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name={icon} size={24} color="#fff" />
            </LinearGradient>
          </Animated.View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{title}</Text>
              <View style={[styles.categoryTag, { backgroundColor: color + '20' }]}>
                <Text style={[styles.categoryText, { color: color }]}>{category}</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>{desc}</Text>
            <View style={styles.cardFooter}>
              <LinearGradient
                colors={gradient}
                style={styles.cardLine}
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
        <Text style={styles.headerTitle}>Privilege Benefits</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={22} color="#1a1a1a" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero */}
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
              {/* Animated background glow */}
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
                  <MaterialCommunityIcons name="crown-outline" size={40} color="#fff" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.heroTitle}>Why tdc Privilege Matters</Text>
              <Text style={styles.heroSubtitle}>
                tdc Privilege is your gateway to the full ecosystem. Verified activity unlocks elite rewards, career growth, and global opportunities.
              </Text>
              
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>

              {/* Floating particles */}
              <View style={styles.particlesContainer}>
                {[...Array(8)].map((_, i) => {
                  // Create unique animation values for each particle
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
                    outputRange: [0, -10 - Math.random() * 20],
                  });

                  const particleScale = particleAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.2, 1],
                  });

                  const particleOpacity = particleAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.8, 0.3],
                  });

                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.particle,
                        {
                          top: 5 + Math.random() * 90,
                          left: 5 + Math.random() * 90,
                          backgroundColor: ['#f9c349', '#4ecdc4', '#6c5ce7', '#ff6b6b', '#a29bfe', '#fd79a8'][i % 6],
                          transform: [
                            { translateY: particleTranslateY },
                            { scale: particleScale },
                          ],
                          opacity: particleOpacity,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Benefits */}
          <View style={styles.benefitsSection}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.sectionDot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.sectionTitle}>Exclusive Benefits</Text>
              <View style={styles.sectionLine} />
            </View>
            {benefits.map((item, i) => (
              <BenefitCard key={i} {...item} index={i} />
            ))}
          </View>

          

        

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
              <Text style={styles.footerLogo}>
                tdc<Text style={styles.footerLogoAccent}>.</Text>
              </Text>
              
              <View style={styles.footerLine} />
              
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
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1a1a1a', 
    letterSpacing: 0.5,
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
  
  // Benefits
  benefitsSection: { 
    paddingHorizontal: 16, 
    marginTop: 8,
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
  
  cardWrapper: {
    marginBottom: 12,
  },
  card: { 
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
  iconBox: { 
    width: 52, 
    height: 52, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(249, 195, 73, 0.2)',
  },
  iconGradient: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { 
    flex: 1,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#1a1a1a',
    flex: 1,
    letterSpacing: 0.3,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardDesc: { 
    fontSize: 12, 
    color: '#666', 
    lineHeight: 18, 
    fontWeight: '500',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLine: {
    height: 2,
    width: 40,
    borderRadius: 1,
    opacity: 0.3,
  },
  
  // Stats
  statsWrapper: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#f9c349',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  statsCard: { 
    flexDirection: 'row', 
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  statsBackground: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#ffffff',
  },
  statItem: { 
    flex: 1, 
    alignItems: 'center',
    zIndex: 1,
  },
  statNum: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#1a1a1a',
    letterSpacing: 1,
  },
  statLabel: { 
    fontSize: 9, 
    color: 'rgba(0,0,0,0.6)', 
    fontWeight: '600', 
    marginTop: 4, 
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: { 
    width: 1, 
    backgroundColor: 'rgba(0,0,0,0.1)', 
    height: '70%', 
    alignSelf: 'center',
    zIndex: 1,
  },
  
  // CTA
  ctaWrapper: {
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
        elevation: 8,
      },
    }),
  },
  ctaCard: {
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  ctaDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  ctaButton: {
    marginTop: 16,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginRight: 8,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  footerLogo: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#0000',
    letterSpacing: 1,
  },
  footerLogoAccent: {
    color: '#f9c349',
  },
  
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: 12,
  },
  
  
  footerSubText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.3)',
    marginTop: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});