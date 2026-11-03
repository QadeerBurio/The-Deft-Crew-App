// SurpriseBoxCard.js: "Surprise Boxes near you" in the Discounts area (Brands screen), only when
// FLAG_SURPLUS_BOXES is on for the student (GET /app/flags/me). Shows how many boxes are on sale and the
// soonest pickup; opens the SurpriseBoxes screen. Renders nothing otherwise, so the screen is unchanged.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { surplusEnabled, surplusApi, pkTime } from "../api/surplusApi";

export default function SurpriseBoxCard({ onOpen, refreshKey }) {
  const [state, setState] = useState(null); // null: hidden
  useEffect(() => {
    let live = true;
    (async () => {
      if (!(await surplusEnabled())) { if (live) setState(null); return; }
      try {
        const d = await surplusApi.listings();
        const open = (d?.listings || []).filter((l) => l.available);
        if (live) setState({ count: open.length, next: open.map((l) => l.pickupStart).sort()[0] || null });
      } catch {
        if (live) setState({ count: 0, next: null });
      }
    })();
    return () => { live = false; };
  }, [refreshKey]);
  if (!state) return null;
  const sub = state.count ? `${state.count} on sale · next pickup ${pkTime(state.next)}` : "none right now. brands list them later in the day.";
  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`surprise boxes near you. ${sub}`}>
      <View style={styles.icon}><Ionicons name="gift-outline" size={22} color={T.ink} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>surprise boxes near you</Text>
        <Text style={styles.sub} maxFontSizeMultiplier={MAX_FONT_SCALE}>{sub}</Text>
        <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>today's surplus food, pick up and pay at the brand</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={T.ink} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: T.yellowSoft, borderWidth: 1, borderColor: T.line, marginBottom: 14, minHeight: 64 },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.yellow, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  sub: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink, marginTop: 2 },
  note: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: 2 },
});
