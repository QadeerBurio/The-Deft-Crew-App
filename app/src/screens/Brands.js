// screens/Brands.js - ULTRA FAST + EXACT DISCOUNT FILTER + CLAIM SYNC + SMART AUTO-FETCH + AUTO-UPDATE STATS
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
  ScrollView,
  Platform,
  Animated,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import api, { optimizedAPI, onCacheEvent } from "../api/brandApi";
import { AuthContext } from "../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onOfferClaimed } from "./OfferScreen";

const { width, height } = Dimensions.get("window");
const NUM_COLUMNS = 2;
const HORIZONTAL_PADDING = 20;
const GAP = 15;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - GAP) / NUM_COLUMNS;

const BASE_URL = "https://the-deft-crew-production.up.railway.app";
const CACHE_KEY = "@brands_cache";
const STATS_CACHE_KEY = "@brands_stats_cache";
const CACHE_DURATION = 5 * 60 * 1000;
const PAGE_SIZE = 10;
const MAX_PRELOAD = 12;

// ── Auto-fetch tuning ────────────────────────────────
const POLL_INTERVAL = 20000;
const BACKGROUND_POLL_INTERVAL = 60000;
const STATS_POLL_INTERVAL = 15000;
const MIN_FETCH_GAP = 4000;

// ── Categories ─────────────────────────────────────────
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

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
const CATEGORY_BY_NAME = new Map(CATEGORIES.map((c) => [c.name, c]));

const DISCOUNT_OPTIONS = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50];

// Global caches
let brandsCache = null;
let cacheTimestamp = null;
let pendingFetchPromise = null;
let statsCache = null;
let statsCacheTimestamp = null;
const preloadedImages = new Set();

// ── Deep-diff helpers ──
const offersEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x._id !== y._id ||
      x.discountPercentage !== y.discountPercentage ||
      x.isClaimed !== y.isClaimed ||
      x.image !== y.image ||
      x.isOnline !== y.isOnline ||
      x.isInStore !== y.isInStore
    ) {
      return false;
    }
  }
  return true;
};

const brandsEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x._id !== y._id ||
      x.discount !== y.discount ||
      x.displayImage !== y.displayImage ||
      x.hasOffer !== y.hasOffer ||
      x.isOnline !== y.isOnline ||
      x.isInStore !== y.isInStore ||
      x.category !== y.category ||
      x.name !== y.name ||
      !offersEqual(x.offers, y.offers)
    ) {
      return false;
    }
  }
  return true;
};

const statsEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.totalBrands === b.totalBrands &&
    a.totalOffers === b.totalOffers &&
    a.claimedCount === b.claimedCount &&
    a.onlineCount === b.onlineCount &&
    a.inStoreCount === b.inStoreCount &&
    a.maxDiscount === b.maxDiscount
  );
};

// ==========================================
// CATEGORY ITEM
// ==========================================
const CategoryGridItem = memo(({ category, isSelected, onPress }) => (
  <TouchableOpacity
    style={[styles.categoryGridItem, isSelected && styles.categoryGridItemActive]}
    onPress={() => onPress(category.id)}
    activeOpacity={0.7}
  >
    <View
      style={[
        styles.categoryIconWrapper,
        isSelected && styles.categoryIconWrapperActive,
        { backgroundColor: isSelected ? category.color : category.bgColor },
      ]}
    >
      <MaterialCommunityIcons
        name={category.icon}
        size={20}
        color={isSelected ? "#fff" : category.color}
      />
    </View>
    <Text
      style={[styles.categoryGridName, isSelected && styles.categoryGridNameActive]}
      numberOfLines={1}
    >
      {category.name}
    </Text>
  </TouchableOpacity>
));

// ==========================================
// STATS BAR
// ==========================================
const StatsBar = memo(({ stats, loading }) => {
  if (loading && !stats) {
    return (
      <View style={styles.statsBarContainer}>
        <View style={styles.statsBarSkeleton} />
      </View>
    );
  }

  if (!stats) return null;

  return (
    <View style={styles.statsBarContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalBrands}</Text>
        <Text style={styles.statLabel}>Brands</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalOffers}</Text>
        <Text style={styles.statLabel}>Offers</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: "#f9c349" }]}>
          {stats.maxDiscount}%
        </Text>
        <Text style={styles.statLabel}>Max Off</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <View style={styles.liveDot} />
        <Text style={styles.statLabel}>Live</Text>
      </View>
    </View>
  );
});

// ==========================================
// BRAND CARD
// ==========================================
const BrandCard = memo(
  ({ item, onPress }) => {
    const firstOffer = item.offers?.[0];
    const displayImage = item.displayImage;
    const categoryColor = CATEGORY_BY_NAME.get(item.category)?.color || "#000000";
    const isClaimed = !!firstOffer?.isClaimed;

    useEffect(() => {
      if (displayImage && !preloadedImages.has(displayImage)) {
        preloadedImages.add(displayImage);
        Image.prefetch(displayImage).catch(() => {});
      }
    }, [displayImage]);

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => onPress(item)}
        >
          <View style={styles.availabilityWrapper}>
            {item.isOnline && (
              <MaterialCommunityIcons
                name="earth"
                size={12}
                color="#f9c349"
                style={{ marginRight: 3 }}
              />
            )}
            {item.isInStore && (
              <MaterialCommunityIcons
                name="storefront-outline"
                size={12}
                color="#f9c349"
              />
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
            />
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View
              style={[
                styles.categoryBadgeCard,
                { borderColor: categoryColor + "40" },
              ]}
            >
              <MaterialIcons name="category" size={8} color={categoryColor} />
              <Text style={[styles.categoryCardText, { color: categoryColor }]}>
                {item.category || "General"}
              </Text>
            </View>
            <Text
              style={[
                styles.offerStatusText,
                isClaimed && styles.offerStatusClaimed,
              ]}
            >
              {isClaimed
                ? "✓ Claimed"
                : item.hasOffer
                ? "Student's Offer"
                : "No Offers"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  },
  (prev, next) => {
    const prevClaimed = !!prev.item.offers?.[0]?.isClaimed;
    const nextClaimed = !!next.item.offers?.[0]?.isClaimed;

    return (
      prev.item._id === next.item._id &&
      prev.item.discount === next.item.discount &&
      prev.item.displayImage === next.item.displayImage &&
      prev.item.isOnline === next.item.isOnline &&
      prev.item.isInStore === next.item.isInStore &&
      prev.item.hasOffer === next.item.hasOffer &&
      prevClaimed === nextClaimed
    );
  }
);

// ==========================================
// MAIN SCREEN
// ==========================================
export default function BrandsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, user, isGuest } = useContext(AuthContext);
  const { query } = route.params || {};

  const [allBrands, setAllBrands] = useState([]);
  const [displayedBrands, setDisplayedBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [minDiscount, setMinDiscount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);

  const filterSlideAnim = useRef(new Animated.Value(height)).current;
  const isMounted = useRef(true);
  const isScreenFocused = useRef(false);
  const abortControllerRef = useRef(null);
  const initialLoadDone = useRef(false);
  const pollTimerRef = useRef(null);
  const statsPollTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const lastFetchAtRef = useRef(0);
  const lastStatsFetchAtRef = useRef(0);
  const isFetchingRef = useRef(false);
  const isStatsFetchingRef = useRef(false);

  const userId = useMemo(() => {
    if (!token || isGuest) return null;
    try {
      return JSON.parse(atob(token.split(".")[1])).id;
    } catch {
      return null;
    }
  }, [token, isGuest]);

  const formatImageUrl = useCallback((imagePath, type = "offer") => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
      return imagePath;
    const clean = imagePath.replace(/^\/+/, "");
    if (type === "brand") {
      return clean.startsWith("uploads/brands/")
        ? `${BASE_URL}/${clean}`
        : `${BASE_URL}/uploads/brands/${clean}`;
    }
    return `${BASE_URL}/${clean}`;
  }, []);

  const preloadImage = useCallback((url) => {
    if (!url || preloadedImages.has(url)) return;
    preloadedImages.add(url);
    Image.prefetch(url).catch(() => {});
  }, []);

  const computeStatsFromBrands = useCallback((brands) => {
    if (!brands || !Array.isArray(brands)) {
      return {
        totalBrands: 0,
        totalOffers: 0,
        claimedCount: 0,
        onlineCount: 0,
        inStoreCount: 0,
        maxDiscount: 0,
      };
    }

    let totalOffers = 0;
    let claimedCount = 0;
    let onlineCount = 0;
    let inStoreCount = 0;
    let maxDiscount = 0;

    for (const b of brands) {
      if (b.hasOffer) totalOffers++;
      if (b.offers?.[0]?.isClaimed) claimedCount++;
      if (b.isOnline) onlineCount++;
      if (b.isInStore) inStoreCount++;
      if (b.discount > maxDiscount) maxDiscount = b.discount;
    }

    return {
      totalBrands: brands.length,
      totalOffers,
      claimedCount,
      onlineCount,
      inStoreCount,
      maxDiscount,
    };
  }, []);

  const updateStatsFromLocal = useCallback((brands) => {
    const computed = computeStatsFromBrands(brands);
    setStats((prev) => (statsEqual(prev, computed) ? prev : computed));
    setStatsLoading(false);

    statsCache = computed;
    statsCacheTimestamp = Date.now();
    AsyncStorage.setItem(
      STATS_CACHE_KEY,
      JSON.stringify({ data: computed, timestamp: Date.now() })
    ).catch(() => {});

    return computed;
  }, [computeStatsFromBrands]);

  const fetchStatsOnly = useCallback(async () => {
    if (isStatsFetchingRef.current) return;
    if (!token && !isGuest) return;

    const now = Date.now();
    if (now - lastStatsFetchAtRef.current < 8000) return;

    isStatsFetchingRef.current = true;
    lastStatsFetchAtRef.current = now;

    try {
      const headers = token && !isGuest ? { Authorization: `Bearer ${token}` } : {};
      
      let remoteStats = null;
      try {
        const res = await api.get("/brands/stats", {
          headers,
          timeout: 5000,
        });
        if (res?.data) {
          remoteStats = {
            totalBrands: res.data.totalBrands || 0,
            totalOffers: res.data.totalOffers || 0,
            claimedCount: res.data.claimedCount || 0,
            onlineCount: res.data.onlineCount || 0,
            inStoreCount: res.data.inStoreCount || 0,
            maxDiscount: res.data.maxDiscount || 0,
          };
        }
      } catch {
        // Fallback to local computation
      }

      if (remoteStats && isMounted.current) {
        setStats((prev) => (statsEqual(prev, remoteStats) ? prev : remoteStats));
        setStatsLoading(false);
        statsCache = remoteStats;
        statsCacheTimestamp = Date.now();
      }
    } catch (err) {
      // Silent fail
    } finally {
      isStatsFetchingRef.current = false;
    }
  }, [token, isGuest]);

  const loadCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return false;
      const { data, timestamp } = JSON.parse(cached);
      if (data?.length > 0 && Date.now() - timestamp < CACHE_DURATION) {
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.createdAt || b._id).getTime() -
            new Date(a.createdAt || a._id).getTime()
        );
        setAllBrands(sorted);
        setDisplayedBrands(sorted.slice(0, PAGE_SIZE));
        setHasMore(sorted.length > PAGE_SIZE);
        setLoading(false);
        updateStatsFromLocal(sorted);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [updateStatsFromLocal]);

  const loadStatsCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STATS_CACHE_KEY);
      if (!cached) return false;
      const { data, timestamp } = JSON.parse(cached);
      if (data && Date.now() - timestamp < CACHE_DURATION) {
        setStats(data);
        setStatsLoading(false);
        statsCache = data;
        statsCacheTimestamp = timestamp;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const saveCache = useCallback(async (data) => {
    try {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch {}
  }, []);

  const fetchBrands = useCallback(
    async (forceRefresh = false, { silent = false } = {}) => {
      const now = Date.now();

      if (!forceRefresh && now - lastFetchAtRef.current < MIN_FETCH_GAP) {
        return;
      }
      if (isFetchingRef.current) return;

      if (
        !forceRefresh &&
        brandsCache &&
        cacheTimestamp &&
        Date.now() - cacheTimestamp < CACHE_DURATION
      ) {
        const sorted = [...brandsCache].sort(
          (a, b) =>
            new Date(b.createdAt || b._id).getTime() -
            new Date(a.createdAt || a._id).getTime()
        );
        if (isMounted.current) {
          setAllBrands((prev) => (brandsEqual(prev, sorted) ? prev : sorted));
          setDisplayedBrands((prev) => {
            const next = sorted.slice(0, Math.max(PAGE_SIZE, prev.length));
            return brandsEqual(prev, next) ? prev : next;
          });
          setHasMore(sorted.length > PAGE_SIZE);
          setLoading(false);
          setError(null);
          updateStatsFromLocal(sorted);
          
          requestAnimationFrame(() => {
            sorted.slice(0, MAX_PRELOAD).forEach((b) => preloadImage(b.displayImage));
          });
        }

        if (!silent) {
          // Continue to network
        } else {
          return sorted;
        }
      }

      if (!forceRefresh && !brandsCache) {
        const cached = await loadCache();
        if (cached) {
          fetchBrands(true, { silent: true });
          return;
        }
      }

      if (pendingFetchPromise) {
        try {
          const result = await pendingFetchPromise;
          if (isMounted.current && result) {
            const sorted = [...result].sort(
              (a, b) =>
                new Date(b.createdAt || b._id).getTime() -
                new Date(a.createdAt || a._id).getTime()
            );
            setAllBrands((prev) => (brandsEqual(prev, sorted) ? prev : sorted));
            setDisplayedBrands((prev) => {
              const next = sorted.slice(0, Math.max(PAGE_SIZE, prev.length));
              return brandsEqual(prev, next) ? prev : next;
            });
            setHasMore(sorted.length > PAGE_SIZE);
            setLoading(false);
            setError(null);
            updateStatsFromLocal(sorted);
          }
        } catch {
          pendingFetchPromise = null;
        }
        return;
      }

      if (!token && !isGuest) {
        if (isMounted.current) {
          setLoading(false);
          setError("Please login to view brands");
          setStatsLoading(false);
        }
        return;
      }

      if (!initialLoadDone.current && !brandsCache) setLoading(true);
      if (!silent) setError(null);

      isFetchingRef.current = true;
      lastFetchAtRef.current = now;

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      pendingFetchPromise = (async () => {
        try {
          let brandsData;

          if (!isGuest && token && optimizedAPI?.getBrandsFast) {
            try {
              const fast = await optimizedAPI.getBrandsFast(token, userId, {
                forceRefresh,
                limit: 200,
              });
              if (fast?.length) {
                brandsData = fast;
              }
            } catch (e) {
              console.log("optimizedAPI failed, falling back:", e?.message);
            }
          }

          if (!brandsData) {
            const headers =
              token && !isGuest ? { Authorization: `Bearer ${token}` } : {};

            const brandsRes = await api.get("/brands", {
              headers,
              signal: abortControllerRef.current.signal,
              params: { limit: 200 },
              timeout: 8000,
            });

            let raw = brandsRes?.data || [];

            if (isGuest || !token) {
              brandsData = raw.map((brand) => {
                const logoUrl = formatImageUrl(brand.logo, "brand");
                return {
                  ...brand,
                  logo: logoUrl,
                  offers: [],
                  displayImage:
                    logoUrl ||
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                  hasOffer: false,
                  discount: 0,
                  category: brand.category || "General",
                  isOnline: brand.isOnline || false,
                  isInStore: brand.isInStore || false,
                  createdAt: brand.createdAt || new Date().toISOString(),
                };
              });
            } else {
              const offersResults = await Promise.all(
                raw.map((brand) =>
                  api
                    .get(`/offers/brand/${brand._id}`, {
                      headers: { Authorization: `Bearer ${token}` },
                      signal: abortControllerRef.current.signal,
                      timeout: 3000,
                    })
                    .then((res) => ({ brandId: brand._id, offers: res.data }))
                    .catch(() => ({ brandId: brand._id, offers: [] }))
                )
              );

              const offersMap = new Map(
                offersResults.map(({ brandId, offers }) => [
                  brandId,
                  offers.map((offer) => ({
                    ...offer,
                    image: formatImageUrl(offer.image, "offer"),
                    displayImage: formatImageUrl(offer.image, "offer"),
                    isClaimed: offer.claimedBy?.includes(userId) || false,
                    discountPercentage: offer.discountPercentage || 0,
                  })),
                ])
              );

              brandsData = raw.map((brand) => {
                const brandOffers = offersMap.get(brand._id) || [];
                const firstOffer = brandOffers[0];
                const displayImage = firstOffer?.image
                  ? firstOffer.image
                  : formatImageUrl(brand.logo, "brand") ||
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

                return {
                  ...brand,
                  logo: formatImageUrl(brand.logo, "brand"),
                  offers: brandOffers,
                  displayImage,
                  hasOffer: brandOffers.length > 0,
                  discount: firstOffer?.discountPercentage || 0,
                  category: firstOffer?.category || brand.category || "General",
                  isOnline: firstOffer?.isOnline || brand.isOnline || false,
                  isInStore: firstOffer?.isInStore || brand.isInStore || false,
                  createdAt: brand.createdAt || new Date().toISOString(),
                };
              });
            }
          }

          const sorted = [...brandsData].sort(
            (a, b) =>
              new Date(b.createdAt || b._id).getTime() -
              new Date(a.createdAt || a._id).getTime()
          );

          if (isMounted.current) {
            setAllBrands((prev) => {
              if (brandsEqual(prev, sorted)) return prev;
              return sorted;
            });
            setDisplayedBrands((prev) => {
              const next = sorted.slice(0, Math.max(PAGE_SIZE, prev.length));
              return brandsEqual(prev, next) ? prev : next;
            });
            setHasMore(sorted.length > PAGE_SIZE);

            brandsCache = sorted;
            cacheTimestamp = Date.now();
            setLoading(false);
            setError(null);
            setLastUpdated(Date.now());
            initialLoadDone.current = true;
            saveCache(sorted);
            updateStatsFromLocal(sorted);
            
            requestAnimationFrame(() => {
              sorted.slice(0, MAX_PRELOAD).forEach((b) => preloadImage(b.displayImage));
            });
          }

          pendingFetchPromise = null;
          return sorted;
        } catch (err) {
          if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
            pendingFetchPromise = null;
            return brandsCache || [];
          }
          if (isMounted.current) {
            if (!brandsCache?.length) {
              setError("Failed to load brands. Please try again.");
              setLoading(false);
              setStatsLoading(false);
            } else {
              setAllBrands(brandsCache);
              setDisplayedBrands(brandsCache.slice(0, PAGE_SIZE));
              setHasMore(brandsCache.length > PAGE_SIZE);
              updateStatsFromLocal(brandsCache);
            }
          }
          pendingFetchPromise = null;
          return [];
        } finally {
          isFetchingRef.current = false;
        }
      })();

      return pendingFetchPromise;
    },
    [
      token,
      isGuest,
      userId,
      formatImageUrl,
      preloadImage,
      loadCache,
      saveCache,
      updateStatsFromLocal,
    ]
  );

  // ─────────────────────────────────────────────
  // ✅ CLAIM/UNCLAIM EVENT LISTENERS
  // Handles BOTH local claim events AND global cache events
  // ─────────────────────────────────────────────
  useEffect(() => {
    // ── Listener 1: Local claim event from OfferScreen ──
    const unsubscribeClaim = onOfferClaimed((brandId, offerId) => {
      const applyClaim = (b) => {
        if (b._id !== brandId) return b;
        const updatedOffers = (b.offers || []).map((o) =>
          o._id === offerId ? { ...o, isClaimed: true } : o
        );
        const firstOffer = updatedOffers[0];
        return {
          ...b,
          offers: updatedOffers,
          hasOffer: updatedOffers.length > 0,
          discount: firstOffer?.discountPercentage || 0,
          displayImage: firstOffer?.image || b.displayImage,
          isOnline: firstOffer?.isOnline || b.isOnline,
          isInStore: firstOffer?.isInStore || b.isInStore,
        };
      };

      if (brandsCache) brandsCache = brandsCache.map(applyClaim);

      setAllBrands((prev) => {
        const next = prev.map(applyClaim);
        updateStatsFromLocal(next);
        return next;
      });
      setDisplayedBrands((prev) => prev.map(applyClaim));

      AsyncStorage.multiRemove([CACHE_KEY, STATS_CACHE_KEY]).catch(() => {});
      cacheTimestamp = Date.now();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });

    // ── Listener 2: Global cache event (from ANY screen via api.js) ──
    const unsubscribeCacheEvent = onCacheEvent((event) => {
      if (!event || event.type !== "cache:invalidated") return;

      const { type, brandId, offerId } = event;

      // ✅ CRITICAL: Clear ALL local module-level caches
      brandsCache = null;
      cacheTimestamp = null;
      statsCache = null;
      statsCacheTimestamp = null;
      pendingFetchPromise = null;

      AsyncStorage.multiRemove([CACHE_KEY, STATS_CACHE_KEY]).catch(() => {});

      // ── UNCLAIM: Flip isClaimed → false ──
      if (type === "offer:unclaimed" && brandId && offerId) {
        const applyUnclaim = (b) => {
          if (b._id !== brandId) return b;
          const updatedOffers = (b.offers || []).map((o) =>
            o._id === offerId ? { ...o, isClaimed: false } : o
          );
          const firstOffer = updatedOffers[0];
          return {
            ...b,
            offers: updatedOffers,
            hasOffer: updatedOffers.length > 0,
            discount: firstOffer?.discountPercentage || 0,
            displayImage: firstOffer?.image || b.displayImage,
            isOnline: firstOffer?.isOnline || b.isOnline,
            isInStore: firstOffer?.isInStore || b.isInStore,
          };
        };

        setAllBrands((prev) => {
          const next = prev.map(applyUnclaim);
          updateStatsFromLocal(next);
          return next;
        });
        setDisplayedBrands((prev) => prev.map(applyUnclaim));
      }

      // ── CLAIM: Flip isClaimed → true ──
      if (type === "offer:claimed" && brandId && offerId) {
        const applyClaim = (b) => {
          if (b._id !== brandId) return b;
          const updatedOffers = (b.offers || []).map((o) =>
            o._id === offerId ? { ...o, isClaimed: true } : o
          );
          const firstOffer = updatedOffers[0];
          return {
            ...b,
            offers: updatedOffers,
            hasOffer: updatedOffers.length > 0,
            discount: firstOffer?.discountPercentage || 0,
            displayImage: firstOffer?.image || b.displayImage,
            isOnline: firstOffer?.isOnline || b.isOnline,
            isInStore: firstOffer?.isInStore || b.isInStore,
          };
        };

        setAllBrands((prev) => {
          const next = prev.map(applyClaim);
          updateStatsFromLocal(next);
          return next;
        });
        setDisplayedBrands((prev) => prev.map(applyClaim));
      }

      // ✅ Trigger fresh background fetch to sync with server
      setTimeout(() => {
        if (isMounted.current && (token || isGuest)) {
          fetchBrands(true, { silent: true });
          fetchStatsOnly();
        }
      }, 400);
    });

    return () => {
      unsubscribeClaim?.();
      unsubscribeCacheEvent?.();
    };
  }, [updateStatsFromLocal, fetchBrands, fetchStatsOnly, token, isGuest]);

  // ── SMART POLLING ──
  useEffect(() => {
    const startPolling = (interval) => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (interval > 0) {
        pollTimerRef.current = setInterval(() => {
          if (isScreenFocused.current && appStateRef.current === "active") {
            fetchBrands(false, { silent: true });
          }
        }, interval);
      }
    };

    startPolling(
      isScreenFocused.current ? POLL_INTERVAL : BACKGROUND_POLL_INTERVAL
    );

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchBrands]);

  // ── STATS-ONLY POLLING ──
  useEffect(() => {
    if (statsPollTimerRef.current) clearInterval(statsPollTimerRef.current);

    statsPollTimerRef.current = setInterval(() => {
      if (isScreenFocused.current && appStateRef.current === "active") {
        fetchStatsOnly();
      }
    }, STATS_POLL_INTERVAL);

    return () => {
      if (statsPollTimerRef.current) clearInterval(statsPollTimerRef.current);
    };
  }, [fetchStatsOnly]);

  // ── Focus lifecycle ──
  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;

      fetchBrands(false, { silent: true });
      fetchStatsOnly();

      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        if (appStateRef.current === "active") {
          fetchBrands(false, { silent: true });
        }
      }, POLL_INTERVAL);

      if (query) setSearchQuery(query);

      return () => {
        isScreenFocused.current = false;
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }, [fetchBrands, fetchStatsOnly, query])
  );

  // ── App foreground refresh ──
  useEffect(() => {
    isMounted.current = true;

    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev.match(/inactive|background/) && nextState === "active") {
        fetchBrands(false, { silent: true });
        fetchStatsOnly();
      }
    });

    return () => {
      isMounted.current = false;
      sub.remove();
      abortControllerRef.current?.abort();
      if (statsPollTimerRef.current) {
        clearInterval(statsPollTimerRef.current);
      }
    };
  }, [fetchBrands, fetchStatsOnly]);

  // ── Load cached stats + brands on mount ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const statsLoaded = await loadStatsCache();
      if (cancelled) return;

      if (!statsLoaded) {
        const brandsCached = await loadCache();
        if (cancelled) return;
        if (!brandsCached && !brandsCache) {
          setStatsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadCache, loadStatsCache]);

  const loadMoreBrands = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const currentCount = displayedBrands.length;
    const nextBatch = allBrands.slice(currentCount, currentCount + PAGE_SIZE);
    if (nextBatch.length > 0) {
      setDisplayedBrands((prev) => [...prev, ...nextBatch]);
      setHasMore(allBrands.length > currentCount + PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, loading, displayedBrands.length, allBrands]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const catName =
      selectedCategory !== "all"
        ? CATEGORY_BY_ID.get(selectedCategory)?.name
        : null;

    return allBrands.filter((b) => {
      if (minDiscount > 0 && b.discount !== minDiscount) return false;
      if (catName && b.category !== catName) return false;
      if (showOnlyOnline && !b.isOnline) return false;
      if (q && !b.name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allBrands, searchQuery, minDiscount, selectedCategory, showOnlyOnline]);

  useEffect(() => {
    if (filteredData.length > 0) {
      setDisplayedBrands(filteredData.slice(0, PAGE_SIZE));
      setHasMore(filteredData.length > PAGE_SIZE);
    } else {
      setDisplayedBrands([]);
      setHasMore(false);
    }
  }, [filteredData]);

  const openOfferScreen = useCallback(
    (brand) => {
      const fullBrand = allBrands.find((b) => b._id === brand._id) || brand;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate("OfferScreen", { brand: fullBrand });
    },
    [navigation, allBrands]
  );

  const openFilterModal = useCallback(() => {
    setFilterModalVisible(true);
    filterSlideAnim.setValue(height);
    Animated.spring(filterSlideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [filterSlideAnim]);

  const closeFilterModal = useCallback(() => {
    Animated.timing(filterSlideAnim, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setFilterModalVisible(false));
  }, [filterSlideAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    cacheTimestamp = null;
    brandsCache = null;
    statsCache = null;
    statsCacheTimestamp = null;
    preloadedImages.clear();
    await Promise.all([
      fetchBrands(true, { silent: true }),
      fetchStatsOnly(),
    ]);
    setRefreshing(false);
  }, [fetchBrands, fetchStatsOnly]);

  const clearAllFilters = useCallback(() => {
    setSelectedCategory("all");
    setMinDiscount(0);
    setShowOnlyOnline(false);
    setSearchQuery("");
  }, []);

  const renderBrand = useCallback(
    ({ item }) => <BrandCard item={item} onPress={openOfferScreen} />,
    [openOfferScreen]
  );

  const keyExtractor = useCallback((item) => item._id, []);

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#f9c349" />
          <Text style={styles.footerLoaderText}>Loading more...</Text>
        </View>
      );
    }
    if (displayedBrands.length === 0 && !loading) {
      return (
        <View style={styles.noResultsContainer}>
          <MaterialCommunityIcons name="ticket-off-outline" size={60} color="#ccc" />
          <Text style={styles.noResultsText}>No Brands Found</Text>
          <Text style={styles.noResultsSubText}>Try adjusting your filters</Text>
          <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearAllFilters}>
            <Text style={styles.clearFiltersBtnText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!hasMore && displayedBrands.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.totalBrandsText}>
            Showing all {filteredData.length} brands
          </Text>
          {lastUpdated ? (
            <Text style={styles.liveFooterText}>· live · auto-synced</Text>
          ) : null}
        </View>
      );
    }
    return (
      <View style={styles.footerContainer}>
        <Text style={styles.showingText}>
          Showing {displayedBrands.length} of {filteredData.length} brands
        </Text>
      </View>
    );
  }, [loadingMore, displayedBrands.length, loading, filteredData.length, hasMore, clearAllFilters, lastUpdated]);

  const renderHeader = useCallback(
    () => (
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
              onPress={setSelectedCategory}
            />
          ))}
        </ScrollView>
      </View>
    ),
    [selectedCategory]
  );

  const activeFilterCount =
    (minDiscount > 0 ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (showOnlyOnline ? 1 : 0);

  return (
    <SafeAreaView style={styles.mainSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#9a979708" />

      <View style={styles.fadeContainer}>
        {/* Header */}
        <View style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons
              name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
              size={24}
              color="#000"
            />
          </TouchableOpacity>
          <View style={styles.customHeaderCenter}>
            <Text style={styles.customHeaderTitle}>Brands</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.discountIconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("MyDiscountScreen");
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

        {/* Stats Bar (commented out in original - keep as-is) */}
        {/* <StatsBar stats={stats} loading={statsLoading} /> */}

        {/* Welcome */}
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeLeftContent}>
              <Text style={styles.welcomeTextAbove}>
                {isGuest ? "Guest User" : user?.university?.name || "No University"}
              </Text>
              <Text style={styles.welcomeTitle}>Crew's Privilege Brands</Text>
            </View>
            <TouchableOpacity
              style={styles.welcomeFilterTrigger}
              onPress={openFilterModal}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="tune-variant" size={15} color="#000000" />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

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
              Showing results for:{" "}
              <Text style={{ fontWeight: "bold", color: "#f9c349" }}>"{query}"</Text>
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                navigation.setParams({ query: undefined });
              }}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {error && !loading && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => fetchBrands(true, { silent: false })}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && displayedBrands.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f9c349" />
            <Text style={styles.loadingText}>Loading brands...</Text>
          </View>
        ) : (
          <FlatList
            data={displayedBrands}
            keyExtractor={keyExtractor}
            removeClippedSubviews
            renderItem={renderBrand}
            windowSize={5}
            maxToRenderPerBatch={6}
            initialNumToRender={6}
            updateCellsBatchingPeriod={30}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreBrands}
            onEndReachedThreshold={0.3}
            extraData={displayedBrands}
          />
        )}
      </View>

      {/* FILTER MODAL */}
      <Modal
        visible={filterModalVisible}
        transparent
        statusBarTranslucent
        onRequestClose={closeFilterModal}
        animationType="none"
      >
        <Pressable style={styles.modalOverlay} onPress={closeFilterModal}>
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
                <TouchableOpacity onPress={clearAllFilters}>
                  <Text style={styles.resetText}>Reset All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <Text style={styles.filterLabel}>Exact Discount</Text>
                <View style={styles.filterChipRow}>
                  {DISCOUNT_OPTIONS.map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.chip, minDiscount === val && styles.activeChip]}
                      onPress={() => setMinDiscount(val)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          minDiscount === val && styles.activeChipText,
                        ]}
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
                <TouchableOpacity style={styles.applyBtn} onPress={closeFilterModal}>
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  mainSafeArea: { flex: 1, backgroundColor: "#fff" },
  fadeContainer: { flex: 1 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
  loadingText: { color: "#999", fontSize: 14, marginTop: 12 },

  statsBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsBarSkeleton: {
    height: 28,
    width: "80%",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  statItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
    fontFamily: "Cardo",
  },
  statLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#f0f0f0",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 2,
  },

  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  customHeaderCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  customHeaderTitle: { fontSize: 18, fontWeight: "700", color: "#000", fontFamily: "Cardo" },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },

  welcomeContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  welcomeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  welcomeLeftContent: { flex: 1 },
  welcomeTextAbove: {
    fontSize: 14,
    color: "#676363",
    fontWeight: "600",
    fontFamily: "Cardo",
    marginBottom: 2,
  },
  welcomeTitle: { fontSize: 16, fontWeight: "700", color: "#000", fontFamily: "Cardo" },
  welcomeFilterTrigger: {
    padding: 10,
    marginLeft: 12,
    backgroundColor: "#F7F9F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignSelf: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: "#f9c349",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  filterBadgeText: { fontSize: 10, fontWeight: "800", color: "#000" },

  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  discountIconBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  discountIconWrapper: { position: "relative", alignItems: "center", justifyContent: "center" },
  discountBadgeDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f9c349",
    borderWidth: 1.5,
    borderColor: "#fff",
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
    shadowRadius: 8,
  },
  availabilityWrapper: { position: "absolute", top: 12, left: 12, flexDirection: "row", zIndex: 1 },
  discountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  discountText: { fontSize: 12, fontWeight: "900", color: "#f9c349", fontFamily: "Cardo" },
  logoContainer: {
    width: "100%",
    height: 100,
    marginTop: 24,
    marginBottom: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { width: "100%", height: "100%", borderRadius: 20 },
  infoContainer: { alignItems: "center", width: "100%" },
  name: { fontSize: 14, fontWeight: "800", color: "#000000", fontFamily: "Cardo", textAlign: "center" },
  offerStatusText: { fontSize: 10, color: "#bbb", marginTop: 4 },
  offerStatusClaimed: { color: "#f9c349", fontWeight: "bold" },
  categoryBadgeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 0.5,
  },
  categoryCardText: {
    fontSize: 9,
    color: "#000000",
    fontWeight: "600",
    textTransform: "uppercase",
    paddingLeft: 2,
  },

  categoryGridContainer: { paddingHorizontal: 20, marginBottom: 10, marginTop: 2 },
  categoryGridScroll: { paddingVertical: 5, gap: 6 },
  categoryGridItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 14,
    minWidth: 44,
    marginRight: 4,
  },
  categoryGridItemActive: { borderColor: "#000000", borderWidth: 1.5 },
  categoryIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  categoryIconWrapperActive: { backgroundColor: "#000000" },
  categoryGridName: { fontSize: 9, fontWeight: "600", color: "#555", textAlign: "center", maxWidth: 52 },
  categoryGridNameActive: { color: "#000000", fontWeight: "700" },

  footerContainer: { paddingHorizontal: 20, paddingVertical: 15, alignItems: "center" },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
  footerLoaderText: { fontSize: 12, color: "#999", marginTop: 8 },
  showingText: { fontSize: 12, color: "#999" },
  totalBrandsText: { fontSize: 13, color: "#666", fontWeight: "500" },
  liveFooterText: {
    fontSize: 10,
    color: "#22c55e",
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  noResultsContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40, paddingHorizontal: 20 },
  noResultsText: { fontSize: 18, fontWeight: "700", color: "#333", marginTop: 16 },
  noResultsSubText: { fontSize: 14, color: "#999", marginTop: 6, marginBottom: 20 },
  clearFiltersBtn: { backgroundColor: "#f9c349", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  clearFiltersBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },

  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { flex: 1, fontSize: 13, color: "#991b1b", marginLeft: 8 },
  retryButton: { backgroundColor: "#ef4444", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  retryButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContentWrapper: { flex: 1, padding: 25 },
  filterModalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    maxHeight: "85%",
    minHeight: "50%",
  },
  modalIndicator: {
    width: 45,
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 25,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  filterHeader: { fontSize: 22, fontWeight: "900", color: "#000000", fontFamily: "Cardo" },
  resetText: { color: "#000000", fontWeight: "600", fontSize: 14 },

  filterLabel: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 15, marginBottom: 10 },
  filterChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F5F7F6",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
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

  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#f9c34930",
  },
  guestBannerText: { flex: 1, fontSize: 12, color: "#1a1a1a", marginLeft: 8, fontWeight: "500" },
  signInLink: { color: "#f9c349", fontWeight: "700", fontSize: 12, marginLeft: 8 },

  searchIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  searchIndicatorText: { fontSize: 14, color: "#666" },
});