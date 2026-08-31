// screens/MyListingsScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl, SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getMyListings, closeListing } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#8E8E93';
const BORDER = '#e5e5e5';

const TYPE_META = {
  barter: { label: 'Exchange', icon: 'swap-horizontal-outline' },
  paid: { label: 'Paid Service', icon: 'cash-outline' },
  job: { label: 'Hire Post', icon: 'briefcase-outline' },
};


function ListingCard({ item, onClose, onPress }) {
  const meta = TYPE_META[item.type] || TYPE_META.barter;
  const isOpen = item.status === 'open';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(item._id)}>
      <View style={styles.cardTopRow}>
        <View style={styles.typePill}>
          <Ionicons name={meta.icon} size={13} color={MUTED} />
          <Text style={styles.typePillText}>{meta.label}</Text>
        </View>
        <View style={[styles.statusPill, isOpen ? styles.statusPillOpen : styles.statusPillClosed]}>
          {isOpen && <View style={styles.statusDot} />}
          <Text style={[styles.statusPillText2, { color: isOpen ? '#2e7d32' : '#888' }]}>
            {isOpen ? 'Active' : 'Closed'}
          </Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>

      {item.skillOffered?.skillName && (
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={BRAND} />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Offering: </Text>
            <Text style={styles.detailValue}>{item.skillOffered.skillName}</Text>
            {item.skillOffered.proficiencyLevel && (
              <Text style={styles.detailLevel}> · {capitalize(item.skillOffered.proficiencyLevel)}</Text>
            )}
          </Text>
        </View>
      )}

      {item.type === 'paid' && item.price != null && (
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#2e7d32" />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Price: </Text>
            <Text style={[styles.detailValue, styles.priceValue]}>${item.price}</Text>
          </Text>
        </View>
      )}

      {item.type === 'job' && item.budget != null && (
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#2e7d32" />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Budget: </Text>
            <Text style={[styles.detailValue, styles.priceValue]}>${item.budget}</Text>
          </Text>
        </View>
      )}

      {item.type === 'barter' && item.skillWanted?.skillName && (
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="target" size={16} color={BRAND} />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Seeking: </Text>
            <Text style={styles.detailValue}>{item.skillWanted.skillName}</Text>
          </Text>
        </View>
      )}

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color="#bbb" />
          <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
        </View>
        {isOpen && (
          <TouchableOpacity style={styles.closeBtn} onPress={() => onClose(item._id)} hitSlop={6}>
            <Ionicons name="close" size={13} color="#c62828" />
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

export default function MyListingsScreen({ navigation }) {
  const { getCurrentUserId, isGuest } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchListings = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId || isGuest) { setLoading(false); return; }
    try {
      const data = await getMyListings();
      setListings(Array.isArray(data) ? data : data.listings || []);
    } catch (err) {
      console.error('Fetch listings error:', err);
    } finally { setLoading(false); setRefreshing(false); }
  }, [getCurrentUserId, isGuest]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const onRefresh = () => { setRefreshing(true); fetchListings(); };

  const handleClose = (listingId) => {
    Alert.alert('Close Listing', 'Are you sure you want to close this listing? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close', style: 'destructive',
        onPress: async () => {
          try { await closeListing(listingId); fetchListings(); }
          catch (err) { Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to close listing'); }
        },
      },
    ]);
  };

  const counts = {
    total: listings.length,
    open: listings.filter((l) => l.status === 'open').length,
    closed: listings.filter((l) => l.status === 'closed').length,
  };

  const filtered = filter === 'all' ? listings : listings.filter((l) => l.status === filter);

 
  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerFillScreen}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="person-outline" size={56} color="#ddd" />
        <Text style={styles.emptyTitle}>Welcome Back!</Text>
        <Text style={styles.emptyText}>Login to view and manage your listings</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>My Listings</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('SelectListingTypeScreen')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={INK} />
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
            <ListingCard
              item={item}
              onClose={handleClose}
              onPress={(id) => navigation.navigate('ListingDetail', { id })}
            />
          )}
          ListHeaderComponent={
            <View>
              <View style={styles.statsCard}>
                <View style={styles.statsIconBox}>
                  <MaterialCommunityIcons name="format-list-bulleted" size={20} color={BRAND} />
                </View>
                <View style={styles.statsMain}>
                  <Text style={styles.statsMainNumber}>{counts.total}</Text>
                  <Text style={styles.statsMainLabel}>TOTAL LISTINGS</Text>
                </View>
                <View style={styles.statsDivider} />
                <View style={styles.statsSub}>
                  <Text style={styles.statsSubNumber}>{counts.open}</Text>
                  <Text style={styles.statsSubLabel}>Active</Text>
                </View>
                <View style={styles.statsDivider} />
                <View style={styles.statsSub}>
                  <Text style={styles.statsSubNumber}>{counts.closed}</Text>
                  <Text style={styles.statsSubLabel}>Closed</Text>
                </View>
              </View>

              <View style={styles.filterRow}>
                {[
                  { key: 'all', label: 'All', count: counts.total },
                  { key: 'open', label: 'Open', count: counts.open },
                  { key: 'closed', label: 'Closed', count: counts.closed },
                ].map((f) => {
                  const active = filter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setFilter(f.key)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {f.label} {f.count > 0 ? `(${f.count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-document-plus-outline" size={50} color="#ddd" />
              <Text style={styles.emptyTitle}>
                {filter !== 'all' ? `No ${filter} listings` : 'No Listings Yet'}
              </Text>
              <Text style={styles.emptyText}>
                {filter !== 'all'
                  ? `You don't have any ${filter} listings at the moment`
                  : 'Create your first listing to get started'}
              </Text>
              {filter === 'all' && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('SelectListingTypeScreen')}
                >
                  <Text style={styles.emptyButtonText}>Create Listing</Text>
                </TouchableOpacity>
              )}
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
  headerBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center',
  },
  topHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#8a6d1d' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND,
    justifyContent: 'center', alignItems: 'center',
  },

  listContent: { padding: 20, paddingTop: 16, paddingBottom: 20 },

  statsCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e8d9a8', borderRadius: 16, padding: 14, marginBottom: 16,
  },
  statsIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF3D6',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  statsMain: { marginRight: 'auto' },
  statsMainNumber: { fontSize: 22, fontWeight: '800', color: INK },
  statsMainLabel: { fontSize: 10, color: MUTED, fontWeight: '700', letterSpacing: 0.5 },
  statsDivider: { width: 1, height: 30, backgroundColor: '#eee', marginHorizontal: 14 },
  statsSub: { alignItems: 'center' },
  statsSubNumber: { fontSize: 18, fontWeight: '800', color: INK },
  statsSubLabel: { fontSize: 11, color: MUTED, marginTop: 1 },

  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5',
  },
  filterChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  filterChipTextActive: { color: INK, fontWeight: '800' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 14,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF3D6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  typePillText: { fontSize: 12, fontWeight: '700', color: '#8a6d1d' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusPillOpen: { backgroundColor: '#E8F5E9' },
  statusPillClosed: { backgroundColor: '#F0F0F0' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2e7d32' },
  statusPillText2: { fontSize: 12, fontWeight: '700' },

  cardTitle: { fontSize: 20, fontWeight: '800', color: INK, marginBottom: 12 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailText: { fontSize: 14, flex: 1 },
  detailLabel: { color: MUTED, fontWeight: '600' },
  detailValue: { color: INK, fontWeight: '700' },
  detailLevel: { color: MUTED, fontWeight: '500' },
  priceValue: { color: '#2e7d32', fontWeight: '800' },

  cardDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: 12, color: '#bbb' },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFEBEE', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
  },
  closeBtnText: { fontSize: 13, fontWeight: '700', color: '#c62828' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: INK, marginTop: 12 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 6, marginBottom: 16, paddingHorizontal: 20 },
  emptyButton: { backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyButtonText: { color: INK, fontWeight: '800', fontSize: 14 },

 
});