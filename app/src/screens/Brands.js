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
  Dimensions,
  Modal,
  Pressable,
  StatusBar,
  ScrollView,
  Platform,
  Animated,
  AppState,
  TextInput,
  useWindowDimensions,
} from "react-native";
import RemoteImage, { prefetchRemoteImages } from "../ui/RemoteImage";
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

// ✅ IMPORT the claimed-ids registry + hydrator from OfferScreen
import {
  onOfferClaimed,
  registerLocalClaim,
  unregisterLocalClaim,
  isLocallyClaimed,
  hydrateClaimedRegistry,
  reconcileClaimedIds,
} from "./OfferScreen";
import CityDropdown from "../components/CityDropdown";
import {
  ALL_CITIES,
  useSelectedCity,
  brandMatchesCity,
  buildCityOptions,
  resolveCity,
} from "../utils/cityFilter";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { imageUrl, brandLogoUrl, fixLegacyImageUrl, FALLBACK_IMAGE } from "../utils/imageUrl";
import { Button, Chip, EmptyState, HeaderIconButton, PressScale, SectionTitle, SheetHandle, SkeletonBlock } from "../ui";
import SurpriseBoxCard from "../components/SurpriseBoxCard";
import { CATEGORIES, CATEGORY_BY_ID, brandImageOf, brandDiscount, brandsEqual, statsEqual, applyLocalClaimRegistry } from "./brandsData";
import { styles, GRID_SIDE, GRID_GAP } from "./brandsStyles";
import { preloadedImages, CategoryGridItem, BrandCard, BrandGridSkeleton, ListGap } from "./BrandParts";

const { width, height } = Dimensions.get("window");

// Per-user keys (v2 = includes brand cities). The old shared key showed one
// user's claimed offers to the next user on the same phone.
const CACHE_PREFIX = "@brands_cache:v2:";
const STATS_CACHE_PREFIX = "@brands_stats_cache:v2:";
const LEGACY_CACHE_KEYS = ["@brands_cache", "@brands_stats_cache"];
const CACHE_DURATION = 5 * 60 * 1000;
const PAGE_SIZE = 10;
const MAX_PRELOAD = 12;

// ── Auto-fetch tuning ────────────────────────────────
const POLL_INTERVAL = 20000;
const BACKGROUND_POLL_INTERVAL = 60000;
const STATS_POLL_INTERVAL = 15000;
const MIN_FETCH_GAP = 4000;





// Global caches
let brandsCache = null;
let cacheTimestamp = null;
let pendingFetchPromise = null;
let statsCache = null;
let statsCacheTimestamp = null;
let brandsCacheOwner = null; // which user the module cache belongs to

AsyncStorage.multiRemove(LEGACY_CACHE_KEYS).catch(() => {});









// ==========================================
// MAIN SCREEN
// ==========================================
export default function BrandsScreen() {
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  // 2 columns: 16 side padding, 12 gap
  const cardWidth = Math.floor((screenWidth - GRID_SIDE * 2 - GRID_GAP) / 2);
  const route = useRoute();
  const { token, user, isGuest } = useContext(AuthContext);
  const { query } = route.params || {};

  const [allBrands, setAllBrands] = useState([]);
  // How many of the FILTERED brands are rendered (paging). The visible list
  // is always derived from filteredData, never set from raw fetch results.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [minDiscount, setMinDiscount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);

  // ✅ Forces re-render when local claim registry changes
  const [claimVersion, setClaimVersion] = useState(0);

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

  // ── Per-user cache ownership ──
  const cacheOwnerKey = isGuest ? "guest" : userId || "none";
  const CACHE_KEY = `${CACHE_PREFIX}${cacheOwnerKey}`;
  const STATS_CACHE_KEY = `${STATS_CACHE_PREFIX}${cacheOwnerKey}`;
  if (brandsCacheOwner !== cacheOwnerKey) {
    brandsCache = null;
    cacheTimestamp = null;
    statsCache = null;
    statsCacheTimestamp = null;
    pendingFetchPromise = null;
    brandsCacheOwner = cacheOwnerKey;
  }

  // ── City filter (Karachi default, shared with Offer + My Discounts) ──
  const [savedCity, setSelectedCity] = useSelectedCity();

  // shared rule (utils/imageUrl): stored path as is, bare logo file → /uploads/brands/
  const formatImageUrl = useCallback(
    (imagePath, type = "offer") => (type === "brand" ? brandLogoUrl(imagePath) : imageUrl(imagePath)),
    []
  );

  const preloadImage = useCallback((url) => {
    if (!url || preloadedImages.has(url)) return;
    preloadedImages.add(url);
    prefetchRemoteImages(url, "card");
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
      const first = b.offers?.[0];
      const claimed =
        !!first?.isClaimed || (first?._id && isLocallyClaimed(first._id));
      if (claimed) claimedCount++;
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
  }, [computeStatsFromBrands, STATS_CACHE_KEY]);

  const fetchStatsOnly = useCallback(async () => {
    // Stats are computed locally from the loaded brands (updateStatsFromLocal).
    // /brands/stats returns { stats: {...} } and needs auth, so reading it here
    // overwrote the numbers with zeros every 15s.
    return;
    // eslint-disable-next-line no-unreachable
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
        // ✅ Apply local claim registry to cached data
        const withClaims = data.map(applyLocalClaimRegistry);
        const sorted = [...withClaims].sort(
          (a, b) =>
            new Date(b.createdAt || b._id).getTime() -
            new Date(a.createdAt || a._id).getTime()
        );
        setAllBrands(sorted);
        setLoading(false);
        updateStatsFromLocal(sorted);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [updateStatsFromLocal, CACHE_KEY]);

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
  }, [STATS_CACHE_KEY]);

  const saveCache = useCallback(async (data) => {
    try {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch {}
  }, [CACHE_KEY]);

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
        // ✅ Apply registry before setting state
        const withClaims = brandsCache.map(applyLocalClaimRegistry);
        const sorted = [...withClaims].sort(
          (a, b) =>
            new Date(b.createdAt || b._id).getTime() -
            new Date(a.createdAt || a._id).getTime()
        );
        if (isMounted.current) {
          setAllBrands((prev) => (brandsEqual(prev, sorted) ? prev : sorted));
          setLoading(false);
          setError(null);
          updateStatsFromLocal(sorted);

          requestAnimationFrame(() => {
            sorted.slice(0, MAX_PRELOAD).forEach((b) => preloadImage(b.displayImage));
          });
        }

        // Stale-while-revalidate: cache is shown instantly, network still runs.
        // (Before, a silent call returned here, so focus/polling never fetched
        // new brands or offers for 5 minutes.)
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
            const withClaims = result.map(applyLocalClaimRegistry);
            const sorted = [...withClaims].sort(
              (a, b) =>
                new Date(b.createdAt || b._id).getTime() -
                new Date(a.createdAt || a._id).getTime()
            );
            setAllBrands((prev) => (brandsEqual(prev, sorted) ? prev : sorted));
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

              // ✅ Consult local claim registry when mapping offers
              const offersMap = new Map(
                offersResults.map(({ brandId, offers }) => [
                  brandId,
                  offers.map((offer) => {
                    const serverClaimed =
                      (offer.claimedBy || []).some((id) => String(id) === String(userId)) || false;
                    const registryClaimed = isLocallyClaimed(offer._id);
                    return {
                      ...offer,
                      image: formatImageUrl(offer.image, "offer"),
                      displayImage: formatImageUrl(offer.image, "offer"),
                      isClaimed: serverClaimed || registryClaimed,
                      serverClaimed,
                      discountPercentage: offer.discountPercentage || 0,
                    };
                  }),
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

          // ✅ Server is the source of truth for claims (removes redeemed /
          // unclaimed offers from the local registry), then apply registry
          if (userId) {
            const allIds = [];
            const serverIds = [];
            brandsData.forEach((b) =>
              (b.offers || []).forEach((o) => {
                if (!o?._id) return;
                allIds.push(o._id);
                if (o.serverClaimed) serverIds.push(o._id);
              })
            );
            reconcileClaimedIds(serverIds, allIds);
            brandsData = brandsData.map((b) => ({
              ...b,
              offers: (b.offers || []).map((o) => ({
                ...o,
                isClaimed: !!o.serverClaimed || isLocallyClaimed(o._id),
              })),
            }));
          }

          const withClaims = brandsData.map(applyLocalClaimRegistry);

          const sorted = [...withClaims].sort(
            (a, b) =>
              new Date(b.createdAt || b._id).getTime() -
              new Date(a.createdAt || a._id).getTime()
          );

          if (isMounted.current) {
            setAllBrands((prev) => {
              if (brandsEqual(prev, sorted)) return prev;
              return sorted;
            });

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
              const fallback = brandsCache.map(applyLocalClaimRegistry);
              setAllBrands(fallback);
              updateStatsFromLocal(fallback);
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
      CACHE_KEY,
    ]
  );

  // ─────────────────────────────────────────────
  // ✅ CLAIM/UNCLAIM EVENT LISTENERS
  // ─────────────────────────────────────────────
  useEffect(() => {
    // ── Listener 1: Local claim event from OfferScreen ──
    const unsubscribeClaim = onOfferClaimed((brandId, offerId) => {
      registerLocalClaim(offerId);

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

      setAllBrands((prev) => prev.map(applyClaim));
      setClaimVersion((v) => v + 1);

      cacheTimestamp = Date.now();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });

    // ── Listener 2: Global cache event (from ANY screen via api.js) ──
    const unsubscribeCacheEvent = onCacheEvent((event) => {
      if (!event || event.type !== "cache:invalidated") return;

      const { type, brandId, offerId } = event;

      brandsCache = null;
      cacheTimestamp = null;
      statsCache = null;
      statsCacheTimestamp = null;
      pendingFetchPromise = null;

      AsyncStorage.multiRemove([CACHE_KEY, STATS_CACHE_KEY]).catch(() => {});

      // ── UNCLAIM ──
      if (type === "offer:unclaimed" && brandId && offerId) {
        unregisterLocalClaim(offerId);

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

        setAllBrands((prev) => prev.map(applyUnclaim));
        setClaimVersion((v) => v + 1);
      }

      // ── CLAIM ──
      if (type === "offer:claimed" && brandId && offerId) {
        registerLocalClaim(offerId);

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

        setAllBrands((prev) => prev.map(applyClaim));
        setClaimVersion((v) => v + 1);
      }

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
  }, [updateStatsFromLocal, fetchBrands, fetchStatsOnly, token, isGuest, CACHE_KEY, STATS_CACHE_KEY]);

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

      // Fresh data every time the screen opens (cache is shown meanwhile)
      fetchBrands(true, { silent: true });
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

  // Account changed while this screen is alive → drop old user's list
  const lastOwnerRef = useRef(cacheOwnerKey);
  useEffect(() => {
    if (lastOwnerRef.current === cacheOwnerKey) return;
    lastOwnerRef.current = cacheOwnerKey;
    setAllBrands([]);
    setLoading(true);
    initialLoadDone.current = false;
    lastFetchAtRef.current = 0;
    (async () => {
      try { await hydrateClaimedRegistry(userId); } catch {}
      setClaimVersion((v) => v + 1);
      fetchBrands(true, { silent: false });
    })();
  }, [cacheOwnerKey, userId, fetchBrands]);

  // ─────────────────────────────────────────────
  // ✅ Load cached stats + brands on mount
  // CRITICAL: Hydrate the persisted claim registry FIRST,
  // then apply it to all cached data before rendering.
  // ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // ✅ Step 1: Hydrate the persisted claim registry from AsyncStorage
      try {
        await hydrateClaimedRegistry(userId);
      } catch (e) {
        console.log("hydrateClaimedRegistry failed:", e);
      }
      if (cancelled) return;

      // ✅ Step 2: Force a re-render so any UI already showing uses the hydrated registry
      setClaimVersion((v) => v + 1);

      // ✅ Step 3: Re-apply registry to in-memory cache
      if (brandsCache) {
        brandsCache = brandsCache.map(applyLocalClaimRegistry);
      }

      // ✅ Step 4: Load cached stats
      const statsLoaded = await loadStatsCache();
      if (cancelled) return;

      // ✅ Step 5: Always load cached brands (so registry is applied)
      const brandsCached = await loadCache();
      if (cancelled) return;

      // If nothing loaded, stop the stats spinner
      if (!statsLoaded && !brandsCached && !brandsCache) {
        setStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadCache, loadStatsCache]);


  // City chips: "All" + only cities that have brands (count = brands there)
  const cityOptions = useMemo(() => buildCityOptions(allBrands), [allBrands]);
  // Saved city with no brands anymore → All (wait for data before deciding)
  const selectedCity = allBrands.length
    ? resolveCity(savedCity, cityOptions)
    : savedCity;

  // Brands in the selected city (before category / discount filters)
  const cityBrands = useMemo(
    () => allBrands.filter((b) => brandMatchesCity(b, selectedCity)),
    [allBrands, selectedCity]
  );

  // Category chips:
  //   All Cities → categories that have brands in any city
  //   a city     → only categories that have brands in that city
  const visibleCategories = useMemo(() => {
    const present = new Set(cityBrands.map((b) => b.category));
    return CATEGORIES.filter((c) => c.id === "all" || present.has(c.name));
  }, [cityBrands]);

  // Discount chips: only the exact discounts that exist in this city
  // (and selected category / online toggle), lowest first
  const discountOptions = useMemo(() => {
    const catName =
      selectedCategory !== "all" ? CATEGORY_BY_ID.get(selectedCategory)?.name : null;
    const set = new Set();
    cityBrands.forEach((b) => {
      if (catName && b.category !== catName) return;
      if (showOnlyOnline && !b.isOnline) return;
      const d = brandDiscount(b);
      if (d > 0) set.add(d);
    });
    return [0, ...[...set].sort((a, b) => a - b)];
  }, [cityBrands, selectedCategory, showOnlyOnline]);

  // Selected discount not available anymore (city/category changed) → Any
  useEffect(() => {
    if (minDiscount > 0 && cityBrands.length && !discountOptions.includes(minDiscount)) {
      setMinDiscount(0);
    }
  }, [discountOptions, minDiscount, cityBrands.length]);

  // Selected category has no brands in the new city → back to All
  useEffect(() => {
    if (selectedCategory === "all" || !cityBrands.length) return;
    const name = CATEGORY_BY_ID.get(selectedCategory)?.name;
    if (!cityBrands.some((b) => b.category === name)) setSelectedCategory("all");
  }, [cityBrands, selectedCategory]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const catName =
      selectedCategory !== "all"
        ? CATEGORY_BY_ID.get(selectedCategory)?.name
        : null;

    return cityBrands.filter((b) => {
      // Exact: 10% shows only brands whose deal is exactly 10%
      if (minDiscount > 0 && brandDiscount(b) !== minDiscount) return false;
      if (catName && b.category !== catName) return false;
      if (showOnlyOnline && !b.isOnline) return false;
      if (q && !b.name?.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityBrands, searchQuery, minDiscount, selectedCategory, showOnlyOnline, claimVersion]);

  // Back to the top of the list when the city changes
  const listRef = useRef(null);
  useEffect(() => {
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [selectedCity]);

  // Stats follow the brand list (was a setState inside another setState
  // updater, which React warns about)
  useEffect(() => {
    if (allBrands.length) updateStatsFromLocal(allBrands);
  }, [allBrands, claimVersion, updateStatsFromLocal]);

  // Filters changed → start again from the first page
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCity, selectedCategory, minDiscount, showOnlyOnline, searchQuery]);

  const displayedBrands = useMemo(
    () => filteredData.slice(0, visibleCount),
    [filteredData, visibleCount]
  );
  const hasMore = visibleCount < filteredData.length;

  const loadMoreBrands = useCallback(() => {
    if (loadingMore || loading) return;
    if (visibleCount >= filteredData.length) return;
    setLoadingMore(true);
    setVisibleCount((c) => c + PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, loading, visibleCount, filteredData.length]);

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

  const activeFilterCount =
    (minDiscount > 0 ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (showOnlyOnline ? 1 : 0);

  const renderBrand = useCallback(
    ({ item }) => <BrandCard item={item} onPress={openOfferScreen} cardWidth={cardWidth} />,
    [openOfferScreen, cardWidth]
  );

  const keyExtractor = useCallback((item) => item._id, []);

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={T.ink} />
        </View>
      );
    }
    if (displayedBrands.length === 0 && !loading) {
      const cityEmpty =
        selectedCity !== ALL_CITIES &&
        activeFilterCount === 0 &&
        !searchQuery.trim();
      return (
        <EmptyState
          mood={cityEmpty ? "sleepy" : "sus"}
          title={cityEmpty ? `no brands in ${selectedCity} yet` : "no brands found"}
          line={cityEmpty ? "new brands are joining soon." : "try a different filter or search."}
          actionLabel={cityEmpty ? "show all cities" : "clear all filters"}
          onAction={cityEmpty ? () => setSelectedCity(ALL_CITIES) : clearAllFilters}
        />
      );
    }
    if (!hasMore && displayedBrands.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.totalBrandsText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            showing all {filteredData.length} brands
            {selectedCity !== ALL_CITIES ? ` in ${selectedCity}` : ""}
            {lastUpdated ? " · live · auto-synced" : ""}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.footerContainer}>
        <Text style={styles.showingText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          showing {displayedBrands.length} of {filteredData.length} brands
        </Text>
      </View>
    );
  }, [loadingMore, displayedBrands.length, loading, filteredData.length, hasMore, clearAllFilters, lastUpdated, selectedCity, activeFilterCount, searchQuery, setSelectedCity]);

  const universityName = isGuest ? null : user?.university?.name || user?.universityName || null;

  const renderHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        {/* Surprise Boxes (FLAG_SURPLUS_BOXES): renders nothing for students outside the pilot */}
        <SurpriseBoxCard onOpen={() => navigation.navigate("SurpriseBoxes")} onOpenAll={() => navigation.navigate("SurpriseBoxes", { allCities: true })} refreshKey={refreshing} />
        <SectionTitle title="crew's privilege brands" right={universityName || undefined} />
      </View>
    ),
    [universityName, navigation, refreshing]
  );

  return (
    <SafeAreaView style={styles.mainSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <View style={styles.fadeContainer}>
        {/* Header */}
        <View style={styles.customHeader}>
          <HeaderIconButton
            icon="chevron-back"
            label="back"
            onPress={() => navigation.goBack()}
          />
          <Text
            style={styles.customHeaderTitle}
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            brands<Text style={{ color: T.yellow }}>.</Text>
          </Text>
          <HeaderIconButton
            label="my discounts"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("MyDiscountScreen");
            }}
          >
            <MaterialCommunityIcons name="ticket-percent-outline" size={20} color={T.ink} />
          </HeaderIconButton>
        </View>

        {/* Search + filters */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={T.textFaint} />
            <TextInput
              style={styles.searchInput}
              placeholder="search brands"
              placeholderTextColor={T.textFaint}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              accessibilityLabel="search brands"
              autoCorrect={false}
            />
            {!!searchQuery && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  if (query) navigation.setParams({ query: undefined });
                }}
                accessibilityRole="button"
                accessibilityLabel="clear search"
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={18} color={T.textFaint} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={openFilterModal}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={activeFilterCount > 0 ? `filters, ${activeFilterCount} on` : "filters"}
          >
            <MaterialCommunityIcons name="tune-variant" size={20} color={T.white} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* City + quick filters + categories */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryGridScroll}
          >
            <CityDropdown
              options={cityOptions}
              selected={selectedCity}
              onSelect={setSelectedCity}
              title="brands in"
              variant="chip"
            />
            <Chip
              label="online only"
              selected={showOnlyOnline}
              onPress={() => setShowOnlyOnline(!showOnlyOnline)}
            />
            {visibleCategories.map((category) => (
              <CategoryGridItem
                key={category.id}
                category={category}
                isSelected={selectedCategory === category.id}
                onPress={setSelectedCategory}
              />
            ))}
          </ScrollView>
        </View>

        {isGuest && (
          <View style={styles.guestBanner}>
            <Ionicons name="information-circle-outline" size={18} color={T.ink} />
            <Text style={styles.guestBannerText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              browsing as guest. sign in to claim offers.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              accessibilityRole="button"
              accessibilityLabel="sign in"
              hitSlop={10}
            >
              <Text style={styles.signInLink}>sign in</Text>
            </TouchableOpacity>
          </View>
        )}

        {query && (
          <View style={styles.searchIndicatorRow}>
            <Text style={styles.searchIndicatorText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              results for <Text style={styles.searchIndicatorQuery}>{`"${query}"`}</Text>
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                navigation.setParams({ query: undefined });
              }}
              accessibilityRole="button"
              accessibilityLabel="clear search"
              hitSlop={10}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={T.textFaint} />
            </TouchableOpacity>
          </View>
        )}

        {error && !loading && displayedBrands.length === 0 ? (
          <EmptyState
            mood="panic"
            title="couldn't load brands"
            line={String(error).toLowerCase()}
            actionLabel="try again"
            onAction={() => fetchBrands(true, { silent: false })}
          />
        ) : error && !loading ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={T.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => fetchBrands(true, { silent: false })}
              style={styles.retryButton}
              accessibilityRole="button"
              accessibilityLabel="retry"
            >
              <Text style={styles.retryButtonText}>retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading && displayedBrands.length === 0 ? (
          <View style={styles.loadingContainer}>
            <BrandGridSkeleton cardWidth={cardWidth} />
          </View>
        ) : error && displayedBrands.length === 0 ? null : (
          <FlatList
            ref={listRef}
            data={displayedBrands}
            keyExtractor={keyExtractor}
            removeClippedSubviews
            renderItem={renderBrand}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            windowSize={5}
            maxToRenderPerBatch={8}
            initialNumToRender={8}
            updateCellsBatchingPeriod={30}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            ItemSeparatorComponent={ListGap}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreBrands}
            onEndReachedThreshold={0.3}
            extraData={claimVersion}
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
              <SheetHandle />
              <View style={styles.modalHeader}>
                <Text style={styles.filterHeader} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  refine<Text style={{ color: T.yellow }}>.</Text>
                </Text>
                <TouchableOpacity
                  onPress={clearAllFilters}
                  accessibilityRole="button"
                  accessibilityLabel="reset all filters"
                  hitSlop={10}
                >
                  <Text style={styles.resetText}>reset all</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <Text style={styles.filterLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  exact discount
                  {selectedCity !== ALL_CITIES ? ` in ${selectedCity}` : ""}
                </Text>
                <View style={styles.filterChipRow}>
                  {discountOptions.map((val) => (
                    <Chip
                      key={val}
                      label={val === 0 ? "any" : `${val}% off`}
                      selected={minDiscount === val}
                      onPress={() => setMinDiscount(val)}
                    />
                  ))}
                </View>

                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.toggleRow}
                  activeOpacity={0.7}
                  onPress={() => setShowOnlyOnline(!showOnlyOnline)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: showOnlyOnline }}
                  accessibilityLabel="show online only"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>show online only</Text>
                    <Text style={styles.toggleSubtitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                      only deals you can use on a website.
                    </Text>
                  </View>
                  <View style={[styles.switchTrack, showOnlyOnline && styles.switchTrackOn]}>
                    <View style={[styles.switchKnob, showOnlyOnline && styles.switchKnobOn]} />
                  </View>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalFooter}>
                <Button title="apply filters" onPress={closeFilterModal} />
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}


