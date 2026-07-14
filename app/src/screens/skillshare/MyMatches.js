// screens/MyMatches.js
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
  Image,
  TextInput
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getMyMatches } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

const { width, height } = Dimensions.get('window');

// Match Item Component with animations - FIXED
const MatchItem = React.memo(({ item, index, onPress }) => {
  const itemFadeAnim = useRef(new Animated.Value(0)).current;
  const itemSlideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const cardScaleAnim = useRef(new Animated.Value(1)).current;
  // Use a separate animated value for background that doesn't conflict
  const bgValue = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    // All animations use native driver where possible
    // For opacity, we use native driver but with a separate value
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

    return () => {
      isMounted.current = false;
      // Stop all animations on unmount
      itemFadeAnim.stopAnimation();
      itemSlideAnim.stopAnimation();
      scaleAnim.stopAnimation();
      cardScaleAnim.stopAnimation();
      bgValue.stopAnimation();
    };
  }, []);

  const handlePressIn = () => {
    if (!isMounted.current) return;
    
    // Only animate scale with native driver
    Animated.spring(cardScaleAnim, {
      toValue: 0.97,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    }).start();
    
    // Update background value (non-native)
    Animated.timing(bgValue, {
      toValue: 1,
      duration: 150,
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
    
    Animated.timing(bgValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Interpolate background color
  const backgroundColor = bgValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#F5F5F5']
  });

  // Get the other user in the match
  const otherUser = item.otherUser || item.offerorId || item.listingOwnerId;
  const userName = otherUser?.name || otherUser?.fullName || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const userImage = otherUser?.profileImage || null;
  
  // Get listing details
  const listing = item.listingId || {};
  const listingTitle = listing.title || 'Untitled Listing';
  const listingType = listing.type || 'barter';
  
  // Get last message or match info
  const lastMessage = item.conversation?.lastMessage || 'Match created!';
  const lastActivity = item.updatedAt || item.createdAt || new Date();
  
  // Check if there are unread messages
  const unreadCount = item.conversation?.unreadCount || 0;

  const getTypeIcon = () => {
    if (listingType === 'barter') return 'swap-horizontal';
    if (listingType === 'job') return 'briefcase';
    return 'cash';
  };

  const getTypeColor = () => {
    if (listingType === 'barter') return '#f9c349';
    if (listingType === 'job') return '#4A90D9';
    return '#34C759';
  };

  return (
    <Animated.View
      style={{
        opacity: itemFadeAnim,
        transform: [{ translateY: itemSlideAnim }, { scale: scaleAnim }]
      }}
    >
      <TouchableOpacity
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View style={[styles.matchCard, { backgroundColor, transform: [{ scale: cardScaleAnim }] }]}>
          <LinearGradient
            colors={['rgba(249, 195, 73, 0.05)', 'rgba(249, 195, 73, 0.02)']}
            style={styles.matchCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.matchCardContent}>
              {/* Left - User Avatar */}
              <View style={styles.avatarContainer}>
                {userImage ? (
                  <Image source={{ uri: userImage }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={['#f9c349', '#f5a623']}
                    style={styles.avatarPlaceholder}
                  >
                    <Text style={styles.avatarText}>{userInitial}</Text>
                  </LinearGradient>
                )}
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>

              {/* Middle - User Info */}
              <View style={styles.matchInfo}>
                <View style={styles.matchHeader}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {userName}
                  </Text>
                  <View style={[styles.typeBadge, { backgroundColor: getTypeColor() + '15' }]}>
                    <Ionicons name={getTypeIcon()} size={10} color={getTypeColor()} />
                    <Text style={[styles.typeBadgeText, { color: getTypeColor() }]}>
                      {listingType.charAt(0).toUpperCase() + listingType.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.listingTitle} numberOfLines={1}>
                  {listingTitle}
                </Text>

                <View style={styles.messagePreview}>
                  <Ionicons name="chatbubble-outline" size={12} color="#8E8E93" />
                  <Text style={styles.messageText} numberOfLines={1}>
                    {lastMessage}
                  </Text>
                </View>
              </View>

              {/* Right - Time */}
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{timeAgo(lastActivity)}</Text>
                <View style={styles.arrowContainer}>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function MyMatches({ navigation }) {
  const { getCurrentUserId, isGuest, user } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    // All animations use native driver where possible
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 35,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
    
    fetchMatches();
    
    return () => {
      // Clean up animations
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      scaleAnim.stopAnimation();
      headerAnim.stopAnimation();
    };
  }, []);

  // Search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMatches(matches);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = matches.filter(match => {
        const otherUser = match.otherUser || match.offerorId || match.listingOwnerId;
        const userName = otherUser?.name || otherUser?.fullName || 'User';
        const listingTitle = match.listingId?.title || '';
        
        return userName.toLowerCase().includes(query) || 
               listingTitle.toLowerCase().includes(query);
      });
      setFilteredMatches(filtered);
    }
  }, [searchQuery, matches]);

  const fetchMatches = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId || isGuest) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getMyMatches();
      const matchesData = data.matches || [];
      
      // Process matches to extract user info
      const processedMatches = matchesData.map(match => {
        // Get the other user
        const listingOwnerId = match.listingOwnerId?._id || match.listingOwnerId;
        const offerorId = match.offerorId?._id || match.offerorId;
        const currentUserId = userId;
        
        let otherUser = match.otherUser || match.offerorId || match.listingOwnerId;
        
        // If otherUser is an ObjectId or doesn't have name, try to get from match data
        if (!otherUser?.name && !otherUser?.fullName) {
          // Try to find the other user from the match data
          if (listingOwnerId && listingOwnerId !== currentUserId) {
            otherUser = match.listingOwnerId;
          } else if (offerorId && offerorId !== currentUserId) {
            otherUser = match.offerorId;
          }
        }
        
        return {
          ...match,
          otherUser: otherUser || match.offerorId || match.listingOwnerId,
        };
      });
      
      setMatches(processedMatches);
      setFilteredMatches(processedMatches);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCurrentUserId, isGuest]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const handleMatchPress = (match) => {
    try {
      // Navigate to chat screen with match details
      navigation.navigate('MatchChat', {
        matchId: match._id,
        listingId: match.listingId?._id || match.listingId,
        otherUser: match.otherUser,
        listing: match.listingId
      });
    } catch (err) {
      console.error('Navigation error:', err);
      // Try to navigate with minimal params
      navigation.navigate('MatchChat', {
        matchId: match._id,
        otherUser: match.otherUser
      });
    }
  };

  const getStatusCounts = () => {
    const total = matches.length;
    return { total };
  };

  const counts = getStatusCounts();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading your matches...</Text>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Ionicons name="person-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>Login Required</Text>
        <Text style={styles.emptySubtext}>Please login to view your matches</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <LinearGradient
            colors={['#f9c349', '#f5a623']}
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

      {/* Header */}
      <Animated.View 
        style={[
          styles.headerContainer,
          {
            transform: [{ translateY: headerAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FFFDF5']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Chats</Text>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={22} color="#f9c349" />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statsCard}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.statsCardGradient}
              >
                <Text style={styles.statsNumber}>{counts.total}</Text>
                <Text style={styles.statsLabel}>Active Matches</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color="#8E8E93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search matches..."
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={18} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Matches List */}
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
          data={filteredMatches}
          keyExtractor={(item) => item._id || String(item.id) || String(item.createdAt)}
          renderItem={({ item, index }) => (
            <MatchItem 
              item={item} 
              index={index} 
              onPress={handleMatchPress}
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
                colors={['#f9c34920', '#f5a62320']}
                style={styles.emptyIconContainer}
              >
                <MaterialCommunityIcons name="chat-outline" size={64} color="#f9c349" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Matches Yet</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.length > 0 
                  ? `No matches found for "${searchQuery}"`
                  : "Start bartering or applying to jobs to connect with others"
                }
              </Text>
              {searchQuery.length === 0 && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('Dashboard')}
                >
                  <LinearGradient
                    colors={['#f9c349', '#f5a623']}
                    style={styles.emptyButtonGradient}
                  >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    paddingVertical: 12,
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
  headerTitle: {
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
    paddingVertical: 8,
  },
  statsCard: {
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
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    marginLeft: 8,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  matchCard: {
    borderRadius: 14,
    marginBottom: 12,
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
  matchCardGradient: {
    borderRadius: 14,
  },
  matchCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#f9c349',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f9c349',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  matchInfo: {
    flex: 1,
    marginRight: 8,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  listingTitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageText: {
    fontSize: 13,
    color: '#3A3A3C',
    flex: 1,
  },
  timeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#C7C7CC',
  },
  arrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
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