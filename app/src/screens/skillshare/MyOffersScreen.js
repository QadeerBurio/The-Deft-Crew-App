// screens/MyOffersScreen.js
import React, { useState, useEffect, useContext, useCallback, useRef, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMySkillOffers, withdrawSkillOffer } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { goToAuth } from '../../utils/goToAuth';

import { color as T, font as F } from "../../theme/tokens";
import ScreenHeader, { HeaderIconButton } from "../../ui/ScreenHeader";
const BRAND = T.yellow;
const INK = T.ink;
const MUTED = T.textMuted;
const BORDER = T.line;

const TYPE_META = {
  barter: { label: 'Exchange', icon: 'swap-horizontal-outline' },
  paid: { label: 'Paid', icon: 'cash-outline' },
  job: { label: 'Hire Application', icon: 'briefcase-outline' },
};

const TABS = ['All', 'Pending', 'Accepted'];

// last offers per user, so returning to this screen is instant
const offersCache = new Map();

const OfferCard = memo(function OfferCard({ item, onWithdraw, onPress }) {
  const listing = item.listingId || {};
  const meta = TYPE_META[listing.type] || TYPE_META.barter;
  const isPending = item.status === 'pending';
  const isAccepted = item.status === 'accepted';
  const isRejected = item.status === 'rejected';
  const isWithdrawn = item.status === 'withdrawn';
  const ownerName = listing.ownerId?.name || 'User';

  const statusPill = isAccepted
    ? { bg: T.successBg, color: T.success, label: 'Accepted' }
    : isRejected
    ? { bg: T.dangerBg, color: T.danger, label: 'Rejected' }
    : isWithdrawn
    ? { bg: T.sand, color: T.textFaint, label: 'Withdrawn' }
    : { bg: T.yellowSoft, color: T.ink, label: 'Pending' };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(item, isAccepted ? 'chat' : undefined)}>
      <View style={styles.cardTopRow}>
        <View style={styles.typeRow}>
          <Ionicons name={meta.icon} size={14} color={MUTED} />
          <Text style={styles.typeText}>{meta.label}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
          <Text style={[styles.statusPillText, { color: statusPill.color }]}>{statusPill.label}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{listing.title || 'Untitled Listing'}</Text>

      <View style={styles.toRow}>
        <Ionicons name="person-outline" size={13} color={MUTED} />
        <Text style={styles.toText}>To: {ownerName}</Text>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.actionRow}>
        {isPending && (
          <TouchableOpacity onPress={() => onWithdraw(item._id)} hitSlop={8}>
            <Text style={styles.withdrawText}>withdraw</Text>
          </TouchableOpacity>
        )}
        {isAccepted && item.matchId && (
          <TouchableOpacity style={styles.chatBtn} onPress={() => onPress(item, 'chat')}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={INK} />
            <Text style={styles.chatBtnText}>open chat</Text>
          </TouchableOpacity>
        )}
        {(isRejected || isWithdrawn) && <View />}
      </View>
    </TouchableOpacity>
  );
});

export default function MyOffersScreen({ navigation }) {
  const { getCurrentUserId, isGuest, setIsGuest } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const userId = getCurrentUserId();
  const cached = userId ? offersCache.get(userId) : null;
  const [offers, setOffers] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('All');
  const fetchingRef = useRef(false);
  const withdrawingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchOffers = useCallback(async () => {
    const uid = getCurrentUserId();
    if (!uid || isGuest) { setLoading(false); setRefreshing(false); return; }
    if (fetchingRef.current) { setRefreshing(false); return; }
    fetchingRef.current = true;
    try {
      const response = await getMySkillOffers();
      const list = response?.offers || response?.data?.offers || [];
      offersCache.set(uid, list);
      if (mountedRef.current) setOffers(list);
    } catch (err) {
      console.error('Fetch offers error:', err);
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [getCurrentUserId, isGuest]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  // refresh quietly when coming back (e.g. after an offer was accepted)
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { fetchOffers(); });
    return unsub;
  }, [navigation, fetchOffers]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchOffers(); }, [fetchOffers]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DashboardMain');
  }, [navigation]);

  const handleWithdraw = useCallback((offerId) => {
    Alert.alert('Withdraw Offer', 'Are you sure you want to withdraw this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          if (withdrawingRef.current) return;
          withdrawingRef.current = true;
          try { await withdrawSkillOffer(offerId); fetchOffers(); }
          catch (err) { Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to withdraw'); }
          finally { withdrawingRef.current = false; }
        },
      },
    ]);
  }, [fetchOffers]);

  const handlePress = useCallback((item, mode) => {
    const listingId = item?.listingId?._id;
    if (mode === 'chat') {
      const matchId = item?.matchId?._id || item?.matchId;
      if (!matchId) {
        Alert.alert('Chat not ready', 'This match is still being set up. Pull down to refresh and try again.');
        return;
      }
      navigation.navigate('MatchChat', { listingId, matchId });
    } else if (listingId) {
      navigation.navigate('ListingDetail', { id: listingId });
    }
  }, [navigation]);

  const renderItem = useCallback(({ item }) => (
    <OfferCard item={item} onWithdraw={handleWithdraw} onPress={handlePress} />
  ), [handleWithdraw, handlePress]);

  const counts = {
    total: offers.length,
    pending: offers.filter((o) => o.status === 'pending').length,
    accepted: offers.filter((o) => o.status === 'accepted').length,
  };

  const filtered = offers.filter((o) => {
    if (tab === 'Pending') return o.status === 'pending';
    if (tab === 'Accepted') return o.status === 'accepted';
    return true;
  });

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerFillScreen} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <Ionicons name="person-outline" size={56} color={T.textFaint} />
        <Text style={styles.emptyTitle}>login required</Text>
        <Text style={styles.emptyText}>login to view your offers</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => goToAuth(setIsGuest)}>
          <Text style={styles.emptyButtonText}>login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <ScreenHeader title="my offers" onBack={goBack} right={<HeaderIconButton icon="notifications-outline" label="notifications" onPress={() => navigation.navigate('NotificationSkillshare')} />} />

      {loading && offers.length === 0 ? (
        <View style={styles.centerFill}><ActivityIndicator size="large" color={BRAND} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => String(item._id ?? index)}
          contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={9}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={
            <View>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>total</Text>
                  <Text style={styles.statValue}>{counts.total}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>pending</Text>
                  <Text style={[styles.statValue, { color: BRAND }]}>{counts.pending}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>accepted</Text>
                  <Text style={[styles.statValue, { color: BRAND }]}>{counts.accepted}</Text>
                </View>
              </View>

              <View style={styles.tabsRow}>
                {TABS.map((t) => {
                  const active = tab === t;
                  return (
                    <TouchableOpacity key={t} onPress={() => setTab(t)} style={styles.tabItem}>
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
                      {active && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="file-tray-outline" size={48} color={T.textFaint} />
              <Text style={styles.emptyText}>no offers here yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerFillScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.paper, padding: 20 },
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
    backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.line,
  },
  topHeaderTitle: { fontSize: 18, fontFamily: F.heading, color: BRAND },

  listContent: { padding: 20, paddingTop: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: {
    flex: 1, alignItems: 'center', borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, paddingVertical: 14, backgroundColor: T.card, gap: 4,
  },
  statLabel: { fontSize: 10, color: MUTED, fontFamily: F.bodyBold, letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontFamily: F.heading, color: INK },

  tabsRow: { flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: T.line, marginBottom: 14 },
  tabItem: { paddingBottom: 8 },
  tabText: { fontSize: 14, color: T.textFaint, fontFamily: F.bodySemi },
  tabTextActive: { color: BRAND, fontFamily: F.bodyBold },
  tabUnderline: { marginTop: 6, height: 2, backgroundColor: BRAND, borderRadius: 1 },

  card: { backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeText: { fontSize: 12, fontFamily: F.bodyBold, color: MUTED },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontFamily: F.bodyBold },
  cardTitle: { fontSize: 16, fontFamily: F.bodyBold, color: INK, marginBottom: 6 },
  toRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  toText: { fontSize: 12, color: MUTED, fontFamily: F.bodySemi },
  cardDivider: { height: 1, backgroundColor: T.sand, marginVertical: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  withdrawText: { fontSize: 13, fontFamily: F.bodyBold, color: T.danger },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  chatBtnText: { fontSize: 13, fontFamily: F.bodyBold, color: INK },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontFamily: F.heading, color: INK, marginTop: 12 },
  emptyText: { fontSize: 14, fontFamily: F.body, color: T.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  emptyButton: { backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyButtonText: { color: INK, fontFamily: F.bodyBold, fontSize: 14 },
}); 