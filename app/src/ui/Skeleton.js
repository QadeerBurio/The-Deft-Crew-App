// app/src/ui/Skeleton.js
// Sand blocks shaped like the content. No spinners for page loads.
import React from "react";
import { View, StyleSheet } from "react-native";
import { color, radius as R } from "../theme/tokens";

export function SkeletonBlock({ width = "100%", height = 14, radius = 8, style }) {
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: color.sand }, style]} />;
}

// A generic list of card-shaped placeholders
export default function Skeleton({ rows = 3, height = 88, gap = 12, style }) {
  return (
    <View style={[styles.wrap, { gap }, style]} accessibilityLabel="loading" accessible>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.card, { height }]}>
          <SkeletonBlock width={44} height={44} radius={22} />
          <View style={styles.lines}>
            <SkeletonBlock width="60%" height={14} />
            <SkeletonBlock width="40%" height={12} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },
  card: {
    borderRadius: R.cardSmall,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.card,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lines: { flex: 1 },
});
