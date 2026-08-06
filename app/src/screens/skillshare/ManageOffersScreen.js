// screens/ManageOffersScreen.js
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getOffersForListing, updateOfferStatus } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function ManageOffersScreen({ route, navigation }) {
  const { getCurrentUserId } = useContext(AuthContext);
  const { id, type } = route.params;

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Animation values - All hooks at top level
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const floatingY = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  // Store item animations in a ref
  const itemAnimations = useRef({});

  const floating = floatingY.interpolate({
    inputRange: [-8, 8],
    outputRange: [-8, 8],
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
          toValue: 8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatingY, {
          toValue: -8,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

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
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(statsAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchOffers = useCallback(async () => {
    try {
      setError(null);
      const data = await getOffersForListing(id);
      setOffers(data.offers || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const handleOfferAction = async (offerId, action) => {
    const statusMap = {
      'accept': 'accepted',
      'reject': 'rejected'
    };
    const status = statusMap[action];
    
    Alert.alert(
      action === 'accept' ? 'Accept Offer' : 'Reject Offer',
      action === 'accept' 
        ? 'Accepting this offer will create a match and close the listing to other offers. Continue?'
        : 'Are you sure you want to reject this offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'accept' ? 'Accept' : 'Reject',
          style: action === 'accept' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const result = await updateOfferStatus(offerId, status);
              
              Alert.alert(
                'Success',
                action === 'accept' 
                  ? 'Offer accepted! A match has been created.'
                  : 'Offer rejected successfully.'
              );
              
              if (action === 'accept') {
                navigation.goBack();
              } else {
                fetchOffers();
              }
            } catch (err) {
              const errorMsg = err.response?.data?.error || err.message || 'Failed to update offer';
              Alert.alert('Error', errorMsg);
            }
          }
        }
      ]
    );
  };

  const getStatusConfig = (status) => {
    const configs = {
      'pending': { 
        color: '#f9c349', 
        bg: '#f9c34915', 
        icon: 'time-outline',
        label: 'Pending'
      },
      'accepted': { 
        color: '#34C759', 
        bg: '#34C75915', 
        icon: 'checkmark-circle',
        label: 'Accepted'
      },
      'rejected': { 
        color: '#FF3B30', 
        bg: '#FF3B3015', 
        icon: 'close-circle',
        label: 'Rejected'
      },
      'withdrawn': { 
        color: '#8E8E93', 
        bg: '#8E8E9315', 
        icon: 'remove-circle',
        label: 'Withdrawn'
      }
    };
    return configs[status] || configs['pending'];
  };

  const getTypeColor = () => {
    if (type === 'barter') return '#f9c349';
    if (type === 'job') return '#FF6B6B';
    return '#34C759';
  };

  const getTypeIcon = () => {
    if (type === 'barter') return 'swap-horizontal';
    if (type === 'job') return 'briefcase';
    return 'cash';
  };

  // Create animation for each item when data changes
  useEffect(() => {
    // Create animations for each offer item
    offers.forEach((item, index) => {
      if (!itemAnimations.current[item._id]) {
        itemAnimations.current[item._id] = {
          anim: new Animated.Value(0),
          delay: index * 80,
        };
      }
    });

    // Start animations for all items
    Object.values(itemAnimations.current).forEach(({ anim, delay }) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        delay: delay,
        useNativeDriver: true,
      }).start();
    });
  }, [offers]);

  const renderOfferItem = ({ item, index }) => {
    const isPending = item.status === 'pending';
    const isBarter = item.listingId?.type === 'barter' || type === 'barter';
    const statusConfig = getStatusConfig(item.status);
    
    // Get the animation for this specific item
    const itemAnim = itemAnimations.current[item._id]?.anim || new Animated.Value(1);

    return (
      <Animated.View
        style={[
          styles.offerCard,
          {
            opacity: itemAnim,
            transform: [
              {
                scale: itemAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.9, 1.02, 1]
                })
              },
              {
                translateX: itemAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [width * 0.05, 0]
                })
              }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FAFBFF']}
          style={styles.offerCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.offerHeader}>
            <View style={styles.offerorInfo}>
              <View style={styles.offerorAvatar}>
                <Text style={styles.offerorAvatarText}>
                  {item.offerorId?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View>
                <Text style={styles.offerorName}>
                  {item.offerorId?.name || 'User'}
                </Text>
                <Text style={styles.offerorTime}>{timeAgo(item.createdAt)}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {isBarter && item.offeredSkillName && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="lightbulb-on" size={16} color="#f9c349" />
              <Text style={styles.detailLabel}>
                Skill: <Text style={styles.detailValue}>{item.offeredSkillName}</Text>
                {item.offeredSkillLevel && (
                  <Text style={styles.detailLevel}> · {item.offeredSkillLevel}</Text>
                )}
              </Text>
            </View>
          )}

          {item.proposedPrice && (
            <View style={styles.detailRow}>
              <Ionicons name="cash" size={16} color="#34C759" />
              <Text style={styles.detailLabel}>
                Price: <Text style={[styles.detailValue, styles.priceValue]}>${item.proposedPrice}</Text>
              </Text>
            </View>
          )}

          {item.applicationNotes && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text" size={16} color="#8E8E93" />
              <Text style={styles.detailLabel} numberOfLines={2}>
                Notes: <Text style={styles.detailValue}>{item.applicationNotes}</Text>
              </Text>
            </View>
          )}

          {item.message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>"{item.message}"</Text>
            </View>
          )}

          {isPending && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleOfferAction(item._id, 'accept')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#34C759', '#28A745']}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleOfferAction(item._id, 'reject')}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#FF3B30" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading offers...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
        <Ionicons name="alert-circle" size={60} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchOffers} activeOpacity={0.7}>
          <LinearGradient
            colors={['#f9c349', '#f5a623']}
            style={styles.retryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const pendingCount = offers.filter(o => o.status === 'pending').length;
  const acceptedCount = offers.filter(o => o.status === 'accepted').length;

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
          styles.header,
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
          colors={['#FFFFFF', '#F8F9FC']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Offers</Text>
            <View style={styles.headerPlaceholder} />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Stats Section */}
      <Animated.View 
        style={[
          styles.statsContainer,
          {
            opacity: statsAnim,
            transform: [
              {
                scale: statsAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.9, 1.05, 1]
                })
              }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FFFDF5']}
          style={styles.statsGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{offers.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#f9c349' }]}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>{acceptedCount}</Text>
              <Text style={styles.statLabel}>Accepted</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* List */}
      <FlatList
        data={offers}
        keyExtractor={(item) => item._id}
        renderItem={renderOfferItem}
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
          <Animated.View 
            style={[
              styles.emptyContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people" size={64} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyText}>No Offers Yet</Text>
            <Text style={styles.emptySubtext}>Check back later for offers on your listing</Text>
          </Animated.View>
        }
      />
    </SafeAreaView>
  );
}

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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    marginTop: Platform.OS === 'android' ? 34 : 0,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerPlaceholder: {
    width: 36,
  },
  statsContainer: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  statsGradient: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F0F0F0',
  },
  listContent: {
    padding: 14,
    paddingBottom: 20,
  },
  offerCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  offerCardGradient: {
    padding: 14,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offerorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerorAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f9c349',
  },
  offerorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  offerorTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  detailValue: {
    color: '#1C1C1E',
    fontWeight: '600',
  },
  detailLevel: {
    color: '#8E8E93',
    fontWeight: '400',
  },
  priceValue: {
    color: '#34C759',
    fontWeight: '700',
  },
  messageContainer: {
    backgroundColor: '#F8F9FC',
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#3A3A3C',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  acceptButton: {
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  rejectButton: {
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  rejectButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginVertical: 12,
    marginHorizontal: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});