// screens/OfferScreen.js - FULL SCREEN OFFER DETAIL WITH BRANCHES + SMART AUTO-REFRESH + CLAIM SYNC + AUTO-UPDATE STATS + PROPER DATA FETCH + SOUND KIT
import React, {
  useState,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
  AppState,
  Animated,
  Easing,
  AccessibilityInfo,
} from "react-native";
import RemoteImage from "../ui/RemoteImage";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import api, {
  notifyOfferClaimed,
  notifyOfferUnclaimed,
  onCacheEvent,
} from "../api/brandApi";

import { AuthContext } from "../context/AuthContext";
import CityFilterBar from "../components/CityFilterBar";
import LoyaltyCard from "../components/LoyaltyCard";
import {
  ALL_CITIES,
  useSelectedCity,
  branchMatchesCity,
  buildCityOptions,
} from "../utils/cityFilter";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { Button, SkeletonBlock, ScreenHeader, HeaderIconButton } from "../ui";
import { useGuestGate } from "../guest/GuestGate";
import { isSignedInNow } from "../guest/accountRoutes";
import { imageUrl, brandLogoUrl, fixLegacyImageUrl } from "../utils/imageUrl";
import Dot from "../engagement/components/Dot";
import { formatDistance } from "../utils/distance";
import { metaEvents } from "../analytics/metaEvents";
import { pushMoment } from "../push/pushAsk";

// ═══════════════════════════════════════════
// TDC SOUND KIT
// ═══════════════════════════════════════════
import {
  soundDealClaimed,
  soundSuccess,
  soundError,
  soundNope,
  soundTap,
  soundConfirm,
  soundRefresh,
  soundCopy,
} from "../lib/tdcSounds";
import { hydrateClaimedRegistry, registerLocalClaim, unregisterLocalClaim, isLocallyClaimed, reconcileClaimedIds, onStatsChanged, emitOfferClaimed, emitStatsChanged, userIdFromToken, isOfferClaimedByUser, extractClaimedIdsFromOffers, branchesEqual, computeStatsFromOffers, statsEqual, buildActiveData } from "./offerClaims";
import { styles } from "./offerStyles";
import { ClaimSuccessModal, BranchDropdown, HoldToClaim } from "./OfferParts";
export { hydrateClaimedRegistry, clearClaimedRegistry, registerLocalClaim, unregisterLocalClaim, isLocallyClaimed, getAllLocallyClaimed, reconcileClaimedIds, replaceClaimedIds, onOfferClaimed, onStatsChanged } from "./offerClaims";

const { width } = Dimensions.get("window");

const OFFER_STATS_CACHE_PREFIX = "@offer_stats_cache:";
const CACHE_DURATION = 5 * 60 * 1000;

const POLL_INTERVAL = 15000;
const BACKGROUND_POLL_INTERVAL = 45000;
const MIN_FETCH_GAP = 3000;
const STATS_POLL_INTERVAL = 12000;




























// ============================================================
// OFFER SCREEN
// ============================================================
export default function OfferScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { brand: initialBrand } = route.params || {};
  const { token, isGuest } = useContext(AuthContext);
  const { requireAccount } = useGuestGate();

  const [brand, setBrand] = useState(initialBrand || null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  // Opened from a Daily Drop / push with only { _id } → show loader until fetched
  const [loading, setLoading] = useState(!initialBrand?.name);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("gift");
  const [claiming, setClaiming] = useState(false);
  const [claimSuccessVisible, setClaimSuccessVisible] = useState(false);
  const [claimedBrandName, setClaimedBrandName] = useState("");
  const [claimedDiscount, setClaimedDiscount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [claimVersion, setClaimVersion] = useState(0);
  const fetchAllRef = useRef(null);
  // pull to refresh: the offers and the loyalty card again
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try { await fetchAllRef.current?.({ silent: true, forceFresh: true }); } catch (e) { console.warn("[offer] refresh failed:", e?.message); }
    setClaimVersion((v) => v + 1);
    setPullRefreshing(false);
  }, []);

  // ── City filter (shared with Brands + My Discounts, Karachi default) ──
  const [city, setCity] = useSelectedCity();

  const branchCityOf = useCallback((b) => {
    if (b?.city) return [b.city];
    const loc = (b?.location || b?.address || "").split(",").pop()?.trim();
    return loc ? [loc] : [];
  }, []);

  const cityOptions = useMemo(() => {
    if (!branches.length) return [];
    const opts = buildCityOptions(branches, branchCityOf);
    // Only worth showing when branches are in more than one city
    return opts.length > 2 ? opts : [];
  }, [branches, branchCityOf]);

  const cityBranches = useMemo(
    () => branches.filter((b) => branchMatchesCity(b, city)),
    [branches, city]
  );
  const noBranchesInCity = branches.length > 0 && cityBranches.length === 0;
  const visibleBranches = noBranchesInCity ? branches : cityBranches;

  // Selected branch from another city → clear it when the city changes
  useEffect(() => {
    setSelectedBranch((prev) =>
      prev && !visibleBranches.some((b) => b._id === prev._id) ? null : prev
    );
  }, [visibleBranches]);

  const isMountedRef = useRef(true);
  const isScreenFocusedRef = useRef(false);
  const pollTimerRef = useRef(null);
  const statsPollTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const lastFetchAtRef = useRef(0);
  const lastStatsFetchAtRef = useRef(0);
  const isFetchingRef = useRef(false);
  const isStatsFetchingRef = useRef(false);

  const statsCacheKey = useMemo(() => {
    if (!token || isGuest) return null; // guests: no stored claim counts read or written
    return initialBrand?._id
      ? `${OFFER_STATS_CACHE_PREFIX}${initialBrand._id}`
      : null;
  }, [initialBrand?._id, token, isGuest]);

  // shared rule (utils/imageUrl)
  const formatImageUrl = useCallback((imagePath) => imageUrl(imagePath), []);

  const saveStatsCache = useCallback(
    async (computedStats) => {
      if (!statsCacheKey || !computedStats) return;
      try {
        await AsyncStorage.setItem(
          statsCacheKey,
          JSON.stringify({ data: computedStats, timestamp: Date.now() })
        );
      } catch (e) { console.warn("[offers] saving stats on this phone failed:", e?.message || e); }
    },
    [statsCacheKey]
  );

  const loadStatsCache = useCallback(async () => {
    if (!statsCacheKey) return null;
    try {
      const cached = await AsyncStorage.getItem(statsCacheKey);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (data && Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }, [statsCacheKey]);

  const updateStatsFromOffers = useCallback(
    (offers) => {
      const computed = computeStatsFromOffers(offers);
      setStats((prev) => (statsEqual(prev, computed) ? prev : computed));
      setStatsLoading(false);
      saveStatsCache(computed);

      if (initialBrand?._id) {
        emitStatsChanged(computed, initialBrand._id);
      }
      return computed;
    },
    [saveStatsCache, initialBrand?._id]
  );

  const fetchStatsOnly = useCallback(async () => {
    if (!initialBrand?._id) return;
    if (isStatsFetchingRef.current) return;

    const now = Date.now();
    if (now - lastStatsFetchAtRef.current < 8000) return;

    isStatsFetchingRef.current = true;
    lastStatsFetchAtRef.current = now;

    try {
      const hasAuth = token && !isGuest;
      const headers = hasAuth
        ? { Authorization: `Bearer ${token}` }
        : undefined;

      // The server has no stats route (/offers/brand/:id/stats was a 404): the stats come from the
      // brand's offers, counted as fetchAll counts them (claimed = by this user, server or local)
      let remoteStats = null;
      try {
        const res = await api.get(
          hasAuth
            ? `/offers/brand/${initialBrand._id}?fresh=1`
            : `/offers/brand/${initialBrand._id}`,
          { headers, timeout: 4000 }
        );
        if (Array.isArray(res?.data)) {
          const meId = userIdFromToken(token);
          remoteStats = computeStatsFromOffers(
            res.data.map((offer) => ({
              ...offer,
              isClaimed:
                isOfferClaimedByUser(offer, meId) || isLocallyClaimed(offer._id),
            }))
          );
        }
      } catch (e) { console.warn("[offers] loading my profile failed:", e?.message || e); }

      if (remoteStats && isMountedRef.current) {
        setStats((prev) =>
          statsEqual(prev, remoteStats) ? prev : remoteStats
        );
        setStatsLoading(false);
        saveStatsCache(remoteStats);
        emitStatsChanged(remoteStats, initialBrand._id);
      }
    } catch (err) { console.warn("[offers] loading the offer stats failed:", err?.message || err); } finally {
      isStatsFetchingRef.current = false;
    }
  }, [initialBrand?._id, token, isGuest, saveStatsCache]);

  // ============================================================
  // MAIN FETCH
  // ============================================================
  const fetchAll = useCallback(
    async ({ silent = true, forceFresh = false } = {}) => {
      if (!initialBrand?._id) return;

      const now = Date.now();

      if (!forceFresh && now - lastFetchAtRef.current < MIN_FETCH_GAP) {
        return;
      }
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      lastFetchAtRef.current = now;

      // Spinner only for the first load or a manual refresh, not for polling
      if (!silent) setLoading(true);
      else if (forceFresh) setRefreshing(true);

      try {
        const hasAuth = token && !isGuest;
        const headers = hasAuth
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        // Logged-in users always read fresh claim state (server cache skipped)
        const offersUrl =
          forceFresh || hasAuth
            ? `/offers/brand/${initialBrand._id}?fresh=1`
            : `/offers/brand/${initialBrand._id}`;

        const [brandRes, offersRes, branchesRes] = await Promise.all([
          api
            .get(`/brands/${initialBrand._id}`, headers ? { headers } : undefined)
            .catch(() => ({ data: initialBrand })),
          api
            .get(offersUrl, headers ? { headers } : undefined)
            .catch(() => ({ data: initialBrand.offers || [] })),
          api
            .get(
              `/branches/brand/${initialBrand._id}`,
              headers ? { headers } : undefined
            )
            .catch(() => ({ data: { branches: [] } })),
        ]);

        if (!isMountedRef.current) return;

        const meId = userIdFromToken(token);

        const rawOffers = offersRes.data || [];
        if (meId) {
          const serverClaimedIds = extractClaimedIdsFromOffers(rawOffers, meId);
          // Authoritative for this brand's offers (removes redeemed/unclaimed ones)
          reconcileClaimedIds(
            serverClaimedIds,
            rawOffers.map((o) => o?._id).filter(Boolean)
          );
        }

        const freshOffers = rawOffers.map((offer) => {
          const serverSaysClaimed = isOfferClaimedByUser(offer, meId);
          const registrySaysClaimed = isLocallyClaimed(offer._id);
          const finalClaimed = serverSaysClaimed || registrySaysClaimed;

          return {
            ...offer,
            image: formatImageUrl(offer.image),
            displayImage: formatImageUrl(offer.image),
            isClaimed: finalClaimed,
            discountPercentage: offer.discountPercentage || 0,
          };
        });

        const branchList =
          branchesRes.data?.branches ||
          branchesRes.data?.data?.branches ||
          branchesRes.data ||
          [];
        const safeBranchList = Array.isArray(branchList) ? branchList : [];

        const formattedBranches = safeBranchList.map((b) => ({
          ...b,
          image: formatImageUrl(b.image),
          displayImage: formatImageUrl(b.image),
        }));

        setBranches((prev) =>
          branchesEqual(prev, formattedBranches) ? prev : formattedBranches
        );

        setSelectedBranch((prev) => {
          if (!prev) return null;
          const stillExists = formattedBranches.find((b) => b._id === prev._id);
          if (!stillExists) return null;
          if (branchesEqual([prev], [stillExists])) return prev;
          return stillExists;
        });

        const brandData = brandRes.data || {};

        const mergedBrandData = {
          ...initialBrand,
          ...brandData,
          name: brandData.name || brandData.brandName || initialBrand?.name || "Brand",
          brandName: brandData.brandName || brandData.name || initialBrand?.brandName || "Brand",
          description: brandData.description || initialBrand?.description || "",
          redeemInstructions: brandData.redeemInstructions || initialBrand?.redeemInstructions || "",
          location: brandData.location || brandData.address || initialBrand?.location || "",
          address: brandData.address || brandData.location || initialBrand?.address || "",
          category: brandData.category || initialBrand?.category || "General",
          logo: brandLogoUrl(brandData.logo) || fixLegacyImageUrl(initialBrand?.logo) || null,
          displayImage: brandLogoUrl(brandData.logo) || fixLegacyImageUrl(initialBrand?.displayImage) || null,
          isOnline: brandData.isOnline ?? initialBrand?.isOnline ?? false,
          isInStore: brandData.isInStore ?? initialBrand?.isInStore ?? false,
          offers: freshOffers.length > 0 ? freshOffers : (initialBrand?.offers || []),
        };

        setBrand(mergedBrandData);
        updateStatsFromOffers(freshOffers);
        setClaimVersion((v) => v + 1);

        setLastUpdated(Date.now());
        setLoading(false);
        setRefreshing(false);
      } catch (e) {
        console.log("Fetch error:", e?.message);
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      } finally {
        isFetchingRef.current = false;
      }
    },
    [initialBrand, token, isGuest, formatImageUrl, updateStatsFromOffers]
  );
  fetchAllRef.current = fetchAll; // pull to refresh calls it

  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      await hydrateClaimedRegistry(userIdFromToken(token));

      const cachedStats = await loadStatsCache();
      if (cachedStats && isMountedRef.current) {
        setStats(cachedStats);
        setStatsLoading(false);
      }

      setClaimVersion((v) => v + 1);
      fetchAll({ silent: false, forceFresh: false });
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAll, loadStatsCache]);

  useEffect(() => {
    const startPolling = (interval) => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (interval > 0) {
        pollTimerRef.current = setInterval(() => {
          if (isScreenFocusedRef.current && appStateRef.current === "active") {
            fetchAll({ silent: true, forceFresh: false });
          }
        }, interval);
      }
    };

    if (isScreenFocusedRef.current) {
      startPolling(POLL_INTERVAL);
    } else {
      startPolling(BACKGROUND_POLL_INTERVAL);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchAll]);

  useEffect(() => {
    if (statsPollTimerRef.current) clearInterval(statsPollTimerRef.current);
    statsPollTimerRef.current = setInterval(() => {
      if (isScreenFocusedRef.current && appStateRef.current === "active") {
        fetchStatsOnly();
      }
    }, STATS_POLL_INTERVAL);

    return () => {
      if (statsPollTimerRef.current) clearInterval(statsPollTimerRef.current);
    };
  }, [fetchStatsOnly]);

  useEffect(() => {
    const unsub = onStatsChanged((newStats, brandId) => {
      if (!isMountedRef.current || !newStats) return;
      if (brandId && brandId !== initialBrand?._id) return;
      setStats((prev) => (statsEqual(prev, newStats) ? prev : newStats));
    });
    return unsub;
  }, [initialBrand?._id]);

  useEffect(() => {
    const unsub = onCacheEvent((event) => {
      if (!event || event.type !== "cache:invalidated") return;
      if (!isMountedRef.current) return;
      if (event.brandId && event.brandId !== initialBrand?._id) return;

      if (event.type === "offer:unclaimed" && event.offerId) {
        unregisterLocalClaim(event.offerId);
        setBrand((prev) => {
          if (!prev) return prev;
          const updatedOffers = (prev.offers || []).map((o) =>
            o._id === event.offerId ? { ...o, isClaimed: false } : o
          );
          updateStatsFromOffers(updatedOffers);
          return { ...prev, offers: updatedOffers };
        });
        setClaimVersion((v) => v + 1);
      }

      if (event.type === "offer:claimed" && event.offerId) {
        registerLocalClaim(event.offerId);
        setBrand((prev) => {
          if (!prev) return prev;
          const updatedOffers = (prev.offers || []).map((o) =>
            o._id === event.offerId ? { ...o, isClaimed: true } : o
          );
          updateStatsFromOffers(updatedOffers);
          return { ...prev, offers: updatedOffers };
        });
        setClaimVersion((v) => v + 1);
      }
    });
    return unsub;
  }, [initialBrand?._id, updateStatsFromOffers]);

  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;

      fetchAll({ silent: true, forceFresh: false });
      fetchStatsOnly();

      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        if (appStateRef.current === "active") {
          fetchAll({ silent: true, forceFresh: false });
        }
      }, POLL_INTERVAL);

      return () => {
        isScreenFocusedRef.current = false;
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }, [fetchAll, fetchStatsOnly])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/inactive|background/) && nextState === "active") {
        fetchAll({ silent: true, forceFresh: false });
        fetchStatsOnly();
      }
    });
    return () => sub.remove();
  }, [fetchAll, fetchStatsOnly]);

  // ============================================================
  // DERIVED
  // ============================================================
  const currentOfferRaw = brand?.offers?.[0];
  const currentOffer = useMemo(() => {
    if (!currentOfferRaw) return null;
    return {
      ...currentOfferRaw,
      isClaimed:
        currentOfferRaw.isClaimed ||
        isLocallyClaimed(currentOfferRaw._id),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOfferRaw, claimVersion]);

  const activeData = useMemo(
    () => buildActiveData(brand, currentOffer, selectedBranch),
    [brand, currentOffer, selectedBranch]
  );

  const {
    discount: activeDiscount,
    title: activeTitle,
    description: activeDescription,
    redeemInstructions: activeRedeemInstructions,
    location: activeLocation,
    isOnline: activeIsOnline,
    isInStore: activeIsInStore,
    image: activeImage,
    category: activeCategory,
    branchName: activeBranchName,
  } = activeData;

  const hasSelectedBranch = !!selectedBranch;

  const openMap = useCallback(async (address) => {
    if (!address) {
      soundNope();
      Alert.alert("Notice", "Address not available.");
      return;
    }

    soundTap();   // 🔔 tap when opening map

    const destination = encodeURIComponent(address);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${destination}`,
      android: `geo:0,0?q=${destination}`,
    });
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${destination}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else await Linking.openURL(webUrl);
    } catch {
      Linking.openURL(webUrl);
    }
  }, []);

  // ============================================================
  // CLAIM OFFER — with full sound triggers
  // ============================================================
  const claimOffer = useCallback(
    async (offerId) => {
      if (isGuest) {
        // 🔔 nope sound for guest, then the sign up sheet
        soundNope();
        requireAccount();
        return;
      }

      if (isLocallyClaimed(offerId)) {
        // Already claimed — small tap, no drama
        soundTap();
        return;
      }

      try {
        setClaiming(true);

        // 🔔 play the "deal claimed" sound immediately for instant feedback
        soundDealClaimed();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Optimistic registry update
        registerLocalClaim(offerId);
        setClaimVersion((v) => v + 1);

        setBrand((prev) => {
          const updatedOffers = (prev?.offers || []).map((o) =>
            o._id === offerId ? { ...o, isClaimed: true } : o
          );
          updateStatsFromOffers(updatedOffers);
          return { ...prev, offers: updatedOffers };
        });

        emitOfferClaimed(initialBrand._id, offerId);
        try {
          notifyOfferClaimed(initialBrand._id, offerId, userIdFromToken(token));
        } catch (e) {
          console.log("notifyOfferClaimed error:", e);
        }

        await api.post(
          `/offers/claim/${offerId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        metaEvents.offerClaimed(offerId);
        pushMoment("deal"); // N-3 (pushAskV2): a good moment to ask for notifications

        // 🔔 success sound + modal
        soundSuccess();

        setClaimedBrandName(
          hasSelectedBranch
            ? `${brand?.name || brand?.brandName || ""} · ${selectedBranch.name}`
            : brand?.name || brand?.brandName || ""
        );
        setClaimedDiscount(activeDiscount);
        setClaimSuccessVisible(true);
        setClaiming(false);

        setTimeout(() => {
          fetchAll({ silent: true, forceFresh: true });
        }, 800);

        setTimeout(() => {
          setClaimSuccessVisible(false);
          navigation.navigate("MyDiscountScreen");
        }, 2200);
      } catch (err) {
        setClaiming(false);
        const msg = err.response?.data?.message || "Error claiming offer";

        if (err.response?.data?.alreadyClaimed) {
          // Server already had it — soft success, no error sound
          soundTap();
          registerLocalClaim(offerId);
          setClaimVersion((v) => v + 1);
          emitOfferClaimed(initialBrand._id, offerId);
          try {
            notifyOfferClaimed(initialBrand._id, offerId, userIdFromToken(token));
          } catch (e) { console.warn("[offers] refreshing after a claim error failed:", e?.message || e); }
          return;
        }

        // 🔔 error sound on failure
        soundError();

        unregisterLocalClaim(offerId);
        setClaimVersion((v) => v + 1);
        setBrand((prev) => {
          const updatedOffers = (prev?.offers || []).map((o) =>
            o._id === offerId ? { ...o, isClaimed: false } : o
          );
          updateStatsFromOffers(updatedOffers);
          return { ...prev, offers: updatedOffers };
        });

        Alert.alert("Notice", msg);
      }
    },
    [
      isGuest,
      requireAccount,
      token,
      brand,
      navigation,
      activeDiscount,
      hasSelectedBranch,
      selectedBranch,
      fetchAll,
      initialBrand?._id,
      updateStatsFromOffers,
    ]
  );

  if (loading || !brand) {
    return (
      <SafeAreaView style={styles.mainSafeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <View style={styles.loadingContainer} accessible accessibilityLabel="loading offer">
          <SkeletonBlock height={236} radius={0} />
          <View style={styles.skeletonCard}>
            <SkeletonBlock width={52} height={52} radius={16} />
            <SkeletonBlock width="60%" height={16} style={{ marginTop: 14 }} />
            <SkeletonBlock width="40%" height={36} style={{ marginTop: 14 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isClaimed = !!currentOffer?.isClaimed;
  const brandName = brand.name || brand.brandName || "brand";
  const claimedByCount = Array.isArray(currentOfferRaw?.claimedBy) ? currentOfferRaw.claimedBy.length : 0;
  const steps = String(activeRedeemInstructions || "")
    .split(/\n+/)
    .map((t) => t.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim())
    .filter(Boolean);
  const metaLine = [String(activeCategory || "").toLowerCase(), activeLocation].filter(Boolean).join(" · ");
  // Distance only when this brand came from Home's "near me" (and no branch is picked)
  const distanceText =
    !hasSelectedBranch && typeof brand.distanceKm === "number" ? formatDistance(brand.distanceKm) : "";
  const whereText =
    activeIsOnline && activeIsInStore ? "online + in-store" : activeIsOnline ? "online" : activeIsInStore ? "in-store" : "";
  const facts = [
    claimedByCount > 0 && { k: "claimed by", v: `${claimedByCount} ${claimedByCount === 1 ? "student" : "students"}` },
    whereText && { k: "where", v: whereText },
    branches.length > 0 && { k: "branches", v: String(branches.length) },
  ].filter(Boolean);
  const mapTarget = activeLocation || activeBranchName || brand.name;

  return (
    <SafeAreaView style={styles.mainSafeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <RemoteImage
            source={{
              uri: activeImage || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            }}
            style={styles.heroImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            size="banner"
          />
          <ScreenHeader
            title=""
            style={styles.heroHeader}
            onBack={() => {
              soundTap();
              navigation.goBack();
            }}
            right={
              <HeaderIconButton
                label="refresh offer"
                onPress={() => {
                  Haptics.selectionAsync();
                  soundRefresh();   // 🔔 refresh whoosh
                  fetchAll({ silent: true, forceFresh: true });
                  fetchStatsOnly();
                }}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={T.ink} />
                ) : (
                  <MaterialCommunityIcons name="refresh" size={19} color={T.ink} />
                )}
              </HeaderIconButton>
            }
          />
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.brandDetailHeader}>
            <View style={styles.logoCircle}>
              {brand.logo ? (
                <RemoteImage source={{ uri: brand.logo }} style={styles.brandImage} resizeMode="contain" size="logo" />
              ) : (
                <Text style={styles.logoInitial}>{brandName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">
                {brandName}
              </Text>
              {!!metaLine && (
                <Text style={styles.brandMeta} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {metaLine}
                </Text>
              )}
            </View>
          </View>

          {activeDiscount > 0 && (
            <Text style={styles.bigDiscount} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {activeDiscount}% off<Text style={{ color: T.yellow }}>.</Text>
            </Text>
          )}

          {(activeIsInStore || activeIsOnline) && (
            <View style={styles.availabilityRow}>
              {activeIsInStore && (
                <View style={[styles.availabilityPill, styles.availabilityPillOn]}>
                  <Text style={[styles.availabilityText, { color: T.white }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>in-store</Text>
                </View>
              )}
              {activeIsOnline && (
                <View style={[styles.availabilityPill, !activeIsInStore && styles.availabilityPillOn]}>
                  <Text
                    style={[styles.availabilityText, !activeIsInStore && { color: T.white }]}
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                  >
                    online
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {cityOptions.length > 0 && (
          <CityFilterBar
            options={cityOptions}
            selected={cityOptions.some((o) => o.city === city) ? city : ALL_CITIES}
            onSelect={setCity}
            style={{ marginTop: 16, marginBottom: 0 }}
          />
        )}
        {noBranchesInCity && city !== ALL_CITIES && (
          <Text style={styles.cityNotice} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            no branches in {city} yet. showing all branches.
          </Text>
        )}

        <BranchDropdown
          branches={visibleBranches}
          selectedBranch={selectedBranch}
          onSelect={(b) => {
            setSelectedBranch(b);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onClearSelection={() => setSelectedBranch(null)}
        />

        {facts.length > 0 && (
          <View style={styles.factsRow}>
            {facts.map((f) => (
              <View key={f.k} style={styles.factTile}>
                <Text style={styles.factKey} maxFontSizeMultiplier={MAX_FONT_SCALE}>{f.k}</Text>
                <Text style={styles.factValue} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>{f.v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Loyalty (FLAG_LOYALTY_V2): visits, tier, next tier, terms; nothing outside the pilot */}
        <LoyaltyCard brandId={initialBrand?._id} brandName={initialBrand?.brandName || initialBrand?.name} refreshKey={claimVersion} />

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
            about this offer<Text style={{ color: T.yellow }}>.</Text>
          </Text>
          <Text style={styles.tabContentTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{activeTitle}</Text>
          <Text style={styles.tabContentText}>{activeDescription}</Text>

          {hasSelectedBranch && (
            <View style={styles.branchInfoCard}>
              <MaterialCommunityIcons name="store-marker-outline" size={20} color={T.ink} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.branchInfoTitle}>{activeBranchName}</Text>
                {selectedBranch.city ? (
                  <Text style={styles.branchInfoText}>{selectedBranch.city}</Text>
                ) : null}
                {selectedBranch.address ? (
                  <Text style={styles.branchInfoText}>{selectedBranch.address}</Text>
                ) : null}
              </View>
            </View>
          )}

          {isGuest && (
            <TouchableOpacity
              style={styles.guestPromptCard}
              onPress={() => {
                soundTap();
                navigation.navigate("Login");
              }}
              accessibilityRole="button"
              accessibilityLabel="sign in to claim offers"
            >
              <MaterialCommunityIcons name="account-plus-outline" size={22} color={T.ink} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.guestPromptTitle}>unlock full benefits</Text>
                <Text style={styles.guestPromptText}>sign in to claim offers and get student discounts.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
            </TouchableOpacity>
          )}
        </View>

        {/* How to redeem */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
            how to redeem<Text style={{ color: T.yellow }}>.</Text>
          </Text>
          <View style={styles.steps}>
            {steps.map((text, i) => {
              const last = i === steps.length - 1;
              return (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.stepNum, last && styles.stepNumLast]}>
                    <Text style={[styles.stepNumText, last && { color: T.ink }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{text}</Text>
                </View>
              );
            })}
          </View>

          {/* Locate */}
          <TouchableOpacity
            style={[styles.mapButton, !mapTarget && styles.mapButtonDisabled]}
            onPress={() => openMap(mapTarget)}
            disabled={!mapTarget}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`open in maps${activeLocation ? `, ${activeLocation}` : ""}`}
          >
            <MaterialCommunityIcons name="map-marker-outline" size={20} color={T.ink} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mapButtonText} maxFontSizeMultiplier={MAX_FONT_SCALE}>open in maps</Text>
              <Text style={styles.mapAddress} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {activeLocation || "address not specified"}
              </Text>
            </View>
            {!!distanceText && (
              <Text style={styles.mapDistance} maxFontSizeMultiplier={MAX_FONT_SCALE}>{distanceText}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {currentOffer ? (
          isClaimed ? (
            <Button
              title="claimed. find it in my discounts"
              variant="secondary"
              icon={<MaterialCommunityIcons name="check-circle-outline" size={18} color={T.ink} />}
              onPress={() => {
                soundTap();
                navigation.navigate("MyDiscountScreen");
              }}
            />
          ) : isGuest ? (
            <Button
              title="sign in to claim"
              loading={claiming}
              onPress={() => claimOffer(currentOffer._id)}
            />
          ) : (
            <>
              <Text style={styles.holdHint} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {claiming ? "claiming…" : "at the counter? press and hold"}
              </Text>
              <HoldToClaim
                label={activeDiscount > 0 ? `hold to claim ${activeDiscount}% off` : "hold to claim"}
                disabled={claiming}
                onComplete={() => claimOffer(currentOffer._id)}
              />
            </>
          )
        ) : (
          <Button title="no offers available" disabled onPress={() => {}} />
        )}
      </View>

      <ClaimSuccessModal
        visible={claimSuccessVisible}
        onClose={() => setClaimSuccessVisible(false)}
        onDone={() => {
          setClaimSuccessVisible(false);
          navigation.navigate("MyDiscountScreen");
        }}
        brandName={claimedBrandName}
        discount={claimedDiscount}
        isInStore={activeIsInStore}
      />
    </SafeAreaView>
  );
}

