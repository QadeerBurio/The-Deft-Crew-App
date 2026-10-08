import React, { useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated, Dimensions, Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import { SafeAreaView } from "react-native-safe-area-context";

import { color as T, font as F } from "../theme/tokens";
const { width, height } = Dimensions.get("window");

export default function WhyPointsScreen() {
  const navigation = useNavigation();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.9)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([...Array(9)].map(() => new Animated.Value(0))).current;
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

    // Pulse animation for icons
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
      ...cardAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(100 + i * 80),
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
      color: T.yellow, 
      title: "Career Hub", 
      desc: "See top internships first and get direct referrals.",
      category: "Career"
    },
    { 
      icon: "earth-arrow-right", 
      color: "#4ecdc4", 
      title: "Global Scholarships", 
      desc: "Your Scholarships applications go to the front of the line.",
      category: "Global"
    },
    { 
      icon: "airplane-settings", 
      color: "#6c5ce7", 
      title: "AI Travel Planner", 
      desc: "Plan trips, routes and budgets with your AI travel assistant.",
      category: "Travel Assistant"
    },
    { 
      icon: "ticket-confirmation-outline", 
      color: T.danger, 
      title: "Boosted Discounts", 
      desc: "Bigger discounts at premium partner brands.",
      category: "Discounts"
    },
    { 
      icon: "shield-star-outline", 
      color: T.yellow, 
      title: "Campus Leadership", 
      desc: "Get verified as a campus leader and grow your network.",
      category: "Leadership"
    },
    { 
      icon: "account-group-outline", 
      color: "#a29bfe", 
      title: "Skills Network", 
      desc: "Find students with skills you need. Swap, learn, build together.",
      category: "Skills"
    },
    { 
      icon: "calendar-star-outline", 
      color: "#fd79a8", 
      title: "Premium Events", 
      desc: "VIP entry to workshops and networking events.",
      category: "Events"
    },
    { 
      icon: "file-document-outline", 
      color: "#00b894", 
      title: "Smart Resume", 
      desc: "Build a resume that passes ATS, with AI tips as you go.",
      category: "Career"
    },
    { 
      icon: "star-circle-outline", 
      color: "#fdcb6e", 
      title: "Job Recs", 
      desc: "Jobs matched to you, from companies worth your time.",
      category: "Career"
    },
  ];

  const statsData = [
    { value: "10", label: "Referrals" },
    { value: "50+", label: "Brands" },
    { value: "100%", label: "Free" },
  ];

  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const BenefitCard = ({ icon, title, desc, color, index, category }) => {
    const cardAnim = cardAnims[index];
    
    const translateX = cardAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [index % 2 === 0 ? -20 : 20, 0],
    });
    
    const scale = cardAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.85, 1.02, 1],
    });

    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: cardAnim,
            transform: [{ translateX }, { scale }],
          },
        ]}
      >
        <View style={styles.card}>
          <Animated.View
            style={[
              styles.iconBox,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: color + '12',
              },
            ]}
          >
            <LinearGradient
              colors={[color, color]}
              style={styles.iconGradient}
            >
              <MaterialCommunityIcons name={icon} size={18} color={T.white} />
            </LinearGradient>
          </Animated.View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{title}</Text>
              <View style={[styles.categoryTag, { backgroundColor: color + '15' }]}>
                <Text style={[styles.categoryText, { color }]}>{category}</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>{desc}</Text>
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
        <Text style={styles.headerTitle}>tdc Privilege</Text>
        <View style={{ width: 36 }} />
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero - Compact */}
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
              <Animated.View style={[styles.heroIconCircle, { transform: [{ rotate: spin }] }]}>
                <LinearGradient
                  colors={[T.yellow, '#e6b800']}
                  style={styles.heroIconGradient}
                >
                  <MaterialCommunityIcons name="crown-outline" size={28} color={T.ink} />
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.heroTitle}>tdc Privilege</Text>
              <Text style={styles.heroSubtitle}>
                Stay active on tdc, get verified, unlock better perks.
              </Text>
              
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </LinearGradient>
          </Animated.View>

         

          {/* Benefits */}
          <View style={styles.benefitsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>priviledge</Text>
              <View style={styles.sectionLine} />
            </View>
            {benefits.map((item, i) => (
              <BenefitCard key={i} {...item} index={i} />
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2026 tdc Privilege</Text>
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
    paddingTop: 8,
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
    minHeight: 200,
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
  heroTitle: { 
    fontSize: 18, 
    fontFamily: F.heading, 
    color: T.white, 
    marginBottom: 4, 
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  heroSubtitle: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.7)', 
    textAlign: 'center', 
    lineHeight: 18, 
    fontFamily: F.body, 
    paddingHorizontal: 8,
  },
  decorLine: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 12,
    opacity: 0.5,
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
  
  // Stats - Compact
  statsWrapper: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: T.card,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.line,
  },
  statsCard: { 
    flexDirection: 'row', 
    padding: 14,
  },
  statItem: { 
    flex: 1, 
    alignItems: 'center',
  },
  statNum: { 
    fontSize: 18, 
    fontFamily: F.heading, 
    color: T.ink,
    letterSpacing: 0.5,
  },
  statLabel: { 
    fontSize: 9, 
    color: T.textFaint, 
    fontFamily: F.bodySemi, 
    marginTop: 2, 
    textAlign: 'center',
    textTransform: 'none',
    letterSpacing: 0.5,
  },
  statDivider: { 
    width: 1, 
    backgroundColor: T.sand, 
    height: '60%', 
    alignSelf: 'center',
  },
  
  // Benefits - Compact
  benefitsSection: { 
    paddingHorizontal: 16, 
    marginTop: 14,
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
  
  cardWrapper: {
    marginBottom: 8,
  },
  card: { 
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
  iconBox: { 
    width: 38, 
    height: 38, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10,
  },
  iconGradient: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
    marginBottom: 2,
  },
  cardTitle: { 
    fontSize: 12, 
    fontFamily: F.bodyBold, 
    color: T.ink,
    flex: 1,
    letterSpacing: 0.2,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  categoryText: {
    fontSize: 8,
    fontFamily: F.bodyBold,
    letterSpacing: 0.3,
    textTransform: 'none',
  },
  cardDesc: { 
    fontSize: 10.5, 
    color: T.textFaint, 
    lineHeight: 15, 
    fontFamily: F.body,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 4,
  },
  footerText: {
    fontSize: 10,
    color: T.textFaint,
    fontFamily: F.bodyMedium,
    letterSpacing: 0.3,
  },
});