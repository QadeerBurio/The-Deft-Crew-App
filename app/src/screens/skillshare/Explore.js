//backend/app/src/screens/skillshare/Explore.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, SafeAreaView, StatusBar, ScrollView, Image,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { getListings } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import ListingCard from '../../components/ListingCard';

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#8E8E93';

const TYPE_FILTERS = [
  { key: 'All', label: 'All' },
  { key: 'barter', label: 'Exchange' },
  { key: 'paid', label: 'Paid' },
  { key: 'job', label: 'Hire' },
];

const POPULAR_SKILLS = ['Programming', 'Graphic Design', 'UI/UX', 'Tutoring', 'Writing', 'Marketing'];

const NAV_ITEMS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', route: 'DashboardMain' },
  { key: 'Explore', label: 'Explore', icon: 'search-outline', route: 'BrowseListings' },
  { key: 'Post', label: 'Post', icon: 'add-circle-outline', route: 'SelectListingTypeScreen' },
  { key: 'Chats', label: 'Chats', icon: 'chatbubble-ellipses-outline', route: 'MyMatches' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', route: 'SkillProfile' },
];

export default function Explore({ navigation }) {
  const { getCurrentUserId } = useContext(AuthContext);
  const currentUserId = getCurrentUserId?.();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [listings, setListings] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true); // only true on very first load
  const [searching, setSearching] = useState(false);           // true during any refetch after that
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchListings = useCallback(async (searchTerm) => {
    try {
      const res = await getListings({ type: typeFilter, search: searchTerm, limit: 50 });
      const others = (res || []).filter((l) => {
        const ownerId = l.ownerId?._id || l.ownerId;
        return !currentUserId || ownerId?.toString() !== currentUserId?.toString();
      });
      setListings(others);
    } catch (err) {
      console.error('Error fetching explore listings:', err);
      setListings([]);
    } finally {
      setInitialLoading(false);
      setSearching(false);
      setRefreshing(false);
      setHasLoadedOnce(true);
    }
  }, [typeFilter, currentUserId]);

  // Debounced fetch — refetches 400ms after typing stops or the type filter changes.
  // Uses `searching` (not `initialLoading`) after the first load, so the search bar
  // and FlatList never unmount mid-typing — keeping keyboard focus intact.
  useEffect(() => {
    if (hasLoadedOnce) setSearching(true);
    const timeout = setTimeout(() => {
      fetchListings(search.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = () => { setRefreshing(true); fetchListings(search.trim()); };

  const searchLower = search.trim().toLowerCase();
  const filtered = listings.filter((l) => {
    if (!searchLower) return true;
    const haystack = [
      l.title,
      l.skillOffered?.skillName,
      l.skillWanted?.skillName,
      l.skillNeeded?.skillName,
      l.ownerId?.name,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(searchLower);
  });

  const recommended = filtered.slice(0, 5);
  const rest = filtered.slice(0, 20);

  const goTo = (route) => {
    if (route === 'BrowseListings') return;
    navigation.replace(route);
  };

  // Only show the full-page spinner before the very first successful load —
  // never again after that, so the search bar stays mounted while typing.
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.centerFill}><ActivityIndicator size="large" color={BRAND} /></View>
      </SafeAreaView>
    );
  }

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
          const active = item.key === 'Explore';
          return (
            <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => goTo(item.route)}>
              <Ionicons name={item.icon} size={20} color={active ? BRAND : '#666'} />
              <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{item.label}</Text>
              {active && <View style={styles.navUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={rest}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />}
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            showOwner={true}
            onPress={() => navigation.navigate('ListingDetail', { id: item._id })}
            onPropose={() => navigation.navigate('CreateOffer', { listing: item })}
          />
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for skills, services, or users..."
                placeholderTextColor="#999"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {searching && <ActivityIndicator size="small" color={BRAND} />}
              {!searching && search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {TYPE_FILTERS.map((f) => {
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

            {recommended.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recommended For You</Text>
                <FlatList
                  data={recommended}
                  keyExtractor={(item) => `rec-${item._id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 20 }}
                  renderItem={({ item }) => (
                    <View style={{ width: 280, marginRight: 12 }}>
                      <ListingCard
                        item={item}
                        showOwner={true}
                        onPress={() => navigation.navigate('ListingDetail', { id: item._id })}
                        onPropose={() => navigation.navigate('CreateOffer', { listing: item })}
                      />
                    </View>
                  )}
                />
              </>
            )}

            <Text style={styles.sectionTitle}>Popular Skills</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {POPULAR_SKILLS.map((skill) => {
                const active = search.trim().toLowerCase() === skill.toLowerCase();
                return (
                  <TouchableOpacity
                    key={skill}
                    style={[styles.skillChip, active && styles.skillChipActive]}
                    onPress={() => setSearch(active ? '' : skill)}
                  >
                    <Text style={[styles.skillChipText, active && styles.skillChipTextActive]}>{skill}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>
              {searchLower ? `Results for "${search.trim()}"` : 'Recently Posted'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>
              {searchLower
                ? `No listings match "${search.trim()}" yet.`
                : 'No listings found'}
            </Text>
            {searchLower && (
              <Text style={styles.emptySubtext}>
                Try a different skill, or check back later as more listings are posted.
              </Text>
            )}
          </View>
        }
      />
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
  topHeaderTitle: { fontSize: 20, fontWeight: '800', color: INK },
  navRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navItemText: { fontSize: 11, color: '#666', marginTop: 3, fontWeight: '600' },
  navItemTextActive: { color: BRAND, fontWeight: '800' },
  navUnderline: { marginTop: 4, height: 2, width: 24, backgroundColor: BRAND, borderRadius: 1 },
  listContent: { padding: 20, paddingTop: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, paddingHorizontal: 14, height: 46, marginBottom: 14, gap: 8,
    borderWidth: 1, borderColor: '#eee',
  },
  searchInput: { flex: 1, fontSize: 14, color: INK },
  chipsRow: { marginBottom: 18 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#e5e5e5' },
  chipActive: { backgroundColor: INK, borderColor: INK },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  skillChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#e5e5e5' },
  skillChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  skillChipText: { fontSize: 13, fontWeight: '600', color: INK },
  skillChipTextActive: { color: INK, fontWeight: '800' },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: INK, marginBottom: 12, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 14, color: '#666', marginTop: 10, textAlign: 'center', paddingHorizontal: 30 },
  emptySubtext: { fontSize: 13, color: '#aaa', marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
});