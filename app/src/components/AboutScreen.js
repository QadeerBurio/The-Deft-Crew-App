// app/src/components/AboutScreen.js — About tdc (drawer). Same copy; design system layout.
// (The old file set up an about video that was never rendered; that unused code is gone.)
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DocScreen, DocHero, DocSection, DocFooter } from "../ui/DocPage";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";

const features = [
  { title: "Student Deals", desc: "Discounts at 100+ brands", icon: "pricetag-outline" },
  { title: "Skills Share", desc: "Learn from other students", icon: "people-outline" },
  { title: "Premium Events", desc: "Workshops and meetups", icon: "calendar-outline" },
  { title: "Resume Builder", desc: "AI resumes that pass ATS", icon: "document-text-outline" },
  { title: "Scholarships", desc: "Grants and funding in one place", icon: "school-outline" },
  { title: "AI Travel Planner", desc: "Plan trips on a student budget", icon: "airplane-outline" },
  { title: "Career Mentorship", desc: "Advice from people in the industry", icon: "briefcase-outline" },
  { title: "Community Forum", desc: "Ask, confess, connect", icon: "chatbubbles-outline" },
];

const highlights = ["100+ Partner Brands", "15+ Universities", "10,000+ Active Students"];

const company = [
  { icon: "location-outline", text: "karachi, pakistan" },
  { icon: "calendar-outline", text: "Founded 2026" },
  { icon: "people-outline", text: "Team of 25+" },
  { icon: "globe-outline", text: "gettdc.pk" },
];

const STORY = `While building The Deft Crew, MSB sat across from thousands of students and fresh grads. Talent was never the problem. Access was.
Students were paying full price at places that would happily give them a discount. Internships and jobs went to whoever heard about
them first. Events happened across city and nobody knew. Good people sat in the same city and never met.
The idea for tdc came in 2025. By early 2026, it was live. Student discounts at 100+ brands, internships and jobs in one feed, events near you, and a community of students who actually help each other. One app. Everything a student needs.`;

export default function AboutScreen() {
  return (
    <DocScreen title="about">
      <DocHero kicker="student ecosystem" title="tdc.">
        <Text style={s.heroDesc} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {"Pakistan's  "}
          <Text style={s.heroStrong}>student & alumni community</Text>
          . for savings, careers and everything in between.
        </Text>
      </DocHero>

      <DocSection title="about tdc app" />
      <View style={s.card}>
        <Text style={s.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          tdc is the all-in-one student app. deals, careers, events, networking and your campus community, in one place.
        </Text>
        <View style={s.chips}>
          {highlights.map((h) => (
            <View key={h} style={s.chip}>
              <Ionicons name="checkmark-circle" size={14} color={T.ink} />
              <Text style={s.chipText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{h}</Text>
            </View>
          ))}
        </View>
      </View>

      <DocSection title="our story" />
      <View style={s.card}>
        <Text style={s.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>{STORY}</Text>
        <View style={s.company}>
          {company.map((c) => (
            <View key={c.text} style={s.companyItem}>
              <Ionicons name={c.icon} size={15} color={T.textMuted} />
              <Text style={s.companyText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{c.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <DocSection title="features" />
      <View style={s.grid}>
        {features.map((f) => (
          <View key={f.title} style={s.feature}>
            <View style={s.featureIcon}>
              <Ionicons name={f.icon} size={18} color={T.ink} />
            </View>
            <Text style={s.featureTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{f.title}</Text>
            <Text style={s.featureDesc} maxFontSizeMultiplier={MAX_FONT_SCALE}>{f.desc}</Text>
          </View>
        ))}
      </View>

      <DocFooter lines={["Making student life simpler and careers easier.", "© 2026 The Deft Crew"]} />
    </DocScreen>
  );
}

const s = StyleSheet.create({
  heroDesc: { fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: T.onInkMuted, marginTop: 8 },
  heroStrong: { fontFamily: F.bodyBold, color: T.yellow },
  card: { borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, padding: 16 },
  body: { fontFamily: F.body, fontSize: 14.5, lineHeight: 22, color: T.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: T.yellowSoft },
  chipText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
  company: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.lineSoft },
  companyItem: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: "45%" },
  companyText: { fontFamily: F.bodyMedium, fontSize: 13, color: T.textMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  feature: { width: "48%", flexGrow: 1, borderRadius: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, padding: 14 },
  featureIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: T.yellowSoft, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  featureTitle: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  featureDesc: { fontFamily: F.body, fontSize: 12.5, lineHeight: 17, color: T.textMuted, marginTop: 2 },
});
