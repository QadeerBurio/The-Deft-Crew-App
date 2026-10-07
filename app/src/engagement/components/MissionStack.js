// app/src/engagement/components/MissionStack.js
// Home section: one MissionCard + MissionProgressRow. Swipe-away = snooze.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import MissionCard from './MissionCard';
import MissionProgressRow from './MissionProgressRow';
import { useMissions } from '../hooks/useMissions';
import { useEngagement } from '../hooks/useEngagement';
import engagementApi from '../api/engagementApi';

export default function MissionStack({ onSnooze }) {
  const { missions, sortedCount, total, isLoading } = useMissions();
  const { refresh } = useEngagement();

  const next = missions.next;
  const card = missions.cards.find((c) => c.feature === next);

  const handleSnooze = async () => {
    if (!next) return;
    try {
      await engagementApi.snoozeMission(next);
      await refresh();
      if (onSnooze) onSnooze(next);
    } catch (e) {
      console.log('[MissionStack] snooze error:', e?.message);
    }
  };

  // First load: same-size placeholder so the home screen doesn't jump
  if (isLoading && !card) {
    return (
      <View style={styles.wrap}>
        <View style={styles.placeholder}>
          <View style={[styles.phBlock, { width: 44, height: 44, borderRadius: 14 }]} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={[styles.phBlock, { width: '50%', height: 10 }]} />
            <View style={[styles.phBlock, { width: '85%', height: 14, marginTop: 10 }]} />
            <View style={[styles.phBlock, { width: 80, height: 28, marginTop: 12, borderRadius: 14 }]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {card && (
        <MissionCard
          feature={card.feature}
          mood={card.mood}
          line={card.lineBefore}
          ctaLabel="start"
          ctaRoute={card.route}
          ctaParams={card.params}
          sorted={false}
          onSnooze={handleSnooze}
        />
      )}
      <MissionProgressRow sortedCount={sortedCount} total={total} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    marginBottom: 4,
  },
  placeholder: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#efefef',
    padding: 18,
    minHeight: 120,
  },
  phBlock: { backgroundColor: '#f1f1f1', borderRadius: 8 },
});