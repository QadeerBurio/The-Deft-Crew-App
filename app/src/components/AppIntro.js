import React, { useRef, useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
  Platform,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

export default function AppIntroScreen() {
  const navigation = useNavigation();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoStatus, setVideoStatus] = useState({});
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([...Array(7)].map(() => new Animated.Value(0))).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.8)).current;

  const videoSource = require("../../../assets/images/tdcss.mp4");

  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  useEffect(() => {
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

    // Main entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.timing(logoRotate, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ...cardAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(200 + i * 120),
          Animated.spring(anim, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
        ])
      ),
    ]).start();

    // CTA pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(ctaPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (videoRef.current) {
          videoRef.current.pauseAsync();
        }
      };
    }, [])
  );

  const handlePlayPause = async () => {
    if (videoRef.current && isVideoReady) {
      try {
        if (isPlaying) {
          await videoRef.current.pauseAsync();
        } else {
          await videoRef.current.playAsync();
        }
        setIsPlaying(!isPlaying);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const programs = [
    { 
      icon: "pricetags-outline", 
      title: "Exclusive Discounts", 
      desc: "Save up to 50% on top lifestyle brands across 200+ partners.",
      color: "#f9c349",
      gradient: ['#f9c349', '#f5a623']
    },
    { 
      icon: "account-group-outline", 
      title: "Skills Share", 
      desc: "Connect with students to share expertise and learn new skills.",
      color: "#a29bfe",
      gradient: ['#a29bfe', '#6c5ce7']
    },
    { 
      icon: "calendar-star-outline", 
      title: "Premium Events", 
      desc: "Access workshops, seminars, and networking events.",
      color: "#fd79a8",
      gradient: ['#fd79a8', '#e84393']
    },
    { 
      icon: "file-document-outline", 
      title: "Resume Builder", 
      desc: "Create ATS-optimized resumes with AI-powered suggestions.",
      color: "#00b894",
      gradient: ['#00b894', '#00a381']
    },
    { 
      icon: "school-outline", 
      title: "Scholarships", 
      desc: "Access internal grants and external scholarships worldwide.",
      color: "#ffa502",
      gradient: ['#ffa502', '#f9a825']
    },
    { 
      icon: "briefcase-outline", 
      title: "Career Growth", 
      desc: "Direct access to internships, job recommendations, and mentorships.",
      color: "#4ecdc4",
      gradient: ['#4ecdc4', '#45b7aa']
    },
    { 
      icon: "airplane-outline", 
      title: "Student Travel", 
      desc: "Student-exclusive travel deals and budget-friendly packages.",
      color: "#6c5ce7",
      gradient: ['#6c5ce7', '#5a4bd1']
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#f9c349" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Intro</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={22} color="#f9c349" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Hero Section - Black Background */}
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
              
              <Animated.View style={[styles.logoCircle, { 
                transform: [{ scale: logoScale }, { rotate: logoSpin }] 
              }]}>
                <LinearGradient 
                  colors={['#f9c349', '#f5a623']} 
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.logoText}>tdc</Text>
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.mainTitle}>
                The<Text style={styles.goldText}> Deft Crew</Text>
              </Text>
              <Text style={styles.subtitle}>Elevating the Student Experience</Text>
              
              {/* Decorative line */}
              <View style={styles.decorLine}>
                <View style={styles.decorLineSegment} />
                <View style={styles.decorDiamond} />
                <View style={styles.decorLineSegment} />
              </View>

              {/* Floating particles */}
              <View style={styles.particlesContainer}>
                {[...Array(8)].map((_, i) => {
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
                          top: 5 + Math.random() * 90,
                          left: 5 + Math.random() * 90,
                          backgroundColor: ['#f9c349', '#4ecdc4', '#6c5ce7', '#ff6b6b', '#a29bfe', '#fd79a8', '#00b894', '#fdcb6e'][i % 8],
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

          

          {/* Video Section - Fully Working */}
          <Animated.View style={[styles.videoWrapper, { transform: [{ translateY: slideUpAnim }] }]}>
            <LinearGradient 
              colors={['#f8f9fa', '#ffffff']} 
              style={styles.videoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
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
                
                {/* Video Overlay Controls */}
                <View style={styles.videoOverlay}>
                  <TouchableOpacity 
                    onPress={handlePlayPause} 
                    style={styles.playBtn}
                    activeOpacity={0.8}
                    disabled={!isVideoReady}
                  >
                    <LinearGradient 
                      colors={['#f9c349', '#f5a623']} 
                      style={styles.playBtnGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons 
                        name={isPlaying ? "pause" : "play"} 
                        size={30} 
                        color="#fff" 
                        style={{ marginLeft: isPlaying ? 0 : 3 }}
                      />
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Bottom Controls */}
                  <View style={styles.videoBottomControls}>
                    <View style={styles.progressSection}>
                      <Text style={styles.timeLabel}>{formatTime(videoStatus.positionMillis)}</Text>
                      <View style={styles.progressBarBase}>
                        <View style={[styles.progressBarFill, { 
                          width: videoStatus.durationMillis && videoStatus.durationMillis > 0
                            ? `${(videoStatus.positionMillis / videoStatus.durationMillis) * 100}%` 
                            : '0%' 
                        }]} />
                      </View>
                      <Text style={styles.timeLabel}>{formatTime(videoStatus.durationMillis)}</Text>
                    </View>
                    
                    <View style={styles.videoActions}>
                      <TouchableOpacity onPress={handleMute} style={styles.videoIconBtn} activeOpacity={0.7}>
                        <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="#333" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.videoIconBtn} activeOpacity={0.7}>
                        <Ionicons name="expand-outline" size={20} color="#333" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Program Cards */}
          <View style={styles.listContainer}>
            {programs.map((item, index) => {
              const translateX = cardAnims[index].interpolate({
                inputRange: [0, 1],
                outputRange: [index % 2 === 0 ? -40 : 40, 0],
              });

              const scale = cardAnims[index].interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.8, 1.05, 1],
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.cardWrapper,
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
                    activeOpacity={0.7} 
                    style={styles.card}
                    onPress={() => Haptics.selectionAsync()}
                  >
                    <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                      <LinearGradient
                        colors={item.gradient}
                        style={styles.iconGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name={item.icon} size={22} color="#fff" />
                      </LinearGradient>
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardDesc}>{item.desc}</Text>
                    </View>
                    <View style={[styles.chevronCircle, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name="chevron-forward" size={16} color={item.color} />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

         
          
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
              colors={['#ffffff', '#ffffff']}
              style={styles.footerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.footerLogo}>
                tdc<Text style={styles.footerLogoAccent}>.</Text>
              </Text>
              <Text style={styles.footerText}>Building a Stronger Student Economy.</Text>
              <View style={styles.footerLine} />
              
              <Text style={styles.copyright}>© 2026 The Deft Crew. All rights reserved.</Text>
              
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
    backgroundColor: "#ffffff",
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
  
  // Hero Section - Black Background
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
  logoCircle: { 
    marginBottom: 16, 
    borderRadius: 25, 
    overflow: 'hidden',
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
  logoGradient: { 
    width: 90, 
    height: 90, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  logoText: { 
    fontSize: 32, 
    fontWeight: "900", 
    color: "#fff", 
    letterSpacing: -1 
  },
  mainTitle: { 
    fontSize: 36, 
    fontWeight: "900", 
    color: "#fff", 
    letterSpacing: -0.5 
  },
  goldText: { 
    color: "#f9c349" 
  },
  subtitle: { 
    color: "rgba(255,255,255,0.5)", 
    fontSize: 15, 
    marginTop: 6, 
    fontWeight: '500' 
  },
  decorLine: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 20 
  },
  decorLineSegment: { 
    width: 30, 
    height: 2, 
    backgroundColor: '#f9c349', 
    borderRadius: 1 
  },
  decorDiamond: { 
    width: 8, 
    height: 8, 
    backgroundColor: '#f9c349', 
    transform: [{ rotate: '45deg' }], 
    marginHorizontal: 10 
  },
  
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -12,
    marginBottom: 20,
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Video Section - Fully Working
  videoWrapper: { 
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20, 
    overflow: "hidden", 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.06)',
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
  videoGradient: { 
    flex: 1,
    padding: 2,
  },
  videoContainer: {
    flex: 1,
    height: 200,
    borderRadius: 18,
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
    borderRadius: 30, 
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#f9c349',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  playBtnGradient: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  videoBottomControls: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 12, 
    paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  progressSection: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 8 
  },
  progressBarBase: { 
    flex: 1, 
    height: 3, 
    backgroundColor: "rgba(0,0,0,0.1)", 
    marginHorizontal: 8, 
    borderRadius: 1.5, 
    overflow: 'hidden' 
  },
  progressBarFill: { 
    height: "100%", 
    backgroundColor: "#f9c349", 
    borderRadius: 1.5 
  },
  timeLabel: { 
    color: "rgba(0,0,0,0.5)", 
    fontSize: 10, 
    fontWeight: "600", 
    width: 35, 
    textAlign: "center" 
  },
  videoActions: { 
    flexDirection: "row", 
    justifyContent: "flex-end",
    gap: 8,
  },
  videoIconBtn: { 
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Program Cards
  listContainer: { 
    paddingHorizontal: 16,
    gap: 12, 
    marginBottom: 24 
  },
  cardWrapper: {
    marginBottom: 0,
  },
  card: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#ffffff", 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: "rgba(0,0,0,0.06)",
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
  iconBox: { 
    width: 50, 
    height: 50, 
    borderRadius: 14, 
    alignItems: "center", 
    justifyContent: "center",
    overflow: 'hidden',
  },
  iconGradient: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { 
    flex: 1, 
    marginLeft: 14 
  },
  cardTitle: { 
    color: "#1a1a1a", 
    fontSize: 15, 
    fontWeight: "800" 
  },
  cardDesc: { 
    color: "rgba(0,0,0,0.5)", 
    fontSize: 12, 
    marginTop: 3, 
    fontWeight: '500' 
  },
  chevronCircle: { 
    width: 30, 
    height: 30, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  // CTA
  ctaWrapper: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#f9c349',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  cta: { 
    borderRadius: 16, 
    overflow: "hidden" 
  },
  ctaGradient: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 18, 
    gap: 10 
  },
  ctaText: { 
    color: "#1a1a1a", 
    fontSize: 16, 
    fontWeight: "800", 
    letterSpacing: 0.5 
  },
  ctaIconCircle: { 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    backgroundColor: '#1a1a1a', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  // Footer
  footer: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  footerGradient: {
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 20,
    
    
  },
  footerLogo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: 1,
  },
  footerLogoAccent: {
    color: '#f9c349',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 6,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginTop: 12,
  },
  footerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  footerBadgeText: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.5)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  copyright: {
    color: "rgba(0,0,0,0.3)",
    fontSize: 11,
    marginTop: 12,
    fontWeight: '500',
  },
  location: {
    color: "rgba(0,0,0,0.2)",
    fontSize: 10,
    marginTop: 3,
  },
});