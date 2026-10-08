// app/src/components/WhyPoints.js — tdc Privilege ("privilege benefits" in the drawer). Same copy; design system layout.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DocScreen, DocHero, DocSection, DocFooter } from "../ui/DocPage";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";

const benefits = [
  { icon: "briefcase-check-outline", title: "Career Hub", desc: "See top internships first and get direct referrals.", category: "Career" },
  { icon: "earth-arrow-right", title: "Global Scholarships", desc: "Your Scholarships applications go to the front of the line.", category: "Global" },
  { icon: "airplane-settings", title: "AI Travel Planner", desc: "Plan trips, routes and budgets with your AI travel assistant.", category: "Travel Assistant" },
  { icon: "ticket-confirmation-outline", title: "Boosted Discounts", desc: "Bigger discounts at premium partner brands.", category: "Discounts" },
  { icon: "shield-star-outline", title: "Campus Leadership", desc: "Get verified as a campus leader and grow your network.", category: "Leadership" },
  { icon: "account-group-outline", title: "Skills Network", desc: "Find students with skills you need. Swap, learn, build together.", category: "Skills" },
  { icon: "calendar-star-outline", title: "Premium Events", desc: "VIP entry to workshops and networking events.", category: "Events" },
  { icon: "file-document-outline", title: "Smart Resume", desc: "Build a resume that passes ATS, with AI tips as you go.", category: "Career" },
  { icon: "star-circle-outline", title: "Job Recs", desc: "Jobs matched to you, from companies worth your time.", category: "Career" },
];

export default function WhyPoints() {
  return (
    <DocScreen title="tdc Privilege">
      <DocHero title="tdc Privilege" line="Stay active on tdc, get verified, unlock better perks." />

      <DocSection title="privilege" />
      {benefits.map((b) => (
        <View key={b.title} style={s.card}>
          <View style={s.icon}>
            <MaterialCommunityIcons name={b.icon} size={19} color={T.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.head}>
              <Text style={s.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{b.title}</Text>
              <View style={s.tag}>
                <Text style={s.tagText}>{b.category.toLowerCase()}</Text>
              </View>
            </View>
            <Text style={s.desc} maxFontSizeMultiplier={MAX_FONT_SCALE}>{b.desc}</Text>
          </View>
        </View>
      ))}

      <DocFooter lines={["© 2026 tdc Privilege"]} />
    </DocScreen>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: "row", gap: 14, borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, padding: 16, marginBottom: 10 },
  icon: { width: 40, height: 40, borderRadius: 14, backgroundColor: T.yellowSoft, alignItems: "center", justifyContent: "center" },
  head: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  title: { fontFamily: F.headingBold, fontSize: 16, color: T.ink },
  tag: { height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: T.sand, justifyContent: "center" },
  tagText: { fontFamily: F.bodyBold, fontSize: 11, color: T.ink },
  desc: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.textMuted, marginTop: 4 },
});
