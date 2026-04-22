import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BaseScreen from "./BaseScreen";

const { width } = Dimensions.get("window");

export default function WhyPointsScreen() {
  const navigation = useNavigation();

  const BenefitCard = ({ icon, title, desc, color }) => (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
        <MaterialCommunityIcons name={icon} size={28} color={color} />
      </View>
      <View style={styles.cardTextContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
    </View>
  );

  return (
    <BaseScreen>
      <StatusBar barStyle="dark-content" />

      {/* FIXED PROFESSIONAL HEADER */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privilege Benefits</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.coinStack}>
            <MaterialCommunityIcons
              name="crown-outline"
              size={50}
              color="#FFB300"
            />
          </View>
          <Text style={styles.heroTitle}>Why TDC Privilege Matters</Text>
          <Text style={styles.heroSubtitle}>
            TDC Privilege is your gateway to the full ecosystem. Verified activity unlocks elite rewards, career growth, and global opportunities.
          </Text>
        </View>

        {/* BENEFITS LIST */}
        <View style={styles.benefitsWrapper}>
          <BenefitCard
            icon="briefcase-check-outline"
            color="#FFB300"
            title="Elite Career Hub Access"
            desc="Privilege members get first-look access to premium internships and direct referrals to top-tier partner companies."
          />

          <BenefitCard
            icon="earth-arrow-right"
            color="#3498DB"
            title="Global Exchange Priority"
            desc="Unlock priority applications for international student exchange programs and global academic workshops."
          />

          <BenefitCard
            icon="airplane-settings"
            color="#27AE60"
            title="Exclusive Travel Tiers"
            desc="Access heavily subsidized student travel packages and 'Privilege-Only' group tours across Pakistan and beyond."
          />

          <BenefitCard
            icon="ticket-confirmation-outline"
            color="#E74C3C"
            title="Boosted Brand Discounts"
            desc="Go beyond standard offers. Privilege status triggers higher percentage discounts at our premium ecommerce partners."
          />

          <BenefitCard
            icon="shield-star-outline"
            color="#9B59B6"
            title="Campus Leadership"
            desc="Elevation to Privilege status marks you as a verified campus leader, providing networking opportunities with the Deft Crew core team."
          />
        </View>

        {/* BOTTOM MOTIVATION */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Launched by
            <Text style={{ fontWeight: "800", color: "#1A1A1A" }}> tdc </Text>
            • Building a Stronger Student Economy
          </Text>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0F5F4",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: "#000000",
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: "#08634f",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  coinStack: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 179, 0, 0.3)",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#E0F2F1",
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.9,
  },
  benefitsWrapper: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0F2F5",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTextContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
  },
  footerInfo: {
    marginTop: 20,
    paddingHorizontal: 50,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "600",
  },
});