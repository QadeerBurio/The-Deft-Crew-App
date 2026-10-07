// screens/CityScreen.js
// Only the three featured city hero cards (Karachi, Islamabad, Lahore)
// Tap any city → filtered brands in that city

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
  ImageBackground,
  Dimensions,
  StatusBar,
  Platform,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/brandApi";
import { AuthContext } from "../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import {
  onOfferClaimed,
  registerLocalClaim,
  isLocallyClaimed,
} from "./OfferScreen";
import { brandMatchesCity, setSelectedCity as saveSelectedCity } from "../utils/cityFilter";
import { colors as tdcColors } from "../theme";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 16;

const BASE_URL = "https://the-deft-crew-production.up.railway.app";

// ═══════════════════════════════════════════════════════════
// THREE FEATURED CITIES — hero cards
// ═══════════════════════════════════════════════════════════
const FEATURED_CITIES = [
  {
    id: "karachi",
    name: "Karachi",
    province: "Sindh",
    tagline: "City of Lights",
    image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=1200&q=80",
    gradient: ["rgba(0,0,0,0.0)", "rgba(0,0,0,0.85)"],
  },
  {
    id: "islamabad",
    name: "Islamabad",
    province: "Federal",
    tagline: "The Green City",
    image: "https://images.unsplash.com/photo-1588416936097-41850ab3d86d?w=1200&q=80",
    gradient: ["rgba(0,0,0,0.0)", "rgba(0,0,0,0.85)"],
  },
  {
    id: "lahore",
    name: "Lahore",
    province: "Punjab",
    tagline: "Heart of Pakistan",
    image: "https://images.unsplash.com/photo-1595867569761-6c87d26cc5f1?w=1200&q=80",
    gradient: ["rgba(0,0,0,0.0)", "rgba(0,0,0,0.85)"],
  },
];

const CITY_BY_NAME = new Map(
  FEATURED_CITIES.map((c) => [c.name.toLowerCase(), c])
);

// ═══════════════════════════════════════════════════════════
// FEATURED CITY HERO CARD
// ═══════════════════════════════════════════════════════════
const FeaturedCityCard = memo(({ city, brandCount, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => onPress(city)}
      activeOpacity={0.9}
    >
      <ImageBackground
        source={{ uri: city.image }}
        style={styles.featuredImageBg}
        imageStyle={styles.featuredImage}
      >
        {/* Dark gradient overlay */}
        <LinearGradient
          colors={city.gradient}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top-right brand count badge */}
        {brandCount > 0 && (
          <View style={styles.featuredCountBadge}>
            <MaterialCommunityIcons name="store" size={11} color="#000" />
            <Text style={styles.featuredCountText}>{brandCount}</Text>
          </View>
        )}

        {/* Bottom-left content */}
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTagline}>{city.tagline}</Text>
          <Text style={styles.featuredName}>{city.name}</Text>
          <View style={styles.featuredMetaRow}>
            <MaterialCommunityIcons name="map-marker" size={11} color={tdcColors.yellow} />
            <Text style={styles.featuredProvince}>{city.province}</Text>
          </View>
        </View>

        {/* Bottom-right arrow */}
        <View style={styles.featuredArrow}>
          <Ionicons name="arrow-forward" size={16} color="#000" />
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════
// BRAND ROW (in city-filtered view)
// ═══════════════════════════════════════════════════════════
const BrandRow = memo(({ brand, onPress }) => {
  const firstOffer = brand.offers?.[0];
  const isClaimed =
    !!firstOffer?.isClaimed ||
    (firstOffer?._id && isLocallyClaimed(firstOffer._id));

  return (
    <TouchableOpacity
      style={styles.brandRow}
      onPress={() => onPress(brand)}
      activeOpacity={0.85}
    >
      <View style={styles.brandImageWrap}>
        <Image
          source={{
            uri:
              brand.displayImage ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          }}
          style={styles.brandImage}
          resizeMode="cover"
        />
        {brand.discount > 0 && (
          <View style={styles.brandDiscountBadge}>
            <Text style={styles.brandDiscountText}>-{brand.discount}%</Text>
          </View>
        )}
      </View>

      <View style={styles.brandInfo}>
        <Text style={styles.brandName} numberOfLines={1}>
          {brand.name}
        </Text>
        <Text style={styles.brandCategory} numberOfLines={1}>
          {brand.category || "General"}
        </Text>
        <Text
          style={[
            styles.brandStatus,
            isClaimed && styles.brandStatusClaimed,
          ]}
        >
          {isClaimed
            ? "✓ Claimed"
            : brand.hasOffer
            ? "Student's Offer"
            : "No Offers"}
        </Text>
      </View>

      <View style={styles.brandChevron}>
        <Ionicons name="chevron-forward" size={18} color="#ccc" />
      </View>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════
export default function CityScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, isGuest } = useContext(AuthContext);

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);

  const isMounted = useRef(true);
  const isScreenFocused = useRef(false);
  const abortRef = useRef(null);

  // Initial city from route params
  useEffect(() => {
    const initialCity = route.params?.city;
    if (initialCity) {
      const found = CITY_BY_NAME.get(initialCity.toLowerCase());
      if (found) setSelectedCity(found);
    }
  }, [route.params?.city]);

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

  // ═══════════════════════════════════════════════════════════
  // FETCH BRANDS (for city mapping)
  // ═══════════════════════════════════════════════════════════
  const fetchAllBrands = useCallback(
    async (force = false) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const headers = token && !isGuest ? { Authorization: `Bearer ${token}` } : {};

        const res = await api.get("/brands", {
          headers,
          params: { limit: 500, _t: Date.now() },
          signal: abortRef.current.signal,
          timeout: 10000,
        });

        const raw = Array.isArray(res?.data) ? res.data : [];

        const mapped = raw.map((b) => ({
          ...b,
          logo: formatImageUrl(b.logo, "brand"),
          displayImage:
            formatImageUrl(b.logo, "brand") ||
            "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          city: (b.city || "Karachi").trim(),
          cities: Array.isArray(b.cities) && b.cities.length ? b.cities : [(b.city || "Karachi").trim()],
          category: b.category || "General",
          discount: 0,
          hasOffer: false,
          offers: [],
          isOnline: b.isOnline || false,
          isInStore: b.isInStore || false,
        }));

        if (isMounted.current) {
          setBrands(mapped);
          setLoading(false);
        }
        return mapped;
      } catch (e) {
        if (e.name === "AbortError" || e.code === "ERR_CANCELED") return [];
        console.log("[CityScreen] fetch error:", e?.message);
        if (isMounted.current) setLoading(false);
        return [];
      }
    },
    [token, isGuest, formatImageUrl]
  );

  // ═══════════════════════════════════════════════════════════
  // CITY COUNTS
  // ═══════════════════════════════════════════════════════════
  const cityCounts = useMemo(() => {
    const counts = {};
    for (const c of FEATURED_CITIES) {
      counts[c.name.toLowerCase()] = brands.filter((b) => brandMatchesCity(b, c.name)).length;
    }
    return counts;
  }, [brands]);

  // ═══════════════════════════════════════════════════════════
  // BRANDS IN SELECTED CITY
  // ═══════════════════════════════════════════════════════════
  const cityBrands = useMemo(() => {
    if (!selectedCity) return [];
    return brands.filter((b) => brandMatchesCity(b, selectedCity.name));
  }, [selectedCity, brands]);

  // ═══════════════════════════════════════════════════════════
  // CLAIM LISTENER
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const unsub = onOfferClaimed((brandId, offerId) => {
      registerLocalClaim(offerId);
      setBrands((prev) =>
        prev.map((b) => {
          if (b._id !== brandId) return b;
          const updatedOffers = (b.offers || []).map((o) =>
            o._id === offerId ? { ...o, isClaimed: true } : o
          );
          return { ...b, offers: updatedOffers };
        })
      );
    });
    return () => unsub?.();
  }, []);

  // ═══════════════════════════════════════════════════════════
  // FOCUS / APP STATE
  // ═══════════════════════════════════════════════════════════
  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;
      if (brands.length === 0) fetchAllBrands(false);
      else fetchAllBrands(true);

      return () => {
        isScreenFocused.current = false;
      };
    }, [fetchAllBrands, brands.length])
  );

  useEffect(() => {
    isMounted.current = true;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active" && isScreenFocused.current) {
        fetchAllBrands(true);
      }
    });
    return () => {
      isMounted.current = false;
      sub.remove();
      abortRef.current?.abort();
    };
  }, [fetchAllBrands]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════
  const handleCityPress = useCallback((city) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCity(city);
    saveSelectedCity(city.name); // Brands + My Discounts follow this choice
  }, []);

  const handleBackToCities = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCity(null);
  }, []);

  const handleBrandPress = useCallback(
    (brand) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate("OfferScreen", { brand });
    },
    [navigation]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllBrands(true);
    setRefreshing(false);
  }, [fetchAllBrands]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  const renderFeaturedItem = useCallback(
    ({ item }) => (
      <FeaturedCityCard
        city={item}
        brandCount={cityCounts[item.name.toLowerCase()] || 0}
        onPress={handleCityPress}
      />
    ),
    [cityCounts, handleCityPress]
  );

  const renderBrandItem = useCallback(
    ({ item }) => <BrandRow brand={item} onPress={handleBrandPress} />,
    [handleBrandPress]
  );

  const keyExtractorCity = useCallback((item) => item.id, []);
  const keyExtractorBrand = useCallback((item) => item._id, []);

  // ── Empty state for city brands ──
  const renderEmptyBrands = useCallback(
    () => (
      <View style={styles.emptyBox}>
        <MaterialCommunityIcons name="store-off-outline" size={56} color="#ccc" />
        <Text style={styles.emptyTitle}>No brands in {selectedCity?.name}</Text>
        <Text style={styles.emptySub}>
          We're adding new brands every week. Check back soon!
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={handleBackToCities}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={16} color="#000" />
          <Text style={styles.emptyBtnText}>Back to cities</Text>
        </TouchableOpacity>
      </View>
    ),
    [selectedCity, handleBackToCities]
  );

  // ── City brand list header ──
  const renderCityHeader = useCallback(
    () => (
      <View style={styles.cityHeader}>
        <View style={styles.cityHeaderEmojiWrap}>
          <MaterialCommunityIcons name="city-variant-outline" size={26} color="#000" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cityHeaderTitle}>{selectedCity.name}</Text>
          <Text style={styles.cityHeaderSub}>
            {cityBrands.length}{" "}
            {cityBrands.length === 1 ? "brand" : "brands"} · {selectedCity.province}
          </Text>
        </View>
      </View>
    ),
    [selectedCity, cityBrands.length]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={selectedCity ? handleBackToCities : () => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
            size={22}
            color="#000"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {selectedCity ? selectedCity.name : "Cities"}
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={tdcColors.yellow} />
          <Text style={styles.loadingText}>Loading cities...</Text>
        </View>
      ) : selectedCity ? (
        <FlatList
          data={cityBrands}
          keyExtractor={keyExtractorBrand}
          renderItem={renderBrandItem}
          ListHeaderComponent={renderCityHeader}
          ListEmptyComponent={renderEmptyBrands}
          contentContainerStyle={styles.brandListContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          removeClippedSubviews
          windowSize={5}
          maxToRenderPerBatch={8}
          initialNumToRender={8}
        />
      ) : (
        <FlatList
          data={FEATURED_CITIES}
          keyExtractor={keyExtractorCity}
          renderItem={renderFeaturedItem}
          contentContainerStyle={styles.featuredListContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
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
    fontSize: 17,
    fontWeight: "800",
    color: "#000",
    letterSpacing: -0.3,
  },

  // Loading
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { fontSize: 13, color: "#999", fontWeight: "600" },

  // ═══ Featured cards list ═══
  featuredListContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 14,
  },
  featuredCard: {
    width: "100%",
    height: 190,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  featuredImageBg: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  featuredImage: {
    borderRadius: 20,
  },

  featuredCountBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: tdcColors.yellow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featuredCountText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 0.2,
  },

  featuredContent: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingRight: 70,
  },
  featuredTagline: {
    fontSize: 10,
    fontWeight: "900",
    color: tdcColors.yellow,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  featuredName: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  featuredMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredProvince: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.3,
  },
  featuredArrow: {
    position: "absolute",
    bottom: 18,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: tdcColors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  // ═══ City brand list ═══
  brandListContent: {
    paddingBottom: 30,
    paddingHorizontal: HORIZONTAL_PADDING,
    flexGrow: 1,
  },
  cityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingBottom: 12,
  },
  cityHeaderEmojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9c34922",
  },
  cityHeaderTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000",
    letterSpacing: -0.5,
  },
  cityHeaderSub: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    marginTop: 2,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 8,
    gap: 12,
  },
  brandImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f8f8f8",
  },
  brandImage: { width: "100%", height: "100%" },
  brandDiscountBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  brandDiscountText: { fontSize: 9, fontWeight: "900", color: tdcColors.yellow },
  brandInfo: { flex: 1 },
  brandName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
    letterSpacing: -0.2,
  },
  brandCategory: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    marginTop: 2,
  },
  brandStatus: {
    fontSize: 10.5,
    color: "#bbb",
    fontWeight: "600",
    marginTop: 4,
  },
  brandStatusClaimed: { color: tdcColors.yellow, fontWeight: "800" },
  brandChevron: { padding: 4 },

  // Empty state
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: tdcColors.yellow,
    marginTop: 20,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "800", color: "#000" },
});