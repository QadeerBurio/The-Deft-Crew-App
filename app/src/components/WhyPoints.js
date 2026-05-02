import React, { useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WhyPointsScreen() {
  const navigation = useNavigation();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const cardAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      ...cardAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(200 + i * 100),
          Animated.spring(anim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const benefits = [
    { icon: "briefcase-check-outline", color: "#f9c349", title: "Elite Career Hub Access", desc: "Privilege members get first-look access to premium internships and direct referrals to top-tier partner companies." },
    { icon: "earth-arrow-right", color: "#f9c349", title: "Global Exchange Priority", desc: "Unlock priority applications for international student exchange programs and global academic workshops." },
    { icon: "airplane-settings", color: "#f9c349", title: "Exclusive Travel Tiers", desc: "Access heavily subsidized student travel packages and 'Privilege-Only' group tours across Pakistan and beyond." },
    { icon: "ticket-confirmation-outline", color: "#f9c349", title: "Boosted Brand Discounts", desc: "Go beyond standard offers. Privilege status triggers higher percentage discounts at our premium partner brands." },
    { icon: "shield-star-outline", color: "#f9c349", title: "Campus Leadership", desc: "Elevation to Privilege status marks you as a verified campus leader with networking opportunities." },
  ];

  const BenefitCard = ({ icon, title, desc, color, index }) => (
    <Animated.View style={{
      opacity: cardAnims[index],
      transform: [{ translateY: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
    }}>
      <View style={styles.card}>
        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privilege Benefits</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero */}
          <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
            <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.heroGradient}>
              <View style={styles.heroIconCircle}>
                <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.heroIconGradient}>
                  <MaterialCommunityIcons name="crown-outline" size={40} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>Why tdc Privilege Matters</Text>
              <Text style={styles.heroSubtitle}>
                tdc Privilege is your gateway to the full ecosystem. Verified activity unlocks elite rewards, career growth, and global opportunities.
              </Text>
              
              {/* Decorative Line */}
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Benefits */}
          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              Exclusive Benefits
            </Text>
            {benefits.map((item, i) => (
              <BenefitCard key={i} {...item} index={i} />
            ))}
          </View>

          {/* Stats */}
          <Animated.View style={[styles.statsCard, { transform: [{ translateY: slideUpAnim }] }]}>
            <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.statsGradient}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>10</Text>
                <Text style={styles.statLabel}>Referrals Needed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>50+</Text>
                <Text style={styles.statLabel}>Partner Brands</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>100%</Text>
                <Text style={styles.statLabel}>Free Access</Text>
              </View>
            </LinearGradient>
          </Animated.View>

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
  container: { flex: 1, backgroundColor: "#ffffff" },
  
  // Header
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff'
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  scrollContent: { paddingBottom: 40 },
  
  // Hero
  heroCard: { margin: 16, borderRadius: 24, overflow: 'hidden', elevation: 10, shadowColor: "#f9c349", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 15 },
  heroGradient: { padding: 28, alignItems: 'center' },
  heroIconCircle: { marginBottom: 16, borderRadius: 20, overflow: 'hidden' },
  heroIconGradient: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 21, fontWeight: '500', paddingHorizontal: 5 },
  decorLine: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  decorSegment: { width: 25, height: 1.5, backgroundColor: '#f9c349', borderRadius: 1 },
  decorDiamond: { width: 6, height: 6, backgroundColor: '#f9c349', transform: [{ rotate: '45deg' }], marginHorizontal: 8 },
  
  // Benefits
  benefitsSection: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { 
    fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 14, 
    flexDirection: 'row', alignItems: 'center' 
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9c349', marginRight: 10 },
  
  card: { 
    flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 16,
    marginBottom: 12, borderWidth: 2, borderColor: '#f0f0f0', alignItems: 'flex-start' 
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 3 },
  cardDesc: { fontSize: 12, color: '#666', lineHeight: 18, fontWeight: '500' },
  
  // Stats
  statsCard: { marginHorizontal: 16, marginTop: 20, borderRadius: 16, overflow: 'hidden', elevation: 8, shadowColor: "#f9c349", shadowOpacity: 0.3, shadowRadius: 10 },
  statsGradient: { flexDirection: 'row', padding: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '900', color: '#1a1a1a' },
  statLabel: { fontSize: 10, color: 'rgba(0,0,0,0.6)', fontWeight: '600', marginTop: 3, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.15)', height: '60%', alignSelf: 'center' },
  
  // Footer
  footer: { alignItems: 'center', marginTop: 24, paddingVertical: 10 },
  footerLogo: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  footerText: { fontSize: 11, color: '#999', marginTop: 4, fontWeight: '500' },
});

