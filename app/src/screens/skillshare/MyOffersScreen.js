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
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getMySkillOffers, withdrawSkillOffer } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

const { width, height } = Dimensions.get('window');

// Offer Item Component with enhanced animations
const OfferItem = React.memo(({ item, index, onWithdraw, onPress }) => {
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const itemSlideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const cardScaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(itemSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 45,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 800,
        delay: index * 60 + 200,
        useNativeDriver: true,
      })
    ]).start();

    return () => {
      isMounted.current = false;
      itemFadeAnim.stopAnimation();
      itemSlideAnim.stopAnimation();
      scaleAnim.stopAnimation();
      cardScaleAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, []);

  const handlePressIn = () => {
    if (!isMounted.current) return;
    Animated.spring(cardScaleAnim, {
      toValue: 0.96,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (!isMounted.current) return;
    Animated.spring(cardScaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.2, 0],
  });

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
    if (isPending) return 'time';
    if (isAccepted) return 'checkmark-circle';
    if (isRejected) return 'close-circle';
    if (isWithdrawn) return 'remove-circle';
    return 'remove-circle';
  };

  const getStatusLabel = () => {
    if (isPending) return 'Pending';
    if (isAccepted) return 'Accepted';
    if (isRejected) return 'Rejected';
    if (isWithdrawn) return 'Withdrawn';
    return 'Unknown';
  };

  const getTypeColor = () => {
    if (listing.type === 'barter') return '#f9c349';
    if (listing.type === 'job') return '#4A90D9';
    if (listing.type === 'paid') return '#34C759';
    return '#8E8E93';
  };

  const getTypeIcon = () => {
    if (listing.type === 'barter') return 'swap-horizontal';
    if (listing.type === 'job') return 'briefcase';
    if (listing.type === 'paid') return 'cash';
    return 'apps';
  };

  return (
    <Animated.View
      style={{
        opacity: itemFadeAnim,
        transform: [{ translateY: itemSlideAnim }, { scale: scaleAnim }]
      }}
    >
      <TouchableOpacity
        onPress={() => onPress(listing._id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View style={[styles.offerCard, { transform: [{ scale: cardScaleAnim }] }]}>
          <LinearGradient
            colors={['#FFFFFF', '#FAFBFF']}
            style={styles.offerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View style={[styles.glowEffect, { opacity: glowOpacity }]} />
            
            {/* Status Badge - Top Right */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '12' }]}>
              <Ionicons name={getStatusIcon()} size={12} color={getStatusColor()} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusLabel()}
              </Text>
            </View>

            {/* Listing Type Icon */}
            <View style={[styles.typeIconContainer, { backgroundColor: getTypeColor() + '12' }]}>
              <Ionicons name={getTypeIcon()} size={18} color={getTypeColor()} />
            </View>

            <View style={styles.offerHeader}>
              <Text style={styles.listingTitle} numberOfLines={2}>
                {listing.title || 'Untitled Listing'}
              </Text>
            </View>

            <View style={styles.offerDetails}>
              {item.offeredSkillName && (
                <View style={styles.offerDetailRow}>
                  <MaterialCommunityIcons name="lightbulb-on" size={16} color="#f9c349" />
                  <Text style={styles.offerDetail}>
                    <Text style={styles.detailLabel}>Offering: </Text>
                    <Text style={styles.detailValue}>{item.offeredSkillName}</Text>
                    {item.offeredSkillLevel && (
                      <Text style={styles.levelText}> · {item.offeredSkillLevel}</Text>
                    )}
                  </Text>
                </View>
              )}

              {item.proposedPrice && (
                <View style={styles.offerDetailRow}>
                  <Ionicons name="cash" size={16} color="#34C759" />
                  <Text style={styles.offerDetail}>
                    <Text style={styles.detailLabel}>Price: </Text>
                    <Text style={[styles.detailValue, styles.priceValue]}>${item.proposedPrice}</Text>
                  </Text>
                </View>
              )}

              {item.applicationNotes && (
                <View style={styles.offerDetailRow}>
                  <Ionicons name="document-text" size={16} color="#8E8E93" />
                  <Text style={[styles.offerDetail, styles.notesText]} numberOfLines={2}>
                    {item.applicationNotes}
                  </Text>
                </View>
              )}

              {item.message && (
                <View style={styles.messageContainer}>
                  <View style={styles.messageIconContainer}>
                    <Ionicons name="chatbubble" size={14} color="#f9c349" />
                  </View>
                  <Text style={styles.messageText} numberOfLines={2}>
                    "{item.message}"
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.offerFooter}>
              <View style={styles.timeContainer}>
                <Ionicons name="time" size={14} color="#C7C7CC" />
                <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
              </View>
              {isPending && (
                <View style={styles.pendingIndicator}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingText}>Awaiting Response</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              {isPending && (
                <TouchableOpacity
                  style={styles.withdrawButton}
                  onPress={() => onWithdraw(item._id)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#FF3B30', '#D70015']}
                    style={styles.actionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Withdraw</Text>
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
                    style={styles.actionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Chat Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {isRejected && (
                <View style={styles.rejectedContainer}>
                  <Ionicons name="information-circle" size={16} color="#FF3B30" />
                  <Text style={styles.rejectedText}>Offer was rejected</Text>
                </View>
              )}

              {isWithdrawn && (
                <View style={styles.withdrawnContainer}>
                  <Ionicons name="information-circle" size={16} color="#8E8E93" />
                  <Text style={styles.withdrawnText}>You withdrew this offer</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
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
  const [filter, setFilter] = useState('all');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const floatingY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const floating = floatingY.interpolate({
    inputRange: [-6, 6],
    outputRange: [-6, 6],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    // Floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingY, {
          toValue: 6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatingY, {
          toValue: -6,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Rotate animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );
    rotate.start();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    fetchOffers();
  }, []);

  const fetchOffers = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId || isGuest) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await getMySkillOffers();
      // FIXED: Properly extract offers from response
      const offersData = response?.offers || response?.data?.offers || [];
      setOffers(offersData);
    } catch (err) {
      console.error('Fetch offers error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load your offers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentUserId, isGuest]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const handleWithdraw = async (offerId) => {
    Alert.alert(
      'Withdraw Offer',
      'Are you sure you want to withdraw this offer? This action cannot be undone.',
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

  const getFilteredOffers = () => {
    if (filter === 'all') return offers;
    return offers.filter(o => o.status === filter);
  };

  const getStatusCounts = () => {
    const pending = offers.filter(o => o.status === 'pending').length;
    const accepted = offers.filter(o => o.status === 'accepted').length;
    const rejected = offers.filter(o => o.status === 'rejected').length;
    const withdrawn = offers.filter(o => o.status === 'withdrawn').length;
    return { pending, accepted, rejected, withdrawn, total: offers.length };
  };

  const counts = getStatusCounts();
  const filteredOffers = getFilteredOffers();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading your offers...</Text>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
        <View style={styles.guestContainer}>
          <LinearGradient
            colors={['#f9c34915', '#f5a62315']}
            style={styles.guestIconContainer}
          >
            <Ionicons name="person" size={64} color="#f9c349" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Welcome Back!</Text>
          <Text style={styles.emptySubtext}>Login to view and manage your offers</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#f9c349', '#f5a623']}
              style={styles.loginGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="log-in" size={20} color="#FFFFFF" />
              <Text style={styles.loginButtonText}>Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
      
      {/* Background Decorations */}
      <View style={styles.bgDecorations}>
        <Animated.View style={[styles.bgOrb, styles.bgOrb1, { transform: [{ rotate: spin }] }]} />
        <Animated.View style={[styles.bgOrb, styles.bgOrb2, { transform: [{ translateY: floating }] }]} />
      </View>

      {/* Header */}
      <Animated.View 
        style={[
          styles.headerContainer,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-15, 0]
                })
              }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FFFDF7']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Offers</Text>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={20} color="#f9c349" />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['#f9c349', '#f5a623']}
              style={styles.mainStatCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.mainStatContent}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialCommunityIcons name="file-document" size={24} color="#FFFFFF" />
                </Animated.View>
                <View style={styles.mainStatText}>
                  <Text style={styles.mainStatNumber}>{counts.total}</Text>
                  <Text style={styles.mainStatLabel}>Total Offers</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterTabs}>
                {['all', 'pending', 'accepted', 'rejected', 'withdrawn'].map((tab) => {
                  const isActive = filter === tab;
                  const count = counts[tab] || 0;
                  const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.filterTab, isActive && styles.filterTabActive]}
                      onPress={() => setFilter(tab)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                        {label} {count > 0 && `(${count})`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Offers List */}
      <Animated.View 
        style={[
          styles.listContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
          }
        ]}
      >
        <FlatList
          data={filteredOffers}
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
              progressBackgroundColor="#FFFFFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#f9c34920', '#f5a62320']}
                style={styles.emptyIconContainer}
              >
                <MaterialCommunityIcons name="file-search" size={60} color="#f9c349" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>
                {filter !== 'all' ? `No ${filter} offers` : 'No Offers Yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {filter !== 'all' 
                  ? `You don't have any ${filter} offers at the moment`
                  : "Browse listings and make an offer to get started"
                }
              </Text>
              {filter === 'all' && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('Dashboard')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#f9c349', '#f5a623']}
                    style={styles.emptyButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="compass" size={18} color="#FFFFFF" />
                    <Text style={styles.emptyButtonText}>Browse Listings</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

// All styles remain the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  bgDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bgOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.03,
  },
  bgOrb1: {
    width: 200,
    height: 200,
    top: -80,
    right: -80,
    backgroundColor: '#f9c349',
  },
  bgOrb2: {
    width: 150,
    height: 150,
    bottom: -50,
    left: -50,
    backgroundColor: '#34C759',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FC',
  },
  guestContainer: {
    alignItems: 'center',
  },
  guestIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    marginTop: Platform.OS === 'android' ? 34 : 0,
  },
  headerGradient: {
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  mainStatCard: {
    borderRadius: 14,
    padding: 14,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  mainStatContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainStatText: {
    marginLeft: 12,
  },
  mainStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  mainStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterTabActive: {
    backgroundColor: '#f9c349',
    borderColor: '#f9c349',
  },
  filterTabText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 20,
  },
  offerCard: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  offerGradient: {
    padding: 14,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f9c349',
    borderRadius: 14,
    opacity: 0,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerHeader: {
    marginBottom: 8,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  offerDetails: {
    gap: 6,
  },
  offerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offerDetail: {
    fontSize: 13,
    color: '#8E8E93',
    flex: 1,
  },
  detailLabel: {
    color: '#8E8E93',
    fontWeight: '500',
  },
  detailValue: {
    color: '#1C1C1E',
    fontWeight: '600',
  },
  levelText: {
    color: '#8E8E93',
    fontWeight: '400',
  },
  priceValue: {
    color: '#34C759',
    fontWeight: '700',
  },
  notesText: {
    fontSize: 13,
    color: '#3A3A3C',
    lineHeight: 18,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
    backgroundColor: '#F8F9FC',
    padding: 10,
    borderRadius: 10,
  },
  messageIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '500',
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f9c349',
  },
  pendingText: {
    fontSize: 11,
    color: '#f9c349',
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 10,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  withdrawButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  chatButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  rejectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  rejectedText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
  },
  withdrawnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  withdrawnText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 50,
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
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
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
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});