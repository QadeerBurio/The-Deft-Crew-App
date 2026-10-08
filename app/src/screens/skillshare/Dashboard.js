// screens/skillshare/Dashboard.js — "Home": shows only the current user's own listings
import React, { useState, useCallback, useContext, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMyListings } from '../../api/api';
import { timeAgo } from '../../utils/time';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import ListingCard from '../../components/ListingCard';
import useMyProfessionalProfile from '../../hooks/useMyProfessionalProfile';

import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
const BRAND = T.yellow;
const INK = T.ink;
const MUTED = T.textFaint;
const BORDER = T.ink;

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

// module-level cache so returning to the dashboard shows the last list instantly
const MY_LISTINGS_CACHE = {};

const OwnRow = memo(function OwnRow({ item, myPhoto, onOpen }) {
  const open = () => onOpen(item._id);
  return (
    <ListingCard
      item={item}
      showOwner={true}
      ownerOverride={{ name: 'You', profileImage: myPhoto }}
      ctaLabel={OWN_CTA[item.type] || 'View Details'}
      onPress={open}
      onPropose={open}
    />
  );
});

export default function Dashboard({ navigation }) {
  const { getCurrentUserId } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const cacheKey = String(getCurrentUserId?.() || 'anon');
  const { fullName: myName, photoUrl: myPhoto } = useMyProfessionalProfile();
  const cached = MY_LISTINGS_CACHE[cacheKey];
  const [listings, setListings] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusTab, setStatusTab] = useState('Open');
  const inFlight = useRef(false);

  const fetchMyListings = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setError(null);
      const data = await getMyListings();
      const list = Array.isArray(data) ? data : [];
      MY_LISTINGS_CACHE[cacheKey] = list;
      setListings(list);
    } catch (err) {
      console.error('Error fetching my listings:', err);
      setError('Failed to load your activities.');
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [cacheKey]);

  // refresh in the background every time the screen comes into focus
  // (e.g. after creating or editing a listing)
  useFocusEffect(
    useCallback(() => {
      fetchMyListings();
    }, [fetchMyListings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyListings();
  };

  const openListing = useCallback(
    (id) => navigation.navigate('ListingDetail', { id }),
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => <OwnRow item={item} myPhoto={myPhoto} onOpen={openListing} />,
    [myPhoto, openListing]
  );

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
  const byTab = useMemo(() => {
    const byType = listings.filter((l) => typeFilter === 'All' || l.type === typeFilter);
    return byType.filter((l) => {
      if (statusTab === 'Open') return l.status === 'open';
      if (statusTab === 'Matched') return l.status === 'matched';
      if (statusTab === 'Closed') return l.status === 'closed';
      return true;
    });
  }, [listings, typeFilter, statusTab]);

  const goTo = (route) => {
    if (route === 'DashboardMain') return;
    navigation.navigate(route);
  };

  // dashboard is the root of the skillshare stack: back leaves skillshare
  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('HomeTabs');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <View style={styles.topHeader}>
        <TouchableOpacity onPress={goBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>

        <Text style={styles.topHeaderTitle}>
          skillsshare<Text style={{ color: BRAND }}>.</Text>
        </Text>

        <TouchableOpacity onPress={() => navigation.navigate('NotificationSkillshare')} hitSlop={10}>
          <Ionicons name="notifications-outline" size={22} color={INK} />
        </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === 'Home';
          return (
            <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => goTo(item.route)}>
              <Ionicons name={item.icon} size={20} color={active ? INK : T.textMuted} />
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
          keyExtractor={(item, index) => String(item._id ?? index)}
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />}
          renderItem={renderItem}
          initialNumToRender={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={
            <View>
              {/* Hero (yellow, Skills design) */}
              <View style={S.hero}>
                <View style={{ flex: 1 }}>
                  <Text style={S.heroTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>know something? trade it.</Text>
                  <Text style={S.heroSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>swap a skill, or get paid to teach it.</Text>
                  <TouchableOpacity
                    style={S.heroBtn}
                    onPress={() => navigation.navigate('SelectListingTypeScreen')}
                    accessibilityRole="button"
                  >
                    <Text style={S.heroBtnText}>create listing</Text>
                  </TouchableOpacity>
                </View>
                <View style={S.heroIcon}>
                  <Ionicons name="swap-horizontal" size={30} color={INK} />
                </View>
              </View>

              {/* Stats (real, from your own listings) */}
              <View style={S.stats}>
                <View style={S.stat}>
                  <Text style={S.statN} maxFontSizeMultiplier={MAX_FONT_SCALE}>{activeExchanges}</Text>
                  <Text style={S.statLabel}>active</Text>
                </View>
                <View style={S.stat}>
                  <Text style={S.statN} maxFontSizeMultiplier={MAX_FONT_SCALE}>{pendingProjects}</Text>
                  <Text style={S.statLabel}>pending</Text>
                </View>
                <View style={S.stat}>
                  <Text style={S.statN} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    rs {totalEarnings.toLocaleString()}
                  </Text>
                  <Text style={S.statLabel}>earned</Text>
                </View>
              </View>

              <Text style={S.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                my activity<Text style={{ color: BRAND }}>.</Text>
              </Text>

              {/* Status: segmented control */}
              <View style={S.seg}>
                {TABS.map((t) => {
                  const active = statusTab === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setStatusTab(t)}
                      style={[S.segItem, active && S.segItemOn]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[S.segText, active && S.segTextOn]}>{t.toLowerCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Type filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chips}>
                {FILTERS.map((f) => {
                  const active = typeFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[S.chip, active && S.chipOn]}
                      onPress={() => setTypeFilter(f.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[S.chipText, active && S.chipTextOn]}>{f.label.toLowerCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={50} color={T.textFaint} />
              <Text style={styles.emptyText}>
                {error || 'Nothing here yet. Create your first listing!'}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('SelectListingTypeScreen')}
              >
                <Text style={styles.emptyButtonText}>create listing</Text>
              </TouchableOpacity>
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
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
    backgroundColor: T.paper,
  },
  topHeaderTitle: { fontSize: 22, fontFamily: F.heading, color: INK },
  navRow: {
    flexDirection: 'row', backgroundColor: T.paper,
    borderBottomWidth: 1, borderBottomColor: T.line, paddingBottom: 4,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navItemText: { fontSize: 11, color: T.textMuted, marginTop: 3, fontFamily: F.bodySemi },
  navItemTextActive: { color: INK, fontFamily: F.bodyBold },
  navUnderline: { marginTop: 4, height: 3, width: 24, backgroundColor: BRAND, borderRadius: 2 },
  listContent: { padding: 20, paddingTop: 16 },
  pageTitle: { fontSize: 26, fontFamily: F.heading, color: INK },
  pageSubtitle: { fontSize: 13, fontFamily: F.body, color: T.textMuted, marginTop: 4, marginBottom: 18, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  statCard: {
    flex: 1, alignItems: 'center', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, paddingVertical: 16, backgroundColor: T.card, gap: 4,
  },
  statValue: { fontSize: 20, fontFamily: F.heading, color: INK },
  statLabel: { fontSize: 11, fontFamily: F.body, color: T.textMuted, textAlign: 'center', lineHeight: 14 },
  sectionTitle: { fontSize: 20, fontFamily: F.heading, color: INK, marginBottom: 12 },
  chipsRow: { marginBottom: 14 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18,
    backgroundColor: T.sand, marginRight: 8,
  },
  chipActive: { backgroundColor: BRAND },
  chipText: { fontSize: 13, fontFamily: F.bodySemi, color: T.textMuted },
  chipTextActive: { color: INK, fontFamily: F.bodyBold },
  tabsRow: {
    flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: T.line, marginBottom: 14,
  },
  tabItem: { paddingBottom: 8 },
  tabText: { fontSize: 14, color: T.textFaint, fontFamily: F.bodySemi },
  tabTextActive: { color: INK, fontFamily: F.bodyBold },
  tabUnderline: { marginTop: 6, height: 2, backgroundColor: INK, borderRadius: 1 },
  card: {
    backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.line,
    padding: 16, marginBottom: 14,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTypeLabel: { fontSize: 11, fontFamily: F.bodyBold, color: MUTED, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#E8F0FE' },
  badgeActiveText: { fontSize: 11, fontFamily: F.bodyBold, color: T.ink },
  badgePending: { backgroundColor: T.sand },
  badgePendingText: { fontSize: 11, fontFamily: F.bodyBold, color: T.textMuted },
  cardTitle: { fontSize: 17, fontFamily: F.bodyBold, color: INK, marginBottom: 6 },
  cardMeta: { fontSize: 13, fontFamily: F.body, color: T.textMuted, marginBottom: 6 },
  cardTime: { fontSize: 11, fontFamily: F.body, color: T.textFaint },
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 14, fontFamily: F.body, color: T.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 16, paddingHorizontal: 20 },
  emptyButton: { backgroundColor: BRAND, paddingHorizontal: 24, height: 44, justifyContent: 'center', borderRadius: 22 },
  emptyButtonText: { color: INK, fontFamily: F.bodyBold, fontSize: 14 },
});

// ─── SkillsShare design layout ──────────────────────────────────────
const S = StyleSheet.create({
  hero: { borderRadius: 26, backgroundColor: BRAND, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroTitle: { fontFamily: F.heading, fontSize: 21, lineHeight: 25, color: INK },
  heroSub: { fontFamily: F.body, fontSize: 13.5, color: INK, marginTop: 4 },
  heroBtn: { alignSelf: 'flex-start', marginTop: 12, height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: INK, justifyContent: 'center' },
  heroBtnText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.white },
  heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },

  stats: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 18 },
  stat: { flex: 1, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  statN: { fontFamily: F.heading, fontSize: 22, color: INK },
  statLabel: { fontFamily: F.body, fontSize: 12, color: T.textMuted },

  h2: { fontFamily: F.heading, fontSize: 17, color: INK, marginBottom: 10 },
  seg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 24, backgroundColor: T.sand },
  segItem: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  segItemOn: { backgroundColor: INK },
  segText: { fontFamily: F.bodySemi, fontSize: 14, color: INK },
  segTextOn: { fontFamily: F.bodyBold, color: T.white },

  chips: { gap: 8, paddingTop: 12, paddingBottom: 14 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, justifyContent: 'center' },
  chipOn: { backgroundColor: INK, borderColor: INK },
  chipText: { fontFamily: F.bodySemi, fontSize: 13, color: INK },
  chipTextOn: { color: T.white },
});
