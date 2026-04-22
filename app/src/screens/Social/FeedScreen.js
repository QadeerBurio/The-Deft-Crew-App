import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { 
  View, Text, StyleSheet,  StatusBar, 
  FlatList, TouchableOpacity, Platform, TextInput,
  LayoutAnimation, ActivityIndicator, RefreshControl, Keyboard,
  Image
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import PostCard from "./PostCard";
import StoriesSection from './StoriesSection';
import FloatingMenu from "./FloatingMenu";

const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

export default function FeedScreen({ navigation }) {
  const { user, unreadCount, updateUnreadCount, token } = useContext(AuthContext);
  
  // Feed States
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Search States
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const searchInputRef = useRef(null);
  const lastPostRef = useRef(null);
  
  // Mark post as viewed when it comes into view
  const markPostAsViewed = useCallback(async (postId) => {
    try {
      await axios.post(`${API_URL}/posts/view/${postId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Error marking post as viewed:", err);
    }
  }, [token]);

  // --- Fetch Main Feed Posts ---
  const fetchPosts = useCallback(async (category = "All", search = "", loadMore = false) => {
    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      let url = `${API_URL}/feed?category=${category}&search=${search}&limit=10`;
      
      // Add pagination parameter for loading more
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
        // Filter out user's own posts if needed
        const filteredPosts = newPosts.filter(post => post.author?._id !== user?._id);
        setPosts(filteredPosts);
        setHasMore(moreAvailable);
      }
      
      // Store timestamp of last post for pagination
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

  // Load more posts when reaching the end
  const loadMorePosts = () => {
    if (!hasMore || isLoadingMore || loading) return;
    fetchPosts(selectedCategory, searchQuery, true);
  };

  useEffect(() => {
    fetchPosts(selectedCategory, searchQuery);
  }, [selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    lastPostRef.current = null;
    fetchPosts(selectedCategory, searchQuery);
  };

  // Handle when a post becomes visible - mark as viewed
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    viewableItems.forEach(item => {
      if (item.isViewable && item.item && !item.item.hasViewed) {
        markPostAsViewed(item.item._id);
      }
    });
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 500, // Wait 500ms before marking as viewed
  });

  // --- Live Search Users Logic ---
  const handleSearchTextChange = async (text) => {
    setSearchQuery(text);
    if (text.trim().length > 1) {
      setIsSearchingUsers(true);
      try {
        const res = await axios.get(`${API_URL}/users/search?q=${text}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSearchResults(res.data);
      } catch (err) {
        console.error("User Search Error:", err);
      } finally {
        setIsSearchingUsers(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearching(!isSearching);
    setSearchQuery("");
    setSearchResults([]);
    if (isSearching) {
      fetchPosts(selectedCategory, "");
      Keyboard.dismiss();
    }
  };

  // --- UI Components ---
  const renderUserSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.userResultItem}
      onPress={() => {
        setIsSearching(false);
        navigation.navigate("UserProfile", { userId: item._id });
      }}
    >
      <View style={styles.avatarContainer}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatarImg} />
        ) : (
          <Ionicons name="person-circle" size={50} color="#DDD" />
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userSubtitle} numberOfLines={1}>
          {item.headline || item.university?.name || "Member of TDC"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CCC" />
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading more posts...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          {!isSearching ? (
            <>
              <Text style={styles.logoText}>tdc</Text>
              <View style={styles.topIcons}>
                <TouchableOpacity style={styles.iconBtn} onPress={toggleSearch}>
                  <Ionicons name="search-outline" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.iconBtn} 
                  onPress={() => navigation.navigate("Notifications")}
                >
                  <View style={styles.badgeContainer}>
                    <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
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
                  placeholder="Search people or opportunities..."
                  value={searchQuery}
                  onChangeText={handleSearchTextChange}
                  onSubmitEditing={() => {
                    setIsSearching(false);
                    fetchPosts(selectedCategory, searchQuery);
                  }}
                />
              </View>
              <TouchableOpacity onPress={toggleSearch} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SEARCH OVERLAY (Shows only when searching) */}
        {isSearching && searchQuery.length > 0 && (
          <View style={styles.searchOverlay}>
            {isSearchingUsers ? (
              <ActivityIndicator color="#6C63FF" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item._id}
                renderItem={renderUserSearchResult}
                ListEmptyComponent={
                  <Text style={styles.emptySearchText}>No users found for "{searchQuery}"</Text>
                }
              />
            )}
          </View>
        )}

        {/* Stories & Filter (Hidden when searching) */}
        {!isSearching && (
          <StoriesSection navigation={navigation} />
        )}
      </View>

      {/* FEED POSTS */}
      {loading && !refreshing ? (
        <ActivityIndicator style={{marginTop: 50}} size="large" color="#6C63FF" />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <PostCard 
              post={item} 
              onRefresh={onRefresh}
              navigation={navigation}
            />
          )}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          contentContainerStyle={{ paddingBottom: 60 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No posts available.</Text>
              <Text style={styles.emptySubText}>Check back later for updates!</Text>
            </View>
          }
        />
        
        
      )}
      <FloatingMenu navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingTop: Platform.OS === 'android' ? 7 : 7,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: 60,
  },
  logoText: { fontSize: 28, fontWeight: '900', color: '#000000', letterSpacing: -1.5 },
  topIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 18, padding: 4 },
  
  // Search UI
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#000', fontWeight: '500' },
  cancelBtn: { marginLeft: 15 },
  cancelText: { color: '#6C63FF', fontSize: 16, fontWeight: '600' },

  // Search Results Overlay
  searchOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    maxHeight: '80%',
    zIndex: 999,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
  },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  userInfo: { flex: 1, marginLeft: 15 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  userSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  emptySearchText: { textAlign: 'center', marginTop: 30, color: '#999' },

  badgeContainer: { position: 'relative' },
  redBadge: {
    position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FF3B30', borderWidth: 1.5, borderColor: '#FFF',
  },
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { color: '#999', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubText: { color: '#BBB', fontSize: 14, marginTop: 8, textAlign: 'center' },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
});