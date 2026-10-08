// screens/SkillProfileScreen.js


//to be deleted if not used in other files
import React, { useState, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { AuthContext } from '../../context/AuthContext';
import { 
  getMyListings, 
  getMySkillOffers, 
  getMyMatches,
  getMyInquiries 
} from '../../api/api';
import { timeAgo } from '../../utils/time';
import { goToAuth } from '../../utils/goToAuth';

import { color as T, font as F } from "../../theme/tokens";
import ScreenHeader from "../../ui/ScreenHeader";
// Last loaded stats + activity per user, so coming back is instant.
const statsCache = {};

const ICON_CONFIGS = {
  listing: { icon: 'document-text-outline', color: T.yellow, bg: T.yellowSoft },
  offer: { icon: 'git-pull-request-outline', color: T.ink, bg: T.yellowSoft },
  match: { icon: 'people-outline', color: T.success, bg: T.successBg },
  inquiry: { icon: 'chatbubble-outline', color: T.ink, bg: T.sand },
  default: { icon: 'time-outline', color: T.textMuted, bg: T.sand }
};

const capitalize = (v) => {
  const str = String(v || '');
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
};

// Create a separate component for Activity Item
const ActivityItem = React.memo(({ item, onPress }) => {
  const config = ICON_CONFIGS[item.type] || ICON_CONFIGS.default;

  return (
    <View>
      <TouchableOpacity 
        style={styles.activityItem}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.activityIcon, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>{item.title}</Text>
          <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
          <View style={styles.activityTimeContainer}>
            <Ionicons name="time-outline" size={12} color={T.textFaint} />
            <Text style={styles.activityTime}>{timeAgo(item.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.activityArrow}>
          <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
        </View>
      </TouchableOpacity>
    </View>
  );
});

// Stat Card Component
const StatCard = React.memo(({ number, label, icon, gradient, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.statCardWrapper}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View>
        <LinearGradient
          colors={gradient}
          style={styles.statCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name={icon} size={18} color={T.white} />
          </View>
          <Text style={styles.statNumber}>{number}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
});

export default function SkillProfile({ navigation }) {
  const { getCurrentUserId, user, isGuest, logout, getUserName, getUserEmail, setIsGuest } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const userId = getCurrentUserId();
  const cached = userId && !isGuest ? statsCache[userId] : null;

  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(cached?.stats || {
    listings: 0,
    offers: 0,
    matches: 0,
    pendingOffers: 0,
    inquiries: 0,
    activeInquiries: 0
  });
  const [recentActivity, setRecentActivity] = useState(cached?.recentActivity || []);
  const [error, setError] = useState(null);
  const inFlightRef = useRef(false);

  // Get user data
  const userName = getUserName ? getUserName() : user?.name || user?.fullName || user?.username || 'User';
  const userEmail = getUserEmail ? getUserEmail() : user?.email || '';
  const userImage = user?.profileImage || null;
  const userInitial = userName && userName !== 'Guest User' ? userName.charAt(0).toUpperCase() : 'U';

  const fetchProfileData = useCallback(async () => {
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

      const pendingOffers = offers.filter(o => o.status === 'pending').length;
      const activeInquiries = inquiries.filter(i => i.status === 'active').length;
      
      const nextStats = {
        listings: listings.length,
        offers: offers.length,
        matches: matches.length,
        pendingOffers,
        inquiries: inquiries.length,
        activeInquiries
      };
      setStats(nextStats);

      const activities = [];

      listings.slice(0, 5).forEach(listing => {
        activities.push({
          id: `listing-${listing._id}`,
          type: 'listing',
          title: listing.title,
          subtitle: `${capitalize(listing.type)} • ${listing.status}`,
          timestamp: listing.createdAt,
          data: listing,
        });
      });

      offers.slice(0, 5).forEach(offer => {
        const statusEmoji = offer.status === 'pending' ? '⏳' : 
                           offer.status === 'accepted' ? '✅' : '❌';
        const statusText = capitalize(offer.status);
        activities.push({
          id: `offer-${offer._id}`,
          type: 'offer',
          title: `${statusEmoji} Offer ${statusText}`,
          subtitle: `For: ${offer.listingId?.title || 'Listing'}`,
          timestamp: offer.createdAt,
          data: offer,
        });
      });

      matches.slice(0, 5).forEach(match => {
        activities.push({
          id: `match-${match._id}`,
          type: 'match',
          title: '🎯 Match Created!',
          subtitle: `You matched with someone`,
          timestamp: match.acceptedAt || match.createdAt,
          data: match,
        });
      });

      inquiries.slice(0, 5).forEach(inquiry => {
        const statusEmoji = inquiry.status === 'active' ? '💬' : '📌';
        activities.push({
          id: `inquiry-${inquiry._id}`,
          type: 'inquiry',
          title: `${statusEmoji} Inquiry ${inquiry.status === 'active' ? 'Active' : 'Resolved'}`,
          subtitle: `About: ${inquiry.listingId?.title || 'Listing'}`,
          timestamp: inquiry.createdAt,
          data: inquiry,
        });
      });

      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const nextActivity = activities.slice(0, 15);
      setRecentActivity(nextActivity);
      statsCache[userId] = { stats: nextStats, recentActivity: nextActivity };

    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, isGuest]);

  // Show cached data right away, refresh quietly each time the screen is shown.
  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  const handleRefresh = useCallback(() => {
    if (inFlightRef.current) return;
    setRefreshing(true);
    fetchProfileData();
  }, [fetchProfileData]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DashboardMain');
  }, [navigation]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => logout()
        }
      ]
    );
  };

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

  if (loading && !refreshing && !isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={T.yellow} />
          <Text style={styles.loadingText}>loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <View style={styles.guestContainer}>
          <LinearGradient
            colors={[T.yellowSoft, T.white]}
            style={styles.guestCard}
          >
            <View style={styles.guestIconContainer}>
              <Ionicons name="person-outline" size={64} color={T.yellow} />
            </View>
            <Text style={styles.emptyTitle}>guest mode</Text>
            <Text style={styles.emptySubtext}>Login to see your skill profile</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => goToAuth(setIsGuest)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[T.yellow, T.yellow]}
                style={styles.loginGradient}
              >
                <Text style={styles.loginButtonText}>login</Text>
                <Ionicons name="arrow-forward" size={20} color={T.white} />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Modern Header */}
      <ScreenHeader title="my stats" onBack={handleBack} right={
          <>
            <TouchableOpacity 
          style={styles.headerActionButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={22} color={T.textMuted} />
        </TouchableOpacity>
          </>
        } />

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={T.yellow}
            colors={[T.yellow]}
          />
        }
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header - Modern Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={[T.white, T.yellowSoft]}
            style={styles.profileCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrapper}>
                {userImage ? (
                  <Image source={{ uri: userImage }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={[T.yellow, T.yellow]}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>{userInitial}</Text>
                  </LinearGradient>
                )}
                <View style={styles.avatarBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={T.success} />
                </View>
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.userEmail}>{userEmail}</Text>
                <View style={styles.userBadge}>
                  <Ionicons name="star" size={12} color={T.yellow} />
                  <Text style={styles.userBadgeText}>skill swapper</Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Row */}
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>{stats.listings}</Text>
                <Text style={styles.quickStatLabel}>listings</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>{stats.offers}</Text>
                <Text style={styles.quickStatLabel}>offers</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>{stats.matches}</Text>
                <Text style={styles.quickStatLabel}>matches</Text>
              </View>
              <View style={styles.quickStatDivider} />
              
            </View>
          </LinearGradient>
        </View>

        

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>quick actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('SelectListingTypeScreen')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[T.yellow, T.yellow]}
                style={styles.actionIconGradient}
              >
                <Ionicons name="add-outline" size={24} color={T.white} />
              </LinearGradient>
              <Text style={styles.actionLabel}>create</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('MyListings')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: T.yellowSoft }]}>
                <Ionicons name="list-outline" size={24} color={T.yellow} />
              </View>
              <Text style={styles.actionLabel}>listings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('MyOffers')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: T.yellowSoft }]}>
                <Ionicons name="git-pull-request-outline" size={24} color={T.ink} />
              </View>
              <Text style={styles.actionLabel}>offers</Text>
            </TouchableOpacity>

            
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="time-outline" size={20} color={T.yellow} />
              <Text style={styles.sectionTitle}>recent activity</Text>
            </View>
            {recentActivity.length > 0 && (
              <TouchableOpacity 
                onPress={() => navigation.navigate('Activity')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>see all</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentActivity.length > 0 ? (
            <View style={styles.activityList}>
              {recentActivity.map((item) => (
                <ActivityItem 
                  key={item.id} 
                  item={item} 
                  onPress={handleActivityPress}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="time-outline" size={48} color={T.textFaint} />
              </View>
              <Text style={styles.emptyActivityText}>no activity yet</Text>
              <Text style={styles.emptyActivitySubtext}>
                Create listings, make offers, or start inquiries to get started!
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.line,
  },
  content: {
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: T.paper,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16, fontFamily: F.body,
    color: T.textMuted,
  },
  guestContainer: {
    width: '100%',
    maxWidth: 340,
  },
  guestCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.line,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  guestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: T.yellowSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: F.headingBold,
    color: T.ink,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  loginButton: {
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  loginButtonText: {
    color: T.white,
    fontSize: 16,
    fontFamily: F.bodySemi,
  },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileCardGradient: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontFamily: F.heading,
    color: T.white,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: T.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: T.white,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontFamily: F.headingBold,
    color: T.ink,
  },
  userEmail: {
    fontSize: 13, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 2,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.yellowSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  userBadgeText: {
    fontSize: 11,
    color: T.yellow,
    fontFamily: F.bodySemi,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: T.line,
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 18,
    fontFamily: F.heading,
    color: T.ink,
  },
  quickStatLabel: {
    fontSize: 11, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: T.sand,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 16,
    gap: 8,
  },
  statCardWrapper: {
    flex: 1,
    minWidth: '22%',
    maxWidth: '22%',
  },
  statCard: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: F.heading,
    color: T.white,
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontFamily: F.bodyMedium,
  },
  quickActions: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.line,
  },
  actionIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 10,
    color: T.ink,
    marginTop: 6,
    fontFamily: F.bodyMedium,
    textAlign: 'center',
  },
  activitySection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.ink,
  },
  seeAllText: {
    fontSize: 14,
    color: T.yellow,
    fontFamily: F.bodySemi,
  },
  activityList: {
    backgroundColor: T.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.line,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 1,
  },
  activityTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11, fontFamily: F.body,
    color: T.textFaint,
  },
  activityArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyActivity: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.line,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 16,
    color: T.ink,
    marginTop: 12,
    fontFamily: F.bodySemi,
  },
  emptyActivitySubtext: {
    fontSize: 13, fontFamily: F.body,
    color: T.textFaint,
    marginTop: 4,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});