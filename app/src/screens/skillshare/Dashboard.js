// screens/skillshare/Dashboard.js — "Home": shows only the current user's own listings
import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { getMyListings } from '../../api/api';
import { timeAgo } from '../../utils/time';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import ListingCard from '../../components/ListingCard';
import useMyProfessionalProfile from '../../hooks/useMyProfessionalProfile';

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#999';
const BORDER = '#1a1a1a';

const TYPE_META = {
  barter: { label: 'EXCHANGE', icon: 'swap-horizontal-outline' },
  paid: { label: 'PAID OFFER', icon: 'cash-outline' },
  job: { label: 'HIRE POST', icon: 'briefcase-outline' },
};

const FILTERS = [
  { key: 'All', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'barter', label: 'Exchanges' },
  { key: 'job', label: 'Hire' },
];

const TABS = ['Open', 'Matched', 'Closed'];

const NAV_ITEMS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', route: 'DashboardMain' },
  { key: 'Explore', label: 'Explore', icon: 'search-outline', route: 'BrowseListings' },
  { key: 'Post', label: 'Post', icon: 'add-circle-outline', route: 'SelectListingTypeScreen' },
  { key: 'Chats', label: 'Chats', icon: 'chatbubble-ellipses-outline', route: 'MyMatches' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', route: 'SkillProfile' },
];

const OWN_CTA = { barter: 'Manage Offers', paid: 'Manage Requests', job: 'Manage Applicants' };

export default function Dashboard({ navigation }) {
 const { getCurrentUserId } = useContext(AuthContext);
  const { fullName: myName, photoUrl: myPhoto } = useMyProfessionalProfile();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusTab, setStatusTab] = useState('Open');

  const fetchMyListings = useCallback(async () => {
    try {
      setError(null);
      const data = await getMyListings();
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching my listings:', err);
      setError('Failed to load your activities.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMyListings(); }, [fetchMyListings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyListings();
  };

  // ---- Stats ----
  const activeExchanges = listings.filter((l) => l.type === 'barter' && l.status === 'matched').length;
  const totalEarnings = listings
    .filter((l) => l.type === 'paid' && (l.status === 'matched' || l.status === 'closed'))
    .reduce((sum, l) => sum + (l.price || 0), 0);
  const pendingProjects = listings.reduce((sum, l) => {
    if (l.status === 'closed') return sum;
    return sum + (l.pendingOfferCount ?? (l.status === 'open' ? l.offerCount || 0 : 0));
  }, 0);

  // ---- Filtering ----
  const byType = listings.filter((l) => typeFilter === 'All' || l.type === typeFilter);
 const byTab = byType.filter((l) => {
  if (statusTab === 'Open') return l.status === 'open';
  if (statusTab === 'Matched') return l.status === 'matched';
  if (statusTab === 'Closed') return l.status === 'closed';
  return true;
});

  const goTo = (route) => {
  if (route === 'DashboardMain') return;
  navigation.replace(route);
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

    <View style={styles.topHeader}>
 <TouchableOpacity onPress={() => navigation.getParent()?.navigate('HomeTabs')}>
  <Ionicons name="arrow-back" size={22} color={INK} />
</TouchableOpacity>

  <Text style={styles.topHeaderTitle}>
    Skill<Text style={{ color: BRAND }}>Share</Text>
  </Text>

  <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
    <Ionicons name="notifications-outline" size={22} color={INK} />
  </TouchableOpacity>
</View>

      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === 'Home';
          return (
            <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => goTo(item.route)}>
              <Ionicons name={item.icon} size={20} color={active ? BRAND : '#666'} />
              <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{item.label}</Text>
              {active && <View style={styles.navUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <FlatList
          data={byTab}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />}
      renderItem={({ item }) => (
  <ListingCard
    item={item}
    showOwner={true}
    ownerOverride={{ name: 'You', profileImage: myPhoto }}
    ctaLabel={OWN_CTA[item.type] || 'View Details'}
    onPress={() => navigation.navigate('ListingDetail', { id: item._id })}
    onPropose={() => navigation.navigate('ListingDetail', { id: item._id })}
  />
)}
          ListHeaderComponent={
            <View>
              <Text style={styles.pageTitle}>Dashboard</Text>
              <Text style={styles.pageSubtitle}>Welcome back! Here's an overview of your activities.</Text>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Ionicons name="swap-horizontal-outline" size={22} color={INK} />
                  <Text style={styles.statValue}>{activeExchanges}</Text>
                  <Text style={styles.statLabel}>Active{'\n'}Exchanges</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="wallet-outline" size={22} color={INK} />
                  <Text style={styles.statValue}>Rs.{totalEarnings}</Text>
                  <Text style={styles.statLabel}>Total{'\n'}Earnings</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="hourglass-outline" size={22} color={INK} />
                  <Text style={styles.statValue}>{pendingProjects}</Text>
                  <Text style={styles.statLabel}>Pending{'\n'}Projects</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>My Activities</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                {FILTERS.map((f) => {
                  const active = typeFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setTypeFilter(f.key)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.tabsRow}>
                {TABS.map((t) => {
                  const active = statusTab === t;
                  return (
                    <TouchableOpacity key={t} onPress={() => setStatusTab(t)} style={styles.tabItem}>
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
              <MaterialCommunityIcons name="briefcase-search-outline" size={50} color="#ddd" />
              <Text style={styles.emptyText}>
                {error || 'Nothing here yet — create your first listing!'}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('SelectListingTypeScreen')}
              >
                <Text style={styles.emptyButtonText}>Create Listing</Text>
              </TouchableOpacity>
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
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  topHeaderTitle: { fontSize: 22, fontWeight: '800', color: INK },
  navRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navItemText: { fontSize: 11, color: '#666', marginTop: 3, fontWeight: '600' },
  navItemTextActive: { color: BRAND, fontWeight: '800' },
  navUnderline: { marginTop: 4, height: 2, width: 24, backgroundColor: BRAND, borderRadius: 1 },
  listContent: { padding: 20, paddingTop: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: INK },
  pageSubtitle: { fontSize: 13, color: '#555', marginTop: 4, marginBottom: 18, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  statCard: {
    flex: 1, alignItems: 'center', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, paddingVertical: 16, backgroundColor: '#fff', gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: INK },
  statLabel: { fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: INK, marginBottom: 12 },
  chipsRow: { marginBottom: 14 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18,
    backgroundColor: '#eee', marginRight: 8,
  },
  chipActive: { backgroundColor: BRAND },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: INK, fontWeight: '800' },
  tabsRow: {
    flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', marginBottom: 14,
  },
  tabItem: { paddingBottom: 8 },
  tabText: { fontSize: 14, color: '#999', fontWeight: '600' },
  tabTextActive: { color: INK, fontWeight: '800' },
  tabUnderline: { marginTop: 6, height: 2, backgroundColor: INK, borderRadius: 1 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e5e5',
    padding: 16, marginBottom: 14,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTypeLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#E8F0FE' },
  badgeActiveText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
  badgePending: { backgroundColor: '#F0F0F0' },
  badgePendingText: { fontSize: 11, fontWeight: '700', color: '#666' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: INK, marginBottom: 6 },
  cardMeta: { fontSize: 13, color: '#555', marginBottom: 6 },
  cardTime: { fontSize: 11, color: '#aaa' },
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 10, marginBottom: 16, paddingHorizontal: 20 },
  emptyButton: { backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyButtonText: { color: INK, fontWeight: '800', fontSize: 14 },
});