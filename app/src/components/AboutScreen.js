import React, { useRef, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
  Platform
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";

import { color as T, font as F } from "../theme/tokens";
const { width, height } = Dimensions.get("window");

export default function AboutScreen() {
  const navigation = useNavigation();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const [videoStatus, setVideoStatus] = React.useState({});
  const [isVideoReady, setIsVideoReady] = React.useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.95)).current;
  const slideUpAnim = useRef(new Animated.Value(25)).current;
  const featureAnims = useRef([...Array(8)].map(() => new Animated.Value(0))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const videoSource = require("../../../assets/images/tdcss.mp4");

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
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
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      ...featureAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(120 + i * 80),
          Animated.spring(anim, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
        ])
      ),
    ]).start();

    return () => {
      if (videoRef.current) {
        videoRef.current.pauseAsync();
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (videoRef.current && isVideoReady) {
      try {
        if (isPlaying) {
          await videoRef.current.pauseAsync();
        } else {
          await videoRef.current.playAsync();
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.log('Video play/pause error:', error);
      }
    }
  };

  const handleMute = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.setIsMutedAsync(!isMuted);
        setIsMuted(!isMuted);
      } catch (error) {
        console.log('Video mute error:', error);
      }
    }
  };

  const handlePlaybackStatusUpdate = (status) => {
    setVideoStatus(status);
    if (status.isLoaded) {
      setIsVideoReady(true);
    }
  };

  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const features = [
    { title: "Student Deals", desc: "Discounts at 100+ brands", icon: "pricetag-outline", color: T.yellow },
    { title: "Skills Share", desc: "Learn from other students", icon: "people-outline", color: "#a29bfe" },
    { title: "Premium Events", desc: "Workshops and meetups", icon: "calendar-outline", color: "#fd79a8" },
    { title: "Resume Builder", desc: "AI resumes that pass ATS", icon: "document-text-outline", color: "#00b894" },
    { title: "Scholarships", desc: "Grants and funding in one place", icon: "school-outline", color: "#ffa502" },
    { title: "AI Travel Planner", desc: "Plan trips on a student budget", icon: "airplane-outline", color: "#6c5ce7" },
    { title: "Career Mentorship", desc: "Advice from people in the industry", icon: "briefcase-outline", color: "#e17055" },
    { title: "Community Forum", desc: "Ask, confess, connect", icon: "chatbubbles-outline", color: "#00cec9" },
  ];

  const FeatureCard = ({ item, index }) => {
    const translateY = featureAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
    });

    const scale = featureAnims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.88, 1.02, 1],
    });

    return (
      <Animated.View
        style={[
          styles.featureWrapper,
          {
            opacity: featureAnims[index],
            transform: [{ scale }, { translateY }],
          },
        ]}
      >
        <View style={styles.featureBox}>
          <Animated.View style={[styles.featureIconBox, { 
            backgroundColor: item.color + '12',
            transform: [{ scale: pulseAnim }]
          }]}>
            <Ionicons name={item.icon} size={16} color={item.color} />
          </Animated.View>
          <Text style={styles.featureTitle}>{item.title}</Text>
          <Text style={styles.featureDesc}>{item.desc}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={T.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>about</Text>
        <View style={{ width: 34 }} />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Hero - No Logo */}
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
              colors={[T.ink, T.ink]}
              style={styles.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.heroBrandName}>tdc<Text style={{color:T.yellow}}>.</Text></Text>
              <View style={styles.heroTaglineBadge}>
                <Text style={styles.heroTaglineText}>student ecosystem</Text>
              </View>
              <Text style={styles.heroDesc}>
                Pakistan's {' '}
                <Text style={{ fontWeight: '700', color: T.yellow }}>student & alumni community</Text>
                . for savings, careers and everything in between.
              </Text>

              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </LinearGradient>
          </Animated.View>

         

          {/* About tdc App */}
          <Animated.View style={[styles.aboutSection, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>about tdc app</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutText}>
                tdc is the all-in-one student app. deals, careers, events, networking and your campus community, in one place.
              </Text>
              <View style={styles.aboutHighlights}>
                <View style={styles.highlightItem}>
                  <Ionicons name="checkmark-circle" size={14} color={T.yellow} />
                  <Text style={styles.highlightText}>100+ Partner Brands</Text>
                </View>
                <View style={styles.highlightItem}>
                  <Ionicons name="checkmark-circle" size={14} color={T.yellow} />
                  <Text style={styles.highlightText}>15+ Universities</Text>
                </View>
                <View style={styles.highlightItem}>
                  <Ionicons name="checkmark-circle" size={14} color={T.yellow} />
                  <Text style={styles.highlightText}>10,000+ Active Students</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* About Company */}
          <Animated.View style={[styles.aboutSection, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>our story</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutText}>
                While building The Deft Crew, MSB sat across from thousands of students and fresh grads. Talent was never the problem. Access was.
Students were paying full price at places that would happily give them a discount. Internships and jobs went to whoever heard about
them first. Events happened across city and nobody knew. Good people sat in the same city and never met.
The idea for tdc came in 2025. By early 2026, it was live. Student discounts at 100+ brands, internships and jobs in one feed, events near you, and a community of students who actually help each other. One app. Everything a student needs.

              </Text>
              <View style={styles.companyInfo}>
                <View style={styles.companyItem}>
                  <Ionicons name="location-outline" size={14} color={T.textFaint} />
                  <Text style={styles.companyText}>karachi, pakistan</Text>
                </View>
                <View style={styles.companyItem}>
                  <Ionicons name="calendar-outline" size={14} color={T.textFaint} />
                  <Text style={styles.companyText}>Founded 2026</Text>
                </View>
                <View style={styles.companyItem}>
                  <Ionicons name="people-outline" size={14} color={T.textFaint} />
                  <Text style={styles.companyText}>Team of 25+</Text>
                </View>
                <View style={styles.companyItem}>
                  <Ionicons name="globe-outline" size={14} color={T.textFaint} />
                  <Text style={styles.companyText}>gettdc.pk</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Core Pillars */}
          <View style={styles.pillarsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>features</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.grid}>
              {features.map((item, index) => (
                <FeatureCard key={index} item={item} index={index} />
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>tdc<Text style={{color:T.yellow}}>.</Text></Text>
            <Text style={styles.footerText}>Making student life simpler and careers easier.</Text>
            <Text style={styles.footerSubText}>© 2026 The Deft Crew</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.paper,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.line,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.ink,
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingBottom: 30,
    paddingTop: 8,
  },

  // Hero - No Logo
  heroWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroCard: {
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 160,
  },
  heroBrandName: {
    fontSize: 20,
    fontFamily: F.heading,
    color: T.white,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  heroTaglineBadge: {
    backgroundColor: T.yellowSoft,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: T.line,
  },
  heroTaglineText: {
    color: T.yellow,
    fontSize: 8,
    fontFamily: F.bodyBold,
    letterSpacing: 1.5,
  },
  heroDesc: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: F.body,
    paddingHorizontal: 4,
  },
  decorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    opacity: 0.3,
  },
  decorSegment: {
    width: 20,
    height: 1.5,
    backgroundColor: T.yellow,
    borderRadius: 1,
  },
  decorDiamond: {
    width: 5,
    height: 5,
    backgroundColor: T.yellow,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 8,
  },

  // Video Section
  videoWrapper: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.line,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  videoContainer: {
    height: 170,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: T.ink,
  },
  video: {
    flex: 1,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  },
  playBtn: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  playBtnGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoBottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: T.line,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  progressBarBase: {
    flex: 1,
    height: 2.5,
    backgroundColor: T.sand,
    marginHorizontal: 6,
    borderRadius: 1.5,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: T.yellow,
    borderRadius: 1.5
  },
  timeLabel: {
    color: T.textMuted,
    fontSize: 9,
    fontFamily: F.bodySemi,
    width: 30,
    textAlign: "center"
  },
  videoActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },
  videoIconBtn: {
    padding: 4,
    backgroundColor: T.sand,
    borderRadius: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // About Sections
  aboutSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.yellow,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.ink,
    letterSpacing: 0.3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.sand,
    marginLeft: 10,
  },
  aboutCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  aboutText: {
    fontSize: 12.5,
    color: T.textMuted,
    lineHeight: 20,
    fontFamily: F.body,
  },
  aboutHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.yellowSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highlightText: {
    fontSize: 10,
    color: T.textMuted,
    fontFamily: F.bodyMedium,
  },
  companyInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 12,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyText: {
    fontSize: 11,
    color: T.textMuted,
    fontFamily: F.body,
  },

  // Pillars
  pillarsSection: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureWrapper: {
    width: '48%',
    marginBottom: 8,
  },
  featureBox: {
    borderRadius: 12,
    padding: 11,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  featureIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  featureTitle: {
    fontSize: 11,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginBottom: 1,
    letterSpacing: 0.2,
  },
  featureDesc: {
    fontSize: 9.5,
    color: T.textFaint,
    lineHeight: 13,
    fontFamily: F.body,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 4,
  },
  footerLogo: {
    fontSize: 18,
    fontFamily: F.heading,
    color: T.ink,
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 10,
    color: T.textMuted,
    marginTop: 4,
    fontFamily: F.body,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  footerSubText: {
    fontSize: 9,
    color: T.textMuted,
    marginTop: 4,
    fontFamily: F.body,
    letterSpacing: 0.3,
  },
});