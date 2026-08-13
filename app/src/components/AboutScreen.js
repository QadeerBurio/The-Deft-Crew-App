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
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";

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
    { title: "Student Deals", desc: "Exclusive discounts across 200+ brands", icon: "pricetag-outline", color: "#f9c349" },
    { title: "Skills Share", desc: "Connect & learn from fellow students", icon: "people-outline", color: "#a29bfe" },
    { title: "Premium Events", desc: "Workshops & networking events", icon: "calendar-outline", color: "#fd79a8" },
    { title: "Resume Builder", desc: "AI-powered ATS-optimized resumes", icon: "document-text-outline", color: "#00b894" },
    { title: "Scholarships", desc: "Internal grants & external funding", icon: "school-outline", color: "#ffa502" },
    { title: "Student Travel", desc: "Budget-friendly travel packages", icon: "airplane-outline", color: "#6c5ce7" },
    { title: "Career Mentorship", desc: "Guidance from industry experts", icon: "briefcase-outline", color: "#e17055" },
    { title: "Community Forum", desc: "Discuss, share & grow together", icon: "chatbubbles-outline", color: "#00cec9" },
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
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa00" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
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
              colors={['#1a1a1a', '#2d2d2d']}
              style={styles.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.heroBrandName}>The Deft Crew</Text>
              <View style={styles.heroTaglineBadge}>
                <Text style={styles.heroTaglineText}>STUDENT ECOSYSTEM</Text>
              </View>
              <Text style={styles.heroDesc}>
                Pakistan's largest{' '}
                <Text style={{ fontWeight: '700', color: '#f9c349' }}>student community</Text>
                . From savings to career growth, tdc is your ultimate lifestyle partner.
              </Text>

              <View style={styles.decorLine}>
                <View style={styles.decorSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorSegment} />
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Video Section - Controllable */}
          <Animated.View style={[styles.videoWrapper, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                source={videoSource}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay={false}
                isMuted={isMuted}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                useNativeControls={false}
                onLoad={() => setIsVideoReady(true)}
                onError={(error) => console.log('Video error:', error)}
              />

              {/* Video Controls */}
              <View style={styles.videoOverlay}>
                <TouchableOpacity
                  onPress={handlePlayPause}
                  style={styles.playBtn}
                  activeOpacity={0.8}
                  disabled={!isVideoReady}
                >
                  <LinearGradient
                    colors={['#f9c349', '#e6b800']}
                    style={styles.playBtnGradient}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={22}
                      color="#1a1a1a"
                      style={{ marginLeft: isPlaying ? 0 : 2 }}
                    />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Bottom Controls */}
                <View style={styles.videoBottomControls}>
                  <View style={styles.progressSection}>
                    <Text style={styles.timeLabel}>{formatTime(videoStatus.positionMillis)}</Text>
                    <TouchableOpacity 
                      style={styles.progressBarBase}
                      onPress={() => {}} // Seek functionality can be added
                    >
                      <View style={[styles.progressBarFill, {
                        width: videoStatus.durationMillis && videoStatus.durationMillis > 0
                          ? `${(videoStatus.positionMillis / videoStatus.durationMillis) * 100}%`
                          : '0%'
                      }]} />
                    </TouchableOpacity>
                    <Text style={styles.timeLabel}>{formatTime(videoStatus.durationMillis)}</Text>
                  </View>

                  <View style={styles.videoActions}>
                    <TouchableOpacity onPress={handleMute} style={styles.videoIconBtn} activeOpacity={0.7}>
                      <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* About tdc App */}
          <Animated.View style={[styles.aboutSection, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>About tdc App</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutText}>
                tdc (The Deft Crew) is Pakistan's premier student ecosystem app. We connect students with exclusive discounts, career opportunities, and a vibrant community.
              </Text>
              <View style={styles.aboutHighlights}>
                <View style={styles.highlightItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#f9c349" />
                  <Text style={styles.highlightText}>200+ Partner Brands</Text>
                </View>
                <View style={styles.highlightItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#f9c349" />
                  <Text style={styles.highlightText}>50+ Universities</Text>
                </View>
                <View style={styles.highlightItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#f9c349" />
                  <Text style={styles.highlightText}>10,000+ Active Students</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* About Company */}
          <Animated.View style={[styles.aboutSection, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>About Company</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutText}>
                The Deft Crew is a Karachi-based ed-tech startup founded in 2023. We're on a mission to empower students across Pakistan with tools, resources, and opportunities for academic and professional success.
              </Text>
              <View style={styles.companyInfo}>
                <View style={styles.companyItem}>
                  <Ionicons name="location-outline" size={14} color="#94A3B8" />
                  <Text style={styles.companyText}>Karachi, Pakistan</Text>
                </View>
                <View style={styles.companyItem}>
                  <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                  <Text style={styles.companyText}>Founded 2023</Text>
                </View>
                <View style={styles.companyItem}>
                  <Ionicons name="people-outline" size={14} color="#94A3B8" />
                  <Text style={styles.companyText}>Team of 15+</Text>
                </View>
                <View style={styles.companyItem}>
                  <Ionicons name="globe-outline" size={14} color="#94A3B8" />
                  <Text style={styles.companyText}>tdc.com.pk</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Core Pillars */}
          <View style={styles.pillarsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Features</Text>
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
            <Text style={styles.footerLogo}>tdc</Text>
            <Text style={styles.footerText}>Building a Stronger Student Economy.</Text>
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
    backgroundColor: "#f8f9fa",
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
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
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  heroTaglineBadge: {
    backgroundColor: "rgba(249, 195, 73, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(249, 195, 73, 0.15)",
  },
  heroTaglineText: {
    color: "#f9c349",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  heroDesc: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: '400',
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
    backgroundColor: '#f9c349',
    borderRadius: 1,
  },
  decorDiamond: {
    width: 5,
    height: 5,
    backgroundColor: '#f9c349',
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
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  videoContainer: {
    height: 170,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
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
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
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
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  progressBarBase: {
    flex: 1,
    height: 2.5,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: 6,
    borderRadius: 1.5,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#f9c349",
    borderRadius: 1.5
  },
  timeLabel: {
    color: "rgba(0,0,0,0.4)",
    fontSize: 9,
    fontWeight: "600",
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
    backgroundColor: 'rgba(0,0,0,0.04)',
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
    backgroundColor: '#f9c349',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginLeft: 10,
  },
  aboutCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  aboutText: {
    fontSize: 12.5,
    color: '#444',
    lineHeight: 20,
    fontWeight: '400',
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
    backgroundColor: 'rgba(249, 195, 73, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highlightText: {
    fontSize: 10,
    color: '#555',
    fontWeight: '500',
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
    color: '#666',
    fontWeight: '400',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
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
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 1,
    letterSpacing: 0.2,
  },
  featureDesc: {
    fontSize: 9.5,
    color: "#94A3B8",
    lineHeight: 13,
    fontWeight: '400',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 4,
  },
  footerLogo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.4)',
    marginTop: 4,
    fontWeight: '400',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  footerSubText: {
    fontSize: 9,
    color: 'rgba(0, 0, 0, 0.2)',
    marginTop: 4,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});