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
  Image
} from 'react-native';
import { getListings } from '../../api/api';
import { timeAgo } from '../../utils/time';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Create a separate component for list items
const ListingItem = React.memo(({ item, index, navigation }) => {
  const isBarter = item.type === 'barter';
  const isJob = item.type === 'job';
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.timing(itemFadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const getTypeIcon = () => {
    if (isBarter) return 'swap-horizontal';
    if (isJob) return 'briefcase';
    return 'cash';
  };

  const getTypeColor = () => {
    if (isBarter) return '#f9c349';
    if (isJob) return '#4A90D9';
    return '#34C759';
  };

  const getTypeGradient = () => {
    if (isBarter) return ['#f9c349', '#f5a623'];
    if (isJob) return ['#4A90D9', '#357ABD'];
    return ['#34C759', '#28A745'];
  };

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
        style={styles.card}
        onPress={() => navigation.navigate('ListingDetail', { id: item._id })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FA']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
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
                  <Ionicons name={getTypeIcon()} size={12} color="#fff" />
                  <Text style={styles.typeBadgeText}>
                    {isBarter ? 'Barter' : isJob ? 'Job' : 'Paid'}
                  </Text>
                </LinearGradient>
              </View>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={12} color="#C7C7CC" />
                <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
              </View>
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

            <View style={styles.cardDetails}>
              {isJob ? (
                <>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconCircle}>
                      <Ionicons name="construct-outline" size={13} color="#f9c349" />
                    </View>
                    <Text style={styles.detailText}>{item.skillNeeded?.skillName || 'Skill needed'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconCircle}>
                      <Ionicons name="cash-outline" size={13} color="#f9c349" />
                    </View>
                    <Text style={styles.detailText}>${item.budget}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconCircle}>
                      <Ionicons name="star-outline" size={13} color="#f9c349" />
                    </View>
                    <Text style={styles.detailText}>{item.skillOffered?.skillName || 'Skill offered'}</Text>
                  </View>
                  {isBarter ? (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconCircle}>
                        <Ionicons name="swap-horizontal-outline" size={13} color="#f9c349" />
                      </View>
                      <Text style={styles.detailText}>{item.skillWanted?.skillName || 'Skill wanted'}</Text>
                    </View>
                  ) : (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconCircle}>
                        <Ionicons name="time-outline" size={13} color="#f9c349" />
                      </View>
                      <Text style={styles.detailText}>${item.price} • {item.duration}</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.footerLeft}>
                <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
                <Text style={styles.footerText}>Available</Text>
              </View>
              <View style={styles.footerAction}>
                <Text style={styles.footerActionText}>View Details</Text>
                <View style={styles.footerArrowCircle}>
                  <Ionicons name="arrow-forward" size={12} color="#fff" />
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function Dashboard({ navigation }) {
  const { user, isGuest, logout } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isFetchingRef = useRef(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-30)).current;
  const statsFadeAnim = useRef(new Animated.Value(0)).current;

  // Get current user data
  const currentUserName = user?.name || user?.fullName || user?.username || 'Guest User';
  const currentUserEmail = user?.email || 'guest@example.com';
  const currentUserImage = user?.profileImage || null;
  const currentUserInitial = currentUserName !== 'Guest User' ? currentUserName.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(fabAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(statsFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      
      const newData = res || [];
      
      if (isRefresh) {
        setListings(newData);
      } else {
        const newIds = new Set(newData.map(item => item._id));
        const filteredPrev = listings.filter(item => !newIds.has(item._id));
        setListings([...filteredPrev, ...newData]);
      }
      
      if (newData.length < 10) {
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
    setLoading(true);
    fetchListings(true);
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings(true);
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
          color={isActive ? '#FFFFFF' : '#8E8E93'} 
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
          opacity: fadeAnim,
          transform: [{ translateY: headerSlideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['#FFFFFF', '#FFFDF5']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#f9c349', '#f9c349']}
                style={styles.logoIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="handshake" size={18} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={styles.headerTitle}>Skill Share</Text>
                <Text style={styles.headerSubtitle}>Trade skills, learn together</Text>
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
              <Feather name="more-vertical" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <Animated.View style={[styles.statsContainer, { opacity: statsFadeAnim }]}>
          <View style={styles.statsCard}>
            <LinearGradient
              colors={['#f9c349', '#f9c349']}
              style={styles.statsCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.statsNumber}>{listings.length}</Text>
              <Text style={styles.statsLabel}>Listings</Text>
            </LinearGradient>
          </View>
          <View style={styles.statsCard}>
            <LinearGradient
              colors={['#4A90D9', '#357ABD']}
              style={styles.statsCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.statsNumber}>{listings.filter(l => l.type === 'job').length}</Text>
              <Text style={styles.statsLabel}>Jobs</Text>
            </LinearGradient>
          </View>
          <View style={styles.statsCard}>
            <LinearGradient
              colors={['#000000', '#000000']}
              style={styles.statsCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.statsNumber}>{listings.filter(l => l.type === 'barter').length}</Text>
              <Text style={styles.statsLabel}>Barters</Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Categories Section */}
        <View style={styles.categoriesContainer}>
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
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderProfileMenu = () => (
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
                    outputRange: [0.9, 1]
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
          <LinearGradient
            colors={['#FFFFFF', '#FFFDF5']}
            style={styles.menuContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
           

           

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                closeProfileMenu();
                navigation.navigate('SkillProfile');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#f9c34910' }]}>
                <Ionicons name="person-outline" size={20} color="#f9c349" />
              </View>
              <Text style={styles.menuItemText}>My Stats</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#C7C7CC" style={styles.menuArrow} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                closeProfileMenu();
                navigation.navigate('Activity');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#4A90D910' }]}>
                <Ionicons name="time-outline" size={20} color="#4A90D9" />
              </View>
              <Text style={styles.menuItemText}>My Activity</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#C7C7CC" style={styles.menuArrow} />
            </TouchableOpacity>

            


           
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );

  if (error && listings.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <LinearGradient
            colors={['#FFF5F5', '#FFEBEB']}
            style={styles.errorCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchListings(true)}>
              <LinearGradient
                colors={['#f9c349', '#f9c349']}
                style={styles.retryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
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
      
      <FlatList
        data={listings}
        keyExtractor={item => item._id}
        renderItem={({ item, index }) => (
          <ListingItem item={item} index={index} navigation={navigation} />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#f9c349"
            colors={["#f9c349"]}
          />
        }
        onEndReached={() => fetchListings(false)}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#FFFDF5', '#F8F9FA']}
                style={styles.emptyCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="handshake" size={60} color="#f9c349" />
                <Text style={styles.emptyText}>No listings yet — be the first to post one!</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('SelectListingTypeScreen')}
                >
                  <LinearGradient
                    colors={['#f9c349', '#f9c349']}
                    style={styles.emptyButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.emptyButtonText}>Create Listing</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMore && listings.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#f9c349" />
              <Text style={styles.footerLoaderText}>Loading more...</Text>
            </View>
          ) : listings.length > 0 ? (
            <View style={styles.endContainer}>
              <Text style={styles.endText}>You've seen everything! 🎉</Text>
            </View>
          ) : null
        }
      />
      
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabAnim }] }]}>
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('SelectListingTypeScreen')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#000000', '#1a1a1a']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
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
    backgroundColor: '#F8F9FA',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginTop: Platform.OS === 'android' ? 34 : 0,
  },
  headerGradient: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 1,
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestBadge: {
    backgroundColor: '#f9c34920',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f9c34940',
  },
  guestBadgeText: {
    color: '#f9c349',
    fontSize: 10,
    fontWeight: '700',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  statsCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statsCardGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statsLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  categoriesScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chipActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f9c349',
    marginLeft: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    width: '100%',
    maxWidth: 300,
  },
  errorCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#1C1C1E',
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
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 100,
    paddingTop: 4,
  },
  cardWrapper: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardGradient: {
    borderRadius: 16,
  },
  cardContent: {
    padding: 16,
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
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#C7C7CC',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
    lineHeight: 22,
  },
  cardDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerActionText: {
    fontSize: 12,
    color: '#f9c349',
    fontWeight: '600',
  },
  footerArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f9c349',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    fontSize: 14,
    color: '#8E8E93',
  },
  endContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endText: {
    fontSize: 14,
    color: '#8E8E93',
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
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
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
  menuAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  menuAvatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  menuUserEmail: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 14,
    color: '#1C1C1E',
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
  menuLogoutIcon: {
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
});