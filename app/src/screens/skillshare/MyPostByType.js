import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyListings } from '../../api/api';
import ListingCard from '../../components/ListingCard';

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#8E8E93';

const STATUS_TABS = {
  barter: ['All Active', 'Pending Responses', 'Paused'],
  paid: ['All Active', 'Pending', 'Paused'],
  job: ['All Posts', 'Hire', 'Exchange'],
};

const OWN_CTA = { barter: 'Manage Offers', paid: 'Manage Requests', job: 'Manage Applicants' };

export default function MyPostsByType({ route, navigation }) {
  const { type, title } = route.params;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await getMyListings();
      const all = Array.isArray(data) ? data : [];
      setListings(all.filter((l) => l.type === type));
    } catch (err) {
      console.error('Error loading my posts:', err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const tabs = STATUS_TABS[type] || ['All'];

  const filtered = listings.filter((l) => {
    if (tab === 0) return l.status !== 'closed';
    if (tabs[tab] === 'Pending Responses' || tabs[tab] === 'Pending') {
      return l.status !== 'closed' && (l.pendingOfferCount ?? l.offerCount ?? 0) > 0;
    }
    if (tabs[tab] === 'Paused') return l.status === 'closed';
    return true;
  });

 
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={BRAND} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>{title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SelectListingTypeScreen')}>
          <Text style={styles.createLink}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
        {tabs.map((t, i) => {
          const active = tab === i;
          return (
            <TouchableOpacity key={t} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(i)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 20 }}
   // ...inside the component, replace the FlatList's renderItem prop:
renderItem={({ item }) => (
  <ListingCard
    item={item}
    showOwner={false}
    ctaLabel={OWN_CTA[item.type] || 'View Details'}
    onPress={() => navigation.navigate('ListingDetail', { id: item._id })}
    onPropose={() => navigation.navigate('ListingDetail', { id: item._id })}
  />
)}
          ListEmptyComponent={<Text style={styles.emptyText}>Nothing here yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  topHeaderTitle: { fontSize: 18, fontWeight: '800', color: BRAND },
  createLink: { fontSize: 14, fontWeight: '700', color: INK },
  tabsRow: { paddingHorizontal: 16, paddingTop: 12, maxHeight: 44 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#e5e5e5' },
  tabActive: { backgroundColor: INK, borderColor: INK },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTopRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typePill: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  typePillText: { fontSize: 11, fontWeight: '700', color: '#555' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusActive: { backgroundColor: '#FFF3D6' },
  statusClosed: { backgroundColor: '#fde2e1' },
  statusPillText: { fontSize: 11, fontWeight: '700', color: '#8a6d1d' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: INK, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetValue: { fontSize: 15, fontWeight: '800', color: INK },
  budgetLabel: { fontSize: 11, color: MUTED },
  countText: { fontSize: 13, fontWeight: '700', color: '#8a6d1d' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});