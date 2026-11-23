// app/src/crew/SquadCard.js
// Plan P2-7 (flag squadMission): "bring your squad": 3 friends who join with your code and verify their email this
// week. The numbers are the server's (GET /crew/squad); nothing shows until it answers, and nothing with the flag off.
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "../ui/Card";
import useFlag from "../hooks/useFlag";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { getSquad, endsIn, SQUAD_FLAG } from "./crew";

export function squadLine(sq) {
  if (!sq) return null;
  if (sq.rewarded) return `squad done this week. +${sq.rewardPoints} pts are yours.`;
  const left = Math.max(0, sq.target - sq.verified);
  return `${left} more ${left === 1 ? "friend" : "friends"} this week: +${sq.rewardPoints} pts.`;
}

export default function SquadCard({ style }) {
  const on = useFlag(SQUAD_FLAG) === true;
  const [sq, setSq] = useState(null);
  useEffect(() => {
    if (!on) return undefined;
    let live = true;
    getSquad().then((r) => live && setSq(r)).catch(() => {});
    return () => { live = false; };
  }, [on]);
  if (!on || !sq || !(sq.target > 0)) return null;
  const done = Math.min(sq.verified, sq.target);
  const ends = endsIn(sq.endsAt);
  return (
    <Card style={style} accessibilityLabel={`bring your squad: ${done} of ${sq.target} friends this week`}>
      <Text style={s.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>bring your squad<Text style={{ color: T.yellow }}>.</Text></Text>
      <View style={s.bar}>
        {Array.from({ length: sq.target }, (_, i) => (
          <View key={i} style={[s.seg, i < done && s.segOn]} />
        ))}
      </View>
      <Text style={s.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>{squadLine(sq)}</Text>
      <Text style={s.small} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`${done} of ${sq.target} verified${ends ? ` · ${ends}` : ""}`}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: F.bodyBold, fontSize: 16, color: T.ink, marginBottom: 10 },
  bar: { flexDirection: "row", gap: 6, marginBottom: 10 },
  seg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: T.sand },
  segOn: { backgroundColor: T.yellow },
  line: { fontFamily: F.bodySemi, fontSize: 14, color: T.ink },
  small: { fontFamily: F.body, fontSize: 12, color: T.textFaint, marginTop: 4 },
});
