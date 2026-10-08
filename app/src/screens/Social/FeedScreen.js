// FeedScreen.js - Complete with back icon on header left, tdc logo centered

import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from "react";
import {
  View, Text, StyleSheet, StatusBar,
  FlatList, TouchableOpacity, Platform, TextInput,
  LayoutAnimation, ActivityIndicator, RefreshControl, Keyboard,
  Image, Animated, Dimensions, Alert, AppState
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useOpenFromParams } from '../../engagement/hooks/useOpenFromParams';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills (design system)
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import EmptyState from "../../ui/EmptyState";
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import PostCard, { PostCardSkeleton } from "./PostCard";
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

  const handleBackPress = () => {
    navigation.goBack();
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
        <Ionicons name={isGuest ? "lock-closed" : "chevron-forward"} size={16} color={T.textFaint} />
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={styles.footerEnd}><Text style={styles.footerEndText}>{"you're all caught up"}<Text style={{ color: T.yellow }}>.</Text></Text></View>;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={T.ink} />
        <Text style={styles.loadingText}>loading more…</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      mood="sleepy"
      title="no posts yet"
      line="check back later, or be the first to post."
      actionLabel="refresh feed"
      onAction={onRefresh}
      style={styles.emptyContainer}
    />
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
              tintColor={T.ink}
              colors={[T.ink]}
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

  // Daily Drop / push → navigate('FeedScreen', { tab: 'Confession' })
  useOpenFromParams('tab', (tab) => {
    if (tab === 'Confession' || tab === 'Feed') setActiveTab(tab);
    return true;
  });
  // Exact confession from the Daily Drop → open Confession tab and pin it
  const [focusConfessionId, setFocusConfessionId] = useState(null);
  useOpenFromParams('postId', (id) => {
    setActiveTab('Confession');
    setFocusConfessionId(String(id));
    return true;
  });

  // Confessions tab is dark (Confessions design) → header follows
  const dark = activeTab === "Confession";

  return (
    <SafeAreaView style={[styles.container, dark && styles.containerDark]} edges={['top']}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={dark ? T.ink : T.paper} />

      {/* Guest Banner */}
      {isGuest && (
        <View style={styles.guestBanner}>
          <Ionicons name="information-circle-outline" size={18} color={T.ink} />
          <Text style={styles.guestBannerText}>
            browsing as guest
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="sign in"
          >
            <Text style={styles.signInText}>sign in</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* HEADER */}
      <View style={[styles.header, dark && styles.headerDark]}>
        <View style={styles.topBar}>
          {!isSearching ? (
            <>
              {/* Back Icon - Left Side */}
              <TouchableOpacity
                style={[styles.backButton, dark && styles.iconBtnDark]} 
                onPress={handleBackPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="back to home"
              >
                <Ionicons name="chevron-back" size={19} color={dark ? T.white : T.ink} />
              </TouchableOpacity>

              {/* Title */}
              <Animated.View style={[styles.centerLogoContainer, { transform: [{ scale: headerScale }] }]}>
                <Text style={[styles.logoText, dark && { color: T.white }]} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  social<Text style={{ color: T.yellow }}>.</Text>
                </Text>
              </Animated.View>

              {/* Notification Icon - Right Side */}
              <View style={styles.topIcons}>
                <TouchableOpacity
                  style={[styles.iconBtn, dark && styles.iconBtnDark]}
                  onPress={handleNotifications}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={!isGuest && unreadCount > 0 ? "notifications, new" : "notifications"}
                >
                  <View style={styles.badgeContainer}>
                    <Ionicons name="notifications-outline" size={19} color={dark ? T.white : T.ink} />
                    {!isGuest && unreadCount > 0 && <View style={styles.redBadge} />}
                  </View>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search-outline" size={18} color={T.textFaint} style={{marginRight: 8}} />
                <TextInput
                  ref={searchInputRef}
                  autoFocus
                  style={styles.searchInput}
                  placeholder="search people"
                  placeholderTextColor={T.textFaint}
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
                    <Ionicons name="close-circle" size={18} color={T.textFaint} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={toggleSearch} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Feed / confessions segmented tabs */}
        <View style={styles.tabsContainer}>
          <View style={[styles.tabsTrack, dark && styles.tabsTrackDark]}>
            {[["Feed", "feed"], ["Confession", "confessions"]].map(([key, label]) => {
              const on = activeTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.tab, on && (dark ? styles.activeTabDark : styles.activeTab)]}
                  onPress={() => handleTabSwitch(key)}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={label}
                >
                  <Text
                    style={[
                      styles.tabText,
                      dark && styles.tabTextDark,
                      on && (dark ? styles.activeTabTextDark : styles.activeTabText),
                    ]}
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Content based on active tab */}
      <View style={styles.contentContainer}>
        {activeTab === "Feed" ? (
          <View style={{ flex: 1 }}>
            {renderFeed()}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <ConfessionScreen navigation={navigation} focusPostId={focusConfessionId} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  contentContainer: { flex: 1, backgroundColor: T.paper },

  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.yellowSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  guestBannerText: { flex: 1, fontFamily: F.bodyMedium, fontSize: 13, color: T.ink },
  signInButton: { backgroundColor: T.ink, height: 32, paddingHorizontal: 14, borderRadius: 16, justifyContent: 'center' },
  signInText: { fontFamily: F.bodyBold, fontSize: 12.5, color: T.white },

  skeletonContainer: { paddingTop: 8 },

  header: { backgroundColor: T.paper, zIndex: 10 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 56,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLogoContainer: { flex: 1 },
  logoText: { fontFamily: F.heading, fontSize: 28, letterSpacing: -0.8, color: T.ink },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: T.line,
  },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 15, color: T.ink },
  cancelBtn: { marginLeft: 12, minHeight: 44, justifyContent: 'center' },
  cancelText: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },

  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.lineSoft,
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.yellowSoft,
  },
  avatarText: { fontFamily: F.heading, fontSize: 17, color: T.ink },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  userSubtitle: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  userArrow: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },

  badgeContainer: { position: 'relative' },
  redBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: T.yellow,
    borderWidth: 2,
    borderColor: T.white,
  },

  emptyContainer: { marginTop: 40 },

  footerLoader: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  loadingText: { fontFamily: F.body, fontSize: 13, color: T.textMuted },
  footerEnd: { paddingVertical: 24, alignItems: 'center' },
  footerEndText: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.textMuted },

  tabsContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  tabsTrack: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 24, backgroundColor: T.lineSoft },
  tab: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  activeTab: { backgroundColor: T.ink },
  tabText: { fontFamily: F.bodySemi, fontSize: 14, color: T.ink },
  activeTabText: { fontFamily: F.bodyBold, color: T.white },

  // Confessions tab (dark)
  containerDark: { backgroundColor: T.ink },
  headerDark: { backgroundColor: T.ink },
  iconBtnDark: { backgroundColor: T.inkSoft, borderColor: T.inkSoft },
  tabsTrackDark: { backgroundColor: T.inkSoft },
  activeTabDark: { backgroundColor: T.yellow },
  tabTextDark: { color: T.onInkMuted },
  activeTabTextDark: { fontFamily: F.heading, color: T.ink },
});
