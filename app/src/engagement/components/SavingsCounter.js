// app/src/engagement/components/SavingsCounter.js
// "You've saved Rs X on tdc." + share button.
// Mood face on the left, two-line message in the middle, share icon on the right.

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Dot from './Dot';
import { useEngagement } from '../hooks/useEngagement';
import { colors } from '../../theme';

const GOLD = colors.yellow;
const GOLD_DARK = '#e0a82e';
const DARK = '#1a1a1a';
const MUTED = '#888';
const WHITE = '#ffffff';

export default function SavingsCounter({ onShare, compact = false }) {
  const { me, flags } = useEngagement();

  // Entrance animation
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!flags?.savingsCounter) return null;

  const total = me?.stats?.totalSaved || 0;
  if (total <= 0) return null;

  const formatted = `Rs ${Math.round(total).toLocaleString()}`;

  // ── Compact variant (used on Profile modal or inline) ─────────────────
  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactWrap,
          { opacity: fade, transform: [{ translateY: slide }] },
        ]}
      >
        <Text style={styles.compactText}>
          you've saved{' '}
          <Text style={styles.compactHighlight}>
            {formatted}
          </Text>{' '}
          on tdc<Text style={styles.compactDot}>.</Text>
        </Text>
      </Animated.View>
    );
  }

  // ── Full variant (matches the mockup) ────────────────────────────────
  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fade, transform: [{ translateY: slide }] },
      ]}
    >
      {/* Mood face */}
      <View style={styles.dotWrap}>
        <Dot mood="cheeky" size={40} animated={false} />
      </View>

      {/* Text block */}
      <View style={styles.textCol}>
        <Text style={styles.label}>You've saved</Text>
        <Text style={styles.amountRow} numberOfLines={1}>
          <Text style={styles.amount}>{formatted}</Text>
          <Text style={styles.suffix}> on tdc</Text>
          <Text style={styles.amountDot}>.</Text>
        </Text>
      </View>

      {/* Share button */}
      {onShare && (
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={onShare}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="share-outline" size={14} color={DARK} />
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // ── Full card ────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbee',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: GOLD + '55',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12,

    // subtle lift
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },

  dotWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textCol: {
    flex: 1,
    justifyContent: 'center',
  },

  label: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 1,
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  amount: {
    fontSize: 16,
    fontWeight: '900',
    color: DARK,
    letterSpacing: -0.3,
  },

  suffix: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK,
    letterSpacing: -0.2,
  },

  amountDot: {
    fontSize: 13,
    fontWeight: '900',
    color: GOLD_DARK,
  },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: GOLD + '60',
  },

  shareText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: DARK,
    letterSpacing: 0.1,
  },

  // ── Compact variant ──────────────────────────────────────────────────
  compactWrap: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  compactText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    lineHeight: 18,
  },
  compactHighlight: {
    fontWeight: '900',
    color: DARK,
  },
  compactDot: {
    color: GOLD,
    fontWeight: '900',
  },
});