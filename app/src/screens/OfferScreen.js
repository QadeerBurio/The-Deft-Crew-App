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
  Animated,
  Easing,
  AccessibilityInfo,
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
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import api, {
  notifyOfferClaimed,
  notifyOfferUnclaimed,
  onCacheEvent,
} from "../api/brandApi";

import { AuthContext } from "../context/AuthContext";
import CityFilterBar from "../components/CityFilterBar";
import {
  ALL_CITIES,
  useSelectedCity,
  branchMatchesCity,
  buildCityOptions,
} from "../utils/cityFilter";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { Button, SkeletonBlock } from "../ui";
import Dot from "../engagement/components/Dot";
import { formatDistance } from "../utils/distance";

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

const { width } = Dimensions.get("window");
const BASE_URL = "https://the-deft-crew-production.up.railway.app";

const OFFER_STATS_CACHE_PREFIX = "@offer_stats_cache:";
const CACHE_DURATION = 5 * 60 * 1000;

const POLL_INTERVAL = 15000;
const BACKGROUND_POLL_INTERVAL = 45000;
const MIN_FETCH_GAP = 3000;
const STATS_POLL_INTERVAL = 12000;

// ============================================================
// ✅ PERSISTENT CLAIMED IDS REGISTRY (per user)
// Before: one shared key for every account and IDs were only ever added,
// so a redeemed/removed offer stayed "Claimed" forever and the next user
// on the same phone saw the previous user's claims.
// ============================================================
const CLAIMED_IDS_STORAGE_PREFIX = "@tdc_claimed_offer_ids:";
const LEGACY_CLAIMED_IDS_KEY = "@tdc_claimed_offer_ids";
const RECENT_CLAIM_GRACE_MS = 20000; // ignore server for 20s after a local claim

const claimedIdsRegistry = new Set();
const recentLocalClaims = new Map(); // offerId → timestamp
let registryOwner = null; // userId the registry belongs to
let registryHydrated = false;
let hydratingPromise = null;

const storageKeyFor = (uid) => `${CLAIMED_IDS_STORAGE_PREFIX}${uid}`;

const userIdFromStoredToken = async () => {
  try {
    const [[, tk], [, guest]] = await AsyncStorage.multiGet(["token", "isGuest"]);
    if (!tk || guest === "true") return null;
    const payload = JSON.parse(atob(tk.split(".")[1]));
    return payload.id || payload._id || payload.userId || payload.sub || null;
  } catch {
    return null;
  }
};

let persistTimer = null;
const persistRegistry = () => {
  if (!registryOwner) return;
  const owner = registryOwner;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    try {
      const arr = Array.from(claimedIdsRegistry);
      await AsyncStorage.setItem(storageKeyFor(owner), JSON.stringify(arr));
    } catch (e) {
      console.log("persistRegistry error:", e);
    }
  }, 200);
};

// Loads the claimed IDs of the logged-in user. Safe to call many times.
export const hydrateClaimedRegistry = async (userId) => {
  const uid = userId || (await userIdFromStoredToken());

  if (registryHydrated && registryOwner === (uid || null)) return;
  if (hydratingPromise) {
    await hydratingPromise;
    if (registryOwner === (uid || null)) return;
  }

  hydratingPromise = (async () => {
    claimedIdsRegistry.clear();
    recentLocalClaims.clear();
    registryOwner = uid || null;
    registryHydrated = true;

    try { await AsyncStorage.removeItem(LEGACY_CLAIMED_IDS_KEY); } catch {}
    if (!uid) return;

    try {
      const raw = await AsyncStorage.getItem(storageKeyFor(uid));
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) arr.forEach((id) => id && claimedIdsRegistry.add(String(id)));
    } catch (e) {
      console.log("hydrateClaimedRegistry error:", e);
    }
  })();

  try { await hydratingPromise; } finally { hydratingPromise = null; }
};

// Called by AuthContext on logout / account switch
export const clearClaimedRegistry = async (userId) => {
  claimedIdsRegistry.clear();
  recentLocalClaims.clear();
  registryOwner = null;
  registryHydrated = false;
  try {
    if (userId) await AsyncStorage.removeItem(storageKeyFor(userId));
    await AsyncStorage.removeItem(LEGACY_CLAIMED_IDS_KEY);
  } catch {}
};

export const registerLocalClaim = (offerId) => {
  if (!offerId) return;
  claimedIdsRegistry.add(String(offerId));
  recentLocalClaims.set(String(offerId), Date.now());
  persistRegistry();
};

export const unregisterLocalClaim = (offerId) => {
  if (!offerId) return;
  claimedIdsRegistry.delete(String(offerId));
  recentLocalClaims.delete(String(offerId));
  persistRegistry();
};

export const isLocallyClaimed = (offerId) => {
  if (!offerId) return false;
  return claimedIdsRegistry.has(String(offerId));
};

export const getAllLocallyClaimed = () => Array.from(claimedIdsRegistry);

/**
 * Server is the source of truth.
 * serverIds: offers the server says this user has claimed
 * scopeIds:  every offer ID that response covered (optional).
 *   With scopeIds, any ID in scope that the server no longer lists is removed
 *   (redeemed, unclaimed on another phone, offer deleted), except claims made
 *   on this phone in the last 20s (server may not have caught up yet).
 */
export const reconcileClaimedIds = (serverIds, scopeIds = null) => {
  if (!Array.isArray(serverIds)) return;
  const serverSet = new Set(serverIds.map(String));
  let changed = false;

  serverSet.forEach((id) => {
    if (!claimedIdsRegistry.has(id)) {
      claimedIdsRegistry.add(id);
      changed = true;
    }
  });

  if (Array.isArray(scopeIds)) {
    const now = Date.now();
    scopeIds.map(String).forEach((id) => {
      if (serverSet.has(id) || !claimedIdsRegistry.has(id)) return;
      const t = recentLocalClaims.get(id);
      if (t && now - t < RECENT_CLAIM_GRACE_MS) return;
      claimedIdsRegistry.delete(id);
      recentLocalClaims.delete(id);
      changed = true;
    });
  }

  if (changed) persistRegistry();
  return changed;
};

// Full list from /offers/claimed → registry becomes exactly that list
export const replaceClaimedIds = (serverIds) => {
  if (!Array.isArray(serverIds)) return;
  return reconcileClaimedIds(serverIds, Array.from(claimedIdsRegistry));
};

// ============================================================
// GLOBAL CLAIM EVENT BUS
// ============================================================
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

// ============================================================
// HELPERS
// ============================================================
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
  if (!offer) return false;
  if (!currentUserId) {
    return Array.isArray(offer.claimedBy) && offer.claimedBy.length > 0;
  }
  if (!offer.claimedBy || !Array.isArray(offer.claimedBy)) return false;

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

const extractClaimedIdsFromOffers = (offers, currentUserId) => {
  if (!Array.isArray(offers) || !currentUserId) return [];
  const me = String(currentUserId);
  const ids = [];
  for (const offer of offers) {
    if (!offer) continue;
    if (isOfferClaimedByUser(offer, me)) {
      ids.push(offer._id?.toString?.() || offer._id);
    }
  }
  return ids;
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

// ============================================================
// BUILD ACTIVE DATA
// ============================================================
const buildActiveData = (brand, currentOffer, selectedBranch) => {
  const hasBranch = !!selectedBranch;
  const branch = selectedBranch || {};
  const offer = currentOffer || {};
  const brandData = brand || {};

  const discount = hasBranch
    ? Number(branch.discountPercentage || offer.discountPercentage || brandData.discount || 0)
    : Number(offer.discountPercentage || brandData.discount || 0);

  const title = hasBranch
    ? branch.name || offer.title || brandData.name || "Offer Details"
    : offer.title || brandData.name || "Offer Details";

  const description =
    (hasBranch && branch.description) ||
    offer.description ||
    brandData.description ||
    "Explore this iconic destination. Get exclusive student discounts.";

  const redeemInstructions =
    (hasBranch && branch.redeemInstructions) ||
    offer.redeemInstructions ||
    brandData.redeemInstructions ||
    "1. Show your valid student ID at the counter\n2. Mention you're a Crew Privilege member\n3. Enjoy your discount!";

  const location = hasBranch
    ? (branch.location || branch.address || branch.city || "")
    : (offer.location || offer.address || brandData.location || brandData.address || "");

  const isOnline = hasBranch
    ? !!branch.isOnline
    : !!(offer.isOnline || brandData.isOnline);

  const isInStore = hasBranch
    ? !!branch.isInStore
    : !!(offer.isInStore || brandData.isInStore);

  const image =
    (hasBranch && branch.image) ||
    offer.image ||
    offer.displayImage ||
    brandData.displayImage ||
    brandData.logo ||
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

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

// ============================================================
// CLAIM SUCCESS — the yellow "sorted." moment (BalancedDeal design)
// Shown by the same state/timer as before (claimSuccessVisible).
// ============================================================
const ClaimSuccessModal = ({ visible, onClose, onDone, brandName, discount, isInStore }) => {
  const pop = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    pop.setValue(0);
    rise.setValue(0);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          pop.setValue(1);
          rise.setValue(1);
          return;
        }
        Animated.parallel([
          Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
          Animated.timing(rise, {
            toValue: 1,
            duration: 450,
            delay: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    return () => {
      cancelled = true;
    };
  }, [visible, pop, rise]);

  if (!visible) return null;

  const fadeUp = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };
  const what = discount > 0 ? `${discount}% off at ${brandName || "this brand"}.` : `claimed at ${brandName || "this brand"}.`;
  const where = isInStore ? " show this at the counter." : " find it in my discounts.";

  return (
    <Modal transparent={false} visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sortedRoot} accessibilityViewIsModal>
        <StatusBar barStyle="dark-content" backgroundColor={T.yellow} />
        <View style={styles.sortedCenter}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Dot mood="sorted" size={140} animated={false} />
          </Animated.View>
          <Animated.Text
            style={[styles.sortedTitle, fadeUp]}
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            sorted.
          </Animated.Text>
          <Animated.Text style={[styles.sortedLine, fadeUp]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {what}
            {where}
          </Animated.Text>
        </View>
        <Animated.View style={[styles.sortedActions, fadeUp]}>
          <Button title="done" variant="secondary" onPress={onDone} style={styles.sortedDoneBtn} />
        </Animated.View>
      </View>
    </Modal>
  );
};

// ============================================================
// BRANCH DROPDOWN
// ============================================================
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
        style={styles.branchDropdownHeader}
        onPress={() => {
          Haptics.selectionAsync();
          soundTap();           // 🔔 tap on dropdown toggle
          setExpanded(!expanded);
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={selectedBranch ? `branch: ${selectedBranch.name}, change` : "select branch"}
      >
        <View style={styles.branchDropdownIconWrap}>
          <MaterialCommunityIcons name="store-marker-outline" size={18} color={T.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchDropdownLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {selectedBranch ? "selected branch" : "select branch"}
          </Text>
          <Text style={styles.branchDropdownValue} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {selectedBranch
              ? selectedBranch.name
              : `${branches.length} ${branches.length === 1 ? "branch" : "branches"} available`}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={T.textFaint}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.branchDropdownList}>
          <TouchableOpacity
            style={[styles.branchDropdownItem, !selectedBranch && styles.branchDropdownItemActive]}
            onPress={() => {
              Haptics.selectionAsync();
              soundTap();       // 🔔 tap on Original Offer select
              onClearSelection();
              setExpanded(false);
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: !selectedBranch }}
          >
            <MaterialCommunityIcons name="tag-outline" size={16} color={T.textFaint} />
            <Text
              style={[styles.branchDropdownItemName, !selectedBranch && styles.branchDropdownItemNameActive]}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              original offer
            </Text>
            {!selectedBranch && <MaterialCommunityIcons name="check" size={18} color={T.ink} />}
          </TouchableOpacity>

          {branches.map((branch, idx) => {
            const isSelected = selectedBranch?._id === branch._id;
            return (
              <TouchableOpacity
                key={branch._id || idx}
                style={[styles.branchDropdownItem, isSelected && styles.branchDropdownItemActive]}
                onPress={() => handleSelect(branch)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${branch.name}${branch.city ? `, ${branch.city}` : ""}, ${branch.discountPercentage}% off`}
              >
                <MaterialCommunityIcons
                  name={branch.isOnline ? "earth" : "storefront-outline"}
                  size={16}
                  color={T.textFaint}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.branchDropdownItemName, isSelected && styles.branchDropdownItemNameActive]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                  >
                    {branch.name}
                  </Text>
                  {branch.city ? (
                    <Text style={styles.branchDropdownItemCity} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                      {branch.city}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.branchDropdownPill}>
                  <Text style={styles.branchDropdownPillText}>{branch.discountPercentage}%</Text>
                </View>
                {isSelected && <MaterialCommunityIcons name="check" size={18} color={T.ink} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ============================================================
// HOLD TO CLAIM (BalancedDeal): press and hold 1 s → onComplete.
// Screen readers: a double tap (activate) claims directly.
// ============================================================
const HOLD_MS = 1000;
const HoldToClaim = ({ label, onComplete, disabled }) => {
  const fill = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const doneRef = useRef(false);

  const start = () => {
    if (disabled) return;
    doneRef.current = false;
    setHolding(true);
    Haptics.selectionAsync().catch(() => {});
    Animated.timing(fill, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      doneRef.current = true;
      setHolding(false);
      fill.setValue(0);
      onComplete();
    });
  };

  const end = () => {
    if (doneRef.current) return;
    fill.stopAnimation();
    setHolding(false);
    Animated.timing(fill, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const fg = holding ? T.ink : T.white;

  return (
    <Pressable
      onPressIn={start}
      onPressOut={end}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="press and hold to claim"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "activate" && !disabled) onComplete();
      }}
      style={[styles.holdBtn, holding && { transform: [{ scale: 0.98 }] }]}
    >
      <Animated.View style={[styles.holdFill, { width }]} />
      <View style={styles.holdInner}>
        <MaterialCommunityIcons name="gift-outline" size={20} color={fg} />
        <Text style={[styles.holdText, { color: fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {holding ? "keep holding" : label}
        </Text>
      </View>
    </Pressable>
  );
};

// ============================================================
// OFFER SCREEN
// ============================================================
export default function OfferScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { brand: initialBrand } = route.params || {};
  const { token, isGuest } = useContext(AuthContext);

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
    return initialBrand?._id
      ? `${OFFER_STATS_CACHE_PREFIX}${initialBrand._id}`
      : null;
  }, [initialBrand?._id]);

  const formatImageUrl = useCallback((imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
      return imagePath;
    const cleanPath = imagePath.replace(/^\/+/, "");
    return `${BASE_URL}/${cleanPath}`;
  }, []);

  const saveStatsCache = useCallback(
    async (computedStats) => {
      if (!statsCacheKey || !computedStats) return;
      try {
        await AsyncStorage.setItem(
          statsCacheKey,
          JSON.stringify({ data: computedStats, timestamp: Date.now() })
        );
      } catch (e) {}
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

      let remoteStats = null;
      try {
        const res = await api.get(
          `/offers/brand/${initialBrand._id}/stats`,
          { headers, timeout: 4000 }
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
      } catch {}

      if (remoteStats && isMountedRef.current) {
        setStats((prev) =>
          statsEqual(prev, remoteStats) ? prev : remoteStats
        );
        setStatsLoading(false);
        saveStatsCache(remoteStats);
        emitStatsChanged(remoteStats, initialBrand._id);
      }
    } catch (err) {
    } finally {
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
          logo: formatImageUrl(brandData.logo) || initialBrand?.logo || null,
          displayImage: formatImageUrl(brandData.logo) || initialBrand?.displayImage || null,
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
        // 🔔 nope sound for guest
        soundNope();
        Alert.alert(
          "Sign In Required",
          "Please sign in to claim this offer and get student discounts!",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign In",
              onPress: () => {
                soundTap();
                navigation.navigate("Login");
              },
            },
          ]
        );
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
          } catch (e) {}
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
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={{
              uri: activeImage || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            }}
            style={styles.heroImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <TouchableOpacity
            style={[styles.headerBtn, styles.heroBtnLeft]}
            onPress={() => {
              soundTap();
              navigation.goBack();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="back"
          >
            <Ionicons name="chevron-back" size={20} color={T.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, styles.heroBtnRight]}
            onPress={() => {
              Haptics.selectionAsync();
              soundRefresh();   // 🔔 refresh whoosh
              fetchAll({ silent: true, forceFresh: true });
              fetchStatsOnly();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="refresh offer"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={T.ink} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={20} color={T.ink} />
            )}
          </TouchableOpacity>
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.brandDetailHeader}>
            <View style={styles.logoCircle}>
              {brand.logo ? (
                <Image source={{ uri: brand.logo }} style={styles.brandImage} resizeMode="contain" />
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

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  mainSafeArea: { flex: 1, backgroundColor: T.paper },
  loadingContainer: { flex: 1 },
  skeletonCard: {
    marginTop: -40,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 26,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 150 },

  // Hero
  hero: { height: 236, backgroundColor: T.lineSoft, alignItems: "center", justifyContent: "center" },
  heroImage: { width: "100%", height: "100%" },
  headerBtn: {
    position: "absolute",
    top: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.card,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBtnLeft: { left: 16 },
  heroBtnRight: { right: 16 },

  // Summary card
  summaryCard: {
    marginTop: -40,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 26,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
  },
  brandDetailHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: T.lineSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  brandImage: { width: 44, height: 44 },
  logoInitial: { fontFamily: F.heading, fontSize: 20, color: T.ink },
  brandTitle: { fontFamily: F.bodyBold, fontSize: 17, color: T.ink },
  brandMeta: { fontFamily: F.body, fontSize: 13, color: T.textMuted, marginTop: 2 },
  bigDiscount: {
    marginTop: 14,
    fontFamily: F.heading,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.4,
    color: T.ink,
  },
  availabilityRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  availabilityPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: T.line,
    backgroundColor: T.card,
    justifyContent: "center",
  },
  availabilityPillOn: { backgroundColor: T.ink, borderColor: T.ink },
  availabilityText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink },

  cityNotice: {
    fontFamily: F.body,
    fontSize: 12.5,
    color: T.textMuted,
    marginHorizontal: 20,
    marginTop: 6,
  },

  // Branches
  branchDropdownWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    overflow: "hidden",
  },
  branchDropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
  },
  branchDropdownIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  branchDropdownLabel: { fontFamily: F.bodySemi, fontSize: 12, color: T.textMuted },
  branchDropdownValue: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink, marginTop: 1 },
  branchDropdownList: { borderTopWidth: 1, borderTopColor: T.lineSoft, paddingVertical: 4 },
  branchDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  branchDropdownItemActive: { backgroundColor: T.yellowSoft },
  branchDropdownItemName: { flex: 1, fontFamily: F.bodySemi, fontSize: 14, color: T.ink },
  branchDropdownItemNameActive: { fontFamily: F.bodyBold },
  branchDropdownItemCity: { fontFamily: F.body, fontSize: 12, color: T.textMuted },
  branchDropdownPill: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: T.yellow,
    justifyContent: "center",
  },
  branchDropdownPillText: { fontFamily: F.bodyBold, fontSize: 12, color: T.ink },

  // Facts
  factsRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12 },
  factTile: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  factKey: { fontFamily: F.body, fontSize: 11.5, color: T.textMuted },
  factValue: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink, marginTop: 2 },

  // Sections
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontFamily: F.heading, fontSize: 18, color: T.ink, marginBottom: 12 },
  tabContentTitle: { fontFamily: F.headingBold, fontSize: 16, color: T.ink, marginBottom: 4 },
  tabContentText: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: T.textMuted },
  branchInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
  },
  branchInfoTitle: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  branchInfoText: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },
  guestPromptCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: T.yellowSoft,
  },
  guestPromptTitle: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  guestPromptText: { fontFamily: F.body, fontSize: 12.5, color: T.ink, marginTop: 2 },

  steps: { gap: 12 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumLast: { backgroundColor: T.yellow },
  stepNumText: { fontFamily: F.bodyBold, fontSize: 14, color: T.white },
  stepText: { flex: 1, fontFamily: F.body, fontSize: 15, lineHeight: 21, color: T.ink },

  mapButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
  },
  mapButtonDisabled: { opacity: 0.5 },
  mapButtonText: { fontFamily: F.bodySemi, fontSize: 14, color: T.ink },
  mapAddress: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 1 },
  mapDistance: { fontFamily: F.bodySemi, fontSize: 13, color: T.textMuted },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: T.paper,
    borderTopWidth: 1,
    borderTopColor: T.line,
  },
  holdHint: {
    fontFamily: F.body,
    fontSize: 12.5,
    color: T.textMuted,
    textAlign: "center",
    marginBottom: 10,
  },
  holdBtn: {
    height: 58,
    borderRadius: 29,
    backgroundColor: T.ink,
    overflow: "hidden",
    justifyContent: "center",
  },
  holdFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: T.yellow },
  holdInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  holdText: { fontFamily: F.bodyBold, fontSize: 16 },

  // Sorted moment
  sortedRoot: { flex: 1, backgroundColor: T.yellow, paddingHorizontal: 20 },
  sortedCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  sortedTitle: {
    marginTop: 18,
    fontFamily: F.heading,
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: -2.5,
    color: T.ink,
  },
  sortedLine: {
    marginTop: 8,
    fontFamily: F.bodySemi,
    fontSize: 16,
    lineHeight: 22,
    color: T.ink,
    textAlign: "center",
  },
  sortedActions: { paddingBottom: 36 },
  sortedDoneBtn: { backgroundColor: "transparent" },
});
