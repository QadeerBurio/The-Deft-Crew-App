// app/src/ui/ListRow.js
// Min 56 high: icon in a 36 sand circle, title DM Sans 600 15, meta 12.5, chevron. lineSoft divider.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";

export default function ListRow({
  icon,
  iconColor,
  iconNode,
  title,
  meta,
  onPress,
  right,
  chevron = true,
  danger = false,
  divider = true,
  style,
  accessibilityLabel,
}) {
  const content = (
    <>
      {(icon || iconNode) && (
        <View style={[styles.iconWrap, danger && { backgroundColor: color.dangerBg }]}>
          {iconNode || <Ionicons name={icon} size={18} color={danger ? color.danger : iconColor || color.ink} />}
        </View>
      )}
      <View style={styles.texts}>
        <Text style={[styles.title, danger && { color: color.danger }]} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {title}
        </Text>
        {!!meta && (
          <Text style={styles.meta} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {meta}
          </Text>
        )}
      </View>
      {right}
      {onPress && chevron && !right ? <Ionicons name="chevron-forward" size={16} color={color.textFaint} /> : null}
    </>
  );

  const rowStyle = [styles.row, divider && styles.divider, style];
  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={({ pressed }) => [rowStyle, pressed && { backgroundColor: color.paper }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: color.lineSoft },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: { flex: 1 },
  title: { fontFamily: font.bodySemi, fontSize: 15, color: color.ink },
  meta: { fontFamily: font.body, fontSize: 12.5, color: color.textMuted, marginTop: 2 },
});
