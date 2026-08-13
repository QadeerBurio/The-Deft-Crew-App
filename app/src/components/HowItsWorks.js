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
  Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function HowItWorks() {
  const navigation = useNavigation();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.9)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const stepAnims = useRef([...Array(7)].map(() => new Animated.Value(0))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Create particle animations
  const particleAnims = useRef(
    [...Array(6)].map(() => new Animated.Value(0))
  ).current;

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

    // Particle animations
    particleAnims.forEach((anim, i) => {
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
  }, []);

  const steps = [
    {
      number: "01",
      icon: "account-check-outline",
      title: "Verify Your Identity",
      desc: "Sign up with your university credentials. Unlock student-only discounts.",
      color: "#f9c349",
      tag: "Start"
    },
    {
      number: "02",
      icon: "ticket-percent-outline",
      title: "Save on Brands",
      desc: "Browse 200+ brands. Use your tdc ID for instant discounts.",
      color: "#4ecdc4",
      tag: "Discounts"
    },
    {
      number: "03",
      icon: "account-group-outline",
      title: "Skills Share",
      desc: "Connect with students. Share expertise & collaborate on projects.",
      color: "#a29bfe",
      tag: "Collaborate"
    },
    {
      number: "04",
      icon: "calendar-star-outline",
      title: "Premium Events",
      desc: "VIP access to workshops, seminars & networking events.",
      color: "#fd79a8",
      tag: "Events"
    },
    {
      number: "05",
      icon: "file-document-outline",
      title: "Resume Builder",
      desc: "Create ATS-optimized resumes with AI-powered suggestions.",
      color: "#00b894",
      tag: "Career"
    },
    {
      number: "06",
      icon: "briefcase-search-outline",
      title: "Career Growth",
      desc: "Exclusive internships, jobs & international exchange programs.",
      color: "#6c5ce7",
      tag: "Growth"
    },
    {
      number: "07",
      icon: "airplane-takeoff",
      title: "Travel & Rewards",
      desc: "Student travel packages & tdc Privilege tier rewards.",
      color: "#ff6b6b",
      tag: "Rewards"
    },
  ];

  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const Step = ({ number, title, desc, icon, color, index, isLast, tag }) => {
    const translateX = stepAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [index % 2 === 0 ? -30 : 30, 0],
    });

    const scale = stepAnims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.85, 1.02, 1],
    });

    return (
      <Animated.View
        style={[
          styles.stepWrapper,
          {
            opacity: stepAnims[index],
            transform: [{ translateX }, { scale }],
          },
        ]}
      >
        <View style={styles.stepContainer}>
          <View style={styles.leftColumn}>
            <Animated.View 
              style={[
                styles.iconCircle,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <LinearGradient
                colors={[color, color]}
                style={styles.iconGradient}
              >
                <MaterialCommunityIcons name={icon} size={20} color="#fff" />
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
                    height: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: color,
                  }
                ]} 
              />
            )}
          </View>
          
          <View style={styles.rightColumn}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{title}</Text>
              <View style={[styles.stepTag, { backgroundColor: color + '15' }]}>
                <Text style={[styles.stepTagText, { color }]}>{tag}</Text>
              </View>
            </View>
            <Text style={styles.stepDesc}>{desc}</Text>
            <View style={styles.stepProgress}>
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
        </View>
      </Animated.View>
    );
  };

  // Particle component
  const Particle = ({ index }) => {
    const particleColors = ['#f9c349', '#4ecdc4', '#6c5ce7', '#ff6b6b', '#a29bfe', '#fd79a8'];
    const color = particleColors[index % particleColors.length];
    
    const translateY = particleAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0, -10 - Math.random() * 15],
    });

    const opacity = particleAnims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.15, 0.5, 0.15],
    });

    return (
      <Animated.View
        style={[
          styles.particle,
          {
            top: 10 + Math.random() * 80,
            left: 10 + Math.random() * 80,
            backgroundColor: color,
            transform: [{ translateY }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa00" />
      
      {/* Header - Compact */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How It Works</Text>
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
              
              <Animated.View style={[styles.heroIconCircle, { transform: [{ rotate: spin }] }]}>
                <LinearGradient
                  colors={['#f9c349', '#e6b800']}
                  style={styles.heroIconGradient}
                >
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={28} color="#1a1a1a" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.heroLabel}>TDC ECOSYSTEM</Text>
              <Text style={styles.heroTitle}>Your Journey Starts Here</Text>
              <Text style={styles.heroSubtitle}>
                Follow these 7 steps to unlock the complete tdc experience
              </Text>
              
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>

              {/* Floating particles */}
              <View style={styles.particlesContainer}>
                {[...Array(6)].map((_, i) => (
                  <Particle key={i} index={i} />
                ))}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Timeline Steps - Compact */}
          <View style={styles.timelineContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Your Journey</Text>
              <View style={styles.sectionLine} />
            </View>
            
            {steps.map((step, index) => (
              <Step 
                key={index}
                {...step}
                index={index}
                isLast={index === steps.length - 1}
              />
            ))}
          </View>

          {/* Call to Action - Compact */}
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
              onPress={() => navigation.navigate("Brands")}
            >
              <LinearGradient
                colors={['#f9c349', '#e6b800']}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#1a1a1a" style={{marginLeft: 8}} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer - Compact */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>tdc</Text>
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
    backgroundColor: "#f8f9fa",
  },
  
  // Header - Compact
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
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
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingBottom: 30,
    paddingTop: 4,
  },
  
  // Hero Section - Compact
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
    minHeight: 190,
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
  heroLabel: {
    color: "#f9c349",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
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
  
  // Timeline - Compact
  timelineContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  
  stepWrapper: {
    marginBottom: 4,
  },
  stepContainer: {
    flexDirection: 'row',
    padding: 2,
  },
  leftColumn: {
    alignItems: 'center',
    marginRight: 12,
    width: 48,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  numberText: {
    color: "#1a1a1a",
    fontSize: 9,
    fontWeight: "900",
  },
  verticalLine: {
    width: 2.5,
    flex: 1,
    backgroundColor: "#f0f0f0",
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
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
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stepDesc: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 16,
    fontWeight: '400',
    marginBottom: 4,
  },
  stepProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  
  // CTA - Compact
  ctaWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    color: "#1a1a1a",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
  footerText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.4)',
    marginTop: 4,
    fontWeight: '400',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  footerSubText: {
    fontSize: 9,
    color: 'rgba(0, 0, 0, 0.2)',
    marginTop: 4,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});