// screens/ManageOffersScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl, SafeAreaView, StatusBar, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOffersForListing, updateOfferStatus } from '../../api/api';
import { timeAgo } from '../../utils/time';

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#8E8E93';
const BORDER = '#e5e5e5';

function OfferCard({ item, isBarter, onAction, onOpenChat, onViewDetails }) {
  const isPending = item.status === 'pending';
  const isAccepted = item.status === 'accepted';
  const isRejected = item.status === 'rejected';
  const offeror = item.offerorId || {};

  const statusPill = isAccepted
    ? { bg: '#E8F5E9', color: '#2e7d32', label: 'Accepted', icon: 'checkmark-circle' }
    : isRejected
    ? { bg: '#FFEBEE', color: '#c62828', label: 'Rejected', icon: 'close-circle' }
    : { bg: '#FFF3D6', color: '#8a6d1d', label: 'Pending', icon: 'time' };

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
          <Text style={styles.detailLabel}>Skill: <Text style={styles.detailValue}>{item.offeredSkillName}</Text></Text>
        </View>
      )}
      {item.offeredSkillLevel && (
        <View style={styles.detailRow}>
          <Ionicons name="star-outline" size={15} color={MUTED} />
          <Text style={styles.detailLabel}>Experience: <Text style={styles.detailValue}>{item.offeredSkillLevel}</Text></Text>
        </View>
      )}
      {item.proposedPrice != null && (
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={15} color={MUTED} />
          <Text style={styles.detailLabel}>Price: <Text style={styles.detailValue}>${item.proposedPrice}</Text></Text>
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
            <TouchableOpacity style={styles.rejectBtn} onPress={() => onAction(item._id, 'reject')}>
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => onAction(item._id, 'accept')}>
              <Text style={styles.acceptBtnText}>Accept</Text>
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
                <Text style={styles.chatBtnText}>Open Chat</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

export default function ManageOffersScreen({ route, navigation }) {
  const { id, type } = route.params;
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOffers = useCallback(async () => {
    try {
      const data = await getOffersForListing(id);
      setOffers(data.offers || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
    } finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const onRefresh = () => { setRefreshing(true); fetchOffers(); };

  const handleOfferAction = (offerId, action) => {
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
            try {
              await updateOfferStatus(offerId, status);
              Alert.alert('Success', action === 'accept' ? 'Offer accepted! A match has been created.' : 'Offer rejected.');
              if (action === 'accept') navigation.goBack(); else fetchOffers();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to update offer');
            }
          },
        },
      ]
    );
  };

  const handleOpenChat = (item) => {
    navigation.navigate('MatchChat', { listingId: id, matchId: item.matchId?._id || item.matchId });
  };

  const handleViewDetails = (item) => {
    Alert.alert(
      item.offerorId?.name || 'Applicant',
      item.message || item.applicationNotes || 'No additional message provided.'
    );
  };

  const isBarter = type === 'barter';
  const pendingCount = offers.filter((o) => o.status === 'pending').length;
  const acceptedCount = offers.filter((o) => o.status === 'accepted').length;

  const filtered = statusFilter === 'all' ? offers : offers.filter((o) => o.status === statusFilter);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerFillScreen}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color={BRAND} />
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
        <Text style={styles.topHeaderTitle}>Manage Offers</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={22} color={INK} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />}
        renderItem={({ item }) => (
          <OfferCard
            item={item}
            isBarter={isBarter}
            onAction={handleOfferAction}
            onOpenChat={handleOpenChat}
            onViewDetails={handleViewDetails}
          />
        )}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>TOTAL</Text>
                <Text style={styles.statValue}>{offers.length}</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statLabelRow}>
                  <Ionicons name="remove-circle-outline" size={12} color={MUTED} />
                  <Text style={styles.statLabel}>PENDING</Text>
                </View>
                <Text style={[styles.statValue, { color: BRAND }]}>{pendingCount}</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statLabelRow}>
                  <Ionicons name="checkmark-circle-outline" size={12} color={MUTED} />
                  <Text style={styles.statLabel}>ACCEPTED</Text>
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
            <Ionicons name="people-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No Offers Yet</Text>
            <Text style={styles.emptySubtext}>Check back later for offers on your listing</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerFillScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 34 : 8, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  topHeaderTitle: { fontSize: 18, fontWeight: '800', color: INK },

  listContent: { padding: 20, paddingTop: 16 },

  headerCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 16,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  statItem: { alignItems: 'center' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, color: MUTED, fontWeight: '700', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '800', color: INK, marginTop: 4 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  filterBtnText: { fontSize: 13, fontWeight: '700', color: INK },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  offerorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 15, fontWeight: '800', color: '#666' },
  offerorName: { fontSize: 15, fontWeight: '700', color: INK },
  offerorTime: { fontSize: 11, color: MUTED, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontWeight: '700' },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailLabel: { fontSize: 13, color: MUTED, fontWeight: '500', flex: 1 },
  detailValue: { color: INK, fontWeight: '700' },

  messageBox: { backgroundColor: '#F8F8F8', borderRadius: 10, padding: 12, marginTop: 6, marginBottom: 4 },
  messageText: { fontSize: 13, color: '#3a3a3c', fontStyle: 'italic', lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  acceptBtn: { flex: 1, backgroundColor: BRAND, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  acceptBtnText: { fontSize: 14, fontWeight: '800', color: INK },
  rejectBtn: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: '#c62828' },
  outlineBtn: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 13, fontWeight: '700', color: INK, textAlign: 'center' },
  chatBtn: { flex: 1.5, flexDirection: 'row', gap: 6, backgroundColor: BRAND, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  chatBtnText: { fontSize: 14, fontWeight: '800', color: INK },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '800', color: INK, marginTop: 14 },
  emptySubtext: { fontSize: 13, color: MUTED, marginTop: 4 },
});