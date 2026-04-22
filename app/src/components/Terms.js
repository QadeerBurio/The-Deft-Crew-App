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

export default function TermsScreen() {
  const navigation = useNavigation();

  // Reusable component for legal sections
  const TermSection = ({ icon, title, content, color = "white" }) => (
    <View style={styles.sectionCard}>
      <View style={styles.iconBadge}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.sectionBody}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionContent}>{content}</Text>
      </View>
    </View>
  );

  return (
    <BaseScreen>
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <Text style={styles.headerSubtitle}>Last updated: March 2026</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContainer}
      >
        {/* TDC Launch Branding */}
        <View style={styles.brandingBanner}>
          <Text style={styles.tdcText}>THE DEFT CREW ECOSYSTEM</Text>
          <Text style={styles.brandingTitle}>Legal Framework</Text>
          <Text style={styles.brandingDesc}>
            By joining the Crew, you agree to these terms. We provide a platform connecting students 
            to global opportunities, discounts, and career growth.
          </Text>
        </View>

        <View style={styles.contentWrapper}>
          <TermSection 
            icon="account-check-outline"
            title="Student Eligibility"
            content="Access is strictly for verified university students. You must provide valid academic credentials to unlock exclusive ecosystem perks."
          />

          <TermSection 
            icon="briefcase-search-outline"
            title="Career & Internships"
            content="TDC facilitates connections with employers. We do not guarantee employment and are not liable for the recruitment policies of partner companies."
          />

          <TermSection 
            icon="airplane-takeoff"
            title="Travel & Exchange"
            content="Travel packages and exchange programs are subject to third-party provider terms and visa regulations of the respective countries."
          />

          <TermSection 
            icon="tag-outline"
            title="Brand Redemption"
            content="Discounts and offers are subject to brand availability. TDC is a facilitator and is not responsible for inventory or service quality at partner outlets."
          />

          <TermSection 
            icon="shield-key-outline"
            title="Account Integrity"
            content="Your account is personal. Sharing student-exclusive QR codes or credentials with non-students may lead to permanent suspension from the Crew."
          />

          <TermSection 
            icon="gavel"
            title="Governing Law"
            content="These terms are governed by the laws of Pakistan. Any disputes shall be settled within the jurisdiction of Pakistani courts."
          />
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#FFB300" />
          <Text style={styles.footerNote}>
            Designed to protect the interests of the student community.
          </Text>
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
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#95A5A6",
    marginTop: 2,
    fontWeight: "600",
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  brandingBanner: {
    backgroundColor: "#000000",
    padding: 25,
    margin: 20,
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#08634f",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  tdcText: {
    color: "#FFB300",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },
  brandingTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  brandingDesc: {
    color: "#E0F2F1",
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.9,
  },
  contentWrapper: {
    paddingHorizontal: 20,
  },
  sectionCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 24,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F0F2F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  sectionBody: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  sectionContent: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  footerNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    fontWeight: "600",
  },
});