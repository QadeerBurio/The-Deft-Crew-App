import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BaseScreen from "./BaseScreen";

const { width } = Dimensions.get("window");

export default function HowToRedeem() {
  const navigation = useNavigation();

  const RedeemStep = ({ number, title, desc, icon, color }) => (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: color + "15" }]}>
        <MaterialCommunityIcons name={icon} size={32} color={color} />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>STEP {number}</Text>
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
    </View>
  );

  return (
    <BaseScreen>
      <StatusBar barStyle="dark-content" />

      {/* Professional Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Redemption Guide</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Banner */}
        <View style={styles.heroSection}>
          <MaterialCommunityIcons
            name="ticket-confirmation-outline"
            size={50}
            color="#FFB300"
          />
          <Text style={styles.heroTitle}>Unlock Your Benefits</Text>
          <Text style={styles.heroSubtitle}>
            From career opportunities to travel vouchers and brand discounts, follow this structured guide to redeem your TDC rewards.
          </Text>
        </View>

        <View style={styles.stepsWrapper}>
          <RedeemStep
            number="01"
            icon="qrcode-scan"
            color="#08634f"
            title="Select Your Benefit"
            desc="Browse the Brands, Career Hub, or Travel sections. Select the specific offer or opportunity you wish to activate."
          />

          <RedeemStep
            number="02"
            icon="shield-check-outline"
            color="#FFB300"
            title="Verify & Generate"
            desc="Click 'Redeem Now'. Our system verifies your student status and Privilege tier to instantly generate your unique voucher or access link."
          />

          <RedeemStep
            number="03"
            icon="check-decagram-outline"
            color="#3498DB"
            title="Finalize Redemption"
            desc="For brands, show the generated code at checkout. For Careers or Travel, follow the secure link to complete your application or booking."
          />
        </View>

        {/* Pro Tip Box */}
        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={22} color="#FFB300" />
          <Text style={styles.tipText}>
            <Text style={{ fontWeight: "800" }}>Pro Tip: </Text>
            Privilege Tier members unlock "Auto-Apply" for brand discounts and priority processing in the Career Hub.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.primaryButton} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate("WhyPoints")}
        >
          <Text style={styles.buttonText}>Check My Privilege Tier</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 tdc • Empowering the Student Economy
          </Text>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
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
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: "#000000",
    padding: 35,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: "#08634f",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 10,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#E0F2F1",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    opacity: 0.9,
  },
  stepsWrapper: {
    padding: 20,
    marginTop: -20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  iconContainer: {
    width: 65,
    height: 65,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
  },
  badge: {
    backgroundColor: "#F5F6F7",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#95A5A6",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
  },
  tipBox: {
    flexDirection: "row",
    backgroundColor: "#FFF9C4",
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFB30030",
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 12,
    color: "#1A1A1A",
    lineHeight: 18,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#000000",
    marginHorizontal: 25,
    marginVertical: 25,
    paddingVertical: 18,
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#08634f",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
  },
  buttonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    marginRight: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
  },
});