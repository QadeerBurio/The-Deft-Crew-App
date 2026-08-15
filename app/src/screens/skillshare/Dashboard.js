// screens/Dashboard.js
import React, { useEffect, useState, useCallback, useRef, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Image,
  Alert
} from 'react-native';
import { getListings, getMyMatches, getMySkillOffers } from '../../api/api';
import { timeAgo } from '../../utils/time';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Modern Listing Item
const ListingItem = React.memo(({ item, index, navigation, userId }) => {
  const isBarter = item.type === 'barter';
  const isJob = item.type === 'job';
  const isOwner = item.ownerId?._id === userId || item.ownerId === userId;
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const isMounted = useRef(true);
  
  const hasOffers = item.offerCount > 0 || item._offerCount > 0;
  const hasMatch = item.status === 'matched';
  const offerCount = item.offerCount || item._offerCount || 0;
  
  useEffect(() => {
    Animated.parallel([
      Animated.spring(itemFadeAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        delay: index * 60,
        useNativeDriver: true,
      })
    ]).start();

    return () => {
      isMounted.current = false;
      itemFadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, []);

  const getTypeIcon = () => {
    if (isBarter) return 'swap-horizontal';
    if (isJob) return 'briefcase';
    return 'cash';
  };

  const getTypeGradient = () => {
    if (isBarter) return ['#f9c349', '#f5a623'];
    if (isJob) return ['#4A90D9', '#357ABD'];
    return ['#34C759', '#28A745'];
  };

  const getTypeColor = () => {
    if (isBarter) return '#f9c349';
    if (isJob) return '#4A90D9';
    return '#34C759';
  };

  // Check if listing is closed and should be removed (after 3 days)
  const isClosedAndExpired = () => {
    if (item.status !== 'closed') return false;
    const closedDate = new Date(item.updatedAt || item.createdAt);
    const now = new Date();
    const diffDays = (now - closedDate) / (1000 * 60 * 60 * 24);
    return diffDays > 3;
  };

  // Don't render if closed and expired
  if (isClosedAndExpired()) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.cardWrapper,
        {
          opacity: itemFadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <TouchableOpacity 
        style={[styles.card, item.status === 'closed' && styles.closedCard]}
        onPress={() => navigation.navigate('ListingDetail', { id: item._id })}
        activeOpacity={0.9}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <LinearGradient
                colors={getTypeGradient()}
                style={styles.typeBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={getTypeIcon()} size={10} color="#fff" />
                <Text style={styles.typeBadgeText}>
                  {isBarter ? 'Barter' : isJob ? 'Job' : 'Paid'}
                </Text>
              </LinearGradient>
              
              {item.status === 'closed' && (
                <View style={styles.closedBadge}>
                  <Ionicons name="lock-closed" size={10} color="#FF3B30" />
                  <Text style={styles.closedBadgeText}>Closed</Text>
                </View>
              )}
              
              {hasMatch && item.status !== 'closed' && (
                <View style={styles.matchBadge}>
                  <Ionicons name="checkmark-circle" size={10} color="#34C759" />
                  <Text style={styles.matchBadgeText}>Matched</Text>
                </View>
              )}
              
              {hasOffers && !hasMatch && item.status !== 'closed' && (
                <View style={styles.offerBadge}>
                  <Ionicons name="mail-outline" size={10} color="#f9c349" />
                  <Text style={styles.offerBadgeText}>{offerCount}</Text>
                </View>
              )}

              {isOwner && (
                <View style={styles.ownerBadge}>
                  <Ionicons name="person" size={10} color="#4A90D9" />
                  <Text style={styles.ownerBadgeText}>Owner</Text>
                </View>
              )}
            </View>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={10} color="#999" />
              <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>

          <Text style={[styles.cardTitle, item.status === 'closed' && styles.closedText]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.cardDetails}>
            {isJob ? (
              <>
                <View style={styles.detailItem}>
                  <View style={[styles.detailIconCircle, { backgroundColor: '#f9c34915' }]}>
                    <Ionicons name="construct-outline" size={12} color="#f9c349" />
                  </View>
                  <Text style={styles.detailText}>{item.skillNeeded?.skillName || 'Skill needed'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <View style={[styles.detailIconCircle, { backgroundColor: '#f9c34915' }]}>
                    <Ionicons name="cash-outline" size={12} color="#f9c349" />
                  </View>
                  <Text style={styles.detailText}>${item.budget}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.detailItem}>
                  <View style={[styles.detailIconCircle, { backgroundColor: '#f9c34915' }]}>
                    <Ionicons name="star-outline" size={12} color="#f9c349" />
                  </View>
                  <Text style={styles.detailText}>{item.skillOffered?.skillName || 'Skill offered'}</Text>
                </View>
                {isBarter ? (
                  <View style={styles.detailItem}>
                    <View style={[styles.detailIconCircle, { backgroundColor: '#f9c34915' }]}>
                      <Ionicons name="swap-horizontal-outline" size={12} color="#f9c349" />
                    </View>
                    <Text style={styles.detailText}>{item.skillWanted?.skillName || 'Skill wanted'}</Text>
                  </View>
                ) : (
                  <View style={styles.detailItem}>
                    <View style={[styles.detailIconCircle, { backgroundColor: '#f9c34915' }]}>
                      <Ionicons name="time-outline" size={12} color="#f9c349" />
                    </View>
                    <Text style={styles.detailText}>${item.price} • {item.duration}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <View style={[styles.statusDot, { 
                backgroundColor: item.status === 'closed' ? '#FF3B30' : 
                               hasMatch ? '#34C759' : 
                               hasOffers ? '#f9c349' : '#34C759' 
              }]} />
              <Text style={styles.footerText}>
                {item.status === 'closed' ? 'Closed' : 
                 hasMatch ? 'Matched' : 
                 hasOffers ? `${offerCount} offers` : 'Available'}
              </Text>
            </View>
            <View style={styles.footerAction}>
              <Text style={styles.footerActionText}>Details</Text>
              <View style={styles.footerArrowCircle}>
                <Ionicons name="arrow-forward" size={10} color="#fff" />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function Dashboard({ navigation }) {
  const { user, isGuest, logout, getCurrentUserId } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [matches, setMatches] = useState([]);
  const [matchedListings, setMatchedListings] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isFetchingRef = useRef(false);
  
  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;

  const currentUserId = getCurrentUserId?.() || user?._id || user?.id;
  const currentUserName = user?.name || user?.fullName || user?.username || 'Guest User';
  const currentUserEmail = user?.email || 'guest@example.com';
  const currentUserInitial = currentUserName !== 'Guest User' ? currentUserName.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(fabAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.spring(filterAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([
      fetchMatches(),
      fetchMyOffers()
    ]);
  };

  const fetchMatches = async () => {
    try {
      const userId = getCurrentUserId?.();
      if (!userId || isGuest) return;
      
      const data = await getMyMatches();
      setMatches(data.matches || []);
      
      const matchedIds = (data.matches || [])
        .filter(m => m.listingId)
        .map(m => m.listingId._id || m.listingId);
      setMatchedListings(matchedIds);
    } catch (err) {
      console.log('Error fetching matches:', err);
    }
  };

  const fetchMyOffers = async () => {
    try {
      const userId = getCurrentUserId?.();
      if (!userId || isGuest) return;
      
      const data = await getMySkillOffers();
      setMyOffers(data.offers || []);
    } catch (err) {
      console.log('Error fetching my offers:', err);
    }
  };

  const fetchListings = async (isRefresh = false, currentFilter = activeFilter) => {
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      if (!isRefresh) setIsFetchingMore(true);
      if (isRefresh) {
        setPage(1);
        setHasMore(true);
      }
      const fetchPage = isRefresh ? 1 : page;
      if (!hasMore && !isRefresh) return;
      
      const res = await getListings({ 
        type: currentFilter, 
        page: fetchPage, 
        limit: 10 
      });
      
      const listingsWithOffers = (res || []).map(listing => {
        const isMatched = matchedListings.includes(listing._id);
        return {
          ...listing,
          status: isMatched ? 'matched' : listing.status,
          _offerCount: listing.offerCount || 0,
        };
      });
      
      if (isRefresh) {
        setListings(listingsWithOffers);
      } else {
        const newIds = new Set(listingsWithOffers.map(item => item._id));
        const filteredPrev = listings.filter(item => !newIds.has(item._id));
        setListings([...filteredPrev, ...listingsWithOffers]);
      }
      
      if (listingsWithOffers.length < 10) {
        setHasMore(false);
      } else {
        setPage(fetchPage + 1);
      }
      
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!loading) {
      setLoading(true);
    }
    fetchListings(true);
  }, [activeFilter, matchedListings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchMatches(),
      fetchMyOffers(),
      fetchListings(true)
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [activeFilter]);

  const handleFilterChange = (filter) => {
    if (activeFilter === filter) return;
    setActiveFilter(filter);
  };

  const toggleProfileMenu = () => {
    if (profileMenuVisible) {
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setProfileMenuVisible(false);
      });
    } else {
      setProfileMenuVisible(true);
      Animated.spring(menuAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  };

  const closeProfileMenu = () => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setProfileMenuVisible(false);
    });
  };

  const goToMyChats = () => {
    closeProfileMenu();
    navigation.navigate('MyMatches');
  };

  const goToMyOffers = () => {
    closeProfileMenu();
    navigation.navigate('MyOffers');
  };

  const goToMyListings = () => {
    closeProfileMenu();
    navigation.navigate('MyListings');
  };

  const handleLogout = () => {
    closeProfileMenu();
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  const renderFilterChip = (filter) => {
    const isActive = activeFilter === filter;
    const filterIcons = {
      'All': 'grid-outline',
      'Barter': 'swap-horizontal-outline',
      'Paid': 'cash-outline',
      'Job': 'briefcase-outline'
    };
    
    return (
      <TouchableOpacity 
        style={[styles.chip, isActive && styles.chipActive]} 
        onPress={() => handleFilterChange(filter)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={filterIcons[filter]} 
          size={14} 
          color={isActive ? '#f9c349' : '#666'} 
          style={styles.chipIcon}
        />
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{filter}</Text>
        {isActive && (
          <View style={styles.chipActiveDot} />
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.headerContainer,
        {
          opacity: headerAnim,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0]
              })
            }
          ]
        }
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#f9c349', '#f5a623']}
              style={styles.logoIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="handshake" size={16} color="#000" />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>SkillShare</Text>
              <Text style={styles.headerSubtitle}>Discover & Connect</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isGuest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>Guest</Text>
            </View>
          )}
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={toggleProfileMenu}
            activeOpacity={0.7}
          >
            <Feather name="more-vertical" size={22} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <Animated.View 
        style={[
          styles.categoriesContainer,
          {
            opacity: filterAnim,
            transform: [
              {
                translateY: filterAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0]
                })
              }
            ]
          }
        ]}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {renderFilterChip('All')}
          {renderFilterChip('Barter')}
          {renderFilterChip('Paid')}
          {renderFilterChip('Job')}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );

  const renderProfileMenu = () => {
    const hasMatches = matches.length > 0;
    const pendingOffers = myOffers.filter(o => o.status === 'pending').length;
    
    return (
      <Modal
        animationType="none"
        transparent={true}
        visible={profileMenuVisible}
        onRequestClose={closeProfileMenu}
      >
        <Pressable style={styles.menuOverlay} onPress={closeProfileMenu}>
          <Animated.View 
            style={[
              styles.menuContainer,
              {
                opacity: menuAnim,
                transform: [
                  {
                    scale: menuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1]
                    })
                  },
                  {
                    translateY: menuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <View style={styles.menuContent}>
              <View style={styles.menuHeader}>
                <View style={styles.menuAvatarContainer}>
                  <LinearGradient
                    colors={['#f9c349', '#f5a623']}
                    style={styles.menuAvatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.menuAvatarText}>{currentUserInitial}</Text>
                  </LinearGradient>
                  <View style={styles.menuStatusDot} />
                </View>
                <View style={styles.menuUserInfo}>
                  <Text style={styles.menuUserName}>{currentUserName}</Text>
                  <Text style={styles.menuUserEmail}>{currentUserEmail}</Text>
                </View>
              </View>

              <View style={styles.menuDivider} />

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={goToMyChats}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#f9c34915' }]}>
                  <Ionicons name="chatbubbles-outline" size={18} color="#f9c349" />
                </View>
                <Text style={styles.menuItemText}>My Chats</Text>
                {hasMatches && (
                  <View style={styles.matchCountBadge}>
                    <Text style={styles.matchCountText}>{matches.length}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward-outline" size={16} color="#ccc" style={styles.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={goToMyOffers}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#4A90D915' }]}>
                  <Ionicons name="git-pull-request-outline" size={18} color="#4A90D9" />
                </View>
                <Text style={styles.menuItemText}>My Offers</Text>
                {pendingOffers > 0 && (
                  <View style={[styles.matchCountBadge, { backgroundColor: '#f9c349' }]}>
                    <Text style={styles.matchCountText}>{pendingOffers}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward-outline" size={16} color="#ccc" style={styles.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={goToMyListings}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#34C75915' }]}>
                  <Ionicons name="list-outline" size={18} color="#34C759" />
                </View>
                <Text style={styles.menuItemText}>My Listings</Text>
                <Ionicons name="chevron-forward-outline" size={16} color="#ccc" style={styles.menuArrow} />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  };

  if (error && listings.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={60} color="#f9c349" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchListings(true)}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.retryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Filter out closed listings older than 3 days
  const filteredListings = listings.filter(item => {
    if (item.status === 'closed') {
      const closedDate = new Date(item.updatedAt || item.createdAt);
      const now = new Date();
      const diffDays = (now - closedDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 3;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <FlatList
        data={filteredListings}
        keyExtractor={item => item._id}
        renderItem={({ item, index }) => (
          <ListingItem 
            item={item} 
            index={index} 
            navigation={navigation}
            userId={currentUserId}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#f9c349"
            colors={["#f9c349"]}
            progressBackgroundColor="#ffffff"
          />
        }
        onEndReached={() => fetchListings(false)}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="handshake" size={64} color="#f9c349" />
                <Text style={styles.emptyText}>No listings yet</Text>
                <Text style={styles.emptySubtext}>Be the first to post one!</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('SelectListingTypeScreen')}
                >
                  <LinearGradient
                    colors={['#f9c349', '#f5a623']}
                    style={styles.emptyButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.emptyButtonText}>Create Listing</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMore && filteredListings.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#f9c349" />
              <Text style={styles.footerLoaderText}>Loading more...</Text>
            </View>
          ) : filteredListings.length > 0 ? (
            <View style={styles.endContainer}>
              <Text style={styles.endText}>✨ You've seen everything</Text>
            </View>
          ) : null
        }
      />
      
      {/* Modern FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabAnim }] }]}>
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('SelectListingTypeScreen')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f9c349', '#f5a623']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {renderProfileMenu()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 2,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#999',
    marginTop: 1,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestBadge: {
    backgroundColor: '#f9c34915',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f9c34930',
  },
  guestBadgeText: {
    color: '#f9c349',
    fontSize: 9,
    fontWeight: '700',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  categoriesScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  chipActive: {
    backgroundColor: '#f9c34915',
    borderColor: '#f9c349',
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#f9c349',
  },
  chipActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f9c349',
    marginLeft: 4,
  },
  errorContainer: {
    width: '100%',
    maxWidth: 300,
  },
  errorCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  errorText: {
    fontSize: 16,
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    fontWeight: '500',
  },
  retryButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 100,
    paddingTop: 4,
  },
  cardWrapper: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  closedCard: {
    opacity: 0.6,
  },
  cardContent: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B3015',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: '#FF3B3030',
  },
  closedBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FF3B30',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C75915',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: '#34C75930',
  },
  matchBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#34C759',
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9c34915',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: '#f9c34930',
  },
  offerBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#f9c349',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90D915',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: '#4A90D930',
  },
  ownerBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#4A90D9',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#999',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
    lineHeight: 20,
  },
  closedText: {
    color: '#999',
  },
  cardDetails: {
    gap: 4,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  footerText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerActionText: {
    fontSize: 11,
    color: '#f9c349',
    fontWeight: '600',
  },
  footerArrowCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f9c349',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 60,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  emptyButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    color: '#999',
  },
  endContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endText: {
    fontSize: 13,
    color: '#999',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 85 : 80,
    right: 16,
    width: 260,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  menuContent: {
    borderRadius: 16,
    paddingVertical: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuAvatarContainer: {
    position: 'relative',
  },
  menuAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  menuStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  menuUserEmail: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 13,
    color: '#1a1a1a',
    marginLeft: 12,
    fontWeight: '500',
    flex: 1,
  },
  menuArrow: {
    marginLeft: 'auto',
  },
  menuLogoutItem: {
    marginTop: 2,
  },
  menuLogoutText: {
    color: '#FF3B30',
  },
  matchCountBadge: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    marginRight: 4,
  },
  matchCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});