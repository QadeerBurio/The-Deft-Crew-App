// FeedScreen.js - Complete with FloatingMenu on center-right side

import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from "react";
import { 
  View, Text, StyleSheet, StatusBar, 
  FlatList, TouchableOpacity, Platform, TextInput,
  LayoutAnimation, ActivityIndicator, RefreshControl, Keyboard,
  Image, Animated, Dimensions, Alert, AppState
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import PostCard, { PostCardSkeleton } from "./PostCard";
import FloatingMenu from "./FloatingMenu";
import ConfessionScreen from './ConfessionScreen';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

const FEED_POLL_INTERVAL = 15000;

// Skeleton Feed for loading state
const FeedSkeleton = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3].map((i) => (
      <PostCardSkeleton key={i} />
    ))}
  </View>
);

// ============ HELPER: Check if two post arrays differ ============
const postsChanged = (oldPosts, newPosts) => {
  if (!Array.isArray(oldPosts) || !Array.isArray(newPosts)) return true;
  if (oldPosts.length !== newPosts.length) return true;
  for (let i = 0; i < newPosts.length; i++) {
    const a = oldPosts[i];
    const b = newPosts[i];
    if (!a || !b) return true;
    if (a._id !== b._id) return true;
    const aLikes = Array.isArray(a.likes) ? a.likes.length : 0;
    const bLikes = Array.isArray(b.likes) ? b.likes.length : 0;
    if (aLikes !== bLikes) return true;
    const aComments = Array.isArray(a.comments) ? a.comments.length : 0;
    const bComments = Array.isArray(b.comments) ? b.comments.length : 0;
    if (aComments !== bComments) return true;
    if (a.content !== b.content) return true;
  }
  return false;
};

export default function FeedScreen({ navigation }) {
  const { user, isGuest, unreadCount, updateUnreadCount, token } = useContext(AuthContext);
  
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

  const [blockedPostIds, setBlockedPostIds] = useState([]);

  const searchInputRef = useRef(null);
  const lastPostRef = useRef(null);
  const headerScale = useRef(new Animated.Value(1)).current;
  const searchFadeAnim = useRef(new Animated.Value(0)).current;
  const searchSlideAnim = useRef(new Animated.Value(-20)).current;

  // Polling refs
  const pollIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);
  const isScreenFocusedRef = useRef(true);
  const lastFeedFetchRef = useRef(0);

  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  // Animate search overlay
  useEffect(() => {
    if (isSearching && searchQuery.length > 0) {
      Animated.parallel([
        Animated.timing(searchFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(searchSlideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      searchFadeAnim.setValue(0);
      searchSlideAnim.setValue(-20);
    }
  }, [isSearching, searchQuery]);

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
      await axios.post(`${API_URL}/posts/view/${postId}`, {}, config);
    } catch (err) {}
  }, [token, isGuest, config]);

  // ============ FETCH POSTS ============
  const fetchPosts = useCallback(async (category = "All", search = "", loadMore = false, silent = false) => {
    if (!isMountedRef.current) return;

    const now = Date.now();
    if (silent && now - lastFeedFetchRef.current < 3000) return;
    if (silent) lastFeedFetchRef.current = now;

    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else if (!refreshing && !silent) {
        setLoading(true);
      }
      
      let url = `${API_URL}/feed?category=${category}&search=${search}&limit=10`;
      if (loadMore && lastPostRef.current) {
        url += `&before=${lastPostRef.current}`;
      }
      
      const headers = (!isGuest && token) ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(url, { headers });

      if (!isMountedRef.current) return;
      
      let newPosts = res.data.posts || res.data;
      const moreAvailable = res.data.hasMore !== undefined ? res.data.hasMore : newPosts.length === 10;
      
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

        setPosts(prev => {
          if (silent && !postsChanged(prev, filteredPosts)) {
            return prev;
          }
          return filteredPosts;
        });

        setHasMore(moreAvailable);
      }
      
      if (newPosts.length > 0 && loadMore) {
        lastPostRef.current = newPosts[newPosts.length - 1].createdAt;
      } else if (newPosts.length > 0 && !loadMore) {
        lastPostRef.current = newPosts[newPosts.length - 1].createdAt;
      }
      
      if (!isGuest && !silent) {
        updateUnreadCount();
      }
    } catch (err) {
      if (!silent) {
        console.error("Fetch Feed Error:", err);
        if (err.response?.status === 403 && err.response?.data?.isBlocked) {
          Alert.alert("Info", "Some content is not available");
        }
      }
    } finally {
      if (isMountedRef.current && !silent) {
        setLoading(false);
        setRefreshing(false);
        setIsLoadingMore(false);
      }
    }
  }, [token, user, isGuest, updateUnreadCount, blockedPostIds, refreshing]);

  const handleBlock = useCallback((blockedUserId) => {
    setPosts(prevPosts => 
      prevPosts.filter(post => post.author?._id !== blockedUserId)
    );
    const blockedPostIdsToRemove = posts
      .filter(post => post.author?._id === blockedUserId)
      .map(post => post._id);
    setBlockedPostIds(prev => [...prev, ...blockedPostIdsToRemove]);
    
    Alert.alert(
      "User Blocked",
      "Content from this user has been removed from your feed."
    );
  }, [posts]);

  const handleReport = useCallback((reportedPostId) => {
    console.log('Post reported:', reportedPostId);
  }, []);

  const loadMorePosts = () => {
    if (!hasMore || isLoadingMore || loading || isSearching) return;
    fetchPosts(selectedCategory, searchQuery, true, false);
  };

  useEffect(() => {
    if (activeTab === "Feed") {
      fetchPosts(selectedCategory, searchQuery, false, false);
    }
  }, [selectedCategory, activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    lastPostRef.current = null;
    setBlockedPostIds([]);
    if (activeTab === "Feed") {
      fetchPosts(selectedCategory, searchQuery, false, false);
    }
  }, [selectedCategory, searchQuery, activeTab, fetchPosts]);

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

  const searchUsers = async (query, page = 1, loadMore = false) => {
    if (!query.trim() || query.trim().length < 2) return;
    
    if (!loadMore) {
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

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearching(!isSearching);
    setSearchQuery("");
    setSearchResults([]);
    setHasMoreSearch(true);
    setSearchPage(1);
    if (isSearching) {
      fetchPosts(selectedCategory, "", false, false);
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
    if (tab === "Feed") {
      setBlockedPostIds([]);
      fetchPosts(selectedCategory, searchQuery, false, false);
    }
  };

  // ============ FEED POLLING ============
  useEffect(() => {
    const shouldPoll = activeTab === "Feed" && !isSearching && !isGuest && token;

    if (!shouldPoll) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      if (
        appStateRef.current === 'active' &&
        isScreenFocusedRef.current &&
        !isLoadingMore &&
        !refreshing
      ) {
        fetchPosts(selectedCategory, searchQuery, false, true);
      }
    }, FEED_POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeTab, isSearching, isGuest, token, selectedCategory, searchQuery, isLoadingMore, refreshing, fetchPosts]);

  // App state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        prevState.match(/inactive|background/) &&
        nextAppState === 'active' &&
        activeTab === "Feed" &&
        !isSearching
      ) {
        fetchPosts(selectedCategory, searchQuery, false, true);
      }
    });

    return () => subscription.remove();
  }, [activeTab, isSearching, selectedCategory, searchQuery, fetchPosts]);

  // Screen focus
  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;
      isMountedRef.current = true;

      if (activeTab === "Feed" && !isSearching) {
        fetchPosts(selectedCategory, searchQuery, false, true);
      }

      return () => {
        isScreenFocusedRef.current = false;
      };
    }, [activeTab, isSearching, selectedCategory, searchQuery, fetchPosts])
  );

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const renderUserSearchResult = ({ item }) => (
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
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={10}
          initialNumToRender={6}
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
                    fetchPosts(selectedCategory, searchQuery, false, false); 
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

      {/* Content based on active tab */}
      <View style={styles.contentContainer}>
        {activeTab === "Feed" ? (
          <View style={{ flex: 1 }}>
            {renderFeed()}
            {/* ✅ FloatingMenu only renders on Feed tab */}
            {!isGuest && <FloatingMenu navigation={navigation} />}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <ConfessionScreen navigation={navigation} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  
  contentContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  
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
  
  skeletonContainer: { paddingTop: 8 },
  
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
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', 
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  searchInputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', borderRadius: 12, paddingHorizontal: 12,
    height: 40, borderWidth: 2, borderColor: '#f0f0f0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  cancelBtn: { marginLeft: 12 },
  cancelText: { color: '#f9c349', fontSize: 15, fontWeight: '700' },
  
  userResultItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  avatarImg: { width: 48, height: 48, borderRadius: 14 },
  avatarPlaceholder: { 
    width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f9c349',
  },
  avatarText: { color: '#1a1a1a', fontWeight: '900', fontSize: 20 },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  userSubtitle: { fontSize: 12, color: '#999', marginTop: 2, fontWeight: '500' },
  userArrow: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: '#f8f8f8',
    justifyContent: 'center', alignItems: 'center',
  },
  
  badgeContainer: { position: 'relative' },
  redBadge: {
    position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#f9c349', borderWidth: 1.5, borderColor: '#fff',
  },
  
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
  
  footerLoader: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  loadingText: { color: '#999', fontSize: 13, fontWeight: '500' },
  footerEnd: { paddingVertical: 24, alignItems: 'center' },
  footerEndText: { color: '#ccc', fontSize: 12, fontWeight: '500' },

  tabsContainer: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center', position: 'relative',
  },
  activeTab: {},
  tabText: { fontSize: 15, fontWeight: '600', color: '#999' },
  activeTabText: { color: '#1a1a1a', fontWeight: '700' },
  activeTabIndicator: {
    position: 'absolute', bottom: -1, left: '30%', right: '30%',
    height: 3, backgroundColor: '#f9c349', borderRadius: 2,
  },
});