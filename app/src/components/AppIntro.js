import React, { useRef, useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Video } from "expo-av";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

export default function AppIntroScreen() {
  const navigation = useNavigation();
  
  // Refs
  const videoViewRef = useRef(null);
  const controlsTimer = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State
  const [showControls, setShowControls] = useState(true);

  // Initialize Video Player
  const videoSource = require("../../../assets/images/tdcss.mp4");
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.play();
  });

  // Controls Logic
  const startControlsTimer = () => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    if (!showControls) startControlsTimer();
  };

  // Video Actions
  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    startControlsTimer();
  };

  const handleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    player.muted = !player.muted;
  };

  const handleFullscreen = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (videoViewRef.current) {
        // Correct way to trigger fullscreen in expo-video
        videoViewRef.current.enterFullscreen();
      }
    } catch (error) {
      console.log("Fullscreen Error:", error);
    }
  };

  // Animations & Lifecycle
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    
    startControlsTimer();
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Small delay to ensure native player is ready
      if (player) player.play();
      return () => {
        if (player) player.pause();
      };
    }, [player])
  );

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60) || 0;
    const secs = Math.floor(seconds % 60) || 0;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const programs = [
    { 
      icon: "tag-heart-outline", 
      title: "Exclusive Discount Offer", 
      desc: "Save up to 50% on top global lifestyle brands.",
      color: "#F06292" 
    },
    { 
      icon: "account-switch-outline", 
      title: "Student Exchange", 
      desc: "Cross-cultural academic semesters and host programs.",
      color: "#FFB74D" 
    },
    { 
      icon: "airplane-takeoff", 
      title: "Traveling Program", 
      desc: "Student-exclusive travel deals and curated tours.",
      color: "#4FC3F7" 
    },
    { 
      icon: "briefcase-check-outline", 
      title: "Career Program", 
      desc: "Direct access to internships and corporate mentorships.",
      color: "#81C784" 
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />
      <LinearGradient colors={["#0a0a0a", "#121a19", "#000000"]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.headerSafeArea} edges={["top"]}>
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BlurView intensity={15} tint="light" style={styles.blurCircle}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>APP INTRO</Text>
          <View style={{ width: 40 }} />
        </Animated.View>
      </SafeAreaView>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
      >
        <View style={styles.hero}>
          <Text style={styles.mainTitle}>The<Text style={styles.goldText}> Deft Crew</Text></Text>
          <Text style={styles.subtitle}>Elevating the Student Experience</Text>
        </View>

        {/* --- VIDEO SECTION --- */}
        <View style={styles.videoWrapper}>
          <TouchableOpacity activeOpacity={1} onPress={toggleControls} style={styles.videoPressable}>
            <Video
              ref={videoViewRef}
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
              allowsFullscreen
              allowsPictureInPicture
            />
            
            {showControls && (
              <Animated.View style={styles.controlsOverlay}>
                <TouchableOpacity onPress={handlePlayPause} style={styles.centerPlayBtn}>
                  <BlurView intensity={60} tint="dark" style={styles.playBlur}>
                    <Ionicons name={player.playing ? "pause" : "play"} size={36} color="white" />
                  </BlurView>
                </TouchableOpacity>

                <View style={styles.bottomControlsBar}>
                  <View style={styles.progressSection}>
                    <Text style={styles.timeLabel}>{formatTime(player.currentTime)}</Text>
                    <View style={styles.progressBarBase}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { width: `${(player.currentTime / player.duration) * 100 || 0}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.timeLabel}>{formatTime(player.duration)}</Text>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={handleMute} style={styles.videoIconBtn}>
                      <Ionicons name={player.muted ? "volume-mute" : "volume-high"} size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleFullscreen} style={styles.videoIconBtn}>
                      <Ionicons name="expand-outline" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>

        {/* --- PROGRAM LIST --- */}
        <View style={styles.listContainer}>
          {programs.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              activeOpacity={0.7} 
              style={styles.card}
              onPress={() => Haptics.selectionAsync()}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + "20" }]}>
                <MaterialCommunityIcons name={item.icon} size={26} color={item.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          ))}
        </View>

        {/* --- MAIN CTA --- */}
        <TouchableOpacity 
          style={styles.cta} 
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.navigate("Brands");
          }}
        >
          <LinearGradient colors={["#FFD700", "#FF8C00"]} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.ctaGradient}>
            <Text style={styles.ctaText}>Explore The Offers</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.copyright}>© 2026 The Deft Crew. All rights reserved.</Text>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  headerSafeArea: { zIndex: 5 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, height: 60 },
  headerTitle: { color: "#FFF", fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  blurCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  hero: { alignItems: "center", marginTop: 20, marginBottom: 30 },
  mainTitle: { fontSize: 40, fontWeight: "900", color: "#FFF" },
  goldText: { color: "#FFD700" },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 16, marginTop: 5 },
  videoWrapper: { height: 230, borderRadius: 24, overflow: "hidden", backgroundColor: "#111", borderWidth: 1, borderColor: "rgba(255,215,0,0.3)", marginBottom: 35 },
  videoPressable: { flex: 1 },
  video: { flex: 1 },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  centerPlayBtn: { width: 70, height: 70, borderRadius: 35, overflow: "hidden" },
  playBlur: { flex: 1, alignItems: "center", justifyContent: "center" },
  bottomControlsBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 15 },
  progressSection: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  progressBarBase: { flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 10, borderRadius: 2 },
  progressBarFill: { height: "100%", backgroundColor: "#FFD700", borderRadius: 2 },
  timeLabel: { color: "#FFF", fontSize: 10, fontWeight: "bold", width: 35, textAlign: "center" },
  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 15 },
  videoIconBtn: { padding: 5 },
  listContainer: { gap: 12, marginBottom: 35 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", padding: 16, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  iconBox: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1, marginLeft: 16 },
  cardTitle: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  cardDesc: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 3 },
  cta: { borderRadius: 20, overflow: "hidden", shadowColor: "#FFD700", shadowOpacity: 0.4, shadowRadius: 15 },
  ctaGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18 },
  ctaText: { color: "#000", fontSize: 18, fontWeight: "900", marginRight: 10 },
  copyright: { textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 25 }
});