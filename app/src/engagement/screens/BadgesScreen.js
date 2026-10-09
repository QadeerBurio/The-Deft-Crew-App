// app/src/engagement/screens/BadgesScreen.js
// Modern design · only 3 colors: WHITE #ffffff · GOLD #f9c349 · BLACK #0f0f0f
// Referral data + badges fetched live from the backend.

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Dot from '../components/Dot';
import engagementApi from '../api/engagementApi';
import { useMissions } from '../hooks/useMissions';
import { useEngagement } from '../hooks/useEngagement';
import { useStreak } from '../hooks/useStreak';

import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { ScreenHeader } from "../../ui";
const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2;

const GOLD = T.yellow;
const BLACK = T.ink;
const WHITE = T.white;

// ─── Group config ──────────────────────────────────────────────────────
const GROUPS = {
  features: {
    id: 'features',
    label: 'features',
    icon: 'star-four-points',
    sub: 'one badge per sorted mission',
  },
  referrals: {
    id: 'referrals',
    label: 'referrals',
    icon: 'account-multiple-plus',
    sub: 'invite friends, unlock tiers',
  },
  savings: {
    id: 'savings',
    label: 'savings',
    icon: 'cash-multiple',
    sub: 'based on rupees saved',
  },
  streaks: {
    id: 'streaks',
    label: 'streaks',
    icon: 'fire',
    sub: 'days in a row',
  },
  status: {
    id: 'status',
    label: 'status',
    icon: 'crown',
    sub: 'rare drops',
  },
};

const GROUP_ORDER = {
  features: [
    'feature_discounts',
    'feature_resume',
    'feature_jobs',
    'feature_social',
    'feature_events',
    'feature_scholarship',
    'feature_skillshare',
    'feature_traveling',
    'fully_sorted',
  ],
  referrals: [
    'referral_10',
    'referral_50',
    'referral_100',
    'referral_500',
    'referral_1000',
    'referral_2000',
    'referral_3000',
    'referral_5000',
  ],
  savings: ['saved_1k', 'saved_5k', 'saved_10k'],
  streaks: ['streak_7', 'streak_30', 'streak_100'],
  status: ['og', 'confession_of_the_day'],
};

// ✅ Referral tier thresholds — stops at 5000 (no 10000)
const REFERRAL_TIERS = [10, 50, 100, 500, 1000, 2000, 3000, 5000];

// ─── Mission Chip ──────────────────────────────────────────────────────
const MissionChip = ({ label, sorted, index }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        delay: index * 40,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 60,
        delay: index * 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
      <View style={[styles.missionChip, sorted && styles.missionChipSorted]}>
        <View style={[styles.missionChipDot, sorted && styles.missionChipDotSorted]}>
          {sorted ? (
            <Ionicons name="checkmark" size={11} color={BLACK} />
          ) : (
            <View style={styles.missionChipDotEmpty} />
          )}
        </View>
        <Text
          style={[
            styles.missionChipLabel,
            sorted && styles.missionChipLabelSorted,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Animated.View>
  );
};

// ─── Shine overlay ─────────────────────────────────────────────────────
const ShineOverlay = () => {
  const x = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(x, {
          toValue: 400,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(x, { toValue: -100, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.shine, { transform: [{ translateX: x }, { rotate: '18deg' }] }]}
    />
  );
};

// ─── Modern Badge Card ─────────────────────────────────────────────────
const BadgeCard = ({ badge, index, earned }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        delay: index * 45,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 400,
        delay: index * 45,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 50,
        delay: index * 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View
      style={[
        styles.cardWrap,
        { opacity: fade, transform: [{ translateY: slide }, { scale }] },
      ]}
    >
      <View style={[styles.card, earned ? styles.cardEarned : styles.cardLocked]}>
        {earned && <ShineOverlay />}

        <View style={styles.cardTopRight}>
          {earned ? (
            <View style={styles.checkChip}>
              <Ionicons name="checkmark" size={12} color={WHITE} />
            </View>
          ) : (
            <View style={styles.lockChip}>
              <Ionicons name="lock-closed" size={11} color={BLACK} />
            </View>
          )}
        </View>

        <View style={styles.dotWrap}>
          {earned ? (
            <Dot
              mood={badge.mood || 'sorted'}
              size={72}
              remoteUrl={badge.iconUrl || null}
              glow
            />
          ) : (
            <View style={styles.lockedDotOuter}>
              <View style={styles.lockedDotInner}>
                <Ionicons name="help" size={22} color={BLACK} />
              </View>
            </View>
          )}
        </View>

        <Text
          style={[styles.cardTitle, !earned && styles.cardTitleLocked]}
          numberOfLines={2}
        >
          {badge.title}
        </Text>
        <Text
          style={[styles.cardLine, !earned && styles.cardLineLocked]}
          numberOfLines={3}
        >
          {badge.line}
        </Text>

        {earned && badge.earnedAt && (
          <View style={styles.earnedDateWrap}>
            <Ionicons name="time-outline" size={10} color={BLACK} />
            <Text style={styles.earnedDate}>
              {new Date(badge.earnedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ─── Group Tab ─────────────────────────────────────────────────────────
const GroupTab = ({ group, count, active, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, friction: 5, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        style={[styles.groupTab, active && styles.groupTabActive]}
      >
        <MaterialCommunityIcons
          name={group.icon}
          size={14}
          color={active ? BLACK : WHITE}
        />
        <Text style={[styles.groupTabLabel, active && styles.groupTabLabelActive]}>
          {group.label}
        </Text>
        <View style={[styles.groupTabCount, active && styles.groupTabCountActive]}>
          <Text style={[styles.groupTabCountText, active && styles.groupTabCountTextActive]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────
// Last loaded badge list, so the screen opens at once next time
const badgesCache = { list: null };

export default function BadgesScreen() {
  const navigation = useNavigation();
  const { missions } = useMissions();
  const { me, refresh: refreshEngagement } = useEngagement();

  const [badges, setBadges] = useState(badgesCache.list || []);
  const [loading, setLoading] = useState(!badgesCache.list);
  const [activeGroup, setActiveGroup] = useState('features');
  const [selectedId, setSelectedId] = useState(null);
  const { count: streakCount, enabled: streakEnabled } = useStreak();

  const heroScale = useRef(new Animated.Value(0.95)).current;
  const heroFade = useRef(new Animated.Value(0)).current;

  // Referral count from live engagement data (unchanged)
  const referralCount = me?.referralCount ?? 0;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // points/streak refresh in the background, badges decide when we show
        refreshEngagement?.();
        const list = await engagementApi.getBadges().catch(() => null);
        if (!cancelled && Array.isArray(list)) {
          setBadges(list);
          badgesCache.list = list;
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          Animated.parallel([
            Animated.spring(heroScale, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
            Animated.timing(heroFade, { toValue: 1, duration: 500, useNativeDriver: true }),
          ]).start();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshEngagement]);

  const { earnedCount, total, sortedFeatureIds, mergedBadges } = useMemo(() => {
    const merged = badges;
    const e = merged.filter((b) => b.earnedAt);

    const sortedSet = new Set();
    for (const card of (missions?.cards || [])) {
      if (card.sorted) sortedSet.add(card.feature);
    }

    return {
      earnedCount: e.length,
      total: merged.length,
      sortedFeatureIds: sortedSet,
      mergedBadges: merged,
    };
  }, [badges, missions]);

  const progressPct = total > 0 ? earnedCount / total : 0;
  const sortedCount = sortedFeatureIds.size;

  const grouped = useMemo(() => {
    const out = {};
    for (const gKey of Object.keys(GROUPS)) {
      out[gKey] = { group: GROUPS[gKey], earned: [], locked: [], all: [] };
    }

    for (const b of mergedBadges) {
      const g = b.group || 'features';
      if (!out[g]) continue;
      out[g].all.push(b);
      if (b.earnedAt) out[g].earned.push(b);
      else out[g].locked.push(b);
    }

    for (const gKey of Object.keys(out)) {
      const order = GROUP_ORDER[gKey] || [];
      out[gKey].all.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }

    return out;
  }, [mergedBadges]);

  const MISSION_FEATURES = [
    { key: 'discounts', label: 'discounts' },
    { key: 'traveling', label: 'traveling' },
    { key: 'skillshare', label: 'skillshare' },
    { key: 'events', label: 'events' },
    { key: 'resume', label: 'resume' },
    { key: 'jobs', label: 'jobs' },
    { key: 'scholarship', label: 'scholarship' },
    { key: 'social', label: 'social' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="badges" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.loadingText}>loading badges…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentGroup = grouped[activeGroup] || grouped.features;
  const groupEarned = currentGroup.earned.length;
  const groupTotal = currentGroup.all.length;
  const selected = currentGroup.all.find((b) => b.id === selectedId) || currentGroup.all[0] || null;

  const nextTier = REFERRAL_TIERS.find((t) => referralCount < t);
  const referralProgressText = nextTier
    ? `${(nextTier - referralCount).toLocaleString()} more to ${nextTier.toLocaleString()}`
    : 'all referral tiers unlocked. legend.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <ScreenHeader
        title="badges"
        onBack={() => navigation.goBack()}
        right={
          <Text style={B.headerCount} accessibilityLabel={`${earnedCount} of ${total} badges earned`} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {earnedCount} / {total}
          </Text>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── STREAK (dark, real daily streak; hidden when the streak feature is off) ── */}
        {streakEnabled && (
          <Animated.View style={[B.section, { opacity: heroFade, transform: [{ scale: heroScale }] }]}>
            <View style={B.streak}>
              <View style={B.streakIcon}>
                <MaterialCommunityIcons name="fire" size={24} color={T.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={B.streakLabel}>streak</Text>
                <Text style={B.streakValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {streakCount} {streakCount === 1 ? 'day' : 'days'}<Text style={{ color: T.yellow }}>.</Text>
                </Text>
                <Text style={B.streakSub}>one sorted thing a day keeps it going.</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── MISSIONS ─────────────────────────────────────── */}
        <View style={B.section}>
          <View style={B.card}>
            <View style={B.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={B.cardTitle}>missions</Text>
                <Text style={B.cardSub}>sort each card to earn its badge</Text>
              </View>
              <View style={B.countPill}>
                <Text style={B.countText}>{sortedCount}/8</Text>
              </View>
            </View>
            <View style={B.chips}>
              {MISSION_FEATURES.map((f, i) => (
                <MissionChip key={f.key} label={f.label} sorted={sortedFeatureIds.has(f.key)} index={i} />
              ))}
            </View>
          </View>
        </View>

        {/* ── REFERRALS ────────────────────────────────────── */}
        <View style={B.section}>
          <View style={B.card}>
            <View style={B.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={B.cardTitle}>referrals</Text>
                <Text style={B.cardSub}>{referralProgressText}</Text>
              </View>
              <View style={B.countPill}>
                <Text style={B.countText}>{referralCount.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.referralTrack}>
              {REFERRAL_TIERS.map((num, i) => {
                const reached = referralCount >= num;
                return (
                  <View key={num} style={styles.referralStep}>
                    <View style={[styles.referralDot, reached && styles.referralDotReached]}>
                      {reached && <Ionicons name="checkmark" size={9} color={BLACK} />}
                    </View>
                    {i < REFERRAL_TIERS.length - 1 && (
                      <View style={[styles.referralBar, reached && styles.referralBarReached]} />
                    )}
                  </View>
                );
              })}
            </View>
            <View style={styles.referralLabels}>
              <Text style={styles.referralLabel}>10</Text>
              <Text style={styles.referralLabel}>100</Text>
              <Text style={styles.referralLabel}>1k</Text>
              <Text style={styles.referralLabel}>3k</Text>
              <Text style={styles.referralLabel}>5k</Text>
            </View>
          </View>
        </View>

        {/* ── YOUR COLLECTION ──────────────────────────────── */}
        <View style={B.section}>
          <Text style={B.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
            your collection<Text style={{ color: T.yellow }}>.</Text>
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={B.groupRow}>
          {Object.keys(GROUPS).map((gKey) => {
            const g = grouped[gKey];
            const on = activeGroup === gKey;
            return (
              <TouchableOpacity
                key={gKey}
                onPress={() => {
                  setActiveGroup(gKey);
                  setSelectedId(null);
                }}
                style={[B.groupChip, on && B.groupChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${GROUPS[gKey].label}, ${g ? g.earned.length : 0} earned`}
              >
                <Text style={[B.groupChipText, on && B.groupChipTextOn]}>{GROUPS[gKey].label}</Text>
                <Text style={[B.groupChipCount, on && B.groupChipTextOn]}>{g ? g.earned.length : 0}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={B.section}>
          <Text style={B.groupSub}>
            {GROUPS[activeGroup].sub} · {groupEarned}/{groupTotal}
          </Text>
          {currentGroup.all.length === 0 ? (
            <View style={[B.card, { alignItems: 'center' }]}>
              <Text style={B.cardTitle}>no badges in this group yet.</Text>
              <Text style={B.cardSub}>keep using the app to unlock them.</Text>
            </View>
          ) : (
            <>
              <View style={B.grid}>
                {currentGroup.all.map((b) => {
                  const earned = !!b.earnedAt;
                  const sel = (selected?.id || currentGroup.all[0]?.id) === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => setSelectedId(b.id)}
                      activeOpacity={0.85}
                      style={[B.tile, !earned && B.tileLocked, sel && B.tileSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
                      accessibilityLabel={`${b.title}, ${earned ? 'unlocked' : 'locked'}`}
                    >
                      <View style={!earned && { opacity: 0.35 }}>
                        <Dot mood={b.mood || 'sorted'} size={48} remoteUrl={b.iconUrl || null} />
                      </View>
                      <Text style={[B.tileName, !earned && { color: T.textFaint }]} numberOfLines={2}>
                        {b.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selected && (
                <View style={B.detail}>
                  <Text style={B.detailText}>
                    <Text style={B.bold}>{selected.title}. </Text>
                    <Text style={{ color: T.textMuted }}>
                      {selected.earnedAt ? 'unlocked: ' : 'to unlock: '}
                      {selected.line}
                      {selected.earnedAt
                        ? ` · ${new Date(selected.earnedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                        : ''}
                    </Text>
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles — WHITE · GOLD · BLACK only ────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },


  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: BLACK, opacity: 0.55, fontFamily: F.bodySemi },

  scroll: { paddingBottom: 20 },

  // ── Hero ─────────────────────────────────────────────
  hero: {
    margin: 16,
    padding: 22,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: BLACK,
  },
  heroOrb1: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: GOLD + '10',
    top: -70, right: -50,
  },
  heroOrb2: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: GOLD + '06',
    bottom: -40, left: -30,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 1,
  },
  heroLabel: {
    fontSize: 10,
    color: GOLD,
    textTransform: 'none',
    letterSpacing: 2,
    fontFamily: F.bodyBold,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  heroAmount: {
    fontSize: 48,
    color: WHITE,
    fontFamily: F.heading,
    letterSpacing: -1.5,
  },
  heroSlash: {
    fontSize: 22,
    color: GOLD,
    fontFamily: F.heading,
    marginLeft: 4,
  },
  heroSub: {
    fontSize: 12,
    color: WHITE,
    opacity: 0.6,
    fontFamily: F.bodySemi,
    marginTop: 2,
  },
  heroIconWrap: { marginTop: 4 },
  heroIconCircle: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: GOLD + '15',
    borderWidth: 1.5, borderColor: GOLD,
  },
  progressBar: {
    height: 8, borderRadius: 4,
    backgroundColor: WHITE + '15',
    overflow: 'hidden',
    marginTop: 20,
    position: 'relative',
    zIndex: 1,
  },
  progressFill: {
    height: '100%', borderRadius: 4, backgroundColor: GOLD,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    position: 'relative',
    zIndex: 1,
  },
  progressText: {
    fontSize: 11, color: WHITE, opacity: 0.6, fontFamily: F.bodySemi,
  },
  progressPct: {
    fontSize: 13, color: GOLD, fontFamily: F.bodyBold, letterSpacing: -0.2,
  },

  // ── Missions / Referral tracker (shared) ─────────────
  missionSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BLACK + '10',
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  missionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  missionIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: GOLD,
  },
  missionCountPill: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14, backgroundColor: BLACK,
  },
  missionCountText: {
    fontSize: 12, fontFamily: F.bodyBold, color: GOLD,
  },
  missionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  missionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 11,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1.5, borderColor: BLACK + '12',
  },
  missionChipSorted: {
    backgroundColor: GOLD, borderColor: BLACK,
  },
  missionChipDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: BLACK + '10',
    alignItems: 'center', justifyContent: 'center',
  },
  missionChipDotSorted: { backgroundColor: WHITE },
  missionChipDotEmpty: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: WHITE,
  },
  missionChipLabel: {
    fontSize: 11.5, fontFamily: F.bodyBold,
    color: BLACK, opacity: 0.45, letterSpacing: 0.1,
  },
  missionChipLabelSorted: { color: BLACK, opacity: 1 },

  // ── Referral tracker ─────────────────────────────────
  referralTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  referralStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  referralDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: WHITE,
    borderWidth: 2, borderColor: BLACK + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  referralDotReached: {
    backgroundColor: GOLD,
    borderColor: BLACK,
  },
  referralBar: {
    flex: 1,
    height: 3,
    backgroundColor: BLACK + '15',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  referralBarReached: {
    backgroundColor: GOLD,
  },
  referralLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  referralLabel: {
    fontSize: 10,
    fontFamily: F.bodyBold,
    color: BLACK,
    opacity: 0.45,
    letterSpacing: 0.3,
  },

  // ── Tabs ─────────────────────────────────────────────
  tabsSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  tabsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  groupTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: BLACK,
    borderWidth: 1.5, borderColor: BLACK,
  },
  groupTabActive: {
    backgroundColor: GOLD, borderColor: BLACK,
  },
  groupTabLabel: {
    fontSize: 12, fontFamily: F.bodyBold,
    color: WHITE, letterSpacing: -0.1,
    textTransform: 'lowercase',
  },
  groupTabLabelActive: { color: BLACK },
  groupTabCount: {
    minWidth: 22, height: 18, borderRadius: 9,
    paddingHorizontal: 6,
    backgroundColor: WHITE + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  groupTabCountActive: { backgroundColor: WHITE },
  groupTabCountText: {
    fontSize: 10, fontFamily: F.bodyBold, color: WHITE,
  },
  groupTabCountTextActive: { color: BLACK },

  // ── Group section ────────────────────────────────────
  groupSection: { marginTop: 18 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: GOLD,
  },
  groupTitle: {
    fontSize: 15, fontFamily: F.bodyBold,
    color: BLACK, letterSpacing: -0.3,
    textTransform: 'lowercase',
  },
  groupSub: {
    fontSize: 11, color: BLACK, opacity: 0.5,
    fontFamily: F.bodyMedium, marginTop: 1,
  },
  groupCount: {
    minWidth: 44, height: 26, borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: BLACK,
  },
  groupCountText: {
    fontSize: 12, fontFamily: F.bodyBold,
    color: GOLD, letterSpacing: 0.2,
  },

  // ── Grid ─────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: CARD_GAP,
  },

  // ── Card ─────────────────────────────────────────────
  cardWrap: { width: CARD_WIDTH },
  card: {
    width: '100%',
    paddingVertical: 22,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: 'center',
    position: 'relative',
    minHeight: 200,
    overflow: 'hidden',
  },
  cardEarned: {
    backgroundColor: WHITE,
    borderWidth: 2, borderColor: GOLD,
  },
  cardLocked: {
    backgroundColor: WHITE,
    borderWidth: 1.5, borderColor: BLACK + '12',
    borderStyle: 'dashed',
  },
  shine: {
    position: 'absolute',
    top: -50, left: 0,
    width: 60, height: 300,
    backgroundColor: GOLD + '20',
  },
  cardTopRight: {
    position: 'absolute',
    top: 12, right: 12,
    zIndex: 2,
  },
  checkChip: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: BLACK,
    borderWidth: 2, borderColor: GOLD,
  },
  lockChip: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: BLACK + '08',
    alignItems: 'center', justifyContent: 'center',
  },
  dotWrap: {
    width: 80, height: 80,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, position: 'relative',
  },
  lockedDotOuter: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: BLACK + '06',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: BLACK + '10',
  },
  lockedDotInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13.5, fontFamily: F.bodyBold,
    color: BLACK, textAlign: 'center',
    letterSpacing: -0.2, marginBottom: 4,
  },
  cardTitleLocked: { color: BLACK, opacity: 0.4 },
  cardLine: {
    fontSize: 11, color: BLACK, opacity: 0.65,
    textAlign: 'center', lineHeight: 15, fontFamily: F.bodyMedium,
  },
  cardLineLocked: { color: BLACK, opacity: 0.35 },
  earnedDateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
    marginBottom: -8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: GOLD,
    borderRadius: 8,
  },
  earnedDate: {
    fontSize: 10, fontFamily: F.bodyBold,
    color: BLACK, letterSpacing: 0.3,
    textTransform: 'none',
  },

  // ── Empty ────────────────────────────────────────────
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  empty: {
    marginTop: 12, color: BLACK,
    fontSize: 14, fontFamily: F.bodyBold,
  },
  emptySub: {
    marginTop: 4, color: BLACK, opacity: 0.4,
    fontSize: 12, fontFamily: F.bodyMedium,
    textAlign: 'center',
  },
});

// ─── Badges design layout ─────────────────────────────────────────────
const B = StyleSheet.create({
  headerCount: { fontFamily: F.bodyBold, fontSize: 14, color: T.textMuted, minWidth: 34, textAlign: 'right' },
  section: { paddingHorizontal: 16, paddingTop: 14 },
  h2: { fontFamily: F.heading, fontSize: 17, color: T.ink },
  bold: { fontFamily: F.bodyBold, color: T.ink },

  streak: {
    borderRadius: 26,
    backgroundColor: T.ink,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  streakIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakLabel: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.onInkMuted },
  streakValue: { fontFamily: F.heading, fontSize: 24, color: T.white },
  streakSub: { fontFamily: F.body, fontSize: 12.5, color: T.onInkMuted },

  card: {
    borderRadius: 22,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    padding: 14,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { fontFamily: F.headingBold, fontSize: 16, color: T.ink },
  cardSub: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 1 },
  countPill: { height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: T.sand, justifyContent: 'center' },
  countText: { fontFamily: F.bodyBold, fontSize: 12.5, color: T.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  groupRow: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  groupChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: T.line,
    backgroundColor: T.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupChipOn: { backgroundColor: T.ink, borderColor: T.ink },
  groupChipText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
  groupChipCount: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted },
  groupChipTextOn: { color: T.white },
  groupSub: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginBottom: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31%',
    flexGrow: 1,
    minHeight: 118,
    borderRadius: 22,
    backgroundColor: T.card,
    borderWidth: 1.5,
    borderColor: T.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  tileLocked: { backgroundColor: T.sand },
  tileSelected: { borderColor: T.ink },
  tileName: { fontFamily: F.bodyBold, fontSize: 12, color: T.ink, textAlign: 'center' },
  detail: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
  },
  detailText: { fontFamily: F.body, fontSize: 13.5, lineHeight: 19, color: T.ink },
});
