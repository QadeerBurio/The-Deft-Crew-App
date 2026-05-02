import React, { useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Animated 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsScreen() {
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const cardAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

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

  const terms = [
    {
      icon: "account-check-outline",
      title: "Student Eligibility",
      content: "Access is strictly for verified university students. You must provide valid academic credentials to unlock exclusive ecosystem perks."
    },
    {
      icon: "briefcase-search-outline",
      title: "Career & Internships",
      content: "tdc facilitates connections with employers. We do not guarantee employment and are not liable for the recruitment policies of partner companies."
    },
    {
      icon: "airplane-takeoff",
      title: "Travel & Exchange",
      content: "Travel packages and exchange programs are subject to third-party provider terms and visa regulations of the respective countries."
    },
    {
      icon: "tag-text-outline",
      title: "Brand Redemption",
      content: "Discounts and offers are subject to brand availability. tdc is a facilitator and is not responsible for inventory or service quality at partner outlets."
    },
    {
      icon: "shield-key-outline",
      title: "Account Integrity",
      content: "Your account is personal. Sharing student-exclusive QR codes or credentials with non-students may lead to permanent suspension from the Crew."
    },
    {
      icon: "gavel",
      title: "Governing Law",
      content: "These terms are governed by the laws of Pakistan. Any disputes shall be settled within the jurisdiction of Pakistani courts."
    },
  ];

  const TermCard = ({ icon, title, content, index }) => (
    <Animated.View style={{
      opacity: cardAnims[index],
      transform: [{ translateY: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
    }}>
      <View style={styles.termCard}>
        <View style={styles.termIconBox}>
          <MaterialCommunityIcons name={icon} size={22} color="#f9c349" />
        </View>
        <View style={styles.termContent}>
          <Text style={styles.termTitle}>{title}</Text>
          <Text style={styles.termText}>{content}</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <Text style={styles.headerSubtitle}>Last updated: March 2026</Text>
        </View>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Section */}
          <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
            <View style={styles.heroGradient}>
              <View style={styles.heroIconCircle}>
                <View style={styles.heroIconGradient}>
                  <MaterialCommunityIcons name="file-document-outline" size={40} color="#fff" />
                </View>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>THE DEFT CREW ECOSYSTEM</Text>
              </View>
              <Text style={styles.heroTitle}>Legal Framework</Text>
              <Text style={styles.heroSubtitle}>
                By joining the Crew, you agree to these terms. We provide a platform connecting students 
                to global opportunities, discounts, and career growth.
              </Text>
              
              {/* Decorative Line */}
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </View>
          </Animated.View>

          {/* Terms Sections */}
          <Animated.View style={{ transform: [{ translateY: slideUpAnim }] }}>
            <View style={styles.termsSection}>
              <Text style={styles.sectionTitle}>
                <View style={styles.sectionDot} />
                Terms & Conditions
              </Text>
              {terms.map((item, index) => (
                <TermCard key={index} {...item} index={index} />
              ))}
            </View>
          </Animated.View>

          {/* Agreement Notice */}
          <Animated.View style={[styles.noticeCard, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.noticeIconCircle}>
              <MaterialCommunityIcons name="handshake-outline" size={28} color="#f9c349" />
            </View>
            <Text style={styles.noticeTitle}>Your Agreement</Text>
            <Text style={styles.noticeText}>
              By using tdc services, you acknowledge that you have read, understood, and agree to be bound 
              by these terms and conditions.
            </Text>
            <View style={styles.noticeCheckRow}>
              <Ionicons name="checkmark-circle" size={20} color="#f9c349" />
              <Text style={styles.noticeCheckText}>I understand and agree</Text>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#f9c349" style={styles.footerIcon} />
            <Text style={styles.footerNote}>
              Designed to protect the interests of the student community.
            </Text>
            <View style={styles.footerBrand}>
              <Text style={styles.footerLogo}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
              <Text style={styles.footerText}>Building a Stronger Student Economy</Text>
            </View>
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 1,
    fontWeight: '600',
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
  heroBadge: {
    backgroundColor: "rgba(249, 195, 73, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(249, 195, 73, 0.3)",
  },
  heroBadgeText: {
    color: "#f9c349",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
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
  
  // Terms Section
  termsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f9c349',
    marginRight: 10,
  },
  termCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    alignItems: 'flex-start',
  },
  termIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  termContent: {
    flex: 1,
  },
  termTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  termText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontWeight: '500',
  },
  
  // Notice Card
  noticeCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    alignItems: 'center',
    elevation: 4,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  noticeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 16,
  },
  noticeCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9c34910',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  noticeCheckText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 10,
  },
  footerIcon: {
    marginBottom: 8,
  },
  footerNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontWeight: '600',
    paddingHorizontal: 40,
    lineHeight: 18,
    marginBottom: 16,
  },
  footerBrand: {
    alignItems: 'center',
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