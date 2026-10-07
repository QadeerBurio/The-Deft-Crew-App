// app/src/engagement/components/MissionCard.js
// Big card: mood dot + line + gold CTA pill. Tap → route.
// Same compact height · wider · modern premium look.

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Dot from './Dot';
import { pop } from '../utils/haptics';
import { colors as tdcColors } from '../../theme';

const GOLD = tdcColors.yellow;
const GOLD_DARK = '#e0a82e';
const DARK = '#1a1a1a';
const WHITE = '#ffffff';
const LIGHT = '#fafafa';
const BORDER = '#f0f0f0';
const MUTED = '#888';

const FEATURE_META = {
  discounts:   { icon: 'pricetag-outline',      color: '#FF6B6B' },
  resume:      { icon: 'document-text-outline', color: '#FF9800' },
  jobs:        { icon: 'briefcase-outline',     color: '#D32F2F' },
  social:      { icon: 'globe-outline',         color: '#EC407A' },
  events:      { icon: 'calendar-outline',      color: '#AB47BC' },
  scholarship: { icon: 'school-outline',        color: '#42A5F5' },
  skillshare:  { icon: 'people-circle-outline', color: '#4CAF50' },
  traveling:   { icon: 'airplane-outline',      color: '#29B6F6' },
};

export default function MissionCard({
  feature,
  mood = 'broke',
  line,
  ctaLabel = 'Get Sorted',
  ctaRoute,
  ctaParams = {},
  sorted = false,
  onSnooze,
}) {
  const navigation = useNavigation();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const onPress = () => {
    pop();
    if (ctaRoute) navigation.navigate(ctaRoute, ctaParams);
  };

  const meta = FEATURE_META[feature] || { icon: 'star-outline', color: GOLD };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      {/* Left accent bar (color-coded by feature) */}
      <View
        style={[
          styles.accentBar,
          { backgroundColor: sorted ? GOLD : meta.color },
        ]}
      />

      <View style={styles.topRow}>
        <Dot mood={sorted ? 'sorted' : mood} size={52} />
        <View style={styles.textCol}>
          {/* Small feature chip above line */}
          <View style={styles.chipRow}>
            <View
              style={[
                styles.featureChip,
                { backgroundColor: meta.color + '18' },
              ]}
            >
              <Ionicons name={meta.icon} size={10} color={meta.color} />
              <Text style={[styles.featureChipText, { color: meta.color }]}>
                {feature}
              </Text>
            </View>
            {sorted && (
              <View style={styles.sortedBadge}>
                <Ionicons name="checkmark" size={9} color={DARK} />
                <Text style={styles.sortedBadgeText}>sorted</Text>
              </View>
            )}
          </View>

          <Text style={styles.line} numberOfLines={2}>
            {line || "let's get sorted."}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={sorted ? [DARK, '#2a2a2a'] : [GOLD, GOLD_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text
              style={[styles.ctaText, sorted && styles.ctaTextSorted]}
            >
              {sorted ? 'view' : ctaLabel}
            </Text>
            <Ionicons
              name={sorted ? 'checkmark' : 'arrow-forward'}
              size={15}
              color={sorted ? GOLD : DARK}
            />
          </LinearGradient>
        </TouchableOpacity>

        {!sorted && onSnooze && (
          <TouchableOpacity onPress={onSnooze} style={styles.snoozeBtn}>
            {/* <Text style={styles.snoozeText}>not now</Text> */}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,

    // ✅ WIDER — spans nearly full screen with minimal side margins
    marginHorizontal: 8,
    marginBottom: 12,

    // ✅ More generous internal padding since the card is wider
    padding: 18,
    paddingLeft: 22,

    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  textCol: {
    flex: 1,
    marginLeft: 14,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  featureChipText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  sortedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
    backgroundColor: GOLD,
  },
  sortedBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
    color: DARK,
    textTransform: 'lowercase',
  },
  line: {
    // ✅ Slightly larger text since there's more room
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    // ✅ Slightly bigger CTA since the card has more room
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 6,
  },
  ctaText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: DARK,
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  ctaTextSorted: {
    color: GOLD,
  },
  snoozeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  snoozeText: {
    fontSize: 12.5,
    color: MUTED,
    fontWeight: '600',
  },
});