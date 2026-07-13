// screens/SkillProfileScreen.js
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Image,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../context/AuthContext';
import { 
  getMyListings, 
  getMySkillOffers, 
  getMyMatches,
  getMyInquiries 
} from '../../api/api';
import { timeAgo } from '../../utils/time';

const { width, height } = Dimensions.get('window');

// Create a separate component for Activity Item
const ActivityItem = React.memo(({ item, index, onPress }) => {
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const itemSlideAnim = useRef(new Animated.Value(20)).current;
  
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
      })
    ]).start();
  }, []);

  const getIconConfig = (type) => {
    const configs = {
      listing: { icon: 'document-text-outline', color: '#f9c349', bg: '#f9c34915' },
      offer: { icon: 'git-pull-request-outline', color: '#FF9500', bg: '#FF950015' },
      match: { icon: 'people-outline', color: '#34C759', bg: '#34C75915' },
      inquiry: { icon: 'chatbubble-outline', color: '#AF52DE', bg: '#AF52DE15' },
      default: { icon: 'time-outline', color: '#8E8E93', bg: '#8E8E9315' }
    };
    return configs[type] || configs.default;
  };

  const config = getIconConfig(item.type);

  return (
    <Animated.View
      style={{
        opacity: itemFadeAnim,
        transform: [{ translateY: itemSlideAnim }]
      }}
    >
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
            <Ionicons name="time-outline" size={12} color="#C7C7CC" />
            <Text style={styles.activityTime}>{timeAgo(item.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.activityArrow}>
          <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Stat Card Component
const StatCard = React.memo(({ number, label, icon, gradient, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <TouchableOpacity 
      style={styles.statCardWrapper}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={gradient}
          style={styles.statCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name={icon} size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.statNumber}>{number}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
});

export default function SkillProfile({ navigation }) {
  const { getCurrentUserId, user, isGuest, logout, getUserName, getUserEmail } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    listings: 0,
    offers: 0,
    matches: 0,
    pendingOffers: 0,
    inquiries: 0,
    activeInquiries: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const avatarScaleAnim = useRef(new Animated.Value(0.8)).current;
  const statsFadeAnim = useRef(new Animated.Value(0)).current;

  const userId = getCurrentUserId();

  // Get user data
  const userName = getUserName ? getUserName() : user?.name || user?.fullName || user?.username || 'User';
  const userEmail = getUserEmail ? getUserEmail() : user?.email || '';
  const userImage = user?.profileImage || null;
  const userInitial = userName && userName !== 'Guest User' ? userName.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    // Entrance animations
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
      Animated.spring(headerSlideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(statsFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const fetchProfileData = useCallback(async () => {
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

      const pendingOffers = offers.filter(o => o.status === 'pending').length;
      const activeInquiries = inquiries.filter(i => i.status === 'active').length;
      
      setStats({
        listings: listings.length,
        offers: offers.length,
        matches: matches.length,
        pendingOffers,
        inquiries: inquiries.length,
        activeInquiries
      });

      const activities = [];

      listings.slice(0, 5).forEach(listing => {
        activities.push({
          id: `listing-${listing._id}`,
          type: 'listing',
          title: listing.title,
          subtitle: `${listing.type.charAt(0).toUpperCase() + listing.type.slice(1)} • ${listing.status}`,
          timestamp: listing.createdAt,
          data: listing,
        });
      });

      offers.slice(0, 5).forEach(offer => {
        const statusEmoji = offer.status === 'pending' ? '⏳' : 
                           offer.status === 'accepted' ? '✅' : '❌';
        const statusText = offer.status.charAt(0).toUpperCase() + offer.status.slice(1);
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
      setRecentActivity(activities.slice(0, 15));

    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, isGuest]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.guestContainer}>
          <LinearGradient
            colors={['#FFF8F0', '#FFFFFF']}
            style={styles.guestCard}
          >
            <View style={styles.guestIconContainer}>
              <Ionicons name="person-outline" size={64} color="#f9c349" />
            </View>
            <Text style={styles.emptyTitle}>Guest Mode</Text>
            <Text style={styles.emptySubtext}>Login to see your skill profile</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#f9c349', '#f7b731']}
                style={styles.loginGradient}
              >
                <Text style={styles.loginButtonText}>Login</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
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
            name={Platform.OS === 'ios' ? 'chevron-back' : 'chevron-back'} 
            size={24} 
            color="#1C1C1E" 
          />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>My Stats</Text>
        <TouchableOpacity 
          style={styles.headerActionButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={22} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor="#f9c349"
            colors={["#f9c349"]}
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header - Modern Card */}
        <Animated.View 
          style={[
            styles.profileCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: headerSlideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#FFFDF5']}
            style={styles.profileCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileHeader}>
              <Animated.View 
                style={[
                  styles.avatarWrapper,
                  { transform: [{ scale: avatarScaleAnim }] }
                ]}
              >
                {userImage ? (
                  <Image source={{ uri: userImage }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={['#f9c349', '#f7b731']}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>{userInitial}</Text>
                  </LinearGradient>
                )}
                <View style={styles.avatarBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                </View>
              </Animated.View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.userEmail}>{userEmail}</Text>
                <View style={styles.userBadge}>
                  <Ionicons name="star" size={12} color="#f9c349" />
                  <Text style={styles.userBadgeText}>Skill Swapper</Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Row */}
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>{stats.listings}</Text>
                <Text style={styles.quickStatLabel}>Listings</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>{stats.offers}</Text>
                <Text style={styles.quickStatLabel}>Offers</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>{stats.matches}</Text>
                <Text style={styles.quickStatLabel}>Matches</Text>
              </View>
              <View style={styles.quickStatDivider} />
              
            </View>
          </LinearGradient>
        </Animated.View>

        

        {/* Quick Actions */}
        <Animated.View 
          style={[
            styles.quickActions,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('SelectListingTypeScreen')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#f9c349', '#f7b731']}
                style={styles.actionIconGradient}
              >
                <Ionicons name="add-outline" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Create</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('MyListings')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#f9c34915' }]}>
                <Ionicons name="list-outline" size={24} color="#f9c349" />
              </View>
              <Text style={styles.actionLabel}>Listings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('MyOffers')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FF950015' }]}>
                <Ionicons name="git-pull-request-outline" size={24} color="#FF9500" />
              </View>
              <Text style={styles.actionLabel}>Offers</Text>
            </TouchableOpacity>

            
          </View>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View 
          style={[
            styles.activitySection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="time-outline" size={20} color="#f9c349" />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            {recentActivity.length > 0 && (
              <TouchableOpacity 
                onPress={() => navigation.navigate('Activity')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentActivity.length > 0 ? (
            <View style={styles.activityList}>
              {recentActivity.map((item, index) => (
                <ActivityItem 
                  key={item.id} 
                  item={item} 
                  index={index} 
                  onPress={handleActivityPress}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="time-outline" size={48} color="#C7C7CC" />
              </View>
              <Text style={styles.emptyActivityText}>No activity yet</Text>
              <Text style={styles.emptyActivitySubtext}>
                Create listings, make offers, or start inquiries to get started!
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
    marginTop: Platform.OS === 'android' ? 34 : 0,
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
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  content: {
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
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
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  guestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
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
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  userEmail: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9c34910',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  userBadgeText: {
    fontSize: 11,
    color: '#f9c349',
    fontWeight: '600',
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F0F0F0',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  quickActions: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  actionIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    color: '#1C1C1E',
    marginTop: 6,
    fontWeight: '500',
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
    fontWeight: '700',
    color: '#1C1C1E',
  },
  seeAllText: {
    fontSize: 14,
    color: '#f9c349',
    fontWeight: '600',
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    fontWeight: '600',
    color: '#1C1C1E',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  activityTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#C7C7CC',
  },
  activityArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyActivity: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyActivitySubtext: {
    fontSize: 13,
    color: '#C7C7CC',
    marginTop: 4,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});