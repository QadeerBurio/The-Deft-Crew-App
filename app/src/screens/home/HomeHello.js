// app/src/screens/home/HomeHello.js
// Greeting + name + streak, then the time-of-day headline.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, font, MAX_FONT_SCALE } from "../../theme/tokens";

// 05:00–11:59 morning · 12:00–19:59 day · 20:00–04:59 night (device clock)
function copyFor(hour, name) {
  if (hour >= 5 && hour < 12) {
    return { greeting: name ? `morning, ${name}` : "hey there", headline: "first class or first coffee" };
  }
  if (hour >= 12 && hour < 20) {
    return { greeting: name ? `hey ${name}` : "hey there", headline: "what are we sorting today" };
  }
  return { greeting: name ? `still up, ${name}` : "hey there", headline: "so is the crew" };
}

export default function HomeHello({ name, streakCount = 0, showStreak = false, onStreakPress }) {
  const { greeting, headline } = copyFor(new Date().getHours(), name);
  const streakVisible = showStreak && streakCount > 0;
  const streakText = `${streakCount}-day streak`;

  return (
    <View style={styles.wrap}>
      <View style={styles.line1}>
        <Text style={styles.greeting} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {greeting}
        </Text>
        {streakVisible && (
          <>
            <View style={styles.sep} />
            <Pressable
              onPress={onStreakPress}
              accessibilityRole="button"
              accessibilityLabel={`${streakText}, open streak`}
              hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
              style={styles.streak}
            >
              <Ionicons name="flame" size={13} color={color.yellow} />
              <Text style={styles.streakText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {streakText}
              </Text>
            </Pressable>
          </>
        )}
      </View>
      <Text style={styles.headline} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {headline}
        <Text style={styles.q}>?</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 18, paddingHorizontal: 20 },
  line1: { flexDirection: "row", alignItems: "center", gap: 8 },
  greeting: { fontFamily: font.body, fontSize: 14, color: color.textMuted, flexShrink: 1 },
  sep: { width: 3, height: 3, borderRadius: 2, backgroundColor: color.textFaint },
  streak: { flexDirection: "row", alignItems: "center", gap: 4 },
  streakText: { fontFamily: font.bodySemi, fontSize: 14, color: color.ink },
  headline: {
    marginTop: 2,
    fontFamily: font.heading,
    fontSize: 26,
    lineHeight: 29,
    letterSpacing: -0.7,
    color: color.ink,
  },
  q: { color: color.yellow },
});
