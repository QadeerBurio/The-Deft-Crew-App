// app/src/screens/Crew/AmbassadorIntro.js
// Plan P2-2 (flag ambassadorV2): what the ambassador programme is, in 4 cards, then "apply". The campus card shows the
// real number of ambassadors at the student's university, "be the first at <uni>" when there are none, and is left
// out when the server can't say. Already applied → the status; approved → the hub.
import React, { useCallback, useContext, useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import Screen from "../../ui/Screen";
import ScreenHeader from "../../ui/ScreenHeader";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { SkeletonBlock } from "../../ui/Skeleton";
import Dot from "../../engagement/components/Dot";
import { AuthContext } from "../../context/AuthContext";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { campusCount, myApplication, campusLine, statusLine, canApply } from "../../crew/crew";

export const INTRO_CARDS = Object.freeze([
  { mood: "hype", title: "what it is", line: "you're tdc on your campus. you help students find the deals, events and jobs that are already here." },
  { mood: "cheeky", title: "what you do", line: "share your code, post campus moments, and bring friends. your friend gets 100 points and you get 150 when they join and verify their email." },
  { mood: "sorted", title: "what you get", line: "a tdc certificate anyone can verify, brand campaigns to share with your campus, and a recommendation letter once you've done the work." },
]);

export default function AmbassadorIntro({ navigation }) {
  const { user } = useContext(AuthContext) || {};
  const [cc, setCc] = useState(undefined); // undefined: loading; null: unknown
  const [st, setSt] = useState(null);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([campusCount().catch(() => null), myApplication().catch(() => null)]);
    setCc(a);
    setSt(b);
  }, []);
  useEffect(() => { load(); }, [load]);

  const campus = campusLine(cc);
  const status = statusLine(st);
  const approved = st?.status === "approved";
  const open = canApply(st);

  return (
    <Screen>
      <ScreenHeader title="tdc ambassadors" />
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.lead} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {user?.name ? `${String(user.name).trim().split(/\s+/)[0].toLowerCase()}, here's the deal.` : "here's the deal."}
        </Text>
        {INTRO_CARDS.map((c) => (
          <Card key={c.title} style={s.card}>
            <View style={s.row}>
              <Dot mood={c.mood} size={28} animated={false} />
              <Text style={s.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{c.title}</Text>
            </View>
            <Text style={s.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>{c.line}</Text>
          </Card>
        ))}
        {cc === undefined ? (
          <SkeletonBlock height={88} radius={22} style={{ marginBottom: 12 }} />
        ) : campus ? (
          <Card style={[s.card, s.campus]} accessibilityLabel={`your campus: ${campus}`}>
            <Text style={s.campusLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>your campus</Text>
            <Text style={s.campusLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>{campus}</Text>
          </Card>
        ) : null}

        {!!status && <Text style={s.status} maxFontSizeMultiplier={MAX_FONT_SCALE}>{status}</Text>}
        {approved ? (
          <Button title="open your hub" onPress={() => navigation.navigate("AmbassadorHub")} />
        ) : open ? (
          <Button title="apply" variant="accent" onPress={() => navigation.navigate("AmbassadorApply")} accessibilityLabel="apply to be an ambassador" />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  lead: { fontFamily: F.heading, fontSize: 22, color: T.ink, marginBottom: 14 },
  card: { marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  title: { fontFamily: F.bodyBold, fontSize: 16, color: T.ink },
  line: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.textMuted },
  campus: { backgroundColor: T.ink, borderColor: T.ink },
  campusLabel: { fontFamily: F.bodyBold, fontSize: 12, color: T.onInkMuted, marginBottom: 4 },
  campusLine: { fontFamily: F.heading, fontSize: 19, color: T.yellow },
  status: { fontFamily: F.bodyMedium, fontSize: 14, color: T.ink, marginVertical: 12, lineHeight: 20 },
});
