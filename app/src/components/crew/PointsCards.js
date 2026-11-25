// app/src/components/crew/PointsCards.js
// The crew screen's cards: skeleton, hero, members, levels, founder banner (moved unchanged out of components/Points.js).
import React, { useEffect, useRef, memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Animated, InteractionManager } from 'react-native'; // r8: InteractionManager was used without its import (crew screen crash)
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { SafeAreaView } from 'react-native-safe-area-context';
import Dot from '../../engagement/components/Dot';
import { color as T } from "../../theme/tokens";
import { LEVELS } from './levels';
import { styles } from './pointsStyles';

// ═══════════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════════
const SkeletonLoader = memo(() => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
    <View style={styles.header}>
      <View style={{ width: 38, height: 38, backgroundColor: T.sand, borderRadius: 12 }} />
      <View style={{ width: 100, height: 20, backgroundColor: T.sand, borderRadius: 6 }} />
      <View style={{ width: 38, height: 38, backgroundColor: T.sand, borderRadius: 12 }} />
    </View>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={{ margin: 16, padding: 24, backgroundColor: T.sand, borderRadius: 24, height: 180 }} />
      <View style={{ margin: 16, padding: 20, backgroundColor: T.sand, borderRadius: 20, height: 120 }} />
    </ScrollView>
  </SafeAreaView>
));

// ═══════════════════════════════════════════════════════════════════════
// HERO POINTS CARD
// ═══════════════════════════════════════════════════════════════════════
const HeroPointsCard = memo(({ balance, lifetime, level, nextTier, pulse }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 24000,
        useNativeDriver: true,
      })
    ).start();
    return () => rotateAnim.stopAnimation();
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const hint = buildNextTierHint(nextTier);

  return (
    <Animated.View style={[styles.heroCard, { transform: [{ scale: pulse }] }]}>
      <LinearGradient
        colors={[T.ink, T.ink]}
        style={styles.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.heroOrb1, { transform: [{ rotate: rotateInterpolate }] }]} />
        <Animated.View style={[styles.heroOrb2, { transform: [{ rotate: rotateInterpolate }] }]} />

        <View style={styles.heroContent}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>your points</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{(level || 'member').toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.heroBalance}>{balance.toLocaleString()}</Text>
          <Text style={styles.heroSub}>lifetime · {lifetime.toLocaleString()} pts</Text>

          <View style={styles.progressRow}>
            <Dot mood={nextTier ? 'sorted' : 'excited'} size={44} animated={false} />
            <View style={styles.progressTextWrap}>
              <Text style={styles.progressTitle}>{hint.title}</Text>
              {hint.lines.map((line, i) => (
                <Text key={i} style={styles.progressSub}>{line}</Text>
              ))}
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

function buildNextTierHint(nextTier) {
  if (!nextTier) {
    return { title: "you've hit the top. legend.", lines: ['all tiers cleared.'] };
  }
  const { tier, missing } = nextTier;
  const lines = [];
  if (missing.points > 0) {
    const suffix = missing.activity > 0
      ? ` (${missing.activity.toLocaleString()} from real usage)`
      : '';
    lines.push(`${missing.points.toLocaleString()} more points${suffix}`);
  } else if (missing.activity > 0) {
    lines.push(`${missing.activity.toLocaleString()} more activity points`);
  }
  if (missing.referrals > 0) {
    lines.push(`${missing.referrals} more referral${missing.referrals === 1 ? '' : 's'} needed`);
  }
  if (lines.length === 0 && nextTier.applyAvailable) {
    lines.push('you qualify — tap apply below');
  } else if (lines.length === 0) {
    lines.push('all set for the next tier.');
  }
  return { title: `to ${tier.label || tier.id}`, lines };
}

// ═══════════════════════════════════════════════════════════════════════
// MEMBERS CARD — clear pending vs verified breakdown
// ═══════════════════════════════════════════════════════════════════════
const MembersCard = memo(({ referralCount, verifiedCount = 0, onShare }) => {
  const membersToShow = Math.min(referralCount, 5);
  const extras = Math.max(0, referralCount - 5);
  const pendingCount = Math.max(0, referralCount - verifiedCount);
  const AVATAR_COLORS = [T.ink, T.yellow, T.inkSoft, T.yellow, T.ink];

  // ── Empty state ──
  if (referralCount === 0) {
    return (
      <View style={styles.membersCard}>
        <View style={styles.membersTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.membersLabel}>your crew</Text>
            <Text style={styles.membersCount}>
              0<Text style={styles.membersCountSub}> members</Text>
            </Text>
            <Text style={styles.membersSub}>
              invite friends — you earn when they sort a card.
            </Text>
          </View>
          <TouchableOpacity style={styles.inviteBtn} onPress={onShare} activeOpacity={0.85}>
            <LinearGradient
              colors={[T.yellow, T.yellow]}
              style={styles.inviteGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="share-social-outline" size={13} color={T.ink} />
              <Text style={styles.inviteText}>invite</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyMembersBox}>
          <Ionicons name="people-outline" size={16} color={T.textFaint} />
          <Text style={styles.emptyMembersText}>
            no members yet. share your code to get started.
          </Text>
        </View>
      </View>
    );
  }

  // ── Non-empty state ──
  return (
    <View style={styles.membersCard}>
      <View style={styles.membersTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.membersLabel}>your crew</Text>
          <Text style={styles.membersCount}>
            {referralCount}
            <Text style={styles.membersCountSub}>
              {' '}{referralCount === 1 ? 'member' : 'members'}
            </Text>
          </Text>

          {/* ── Always show verified vs pending breakdown ── */}
          <View style={styles.membersStatusRow}>
            <View style={styles.membersStatusPill}>
              <View style={[styles.statusDot, { backgroundColor: T.success }]} />
              <Text style={styles.membersStatusText}>
                {verifiedCount} verified
              </Text>
            </View>
            {pendingCount > 0 && (
              <View style={styles.membersStatusPill}>
                <View style={[styles.statusDot, { backgroundColor: T.yellow }]} />
                <Text style={styles.membersStatusText}>
                  {pendingCount} pending sort
                </Text>
              </View>
            )}
          </View>

          {pendingCount > 0 ? (
            <Text style={styles.membersSub}>
              +100 lands when they sort their first card.
            </Text>
          ) : (
            <Text style={styles.membersSub}>
              all {referralCount} members verified. 🎉
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.inviteBtn} onPress={onShare} activeOpacity={0.85}>
          <LinearGradient
            colors={[T.yellow, T.yellow]}
            style={styles.inviteGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="share-social-outline" size={13} color={T.ink} />
            <Text style={styles.inviteText}>invite</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.avatarStackRow}>
        {Array.from({ length: membersToShow }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.avatarCircle,
              {
                backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                marginLeft: i === 0 ? 0 : -10,
                zIndex: 10 - i,
              },
            ]}
          >
            <Ionicons name="person" size={14} color={T.white} />
          </View>
        ))}
        {extras > 0 && (
          <View
            style={[
              styles.avatarCircle,
              styles.avatarExtras,
              { marginLeft: -10, zIndex: 0 },
            ]}
          >
            <Text style={styles.avatarExtrasText}>+{extras}</Text>
          </View>
        )}
        <Text style={styles.avatarStackLabel}>
          {referralCount === 1
            ? 'your first member'
            : `${referralCount} members strong`}
        </Text>
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// LEVEL CARD — 3-condition progress
// ═══════════════════════════════════════════════════════════════════════
const LevelCard = memo(
  ({ level, index, userLifetime, userActivity, userReferrals, tiersIssued, onPress, isCurrent }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const hasAnimated = useRef(false);

    const isUnlocked = tiersIssued.includes(level.id);
    const isNext = !isUnlocked && (index === 0 || tiersIssued.includes(LEVELS[index - 1]?.id));

    const progressPoints = Math.min(userLifetime / level.points, 1);
    const progressActivity = Math.min(userActivity / Math.max(level.activityFloor, 1), 1);
    const progressReferrals = Math.min(userReferrals / Math.max(level.referrals, 1), 1);

    useEffect(() => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      const delay = Math.min(index * 60, 220);
      InteractionManager.runAfterInteractions(() => {
        Animated.parallel([
          Animated.timing(cardAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, delay, useNativeDriver: true }),
        ]).start();
      });
      if (isUnlocked) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(shimmerAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
            Animated.timing(shimmerAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
          ])
        ).start();
      }
      return () => {
        cardAnim.stopAnimation();
        scaleAnim.stopAnimation();
        shimmerAnim.stopAnimation();
      };
    }, []);

    const shimmerTransform = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-120, 320],
    });

    const handlePress = () => { if (isUnlocked) onPress && onPress(level); };

    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85} disabled={!isUnlocked}>
        <Animated.View
          style={[
            styles.levelCard,
            isUnlocked && styles.levelCardUnlocked,
            isCurrent && styles.levelCardCurrent,
            isNext && styles.levelCardNext,
            { opacity: cardAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {isUnlocked && (
            <Animated.View
              style={[styles.levelShimmer, { transform: [{ translateX: shimmerTransform }] }]}
            />
          )}

          <LinearGradient
            colors={isUnlocked ? level.gradient : [T.sand, T.sand]}
            style={styles.levelIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons
              name={level.icon}
              size={26}
              color={isUnlocked ? T.yellow : T.textFaint}
            />
          </LinearGradient>

          <View style={styles.levelContent}>
            <View style={styles.levelHeader}>
              <View style={styles.levelNameRow}>
                <View style={[styles.levelNumPill, isCurrent && styles.levelNumPillCurrent, !isUnlocked && styles.levelNumPillLocked]}>
                  <Text style={[styles.levelNumText, isCurrent && styles.levelNumTextCurrent, !isUnlocked && styles.levelNumTextLocked]}>
                    level {index + 1}
                  </Text>
                </View>
                <Text style={styles.levelName}>{level.name}</Text>
              </View>
              {isCurrent ? (
                <View style={[styles.unlockedBadge, styles.currentBadge]}>
                  <Ionicons name="star" size={12} color={T.ink} />
                  <Text style={styles.unlockedText}>your level</Text>
                </View>
              ) : isUnlocked ? (
                <View style={styles.unlockedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={T.ink} />
                  <Text style={styles.unlockedText}>unlocked</Text>
                </View>
              ) : isNext ? (
                <View style={styles.nextBadge}>
                  <Text style={styles.nextText}>next</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.levelReward}>{level.reward}</Text>

            <View style={styles.condRow}>
              <CondBar
                label="points"
                current={userLifetime}
                target={level.points}
                progress={progressPoints}
                color={level.color}
                locked={!isUnlocked}
              />
              <CondBar
                label="activity"
                current={userActivity}
                target={level.activityFloor}
                progress={progressActivity}
                color={level.color}
                locked={!isUnlocked}
              />
              <CondBar
                label="referrals"
                current={userReferrals}
                target={level.referrals}
                progress={progressReferrals}
                color={level.color}
                locked={!isUnlocked}
                hideIfZero={level.referrals === 0}
              />
            </View>

            <View style={styles.perksRow}>
              {level.perks.slice(0, 3).map((p, i) => (
                <View key={i} style={styles.perkItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={11}
                    color={isUnlocked ? level.color : T.textFaint}
                  />
                  <Text style={[styles.perkText, isUnlocked && styles.perkTextActive]}>{p}</Text>
                </View>
              ))}
              {level.perks.length > 3 && (
                <View style={styles.perkItem}>
                  <Text style={styles.perkText}>+{level.perks.length - 3} more</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }
);

const CondBar = ({ label, current, target, progress, color, locked, hideIfZero }) => {
  if (hideIfZero) return null;
  return (
    <View style={styles.condItem}>
      <View style={styles.condTopRow}>
        <Text style={[styles.condLabel, locked && styles.condLabelLocked]}>{label}</Text>
        <Text style={[styles.condValue, locked && styles.condValueLocked]}>
          {Math.min(current, target).toLocaleString()}/{target.toLocaleString()}
        </Text>
      </View>
      <View style={styles.condTrack}>
        <View
          style={[
            styles.condFill,
            {
              width: `${Math.min(progress * 100, 100)}%`,
              backgroundColor: locked ? T.sand : color,
            },
          ]}
        />
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// FOUNDER APPLY BANNER
// ═══════════════════════════════════════════════════════════════════════
const FounderApplyBanner = memo(({ onApply }) => (
  <View style={styles.applyBanner}>
    <MaterialCommunityIcons name="crown" size={28} color={T.yellow} />
    <View style={{ flex: 1 }}>
      <Text style={styles.applyBannerTitle}>founder circle — you qualify</Text>
      <Text style={styles.applyBannerSub}>50 seats total. MSB reviews each personally.</Text>
    </View>
    <TouchableOpacity style={styles.applyBtn} onPress={onApply} activeOpacity={0.85}>
      <Text style={styles.applyBtnText}>apply</Text>
      <Ionicons name="arrow-forward" size={14} color={T.ink} />
    </TouchableOpacity>
  </View>
));

// names for React DevTools / error messages (memo components are anonymous otherwise)
SkeletonLoader.displayName = "SkeletonLoader";
HeroPointsCard.displayName = "HeroPointsCard";
MembersCard.displayName = "MembersCard";
LevelCard.displayName = "LevelCard";
FounderApplyBanner.displayName = "FounderApplyBanner";

export { SkeletonLoader, HeroPointsCard, MembersCard, LevelCard, FounderApplyBanner };
