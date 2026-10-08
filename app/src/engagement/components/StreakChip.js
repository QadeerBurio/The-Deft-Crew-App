// app/src/engagement/components/StreakChip.js
// Compact chip: mood face + count. Tap → StreakSheet.
// Matches mockup: 😊 12  (yellowish circle with mood face)

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Dot from './Dot';
import { useStreak } from '../hooks/useStreak';
import { STREAK_HEALTH_TO_MOOD } from '../utils/mood';
import { pop } from '../utils/haptics';

import { color as T, font as F } from "../../theme/tokens";
const DARK = T.ink;
const WHITE = T.white;
const GOLD = T.yellow;

export default function StreakChip({ onPress }) {
  const { count, health, enabled } = useStreak();

  // Per mockup, show the chip even when count is 0 (as 😊 0)
  // But if soloStreak flag is off, hide entirely.
  if (!enabled) return null;

  const mood = STREAK_HEALTH_TO_MOOD[health] || 'sorted';

  return (
    <TouchableOpacity
      style={styles.chip}
      activeOpacity={0.85}
      onPress={() => {
        pop();
        if (onPress) onPress();
      }}
    >
      <Dot mood={mood} size={18} animated={false} />
      <Text style={styles.count}>{count}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: T.line,
    gap: 6,
    // subtle shadow
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  count: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: DARK,
    minWidth: 14,
    textAlign: 'center',
  },
});