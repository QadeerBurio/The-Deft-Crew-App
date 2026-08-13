// FeedScreen.js - Complete with Block Functionality

import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { 
  View, Text, StyleSheet, StatusBar, 
  FlatList, TouchableOpacity, Platform, TextInput,
  LayoutAnimation, ActivityIndicator, RefreshControl, Keyboard,
  Image, Animated, Dimensions, Alert
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import PostCard, { PostCardSkeleton } from "./PostCard";
import StoriesSection from './StoriesSection';
import FloatingMenu from "./FloatingMenu";
import ConfessionScreen from './ConfessionScreen';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

// Skeleton Feed for loading state
const FeedSkeleton = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3].map((i) => (
      <PostCardSkeleton key={i} />
    ))}
  </View>
);

export default function FeedScreen({ navigation }) {
  const { user, isGuest, unreadCount, updateUnreadCount, token } = useContext(AuthContext);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("Feed");
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);

  // State for blocked posts tracking
  const [blockedPostIds, setBlockedPostIds] = useState([]);

  const searchInputRef = useRef(null);
  const lastPostRef = useRef(null);
  const headerScale = useRef(new Animated.Value(1)).current;
  const searchFadeAnim = useRef(new Animated.Value(0)).current;
  const searchSlideAnim = useRef(new Animated.Value(-20)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabTranslateY = useRef(new Animated.Value(0)).current;

  // Animate FAB based on active tab
  useEffect(() => {
    Animated.spring(fabTranslateY, {
      toValue: activeTab === "Feed" ? 0 : 100,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // Animate search overlay
  useEffect(() => {
    if (isSearching && searchQuery.length > 0) {
      Animated.parallel([
        Animated.timing(searchFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(searchSlideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      searchFadeAnim.setValue(0);
      searchSlideAnim.setValue(-20);
    }
  }, [isSearching, searchQuery]);

  // FIX: Show guest alert for actions
  const showGuestAlert = (action) => {
    Alert.alert(
      'Create an Account',
      `Sign up to ${action}!`,
      [
        { text: 'Not Now', style: 'cancel' },
        { 
          text: 'Sign Up', 
          onPress: () => navigation.navigate('Login')
        }
      ]
    );
  };

  const markPostAsViewed = useCallback(async (postId) => {
    if (isGuest || !token) return;
    
    try {
      await axios.post(`${API_URL}/posts/view/${postId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {}
  }, [token, isGuest]);

  // ============ FETCH POSTS WITH BLOCK FILTER ============
  const fetchPosts = useCallback(async (category = "All", search = "", loadMore = false) => {
    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else if (!refreshing) {
        setLoading(true);
      }
      
      let url = `${API_URL}/feed?category=${category}&search=${search}&limit=10`;
      if (loadMore && lastPostRef.current) {
        url += `&before=${lastPostRef.current}`;
      }
      
      const headers = (!isGuest && token) ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(url, { headers });
      
      let newPosts = res.data.posts || res.data;
      const moreAvailable = res.data.hasMore !== undefined ? res.data.hasMore : newPosts.length === 10;
      
      // Filter out posts from blocked users (additional client-side filter)
      // The backend already filters, but this is extra safety
      if (!isGuest && user) {
        // Get blocked users from local state or context
        // The backend already filters, so this is just a backup
        newPosts = newPosts.filter(post => {
          // Check if post author is in blocked list
          const authorId = post.author?._id;
          if (!authorId) return true;
          // The backend already filters, so keep all posts
          return true;
        });
      }
      
      // Remove any posts that were blocked via PostCard callback
      if (blockedPostIds.length > 0) {
        newPosts = newPosts.filter(post => !blockedPostIds.includes(post._id));
      }
      
      if (loadMore) {
        setPosts(prev => [...prev, ...newPosts]);
        setHasMore(moreAvailable);
      } else {
        const filteredPosts = isGuest 
          ? newPosts 
          : newPosts.filter(post => post.author?._id !== user?._id);
        setPosts(filteredPosts);
        setHasMore(moreAvailable);
      }
      
      if (newPosts.length > 0) {
        lastPostRef.current = newPosts[newPosts.length - 1].createdAt;
      }
      
      if (!isGuest) {
        updateUnreadCount();
      }
    } catch (err) {
      console.error("Fetch Feed Error:", err);
      // If error is due to being blocked, handle gracefully
      if (err.response?.status === 403 && err.response?.data?.isBlocked) {
        Alert.alert("Info", "Some content is not available");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [token, user, isGuest, updateUnreadCount, blockedPostIds]);

  // ============ HANDLE BLOCK FROM POSTCARD ============
  const handleBlock = useCallback((blockedUserId) => {
    // Remove all posts from the blocked user
    setPosts(prevPosts => 
      prevPosts.filter(post => post.author?._id !== blockedUserId)
    );
    // Add blocked post IDs to local list
    const blockedPostIdsToRemove = posts
      .filter(post => post.author?._id === blockedUserId)
      .map(post => post._id);
    setBlockedPostIds(prev => [...prev, ...blockedPostIdsToRemove]);
    
    Alert.alert(
      "User Blocked",
      "Content from this user has been removed from your feed."
    );
  }, [posts]);

  // ============ HANDLE REPORT FROM POSTCARD ============
  const handleReport = useCallback((reportedPostId) => {
    // Optionally remove the reported post from feed
    // or keep it until admin action
    console.log('Post reported:', reportedPostId);
    // Could optionally remove from feed:
    // setPosts(prevPosts => prevPosts.filter(post => post._id !== reportedPostId));
  }, []);

  const loadMorePosts = () => {
    if (!hasMore || isLoadingMore || loading) return;
    fetchPosts(selectedCategory, searchQuery, true);
  };

  useEffect(() => {
    if (activeTab === "Feed") {
      fetchPosts(selectedCategory, searchQuery);
    }
  }, [selectedCategory, activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    lastPostRef.current = null;
    // Reset blocked post IDs on refresh to fetch fresh data
    setBlockedPostIds([]);
    if (activeTab === "Feed") {
      fetchPosts(selectedCategory, searchQuery);
    }
  }, [selectedCategory, searchQuery, activeTab]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    viewableItems.forEach(item => {
      if (item.isViewable && item.item && !item.item.hasViewed) {
        markPostAsViewed(item.item._id);
      }
    });
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 500,
  });

  // Enhanced search function with pagination
  const searchUsers = async (query, page = 1, loadMore = false) => {
    if (!query.trim() || query.trim().length < 2) return;
    
    if (isGuest && !loadMore) {
      setIsSearchingUsers(true);
    } else if (!loadMore) {
      setIsSearchingUsers(true);
    } else {
      setSearchLoadingMore(true);
    }
    
    try {
      const headers = (!isGuest && token) ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/users/search?q=${query}&page=${page}&limit=20`, { headers });
      
      const newUsers = res.data.users || res.data;
      const moreAvailable = res.data.hasMore !== undefined ? res.data.hasMore : newUsers.length === 20;
      
      if (loadMore) {
        setSearchResults(prev => [...prev, ...newUsers]);
        setHasMoreSearch(moreAvailable);
      } else {
        setSearchResults(newUsers);
        setHasMoreSearch(moreAvailable);
      }
    } catch (err) {
      console.error("Search Error:", err);
    } finally {
      setIsSearchingUsers(false);
      setSearchLoadingMore(false);
    }
  };

  const handleSearchTextChange = (text) => {
    setSearchQuery(text);
    if (text.trim().length > 1) {
      setSearchPage(1);
      searchUsers(text, 1, false);
    } else {
      setSearchResults([]);
      setHasMoreSearch(true);
    }
  };

  const loadMoreSearchResults = () => {
    if (!hasMoreSearch || searchLoadingMore || isSearchingUsers) return;
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);
    searchUsers(searchQuery, nextPage, true);
  };

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearching(!isSearching);
    setSearchQuery("");
    setSearchResults([]);
    setHasMoreSearch(true);
    setSearchPage(1);
    if (isSearching) {
      fetchPosts(selectedCategory, "");
      Keyboard.dismiss();
    }
  };

  const handleUserPress = (userId) => {
    if (isGuest) {
      showGuestAlert('view user profiles');
      return;
    }
    setIsSearching(false);
    navigation.navigate("UserProfile", { userId });
  };

  const handleNotifications = () => {
    if (isGuest) {
      showGuestAlert('view notifications');
      return;
    }
    navigation.navigate("Notifications");
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    // Reset states when switching tabs
    if (tab === "Feed") {
      setBlockedPostIds([]);
      fetchPosts(selectedCategory, searchQuery);
    }
  };

  // Handle FAB press with animation
  const handleFabPress = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();

    if (isGuest) {
      showGuestAlert('create a post');
      return;
    }
    navigation.navigate('CreatePostScreen');
  };

  const renderUserSearchResult = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.userResultItem}
      onPress={() => handleUserPress(item._id)}
      activeOpacity={0.7}
    >
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userSubtitle} numberOfLines={1}>
          {item.headline || item.university?.name || "TDC Member"}
        </Text>
      </View>
      <View style={styles.userArrow}>
        <Ionicons name={isGuest ? "lock-closed" : "chevron-forward"} size={16} color="#f9c349" />
      </View>
    </TouchableOpacity>
  );

  const renderSearchFooter = () => {
    if (searchLoadingMore) {
      return (
        <View style={styles.searchFooterLoader}>
          <ActivityIndicator size="small" color="#f9c349" />
        </View>
      );
    }
    if (!hasMoreSearch && searchResults.length > 0) {
      return (
        <View style={styles.searchFooterEnd}>
          <Text style={styles.searchFooterEndText}>— All users loaded —</Text>
        </View>
      );
    }
    return null;
  };

  const renderSearchEmpty = () => (
    <View style={styles.searchEmptyContainer}>
      <MaterialCommunityIcons name="account-search-outline" size={50} color="#ccc" />
      <Text style={styles.searchEmptyText}>No users found</Text>
      <Text style={styles.searchEmptySubText}>Try a different search term</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={styles.footerEnd}><Text style={styles.footerEndText}>— End of feed —</Text></View>;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#f9c349" />
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="newspaper-outline" size={50} color="#ccc" />
      </View>
      <Text style={styles.emptyText}>No posts available</Text>
      <Text style={styles.emptySubText}>Check back later for updates!</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} activeOpacity={0.7}>
        <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.retryGradient}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>Refresh Feed</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Render Feed content
  const renderFeed = () => (
    <>
      {loading && !refreshing ? (
        <FeedSkeleton />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#f9c349"
              colors={["#f9c349"]}
            />
          }
          renderItem={({ item }) => (
            <PostCard 
              post={item} 
              onRefresh={onRefresh} 
              navigation={navigation} 
              isGuest={isGuest}
              onBlock={handleBlock}
              onReport={handleReport}
            />
          )}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={!loading ? renderEmpty : null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Guest Banner */}
      {isGuest && (
        <View style={styles.guestBanner}>
          <Ionicons name="information-circle" size={18} color="#1a1a1a" />
          <Text style={styles.guestBannerText}>
            Browsing as guest
          </Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          {!isSearching ? (
            <>
              <Animated.View style={{ transform: [{ scale: headerScale }] }}>
                <Text style={styles.logoText}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
              </Animated.View>
              <View style={styles.topIcons}>
                <TouchableOpacity style={styles.iconBtn} onPress={handleNotifications} activeOpacity={0.7}>
                  <View style={styles.badgeContainer}>
                    <Ionicons name="notifications-outline" size={22} color="#1a1a1a" />
                    {!isGuest && unreadCount > 0 && <View style={styles.redBadge} />}
                  </View>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={18} color="#999" style={{marginRight: 8}} />
                <TextInput
                  ref={searchInputRef}
                  autoFocus
                  style={styles.searchInput}
                  placeholder="Search people..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={handleSearchTextChange}
                  onSubmitEditing={() => { 
                    setIsSearching(false); 
                    fetchPosts(selectedCategory, searchQuery); 
                  }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}>
                    <Ionicons name="close-circle" size={18} color="#ccc" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={toggleSearch} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "Feed" && styles.activeTab]}
            onPress={() => handleTabSwitch("Feed")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "Feed" && styles.activeTabText]}>
              Feed
            </Text>
            {activeTab === "Feed" && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === "Confession" && styles.activeTab]}
            onPress={() => handleTabSwitch("Confession")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "Confession" && styles.activeTabText]}>
              Confession
            </Text>
            {activeTab === "Confession" && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content based on active tab - FIXED: Proper isolation */}
      <View style={styles.contentContainer}>
        {activeTab === "Feed" ? (
          renderFeed()
        ) : (
          // ConfessionScreen as a separate component with its own container
          <View style={{ flex: 1 }}>
            <ConfessionScreen navigation={navigation} />
          </View>
        )}
      </View>
      
      {/* FAB Button - Only visible on Feed screen */}
      {activeTab === "Feed" && (
        <Animated.View 
          style={[
            styles.fabContainer, 
            { 
              transform: [{ scale: fabScale }],
              opacity: fabTranslateY.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0],
              })
            }
          ]}
        >
          <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.8}>
            <LinearGradient 
              colors={['#1a1a1a', '#2d2d2d']} 
              style={styles.fabGradient}
            >
              <Ionicons name="add" size={28} color="#f9c349" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
      
      {/* FloatingMenu for other actions */}
      {!isGuest && <FloatingMenu navigation={navigation} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  
  // Content Container - FIXED: Proper isolation for tabs
  contentContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  
  // Guest Banner
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9c34930'
  },
  guestBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: '500'
  },
  signInButton: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  signInText: {
    color: '#1a1a1a',
    fontWeight: '700',
    fontSize: 11
  },
  
  // Skeleton
  skeletonContainer: { paddingTop: 8 },
  
  // Header
  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 52,
  },
  logoText: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -1 },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 12, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // Search
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  cancelBtn: { marginLeft: 12 },
  cancelText: { color: '#f9c349', fontSize: 15, fontWeight: '700' },
  
  // User Result Item
  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  avatarImg: { 
    width: 48, 
    height: 48, 
    borderRadius: 14,
  },
  avatarPlaceholder: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f9c349',
  },
  avatarText: { 
    color: '#1a1a1a', 
    fontWeight: '900', 
    fontSize: 20,
  },
  userInfo: { 
    flex: 1, 
    marginLeft: 12,
  },
  userName: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#1a1a1a',
  },
  userSubtitle: { 
    fontSize: 12, 
    color: '#999', 
    marginTop: 2, 
    fontWeight: '500',
  },
  userArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Search Empty
  searchEmptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  searchEmptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 12,
  },
  searchEmptySubText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  
  // Search Footer
  searchFooterLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  searchFooterEnd: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  searchFooterEndText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Badge
  badgeContainer: { position: 'relative' },
  redBadge: {
    position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#f9c349', borderWidth: 1.5, borderColor: '#fff',
  },
  
  // Empty
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#f0f0f0', marginBottom: 16,
  },
  emptyText: { color: '#999', fontSize: 18, fontWeight: '700' },
  emptySubText: { color: '#ccc', fontSize: 14, marginTop: 6, textAlign: 'center', fontWeight: '500' },
  retryBtn: { marginTop: 20, borderRadius: 12, overflow: 'hidden', elevation: 5 },
  retryGradient: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', gap: 8 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  
  // Footer
  footerLoader: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  loadingText: { color: '#999', fontSize: 13, fontWeight: '500' },
  footerEnd: { paddingVertical: 24, alignItems: 'center' },
  footerEndText: { color: '#ccc', fontSize: 12, fontWeight: '500' },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '30%',
    right: '30%',
    height: 3,
    backgroundColor: '#f9c349',
    borderRadius: 2,
  },

  // FAB - Only shown on Feed
  fabContainer: {
    position: 'absolute', 
    bottom: 160, 
    right: 17, 
    elevation: 8,
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  fab: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  fabGradient: { 
    width: 47, 
    height: 47, 
    borderRadius: 47, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
});