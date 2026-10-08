// screens/ManageOffersScreen.js
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl, StatusBar, Platform, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getOffersForListing, updateOfferStatus } from '../../api/api';
import { timeAgo } from '../../utils/time';

import { color as T, font as F } from "../../theme/tokens";
import ScreenHeader, { HeaderIconButton } from "../../ui/ScreenHeader";
const BRAND = T.yellow;
const INK = T.ink;
const MUTED = T.textMuted;
const BORDER = T.line;

// last offers per listing, so coming back shows the list instantly
const offersCache = new Map();

const OfferCard = memo(function OfferCard({ item, isBarter, busy, onAction, onOpenChat, onViewDetails }) {
  const isPending = item.status === 'pending';
  const isAccepted = item.status === 'accepted';
  const isRejected = item.status === 'rejected';
  const offeror = item.offerorId || {};

  const statusPill = isAccepted
    ? { bg: T.successBg, color: T.success, label: 'Accepted', icon: 'checkmark-circle' }
    : isRejected
    ? { bg: T.dangerBg, color: T.danger, label: 'Rejected', icon: 'close-circle' }
    : { bg: T.yellowSoft, color: T.ink, label: 'Pending', icon: 'time' };

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.offerorRow}>
          {offeror.profileImage ? (
            <Image source={{ uri: offeror.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{(offeror.name || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={styles.offerorName}>{offeror.name || 'User'}</Text>
            <Text style={styles.offerorTime}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
          <Ionicons name={statusPill.icon} size={12} color={statusPill.color} />
          <Text style={[styles.statusPillText, { color: statusPill.color }]}>{statusPill.label}</Text>
        </View>
      </View>

      {isBarter && item.offeredSkillName && (
        <View style={styles.detailRow}>
          <Ionicons name="git-compare-outline" size={15} color={MUTED} />
          <Text style={styles.detailLabel}>skill: <Text style={styles.detailValue}>{item.offeredSkillName}</Text></Text>
        </View>
      )}
      {item.offeredSkillLevel && (
        <View style={styles.detailRow}>
          <Ionicons name="star-outline" size={15} color={MUTED} />
          <Text style={styles.detailLabel}>experience: <Text style={styles.detailValue}>{item.offeredSkillLevel}</Text></Text>
        </View>
      )}
      {item.proposedPrice != null && (
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={15} color={MUTED} />
          <Text style={styles.detailLabel}>price: <Text style={styles.detailValue}>${item.proposedPrice}</Text></Text>
        </View>
      )}
      {item.applicationNotes && (
        <View style={styles.detailRow}>
          <Ionicons name="document-text-outline" size={15} color={MUTED} />
          <Text style={styles.detailLabel} numberOfLines={2}>{item.applicationNotes}</Text>
        </View>
      )}

      {item.message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>"{item.message}"</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        {isPending ? (
          <>
            <TouchableOpacity
              style={[styles.rejectBtn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => onAction(item._id, 'reject')}
            >
              <Text style={styles.rejectBtnText}>reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => onAction(item._id, 'accept')}
            >
              {busy ? <ActivityIndicator size="small" color={INK} /> : <Text style={styles.acceptBtnText}>accept</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => onViewDetails(item)}>
              <Text style={styles.outlineBtnText}>View{'\n'}Details</Text>
            </TouchableOpacity>
            {isAccepted && (
              <TouchableOpacity style={styles.chatBtn} onPress={() => onOpenChat(item)}>
                <Ionicons name="chatbubble-ellipses-outline" size={15} color={INK} />
                <Text style={styles.chatBtnText}>open chat</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
});

export default function ManageOffersScreen({ route, navigation }) {
  const { id, type } = route.params || {};
  const insets = useSafeAreaInsets();
  const cached = offersCache.get(id);
  const [offers, setOffers] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const busyRef = useRef(false);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchOffers = useCallback(async () => {
    if (!id || fetchingRef.current) {
      setLoading(false); setRefreshing(false);
      return;
    }
    fetchingRef.current = true;
    try {
      const data = await getOffersForListing(id);
      const list = data.offers || [];
      offersCache.set(id, list);
      if (mountedRef.current) setOffers(list);
    } catch (err) {
      console.error('Error fetching offers:', err);
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [id]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchOffers(); }, [fetchOffers]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DashboardMain');
  }, [navigation]);

  const handleOfferAction = useCallback((offerId, action) => {
    if (busyRef.current) return;
    const status = action === 'accept' ? 'accepted' : 'rejected';
    Alert.alert(
      action === 'accept' ? 'Accept Offer' : 'Reject Offer',
      action === 'accept'
        ? 'Accepting this offer will create a match and close the listing to other offers. Continue?'
        : 'Are you sure you want to reject this offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'accept' ? 'Accept' : 'Reject',
          style: action === 'accept' ? 'default' : 'destructive',
          onPress: async () => {
            if (busyRef.current) return;
            busyRef.current = true;
            setBusyId(offerId);
            try {
              await updateOfferStatus(offerId, status);
              offersCache.delete(id);
              Alert.alert('Success', action === 'accept' ? 'Offer accepted! A match has been created.' : 'Offer rejected.');
              if (action === 'accept') goBack(); else fetchOffers();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to update offer');
            } finally {
              busyRef.current = false;
              if (mountedRef.current) setBusyId(null);
            }
          },
        },
      ]
    );
  }, [id, goBack, fetchOffers]);

  const handleOpenChat = useCallback((item) => {
    const matchId = item.matchId?._id || item.matchId;
    if (!matchId) {
      Alert.alert('Chat not ready', 'This match is still being set up. Pull down to refresh and try again.');
      return;
    }
    navigation.navigate('MatchChat', { listingId: id, matchId });
  }, [navigation, id]);

  const handleViewDetails = useCallback((item) => {
    Alert.alert(
      item.offerorId?.name || 'Applicant',
      item.message || item.applicationNotes || 'No additional message provided.'
    );
  }, []);

  const isBarter = type === 'barter';
  const pendingCount = offers.filter((o) => o.status === 'pending').length;
  const acceptedCount = offers.filter((o) => o.status === 'accepted').length;

  const filtered = statusFilter === 'all' ? offers : offers.filter((o) => o.status === statusFilter);

  const renderItem = useCallback(({ item }) => (
    <OfferCard
      item={item}
      isBarter={isBarter}
      busy={busyId === item._id}
      onAction={handleOfferAction}
      onOpenChat={handleOpenChat}
      onViewDetails={handleViewDetails}
    />
  ), [isBarter, busyId, handleOfferAction, handleOpenChat, handleViewDetails]);

  if (loading && !refreshing && offers.length === 0) {
    return (
      <SafeAreaView style={styles.centerFillScreen} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <ScreenHeader title="manage offers" onBack={goBack} right={<HeaderIconButton icon="notifications-outline" label="notifications" onPress={() => navigation.navigate('NotificationSkillshare')} />} />

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
          <View style={styles.headerCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>total</Text>
                <Text style={styles.statValue}>{offers.length}</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statLabelRow}>
                  <Ionicons name="remove-circle-outline" size={12} color={MUTED} />
                  <Text style={styles.statLabel}>pending</Text>
                </View>
                <Text style={[styles.statValue, { color: BRAND }]}>{pendingCount}</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statLabelRow}>
                  <Ionicons name="checkmark-circle-outline" size={12} color={MUTED} />
                  <Text style={styles.statLabel}>accepted</Text>
                </View>
                <Text style={[styles.statValue, { color: BRAND }]}>{acceptedCount}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setStatusFilter((f) => (f === 'all' ? 'pending' : f === 'pending' ? 'accepted' : 'all'))}
            >
              <Ionicons name="options-outline" size={15} color={INK} />
              <Text style={styles.filterBtnText}>
                Filter{statusFilter !== 'all' ? `: ${statusFilter}` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={T.textFaint} />
            <Text style={styles.emptyText}>no offers yet</Text>
            <Text style={styles.emptySubtext}>Check back later for offers on your listing</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  centerFillScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.paper },
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
    backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.line,
  },
  topHeaderTitle: { fontSize: 18, fontFamily: F.heading, color: INK },

  listContent: { padding: 20, paddingTop: 16 },

  headerCard: {
    backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 16,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  statItem: { alignItems: 'center' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, color: MUTED, fontFamily: F.bodyBold, letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontFamily: F.heading, color: INK, marginTop: 4 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  filterBtnText: { fontSize: 13, fontFamily: F.bodyBold, color: INK },

  card: { backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  offerorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: T.sand, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 15, fontFamily: F.bodyBold, color: T.textMuted },
  offerorName: { fontSize: 15, fontFamily: F.bodyBold, color: INK },
  offerorTime: { fontSize: 11, fontFamily: F.body, color: MUTED, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontFamily: F.bodyBold },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailLabel: { fontSize: 13, color: MUTED, fontFamily: F.bodyMedium, flex: 1 },
  detailValue: { color: INK, fontFamily: F.bodyBold },

  messageBox: { backgroundColor: T.sand, borderRadius: 10, padding: 12, marginTop: 6, marginBottom: 4 },
  messageText: { fontSize: 13, fontFamily: F.body, color: T.textMuted, fontStyle: 'italic', lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  acceptBtn: { flex: 1, backgroundColor: BRAND, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  acceptBtnText: { fontSize: 14, fontFamily: F.bodyBold, color: INK },
  rejectBtn: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  rejectBtnText: { fontSize: 14, fontFamily: F.bodyBold, color: T.danger },
  outlineBtn: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 13, fontFamily: F.bodyBold, color: INK, textAlign: 'center' },
  chatBtn: { flex: 1.5, flexDirection: 'row', gap: 6, backgroundColor: BRAND, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  chatBtnText: { fontSize: 14, fontFamily: F.bodyBold, color: INK },
  btnDisabled: { opacity: 0.5 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontFamily: F.heading, color: INK, marginTop: 14 },
  emptySubtext: { fontSize: 13, fontFamily: F.body, color: MUTED, marginTop: 4 },
});