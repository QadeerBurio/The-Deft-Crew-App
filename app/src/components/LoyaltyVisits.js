// LoyaltyVisits.js: the student's recent confirmed bills at loyalty brands and whether each counted
// as a visit ("visit credited", "didn't count", "reversed"), in My discounts (FLAG_LOYALTY_V2).
// Renders nothing for guests, outside the pilot, or before the first confirmed bill.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { getMyLoyaltyCredits } from "../api/loyaltyApi";

const STATUS = {
  credited: { label: "visit credited", icon: "checkmark-circle", fg: T.success, bg: T.successBg },
  "not-counted": { label: "didn't count", icon: "remove-circle-outline", fg: T.textMuted, bg: T.sand },
  reversed: { label: "reversed", icon: "arrow-undo-circle-outline", fg: T.danger, bg: T.dangerBg },
};
const day = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

// brandNames: { brandId: name } from the screen's claimed offers; other brands show as "a brand"
export default function LoyaltyVisits({ brandNames = {}, refreshKey, max = 5 }) {
  const [credits, setCredits] = useState([]);
  const load = useCallback(() => {
    let alive = true;
    getMyLoyaltyCredits().then((c) => alive && setCredits(c));
    return () => { alive = false; };
  }, []);
  useEffect(load, [load, refreshKey]);
  useFocusEffect(load);

  if (!credits.length) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
        your loyalty visits<Text style={{ color: T.yellow }}>.</Text>
      </Text>
      {credits.slice(0, max).map((c) => {
        const s = STATUS[c.status] || STATUS["not-counted"];
        const brand = brandNames[c.brand] || "a brand";
        const detail = c.status === "credited" || c.status === "reversed"
          ? `visit ${c.visitNumber}${c.discountPct != null ? ` · ${c.discountPct}% off` : ""}`
          : "one visit a day counts";
        return (
          <View key={c.redemptionId} style={styles.row} accessible accessibilityLabel={`${brand}, ${day(c.at)}: ${s.label}, ${detail}`}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.brand} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{brand.toLowerCase()}</Text>
              <Text style={styles.detail} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{day(c.at)} · {detail}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: s.bg }]}>
              <Ionicons name={s.icon} size={14} color={s.fg} />
              <Text style={[styles.pillText, { color: s.fg }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{s.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginBottom: 14 },
  title: { fontFamily: F.heading, fontSize: 16, color: T.ink, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.lineSoft },
  brand: { fontFamily: F.bodySemi, fontSize: 14, color: T.ink },
  detail: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: 2 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontFamily: F.bodyBold, fontSize: 11.5 },
});
