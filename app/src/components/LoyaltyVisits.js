// LoyaltyVisits.js: "my loyalty" in My discounts (FLAG_LOYALTY_V2): one card per brand the student has visited, with
// the visits ("1 of 2 visits", or the tier visits), "reward ready" / rewards used, and the recent history (visit
// counted, "visit already counted today", reward ready, reward used). Server: GET /api/loyalty/me/cards.
// Refreshes on focus, on pull-to-refresh (refreshKey) and when a redemption or loyalty push arrives.
// With the flag on and no visit yet: the brands running a loyalty program, or "no loyalty programs near you yet".
// Renders nothing for guests or with the flag off.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { getMyLoyaltyCards, activeLoyaltyPrograms, loyaltyEnabled, onLoyaltyChanged } from "../api/loyaltyApi";
import useFlag from "../hooks/useFlag";

const day = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const HISTORY = {
  counted: { label: "visit counted", icon: "checkmark-circle", fg: T.success || T.ink, bg: T.successBg || T.yellowSoft },
  "not-counted": { label: "didn't count", icon: "remove-circle", fg: T.textMuted, bg: T.sand },
  reversed: { label: "visit reversed", icon: "arrow-undo-circle", fg: T.danger, bg: T.dangerBg || T.sand },
  "reward-earned": { label: "reward ready", icon: "gift", fg: T.ink, bg: T.yellowSoft },
  "reward-used": { label: "reward used", icon: "gift-outline", fg: T.ink, bg: T.sand },
};

/** the card's headline: "1 of 2 visits" (stamp card) or "3 visits" (tiers) */
export function cardLine(c) {
  if (c.stamps) {
    const s = c.stamps;
    if (s.available) return `reward ready: ${s.available.label}`;
    return `${Math.min(s.stamps, s.needed)} of ${s.needed} visits`;
  }
  if (c.progress) return `${plural(c.progress.visits, "visit")} · ${c.progress.currentTier?.discountPct ?? 0}% off`;
  return c.active ? "" : "program ended";
}
/** one history row's text */
export function historyLine(h) {
  if (h.kind === "reward-earned") return `reward ready: ${h.label}`;
  if (h.kind === "reward-used") return `reward used: ${h.label}`;
  if (h.status === "not-counted") return h.message || "didn't count";
  return HISTORY[h.status]?.label || "visit";
}

export default function LoyaltyVisits({ refreshKey }) {
  const on = useFlag("loyaltyV2", loyaltyEnabled);
  const [cards, setCards] = useState(null); // null: loading
  const [programs, setPrograms] = useState(null); // null: loading; [] none yet
  const load = useCallback(() => {
    let alive = true;
    getMyLoyaltyCards()
      .then((c) => { if (alive) setCards(c || []); })
      .catch((e) => { console.warn("[loyalty] my cards not loaded:", e?.message); if (alive) setCards((x) => x || []); });
    return () => { alive = false; };
  }, []);
  useEffect(() => (on === true ? load() : undefined), [load, refreshKey, on]);
  useFocusEffect(useCallback(() => (on === true ? load() : undefined), [load, on]));
  // a redemption or a loyalty push: the counts may have changed
  useEffect(() => onLoyaltyChanged(() => { if (on === true) load(); }), [load, on]);
  // nothing earned yet: which brands run a program (or none)
  const none = cards !== null && cards.length === 0;
  useEffect(() => {
    if (on !== true || !none) return undefined;
    let alive = true;
    activeLoyaltyPrograms()
      .then((d) => { if (alive) setPrograms(d?.programs || []); })
      .catch((e) => { console.warn("[loyalty] programs not loaded:", e?.message); if (alive) setPrograms([]); });
    return () => { alive = false; };
  }, [on, none, refreshKey]);

  if (on !== true) return null;
  const title = (
    <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
      my loyalty<Text style={{ color: T.yellow }}>.</Text>
    </Text>
  );
  if (!cards || !cards.length) {
    const names = (programs || []).map((p) => p.brandName).filter(Boolean);
    const line = !cards || programs === null
      ? "loading your loyalty…"
      : names.length
      ? `loyalty at ${names.slice(0, 4).join(", ")}${names.length > 4 ? ` and ${names.length - 4} more` : ""}. claim their offers to earn visits.`
      : "no loyalty programs near you yet.";
    return (
      <View style={styles.card}>
        {title}
        <Text style={styles.emptyLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>{line}</Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      {title}
      {cards.map((c) => {
        const ready = !!c.stamps?.available || c.rewardReady;
        const n = c.stamps ? Math.max(1, Number(c.stamps.needed) || 1) : 0;
        const have = c.stamps ? Math.min(Number(c.stamps.stamps) || 0, n) : 0;
        return (
          <View key={c.brandId} style={styles.brandCard} testID={`loyalty-card-${c.brandId}`}>
            <View style={styles.brandHead} accessible accessibilityLabel={`${c.brandName || "a brand"}: ${cardLine(c)}. ${plural(c.rewardsEarned || 0, "reward")} earned, ${c.rewardsUsed || 0} used`}>
              <Text style={styles.brand} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{(c.brandName || "a brand").toLowerCase()}</Text>
              {ready && (
                <View style={[styles.pill, { backgroundColor: T.yellow }]}>
                  <Ionicons name="gift" size={13} color={T.ink} />
                  <Text style={styles.pillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>reward ready</Text>
                </View>
              )}
            </View>
            <Text style={styles.count} maxFontSizeMultiplier={MAX_FONT_SCALE}>{cardLine(c)}</Text>
            {c.stamps && (
              <View style={styles.stamps} accessibilityElementsHidden importantForAccessibility="no">
                {Array.from({ length: n }, (_, i) => <View key={i} style={[styles.stamp, (i < have || ready) && styles.stampOn]} />)}
              </View>
            )}
            <Text style={styles.detail} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {plural(c.rewardsEarned || 0, "reward")} earned · {c.rewardsUsed || 0} used{c.lastVisitAt ? ` · last visit ${day(c.lastVisitAt)}` : ""}
            </Text>
            {(c.history || []).slice(0, 4).map((h, i) => {
              const s = HISTORY[h.kind === "visit" ? h.status : h.kind] || HISTORY.counted;
              return (
                <View key={`${c.brandId}-${i}`} style={styles.row} accessible accessibilityLabel={`${day(h.at)}: ${historyLine(h)}`}>
                  <Ionicons name={s.icon} size={15} color={s.fg} />
                  <Text style={styles.historyText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{historyLine(h)}</Text>
                  <Text style={styles.historyDay} maxFontSizeMultiplier={MAX_FONT_SCALE}>{day(h.at)}</Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, marginBottom: 14 },
  title: { fontFamily: F.heading, fontSize: 16, color: T.ink, marginBottom: 6 },
  emptyLine: { fontFamily: F.body, fontSize: 14, color: T.textMuted },
  brandCard: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.lineSoft },
  brandHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { flex: 1, fontFamily: F.bodySemi, fontSize: 14.5, color: T.ink },
  count: { fontFamily: F.heading, fontSize: 18, color: T.ink, marginTop: 4 },
  stamps: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  stamp: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: T.yellow },
  stampOn: { backgroundColor: T.yellow },
  detail: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 },
  historyText: { flex: 1, fontFamily: F.body, fontSize: 12.5, color: T.ink },
  historyDay: { fontFamily: F.body, fontSize: 12, color: T.textMuted },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  pillText: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.ink },
});
