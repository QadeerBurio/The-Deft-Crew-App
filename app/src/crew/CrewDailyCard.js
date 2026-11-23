// app/src/crew/CrewDailyCard.js
// Plan P2-7 (flag ambassadorV2): an approved ambassador's card on Home: one of their live brand campaigns to share
// today. Only a real campaign shows (the server returns no card otherwise); nothing for everyone else.
import React, { useContext, useEffect, useState } from "react";
import { View, Text, Share, StyleSheet } from "react-native";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { AuthContext } from "../context/AuthContext";
import useFlag from "../hooks/useFlag";
import { FLAGS } from "../api/upgradeFlags";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { getDailyCard, endsIn } from "./crew";

export function shareText(card) {
  const base = `${card.followerPercent}% off at ${card.brand} for tdc students.`;
  return card.code ? `${base} join tdc with my code ${card.code}.` : base;
}

export default function CrewDailyCard({ style }) {
  const { token, isGuest } = useContext(AuthContext) || {};
  const on = useFlag(FLAGS.ambassadorV2) === true;
  const signedIn = !!token && !isGuest;
  const [card, setCard] = useState(null);
  useEffect(() => {
    if (!on || !signedIn) { setCard(null); return undefined; }
    let live = true;
    getDailyCard().then((c) => live && setCard(c)).catch(() => {});
    return () => { live = false; };
  }, [on, signedIn]);
  if (!on || !signedIn || !card) return null;
  const ends = endsIn(card.endsAt);
  return (
    <Card style={[s.card, style]}>
      <Text style={s.kicker} maxFontSizeMultiplier={MAX_FONT_SCALE}>ambassador · today</Text>
      <Text style={s.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>{card.line}</Text>
      {!!ends && <Text style={s.meta} maxFontSizeMultiplier={MAX_FONT_SCALE}>{ends}</Text>}
      <View style={{ marginTop: 10 }}>
        <Button title="share" variant="accent" size="small" full={false} onPress={() => Share.share({ message: shareText(card) }).catch(() => {})} accessibilityLabel={`share ${card.brand}'s offer`} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12 },
  kicker: { fontFamily: F.bodyBold, fontSize: 12, color: T.textFaint, marginBottom: 4 },
  line: { fontFamily: F.bodySemi, fontSize: 15, color: T.ink, lineHeight: 21 },
  meta: { fontFamily: F.body, fontSize: 12, color: T.textFaint, marginTop: 4 },
});
