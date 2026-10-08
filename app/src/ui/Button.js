// app/src/ui/Button.js
// primary (ink) · secondary (white + ink border) · accent (yellow, rewards/claim only)
// · ghost (text). size "small" = 36 high. Disabled = sand + faint text.
import React from "react";
import { Text, ActivityIndicator, StyleSheet, View } from "react-native";
import PressScale from "./PressScale";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";

const VARIANTS = {
  primary: { bg: color.ink, fg: color.white, border: color.ink },
  secondary: { bg: color.card, fg: color.ink, border: color.ink },
  accent: { bg: color.yellow, fg: color.ink, border: color.yellow },
  danger: { bg: color.dangerBg, fg: color.danger, border: color.dangerBg },
  ghost: { bg: "transparent", fg: color.ink, border: "transparent" },
  // on dark screens
  light: { bg: color.white, fg: color.ink, border: color.white },
  outlineLight: { bg: "transparent", fg: color.white, border: color.inkLine },
};

export default function Button({
  title,
  children,
  onPress,
  variant = "primary",
  size = "large",
  disabled = false,
  loading = false,
  icon, // React element shown before the label
  style,
  textStyle,
  full = true,
  accessibilityLabel,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const off = disabled && !loading;
  const small = size === "small";
  const bg = off ? color.sand : v.bg;
  const fg = off ? color.textFaint : v.fg;
  const border = off ? color.sand : v.border;
  const label = title ?? children;

  return (
    <PressScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel || (typeof label === "string" ? label : undefined)}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      containerStyle={!full ? { alignSelf: "flex-start" } : null}
      style={[
        styles.base,
        small ? styles.small : styles.large,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === "secondary" && !off ? 1.5 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.inner}>
          {icon}
          {typeof label === "string" ? (
            <Text
              style={[styles.text, small && styles.textSmall, { color: fg }, textStyle]}
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {label}
            </Text>
          ) : (
            label
          )}
        </View>
      )}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  large: { height: 52, borderRadius: 26 },
  small: { height: 36, borderRadius: 18, paddingHorizontal: 14 },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontFamily: font.bodyBold, fontSize: 15 },
  textSmall: { fontSize: 13 },
});
