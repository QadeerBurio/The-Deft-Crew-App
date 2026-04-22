import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Dimensions 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BaseScreen from "./BaseScreen";

const { width } = Dimensions.get("window");

export default function DisclaimerScreen() {
  const navigation = useNavigation();

  return (
    <BaseScreen>
      <StatusBar barStyle="dark-content" />
      
      {/* Professional Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disclaimer</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Notice Icon & Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.alertCircle}>
            <MaterialCommunityIcons name="shield-alert-outline" size={40} color="#FFB300" />
          </View>
          <Text style={styles.heroTitle}>Important Notice</Text>
          <Text style={styles.heroSubtitle}>
            Please read the following legal exclusions regarding the TDC Student Ecosystem.
          </Text>
        </View>

        <View style={styles.contentWrapper}>
          
          {/* Section 1: Brand & Offer Responsibility */}
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <MaterialCommunityIcons name="store-remove-outline" size={24} color="#000000" />
              <Text style={styles.boxTitle}>Offer & Discount Accuracy</Text>
            </View>
            <Text style={styles.boxText}>
              TDC acts as a bridge between brands and students. We are not liable for the 
              availability, quality, or fulfillment of discounts and products provided by third-party brands.
            </Text>
          </View>

          {/* Section 2: Career & Employment */}
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <MaterialCommunityIcons name="briefcase-variant-outline" size={24} color="#000000" />
              <Text style={styles.boxTitle}>Career Hub & Internships</Text>
            </View>
            <Text style={styles.boxText}>
              The Career Hub provides information on job opportunities and internships. TDC does 
              not guarantee employment, placement, or the accuracy of job descriptions provided by external recruiters.
            </Text>
          </View>

          {/* Section 3: Travel & Exchange */}
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <MaterialCommunityIcons name="airplane-off" size={24} color="#000000" />
              <Text style={styles.boxTitle}>Travel & Global Programs</Text>
            </View>
            <Text style={styles.boxText}>
              Travel packages and international exchange details are for informational purposes. 
              TDC is not responsible for visa rejections, travel delays, or changes in university exchange policies.
            </Text>
          </View>

          {/* Section 4: Data & Verification */}
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="#000000" />
              <Text style={styles.boxTitle}>Status Verification</Text>
            </View>
            <Text style={styles.boxText}>
              Users are responsible for maintaining valid student credentials. TDC reserves the 
              right to modify or withdraw access to specific ecosystem perks without prior notice.
            </Text>
          </View>

          {/* Section 5: App Purpose */}
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <MaterialCommunityIcons name="information-outline" size={24} color="#000000" />
              <Text style={styles.boxTitle}>Informational Scope</Text>
            </View>
            <Text style={styles.boxText}>
              The Deft Crew platform is provided "as is." While we strive for excellence, we 
              do not warrant that the app will be error-free or that all student rewards will be redeemable at all times.
            </Text>
          </View>

        </View>

        {/* Professional Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 tdc (The Deft Crew). All Rights Reserved.</Text>
          <Text style={styles.footerVersion}>Eco-System Version 1.0.5</Text>
        </View>
        <View style={{ height: 40 }} />
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
    backgroundColor: "#FFFFFF",
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
    color: "#1A1A1A",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scrollContainer: {
    paddingBottom: 40,
    backgroundColor: "#FBFCFE",
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 40,
  },
  alertCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    elevation: 5,
    shadowColor: "#08634f",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#7F8C8D",
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: "500",
  },
  contentWrapper: {
    paddingHorizontal: 20,
  },
  infoBox: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF1F4",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  boxTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginLeft: 12,
  },
  boxText: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: "#1A1A1A",
    fontWeight: "700",
  },
  footerVersion: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
    fontWeight: "600",
  },
});