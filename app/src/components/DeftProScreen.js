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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

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
      <StatusBar barStyle="light-content" backgroundColor="#FFD93D" />
      
      <LinearGradient colors={["#FFD93D", "#F5C800"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DEFT PRO</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.heroContainer}>
            <LinearGradient
              colors={["#FFD93D", "#F5C800"]}
              style={styles.heroIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="crown" size={60} color="#1a1a1a" />
            </LinearGradient>
            <Text style={styles.heroTitle}>👑 DEFT PRO</Text>
            <Text style={styles.heroSubtitle}>Premium Achievement Unlocked!</Text>
          </View>

          <View style={styles.rewardsContainer}>
            <Text style={styles.sectionTitle}>💰 Rewards Package</Text>
            
            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,217,61,0.15)" }]}>
                <Ionicons name="cash-outline" size={28} color="#FFD93D" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>PKR 5,000 Cash</Text>
                <Text style={styles.rewardDesc}>Premium cash reward for your dedication</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,217,61,0.15)" }]}>
                <Ionicons name="logo-instagram" size={28} color="#FFD93D" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>Instagram Feature</Text>
                <Text style={styles.rewardDesc}>Be featured on our official Instagram page</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,217,61,0.15)" }]}>
                <Ionicons name="school-outline" size={28} color="#FFD93D" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>Internship Consideration</Text>
                <Text style={styles.rewardDesc}>Priority consideration for internship programs</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,217,61,0.15)" }]}>
                <Ionicons name="people-outline" size={28} color="#FFD93D" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>Leadership Mentorship</Text>
                <Text style={styles.rewardDesc}>1-on-1 mentorship from industry leaders</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,217,61,0.15)" }]}>
                <Ionicons name="infinite-outline" size={28} color="#FFD93D" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>Unlimited VIP Access</Text>
                <Text style={styles.rewardDesc}>Unlimited access to all partner brands</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.instagramBtn} onPress={handleInstagram}>
            <LinearGradient
              colors={["#FFD93D", "#F5C800"]}
              style={styles.instagramGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="logo-instagram" size={20} color="#1a1a1a" />
              <Text style={styles.instagramBtnText}>Follow @thedeftcrew</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <LinearGradient
              colors={["#FFD93D", "#F5C800"]}
              style={styles.shareGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="share-social-outline" size={20} color="#1a1a1a" />
              <Text style={styles.shareBtnText}>Share Achievement</Text>
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
    backgroundColor: "#f8f9fc",
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
    fontWeight: "800",
    color: "#1a1a1a",
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
    shadowColor: "#FFD93D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1a1a1a",
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#FFD93D",
    fontWeight: "600",
    marginTop: 4,
  },
  rewardsContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
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
    fontWeight: "700",
    color: "#1a1a1a",
  },
  rewardDesc: {
    fontSize: 12,
    color: "#999",
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
    color: "#1a1a1a",
    fontWeight: "700",
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
    color: "#1a1a1a",
    fontWeight: "700",
    fontSize: 15,
  },
});

export default DeftProScreen;