import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  StatusBar,
  ScrollView,
  Dimensions,
  Platform
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

export default function ContactUsScreen() {
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.8)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const cardAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  const socialAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
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

    // Glow pulse animation
    const glowPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    glowPulse.start();

    // Pulse animation for icons
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      ...cardAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(200 + i * 120),
          Animated.spring(anim, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
        ])
      ),
      ...socialAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(500 + i * 100),
          Animated.spring(anim, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const openDial = () => Linking.openURL("tel:+923222969595");
  const openEmail = () => Linking.openURL("mailto:hello@thedeftcrew.com");
  const openWhatsApp = () => Linking.openURL("https://wa.me/923222969595");
  const openSocial = (url) => Linking.openURL(url);

  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const ContactItem = ({ icon, label, value, onPress, color, index, isLast }) => {
    const translateX = cardAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [index % 2 === 0 ? -30 : 30, 0],
    });

    const scale = cardAnims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1.05, 1],
    });

    return (
      <Animated.View
        style={[
          styles.contactItemWrapper,
          {
            opacity: cardAnims[index],
            transform: [
              { translateX },
              { scale },
            ],
          },
        ]}
      >
        <TouchableOpacity 
          style={[styles.contactItem, isLast && { borderBottomWidth: 0 }]} 
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={styles.contactLeft}>
            <Animated.View 
              style={[
                styles.contactIconBox, 
                { 
                  backgroundColor: color + '15',
                  borderColor: color + '30',
                  transform: [{ scale: pulseAnim }],
                }
              ]}
            >
              <LinearGradient
                colors={[color, color + '80']}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {icon}
              </LinearGradient>
            </Animated.View>
            <View>
              <Text style={styles.contactLabel}>{label}</Text>
              <Text style={styles.contactValue}>{value}</Text>
            </View>
          </View>
          <Animated.View style={[styles.arrowCircle, { backgroundColor: color + '15' }]}>
            <Ionicons name="chevron-forward" size={16} color={color} />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const SocialButton = ({ icon, color, url, index }) => {
    const scale = socialAnims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.5, 1.2, 1],
    });

    return (
      <Animated.View
        style={[
          styles.socialWrapper,
          {
            opacity: socialAnims[index],
            transform: [{ scale }],
          },
        ]}
      >
        <TouchableOpacity 
          style={[styles.socialButton, { borderColor: color + '30' }]} 
          onPress={() => openSocial(url)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ffffff', '#fafafa']}
            style={styles.socialGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <FontAwesome5 name={icon} size={22} color={color} />
            </Animated.View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={22} color="#1a1a1a" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Section */}
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
              colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
              style={styles.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.View
                style={[
                  styles.heroGlow,
                  { opacity: glowOpacity },
                ]}
              />
              
              <Animated.View style={[styles.heroIconCircle, { transform: [{ rotate: spin }] }]}>
                <LinearGradient
                  colors={['#f9c349', '#f5a623']}
                  style={styles.heroIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="headset-outline" size={40} color="#fff" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.heroTitle}>Get in Touch</Text>
              <Text style={styles.heroSubtitle}>
                Our team at tdc is ready to assist you with any student offer queries.
              </Text>
              
              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>

              {/* Floating particles */}
              <View style={styles.particlesContainer}>
                {[...Array(6)].map((_, i) => {
                  const particleAnim = useRef(new Animated.Value(0)).current;
                  
                  useEffect(() => {
                    Animated.loop(
                      Animated.sequence([
                        Animated.timing(particleAnim, {
                          toValue: 1,
                          duration: 1500 + Math.random() * 1000,
                          useNativeDriver: true,
                        }),
                        Animated.timing(particleAnim, {
                          toValue: 0,
                          duration: 1500 + Math.random() * 1000,
                          useNativeDriver: true,
                        }),
                      ])
                    ).start();
                  }, []);

                  const particleTranslateY = particleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -15 - Math.random() * 20],
                  });

                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.particle,
                        {
                          top: 10 + Math.random() * 80,
                          left: 10 + Math.random() * 80,
                          backgroundColor: ['#f9c349', '#4ecdc4', '#6c5ce7', '#ff6b6b'][i % 4],
                          transform: [{ translateY: particleTranslateY }],
                          opacity: particleAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.2, 0.7, 0.2],
                          }),
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </LinearGradient>
          </Animated.View>

         

          {/* Contact Methods */}
          <View style={styles.contactSection}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.sectionDot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.sectionTitle}>Contact Methods</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.contactCard}>
              <ContactItem 
                icon={<Ionicons name="call-outline" size={22} color="#fff" />}
                label="Customer Care"
                value="+92 322 2969595"
                onPress={openDial}
                color="#f9c349"
                index={0}
              />
              <ContactItem 
                icon={<MaterialCommunityIcons name="email-outline" size={22} color="#fff" />}
                label="Official Email"
                value="hello@thedeftcrew.com"
                onPress={openEmail}
                color="#4ecdc4"
                index={1}
              />
              <ContactItem 
                icon={<FontAwesome5 name="whatsapp" size={22} color="#fff" />}
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
          <Animated.View 
            style={[
              styles.socialSection, 
              { 
                transform: [{ translateY: slideUpAnim }],
                opacity: fadeAnim,
              }
            ]}
          >
            <View style={styles.separatorContainer}>
              <View style={styles.line} />
              <Text style={styles.socialText}>Connect With Us</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.socialRow}>
              <SocialButton 
                icon="facebook-f" 
                color="#1877F2" 
                url="https://www.facebook.com/share/1CijYDto1b/"
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
          <Animated.View 
            style={[
              styles.footer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#f8f9fa', '#f8f9fa']}
              style={styles.footerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.footerLogo}>
                tdc<Text style={styles.footerLogoAccent}>.</Text>
              </Text>
              <Text style={styles.footerText}>Building a Stronger Student Economy.</Text>
              <View style={styles.footerLine} />
              
              <Text style={styles.footerSubText}>© 2026 tdc Privilege Program</Text>
            </LinearGradient>
          </Animated.View>
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
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#f8f9fa',
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1a1a1a', 
    letterSpacing: 0.5,
  },
  scrollContent: { 
    paddingBottom: 40,
    paddingTop: 8,
  },
  
  // Hero
  heroWrapper: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#f9c349',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  heroCard: { 
    padding: 30, 
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 320,
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f9c349',
    opacity: 0.3,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
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
    ...Platform.select({
      ios: {
        shadowColor: '#f9c349',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  heroTitle: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#fff', 
    marginBottom: 10, 
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  heroSubtitle: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.8)', 
    textAlign: 'center', 
    lineHeight: 22, 
    fontWeight: '500', 
    paddingHorizontal: 5,
  },
  decorLine: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 20,
    opacity: 0.6,
  },
  decorSegment: { 
    width: 30, 
    height: 2, 
    backgroundColor: '#f9c349', 
    borderRadius: 1,
  },
  decorDiamond: { 
    width: 8, 
    height: 8, 
    backgroundColor: '#f9c349', 
    transform: [{ rotate: '45deg' }], 
    marginHorizontal: 10,
  },
  
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statCardGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Contact Section
  contactSection: { 
    paddingHorizontal: 16, 
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginRight: 12,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginLeft: 12,
  },
  contactCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    paddingHorizontal: 4,
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  contactItemWrapper: {
    marginHorizontal: 4,
  },
  contactItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  contactLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
  },
  contactIconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#999', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 2,
  },
  contactValue: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1a1a1a',
  },
  arrowCircle: { 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  
  // Social Section
  socialSection: { 
    marginTop: 24, 
    paddingHorizontal: 16,
  },
  separatorContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
  },
  line: { 
    flex: 1, 
    height: 1, 
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  socialText: { 
    marginHorizontal: 15, 
    color: '#999', 
    fontSize: 12, 
    fontWeight: '800', 
    letterSpacing: 1,
  },
  socialRow: { 
    flexDirection: 'row', 
    justifyContent: 'center',
    gap: 12,
  },
  socialWrapper: {
    flex: 1,
    maxWidth: 60,
  },
  socialButton: { 
    width: 60, 
    height: 60, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  socialGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // CTA
  ctaWrapper: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  ctaCard: {
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  ctaDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  ctaButton: {
    marginTop: 16,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginRight: 8,
  },
  
  // Footer
  footer: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  footerGradient: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  footerLogo: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#000000',
    letterSpacing: 1,
  },
  footerLogoAccent: {
    color: '#f9c349',
  },
  footerText: { 
    fontSize: 12, 
    color: 'rgba(0, 0, 0, 0.6)', 
    marginTop: 6, 
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: 12,
  },

  
  footerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  footerSubText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.3)',
    marginTop: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});