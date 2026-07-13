// screens/ActivityScreen.js
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../context/AuthContext';
import { getMyListings, getMySkillOffers, getMyMatches, getMyInquiries } from '../../api/api';
import { timeAgo } from '../../utils/time';

const { width, height } = Dimensions.get('window');

// Activity Item Component with animations
const ActivityItem = React.memo(({ item, index, onPress }) => {
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const itemSlideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(itemSlideAnim, {
        toValue: 0,
        friction: 7,
        tension: 35,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        delay: index * 80,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const getIconColor = (type) => {
    switch (type) {
      case 'listing': return '#f9c349';
      case 'offer': return '#FF9500';
      case 'match': return '#34C759';
      case 'inquiry': return '#AF52DE';
      default: return '#8E8E93';
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
    <Animated.View
      style={{
        opacity: itemFadeAnim,
        transform: [{ translateY: itemSlideAnim }, { scale: scaleAnim }]
      }}
    >
      <TouchableOpacity 
        style={styles.activityCard}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FFF8F0']}
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
    </Animated.View>
  );
});

export default function ActivityScreen({ navigation }) {
  const { getCurrentUserId, isGuest } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('all'); // all, listings, offers, matches, inquiries
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    listings: 0,
    offers: 0,
    matches: 0,
    inquiries: 0
  });

  const userId = getCurrentUserId();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const fetchActivities = useCallback(async () => {
    if (!userId || isGuest) {
      setLoading(false);
      return;
    }

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
          subtitle: `${listing.type.charAt(0).toUpperCase() + listing.type.slice(1)} • ${listing.status}`,
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
          title: `${statusEmoji} Offer ${offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}`,
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
      setStats({
        total: allActivities.length,
        listings: listings.length,
        offers: offers.length,
        matches: matches.length,
        inquiries: inquiries.length
      });

    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, isGuest]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const getFilteredActivities = () => {
    if (filter === 'all') return activities;
    return activities.filter(a => a.type === filter);
  };

  const handleActivityPress = (item) => {
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
  };

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

  const filteredActivities = getFilteredActivities();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading activity...</Text>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Ionicons name="lock-closed-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>Login Required</Text>
        <Text style={styles.emptySubtext}>Login to see your activity</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <LinearGradient
            colors={['#f9c349', '#f7b731']}
            style={styles.loginGradient}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Modern Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
            size={24} 
            color="#1C1C1E" 
          />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Activity</Text>
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh-outline" size={22} color="#f9c349" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <Animated.View 
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <View style={[styles.statItem, styles.statItemTotal]}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statItem, styles.statItemListings]}>
              <Text style={[styles.statNumber, { color: '#f9c349' }]}>{stats.listings}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={[styles.statItem, styles.statItemOffers]}>
              <Text style={[styles.statNumber, { color: '#FF9500' }]}>{stats.offers}</Text>
              <Text style={styles.statLabel}>Offers</Text>
            </View>
            <View style={[styles.statItem, styles.statItemMatches]}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>{stats.matches}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={[styles.statItem, styles.statItemInquiries]}>
              <Text style={[styles.statNumber, { color: '#AF52DE' }]}>{stats.inquiries}</Text>
              <Text style={styles.statLabel}>Inquiries</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Filter Chips */}
      <Animated.View 
        style={[
          styles.filterContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
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
      </Animated.View>

      {/* Activity List */}
      <Animated.View 
        style={[
          styles.listContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ActivityItem 
              item={item} 
              index={index} 
              onPress={handleActivityPress}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#f9c349"
              colors={["#f9c349"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#f9c34920', '#f7b73120']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="time-outline" size={48} color="#f9c349" />
              </LinearGradient>
              <Text style={styles.emptyText}>No activity</Text>
              <Text style={styles.emptySubtext}>
                Start by creating a listing or making an offer
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginTop:34
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
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
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
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
    backgroundColor: '#F8F9FA',
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
    fontWeight: '800',
    color: '#1C1C1E',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
    fontWeight: '500',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
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
    backgroundColor: '#F8F9FA',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  filterChipActive: {
    backgroundColor: '#f9c349',
    borderColor: '#f9c349',
  },
  filterChipText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 4,
  },
  filterChipCountActive: {
    color: '#FFFFFF',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
    fontWeight: '600',
    color: '#1C1C1E',
  },
  activitySubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 1,
  },
  activityTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  activityTime: {
    fontSize: 12,
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
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});