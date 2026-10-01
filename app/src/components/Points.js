// app/src/screens/PointsScreen.js
// the crew — points, levels, referrals
// WHITE #ffffff · GOLD #f9c349 · BLACK #1a1a1a

import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
  memo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Share,
  Alert,
  RefreshControl,
  Animated,
  InteractionManager,
  Platform,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import api from '../api/api';
import GuestGuard from './GuestGuard';
import Dot from '../engagement/components/Dot';
import { useEngagement } from '../engagement/hooks/useEngagement';
import { useReferrals } from '../engagement/hooks/useReferrals';

const { width } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════
// STORE LINKS
// ═══════════════════════════════════════════════════════════════════════
const PLAY_STORE_PACKAGE = 'com.aqkhan110.tdc';
const APP_STORE_ID = '6765877675';
const APP_STORE_URL = `https://apps.apple.com/br/app/the-deft-crew/id${APP_STORE_ID}`;
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

// ═══════════════════════════════════════════════════════════════════════
// LEVELS — mirrors config/badges.config.js
// ═══════════════════════════════════════════════════════════════════════
// LEVELS — mirrors config/badges.config.js
// icons: MaterialCommunityIcons · Gen Z/Alpha palette
// ═══════════════════════════════════════════════════════════════════════
const LEVELS = [
  {
    id: 'rookie',
    name: 'deft rookie',
    points: 300,
    activityFloor: 300,
    referrals: 0,
    icon: 'egg-easter',                 // 🥚 was: 'egg'
    color: '#00F5FF',                   // electric cyan
    gradient: ['#00F5FF', '#7B2FF7'],   // cyan → violet
    reward: 'digital badge with your name',
    perks: ['Digital badge'],
  },
  {
    id: 'starter',
    name: 'deft insider',
    points: 1000,
    activityFloor: 300,
    referrals: 10,
    icon: 'gamepad-variant',            // 👾 was: 'gamepad'
    color: '#39FF14',                   // neon lime
    gradient: ['#39FF14', '#00FFA3'],   // lime → mint
    reward: 'upgraded badge . verified starter status',
    perks: ['Upgraded badge', 'Starter status'],
  },
  {
    id: 'silver',
    name: 'deft main character',
    points: 2000,
    activityFloor: 600,
    referrals: 20,
    icon: 'star-four-points',           // ✨ was: 'sparkles'
    color: '#FF2E93',                   // hot pink
    gradient: ['#FF2E93', '#FF00E5'],   // pink → magenta
    reward: 'silver card . 10% off for 1 year (cap Rs 350) . tdc starter pack',
    perks: ['Silver card', '10% off, 1 year', 'tdc starter pack'],
    discount: { pct: 10, capRs: 350 },
  },
  {
    id: 'gold',
    name: 'deft pro',
    points: 3000,
    activityFloor: 900,
    referrals: 30,
    icon: 'lightning-bolt',             // ⚡ was: 'crown'
    color: '#FF8A00',                   // sunset orange
    gradient: ['#FF8A00', '#FFD600'],   // orange → gold
    reward: 'gold card . 15% off for 1 year (cap Rs 500) . Instagram feature . tdc essentials',
    perks: ['Gold card', '15% off, 1 year', 'Instagram feature'],
    discount: { pct: 15, capRs: 500 },
  },
  {
    id: 'platinum',
    name: 'deft goat',
    points: 6000,
    activityFloor: 1800,
    referrals: 40,
    icon: 'infinity',                   // 🐐 was: 'diamond-stone'
    color: '#A855F7',                   // aurora purple
    gradient: ['#A855F7', '#22D3EE'],   // purple → ice blue
    reward: 'platinum card . 20% off for 1 year (cap Rs 750) . tdc delux pack',
    perks: ['Platinum card', '20% off, 1 year', 'Ambassador cert'],
    discount: { pct: 20, capRs: 750 },
  },
  {
    id: 'founder',
    name: 'founder circle',
    points: 8000,
    activityFloor: 2400,
    referrals: 50,
    icon: 'rocket-launch',              // 🚀 was: 'crown-circle'
    color: '#FF0844',                   // fire red
    gradient: ['#FF0844', '#FFB199'],   // red → peach (2-stop for RN gradient)
    reward: 'founder card . 25% off (cap Rs 1000) . internship referral . signature box',
    perks: ['Founder card', '25% off, 1 year', 'Internship referral'],
    discount: { pct: 25, capRs: 1000 },
    requiresApply: true,
    maxSeats: 50,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════════
const SkeletonLoader = memo(() => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
    <View style={styles.header}>
      <View style={{ width: 38, height: 38, backgroundColor: '#E8ECF1', borderRadius: 12 }} />
      <View style={{ width: 100, height: 20, backgroundColor: '#E8ECF1', borderRadius: 6 }} />
      <View style={{ width: 38, height: 38, backgroundColor: '#E8ECF1', borderRadius: 12 }} />
    </View>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={{ margin: 16, padding: 24, backgroundColor: '#E8ECF1', borderRadius: 24, height: 180 }} />
      <View style={{ margin: 16, padding: 20, backgroundColor: '#E8ECF1', borderRadius: 20, height: 120 }} />
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
        colors={['#1a1a1a', '#2d2d2d']}
        style={styles.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.heroOrb1, { transform: [{ rotate: rotateInterpolate }] }]} />
        <Animated.View style={[styles.heroOrb2, { transform: [{ rotate: rotateInterpolate }] }]} />

        <View style={styles.heroContent}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>YOUR POINTS</Text>
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
  const AVATAR_COLORS = ['#6C63FF', '#FF6B6B', '#FFD93D', '#10b981', '#FF6B35'];

  // ── Empty state ──
  if (referralCount === 0) {
    return (
      <View style={styles.membersCard}>
        <View style={styles.membersTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.membersLabel}>YOUR CREW</Text>
            <Text style={styles.membersCount}>
              0<Text style={styles.membersCountSub}> members</Text>
            </Text>
            <Text style={styles.membersSub}>
              invite friends — you earn when they sort a card.
            </Text>
          </View>
          <TouchableOpacity style={styles.inviteBtn} onPress={onShare} activeOpacity={0.85}>
            <LinearGradient
              colors={['#f9c349', '#f5a623']}
              style={styles.inviteGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="share-social-outline" size={13} color="#1a1a1a" />
              <Text style={styles.inviteText}>invite</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyMembersBox}>
          <Ionicons name="people-outline" size={16} color="#999" />
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
          <Text style={styles.membersLabel}>YOUR CREW</Text>
          <Text style={styles.membersCount}>
            {referralCount}
            <Text style={styles.membersCountSub}>
              {' '}{referralCount === 1 ? 'member' : 'members'}
            </Text>
          </Text>

          {/* ── Always show verified vs pending breakdown ── */}
          <View style={styles.membersStatusRow}>
            <View style={styles.membersStatusPill}>
              <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.membersStatusText}>
                {verifiedCount} verified
              </Text>
            </View>
            {pendingCount > 0 && (
              <View style={styles.membersStatusPill}>
                <View style={[styles.statusDot, { backgroundColor: '#f9c349' }]} />
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
            colors={['#f9c349', '#f5a623']}
            style={styles.inviteGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="share-social-outline" size={13} color="#1a1a1a" />
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
            <Ionicons name="person" size={14} color="#fff" />
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
  ({ level, index, userLifetime, userActivity, userReferrals, tiersIssued, onPress }) => {
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
            colors={isUnlocked ? level.gradient : ['#f0f0f0', '#e8e8e8']}
            style={styles.levelIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons
              name={level.icon}
              size={26}
              color={isUnlocked ? '#fff' : '#999'}
            />
          </LinearGradient>

          <View style={styles.levelContent}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelName}>{level.name}</Text>
              {isUnlocked ? (
                <View style={styles.unlockedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#fff" />
                  <Text style={styles.unlockedText}>UNLOCKED</Text>
                </View>
              ) : isNext ? (
                <View style={styles.nextBadge}>
                  <Text style={styles.nextText}>NEXT</Text>
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
                    color={isUnlocked ? level.color : '#ccc'}
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
              backgroundColor: locked ? '#ddd' : color,
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
    <MaterialCommunityIcons name="crown" size={28} color="#FFD700" />
    <View style={{ flex: 1 }}>
      <Text style={styles.applyBannerTitle}>founder circle — you qualify</Text>
      <Text style={styles.applyBannerSub}>50 seats total. MSB reviews each personally.</Text>
    </View>
    <TouchableOpacity style={styles.applyBtn} onPress={onApply} activeOpacity={0.85}>
      <Text style={styles.applyBtnText}>apply</Text>
      <Ionicons name="arrow-forward" size={14} color="#1a1a1a" />
    </TouchableOpacity>
  </View>
));

// ═══════════════════════════════════════════════════════════════════════
// DOWNLOAD CARD
// ═══════════════════════════════════════════════════════════════════════
const DownloadCard = memo(({ referralCode }) => {
  const buildIosLink = () =>
    `${APP_STORE_URL}?referrer=utm_source%3Dshare%26utm_medium%3Dreferral%26utm_campaign%3D${referralCode || 'tdc'}`;
  const buildAndroidLink = () =>
    `${PLAY_STORE_URL}&referrer=utm_source%3Dshare%26utm_medium%3Dreferral%26utm_campaign%3D${referralCode || 'tdc'}`;

  const openIos = async () => {
    try {
      const nativeUrl = `itms-apps://apps.apple.com/br/app/id${APP_STORE_ID}`;
      const canOpen = await Linking.canOpenURL(nativeUrl);
      await Linking.openURL(canOpen ? nativeUrl : buildIosLink());
    } catch {
      await Linking.openURL(buildIosLink());
    }
  };

  const openAndroid = async () => {
    try {
      const nativeUrl = `market://details?id=${PLAY_STORE_PACKAGE}`;
      const canOpen = await Linking.canOpenURL(nativeUrl);
      await Linking.openURL(canOpen ? nativeUrl : buildAndroidLink());
    } catch {
      await Linking.openURL(buildAndroidLink());
    }
  };

  return (
    <View style={styles.downloadCard}>
      <Text style={styles.downloadTitle}>
        download tdc<Text style={{ color: '#f9c349' }}>.</Text>
      </Text>
      <Text style={styles.downloadSub}>tell a friend. crew points come with them.</Text>

      <View style={styles.storesRow}>
        <TouchableOpacity style={styles.storeBtn} onPress={openIos} activeOpacity={0.85}>
          <View style={styles.storeIconBox}>
            <Ionicons name="logo-apple" size={22} color="#fff" />
          </View>
          <View style={styles.storeTextCol}>
            <Text style={styles.storeSmall}>Download on the</Text>
            <Text style={styles.storeBig}>App Store</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.storeBtn} onPress={openAndroid} activeOpacity={0.85}>
          <View style={styles.storeIconBox}>
            <Ionicons name="logo-google-playstore" size={22} color="#fff" />
          </View>
          <View style={styles.storeTextCol}>
            <Text style={styles.storeSmall}>GET IT ON</Text>
            <Text style={styles.storeBig}>Google Play</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════
const PointsScreen = () => {
  const navigation = useNavigation();
  const { token, user } = useContext(AuthContext);
  const { me, refresh: refreshEngagement } = useEngagement();
  const {
    referralCode,
    rawCount,
    verifiedCount,
    pendingCount,
    referees,
    refresh: refreshReferrals,
  } = useReferrals();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const shareScale = useRef(new Animated.Value(1)).current;
  const heroPulse = useRef(new Animated.Value(1)).current;
  const isMounted = useRef(true);

  // ── Live data from `me` ──
  const balance = me?.points?.balance || 0;
  const lifetime = me?.points?.lifetime || 0;
  const lifetimeReferral = me?.points?.lifetimeReferral || 0;
  const activityPoints = me?.points?.activityPoints ?? (lifetime - lifetimeReferral);
  const tiersIssued = me?.level?.tiersIssued || [];
  const level = me?.level?.id || 'member';
  const nextTier = me?.nextTier || null;
  const applyAvailable = !!me?.nextTier?.applyAvailable;

  // ── Initial load ──
  useEffect(() => {
    isMounted.current = true;
    (async () => {
      await Promise.all([
        refreshEngagement?.(),
        refreshReferrals?.(),
      ]);
      if (isMounted.current) setLoading(false);
    })();
    return () => { isMounted.current = false; };
  }, [refreshEngagement, refreshReferrals]);

  const animateContent = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(headerFade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, headerFade]);

  useEffect(() => {
    if (!loading) animateContent();
  }, [loading, animateContent]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, { toValue: 1.015, duration: 1800, useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [heroPulse]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshEngagement?.(),
      refreshReferrals?.(),
    ]);
    if (isMounted.current) setRefreshing(false);
  }, [refreshEngagement, refreshReferrals]);

  const getShareLink = useCallback(() => {
    const code = referralCode || 'tdc';
    if (Platform.OS === 'ios') {
      return `${APP_STORE_URL}?referrer=utm_source%3Dshare%26utm_medium%3Dreferral%26utm_campaign%3D${code}`;
    }
    return `${PLAY_STORE_URL}&referrer=utm_source%3Dshare%26utm_medium%3Dreferral%26utm_campaign%3D${code}`;
  }, [referralCode]);

  const onShare = useCallback(async () => {
    Animated.sequence([
      Animated.timing(shareScale, { toValue: 0.95, duration: 60, useNativeDriver: true }),
      Animated.timing(shareScale, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();

    try {
      const msg =
        `join the crew.\n\n` +
        `use my code: ${referralCode || 'TDC'}\n\n` +
        `friend joins: you get +50. friend sorts a card: +100 more.\n\n` +
        `${getShareLink()}`;
      await Share.share({ message: msg, title: 'The Deft Crew' });
    } catch (e) {
      if (e.message !== 'User did not share') Alert.alert('Error', e.message);
    }
  }, [referralCode, getShareLink, shareScale]);

  const copyCode = useCallback(async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    Alert.alert('Copied!', `Your code ${referralCode} is in your clipboard.`);
  }, [referralCode]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleLevelPress = useCallback(
    (lvl) => {
      const map = {
        rookie: 'DigitalBadge',
        starter: 'DigitalBadge',
        silver: 'Silver',
        gold: 'MainCharacter',
        platinum: 'DeftPro',
        founder: 'FounderCircle',
      };
      const dest = map[lvl.id];
      if (dest) navigation.navigate(dest);
    },
    [navigation]
  );

  const handleFounderApply = useCallback(() => {
    navigation.navigate('FounderApply');
  }, [navigation]);

  if (loading) return <SkeletonLoader />;

  return (
    <GuestGuard
      title="View the crew"
      message="Sign in to see your points, level, and referral code."
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.headerBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            the crew<Text style={{ color: '#f9c349' }}>.</Text>
          </Text>
          <View style={{ width: 38 }} />
        </Animated.View>

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#f9c349"
              colors={['#f9c349']}
            />
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* ── HERO ── */}
            <HeroPointsCard
              balance={balance}
              lifetime={lifetime}
              level={level}
              nextTier={nextTier}
              pulse={heroPulse}
            />

            {/* ── MEMBERS — uses rawCount / verifiedCount ── */}
            <MembersCard
              referralCount={rawCount}
              verifiedCount={verifiedCount}
              onShare={onShare}
            />

            {/* ── CODE CARD ── */}
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>YOUR CODE</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{referralCode || '—'}</Text>
                <TouchableOpacity onPress={copyCode} style={styles.copyBtn} activeOpacity={0.7}>
                  <Ionicons name="copy-outline" size={18} color="#f9c349" />
                </TouchableOpacity>
              </View>
              <Text style={styles.codeHint}>
                friend joins: +50 pts. friend sorts first card: +100 more.
              </Text>

              <Animated.View style={{ transform: [{ scale: shareScale }] }}>
                <TouchableOpacity onPress={onShare} style={styles.shareBtn} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#f9c349', '#f5a623']}
                    style={styles.shareGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#1a1a1a" />
                    <Text style={styles.shareText}>Share My Code</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* ── WAYS TO EARN ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                ways to earn<Text style={{ color: '#f9c349' }}>.</Text>
              </Text>
              <Text style={styles.sectionSub}>only real use counts.</Text>

              <View style={styles.earnList}>
                {[
                  { mood: 'cheeky', label: 'a friend joins with your code', value: '+50' },
                  { mood: 'hype', label: 'they sort their first card', value: '+100 each' },
                  { mood: 'sorted', label: 'each mission you sort', value: '+50' },
                  { mood: 'excited', label: '7 / 30 / 100 day streak', value: '+50 / +250 / +1,000' },
                ].map((row, i) => (
                  <View key={i} style={styles.earnRow}>
                    <Dot mood={row.mood} size={28} animated={false} />
                    <Text style={styles.earnLabel}>{row.label}</Text>
                    <Text style={styles.earnValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── LEVELS ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                levels<Text style={{ color: '#f9c349' }}>.</Text>
              </Text>
              <Text style={styles.sectionSub}>
                total points + real activity + verified referrals.
              </Text>

              {LEVELS.map((lvl, idx) => (
                <LevelCard
                  key={lvl.id}
                  level={lvl}
                  index={idx}
                  userLifetime={lifetime}
                  userActivity={activityPoints}
                  userReferrals={verifiedCount}
                  tiersIssued={tiersIssued}
                  onPress={handleLevelPress}
                />
              ))}
            </View>

            {applyAvailable && <FounderApplyBanner onApply={handleFounderApply} />}

            <DownloadCard referralCode={referralCode} />

            <Text style={styles.footerNote}>
              <Ionicons name="information-circle-outline" size={13} color="#f9c349" />{' '}
              crew points are earned by using the app. levels never drop, even when you spend.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GuestGuard>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.6,
  },
  scrollContent: { paddingBottom: 40 },

  // Hero
  heroCard: {
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
  },
  heroGradient: { padding: 24, position: 'relative', overflow: 'hidden' },
  heroOrb1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(249,195,73,0.05)', top: -90, right: -70,
  },
  heroOrb2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(249,195,73,0.03)', bottom: -50, left: -50,
  },
  heroContent: { position: 'relative', zIndex: 1 },
  heroHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.55)', fontSize: 11,
    fontWeight: '800', letterSpacing: 1.6,
  },
  levelBadge: {
    backgroundColor: '#f9c349', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
  },
  levelBadgeText: { color: '#1a1a1a', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  heroBalance: { color: '#fff', fontSize: 44, fontWeight: '900', letterSpacing: -1.4, marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 12 },
  progressTextWrap: { flex: 1 },
  progressTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  progressSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500', lineHeight: 16 },

  // Members
  membersCard: {
    marginHorizontal: 16, marginTop: 4, padding: 16,
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#f0f0f0',
  },
  membersTopRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 12,
  },
  membersLabel: { fontSize: 10, color: '#888', fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  membersCount: { fontSize: 26, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
  membersCountSub: { fontSize: 14, fontWeight: '700', color: '#888' },
  membersSub: { fontSize: 11, color: '#888', fontWeight: '500', marginTop: 6 },
  inviteBtn: { borderRadius: 12, overflow: 'hidden' },
  inviteGradient: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, gap: 5,
  },
  inviteText: { color: '#1a1a1a', fontSize: 12, fontWeight: '800' },
  avatarStackRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarExtras: { backgroundColor: '#1a1a1a' },
  avatarExtrasText: { color: '#f9c349', fontSize: 11, fontWeight: '900' },
  avatarStackLabel: { marginLeft: 12, fontSize: 12, color: '#666', fontWeight: '600' },
  emptyMembersBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: '#f8f9fc', borderRadius: 12, marginTop: 12,
  },
  emptyMembersText: { fontSize: 11, color: '#999', fontWeight: '500', flex: 1 },

  // Members status pills (NEW)
  membersStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  membersStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8f9fc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  membersStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Code
  codeCard: {
    marginHorizontal: 16, marginTop: 12, padding: 18,
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#f0f0f0',
  },
  codeLabel: { fontSize: 11, color: '#888', fontWeight: '800', letterSpacing: 1.4, marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeText: { flex: 1, fontSize: 26, fontWeight: '900', color: '#f9c349', letterSpacing: 2 },
  copyBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#f9c34940',
  },
  codeHint: { fontSize: 12, color: '#666', fontWeight: '500', marginTop: 10, lineHeight: 17 },
  shareBtn: { marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  shareGradient: {
    flexDirection: 'row', paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  shareText: { color: '#1a1a1a', fontWeight: '800', fontSize: 14 },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 22 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
  sectionSub: {
    fontSize: 12, color: '#888', fontWeight: '500',
    marginTop: 2, marginBottom: 12,
  },

  // Earn list
  earnList: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1.5, borderColor: '#f0f0f0', padding: 6,
  },
  earnRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 12,
  },
  earnLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  earnValue: { fontSize: 13, fontWeight: '900', color: '#10b981' },

  // Level card
  levelCard: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 2, borderColor: '#f0f0f0',
    alignItems: 'flex-start', position: 'relative', overflow: 'hidden',
  },
  levelCardUnlocked: {
    borderColor: '#f9c349', backgroundColor: '#FFFDF5',
    shadowColor: '#f9c349', shadowOpacity: 0.08,
    shadowRadius: 10, elevation: 3,
  },
  levelCardNext: { borderColor: '#f9c349', borderStyle: 'dashed' },
  levelShimmer: {
    position: 'absolute', top: 0, left: 0,
    width: 120, height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{ skewX: '-20deg' }],
  },
  levelIconContainer: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  levelContent: { flex: 1 },
  levelHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
  },
  levelName: { fontSize: 13, fontWeight: '900', color: '#1a1a1a', letterSpacing: 0.3 },
  unlockedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9c349', paddingHorizontal: 9,
    paddingVertical: 3, borderRadius: 12, gap: 4,
  },
  unlockedText: { color: '#1a1a1a', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  nextBadge: {
    backgroundColor: '#f0f0f0', paddingHorizontal: 9,
    paddingVertical: 3, borderRadius: 12,
  },
  nextText: { color: '#666', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  levelReward: {
    fontSize: 12, color: '#666', fontWeight: '500',
    marginTop: 4, lineHeight: 16,
  },

  condRow: { marginTop: 10, gap: 6 },
  condItem: {},
  condTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 3,
  },
  condLabel: {
    fontSize: 10, fontWeight: '800', color: '#666',
    letterSpacing: 0.4, textTransform: 'lowercase',
  },
  condLabelLocked: { color: '#bbb' },
  condValue: { fontSize: 10, fontWeight: '800', color: '#1a1a1a' },
  condValueLocked: { color: '#bbb' },
  condTrack: {
    height: 4, backgroundColor: '#f0f0f0',
    borderRadius: 2, overflow: 'hidden',
  },
  condFill: { height: '100%', borderRadius: 2 },

  perksRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  perkItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 8, gap: 4,
  },
  perkText: { fontSize: 10, color: '#999', fontWeight: '600' },
  perkTextActive: { color: '#1a1a1a' },

  // Apply banner
  applyBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 8, padding: 16,
    borderRadius: 18, backgroundColor: '#1a1a1a', gap: 12,
  },
  applyBannerTitle: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  applyBannerSub: {
    color: 'rgba(255,255,255,0.6)', fontSize: 11,
    marginTop: 2, fontWeight: '500',
  },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFD700', paddingHorizontal: 14,
    paddingVertical: 9, borderRadius: 10, gap: 4,
  },
  applyBtnText: { color: '#1a1a1a', fontWeight: '900', fontSize: 12 },

  // Download
  downloadCard: {
    marginHorizontal: 16, marginTop: 22, padding: 18,
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#f0f0f0',
  },
  downloadTitle: { fontSize: 18, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.4 },
  downloadSub: {
    fontSize: 12, color: '#888', fontWeight: '500',
    marginTop: 2, marginBottom: 14,
  },
  storesRow: { flexDirection: 'row', gap: 10 },
  storeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', paddingVertical: 12,
    paddingHorizontal: 12, borderRadius: 14, gap: 10,
  },
  storeIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  storeTextCol: { flex: 1 },
  storeSmall: {
    color: 'rgba(255,255,255,0.65)', fontSize: 9,
    fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  storeBig: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 1 },

  footerNote: {
    textAlign: 'center', color: '#999',
    fontSize: 11, marginTop: 22,
    paddingHorizontal: 24, fontWeight: '500',
  },
});

export default PointsScreen;