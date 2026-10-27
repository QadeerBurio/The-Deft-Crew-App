// app/src/screens/home/HomeStreakReminder.js
// A reminder under the greeting, matching the evening pushes:
//   at_risk (from 20:00 PKT, nothing done today) → "your N-day streak ends at midnight"
//   broken  (the day after it ended)             → "your streak ended. start a new one today"
// The server decides the state (useStreak().health). Dismissing hides it until tomorrow.
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { color, font, radius, MAX_FONT_SCALE } from "../../theme/tokens";

const KEY = "tdc_streak_reminder_dismissed";
const todayKey = () => new Date().toISOString().slice(0, 10);

export default function HomeStreakReminder({ health, count = 0, onPress }) {
  const [dismissed, setDismissed] = useState(null); // "<health>:<day>" the user closed

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(setDismissed).catch(() => {});
  }, []);

  const show = health === "at_risk" || health === "broken";
  const stamp = `${health}:${todayKey()}`;
  if (!show || dismissed === stamp) return null;

  const atRisk = health === "at_risk";
  // a 1-day streak reads "your streak", like the push; 2 and up name the length
  const title = atRisk ? (count > 1 ? `your ${count}-day streak ends at midnight` : "your streak ends at midnight") : "your streak ended";
  const sub = atRisk ? "do one thing today to keep it: save a job, react to the drop, post." : "start a new one today. one action is all it takes.";

  const dismiss = () => {
    setDismissed(stamp);
    AsyncStorage.setItem(KEY, stamp).catch(() => {});
  };

  return (
    <View style={[styles.card, atRisk ? styles.risk : styles.broken]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${sub} open streak`}
        style={styles.body}
      >
        <View style={[styles.icon, atRisk ? styles.iconRisk : styles.iconBroken]}>
          <Ionicons name={atRisk ? "flame" : "refresh"} size={18} color={atRisk ? color.ink : color.textMuted} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
          <Text style={styles.sub} maxFontSizeMultiplier={MAX_FONT_SCALE}>{sub}</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="dismiss until tomorrow"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.close}
      >
        <Ionicons name="close" size={16} color={color.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  risk: { backgroundColor: color.yellowSoft },
  broken: { backgroundColor: color.sand },
  body: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  iconRisk: { backgroundColor: color.yellow },
  iconBroken: { backgroundColor: color.card },
  text: { flex: 1 },
  title: { fontFamily: font.bodyBold, fontSize: 15, color: color.ink },
  sub: { marginTop: 2, fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.textMuted },
  close: { padding: 6 },
});
