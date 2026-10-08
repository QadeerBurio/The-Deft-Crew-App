// app/src/components/HowItsWorks.js — How it works (drawer). Same copy; design system layout.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DocScreen, DocHero, DocSection, DocFooter } from "../ui/DocPage";
import Button from "../ui/Button";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";

const STEPS = [
  { number: "01", icon: "account-check-outline", title: "Verify You're a Student", desc: "Sign up with your university details to unlock student-only deals.", tag: "Start" },
  { number: "02", icon: "ticket-percent-outline", title: "Save on Brands", desc: "Scan with your tdc app at 100+ brands and save on the spot.", tag: "Discounts" },
  { number: "03", icon: "account-group-outline", title: "Skills Share", desc: "Team up with other students, share what you know, build projects.", tag: "Collaborate" },
  { number: "04", icon: "calendar-star-outline", title: "Events", desc: "Get into workshops, seminars and networking events.", tag: "Events" },
  { number: "05", icon: "file-document-outline", title: "Resume Builder", desc: "Build an ATS-friendly resume with AI suggestions.", tag: "Career" },
  { number: "06", icon: "briefcase-search-outline", title: "Career Growth", desc: "Get early access to internships, jobs and exchange programs.", tag: "Growth" },
  { number: "07", icon: "airplane-takeoff", title: "Travel AI Assistant", desc: "Plan trips with AI, plus rewards as you level up in tdc Privilege", tag: "Rewards" },
  { number: "08", icon: "account-multiple-outline", title: "Social Media Hub", desc: "Post, Confess, Connect and grow your network across tdc social feeds.", tag: "Social" },
];

const STEP_COUNT = STEPS.length;

export default function HowItWorks() {
  const navigation = useNavigation();

  return (
    <DocScreen title="how it works">
      <DocHero kicker="tdc ecosystem" title="start here" line={`${STEP_COUNT} steps to get the most out of tdc.`} />

      <DocSection title="your journey" />
      <View>
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1;
          return (
            <View key={s.number} style={st.row}>
              <View style={st.rail}>
                <View style={st.num}>
                  <Text style={st.numText}>{s.number}</Text>
                </View>
                {!last && <View style={st.line} />}
              </View>
              <View style={[st.card, last && { marginBottom: 0 }]}>
                <View style={st.cardHead}>
                  <MaterialCommunityIcons name={s.icon} size={18} color={T.ink} />
                  <Text style={st.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{s.title}</Text>
                </View>
                <Text style={st.desc} maxFontSizeMultiplier={MAX_FONT_SCALE}>{s.desc}</Text>
                <View style={st.tag}>
                  <Text style={st.tagText}>{s.tag.toLowerCase()}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <Button title="get started" onPress={() => navigation.navigate("HomeTabs")} style={{ marginTop: 22 }} />

      <DocFooter lines={["building a stronger student economy.", "© 2026 tdc Privilege Program"]} />
    </DocScreen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  rail: { width: 36, alignItems: "center" },
  num: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.ink, alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: F.heading, fontSize: 13, color: T.yellow },
  line: { flex: 1, width: 2, backgroundColor: T.line, marginVertical: 4 },
  card: { flex: 1, borderRadius: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, padding: 14, marginBottom: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontFamily: F.headingBold, fontSize: 16, color: T.ink },
  desc: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.textMuted, marginTop: 6 },
  tag: { alignSelf: "flex-start", marginTop: 10, height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: T.yellowSoft, justifyContent: "center" },
  tagText: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.ink },
});
