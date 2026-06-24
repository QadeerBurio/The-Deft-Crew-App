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
// CATEGORIES WITH ICONS & COLORS
// ==========================================
const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid', iconType: 'Feather', color: '#1a1a1a', bgColor: '#f0f0f0' },
  { id: 'international-tours', name: 'International Tours', icon: 'globe-americas', iconType: 'FontAwesome5', color: '#FF6B6B', bgColor: '#FFE8E8' },
  { id: 'pakistan-tours', name: 'Pakistan Tours', icon: 'flag', iconType: 'FontAwesome5', color: '#4CAF50', bgColor: '#E8F5E9' },
  { id: 'flights', name: 'Flights', icon: 'airplane', iconType: 'Ionicons', color: '#2196F3', bgColor: '#E3F2FD' },
  { id: 'hotels', name: 'Hotels', icon: 'hotel', iconType: 'Fontisto', color: '#FF9800', bgColor: '#FFF3E0' },
  { id: 'visa-services', name: 'Visa Services', icon: 'passport', iconType: 'FontAwesome5', color: '#9C27B0', bgColor: '#F3E5F5' },
  { id: 'study-abroad', name: 'Study Abroad', icon: 'school', iconType: 'Ionicons', color: '#3F51B5', bgColor: '#E8EAF6' },
  { id: 'travel-insurance', name: 'Travel Insurance', icon: 'shield-alt', iconType: 'FontAwesome5', color: '#E91E63', bgColor: '#FCE4EC' },
  { id: 'transport-services', name: 'Transport Services', icon: 'bus', iconType: 'FontAwesome5', color: '#795548', bgColor: '#EFEBE9' },
  { id: 'adventure-tourism', name: 'Adventure Tourism', icon: 'mountain', iconType: 'FontAwesome5', color: '#FF5722', bgColor: '#FBE9E7' },
  { id: 'honeymoon-packages', name: 'Honeymoon Packages', icon: 'heart', iconType: 'FontAwesome5', color: '#E91E63', bgColor: '#FCE4EC' },
  { id: 'family-tours', name: 'Family Tours', icon: 'users', iconType: 'FontAwesome5', color: '#FF9800', bgColor: '#FFF3E0' },
  { id: 'group-tours', name: 'Group Tours', icon: 'people', iconType: 'Ionicons', color: '#009688', bgColor: '#E0F2F1' },
  { id: 'corporate-travel', name: 'Corporate Travel', icon: 'briefcase', iconType: 'FontAwesome5', color: '#607D8B', bgColor: '#ECEFF1' },
  { id: 'cruise-tours', name: 'Cruise Tours', icon: 'sailboat', iconType: 'FontAwesome5', color: '#00BCD4', bgColor: '#E0F7FA' },
  { id: 'events-conferences', name: 'Events & Conferences', icon: 'calendar', iconType: 'FontAwesome5', color: '#FFC107', bgColor: '#FFF8E1' },
  { id: 'student-tours', name: 'Student Tours', icon: 'graduation-cap', iconType: 'FontAwesome5', color: '#8BC34A', bgColor: '#F1F8E9' },
  { id: 'luxury-travel', name: 'Luxury Travel', icon: 'crown', iconType: 'FontAwesome5', color: '#FFD700', bgColor: '#FFFDE7' },
];

const getIconComponent = (type) => {
  switch(type) {
    case 'FontAwesome5': return FontAwesome5;
    case 'Ionicons': return Ionicons;
    case 'MaterialCommunityIcons': return MaterialCommunityIcons;
    case 'Feather': return Feather;
    case 'Fontisto': return Fontisto;
    case 'Entypo': return Entypo;
    case 'AntDesign': return AntDesign;
    default: return Ionicons;
  }
};

const ITEMS_PER_PAGE = 10;

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

// ==========================================
// ENHANCED CATEGORY CARD COMPONENT
// ==========================================
const CategoryCard = memo(({ category, isActive, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const delay = index * 50;
    
    InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          delay,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.spring(pulseAnim, {
            toValue: 1.05,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.spring(pulseAnim, {
            toValue: 1,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ).start();
    }
  }, [isActive]);

  const IconComponent = getIconComponent(category.iconType);
  
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

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(category.name);
  }, [category.name, onPress]);

  return (
    <Animated.View style={[
      styles.categoryCardWrapper,
      {
        opacity: fadeAnim,
        transform: [
          { scale: Animated.multiply(scaleAnim, pulseAnim) },
          { translateY: translateYAnim }
        ]
      }
    ]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.categoryCard,
          isActive && styles.categoryCardActive
        ]}
      >
        <LinearGradient
          colors={isActive ? ['#1a1a1a', '#2d2d2d'] : ['#FFFFFF', '#FFFFFF']}
          style={[
            styles.categoryIconCircle,
            isActive && styles.categoryIconCircleActive
          ]}
        >
          <Animated.View style={{
            transform: [{ scale: isActive ? pulseAnim : 1 }]
          }}>
            <IconComponent 
              name={category.icon} 
              size={22} 
              color={isActive ? '#f9c349' : category.color} 
              solid={category.iconType === 'FontAwesome5'}
            />
          </Animated.View>
        </LinearGradient>
        
        <View style={styles.categoryTextContainer}>
          <Text 
            style={[
              styles.categoryCardText,
              isActive && styles.categoryCardTextActive
            ]}
            numberOfLines={1}
          >
            {category.name}
          </Text>
          {isActive && (
            <Animated.View style={[
              styles.categoryActiveDot,
              {
                transform: [{ scale: pulseAnim }]
              }
            ]} />
          )}
        </View>
        
        {isActive && (
          <LinearGradient
            colors={['#f9c349', '#f9c349']}
            style={styles.categoryActiveBorder}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const AnimatedCard = memo(({ item, index, onPress, isGuest }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const delay = Math.min(index * 30, 150);
    
    InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
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

// ==========================================
// ENHANCED PAGINATION COMPONENT WITH ANIMATIONS
// ==========================================
const PaginationControls = memo(({ currentPage, totalPages, onPageChange, isLoading }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [visiblePages, setVisiblePages] = useState([]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentPage]);

  // Generate page numbers to show
  useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
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
    <Animated.View style={[
      styles.paginationContainer, 
      { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      <TouchableOpacity 
        style={[styles.paginationArrow, currentPage === 1 && styles.paginationDisabled]}
        onPress={handlePrev}
        disabled={currentPage === 1}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="chevron-back" 
          size={22} 
          color={currentPage === 1 ? '#CCC' : '#1a1a1a'} 
        />
      </TouchableOpacity>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pageNumbersContainer}
      >
        {visiblePages.map((page, index) => {
          if (page === '...') {
            return (
              <View key={`ellipsis-${index}`} style={styles.pageEllipsis}>
                <Text style={styles.ellipsisText}>…</Text>
              </View>
            );
          }
          
          const isActive = page === currentPage;
          return (
            <TouchableOpacity
              key={`page-${page}`}
              onPress={() => handlePagePress(page)}
              activeOpacity={0.7}
              style={[
                styles.pageNumber,
                isActive && styles.pageNumberActive
              ]}
            >
              <Animated.Text style={[
                styles.pageNumberText,
                isActive && styles.pageNumberTextActive
              ]}>
                {page}
              </Animated.Text>
              {isActive && (
                <Animated.View style={styles.pageNumberActiveDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.paginationArrow, currentPage === totalPages && styles.paginationDisabled]}
        onPress={handleNext}
        disabled={currentPage === totalPages}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="chevron-forward" 
          size={22} 
          color={currentPage === totalPages ? '#CCC' : '#1a1a1a'} 
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

// ==========================================
// LOAD MORE INDICATOR
// ==========================================
const LoadMoreIndicator = memo(({ isLoading, onLoadMore, hasMore }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (!hasMore) return null;

  return (
    <Animated.View style={[styles.loadMoreContainer, { opacity: fadeAnim }]}>
      <TouchableOpacity 
        onPress={onLoadMore} 
        disabled={isLoading}
        style={styles.loadMoreButton}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <ActivityIndicator size="small" color="#f9c349" />
        </Animated.View>
        <Text style={styles.loadMoreText}>
          {isLoading ? 'Loading more...' : 'Load More Packages'}
        </Text>
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const categoriesAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(height)).current;
  const headerTitleAnim = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  
  const isMounted = useRef(true);
  const hasInitialFetch = useRef(false);
  const packagesScrollRef = useRef(null);

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
        setVisibleCount(ITEMS_PER_PAGE);
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
        setVisibleCount(ITEMS_PER_PAGE);
      }
      return;
    }

    if (!forceRefresh && (now - lastFetchTime) < FETCH_DEBOUNCE) return;
    
    lastFetchTime = now;

    if (isMounted.current && packages.length === 0) setLoading(true);

    pendingFetchPromise = (async () => {
      try {
        const response = await axios.get(API_URL, {
          timeout: 8000,
        });
        
        const data = response.data || [];
        
        if (isMounted.current) {
          setPackages(data);
          memoryCache = data;
          cacheTimestamp = Date.now();
          setCurrentPage(1);
          setVisibleCount(ITEMS_PER_PAGE);
          
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
            setVisibleCount(ITEMS_PER_PAGE);
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
          duration: 400,
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
          delay: 100,
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
          delay: 150,
          friction: 10,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(headerTitleAnim, {
          toValue: 1,
          delay: 200,
          friction: 10,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(countAnim, {
          toValue: 1,
          delay: 250,
          friction: 10,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, heroAnim, categoriesAnim, searchAnim, slideUpAnim, headerTitleAnim, countAnim]);

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
    setVisibleCount(ITEMS_PER_PAGE);
    if (packagesScrollRef.current) {
      packagesScrollRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    const totalItems = filteredData.length;
    const currentItems = paginatedData.length;
    
    if (currentItems < totalItems && !isLoadingMore) {
      setIsLoadingMore(true);
      
      // Simulate loading more items
      setTimeout(() => {
        if (isMounted.current) {
          const nextCount = Math.min(visibleCount + ITEMS_PER_PAGE, totalItems);
          setVisibleCount(nextCount);
          setIsLoadingMore(false);
          
          // Animate the new items appearing
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 600);
    }
  }, [filteredData, paginatedData, isLoadingMore, visibleCount]);

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

  const handleCategoryPress = useCallback((categoryName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(categoryName);
    setCurrentPage(1);
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

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
  // RENDER HORIZONTAL CATEGORIES
  // ==========================================
  const renderCategories = useCallback(() => {
    const displayCategories = showAllCategories ? CATEGORIES.slice(0, 12) : CATEGORIES.slice(0, 6);
    
    return (
      <Animated.View style={[
        styles.categoriesContainer,
        {
          opacity: categoriesAnim,
          transform: [{ translateY: categoriesAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0]
          })}]
        }
      ]}>
        <View style={styles.categoriesHeader}>
          <Animated.View style={{
            transform: [{ translateX: headerTitleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })}]
          }}>
            <Text style={styles.categoriesTitle}>Explore Categories</Text>
          </Animated.View>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAllCategories(!showAllCategories);
            }}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>
              {showAllCategories ? "Show Less" : "View All"}
            </Text>
          </TouchableOpacity>
        </View>
        
        <Animated.FlatList
          horizontal
          data={displayCategories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item, index }) => {
            const isActive = activeCategory === item.name;
            return (
              <CategoryCard
                category={item}
                isActive={isActive}
                onPress={handleCategoryPress}
                index={index}
              />
            );
          }}
          snapToInterval={width * 0.25}
          decelerationRate="fast"
          bounces={false}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        />
      </Animated.View>
    );
  }, [showAllCategories, activeCategory, handleCategoryPress, categoriesAnim, headerTitleAnim]);

  // ==========================================
  // RENDER PACKAGES GRID - FIXED
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
      <View style={styles.packagesGridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.flatListRow}>
            {row.map((item, colIndex) => {
              const globalIndex = rowIndex * 2 + colIndex;
              return (
                <View key={item._id || `item-${globalIndex}`} style={styles.cardContainer}>
                  <AnimatedCard 
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {isGuest && (
        <Animated.View style={[
          styles.guestBanner,
          {
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-10, 0]
            })}]
          }
        ]}>
          <Ionicons name="information-circle" size={18} color="#1a1a1a" />
          <Text style={styles.guestBannerText}>
            Browsing as guest. Sign in to book packages!
          </Text>
        </Animated.View>
      )}
      
      <View style={styles.container}>
        <View style={styles.fixedHeader}>
          <Animated.View style={[
            styles.heroContainer,
            {
              opacity: heroAnim,
              transform: [{ scale: heroAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1]
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
                        outputRange: [0.9, 1]
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

          {/* MODERN HORIZONTAL CATEGORIES */}
          {renderCategories()}

          <Animated.View style={[
            styles.listHeader,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0]
              })}]
            }
          ]}>
            <Animated.Text style={[
              styles.listTitle,
              {
                transform: [{ translateX: headerTitleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-15, 0]
                })}]
              }
            ]}>
              {activeCategory === 'All' ? 'All Packages' : activeCategory}
            </Animated.Text>
            <Animated.Text style={[
              styles.countText,
              {
                transform: [{ scale: countAnim }]
              }
            ]}>
              {filteredData?.length || 0} packages
            </Animated.Text>
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
                <View style={styles.cardContainer}>
                  <SkeletonCard />
                </View>
                <View style={styles.cardContainer}>
                  <SkeletonCard />
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Animated.View style={[
            styles.packagesScrollContainer,
            { 
              opacity: slideUpAnim,
              transform: [{ translateY: slideUpAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0]
              })}]
            }
          ]}>
            <ScrollView
              ref={packagesScrollRef}
              style={styles.packagesScrollView}
              contentContainerStyle={styles.packagesScrollContent}
              showsVerticalScrollIndicator={false}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            >
              {paginatedData && paginatedData.length > 0 ? (
                <>
                  {renderPackagesGrid()}
                  
                  {/* Load More Button - appears when there are more items to load */}
                  {hasMore && (
                    <LoadMoreIndicator 
                      isLoading={isLoadingMore}
                      onLoadMore={handleLoadMore}
                      hasMore={hasMore}
                    />
                  )}
                  
                  {/* Show "All loaded" message when all items are visible */}
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

            {/* Enhanced Pagination Controls */}
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                isLoading={isLoadingMore}
              />
            )}
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
                      source={{ uri: selectedDestination.image || 'https://via.placeholder.com/400' }} 
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
                        <Text style={styles.modalCategoryText}>{selectedDestination.category || 'Package'}</Text>
                      </View>
                      <Text style={styles.modalTitle}>{selectedDestination.name || 'Package'}</Text>
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
                        <Text style={styles.modalPrice}>{selectedDestination.price || 'PKR 0'}</Text>
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
                        <Text style={styles.footerPrice}>{selectedDestination.price || 'PKR 0'}</Text>
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
  
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f9c34930'
  },
  guestBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: '500',
    marginLeft: 8
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
  
  heroContainer: { width: '100%', height: 130, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroImageStyle: { resizeMode: 'stretch' },
  heroGradient: { flex: 1, justifyContent: 'flex-end' },
  heroContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 10 },
  heroMainText: { 
    color: '#FFF', fontSize: 28, fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3, marginBottom: 16,
  },
  
  searchBar: { 
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)', height: 38, 
    borderRadius: 14, alignItems: 'center', paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#333' },
  
  // MODERN HORIZONTAL CATEGORIES STYLES
  categoriesContainer: {
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  viewAllButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  viewAllText: {
    fontSize: 11,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  categoriesList: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  
  // CATEGORY CARD - SMALL & HORIZONTAL
  categoryCardWrapper: {
    width: width * 0.22,
    marginRight: 0,
  },
  categoryCard: {
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    minHeight: 60,
  },
  categoryCardActive: {
    backgroundColor: '#F0F0F0',
    borderColor: '#F0F0F0',
    shadowColor: '#F0F0F0',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  categoryIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 4,
  },
  categoryIconCircleActive: {
    backgroundColor: 'rgba(249, 195, 73, 0.12)',
    borderColor: 'rgba(249, 195, 73, 0.3)',
  },
  categoryTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardText: {
    fontSize: 10,
    color: '#4A5568',
    textAlign: 'center',
    fontWeight: '600',
  },
  categoryCardTextActive: {
    color: '#f9c349',
    fontWeight: '700',
  },
  categoryActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f9c349',
    marginLeft: 4,
  },
  categoryActiveBorder: {
    position: 'absolute',
    bottom: -1,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 2,
  },
  
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 4,
    backgroundColor: '#F8F9FA',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  countText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  
  packagesScrollContainer: { flex: 1, paddingBottom: 50 },
  packagesScrollView: { flex: 1, paddingBottom: 50, paddingTop: 6 },
  packagesScrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  packagesGridContainer: { paddingBottom: 10 },
  
  skeletonContainer: { paddingHorizontal: 20, paddingTop: 20 },
  
  flatListRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 15,
  },
  cardContainer: {
    width: (width - 50) / 2,
  },
  mainCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    overflow: 'hidden',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 4,
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
  
  // ENHANCED PAGINATION STYLES
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E8ECF0',
  },
  paginationArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 4,
  },
  paginationDisabled: {
    opacity: 0.4,
    backgroundColor: '#F5F5F5',
  },
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  pageNumber: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    position: 'relative',
    marginHorizontal: 2,
  },
  pageNumberActive: {
    backgroundColor: '#1a1a1a',
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  pageNumberText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  pageNumberTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  pageNumberActiveDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f9c349',
  },
  pageEllipsis: {
    width: 28,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipsisText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  
  // LOAD MORE STYLES
  loadMoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginVertical: 8,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    marginLeft: 12,
  },
  allLoadedContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 8,
  },
  allLoadedText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontSize: 16, fontWeight: '600' },
  emptySubText: { textAlign: 'center', color: '#CCC', marginTop: 8, fontSize: 13 },
  
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
  requirementsList: { 
    gap: 12,
  },
  requirementItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA', 
    padding: 12, 
    borderRadius: 10, 
  },
  requirementText: { 
    flex: 1, 
    fontSize: 13, 
    color: '#2D3748', 
    fontWeight: '500',
    marginLeft: 12
  },
  policyItem: { backgroundColor: '#FFF5F5', padding: 16, borderRadius: 12 },
  policyText: { fontSize: 13, color: '#FF4444', lineHeight: 20, marginBottom: 4 },
  modalFooter: { position: 'absolute', bottom: 0, width: '100%' },
  modalFooterBlur: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  modalFooterContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 30 },
  footerLabel: { color: '#718096', fontSize: 12, fontWeight: '500', marginBottom: 4 },
  footerPrice: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  bookButton: { borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  bookButtonGradient: { paddingHorizontal: 28, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  bookButtonText: { color: '#f9c349', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5, marginRight: 8 }
});

export default TravelingScreen;