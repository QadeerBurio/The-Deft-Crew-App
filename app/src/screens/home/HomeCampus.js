// app/src/screens/home/HomeCampus.js
// "on campus." — the latest confession (read-only stats) + a link to the feed.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SectionTitle from "./SectionTitle";
import PressScale from "./PressScale";
import { relativeTime } from "./homeData";
import { color, font, radius, MAX_FONT_SCALE } from "../../theme/tokens";

export default function HomeCampus({ confession, onOpenPost, onOpenFeed }) {
  if (!confession) return null;
  const { text, likes, comments, createdAt } = confession;
  const when = relativeTime(createdAt);
  const showStats = likes > 0 || comments > 0;

  return (
    <View style={styles.section}>
      <SectionTitle title="on campus" right="open feed" onRightPress={onOpenFeed} rightLabel="open confessions feed" />

      <View style={styles.card}>
        <PressScale
          onPress={onOpenPost}
          accessibilityLabel="open latest confession"
          style={styles.body}
        >
          <View style={styles.labelRow}>
            <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              latest confession · anonymous
            </Text>
            {!!when && (
              <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {when}
              </Text>
            )}
          </View>
          <Text style={styles.text} numberOfLines={4}>
            {text}
          </Text>
          {showStats && (
            <View style={styles.stats}>
              {likes > 0 && (
                <View style={styles.pill} accessibilityLabel={`${likes} likes`}>
                  <Ionicons name="heart" size={12} color={color.ink} />
                  <Text style={styles.pillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {likes}
                  </Text>
                </View>
              )}
              {comments > 0 && (
                <View style={styles.pill}>
                  <Text style={styles.pillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {comments} {comments === 1 ? "comment" : "comments"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </PressScale>

        <Pressable
          onPress={onOpenFeed}
          accessibilityRole="button"
          accessibilityLabel="see what campus is saying"
          style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
        >
          <Text style={styles.footerText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            see what campus is saying
          </Text>
          <Ionicons name="chevron-forward" size={16} color={color.textFaint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 24, paddingHorizontal: 16 },
  card: {
    marginTop: 12,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  body: { padding: 16 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  label: { fontFamily: font.bodySemi, fontSize: 12, color: color.textMuted, flexShrink: 1 },
  text: { marginTop: 6, fontFamily: font.bodySemi, fontSize: 16, lineHeight: 22.4, color: color.ink },
  stats: { flexDirection: "row", gap: 6, marginTop: 12 },
  pill: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pillText: { fontFamily: font.bodySemi, fontSize: 12.5, color: color.ink },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
  },
  footerPressed: { backgroundColor: color.paper },
  footerText: { fontFamily: font.bodyBold, fontSize: 13.5, color: color.ink, flexShrink: 1 },
});
