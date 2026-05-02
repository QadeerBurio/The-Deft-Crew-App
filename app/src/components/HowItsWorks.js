import React, { useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  Animated 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HowItWorks() {
  const navigation = useNavigation();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const stepAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;

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
    ]).start();
  }, []);

  const Step = ({ number, title, desc, icon, isLast, index }) => (
    <Animated.View style={{
      opacity: stepAnims[index],
      transform: [{ translateY: stepAnims[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
    }}>
      <View style={styles.stepContainer}>
        <View style={styles.leftColumn}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={icon} size={28} color="#ffffff" />
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{number}</Text>
            </View>
          </View>
          {!isLast && <View style={styles.verticalLine} />}
        </View>
        
        <View style={styles.rightColumn}>
          <Text style={styles.stepTitle}>{title}</Text>
          <Text style={styles.stepDesc}>{desc}</Text>
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
        <Text style={styles.headerTitle}>How tdc Works</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Section */}
          <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
            <View style={styles.heroSection}>
              <View style={styles.heroIconCircle}>
                <View style={styles.heroIconGradient}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={40} color="#fff" />
                </View>
              </View>
              <Text style={styles.heroLabel}>tdc STUDENT ECOSYSTEM</Text>
              <Text style={styles.heroTitle}>Unlock Your Potential</Text>
              <Text style={styles.heroSubtitle}>
                Follow these four core steps to navigate the tdc ecosystem—from daily savings to global career opportunities.
              </Text>
              
              {/* Decorative Line */}
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </View>
          </Animated.View>

          {/* Timeline Steps */}
          <View style={styles.timelineContainer}>
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              Your Journey
            </Text>
            <Step 
              number="1"
              icon="account-check-outline"
              title="Verify Your Identity"
              desc="Sign up with your university credentials. Verification unlocks secure access to student-only discounts and verified brand partnerships."
              index={0}
            />
            
            <Step 
              number="2"
              icon="ticket-percent-outline"
              title="Save on Brands"
              desc="Browse 200+ partner brands. Use your unique tdc student ID to redeem instant discounts on food, fashion, and tech."
              index={1}
            />
            
            <Step 
              number="3"
              icon="briefcase-search-outline"
              title="Career & Global Growth"
              desc="Access the Career Hub for exclusive internships and explore international exchange programs tailored for your academic path."
              index={2}
            />
            
            <Step 
              number="4"
              icon="airplane-takeoff"
              title="Travel & Rewards"
              desc="Activate student-specific travel packages and move up the tdc Privilege tiers by engaging with the community."
              isLast={true}
              index={3}
            />
          </View>

          {/* Call to Action */}
          <Animated.View style={{ transform: [{ translateY: slideUpAnim }] }}>
            <TouchableOpacity 
              style={styles.ctaButton} 
              activeOpacity={0.8} 
              onPress={() => navigation.navigate("Brands")}
            >
              <Text style={styles.ctaText}>Get Started Now</Text>
              <Ionicons name="rocket-outline" size={20} color="#FFF" style={{marginLeft: 10}} />
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footerNote}>
            Need help navigating the ecosystem? Contact the Deft Crew support team at info@thedeftcrew.com
          </Text>
          
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
    backgroundColor: "#ffffff" 
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Hero Section
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
  heroSection: {
    padding: 28,
    backgroundColor: "#1a1a1a",
    alignItems: 'center',
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
  heroLabel: {
    color: "#f9c349",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
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
  
  // Timeline
  timelineContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 20,
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
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  leftColumn: {
    alignItems: 'center',
    marginRight: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#f9c349",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  numberBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f9c349",
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
    width: 2,
    flex: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 10,
  },
  rightColumn: {
    flex: 1,
    paddingBottom: 40,
    paddingTop: 5,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
    fontWeight: '500',
  },
  
  // CTA
  ctaButton: {
    backgroundColor: "#1a1a1a",
    marginHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 8,
    shadowColor: "#f9c349",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  footerNote: {
    textAlign: 'center',
    color: "#999",
    fontSize: 11,
    marginTop: 20,
    paddingHorizontal: 50,
    lineHeight: 18,
    fontWeight: "600",
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 24,
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