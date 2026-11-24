// screens/Resume/ScoreRing.js — the resume score ring, moved unchanged from ResumeDashboard.js (Q-a split-only,
// plan Q-3f).
import React from "react";
import { View, Text } from "react-native";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import Svg, { Circle } from "react-native-svg";

// Score ring (Resume design) — draws a real value only
export const ScoreRing = ({ value, label }) => {
  const size = 84;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={T.inkLine} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={T.yellow}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </Svg>
      <Text style={{ fontFamily: F.heading, fontSize: 24, color: T.white }} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {Math.round(pct)}
      </Text>
      <Text style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: T.onInkMuted, marginTop: -2 }}>{label}</Text>
    </View>
  );
};
