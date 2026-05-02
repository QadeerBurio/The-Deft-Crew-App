import React, { useRef, useEffect } from "react";
import { 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  StatusBar,
  Animated
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const featureAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      ...featureAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(300 + i * 100),
          Animated.spring(anim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const features = [
    { id: 1, title: "Student Deals", desc: "Exclusive discounts tailored for students.", icon: "school-outline", color: "#f9c349" },
    { id: 2, title: "Career Hub", desc: "Top-tier internships and job opportunities.", icon: "briefcase-check-outline", color: "#f9c349" },
    { id: 3, title: "Student Travel", desc: "Curated budget-friendly travel packages.", icon: "airplane-takeoff", color: "#f9c349" },
    { id: 4, title: "Global Exchange", desc: "Access to international study programs.", icon: "earth-arrow-right", color: "#f9c349" },
  ];

  const FeatureCard = ({ item, index }) => (
    <Animated.View style={[styles.featureBox, {
      opacity: featureAnims[index],
      transform: [
        { scale: featureAnims[index].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
        { translateY: featureAnims[index].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
      ],
    }]}>
      <View style={[styles.featureIconBox, { backgroundColor: item.color + '15' }]}>
        <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
      </View>
      <Text style={styles.featureTitle}>{item.title}</Text>
      <Text style={styles.featureDesc}>{item.desc}</Text>
      <View style={[styles.featureAccentBar, { backgroundColor: item.color }]} />
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
        <Text style={styles.headerTitle}>About tdc</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Section */}
          <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
            <View style={styles.heroGradient}>
              <View style={styles.heroLogoCircle}>
                <Text style={styles.heroLogoText}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
              </View>
              <Text style={styles.heroBrandName}>The Deft Crew</Text>
              <View style={styles.heroTaglineBadge}>
                <Text style={styles.heroTaglineText}>THE STUDENT ECOSYSTEM</Text>
              </View>
              <Text style={styles.heroDesc}>
                We're building Pakistan's largest{' '}
                <Text style={{ fontWeight: '800', color: '#f9c349' }}>student community</Text>
                . From savings to career growth, tdc is your ultimate lifestyle partner.
              </Text>
              
              {/* Decorative Line */}
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </View>
          </Animated.View>

          {/* Value Propositions */}
          <Animated.View style={[styles.valuesSection, { transform: [{ translateY: slideUpAnim }] }]}>
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              What's Inside The Crew?
            </Text>
            <View style={styles.valuesCard}>
              {[
                { text: "Verified student-only marketplace.", icon: "shield-check-outline" },
                { text: "Seamless, paperless redemption.", icon: "cellphone-wireless" },
                { text: "Community-driven networking.", icon: "account-group-outline" }
              ].map((item, index) => (
                <View key={index} style={[styles.valueItem, index < 2 && styles.valueItemBorder]}>
                  <View style={styles.valueIconBox}>
                    <MaterialCommunityIcons name={item.icon} size={20} color="#f9c349" />
                  </View>
                  <Text style={styles.valueText}>{item.text}</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#f9c349" style={styles.valueCheck} />
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Core Pillars */}
          <View style={styles.pillarsSection}>
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              Core Pillars
            </Text>
            <View style={styles.grid}>
              {features.map((item, index) => (
                <FeatureCard key={item.id} item={item} index={index} />
              ))}
            </View>
          </View>

          {/* Mission Statement */}
          <Animated.View style={[styles.missionCard, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.missionIconCircle}>
              <MaterialCommunityIcons name="target" size={28} color="#f9c349" />
            </View>
            <Text style={styles.missionTitle}>Our Mission</Text>
            <Text style={styles.missionText}>
              To empower every student in Pakistan with access to exclusive savings, career opportunities, 
              and a network that accelerates their professional growth.
            </Text>
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
  heroLogoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(249, 195, 73, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(249, 195, 73, 0.3)",
    marginBottom: 16,
  },
  heroLogoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  heroBrandName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
  },
  heroTaglineBadge: {
    backgroundColor: "rgba(249, 195, 73, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(249, 195, 73, 0.3)",
  },
  heroTaglineText: {
    color: "#f9c349",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  heroDesc: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
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
  
  // Values Section
  valuesSection: {
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
  valuesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  valueItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  valueIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  valueText: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 1,
  },
  valueCheck: {
    marginLeft: 8,
  },
  
  // Pillars Section
  pillarsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureBox: {
    width: '47%',
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    elevation: 4,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: "hidden",
    position: 'relative',
  },
  featureIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: "#666",
    lineHeight: 16,
    fontWeight: '500',
  },
  featureAccentBar: {
    position: "absolute",
    bottom: 0,
    left: 18,
    right: 18,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    opacity: 0.6,
  },
  
  // Mission
  missionCard: {
    marginHorizontal: 16,
    marginTop: 12,
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
  missionIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  missionText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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