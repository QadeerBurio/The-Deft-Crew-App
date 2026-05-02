import React, { useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HowToRedeem() {
  const navigation = useNavigation();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const stepAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  const tipSlide = useRef(new Animated.Value(20)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      ...stepAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(200 + i * 150),
          Animated.spring(anim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        ])
      ),
      Animated.sequence([
        Animated.delay(700),
        Animated.spring(tipSlide, { toValue: 0, friction: 5, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
        Animated.timing(btnPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const steps = [
    { number: "01", icon: "qrcode-scan", color: "#f9c349", title: "Select Your Benefit", desc: "Browse the Brands, Career Hub, or Travel sections. Select the specific offer you wish to activate." },
    { number: "02", icon: "shield-check-outline", color: "#f9c349", title: "Verify & Generate", desc: "Click 'Redeem Now'. Our system verifies your student status and Privilege tier to instantly generate your unique voucher." },
    { number: "03", icon: "check-decagram-outline", color: "#f9c349", title: "Finalize Redemption", desc: "Show the generated code at checkout or follow the secure link to complete your application or booking." },
  ];

  const RedeemStep = ({ number, title, desc, icon, color, index }) => (
    <Animated.View style={{
      opacity: stepAnims[index],
      transform: [{ translateX: stepAnims[index].interpolate({ inputRange: [0, 1], outputRange: [index % 2 === 0 ? -40 : 40, 0] }) }],
    }}>
      <View style={styles.card}>
        <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{number}</Text>
        </LinearGradient>
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <View style={styles.textContainer}>
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
        <Text style={styles.headerTitle}>Redemption Guide</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero */}
          <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
            <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.heroGradient}>
              <View style={styles.heroIconCircle}>
                <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.heroIconGradient}>
                  <MaterialCommunityIcons name="ticket-confirmation-outline" size={40} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>How to Redeem</Text>
              <Text style={styles.heroSubtitle}>
                Follow these simple steps to unlock exclusive student discounts, career opportunities, and travel benefits.
              </Text>
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Steps */}
          <View style={styles.stepsSection}>
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              Redemption Steps
            </Text>
            {steps.map((item, i) => (
              <RedeemStep key={i} {...item} index={i} />
            ))}
          </View>

          {/* Pro Tip */}
          <Animated.View style={[styles.tipCard, { transform: [{ translateY: tipSlide }] }]}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb-outline" size={20} color="#f9c349" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Pro Tip</Text>
              <Text style={styles.tipText}>
                Privilege Tier members unlock "Auto-Apply" for brand discounts and priority processing in Career Hub.
              </Text>
            </View>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View style={[styles.ctaContainer, { transform: [{ scale: btnPulse }] }]}>
            <TouchableOpacity 
              style={styles.ctaButton} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate("WhyPoints")}
            >
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.ctaGradient}>
                <Text style={styles.ctaText}>Check My Privilege Tier</Text>
                <View style={styles.ctaIconCircle}>
                  <Ionicons name="arrow-forward" size={18} color="#1a1a1a" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
            <Text style={styles.footerText}>Empowering the Student Economy</Text>
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
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 21, fontWeight: '500' },
  decorLine: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  decorSegment: { width: 25, height: 1.5, backgroundColor: '#f9c349', borderRadius: 1 },
  decorDiamond: { width: 6, height: 6, backgroundColor: '#f9c349', transform: [{ rotate: '45deg' }], marginHorizontal: 8 },
  
  // Steps
  stepsSection: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { 
    fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 14, 
    flexDirection: 'row', alignItems: 'center' 
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9c349', marginRight: 10 },
  
  card: { 
    flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 16,
    marginBottom: 12, borderWidth: 2, borderColor: '#f0f0f0', alignItems: 'center' 
  },
  stepNumber: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumberText: { color: '#1a1a1a', fontSize: 13, fontWeight: '900' },
  iconContainer: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  textContainer: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 },
  cardDesc: { fontSize: 12, color: '#666', lineHeight: 18, fontWeight: '500' },
  
  // Tip
  tipCard: { 
    flexDirection: 'row', marginHorizontal: 16, marginTop: 8, padding: 16,
    backgroundColor: '#f8f8f8', borderRadius: 16, borderWidth: 2, borderColor: '#f0f0f0',
    alignItems: 'flex-start'
  },
  tipIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', marginBottom: 3 },
  tipText: { fontSize: 12, color: '#666', lineHeight: 18, fontWeight: '500' },
  
  // CTA
  ctaContainer: { marginHorizontal: 16, marginTop: 24 },
  ctaButton: { borderRadius: 16, overflow: 'hidden', elevation: 10, shadowColor: "#f9c349", shadowOpacity: 0.3, shadowRadius: 15 },
  ctaGradient: { flexDirection: 'row', paddingVertical: 18, justifyContent: 'center', alignItems: 'center', gap: 10 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  ctaIconCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  
  // Footer
  footer: { alignItems: 'center', marginTop: 28 },
  footerLogo: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  footerText: { fontSize: 11, color: '#999', marginTop: 4, fontWeight: '500' },
});

