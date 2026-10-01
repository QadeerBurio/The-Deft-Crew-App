// app/src/engagement/components/MissionProgressRow.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const GOLD = '#f9c349';
const MUTED = '#888';
const EMPTY = '#e5e5e5';

export default function MissionProgressRow({ sortedCount = 0, total = 8 }) {
  return (
    <View style={styles.row}>
      <View style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i < sortedCount ? GOLD : EMPTY },
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        {sortedCount}/{total} sorted
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.3,
  },
});