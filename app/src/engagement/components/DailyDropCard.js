// app/src/engagement/components/DailyDropCard.js
// Modern · compact · even-width options · animated vote bars · deep link to content

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import Dot from './Dot';
import { useDailyDrop } from '../hooks/useDailyDrop';
import { useEngagement } from '../hooks/useEngagement';
import engagementApi from '../api/engagementApi';
import { pop, success } from '../utils/haptics';
import { navigationRef } from '../../navigation/navigationRef';
import { color as T, font as F, MAX_FONT_SCALE } from '../../theme/tokens';

const GOLD = '#f9c349';
const GOLD_DARK = '#e0a82e';
const GOLD_LIGHT = '#fffbee';
const DARK = '#0f0f0f';
const MUTED = '#888';
const WHITE = '#ffffff';
const BORDER = '#ececec';
const BLACK = '#0f0f0f';

// variant="home" → the new Home look. No variant → exactly as before
// (Explore and StudentDashboard use the default).
export default function DailyDropCard({ variant } = {}) {
  const isHome = variant === 'home';
  const { drop, refresh, isLoading } = useDailyDrop();
  const { celebrate } = useEngagement();
  const navigation = useNavigation();

  const [busy, setBusy] = useState(false);
  const [votedChoice, setVotedChoice] = useState(null);
  const [localCounts, setLocalCounts] = useState(null);
  const [target, setTarget] = useState(null);
  // Points from the vote response (only shown by the home variant)
  const [pointsAwarded, setPointsAwarded] = useState(0);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(12)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ctaSlide = useRef(new Animated.Value(20)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle live-dot pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (target) {
      ctaFade.setValue(0);
      ctaSlide.setValue(20);
      Animated.parallel([
        Animated.timing(ctaFade, {
          toValue: 1,
          duration: 350,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.spring(ctaSlide, {
          toValue: 0,
          friction: 8,
          tension: 45,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [target]);

  useEffect(() => {
    if (drop?.target) setTarget(drop.target);
  }, [drop?.target]);

  // New day / new drop → forget the local vote of the old one
  const dropKey = drop?.dayKey || null;
  const lastDropKeyRef = useRef(dropKey);
  useEffect(() => {
    if (lastDropKeyRef.current !== dropKey) {
      lastDropKeyRef.current = dropKey;
      setVotedChoice(null);
      setLocalCounts(null);
      setTarget(drop?.target || null);
      setPointsAwarded(0);
    }
  }, [dropKey, drop?.target]);

  // Fresh server counts replace the optimistic ones
  useEffect(() => {
    if (!busy) setLocalCounts(null);
  }, [drop?.counts]); // eslint-disable-line react-hooks/exhaustive-deps

  // First load: same-size placeholder so the home screen doesn't jump
  if (!drop && isLoading && isHome) {
    return (
      <View style={[homeStyles.card, homeStyles.placeholderCard]}>
        <View style={[homeStyles.phBlock, { width: 90, height: 12 }]} />
        <View style={[homeStyles.phBlock, { width: '85%', height: 18, marginTop: 10 }]} />
        <View style={homeStyles.phRow}>
          <View style={[homeStyles.phBlock, homeStyles.phOption]} />
          <View style={[homeStyles.phBlock, homeStyles.phOption]} />
          <View style={[homeStyles.phBlock, homeStyles.phOption]} />
        </View>
      </View>
    );
  }
  if (!drop && isLoading) {
    return (
      <View style={[styles.card, styles.placeholderCard]}>
        <View style={styles.phRow}>
          <View style={[styles.phBlock, { width: 90, height: 10 }]} />
          <View style={[styles.phBlock, { width: 60, height: 10 }]} />
        </View>
        <View style={[styles.phBlock, { width: '85%', height: 16, marginTop: 14 }]} />
        <View style={[styles.phBlock, { width: '60%', height: 12, marginTop: 8 }]} />
        <View style={styles.phRow}>
          <View style={[styles.phBlock, styles.phOption]} />
          <View style={[styles.phBlock, styles.phOption]} />
        </View>
      </View>
    );
  }
  if (!drop) return null;

  const counts = localCounts || drop.counts || {};
  const total = Object.values(counts).reduce((s, n) => s + n, 0) || 0;
  const myChoice = votedChoice || drop.myChoice;
  const hasVoted = !!myChoice;
  const options = drop.action?.options || [];

  const onVote = async (choice) => {
    if (busy || hasVoted || !choice) return;
    setBusy(true);
    try { pop(); } catch (e) {}

    // Optimistic: the bars + tick show instantly, server confirms after
    setVotedChoice(choice);
    setLocalCounts({ ...counts, [choice]: (counts[choice] || 0) + 1 });

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const res = await engagementApi.reactToDrop(drop.dayKey, choice);
      if (res?.myChoice) setVotedChoice(res.myChoice);
      if (res?.counts) setLocalCounts(res.counts);
      if (res?.target) setTarget(res.target);
      setPointsAwarded(Number(res?.engagement?.pointsAwarded) || 0);
      if (res?.engagement) {
        try { celebrate(res.engagement); } catch (e) {}
      }
      try { success(); } catch (e) {}
      refresh();
    } catch (e) {
      // Undo the optimistic vote and say why
      setVotedChoice(null);
      setLocalCounts(null);
      const msg = e?.response?.data?.message || e?.message || 'try again';
      console.log('[DailyDrop] react error:', msg);
      Alert.alert(
        "couldn't save your vote",
        msg === 'drop_not_live'
          ? "this drop isn't live anymore. pull down to refresh."
          : msg === 'drop_not_found'
          ? 'this drop was removed. pull down to refresh.'
          : msg === 'invalid_choice'
          ? 'the options changed. pull down to refresh.'
          : msg
      );
    } finally {
      setBusy(false);
    }
  };

  const handleOpenTarget = () => {
    if (!target?.route) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const params = target.params || {};
    try {
      if (navigationRef.isReady()) {
        navigationRef.navigate(target.route, params);
      } else {
        navigation.navigate(target.route, params);
      }
    } catch (e) {
      console.log('[DailyDrop] open target error:', e?.message);
      // Fallback: the list screen for this kind
      const LIST = { job: 'Career', brand: 'Brands', event: 'Events', scholarship: 'Exchange' };
      const fallback = LIST[target.kind];
      if (fallback) {
        try { navigation.navigate(fallback); } catch {}
      }
    }
  };

  const ctaLabel = (() => {
    if (!target) return null;
    switch (target.kind) {
      case 'job': return 'view internship';
      case 'scholarship': return 'view scholarship';
      case 'event': return 'view event';
      case 'brand': return 'view offer';
      case 'confession': return 'read post';
      case 'listing': return 'view listing';
      default: return 'open';
    }
  })();

  if (isHome) {
    const others = (counts[myChoice] || 0) - 1;
    let helper = 'vote to see what campus thinks.';
    if (hasVoted) {
      helper = others > 0
        ? `you and ${others} ${others === 1 ? 'other' : 'others'} picked this.`
        : 'you picked this.';
      if (pointsAwarded > 0) helper += ` +${pointsAwarded} points.`;
    }

    return (
      <Animated.View
        style={[
          homeStyles.card,
          {
            opacity: fadeIn,
            transform: [{ translateY: slideUp }, { scale: scaleAnim }],
          },
        ]}
      >
        <View style={homeStyles.topRow}>
          <Dot mood={drop.mood || 'cheeky'} size={18} animated={false} />
          <Text style={homeStyles.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {"today's drop"}
          </Text>
        </View>

        {/* Question (tap → open the drop's content) */}
        <TouchableOpacity
          activeOpacity={target?.route ? 0.7 : 1}
          disabled={!target?.route}
          onPress={handleOpenTarget}
          accessibilityRole={target?.route ? 'button' : undefined}
        >
          <Text style={homeStyles.question} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {drop.title}
          </Text>
          {!!drop.body && (
            <Text style={homeStyles.body} numberOfLines={2}>
              {drop.body}
            </Text>
          )}
        </TouchableOpacity>

        <View style={homeStyles.optionsWrap}>
          {options.map((option) => {
            const count = counts[option] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const chosen = myChoice === option;

            return (
              <TouchableOpacity
                key={option}
                style={[homeStyles.option, chosen && homeStyles.optionChosen]}
                onPress={() => onVote(option)}
                disabled={busy || hasVoted}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={hasVoted ? `${option}, ${pct}%${chosen ? ', your pick' : ''}` : `vote ${option}`}
                accessibilityState={{ disabled: busy || hasVoted, selected: chosen }}
              >
                {hasVoted && (
                  <View
                    style={[
                      homeStyles.fill,
                      { width: `${pct}%`, backgroundColor: chosen ? T.yellow : T.sand },
                    ]}
                  />
                )}
                <Text style={homeStyles.optionText} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {hasVoted ? `${option} ${pct}%` : option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={homeStyles.helperRow}>
          <Text style={homeStyles.helper} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {helper}
          </Text>
          {target?.route && ctaLabel && (
            <TouchableOpacity
              onPress={handleOpenTarget}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
            >
              <Text style={homeStyles.link} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {ctaLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeIn,
          transform: [{ translateY: slideUp }, { scale: scaleAnim }],
        },
      ]}
    >
      {/* Top gold accent strip */}
      <LinearGradient
        colors={[GOLD, GOLD_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topAccent}
      />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Animated.View
            style={[
              styles.liveDotWrap,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.liveDot} />
          </Animated.View>
          <Text style={styles.title}>
            today's drop<Text style={styles.titleDot}>.</Text>
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.tillPill}>
            <Ionicons name="time-outline" size={9} color={GOLD_DARK} />
            <Text style={styles.tillText}>till midnight</Text>
          </View>
          <Dot mood={drop.mood || 'cheeky'} size={22} animated={false} />
        </View>
      </View>

      {/* Question (tap → open the drop's content) */}
      <TouchableOpacity
        activeOpacity={target?.route ? 0.7 : 1}
        disabled={!target?.route}
        onPress={handleOpenTarget}
      >
        <Text style={styles.question}>{drop.title}</Text>

        {!!drop.body && (
          <Text style={styles.bodyText} numberOfLines={2}>
            {drop.body}
          </Text>
        )}
      </TouchableOpacity>

      {/* Options */}
      <View style={styles.optionsWrap}>
        {options.map((option) => {
          const count = counts[option] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const chosen = myChoice === option;

          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionBtn,
                hasVoted && styles.optionBtnVoted,
                chosen && styles.optionBtnChosen,
              ]}
              onPress={() => onVote(option)}
              disabled={busy || hasVoted}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              activeOpacity={0.85}
            >
              {hasVoted && (
                <View
                  style={[
                    styles.fillBar,
                    {
                      width: `${pct}%`,
                      backgroundColor: chosen ? GOLD + '55' : GOLD + '20',
                    },
                  ]}
                />
              )}

              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionText,
                    chosen && styles.optionTextChosen,
                  ]}
                  numberOfLines={1}
                >
                  {option}
                </Text>

                {hasVoted && (
                  <View
                    style={[
                      styles.pctChip,
                      chosen && styles.pctChipChosen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pctText,
                        chosen && styles.pctTextChosen,
                      ]}
                    >
                      {pct}%
                    </Text>
                  </View>
                )}
              </View>

              {/* Chosen check */}
              {chosen && (
                <View style={styles.chosenCheck}>
                  <Ionicons name="checkmark" size={10} color={DARK} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Busy */}
      {busy && (
        <View style={styles.busyWrap}>
          <ActivityIndicator size="small" color={GOLD_DARK} />
        </View>
      )}

      {/* Footer total */}
      {hasVoted && total > 0 && (
        <View style={styles.footerRow}>
          <Ionicons name="people-outline" size={10} color={MUTED} />
          <Text style={styles.footerText}>
            {total} {total === 1 ? 'vote' : 'votes'} so far
          </Text>
        </View>
      )}

      {/* CTA: always visible when the drop links to something */}
      {target?.route && ctaLabel && (
        <Animated.View
          style={{
            opacity: ctaFade,
            transform: [{ translateY: ctaSlide }],
          }}
        >
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={handleOpenTarget}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[GOLD, GOLD_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="arrow-forward-circle" size={16} color={BLACK} />
              <Text style={styles.ctaText}>{ctaLabel}</Text>
              <Ionicons name="chevron-forward" size={14} color={BLACK} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  placeholderCard: { minHeight: 150 },
  phRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 12 },
  phBlock: { backgroundColor: '#f1f1f1', borderRadius: 8 },
  phOption: { flex: 1, height: 42, borderRadius: 12 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GOLD + '35',
    paddingVertical: 16,
    paddingHorizontal: 16,
    // Same width as the mission card: the home content padding sets the gutter
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 4,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  // Top accent gradient strip
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  liveDotWrap: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GOLD + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },

  title: {
    fontSize: 11,
    fontWeight: '900',
    color: DARK,
    letterSpacing: -0.1,
    textTransform: 'lowercase',
  },
  titleDot: { color: GOLD, fontWeight: '900' },

  tillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: GOLD + '18',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD + '40',
  },
  tillText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: GOLD_DARK,
    letterSpacing: 0.2,
    textTransform: 'lowercase',
  },

  // Question
  question: {
    fontSize: 15.5,
    fontWeight: '800',
    color: DARK,
    lineHeight: 21,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  bodyText: {
    fontSize: 11.5,
    color: '#6b6b6b',
    marginTop: 2,
    lineHeight: 16,
    fontWeight: '500',
  },

  // Options
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    minWidth: 100,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD + '55',
    backgroundColor: WHITE,
    overflow: 'hidden',
    position: 'relative',
  },
  optionBtnVoted: {
    borderColor: BORDER,
    backgroundColor: '#fbfbfb',
  },
  optionBtnChosen: {
    borderColor: GOLD_DARK,
    borderWidth: 1.5,
    backgroundColor: '#fffdf5',
  },
  fillBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderTopLeftRadius: 11,
    borderBottomLeftRadius: 11,
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingRight: 28, // room for chosen check
    zIndex: 2,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  optionTextChosen: { color: DARK, fontWeight: '900' },

  pctChip: {
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pctChipChosen: { backgroundColor: DARK, borderColor: DARK },
  pctText: { fontSize: 9, fontWeight: '900', color: DARK },
  pctTextChosen: { color: GOLD },

  chosenCheck: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },

  busyWrap: { marginTop: 8, alignItems: 'center' },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },
  footerText: {
    fontSize: 9.5,
    color: MUTED,
    fontWeight: '700',
    textTransform: 'lowercase',
    letterSpacing: 0.2,
  },

  // CTA
  ctaBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    borderWidth: 1,
    borderColor: BLACK,
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
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
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  ctaText: {
    color: BLACK,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'lowercase',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },
});
// ── variant="home" (new Home design) ─────────────────────────────────
const homeStyles = StyleSheet.create({
  // Section spacing lives on the card so "no drop" leaves no gap on Home
  card: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: T.yellowSoft,
    borderRadius: 22,
    padding: 16,
  },
  placeholderCard: { minHeight: 150 },
  phRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  phBlock: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8 },
  phOption: { flex: 1, height: 44, borderRadius: 12 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink },

  question: {
    marginTop: 6,
    fontFamily: F.headingBold,
    fontSize: 18,
    lineHeight: 22.5,
    color: T.ink,
  },
  body: {
    marginTop: 4,
    fontFamily: F.body,
    fontSize: 14,
    color: T.textMuted,
  },

  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  // 3 per row; a 4th+ option wraps to a second row
  option: {
    flexGrow: 1,
    flexBasis: '30%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.line,
    backgroundColor: T.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  optionChosen: { borderColor: T.ink },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  optionText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, textAlign: 'center' },

  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  helper: { flex: 1, fontFamily: F.body, fontSize: 12, color: T.textMuted },
  link: {
    fontFamily: F.bodySemi,
    fontSize: 13,
    color: T.ink,
    textDecorationLine: 'underline',
    textAlign: 'right',
  },
});
