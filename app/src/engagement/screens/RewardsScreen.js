// app/src/engagement/screens/RewardsScreen.js
// Modern design · WHITE #ffffff · GOLD #f9c349 · BLACK #0f0f0f
// Live ledger + recent activity + View All modal + CSV export.

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  FlatList,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import engagementApi from '../api/engagementApi';
import { useEngagement } from '../hooks/useEngagement';
import { success as hapticSuccess, warn, pop } from '../utils/haptics';

const GOLD = '#f9c349';
const BLACK = '#0f0f0f';
const WHITE = '#ffffff';

const RECENT_LIMIT = 10;
const PAGE_SIZE = 200;

const LEVELS = [
  { id: 'member',              label: 'member',              min: 0 },
  { id: 'deft rookie',         label: 'deft rookie',         min: 300 },
  { id: 'deft main character', label: 'deft main character', min: 1000 },
  { id: 'deft pro',            label: 'deft pro',            min: 3000 },
  { id: 'deft goat',           label: 'deft goat',           min: 6000 },
  { id: 'founder circle',      label: 'founder circle',      min: 8000 },
];

// ─── Reason → icon + label + detail ──────────────────────────────────
// Full-reason keys checked BEFORE prefix keys.
const REASON_MAP = {
  // Earn: missions
  mission_sorted:      { icon: 'trophy-outline',                label: 'mission sorted',     detail: 'sorted a card' },
  fully_sorted:        { icon: 'checkmark-done-outline',        label: 'fully sorted',       detail: 'all 8 missions complete' },

  // Earn: streaks
  streak_milestone:    { icon: 'flame-outline',                 label: 'streak milestone',   detail: '7 / 30 / 100 day streak' },

  // Earn: referrals (full keys win)
  'referral:signup_bonus': { icon: 'person-add-outline',        label: 'friend joined',      detail: '+50 for the invite' },
  'referral:verified':     { icon: 'checkmark-circle-outline',  label: 'referral verified',  detail: 'friend sorted their first card' },
  'referral:welcome':      { icon: 'sparkles-outline',          label: 'welcome bonus',      detail: 'you joined via a friend' },
  'referral:welcome_bonus':{ icon: 'sparkles-outline',          label: 'welcome bonus',      detail: 'you joined via a friend' },
  referral:                { icon: 'share-social-outline',      label: 'referral bonus',     detail: 'friend joined or sorted' },

  // Earn: wallet / system
  welcome_bonus:       { icon: 'sparkles-outline',              label: 'welcome bonus',      detail: 'joined the crew' },
  admin_adjust:        { icon: 'construct-outline',             label: 'admin adjustment',   detail: 'manual change' },

  // Earn: badges (full keys)
  badge:               { icon: 'ribbon-outline',                label: 'badge unlocked',     detail: 'achievement bonus' },
  'badge:fully_sorted':{ icon: 'checkmark-done-outline',        label: 'fully sorted badge', detail: 'all 8 missions complete' },
  'badge:saved_5k':    { icon: 'cash-outline',                  label: 'saved 5k badge',     detail: 'kept money in your pocket' },
  'badge:saved_10k':   { icon: 'cash-outline',                  label: 'saved 10k badge',    detail: 'big saver' },
  'badge:streak_7':    { icon: 'flame-outline',                 label: '7-day badge',        detail: 'kept showing up' },
  'badge:streak_30':   { icon: 'flame-outline',                 label: '30-day badge',       detail: 'a month of consistency' },
  'badge:streak_100':  { icon: 'flame-outline',                 label: '100-day badge',      detail: 'unreal' },

  // Earn: social
  drop_reacted:        { icon: 'chatbubble-ellipses-outline',   label: "today's drop",       detail: 'reacted to the drop' },

  // Spend
  reward_redeemed:     { icon: 'gift-outline',                  label: 'reward redeemed',    detail: 'spent points' },
  reward_refund:       { icon: 'refresh-outline',               label: 'reward refund',      detail: 'points returned' },
};

const getReasonMeta = (reason) => {
  if (!reason) return { icon: 'star-outline', label: 'earned', detail: '' };
  if (REASON_MAP[reason]) return REASON_MAP[reason];
  const key = reason.split(':')[0];
  if (REASON_MAP[key]) return REASON_MAP[key];
  return { icon: 'star-outline', label: key.replace(/_/g, ' '), detail: '' };
};

// ─── CSV export ──────────────────────────────────────────────────────
const csvEscape = (v) => {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
};

const buildCsv = (rows) => {
  const headers = ['Date', 'Reason', 'Detail', 'Delta (pts)', 'Balance After'];
  const lines = [headers.join(',')];
  for (const t of rows) {
    const meta = getReasonMeta(t.reason);
    lines.push([
      csvEscape(new Date(t.createdAt).toISOString()),
      csvEscape(meta.label),
      csvEscape(meta.detail),
      csvEscape(t.delta),
      csvEscape(t.balanceAfter ?? ''),
    ].join(','));
  }
  return lines.join('\n');
};

export default function RewardsScreen() {
  const navigation = useNavigation();
  const { me, refresh } = useEngagement();

  const [rewards, setRewards] = useState([]);
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [ledgerCursor, setLedgerCursor] = useState(null);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);
  const [ledgerFull, setLedgerFull] = useState(null);
  const [ledgerFullCursor, setLedgerFullCursor] = useState(null);
  const [ledgerFullLoading, setLedgerFullLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);

  const [showAllModal, setShowAllModal] = useState(false);

  const balance = me?.points?.balance || 0;
  const lifetime = me?.points?.lifetime || 0;
  const levelId = me?.level?.id || me?.points?.level || 'member';

  const currentIdx = Math.max(0, LEVELS.findIndex((l) => l.id === levelId));
  const currentLevel = LEVELS[currentIdx] || LEVELS[0];
  const nextLevel = LEVELS[currentIdx + 1] || null;
  const pointsToNext = nextLevel ? Math.max(0, nextLevel.min - lifetime) : 0;
  const progressPct = nextLevel
    ? Math.min(1, (lifetime - currentLevel.min) / (nextLevel.min - currentLevel.min))
    : 1;

  // ─── Load ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [list, mine, led] = await Promise.all([
        engagementApi.getRewards().catch((e) => {
          console.log('[Rewards] rewards failed:', e?.message);
          return [];
        }),
        engagementApi.getMyRedemptions
          ? engagementApi.getMyRedemptions().catch((e) => {
              console.log('[Rewards] redemptions failed:', e?.message);
              return [];
            })
          : Promise.resolve([]),
        (async () => {
          try {
            const res = await engagementApi.getPointsLedger(null, PAGE_SIZE);
            console.log('[Rewards] ledger rows:', res?.items?.length || 0);
            return res;
          } catch (e) {
            console.log(
              '[Rewards] ledger failed:',
              e?.response?.status,
              e?.message
            );
            return { items: [], nextCursor: null };
          }
        })(),
      ]);

      setRewards(Array.isArray(list) ? list : []);
      setMyRedemptions(Array.isArray(mine) ? mine : []);

      const items = Array.isArray(led?.items)
        ? led.items
        : Array.isArray(led)
        ? led
        : [];
      setLedger(items);
      setLedgerCursor(led?.nextCursor || null);
      setLedgerLoaded(true);
    } catch (e) {
      console.log('[Rewards] load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setLedgerLoaded(false);
    setLedgerFull(null);
    setLedgerFullCursor(null);
    refresh();
    load();
  }, [refresh, load]);

  // ─── Full ledger pagination ──────────────────────────────────────
  const loadFullLedgerFirstPage = useCallback(async () => {
    setLedgerFullLoading(true);
    try {
      const res = await engagementApi.getPointsLedger(null, PAGE_SIZE);
      const items = Array.isArray(res?.items) ? res.items : [];
      setLedgerFull(items);
      setLedgerFullCursor(res?.nextCursor || null);
    } catch (e) {
      console.log('[Rewards] full ledger error:', e?.message);
      setLedgerFull([]);
      setLedgerFullCursor(null);
    } finally {
      setLedgerFullLoading(false);
    }
  }, []);

  const loadFullLedgerMore = useCallback(async () => {
    if (!ledgerFullCursor || ledgerFullLoading) return;
    setLedgerFullLoading(true);
    try {
      const res = await engagementApi.getPointsLedger(ledgerFullCursor, PAGE_SIZE);
      const more = Array.isArray(res?.items) ? res.items : [];
      setLedgerFull((prev) => [...(prev || []), ...more]);
      setLedgerFullCursor(res?.nextCursor || null);
    } catch (e) {
      console.log('[Rewards] full ledger more error:', e?.message);
    } finally {
      setLedgerFullLoading(false);
    }
  }, [ledgerFullCursor, ledgerFullLoading]);

  const openViewAll = useCallback(() => {
    pop();
    setShowAllModal(true);
    if (ledgerFull === null) loadFullLedgerFirstPage();
  }, [ledgerFull, loadFullLedgerFirstPage]);

  // ─── CSV export ──────────────────────────────────────────────────
  const exportCsv = useCallback(async () => {
    const rows = ledgerFull || ledger || [];
    if (rows.length === 0) {
      Alert.alert('nothing to export', 'no transactions yet.');
      return;
    }

    try {
      const csv = buildCsv(rows);
      const filename = `tdc-points-${Date.now()}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'export your transactions',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        await Share.share({ message: csv, title: filename });
      }
    } catch (e) {
      console.log('[Rewards] export error:', e?.message);
      Alert.alert('export failed', e?.message || 'try again.');
    }
  }, [ledgerFull, ledger]);

  // ─── Earn breakdown — group by FULL reason ───────────────────────
  const { earnByReason, totalEarned, totalSpent } = useMemo(() => {
    const earned = {};
    let earnedSum = 0;
    let spentSum = 0;

    for (const t of ledger) {
      const delta = Number(t.delta) || 0;
      if (delta > 0) {
        const key = t.reason || 'other'; // full reason, not split
        if (!earned[key]) earned[key] = { count: 0, total: 0 };
        earned[key].count += 1;
        earned[key].total += delta;
        earnedSum += delta;
      } else if (delta < 0) {
        spentSum += Math.abs(delta);
      }
    }

    return { earnByReason: earned, totalEarned: earnedSum, totalSpent: spentSum };
  }, [ledger]);

  const breakdownRows = useMemo(() => {
    const rows = Object.entries(earnByReason)
      .map(([reason, stats]) => ({
        reason,
        meta: getReasonMeta(reason),
        count: stats.count,
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total);

    console.log(
      '[Rewards] earn rows:',
      rows.map((r) => `${r.reason}=${r.total}`).join(' | ') || '(none)'
    );
    return rows;
  }, [earnByReason]);

  const recentLedger = useMemo(
    () => (ledger || []).slice(0, RECENT_LIMIT),
    [ledger]
  );

  // ─── Redeem ──────────────────────────────────────────────────────
  const onRedeem = async (reward) => {
    if (busy) return;
    setBusy(reward._id);
    pop();
    try {
      const res = await engagementApi.redeemReward(reward._id);
      hapticSuccess();
      Alert.alert(
        'redeemed!',
        `your code: ${res?.redemption?.code}\n\nexpires ${new Date(
          res?.redemption?.expiresAt
        ).toLocaleDateString()}`,
        [{ text: 'ok' }]
      );
      await refresh();
      await load();
      setLedgerFull(null);
      setLedgerFullCursor(null);
    } catch (e) {
      warn();
      Alert.alert(
        'redeem failed',
        e?.response?.data?.message || 'please try again.'
      );
    } finally {
      setBusy(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={22} color={BLACK} />
        </TouchableOpacity>
        <Text style={styles.title}>rewards</Text>
        <TouchableOpacity
          onPress={onRefresh}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBtn}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={GOLD} />
          ) : (
            <Ionicons name="refresh" size={20} color={BLACK} />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.loadingText}>loading rewards…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
        >
          {/* HERO */}
          <View style={styles.hero}>
            <View style={styles.heroOrb1} />
            <View style={styles.heroOrb2} />

            <View style={styles.heroTopRow}>
              <Text style={styles.heroLabel}>your balance</Text>
              <View style={styles.levelChip}>
                <Ionicons name="sparkles" size={11} color={GOLD} />
                <Text style={styles.levelChipText}>{currentLevel.label}</Text>
              </View>
            </View>

            <View style={styles.heroAmountRow}>
              <MaterialCommunityIcons name="circle-multiple" size={38} color={GOLD} />
              <Text style={styles.heroAmount}>{balance.toLocaleString()}</Text>
            </View>

            <View style={styles.heroLifetimeRow}>
              <MaterialCommunityIcons
                name="circle-multiple"
                size={11}
                color={WHITE}
                style={{ opacity: 0.55 }}
              />
              <Text style={styles.heroLifetime}>
                lifetime · {lifetime.toLocaleString()} pts earned
              </Text>
            </View>

            {nextLevel ? (
              <View style={styles.progressWrap}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(progressPct * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {pointsToNext.toLocaleString()} pts to{' '}
                  <Text style={styles.progressTextBold}>{nextLevel.label}</Text>
                </Text>
              </View>
            ) : (
              <Text style={styles.maxLevelText}>you've hit the top. legend.</Text>
            )}
          </View>

          {/* HOW YOU EARNED */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>how you earned</Text>
            <View style={styles.sectionUnderline} />
          </View>

          {!ledgerLoaded ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator color={GOLD} />
            </View>
          ) : breakdownRows.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="chart-timeline-variant"
                size={40}
                color={BLACK}
              />
              <Text style={styles.empty}>no earnings yet.</Text>
              <Text style={styles.emptySub}>
                sort your first mission to start earning.
              </Text>
            </View>
          ) : (
            <View style={styles.earnCard}>
              {breakdownRows.map((row, i) => {
                const isReferral = row.reason.startsWith('referral');
                return (
                  <View
                    key={row.reason}
                    style={[
                      styles.earnRow,
                      i === breakdownRows.length - 1 && styles.earnRowLast,
                    ]}
                  >
                    <View
                      style={[
                        styles.earnIconWrap,
                        isReferral && styles.earnIconWrapReferral,
                      ]}
                    >
                      <Ionicons name={row.meta.icon} size={16} color={BLACK} />
                    </View>

                    <View style={styles.earnTextWrap}>
                      <Text style={styles.earnLabel}>{row.meta.label}</Text>
                      <Text style={styles.earnDetail} numberOfLines={1}>
                        {row.count} {row.count === 1 ? 'time' : 'times'}
                        {row.meta.detail ? ` · ${row.meta.detail}` : ''}
                      </Text>
                    </View>

                    <View style={styles.earnPointsPill}>
                      <MaterialCommunityIcons
                        name="circle-multiple"
                        size={11}
                        color={GOLD}
                      />
                      <Text style={styles.earnPointsText}>+{row.total}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* NET TOTAL */}
          {breakdownRows.length > 0 && (
            <View style={styles.totalCard}>
              <View style={styles.totalLeft}>
                <Text style={styles.totalLabel}>NET TOTAL</Text>
                <Text style={styles.totalSub}>
                  earned {totalEarned} · spent {totalSpent}
                </Text>
              </View>
              <View style={styles.totalPill}>
                <MaterialCommunityIcons
                  name="circle-multiple"
                  size={14}
                  color={BLACK}
                />
                <Text style={styles.totalText}>
                  {(totalEarned - totalSpent).toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {/* RECENT ACTIVITY */}
          {recentLedger.length > 0 && (
            <>
              <View style={styles.sectionHeaderWithAction}>
                <View>
                  <Text style={styles.sectionTitle}>recent activity</Text>
                  <View style={styles.sectionUnderline} />
                </View>

                <TouchableOpacity
                  style={styles.viewAllBtn}
                  onPress={openViewAll}
                  activeOpacity={0.85}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.viewAllText}>view all</Text>
                  <Ionicons name="chevron-forward" size={14} color={GOLD} />
                </TouchableOpacity>
              </View>

              <View style={styles.ledgerCard}>
                {recentLedger.map((t, i) => {
                  const meta = getReasonMeta(t.reason);
                  const isSpend = Number(t.delta) < 0;
                  return (
                    <View
                      key={t._id || i}
                      style={[
                        styles.ledgerRow,
                        i === recentLedger.length - 1 && styles.ledgerRowLast,
                      ]}
                    >
                      <View style={styles.ledgerIconWrap}>
                        <Ionicons
                          name={isSpend ? 'gift-outline' : meta.icon}
                          size={14}
                          color={BLACK}
                        />
                      </View>

                      <View style={styles.ledgerTextWrap}>
                        <Text style={styles.ledgerLabel} numberOfLines={1}>
                          {isSpend ? 'reward redeemed' : meta.label}
                        </Text>
                        <Text style={styles.ledgerDate}>
                          {new Date(t.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>

                      <View style={styles.ledgerDeltaWrap}>
                        <MaterialCommunityIcons
                          name="circle-multiple"
                          size={11}
                          color={BLACK}
                          style={isSpend && { opacity: 0.4 }}
                        />
                        <Text
                          style={[
                            styles.ledgerDelta,
                            isSpend && styles.ledgerDeltaSpend,
                          ]}
                        >
                          {t.delta >= 0 ? `+${t.delta}` : t.delta}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.viewAllFullBtn}
                onPress={openViewAll}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={16}
                  color={BLACK}
                />
                <Text style={styles.viewAllFullText}>view all transactions</Text>
                <Ionicons name="arrow-forward" size={14} color={BLACK} />
              </TouchableOpacity>
            </>
          )}

          {/* SPEND YOUR POINTS */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>spend your points</Text>
            <View style={styles.sectionUnderline} />
          </View>

          {rewards.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="gift-off-outline"
                size={40}
                color={BLACK}
              />
              <Text style={styles.empty}>no rewards yet.</Text>
              <Text style={styles.emptySub}>
                keep earning — new drops every week.
              </Text>
            </View>
          ) : (
            rewards.map((r) => {
              const affordable = balance >= r.costPoints;
              const busyThis = busy === r._id;
              const stockLeft =
                typeof r.stockLeft === 'number' ? r.stockLeft : null;
              const soldOut = stockLeft !== null && stockLeft <= 0;

              return (
                <View key={r._id} style={styles.rewardCard}>
                  <View style={styles.rewardImageWrap}>
                    {r.image ? (
                      <Image
                        source={{ uri: r.image }}
                        style={styles.rewardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.rewardImageFallback}>
                        <MaterialCommunityIcons
                          name="gift-outline"
                          size={26}
                          color={GOLD}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.rewardBody}>
                    {!!r.brand?.name && (
                      <Text style={styles.rewardBrand} numberOfLines={1}>
                        {r.brand.name}
                      </Text>
                    )}
                    <Text style={styles.rewardTitle} numberOfLines={2}>
                      {r.title}
                    </Text>
                    {!!r.description && (
                      <Text style={styles.rewardDesc} numberOfLines={2}>
                        {r.description}
                      </Text>
                    )}

                    <View style={styles.rewardMeta}>
                      <View style={styles.costPill}>
                        <MaterialCommunityIcons
                          name="circle-multiple"
                          size={11}
                          color={GOLD}
                        />
                        <Text style={styles.costPillText}>
                          {r.costPoints.toLocaleString()}
                        </Text>
                      </View>
                      {stockLeft !== null && (
                        <Text style={styles.stockText}>
                          {soldOut ? 'sold out' : `${stockLeft} left`}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.redeemBtn,
                      (!affordable || soldOut) && styles.redeemBtnDisabled,
                    ]}
                    disabled={!affordable || busyThis || soldOut}
                    onPress={() => onRedeem(r)}
                    activeOpacity={0.85}
                  >
                    {busyThis ? (
                      <ActivityIndicator size="small" color={BLACK} />
                    ) : (
                      <Text
                        style={[
                          styles.redeemText,
                          (!affordable || soldOut) && styles.redeemTextDisabled,
                        ]}
                      >
                        {soldOut ? 'sold out' : affordable ? 'redeem' : 'locked'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          {/* MY REWARDS */}
          {myRedemptions.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>my rewards</Text>
                <View style={styles.sectionUnderline} />
              </View>

              {myRedemptions.map((item) => (
                <View key={item._id} style={styles.myRewardCard}>
                  <View style={styles.myRewardLeft}>
                    <MaterialCommunityIcons
                      name="ticket-percent-outline"
                      size={22}
                      color={BLACK}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.myRewardTitle} numberOfLines={1}>
                        {item.reward?.title || 'reward'}
                      </Text>
                      <Text style={styles.myRewardCode}>{item.code}</Text>
                    </View>
                  </View>
                  <View style={styles.myRewardStatusPill}>
                    <Text style={styles.myRewardStatus}>{item.status}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* VIEW ALL MODAL */}
      <Modal
        visible={showAllModal}
        animationType="slide"
        onRequestClose={() => setShowAllModal(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowAllModal(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.headerBtn}
            >
              <Ionicons name="close" size={22} color={BLACK} />
            </TouchableOpacity>
            <Text style={styles.title}>all transactions</Text>
            <TouchableOpacity
              onPress={exportCsv}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.headerBtn}
            >
              <MaterialCommunityIcons
                name="microsoft-excel"
                size={20}
                color={BLACK}
              />
            </TouchableOpacity>
          </View>

          {ledgerFullLoading && (ledgerFull || []).length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={GOLD} />
              <Text style={styles.loadingText}>loading transactions…</Text>
            </View>
          ) : (
            <>
              <View style={styles.exportBar}>
                <TouchableOpacity
                  style={styles.exportBtn}
                  onPress={exportCsv}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name="download-outline"
                    size={16}
                    color={BLACK}
                  />
                  <Text style={styles.exportText}>export csv / excel</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={ledgerFull || []}
                keyExtractor={(item, idx) => item._id || String(idx)}
                contentContainerStyle={styles.modalList}
                onEndReachedThreshold={0.4}
                onEndReached={loadFullLedgerMore}
                ListFooterComponent={
                  ledgerFullLoading && (ledgerFull || []).length > 0 ? (
                    <ActivityIndicator
                      color={GOLD}
                      style={{ paddingVertical: 16 }}
                    />
                  ) : !ledgerFullCursor && (ledgerFull || []).length > 0 ? (
                    <Text style={styles.endText}>— end —</Text>
                  ) : null
                }
                renderItem={({ item: t }) => {
                  const meta = getReasonMeta(t.reason);
                  const isSpend = Number(t.delta) < 0;
                  return (
                    <View style={styles.fullRow}>
                      <View style={styles.fullIconWrap}>
                        <Ionicons
                          name={isSpend ? 'gift-outline' : meta.icon}
                          size={16}
                          color={BLACK}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.fullLabel} numberOfLines={1}>
                          {isSpend ? 'reward redeemed' : meta.label}
                        </Text>
                        <Text style={styles.fullDate}>
                          {new Date(t.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>

                      <View style={styles.fullDeltaWrap}>
                        <MaterialCommunityIcons
                          name="circle-multiple"
                          size={12}
                          color={BLACK}
                          style={isSpend && { opacity: 0.35 }}
                        />
                        <Text
                          style={[
                            styles.fullDelta,
                            isSpend && styles.fullDeltaSpend,
                          ]}
                        >
                          {t.delta >= 0 ? `+${t.delta}` : t.delta}
                        </Text>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  !ledgerFullLoading && (
                    <View style={styles.emptyBox}>
                      <MaterialCommunityIcons
                        name="chart-timeline-variant"
                        size={40}
                        color={BLACK}
                      />
                      <Text style={styles.empty}>no transactions yet.</Text>
                      <Text style={styles.emptySub}>
                        your activity will appear here.
                      </Text>
                    </View>
                  )
                }
              />
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BLACK + '12',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BLACK + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: -0.3,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: BLACK, opacity: 0.55, fontWeight: '600' },

  scroll: { paddingBottom: 20 },

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
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: GOLD + '10',
    top: -70,
    right: -50,
  },
  heroOrb2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: GOLD + '06',
    bottom: -40,
    left: -30,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  heroLabel: {
    fontSize: 10,
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '900',
  },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: GOLD + '20',
    borderWidth: 1,
    borderColor: GOLD,
  },
  levelChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    position: 'relative',
    zIndex: 1,
  },
  heroAmount: {
    fontSize: 46,
    color: WHITE,
    fontWeight: '900',
    letterSpacing: -1.4,
  },
  heroLifetimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    position: 'relative',
    zIndex: 1,
  },
  heroLifetime: {
    fontSize: 12,
    color: WHITE,
    opacity: 0.55,
    fontWeight: '500',
  },
  progressWrap: { marginTop: 18, position: 'relative', zIndex: 1 },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: WHITE + '15',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: GOLD },
  progressText: {
    marginTop: 10,
    fontSize: 11,
    color: WHITE,
    opacity: 0.65,
    fontWeight: '600',
  },
  progressTextBold: { color: GOLD, fontWeight: '900' },
  maxLevelText: {
    marginTop: 16,
    fontSize: 12,
    color: GOLD,
    fontWeight: '900',
    fontStyle: 'italic',
    position: 'relative',
    zIndex: 1,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: -0.2,
    textTransform: 'lowercase',
  },
  sectionUnderline: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 6,
  },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewAllText: {
    fontSize: 12,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 0.2,
    textTransform: 'lowercase',
  },

  earnCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BLACK + '12',
    overflow: 'hidden',
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: BLACK + '06',
    gap: 10,
  },
  earnRowLast: { borderBottomWidth: 0 },
  earnIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
  },
  earnIconWrapReferral: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  earnTextWrap: { flex: 1, marginRight: 6 },
  earnLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: BLACK,
    letterSpacing: -0.1,
    textTransform: 'lowercase',
  },
  earnDetail: {
    fontSize: 10.5,
    fontWeight: '500',
    color: BLACK,
    opacity: 0.55,
    marginTop: 1,
  },
  earnPointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: BLACK,
    minWidth: 60,
    justifyContent: 'center',
  },
  earnPointsText: {
    fontSize: 11,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 0.3,
  },

  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: BLACK,
    borderRadius: 18,
  },
  totalLeft: { flex: 1 },
  totalLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 2,
  },
  totalSub: {
    fontSize: 11,
    color: WHITE,
    opacity: 0.55,
    fontWeight: '500',
    marginTop: 3,
  },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: GOLD,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: -0.2,
  },

  ledgerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BLACK + '12',
    overflow: 'hidden',
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BLACK + '06',
    gap: 10,
  },
  ledgerRowLast: { borderBottomWidth: 0 },
  ledgerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD + '25',
  },
  ledgerTextWrap: { flex: 1 },
  ledgerLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: BLACK,
    textTransform: 'lowercase',
  },
  ledgerDate: {
    fontSize: 10,
    color: BLACK,
    opacity: 0.5,
    fontWeight: '500',
    marginTop: 1,
  },
  ledgerDeltaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ledgerDelta: {
    fontSize: 13,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: -0.1,
  },
  ledgerDeltaSpend: { color: BLACK, opacity: 0.45 },

  viewAllFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 22,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: GOLD + '20',
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  viewAllFullText: {
    fontSize: 13,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: 0.1,
    textTransform: 'lowercase',
  },

  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BLACK + '10',
  },
  rewardImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
  },
  rewardImage: { width: '100%', height: '100%' },
  rewardImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD + '25',
  },
  rewardBody: { flex: 1, marginRight: 10 },
  rewardBrand: {
    fontSize: 10,
    fontWeight: '900',
    color: BLACK,
    opacity: 0.55,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BLACK,
    lineHeight: 18,
  },
  rewardDesc: {
    fontSize: 11.5,
    color: BLACK,
    opacity: 0.65,
    marginTop: 3,
    lineHeight: 15,
  },
  rewardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  costPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: BLACK,
  },
  costPillText: { fontSize: 10.5, fontWeight: '900', color: GOLD },
  stockText: {
    fontSize: 10,
    fontWeight: '800',
    color: BLACK,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  redeemBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: BLACK,
  },
  redeemBtnDisabled: {
    backgroundColor: WHITE,
    borderColor: BLACK + '15',
  },
  redeemText: {
    fontSize: 12,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: 0.2,
  },
  redeemTextDisabled: { color: BLACK, opacity: 0.35 },

  myRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  myRewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  myRewardTitle: { fontSize: 13, fontWeight: '800', color: BLACK },
  myRewardCode: {
    fontSize: 12,
    fontWeight: '900',
    color: BLACK,
    marginTop: 2,
    letterSpacing: 0.6,
  },
  myRewardStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: BLACK,
  },
  myRewardStatus: {
    fontSize: 10,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginHorizontal: 16,
  },
  empty: { marginTop: 10, color: BLACK, fontSize: 14, fontWeight: '700' },
  emptySub: {
    marginTop: 4,
    color: BLACK,
    opacity: 0.4,
    fontSize: 12,
    fontWeight: '500',
  },

  modalContainer: { flex: 1, backgroundColor: WHITE },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BLACK + '12',
  },
  exportBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: GOLD,
    borderWidth: 1.5,
    borderColor: BLACK,
  },
  exportText: {
    fontSize: 13,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: 0.2,
    textTransform: 'lowercase',
  },
  modalList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  fullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BLACK + '08',
    gap: 12,
  },
  fullIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD + '25',
  },
  fullLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: BLACK,
    textTransform: 'lowercase',
  },
  fullDate: {
    fontSize: 11,
    color: BLACK,
    opacity: 0.5,
    fontWeight: '500',
    marginTop: 2,
  },
  fullDeltaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullDelta: {
    fontSize: 14,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: -0.1,
  },
  fullDeltaSpend: { color: BLACK, opacity: 0.45 },
  endText: {
    textAlign: 'center',
    fontSize: 11,
    color: BLACK,
    opacity: 0.35,
    fontWeight: '700',
    paddingVertical: 16,
    letterSpacing: 2,
  },
});