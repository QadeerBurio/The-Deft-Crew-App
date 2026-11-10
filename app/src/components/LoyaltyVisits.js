// LoyaltyVisits.js: the student's recent confirmed bills at loyalty brands and whether each counted
// as a visit ("visit credited", "didn't count", "reversed"), in My discounts (FLAG_LOYALTY_V2).
// Renders nothing for guests, outside the pilot, or before the first confirmed bill.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { getMyLoyaltyCredits, getBrandLoyalty } from "../api/loyaltyApi";

const STATUS = {
  credited: { label: "visit credited", icon: "checkmark-circle", fg: T.success, bg: T.successBg },
  "not-counted": { label: "didn't count", icon: "remove-circle-outline", fg: T.textMuted, bg: T.sand },
  reversed: { label: "reversed", icon: "arrow-undo-circle-outline", fg: T.danger, bg: T.dangerBg },
};
const day = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

// brandNames: { brandId: name } from the screen's claimed offers; other brands show as "a brand"
export default function LoyaltyVisits({ brandNames = {}, refreshKey, max = 5 }) {
  const [credits, setCredits] = useState([]);
  // stamp cards (reward mode) of the brands in the list: { brandId: stamps }
  const [cards, setCards] = useState({});
  const load = useCallback(() => {
    let alive = true;
    getMyLoyaltyCredits().then(async (c) => {
      if (!alive) return;
      setCredits(c);
      const brands = [...new Set((c || []).slice(0, max).map((x) => x.brand))].slice(0, 5);
      const out = {};
      for (const b of brands) {
        const d = await Promise.resolve().then(() => getBrandLoyalty(b)).catch(() => null);
        if (d?.enabled && d.stamps) out[b] = d.stamps;
      }
      if (alive) setCards(out);
    });
    return () => { alive = false; };
  }, [max]);
  useEffect(load, [load, refreshKey]);
  useFocusEffect(load);

  if (!credits.length) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
        your loyalty visits<Text style={{ color: T.yellow }}>.</Text>
      </Text>
      {Object.entries(cards).map(([b, s]) => (
        <Text key={`stamps-${b}`} style={styles.stampLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {`${brandNames[b] || "a brand"}: ${Math.min(s.stamps, s.needed)} of ${s.needed} stamps${s.available ? ` · reward waiting: ${s.available.label}` : ` · ${s.visitsToReward} to ${s.reward?.label || "the reward"}`}`}
        </Text>
      ))}
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
  stampLine: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink, marginTop: 6 },
  card: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginBottom: 14 },
  title: { fontFamily: F.heading, fontSize: 16, color: T.ink, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.lineSoft },
  brand: { fontFamily: F.bodySemi, fontSize: 14, color: T.ink },
  detail: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: 2 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontFamily: F.bodyBold, fontSize: 11.5 },
});
