import React, { useState, useMemo, useEffect, useContext, useCallback, useRef, memo } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  TextInput, ImageBackground, Dimensions, StatusBar, FlatList, 
  Modal, Alert, BackHandler, Animated,
  ScrollView,
  InteractionManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext'; 
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

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

const CATEGORIES = [
  'All', 'International Tours', 'Pakistan Tours',
  'Flights', 'Hotels', 'Visa Services', 'Study Abroad', 'Travel Insurance',
  'Transport Services', 'Adventure Tourism', 'Honeymoon Packages', 'Family Tours',
  'Group Tours', 'Corporate Travel', 'Cruise Tours', 'Events & Conferences',
  'Student Tours', 'Luxury Travel'
];

const ITEMS_PER_PAGE = 8;

const SkeletonBlock = memo(({ style }) => (
  <View style={[style, { backgroundColor: '#E8ECF1', borderRadius: 12 }]} />
));

const SkeletonCard = memo(() => (
  <View style={[styles.mainCard, { backgroundColor: '#F5F5F5' }]}>
    <View style={[styles.cardImg, { backgroundColor: '#E8ECF1' }]} />
    <View style={styles.cardInfo}>
      <SkeletonBlock style={{ width: '85%', height: 16, borderRadius: 4, marginBottom: 8 }} />
      <SkeletonBlock style={{ width: '60%', height: 12, borderRadius: 4, marginBottom: 10 }} />
      <View style={styles.cardFooter}>
        <SkeletonBlock style={{ width: 60, height: 18, borderRadius: 4 }} />
        <SkeletonBlock style={{ width: 50, height: 18, borderRadius: 6 }} />
      </View>
    </View>
  </View>
));

const AnimatedCard = memo(({ item, index, onPress, isGuest }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const delay = Math.min(index * 20, 150);
    
    const animation = InteractionManager.runAfterInteractions(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 80,
        delay,
        useNativeDriver: true,
      }).start();
    });

    return () => animation?.cancel();
  }, []);

  useEffect(() => {
    if (item.image) preloadImage(item.image);
  }, [item.image]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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
      styles.mainCard,
      { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
    ]}>
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Image 
          source={{ uri: item.image || 'https://via.placeholder.com/300' }} 
          style={styles.cardImg}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.cardGradient}
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>{item.category}</Text>
        </View>
        <TouchableOpacity style={styles.cardFavoriteBtn} activeOpacity={0.7}>
          <Ionicons name="heart-outline" size={18} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardLocRow}>
            <Ionicons name="location-sharp" size={12} color="#f9c349" />
            <Text style={styles.cardLocText} numberOfLines={1}>{item.location || 'Pakistan'}</Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>{item.price}</Text>
            <View style={styles.ratingBox}>
              <FontAwesome5 name="star" size={8} color="#f9c349" solid />
              <Text style={styles.ratingText}>4.8</Text>
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

const PaginationControls = memo(({ currentPage, totalPages, onPageChange }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [currentPage]);

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

  if (totalPages <= 1) return null;

  return (
    <Animated.View style={[styles.paginationContainer, { opacity: fadeAnim }]}>
      <TouchableOpacity 
        style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
        onPress={handlePrev}
        disabled={currentPage === 1}
        activeOpacity={0.7}
      >
        <View style={styles.paginationButtonContent}>
          <Ionicons 
            name="chevron-back" 
            size={20} 
            color={currentPage === 1 ? '#CCC' : '#1a1a1a'} 
          />
          <Text style={[
            styles.paginationButtonText,
            currentPage === 1 && styles.paginationButtonTextDisabled
          ]}>
            Previous
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.paginationInfo}>
        <Text style={styles.paginationCurrent}>{currentPage}</Text>
        <Text style={styles.paginationSeparator}>/</Text>
        <Text style={styles.paginationTotal}>{totalPages}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
        onPress={handleNext}
        disabled={currentPage === totalPages}
        activeOpacity={0.7}
      >
        <View style={styles.paginationButtonContent}>
          <Text style={[
            styles.paginationButtonText,
            currentPage === totalPages && styles.paginationButtonTextDisabled
          ]}>
            Next
          </Text>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={currentPage === totalPages ? '#CCC' : '#1a1a1a'} 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const TravelingScreen = () => {
  const { token, isGuest } = useContext(AuthContext); 
  const navigation = useNavigation();

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const categoriesAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(height)).current;
  
  const isMounted = useRef(true);
  const hasInitialFetch = useRef(false);
  const packagesScrollRef = useRef(null);

  // FIX: Show guest alert for booking
  const showGuestAlert = (action) => {
    Alert.alert(
      'Create an Account',
      `Sign up to ${action} and explore amazing travel packages!`,
      [
        { text: 'Not Now', style: 'cancel' },
        { 
          text: 'Sign Up', 
          onPress: () => navigation.navigate('Login')
        }
      ]
    );
  };

  const fetchPackages = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    if (!forceRefresh && memoryCache && (now - cacheTimestamp) < CACHE_DURATION) {
      if (isMounted.current) {
        setPackages(memoryCache);
        setLoading(false);
        setCurrentPage(1);
        InteractionManager.runAfterInteractions(() => {
          memoryCache.slice(0, 6).forEach(item => {
            if (item.image) preloadImage(item.image);
          });
        });
      }
      return;
    }

    if (pendingFetchPromise) {
      const result = await pendingFetchPromise;
      if (isMounted.current && result) {
        setPackages(result);
        setLoading(false);
        setCurrentPage(1);
      }
      return;
    }

    if (!forceRefresh && (now - lastFetchTime) < FETCH_DEBOUNCE) return;
    
    lastFetchTime = now;

    if (isMounted.current && packages.length === 0) setLoading(true);

    pendingFetchPromise = (async () => {
      try {
        // FIX: Guest users can fetch packages too (public API)
        const response = await axios.get(API_URL, {
          timeout: 8000,
        });
        
        const data = response.data || [];
        
        if (isMounted.current) {
          setPackages(data);
          memoryCache = data;
          cacheTimestamp = Date.now();
          setCurrentPage(1);
          
          setTimeout(() => {
            if (isMounted.current) {
              setLoading(false);
              animateContent();
            }
          }, 150);
          
          InteractionManager.runAfterInteractions(() => {
            data.slice(0, 6).forEach(item => {
              if (item.image) preloadImage(item.image);
            });
          });
        }
        
        pendingFetchPromise = null;
        return data;
      } catch (error) {
        console.error("Fetch Error:", error.message);
        
        if (isMounted.current) {
          if (memoryCache) {
            setPackages(memoryCache);
            setCurrentPage(1);
          }
          setLoading(false);
          animateContent();
          
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

  const animateContent = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(heroAnim, {
          toValue: 1,
          friction: 10,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(categoriesAnim, {
          toValue: 1,
          delay: 80,
          friction: 10,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(searchAnim, {
          toValue: 1,
          delay: 50,
          friction: 10,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(slideUpAnim, {
          toValue: 1,
          delay: 100,
          friction: 10,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, heroAnim, categoriesAnim, searchAnim, slideUpAnim]);

  // FIX: Fetch for both guests and logged-in users
  useEffect(() => {
    isMounted.current = true;
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true;
      fetchPackages();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchPackages]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPackages(true).finally(() => {
      if (isMounted.current) setRefreshing(false);
    });
  }, [fetchPackages]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    if (packagesScrollRef.current) {
      packagesScrollRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  const openModal = useCallback((item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDestination(item);
    setModalVisible(true);
    
    modalScaleAnim.setValue(0);
    modalSlideAnim.setValue(height);
    
    InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.spring(modalScaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [modalScaleAnim, modalSlideAnim]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalSlideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isMounted.current) {
        setModalVisible(false);
        setSelectedDestination(null);
      }
    });
  }, [modalScaleAnim, modalSlideAnim]);

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

  const handleCategoryPress = useCallback((category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(category);
    setCurrentPage(1);
  }, []);

  // FIX: Handle Book Now for guest users
  const handleBookNow = useCallback((item) => {
    if (isGuest) {
      closeModal();
      setTimeout(() => {
        showGuestAlert('book travel packages');
      }, 300);
      return;
    }
    
    closeModal();
    setTimeout(() => {
      navigation.navigate('Booking', { item });
    }, 300);
  }, [isGuest, closeModal, navigation]);

  const { filteredData, paginatedData, totalPages } = useMemo(() => {
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
    const paginated = list.slice(start, start + ITEMS_PER_PAGE);
    
    return { 
      filteredData: list, 
      paginatedData: paginated, 
      totalPages: total 
    };
  }, [searchQuery, activeCategory, packages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  const renderCard = useCallback(({ item, index }) => (
    <AnimatedCard item={item} index={index} onPress={openModal} isGuest={isGuest} />
  ), [openModal, isGuest]);

  const keyExtractor = useCallback((item) => item._id, []);

  const renderPackagesGrid = useCallback(() => (
    <View style={styles.packagesGridContainer}>
      {paginatedData.reduce((rows, item, index) => {
        if (index % 2 === 0) {
          rows.push([item]);
        } else {
          rows[rows.length - 1].push(item);
        }
        return rows;
      }, []).map((row, rowIndex) => (
        <View key={rowIndex} style={styles.flatListRow}>
          {row.map((item, colIndex) => (
            <AnimatedCard 
              key={item._id} 
              item={item} 
              index={rowIndex * 2 + colIndex} 
              onPress={openModal} 
              isGuest={isGuest}
            />
          ))}
        </View>
      ))}
    </View>
  ), [paginatedData, openModal, isGuest]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* FIX: Guest Banner */}
      {isGuest && (
        <View style={styles.guestBanner}>
          <Ionicons name="information-circle" size={18} color="#1a1a1a" />
          <Text style={styles.guestBannerText}>
            Browsing as guest. Sign in to book packages!
          </Text>
        </View>
      )}
      
      <View style={styles.container}>
        <View style={styles.fixedHeader}>
          <Animated.View style={[
            styles.heroContainer,
            {
              opacity: heroAnim,
              transform: [{ scale: heroAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.98, 1]
              })}]
            }
          ]}>
            <ImageBackground 
              source={require('../../../assets/tdcaq.png')} 
              style={styles.heroImage}
              imageStyle={styles.heroImageStyle}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.2)']}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <Animated.Text style={[
                    styles.heroMainText,
                    { opacity: fadeAnim }
                  ]}>
                    Find Your Next{'\n'}Adventure
                  </Animated.Text>
                  
                  <Animated.View style={[
                    styles.searchBar,
                    {
                      opacity: searchAnim,
                      transform: [{ scale: searchAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1]
                      })}]
                    }
                  ]}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput 
                      placeholder="Where to go?" 
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
                  </Animated.View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </Animated.View>

          <Animated.View style={[
            styles.categoriesWrapper,
            {
              opacity: categoriesAnim,
              transform: [{ translateY: categoriesAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}]
            }
          ]}>
            <View style={styles.categoriesHeader}>
              <Text style={styles.categoriesTitle}>Explore Categories</Text>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAllCategories(!showAllCategories);
                }}
              >
                <Text style={styles.viewAllText}>
                  {showAllCategories ? "Show Less" : "View All"}
                </Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              horizontal={!showAllCategories}
              data={CATEGORIES}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              numColumns={showAllCategories ? 3 : 1}
              key={showAllCategories ? 'grid' : 'list'}
              scrollEnabled={!showAllCategories}
              contentContainerStyle={showAllCategories && styles.categoriesGrid}
              windowSize={3}
              maxToRenderPerBatch={10}
              initialNumToRender={8}
              removeClippedSubviews={true}
              renderItem={({item}) => {
                const isActive = activeCategory === item;
                return (
                  <TouchableOpacity 
                    onPress={() => handleCategoryPress(item)} 
                    style={[styles.categoryButton, isActive && styles.activeCategoryButton]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryButtonText, isActive && styles.activeCategoryButtonText]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </Animated.View>

          <Animated.View style={[styles.listHeader, { opacity: fadeAnim }]}>
            <Text style={styles.listTitle}>
              {activeCategory === 'All' ? 'All Packages' : activeCategory}
            </Text>
            <Text style={styles.countText}>{filteredData.length} packages</Text>
          </Animated.View>
        </View>

        {loading ? (
          <ScrollView 
            style={styles.packagesScrollView}
            contentContainerStyle={styles.skeletonContainer}
            showsVerticalScrollIndicator={false}
          >
            {[1, 2, 3, 4].map((row) => (
              <View key={row} style={styles.flatListRow}>
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ))}
          </ScrollView>
        ) : (
          <Animated.View style={[
            styles.packagesScrollContainer,
            { opacity: slideUpAnim }
          ]}>
            <ScrollView
              ref={packagesScrollRef}
              style={styles.packagesScrollView}
              contentContainerStyle={styles.packagesScrollContent}
              showsVerticalScrollIndicator={false}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            >
              {paginatedData.length > 0 ? (
                renderPackagesGrid()
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="bag-suitcase-off" size={60} color="#CCC" />
                  <Text style={styles.emptyText}>No packages found.</Text>
                  <Text style={styles.emptySubText}>Try adjusting your search or category</Text>
                  {isGuest && (
                    <TouchableOpacity 
                      style={styles.signUpButton}
                      onPress={() => navigation.navigate('Login')}
                    >
                      <Text style={styles.signUpButtonText}>Sign Up to Explore More</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </Animated.View>
        )}
      </View>

      <Modal 
        visible={modalVisible} 
        transparent
        animationType="none" 
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalScaleAnim }]}>
          <Animated.View style={[
            styles.modalContent,
            { transform: [{ translateY: modalSlideAnim }] }
          ]}>
            {selectedDestination && (
              <>
                <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                  <View style={styles.modalImageContainer}>
                    <Image 
                      source={{ uri: selectedDestination.image }} 
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.5)']}
                      style={styles.modalImageGradient}
                    />
                    <TouchableOpacity 
                      style={styles.modalCloseButton} 
                      onPress={closeModal}
                      activeOpacity={0.8}
                    >
                      <BlurView intensity={80} style={styles.modalCloseBlur}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                      </BlurView>
                    </TouchableOpacity>
                    
                    <View style={styles.modalImageContent}>
                      <View style={styles.modalCategoryBadge}>
                        <Text style={styles.modalCategoryText}>{selectedDestination.category}</Text>
                      </View>
                      <Text style={styles.modalTitle}>{selectedDestination.name}</Text>
                      <View style={styles.modalLocation}>
                        <Ionicons name="location-outline" size={16} color="#FFF" />
                        <Text style={styles.modalLocationText}>{selectedDestination.location || 'Pakistan'}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.modalDetails}>
                    <View style={styles.modalPriceRow}>
                      <View>
                        <Text style={styles.priceLabelText}>Price per person</Text>
                        <Text style={styles.modalPrice}>{selectedDestination.price}</Text>
                      </View>
                      <View style={styles.modalRating}>
                        <FontAwesome5 name="star" size={12} color="#f9c349" solid />
                        <Text style={styles.modalRatingText}>4.8</Text>
                        <Text style={styles.modalRatingCount}>(128 reviews)</Text>
                      </View>
                    </View>

                    {selectedDestination.description && (
                      <View style={styles.modalSection}>
                        <View style={styles.modalSectionHeader}>
                          <Ionicons name="information-circle-outline" size={20} color="#f9c349" />
                          <Text style={styles.modalSectionTitle}>Description</Text>
                        </View>
                        <Text style={styles.modalDescription}>{selectedDestination.description}</Text>
                      </View>
                    )}

                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="list-outline" size={20} color="#FFA500" />
                        <Text style={styles.modalSectionTitle}>Requirements & Important Info</Text>
                      </View>
                      
                      <View style={styles.requirementsList}>
                        <View style={styles.requirementItem}>
                          <Ionicons name="document-text-outline" size={20} color="#f9c349" />
                          <Text style={styles.requirementText}>Valid passport with 6+ months validity</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="medkit-outline" size={20} color="#f9c349" />
                          <Text style={styles.requirementText}>Travel insurance mandatory</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="card-outline" size={20} color="#f9c349" />
                          <Text style={styles.requirementText}>Visa requirements as per destination</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="fitness-outline" size={20} color="#f9c349" />
                          <Text style={styles.requirementText}>Good physical health condition</Text>
                        </View>
                        <View style={styles.requirementItem}>
                          <Ionicons name="cash-outline" size={20} color="#f9c349" />
                          <Text style={styles.requirementText}>Full payment 15 days before departure</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="alert-circle-outline" size={20} color="#FF4444" />
                        <Text style={styles.modalSectionTitle}>Cancellation Policy</Text>
                      </View>
                      <View style={styles.policyItem}>
                        <Text style={styles.policyText}>• Free cancellation up to 10 days before departure</Text>
                        <Text style={styles.policyText}>• 50% refund for cancellation 7-8 days before</Text>
                        <Text style={styles.policyText}>• No refund for cancellation within 6 days</Text>
                        <Text style={styles.policyText}>• Name changes allowed with additional fee</Text>
                      </View>
                    </View>
                    
                    <View style={{ height: 100 }} />
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <BlurView intensity={100} style={styles.modalFooterBlur}>
                    <View style={styles.modalFooterContent}>
                      <View>
                        <Text style={styles.footerLabel}>Total Price</Text>
                        <Text style={styles.footerPrice}>{selectedDestination.price}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.bookButton}
                        onPress={() => handleBookNow(selectedDestination)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#1a1a1a', '#1a1a1a']}
                          style={styles.bookButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text style={styles.bookButtonText}>
                            {isGuest ? 'Sign Up to Book' : 'Book Now'}
                          </Text>
                          <Ionicons name="arrow-forward" size={20} color="#f9c349" />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </BlurView>
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  // FIX: Guest banner
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
  
  fixedHeader: {
    backgroundColor: '#F8F9FA',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  heroContainer: { width: '100%', height: 200, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroImageStyle: { resizeMode: 'cover' },
  heroGradient: { flex: 1, justifyContent: 'flex-end' },
  heroContent: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 10 },
  heroMainText: { 
    color: '#FFF', fontSize: 32, fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3, marginBottom: 20,
  },
  
  searchBar: { 
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)', height: 40, 
    borderRadius: 16, alignItems: 'center', paddingHorizontal: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333' },
  
  categoriesWrapper: { marginTop: 8, paddingHorizontal: 20, marginBottom: 8 },
  categoriesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoriesTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A202C' },
  viewAllText: { color: '#f9c349', fontSize: 12, fontWeight: '900' },
  categoriesGrid: { justifyContent: 'center' },
  categoryButton: { 
    paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#FFF', 
    borderRadius: 12, marginRight: 10, marginBottom: 5, borderWidth: 1, 
    borderColor: '#E8ECF0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  activeCategoryButton: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  categoryButtonText: { fontSize: 13, color: '#666', fontWeight: '500' },
  activeCategoryButtonText: { color: '#f9c349', fontWeight: 'bold' },
  
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 1, marginBottom: 5 },
  listTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A202C' },
  countText: { color: '#999', fontSize: 13, fontWeight: '500' },
  
  packagesScrollContainer: { flex: 1, paddingBottom:50 },
  packagesScrollView: { flex: 1,  paddingBottom:50, paddingTop:10 },
  packagesScrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  packagesGridContainer: { paddingBottom: 10 },
  
  skeletonContainer: { paddingHorizontal: 20, paddingTop: 20 },
  
  flatListRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 15,
    gap: 10
  },
  mainCard: { 
    backgroundColor: '#FFF', width: (width - 50) / 2, borderRadius: 16, 
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  cardImg: { width: '100%', height: 110, resizeMode: 'cover' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  badge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  cardFavoriteBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 15, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { padding: 12 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, color: '#1A202C', marginBottom: 4 },
  cardLocRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 4 },
  cardLocText: { fontSize: 11, color: '#718096', marginLeft: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  cardPrice: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  ratingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  ratingText: { fontSize: 10, marginLeft: 3, color: '#f9c349', fontWeight: '600' },
  
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E8ECF0',
  },
  paginationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E8ECF0',
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  paginationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  paginationButtonTextDisabled: {
    color: '#CCC',
  },
  paginationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 4,
  },
  paginationCurrent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  paginationSeparator: {
    fontSize: 16,
    color: '#CCC',
    fontWeight: '600',
  },
  paginationTotal: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontSize: 16, fontWeight: '600' },
  emptySubText: { textAlign: 'center', color: '#CCC', marginTop: 8, fontSize: 13 },
  
  // FIX: Sign up button for empty state
  signUpButton: {
    marginTop: 20,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12
  },
  signUpButtonText: {
    color: '#f9c349',
    fontWeight: '700',
    fontSize: 14
  },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { flex: 1, backgroundColor: '#FFF' },
  modalImageContainer: { height: height * 0.3, position: 'relative' },
  modalImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  modalImageGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalCloseButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  modalCloseBlur: { borderRadius: 12, padding: 8, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  modalImageContent: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  modalCategoryBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  modalCategoryText: { color: '#FFF', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  modalLocation: { flexDirection: 'row', alignItems: 'center' },
  modalLocationText: { color: '#FFF', marginLeft: 6, fontSize: 14, opacity: 0.9 },
  modalDetails: { padding: 24, backgroundColor: '#FFF' },
  modalPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  priceLabelText: { color: '#718096', fontSize: 12, marginBottom: 4, fontWeight: '500' },
  modalPrice: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  modalRating: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9E6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  modalRatingText: { fontSize: 14, fontWeight: 'bold', color: '#f9c349', marginLeft: 4 },
  modalRatingCount: { fontSize: 11, color: '#718096', marginLeft: 4 },
  modalSection: { marginBottom: 24 },
  modalSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalSectionTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748', marginLeft: 8 },
  modalDescription: { color: '#4A5568', lineHeight: 24, fontSize: 15 },
  requirementsList: { gap: 12 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 10, gap: 12 },
  requirementText: { flex: 1, fontSize: 13, color: '#2D3748', fontWeight: '500' },
  policyItem: { backgroundColor: '#FFF5F5', padding: 16, borderRadius: 12, gap: 8 },
  policyText: { fontSize: 13, color: '#FF4444', lineHeight: 20 },
  modalFooter: { position: 'absolute', bottom: 0, width: '100%' },
  modalFooterBlur: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  modalFooterContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 30 },
  footerLabel: { color: '#718096', fontSize: 12, fontWeight: '500', marginBottom: 4 },
  footerPrice: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  bookButton: { borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  bookButtonGradient: { paddingHorizontal: 28, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookButtonText: { color: '#f9c349', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 }
});

export default TravelingScreen;