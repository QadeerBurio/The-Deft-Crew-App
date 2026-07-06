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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
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
  const heroScale = useRef(new Animated.Value(0.8)).current;
  const heroRotate = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const featureAnims = useRef([...Array(7)].map(() => new Animated.Value(0))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const videoSource = require("../../../assets/images/tdcss.mp4");

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

    // Pulse animation
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
      ...featureAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(200 + i * 120),
          Animated.spring(anim, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
        ])
      ),
    ]).start();

    // Cleanup video on unmount
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
    {
      id: 1,
      title: "Student Deals",
      desc: "Exclusive discounts tailored for students across 200+ brands.",
      icon: "school-outline",
      color: "#f9c349",
      gradient: ['#f9c349', '#f5a623']
    },
    {
      id: 2,
      title: "Skills Share",
      desc: "Connect with fellow students to share expertise and learn new skills.",
      icon: "account-group-outline",
      color: "#a29bfe",
      gradient: ['#a29bfe', '#6c5ce7']
    },
    {
      id: 3,
      title: "Premium Events",
      desc: "Access workshops, seminars, and networking events.",
      icon: "calendar-star-outline",
      color: "#fd79a8",
      gradient: ['#fd79a8', '#e84393']
    },
    {
      id: 4,
      title: "Resume Builder",
      desc: "Create ATS-optimized resumes with AI-powered suggestions.",
      icon: "file-document-outline",
      color: "#00b894",
      gradient: ['#00b894', '#00a381']
    },
    {
      id: 5,
      title: "Scholarships",
      desc: "Access internal grants and external scholarships like Erasmus+.",
      icon: "school-outline",
      color: "#ffa502",
      gradient: ['#ffa502', '#f9a825']
    },
    {
      id: 7,
      title: "Student Travel",
      desc: "Curated budget-friendly travel packages for students.",
      icon: "airplane-takeoff",
      color: "#6c5ce7",
      gradient: ['#6c5ce7', '#5a4bd1']
    },
  ];

  const spin = heroRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const FeatureCard = ({ item, index }) => {
    const translateY = featureAnims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    });

    const scale = featureAnims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1.05, 1],
    });

    return (
      <Animated.View
        style={[
          styles.featureWrapper,
          {
            opacity: featureAnims[index],
            transform: [
              { scale },
              { translateY },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#fafafa']}
          style={styles.featureBox}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.featureIconBox, { backgroundColor: item.color + '15' }]}>
            <LinearGradient
              colors={item.gradient}
              style={styles.featureIconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name={item.icon} size={24} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.featureTitle}>{item.title}</Text>
          <Text style={styles.featureDesc}>{item.desc}</Text>
          <View style={[styles.featureAccentBar, { backgroundColor: item.color }]} />
        </LinearGradient>
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
        <Text style={styles.headerTitle}>About tdc</Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={22} color="#1a1a1a" />
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

              <Animated.View style={[styles.heroLogoCircle, { transform: [{ rotate: spin }] }]}>
                <LinearGradient
                  colors={['#f9c349', '#f5a623']}
                  style={styles.heroIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.heroLogoText}>tdc</Text>
                </LinearGradient>
              </Animated.View>

              <Text style={styles.heroBrandName}>The Deft Crew</Text>
              <View style={styles.heroTaglineBadge}>
                <Text style={styles.heroTaglineText}>THE STUDENT ECOSYSTEM</Text>
              </View>
              <Text style={styles.heroDesc}>
                We're building Pakistan's largest{' '}
                <Text style={{ fontWeight: '800', color: '#f9c349' }}>student community</Text>
                . From savings to career growth, tdc is your ultimate lifestyle partner.
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
                          backgroundColor: ['#f9c349', '#4ecdc4', '#6c5ce7', '#ff6b6b', '#a29bfe', '#fd79a8'][i % 6],
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

          {/* Video Section - Full Working Video from App Intro */}
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

          {/* Value Propositions */}
          <Animated.View style={[styles.valuesSection, { transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.sectionDot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.sectionTitle}>What's Inside The Crew?</Text>
              <View style={styles.sectionLine} />
            </View>

            <LinearGradient
              colors={['#ffffff', '#fafafa']}
              style={styles.valuesCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {[
                { text: "Verified student-only marketplace.", icon: "shield-check-outline", color: "#f9c349" },
                { text: "Seamless, paperless redemption.", icon: "cellphone-wireless", color: "#4ecdc4" },
                { text: "Community-driven networking.", icon: "account-group-outline", color: "#6c5ce7" },
                { text: "AI-powered career tools.", icon: "robot-outline", color: "#a29bfe" }
              ].map((item, index) => (
                <View key={index} style={[styles.valueItem, index < 3 && styles.valueItemBorder]}>
                  <View style={[styles.valueIconBox, { backgroundColor: item.color + '15' }]}>
                    <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={styles.valueText}>{item.text}</Text>
                  <Ionicons name="checkmark-circle" size={18} color={item.color} style={styles.valueCheck} />
                </View>
              ))}
            </LinearGradient>
          </Animated.View>

          {/* Core Pillars */}
          <View style={styles.pillarsSection}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.sectionDot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.sectionTitle}>Core Pillars</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.grid}>
              {features.map((item, index) => (
                <FeatureCard key={item.id} item={item} index={index} />
              ))}
            </View>
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
  heroLogoCircle: {
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
    letterSpacing: 0.5,
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
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    textAlign: "center",
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

  // Video Section
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

  // Values Section
  valuesSection: {
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
  valuesCard: {
    borderRadius: 16,
    padding: 16,
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
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  valueItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  valueIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  featureWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  featureBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    position: 'relative',
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
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    overflow: 'hidden',
  },
  featureIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  featureDesc: {
    fontSize: 10,
    color: "#666",
    lineHeight: 15,
    fontWeight: '500',
  },
  featureAccentBar: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    opacity: 0.6,
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
    paddingVertical: 5,
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
  footerSubText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.3)',
    marginTop: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});