// app/src/engagement/components/BadgeShelf.js
// Row of up to N badge dots. Used on Profile + Card.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Dot from './Dot';
import engagementApi from '../api/engagementApi';
import { useEngagement } from '../hooks/useEngagement';

import { color as T, font as F } from "../../theme/tokens";
const MUTED = T.textFaint;

export default function BadgeShelf({ max = 6, compact = false, onSeeAll }) {
  const { flags } = useEngagement();
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    if (!flags?.badges) return;
    let cancelled = false;
    engagementApi
      .getBadges()
      .then((list) => {
        if (!cancelled) setBadges(list.filter((b) => b.earnedAt));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [flags?.badges]);

  if (!flags?.badges) return null;
  if (badges.length === 0) return null;

  return (
    <View style={styles.row}>
      {badges.slice(0, max).map((b) => (
        <View key={b.id} style={{ marginRight: compact ? 4 : 6 }}>
          <Dot mood={b.mood} size={compact ? 18 : 24} animated={false} />
        </View>
      ))}
      {badges.length > max && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.more}>+{badges.length - max}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  more: {
    fontSize: 12,
    fontFamily: F.bodyBold,
    color: MUTED,
    marginLeft: 4,
  },
});