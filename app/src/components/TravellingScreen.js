import React, { useState, useMemo, useEffect, useContext, useCallback, useRef, memo } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  TextInput, ImageBackground, Dimensions, StatusBar, FlatList,
  Modal, Alert, BackHandler, Animated,
  ScrollView,
  InteractionManager,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, Feather, Fontisto, Entypo, AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TravelChatBot from './TravelChatBot';

const { width, height } = Dimensions.get('window');

const API_URL = 'https://the-deft-crew-production.up.railway.app/api/auth/packages/public';

// ==========================================
// ULTRA-FAST CACHE SYSTEM
// ==========================================
const CACHE_DURATION = 2 * 60 * 1000;
let memoryCache = null;
let cacheTimestamp = 0;
let pendingFetchPromise = null;
const FETCH_DEBOUNCE = 10000;
let lastFetchTime = 0;

const preloadedImages = new Set();
const MAX_PRELOAD = 10;

const preloadImage = (url) => {
  if (!url || preloadedImages.has(url) || preloadedImages.size >= MAX_PRELOAD) return;
  preloadedImages.add(url);
  Image.prefetch(url).catch(() => {});
};

// ==========================================
// CATEGORIES WITH SIMPLE TEXT ONLY
// ==========================================
const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'international-tours', name: 'Tours' },
  { id: 'flights', name: 'Flights' },
  { id: 'hotels', name: 'Hotels' },
  { id: 'visa-services', name: 'Visa' },
  { id: 'study-abroad', name: 'Study' },
  { id: 'travel-insurance', name: 'Insurance' },
  { id: 'transport-services', name: 'Transport' },
  { id: 'adventure-tourism', name: 'Adventure' },
  { id: 'honeymoon-packages', name: 'Honeymoon' },
  { id: 'family-tours', name: 'Family' },
  { id: 'group-tours', name: 'Group' },
  { id: 'corporate-travel', name: 'Corporate' },
  { id: 'cruise-tours', name: 'Cruise' },
  { id: 'events-conferences', name: 'Events' },
  { id: 'student-tours', name: 'Student' },
  { id: 'luxury-travel', name: 'Luxury' },
];

const ITEMS_PER_PAGE = 10;

// ==========================================
// MODERN CATEGORY CARD (Text Only)
// ==========================================
const CategoryCard = memo(({ category, isActive, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 50;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(category.name);
  }, [category.name, onPress]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[
      styles.categoryWrapper,
      { opacity: fadeAnim }
    ]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[
          styles.categoryCard,
          isActive && styles.categoryCardActive,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          <Text style={[
            styles.categoryName,
            isActive && styles.categoryNameActive
          ]}>
            {category.name}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ==========================================
// MODERN PACKAGE CARD
// ==========================================
const PackageCard = memo(({ item, index, onPress, isGuest }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const delay = Math.min(index * 50, 200);

    InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          delay,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  useEffect(() => {
    if (item.image) preloadImage(item.image);
  }, [item.image]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(item);
  }, [item, onPress]);

  return (
    <Animated.View style={[
      styles.packageCard,
      {
        opacity: fadeAnim,
        transform: [
          { scale: scaleAnim },
          { translateY: translateYAnim }
        ]
      }
    ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Image
          source={{ uri: item.image || 'https://via.placeholder.com/300x200' }}
          style={styles.packageImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.packageGradient}
        />
        <View style={styles.packageBadge}>
          <Text style={styles.packageBadgeText}>{item.category || 'Package'}</Text>
        </View>
        <View style={styles.packageInfo}>
          <Text style={styles.packageName} numberOfLines={1}>{item.name || 'Package'}</Text>
          <View style={styles.packageLocation}>
            <Ionicons name="location" size={12} color="#f9c349" />
            <Text style={styles.packageLocationText} numberOfLines={1}>
              {item.location || 'Pakistan'}
            </Text>
          </View>
          <View style={styles.packageFooter}>
            <Text style={styles.packagePrice}>{item.price || 'PKR 0'}</Text>
            <View style={styles.packageRating}>
              <FontAwesome5 name="star" size={10} color="#f9c349" solid />
              <Text style={styles.packageRatingText}>4.8</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return prevProps.item._id === nextProps.item._id &&
    prevProps.index === nextProps.index;
});

// ==========================================
// PAGINATION CONTROLS
// ==========================================
const PaginationControls = memo(({ currentPage, totalPages, onPageChange }) => {
  const [visiblePages, setVisiblePages] = useState([]);

  useMemo(() => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    setVisiblePages(pages);
  }, [currentPage, totalPages]);

  const handlePrev = useCallback(() => {
    if (currentPage > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handlePagePress = useCallback((page) => {
    if (page !== '...' && page !== currentPage) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPageChange(page);
    }
  }, [currentPage, onPageChange]);

  if (totalPages <= 1) return null;

  return (
    <View style={styles.paginationContainer}>
      <TouchableOpacity
        style={[styles.paginationButton, currentPage === 1 && styles.paginationDisabled]}
        onPress={handlePrev}
        disabled={currentPage === 1}
      >
        <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#CCC' : '#333'} />
      </TouchableOpacity>

      {visiblePages.map((page, index) => {
        if (page === '...') {
          return (
            <View key={`ellipsis-${index}`} style={styles.paginationEllipsis}>
              <Text style={styles.ellipsisText}>…</Text>
            </View>
          );
        }

        const isActive = page === currentPage;
        return (
          <TouchableOpacity
            key={`page-${page}`}
            onPress={() => handlePagePress(page)}
            style={[
              styles.paginationPage,
              isActive && styles.paginationPageActive
            ]}
          >
            <Text style={[
              styles.paginationPageText,
              isActive && styles.paginationPageTextActive
            ]}>
              {page}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.paginationButton, currentPage === totalPages && styles.paginationDisabled]}
        onPress={handleNext}
        disabled={currentPage === totalPages}
      >
        <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#CCC' : '#333'} />
      </TouchableOpacity>
    </View>
  );
});

// ==========================================
// LOAD MORE INDICATOR
// ==========================================
const LoadMoreIndicator = memo(({ isLoading, onLoadMore, hasMore }) => {
  if (!hasMore) return null;

  return (
    <TouchableOpacity
      onPress={onLoadMore}
      disabled={isLoading}
      style={styles.loadMoreButton}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#f9c349" />
      ) : (
        <>
          <Feather name="plus-circle" size={18} color="#f9c349" />
          <Text style={styles.loadMoreText}>Load More</Text>
        </>
      )}
    </TouchableOpacity>
  );
});

// ==========================================
// MAIN SCREEN
// ==========================================
const TravelingScreen = () => {
  const { token, isGuest } = useContext(AuthContext);
  const navigation = useNavigation();

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const isMounted = useRef(true);
  const hasInitialFetch = useRef(false);
  const packagesScrollRef = useRef(null);

  const showGuestAlert = (action) => {
    Alert.alert(
      'Create an Account',
      `Sign up to ${action} and explore amazing travel packages!`,
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Sign Up', onPress: () => navigation.navigate('Login') }
      ]
    );
  };

  // ==========================================
  // FETCH PACKAGES
  // ==========================================
  const fetchPackages = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    if (!forceRefresh && memoryCache && (now - cacheTimestamp) < CACHE_DURATION) {
      if (isMounted.current) {
        setPackages(memoryCache);
        setLoading(false);
        setCurrentPage(1);
        setVisibleCount(ITEMS_PER_PAGE);
      }
      return;
    }

    if (pendingFetchPromise) {
      const result = await pendingFetchPromise;
      if (isMounted.current && result) {
        setPackages(result);
        setLoading(false);
        setCurrentPage(1);
        setVisibleCount(ITEMS_PER_PAGE);
      }
      return;
    }

    if (!forceRefresh && (now - lastFetchTime) < FETCH_DEBOUNCE) return;
    lastFetchTime = now;

    if (isMounted.current && packages.length === 0) setLoading(true);

    pendingFetchPromise = (async () => {
      try {
        const response = await axios.get(API_URL, { timeout: 8000 });
        const data = response.data || [];

        if (isMounted.current) {
          setPackages(data);
          memoryCache = data;
          cacheTimestamp = Date.now();
          setCurrentPage(1);
          setVisibleCount(ITEMS_PER_PAGE);
          setTimeout(() => {
            if (isMounted.current) setLoading(false);
          }, 150);
        }

        pendingFetchPromise = null;
        return data;
      } catch (error) {
        console.error("Fetch Error:", error.message);
        if (isMounted.current) {
          if (memoryCache) {
            setPackages(memoryCache);
            setCurrentPage(1);
            setVisibleCount(ITEMS_PER_PAGE);
          }
          setLoading(false);
          if (!memoryCache) {
            Alert.alert("Connection Error", "Could not fetch packages. Please try again.");
          }
        }
        pendingFetchPromise = null;
        return memoryCache || [];
      }
    })();

    return pendingFetchPromise;
  }, [packages.length]);

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    isMounted.current = true;
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true;
      fetchPackages();
    }
    return () => { isMounted.current = false; };
  }, [fetchPackages]);

  // ==========================================
  // HANDLE REFRESH
  // ==========================================
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPackages(true).finally(() => {
      if (isMounted.current) setRefreshing(false);
    });
  }, [fetchPackages]);

  // ==========================================
  // HANDLE PAGE CHANGE
  // ==========================================
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    setVisibleCount(ITEMS_PER_PAGE);
    if (packagesScrollRef.current) {
      packagesScrollRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  // ==========================================
  // HANDLE LOAD MORE
  // ==========================================
  const handleLoadMore = useCallback(() => {
    const totalItems = filteredData.length;
    const currentItems = paginatedData.length;

    if (currentItems < totalItems && !isLoadingMore) {
      setIsLoadingMore(true);
      setTimeout(() => {
        if (isMounted.current) {
          const nextCount = Math.min(visibleCount + ITEMS_PER_PAGE, totalItems);
          setVisibleCount(nextCount);
          setIsLoadingMore(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 600);
    }
  }, [filteredData, paginatedData, isLoadingMore, visibleCount]);

  // ==========================================
  // MODAL HANDLERS
  // ==========================================
  const openModal = useCallback((item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPackage(item);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedPackage(null);
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (modalVisible) {
        closeModal();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [modalVisible, closeModal]);

  // ==========================================
  // HANDLE CATEGORY PRESS
  // ==========================================
  const handleCategoryPress = useCallback((categoryName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(categoryName);
    setCurrentPage(1);
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

  // ==========================================
  // HANDLE BOOK NOW
  // ==========================================
  const handleBookNow = useCallback((item) => {
    if (isGuest) {
      closeModal();
      setTimeout(() => showGuestAlert('book travel packages'), 300);
      return;
    }
    closeModal();
    setTimeout(() => navigation.navigate('Booking', { item }), 300);
  }, [isGuest, closeModal, navigation]);

  // ==========================================
  // FILTER AND PAGINATE DATA
  // ==========================================
  const { filteredData, paginatedData, totalPages, hasMore } = useMemo(() => {
    let list = packages;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        item.name?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== 'All') {
      list = list.filter(item => item.category === activeCategory);
    }

    const total = Math.ceil(list.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = Math.min(start + visibleCount, list.length);
    const paginated = list.slice(start, end);

    return {
      filteredData: list,
      paginatedData: paginated,
      totalPages: total,
      hasMore: end < list.length
    };
  }, [searchQuery, activeCategory, packages, currentPage, visibleCount]);

  useEffect(() => {
    setCurrentPage(1);
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, activeCategory]);

  // ==========================================
  // RENDER CATEGORIES
  // ==========================================
  const renderCategories = useCallback(() => {
    const displayCategories = showAllCategories ? CATEGORIES : CATEGORIES.slice(0, 8);

    return (
      <View style={styles.categoriesWrapper}>
        <View style={styles.categoriesHeader}>
          <Text style={styles.categoriesTitle}>Categories</Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAllCategories(!showAllCategories);
            }}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>
              {showAllCategories ? 'Show Less' : 'View All'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          data={displayCategories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item, index }) => (
            <CategoryCard
              category={item}
              isActive={activeCategory === item.name}
              onPress={handleCategoryPress}
              index={index}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
        />
      </View>
    );
  }, [showAllCategories, activeCategory, handleCategoryPress]);

  // ==========================================
  // RENDER PACKAGES GRID
  // ==========================================
  const renderPackagesGrid = useCallback(() => {
    if (!paginatedData || paginatedData.length === 0) return null;

    const rows = [];
    for (let i = 0; i < paginatedData.length; i += 2) {
      const row = [];
      if (paginatedData[i]) row.push(paginatedData[i]);
      if (paginatedData[i + 1]) row.push(paginatedData[i + 1]);
      rows.push(row);
    }

    return (
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {row.map((item, colIndex) => {
              const globalIndex = rowIndex * 2 + colIndex;
              return (
                <View key={item._id || `item-${globalIndex}`} style={styles.gridItem}>
                  <PackageCard
                    item={item}
                    index={globalIndex}
                    onPress={openModal}
                    isGuest={isGuest}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }, [paginatedData, openModal, isGuest]);

  // ==========================================
  // HANDLE BACK BUTTON
  // ==========================================
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Travel Packages</Text>
        <View style={styles.headerRight} />
      </View>

      {isGuest && (
        <View style={styles.guestBanner}>
          <Ionicons name="information-circle" size={18} color="#f9c349" />
          <Text style={styles.guestBannerText}>
            Browsing as guest. Sign in to book packages!
          </Text>
        </View>
      )}

      <View style={styles.container}>
        <ScrollView
          ref={packagesScrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        >
          {/* Hero Section */}
          <View style={styles.heroContainer}>
            <ImageBackground
              source={require('../../../assets/tdcaq.png')}
              style={styles.heroImage}
              imageStyle={styles.heroImageStyle}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.2)']}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <Text style={styles.heroTitle}>Find Your Next{'\n'}Adventure</Text>
                  
                  {/* Search Bar */}
                  <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                      placeholder="Search destinations..."
                      placeholderTextColor="#999"
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>

          {/* Categories */}
          {renderCategories()}

          {/* Results Header */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {activeCategory === 'All' ? 'All Packages' : activeCategory}
            </Text>
            <Text style={styles.resultsCount}>
              {filteredData?.length || 0} packages
            </Text>
          </View>

          {/* Packages Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f9c349" />
              <Text style={styles.loadingText}>Loading packages...</Text>
            </View>
          ) : (
            <>
              {paginatedData && paginatedData.length > 0 ? (
                <>
                  {renderPackagesGrid()}

                  {hasMore && (
                    <LoadMoreIndicator
                      isLoading={isLoadingMore}
                      onLoadMore={handleLoadMore}
                      hasMore={hasMore}
                    />
                  )}

                  {!hasMore && filteredData && filteredData.length > ITEMS_PER_PAGE && (
                    <View style={styles.allLoadedContainer}>
                      <Text style={styles.allLoadedText}>
                        🎉 All {filteredData.length} packages loaded
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Feather name="package" size={60} color="#CCC" />
                  <Text style={styles.emptyText}>No packages found</Text>
                  <Text style={styles.emptySubText}>Try adjusting your search or category</Text>
                  {isGuest && (
                    <TouchableOpacity
                      style={styles.signUpButton}
                      onPress={() => navigation.navigate('Login')}
                    >
                      <Text style={styles.signUpButtonText}>Sign Up to Explore</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* Package Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPackage && (
              <>
                <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                  <View style={styles.modalImageContainer}>
                    <Image
                      source={{ uri: selectedPackage.image || 'https://via.placeholder.com/400x300' }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.6)']}
                      style={styles.modalImageGradient}
                    />
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={closeModal}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.modalImageContent}>
                      <View style={styles.modalCategoryBadge}>
                        <Text style={styles.modalCategoryText}>{selectedPackage.category || 'Package'}</Text>
                      </View>
                      <Text style={styles.modalTitle}>{selectedPackage.name || 'Package'}</Text>
                      <View style={styles.modalLocation}>
                        <Ionicons name="location" size={16} color="#FFF" />
                        <Text style={styles.modalLocationText}>{selectedPackage.location || 'Pakistan'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalDetails}>
                    <View style={styles.modalPriceRow}>
                      <View>
                        <Text style={styles.priceLabel}>Price per person</Text>
                        <Text style={styles.modalPrice}>{selectedPackage.price || 'PKR 0'}</Text>
                      </View>
                      <View style={styles.modalRating}>
                        <FontAwesome5 name="star" size={12} color="#f9c349" solid />
                        <Text style={styles.modalRatingText}>4.8</Text>
                        <Text style={styles.modalRatingCount}>(128 reviews)</Text>
                      </View>
                    </View>

                    {selectedPackage.description && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>Description</Text>
                        <Text style={styles.modalDescription}>{selectedPackage.description}</Text>
                      </View>
                    )}

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Requirements</Text>
                      <View style={styles.requirementsList}>
                        <View style={styles.requirementItem}>
                          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                          <Text style={styles.requirementText}>Valid passport with 6+ months validity</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                          <Text style={styles.requirementText}>Travel insurance mandatory</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                          <Text style={styles.requirementText}>Visa requirements as per destination</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                          <Text style={styles.requirementText}>Good physical health condition</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Cancellation Policy</Text>
                      <View style={styles.policyContainer}>
                        <Text style={styles.policyText}>• Free cancellation up to 10 days before departure</Text>
                        <Text style={styles.policyText}>• 50% refund for cancellation 7-8 days before</Text>
                        <Text style={styles.policyText}>• No refund for cancellation within 6 days</Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <View style={styles.modalFooterContent}>
                    <View>
                      <Text style={styles.footerLabel}>Total Price</Text>
                      <Text style={styles.footerPrice}>{selectedPackage.price || 'PKR 0'}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.bookButton}
                      onPress={() => handleBookNow(selectedPackage)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#f9c349', '#f0b800']}
                        style={styles.bookButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.bookButtonText}>
                          {isGuest ? 'Sign Up to Book' : 'Book Now'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#1A1A2E" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      <TravelChatBot />
    </SafeAreaView>
  );
};

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F6FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  headerRight: {
    width: 40,
  },

  // Guest Banner
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f9c34930',
  },
  guestBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#1A1A2E',
    fontWeight: '500',
    marginLeft: 8,
  },

  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Hero
  heroContainer: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageStyle: {
    resizeMode: 'cover',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    marginBottom: 10,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },

  // Categories
  categoriesWrapper: {
    paddingVertical: 10,
    backgroundColor: '#F5F6FA',
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: '#f9c349',
    fontWeight: '600',
  },
  categoriesList: {
    paddingHorizontal: 20,
    paddingVertical: 2,
  },

  // Category Card (Text Only)
  categoryWrapper: {
    width: width * 0.25,
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 36,
  },
  categoryCardActive: {
    backgroundColor: '#1A1A2E',
    borderColor: '#1A1A2E',
  },
  categoryName: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryNameActive: {
    color: '#f9c349',
    fontWeight: '600',
  },

  // Results Header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#F5F6FA',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  resultsCount: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },

  // Grid
  gridContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridItem: {
    width: (width - 52) / 2,
  },

  // Package Card
  packageCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  packageImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  packageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  packageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  packageBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '600',
  },
  packageInfo: {
    padding: 10,
  },
  packageName: {
    fontWeight: '600',
    fontSize: 13,
    color: '#1A1A2E',
    marginBottom: 2,
  },
  packageLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  packageLocationText: {
    fontSize: 10,
    color: '#718096',
    marginLeft: 4,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packagePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  packageRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  packageRatingText: {
    fontSize: 10,
    marginLeft: 3,
    color: '#f9c349',
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  // Load More
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '600',
    marginLeft: 8,
  },

  allLoadedContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  allLoadedText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },

  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 2,
  },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF0',
    marginHorizontal: 4,
  },
  paginationDisabled: {
    opacity: 0.4,
  },
  paginationEllipsis: {
    width: 28,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipsisText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  paginationPage: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginHorizontal: 2,
  },
  paginationPageActive: {
    backgroundColor: '#1A1A2E',
  },
  paginationPageText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  paginationPageTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 30,
  },
  emptyText: {
    color: '#666',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    color: '#999',
    marginTop: 4,
    fontSize: 13,
  },
  signUpButton: {
    marginTop: 20,
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  signUpButtonText: {
    color: '#f9c349',
    fontWeight: '700',
    fontSize: 14,
  },

  bottomSpacer: {
    height: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalImageContainer: {
    height: height * 0.32,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalImageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContent: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
  },
  modalCategoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modalCategoryText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  modalLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLocationText: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 13,
    opacity: 0.9,
  },
  modalDetails: {
    padding: 20,
    backgroundColor: '#FFF',
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  priceLabel: {
    color: '#718096',
    fontSize: 11,
    marginBottom: 2,
    fontWeight: '500',
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  modalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalRatingText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f9c349',
    marginLeft: 4,
  },
  modalRatingCount: {
    fontSize: 10,
    color: '#718096',
    marginLeft: 4,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  modalDescription: {
    color: '#4A5568',
    lineHeight: 22,
    fontSize: 14,
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
  },
  requirementText: {
    flex: 1,
    fontSize: 12,
    color: '#2D3748',
    fontWeight: '500',
    marginLeft: 10,
  },
  policyContainer: {
    backgroundColor: '#FFF5F5',
    padding: 14,
    borderRadius: 10,
  },
  policyText: {
    fontSize: 12,
    color: '#E53E3E',
    lineHeight: 18,
    marginBottom: 2,
  },
  modalFooter: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  modalFooterContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 20,
  },
  footerLabel: {
    color: '#718096',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  bookButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bookButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#1A1A2E',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
    marginRight: 8,
  },
});

export default TravelingScreen;