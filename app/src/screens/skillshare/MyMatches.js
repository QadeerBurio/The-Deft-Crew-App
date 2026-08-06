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

// Match Item Component with enhanced animations
const MatchItem = React.memo(({ item, index, onPress }) => {
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
    outputRange: [0, 0.3, 0],
  });

  // Get the other user in the match
  const otherUser = item.otherUser || item.offerorId || item.listingOwnerId;
  const userName = otherUser?.name || otherUser?.fullName || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const userImage = otherUser?.profileImage || null;
  
  const listing = item.listingId || {};
  const listingTitle = listing.title || 'Untitled Listing';
  const listingType = listing.type || 'barter';
  
  const lastMessage = item.conversation?.lastMessage || '✨ Match created!';
  const lastActivity = item.updatedAt || item.createdAt || new Date();
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

  const getTypeEmoji = () => {
    if (listingType === 'barter') return '🔄';
    if (listingType === 'job') return '💼';
    return '💰';
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
        <Animated.View style={[styles.matchCard, { transform: [{ scale: cardScaleAnim }] }]}>
          <LinearGradient
            colors={['#FFFFFF', '#FAFBFF']}
            style={styles.matchCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View style={[styles.glowEffect, { opacity: glowOpacity }]} />
            
            <View style={styles.matchCardContent}>
              {/* Left - User Avatar with status */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarWrapper}>
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
                  <View style={styles.onlineIndicator} />
                </View>
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
                  <View style={[styles.typeBadge, { backgroundColor: getTypeColor() + '12' }]}>
                    <Text style={[styles.typeBadgeText, { color: getTypeColor() }]}>
                      {getTypeEmoji()} {listingType.charAt(0).toUpperCase() + listingType.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.listingTitle} numberOfLines={1}>
                  📌 {listingTitle}
                </Text>

                <View style={styles.messagePreview}>
                  <View style={styles.messageIconContainer}>
                    <Ionicons name="chatbubble-ellipses" size={14} color="#f9c349" />
                  </View>
                  <Text style={styles.messageText} numberOfLines={1}>
                    {lastMessage}
                  </Text>
                </View>
              </View>

              {/* Right - Time & Arrow */}
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{timeAgo(lastActivity)}</Text>
                <View style={styles.arrowContainer}>
                  <Ionicons name="chevron-forward" size={20} color="#f9c349" />
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
    
    fetchMatches();
    
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      scaleAnim.stopAnimation();
      headerAnim.stopAnimation();
      floatingY.stopAnimation();
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();
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
      
      const processedMatches = matchesData.map(match => {
        const listingOwnerId = match.listingOwnerId?._id || match.listingOwnerId;
        const offerorId = match.offerorId?._id || match.offerorId;
        const currentUserId = userId;
        
        let otherUser = match.otherUser || match.offerorId || match.listingOwnerId;
        
        if (!otherUser?.name && !otherUser?.fullName) {
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
      navigation.navigate('MatchChat', {
        matchId: match._id,
        listingId: match.listingId?._id || match.listingId,
        otherUser: match.otherUser,
        listing: match.listingId
      });
    } catch (err) {
      console.error('Navigation error:', err);
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
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FC" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading your matches...</Text>
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
          <Text style={styles.emptySubtext}>Login to view your matches and connect with others</Text>
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
            <Text style={styles.headerTitle}>Chats</Text>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={20} color="#f9c349" />
            </TouchableOpacity>
          </View>

          {/* Stats Card */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['#f9c349', '#f5a623']}
              style={styles.statsCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statsContent}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialCommunityIcons name="chat" size={24} color="#FFFFFF" />
                </Animated.View>
                <View style={styles.statsTextContainer}>
                  <Text style={styles.statsNumber}>{counts.total}</Text>
                  <Text style={styles.statsLabel}>Active Chats</Text>
                </View>
                <View style={styles.statsDivider} />
                <View style={styles.statsTextContainer}>
                  <Text style={[styles.statsNumber, { fontSize: 18 }]}>
                    {matches.filter(m => m.status === 'active').length}
                  </Text>
                  <Text style={styles.statsLabel}>Active</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#8E8E93" />
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
                  activeOpacity={0.7}
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
              progressBackgroundColor="#FFFFFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#f9c34920', '#f5a62320']}
                style={styles.emptyIconContainer}
              >
                <MaterialCommunityIcons name="chat-plus" size={60} color="#f9c349" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>
                {searchQuery.length > 0 ? 'No Results' : 'No Chats Yet'}
              </Text>
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
  statsCard: {
    borderRadius: 14,
    padding: 14,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statsTextContainer: {
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  statsDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 8,
    padding: 0,
    height: 30,
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 20,
  },
  matchCard: {
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
  matchCardGradient: {
    borderRadius: 14,
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
  matchCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarWrapper: {
    position: 'relative',
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
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  listingTitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '500',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    flex: 1,
  },
  timeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#C7C7CC',
    fontWeight: '500',
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