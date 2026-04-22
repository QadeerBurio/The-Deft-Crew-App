// screens/FAQScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
  {
    category: "Offers & Rewards",
    icon: "gift-outline",
    questions: [
      { q: "How do I redeem an offer?", a: "Open the offer details and tap the “Redeem” button to claim your rewards." },
      { q: "Do points from multiple offers accumulate?", a: "Yes, points from all eligible transactions are cumulative and reflected in your account." },
      { q: "Do points have an expiration date?", a: "Yes, points expire 2 months after being credited to your account." },
    ],
  },
  {
    category: "Career Opportunities",
    icon: "briefcase-outline",
    questions: [
      { q: "How do I apply for an internship?", a: "Navigate to the Careers tab, select an internship that matches your profile, and upload your CV directly through the app." },
      { q: "Are the job postings verified?", a: "Yes, all career opportunities are vetted by the University Career Center before being posted." },
      { q: "Can I get alerts for specific industries?", a: "Absolutely. You can set up 'Job Alerts' in your profile settings for industries like Tech, Finance, or Arts." },
      { q: "Does the app offer resume building tools?", a: "Yes, we have a 'Resume Builder' section in the Career tab with templates optimized for ATS systems." },
    ],
  },
  {
    category: "Traveling",
    icon: "airplane-outline",
    questions: [
      { q: "Are there student discounts for travel?", a: "Yes, we partner with local transport and airlines to provide up to 20% off for verified students." },
      { q: "How do I book a university-sanctioned trip?", a: "View the 'Excursions' section under the Travel tab to find upcoming group trips and booking links." },
      { q: "Is travel insurance included?", a: "Basic insurance is included for all official university trips, but we recommend private coverage for personal travel." },
    ],
  },
  {
    category: "International Exchange",
    icon: "globe-outline",
    questions: [
      { q: "What are the eligibility requirements for exchange?", a: "Usually a minimum GPA of 3.0 and completion of at least two semesters at your home university." },
      { q: "Will my credits transfer back?", a: "Most partner universities have pre-approved credit transfer agreements. Check with your academic advisor for specifics." },
      { q: "Is financial aid available for study abroad?", a: "Yes, many internal grants and external scholarships like Erasmus+ or Fulbright are listed in the Exchange tab." },
      { q: "Do I need to speak the local language?", a: "Many programs offer courses in English, but some regions require a B2 level proficiency in the local language." },
    ],
  },
];

export default function FAQScreen() {
  const navigation = useNavigation();
  const [activeKey, setActiveKey] = useState(null); // Format: "categoryIndex-questionIndex"

  const toggleExpand = (catIdx, qIdx) => {
    const key = `${catIdx}-${qIdx}`;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveKey(activeKey === key ? null : key);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {FAQ_DATA.map((cat, catIdx) => (
          <View key={catIdx} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Ionicons name={cat.icon} size={20} color="#040505" style={{ marginRight: 8 }} />
              <Text style={styles.categoryTitle}>{cat.category}</Text>
            </View>

            {cat.questions.map((item, qIdx) => {
              const isExpanded = activeKey === `${catIdx}-${qIdx}`;
              return (
                <View key={qIdx} style={styles.qaContainer}>
                  <TouchableOpacity
                    style={styles.questionContainer}
                    onPress={() => toggleExpand(catIdx, qIdx)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.question}>{item.q}</Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#f8be2c"
                    />
                  </TouchableOpacity>
                  {isExpanded && <Text style={styles.answer}>{item.a}</Text>}
                </View>
              );
            })}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F5F2",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 10,
    marginTop: Platform.OS === "android" ? 30 : 0,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000000",
  },
  scrollContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  categorySection: {
    marginBottom: 25,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 5,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#040505",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  qaContainer: {
    marginBottom: 10,
    padding: 16,
    borderRadius: 15,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  questionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  question: {
    fontWeight: "600",
    fontSize: 15,
    color: "#040505",
    flex: 1,
    marginRight: 10,
  },
  answer: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 10,
  },
});