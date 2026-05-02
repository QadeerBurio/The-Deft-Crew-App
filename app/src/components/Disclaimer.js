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

export default function DisclaimerScreen() {
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

  const disclaimers = [
    {
      icon: "store-remove-outline",
      title: "Offer & Discount Accuracy",
      content: "tdc acts as a bridge between brands and students. We are not liable for the availability, quality, or fulfillment of discounts and products provided by third-party brands."
    },
    {
      icon: "briefcase-variant-outline",
      title: "Career Hub & Internships",
      content: "The Career Hub provides information on job opportunities and internships. tdc does not guarantee employment, placement, or the accuracy of job descriptions provided by external recruiters."
    },
    {
      icon: "airplane-off",
      title: "Travel & Global Programs",
      content: "Travel packages and international exchange details are for informational purposes. tdc is not responsible for visa rejections, travel delays, or changes in university exchange policies."
    },
    {
      icon: "clipboard-check-outline",
      title: "Status Verification",
      content: "Users are responsible for maintaining valid student credentials. tdc reserves the right to modify or withdraw access to specific ecosystem perks without prior notice."
    },
    {
      icon: "information-outline",
      title: "Informational Scope",
      content: "The Deft Crew platform is provided \"as is.\" While we strive for excellence, we do not warrant that the app will be error-free or that all student rewards will be redeemable at all times."
    },
  ];

  const DisclaimerCard = ({ icon, title, content, index }) => (
    <Animated.View style={{
      opacity: cardAnims[index],
      transform: [{ translateY: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
    }}>
      <View style={styles.disclaimerCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <MaterialCommunityIcons name={icon} size={22} color="#f9c349" />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Text style={styles.cardText}>{content}</Text>
        <View style={styles.cardAccent} />
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
        <Text style={styles.headerTitle}>Disclaimer</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Section */}
          <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
            <View style={styles.heroGradient}>
              <View style={styles.heroIconCircle}>
                <View style={styles.heroIconGradient}>
                  <MaterialCommunityIcons name="shield-alert-outline" size={40} color="#fff" />
                </View>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>LEGAL NOTICE</Text>
              </View>
              <Text style={styles.heroTitle}>Important Disclaimer</Text>
              <Text style={styles.heroSubtitle}>
                Please read the following legal exclusions regarding the tdc Student Ecosystem.
              </Text>
              
              {/* Decorative Line */}
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </View>
          </Animated.View>

          {/* Warning Banner */}
          <Animated.View style={[styles.warningBanner, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.warningIconBox}>
              <Ionicons name="warning-outline" size={24} color="#f9c349" />
            </View>
            <Text style={styles.warningText}>
              The following information outlines the limitations and exclusions of tdc services.
            </Text>
          </Animated.View>

          {/* Disclaimer Cards */}
          <View style={styles.disclaimerSection}>
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              Legal Exclusions
            </Text>
            {disclaimers.map((item, index) => (
              <DisclaimerCard key={index} {...item} index={index} />
            ))}
          </View>

          {/* Legal Footer */}
          <Animated.View style={[styles.legalFooter, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.legalBorder} />
            <View style={styles.legalContent}>
              <MaterialCommunityIcons name="scale-balance" size={24} color="#f9c349" />
              <Text style={styles.legalText}>
                By continuing to use tdc services, you acknowledge and accept these terms.
              </Text>
            </View>
            <View style={styles.legalBorder} />
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
            <Text style={styles.footerBrand}>© 2026 The Deft Crew. All Rights Reserved.</Text>
            <Text style={styles.footerVersion}>Ecosystem Version 1.0.5</Text>
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
  
  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f9c34910',
    borderWidth: 1,
    borderColor: '#f9c34920',
  },
  warningIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: '600',
    lineHeight: 18,
  },
  
  // Disclaimer Section
  disclaimerSection: {
    paddingHorizontal: 16,
    marginTop: 20,
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
  disclaimerCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    flex: 1,
  },
  cardText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontWeight: '500',
    paddingLeft: 54,
  },
  cardAccent: {
    position: 'absolute',
    left: 18,
    bottom: 0,
    right: 18,
    height: 2,
    backgroundColor: '#f9c34920',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  
  // Legal Footer
  legalFooter: {
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  legalBorder: {
    height: 1,
    backgroundColor: '#f0f0f0',
    alignSelf: 'stretch',
    marginVertical: 16,
  },
  legalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  legalText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 12,
    lineHeight: 18,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  footerLogo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  footerBrand: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 2,
  },
  footerVersion: {
    fontSize: 10,
    color: '#ccc',
    fontWeight: '500',
  },
});