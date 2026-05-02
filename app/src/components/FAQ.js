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
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
  {
    category: "Offers & Rewards",
    icon: "gift-outline",
    questions: [
      { q: "How do I redeem an offer?", a: "Open the offer details and tap the “Redeem” button to claim your rewards." },
      { q: "Do points from multiple offers accumulate?", a: "Yes, points from all eligible transactions are cumulative and reflected in your account." },
      { q: "Do points have an expiration date?", a: "Yes, points expire 2 months after being credited to your account." },
    ],
  },
  {
    category: "Career Opportunities",
    icon: "briefcase-outline",
    questions: [
      { q: "How do I apply for an internship?", a: "Navigate to the Careers tab, select an internship that matches your profile, and upload your CV directly through the app." },
      { q: "Are the job postings verified?", a: "Yes, all career opportunities are vetted by the University Career Center before being posted." },
      { q: "Can I get alerts for specific industries?", a: "Absolutely. You can set up 'Job Alerts' in your profile settings for industries like Tech, Finance, or Arts." },
      { q: "Does the app offer resume building tools?", a: "Yes, we have a 'Resume Builder' section in the Career tab with templates optimized for ATS systems." },
    ],
  },
  {
    category: "Traveling",
    icon: "airplane-outline",
    questions: [
      { q: "Are there student discounts for travel?", a: "Yes, we partner with local transport and airlines to provide up to 20% off for verified students." },
      { q: "How do I book a university-sanctioned trip?", a: "View the 'Excursions' section under the Travel tab to find upcoming group trips and booking links." },
      { q: "Is travel insurance included?", a: "Basic insurance is included for all official university trips, but we recommend private coverage for personal travel." },
    ],
  },
  {
    category: "International Exchange",
    icon: "earth-arrow-right",
    questions: [
      { q: "What are the eligibility requirements for exchange?", a: "Usually a minimum GPA of 3.0 and completion of at least two semesters at your home university." },
      { q: "Will my credits transfer back?", a: "Most partner universities have pre-approved credit transfer agreements. Check with your academic advisor for specifics." },
      { q: "Is financial aid available for study abroad?", a: "Yes, many internal grants and external scholarships like Erasmus+ or Fulbright are listed in the Exchange tab." },
      { q: "Do I need to speak the local language?", a: "Many programs offer courses in English, but some regions require a B2 level proficiency in the local language." },
    ],
  },
];

export default function FAQScreen() {
  const navigation = useNavigation();
  const [activeKey, setActiveKey] = useState(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const categoryAnims = useRef([...Array(FAQ_DATA.length)].map(() => new Animated.Value(0))).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      ...categoryAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(200 + i * 120),
          Animated.spring(anim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const toggleExpand = (catIdx, qIdx) => {
    const key = `${catIdx}-${qIdx}`;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // Rotate animation for chevron
    Animated.spring(rotateAnim, {
      toValue: activeKey === key ? 0 : 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    setActiveKey(activeKey === key ? null : key);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Section */}
          <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
            <View style={styles.heroGradient}>
              <View style={styles.heroIconCircle}>
                <View style={styles.heroIconGradient}>
                  <MaterialCommunityIcons name="frequently-asked-questions" size={40} color="#fff" />
                </View>
              </View>
              <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
              <Text style={styles.heroSubtitle}>
                Find answers to common questions about tdc's features, rewards, and services.
              </Text>
              
              {/* Decorative Line */}
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </View>
          </Animated.View>

          {/* FAQ Categories */}
          <Animated.View style={{ transform: [{ translateY: slideUpAnim }] }}>
            {FAQ_DATA.map((cat, catIdx) => (
              <Animated.View 
                key={catIdx} 
                style={[styles.categorySection, {
                  opacity: categoryAnims[catIdx],
                  transform: [{ translateY: categoryAnims[catIdx].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
                }]}
              >
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryIconBox}>
                    <MaterialCommunityIcons name={cat.icon} size={20} color="#f9c349" />
                  </View>
                  <Text style={styles.categoryTitle}>{cat.category}</Text>
                </View>

                {cat.questions.map((item, qIdx) => {
                  const isExpanded = activeKey === `${catIdx}-${qIdx}`;
                  return (
                    <View key={qIdx} style={styles.qaContainer}>
                      <TouchableOpacity
                        style={styles.questionContainer}
                        onPress={() => toggleExpand(catIdx, qIdx)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.questionLeft}>
                          <View style={styles.bulletDot} />
                          <Text style={[styles.question, isExpanded && styles.questionActive]}>
                            {item.q}
                          </Text>
                        </View>
                        <Animated.View style={isExpanded && { transform: [{ rotate: '180deg' }] }}>
                          <View style={styles.chevronCircle}>
                            <Ionicons
                              name="chevron-down"
                              size={16}
                              color={isExpanded ? "#1a1a1a" : "#ccc"}
                            />
                          </View>
                        </Animated.View>
                      </TouchableOpacity>
                      {isExpanded && (
                        <View style={styles.answerContainer}>
                          <View style={styles.answerLine} />
                          <Text style={styles.answer}>{item.a}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </Animated.View>
            ))}
          </Animated.View>

          {/* Support CTA */}
          <TouchableOpacity 
            style={styles.supportCard}
            activeOpacity={0.8}
          >
            <View style={styles.supportIconBox}>
              <Ionicons name="chatbubbles-outline" size={24} color="#f9c349" />
            </View>
            <View style={styles.supportContent}>
              <Text style={styles.supportTitle}>Still need help?</Text>
              <Text style={styles.supportDesc}>Contact our support team for personalized assistance</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#f9c349" />
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
            <Text style={styles.footerText}>Building a Stronger Student Economy</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Hero
  heroCard: {
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  heroGradient: {
    padding: 28,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#f9c349',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
    paddingHorizontal: 5,
  },
  decorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  decorSegment: {
    width: 25,
    height: 1.5,
    backgroundColor: '#f9c349',
    borderRadius: 1,
  },
  decorDiamond: {
    width: 6,
    height: 6,
    backgroundColor: '#f9c349',
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 8,
  },
  
  // Categories
  categorySection: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 4,
  },
  categoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Q&A
  qaContainer: {
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  questionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
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
    backgroundColor: '#f9c349',
    marginRight: 10,
  },
  question: {
    fontWeight: "600",
    fontSize: 14,
    color: "#1a1a1a",
    flex: 1,
  },
  questionActive: {
    color: '#f9c349',
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  answerLine: {
    width: 3,
    backgroundColor: '#f9c349',
    borderRadius: 2,
    marginRight: 12,
    marginTop: 2,
  },
  answer: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  
  // Support CTA
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    elevation: 4,
    shadowColor: "#f9c349",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  supportIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  supportDesc: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 10,
  },
  footerLogo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
});