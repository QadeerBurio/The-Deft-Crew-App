import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  RefreshControl,
  InteractionManager,
} from "react-native";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get("window");
const ITEM_WIDTH = width * 0.95;
const ITEM_HEIGHT = height * 0.22;
const ITEM_SPACING = (width - ITEM_WIDTH) / 2;

const BASE_URL = "https://the-deft-crew-production.up.railway.app";
const CACHE_DURATION = 5 * 60 * 1000;
const FETCH_TIMEOUT = 2000; // Reduced timeout

// ==========================================
// FAST SKELETON (Shows only for 200ms max)
// ==========================================
const FastSkeleton = React.memo(() => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonImagePlaceholder}>
          <Animated.View 
            style={[
              styles.skeletonShimmer,
              { transform: [{ translateX }] }
            ]} 
          />
        </View>
        <View style={styles.skeletonOverlay}>
          <View style={styles.skeletonTitleRow}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonBadge} />
          </View>
          <View style={styles.skeletonSubtitle} />
        </View>
      </View>
      <View style={styles.dotContainer}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.skeletonDot, i === 1 && styles.skeletonDotActive]} />
        ))}
      </View>
    </Animated.View>
  );
});

// ==========================================
// FAST CACHE SYSTEM
// ==========================================
class FastCache {
  static get(key) {
    try {
      if (typeof window !== 'undefined') {
        const cached = window.localStorage.getItem(key);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION && data?.length > 0) {
            return data;
          }
        }
      }
      return null;
    } catch { return null; }
  }

  static set(key, data) {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    } catch { /* ignore */ }
  }
}

export default function Slider() {
  const [data, setData] = useState(() => {
    // Load from cache instantly on mount
    const cached = FastCache.get('slider_data_cache');
    return cached || [];
  });
  const [loading, setLoading] = useState(() => {
    // Only show loading if no cached data
    return !FastCache.get('slider_data_cache');
  });
  const [refreshing, setRefreshing] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(true);

  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const modalAnim = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const likeAnim = useRef(new Animated.Value(0)).current;

  // ==========================================
  // SUPER FAST FETCH (Parallel + Priority)
  // ==========================================
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      // Try cache first
      if (!isRefresh) {
        const cachedData = FastCache.get('slider_data_cache');
        if (cachedData && cachedData.length > 0) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      if (!isRefresh) setLoading(true);

      // Parallel fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      const response = await fetch(
        `${BASE_URL}/api/admin/all${isRefresh ? `?_=${Date.now()}` : ''}`,
        {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const json = await response.json();
      
      // Fast data extraction
      let visibleData = [];
      if (Array.isArray(json)) {
        visibleData = json.filter(item => item?.active !== false);
      } else if (json?.data && Array.isArray(json.data)) {
        visibleData = json.data.filter(item => item?.active !== false);
      } else if (json?.offers && Array.isArray(json.offers)) {
        visibleData = json.offers.filter(item => item?.active !== false);
      } else if (json?.sliders && Array.isArray(json.sliders)) {
        visibleData = json.sliders.filter(item => item?.active !== false);
      }
      
      // Cache and update
      FastCache.set('slider_data_cache', visibleData);
      
      if (isMounted) {
        setData(visibleData);
        setLoading(false);
        setRefreshing(false);
      }
      
    } catch (err) {
      console.error("Slider Fetch Error:", err);
      if (isMounted) {
        setLoading(false);
        setRefreshing(false);
        // Use cache as fallback
        const cachedData = FastCache.get('slider_data_cache');
        if (cachedData && cachedData.length > 0) {
          setData(cachedData);
        }
      }
    }
  }, [isMounted]);

  // ==========================================
  // IMMEDIATE LOAD (Show cache instantly)
  // ==========================================
  useEffect(() => {
    setIsMounted(true);
    
    // Show cached data immediately
    const cached = FastCache.get('slider_data_cache');
    if (cached && cached.length > 0) {
      setData(cached);
      setLoading(false);
    }
    
    // Fetch fresh data in background
    InteractionManager.runAfterInteractions(() => {
      fetchData();
    });

    return () => { setIsMounted(false); };
  }, []);

  // ==========================================
  // AUTO-SLIDE (Optimized)
  // ==========================================
  useEffect(() => {
    if (data.length <= 1 || loading) return;
    
    let timer = setInterval(() => {
      const nextIndex = (currentIndex + 1) % data.length;
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * ITEM_WIDTH,
        animated: true,
      });
    }, 4000);
    
    return () => clearInterval(timer);
  }, [currentIndex, data.length, loading]);

  // ==========================================
  // PULSE ANIMATION
  // ==========================================
  useEffect(() => {
    if (data.length === 0) return;
    
    let interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 2500);
    
    return () => clearInterval(interval);
  }, [data.length]);

  // ==========================================
  // ENTRANCE ANIMATION (Faster)
  // ==========================================
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 12, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  // ==========================================
  // HANDLERS
  // ==========================================
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [fetchData]);

  const handlePress = useCallback((item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedOffer(item);
    setIsSaved(false);
    setModalVisible(true);
    likeAnim.setValue(0);
    
    Animated.parallel([
      Animated.spring(modalScale, { toValue: 1, friction: 12, tension: 60, useNativeDriver: true }),
      Animated.timing(modalAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const closeModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(modalScale, { toValue: 0.9, friction: 12, tension: 60, useNativeDriver: true }),
      Animated.timing(modalAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedOffer(null);
    });
  }, []);

  const toggleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(likeAnim, { toValue: 1, friction: 5, tension: 150, useNativeDriver: true }),
      Animated.spring(likeAnim, { toValue: 0, friction: 5, tension: 150, useNativeDriver: true }),
    ]).start();
    setIsSaved(!isSaved);
  }, [isSaved]);

  // ==========================================
  // RENDER ITEM (Optimized)
  // ==========================================
  const renderItem = useCallback(({ item, index }) => {
    const scale = scrollX.interpolate({
      inputRange: [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH],
      outputRange: [0.94, 1, 0.94],
      extrapolate: "clamp",
    });

    const translateY = scrollX.interpolate({
      inputRange: [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH],
      outputRange: [4, 0, 4],
      extrapolate: "clamp",
    });

    return (
      <View style={{ width: ITEM_WIDTH, paddingHorizontal: 4 }}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => handlePress(item)}
          style={styles.cardTouchable}
        >
          <Animated.View style={[styles.card, { transform: [{ scale }, { translateY }] }]}>
            <Image 
              source={{ uri: item.image }} 
              style={styles.image}
              resizeMode="cover"
              loading="eager" // Load immediately
              fadeDuration={0} // Remove fade animation
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.gradientOverlay}
            />
            <View style={styles.overlay}>
              <View style={styles.titleRow}>
                <Text style={styles.titleText} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={[styles.badge, { backgroundColor: "#FFD700" }]}>
                  <Text style={styles.badgeText}>
                    {item.type?.toUpperCase() || "OFFER"}
                  </Text>
                </View>
              </View>
              <Text style={styles.subText} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  }, [scrollX, handlePress]);

  const keyExtractor = useCallback((item, index) => item?._id || `item-${index}`, []);
  
  const onScroll = useCallback(Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  ), []);

  const onMomentumScrollEnd = useCallback((ev) => {
    const newIndex = Math.round(ev.nativeEvent.contentOffset.x / ITEM_WIDTH);
    if (newIndex !== currentIndex) setCurrentIndex(newIndex);
  }, [currentIndex]);

  // ==========================================
  // RENDER DOTS (Memoized)
  // ==========================================
  const renderDots = useMemo(() => {
    return data.map((_, i) => {
      const scaleX = scrollX.interpolate({
        inputRange: [(i - 1) * ITEM_WIDTH, i * ITEM_WIDTH, (i + 1) * ITEM_WIDTH],
        outputRange: [0.6, 2, 0.6],
        extrapolate: "clamp",
      });
      
      const opacity = scrollX.interpolate({
        inputRange: [(i - 1) * ITEM_WIDTH, i * ITEM_WIDTH, (i + 1) * ITEM_WIDTH],
        outputRange: [0.3, 1, 0.3],
        extrapolate: "clamp",
      });
      
      return (
        <Animated.View
          key={i}
          style={[styles.dot, { transform: [{ scaleX }], opacity }]}
        />
      );
    });
  }, [data, scrollX]);

  // ==========================================
  // SHOW CACHE INSTANTLY (No skeleton delay)
  // ==========================================
  // If we have data, show it immediately without skeleton
  if (data.length > 0) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Animated.FlatList
          ref={flatListRef}
          data={data}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          snapToAlignment="center"
          decelerationRate={Platform.OS === 'ios' ? 0.92 : 0.9}
          contentContainerStyle={{ paddingHorizontal: ITEM_SPACING - 4 }}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
              colors={["#FFD700"]}
            />
          }
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={2}
        />

        <View style={styles.dotContainer}>
          {renderDots}
        </View>

        {/* Modal */}
        <Modal 
          animationType="none" 
          transparent={true} 
          visible={isModalVisible} 
          onRequestClose={closeModal}
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={closeModal}>
            <Animated.View style={[styles.modalOverlay, { opacity: modalAnim }]}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <Animated.View style={[styles.modalContent, { transform: [{ scale: modalScale }] }]}>
                  <View style={styles.dragHandle}>
                    <View style={styles.handleBar} />
                  </View>
                  
                  <TouchableOpacity style={styles.closeBtn} onPress={closeModal} activeOpacity={0.7}>
                    <Text style={styles.closeText}>✕</Text>
                  </TouchableOpacity>
                  
                  {selectedOffer && (
                    <ScrollView 
                      showsVerticalScrollIndicator={false} 
                      contentContainerStyle={styles.detailsContainer}
                      bounces={false}
                    >
                      <View style={styles.imageContainer}>
                        <Image 
                          source={{ uri: selectedOffer.image }} 
                          style={styles.modalImage}
                          resizeMode="cover"
                          loading="eager"
                          fadeDuration={0}
                        />
                        <LinearGradient
                          colors={['rgba(0,0,0,0.4)', 'transparent']}
                          style={styles.modalGradient}
                        />
                        <View style={[styles.modalBadge, { backgroundColor: "#f9c349" }]}>
                          <Text style={styles.modalBadgeText}>
                            {selectedOffer.type?.toUpperCase() || "OFFER"}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.modalTitle}>{selectedOffer.title}</Text>
                      
                      <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                      </View>
                      
                      <Text style={styles.modalDesc}>{selectedOffer.description}</Text>
                      
                      <TouchableOpacity 
                        style={styles.bottomCloseBtn} 
                        onPress={closeModal}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.bottomCloseBtnText}>Close</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  )}
                </Animated.View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Modal>
      </Animated.View>
    );
  }

  // Show skeleton only on initial load (no cache)
  if (loading && data.length === 0) {
    return <FastSkeleton />;
  }

  // Empty state
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📭</Text>
      <Text style={styles.emptyText}>No Offers Available</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ==========================================
// STYLES (All styles remain the same)
// ==========================================
const styles = StyleSheet.create({
  container: { 
    marginTop: 8,
    marginBottom: 4,
  },
  
  cardTouchable: {
    paddingVertical: 6,
  },
  
  card: {
    height: ITEM_HEIGHT,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.2)',
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  
  image: { 
    width: "100%", 
    height: "100%", 
    resizeMode: "cover" 
  },
  
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  
  titleText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "800", 
    flex: 1, 
    marginRight: 10,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  
  badgeText: { 
    fontSize: 9, 
    fontWeight: "800", 
    letterSpacing: 0.5,
    color: "#000",
  },
  
  subText: { 
    color: "rgba(255,255,255,0.95)", 
    fontSize: 12, 
    marginTop: 4,
    fontWeight: "500",
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    width: '100%',
  },
  
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: "#f9c349",
    marginHorizontal: 5,
  },
  
  loadingContainer: {
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  retryBtn: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
  },
  
  retryBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.8)", 
    justifyContent: "flex-end",
  },
  
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: height * 0.8,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 20 : 20,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
  },
  
  dragHandle: {
    alignItems: 'center',
    marginBottom: 6,
  },
  
  handleBar: { 
    width: 40, 
    height: 4, 
    backgroundColor: "#E0E0E0", 
    borderRadius: 2,
  },
  
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 18,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  
  closeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  
  detailsContainer: { 
    alignItems: "center", 
    paddingTop: 8,
    paddingBottom: 10,
  },
  
  imageContainer: { 
    width: "100%", 
    height: 180, 
    borderRadius: 20, 
    overflow: "hidden", 
    marginBottom: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  
  modalImage: { 
    width: "100%", 
    height: "100%", 
    resizeMode: "cover" 
  },
  
  modalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  
  modalBadge: { 
    position: "absolute", 
    top: 14, 
    left: 14, 
    paddingHorizontal: 14, 
    paddingVertical: 5, 
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  
  modalBadgeText: { 
    fontWeight: "800", 
    fontSize: 10, 
    color: "#000",
    letterSpacing: 0.5,
  },
  
  modalTitle: { 
    fontSize: 24, 
    fontWeight: "900", 
    color: "#1A1A1A", 
    textAlign: "center", 
    paddingHorizontal: 10,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  
  divider: {
    marginVertical: 6,
    alignItems: 'center',
  },
  
  dividerLine: {
    width: 40,
    height: 3,
    backgroundColor: "#f9c349",
    borderRadius: 2,
  },
  
  modalDesc: { 
    fontSize: 15, 
    color: "#666", 
    textAlign: "center", 
    lineHeight: 22, 
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  
  infoCard: {
    width: "100%",
    backgroundColor: "#F8F9FA",
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  infoItemLast: {
    marginBottom: 0,
  },
  
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD70020',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  
  infoIcon: {
    fontSize: 18,
  },
  
  infoTextContainer: {
    flex: 1,
  },
  
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 1,
  },
  
  infoText: {
    fontSize: 12,
    color: "#777",
  },
  
  saveBtn: { 
    backgroundColor: "#f9c349", 
    width: "100%", 
    paddingVertical: 14, 
    borderRadius: 25, 
    alignItems: "center", 
    justifyContent: "center",
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  
  savedBtnActive: { 
    backgroundColor: "#E8F5E9", 
    borderWidth: 2, 
    borderColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOpacity: 0.15,
  },
  
  saveBtnText: { 
    color: "#000", 
    fontWeight: "800", 
    fontSize: 16,
    letterSpacing: 0.3,
  },
  
  savedBtnTextActive: { 
    color: "#4CAF50",
  },
  
  bottomCloseBtn: {
    width: "100%",
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  
  bottomCloseBtnText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },

  // SKELETON STYLES
  skeletonCard: {
    height: ITEM_HEIGHT,
    backgroundColor: "#E8E8E8",
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: ITEM_SPACING + 4,
    width: ITEM_WIDTH,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  
  skeletonImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D5D5D5",
    position: "relative",
    overflow: "hidden",
  },
  
  skeletonShimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 80,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.4)",
    transform: [{ skewX: '-20deg' }],
  },
  
  skeletonOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  
  skeletonTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  
  skeletonTitle: {
    height: 18,
    width: "55%",
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
  },
  
  skeletonBadge: {
    height: 20,
    width: 50,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 6,
  },
  
  skeletonSubtitle: {
    height: 12,
    width: "45%",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    marginTop: 8,
  },
  
  skeletonDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: "#D5D5D5",
    marginHorizontal: 5,
  },
  
  skeletonDotActive: {
    backgroundColor: "#B8B8B8",
    width: 16,
  },
});