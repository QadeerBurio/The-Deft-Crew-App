// app/src/components/ContactUs.js — help & support. Same contacts and links; design system layout.
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { DocScreen, DocHero, DocSection, DocFooter } from "../ui/DocPage";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";

const SOCIAL = [
  { icon: "facebook-f", label: "facebook", url: "https://www.facebook.com/share/1CijYDto1b/" },
  { icon: "instagram", label: "instagram", url: "https://www.instagram.com/thedeftcrew?igsh=MWRnc3RnZ3hkN2s0Yw==" },
  { icon: "linkedin-in", label: "linkedin", url: "https://www.linkedin.com/company/thedeftcrew/" },
  { icon: "globe", label: "website", url: "https://thedeftcrew.com" },
];

export default function ContactUs() {
  const openDial = () => Linking.openURL("tel:+923222969595");
  const openEmail = () => Linking.openURL("mailto:hello@thedeftcrew.com");
  const openWhatsApp = () => Linking.openURL("https://wa.me/923222969595");
  const openSocial = (url) => Linking.openURL(url);

  const contacts = [
    { icon: <Ionicons name="call-outline" size={20} color={T.ink} />, label: "Customer Care", value: "+92 322 2969595", onPress: openDial },
    { icon: <MaterialCommunityIcons name="email-outline" size={20} color={T.ink} />, label: "Official Email", value: "hello@thedeftcrew.com", onPress: openEmail },
    { icon: <FontAwesome5 name="whatsapp" size={20} color={T.ink} />, label: "WhatsApp Support", value: "+92 322 2969595", onPress: openWhatsApp },
  ];

  return (
    <DocScreen title="help & support">
      <DocHero title="get in touch" line="Our team at tdc is ready to assist you with any student offer queries." />

      <DocSection title="contact methods" />
      <View style={s.list}>
        {contacts.map((c, i) => (
          <TouchableOpacity
            key={c.label}
            style={[s.row, i > 0 && s.rowLine]}
            onPress={c.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${c.label}, ${c.value}`}
          >
            <View style={s.icon}>{c.icon}</View>
            <View style={{ flex: 1 }}>
              <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>{c.label}</Text>
              <Text style={s.value} maxFontSizeMultiplier={MAX_FONT_SCALE}>{c.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={T.textFaint} />
          </TouchableOpacity>
        ))}
      </View>

      <DocSection title="connect with us" />
      <View style={s.socialRow}>
        {SOCIAL.map((x) => (
          <TouchableOpacity
            key={x.icon}
            style={s.social}
            onPress={() => openSocial(x.url)}
            activeOpacity={0.8}
            accessibilityRole="link"
            accessibilityLabel={x.label}
          >
            <FontAwesome5 name={x.icon} size={20} color={T.ink} />
          </TouchableOpacity>
        ))}
      </View>

      <DocFooter lines={["building a stronger student economy.", "© 2026 tdc Privilege Program"]} />
    </DocScreen>
  );
}

const s = StyleSheet.create({
  list: { borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
  rowLine: { borderTopWidth: 1, borderTopColor: T.lineSoft },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: T.yellowSoft, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.textMuted },
  value: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink, marginTop: 1 },
  socialRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  social: { flex: 1, height: 56, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, alignItems: "center", justifyContent: "center" },
});
