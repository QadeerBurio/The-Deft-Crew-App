// screens/MyOffersScreen.js
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getMySkillOffers, withdrawSkillOffer } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

const { width, height } = Dimensions.get('window');

// Create a separate component for Offer Item with animations
const OfferItem = React.memo(({ item, index, onWithdraw, onPress }) => {
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

  const listing = item.listingId || {};
  const isPending = item.status === 'pending';
  const isAccepted = item.status === 'accepted';
  const isRejected = item.status === 'rejected';
  const isWithdrawn = item.status === 'withdrawn';

  const getStatusColor = () => {
    if (isPending) return '#f9c349';
    if (isAccepted) return '#34C759';
    if (isRejected) return '#FF3B30';
    if (isWithdrawn) return '#8E8E93';
    return '#8E8E93';
  };

  const getStatusIcon = () => {
    if (isPending) return 'time-outline';
    if (isAccepted) return 'checkmark-circle-outline';
    if (isRejected) return 'close-circle-outline';
    if (isWithdrawn) return 'remove-circle-outline';
    return 'remove-circle-outline';
  };

  const getStatusLabel = () => {
    if (isPending) return 'Pending Review';
    if (isAccepted) return 'Accepted ✓';
    if (isRejected) return 'Rejected ✗';
    if (isWithdrawn) return 'Withdrawn';
    return 'Unknown';
  };

  return (
    <Animated.View
      style={{
        opacity: itemFadeAnim,
        transform: [{ translateY: itemSlideAnim }, { scale: scaleAnim }]
      }}
    >
      <TouchableOpacity
        style={styles.offerCard}
        onPress={() => onPress(listing._id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FFFFFF', isPending ? '#FFF8F0' : '#FFFFFF']}
          style={styles.offerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Status Ribbon for Pending */}
          {isPending && (
            <View style={styles.pendingRibbon}>
              <LinearGradient
                colors={['#f9c349', '#f7b731']}
                style={styles.ribbonGradient}
              >
                <Text style={styles.ribbonText}>PENDING</Text>
              </LinearGradient>
            </View>
          )}

          <View style={styles.offerHeader}>
            <Text style={styles.listingTitle} numberOfLines={1}>
              {listing.title || 'Untitled Listing'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '15' }]}>
              <Ionicons name={getStatusIcon()} size={12} color={getStatusColor()} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusLabel()}
              </Text>
            </View>
          </View>

          <View style={styles.listingTypeContainer}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {listing.type ? listing.type.charAt(0).toUpperCase() + listing.type.slice(1) : 'Listing'}
              </Text>
            </View>
          </View>

          <View style={styles.offerDetails}>
            {item.offeredSkillName && (
              <View style={styles.offerDetailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#f9c34920' }]}>
                  <Ionicons name="star-outline" size={14} color="#f9c349" />
                </View>
                <Text style={styles.offerDetail}>
                  <Text style={styles.detailLabel}>Offering: </Text>
                  <Text style={styles.detailValue}>{item.offeredSkillName}</Text>
                  {item.offeredSkillLevel && ` (${item.offeredSkillLevel})`}
                </Text>
              </View>
            )}

            {item.proposedPrice && (
              <View style={styles.offerDetailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#34C75920' }]}>
                  <Ionicons name="cash-outline" size={14} color="#34C759" />
                </View>
                <Text style={styles.offerDetail}>
                  <Text style={styles.detailLabel}>Proposed: </Text>
                  <Text style={[styles.detailValue, styles.priceValue]}>${item.proposedPrice}</Text>
                </Text>
              </View>
            )}

            {item.message && (
              <View style={styles.messageContainer}>
                <Ionicons name="chatbubble-outline" size={14} color="#8E8E93" />
                <Text style={styles.messageText} numberOfLines={2}>
                  "{item.message}"
                </Text>
              </View>
            )}
          </View>

          <View style={styles.offerFooter}>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color="#C7C7CC" />
              <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>

          {isPending && (
            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={() => onWithdraw(item._id)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#FF3B30', '#D70015']}
                style={styles.withdrawGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="close-outline" size={18} color="#FFFFFF" />
                <Text style={styles.withdrawButtonText}>Withdraw Offer</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isAccepted && item.matchId && (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => onPress(listing._id, 'chat')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#34C759', '#28A745']}
                style={styles.chatGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" />
                <Text style={styles.chatButtonText}>Go to Match Chat</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function MyOffersScreen({ navigation }) {
  const { getCurrentUserId, isGuest } = useContext(AuthContext);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

  const fetchOffers = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId || isGuest) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getMySkillOffers();
      setOffers(data.offers || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load your offers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentUserId, isGuest]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const handleWithdraw = async (offerId) => {
    Alert.alert(
      'Withdraw Offer',
      'Are you sure you want to withdraw this offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await withdrawSkillOffer(offerId);
              Alert.alert('Success', 'Offer withdrawn successfully');
              fetchOffers();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to withdraw offer');
            }
          }
        }
      ]
    );
  };

  const handleOfferPress = (listingId, type) => {
    if (type === 'chat') {
      navigation.navigate('MatchChat', {
        listingId: listingId,
        matchId: offers.find(o => o.listingId?._id === listingId)?.matchId?._id
      });
    } else if (listingId) {
      navigation.navigate('ListingDetail', { id: listingId });
    }
  };

  const getStatusCounts = () => {
    const pending = offers.filter(o => o.status === 'pending').length;
    const accepted = offers.filter(o => o.status === 'accepted').length;
    const rejected = offers.filter(o => o.status === 'rejected').length;
    return { pending, accepted, rejected, total: offers.length };
  };

  const counts = getStatusCounts();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading your offers...</Text>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Ionicons name="person-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>Please login to view your offers</Text>
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
        <Text style={styles.headerBarTitle}>My Offers</Text>
        <TouchableOpacity 
          style={styles.headerActionButton}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={22} color="#f9c349" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <Animated.View 
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={[styles.statCard, styles.statCardTotal]}
          >
            <Text style={styles.statNumber}>{counts.total}</Text>
            <Text style={styles.statLabel}>Total Offers</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#FFFFFF', '#FFF8F0']}
            style={[styles.statCard, styles.statCardPending]}
          >
            <Text style={[styles.statNumber, { color: '#f9c349' }]}>{counts.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </LinearGradient>
        </View>

        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#FFFFFF', '#F0FFF4']}
            style={[styles.statCard, styles.statCardAccepted]}
          >
            <Text style={[styles.statNumber, { color: '#34C759' }]}>{counts.accepted}</Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#FFFFFF', '#FFF0F0']}
            style={[styles.statCard, styles.statCardRejected]}
          >
            <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{counts.rejected}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Offers List */}
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
          data={offers}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <OfferItem 
              item={item} 
              index={index} 
              onWithdraw={handleWithdraw}
              onPress={handleOfferPress}
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
                <Ionicons name="git-pull-request-outline" size={64} color="#f9c349" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Offers Yet</Text>
              <Text style={styles.emptySubtext}>Browse listings and make an offer to get started</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('Dashboard')}
              >
                <LinearGradient
                  colors={['#f9c349', '#f7b731']}
                  style={styles.emptyButtonGradient}
                >
                  <Text style={styles.emptyButtonText}>Browse Listings</Text>
                </LinearGradient>
              </TouchableOpacity>
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
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardTotal: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statCardPending: {
    borderWidth: 1,
    borderColor: '#f9c34930',
  },
  statCardAccepted: {
    borderWidth: 1,
    borderColor: '#34C75930',
  },
  statCardRejected: {
    borderWidth: 1,
    borderColor: '#FF3B3030',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  offerCard: {
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  offerGradient: {
    padding: 16,
  },
  pendingRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  ribbonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  ribbonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  listingTypeContainer: {
    marginBottom: 10,
  },
  typeBadge: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  offerDetails: {
    gap: 6,
  },
  offerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerDetail: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  detailLabel: {
    color: '#8E8E93',
    fontWeight: '500',
  },
  detailValue: {
    color: '#1C1C1E',
    fontWeight: '500',
  },
  priceValue: {
    color: '#34C759',
    fontWeight: '700',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  messageText: {
    fontSize: 13,
    color: '#3A3A3C',
    lineHeight: 18,
    fontStyle: 'italic',
    flex: 1,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  withdrawButton: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  withdrawGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  chatButton: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  chatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
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