import React from "react";
import { 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  ScrollView,
  StatusBar
} from "react-native";
import { Ionicons, MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import BaseScreen from "./BaseScreen";

const { width } = Dimensions.get("window");

export default function AboutScreen() {
  const navigation = useNavigation();

  // Updated Feature Grid Data
  const features = [
    { id: 1, title: "Student Deals", desc: "Exclusive discounts tailored for students.", icon: "school", color: "#FFB300" },
    { id: 2, title: "Career Hub", desc: "Top-tier internships and job opportunities.", icon: "briefcase-variant", color: "#00A86B" },
    { id: 3, title: "Student Travel", desc: "Curated budget-friendly travel packages.", icon: "airplane", color: "#E53935" },
    { id: 4, title: "Global Exchange", desc: "Access to international study programs.", icon: "earth", color: "#7B1FA2" },
  ];

  return (
    <BaseScreen>
      <StatusBar barStyle="dark-content" />
      
      {/* Sleek Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About TDC</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.logoCircle}>
             <Text style={{fontSize:25, fontWeight:'800', color:"white", fontFamily:"Cardo"}}>tdc</Text>
          </View>
          <Text style={styles.brandName}>The Deft Crew</Text>
          <View style={styles.taglineBadge}>
            <Text style={styles.taglineText}>THE STUDENT ECOSYSTEM</Text>
          </View>
          <Text style={styles.heroDesc}>
            We’re building Pakistan's largest 
            <Text style={{fontWeight: '700'}}> student community</Text>. From savings to 
            career growth, tdc is your ultimate lifestyle partner.
          </Text>
        </View>

        {/* Value Propositions */}
        <Text style={styles.sectionLabel}>WHAT'S INSIDE THE CREW?</Text>
        <View style={styles.benefitWrapper}>
          {[
            { text: "Verified student-only marketplace.", icon: "check-decagram" },
            { text: "Seamless, paperless redemption.", icon: "qrcode-scan" },
            { text: "Community-driven networking.", icon: "account-group" }
          ].map((item, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={styles.checkIcon}>
                <MaterialCommunityIcons name={item.icon} size={20} color="#08634f" />
              </View>
              <Text style={styles.benefitItemText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Feature Grid - Modern 2x2 */}
        <Text style={styles.sectionLabel}>CORE PILLARS</Text>
        <View style={styles.grid}>
          {features.map((item) => (
            <TouchableOpacity key={item.id} activeOpacity={0.9} style={styles.featureBox}>
              <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                <MaterialCommunityIcons name={item.icon} size={32} color={item.color} />
              </View>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
              <View style={[styles.accentBar, { backgroundColor: item.color }]} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  iconBtn: {
    padding: 8,
    backgroundColor: "#F0F5F4",
    borderRadius: 12,
  },
  container: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: "#000000",
    borderRadius: 30,
    padding: 30,
    alignItems: "center",
    marginBottom: 30,
    elevation: 10,
    shadowColor: "#08634f",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  brandName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginTop: 15,
  },
  taglineBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 5,
  },
  taglineText: {
    color: "#FFB300",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  heroDesc: {
    color: "#E0F2F1",
    fontSize: 15,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 22,
    opacity: 0.9,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#999",
    letterSpacing: 2,
    marginBottom: 15,
    marginLeft: 5,
  },
  benefitWrapper: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  checkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  benefitItemText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureBox: {
    width: (width - 55) / 2,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: "hidden",
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 5,
  },
  featureDesc: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
  },
  accentBar: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    opacity: 0.5,
  },
});