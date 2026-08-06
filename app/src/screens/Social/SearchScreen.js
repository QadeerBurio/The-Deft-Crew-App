// SearchScreen.js - Modern Design with Enhanced Animations
import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Keyboard,
  StatusBar,
  Alert,
  BackHandler,
  Platform
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { useNavigation, useFocusEffect, CommonActions, useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';

// Enhanced Color Palette
const COLORS = {
  primary: '#f9c349',
  primaryDark: '#e6b800',
  primaryLight: '#fdebb3',
  primaryGradient: ['#f9c349', '#f5b81b'],
  white: '#ffffff',
  black: '#1a1a1a',
  gray: '#666666',
  grayLight: '#999999',
  grayLighter: '#f0f0f0',
  lightGray: '#f8f9fa',
  border: '#f0f0f0',
  danger: '#ff4757',
  success: '#2ed573',
  shadow: 'rgba(0,0,0,0.08)',
};

const RECENT_SEARCHES_KEY = '@recent_people';

// Animated User Result Item
const UserResultItem = React.memo(({ item, isGuest, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress(item._id);
  };

  return (
    <Animated.View 
      style={[
        styles.userResultWrapper,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: translateY }
          ]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.userResultItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#ffffff', '#fafafa']}
          style={styles.userResultGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Avatar with Ring */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              {item.profileImage ? (
                <Image source={{ uri: item.profileImage }} style={styles.avatarImg} />
              ) : (
                <LinearGradient
                  colors={COLORS.primaryGradient}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
                </LinearGradient>
              )}
            </View>
            {item.isOnline && (
              <View style={styles.onlineIndicator} />
            )}
          </View>

          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                </View>
              )}
            </View>
            <Text style={styles.userSubtitle} numberOfLines={1}>
              {item.headline || item.university?.name || "TDC Member"}
            </Text>
            <View style={styles.userMeta}>
              {item.followers > 0 && (
                <View style={styles.metaItem}>
                  <Feather name="users" size={12} color={COLORS.grayLight} />
                  <Text style={styles.userFollowersText}>{item.followers} followers</Text>
                </View>
              )}
              {item.mutualFriends > 0 && (
                <View style={styles.metaItem}>
                  <Feather name="user-plus" size={12} color={COLORS.grayLight} />
                  <Text style={styles.userFollowersText}>{item.mutualFriends} mutual</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.userAction}>
            <LinearGradient
              colors={COLORS.primaryGradient}
              style={styles.actionButton}
            >
              <Ionicons 
                name={isGuest ? "lock-closed" : "chevron-forward"} 
                size={18} 
                color={COLORS.white} 
              />
            </LinearGradient>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Recent People Item with Swipe Animation
const RecentPeopleItem = React.memo(({ item, onPress, onRemove }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress(item.userId);
  };

  return (
    <Animated.View 
      style={[
        styles.recentUserItemWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.recentUserItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.recentAvatarContainer}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.recentUserAvatar} />
          ) : (
            <LinearGradient
              colors={COLORS.primaryGradient}
              style={styles.recentUserAvatarPlaceholder}
            >
              <Text style={styles.recentUserAvatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.recentUserInfo}>
          <Text style={styles.recentUserName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.recentUserSubtitle} numberOfLines={1}>
            {item.headline || item.university?.name || "TDC Member"}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.recentActionButton}
          onPress={() => onRemove?.(item.userId)}
        >
          <Ionicons name="chevron-forward" size={16} color={COLORS.grayLight} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function SearchScreen({ navigation }) {
  const { user, isGuest, token } = useContext(AuthContext);
  const isFocused = useIsFocused();
  
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [recentPeople, setRecentPeople] = useState([]);
  const [isFocusedInput, setIsFocusedInput] = useState(false);
  const [showRecentPeople, setShowRecentPeople] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  
  // Refs
  const searchInputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;
  const searchBarWidth = useRef(new Animated.Value(width)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Load recent people on mount
  useEffect(() => {
    loadRecentPeople();
    loadSearchHistory();
  }, []);

  // Entrance Animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(headerScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Auto-focus after animation
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 400);

    // Shimmer animation for loading states
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isNavigating) {
        handleBackPress();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isNavigating]);

  // Save state on focus/unfocus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Cleanup
      };
    }, [])
  );

  // Handle back press with enhanced UX
  const handleBackPress = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
    
    if (searchQuery.length > 0) {
      // Animate clear
      Animated.spring(searchBarWidth, {
        toValue: width,
        friction: 8,
        useNativeDriver: false,
      }).start();
      
      setSearchQuery("");
      setSearchResults([]);
      setShowRecentPeople(true);
      setIsSearching(false);
      Keyboard.dismiss();
      setIsNavigating(false);
      return;
    }
    
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    }
    setTimeout(() => setIsNavigating(false), 500);
  };

  // Load data from storage
  const loadRecentPeople = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setRecentPeople(data || []);
      }
    } catch (error) {
      console.error("Error loading recent people:", error);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem('@search_history');
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading search history:", error);
    }
  };

  const saveRecentPeople = async (people) => {
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(people));
    } catch (error) {
      console.error("Error saving recent people:", error);
    }
  };

  const saveSearchHistory = async (query) => {
    try {
      const updated = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10);
      setSearchHistory(updated);
      await AsyncStorage.setItem('@search_history', JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  };

  // Guest alert with enhanced design
  const showGuestAlert = (action) => {
    Alert.alert(
      '✨ Join TDC Community',
      `Sign up to ${action} and connect with amazing people!`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        { 
          text: 'Get Started', 
          style: 'default',
          onPress: () => navigation.navigate('Login')
        }
      ]
    );
  };

  // Search users with enhanced error handling
  const searchUsers = async (query, page = 1, loadMore = false) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    if (!loadMore) {
      setIsSearching(true);
    } else {
      setSearchLoadingMore(true);
    }
    
    try {
      const headers = (!isGuest && token) ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(
        `${API_URL}/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`,
        { headers }
      );
      
      const newUsers = res.data.users || res.data;
      const moreAvailable = res.data.hasMore !== undefined ? res.data.hasMore : newUsers.length === 20;
      
      if (loadMore) {
        setSearchResults(prev => [...prev, ...newUsers]);
        setHasMoreSearch(moreAvailable);
      } else {
        setSearchResults(newUsers);
        setHasMoreSearch(moreAvailable);
        if (newUsers.length > 0) {
          saveSearchHistory(query);
        }
      }
    } catch (err) {
      console.error("Search Error:", err);
      if (!loadMore) {
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
      setSearchLoadingMore(false);
    }
  };

  // Add to recent people with deduplication
  const addToRecentPeople = (userData) => {
    if (isGuest) return;
    
    setRecentPeople(prev => {
      const filtered = prev.filter(item => item.userId !== userData._id);
      const newPeople = [{
        userId: userData._id,
        name: userData.name,
        profileImage: userData.profileImage,
        headline: userData.headline,
        university: userData.university,
        timestamp: Date.now()
      }, ...filtered].slice(0, 10);
      saveRecentPeople(newPeople);
      return newPeople;
    });
  };

  // Handle search with debounce and haptic feedback
  const handleSearchTextChange = (text) => {
    setSearchQuery(text);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
    
    if (text.trim().length > 1) {
      const timeout = setTimeout(() => {
        setSearchPage(1);
        searchUsers(text, 1, false);
        setShowRecentPeople(false);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
      setHasMoreSearch(true);
      setShowRecentPeople(true);
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length > 1) {
      Keyboard.dismiss();
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
      setSearchPage(1);
      searchUsers(searchQuery, 1, false);
      setShowRecentPeople(false);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const loadMoreSearchResults = () => {
    if (!hasMoreSearch || searchLoadingMore || isSearching) return;
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);
    searchUsers(searchQuery, nextPage, true);
  };

  // User press handler with haptic feedback
  const handleUserPress = (userId) => {
    if (isGuest) {
      showGuestAlert('view user profiles');
      return;
    }
    if (isNavigating) return;
    setIsNavigating(true);
    
    const userToAdd = searchResults.find(u => u._id === userId);
    if (userToAdd) {
      addToRecentPeople(userToAdd);
    }
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    navigation.navigate("UserProfile", { userId });
    setTimeout(() => setIsNavigating(false), 500);
  };

  const handleRecentPersonPress = (userId) => {
    if (isGuest) {
      showGuestAlert('view user profiles');
      return;
    }
    if (isNavigating) return;
    setIsNavigating(true);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    navigation.navigate("UserProfile", { userId });
    setTimeout(() => setIsNavigating(false), 500);
  };

  const removeRecentPerson = (userId) => {
    const updated = recentPeople.filter(item => item.userId !== userId);
    setRecentPeople(updated);
    saveRecentPeople(updated);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const clearRecentPeople = () => {
    Alert.alert(
      'Clear Recent People',
      'Are you sure you want to clear all recent people?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive', 
          onPress: () => {
            setRecentPeople([]);
            saveRecentPeople([]);
            setShowRecentPeople(true);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
          }
        }
      ]
    );
  };

  const clearSearch = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
    setSearchQuery("");
    setSearchResults([]);
    setHasMoreSearch(true);
    setShowRecentPeople(true);
    setIsSearching(false);
    Keyboard.dismiss();
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const renderSearchFooter = () => {
    if (searchLoadingMore) {
      return (
        <View style={styles.searchFooterLoader}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.searchFooterText}>Loading more...</Text>
        </View>
      );
    }
    if (!hasMoreSearch && searchResults.length > 0) {
      return (
        <View style={styles.searchFooterEnd}>
          <View style={styles.footerDivider} />
          <Text style={styles.searchFooterEndText}>✨ All users loaded</Text>
          <View style={styles.footerDivider} />
        </View>
      );
    }
    return null;
  };

  const renderSearchEmpty = () => (
    <Animated.View style={[styles.searchEmptyContainer, { opacity: fadeAnim }]}>
      <View style={styles.searchEmptyIconWrapper}>
        <LinearGradient
          colors={['rgba(249,195,73,0.1)', 'rgba(249,195,73,0.05)']}
          style={styles.searchEmptyIconGradient}
        >
          <MaterialCommunityIcons name="account-search-outline" size={60} color={COLORS.primary} />
        </LinearGradient>
      </View>
      <Text style={styles.searchEmptyText}>No users found</Text>
      <Text style={styles.searchEmptySubText}>Try a different search term</Text>
      {searchHistory.length > 0 && (
        <View style={styles.searchHistoryContainer}>
          <Text style={styles.searchHistoryTitle}>Recent Searches</Text>
          <View style={styles.searchHistoryChips}>
            {searchHistory.slice(0, 5).map((query, index) => (
              <TouchableOpacity
                key={index}
                style={styles.searchHistoryChip}
                onPress={() => {
                  setSearchQuery(query);
                  searchUsers(query, 1, false);
                  setShowRecentPeople(false);
                }}
              >
                <Ionicons name="time-outline" size={14} color={COLORS.gray} />
                <Text style={styles.searchHistoryChipText}>{query}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );

  const renderRecentPeople = () => (
    <Animated.View style={[styles.recentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.recentHeader}>
        <View style={styles.recentHeaderLeft}>
          <View style={styles.recentHeaderIcon}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.recentTitle}>Recent People</Text>
          {recentPeople.length > 0 && (
            <View style={styles.recentCountBadge}>
              <Text style={styles.recentCountText}>{recentPeople.length}</Text>
            </View>
          )}
        </View>
        {recentPeople.length > 0 && (
          <TouchableOpacity onPress={clearRecentPeople} activeOpacity={0.7}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {recentPeople.length > 0 && (
        <View style={styles.recentPeopleSection}>
          {recentPeople.map((item, index) => (
            <RecentPeopleItem 
              key={item.userId || index}
              item={item}
              onPress={handleRecentPersonPress}
              onRemove={removeRecentPerson}
            />
          ))}
        </View>
      )}

      {recentPeople.length === 0 && (
        <View style={styles.emptyRecentContainer}>
          <View style={styles.emptyRecentIconWrapper}>
            <LinearGradient
              colors={['rgba(249,195,73,0.1)', 'rgba(249,195,73,0.05)']}
              style={styles.emptyRecentIconGradient}
            >
              <Ionicons name="people-outline" size={40} color={COLORS.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.emptyRecentText}>No recent people</Text>
          <Text style={styles.emptyRecentSubText}>People you view will appear here</Text>
        </View>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Search Header */}
      <Animated.View style={[styles.searchHeader, { transform: [{ scale: headerScale }] }]}>
        <TouchableOpacity 
          onPress={handleBackPress} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        
        <Animated.View style={[styles.searchInputWrapper, isFocusedInput && styles.searchInputFocused]}>
          <Ionicons name="search" size={20} color={isFocusedInput ? COLORS.primary : COLORS.grayLight} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search people..."
            placeholderTextColor={COLORS.grayLight}
            value={searchQuery}
            onChangeText={handleSearchTextChange}
            returnKeyType="search"
            autoCapitalize="none"
            onFocus={() => {
              setIsFocusedInput(true);
              if (searchQuery.length === 0) {
                setShowRecentPeople(true);
              }
            }}
            onBlur={() => setIsFocusedInput(false)}
            onSubmitEditing={handleSearchSubmit}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={COLORS.grayLight} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>

      {/* Results Header */}
      {searchQuery.length > 0 && searchResults.length > 0 && (
        <Animated.View style={[styles.resultsHeader, { opacity: fadeAnim }]}>
          <View style={styles.resultsHeaderContent}>
            <LinearGradient
              colors={COLORS.primaryGradient}
              style={styles.resultsHeaderIcon}
            >
              <Ionicons name="people" size={14} color={COLORS.white} />
            </LinearGradient>
            <Text style={styles.resultsTitle}>Search Results</Text>
          </View>
          <View style={styles.resultsBadge}>
            <Text style={styles.resultsBadgeText}>
              {searchResults.length}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Content */}
      {searchQuery.length === 0 && showRecentPeople ? (
        renderRecentPeople()
      ) : isSearching && searchResults.length === 0 ? (
        <View style={styles.searchLoadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.searchLoadingText}>Searching users...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <UserResultItem 
              item={item} 
              isGuest={isGuest} 
              onPress={handleUserPress}
              index={index}
            />
          )}
          ListEmptyComponent={renderSearchEmpty}
          ListFooterComponent={renderSearchFooter}
          onEndReached={loadMoreSearchResults}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.searchListContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  
  // Search Header
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 10,
    transition: 'all 0.3s ease',
  },
  searchInputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
    height: 48,
    paddingVertical: 0,
  },
  
  // Results Header
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultsHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.black,
  },
  resultsBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  
  // Recent People
  recentContainer: {
    padding: 20,
    flex: 1,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(249,195,73,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
  },
  recentCountBadge: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray,
  },
  clearText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '600',
  },
  
  // Recent People Section
  recentPeopleSection: {
    marginBottom: 16,
  },
  recentUserItemWrapper: {
    marginBottom: 2,
  },
  recentUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentAvatarContainer: {
    position: 'relative',
  },
  recentUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  recentUserAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentUserAvatarText: {
    color: COLORS.black,
    fontWeight: '700',
    fontSize: 18,
  },
  recentUserInfo: {
    flex: 1,
    marginLeft: 14,
  },
  recentUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
  },
  recentUserSubtitle: {
    fontSize: 12,
    color: COLORS.grayLight,
    marginTop: 2,
  },
  recentActionButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Empty Recent
  emptyRecentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    width: '100%',
  },
  emptyRecentIconWrapper: {
    marginBottom: 16,
  },
  emptyRecentIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  emptyRecentText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    marginTop: 4,
  },
  emptyRecentSubText: {
    fontSize: 13,
    color: COLORS.grayLight,
    marginTop: 4,
    fontWeight: '400',
  },
  
  // User Result
  userResultWrapper: {
    marginBottom: 8,
  },
  userResultItem: {
    marginBottom: 4,
  },
  userResultGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.black,
    fontWeight: '800',
    fontSize: 22,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  userSubtitle: {
    fontSize: 12,
    color: COLORS.grayLight,
    marginTop: 2,
    fontWeight: '500',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userFollowersText: {
    fontSize: 11,
    color: COLORS.grayLight,
    fontWeight: '400',
  },
  userAction: {
    marginLeft: 8,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Search List
  searchListContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  
  // Search Empty
  searchEmptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  searchEmptyIconWrapper: {
    marginBottom: 16,
  },
  searchEmptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchEmptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    marginTop: 4,
  },
  searchEmptySubText: {
    fontSize: 14,
    color: COLORS.grayLight,
    marginTop: 4,
    fontWeight: '500',
  },
  searchHistoryContainer: {
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 20,
  },
  searchHistoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 12,
  },
  searchHistoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  searchHistoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchHistoryChipText: {
    fontSize: 13,
    color: COLORS.black,
    fontWeight: '500',
  },
  
  // Search Loading
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  searchLoadingText: {
    marginTop: 12,
    color: COLORS.grayLight,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Search Footer
  searchFooterLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  searchFooterText: {
    color: COLORS.grayLight,
    fontSize: 12,
    fontWeight: '500',
  },
  searchFooterEnd: {
    paddingVertical: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  searchFooterEndText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  footerDivider: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.border,
  },
});