// screens/MyListingsScreen.js
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
import { getMyListings, closeListing } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

const { width, height } = Dimensions.get('window');

// Create a separate component for Listing Item with animations
const ListingItem = React.memo(({ item, index, onClose, onPress }) => {
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

  const isBarter = item.type === 'barter';
  const isOpen = item.status === 'open';
  const isJob = item.type === 'job';

  const getTypeColor = () => {
    if (isBarter) return '#f9c349';
    if (isJob) return '#FF6B6B';
    return '#34C759';
  };

  const getTypeIcon = () => {
    if (isBarter) return 'swap-horizontal-outline';
    if (isJob) return 'briefcase-outline';
    return 'cash-outline';
  };

  const getStatusColor = () => {
    if (isOpen) return '#34C759';
    return '#FF3B30';
  };

  const getStatusIcon = () => {
    if (isOpen) return 'checkmark-circle-outline';
    return 'lock-closed-outline';
  };

  return (
    <Animated.View
      style={{
        opacity: itemFadeAnim,
        transform: [{ translateY: itemSlideAnim }, { scale: scaleAnim }]
      }}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(item._id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FFFFFF', isOpen ? '#FFF8F0' : '#FFFFFF']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Status Ribbon for Closed */}
          {!isOpen && (
            <View style={styles.closedRibbon}>
              <LinearGradient
                colors={['#FF3B30', '#D70015']}
                style={styles.ribbonGradient}
              >
                <Text style={styles.ribbonText}>CLOSED</Text>
              </LinearGradient>
            </View>
          )}

          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.typeBadge, { backgroundColor: getTypeColor() + '15' }]}>
              <Ionicons name={getTypeIcon()} size={14} color={getTypeColor()} />
              <Text style={[styles.typeBadgeText, { color: getTypeColor() }]}>
                {isBarter ? 'Barter' : isJob ? 'Job' : 'Paid'}
              </Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '15' }]}>
              <Ionicons name={getStatusIcon()} size={14} color={getStatusColor()} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {item.skillOffered?.skillName && (
            <View style={styles.skillContainer}>
              <Ionicons name="star-outline" size={14} color="#f9c349" />
              <Text style={styles.skillText}>
                Offering: <Text style={styles.skillValue}>{item.skillOffered.skillName}</Text>
                {item.skillOffered.proficiencyLevel && ` (${item.skillOffered.proficiencyLevel})`}
              </Text>
            </View>
          )}

          {item.type === 'job' && item.budget && (
            <View style={styles.skillContainer}>
              <Ionicons name="cash-outline" size={14} color="#34C759" />
              <Text style={styles.skillText}>
                Budget: <Text style={[styles.skillValue, styles.budgetValue]}>${item.budget}</Text>
              </Text>
            </View>
          )}

          {item.type === 'paid' && item.price && (
            <View style={styles.skillContainer}>
              <Ionicons name="cash-outline" size={14} color="#34C759" />
              <Text style={styles.skillText}>
                Price: <Text style={[styles.skillValue, styles.budgetValue]}>${item.price}</Text>
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color="#C7C7CC" />
              <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
            </View>
            {isOpen && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => onClose(item._id)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#FF3B30', '#D70015']}
                  style={styles.closeGradient}
                >
                  <Ionicons name="close-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.closeButtonText}>Close</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function MyListingsScreen({ navigation }) {
  const { getCurrentUserId, isGuest } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
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

  const fetchListings = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId || isGuest) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getMyListings(userId);
      setListings(data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load your listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentUserId, isGuest]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const handleCloseListing = async (listingId) => {
    const userId = getCurrentUserId();
    Alert.alert(
      'Close Listing',
      'Are you sure you want to close this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              await closeListing(listingId, userId);
              Alert.alert('Success', 'Listing closed successfully');
              fetchListings();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to close listing');
            }
          }
        }
      ]
    );
  };

  const handleListingPress = (listingId) => {
    navigation.navigate('ListingDetail', { id: listingId });
  };

  const getStatusCounts = () => {
    const open = listings.filter(l => l.status === 'open').length;
    const closed = listings.filter(l => l.status === 'closed').length;
    return { open, closed, total: listings.length };
  };

  const counts = getStatusCounts();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading your listings...</Text>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Ionicons name="person-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>Please login to view your listings</Text>
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
        <Text style={styles.headerBarTitle}>My Listings</Text>
        <TouchableOpacity 
          style={styles.headerActionButton}
          onPress={() => navigation.navigate('SelectListingTypeScreen')}
          activeOpacity={0.7}
        >
          <Ionicons name="add-outline" size={24} color="#f9c349" />
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
            <Text style={styles.statLabel}>Total Listings</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#FFFFFF', '#F0FFF4']}
            style={[styles.statCard, styles.statCardOpen]}
          >
            <Text style={[styles.statNumber, { color: '#34C759' }]}>{counts.open}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </LinearGradient>
        </View>

        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#FFFFFF', '#FFF0F0']}
            style={[styles.statCard, styles.statCardClosed]}
          >
            <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{counts.closed}</Text>
            <Text style={styles.statLabel}>Closed</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#FFFFFF', '#FFF8F0']}
            style={[styles.statCard, styles.statCardCreate]}
          >
            <TouchableOpacity
              style={styles.statCardButton}
              onPress={() => navigation.navigate('SelectListingTypeScreen')}
            >
              <Ionicons name="add-circle-outline" size={32} color="#f9c349" />
              <Text style={styles.statCardButtonText}>Create New</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Listings List */}
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
          data={listings}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <ListingItem 
              item={item} 
              index={index} 
              onClose={handleCloseListing}
              onPress={handleListingPress}
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
                <Ionicons name="document-text-outline" size={64} color="#f9c349" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Listings Yet</Text>
              <Text style={styles.emptySubtext}>Create your first listing to get started</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('SelectListingTypeScreen')}
              >
                <LinearGradient
                  colors={['#f9c349', '#f7b731']}
                  style={styles.emptyButtonGradient}
                >
                  <Ionicons name="add-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Create Listing</Text>
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
  statCardOpen: {
    borderWidth: 1,
    borderColor: '#34C75930',
  },
  statCardClosed: {
    borderWidth: 1,
    borderColor: '#FF3B3030',
  },
  statCardCreate: {
    borderWidth: 1,
    borderColor: '#f9c34930',
    paddingVertical: 10,
  },
  statCardButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statCardButtonText: {
    fontSize: 12,
    color: '#f9c349',
    fontWeight: '600',
    marginTop: 2,
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
  card: {
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
  cardGradient: {
    padding: 16,
  },
  closedRibbon: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusContainer: {
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  skillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 13,
    color: '#8E8E93',
    flex: 1,
  },
  skillValue: {
    color: '#1C1C1E',
    fontWeight: '500',
  },
  budgetValue: {
    color: '#34C759',
    fontWeight: '700',
  },
  cardFooter: {
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
  },
  closeButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  closeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
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