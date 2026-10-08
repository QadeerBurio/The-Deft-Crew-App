// app/src/components/FAQ.js — help center / FAQ. Same questions and answers; design system layout.
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { DocScreen, DocHero, DocFooter } from "../ui/DocPage";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
  {
    category: "Offers & Rewards",
    icon: "gift-outline",
    questions: [
      { q: "How do I redeem an offer?", a: "Open the offer details and tap the 'Redeem' button to claim your rewards instantly." },
      { q: "Do points from multiple offers accumulate?", a: "Yes, points from all eligible transactions are cumulative and reflected in your account dashboard." },
      { q: "Do points have an expiration date?", a: "Yes, points expire 2 months after being credited to your account. Stay active to keep earning!" },
    ],
  },
  {
    category: "Skills Share Network",
    icon: "account-group-outline",
    questions: [
      { q: "What is Skills Share Network?", a: "A platform where students can share expertise, learn new skills, and collaborate on projects across universities." },
      { q: "How do I join Skills Share?", a: "Navigate to the Skills Share tab, create your profile with your skills, and start connecting with fellow students." },
      { q: "Can I earn rewards for sharing skills?", a: "Yes, active skill sharers earn Privilege Points and can unlock exclusive rewards and recognition." },
    ],
  },
  {
    category: "Premium Events",
    icon: "calendar-star-outline",
    questions: [
      { q: "What types of events are available?", a: "We host workshops, seminars, networking events, career fairs, and cultural events across Karachi, Hyderabad, Sukkur, and Larkana." },
      { q: "How do I get VIP access to events?", a: "Privilege members get priority registration and exclusive access to limited-seat events. Upgrade your tier to unlock more benefits." },
      { q: "Are events free for students?", a: "Most events are free for verified students. Some premium events may require a small registration fee for materials." },
      { q: "Can I suggest an event idea?", a: "Absolutely! Contact our events team with your suggestions, and we'll work with university partners to make it happen." },
    ],
  },
  {
    category: "Smart Resume Builder",
    icon: "file-document-outline",
    questions: [
      { q: "How does the Resume Builder work?", a: "Choose from ATS-optimized templates, input your details, and get AI-powered suggestions to improve your resume." },
      { q: "Are the templates free?", a: "Yes, all basic templates are free. Privilege members get access to premium templates and advanced features." },
      { q: "Can I get feedback on my resume?", a: "Yes, submit your resume for review by industry professionals and get personalized feedback within 48 hours." },
      { q: "What formats are supported?", a: "You can export your resume in PDF, Word, and plain text formats. All formats are ATS-compatible." },
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
    category: "Scholarships",
    icon: "school-outline",
    questions: [
      { q: "What scholarships are available?", a: "We list internal grants, external scholarships like Erasmus+, Fulbright, and partner university scholarships." },
      { q: "How do I apply for a scholarship?", a: "Navigate to the Scholarships section, review eligibility criteria, and apply directly through the app." },
      { q: "Are there scholarships for international students?", a: "Yes, many scholarships are open to international students. Check specific requirements for each scholarship." },
      { q: "When are scholarship deadlines?", a: "Deadlines vary by scholarship. Check the individual scholarship page for specific dates and requirements." },
    ],
  },
  
  {
    category: "Traveling",
    icon: "airplane",
    questions: [
      { q: "Are there student discounts for travel?", a: "Yes, we partner with local transport and airlines to provide up to 20% off for verified students." },
      { q: "How do I book a university-sanctioned trip?", a: "View the 'Excursions' section under the Travel tab to find upcoming group trips and booking links." },
      { q: "Is travel insurance included?", a: "Basic insurance is included for all official university trips, but we recommend private coverage for personal travel." },
    ],
  },
];

export default function FAQScreen() {
  const navigation = useNavigation();
  const [activeKey, setActiveKey] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleExpand = (catIdx, qIdx) => {
    const key = `${catIdx}-${qIdx}`;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveKey(activeKey === key ? null : key);
  };

  const toggleCategory = (catIdx) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategories((prev) => ({
      ...prev,
      [catIdx]: prev[catIdx] === false ? true : false,
    }));
  };

  return (
    <DocScreen title="help center">
      <DocHero
        title="frequently asked questions"
        line="Find answers to common questions about tdc's features, rewards, and services."
      />

      {FAQ_DATA.map((cat, catIdx) => {
        const open = expandedCategories[catIdx] !== false;
        return (
          <View key={cat.category} style={s.cat}>
            <TouchableOpacity
              style={s.catHead}
              onPress={() => toggleCategory(catIdx)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${cat.category}, ${cat.questions.length} questions`}
            >
              <View style={s.catIcon}>
                <MaterialCommunityIcons name={cat.icon} size={20} color={T.ink} />
              </View>
              <Text style={s.catTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{cat.category}</Text>
              <View style={s.count}>
                <Text style={s.countText}>{cat.questions.length}</Text>
              </View>
              <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={T.textMuted} />
            </TouchableOpacity>

            {open &&
              cat.questions.map((item, qIdx) => {
                const expanded = activeKey === `${catIdx}-${qIdx}`;
                return (
                  <View key={item.q} style={s.q}>
                    <TouchableOpacity
                      style={s.qHead}
                      onPress={() => toggleExpand(catIdx, qIdx)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                    >
                      <Text style={[s.qText, expanded && s.qTextOn]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                        {item.q}
                      </Text>
                      <Ionicons name={expanded ? "remove" : "add"} size={18} color={T.ink} />
                    </TouchableOpacity>
                    {expanded && (
                      <Text style={s.answer} maxFontSizeMultiplier={MAX_FONT_SCALE}>{item.a}</Text>
                    )}
                  </View>
                );
              })}
          </View>
        );
      })}

      {/* Support */}
      <TouchableOpacity
        style={s.support}
        onPress={() => navigation.navigate("ContactUs")}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="still need help? contact us"
      >
        <View style={s.supportIcon}>
          <Ionicons name="chatbubbles-outline" size={22} color={T.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.supportTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>still need help?</Text>
          <Text style={s.supportDesc} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Contact our support team for personalized assistance
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={T.yellow} />
      </TouchableOpacity>

      <DocFooter lines={["building a stronger student economy.", "© 2026 tdc Privilege Program"]} />
    </DocScreen>
  );
}

const s = StyleSheet.create({
  cat: { marginTop: 12, borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, overflow: "hidden" },
  catHead: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 64 },
  catIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: T.yellowSoft, alignItems: "center", justifyContent: "center" },
  catTitle: { flex: 1, fontFamily: F.headingBold, fontSize: 16, color: T.ink },
  count: { minWidth: 26, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: T.sand, alignItems: "center", justifyContent: "center" },
  countText: { fontFamily: F.bodyBold, fontSize: 12, color: T.ink },
  q: { borderTopWidth: 1, borderTopColor: T.lineSoft, paddingHorizontal: 14 },
  qHead: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingVertical: 10 },
  qText: { flex: 1, fontFamily: F.bodySemi, fontSize: 14.5, lineHeight: 20, color: T.ink },
  qTextOn: { fontFamily: F.bodyBold },
  answer: { fontFamily: F.body, fontSize: 14, lineHeight: 21, color: T.textMuted, paddingBottom: 14 },
  support: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 20, padding: 16, borderRadius: 22, backgroundColor: T.ink },
  supportIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.yellow, alignItems: "center", justifyContent: "center" },
  supportTitle: { fontFamily: F.headingBold, fontSize: 16, color: T.white },
  supportDesc: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: T.onInkMuted, marginTop: 2 },
});
