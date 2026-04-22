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

export default function PrivacyScreen() {
  const navigation = useNavigation();

  // Reusable card for privacy points
  const PrivacyPoint = ({ icon, title, content }) => (
    <View style={styles.policyCard}>
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons name={icon} size={22} color="#ffffff" />
      </View>
      <View style={styles.textWrapper}>
        <Text style={styles.pointTitle}>{title}</Text>
        <Text style={styles.pointContent}>{content}</Text>
      </View>
    </View>
  );

  return (
    <BaseScreen>
      <StatusBar barStyle="dark-content" />
      
      {/* Sleek Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Center</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Security Summary Banner */}
        <View style={styles.securityBanner}>
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTag}>TRUST & SAFETY</Text>
            <Text style={styles.bannerTitle}>Your Privacy is Our Priority</Text>
            <Text style={styles.bannerSubtitle}>
              The Deft Crew uses bank-grade encryption to ensure your student data and academic identity remains private.
            </Text>
          </View>
          <MaterialCommunityIcons name="shield-check-outline" size={60} color="rgba(255,255,255,0.2)" style={styles.bannerIcon} />
        </View>

        <View style={styles.contentPadding}>
          <Text style={styles.introHeading}>Student Data Handling</Text>
          
          <PrivacyPoint 
            icon="database-lock"
            title="Data Collection"
            content="We only collect essential info like your University ID to verify your status. This unlocks exclusive student deals and career opportunities."
          />

          <PrivacyPoint 
            icon="eye-off-outline"
            title="Zero Third-Party Sharing"
            content="TDC never sells your personal data. Your academic details are never shared with brands without your explicit consent."
          />

          <PrivacyPoint 
            icon="key-chain-variant"
            title="End-to-End Encryption"
            content="All sensitive info is encrypted. Our systems follow global security standards to protect your student profile from unauthorized access."
          />

          <PrivacyPoint 
            icon="bell-ring-outline"
            title="Career & Deal Alerts"
            content="You have full control. We only notify you about internships, exchange programs, and brand discounts that actually matter to you."
          />

          <PrivacyPoint 
            icon="account-cancel-outline"
            title="Right to be Forgotten"
            content="You can delete your TDC account and all associated data instantly via settings or by reaching out to our support crew."
          />

          {/* Contact Support Section */}
          <TouchableOpacity 
            style={styles.contactBox}
            activeOpacity={0.8}
            onPress={() => {/* Add email link logic if needed */}}
          >
            <MaterialCommunityIcons name="email-outline" size={20} color="#ffffff" />
            <Text style={styles.contactText}>Questions? Email info@thedeftcrew.com</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerSpace} />
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
  },
  securityBanner: {
    backgroundColor: "#000000",
    margin: 20,
    borderRadius: 30,
    padding: 24,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: "#08634f",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  bannerInfo: {
    flex: 1,
    zIndex: 1,
  },
  bannerTag: {
    color: "#FFB300",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  bannerSubtitle: {
    color: "#E0F2F1",
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.9,
  },
  bannerIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  contentPadding: {
    paddingHorizontal: 20,
  },
  introHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#999",
    letterSpacing: 2,
    marginBottom: 20,
    marginTop: 10,
    textTransform: "uppercase",
  },
  policyCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 24,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F0F3F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  textWrapper: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  pointContent: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 18,
    backgroundColor: '#000000',
    borderRadius: 20,
    elevation: 5,
  },
  contactText: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  footerSpace: {
    height: 30,
  },
});