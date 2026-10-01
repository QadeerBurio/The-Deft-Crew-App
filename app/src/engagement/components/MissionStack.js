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
  const { missions, sortedCount, total } = useMissions();
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
});