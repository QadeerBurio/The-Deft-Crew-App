// screens/OfferScreen.js - FULL SCREEN OFFER DETAIL WITH BRANCHES + SMART AUTO-REFRESH + CLAIM SYNC + AUTO-UPDATE STATS + PROPER DATA FETCH
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
  Image,
  ScrollView,
  Dimensions,
  StatusBar,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ FIXED: Single source of truth for API + cache events
import api, {
  notifyOfferClaimed,
  notifyOfferUnclaimed,
  onCacheEvent,
} from "../api/brandApi";

import { AuthContext } from "../context/AuthContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://the-deft-crew-production.up.railway.app";

// ── Cache keys ──
const OFFER_STATS_CACHE_PREFIX = "@offer_stats_cache:";
const CACHE_DURATION = 5 * 60 * 1000;

// ── Auto-refresh tuning ──
const POLL_INTERVAL = 15000;
const BACKGROUND_POLL_INTERVAL = 45000;
const MIN_FETCH_GAP = 3000;
const STATS_POLL_INTERVAL = 12000;

// ==========================================
// GLOBAL CLAIM EVENT BUS
// ==========================================
const claimListeners = new Set();
const statsListeners = new Set();

export const onOfferClaimed = (callback) => {
  claimListeners.add(callback);
  return () => claimListeners.delete(callback);
};

export const onStatsChanged = (callback) => {
  statsListeners.add(callback);
  return () => statsListeners.delete(callback);
};

const emitOfferClaimed = (brandId, offerId, extra = {}) => {
  claimListeners.forEach((cb) => {
    try {
      cb(brandId, offerId, extra);
    } catch (e) {
      console.log("claim listener error:", e);
    }
  });
};

const emitStatsChanged = (stats, brandId) => {
  statsListeners.forEach((cb) => {
    try {
      cb(stats, brandId);
    } catch (e) {
      console.log("stats listener error:", e);
    }
  });
};

// ==========================================
// HELPERS
// ==========================================
const userIdFromToken = (tk) => {
  if (!tk) return null;
  try {
    const payload = JSON.parse(atob(tk.split(".")[1]));
    return payload.id || payload._id || payload.userId || payload.sub || null;
  } catch {
    return null;
  }
};

const isOfferClaimedByUser = (offer, currentUserId) => {
  if (!offer?.claimedBy || !currentUserId) return false;
  const me = String(currentUserId);
  return offer.claimedBy.some((entry) => {
    if (!entry) return false;
    if (typeof entry === "string") return entry === me;
    const id =
      entry._id?.toString?.() ||
      entry.id?.toString?.() ||
      entry.userId?.toString?.() ||
      entry.toString?.();
    return id === me;
  });
};

const branchesEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x._id !== y._id ||
      x.name !== y.name ||
      x.discountPercentage !== y.discountPercentage ||
      x.isOnline !== y.isOnline ||
      x.isInStore !== y.isInStore ||
      x.city !== y.city
    ) {
      return false;
    }
  }
  return true;
};

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

const computeStatsFromOffers = (offers) => {
  if (!Array.isArray(offers)) {
    return {
      totalOffers: 0,
      claimedCount: 0,
      onlineCount: 0,
      inStoreCount: 0,
      maxDiscount: 0,
    };
  }
  let claimedCount = 0;
  let onlineCount = 0;
  let inStoreCount = 0;
  let maxDiscount = 0;
  for (const o of offers) {
    if (o.isClaimed) claimedCount++;
    if (o.isOnline) onlineCount++;
    if (o.isInStore) inStoreCount++;
    if ((o.discountPercentage || 0) > maxDiscount)
      maxDiscount = o.discountPercentage || 0;
  }
  return {
    totalOffers: offers.length,
    claimedCount,
    onlineCount,
    inStoreCount,
    maxDiscount,
  };
};

const statsEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.totalOffers === b.totalOffers &&
    a.claimedCount === b.claimedCount &&
    a.onlineCount === b.onlineCount &&
    a.inStoreCount === b.inStoreCount &&
    a.maxDiscount === b.maxDiscount
  );
};

// ==========================================
// ✅ HELPER: Build composite active data
// Merges branch + offer + brand with proper fallback chain
// ==========================================
const buildActiveData = (brand, currentOffer, selectedBranch) => {
  const hasBranch = !!selectedBranch;
  const branch = selectedBranch || {};
  const offer = currentOffer || {};
  const brandData = brand || {};

  // ✅ Discount — branch wins, then offer, then brand
  const discount = hasBranch
    ? Number(branch.discountPercentage || offer.discountPercentage || brandData.discount || 0)
    : Number(offer.discountPercentage || brandData.discount || 0);

  // ✅ Title — branch name wins, else offer title, else brand name
  const title = hasBranch
    ? branch.name || offer.title || brandData.name || "Offer Details"
    : offer.title || brandData.name || "Offer Details";

  // ✅ Description — cascade through all sources with proper fallbacks
  const description =
    (hasBranch && branch.description) ||
    offer.description ||
    brandData.description ||
    "Explore this iconic destination. Get exclusive student discounts.";

  // ✅ Redeem instructions — cascade through all sources
  const redeemInstructions =
    (hasBranch && branch.redeemInstructions) ||
    offer.redeemInstructions ||
    brandData.redeemInstructions ||
    "1. Show your valid student ID at the counter\n2. Mention you're a Crew Privilege member\n3. Enjoy your discount!";

  // ✅ Location — try multiple field names with proper fallbacks
  const location = hasBranch
    ? (branch.location || branch.address || branch.city || "")
    : (offer.location || offer.address || brandData.location || brandData.address || "");

  // ✅ Availability
  const isOnline = hasBranch
    ? !!branch.isOnline
    : !!(offer.isOnline || brandData.isOnline);

  const isInStore = hasBranch
    ? !!branch.isInStore
    : !!(offer.isInStore || brandData.isInStore);

  // ✅ Image — branch image wins, then offer image, then brand logo
  const image =
    (hasBranch && branch.image) ||
    offer.image ||
    offer.displayImage ||
    brandData.displayImage ||
    brandData.logo ||
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  // ✅ Category
  const category =
    (hasBranch && branch.category) ||
    offer.category ||
    brandData.category ||
    "General";

  return {
    discount,
    title,
    description,
    redeemInstructions,
    location,
    isOnline,
    isInStore,
    image,
    category,
    branchName: hasBranch ? branch.name : null,
  };
};

// ==========================================
// CLAIM SUCCESS MODAL
// ==========================================
const ClaimSuccessModal = ({ visible, onClose, brandName, discount }) => {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.successOverlay} onPress={onClose}>
        <View style={styles.successCard}>
          <View style={styles.successIconCircle}>
            <LinearGradient
              colors={["#f9c349", "#f5a623"]}
              style={styles.successIconGradient}
            >
              <MaterialCommunityIcons
                name="check-decagram"
                size={50}
                color="#fff"
              />
            </LinearGradient>
          </View>
          <Text style={styles.successTitle}>🎉 Offer Claimed!</Text>
          {brandName ? (
            <Text style={styles.successBrandName}>{brandName}</Text>
          ) : null}
          {discount > 0 ? (
            <View style={styles.successDiscountBadge}>
              <Text style={styles.successDiscountText}>{discount}% OFF</Text>
            </View>
          ) : null}
          <Text style={styles.successSubtext}>
            Your student discount has been added to your wallet.
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
};

// ==========================================
// LIVE STATS STRIP
// ==========================================
const LiveStatsStrip = ({ stats, loading }) => {
  if (loading && !stats) {
    return (
      <View style={styles.liveStatsContainer}>
        <View style={styles.liveStatsSkeleton} />
      </View>
    );
  }
  if (!stats) return null;

  return (
    <View style={styles.liveStatsContainer}>
      <View style={styles.liveStatItem}>
        <Text style={styles.liveStatValue}>{stats.totalOffers}</Text>
        <Text style={styles.liveStatLabel}>Offers</Text>
      </View>
      <View style={styles.liveStatDivider} />
      <View style={styles.liveStatItem}>
        <Text style={[styles.liveStatValue, { color: "#f9c349" }]}>
          {stats.maxDiscount}%
        </Text>
        <Text style={styles.liveStatLabel}>Max Off</Text>
      </View>
      <View style={styles.liveStatDivider} />
      <View style={styles.liveStatItem}>
        <Text style={[styles.liveStatValue, { color: "#22c55e" }]}>
          {stats.claimedCount}
        </Text>
        <Text style={styles.liveStatLabel}>Claimed</Text>
      </View>
      <View style={styles.liveStatDivider} />
      <View style={styles.liveStatItem}>
        <View style={styles.liveDot} />
        <Text style={styles.liveStatLabel}>Live</Text>
      </View>
    </View>
  );
};

// ==========================================
// BRANCH DROPDOWN COMPONENT
// ==========================================
const BranchDropdown = ({
  branches,
  selectedBranch,
  onSelect,
  onClearSelection,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!branches || branches.length === 0) return null;

  const handleSelect = (branch) => {
    if (selectedBranch?._id === branch._id) {
      onClearSelection();
    } else {
      onSelect(branch);
    }
    setExpanded(false);
  };

  return (
    <View style={styles.branchDropdownWrap}>
      <TouchableOpacity
        style={[
          styles.branchDropdownHeader,
          expanded && styles.branchDropdownHeaderOpen,
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          setExpanded(!expanded);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.branchDropdownHeaderLeft}>
          <View style={styles.branchDropdownIconWrap}>
            <MaterialCommunityIcons
              name="store-marker"
              size={18}
              color="#f9c349"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.branchDropdownLabel}>
              {selectedBranch ? "Selected Branch" : "Select Branch"}
            </Text>
            <Text style={styles.branchDropdownValue} numberOfLines={1}>
              {selectedBranch
                ? selectedBranch.name
                : `${branches.length} ${
                    branches.length === 1 ? "branch" : "branches"
                  } available`}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color="#666"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.branchDropdownList}>
          <TouchableOpacity
            style={[
              styles.branchDropdownItem,
              !selectedBranch && styles.branchDropdownItemActive,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onClearSelection();
              setExpanded(false);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.branchDropdownItemRow}>
              <MaterialCommunityIcons
                name="tag-outline"
                size={16}
                color={!selectedBranch ? "#f9c349" : "#999"}
              />
              <Text
                style={[
                  styles.branchDropdownItemName,
                  !selectedBranch && styles.branchDropdownItemNameActive,
                ]}
              >
                Original Offer
              </Text>
              {!selectedBranch && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#f9c349"
                />
              )}
            </View>
          </TouchableOpacity>

          {branches.map((branch, idx) => {
            const isSelected = selectedBranch?._id === branch._id;
            return (
              <TouchableOpacity
                key={branch._id || idx}
                style={[
                  styles.branchDropdownItem,
                  isSelected && styles.branchDropdownItemActive,
                ]}
                onPress={() => handleSelect(branch)}
                activeOpacity={0.8}
              >
                <View style={styles.branchDropdownItemRow}>
                  <MaterialCommunityIcons
                    name={branch.isOnline ? "earth" : "storefront"}
                    size={16}
                    color={isSelected ? "#f9c349" : "#999"}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.branchDropdownItemName,
                        isSelected && styles.branchDropdownItemNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {branch.name}
                    </Text>
                    {branch.city ? (
                      <Text style={styles.branchDropdownItemCity}>
                        {branch.city}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.branchDropdownPill,
                      isSelected && styles.branchDropdownPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.branchDropdownPillText,
                        isSelected && styles.branchDropdownPillTextActive,
                      ]}
                    >
                      {branch.discountPercentage}%
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color="#f9c349"
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ==========================================
// OFFER SCREEN
// ==========================================
export default function OfferScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { brand: initialBrand } = route.params || {};
  const { token, isGuest } = useContext(AuthContext);

  const [brand, setBrand] = useState(initialBrand || null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(!initialBrand);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("gift");
  const [claiming, setClaiming] = useState(false);
  const [claimSuccessVisible, setClaimSuccessVisible] = useState(false);
  const [claimedBrandName, setClaimedBrandName] = useState("");
  const [claimedDiscount, setClaimedDiscount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [locallyClaimedIds, setLocallyClaimedIds] = useState(() => new Set());

  const isMountedRef = useRef(true);
  const isScreenFocusedRef = useRef(false);
  const pollTimerRef = useRef(null);
  const statsPollTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const justClaimedRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const lastStatsFetchAtRef = useRef(0);
  const isFetchingRef = useRef(false);
  const isStatsFetchingRef = useRef(false);
  const locallyClaimedIdsRef = useRef(locallyClaimedIds);
  const statsCacheRef = useRef(null);

  const statsCacheKey = useMemo(() => {
    return initialBrand?._id
      ? `${OFFER_STATS_CACHE_PREFIX}${initialBrand._id}`
      : null;
  }, [initialBrand?._id]);

  useEffect(() => {
    locallyClaimedIdsRef.current = locallyClaimedIds;
  }, [locallyClaimedIds]);

  useEffect(() => {
    statsCacheRef.current = stats;
  }, [stats]);

  // ── Format image URL ──
  const formatImageUrl = useCallback((imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
      return imagePath;
    const cleanPath = imagePath.replace(/^\/+/, "");
    return `${BASE_URL}/${cleanPath}`;
  }, []);

  // ── Stats cache helpers ──
  const saveStatsCache = useCallback(
    async (computedStats) => {
      if (!statsCacheKey || !computedStats) return;
      try {
        await AsyncStorage.setItem(
          statsCacheKey,
          JSON.stringify({ data: computedStats, timestamp: Date.now() })
        );
      } catch (e) {
        // Silent
      }
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

  // ── Update stats from offers ──
  const updateStatsFromOffers = useCallback(
    (offers) => {
      const computed = computeStatsFromOffers(offers);
      setStats((prev) => (statsEqual(prev, computed) ? prev : computed));
      setStatsLoading(false);
      statsCacheRef.current = computed;

      saveStatsCache(computed);

      if (initialBrand?._id) {
        emitStatsChanged(computed, initialBrand._id);
      }

      return computed;
    },
    [saveStatsCache, initialBrand?._id]
  );

  // ── Stats-only fetch ──
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

      let remoteStats = null;
      try {
        const res = await api.get(
          `/offers/brand/${initialBrand._id}/stats`,
          {
            headers,
            timeout: 4000,
          }
        );
        if (res?.data) {
          remoteStats = {
            totalOffers: res.data.totalOffers || 0,
            claimedCount: res.data.claimedCount || 0,
            onlineCount: res.data.onlineCount || 0,
            inStoreCount: res.data.inStoreCount || 0,
            maxDiscount: res.data.maxDiscount || 0,
          };
        }
      } catch {
        // Silent fallback
      }

      if (remoteStats && isMountedRef.current) {
        setStats((prev) =>
          statsEqual(prev, remoteStats) ? prev : remoteStats
        );
        setStatsLoading(false);
        statsCacheRef.current = remoteStats;
        saveStatsCache(remoteStats);
        emitStatsChanged(remoteStats, initialBrand._id);
      }
    } catch (err) {
      // Silent fail
    } finally {
      isStatsFetchingRef.current = false;
    }
  }, [initialBrand?._id, token, isGuest, saveStatsCache]);

  // ==========================================
  // ✅ MAIN FETCH — Fetches brand + offers + branches with proper merge
  // ==========================================
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

      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const hasAuth = token && !isGuest;
        const headers = hasAuth
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        const offersUrl = forceFresh
          ? `/offers/brand/${initialBrand._id}?fresh=1&t=${Date.now()}`
          : `/offers/brand/${initialBrand._id}`;

        // ✅ Fetch all 3 in parallel
        const [brandRes, offersRes, branchesRes] = await Promise.all([
          // 1. Brand details
          api
            .get(`/brands/${initialBrand._id}`, headers ? { headers } : undefined)
            .catch(() => ({ data: initialBrand })),
          // 2. Offers for this brand
          api
            .get(offersUrl, headers ? { headers } : undefined)
            .catch(() => ({ data: initialBrand.offers || [] })),
          // 3. Branches for this brand
          api
            .get(
              `/branches/brand/${initialBrand._id}`,
              headers ? { headers } : undefined
            )
            .catch(() => ({ data: { branches: [] } })),
        ]);

        if (!isMountedRef.current) return;

        const meId = userIdFromToken(token);
        const claimedSet = locallyClaimedIdsRef.current;

        // ── Process offers ──
        const freshOffers = (offersRes.data || []).map((offer) => ({
          ...offer,
          image: formatImageUrl(offer.image),
          displayImage: formatImageUrl(offer.image),
          isClaimed:
            isOfferClaimedByUser(offer, meId) || claimedSet.has(offer._id),
          discountPercentage: offer.discountPercentage || 0,
        }));

        // ── Process branches ──
        const branchList =
          branchesRes.data?.branches ||
          branchesRes.data?.data?.branches ||
          branchesRes.data ||
          [];
        const safeBranchList = Array.isArray(branchList) ? branchList : [];

        // Format branch images too
        const formattedBranches = safeBranchList.map((b) => ({
          ...b,
          image: formatImageUrl(b.image),
          displayImage: formatImageUrl(b.image),
        }));

        setBranches((prev) =>
          branchesEqual(prev, formattedBranches) ? prev : formattedBranches
        );

        // Preserve selected branch across refetches
        setSelectedBranch((prev) => {
          if (!prev) return null;
          const stillExists = formattedBranches.find((b) => b._id === prev._id);
          if (!stillExists) return null;
          if (branchesEqual([prev], [stillExists])) return prev;
          return stillExists;
        });

        // ── Merge brand + offers with FULL data ──
        const brandData = brandRes.data || {};
        
        // ✅ Extract ALL brand fields with proper fallbacks
        const mergedBrandData = {
          ...initialBrand,
          ...brandData,
          // Ensure name is available
          name: brandData.name || brandData.brandName || initialBrand?.name || "Brand",
          brandName: brandData.brandName || brandData.name || initialBrand?.brandName || "Brand",
          // Ensure description
          description: brandData.description || initialBrand?.description || "",
          // Ensure redeemInstructions
          redeemInstructions: brandData.redeemInstructions || initialBrand?.redeemInstructions || "",
          // Ensure location
          location: brandData.location || brandData.address || initialBrand?.location || "",
          address: brandData.address || brandData.location || initialBrand?.address || "",
          // Ensure category
          category: brandData.category || initialBrand?.category || "General",
          // Ensure image
          logo: formatImageUrl(brandData.logo) || initialBrand?.logo || null,
          displayImage: formatImageUrl(brandData.logo) || initialBrand?.displayImage || null,
          // Availability
          isOnline: brandData.isOnline ?? initialBrand?.isOnline ?? false,
          isInStore: brandData.isInStore ?? initialBrand?.isInStore ?? false,
          // Offers
          offers: freshOffers.length > 0 ? freshOffers : (initialBrand?.offers || []),
        };

        setBrand(mergedBrandData);
        updateStatsFromOffers(freshOffers);

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
    [
      initialBrand,
      token,
      isGuest,
      formatImageUrl,
      updateStatsFromOffers,
    ]
  );

  // ── Mount: hydrate stats cache + fetch ──
  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      // 1. Load cached stats instantly
      const cachedStats = await loadStatsCache();
      if (cachedStats && isMountedRef.current) {
        setStats(cachedStats);
        setStatsLoading(false);
        statsCacheRef.current = cachedStats;
      }

      // 2. Fetch fresh data
      fetchAll({ silent: false, forceFresh: false });
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAll, loadStatsCache]);

  // ── Polling ──
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
      if (statsPollTimerRef.current)
        clearInterval(statsPollTimerRef.current);
    };
  }, [fetchStatsOnly]);

  // ── Listen to global stats events ──
  useEffect(() => {
    const unsub = onStatsChanged((newStats, brandId) => {
      if (!isMountedRef.current || !newStats) return;
      if (brandId && brandId !== initialBrand?._id) return;
      setStats((prev) => (statsEqual(prev, newStats) ? prev : newStats));
    });
    return unsub;
  }, [initialBrand?._id]);

  // ── Listen to cache events (claim/unclaim from other screens) ──
  useEffect(() => {
    const unsub = onCacheEvent((event) => {
      if (!event || event.type !== "cache:invalidated") return;
      if (!isMountedRef.current) return;
      if (event.brandId && event.brandId !== initialBrand?._id) return;

      if (event.type === "offer:unclaimed" && event.offerId) {
        setBrand((prev) => {
          if (!prev) return prev;
          const updatedOffers = (prev.offers || []).map((o) =>
            o._id === event.offerId ? { ...o, isClaimed: false } : o
          );
          updateStatsFromOffers(updatedOffers);
          return { ...prev, offers: updatedOffers };
        });

        setLocallyClaimedIds((prev) => {
          const next = new Set(prev);
          next.delete(event.offerId);
          return next;
        });
      }

      if (event.type === "offer:claimed" && event.offerId) {
        setBrand((prev) => {
          if (!prev) return prev;
          const updatedOffers = (prev.offers || []).map((o) =>
            o._id === event.offerId ? { ...o, isClaimed: true } : o
          );
          updateStatsFromOffers(updatedOffers);
          return { ...prev, offers: updatedOffers };
        });
      }
    });
    return unsub;
  }, [initialBrand?._id, updateStatsFromOffers]);

  // ── Focus lifecycle ──
  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;

      const forceFresh = justClaimedRef.current;
      justClaimedRef.current = false;

      fetchAll({ silent: true, forceFresh });
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

  // ── App foreground refresh ──
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

  // ==========================================
  // ✅ Derived data — using composite builder
  // ==========================================
  const currentOfferRaw = brand?.offers?.[0];
  const currentOffer = currentOfferRaw
    ? {
        ...currentOfferRaw,
        isClaimed:
          currentOfferRaw.isClaimed ||
          locallyClaimedIds.has(currentOfferRaw._id),
      }
    : null;

  // ✅ Build active data with proper fallback chain
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

  // ── Open maps ──
  const openMap = useCallback(async (address) => {
    if (!address) {
      Alert.alert("Notice", "Address not available.");
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
      if (supported) await Linking.openURL(url);
      else await Linking.openURL(webUrl);
    } catch {
      Linking.openURL(webUrl);
    }
  }, []);

  // ==========================================
  // CLAIM OFFER
  // ==========================================
  const claimOffer = useCallback(
    async (offerId) => {
      if (isGuest) {
        Alert.alert(
          "Sign In Required",
          "Please sign in to claim this offer and get student discounts!",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign In",
              onPress: () => navigation.navigate("Login"),
            },
          ]
        );
        return;
      }

      if (locallyClaimedIds.has(offerId)) return;

      try {
        setClaiming(true);
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );

        await api.post(
          `/offers/claim/${offerId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setLocallyClaimedIds((prev) => {
          const next = new Set(prev);
          next.add(offerId);
          return next;
        });

        emitOfferClaimed(initialBrand._id, offerId);

        try {
          notifyOfferClaimed(
            initialBrand._id,
            offerId,
            userIdFromToken(token)
          );
        } catch (e) {
          console.log("notifyOfferClaimed error:", e);
        }

        justClaimedRef.current = true;

        setBrand((prev) => {
          const updatedOffers = (prev?.offers || []).map((o) =>
            o._id === offerId ? { ...o, isClaimed: true } : o
          );
          updateStatsFromOffers(updatedOffers);
          return { ...prev, offers: updatedOffers };
        });

        const updatedStats = computeStatsFromOffers(
          (brand?.offers || []).map((o) =>
            o._id === offerId ? { ...o, isClaimed: true } : o
          )
        );
        emitStatsChanged(updatedStats, initialBrand._id);

        setClaimedBrandName(
          hasSelectedBranch
            ? `${brand?.name || brand?.brandName || ""} · ${
                selectedBranch.name
              }`
            : brand?.name || brand?.brandName || ""
        );
        setClaimedDiscount(activeDiscount);
        setClaimSuccessVisible(true);
        setClaiming(false);

        fetchAll({ silent: true, forceFresh: true });

        setTimeout(() => {
          setClaimSuccessVisible(false);
          navigation.navigate("MyDiscountScreen");
        }, 2200);
      } catch (err) {
        setClaiming(false);
        const msg =
          err.response?.data?.message || "Error claiming offer";
        if (err.response?.data?.alreadyClaimed) {
          setLocallyClaimedIds((prev) => {
            const next = new Set(prev);
            next.add(offerId);
            return next;
          });

          emitOfferClaimed(initialBrand._id, offerId);
          try {
            notifyOfferClaimed(
              initialBrand._id,
              offerId,
              userIdFromToken(token)
            );
          } catch (e) {
            console.log("notifyOfferClaimed error:", e);
          }
          return;
        }
        Alert.alert("Notice", msg);
      }
    },
    [
      isGuest,
      token,
      brand,
      navigation,
      activeDiscount,
      hasSelectedBranch,
      selectedBranch,
      fetchAll,
      locallyClaimedIds,
      initialBrand?._id,
      updateStatsFromOffers,
    ]
  );

  // ── Loading ──
  if (loading || !brand) {
    return (
      <SafeAreaView style={styles.mainSafeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading offer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isClaimed = !!currentOffer?.isClaimed;

  return (
    <SafeAreaView style={styles.mainSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons
            name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
            size={24}
            color="#000"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offer Details</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            Haptics.selectionAsync();
            fetchAll({ silent: true, forceFresh: true });
            fetchStatsOnly();
          }}
          activeOpacity={0.7}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#f9c349" />
          ) : (
            <MaterialCommunityIcons
              name="refresh"
              size={22}
              color="#000"
            />
          )}
        </TouchableOpacity>
      </View>

     

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandDetailHeader}>
          <View style={styles.logoCircle}>
            <Image
              source={{
                uri:
                  activeImage ||
                  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
              }}
              style={styles.brandImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>
            {brand.name || brand.brandName || "Brand"}
          </Text>
          <View style={styles.categoryBadge}>
            <MaterialIcons name="category" size={14} color="black" />
            <Text style={styles.categoryText}>
              {activeCategory}
            </Text>
          </View>

          {/* Availability pills */}
          <View style={styles.availabilityRow}>
            {activeIsOnline && (
              <View style={styles.availabilityPill}>
                <MaterialCommunityIcons
                  name="earth"
                  size={14}
                  color="#f9c349"
                />
                <Text style={styles.availabilityText}>Online</Text>
              </View>
            )}
            {activeIsInStore && (
              <View style={styles.availabilityPill}>
                <MaterialCommunityIcons
                  name="storefront"
                  size={14}
                  color="#f9c349"
                />
                <Text style={styles.availabilityText}>In-Store</Text>
              </View>
            )}
          </View>
        </View>

        {/* Branch dropdown */}
        <BranchDropdown
          branches={branches}
          selectedBranch={selectedBranch}
          onSelect={(b) => {
            setSelectedBranch(b);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onClearSelection={() => setSelectedBranch(null)}
        />

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {["gift", "redeem", "location"].map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab);
              }}
              style={[
                styles.tabItem,
                activeTab === tab && styles.activeTabCard,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab === "gift"
                  ? "Details"
                  : tab === "redeem"
                  ? "Redeem"
                  : "Locate"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Details Tab ── */}
        {activeTab === "gift" && (
          <View style={styles.tabContentWrapper}>
            <Text style={styles.tabContentTitle}>{activeTitle}</Text>
            <Text style={styles.tabContentText}>{activeDescription}</Text>

            {activeDiscount > 0 && (
              <View style={styles.discountInfoRow}>
                <MaterialCommunityIcons
                  name="percent"
                  size={20}
                  color="#f9c349"
                />
                <Text style={styles.discountInfoText}>
                  {activeDiscount}% OFF for students
                </Text>
              </View>
            )}

            {/* Show branch info if selected */}
            {hasSelectedBranch && (
              <View style={styles.branchInfoCard}>
                <MaterialCommunityIcons
                  name="store-marker"
                  size={20}
                  color="#f9c349"
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.branchInfoTitle}>
                    {activeBranchName}
                  </Text>
                  {selectedBranch.city ? (
                    <Text style={styles.branchInfoText}>
                      {selectedBranch.city}
                    </Text>
                  ) : null}
                  {selectedBranch.address ? (
                    <Text style={styles.branchInfoText}>
                      {selectedBranch.address}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            {isGuest && (
              <TouchableOpacity
                style={styles.guestPromptCard}
                onPress={() => navigation.navigate("Login")}
              >
                <MaterialCommunityIcons
                  name="account-plus"
                  size={24}
                  color="#f9c349"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.guestPromptTitle}>
                    Unlock Full Benefits
                  </Text>
                  <Text style={styles.guestPromptText}>
                    Sign in to claim offers and get student discounts!
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#f9c349"
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Redeem Tab ── */}
        {activeTab === "redeem" && (
          <View style={styles.tabContentWrapper}>
            <View style={styles.instructionHeader}>
              <MaterialCommunityIcons
                name="ticket-confirmation-outline"
                size={24}
                color="#000000"
              />
              <Text style={styles.instructionTitle}>How to Redeem</Text>
            </View>
            <Text style={styles.tabContentText}>
              {activeRedeemInstructions}
            </Text>

            {activeIsOnline && (
              <View style={styles.redeemOnlineBadge}>
                <MaterialCommunityIcons
                  name="earth"
                  size={16}
                  color="#3b82f6"
                />
                <Text style={styles.redeemOnlineText}>
                  Available Online
                </Text>
              </View>
            )}
            {activeIsInStore && (
              <View style={styles.redeemStoreBadge}>
                <MaterialCommunityIcons
                  name="storefront"
                  size={16}
                  color="#ec4899"
                />
                <Text style={styles.redeemStoreText}>
                  Available In-Store
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Location Tab ── */}
        {activeTab === "location" && (
          <View style={styles.tabContentWrapper}>
            <View style={styles.locationInfoRow}>
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={24}
                color="#000000"
              />
              <Text style={styles.locationAddressText}>
                {activeLocation || "Address not specified"}
              </Text>
            </View>

            {/* Show branch info in location tab too */}
            {hasSelectedBranch && (selectedBranch.city || selectedBranch.address) && (
              <View style={styles.branchLocationCard}>
                <MaterialCommunityIcons
                  name="storefront"
                  size={18}
                  color="#f9c349"
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.branchLocationTitle}>
                    {activeBranchName}
                  </Text>
                  {selectedBranch.city ? (
                    <Text style={styles.branchLocationText}>
                      📍 {selectedBranch.city}
                    </Text>
                  ) : null}
                  {selectedBranch.address ? (
                    <Text style={styles.branchLocationText}>
                      {selectedBranch.address}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.mapButton,
                !activeLocation && styles.mapButtonDisabled,
              ]}
              onPress={() =>
                openMap(activeLocation || activeBranchName || brand.name)
              }
              disabled={!activeLocation && !activeBranchName && !brand.name}
            >
              <MaterialCommunityIcons
                name="directions"
                size={18}
                color="#fff"
              />
              <Text style={styles.mapButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>

        {currentOffer ? (
          <TouchableOpacity
            style={styles.claimBtnWrapper}
            disabled={isClaimed || claiming}
            onPress={() => claimOffer(currentOffer._id)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                isClaimed ? ["#ccc", "#bbb"] : ["#f9c349", "#f5a623"]
              }
              style={styles.claimGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {claiming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={isClaimed ? "check-circle" : "gift"}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.claimBtnText} numberOfLines={1}>
                    {isClaimed
                      ? "✓ Claimed"
                      : `Claim ${activeDiscount}% OFF`}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={[styles.claimBtnWrapper, styles.noOfferBtn]}>
            <Text style={styles.noOfferText}>No Offers Available</Text>
          </View>
        )}
      </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 12, color: "#999", fontSize: 14 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    fontFamily: "Cardo",
  },

  liveStatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
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
  liveStatsSkeleton: {
    height: 26,
    width: "80%",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  liveStatItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  liveStatValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
    fontFamily: "Cardo",
  },
  liveStatLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  liveStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#f0f0f0",
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f9c34915",
    borderWidth: 1,
    borderColor: "#f9c34930",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f9c349",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 30 },

  brandDetailHeader: { alignItems: "center", marginBottom: 10 },
  logoCircle: {
    width: "100%",
    height: 170,
    borderRadius: 20,
    backgroundColor: "#F7F9F8",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  brandImage: { width: "75%", height: "75%" },
  brandTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#000000",
    marginTop: 15,
    textAlign: "center",
    fontFamily: "Cardo",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 10,
    color: "#000000",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginLeft: 6,
  },
  availabilityRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  availabilityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9c34915",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f9c34940",
    gap: 4,
  },
  availabilityText: {
    fontSize: 12,
    color: "#f9c349",
    fontWeight: "700",
  },

  branchDropdownWrap: {
    marginTop: 20,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  branchDropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  branchDropdownHeaderOpen: {
    backgroundColor: "#fffdf5",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  branchDropdownHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  branchDropdownIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f9c34915",
    alignItems: "center",
    justifyContent: "center",
  },
  branchDropdownLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  branchDropdownValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 2,
  },
  branchDropdownList: {
    backgroundColor: "#fff",
  },
  branchDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  branchDropdownItemActive: {
    backgroundColor: "#fffdf5",
  },
  branchDropdownItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  branchDropdownItemName: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#333",
  },
  branchDropdownItemNameActive: {
    color: "#000",
    fontWeight: "800",
  },
  branchDropdownItemCity: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  branchDropdownPill: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
  },
  branchDropdownPillActive: {
    backgroundColor: "#f9c349",
  },
  branchDropdownPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#666",
  },
  branchDropdownPillTextActive: {
    color: "#fff",
  },

  // ✅ Branch info cards
  branchInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fffdf5",
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#f9c34930",
  },
  branchInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  branchInfoText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  branchLocationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8f9fb",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  branchLocationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  branchLocationText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
    marginTop: 2,
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F2F1",
    borderRadius: 18,
    padding: 6,
    marginBottom: 10,
    marginTop: 20,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 14,
  },
  activeTabCard: {
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 13,
    color: "#999",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeTabText: { color: "#000000" },

  tabContentWrapper: { marginTop: 15, paddingHorizontal: 5 },
  tabContentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 10,
    fontFamily: "Cardo",
  },
  tabContentText: { fontSize: 14, color: "#666", lineHeight: 22 },

  discountInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9c34915",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#f9c34930",
  },
  discountInfoText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f9c349",
    marginLeft: 10,
  },

  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
    fontFamily: "Cardo",
  },

  redeemOnlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  redeemOnlineText: {
    fontSize: 13,
    color: "#1565c0",
    fontWeight: "600",
    marginLeft: 8,
  },
  redeemStoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fce7f3",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  redeemStoreText: {
    fontSize: 13,
    color: "#831843",
    fontWeight: "600",
    marginLeft: 8,
  },

  locationInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  locationAddressText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 10,
    flexShrink: 1,
  },
  mapButton: {
    flexDirection: "row",
    backgroundColor: "#000000",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  mapButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  mapButtonText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 14,
  },

  guestPromptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  guestPromptTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  guestPromptText: { fontSize: 12, color: "#666", lineHeight: 16 },

  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  closeBtn: {
    flex: 0.4,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: "#777", fontWeight: "700", fontSize: 14 },

  claimBtnWrapper: {
    flex: 0.6,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  claimGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  claimBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  noOfferBtn: {
    backgroundColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0,
    elevation: 0,
  },
  noOfferText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  successCard: {
    width: width * 0.85,
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 30,
    alignItems: "center",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  successIconCircle: {
    marginBottom: 20,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#000",
    marginBottom: 8,
  },
  successBrandName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  successDiscountBadge: {
    backgroundColor: "#f9c34920",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f9c34940",
  },
  successDiscountText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f9c349",
  },
  successSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
});