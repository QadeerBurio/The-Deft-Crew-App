import React, { useRef, useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

export default function AppIntroScreen() {
  const navigation = useNavigation();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoStatus, setVideoStatus] = useState({});
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(40)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;

  const videoSource = require("../../../assets/images/tdcss.mp4");

  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      Animated.timing(logoRotate, { toValue: 1, duration: 1500, useNativeDriver: true }),
      // Staggered card animations
      ...cardAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(300 + i * 120),
          Animated.spring(anim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        ])
      ),
    ]).start();

    // CTA pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
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
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleMute = async () => {
    if (videoRef.current) {
      await videoRef.current.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      desc: "Save up to 50% on top lifestyle brands.",
      color: "#f9c349" 
    },
    { 
      icon: "swap-horizontal-outline", 
      title: "Student Exchange", 
      desc: "Cross-cultural academic semesters worldwide.",
      color: "#4FC3F7" 
    },
    { 
      icon: "airplane-outline", 
      title: "Travel Program", 
      desc: "Student-exclusive travel deals and tours.",
      color: "#81C784" 
    },
    { 
      icon: "briefcase-outline", 
      title: "Career Growth", 
      desc: "Direct access to internships and mentorships.",
      color: "#FF8A65" 
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background */}
      <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#0d0d0d']} style={StyleSheet.absoluteFill} />
      
      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <SafeAreaView style={styles.headerSafeArea} edges={["top"]}>
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#f9c349" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>APP INTRO</Text>
          </View>
          <View style={{ width: 40 }} />
        </Animated.View>
      </SafeAreaView>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Logo Section */}
          <View style={styles.hero}>
            <Animated.View style={[styles.logoCircle, { 
              transform: [{ scale: logoScale }, { rotate: logoSpin }] 
            }]}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.logoGradient}>
                <Text style={styles.logoText}>tdc<Text style={{color:'#fff'}}>.</Text></Text>
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
          </View>

          {/* Video Section */}
          <Animated.View style={[styles.videoWrapper, { transform: [{ translateY: slideUpAnim }] }]}>
            <LinearGradient colors={['#1a1a1a', '#0d0d0d']} style={styles.videoGradient}>
              <Video
                ref={videoRef}
                source={videoSource}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay={false}
                isMuted={isMuted}
                onPlaybackStatusUpdate={setVideoStatus}
                useNativeControls={false}
              />
              
              {/* Video Overlay Controls */}
              <View style={styles.videoOverlay}>
                <TouchableOpacity onPress={handlePlayPause} style={styles.playBtn}>
                  <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.playBtnGradient}>
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
                        width: videoStatus.durationMillis 
                          ? `${(videoStatus.positionMillis / videoStatus.durationMillis) * 100}%` 
                          : '0%' 
                      }]} />
                    </View>
                    <Text style={styles.timeLabel}>{formatTime(videoStatus.durationMillis)}</Text>
                  </View>
                  
                  <View style={styles.videoActions}>
                    <TouchableOpacity onPress={handleMute} style={styles.videoIconBtn}>
                      <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Program Cards */}
          <View style={styles.listContainer}>
            {programs.map((item, index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: cardAnims[index],
                  transform: [{ 
                    translateX: cardAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [index % 2 === 0 ? -50 : 50, 0],
                    })
                  }],
                }}
              >
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={styles.card}
                  onPress={() => Haptics.selectionAsync()}
                >
                  <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDesc}>{item.desc}</Text>
                  </View>
                  <View style={styles.chevronCircle}>
                    <Ionicons name="chevron-forward" size={16} color="#f9c349" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {/* CTA Button */}
          <Animated.View style={{ transform: [{ scale: ctaPulse }] }}>
            <TouchableOpacity 
              style={styles.cta} 
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                navigation.navigate("Brands");
              }}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={['#f9c349', '#1a1a1a']} 
                start={{x:0, y:0}} 
                end={{x:1, y:1}} 
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>Explore The Offers</Text>
                <View style={styles.ctaIconCircle}>
                  <Ionicons name="arrow-forward" size={18} color="#1a1a1a" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
            <Text style={styles.copyright}>© 2026 The Deft Crew. All rights reserved.</Text>
            <Text style={styles.location}>Karachi, Pakistan</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  
  // Decorative
  decorCircle1: {
    position: 'absolute', top: -100, right: -100,
    width: 300, height: 300, borderRadius: 150,
    borderWidth: 30, borderColor: 'rgba(249,195,73,0.03)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -50, left: -50,
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 20, borderColor: 'rgba(249,195,73,0.03)',
  },
  
  // Header
  headerSafeArea: { zIndex: 5 },
  header: { 
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", 
    paddingHorizontal: 16, height: 56 
  },
  backBtn: { 
    width: 38, height: 38, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(249,195,73,0.2)',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: "#f9c349", fontSize: 13, fontWeight: "900", letterSpacing: 3 },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  
  // Hero
  hero: { alignItems: "center", marginTop: 10, marginBottom: 25 },
  logoCircle: { marginBottom: 16, borderRadius: 25, overflow: 'hidden' },
  logoGradient: { width: 75, height: 75, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 30, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  mainTitle: { fontSize: 36, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  goldText: { color: "#f9c349" },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 6, fontWeight: '500' },
  decorLine: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  decorLineSegment: { width: 25, height: 1.5, backgroundColor: '#f9c349', borderRadius: 1 },
  decorDiamond: { width: 6, height: 6, backgroundColor: '#f9c349', transform: [{ rotate: '45deg' }], marginHorizontal: 8 },
  
  // Video
  videoWrapper: { 
    height: 220, borderRadius: 20, overflow: "hidden", 
    borderWidth: 1, borderColor: 'rgba(249,195,73,0.25)', 
    marginBottom: 30 
  },
  videoGradient: { flex: 1 },
  video: { flex: 1 },
  videoOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  playBtn: { borderRadius: 25, overflow: 'hidden', elevation: 10 },
  playBtnGradient: { width: 60, height: 60, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  
  videoBottomControls: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    padding: 12, paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressSection: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  progressBarBase: { 
    flex: 1, height: 3, backgroundColor: "rgba(255,255,255,0.2)", 
    marginHorizontal: 8, borderRadius: 1.5, overflow: 'hidden' 
  },
  progressBarFill: { height: "100%", backgroundColor: "#f9c349", borderRadius: 1.5 },
  timeLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "600", width: 35, textAlign: "center" },
  videoActions: { flexDirection: "row", justifyContent: "flex-end" },
  videoIconBtn: { padding: 5 },
  
  // Program Cards
  listContainer: { gap: 12, marginBottom: 30 },
  card: { 
    flexDirection: "row", alignItems: "center", 
    backgroundColor: "rgba(255,255,255,0.04)", 
    padding: 16, borderRadius: 16, 
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" 
  },
  iconBox: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1, marginLeft: 14 },
  cardTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  cardDesc: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 3, fontWeight: '500' },
  chevronCircle: { 
    width: 30, height: 30, borderRadius: 8, 
    backgroundColor: 'rgba(255,255,255,0.06)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  
  // CTA
  cta: { borderRadius: 16, overflow: "hidden", elevation: 15, shadowColor: "#f9c349", shadowOpacity: 0.4, shadowRadius: 20 },
  ctaGradient: { 
    flexDirection: "row", alignItems: "center", justifyContent: "center", 
    paddingVertical: 18, gap: 10 
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.5 },
  ctaIconCircle: { 
    width: 32, height: 32, borderRadius: 10, 
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' 
  },
  
  // Footer
  footer: { alignItems: 'center', marginTop: 30, paddingVertical: 15 },
  footerLogo: { fontSize: 20, fontWeight: '900', color: '#fff' },
  copyright: { color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 8, fontWeight: '500' },
  location: { color: "rgba(255,255,255,0.15)", fontSize: 10, marginTop: 3 },
});

