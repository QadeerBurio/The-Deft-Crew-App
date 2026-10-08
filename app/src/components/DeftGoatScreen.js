// ==================== DeftGoatScreen.js ====================
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
const DeftGoatScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 4,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoBack = () => navigation.goBack();

  const handleShare = async () => {
    try {
      await Share.share({
        message: "🐐 I achieved DEFT GOAT status! PKR 10,000 + Guaranteed Paid Internship + Ambassador Role! Join The Deft Crew!",
        title: "TDC GOAT Achievement",
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={T.paper} />
      
      <LinearGradient colors={["#FF6B35", "#E55A2A"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={T.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>deft goat</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: bounceAnim }] }]}>
          <View style={styles.heroContainer}>
            <LinearGradient
              colors={["#FF6B35", "#E55A2A"]}
              style={styles.heroIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="trophy" size={60} color={T.white} />
            </LinearGradient>
            <Text style={styles.heroTitle}>🐐 DEFT GOAT</Text>
            <Text style={styles.heroSubtitle}>greatest of all time!</Text>
          </View>

          <View style={styles.rewardsContainer}>
            <Text style={styles.sectionTitle}>🏆 Ultimate Rewards</Text>
            
            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,107,53,0.15)" }]}>
                <Ionicons name="cash-outline" size={28} color="#FF6B35" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>PKR 10,000 Cash</Text>
                <Text style={styles.rewardDesc}>Elite cash reward for GOAT status</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,107,53,0.15)" }]}>
                <Ionicons name="briefcase-outline" size={28} color="#FF6B35" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>guaranteed paid internship</Text>
                <Text style={styles.rewardDesc}>confirmed paid internship opportunity</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,107,53,0.15)" }]}>
                <Ionicons name="people-circle-outline" size={28} color="#FF6B35" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>expanded leadership access</Text>
                <Text style={styles.rewardDesc}>direct access to leadership team</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,107,53,0.15)" }]}>
                <Ionicons name="megaphone-outline" size={28} color="#FF6B35" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>tdc ambassador role</Text>
                <Text style={styles.rewardDesc}>Official ambassador of The Deft Crew</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <LinearGradient
              colors={["#FF6B35", "#E55A2A"]}
              style={styles.shareGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="share-social-outline" size={20} color={T.white} />
              <Text style={styles.shareBtnText}>share goat achievement</Text>
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
    color: "#FF6B35",
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

export default DeftGoatScreen;