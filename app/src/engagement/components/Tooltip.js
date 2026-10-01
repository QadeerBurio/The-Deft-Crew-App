// app/src/engagement/components/Tooltip.js
// One-time tooltip. Requires tooltipId and text.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEngagement } from '../hooks/useEngagement';
import engagementApi from '../api/engagementApi';

const GOLD = '#f9c349';
const DARK = '#1a1a1a';

export default function Tooltip({ id, text, onClose }) {
  const { me, refresh } = useEngagement();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!me) return;
    const seen = me?.tooltipsSeen || [];
    setVisible(!seen.includes(id));
  }, [me, id]);

  if (!visible) return null;

  const onDismiss = async () => {
    setVisible(false);
    try {
      await engagementApi.markTooltipSeen(id);
      await refresh();
    } catch {}
    onClose?.();
  };

  return (
    <View style={styles.wrap}>
      <Ionicons name="information-circle" size={18} color={GOLD} />
      <Text style={styles.text}>{text}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.btn}>
        <Text style={styles.btnText}>got it</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 8,
    gap: 8,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  btn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  btnText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
  },
});