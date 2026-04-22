import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import * as Clipboard from "expo-clipboard"; // Use Expo Clipboard if on Expo
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BaseScreen from "./BaseScreen";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";

const { width } = Dimensions.get("window");

export default function PointsScreen() {
  const navigation = useNavigation();
  const { token } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState({
    referralCount: 0,
    referralCode: "",
    canApplyForTdcCard: false,
  });

  const fetchUserData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(
        "https://the-deft-crew-production.up.railway.app/api/auth/profile/me",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = response.data;

      setUserData({
        referralCount: data.referralCount || 0,
        referralCode: data.referralCode || "GENERATING...",
        canApplyForTdcCard: data.canApplyForTdcCard || false,
      });
    } catch (error) {
      console.log("Fetch Error:", error.message);
      if (!refreshing) {
        Alert.alert("Sync Error", "Unable to sync your referral data.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [token]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, [token]);

  // Logic Calculations
  const referred = userData.referralCount;
  const target = 10;
  const progressPercent = Math.min((referred / target) * 100, 100) + "%";
  const shareLink = `https://tdc.app/signup?ref=${userData.referralCode}`;

  const onShare = async () => {
    if (userData.referralCode === "GENERATING...") {
      Alert.alert("Wait", "Your unique code is still being generated.");
      return;
    }
    try {
      await Share.share({
        message: `Join TDC using my referral code: ${userData.referralCode}\nRegister here: ${shareLink}`,
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(shareLink);
    Alert.alert("Success", "Referral link copied to clipboard!");
  };

  if (loading) {
    return (
      <BaseScreen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0ca96d" />
        </View>
      </BaseScreen>
    );
  }

  // InfoCard Sub-component
  const InfoCard = ({ icon, title, content, color }) => (
    <View style={styles.card}>
      <View style={[styles.iconWrapper, { backgroundColor: color + "15" }]}>
        <MaterialCommunityIcons name={icon} size={26} color={color} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Ionicons name="sparkles-outline" size={16} color="#08634f" />
        </View>
        <Text style={styles.cardText}>{content}</Text>
      </View>
    </View>
  );

  return (
    <BaseScreen>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Elevate</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0ca96d"]}
          />
        }
        contentContainerStyle={styles.contentContainer}
      >
        {/* Progress Visual */}
        <View style={styles.pointsVisualCard}>
          <Text style={styles.visualLabel}>TDC PRIVILEGE MILESTONE</Text>
          <View style={styles.visualRow}>
            <View style={styles.visualItem}>
              <MaterialCommunityIcons
                name="account-multiple-plus"
                size={30}
                color="#FFF"
              />
              <Text style={styles.visualText}>{referred} Joins</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
            <View style={styles.visualItem}>
              <MaterialCommunityIcons
                name="card-account-details-star"
                size={30}
                color={referred >= 10 ? "#FFD700" : "#555"}
              />
              <Text
                style={[styles.visualText, referred >= 10 && styles.goldText]}
              >
                TDC CARD
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: progressPercent }]} />
          </View>
          <Text style={styles.progressNote}>
            {referred >= 10
              ? "Milestone Achieved! Apply below."
              : `${10 - referred} more referrals needed for the Privilege Card.`}
          </Text>
        </View>
        {/* INFO CARDS */}

        <View style={styles.infoWrapper}>
          <InfoCard
            icon="account-plus-outline"
            color="#08634f"
            title="Activate TDC Privilege Card"
            content="Invite 10 verified students using your referral link to activate your official TDC Privilege Card."
          />

          <InfoCard
            icon="crown-outline"
            color="#08634f"
            title="Unlock Exclusive Discounts"
            content="Use your TDC Privilege Card to enjoy special discounts and deals at partner brands."
          />

          <InfoCard
            icon="share-variant-outline"
            color="#3498DB"
            title="Build Your Campus Network"
            content="Share your referral link with friends and classmates to grow the TDC student community."
          />
        </View>

        {/* Link Section */}
        <TouchableOpacity style={styles.linkBox} onPress={copyToClipboard}>
          <Text style={styles.linkLabel}>Your Unique Referral Link</Text>
          <View style={styles.linkRow}>
            <Text style={styles.linkText} numberOfLines={1}>
              {shareLink}
            </Text>
            <Ionicons name="copy-outline" size={18} color="#0ca96d" />
          </View>
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
          {referred >= 10 ? (
            <TouchableOpacity
              style={styles.activeCardButton}
              onPress={() =>
                Alert.alert(
                  "Application Sent",
                  "We are reviewing your referrals!",
                )
              }
            >
              <Text style={styles.activeCardButtonText}>Claim My TDC Card</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.referButton} onPress={onShare}>
              <Ionicons name="share-social-outline" size={20} color="#FFF" />
              <Text style={styles.referButtonText}>Share My Link</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  contentContainer: { paddingBottom: 40 },
  pointsVisualCard: {
    backgroundColor: "#000",
    margin: 20,
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
  },
  visualLabel: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 20,
  },
  visualRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  visualItem: { alignItems: "center" },
  visualText: { color: "#FFF", fontSize: 12, marginTop: 5 },
  goldText: { color: "#FFD700", fontWeight: "bold" },
  progressTrack: {
    height: 8,
    width: "100%",
    backgroundColor: "#333",
    borderRadius: 4,
    marginBottom: 10,
  },
  progressBar: { height: "100%", backgroundColor: "#0ca96d", borderRadius: 4 },
  progressNote: { color: "#aaa", fontSize: 11, textAlign: "center" },
  linkBox: {
    backgroundColor: "#F8F9FA",
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkLabel: { fontSize: 12, color: "#7F8C8D", marginBottom: 4 },
  linkText: { fontSize: 14, fontWeight: "600", color: "#0ca96d", flex: 1 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F0F3F5",
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardText: { fontSize: 13, color: "#666", marginTop: 3 },
  referButton: {
    flexDirection: "row",
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  referButtonText: { color: "#FFF", fontWeight: "bold", marginLeft: 8 },
  activeCardButton: {
    backgroundColor: "#0ca96d",
    padding: 16,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  activeCardButtonText: { color: "#FFF", fontWeight: "bold" },
});
