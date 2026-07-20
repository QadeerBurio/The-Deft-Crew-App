// screens/Brands.js - Ultra-Optimized with Fast Skeleton Loading
import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  Pressable,
  StatusBar,
  Alert,
  ScrollView,
  Linking,
  Platform,
  Animated,
  Easing,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRoute } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");
const NUM_COLUMNS = 2;
const HORIZONTAL_PADDING = 20;
const GAP = 15;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - GAP) / NUM_COLUMNS;
const PAGE_SIZE = 6;

// Enhanced CATEGORIES with logos and icons
const CATEGORIES = [
  { id: "all", name: "All", icon: "apps", color: "#f9c349", bgColor: "#f9c34915" },
  { id: "restaurant", name: "Restaurant", icon: "silverware-fork-knife", color: "#FF6B6B", bgColor: "#FF6B6B15" },
  { id: "cafe", name: "Cafe & Coffee", icon: "coffee", color: "#A0522D", bgColor: "#A0522D15" },
  { id: "food", name: "Food & Drinks", icon: "food", color: "#FF8C00", bgColor: "#FF8C0015" },
  { id: "salon", name: "Salon", icon: "scissors-cutting", color: "#FF69B4", bgColor: "#FF69B415" },
  { id: "spa", name: "Spa & Wellness", icon: "spa", color: "#2E8B57", bgColor: "#2E8B5715" },
  { id: "health", name: "Health & Beauty", icon: "heart-pulse", color: "#FF1493", bgColor: "#FF149315" },
  { id: "perfumes", name: "Perfumes & Fragrances", icon: "flask", color: "#9B59B6", bgColor: "#9B59B615" },
  { id: "fashion", name: "Fashion & Clothing", icon: "tshirt-crew", color: "#2C3E50", bgColor: "#2C3E5015" },
  { id: "shoes", name: "Shoes & Footwear", icon: "shoe-print", color: "#8B4513", bgColor: "#8B451315" },
  { id: "bags", name: "Bags & Accessories", icon: "bag-suitcase", color: "#D4A017", bgColor: "#D4A01715" },
  { id: "electronics", name: "Electronics & Gadgets", icon: "laptop", color: "#3498DB", bgColor: "#3498DB15" },
  { id: "mobile", name: "Mobile & Accessories", icon: "cellphone", color: "#2ECC71", bgColor: "#2ECC7115" },
  { id: "education", name: "Education & Institutes", icon: "school", color: "#1A5276", bgColor: "#1A527615" },
  { id: "travel", name: "Travel & Tourism", icon: "airplane", color: "#5DADE2", bgColor: "#5DADE215" },
  { id: "hotels", name: "Hotels & Resorts", icon: "bed", color: "#E67E22", bgColor: "#E67E2215" },
  { id: "gym", name: "Gym & Fitness", icon: "dumbbell", color: "#E74C3C", bgColor: "#E74C3C15" },
  { id: "sports", name: "Sports", icon: "basketball", color: "#2ECC71", bgColor: "#2ECC7115" },
  { id: "entertainment", name: "Entertainment", icon: "movie", color: "#8E44AD", bgColor: "#8E44AD15" },
  { id: "photography", name: "Photography", icon: "camera", color: "#2C3E50", bgColor: "#2C3E5015" },
  { id: "services", name: "Services", icon: "tools", color: "#7F8C8D", bgColor: "#7F8C8D15" },
  { id: "others", name: "Others", icon: "dots-horizontal", color: "#95A5A6", bgColor: "#95A5A615" },
];

const DISCOUNT_OPTIONS = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50];

// Ultra-fast cache configuration
const BASE_URL = 'https://the-deft-crew-production.up.railway.app';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes - increased for better performance

// Global cache with versioning
let brandsCache = null;
let cacheTimestamp = null;
let cacheVersion = 0;
let pendingFetchPromise = null;

// Image preloading queue
const imagePreloadQueue = new Set();
const MAX_PRELOAD = 8;

// ==========================================
// ENHANCED SKELETON CARD COMPONENT - Matches actual card layout
// ==========================================
const SkeletonCard = memo(({ index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const delay = Math.min(index * 30, 200);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);
  
  return (
    <Animated.View style={[styles.cardWrapper, { opacity: fadeAnim }]}>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonAvailability} />
        <View style={styles.skeletonDiscount} />
        <View style={styles.skeletonLogo} />
        <View style={styles.skeletonInfo}>
          <View style={styles.skeletonName} />
          <View style={styles.skeletonCategory} />
          <View style={styles.skeletonOfferStatus} />
        </View>
      </View>
    </Animated.View>
  );
});

// ==========================================
// CATEGORY SKELETON
// ==========================================
const CategorySkeleton = memo(() => (
  <View style={styles.categoryGridContainer}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryGridScroll}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.skeletonCategoryItem}>
          <View style={styles.skeletonCategoryIcon} />
          <View style={styles.skeletonCategoryText} />
        </View>
      ))}
    </ScrollView>
  </View>
));

// ==========================================
// CATEGORY GRID ITEM COMPONENT
// ==========================================
const CategoryGridItem = memo(({ category, isSelected, onPress }) => (
  <TouchableOpacity
    style={[
      styles.categoryGridItem,
      isSelected && styles.categoryGridItemActive,
      { backgroundColor: isSelected ? category.color : category.bgColor }
    ]}
    onPress={() => onPress(category.id)}
    activeOpacity={0.7}
  >
    <View style={[
      styles.categoryIconWrapper,
      isSelected && styles.categoryIconWrapperActive
    ]}>
      <MaterialCommunityIcons 
        name={category.icon} 
        size={28} 
        color={isSelected ? "#fff" : category.color} 
      />
    </View>
    <Text 
      style={[
        styles.categoryGridName,
        isSelected && styles.categoryGridNameActive
      ]}
      numberOfLines={1}
    >
      {category.name}
    </Text>
  </TouchableOpacity>
));

// ==========================================
// OPTIMIZED BRAND CARD
// ==========================================
const BrandCard = memo(({ item, index, onPress, preloadImage }) => {
  const firstOffer = item.offers?.[0];
  const displayImage = item.displayImage;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    
    const delay = Math.min(index * 10, 100);
    
    const timeoutId = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  const categoryColor = useMemo(() => {
    const cat = CATEGORIES.find(c => c.name === item.category);
    return cat?.color || "#000000";
  }, [item.category]);
  
  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => onPress(item)}
      >
        <View style={styles.availabilityWrapper}>
          {item.isOnline && (
            <MaterialCommunityIcons name="earth" size={14} color="#f9c349" style={{ marginRight: 4 }} />
          )}
          {item.isInStore && (
            <MaterialCommunityIcons name="storefront-outline" size={14} color="#f9c349" />
          )}
        </View>

        {item.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{item.discount}%</Text>
          </View>
        )}

        <View style={styles.logoContainer}>
          <Image
            source={{ uri: displayImage }}
            style={styles.logo}
            resizeMode="contain"
            onError={(e) => {
              // If image fails to load, use default icon
              console.log('Image failed to load:', displayImage);
            }}
            onLoad={() => preloadImage?.(displayImage)}
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.categoryBadgeCard, { borderColor: categoryColor + '40' }]}>
            <MaterialIcons name="category" size={10} color={categoryColor} />
            <Text style={[styles.categoryCardText, { color: categoryColor }]}>
              {item.category || "General"}
            </Text>
          </View>
          <Text
            style={[
              styles.offerStatusText,
              firstOffer?.isClaimed && styles.offerStatusClaimed,
            ]}
          >
            {firstOffer?.isClaimed ? "✓ Saved" : item.hasOffer ? "Student's Offer Available" : "No Offers"}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return prevProps.item._id === nextProps.item._id && 
         prevProps.item.discount === nextProps.item.discount &&
         prevProps.item.displayImage === nextProps.item.displayImage &&
         prevProps.item.isOnline === nextProps.item.isOnline &&
         prevProps.item.isInStore === nextProps.item.isInStore &&
         prevProps.item.hasOffer === nextProps.item.hasOffer &&
         prevProps.item.offers?.[0]?.isClaimed === nextProps.item.offers?.[0]?.isClaimed;
});

export default function BrandsScreen({ limit = null }) {
  const navigation = useNavigation();
  const { token, user, isGuest } = useContext(AuthContext);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [selectedBrand, setSelectedBrand] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [activeTab, setActiveTab] = useState("gift");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [minDiscount, setMinDiscount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const modalSlideAnim = useRef(new Animated.Value(height)).current;
  const filterSlideAnim = useRef(new Animated.Value(height)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;

  const route = useRoute();
  const { query, timestamp } = route.params || {};
  const isMounted = useRef(true);
  const abortControllerRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    
    const anim = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (anim) {
        anim.cancel();
      }
    };
  }, []);

  // Memoized userId
  const userId = useMemo(() => {
    if (!token || isGuest) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id;
    } catch {
      return null;
    }
  }, [token, isGuest]);

  // ==========================================
  // FIXED: Optimized image URL formatter with better path handling
  // ==========================================
  const formatImageUrl = useCallback((imagePath, type = 'offer') => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Remove leading slashes to avoid double slashes
    const cleanPath = imagePath.replace(/^\/+/, '');
    
    if (type === 'brand') {
      // For brand logos - check if path already includes 'uploads/brands'
      if (cleanPath.startsWith('uploads/brands/')) {
        return `${BASE_URL}/${cleanPath}`;
      }
      return `${BASE_URL}/uploads/brands/${cleanPath}`;
    }
    
    // For offers - check if path already includes 'uploads'
    if (cleanPath.startsWith('uploads/')) {
      return `${BASE_URL}/${cleanPath}`;
    }
    return `${BASE_URL}/${cleanPath}`;
  }, []);

  // Optimized image preloader with priority queue
  const preloadImage = useCallback((url) => {
    if (!url || imagePreloadQueue.has(url) || imagePreloadQueue.size >= MAX_PRELOAD) return;
    imagePreloadQueue.add(url);
    Image.prefetch(url).catch(() => {});
  }, []);

  // ULTRA-FAST fetch with parallel requests and progress tracking
  const fetchBrands = useCallback(async (forceRefresh = false) => {
    // Check cache first - with version control
    if (!forceRefresh && brandsCache && cacheTimestamp && 
        (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      if (isMounted.current) {
        setBrands(brandsCache);
        setLoading(false);
        setLoadingProgress(100);
        // Preload images in background
        requestAnimationFrame(() => {
          brandsCache.slice(0, MAX_PRELOAD).forEach(brand => {
            if (brand.displayImage) preloadImage(brand.displayImage);
          });
        });
      }
      return brandsCache;
    }

    // Deduplicate in-flight requests
    if (pendingFetchPromise) {
      const result = await pendingFetchPromise;
      if (isMounted.current) {
        setBrands(result);
        setLoading(false);
        setLoadingProgress(100);
      }
      return result;
    }

    setLoading(true);
    setLoadingProgress(0);
    
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    pendingFetchPromise = (async () => {
      try {
        const headers = token && !isGuest ? { Authorization: `Bearer ${token}` } : {};
        
        setLoadingProgress(10);
        
        // Fetch brands
        const brandsRes = await api.get("/brands", {
          headers: headers,
          signal: abortControllerRef.current.signal,
          params: { limit: 100 }
        });
        
        setLoadingProgress(30);
        const brandsData = brandsRes.data || [];
        
        // For guests, show basic info quickly
        if (isGuest || !token) {
          const basicBrandsData = brandsData.map((brand) => {
            // FIXED: Better logo handling
            const logoUrl = formatImageUrl(brand.logo, 'brand');
            return {
              ...brand,
              logo: logoUrl,
              offers: [],
              displayImage: logoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
              hasOffer: false,
              discount: 0,
              category: brand.category || "General",
              isOnline: brand.isOnline || false,
              isInStore: brand.isInStore || false,
            };
          });

          if (isMounted.current) {
            setBrands(basicBrandsData);
            brandsCache = basicBrandsData;
            cacheTimestamp = Date.now();
            cacheVersion++;
            setLoading(false);
            setLoadingProgress(100);
            
            // Preload images
            requestAnimationFrame(() => {
              basicBrandsData.slice(0, MAX_PRELOAD).forEach(brand => {
                if (brand.displayImage) preloadImage(brand.displayImage);
              });
            });
          }
          
          pendingFetchPromise = null;
          return basicBrandsData;
        }
        
        // For logged-in users, fetch offers in parallel with batching
        const BATCH_SIZE = 15;
        const batches = [];
        const totalBatches = Math.ceil(brandsData.length / BATCH_SIZE);
        
        setLoadingProgress(40);
        
        // Create batches for parallel processing
        for (let i = 0; i < brandsData.length; i += BATCH_SIZE) {
          const batch = brandsData.slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map(brand =>
            api.get(`/offers/brand/${brand._id}`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: abortControllerRef.current.signal,
              timeout: 3000
            }).then(res => ({ brandId: brand._id, offers: res.data }))
              .catch(() => ({ brandId: brand._id, offers: [] }))
          );
          batches.push(Promise.all(batchPromises));
        }
        
        // Execute all batches with progress
        const allOffersResults = [];
        let completedBatches = 0;
        
        for (const batchPromise of batches) {
          const batchResults = await batchPromise;
          allOffersResults.push(...batchResults);
          completedBatches++;
          const progress = 40 + (completedBatches / totalBatches) * 50;
          setLoadingProgress(Math.min(progress, 90));
        }
        
        setLoadingProgress(90);
        
        // Build offers map
        const offersMap = new Map();
        allOffersResults.forEach(({ brandId, offers }) => {
          offersMap.set(brandId, offers.map(offer => ({
            ...offer,
            image: formatImageUrl(offer.image, 'offer'),
            displayImage: formatImageUrl(offer.image, 'offer'),
            isClaimed: offer.claimedBy?.includes(userId) || false,
            discountPercentage: offer.discountPercentage || 0,
          })));
        });

        // Map brands with offers - optimized loop
        const brandsWithOffers = brandsData.map((brand) => {
          const brandOffers = offersMap.get(brand._id) || [];
          const firstOffer = brandOffers[0];
          
          // FIXED: Better display image logic with proper fallbacks
          let displayImage;
          if (firstOffer?.image) {
            displayImage = firstOffer.image;
          } else {
            const logoUrl = formatImageUrl(brand.logo, 'brand');
            displayImage = logoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
          }
          
          return {
            ...brand,
            logo: formatImageUrl(brand.logo, 'brand'),
            offers: brandOffers,
            displayImage: displayImage,
            hasOffer: brandOffers.length > 0,
            discount: firstOffer?.discountPercentage || 0,
            category: firstOffer?.category || brand.category || "General",
            isOnline: firstOffer?.isOnline || brand.isOnline || false,
            isInStore: firstOffer?.isInStore || brand.isInStore || false,
          };
        });

        if (isMounted.current) {
          setBrands(brandsWithOffers);
          brandsCache = brandsWithOffers;
          cacheTimestamp = Date.now();
          cacheVersion++;
          setLoading(false);
          setLoadingProgress(100);
          
          // Preload images
          requestAnimationFrame(() => {
            brandsWithOffers.slice(0, MAX_PRELOAD).forEach(brand => {
              if (brand.displayImage) preloadImage(brand.displayImage);
            });
          });
        }
        
        pendingFetchPromise = null;
        return brandsWithOffers;
      } catch (err) {
        if (err.name !== 'AbortError' && isMounted.current) {
          console.error("Error fetching brands:", err.response?.data || err.message);
          setLoading(false);
          setLoadingProgress(100);
        }
        pendingFetchPromise = null;
        // Return cached data on error if available
        if (brandsCache && isMounted.current) {
          setBrands(brandsCache);
          setLoading(false);
          setLoadingProgress(100);
        }
        return brandsCache || [];
      }
    })();

    return pendingFetchPromise;
  }, [token, isGuest, userId, formatImageUrl, preloadImage]);

  // Focus effect with search query handling
  useFocusEffect(
    useCallback(() => {
      fetchBrands(true);
      
      if (query) {
        setSearchQuery(query);
      }
    }, [fetchBrands, query]),
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, minDiscount, showOnlyOnline]);

  // Handlers
  const openModal = useCallback((brand) => {
    setSelectedBrand(brand);
    setActiveTab("gift");
    setModalVisible(true);
    modalSlideAnim.setValue(height);
    Animated.spring(modalSlideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [height, modalSlideAnim]);

  const closeModal = useCallback(() => {
    Animated.timing(modalSlideAnim, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      if (isMounted.current) {
        setModalVisible(false);
        setSelectedBrand(null);
      }
    });
  }, [height, modalSlideAnim]);

  const openFilterModal = useCallback(() => {
    setFilterModalVisible(true);
    filterSlideAnim.setValue(height);
    Animated.spring(filterSlideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [height, filterSlideAnim]);

  const closeFilterModal = useCallback(() => {
    Animated.timing(filterSlideAnim, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      if (isMounted.current) {
        setFilterModalVisible(false);
      }
    });
  }, [height, filterSlideAnim]);

  const showSuccessAnimation = useCallback(() => {
    setShowSuccess(true);
    successScaleAnim.setValue(0);
    Animated.spring(successScaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(successScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        if (isMounted.current) setShowSuccess(false);
      });
    }, 2000);
  }, [successScaleAnim]);

  const openMap = async (address) => {
    if (!address) {
      Alert.alert("Notice", "Address not available for this brand.");
      return;
    }

    const destination = encodeURIComponent(address);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${destination}`,
      android: `geo:0,0?q=${destination}`,
    });
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${destination}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      Linking.openURL(webUrl);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    cacheTimestamp = null; // Force refresh
    await fetchBrands(true);
    setRefreshing(false);
  }, [fetchBrands]);

  const claimOffer = useCallback(async (offerId) => {
    if (isGuest) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to claim this offer and get student discounts!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => {
            closeModal();
            setTimeout(() => {
              navigation.navigate('Login');
            }, 300);
          }}
        ]
      );
      return;
    }

    try {
      await api.post(
        `/offers/claim/${offerId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showSuccessAnimation();

      const updatedBrands = brands.map((brand) => ({
        ...brand,
        offers: brand.offers.map((offer) =>
          offer._id === offerId ? { ...offer, isClaimed: true } : offer
        ),
      }));
      
      if (isMounted.current) {
        setBrands(updatedBrands);
        brandsCache = updatedBrands;
        
        if (selectedBrand) {
          setSelectedBrand((prev) => ({
            ...prev,
            offers: prev.offers.map((offer) =>
              offer._id === offerId ? { ...offer, isClaimed: true } : offer
            ),
          }));
        }
      }
    } catch (err) {
      if (isMounted.current) {
        Alert.alert("Notice", err.response?.data?.message || "Error claiming offer");
      }
    }
  }, [isGuest, token, brands, selectedBrand, showSuccessAnimation, closeModal, navigation]);

  // Memoized filtered data
  const filteredData = useMemo(() => {
    let results = brands;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter((brand) =>
        brand.name.toLowerCase().includes(query)
      );
    }
    
    if (minDiscount > 0) {
      results = results.filter((brand) => brand.discount >= minDiscount);
    }
    
    if (selectedCategory !== "all") {
      const categoryName = CATEGORIES.find(c => c.id === selectedCategory)?.name;
      if (categoryName) {
        results = results.filter((brand) => brand.category === categoryName);
      }
    }
    
    if (showOnlyOnline) {
      results = results.filter((brand) => brand.isOnline);
    }
    
    return results;
  }, [brands, searchQuery, minDiscount, selectedCategory, showOnlyOnline]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  
  const displayedBrands = useMemo(() => {
    if (limit) return filteredData.slice(0, limit);
    return filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredData, currentPage, limit]);

  const currentOffer = selectedBrand?.offers?.[0];

  const renderBrand = useCallback(({ item, index }) => (
    <BrandCard
      item={item}
      index={index}
      onPress={openModal}
      preloadImage={preloadImage}
    />
  ), [openModal, preloadImage]);

  const keyExtractor = useCallback((item) => item._id, []);

  const renderFooter = useCallback(() => {
    if (limit) {
      if (filteredData.length <= limit) return <View style={{ height: 20 }} />;
      return (
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => navigation.navigate("Brands")}
        >
          <Text style={styles.viewAllText}>View All Brands</Text>
        </TouchableOpacity>
      );
    }
    if (totalPages <= 1) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.paginationRow}>
        <TouchableOpacity
          disabled={currentPage === 1}
          style={[styles.pageBtn, currentPage === 1 && styles.disabledPageBtn]}
          onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        >
          <Text style={styles.pageBtnText}>Prev</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>
          {currentPage} of {totalPages}
        </Text>
        <TouchableOpacity
          disabled={currentPage === totalPages}
          style={[styles.pageBtn, currentPage === totalPages && styles.disabledPageBtn]}
          onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
        >
          <Text style={styles.pageBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  }, [limit, filteredData.length, totalPages, currentPage, navigation]);

  // Enhanced Loading State with improved skeletons
  if (loading && brands.length === 0) {
    return (
      <SafeAreaView style={styles.mainSafeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.welcomeText}>
                {isGuest ? "Guest User" : (user?.university?.name || "Loading...")}
              </Text>
              <Text style={styles.title}>Crew's Privilege Brands</Text>
            </View>
            <View style={styles.filterTriggerSkeleton} />
          </View>
        </View>
        
        <CategorySkeleton />
        
        <View style={styles.skeletonGridContainer}>
          <FlatList
            data={[1, 2, 3, 4, 5, 6]}
            keyExtractor={(item) => `skeleton-${item}`}
            renderItem={({ index }) => <SkeletonCard index={index} />}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            scrollEnabled={false}
            contentContainerStyle={styles.skeletonListContent}
          />
        </View>
        
        {loadingProgress > 0 && loadingProgress < 100 && (
          <View style={styles.loadingProgressContainer}>
            <View style={styles.loadingProgressBar}>
              <View style={[styles.loadingProgressFill, { width: `${loadingProgress}%` }]} />
            </View>
            <Text style={styles.loadingProgressText}>{Math.round(loadingProgress)}%</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Animated.View
        style={[
          styles.fadeContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Guest Banner */}
        {isGuest && (
          <View style={styles.guestBanner}>
            <Ionicons name="information-circle" size={20} color="#1a1a1a" />
            <Text style={styles.guestBannerText}>
              Browsing as guest. Sign in to claim offers!
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={displayedBrands}
          keyExtractor={keyExtractor}
          removeClippedSubviews={true}
          renderItem={renderBrand}
          windowSize={5}
          maxToRenderPerBatch={6}
          initialNumToRender={6}
          updateCellsBatchingPeriod={30}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.columnWrapper}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={
            <>
              <View style={styles.headerContainer}>
                <View style={styles.headerTopRow}>
                  <View>
                    <Text style={styles.welcomeText}>
                      {isGuest ? "Guest User" : (user?.university?.name || "No University Assigned")}
                    </Text>
                    <Text style={styles.title}>Crew's Privilege Brands</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.filterTrigger}
                    onPress={openFilterModal}
                  >
                    <MaterialCommunityIcons name="tune-variant" size={18} color="#000000" />
                  </TouchableOpacity>
                </View>
                {query && (
                  <View style={styles.searchIndicatorRow}>
                    <Text style={styles.searchIndicatorText}>
                      Showing results for: <Text style={{ fontWeight: 'bold', color: '#f9c349' }}>"{query}"</Text>
                    </Text>
                    <TouchableOpacity onPress={() => {
                      setSearchQuery("");
                      navigation.setParams({ query: undefined });
                    }}>
                      <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              {/* Category Grid */}
              <View style={styles.categoryGridContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryGridScroll}
                >
                  {CATEGORIES.map((category) => (
                    <CategoryGridItem
                      key={category.id}
                      category={category}
                      isSelected={selectedCategory === category.id}
                      onPress={(id) => {
                        setSelectedCategory(id);
                        setCurrentPage(1);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            </>
          }
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          scrollEnabled={!limit || displayedBrands.length > 0}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* FILTER MODAL */}
      <Modal
        visible={filterModalVisible}
        transparent
        statusBarTranslucent
        onRequestClose={closeFilterModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.dismissArea}
            activeOpacity={1}
            onPress={closeFilterModal}
          />
          <Animated.View
            style={[
              styles.filterModalContainer,
              { transform: [{ translateY: filterSlideAnim }] },
            ]}
          >
            <View style={styles.modalIndicator} />
            <View style={styles.modalHeader}>
              <Text style={styles.filterHeader}>Refine Search</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory("all");
                  setMinDiscount(0);
                  setShowOnlyOnline(false);
                }}
              >
                <Text style={styles.resetText}>Reset All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={styles.filterLabel}>Categories</Text>
              <View style={styles.filterCategoriesGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.filterCategoryItem,
                      selectedCategory === cat.id && styles.filterCategoryItemActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <MaterialCommunityIcons 
                      name={cat.icon} 
                      size={20} 
                      color={selectedCategory === cat.id ? "#fff" : cat.color} 
                    />
                    <Text style={[
                      styles.filterCategoryItemText,
                      selectedCategory === cat.id && styles.filterCategoryItemTextActive
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Minimum Discount</Text>
              <View style={styles.filterChipRow}>
                {DISCOUNT_OPTIONS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.chip, minDiscount === val && styles.activeChip]}
                    onPress={() => setMinDiscount(val)}
                  >
                    <Text
                      style={[styles.chipText, minDiscount === val && styles.activeChipText]}
                    >
                      {val === 0 ? "Any" : `${val}% Off`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.toggleRow}
                activeOpacity={0.7}
                onPress={() => setShowOnlyOnline(!showOnlyOnline)}
              >
                <View>
                  <Text style={styles.toggleTitle}>Show Online Only</Text>
                  <Text style={styles.toggleSubtitle}>
                    Only show deals available on websites
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showOnlyOnline ? "toggle-switch" : "toggle-switch-off"}
                  size={45}
                  color={showOnlyOnline ? "#08634f" : "#CCC"}
                />
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  setCurrentPage(1);
                  closeFilterModal();
                }}
              >
                <Text style={styles.applyBtnText}>Show Results</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* BRAND DETAIL MODAL */}
      {selectedBrand && (
        <Modal 
          visible={modalVisible} 
          transparent
          onRequestClose={closeModal}
          animationType="none"
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={closeModal}
          >
            <Animated.View 
              style={[
                styles.modalContainerFixed,
                { transform: [{ translateY: modalSlideAnim }] },
              ]}
            >
              <Pressable style={styles.modalContentWrapper} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalIndicator} />
                
                {showSuccess && (
                  <Animated.View
                    style={[
                      styles.successOverlay,
                      {
                        transform: [{ scale: successScaleAnim }],
                        opacity: successScaleAnim,
                      },
                    ]}
                  >
                    <View style={styles.successCard}>
                      <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="check-decagram" size={50} color="#f9c349" />
                      </View>
                      <Text style={styles.successTitle}>Offer Saved!</Text>
                      <Text style={styles.successSubtext}>
                        Your student discount has been added to your wallet.
                      </Text>
                    </View>
                  </Animated.View>
                )}

                <ScrollView 
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                >
                  <View style={styles.brandDetailHeader}>
                    <View style={styles.modalLogoCircle}>
                      <Image
                        source={{ uri: currentOffer?.image || selectedBrand.displayImage }}
                        style={styles.modalImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.modalTitle}>{selectedBrand.name}</Text>
                    <View style={styles.modalCategoryBadge}>
                      <MaterialIcons name="category" size={16} color="black" />
                      <Text style={styles.modalCategoryText}>
                        {selectedBrand.category}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tabContainer}>
                    {["gift", "redeem", "location"].map((tab) => (
                      <Pressable
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tabItem, activeTab === tab && styles.activeTabCard]}
                      >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                          {tab === "gift" ? "Details" : tab === "redeem" ? "Redeem" : "Locate"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {activeTab === "gift" && (
                    <View style={styles.tabContentWrapper}>
                      <Text style={styles.tabContentTitle}>Offer Details</Text>
                      <Text style={styles.tabContentText}>
                        {currentOffer?.description || "Explore this iconic destination. Get exclusive student discounts on your favorite products and services."}
                      </Text>
                      
                      {isGuest && (
                        <TouchableOpacity 
                          style={styles.guestPromptCard}
                          onPress={() => {
                            closeModal();
                            setTimeout(() => navigation.navigate('Login'), 300);
                          }}
                        >
                          <MaterialCommunityIcons name="account-plus" size={24} color="#f9c349" />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.guestPromptTitle}>Unlock Full Benefits</Text>
                            <Text style={styles.guestPromptText}>Sign in to claim offers and get student discounts!</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#f9c349" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {activeTab === "redeem" && (
                    <View style={styles.tabContentWrapper}>
                      <View style={styles.instructionHeader}>
                        <MaterialCommunityIcons name="ticket-confirmation-outline" size={24} color="#000000" />
                        <Text style={styles.instructionTitle}>How to Redeem</Text>
                      </View>
                      <Text style={styles.tabContentText}>
                        {currentOffer?.redeemInstructions ||
                          "1. Show your valid student ID at the counter\n2. Mention you're a Crew Privilege member\n3. Enjoy your discount!"}
                      </Text>
                    </View>
                  )}

                  {activeTab === "location" && (
                    <View style={styles.tabContentWrapper}>
                      <View style={styles.locationInfoRow}>
                        <MaterialCommunityIcons name="map-marker-radius" size={24} color="#000000" />
                        <Text style={styles.locationAddressText}>
                          {currentOffer?.location || "Address not specified"}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => openMap(currentOffer?.location || selectedBrand.name)}
                      >
                        <MaterialCommunityIcons name="directions" size={20} color="#fff" />
                        <Text style={styles.mapButtonText}>Open in Maps</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActionRow}>
                  <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                  {currentOffer ? (
                    <TouchableOpacity
                      style={[styles.buyBtn, currentOffer.isClaimed && styles.claimedBtn]}
                      disabled={currentOffer.isClaimed}
                      onPress={() => claimOffer(currentOffer._id)}
                    >
                      <Text style={styles.buyBtnText}>
                        {currentOffer.isClaimed ? "Already Saved" : "Save Offer Now"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.buyBtn, styles.claimedBtn]}
                      disabled={true}
                    >
                      <Text style={styles.buyBtnText}>
                        No Offers Available
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainSafeArea: { flex: 1, backgroundColor: "#fff" },
  fadeContainer: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 10 },
  welcomeText: { fontSize: 11, color: "#676363", fontWeight: "900", textTransform: "uppercase", fontFamily: "Cardo" },
  title: { fontSize: 26, fontWeight: "900", color: "#000000", fontFamily: "Cardo" },
  listContent: { paddingBottom: 20 },
  columnWrapper: { justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 15 },
  cardWrapper: { width: CARD_WIDTH },
  card: { backgroundColor: "#fff", borderRadius: 22, width: "100%", padding: 15, alignItems: "center", borderWidth: 1, borderColor: "#F0F0F0", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  availabilityWrapper: { position: "absolute", top: 12, left: 12, flexDirection: "row", zIndex: 1 },
  discountBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "#ffffff", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 1 },
  discountText: { fontSize: 12, fontWeight: "900", color: "#f9c349", fontFamily: "Cardo" },
  logoContainer: { width: "100%", height: 100, marginTop: 24, marginBottom: 10, justifyContent: "center", alignItems: "center" },
  logo: { width: "100%", height: "100%", resizeMode: "contain", borderRadius: 20 },
  infoContainer: { alignItems: "center", width: "100%" },
  name: { fontSize: 14, fontWeight: "800", color: "#000000", fontFamily: "Cardo", textAlign: "center" },
  offerStatusText: { fontSize: 10, color: "#bbb", marginTop: 4 },
  offerStatusClaimed: { color: "#f9c349", fontWeight: "bold" },
  
  // Enhanced Skeleton Styles
  skeletonCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    width: '100%',
    padding: 15,
    height: 210,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    position: 'relative',
  },
  skeletonAvailability: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  skeletonDiscount: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  skeletonLogo: {
    width: '80%',
    height: 80,
    backgroundColor: '#e8e8e8',
    borderRadius: 16,
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  skeletonInfo: {
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  skeletonName: {
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    width: '70%',
    marginBottom: 6,
  },
  skeletonCategory: {
    height: 10,
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
    width: '50%',
    marginBottom: 6,
  },
  skeletonOfferStatus: {
    height: 10,
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
    width: '60%',
  },
  
  // Category Skeleton
  skeletonCategoryItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
    marginRight: 10,
  },
  skeletonCategoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8e8e8',
    marginBottom: 6,
  },
  skeletonCategoryText: {
    width: 50,
    height: 10,
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
  },
  
  // Loading Progress
  loadingProgressContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    padding: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingProgressBar: {
    width: 120,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingProgressFill: {
    height: '100%',
    backgroundColor: '#f9c349',
    borderRadius: 3,
  },
  loadingProgressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 30,
  },
  
  // Category Grid Styles
  categoryGridContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: 5,
  },
  categoryGridScroll: {
    paddingVertical: 5,
    gap: 10,
  },
  categoryGridItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 50,
    marginRight: 5,
  },
  categoryGridItemActive: {
    borderColor: '#000000',
    borderWidth: 2,
  },
  categoryIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIconWrapperActive: {
    backgroundColor: '#000000',
  },
  categoryGridName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    maxWidth: 70,
  },
  categoryGridNameActive: {
    color: '#000000',
    fontWeight: '700',
  },
  
  // Filter Categories Grid
  filterCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  filterCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F5F7F6',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minWidth: '30%',
  },
  filterCategoryItemActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  filterCategoryItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginLeft: 6,
  },
  filterCategoryItemTextActive: {
    color: '#fff',
  },
  
  viewAllButton: { marginHorizontal: 20, paddingVertical: 15, backgroundColor: "#000000", borderRadius: 20, alignItems: "center", marginBottom: 10 },
  viewAllText: { color: "#ffffff", fontWeight: "800", fontFamily: "Cardo", fontSize: 13, letterSpacing: 1.1 },
  paginationRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: 15, paddingBottom: 80 },
  pageBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#000000", borderRadius: 12, marginHorizontal: 15 },
  disabledPageBtn: { backgroundColor: "#ccc" },
  pageBtnText: { color: "#fff", fontWeight: "700" },
  pageInfo: { fontFamily: "Cardo", fontSize: 14, fontWeight: "700", color: "#000000" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContainerFixed: { 
    height: "88%", 
    backgroundColor: "#fff", 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35,
  },
  modalContentWrapper: { 
    flex: 1,
    padding: 25,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  tabContentWrapper: {
    marginTop: 15,
    paddingHorizontal: 5,
  },
  filterModalContainer: { backgroundColor: "#fff", borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: "85%" },
  modalIndicator: { width: 45, height: 5, backgroundColor: "#E0E0E0", borderRadius: 10, alignSelf: "center", marginBottom: 25 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  filterHeader: { fontSize: 22, fontWeight: "900", color: "#000000", fontFamily: "Cardo" },
  resetText: { color: "#000000", fontWeight: "600", fontSize: 14 },
  brandDetailHeader: { alignItems: "center", marginBottom: 10 },
  modalLogoCircle: { width: "100%", height: 150, borderRadius: 20, backgroundColor: "#F7F9F8", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  modalImage: { width: "80%", height: "80%", resizeMode: "contain" },
  modalTitle: { fontSize: 24, fontWeight: "900", color: "#000000", marginTop: 15, textAlign: "center" },
  modalCategoryBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  modalCategoryText: { fontSize: 10, color: "#000000", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, marginLeft: 6 },
  tabContainer: { flexDirection: "row", backgroundColor: "#F0F2F1", borderRadius: 18, padding: 6, marginBottom: 10, marginTop: 10 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 14 },
  activeTabCard: { backgroundColor: "#fff", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  tabText: { fontSize: 13, color: "#999", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  activeTabText: { color: "#000000" },
  tabContentTitle: { fontSize: 18, fontWeight: "bold", color: "#000000", marginBottom: 10 },
  tabContentText: { fontSize: 14, color: "#666", lineHeight: 20 },
  instructionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  instructionTitle: { fontSize: 18, fontWeight: "bold", color: "#000000" },
  locationInfoRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  locationAddressText: { fontSize: 15, color: "#333", marginLeft: 10, flexShrink: 1 },
  mapButton: { flexDirection: "row", backgroundColor: "#000000", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 15, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  mapButtonText: { color: "#fff", fontWeight: "700", marginLeft: 8, fontSize: 14 },
  modalActionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 15, paddingBottom: 10 },
  closeBtn: { flex: 0.4, paddingVertical: 16, borderRadius: 20, backgroundColor: "#F2F2F2", alignItems: "center" },
  closeBtnText: { color: "#777", fontWeight: "700" },
  buyBtn: { flex: 0.6, paddingVertical: 16, borderRadius: 20, backgroundColor: "#000000", alignItems: "center" },
  claimedBtn: { backgroundColor: "#ccc" },
  buyBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  successOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 1000 },
  successCard: { width: width * 0.8, backgroundColor: "#fff", borderRadius: 30, padding: 30, alignItems: "center", elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#000000", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: "900", color: "#000000", textAlign: "center", marginBottom: 10 },
  successSubtext: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  filterTrigger: { flexDirection: "row", alignItems: "center", backgroundColor: "#F7F9F8", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E0E0E0" },
  filterTriggerSkeleton: { width: 40, height: 36, backgroundColor: "#f0f0f0", borderRadius: 12 },
  filterLabel: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 15, marginBottom: 10 },
  dismissArea: { flex: 1 },
  filterChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: "#F5F7F6", borderWidth: 1, borderColor: "#F0F0F0" },
  activeChip: { backgroundColor: "#010101", borderColor: "#000000" },
  chipText: { color: "#555", fontSize: 14, fontWeight: "600" },
  activeChipText: { color: "#fff" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 25 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  toggleSubtitle: { fontSize: 13, color: "#888", marginTop: 2 },
  modalFooter: { borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 20, marginTop: 10 },
  applyBtn: { backgroundColor: "#000000", paddingVertical: 18, borderRadius: 16, alignItems: "center" },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  categoryBadgeCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#f1f5f9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, borderWidth: 0.5 },
  categoryCardText: { fontSize: 10, color: "#000000", fontWeight: "600", textTransform: "uppercase", paddingLeft: 2 },
  searchIndicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, marginBottom: 10, marginHorizontal: 5 },
  searchIndicatorText: { fontSize: 14, color: '#666' },
  skeletonGridContainer: { flex: 1 },
  skeletonListContent: { paddingBottom: 20 },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f9c34930'
  },
  guestBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1a1a1a',
    marginLeft: 8,
    fontWeight: '500'
  },
  signInLink: {
    color: '#f9c349',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 8
  },
  guestPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  guestPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2
  },
  guestPromptText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16
  },
});