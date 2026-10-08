// screens/ActivityScreen.js
import React, { useState, useContext, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { AuthContext } from '../../context/AuthContext';
import { getMyListings, getMySkillOffers, getMyMatches, getMyInquiries } from '../../api/api';
import { timeAgo } from '../../utils/time';
import { goToAuth } from '../../utils/goToAuth';

import { color as T, font as F } from "../../theme/tokens";
// Last loaded activity per user, so coming back shows it instantly.
const activityCache = {};

const capitalize = (v) => {
  const str = String(v || '');
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
};

const keyExtractor = (item) => item.id;

// Activity Item Component
const ActivityItem = React.memo(({ item, onPress }) => {
  const getIconColor = (type) => {
    switch (type) {
      case 'listing': return T.yellow;
      case 'offer': return '#FF9500';
      case 'match': return T.success;
      case 'inquiry': return '#AF52DE';
      default: return T.textMuted;
    }
  };

  const getIconName = (type) => {
    switch (type) {
      case 'listing': return 'document-text-outline';
      case 'offer': return 'git-pull-request-outline';
      case 'match': return 'people-outline';
      case 'inquiry': return 'chatbubble-outline';
      default: return 'time-outline';
    }
  };

  const iconColor = getIconColor(item.type);
  const iconName = getIconName(item.type);

  return (
    <View>
      <TouchableOpacity 
        style={styles.activityCard}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[T.white, '#FFF8F0']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.activityLeft}>
            <View style={[styles.activityIcon, { backgroundColor: iconColor + '15' }]}>
              <Ionicons name={iconName} size={24} color={iconColor} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
              <View style={styles.activityTimeContainer}>
                <Ionicons name="time-outline" size={12} color="#C7C7CC" />
                <Text style={styles.activityTime}>{timeAgo(item.timestamp)}</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

export default function ActivityScreen({ navigation }) {
  const { getCurrentUserId, isGuest, setIsGuest } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const userId = getCurrentUserId();
  const cached = userId && !isGuest ? activityCache[userId] : null;

  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState(cached?.activities || []);
  const [filter, setFilter] = useState('all'); // all, listings, offers, matches, inquiries
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(cached?.stats || {
    total: 0,
    listings: 0,
    offers: 0,
    matches: 0,
    inquiries: 0
  });
  const inFlightRef = useRef(false);

  const fetchActivities = useCallback(async () => {
    if (!userId || isGuest) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      setError(null);
      
      const [listingsRes, offersRes, matchesRes, inquiriesRes] = await Promise.all([
        getMyListings(userId).catch(() => []),
        getMySkillOffers().catch(() => ({ offers: [] })),
        getMyMatches().catch(() => ({ matches: [] })),
        getMyInquiries().catch(() => ({ inquiries: [] }))
      ]);

      const listings = Array.isArray(listingsRes) ? listingsRes : [];
      const offers = offersRes?.offers || [];
      const matches = matchesRes?.matches || [];
      const inquiries = inquiriesRes?.inquiries || [];

      const allActivities = [];

      // Add listings
      listings.forEach(listing => {
        allActivities.push({
          id: `listing-${listing._id}`,
          type: 'listing',
          title: `📋 ${listing.title}`,
          subtitle: `${capitalize(listing.type)} • ${listing.status}`,
          timestamp: listing.createdAt,
          data: listing,
        });
      });

      // Add offers
      offers.forEach(offer => {
        const statusEmoji = offer.status === 'pending' ? '⏳' : 
                           offer.status === 'accepted' ? '✅' : 
                           offer.status === 'rejected' ? '❌' : '🚫';
        allActivities.push({
          id: `offer-${offer._id}`,
          type: 'offer',
          title: `${statusEmoji} Offer ${capitalize(offer.status)}`,
          subtitle: `For: ${offer.listingId?.title || 'Listing'}`,
          timestamp: offer.createdAt,
          data: offer,
        });
      });

      // Add matches
      matches.forEach(match => {
        allActivities.push({
          id: `match-${match._id}`,
          type: 'match',
          title: '🎯 Match Created!',
          subtitle: `Matched with ${match.offerorId === userId ? 'someone' : 'a user'}`,
          timestamp: match.acceptedAt || match.createdAt,
          data: match,
        });
      });

      // Add inquiries
      inquiries.forEach(inquiry => {
        const statusEmoji = inquiry.status === 'active' ? '💬' : '📌';
        allActivities.push({
          id: `inquiry-${inquiry._id}`,
          type: 'inquiry',
          title: `${statusEmoji} Inquiry ${inquiry.status === 'active' ? 'Active' : 'Resolved'}`,
          subtitle: `About: ${inquiry.listingId?.title || 'Listing'}`,
          timestamp: inquiry.createdAt,
          data: inquiry,
        });
      });

      // Sort by timestamp (newest first)
      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivities(allActivities);

      // Update stats
      const nextStats = {
        total: allActivities.length,
        listings: listings.length,
        offers: offers.length,
        matches: matches.length,
        inquiries: inquiries.length
      };
      setStats(nextStats);
      activityCache[userId] = { activities: allActivities, stats: nextStats };

    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err.message || 'Failed to load activities');
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, isGuest]);

  // Cached list shows instantly; refresh quietly each time the screen is shown.
  useFocusEffect(
    useCallback(() => {
      fetchActivities();
    }, [fetchActivities])
  );

  const handleRefresh = useCallback(() => {
    if (inFlightRef.current) return;
    setRefreshing(true);
    fetchActivities();
  }, [fetchActivities]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DashboardMain');
  }, [navigation]);

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter(a => a.type === filter);
  }, [activities, filter]);

  const handleActivityPress = useCallback((item) => {
    if (item.type === 'listing') {
      navigation.navigate('ListingDetail', { id: item.data._id });
    } else if (item.type === 'offer' && item.data.listingId) {
      navigation.navigate('ListingDetail', { id: item.data.listingId._id });
    } else if (item.type === 'match') {
      navigation.navigate('MatchChat', { 
        matchId: item.data._id,
        listingId: item.data.listingId
      });
    } else if (item.type === 'inquiry') {
      navigation.navigate('InquiryChat', {
        threadId: item.data.conversationId,
        listingTitle: item.data.listingId?.title || 'Inquiry',
        otherParticipantId: item.data.listingId?.ownerId || item.data.userId,
        listingId: item.data.listingId?._id
      });
    }
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }) => <ActivityItem item={item} onPress={handleActivityPress} />,
    [handleActivityPress]
  );

  const renderFilterChip = (label, value, count) => {
    const isActive = filter === value;
    return (
      <TouchableOpacity
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setFilter(value)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {label}
          {count > 0 && (
            <Text style={[styles.filterChipCount, isActive && styles.filterChipCountActive]}>
              {count}
            </Text>
          )}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing && !isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>loading activity...</Text>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <Ionicons name="lock-closed-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>login required</Text>
        <Text style={styles.emptySubtext}>login to see your activity</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => goToAuth(setIsGuest)}
        >
          <LinearGradient
            colors={[T.yellow, '#f7b731']}
            style={styles.loginGradient}
          >
            <Text style={styles.loginButtonText}>login</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Modern Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons 
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
            size={24} 
            color={T.ink} 
          />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>activity</Text>
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons name="refresh-outline" size={22} color={T.yellow} />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <View style={[styles.statItem, styles.statItemTotal]}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>total</Text>
            </View>
            <View style={[styles.statItem, styles.statItemListings]}>
              <Text style={[styles.statNumber, { color: T.yellow }]}>{stats.listings}</Text>
              <Text style={styles.statLabel}>listings</Text>
            </View>
            <View style={[styles.statItem, styles.statItemOffers]}>
              <Text style={[styles.statNumber, { color: '#FF9500' }]}>{stats.offers}</Text>
              <Text style={styles.statLabel}>offers</Text>
            </View>
            <View style={[styles.statItem, styles.statItemMatches]}>
              <Text style={[styles.statNumber, { color: T.success }]}>{stats.matches}</Text>
              <Text style={styles.statLabel}>matches</Text>
            </View>
            <View style={[styles.statItem, styles.statItemInquiries]}>
              <Text style={[styles.statNumber, { color: '#AF52DE' }]}>{stats.inquiries}</Text>
              <Text style={styles.statLabel}>inquiries</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {renderFilterChip('All', 'all', stats.total)}
          {renderFilterChip('Listings', 'listing', stats.listings)}
          {renderFilterChip('Offers', 'offer', stats.offers)}
          {renderFilterChip('Matches', 'match', stats.matches)}
          {renderFilterChip('Inquiries', 'inquiry', stats.inquiries)}
        </ScrollView>
      </View>

      {/* Activity List */}
      <View style={styles.listContainer}>
        <FlatList
          data={filteredActivities}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor={T.yellow}
              colors={[T.yellow]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#f9c34920', '#f7b73120']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="time-outline" size={48} color={T.yellow} />
              </LinearGradient>
              <Text style={styles.emptyText}>no activity</Text>
              <Text style={styles.emptySubtext}>
                Start by creating a listing or making an offer
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.paper,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.line,
  },
  headerBarTitle: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.ink,
    flex: 1,
    textAlign: 'center',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: T.paper,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16, fontFamily: F.body,
    color: T.textMuted,
  },
  statsContainer: {
    backgroundColor: T.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
    minWidth: 70,
  },
  statItemTotal: {
    backgroundColor: T.sand,
  },
  statItemListings: {
    backgroundColor: '#FFF8F0',
  },
  statItemOffers: {
    backgroundColor: '#FFF8F0',
  },
  statItemMatches: {
    backgroundColor: '#F0FFF4',
  },
  statItemInquiries: {
    backgroundColor: '#F8F0FF',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: F.heading,
    color: T.ink,
  },
  statLabel: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 1,
    fontFamily: F.bodyMedium,
  },
  filterContainer: {
    backgroundColor: T.card,
    paddingVertical: 12,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  filterContent: {
    paddingHorizontal: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: T.sand,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: T.line,
  },
  filterChipActive: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  filterChipText: {
    fontSize: 14,
    color: T.textMuted,
    fontFamily: F.bodyMedium,
  },
  filterChipTextActive: {
    color: T.white,
  },
  filterChipCount: {
    fontSize: 11,
    fontFamily: F.bodySemi,
    color: T.textMuted,
    marginLeft: 4,
  },
  filterChipCountActive: {
    color: T.white,
  },
  listContainer: {
    flex: 1,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  activityCard: {
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.line,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontFamily: F.bodySemi,
    color: T.ink,
  },
  activitySubtitle: {
    fontSize: 13, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 1,
  },
  activityTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  activityTime: {
    fontSize: 12, fontFamily: F.body,
    color: '#C7C7CC',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.textMuted,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14, fontFamily: F.body,
    color: '#C7C7CC',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: F.headingBold,
    color: T.ink,
    marginTop: 12,
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  loginGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: {
    color: T.white,
    fontFamily: F.bodyBold,
    fontSize: 16,
  },
});