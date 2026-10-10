// app/src/ui/ScreenHeader.js
// Back button (40 circle) + title (Outfit 800, 22) + optional right action. Height 56.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";

export function HeaderIconButton({ icon, onPress, label, dark = false, children, style }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconBtn,
        dark && styles.iconBtnDark,
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {children || <Ionicons name={icon} size={19} color={dark ? color.white : color.ink} />}
    </Pressable>
  );
}

export default function ScreenHeader({
  title,
  onBack,
  showBack = true,
  right,
  dark = false,
  dot = true, // yellow full stop after the title
  style,
}) {
  const navigation = useNavigation();
  const goBack = () => {
    if (onBack) return onBack();
    if (navigation?.canGoBack?.()) navigation.goBack();
  };

  return (
    <View style={[styles.row, style]}>
      {showBack ? (
        <HeaderIconButton icon="chevron-back" onPress={goBack} label="back" dark={dark} />
      ) : null}
      <Text
        style={[styles.title, dark && { color: color.white }, !showBack && { marginLeft: 0 }]}
        numberOfLines={1}
        accessibilityRole="header"
        maxFontSizeMultiplier={MAX_FONT_SCALE}
      >
        {title}
        {dot && !!title && !/[.!?]$/.test(String(title)) ? <Text style={styles.dot}>.</Text> : null}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDark: { backgroundColor: color.inkSoft, borderColor: color.inkLine },
  title: {
    flex: 1,
    fontFamily: font.heading,
    fontSize: 22,
    color: color.ink,
  },
  dot: { color: color.yellow },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
});
