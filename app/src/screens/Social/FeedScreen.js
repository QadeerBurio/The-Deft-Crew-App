import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { 
  View, Text, StyleSheet, StatusBar, 
  FlatList, TouchableOpacity, Platform, TextInput,
  LayoutAnimation, ActivityIndicator, RefreshControl, Keyboard,
  Image, Animated, Dimensions
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import PostCard, { PostCardSkeleton } from "./PostCard";
import StoriesSection from './StoriesSection';
import FloatingMenu from "./FloatingMenu";

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
  const { user, unreadCount, updateUnreadCount, token } = useContext(AuthContext);
  
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

  const searchInputRef = useRef(null);
  const lastPostRef = useRef(null);
  const headerScale = useRef(new Animated.Value(1)).current;
  const searchFadeAnim = useRef(new Animated.Value(0)).current;
  const searchSlideAnim = useRef(new Animated.Value(-20)).current;

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

  const markPostAsViewed = useCallback(async (postId) => {
    try {
      await axios.post(`${API_URL}/posts/view/${postId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {}
  }, [token]);

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
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newPosts = res.data.posts || res.data;
      const moreAvailable = res.data.hasMore !== undefined ? res.data.hasMore : newPosts.length === 10;
      
      if (loadMore) {
        setPosts(prev => [...prev, ...newPosts]);
        setHasMore(moreAvailable);
      } else {
        const filteredPosts = newPosts.filter(post => post.author?._id !== user?._id);
        setPosts(filteredPosts);
        setHasMore(moreAvailable);
      }
      
      if (newPosts.length > 0) {
        lastPostRef.current = newPosts[newPosts.length - 1].createdAt;
      }
      
      updateUnreadCount();
    } catch (err) {
      console.error("Fetch Feed Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [token, user]);

  const loadMorePosts = () => {
    if (!hasMore || isLoadingMore || loading) return;
    fetchPosts(selectedCategory, searchQuery, true);
  };

  useEffect(() => {
    fetchPosts(selectedCategory, searchQuery);
  }, [selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    lastPostRef.current = null;
    fetchPosts(selectedCategory, searchQuery);
  }, [selectedCategory, searchQuery]);

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
    
    if (!loadMore) {
      setIsSearchingUsers(true);
    } else {
      setSearchLoadingMore(true);
    }
    
    try {
      const res = await axios.get(`${API_URL}/users/search?q=${query}&page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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

  const renderUserSearchResult = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.userResultItem}
      onPress={() => {
        setIsSearching(false);
        navigation.navigate("UserProfile", { userId: item._id });
      }}
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
        <Ionicons name="chevron-forward" size={16} color="#f9c349" />
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          {!isSearching ? (
            <>
              <Animated.View style={{ transform: [{ scale: headerScale }] }}>
                <Text style={styles.logoText}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
              </Animated.View>
              <View style={styles.topIcons}>
                <TouchableOpacity style={styles.iconBtn} onPress={toggleSearch} activeOpacity={0.7}>
                  <Ionicons name="search-outline" size={22} color="#1a1a1a" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("Notifications")} activeOpacity={0.7}>
                  <View style={styles.badgeContainer}>
                    <Ionicons name="notifications-outline" size={22} color="#1a1a1a" />
                    {unreadCount > 0 && <View style={styles.redBadge} />}
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

        {/* Search Overlay with Full User List */}
        {isSearching && searchQuery.length > 0 && (
          <Animated.View style={[
            styles.searchOverlay,
            {
              opacity: searchFadeAnim,
              transform: [{ translateY: searchSlideAnim }],
            }
          ]}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchResultTitle}>
                <View style={styles.searchResultDot} />
                Search Results
              </Text>
              {searchResults.length > 0 && (
                <Text style={styles.searchCount}>
                  {searchResults.length} {searchResults.length === 1 ? 'user' : 'users'} found
                </Text>
              )}
            </View>
            
            {isSearchingUsers && searchResults.length === 0 ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="large" color="#f9c349" />
                <Text style={styles.searchLoadingText}>Searching users...</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item._id}
                renderItem={renderUserSearchResult}
                ListEmptyComponent={renderSearchEmpty}
                ListFooterComponent={renderSearchFooter}
                onEndReached={loadMoreSearchResults}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.searchListContent}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </Animated.View>
        )}

        {/* Stories */}
        {!isSearching && <StoriesSection navigation={navigation} />}
      </View>

      {/* FEED */}
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
          renderItem={({ item }) => <PostCard post={item} onRefresh={onRefresh} navigation={navigation} />}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={!loading ? renderEmpty : null}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      <FloatingMenu navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  
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
  
  // Search Overlay
  searchOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    height: height * 0.75,
    zIndex: 999,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f9c349',
    marginRight: 8,
  },
  searchCount: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 14,
  },
  searchListContent: {
    paddingBottom: 20,
  },
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  searchLoadingText: {
    marginTop: 12,
    color: '#999',
    fontSize: 13,
    fontWeight: '500',
  },
  
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
});