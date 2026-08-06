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
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getMyListings, closeListing } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

const { width, height } = Dimensions.get('window');

// Listing Item Component with enhanced animations
const ListingItem = React.memo(({ item, index, onClose, onPress }) => {
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

  const isBarter = item.type === 'barter';
  const isOpen = item.status === 'open';
  const isJob = item.type === 'job';

  const getTypeColor = () => {
    if (isBarter) return '#f9c349';
    if (isJob) return '#4A90D9';
    return '#34C759';
  };

  const getTypeIcon = () => {
    if (isBarter) return 'swap-horizontal';
    if (isJob) return 'briefcase';
    return 'cash';
  };

  const getTypeEmoji = () => {
    if (isBarter) return '🔄';
    if (isJob) return '💼';
    return '💰';
  };

  const getStatusColor = () => {
    if (isOpen) return '#34C759';
    return '#FF3B30';
  };

  const getStatusIcon = () => {
    if (isOpen) return 'checkmark-circle';
    return 'lock-closed';
  };

  return (
    <Animated.View
      style={{
        opacity: itemFadeAnim,
        transform: [{ translateY: itemSlideAnim }, { scale: scaleAnim }]
      }}
    >
      <TouchableOpacity
        onPress={() => onPress(item._id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View style={[styles.card, { transform: [{ scale: cardScaleAnim }] }]}>
          <LinearGradient
            colors={['#FFFFFF', '#FAFBFF']}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View style={[styles.glowEffect, { opacity: glowOpacity }]} />

            {/* Status Badge - Top Right */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '12' }]}>
              <Ionicons name={getStatusIcon()} size={12} color={getStatusColor()} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {isOpen ? 'Active' : 'Closed'}
              </Text>
            </View>

            {/* Type Icon */}
            <View style={[styles.typeIconContainer, { backgroundColor: getTypeColor() + '12' }]}>
              <Ionicons name={getTypeIcon()} size={18} color={getTypeColor()} />
            </View>

            <View style={styles.cardHeader}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </View>

            <View style={styles.typeBadge}>
              <Text style={[styles.typeBadgeText, { color: getTypeColor() }]}>
                {getTypeEmoji()} {isBarter ? 'Barter Exchange' : isJob ? 'Job Opportunity' : 'Paid Service'}
              </Text>
            </View>

            <View style={styles.detailsContainer}>
              {item.skillOffered?.skillName && (
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="lightbulb-on" size={16} color="#f9c349" />
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Offering: </Text>
                    <Text style={styles.detailValue}>{item.skillOffered.skillName}</Text>
                    {item.skillOffered.proficiencyLevel && (
                      <Text style={styles.levelText}> · {item.skillOffered.proficiencyLevel}</Text>
                    )}
                  </Text>
                </View>
              )}

              {item.type === 'job' && item.budget && (
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={16} color="#34C759" />
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Budget: </Text>
                    <Text style={[styles.detailValue, styles.priceValue]}>${item.budget}</Text>
                  </Text>
                </View>
              )}

              {item.type === 'paid' && item.price && (
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={16} color="#34C759" />
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Price: </Text>
                    <Text style={[styles.detailValue, styles.priceValue]}>${item.price}</Text>
                  </Text>
                </View>
              )}

              {item.type === 'barter' && item.skillWanted?.skillName && (
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="target" size={16} color="#f9c349" />
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Seeking: </Text>
                    <Text style={styles.detailValue}>{item.skillWanted.skillName}</Text>
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.timeContainer}>
                <Ionicons name="time" size={14} color="#C7C7CC" />
                <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
              </View>
              <View style={styles.footerActions}>
                {isOpen && (
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => onClose(item._id)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#FF3B30', '#D70015']}
                      style={styles.closeGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                      <Text style={styles.closeButtonText}>Close</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                <View style={styles.arrowContainer}>
                  <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function MyListingsScreen({ navigation }) {
  const { getCurrentUserId, isGuest } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
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

    fetchListings();
  }, []);

  // Filter listings
  useEffect(() => {
    if (filter === 'all') {
      setFilteredListings(listings);
    } else {
      setFilteredListings(listings.filter(l => l.status === filter));
    }
  }, [filter, listings]);

  const fetchListings = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId || isGuest) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // FIXED: Don't pass userId - the API gets it from the token
      const data = await getMyListings();
      // Handle both array and object response
      const listingsData = Array.isArray(data) ? data : data.listings || [];
      setListings(listingsData);
    } catch (err) {
      console.error('Fetch listings error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load your listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentUserId, isGuest]);

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
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading your listings...</Text>
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
          <Text style={styles.emptySubtext}>Login to view and manage your listings</Text>
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
            <Text style={styles.headerTitle}>My Listings</Text>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={() => navigation.navigate('SelectListingTypeScreen')}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Stats Card */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['#f9c349', '#f5a623']}
              style={styles.mainStatCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.mainStatContent}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialCommunityIcons name="format-list-bulleted" size={24} color="#FFFFFF" />
                </Animated.View>
                <View style={styles.mainStatText}>
                  <Text style={styles.mainStatNumber}>{counts.total}</Text>
                  <Text style={styles.mainStatLabel}>Total Listings</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatSub}>
                  <Text style={styles.mainStatSubNumber}>{counts.open}</Text>
                  <Text style={styles.mainStatSubLabel}>Active</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatSub}>
                  <Text style={styles.mainStatSubNumber}>{counts.closed}</Text>
                  <Text style={styles.mainStatSubLabel}>Closed</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterTabs}>
                {['all', 'open', 'closed'].map((tab) => {
                  const isActive = filter === tab;
                  const count = tab === 'all' ? counts.total : tab === 'open' ? counts.open : counts.closed;
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

      {/* Listings List */}
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
          data={filteredListings}
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
              progressBackgroundColor="#FFFFFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#f9c34920', '#f5a62320']}
                style={styles.emptyIconContainer}
              >
                <MaterialCommunityIcons name="file-document-plus" size={60} color="#f9c349" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>
                {filter !== 'all' ? `No ${filter} listings` : 'No Listings Yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {filter !== 'all' 
                  ? `You don't have any ${filter} listings at the moment`
                  : "Create your first listing to get started"
                }
              </Text>
              {filter === 'all' && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('SelectListingTypeScreen')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#f9c349', '#f5a623']}
                    style={styles.emptyButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.emptyButtonText}>Create Listing</Text>
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

// Styles remain the same as your current styles...

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
    backgroundColor: '#f9c349',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    flex: 1,
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
  mainStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  mainStatSub: {
    alignItems: 'center',
  },
  mainStatSubNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mainStatSubLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
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
  card: {
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
  cardGradient: {
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
  cardHeader: {
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  typeBadge: {
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  detailsContainer: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
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
    fontWeight: '500',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  closeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 4,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  arrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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