// app/src/components/Privacy.js — Privacy Center (drawer). Wording unchanged; design system layout.
import React from "react";
import { Linking, TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DocScreen, DocHero, DocSection, DocCard, DocFooter } from "../ui/DocPage";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";

export const PRIVACY_URL = "https://gettdc.pk/privacy";

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
    icon: "chart-line",
    title: "Ad measurement",
    content: "We share some app activity with Meta to measure our ads: the install (counted when the app first connects), app opens, sign-up, finishing the app tour, offer claims, discounts redeemed, job applications, AI resumes, event registrations, scholarship applications, new posts, new confessions, likes and comments, AI chat use, travel assistant use, new skillshare listings and new skillshare offers. Only that it happened (and, for some, which offer, job, scholarship or listing), never what you wrote, and without anything that identifies you. On Android we also share your device's advertising ID unless you turn off \"ads with your details\"; on iPhone only if you allow it and Apple's tracking prompt. Your email and phone (sent hashed) are shared only if you allow \"ads with your details\". Turn either off any time in Settings → Privacy.",
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
  // the full policy (the store listings use the same page)
  const openPolicy = () => Linking.openURL(PRIVACY_URL);

  return (
    <DocScreen title="Privacy Center">
      <DocHero kicker="TRUST & SAFETY" title="Your Privacy Matters" line="Your data is encrypted and stays private." />

      <DocSection title="Data Handling" />
      {privacyPoints.map((p) => (
        <DocCard key={p.title} icon={p.icon} title={p.title} body={p.content} />
      ))}

      {/* the full privacy policy on the website */}
      <TouchableOpacity
        style={s.contact}
        onPress={openPolicy}
        activeOpacity={0.85}
        accessibilityRole="link"
        accessibilityLabel="Full privacy policy, opens gettdc.pk/privacy"
      >
        <View style={s.contactIcon}>
          <Ionicons name="document-text-outline" size={20} color={T.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.contactTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>Full privacy policy</Text>
          <Text style={s.contactText} maxFontSizeMultiplier={MAX_FONT_SCALE}>gettdc.pk/privacy</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={T.yellow} />
      </TouchableOpacity>

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
