import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  StatusBar,
  ScrollView
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function ContactUsScreen() {
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const cardAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  const socialAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;

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
      ...socialAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(600 + i * 80),
          Animated.spring(anim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const openDial = () => Linking.openURL("tel:+923222969595");
  const openEmail = () => Linking.openURL("mailto:hello@thedeftcrew.com");
  const openWhatsApp = () => Linking.openURL("https://wa.me/923222969595");
  const openSocial = (url) => Linking.openURL(url);

  const ContactItem = ({ icon, label, value, onPress, color, index, isLast }) => (
    <Animated.View style={{
      opacity: cardAnims[index],
      transform: [{ translateY: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
    }}>
      <TouchableOpacity 
        style={[styles.contactItem, isLast && { borderBottomWidth: 0 }]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.contactLeft}>
          <View style={[styles.contactIconBox, { backgroundColor: color + '15' }]}>
            {icon}
          </View>
          <View>
            <Text style={styles.contactLabel}>{label}</Text>
            <Text style={styles.contactValue}>{value}</Text>
          </View>
        </View>
        <View style={styles.arrowCircle}>
          <Ionicons name="chevron-forward" size={16} color="#f9c349" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const SocialButton = ({ icon, color, url, index }) => (
    <Animated.View style={{
      opacity: socialAnims[index],
      transform: [{ scale: socialAnims[index].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
    }}>
      <TouchableOpacity 
        style={[styles.socialButton, { borderColor: color + '30' }]} 
        onPress={() => openSocial(url)}
        activeOpacity={0.8}
      >
        <FontAwesome5 name={icon} size={20} color={color} />
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Section */}
          <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
            <View style={styles.heroGradient}>
              <View style={styles.heroIconCircle}>
                <View style={styles.heroIconGradient}>
                  <MaterialCommunityIcons name="headset-outline" size={40} color="#fff" />
                </View>
              </View>
              <Text style={styles.heroTitle}>Get in Touch</Text>
              <Text style={styles.heroSubtitle}>
                Our team at tdc is ready to assist you with any student offer queries.
              </Text>
              
              {/* Decorative Line */}
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </View>
          </Animated.View>

          {/* Contact Methods */}
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>
              <View style={styles.sectionDot} />
              Contact Methods
            </Text>
            <View style={styles.contactCard}>
              <ContactItem 
                icon={<Ionicons name="call-outline" size={22} color="#f9c349" />}
                label="Customer Care"
                value="+92 322 2969595"
                onPress={openDial}
                color="#f9c349"
                index={0}
              />
              <ContactItem 
                icon={<MaterialCommunityIcons name="email-outline" size={22} color="#f9c349" />}
                label="Official Email"
                value="hello@thedeftcrew.com"
                onPress={openEmail}
                color="#f9c349"
                index={1}
              />
              <ContactItem 
                icon={<FontAwesome5 name="whatsapp" size={22} color="#25D366" />}
                label="WhatsApp Support"
                value="+92 322 2969595"
                onPress={openWhatsApp}
                color="#25D366"
                index={2}
                isLast={true}
              />
            </View>
          </View>

          {/* Social Media Section */}
          <Animated.View style={[styles.socialSection, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.separatorContainer}>
              <View style={styles.line} />
              <Text style={styles.socialText}>Connect With Us</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.socialRow}>
              <SocialButton 
                icon="facebook-f" 
                color="#1877F2" 
                url="https://www.facebook.com/share/19rjCzPuhH/"
                index={0}
              />
              <SocialButton 
                icon="instagram" 
                color="#E4405F" 
                url="https://www.instagram.com/thedeftcrew?igsh=MWRnc3RnZ3hkN2s0Yw=="
                index={1}
              />
              <SocialButton 
                icon="linkedin-in" 
                color="#0A66C2" 
                url="https://www.linkedin.com/company/thedeftcrew/"
                index={2}
              />
              <SocialButton 
                icon="globe" 
                color="#f9c349" 
                url="https://thedeftcrew.com"
                index={3}
              />
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
            <Text style={styles.footerText}>Building a Stronger Student Economy</Text>
            <Text style={styles.versionText}>v1.0.4 • Secure Connection</Text>
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
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 14, 
    paddingVertical: 8,
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0', 
    backgroundColor: '#fff'
  },
  headerBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 12, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1a1a1a', 
    letterSpacing: 0.5 
  },
  scrollContent: { 
    paddingBottom: 40 
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
    shadowRadius: 15 
  },
  heroGradient: { 
    padding: 28, 
    alignItems: 'center', 
    backgroundColor: '#1a1a1a' 
  },
  heroIconCircle: { 
    marginBottom: 16, 
    borderRadius: 20, 
    overflow: 'hidden' 
  },
  heroIconGradient: { 
    width: 80, 
    height: 80, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f9c349' 
  },
  heroTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#fff', 
    marginBottom: 10, 
    textAlign: 'center' 
  },
  heroSubtitle: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.7)', 
    textAlign: 'center', 
    lineHeight: 21, 
    fontWeight: '500', 
    paddingHorizontal: 5 
  },
  decorLine: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 16 
  },
  decorSegment: { 
    width: 25, 
    height: 1.5, 
    backgroundColor: '#f9c349', 
    borderRadius: 1 
  },
  decorDiamond: { 
    width: 6, 
    height: 6, 
    backgroundColor: '#f9c349', 
    transform: [{ rotate: '45deg' }], 
    marginHorizontal: 8 
  },
  
  // Contact Section
  contactSection: { 
    paddingHorizontal: 16, 
    marginTop: 8 
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#1a1a1a', 
    marginBottom: 14, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  sectionDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#f9c349', 
    marginRight: 10 
  },
  contactCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    paddingHorizontal: 16,
    borderWidth: 2, 
    borderColor: '#f0f0f0' 
  },
  contactItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 18,
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  contactLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  contactIconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14 
  },
  contactLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#999', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 2 
  },
  contactValue: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1a1a1a' 
  },
  arrowCircle: { 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  // Social Section
  socialSection: { 
    marginTop: 28, 
    paddingHorizontal: 16 
  },
  separatorContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  line: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#f0f0f0' 
  },
  socialText: { 
    marginHorizontal: 15, 
    color: '#999', 
    fontSize: 12, 
    fontWeight: '800', 
    letterSpacing: 1 
  },
  socialRow: { 
    flexDirection: 'row', 
    justifyContent: 'center' 
  },
  socialButton: { 
    width: 56, 
    height: 56, 
    borderRadius: 18, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginHorizontal: 8,
    borderWidth: 2,
    elevation: 4,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  
  // Footer
  footer: { 
    alignItems: 'center', 
    marginTop: 32, 
    paddingVertical: 10 
  },
  footerLogo: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#1a1a1a' 
  },
  footerText: { 
    fontSize: 11, 
    color: '#999', 
    marginTop: 4, 
    fontWeight: '500' 
  },
  versionText: { 
    fontSize: 10, 
    color: '#ccc', 
    marginTop: 4, 
    fontWeight: '600' 
  },
});