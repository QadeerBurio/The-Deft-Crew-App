import React, { useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Animated, Dimensions, Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function HowToRedeem() {
  const navigation = useNavigation();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.8)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const stepAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  const tipSlide = useRef(new Animated.Value(30)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

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

    // Progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

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
      ...stepAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(200 + i * 150),
          Animated.spring(anim, {
            toValue: 1,
            friction: 6,
            tension: 45,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.sequence([
        Animated.delay(800),
        Animated.spring(tipSlide, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Button pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(btnPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const steps = [
    { 
      number: "01", 
      icon: "qrcode-scan", 
      color: "#f9c349", 
      title: "Select Your Benefit", 
      desc: "Browse the Brands, Career Hub, or Travel sections. Select the specific offer you wish to activate.",
      gradient: ['#f9c349', '#f5a623']
    },
    { 
      number: "02", 
      icon: "shield-check-outline", 
      color: "#4ecdc4", 
      title: "Verify & Generate", 
      desc: "Click 'Redeem Now'. Our system verifies your student status and Privilege tier to instantly generate your unique voucher.",
      gradient: ['#4ecdc4', '#45b7aa']
    },
    { 
      number: "03", 
      icon: "check-decagram-outline", 
      color: "#6c5ce7", 
      title: "Finalize Redemption", 
      desc: "Show the generated code at checkout or follow the secure link to complete your application or booking.",
      gradient: ['#6c5ce7', '#5a4bd1']
    },
  ];

  const tips = [
    "Privilege Tier members unlock 'Auto-Apply' for brand discounts",
    "Priority processing in Career Hub for verified students",
    "Exclusive early access to limited-time offers",
  ];

  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const RedeemStep = ({ number, title, desc, icon, color, gradient, index }) => {
    const translateX = stepAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [index % 2 === 0 ? -40 : 40, 0],
    });

    const scale = stepAnims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1.05, 1],
    });

    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: stepAnims[index],
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
          <View style={styles.cardLeft}>
            <LinearGradient
              colors={gradient}
              style={styles.stepNumber}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.stepNumberText}>{number}</Text>
            </LinearGradient>
          </View>
          
          <View style={[styles.iconContainer, { backgroundColor: color + '15', borderColor: color + '30' }]}>
            <LinearGradient
              colors={gradient}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name={icon} size={24} color="#fff" />
            </LinearGradient>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDesc}>{desc}</Text>
            <View style={styles.cardProgress}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    { 
                      width: progressWidth,
                      backgroundColor: color,
                    }
                  ]} 
                />
              </View>
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
        <Text style={styles.headerTitle}>Redemption Guide</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={22} color="#1a1a1a" />
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
                  <MaterialCommunityIcons name="ticket-confirmation-outline" size={40} color="#fff" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.heroTitle}>How to Redeem</Text>
              <Text style={styles.heroSubtitle}>
                Follow these simple steps to unlock exclusive student discounts, and travel benefits.
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
                          backgroundColor: ['#f9c349', '#4ecdc4', '#6c5ce7', '#ff6b6b'][i % 4],
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

          {/* Steps */}
          <View style={styles.stepsSection}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.sectionDot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.sectionTitle}>Redemption Steps</Text>
              <View style={styles.sectionLine} />
            </View>
            {steps.map((item, i) => (
              <RedeemStep key={i} {...item} index={i} />
            ))}
          </View>

          {/* Pro Tips */}
          <Animated.View 
            style={[
              styles.tipWrapper,
              { 
                transform: [{ translateY: tipSlide }],
                opacity: fadeAnim,
              }
            ]}
          >
            <LinearGradient
              colors={['#f8f9fa', '#f8f9fa']}
              style={styles.tipCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.tipHeader}>
                <View style={styles.tipIconContainer}>
                  <LinearGradient
                    colors={['#f9c349', '#f5a623']}
                    style={styles.tipIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="bulb-outline" size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.tipTitle}>Pro Tips</Text>
              </View>
              
              {tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <View style={styles.tipBullet}>
                    <LinearGradient
                      colors={['#f9c349', '#f5a623']}
                      style={styles.tipBulletDot}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </LinearGradient>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View 
            style={[
              styles.ctaContainer, 
              { 
                transform: [{ scale: btnPulse }],
                opacity: fadeAnim,
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.ctaButton} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate("WhyPoints")}
            >
              <LinearGradient
                colors={['#f9c349', '#f5a623', '#f9c349']}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaText}>Check My Privilege Tier</Text>
                <View style={styles.ctaIconCircle}>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
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
              <Text style={styles.footerLogo}>
                tdc<Text style={styles.footerLogoAccent}>.</Text>
              </Text>
              <Text style={styles.footerText}>Empowering the Student Economy.</Text>
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
  
  // Steps
  stepsSection: { 
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
  cardLeft: {
    marginRight: 12,
  },
  stepNumber: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  stepNumberText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  iconContainer: { 
    width: 52, 
    height: 52, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14,
    borderWidth: 2,
  },
  iconGradient: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: { 
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#1a1a1a', 
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  cardDesc: { 
    fontSize: 12, 
    color: '#666', 
    lineHeight: 18, 
    fontWeight: '500',
    marginBottom: 8,
  },
  cardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  
  // Tips
  tipWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
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
  tipCard: {
    padding: 20,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  tipIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tipBullet: {
    marginRight: 10,
    marginTop: 4,
  },
  tipBulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.7)',
    lineHeight: 18,
    fontWeight: '500',
  },
  
  // CTA
  ctaContainer: { 
    marginHorizontal: 20, 
    marginTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#f9c349',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  ctaButton: { 
    borderRadius: 16, 
    overflow: 'hidden',
    justifyContent:'flex-end'
  },
  ctaGradient: { 
    flexDirection: 'row', 
    paddingVertical: 10, 
    paddingHorizontal: 24,
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  ctaText: { 
    color: '#1a1a1a', 
    fontSize: 16, 
    fontWeight: '800', 
    letterSpacing: 0.5,
    marginRight: 10,
  },
  ctaIconCircle: { 
    width: 34, 
    height: 34, 
    borderRadius: 10, 
    backgroundColor: '#1a1a1a', 
    justifyContent: 'center', 
    alignItems: 'center',
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
    marginTop: 6, 
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
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