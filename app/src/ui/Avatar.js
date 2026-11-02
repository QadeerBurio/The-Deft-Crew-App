// app/src/ui/Avatar.js
// Profile picture with an offline fallback: the person's initials on sand when there is
// no image (or it fails to load). Size and shape come from `style` (width/height/radius).
import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import RemoteImage from "./RemoteImage";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";

const initialsOf = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toLowerCase() || "·";

export default function Avatar({ uri, name, style, imageStyle }) {
  const [failed, setFailed] = useState(false);
  const flat = StyleSheet.flatten(style) || {};
  const size = Number(flat.width) || Number(flat.height) || 40;

  if (uri && !failed) {
    return (
      <RemoteImage
        source={{ uri }}
        size={size <= 56 ? "avatar" : "card"}
        style={[style, imageStyle]}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={[styles.fallback, style]} accessible accessibilityLabel={name ? `${name}` : "profile picture"}>
      <Text style={[styles.initials, { fontSize: Math.max(11, Math.round(size * 0.38)) }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: color.sand, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initials: { fontFamily: font.heading, color: color.ink },
});
