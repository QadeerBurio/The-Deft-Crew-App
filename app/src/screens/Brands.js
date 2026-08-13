// screens/Brands.js - ULTRA OPTIMIZED VERSION WITH 2-SEC LOADER
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
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get("window");
const NUM_COLUMNS = 2;
const HORIZONTAL_PADDING = 20;
const GAP = 15;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - GAP) / NUM_COLUMNS;

// ENHANCED CATEGORIES
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

// CACHE CONFIGURATION
const BASE_URL = 'https://the-deft-crew-production.up.railway.app';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const API_TIMEOUT = 5000;
const LOADER_MIN_DURATION = 2000; // 2 seconds minimum loader

// Global cache with pre-loaded data
let brandsCache = null;
let cacheTimestamp = null;
let pendingFetchPromise = null;
let preloadedImages = new Set();

// Image preloading queue
const imagePreloadQueue = new Set();
const MAX_PRELOAD = 12;

// ==========================================
// OPTIMIZED CATEGORY GRID ITEM
// ==========================================
const CategoryGridItem = memo(({ category, isSelected, onPress }) => (
  <TouchableOpacity
    style={[
      styles.categoryGridItem,
      isSelected && styles.categoryGridItemActive,
    ]}
    onPress={() => onPress(category.id)}
    activeOpacity={0.7}
  >
    <View style={[
      styles.categoryIconWrapper,
      isSelected && styles.categoryIconWrapperActive,
      { backgroundColor: isSelected ? category.color : category.bgColor }
    ]}>
      <MaterialCommunityIcons 
        name={category.icon} 
        size={20} 
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
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const categoryColor = useMemo(() => {
    const cat = CATEGORIES.find(c => c.name === item.category);
    return cat?.color || "#000000";
  }, [item.category]);
  
  useEffect(() => {
    if (displayImage && !preloadedImages.has(displayImage)) {
      preloadedImages.add(displayImage);
      Image.prefetch(displayImage).catch(() => {});
    }
  }, [displayImage]);
  
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
            <MaterialCommunityIcons name="earth" size={12} color="#f9c349" style={{ marginRight: 3 }} />
          )}
          {item.isInStore && (
            <MaterialCommunityIcons name="storefront-outline" size={12} color="#f9c349" />
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
            onError={() => {}}
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.categoryBadgeCard, { borderColor: categoryColor + '40' }]}>
            <MaterialIcons name="category" size={8} color={categoryColor} />
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
            {firstOffer?.isClaimed ? "✓ Claimed" : item.hasOffer ? "Student's Offer" : "No Offers"}
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

// ==========================================
// CLAIM SUCCESS MODAL
// ==========================================
const ClaimSuccessModal = ({ visible, onClose, brandName, discount }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);
  
  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      scaleAnim.setValue(0);
      onClose();
    });
  };
  
  if (!visible) return null;
  
  return (
    <Modal transparent visible={visible} animationType="none">
      <Pressable style={styles.successOverlay} onPress={handleClose}>
        <Animated.View 
          style={[
            styles.successCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <Pressable style={{ alignItems: 'center', width: '100%' }} onPress={(e) => e.stopPropagation()}>
            <View style={styles.successIconCircle}>
              <LinearGradient
                colors={['#f9c349', '#f5a623']}
                style={styles.successIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="check-decagram" size={50} color="#fff" />
              </LinearGradient>
            </View>
            
            <Text style={styles.successTitle}>🎉 Offer Claimed!</Text>
            
            {brandName && (
              <Text style={styles.successBrandName}>{brandName}</Text>
            )}
            
            {discount > 0 && (
              <View style={styles.successDiscountBadge}>
                <Text style={styles.successDiscountText}>{discount}% OFF</Text>
              </View>
            )}
            
            <Text style={styles.successSubtext}>
              Your student discount has been added to your wallet.
            </Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// ==========================================
// LOADING OVERLAY WITH MIN 2 SECONDS
// ==========================================
const LoadingOverlay = ({ visible, message, minimumDuration = LOADER_MIN_DURATION }) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [shouldShow, setShouldShow] = useState(false);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      startTimeRef.current = Date.now();
      setShouldShow(true);
      
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Ensure minimum duration
      const elapsed = Date.now() - (startTimeRef.current || 0);
      const remaining = Math.max(0, minimumDuration - elapsed);
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      timerRef.current = setTimeout(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShouldShow(false);
        });
      }, remaining);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, minimumDuration]);

  if (!shouldShow && !visible) return null;
  
  return (
    <Animated.View style={[styles.loadingOverlay, { opacity: overlayOpacity }]}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>{message || "Loading brands..."}</Text>
        <View style={styles.loadingDots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.loadingDot} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

// ==========================================
// MAIN BRANDS SCREEN
// ==========================================
export default function BrandsScreen({ limit = null }) {
  const navigation = useNavigation();
  const { token, user, isGuest } = useContext(AuthContext);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedBrand, setSelectedBrand] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  const [claimSuccessVisible, setClaimSuccessVisible] = useState(false);
  const [claimedBrandName, setClaimedBrandName] = useState('');
  const [claimedDiscount, setClaimedDiscount] = useState(0);

  const [activeTab, setActiveTab] = useState("gift");
  const [currentPage, setCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [minDiscount, setMinDiscount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const modalSlideAnim = useRef(new Animated.Value(height)).current;
  const filterSlideAnim = useRef(new Animated.Value(height)).current;

  const route = useRoute();
  const { query } = route.params || {};
  const isMounted = useRef(true);
  const abortControllerRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const initialLoadDone = useRef(false);

  // Loading overlay visibility
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

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
  // IMAGE URL FORMATTER
  // ==========================================
  const formatImageUrl = useCallback((imagePath, type = 'offer') => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    const cleanPath = imagePath.replace(/^\/+/, '');
    
    if (type === 'brand') {
      if (cleanPath.startsWith('uploads/brands/')) {
        return `${BASE_URL}/${cleanPath}`;
      }
      return `${BASE_URL}/uploads/brands/${cleanPath}`;
    }
    
    if (cleanPath.startsWith('uploads/')) {
      return `${BASE_URL}/${cleanPath}`;
    }
    return `${BASE_URL}/${cleanPath}`;
  }, []);

  const preloadImage = useCallback((url) => {
    if (!url || preloadedImages.has(url) || imagePreloadQueue.size >= MAX_PRELOAD) return;
    imagePreloadQueue.add(url);
    Image.prefetch(url).then(() => {
      preloadedImages.add(url);
    }).catch(() => {});
  }, []);

  // ==========================================
  // ULTRA FAST FETCH BRANDS WITH LOADER
  // ==========================================
  const fetchBrands = useCallback(async (forceRefresh = false) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    // Check cache first - IMMEDIATE RETURN
    if (!forceRefresh && brandsCache && cacheTimestamp && 
        (Date.now() - cacheTimestamp) < CACHE_DURATION && brandsCache.length > 0) {
      if (isMounted.current) {
        setBrands(brandsCache);
        setLoading(false);
        setError(null);
        setShowLoadingOverlay(false);
        // Preload images in background
        requestAnimationFrame(() => {
          brandsCache.slice(0, MAX_PRELOAD).forEach(brand => {
            if (brand.displayImage) preloadImage(brand.displayImage);
          });
        });
      }
      return brandsCache;
    }

    if (pendingFetchPromise) {
      try {
        const result = await pendingFetchPromise;
        if (isMounted.current && result) {
          setBrands(result);
          setLoading(false);
          setError(null);
          setShowLoadingOverlay(false);
        }
        return result;
      } catch (err) {
        pendingFetchPromise = null;
      }
    }

    if (!token && !isGuest) {
      if (isMounted.current) {
        setLoading(false);
        setError('Please login to view brands');
        setShowLoadingOverlay(false);
      }
      return [];
    }

    // Show loading overlay for initial load or when no cache
    if (!initialLoadDone.current || !brandsCache) {
      setShowLoadingOverlay(true);
      setLoading(true);
    } else {
      setLoading(false);
    }
    setError(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    pendingFetchPromise = (async () => {
      try {
        const headers = token && !isGuest ? { Authorization: `Bearer ${token}` } : {};
        
        const fetchPromise = api.get("/brands", {
          headers: headers,
          signal: abortControllerRef.current.signal,
          params: { limit: 100 },
          timeout: API_TIMEOUT
        });

        const timeoutPromise = new Promise((_, reject) => {
          fetchTimeoutRef.current = setTimeout(() => {
            reject(new Error('Request timeout'));
          }, API_TIMEOUT);
        });

        const brandsRes = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
        
        let brandsData = brandsRes?.data || [];
        
        if (!brandsData || brandsData.length === 0) {
          if (isMounted.current) {
            setBrands([]);
            brandsCache = [];
            cacheTimestamp = Date.now();
            setLoading(false);
            setError(null);
            setShowLoadingOverlay(false);
            initialLoadDone.current = true;
          }
          pendingFetchPromise = null;
          return [];
        }
        
        // Guest flow
        if (isGuest || !token) {
          const basicBrandsData = brandsData.map((brand) => {
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
            setLoading(false);
            setError(null);
            setShowLoadingOverlay(false);
            initialLoadDone.current = true;
            
            requestAnimationFrame(() => {
              basicBrandsData.slice(0, MAX_PRELOAD).forEach(brand => {
                if (brand.displayImage) preloadImage(brand.displayImage);
              });
            });
          }
          
          pendingFetchPromise = null;
          return basicBrandsData;
        }
        
        // Logged-in user: fetch offers in parallel
        const offersPromises = brandsData.map(brand =>
          api.get(`/offers/brand/${brand._id}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: abortControllerRef.current.signal,
            timeout: 2500
          }).then(res => ({ brandId: brand._id, offers: res.data }))
            .catch(() => ({ brandId: brand._id, offers: [] }))
        );
        
        const allOffersResults = await Promise.all(offersPromises);
        
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

        const brandsWithOffers = brandsData.map((brand) => {
          const brandOffers = offersMap.get(brand._id) || [];
          const firstOffer = brandOffers[0];
          
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
            brandApprovalStatus: brand.brandApprovalStatus || 'approved',
          };
        });

        if (isMounted.current) {
          setBrands(brandsWithOffers);
          brandsCache = brandsWithOffers;
          cacheTimestamp = Date.now();
          setLoading(false);
          setError(null);
          setShowLoadingOverlay(false);
          initialLoadDone.current = true;
          
          requestAnimationFrame(() => {
            brandsWithOffers.slice(0, MAX_PRELOAD).forEach(brand => {
              if (brand.displayImage) preloadImage(brand.displayImage);
            });
          });
        }
        
        pendingFetchPromise = null;
        return brandsWithOffers;
      } catch (err) {
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }

        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
          pendingFetchPromise = null;
          setShowLoadingOverlay(false);
          return brandsCache || [];
        }

        if (err.message === 'Request timeout') {
          if (isMounted.current) {
            setError('Request timed out. Please try again.');
            if (brandsCache && brandsCache.length > 0) {
              setBrands(brandsCache);
              setLoading(false);
              setShowLoadingOverlay(false);
              initialLoadDone.current = true;
              pendingFetchPromise = null;
              return brandsCache;
            }
          }
          pendingFetchPromise = null;
          setShowLoadingOverlay(false);
          return [];
        }

        if (isMounted.current) {
          setError('Failed to load brands. Please try again.');
          if (brandsCache && brandsCache.length > 0) {
            setBrands(brandsCache);
            setLoading(false);
            setShowLoadingOverlay(false);
            initialLoadDone.current = true;
            pendingFetchPromise = null;
            return brandsCache;
          }
          setLoading(false);
          setShowLoadingOverlay(false);
        }
        pendingFetchPromise = null;
        return [];
      }
    })();

    return pendingFetchPromise;
  }, [token, isGuest, userId, formatImageUrl, preloadImage]);

  useFocusEffect(
    useCallback(() => {
      // Immediate render from cache
      if (brandsCache && brandsCache.length > 0) {
        setBrands(brandsCache);
        setLoading(false);
        setError(null);
        setShowLoadingOverlay(false);
      } else {
        // No cache - show loader
        setShowLoadingOverlay(true);
      }
      
      // Then fetch in background
      const timeout = setTimeout(() => {
        fetchBrands(true);
      }, 50);
      
      if (query) {
        setSearchQuery(query);
      }
      
      return () => clearTimeout(timeout);
    }, [fetchBrands, query]),
  );

  useEffect(() => {
    setCurrentPage(1);
    setShowAllBrands(false);
  }, [searchQuery, selectedCategory, minDiscount, showOnlyOnline]);

  // ==========================================
  // HANDLERS
  // ==========================================
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
      duration: 250,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      if (isMounted.current) {
        setModalVisible(false);
        setSelectedBrand(null);
        modalSlideAnim.setValue(height);
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
      duration: 250,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      if (isMounted.current) {
        setFilterModalVisible(false);
        filterSlideAnim.setValue(height);
      }
    });
  }, [height, filterSlideAnim]);

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
    cacheTimestamp = null;
    brandsCache = null;
    preloadedImages.clear();
    await fetchBrands(true);
    setRefreshing(false);
  }, [fetchBrands]);

  // ==========================================
  // CLAIM OFFER
  // ==========================================
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
      setShowLoadingOverlay(true);
      
      await api.post(
        `/offers/claim/${offerId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const brand = selectedBrand;
      setClaimedBrandName(brand?.name || '');
      setClaimedDiscount(brand?.discount || 0);
      setClaimSuccessVisible(true);
      setShowLoadingOverlay(false);

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

      setTimeout(() => {
        setClaimSuccessVisible(false);
        closeModal();
        setTimeout(() => {
          navigation.navigate('MyDiscountScreen');
        }, 300);
      }, 2500);

    } catch (err) {
      setShowLoadingOverlay(false);
      if (isMounted.current) {
        Alert.alert("Notice", err.response?.data?.message || "Error claiming offer");
      }
    }
  }, [isGuest, token, brands, selectedBrand, closeModal, navigation]);

  // ==========================================
  // FILTERS & DATA
  // ==========================================
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

  const displayedBrands = useMemo(() => {
    if (showAllBrands) {
      return filteredData;
    }
    return filteredData.slice(0, 20);
  }, [filteredData, showAllBrands]);

  const currentOffer = selectedBrand?.offers?.[0];

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================
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
    if (filteredData.length === 0 && !loading) {
      return (
        <View style={styles.noResultsContainer}>
          <MaterialCommunityIcons name="ticket-off-outline" size={60} color="#ccc" />
          <Text style={styles.noResultsText}>No Brands Found</Text>
          <Text style={styles.noResultsSubText}>Try adjusting your filters</Text>
          <TouchableOpacity 
            style={styles.clearFiltersBtn}
            onPress={() => {
              setSelectedCategory("all");
              setMinDiscount(0);
              setShowOnlyOnline(false);
              setSearchQuery("");
            }}
          >
            <Text style={styles.clearFiltersBtnText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (showAllBrands || filteredData.length <= 20 || filteredData.length === 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.totalBrandsText}>
            Showing All {filteredData.length === 1 ? 'brand' : 'brands'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.showAllButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAllBrands(true);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f9c349', '#f5a623']}
            style={styles.showAllGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialCommunityIcons name="apps" size={18} color="#fff" />
            <Text style={styles.showAllText}>Show All brands</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.showingText}>Showing brands</Text>
      </View>
    );
  }, [filteredData.length, showAllBrands, loading]);

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <SafeAreaView style={styles.mainSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#9a979708" />
      
      {/* Loading Overlay - Min 2 seconds */}
      <LoadingOverlay 
        visible={showLoadingOverlay} 
        message={loading ? "Loading brands..." : "Processing..."}
        minimumDuration={LOADER_MIN_DURATION}
      />
      
      <Animated.View
        style={[
          styles.fadeContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.customHeaderCenter}>
            <Text style={styles.customHeaderTitle}>Brands</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.discountIconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('MyDiscountScreen');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.discountIconWrapper}>
                <MaterialCommunityIcons name="ticket-percent" size={22} color="#f9c349" />
                <View style={styles.discountBadgeDot} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Welcome Container */}
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeLeftContent}>
              <Text style={styles.welcomeTextAbove}>
                {isGuest ? "Guest User" : (user?.university?.name || "No University")}
              </Text>
              <Text style={styles.welcomeTitle}>Crew's Privilege Brands</Text>
            </View>
            <TouchableOpacity
              style={styles.welcomeFilterTrigger}
              onPress={openFilterModal}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="tune-variant" size={15} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>
        
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

        {/* Error Message */}
        {error && !loading && !showLoadingOverlay && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchBrands(true)} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={displayedBrands}
          keyExtractor={keyExtractor}
          removeClippedSubviews={true}
          renderItem={renderBrand}
          windowSize={3}
          maxToRenderPerBatch={8}
          initialNumToRender={8}
          updateCellsBatchingPeriod={20}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.columnWrapper}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={
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
                      setShowAllBrands(false);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          }
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* FILTER MODAL */}
      <Modal
        visible={filterModalVisible}
        transparent
        statusBarTranslucent
        onRequestClose={closeFilterModal}
        animationType="none"
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={closeFilterModal}
        >
          <Animated.View
            style={[
              styles.filterModalContainer,
              { transform: [{ translateY: filterSlideAnim }] },
            ]}
          >
            <Pressable style={styles.modalContentWrapper} onPress={(e) => e.stopPropagation()}>
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
                    closeFilterModal();
                    setCurrentPage(1);
                    setShowAllBrands(false);
                  }}
                >
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
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
                      <MaterialIcons name="category" size={14} color="black" />
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
                        <MaterialCommunityIcons name="directions" size={18} color="#fff" />
                        <Text style={styles.mapButtonText}>Open in Maps</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>

                {/* Modal Action Row */}
                <View style={styles.modalActionRow}>
                  <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                  {currentOffer ? (
                    <TouchableOpacity
                      style={[
                        styles.buyBtn,
                        currentOffer.isClaimed && styles.claimedBtn,
                      ]}
                      disabled={currentOffer.isClaimed}
                      onPress={() => claimOffer(currentOffer._id)}
                    >
                      <LinearGradient
                        colors={currentOffer.isClaimed ? ['#ccc', '#bbb'] : ['#f9c349', '#f5a623']}
                        style={styles.claimGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <MaterialCommunityIcons 
                          name={currentOffer.isClaimed ? "check-circle" : "gift"} 
                          size={20} 
                          color="#fff" 
                          style={styles.claimIcon}
                        />
                        <Text style={styles.buyBtnText}>
                          {currentOffer.isClaimed ? "✓ Claimed" : "Claim Discount"}
                        </Text>
                      </LinearGradient>
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

      {/* CLAIM SUCCESS MODAL */}
      <ClaimSuccessModal
        visible={claimSuccessVisible}
        onClose={() => setClaimSuccessVisible(false)}
        brandName={claimedBrandName}
        discount={claimedDiscount}
      />
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  mainSafeArea: { flex: 1, backgroundColor: "#fff" },
  fadeContainer: { flex: 1 },
  
  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.66)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  
  loadingText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f9c349',
    marginHorizontal: 4,
  },
  
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Cardo',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  welcomeContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeLeftContent: {
    flex: 1,
    flexDirection: 'column',
  },
  welcomeTextAbove: {
    fontSize: 14,
    color: "#676363",
    fontWeight: "600",
    fontFamily: "Cardo",
    marginBottom: 2,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Cardo',
  },
  welcomeFilterTrigger: {
    padding: 10,
    marginLeft: 12,
    backgroundColor: '#F7F9F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignSelf: 'center',
  },
  
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  discountIconBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  discountIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f9c349',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  
  listContent: { paddingBottom: 20 },
  columnWrapper: { justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 15 },
  cardWrapper: { width: CARD_WIDTH },
  card: { 
    backgroundColor: "#fff", 
    borderRadius: 22, 
    width: "100%", 
    padding: 7, 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "#F0F0F0", 
    elevation: 3, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8 
  },
  availabilityWrapper: { position: "absolute", top: 12, left: 12, flexDirection: "row", zIndex: 1 },
  discountBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "#ffffff", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 1 },
  discountText: { fontSize: 12, fontWeight: "900", color: "#f9c349", fontFamily: "Cardo" },
  logoContainer: { width: "100%", height: 100, marginTop: 24, marginBottom: 10, justifyContent: "center", alignItems: "center" },
  logo: { width: "100%", height: "100%", resizeMode: "contain", borderRadius: 20 },
  infoContainer: { alignItems: "center", width: "100%" },
  name: { fontSize: 14, fontWeight: "800", color: "#000000", fontFamily: "Cardo", textAlign: "center" },
  offerStatusText: { fontSize: 10, color: "#bbb", marginTop: 4 },
  offerStatusClaimed: { color: "#f9c349", fontWeight: "bold" },
  categoryBadgeCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#f1f5f9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, borderWidth: 0.5 },
  categoryCardText: { fontSize: 9, color: "#000000", fontWeight: "600", textTransform: "uppercase", paddingLeft: 2 },
  
  // Category Grid Styles
  categoryGridContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 2,
  },
  categoryGridScroll: {
    paddingVertical: 5,
    gap: 6,
  },
  categoryGridItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 14,
    minWidth: 44,
    marginRight: 4,
  },
  categoryGridItemActive: {
    borderColor: '#000000',
    borderWidth: 1.5,
  },
  categoryIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryIconWrapperActive: {
    backgroundColor: '#000000',
  },
  categoryGridName: {
    fontSize: 9,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    maxWidth: 52,
  },
  categoryGridNameActive: {
    color: '#000000',
    fontWeight: '700',
  },
  
  // Footer Styles
  footerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showAllButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
    elevation: 3,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  showAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  showAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  showingText: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
  totalBrandsText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  
  // No Results
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  noResultsSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  clearFiltersBtn: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearFiltersBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  
  // Error Container
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Modal Styles
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
  filterModalContainer: { 
    backgroundColor: "#fff", 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35, 
    padding: 25, 
    maxHeight: "85%",
    minHeight: "50%",
  },
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
  
  modalActionRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 20, 
    gap: 15, 
    paddingBottom: 10 
  },
  closeBtn: { 
    flex: 0.4, 
    paddingVertical: 16, 
    borderRadius: 20, 
    backgroundColor: "#F2F2F2", 
    alignItems: "center" 
  },
  closeBtnText: { color: "#777", fontWeight: "700" },
  
  buyBtn: { 
    flex: 0.6, 
    borderRadius: 20, 
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  claimIcon: {
    marginRight: 4,
  },
  claimedBtn: { 
    backgroundColor: "#ccc",
    elevation: 0,
    shadowOpacity: 0,
  },
  buyBtnText: { 
    color: "#fff", 
    fontWeight: "800", 
    fontSize: 14 
  },
  
  // Filter
  filterLabel: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 15, marginBottom: 10 },
  filterChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#F5F7F6", borderWidth: 1, borderColor: "#F0F0F0" },
  activeChip: { backgroundColor: "#010101", borderColor: "#000000" },
  chipText: { color: "#555", fontSize: 12, fontWeight: "600" },
  activeChipText: { color: "#fff" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 20 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  toggleSubtitle: { fontSize: 13, color: "#888", marginTop: 2 },
  modalFooter: { borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 20, marginTop: 10 },
  applyBtn: { backgroundColor: "#000000", paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  
  // Guest
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
  
  searchIndicatorRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#f0f0f0', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 10, 
    marginBottom: 10, 
    marginHorizontal: 20 
  },
  searchIndicatorText: { 
    fontSize: 14, 
    color: '#666' 
  },
  
  // Claim Success Modal
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCard: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  successIconCircle: {
    marginBottom: 20,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    marginBottom: 8,
  },
  successBrandName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  successDiscountBadge: {
    backgroundColor: '#f9c34920',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f9c34940',
  },
  successDiscountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f9c349',
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
});