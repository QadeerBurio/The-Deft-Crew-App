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
      color: "#f9c349", 
      title: "Elite Career Hub", 
      desc: "First-look access to premium internships and direct referrals.",
      category: "Career"
    },
    { 
      icon: "earth-arrow-right", 
      color: "#4ecdc4", 
      title: "Global Exchange", 
      desc: "Priority applications for international exchange programs.",
      category: "Global"
    },
    { 
      icon: "airplane-settings", 
      color: "#6c5ce7", 
      title: "Travel Tiers", 
      desc: "Subsidized student travel packages and group tours.",
      category: "Travel"
    },
    { 
      icon: "ticket-confirmation-outline", 
      color: "#ff6b6b", 
      title: "Boosted Discounts", 
      desc: "Higher percentage discounts at premium partner brands.",
      category: "Discounts"
    },
    { 
      icon: "shield-star-outline", 
      color: "#f9c349", 
      title: "Campus Leadership", 
      desc: "Verified campus leader with networking opportunities.",
      category: "Leadership"
    },
    { 
      icon: "account-group-outline", 
      color: "#a29bfe", 
      title: "Skills Network", 
      desc: "Connect with students to share expertise and collaborate.",
      category: "Skills"
    },
    { 
      icon: "calendar-star-outline", 
      color: "#fd79a8", 
      title: "Premium Events", 
      desc: "VIP access to exclusive workshops and networking events.",
      category: "Events"
    },
    { 
      icon: "file-document-outline", 
      color: "#00b894", 
      title: "Smart Resume", 
      desc: "ATS-optimized resumes with AI-powered suggestions.",
      category: "Career"
    },
    { 
      icon: "star-circle-outline", 
      color: "#fdcb6e", 
      title: "Job Recs", 
      desc: "Personalized job recommendations from top companies.",
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
              <MaterialCommunityIcons name={icon} size={18} color="#fff" />
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
        <Text style={styles.headerTitle}>Privilege</Text>
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
              colors={['#1a1a1a', '#2d2d2d']}
              style={styles.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.View style={[styles.heroIconCircle, { transform: [{ rotate: spin }] }]}>
                <LinearGradient
                  colors={['#f9c349', '#e6b800']}
                  style={styles.heroIconGradient}
                >
                  <MaterialCommunityIcons name="crown-outline" size={28} color="#1a1a1a" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.heroTitle}>tdc Privilege</Text>
              <Text style={styles.heroSubtitle}>
                Verified activity unlocks elite rewards, career growth, and global opportunities.
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
              <Text style={styles.sectionTitle}>Benefits</Text>
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
    paddingTop: 8,
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
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  heroTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#fff', 
    marginBottom: 4, 
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  heroSubtitle: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.7)', 
    textAlign: 'center', 
    lineHeight: 18, 
    fontWeight: '400', 
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
  
  // Stats - Compact
  statsWrapper: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
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
    fontWeight: '800', 
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  statLabel: { 
    fontSize: 9, 
    color: '#94A3B8', 
    fontWeight: '600', 
    marginTop: 2, 
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: { 
    width: 1, 
    backgroundColor: 'rgba(0,0,0,0.06)', 
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
  
  cardWrapper: {
    marginBottom: 8,
  },
  card: { 
    flexDirection: 'row', 
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
    fontWeight: '700', 
    color: '#1a1a1a',
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
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cardDesc: { 
    fontSize: 10.5, 
    color: '#94A3B8', 
    lineHeight: 15, 
    fontWeight: '400',
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 4,
  },
  footerText: {
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});