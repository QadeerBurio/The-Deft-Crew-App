import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  Dimensions 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BaseScreen from "./BaseScreen";

const { width } = Dimensions.get("window");

export default function HowItWorks() {
  
  const navigation = useNavigation();

  const Step = ({ number, title, desc, icon, isLast }) => (
    <View style={styles.stepContainer}>
      <View style={styles.leftColumn}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name={icon} size={28} color="#ffffff" />
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{number}</Text>
          </View>
        </View>
        {!isLast && <View style={styles.verticalLine} />}
      </View>
      
      <View style={styles.rightColumn}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );

  return (
    <BaseScreen>
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How TDC Works</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroLabel}>TDC STUDENT ECOSYSTEM</Text>
          <Text style={styles.heroTitle}>Unlock Your Potential</Text>
          <Text style={styles.heroSubtitle}>
            Follow these four core steps to navigate the TDC ecosystem—from daily savings to global career opportunities.
          </Text>
        </View>

        {/* Timeline Steps */}
        <View style={styles.timelineContainer}>
          <Step 
            number="1"
            icon="account-check-outline"
            title="Verify Your Identity"
            desc="Sign up with your university credentials. Verification unlocks secure access to student-only discounts and verified brand partnerships."
          />
          
          <Step 
            number="2"
            icon="ticket-percent-outline"
            title="Save on Brands"
            desc="Browse 200+ partner brands. Use your unique TDC student ID to redeem instant discounts on food, fashion, and tech."
          />
          
          <Step 
            number="3"
            icon="briefcase-search-outline"
            title="Career & Global Growth"
            desc="Access the Career Hub for exclusive internships and explore international exchange programs tailored for your academic path."
          />
          
          <Step 
            number="4"
            icon="airplane-takeoff"
            title="Travel & Rewards"
            desc="Activate student-specific travel packages and move up the TDC Privilege tiers by engaging with the community."
            isLast={true}
          />
        </View>

        {/* Call to Action */}
        <TouchableOpacity 
          style={styles.ctaButton} 
          activeOpacity={0.8} 
          onPress={() => navigation.navigate("Brands")}
        >
          <Text style={styles.ctaText}>Get Started Now</Text>
          <Ionicons name="rocket-outline" size={20} color="#FFF" style={{marginLeft: 10}} />
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Need help navigating the ecosystem? Contact the Deft Crew support team at info@thedeftcrew.com
        </Text>
        <View style={{height: 20}} />
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
    borderBottomColor: '#F0F0F0',
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
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    padding: 30,
    backgroundColor: "#000000",
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: "#08634f",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  heroLabel: {
    color: "#FFB300",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    color: "#E0F2F1",
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
  },
  timelineContainer: {
    paddingHorizontal: 25,
    paddingTop: 35,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  leftColumn: {
    alignItems: 'center',
    marginRight: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  numberBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFB300",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  numberText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "900",
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#F0F5F4",
    marginVertical: 10,
  },
  rightColumn: {
    flex: 1,
    paddingBottom: 40,
    paddingTop: 5,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 13,
    color: "#777",
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: "#000000",
    marginHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 8,
    shadowColor: "#08634f",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  footerNote: {
    textAlign: 'center',
    color: "#999",
    fontSize: 11,
    marginTop: 30,
    paddingHorizontal: 50,
    lineHeight: 18,
    fontWeight: "600",
  }
});