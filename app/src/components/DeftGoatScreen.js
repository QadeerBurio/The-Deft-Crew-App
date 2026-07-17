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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

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
      <StatusBar barStyle="light-content" backgroundColor="#FF6B35" />
      
      <LinearGradient colors={["#FF6B35", "#E55A2A"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DEFT GOAT</Text>
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
              <MaterialCommunityIcons name="trophy" size={60} color="#fff" />
            </LinearGradient>
            <Text style={styles.heroTitle}>🐐 DEFT GOAT</Text>
            <Text style={styles.heroSubtitle}>Greatest of All Time!</Text>
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
                <Text style={styles.rewardTitle}>Guaranteed Paid Internship</Text>
                <Text style={styles.rewardDesc}>Confirmed paid internship opportunity</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,107,53,0.15)" }]}>
                <Ionicons name="people-circle-outline" size={28} color="#FF6B35" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>Expanded Leadership Access</Text>
                <Text style={styles.rewardDesc}>Direct access to leadership team</Text>
              </View>
            </View>

            <View style={styles.rewardCard}>
              <View style={[styles.rewardIconContainer, { backgroundColor: "rgba(255,107,53,0.15)" }]}>
                <Ionicons name="megaphone-outline" size={28} color="#FF6B35" />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>TDC Ambassador Role</Text>
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
              <Ionicons name="share-social-outline" size={20} color="#fff" />
              <Text style={styles.shareBtnText}>Share GOAT Achievement</Text>
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
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
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
    shadowColor: "#FF6B35",
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
    color: "#FF6B35",
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
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});

export default DeftGoatScreen;