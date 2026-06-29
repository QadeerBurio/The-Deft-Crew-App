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
  const heroScale = useRef(new Animated.Value(0.8)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const stepAnims = useRef([...Array(7)].map(() => new Animated.Value(0))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Create particle animations
  const particleAnims = useRef(
    [...Array(8)].map(() => new Animated.Value(0))
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
          Animated.delay(200 + i * 120),
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
      desc: "Sign up with your university credentials. Verification unlocks secure access to student-only discounts and verified brand partnerships.",
      gradient: ['#f9c349', '#f5a623'],
      color: "#f9c349",
      tag: "Start Here"
    },
    {
      number: "02",
      icon: "ticket-percent-outline",
      title: "Save on Brands",
      desc: "Browse 200+ partner brands. Use your unique tdc student ID to redeem instant discounts on food, fashion, and tech.",
      gradient: ['#4ecdc4', '#45b7aa'],
      color: "#4ecdc4",
      tag: "Discounts"
    },
    {
      number: "03",
      icon: "account-group-outline",
      title: "Skills Share Network",
      desc: "Connect with fellow students across universities. Share expertise, learn new skills, and collaborate on innovative projects.",
      gradient: ['#a29bfe', '#6c5ce7'],
      color: "#a29bfe",
      tag: "Collaboration"
    },
    {
      number: "04",
      icon: "calendar-star-outline",
      title: "Premium Events Access",
      desc: "Get VIP access to exclusive workshops, seminars, and networking events across Karachi, Hyderabad, Sukkur, and Larkana.",
      gradient: ['#fd79a8', '#e84393'],
      color: "#fd79a8",
      tag: "Networking"
    },
    {
      number: "05",
      icon: "file-document-outline",
      title: "Smart Resume Builder",
      desc: "Create ATS-optimized resumes with premium templates, AI-powered suggestions, and instant feedback from industry professionals.",
      gradient: ['#00b894', '#00a381'],
      color: "#00b894",
      tag: "Career Tools"
    },
    {
      number: "06",
      icon: "briefcase-search-outline",
      title: "Career & Global Growth",
      desc: "Access the Career Hub for exclusive internships, job recommendations, and explore international exchange programs.",
      gradient: ['#6c5ce7', '#5a4bd1'],
      color: "#6c5ce7",
      tag: "Career"
    },
    {
      number: "07",
      icon: "airplane-takeoff",
      title: "Travel & Rewards",
      desc: "Activate student-specific travel packages and move up the tdc Privilege tiers by engaging with the community.",
      gradient: ['#ff6b6b', '#ee5a24'],
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
    outputRange: [0.3, 0.6],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const Step = ({ number, title, desc, icon, gradient, color, index, isLast, tag }) => {
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
          styles.stepWrapper,
          {
            opacity: stepAnims[index],
            transform: [
              { translateX },
              { scale },
            ],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.stepContainer}
          activeOpacity={0.7}
          onPress={() => {
            // Navigate to respective screens based on step
            if (title.includes("Skills Share")) {
              navigation.navigate("SkillsShare");
            } else if (title.includes("Events")) {
              navigation.navigate("Events");
            } else if (title.includes("Resume")) {
              navigation.navigate("ResumeBuilder");
            } else if (title.includes("Career")) {
              navigation.navigate("CareerHub");
            } else if (title.includes("Travel")) {
              navigation.navigate("Travel");
            } else if (title.includes("Brands")) {
              navigation.navigate("Brands");
            }
          }}
        >
          <View style={styles.leftColumn}>
            <Animated.View 
              style={[
                styles.iconCircle,
                {
                  transform: [{ scale: pulseAnim }],
                }
              ]}
            >
              <LinearGradient
                colors={gradient}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name={icon} size={28} color="#fff" />
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
              <View style={[styles.stepTag, { backgroundColor: color + '20' }]}>
                <Text style={[styles.stepTagText, { color: color }]}>{tag}</Text>
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
              <TouchableOpacity style={styles.stepAction}>
                <Text style={[styles.stepActionText, { color: color }]}>Learn More →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Particle component
  const Particle = ({ index }) => {
    const particleColors = ['#f9c349', '#4ecdc4', '#6c5ce7', '#ff6b6b', '#a29bfe', '#fd79a8', '#00b894', '#fdcb6e'];
    const color = particleColors[index % particleColors.length];
    
    const translateY = particleAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0, -15 - Math.random() * 20],
    });

    const opacity = particleAnims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.2, 0.7, 0.2],
    });

    return (
      <Animated.View
        style={[
          styles.particle,
          {
            top: 5 + Math.random() * 90,
            left: 5 + Math.random() * 90,
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
        <Text style={styles.headerTitle}>How tdc Works</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="information-circle-outline" size={22} color="#1a1a1a" />
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
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={40} color="#fff" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.heroLabel}>tdc STUDENT ECOSYSTEM</Text>
              <Text style={styles.heroTitle}>Unlock Your Potential</Text>
              <Text style={styles.heroSubtitle}>
                Follow these seven core steps to navigate the complete tdc ecosystem—from daily savings to global career opportunities.
              </Text>
              
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>

              {/* Floating particles */}
              <View style={styles.particlesContainer}>
                {[...Array(8)].map((_, i) => (
                  <Particle key={i} index={i} />
                ))}
              </View>
            </LinearGradient>
          </Animated.View>

          

          {/* Timeline Steps */}
          <View style={styles.timelineContainer}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.sectionDot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.sectionTitle}>Your Complete Journey</Text>
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

          {/* Call to Action */}
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
                colors={['#f9c349', '#f5a623', '#f9c349']}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaText}>Get Started Now</Text>
                <Ionicons name="rocket-outline" size={20} color="#1a1a1a" style={{marginLeft: 10}} />
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
              <Text style={styles.footerText}>Building a Stronger Student Economy.</Text>
              <View style={styles.footerLine} />
             
              <Text style={styles.footerSupport}>
                Need help? Contact us at info@thedeftcrew.com
              </Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
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
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  
  // Hero Section
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
  heroLabel: {
    color: "#f9c349",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
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
  
  // Timeline
  timelineContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  
  stepWrapper: {
    marginBottom: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    padding: 4,
  },
  leftColumn: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: '#f9c349',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconGradient: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  numberText: {
    color: "#1a1a1a",
    fontSize: 11,
    fontWeight: "900",
  },
  verticalLine: {
    width: 3,
    flex: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 8,
    borderRadius: 2,
    minHeight: 30,
  },
  rightColumn: {
    flex: 1,
    paddingBottom: 30,
    paddingTop: 5,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1a1a1a",
    flex: 1,
    letterSpacing: 0.3,
  },
  stepTag: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  stepTagText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stepDesc: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  stepProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  stepAction: {
    paddingHorizontal: 4,
  },
  stepActionText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  // CTA
  ctaWrapper: {
    marginHorizontal: 16,
    marginTop: 10,
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
  },
  ctaGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  
  // Footer
  footer: {
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
        elevation: 0,
      },
    }),
  },
  footerGradient: {
    alignItems: 'center',
    paddingVertical: 24,
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
  
  
  footerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  footerSupport: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.3)',
    marginTop: 12,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  footerSubText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.2)',
    marginTop: 8,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});