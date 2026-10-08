// ==================== MainCharacterScreen.js ====================
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import { SafeAreaView } from "react-native-safe-area-context";

import { color as T, font as F } from "../theme/tokens";
import ScreenHeader from "../ui/ScreenHeader";
const MainCharacterScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoBack = () => navigation.goBack();

  const handleShare = async () => {
    try {
      await Share.share({
        message: "I achieved DEFT MAIN CHARACTER status! 🎯 PKR 2,000 Cash + Experience Certificate + Recommendation Letter! Join The Deft Crew!",
        title: "TDC Main Character Achievement",
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={T.ink} />
      
      <LinearGradient colors={[T.ink, T.ink]} style={styles.headerGradient}>
        <ScreenHeader dark title="main character" onBack={handleGoBack} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroContainer}>
            <LinearGradient
              colors={[T.ink, T.ink]}
              style={styles.heroIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="account-star" size={60} color={T.white} />
            </LinearGradient>
            <Text style={styles.heroTitle}>deft main character</Text>
            <Text style={styles.heroSubtitle}>🎯 Achievement Unlocked!</Text>
          </View>

          <View style={styles.rewardsContainer}>
            <Text style={styles.sectionTitle}>🎁 Rewards Package</Text>
            
            <View style={styles.rewardCard}>
              <View style={styles.rewardIconContainer}>
                <Ionicons name="cash-outline" size={28} color={T.ink} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>PKR 2,000 Cash</Text>
                <Text style={styles.rewardDesc}>Direct cash reward for your achievement</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={styles.rewardIconContainer}>
                <Ionicons name="document-text-outline" size={28} color={T.ink} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>experience certificate</Text>
                <Text style={styles.rewardDesc}>Official certificate recognizing your contribution</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={styles.rewardIconContainer}>
                <Ionicons name="mail-outline" size={28} color={T.ink} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>recommendation letter</Text>
                <Text style={styles.rewardDesc}>Professional recommendation for your portfolio</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={styles.rewardIconContainer}>
                <Ionicons name="star-outline" size={28} color={T.ink} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>priority vip access</Text>
                <Text style={styles.rewardDesc}>Priority access to all partner brands and events</Text>
              </View>
            </View>
          </View>

          <View style={styles.perksContainer}>
            <Text style={styles.sectionTitle}>✨ All Previous Perks</Text>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={20} color={T.ink} />
              <Text style={styles.perkText}>digital badge</Text>
            </View>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={20} color={T.ink} />
              <Text style={styles.perkText}>vip access to partner brands</Text>
            </View>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={20} color={T.ink} />
              <Text style={styles.perkText}>professional community access</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <LinearGradient
              colors={[T.ink, T.ink]}
              style={styles.shareGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="share-social-outline" size={20} color={T.white} />
              <Text style={styles.shareBtnText}>share achievement</Text>
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
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F.heading,
    color: T.white,
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
    color: T.ink,
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
    backgroundColor: "rgba(255,107,107,0.1)",
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
    paddingVertical: 8,
  },
  perkText: {
    fontSize: 14,
    color: T.ink,
    fontFamily: F.bodyMedium,
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
    color: T.white,
    fontFamily: F.bodyBold,
    fontSize: 15,
  },
});

export default MainCharacterScreen;