// app/src/ui/FlatGradient.js
// Design system: no gradient decoration. Drop-in for expo-linear-gradient's
// <LinearGradient colors={[...]} style={...}> that draws ONE flat token colour,
// picked from the first stop. Image scrims (transparent → dark) become a soft
// flat scrim so text over photos stays readable.
import React from "react";
import { View } from "react-native";
import { color as T } from "../theme/tokens";

const norm = (c) => String(c || "").trim().toLowerCase().replace(/\s+/g, "");

const YELLOWS = ["#f9c349", "#ffd700", "#f5a623", "#e0a82e", "#e8b82a", "#f7971e", "#fbbf24", "#fde68a", "#ffc107", "#f9a825"];
const DARKS = ["#000", "#000000", "#111", "#111111", "#1a1a1a", "#0f0f0f", "#0a0a0a", "#222", "#222222", "#2d2d2d", "#333", "#333333", "#1c1c1e", "#121212", "#18181b"];
const WHITES = ["#fff", "#ffffff", "#fafafa", "#f8f9fa", "#f8f8f8", "#fdfdfd", "#fefefe"];
const GREYS = ["#f0f0f0", "#eee", "#eeeeee", "#e0e0e0", "#e8e8e8", "#f5f5f5", "#f3f4f6", "#e5e7eb", "#ccc", "#cccccc", "#ddd"];
const GREENS = ["#10b981", "#059669", "#4caf50", "#22c55e", "#28a745", "#2ecc71", "#16a34a"];
const REDS = ["#ef4444", "#dc2626", "#ff3b30", "#e74c3c", "#f44336", "#d32f2f", "#ff6b6b"];

export function flatColor(stops) {
  const list = Array.isArray(stops) ? stops : [stops];
  const first = norm(list[0]);
  const last = norm(list[list.length - 1]);
  if (!first || first === "transparent" || /rgba\(.*,0\)$/.test(first)) {
    // scrim over an image: transparent → dark
    if (/^rgba\((0|17|26|10),(0|17|26|10),(0|17|26|10),/.test(last) || DARKS.includes(last)) {
      return "rgba(17,17,17,0.35)";
    }
    return "transparent";
  }
  const hex = first.slice(0, 7);
  if (YELLOWS.some((y) => first.startsWith(y))) return first.length > 7 && first.startsWith("#") ? T.yellowSoft : T.yellow;
  if (first.startsWith("rgba(249,195,73") || first.startsWith("rgba(255,215,0")) return T.yellow;
  if (DARKS.includes(first) || DARKS.includes(hex)) return T.ink;
  if (WHITES.includes(first)) return T.card;
  if (GREYS.includes(first)) return T.sand;
  if (GREENS.includes(first) || first.startsWith("rgba(16,185,129")) return T.success;
  if (REDS.includes(first)) return T.danger;
  if (first.startsWith("rgba(255,255,255")) return "rgba(255,255,255,0.12)";
  if (first.startsWith("rgba(0,0,0")) return "rgba(17,17,17,0.35)";
  return list[0];
}

export function LinearGradient({ colors, style, children, pointerEvents, ...rest }) {
  return (
    <View
      style={[{ backgroundColor: flatColor(colors) }, style]}
      pointerEvents={pointerEvents}
      {...(rest.accessibilityLabel ? { accessibilityLabel: rest.accessibilityLabel } : null)}
    >
      {children}
    </View>
  );
}

export default LinearGradient;
