// LoyaltyCard.js: the student's loyalty with one brand, on the brand's offer screen (FLAG_LOYALTY_V2).
// Verified visits, the discount the next visit gets, how far the next tier is, the tiers and the terms.
// Stamp cards (the brand's "reward" mode): "2 of 5 visits", the stamps, the reward and whether it's waiting.
// Renders nothing for guests, outside the pilot, or when the brand has no program.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { getBrandLoyalty } from "../api/loyaltyApi";

const rule = (t) => (t.maxVisit == null ? `visit ${t.minVisit} onward` : t.minVisit === t.maxVisit ? `visit ${t.minVisit}` : `visits ${t.minVisit}–${t.maxVisit}`);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function LoyaltyCard({ brandId, refreshKey }) {
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    let alive = true;
    getBrandLoyalty(brandId).then((d) => alive && setData(d));
    return () => { alive = false; };
  }, [brandId]);
  useEffect(load, [load, refreshKey]);
  // back from a redemption: the visit count may have changed
  useFocusEffect(load);

  if (!data?.enabled || !data.program) return null;
  if (data.stamps) return <StampCard stamps={data.stamps} program={data.program} />;
  if (!data.progress) return null;
  const { program, progress } = data;
  const { visits, currentTier, nextTier, visitsBeforeNextTier } = progress;
  // progress toward the next tier: visits made out of the visits that unlock it
  const goal = nextTier ? nextTier.minVisit - 1 : visits;
  const filled = nextTier ? Math.min(1, goal > 0 ? visits / goal : 0) : 1;

  return (
    <View style={styles.card} accessible accessibilityLabel={`loyalty: ${plural(visits, "verified visit")}. your next visit gets ${currentTier.discountPct} percent.${nextTier ? ` ${plural(visitsBeforeNextTier, "more visit")}, then ${nextTier.discountPct} percent from visit ${nextTier.minVisit}.` : ""}`}>
      <View style={styles.head}>
        <MaterialCommunityIcons name="star-circle-outline" size={22} color={T.ink} />
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>loyalty<Text style={{ color: T.yellow }}>.</Text></Text>
        <View style={styles.tierPill}>
          <Text style={styles.tierPillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{currentTier.name.toLowerCase()}</Text>
        </View>
      </View>

      <View style={styles.numbers}>
        <View style={styles.numberBox}>
          <Text style={styles.number} maxFontSizeMultiplier={MAX_FONT_SCALE}>{visits}</Text>
          <Text style={styles.numberLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{visits === 1 ? "verified visit" : "verified visits"}</Text>
        </View>
        <View style={styles.numberBox}>
          <Text style={styles.number} maxFontSizeMultiplier={MAX_FONT_SCALE}>{currentTier.discountPct}%</Text>
          <Text style={styles.numberLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>on your next visit</Text>
        </View>
      </View>

      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no">
        <View style={[styles.fill, { width: `${Math.round(filled * 100)}%` }]} />
      </View>
      <Text style={styles.next} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {nextTier
          ? `${plural(visitsBeforeNextTier, "more visit")}, then ${nextTier.discountPct}% from visit ${nextTier.minVisit} (${nextTier.name.toLowerCase()}).`
          : "you're on the top tier."}
      </Text>

      <Text style={styles.tiers} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {program.tiers.map((t) => `${rule(t)}: ${t.discountPct}%`).join("  ·  ")}
      </Text>
      <Text style={styles.terms} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        a visit counts when the brand confirms your bill. claiming or showing your qr doesn't count.
        {program.maxVisitsPerDay ? ` ${plural(program.maxVisitsPerDay, "visit")} a day count${program.maxVisitsPerDay === 1 ? "s" : ""}.` : ""}
        {program.resetMonths ? ` visits count for ${program.resetMonths} months.` : ""}
        {program.terms ? ` ${program.terms}` : ""}
      </Text>
    </View>
  );
}

// reward mode: one stamp per verified visit; a full card earns the reward; the card restarts after it's used
export function stampLine(s) {
  const label = s.reward?.label || "the reward";
  if (s.available) return `your reward is waiting: ${s.available.label}. show your qr on your next visit.`;
  if (s.limitReached) return s.limitReached === "monthly-limit" ? "you've had this month's rewards. stamps start again next month." : "you've had all the rewards this program gives.";
  return `${plural(s.visitsToReward, "more visit")} to ${label}.`;
}
function StampCard({ stamps: s, program }) {
  const n = Math.max(1, Number(s.needed) || 1);
  const have = Math.min(Number(s.stamps) || 0, n);
  return (
    <View style={styles.card} accessible accessibilityLabel={`loyalty stamp card: ${have} of ${n} visits. ${stampLine(s)}`}>
      <View style={styles.head}>
        <MaterialCommunityIcons name="star-circle-outline" size={22} color={T.ink} />
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>loyalty<Text style={{ color: T.yellow }}>.</Text></Text>
        <View style={styles.tierPill}>
          <Text style={styles.tierPillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{s.available ? "reward waiting" : "stamp card"}</Text>
        </View>
      </View>
      <Text style={styles.stampCount} maxFontSizeMultiplier={MAX_FONT_SCALE}>{have} of {n} visits</Text>
      <View style={styles.stamps} accessibilityElementsHidden importantForAccessibility="no">
        {Array.from({ length: n }, (_, i) => <View key={i} style={[styles.stamp, i < have && styles.stampOn]} />)}
      </View>
      <Text style={styles.next} maxFontSizeMultiplier={MAX_FONT_SCALE}>{stampLine(s)}</Text>
      <Text style={styles.terms} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {n} verified visits = {s.reward?.label || "a reward"}. a visit counts when the brand confirms your bill; after you use the reward the card starts again.
        {s.reward?.maxPerMonth ? ` up to ${plural(s.reward.maxPerMonth, "reward")} a month.` : ""}
        {program?.terms ? ` ${program.terms}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stampCount: { fontFamily: F.heading, fontSize: 22, color: T.ink, marginTop: 12 },
  stamps: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  stamp: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: T.yellow },
  stampOn: { backgroundColor: T.yellow },
  card: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: F.heading, fontSize: 18, color: T.ink, flex: 1 },
  tierPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: T.yellowSoft },
  tierPillText: { fontFamily: F.bodyBold, fontSize: 12, color: T.ink },
  numbers: { flexDirection: "row", gap: 8, marginTop: 12 },
  numberBox: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: T.sand },
  number: { fontFamily: F.heading, fontSize: 22, color: T.ink },
  numberLabel: { fontFamily: F.bodyMedium, fontSize: 12, color: T.textMuted, marginTop: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: T.lineSoft, marginTop: 14, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: T.yellow },
  next: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.ink, marginTop: 8 },
  tiers: { fontFamily: F.bodyMedium, fontSize: 12.5, color: T.textMuted, marginTop: 10 },
  terms: { fontFamily: F.body, fontSize: 12, color: T.textFaint, marginTop: 6, lineHeight: 17 },
});
