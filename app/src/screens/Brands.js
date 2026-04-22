import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useMemo,
  useRef,
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRoute } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const NUM_COLUMNS = 2;
const HORIZONTAL_PADDING = 20;
const GAP = 15;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - GAP) / NUM_COLUMNS;
const PAGE_SIZE = 6;

const CATEGORIES = [
  "All",
  "Restaurant",
  "Cafe & Coffee",
  "Food & Drinks",
  "Salon",
  "Spa & Wellness",
  "Health & Beauty",
  "Perfumes & Fragrances",
  "Fashion & Clothing",
  "Shoes & Footwear",
  "Bags & Accessories",
  "Electronics & Gadgets",
  "Mobile & Accessories",
  "Education & Institutes",
  "Travel & Tourism",
  "Hotels & Resorts",
  "Gym & Fitness",
  "Sports",
  "Entertainment",
  "Photography",
  "Services",
  "Others",
];

const DISCOUNT_OPTIONS = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50];

// Enhanced Global cache with memory and disk fallback
let brandsCache = null;
let cacheTimestamp = null;
let pendingFetchPromise = null;
const CACHE_DURATION = 2 * 60 * 1000;
const PRELOADED_BRANDS = [];

export default function BrandsScreen({ limit = null }) {
  const navigation = useNavigation();
  const { token, user } = useContext(AuthContext);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedBrand, setSelectedBrand] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [activeTab, setActiveTab] = useState("gift");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [minDiscount, setMinDiscount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  
  const route = useRoute();
  const { query } = route.params || {};
  const isMounted = useRef(true);
  const abortControllerRef = useRef(null);
  const imageCache = useRef(new Map());

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  const getUserId = useCallback(() => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id;
    } catch {
      return null;
    }
  }, [token]);

  const userId = getUserId();

  // ULTRA FAST: Optimized image URL formatter
  const formatImageUrl = useCallback((imagePath, type = 'offer') => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    
    const baseUrl = 'https://the-deft-crew-production.up.railway.app';
    if (type === 'brand') {
      return `${baseUrl}/uploads/brands/${imagePath}`;
    }
    return `${baseUrl}/${imagePath}`;
  }, []);

  // ULTRA FAST: Fetch with parallel requests and deduplication
  const fetchBrands = useCallback(async (forceRefresh = false) => {
    // Immediate return from memory cache
    if (!forceRefresh && brandsCache && cacheTimestamp && 
        (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      if (isMounted.current) {
        setBrands(brandsCache);
        setLoading(false);
      }
      return brandsCache;
    }

    // Prevent duplicate parallel requests
    if (pendingFetchPromise) {
      const result = await pendingFetchPromise;
      if (isMounted.current) {
        setBrands(result);
        setLoading(false);
      }
      return result;
    }

    setLoading(true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    pendingFetchPromise = (async () => {
      try {
        // OPTIMIZATION: Fetch brands with minimal fields first
        const brandsRes = await api.get("/brands", {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortControllerRef.current.signal,
          params: { fields: '_id,name,logo,category', limit: 100 }
        });

        const brandsData = brandsRes.data || [];
        
        // OPTIMIZATION: Batch offers in chunks of 10 for better performance
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < brandsData.length; i += chunkSize) {
          chunks.push(brandsData.slice(i, i + chunkSize));
        }
        
        const allOffersResults = [];
        
        // Process chunks in parallel with controlled concurrency
        const processChunk = async (chunk) => {
          const chunkPromises = chunk.map(brand => 
            api.get(`/offers/brand/${brand._id}`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: abortControllerRef.current.signal,
              timeout: 3000
            }).then(res => ({ brandId: brand._id, offers: res.data }))
            .catch(() => ({ brandId: brand._id, offers: [] }))
          );
          return Promise.all(chunkPromises);
        };
        
        const chunkResults = await Promise.all(chunks.map(processChunk));
        chunkResults.forEach(chunkResult => {
          allOffersResults.push(...chunkResult);
        });
        
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

        // Combine data with ultra-fast mapping
        const brandsWithOffers = brandsData.map((brand) => {
          const brandOffers = offersMap.get(brand._id) || [];
          const firstOffer = brandOffers[0];
          
          return {
            ...brand,
            logo: formatImageUrl(brand.logo, 'brand'),
            offers: brandOffers,
            displayImage: firstOffer?.image || formatImageUrl(brand.logo, 'brand') || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            hasOffer: brandOffers.length > 0,
            discount: firstOffer?.discountPercentage || 0,
            category: firstOffer?.category || brand.category || "General",
            isOnline: firstOffer?.isOnline || false,
            isInStore: firstOffer?.isInStore || false,
          };
        });

        if (isMounted.current) {
          setBrands(brandsWithOffers);
          brandsCache = brandsWithOffers;
          cacheTimestamp = Date.now();
          setLoading(false);
        }
        
        pendingFetchPromise = null;
        return brandsWithOffers;
      } catch (err) {
        if (err.name !== 'AbortError' && isMounted.current) {
          console.error("Error fetching brands:", err.response?.data || err.message);
          setLoading(false);
        }
        pendingFetchPromise = null;
        return [];
      }
    })();

    return pendingFetchPromise;
  }, [token, userId, formatImageUrl]);

  // Preload images in background for smoother UI
  const preloadImages = useCallback((brandsList) => {
    if (!brandsList || brandsList.length === 0) return;
    
    const imagesToPreload = brandsList.slice(0, 12).map(brand => brand.displayImage).filter(Boolean);
    if (imagesToPreload.length > 0) {
      Image.prefetch(imagesToPreload[0]);
      setTimeout(() => {
        imagesToPreload.slice(1, 5).forEach(url => Image.prefetch(url));
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (brands.length > 0) {
      preloadImages(brands);
    }
  }, [brands, preloadImages]);

  useEffect(() => {
    if (query) {
      console.log("Searching for:", query);
    }
  }, [query, route.params?.timestamp]);

  useFocusEffect(
    useCallback(() => {
      fetchBrands(true);
    }, [fetchBrands]),
  );

  const claimOffer = async (offerId) => {
    try {
      await api.post(
        `/offers/claim/${offerId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (isMounted.current) {
        setShowSuccess(true);
        setTimeout(() => {
          if (isMounted.current) setShowSuccess(false);
        }, 2500);
      }

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
  };

  const filteredData = useMemo(() => {
    let results = brands;
    
    if (searchQuery) {
      results = results.filter((brand) =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (minDiscount > 0) {
      results = results.filter((brand) => brand.discount >= minDiscount);
    }
    
    if (selectedCategory !== "All") {
      results = results.filter((brand) => brand.category === selectedCategory);
    }
    
    if (showOnlyOnline) {
      results = results.filter((brand) => brand.isOnline);
    }
    
    return results;
  }, [brands, searchQuery, minDiscount, selectedCategory, showOnlyOnline]);

  const renderSearchIndicator = () => {
    if (!query) return null;
    return (
      <View style={styles.searchIndicatorRow}>
        <Text style={styles.searchIndicatorText}>
          Showing results for: <Text style={{ fontWeight: 'bold', color: '#08634f' }}>"{query}"</Text>
        </Text>
        <TouchableOpacity onPress={() => navigation.setParams({ query: undefined })}>
          <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    );
  };

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const displayedBrands = useMemo(() => {
    if (limit) return filteredData.slice(0, limit);
    return filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredData, currentPage, limit]);

  const currentOffer = selectedBrand?.offers?.[0];

  const renderBrand = useCallback(({ item }) => {
    const firstOffer = item.offers?.[0];
    const displayImage = item.displayImage;
    
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedBrand(item);
          setActiveTab("gift");
          setModalVisible(true);
        }}
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
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.categoryBadgeCard}>
            <MaterialIcons name="category" size={10} color="black" />
            <Text style={styles.categoryCardText}>
              {item.category}
            </Text>
          </View>
          <Text
            style={[
              styles.categoryText,
              firstOffer?.isClaimed && { color: "#f9c349", fontWeight: "bold" },
            ]}
          >
            {firstOffer?.isClaimed ? "✓ Saved" : item.hasOffer ? "Student's Offer Available" : "No Offers"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderFooter = useCallback(() => {
    if (limit) {
      if (filteredData.length <= limit) return <View style={{ height: 20 }} />;
      return (
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => navigation.navigate("Brands")}
        >
          <Text style={styles.viewAllText}>
            View All {filteredData.length} Brands
          </Text>
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

  // Ultra-fast loading with skeleton or cached data
  if (loading && brands.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#08634f" />
        <Text style={styles.loadingText}>Loading brands...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainSafeArea}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={displayedBrands}
        keyExtractor={(item) => item._id}
        removeClippedSubviews={true}
        renderItem={renderBrand}
        windowSize={3}
        maxToRenderPerBatch={8}
        initialNumToRender={4}
        updateCellsBatchingPeriod={30}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <View style={styles.headerTopRow}>
              <View>
                <Text style={styles.welcomeText}>
                  {user?.university?.name || "No University Assigned"}
                </Text>
                <Text style={styles.title}>Crew's Privilege Brands</Text>
              </View>
              <TouchableOpacity
                style={styles.filterTrigger}
                onPress={() => setFilterModalVisible(true)}
              >
                <MaterialCommunityIcons name="tune-variant" size={18} color="#000000" />
              </TouchableOpacity>
            </View>
            {renderSearchIndicator()}
          </View>
        }
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        scrollEnabled={!limit}
        showsVerticalScrollIndicator={false}
      />

      {/* FILTER MODAL */}
      <Modal
        visible={filterModalVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.dismissArea}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalIndicator} />
            <View style={styles.modalHeader}>
              <Text style={styles.filterHeader}>Refine Search</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory("All");
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScrollView}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      selectedCategory === cat && styles.activeChip,
                      { marginRight: 8 },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedCategory === cat && styles.activeChipText,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

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
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.applyBtnText}>Show Results</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BRAND DETAIL MODAL */}
      {selectedBrand && (
        <Modal 
          visible={modalVisible} 
          animationType="slide" 
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setModalVisible(false)}
          >
            <Pressable 
              style={styles.modalContainer} 
              onPress={(e) => e.stopPropagation()} 
            >
              <View style={styles.modalIndicator} />
              
              {showSuccess && (
                <View style={styles.successOverlay}>
                  <View style={styles.successCard}>
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="check-decagram" size={50} color="#fff" />
                    </View>
                    <Text style={styles.successTitle}>Save the Discount Offer!</Text>
                    <Text style={styles.successSubtext}>
                      Your student discount has been added to your wallet.
                    </Text>
                  </View>
                </View>
              )}

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

              <ScrollView
                style={styles.tabScrollView}
                contentContainerStyle={styles.tabContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {activeTab === "gift" && (
                  <View>
                    <Text style={styles.tabContentTitle}>Offer Details</Text>
                    <Text style={styles.tabContentText}>
                      {currentOffer?.description || "Explore this iconic destination."}
                    </Text>
                  </View>
                )}

                {activeTab === "redeem" && (
                  <View style={styles.redeemContainer}>
                    <View style={styles.instructionHeader}>
                      <MaterialCommunityIcons name="ticket-confirmation-outline" size={24} color="#000000" />
                      <Text style={styles.instructionTitle}>How to Redeem</Text>
                    </View>
                    <Text style={styles.tabContentText}>
                      {currentOffer?.redeemInstructions ||
                        "No specific instructions provided. Please show your Student ID at the counter."}
                    </Text>
                  </View>
                )}

                {activeTab === "location" && (
                  <View style={styles.locationContainer}>
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
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
                {currentOffer && (
                  <TouchableOpacity
                    style={[styles.buyBtn, currentOffer.isClaimed && styles.claimedBtn]}
                    disabled={currentOffer.isClaimed}
                    onPress={() => claimOffer(currentOffer._id)}
                  >
                    <Text style={styles.buyBtnText}>
                      {currentOffer.isClaimed ? "Already Wishlisted" : "Add To Wishlist Now"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainSafeArea: { flex: 1, backgroundColor: "#fff", paddingBottom: 50 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 14, color: "#666" },
  headerContainer: { paddingHorizontal: 20, paddingTop: -5, marginBottom: 20, fontFamily: "Cardo" },
  welcomeText: { fontSize: 11, color: "#676363", fontWeight: "900", textTransform: "uppercase", fontFamily: "Cardo" },
  title: { fontSize: 26, fontWeight: "900", color: "#000000", fontFamily: "Cardo" },
  listContent: { paddingBottom: 20 },
  columnWrapper: { justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 15 },
  card: { backgroundColor: "#fff", borderRadius: 22, width: CARD_WIDTH, padding: 15, alignItems: "center", borderWidth: 1, borderColor: "#F0F0F0", elevation: 3 },
  availabilityWrapper: { color: "#040404", position: "absolute", top: 12, left: 12, flexDirection: "row" },
  discountBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "#ffffff", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, color: "#f9c349", fontFamily: "Cardo" },
  discountText: { fontSize: 12, fontWeight: "900", color: "#f9c349", fontFamily: "Cardo" },
  logoContainer: { width: "100%", height: 100, marginTop: 24, marginBottom: 10, justifyContent: "center", alignItems: "center" },
  logo: { width: "100%", height: "100%", resizeMode: "contain" },
  infoContainer: { alignItems: "center", width: "100%" },
  name: { fontSize: 14, fontWeight: "800", color: "#333", color: "#000000", fontFamily: "Cardo" },
  categoryText: { fontSize: 10, color: "#bbb", marginTop: 4 },
  viewAllButton: { marginHorizontal: 20, paddingVertical: 15, backgroundColor: "#000000", borderRadius: 20, alignItems: "center", marginBottom: 10, color: "#000000", fontFamily: "Cardo" },
  viewAllText: { color: "#ffffff", fontWeight: "800", fontFamily: "Cardo", fontSize: 13, letterSpacing: 1.1 },
  paginationRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: 15, paddingBottom: 10 },
  pageBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#000000", borderRadius: 12, marginHorizontal: 15 },
  disabledPageBtn: { backgroundColor: "#ccc" },
  pageBtnText: { color: "#fff", fontWeight: "700" },
  pageInfo: { fontFamily: "Cardo", fontSize: 14, fontWeight: "700", color: "#000000" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContainer: { height: "88%", backgroundColor: "#fff", borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, flexDirection:'column' },
  modalIndicator: { width: 45, height: 5, backgroundColor: "#E0E0E0", borderRadius: 10, alignSelf: "center", marginBottom: 25 },
  modalHeader: { fontFamily: "Cardo", alignItems: "center", marginBottom: 20 },
  modalLogoCircle: { width: "100%", height: 150, borderRadius: 20, backgroundColor: "#F7F9F8", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  modalImage: { width: "80%", height: "80%", resizeMode: "contain" },
  modalTitle: { fontFamily: "Cardo", fontSize: 24, fontWeight: "900", color: "#000000", marginTop: 15, textAlign: "center", alignSelf: "center", paddingBottom: 10 },
  tabContainer: { flexDirection: "row", backgroundColor: "#F0F2F1", borderRadius: 18, padding: 6, marginBottom: 10 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 14 },
  activeTabCard: { backgroundColor: "#fff", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  tabText: { fontSize: 13, color: "#999", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  activeTabText: { color: "#000000" },
  tabContentContainer: { paddingHorizontal: 5, paddingBottom: 20, borderLeftWidth: 3, borderLeftColor: "#000000", marginLeft: 5, marginTop: 10 },
  tabContentText: { fontSize: 14, textAlign: "left", color: "#666", lineHeight: 20, paddingLeft: 10, fontStyle: "italic", },
  tabContentTitle: { fontSize: 18, fontWeight: "bold", color: "#000000", marginBottom: 10, paddingLeft: 10 },
  modalActionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: "auto" },
  closeBtn: { flex: 0.4, paddingVertical: 16, borderRadius: 20, backgroundColor: "#F2F2F2", alignItems: "center" },
  closeBtnText: { color: "#777", fontWeight: "700", fontFamily: "Cardo" },
  buyBtn: { flex: 0.55, paddingVertical: 16, borderRadius: 20, backgroundColor: "#000000", alignItems: "center" },
  claimedBtn: { backgroundColor: "#ccc", fontFamily: "Cardo" },
  buyBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, fontFamily: "Cardo" },
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  successCard: { width: width * 0.8, backgroundColor: "#fff", borderRadius: 30, padding: 30, alignItems: "center", elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#000000", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: "900", color: "#000000", textAlign: "center", fontFamily: "Cardo", marginBottom: 10 },
  successSubtext: { fontSize: 14, color: "#666", textAlign: "center", fontFamily: "Cardo", lineHeight: 20 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  filterTrigger: { flexDirection: "row", alignItems: "center", backgroundColor: "#F7F9F8", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "#E0E0E0" },
  filterTriggerText: { marginLeft: 6, color: "#000000", fontWeight: "700", fontSize: 10 },
  filterHeader: { fontSize: 22, fontWeight: "900", color: "#000000", marginBottom: 20, fontFamily: "Cardo" },
  filterLabel: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 15, marginBottom: 10, fontFamily: "Cardo" },
  dismissArea: { flex: 1 },
  resetText: { color: "#000000", fontWeight: "600", fontSize: 14 },
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
  applyBtn: { backgroundColor: "#000000", paddingVertical: 18, borderRadius: 16, alignItems: "center", shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  categoryBadgeCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#f1f5f9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-end", marginTop: 4 },
  categoryCardText: { fontSize: 10, color: "#000000", fontWeight: "600", textTransform: "uppercase", paddingLeft: 2 },
  statusText: { fontSize: 11, color: "#94a3b8", marginTop: 6 },
  modalCategoryBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-end", marginTop: 5, marginBottom: 10, borderWidth: 1, borderColor: "#e5e5e5" },
  modalCategoryText: { fontSize: 10, color: "#000000", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "Cardo", marginLeft: 6 },
  chipScrollView: { flexDirection: "row", marginVertical: 15 },
  filterModalContent: { backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, width: "100%", position: "absolute", bottom: 0 },
  locationContainer: { padding: 10 },
  locationInfoRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  locationAddressText: { fontSize: 15, color: "#333", fontFamily: "Cardo", marginLeft: 10, flexShrink: 1 },
  mapButton: { flexDirection: "row", backgroundColor: "#000000", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 15, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  mapButtonText: { color: "#fff", fontWeight: "700", marginLeft: 8, fontSize: 14 },
  redeemContainer: { padding: 10 },
  instructionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  instructionTitle: { fontSize: 18, fontWeight: "bold", color: "#000000", fontFamily: "Cardo" },
  searchIndicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, marginBottom: 10, marginHorizontal: 5 },
  searchIndicatorText: { fontSize: 14, color: '#666' },
  brandDetailHeader: { alignItems: "center", marginBottom: 20 },
  tabScrollView: { flex: 1 },
});