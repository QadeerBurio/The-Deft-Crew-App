// SurpriseBoxCard.js: "Surprise Boxes near you" in the Discounts area (Brands screen), whenever FLAG_SURPLUS_BOXES
// is on for the student. Shows how many boxes are on sale and the soonest pickup in the student's own city (profile
// location; every city when none is set), or "no boxes in <city> today" with "all cities"; opens the SurpriseBoxes
// screen. Flag off: nothing, so the screen is unchanged.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { surplusEnabled, surplusApi, pkTime } from "../api/surplusApi";
import useFlag from "../hooks/useFlag";

export default function SurpriseBoxCard({ onOpen, onOpenAll, refreshKey }) {
  const on = useFlag("surplusBoxes", surplusEnabled);
  const [state, setState] = useState(null); // null: loading; { count, next, city }
  useEffect(() => {
    if (on !== true) { setState(null); return undefined; }
    let live = true;
    (async () => {
      try {
        const d = await surplusApi.listings({ scope: "city" }); // the student's own city (from their profile)
        const open = (d?.listings || []).filter((l) => l.available);
        if (live) setState({ count: open.length, next: open.map((l) => l.pickupStart).sort()[0] || null, city: d?.city || null });
      } catch (e) {
        console.warn("[surprise boxes] listings not loaded:", e?.message);
        if (live) setState({ count: 0, next: null, city: null });
      }
    })();
    return () => { live = false; };
  }, [on, refreshKey]);
  if (on !== true) return null;
  const where = state?.city ? `in ${state.city}` : "near you";
  const sub = !state ? "looking for boxes…" : state.count ? `${state.count} on sale · next pickup ${pkTime(state.next)}` : `no boxes ${where} today`;
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.main} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`surprise boxes near you. ${sub}`}>
        <View style={styles.icon}><Ionicons name="gift-outline" size={22} color={T.ink} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>surprise boxes near you</Text>
          <Text style={styles.sub} maxFontSizeMultiplier={MAX_FONT_SCALE}>{sub}</Text>
          <Text style={styles.note} maxFontSizeMultiplier={MAX_FONT_SCALE}>today's surplus food, pick up and pay at the brand</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={T.ink} />
      </TouchableOpacity>
      {state && !state.count && state.city && (
        <TouchableOpacity style={styles.all} onPress={onOpenAll || onOpen} accessibilityRole="button" accessibilityLabel="see surprise boxes in all cities">
          <Text style={styles.allText} maxFontSizeMultiplier={MAX_FONT_SCALE}>all cities</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 20, backgroundColor: T.yellowSoft, borderWidth: 1, borderColor: T.line, marginBottom: 14 },
  main: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64 },
  all: { alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: T.ink, justifyContent: "center", marginTop: 8, marginLeft: 54 },
  allText: { fontFamily: F.bodyBold, fontSize: 13, color: T.white },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.yellow, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  sub: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink, marginTop: 2 },
  note: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: 2 },
});
