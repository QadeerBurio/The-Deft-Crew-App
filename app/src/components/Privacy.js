// app/src/components/Privacy.js — Privacy Center (drawer). Wording unchanged; design system layout.
import React from "react";
import { Linking, TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DocScreen, DocHero, DocSection, DocCard, DocFooter } from "../ui/DocPage";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";

const privacyPoints = [
  {
    icon: "database-lock-outline",
    title: "Data Collection",
    content: "Only what we need, like your university ID, to verify you're a student.",
  },
  {
    icon: "eye-off-outline",
    title: "We don't sell your data",
    content: "Your personal details stay with us.",
  },
  {
    icon: "shield-key-outline",
    title: "End-to-End Encryption",
    content: "Your sensitive info and student profile are protected.",
  },
  {
    icon: "bell-ring-outline",
    title: "Notifications",
    content: "We only message you about internships, exchange programs and deals.",
  },
  {
    icon: "account-cancel-outline",
    title: "Delete Any Time",
    content: "Delete your account and all your data whenever you want.",
  },
];

export default function PrivacyScreen() {
  const openEmail = () => Linking.openURL("mailto:info@thedeftcrew.com");

  return (
    <DocScreen title="Privacy Center">
      <DocHero kicker="TRUST & SAFETY" title="Your Privacy Matters" line="Your data is encrypted and stays private." />

      <DocSection title="Data Handling" />
      {privacyPoints.map((p) => (
        <DocCard key={p.title} icon={p.icon} title={p.title} body={p.content} />
      ))}

      {/* Contact */}
      <TouchableOpacity
        style={s.contact}
        onPress={openEmail}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Have Questions? email us"
      >
        <View style={s.contactIcon}>
          <Ionicons name="mail-outline" size={20} color={T.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.contactTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>Have Questions?</Text>
          <Text style={s.contactText} maxFontSizeMultiplier={MAX_FONT_SCALE}>info@gettdc.pk</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={T.yellow} />
      </TouchableOpacity>

      <DocFooter lines={["Building a Stronger Student Economy.", "© 2026 tdc Privilege Program"]} />
    </DocScreen>
  );
}

const s = StyleSheet.create({
  contact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: T.ink,
  },
  contactIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.yellow, alignItems: "center", justifyContent: "center" },
  contactTitle: { fontFamily: F.headingBold, fontSize: 16, color: T.white },
  contactText: { fontFamily: F.body, fontSize: 13.5, color: T.onInkMuted, marginTop: 2 },
});
