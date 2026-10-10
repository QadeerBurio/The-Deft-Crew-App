// app/src/ui/Chip.js
// Height 34, radius 17. Off: white + line. On: ink + white text.
import React from "react";
import { Text, Pressable, StyleSheet, View } from "react-native";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";

export default function Chip({ label, selected = false, onPress, icon, style, textStyle, dark = false, count }) {
  const on = selected;
  const bg = on ? (dark ? color.yellow : color.ink) : dark ? "transparent" : color.card;
  const fg = on ? (dark ? color.ink : color.white) : dark ? color.white : color.ink;
  const border = on ? bg : dark ? color.inkLine : color.line;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      hitSlop={{ top: 5, bottom: 5 }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: bg, borderColor: border },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <View style={styles.inner}>
        {typeof icon === "function" ? icon(fg) : icon}
        <Text style={[styles.text, { color: fg }, textStyle]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {label}
        </Text>
        {count != null && count !== "" ? (
          <Text style={[styles.count, { color: fg }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {count}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    borderWidth: 1,
    justifyContent: "center",
  },
  inner: { flexDirection: "row", alignItems: "center", gap: 6 },
  text: { fontFamily: font.bodySemi, fontSize: 13 },
  count: { fontFamily: font.bodyBold, fontSize: 12, opacity: 0.8 },
});
