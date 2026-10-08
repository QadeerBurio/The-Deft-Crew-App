// ==================== FounderCircleScreen.js ====================
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  ScrollView,
  Alert,
  Share,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import { SafeAreaView } from "react-native-safe-area-context";

import { color as T, font as F } from "../theme/tokens";
const FounderCircleScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const handleGoBack = () => navigation.goBack();

  const handleShare = async () => {
    try {
      await Share.share({
        message: "👑 I joined the DEFT FOUNDER CIRCLE! PKR 15,000 + Founder Recommendation + Lifetime Mentorship! The Deft Crew is changing the game!",
        title: "TDC Founder Circle",
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleLinkedIn = () => {
    Linking.openURL("https://linkedin.com/company/thedeftcrew");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={T.paper} />
      
      <LinearGradient colors={[T.yellow, "#FFC000"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={T.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>founder circle</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.heroContainer}>
            <Animated.View style={[styles.glowEffect, { opacity: glowOpacity }]} />
            <LinearGradient
              colors={[T.yellow, "#FFC000"]}
              style={styles.heroIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="crown-circle" size={60} color={T.ink} />
            </LinearGradient>
            <Text style={styles.heroTitle}>👑 FOUNDER CIRCLE</Text>
            <Text style={styles.heroSubtitle}>elite achievement unlocked!</Text>
          </View>

          <View style={styles.rewardsContainer}>
            <Text style={styles.sectionTitle}>🌟 Elite Rewards</Text>
            
            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,215,0,0.15)" }]}>
                <Ionicons name="cash-outline" size={28} color={T.yellow} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>PKR 15,000 Cash</Text>
                <Text style={styles.rewardDesc}>Ultimate cash reward for Founder Circle</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,215,0,0.15)" }]}>
                <Ionicons name="document-text-outline" size={28} color={T.yellow} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>founder job recommendation letter</Text>
                <Text style={styles.rewardDesc}>Personalized recommendation from our founder</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,215,0,0.15)" }]}>
                <Ionicons name="logo-linkedin" size={28} color={T.yellow} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>founder linkedin recommendation</Text>
                <Text style={styles.rewardDesc}>public recommendation on linkedin</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,215,0,0.15)" }]}>
                <Ionicons name="infinite-outline" size={28} color={T.yellow} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>lifetime founder mentorship</Text>
                <Text style={styles.rewardDesc}>direct mentorship from the founder</Text>
              </View>
            </View>
          </View>

          <View style={styles.perksContainer}>
            <Text style={styles.sectionTitle}>✨ All Previous Perks</Text>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={20} color={T.yellow} />
              <Text style={styles.perkText}>all rewards from previous tiers</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.linkedinBtn} onPress={handleLinkedIn}>
            <LinearGradient
              colors={[T.yellow, "#FFC000"]}
              style={styles.linkedinGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="logo-linkedin" size={20} color={T.ink} />
              <Text style={styles.linkedinBtnText}>connect on linkedin</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <LinearGradient
              colors={[T.yellow, "#FFC000"]}
              style={styles.shareGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="share-social-outline" size={20} color={T.ink} />
              <Text style={styles.shareBtnText}>share founder circle</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.paper,
  },
  headerGradient: {
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F.heading,
    color: T.ink,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  heroContainer: {
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },
  glowEffect: {
    position: "absolute",
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    borderRadius: 100,
    backgroundColor: T.yellow,
    opacity: 0.3,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: F.heading,
    color: T.ink,
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: 16,
    color: T.yellow,
    fontFamily: F.bodySemi,
    marginTop: 4,
  },
  rewardsContainer: {
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.line,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: F.heading,
    color: T.ink,
    marginBottom: 16,
  },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  rewardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 15,
    fontFamily: F.bodyBold,
    color: T.ink,
  },
  rewardDesc: {
    fontSize: 12, fontFamily: F.body,
    color: T.textFaint,
    marginTop: 2,
  },
  perksContainer: {
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.line,
  },
  perkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  perkText: {
    fontSize: 14,
    color: T.ink,
    fontFamily: F.bodyMedium,
  },
  linkedinBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  linkedinGradient: {
    flexDirection: "row",
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  linkedinBtnText: {
    color: T.ink,
    fontFamily: F.bodyBold,
    fontSize: 15,
  },
  shareBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
  },
  shareGradient: {
    flexDirection: "row",
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  shareBtnText: {
    color: T.ink,
    fontFamily: F.bodyBold,
    fontSize: 15,
  },
});

export default FounderCircleScreen;