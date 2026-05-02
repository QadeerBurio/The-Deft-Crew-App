import React, { useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,  
  TouchableOpacity, 
  StatusBar,
  Animated,
  Linking
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyScreen() {
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
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

  const openEmail = () => Linking.openURL("mailto:info@thedeftcrew.com");

  const privacyPoints = [
    {
      icon: "database-lock-outline",
      title: "Data Collection",
      content: "We only collect essential info like your University ID to verify your status. This unlocks exclusive student deals and career opportunities."
    },
    {
      icon: "eye-off-outline",
      title: "Zero Third-Party Sharing",
      content: "tdc never sells your personal data. Your academic details are never shared with brands without your explicit consent."
    },
    {
      icon: "shield-key-outline",
      title: "End-to-End Encryption",
      content: "All sensitive info is encrypted. Our systems follow global security standards to protect your student profile from unauthorized access."
    },
    {
      icon: "bell-ring-outline",
      title: "Career & Deal Alerts",
      content: "You have full control. We only notify you about internships, exchange programs, and brand discounts that actually matter to you."
    },
    {
      icon: "account-cancel-outline",
      title: "Right to be Forgotten",
      content: "You can delete your tdc account and all associated data instantly via settings or by reaching out to our support crew."
    },
  ];

  const PrivacyCard = ({ icon, title, content, index }) => (
    <Animated.View style={{
      opacity: cardAnims[index],
      transform: [{ translateY: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
    }}>
      <View style={styles.privacyCard}>
        <View style={styles.privacyIconBox}>
          <MaterialCommunityIcons name={icon} size={22} color="#f9c349" />
        </View>
        <View style={styles.privacyContent}>
          <Text style={styles.privacyTitle}>{title}</Text>
          <Text style={styles.privacyText}>{content}</Text>
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
        <Text style={styles.headerTitle}>Privacy Center</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Banner */}
          <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
            <View style={styles.heroGradient}>
              <View style={styles.heroIconCircle}>
                <View style={styles.heroIconGradient}>
                  <MaterialCommunityIcons name="shield-check-outline" size={40} color="#fff" />
                </View>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>TRUST & SAFETY</Text>
              </View>
              <Text style={styles.heroTitle}>Your Privacy is Our Priority</Text>
              <Text style={styles.heroSubtitle}>
                The Deft Crew uses bank-grade encryption to ensure your student data and academic identity remains private.
              </Text>
              
              {/* Decorative Line */}
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </View>
          </Animated.View>

          {/* Privacy Points */}
          <View style={styles.privacySection}>
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              Student Data Handling
            </Text>
            {privacyPoints.map((point, index) => (
              <PrivacyCard key={index} {...point} index={index} />
            ))}
          </View>

          {/* Security Stats */}
          <Animated.View style={[styles.statsCard, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>256-bit</Text>
                <Text style={styles.statLabel}>Encryption</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>0</Text>
                <Text style={styles.statLabel}>Data Breaches</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>24/7</Text>
                <Text style={styles.statLabel}>Monitoring</Text>
              </View>
            </View>
          </Animated.View>

          {/* Contact Support */}
          <Animated.View style={[styles.contactSection, { transform: [{ translateY: slideUpAnim }] }]}>
            <TouchableOpacity 
              style={styles.contactCard}
              activeOpacity={0.8}
              onPress={openEmail}
            >
              <View style={styles.contactIconBox}>
                <MaterialCommunityIcons name="email-outline" size={24} color="#f9c349" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>Have Questions?</Text>
                <Text style={styles.contactText}>info@thedeftcrew.com</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#f9c349" />
            </TouchableOpacity>
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
  
  // Privacy Section
  privacySection: {
    paddingHorizontal: 16,
    marginTop: 8,
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
  privacyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    alignItems: 'flex-start',
  },
  privacyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontWeight: '500',
  },
  
  // Security Stats
  statsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: "#f9c349",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    backgroundColor: '#1a1a1a',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f9c349',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(249, 195, 73, 0.15)',
    height: '60%',
    alignSelf: 'center',
  },
  
  // Contact Section
  contactSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  contactIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  contactText: {
    fontSize: 12,
    color: '#f9c349',
    fontWeight: '600',
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