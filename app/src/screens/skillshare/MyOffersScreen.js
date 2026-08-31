// screens/MyOffersScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl, SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMySkillOffers, withdrawSkillOffer } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#8E8E93';
const BORDER = '#e5e5e5';

const TYPE_META = {
  barter: { label: 'Exchange', icon: 'swap-horizontal-outline' },
  paid: { label: 'Paid', icon: 'cash-outline' },
  job: { label: 'Hire Application', icon: 'briefcase-outline' },
};

const TABS = ['All', 'Pending', 'Accepted'];

function OfferCard({ item, onWithdraw, onPress }) {
  const listing = item.listingId || {};
  const meta = TYPE_META[listing.type] || TYPE_META.barter;
  const isPending = item.status === 'pending';
  const isAccepted = item.status === 'accepted';
  const isRejected = item.status === 'rejected';
  const isWithdrawn = item.status === 'withdrawn';
  const ownerName = listing.ownerId?.name || 'User';

  const statusPill = isAccepted
    ? { bg: '#E8F5E9', color: '#2e7d32', label: 'Accepted' }
    : isRejected
    ? { bg: '#FFEBEE', color: '#c62828', label: 'Rejected' }
    : isWithdrawn
    ? { bg: '#F0F0F0', color: '#888', label: 'Withdrawn' }
    : { bg: '#FFF3D6', color: '#8a6d1d', label: 'Pending' };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(listing._id, isAccepted ? 'chat' : undefined)}>
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
            <Text style={styles.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        )}
        {isAccepted && item.matchId && (
          <TouchableOpacity style={styles.chatBtn} onPress={() => onPress(listing._id, 'chat')}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={INK} />
            <Text style={styles.chatBtnText}>Open Chat</Text>
          </TouchableOpacity>
        )}
        {(isRejected || isWithdrawn) && <View />}
      </View>
    </TouchableOpacity>
  );
}

export default function MyOffersScreen({ navigation }) {
  const { getCurrentUserId, isGuest } = useContext(AuthContext);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('All');

  const fetchOffers = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId || isGuest) { setLoading(false); return; }
    try {
      const response = await getMySkillOffers();
      setOffers(response?.offers || response?.data?.offers || []);
    } catch (err) {
      console.error('Fetch offers error:', err);
    } finally { setLoading(false); setRefreshing(false); }
  }, [getCurrentUserId, isGuest]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const onRefresh = () => { setRefreshing(true); fetchOffers(); };

  const handleWithdraw = (offerId) => {
    Alert.alert('Withdraw Offer', 'Are you sure you want to withdraw this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          try { await withdrawSkillOffer(offerId); fetchOffers(); }
          catch (err) { Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to withdraw'); }
        },
      },
    ]);
  };

  const handlePress = (listingId, mode) => {
    if (mode === 'chat') {
      navigation.navigate('MatchChat', {
        listingId,
        matchId: offers.find((o) => o.listingId?._id === listingId)?.matchId?._id,
      });
    } else if (listingId) {
      navigation.navigate('ListingDetail', { id: listingId });
    }
  };

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
      <SafeAreaView style={styles.centerFillScreen}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="person-outline" size={56} color="#ddd" />
        <Text style={styles.emptyTitle}>Login Required</Text>
        <Text style={styles.emptyText}>Login to view your offers</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.emptyButtonText}>Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>My Offers</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={22} color={INK} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerFill}><ActivityIndicator size="large" color={BRAND} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />}
          renderItem={({ item }) => (
            <OfferCard item={item} onWithdraw={handleWithdraw} onPress={handlePress} />
          )}
          ListHeaderComponent={
            <View>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>TOTAL</Text>
                  <Text style={styles.statValue}>{counts.total}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>PENDING</Text>
                  <Text style={[styles.statValue, { color: BRAND }]}>{counts.pending}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>ACCEPTED</Text>
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
              <Ionicons name="file-tray-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No offers here yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerFillScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 20 },
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 34 : 8, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  topHeaderTitle: { fontSize: 18, fontWeight: '800', color: BRAND },

  listContent: { padding: 20, paddingTop: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: {
    flex: 1, alignItems: 'center', borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, paddingVertical: 14, backgroundColor: '#fff', gap: 4,
  },
  statLabel: { fontSize: 10, color: MUTED, fontWeight: '700', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '800', color: INK },

  tabsRow: { flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', marginBottom: 14 },
  tabItem: { paddingBottom: 8 },
  tabText: { fontSize: 14, color: '#999', fontWeight: '600' },
  tabTextActive: { color: BRAND, fontWeight: '800' },
  tabUnderline: { marginTop: 6, height: 2, backgroundColor: BRAND, borderRadius: 1 },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeText: { fontSize: 12, fontWeight: '700', color: MUTED },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: INK, marginBottom: 6 },
  toRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  toText: { fontSize: 12, color: MUTED, fontWeight: '600' },
  cardDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  withdrawText: { fontSize: 13, fontWeight: '700', color: '#c62828' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  chatBtnText: { fontSize: 13, fontWeight: '800', color: INK },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: INK, marginTop: 12 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 16 },
  emptyButton: { backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyButtonText: { color: INK, fontWeight: '800', fontSize: 14 },
}); 