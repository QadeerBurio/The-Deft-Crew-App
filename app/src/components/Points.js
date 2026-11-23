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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import api from '../api/api';
import GuestGuard from './GuestGuard';
import Dot from '../engagement/components/Dot';
import { useEngagement } from '../engagement/hooks/useEngagement';
import { useReferrals } from '../engagement/hooks/useReferrals';

import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import ScreenHeader from "../ui/ScreenHeader";
import PressScale from "../ui/PressScale";
import AmbassadorForm, { isAllowed as isAmbassadorFormUrl } from "./AmbassadorForm";
import { plainError } from "../utils/plainError";
import { copyToClipboard } from '../utils/clipboard';
// P1 (flags growthV2 / shareCards): invite links, WhatsApp first, the leaderboard, share cards
import useFlag from '../hooks/useFlag';
import { FLAGS } from '../api/upgradeFlags';
import { inviteLink, inviteMessage } from '../growth/inviteLinks';
import ReferralLeaderboard from './crew/ReferralLeaderboard';
import ShareCardSheet from '../ui/ShareCard';
import { funnel } from '../analytics/funnel';
import { LEVELS } from './crew/levels';
import { SkeletonLoader, HeroPointsCard, MembersCard, LevelCard, FounderApplyBanner } from './crew/PointsCards';
import { styles } from './crew/pointsStyles';
const { width } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════
// STORE LINKS
// ═══════════════════════════════════════════════════════════════════════
const PLAY_STORE_PACKAGE = 'com.aqkhan110.tdc';
const APP_STORE_ID = '6765877675';
const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`; // country-neutral: Apple sends each visitor to their own store
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

// Ambassador Google Form (docs.google.com/forms/… or forms.gle/…). Until this is a real
// form link the "join as ambassador" button is not shown.
const AMBASSADOR_FORM_URL = 'https://forms.gle/SvXWgyunW7BCibxB8';
const AMBASSADOR_FORM_READY = isAmbassadorFormUrl(AMBASSADOR_FORM_URL);
// "applied" is kept on this phone per student (no server change)
const AMBASSADOR_KEY = (userId) => `@tdc_ambassador_applied:${userId}`;


// ═══════════════════════════════════════════════════════════════════════
// DOWNLOAD CARD
// ═══════════════════════════════════════════════════════════════════════
// "join as ambassador": the download card's own container (same width and look) as one
// pressable row, icon box like the store buttons'. Disabled look once applied.
const AmbassadorCard = memo(({ applied, onPress }) => (
  <PressScale
    onPress={applied ? undefined : onPress}
    disabled={applied}
    scaleTo={0.98}
    style={[styles.downloadCard, styles.ambassadorCard, applied && styles.ambassadorApplied]}
    accessibilityRole="button"
    accessibilityState={{ disabled: !!applied }}
    accessibilityLabel={applied ? 'applied as ambassador' : 'join as ambassador, opens the application form'}
  >
    <View style={[styles.storeIconBox, styles.ambassadorIcon, applied && styles.ambassadorIconApplied]}>
      <Ionicons name={applied ? 'checkmark' : 'megaphone-outline'} size={20} color={applied ? T.textFaint : T.yellow} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.downloadTitle, applied && { color: T.textFaint }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {applied ? 'applied' : 'join as ambassador'}
        {!applied && <Text style={{ color: T.yellow }}>.</Text>}
      </Text>
      <Text style={styles.ambassadorSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {applied ? "we'll be in touch." : 'bring the crew to your campus.'}
      </Text>
    </View>
    {!applied && <Ionicons name="chevron-forward" size={18} color={T.ink} />}
  </PressScale>
));

const DownloadCard = memo(({ referralCode, style }) => {
  const buildIosLink = () =>
    `${APP_STORE_URL}?referrer=utm_source%3Dshare%26utm_medium%3Dreferral%26utm_campaign%3D${referralCode || 'tdc'}`;
  const buildAndroidLink = () =>
    `${PLAY_STORE_URL}&referrer=utm_source%3Dshare%26utm_medium%3Dreferral%26utm_campaign%3D${referralCode || 'tdc'}`;

  const openIos = async () => {
    try {
      const nativeUrl = `itms-apps://apps.apple.com/app/id${APP_STORE_ID}`;
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
    <View style={[styles.downloadCard, style]}>
      <Text style={styles.downloadTitle}>
        download tdc<Text style={{ color: T.yellow }}>.</Text>
      </Text>
      <Text style={styles.downloadSub}>tell a friend. crew points come with them.</Text>

      <View style={styles.storesRow}>
        <TouchableOpacity style={styles.storeBtn} onPress={openIos} activeOpacity={0.85}>
          <View style={styles.storeIconBox}>
            <Ionicons name="logo-apple" size={22} color={T.white} />
          </View>
          <View style={styles.storeTextCol}>
            <Text style={styles.storeSmall}>download on the</Text>
            <Text style={styles.storeBig}>app store</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.storeBtn} onPress={openAndroid} activeOpacity={0.85}>
          <View style={styles.storeIconBox}>
            <Ionicons name="logo-google-playstore" size={22} color={T.white} />
          </View>
          <View style={styles.storeTextCol}>
            <Text style={styles.storeSmall}>get it on</Text>
            <Text style={styles.storeBig}>google play</Text>
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
  const growth = useFlag(FLAGS.growthV2) === true;
  const cardsOn = useFlag(FLAGS.shareCards) === true;
  const [cardOpen, setCardOpen] = useState(false);
  const { me, refresh: refreshEngagement } = useEngagement();
  const [ambassadorFormOpen, setAmbassadorFormOpen] = useState(false);
  // this student's own applied flag; another account (or a guest) never sees it
  const ambassadorUserId = token ? user?._id || user?.id || null : null;
  const [ambassadorApplied, setAmbassadorApplied] = useState(false);
  const readAmbassador = useCallback(() => {
    if (!ambassadorUserId) {
      setAmbassadorApplied(false);
      return undefined;
    }
    let alive = true;
    AsyncStorage.getItem(AMBASSADOR_KEY(ambassadorUserId))
      .then((v) => alive && setAmbassadorApplied(v === '1'))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ambassadorUserId]);
  useEffect(() => {
    setAmbassadorApplied(false); // account changed: start from this account's own value
    return readAmbassador();
  }, [readAmbassador]);
  useFocusEffect(readAmbassador); // back on the screen: read again
  const onAmbassadorSubmitted = useCallback(() => {
    setAmbassadorFormOpen(false);
    if (!ambassadorUserId) return;
    setAmbassadorApplied(true);
    AsyncStorage.setItem(AMBASSADOR_KEY(ambassadorUserId), '1').catch(() => {});
  }, [ambassadorUserId]);
  const {
    referralCode,
    rawCount,
    verifiedCount,
    pendingCount,
    referees,
    refresh: refreshReferrals,
  } = useReferrals();

  // Show at once when engagement data is already loaded; refresh quietly
  const [loading, setLoading] = useState(!me);
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
  // the student's current level = the highest level they have unlocked (yellow marks only this one)
  const currentLevelIdx = LEVELS.reduce((acc, l, i) => (tiersIssued.includes(l.id) ? i : acc), -1);
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
    if (growth && referralCode) return inviteLink(referralCode, 'direct'); // P1: the invite page (gettdc.pk/i/CODE)
    if (Platform.OS === 'ios') {
      return `${APP_STORE_URL}?referrer=utm_source%3Dshare%26utm_medium%3Dreferral%26utm_campaign%3D${code}`;
    }
    return `${PLAY_STORE_URL}&referrer=utm_source%3Dshare%26utm_medium%3Dreferral%26utm_campaign%3D${code}`;
  }, [referralCode, growth]);

  const onShare = useCallback(async () => {
    Animated.sequence([
      Animated.timing(shareScale, { toValue: 0.95, duration: 60, useNativeDriver: true }),
      Animated.timing(shareScale, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();

    try {
      const msg = growth && referralCode ? inviteMessage(referralCode, 'direct') :
        `join the crew.\n\n` +
        `use my code: ${referralCode || 'TDC'}\n\n` +
        `friend joins: you get +50. friend sorts a card: +100 more.\n\n` +
        `${getShareLink()}`;
      await Share.share({ message: msg, title: 'The Deft Crew' });
    } catch (e) {
      if (e.message !== 'User did not share') Alert.alert('Error', plainError(e, "Couldn't open sharing. Please try again."));
    }
  }, [referralCode, getShareLink, shareScale, growth]);

  // P1 (growthV2): WhatsApp first (most used in Pakistan); without WhatsApp, the normal share sheet
  const onShareWhatsApp = useCallback(async () => {
    if (!referralCode) return;
    const text = inviteMessage(referralCode, 'wa');
    try {
      const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else await Share.share({ message: text, title: 'The Deft Crew' });
    } catch (e) {
      Alert.alert('Error', plainError(e, "Couldn't open sharing. Please try again."));
    }
  }, [referralCode]);

  const copyCode = useCallback(async () => {
    if (!referralCode) return;
    await copyToClipboard(referralCode, { title: 'Copied!', message: `Your code ${referralCode} is in your clipboard.` });
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
    navigation.navigate('FounderCircle'); // the founder tier's screen (there is no separate apply route)
  }, [navigation]);

  if (loading) return <SkeletonLoader />;

  return (
    <GuestGuard
      title="View the crew"
      message="Sign in to see your points, level, and referral code."
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

        <Animated.View style={{ opacity: headerFade }}>
          <ScreenHeader title="the crew" onBack={handleGoBack} />
        </Animated.View>

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={T.yellow}
              colors={[T.yellow]}
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
              <Text style={styles.codeLabel}>your code</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{referralCode || '—'}</Text>
                <TouchableOpacity onPress={copyCode} style={styles.copyBtn} activeOpacity={0.7}>
                  <Ionicons name="copy-outline" size={18} color={T.yellow} />
                </TouchableOpacity>
              </View>
              <Text style={styles.codeHint}>
                {growth
                  ? 'your friend gets 100 points and you get 150 when they join and verify their email.'
                  : 'friend joins: +50 pts. friend sorts first card: +100 more.'}
              </Text>

              {growth && (
                <TouchableOpacity onPress={onShareWhatsApp} style={[styles.shareBtn, { marginBottom: 8 }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="share on whatsapp">
                  <LinearGradient colors={[T.yellow, T.yellow]} style={styles.shareGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="logo-whatsapp" size={18} color={T.ink} />
                    <Text style={styles.shareText}>share on whatsapp</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <Animated.View style={{ transform: [{ scale: shareScale }] }}>
                <TouchableOpacity onPress={onShare} style={styles.shareBtn} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[T.yellow, T.yellow]}
                    style={styles.shareGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="share-social-outline" size={18} color={T.ink} />
                    <Text style={styles.shareText}>{growth ? 'more ways to share' : 'share my code'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              {cardsOn && !!referralCode && (
                <TouchableOpacity onPress={() => setCardOpen(true)} accessibilityRole="button" accessibilityLabel="share as image" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                  <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: T.yellow, textDecorationLine: 'underline' }}>share as image</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── P1-4: top inviters (growthV2) ── */}
            {growth && <ReferralLeaderboard universityId={user?.university?._id || user?.university || null} />}
            {cardsOn && !!referralCode && (
              <ShareCardSheet visible={cardOpen} onClose={() => setCardOpen(false)} variant="invite" code={referralCode} onShared={(v) => funnel(`share_card_${String(v).toLowerCase()}`)} />
            )}

            {/* ── WAYS TO EARN ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                ways to earn<Text style={{ color: T.yellow }}>.</Text>
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
                levels<Text style={{ color: T.yellow }}>.</Text>
              </Text>
              <Text style={styles.sectionSub}>
                total points + real activity + verified referrals.
              </Text>

              {LEVELS.map((lvl, idx) => (
                <LevelCard
                  key={lvl.id}
                  level={lvl}
                  index={idx}
                  isCurrent={idx === currentLevelIdx}
                  userLifetime={lifetime}
                  userActivity={activityPoints}
                  userReferrals={verifiedCount}
                  tiersIssued={tiersIssued}
                  onPress={handleLevelPress}
                />
              ))}
            </View>

            {applyAvailable && <FounderApplyBanner onApply={handleFounderApply} />}

            {AMBASSADOR_FORM_READY && (
              <AmbassadorCard applied={ambassadorApplied} onPress={() => setAmbassadorFormOpen(true)} />
            )}
            {/* 12 apart when the ambassador card sits above it, so the two read as a pair */}
            <DownloadCard referralCode={referralCode} style={AMBASSADOR_FORM_READY ? styles.downloadAfterAmbassador : null} />

            <Text style={styles.footerNote}>
              <Ionicons name="information-circle-outline" size={13} color={T.yellow} />{' '}
              crew points are earned by using the app. levels never drop, even when you spend.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
      {AMBASSADOR_FORM_READY && (
        <AmbassadorForm
          visible={ambassadorFormOpen}
          url={AMBASSADOR_FORM_URL}
          onClose={() => setAmbassadorFormOpen(false)}
          onSubmitted={onAmbassadorSubmitted}
        />
      )}
    </GuestGuard>
  );
};


// names for React DevTools / error messages (memo components are anonymous otherwise)
AmbassadorCard.displayName = "AmbassadorCard";
DownloadCard.displayName = "DownloadCard";

export default PointsScreen;