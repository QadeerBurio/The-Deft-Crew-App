// ==================== DeftProScreen.js ====================
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
import ScreenHeader from "../ui/ScreenHeader";
const DeftProScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
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
        message: "I'm a DEFT PRO! 👑 PKR 5,000 + Instagram Feature + Internship Consideration! Join The Deft Crew!",
        title: "TDC Pro Achievement",
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleInstagram = () => {
    Linking.openURL("https://instagram.com/thedeftcrew");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={T.ink} />
      
      <LinearGradient colors={[T.ink, T.ink]} style={styles.headerGradient}>
        <ScreenHeader dark title="deft pro" onBack={handleGoBack} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.heroContainer}>
            <LinearGradient
              colors={[T.ink, T.ink]}
              style={styles.heroIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="crown" size={60} color={T.yellow} />
            </LinearGradient>
            <Text style={styles.heroTitle}>👑 DEFT PRO</Text>
            <Text style={styles.heroSubtitle}>premium achievement unlocked!</Text>
          </View>

          <View style={styles.rewardsContainer}>
            <Text style={styles.sectionTitle}>💰 Rewards Package</Text>
            
            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,217,61,0.15)" }]}>
                <Ionicons name="cash-outline" size={28} color={T.ink} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>PKR 5,000 Cash</Text>
                <Text style={styles.rewardDesc}>Premium cash reward for your dedication</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,217,61,0.15)" }]}>
                <Ionicons name="logo-instagram" size={28} color={T.ink} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>instagram feature</Text>
                <Text style={styles.rewardDesc}>Be featured on our official Instagram page</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,217,61,0.15)" }]}>
                <Ionicons name="school-outline" size={28} color={T.ink} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>internship consideration</Text>
                <Text style={styles.rewardDesc}>Priority consideration for internship programs</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,217,61,0.15)" }]}>
                <Ionicons name="people-outline" size={28} color={T.ink} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>leadership mentorship</Text>
                <Text style={styles.rewardDesc}>1-on-1 mentorship from industry leaders</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,217,61,0.15)" }]}>
                <Ionicons name="infinite-outline" size={28} color={T.ink} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>unlimited vip access</Text>
                <Text style={styles.rewardDesc}>Unlimited access to all partner brands</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.instagramBtn} onPress={handleInstagram}>
            <LinearGradient
              colors={[T.ink, T.ink]}
              style={styles.instagramGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="logo-instagram" size={20} color={T.white} />
              <Text style={styles.instagramBtnText}>Follow @thedeftcrew</Text>
            </LinearGradient>
          </TouchableOpacity>

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
  instagramBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  instagramGradient: {
    flexDirection: "row",
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  instagramBtnText: {
    color: T.white,
    fontFamily: F.bodyBold,
    fontSize: 15,
  },
  shareBtn: {
    borderRadius: 16,
    overflow: "hidden",
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

export default DeftProScreen;