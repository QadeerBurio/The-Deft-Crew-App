// app/src/screens/home/SectionTitle.js
// "title." on the left, optional muted link/text on the right.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { color, font, MAX_FONT_SCALE } from "../../theme/tokens";

export default function SectionTitle({ title, right, onRightPress, rightLabel, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
        {title}
        <Text style={styles.dot}>.</Text>
      </Text>
      {!!right &&
        (onRightPress ? (
          <Pressable
            onPress={onRightPress}
            accessibilityRole="button"
            accessibilityLabel={rightLabel || right}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
            style={styles.rightWrap}
          >
            <Text style={styles.right} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {right}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.rightWrap}>
            <Text style={styles.right} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {right}
            </Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 4,
    gap: 12,
  },
  title: { fontFamily: font.heading, fontSize: 19, color: color.ink, flexShrink: 1 },
  dot: { color: color.yellow },
  rightWrap: { flexShrink: 1 },
  right: { fontFamily: font.bodySemi, fontSize: 13, color: color.textMuted },
});
