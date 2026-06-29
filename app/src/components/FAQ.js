import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
  {
    category: "Offers & Rewards",
    icon: "gift-outline",
    color: "#f9c349",
    gradient: ['#f9c349', '#f5a623'],
    questions: [
      { q: "How do I redeem an offer?", a: "Open the offer details and tap the 'Redeem' button to claim your rewards instantly." },
      { q: "Do points from multiple offers accumulate?", a: "Yes, points from all eligible transactions are cumulative and reflected in your account dashboard." },
      { q: "Do points have an expiration date?", a: "Yes, points expire 2 months after being credited to your account. Stay active to keep earning!" },
    ],
  },
  {
    category: "Skills Share Network",
    icon: "account-group-outline",
    color: "#a29bfe",
    gradient: ['#a29bfe', '#6c5ce7'],
    questions: [
      { q: "What is Skills Share Network?", a: "A platform where students can share expertise, learn new skills, and collaborate on projects across universities." },
      { q: "How do I join Skills Share?", a: "Navigate to the Skills Share tab, create your profile with your skills, and start connecting with fellow students." },
      { q: "Can I earn rewards for sharing skills?", a: "Yes, active skill sharers earn Privilege Points and can unlock exclusive rewards and recognition." },
    ],
  },
  {
    category: "Premium Events",
    icon: "calendar-star-outline",
    color: "#fd79a8",
    gradient: ['#fd79a8', '#e84393'],
    questions: [
      { q: "What types of events are available?", a: "We host workshops, seminars, networking events, career fairs, and cultural events across Karachi, Hyderabad, Sukkur, and Larkana." },
      { q: "How do I get VIP access to events?", a: "Privilege members get priority registration and exclusive access to limited-seat events. Upgrade your tier to unlock more benefits." },
      { q: "Are events free for students?", a: "Most events are free for verified students. Some premium events may require a small registration fee for materials." },
      { q: "Can I suggest an event idea?", a: "Absolutely! Contact our events team with your suggestions, and we'll work with university partners to make it happen." },
    ],
  },
  {
    category: "Smart Resume Builder",
    icon: "file-document-outline",
    color: "#00b894",
    gradient: ['#00b894', '#00a381'],
    questions: [
      { q: "How does the Resume Builder work?", a: "Choose from ATS-optimized templates, input your details, and get AI-powered suggestions to improve your resume." },
      { q: "Are the templates free?", a: "Yes, all basic templates are free. Privilege members get access to premium templates and advanced features." },
      { q: "Can I get feedback on my resume?", a: "Yes, submit your resume for review by industry professionals and get personalized feedback within 48 hours." },
      { q: "What formats are supported?", a: "You can export your resume in PDF, Word, and plain text formats. All formats are ATS-compatible." },
    ],
  },
  {
    category: "Career Opportunities",
    icon: "briefcase-outline",
    color: "#4ecdc4",
    gradient: ['#4ecdc4', '#45b7aa'],
    questions: [
      { q: "How do I apply for an internship?", a: "Navigate to the Careers tab, select an internship that matches your profile, and upload your CV directly through the app." },
      { q: "Are the job postings verified?", a: "Yes, all career opportunities are vetted by the University Career Center before being posted." },
      { q: "Can I get alerts for specific industries?", a: "Absolutely. You can set up 'Job Alerts' in your profile settings for industries like Tech, Finance, or Arts." },
      { q: "Does the app offer resume building tools?", a: "Yes, we have a 'Resume Builder' section in the Career tab with templates optimized for ATS systems." },
    ],
  },
  {
    category: "Scholarships",
    icon: "school-outline",
    color: "#ffa502",
    gradient: ['#ffa502', '#f9a825'],
    questions: [
      { q: "What scholarships are available?", a: "We list internal grants, external scholarships like Erasmus+, Fulbright, and partner university scholarships." },
      { q: "How do I apply for a scholarship?", a: "Navigate to the Scholarships section, review eligibility criteria, and apply directly through the app." },
      { q: "Are there scholarships for international students?", a: "Yes, many scholarships are open to international students. Check specific requirements for each scholarship." },
      { q: "When are scholarship deadlines?", a: "Deadlines vary by scholarship. Check the individual scholarship page for specific dates and requirements." },
    ],
  },
  
  {
    category: "Traveling",
    icon: "airplane",
    color: "#6c5ce7",
    gradient: ['#6c5ce7', '#5a4bd1'],
    questions: [
      { q: "Are there student discounts for travel?", a: "Yes, we partner with local transport and airlines to provide up to 20% off for verified students." },
      { q: "How do I book a university-sanctioned trip?", a: "View the 'Excursions' section under the Travel tab to find upcoming group trips and booking links." },
      { q: "Is travel insurance included?", a: "Basic insurance is included for all official university trips, but we recommend private coverage for personal travel." },
    ],
  },
];

export default function FAQScreen() {
  const navigation = useNavigation();
  const [activeKey, setActiveKey] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.8)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const categoryAnims = useRef([...Array(FAQ_DATA.length)].map(() => new Animated.Value(0))).current;
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
      ...categoryAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(200 + i * 120),
          Animated.spring(anim, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const toggleExpand = (catIdx, qIdx) => {
    const key = `${catIdx}-${qIdx}`;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveKey(activeKey === key ? null : key);
  };

  const toggleCategory = (catIdx) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategories(prev => ({
      ...prev,
      [catIdx]: !prev[catIdx]
    }));
  };

  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const QuestionItem = ({ question, answer, catIdx, qIdx, color, isExpanded }) => {
    const rotateChevron = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
    
    useEffect(() => {
      Animated.spring(rotateChevron, {
        toValue: isExpanded ? 1 : 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }, [isExpanded]);

    const chevronSpin = rotateChevron.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    return (
      <View style={styles.qaContainer}>
        <TouchableOpacity
          style={[styles.questionContainer, isExpanded && { backgroundColor: color + '08' }]}
          onPress={() => toggleExpand(catIdx, qIdx)}
          activeOpacity={0.7}
        >
          <View style={styles.questionLeft}>
            <View style={[styles.bulletDot, { backgroundColor: color }]} />
            <Text style={[styles.question, isExpanded && { color: color }]}>
              {question}
            </Text>
          </View>
          <Animated.View style={[styles.chevronCircle, { transform: [{ rotate: chevronSpin }] }]}>
            <Ionicons name="chevron-down" size={16} color={isExpanded ? color : "#ccc"} />
          </Animated.View>
        </TouchableOpacity>
        {isExpanded && (
          <Animated.View style={[styles.answerContainer]}>
            <View style={[styles.answerLine, { backgroundColor: color }]} />
            <Text style={styles.answer}>{answer}</Text>
          </Animated.View>
        )}
      </View>
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
        <Text style={styles.headerTitle}>Help Center</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={22} color="#1a1a1a" />
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
                  <MaterialCommunityIcons name="frequently-asked-questions" size={40} color="#fff" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
              <Text style={styles.heroSubtitle}>
                Find answers to common questions about tdc's features, rewards, and services.
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

          

          {/* FAQ Categories */}
          <Animated.View style={[{ transform: [{ translateY: slideUpAnim }] }]}>
            {FAQ_DATA.map((cat, catIdx) => {
              const translateY = categoryAnims[catIdx].interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              });

              return (
                <Animated.View 
                  key={catIdx} 
                  style={[
                    styles.categorySection, 
                    {
                      opacity: categoryAnims[catIdx],
                      transform: [{ translateY }],
                    }
                  ]}
                >
                  <TouchableOpacity 
                    style={styles.categoryHeader}
                    onPress={() => toggleCategory(catIdx)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.categoryIconBox, { backgroundColor: cat.color + '15' }]}>
                      <MaterialCommunityIcons name={cat.icon} size={22} color={cat.color} />
                    </View>
                    <Text style={styles.categoryTitle}>{cat.category}</Text>
                    <View style={[styles.categoryCount, { backgroundColor: cat.color + '15' }]}>
                      <Text style={[styles.categoryCountText, { color: cat.color }]}>
                        {cat.questions.length}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {(expandedCategories[catIdx] !== false) && cat.questions.map((item, qIdx) => {
                    const isExpanded = activeKey === `${catIdx}-${qIdx}`;
                    return (
                      <QuestionItem
                        key={qIdx}
                        question={item.q}
                        answer={item.a}
                        catIdx={catIdx}
                        qIdx={qIdx}
                        color={cat.color}
                        isExpanded={isExpanded}
                      />
                    );
                  })}
                </Animated.View>
              );
            })}
          </Animated.View>

          {/* Support CTA */}
          <Animated.View
            style={[
              styles.supportWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#1a1a1a', '#2d2d2d']}
              style={styles.supportCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.supportIconBox}>
                <LinearGradient
                  colors={['#f9c349', '#f5a623']}
                  style={styles.supportIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.supportContent}>
                <Text style={styles.supportTitle}>Still need help?</Text>
                <Text style={styles.supportDesc}>Contact our support team for personalized assistance</Text>
              </View>
              <TouchableOpacity 
                style={styles.supportArrow}
                onPress={() => navigation.navigate("ContactUs")}
              >
                <Ionicons name="arrow-forward" size={20} color="#f9c349" />
              </TouchableOpacity>
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
              <Text style={styles.footerLogo}>
                tdc<Text style={styles.footerLogoAccent}>.</Text>
              </Text>
              <Text style={styles.footerText}>Building a Stronger Student Economy.</Text>
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
  
  // Categories
  categorySection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  categoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1a',
    flex: 1,
    letterSpacing: 0.5,
  },
  categoryCount: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  
  // Q&A
  qaContainer: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  questionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  questionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  question: {
    fontWeight: "600",
    fontSize: 13,
    color: "#1a1a1a",
    flex: 1,
    letterSpacing: 0.3,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  answerLine: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
    marginTop: 2,
  },
  answer: {
    fontSize: 12,
    color: "#666",
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  
  // Support CTA
  supportWrapper: {
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
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  supportIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 14,
  },
  supportIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  supportDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  supportArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Footer
  footer: {
    marginHorizontal: 16,
    marginTop: 15,
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
  
  
  footerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  
  
  
  footerSubText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.3)',
    marginTop: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});