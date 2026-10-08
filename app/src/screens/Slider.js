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
import { Ionicons } from '@expo/vector-icons';
import { color, font } from '../theme/tokens';

const DOT_GREY = '#E2DCCF';

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
      {/* Same place and shape as a real card, so nothing jumps when banners load */}
      <View style={styles.cardTouchable}>
        <View style={styles.skeletonCard}>
          <Animated.View
            style={[
              styles.skeletonShimmer,
              { transform: [{ translateX }] }
            ]}
          />
        </View>
      </View>
      <View style={styles.dotContainer}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.dotSlot}>
            <View style={styles.dotGrey} />
          </View>
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

// Embedded on Home → no props from navigation. As the "Slider" route in
// HomeStack → React Navigation passes `route`; only there do we keep the retry block.
export default function Slider({ route } = {}) {
  const isStandalone = !!route;
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
          accessibilityRole="button"
          accessibilityLabel={item?.title || "banner"}
        >
          {/* Outer view carries the shadow, inner view clips the image
              (overflow: hidden would clip the shadow on iOS) */}
          <Animated.View style={[styles.card, { transform: [{ scale }, { translateY }] }]}>
            <View style={styles.cardInner}>
              <Image
                source={{ uri: item.image }}
                style={styles.image}
                resizeMode="cover"
                loading="eager" // Load immediately
                fadeDuration={0} // Remove fade animation
              />
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
    // Native driver can't animate width, so each dot cross-fades a grey
    // 6×6 circle with a black 18×6 pill that stretches in (scaleX 1/3 → 1)
    return data.map((_, i) => {
      const inputRange = [(i - 1) * ITEM_WIDTH, i * ITEM_WIDTH, (i + 1) * ITEM_WIDTH];
      const pillScaleX = scrollX.interpolate({
        inputRange,
        outputRange: [1 / 3, 1, 1 / 3],
        extrapolate: "clamp",
      });
      const pillOpacity = scrollX.interpolate({
        inputRange,
        outputRange: [0, 1, 0],
        extrapolate: "clamp",
      });
      const greyOpacity = scrollX.interpolate({
        inputRange,
        outputRange: [1, 0, 1],
        extrapolate: "clamp",
      });

      return (
        <View key={i} style={styles.dotSlot}>
          <Animated.View style={[styles.dotGrey, { opacity: greyOpacity }]} />
          <Animated.View
            style={[styles.dotPill, { opacity: pillOpacity, transform: [{ scaleX: pillScaleX }] }]}
          />
        </View>
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
                  
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={closeModal}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="close"
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Ionicons name="close" size={18} color={color.ink} />
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
                        {/* Server types: 'slider' (default) | 'offer' → badge only for non-slider */}
                        {!!selectedOffer.type && String(selectedOffer.type).toLowerCase() !== "slider" && (
                          <View style={styles.modalBadge}>
                            <Text style={styles.modalBadgeText}>
                              {String(selectedOffer.type).toLowerCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {!!selectedOffer.title && (
                        <Text style={styles.modalTitle} accessibilityRole="header">
                          {selectedOffer.title}
                          {!/[.!?…]$/.test(String(selectedOffer.title).trim()) && (
                            <Text style={styles.modalTitleDot}>.</Text>
                          )}
                        </Text>
                      )}

                      {!!selectedOffer.description && (
                        <Text style={styles.modalDesc}>{selectedOffer.description}</Text>
                      )}

                      <TouchableOpacity
                        style={styles.bottomCloseBtn}
                        onPress={closeModal}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="close"
                      >
                        <Text style={styles.bottomCloseBtnText}>close</Text>
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

  // Empty state: nothing on Home (it starts at the greeting);
  // the standalone "Slider" route keeps a retry
  if (!isStandalone) return null;
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>no banners right now.</Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={onRefresh}
        accessibilityRole="button"
        accessibilityLabel="retry"
      >
        <Text style={styles.retryBtnText}>retry</Text>
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
  
  // Shadow layer (no overflow: hidden, so iOS draws the shadow)
  card: {
    height: ITEM_HEIGHT,
    borderRadius: 22,
    backgroundColor: color.sand,
    borderWidth: 1,
    borderColor: color.line,
    elevation: 2,
    shadowColor: color.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  // Clip layer: sand shows while the image loads
  cardInner: {
    flex: 1,
    borderRadius: 21,
    overflow: "hidden",
    backgroundColor: color.sand,
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },

  // 10 from the card edge: 6 (cardTouchable bottom padding) + 4
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    width: '100%',
  },

  // 6-wide slot; the 18-wide pill overflows it into the 5px margins
  dotSlot: {
    width: 6,
    height: 6,
    marginHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  dotGrey: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DOT_GREY,
  },
  dotPill: {
    position: "absolute",
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.ink,
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

  emptyText: {
    fontFamily: font.bodySemi,
    fontSize: 15,
    color: color.textMuted,
    textAlign: 'center',
    marginBottom: 14,
  },
  
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  retryBtn: {
    backgroundColor: color.ink,
    paddingHorizontal: 24,
    height: 44,
    justifyContent: 'center',
    borderRadius: 22,
  },

  retryBtnText: {
    fontFamily: font.bodyBold,
    color: color.white,
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,17,17,0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: color.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },

  dragHandle: {
    alignItems: 'center',
    marginBottom: 6,
  },

  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: DOT_GREY,
    borderRadius: 2,
  },

  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 18,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.line,
  },

  detailsContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
  },

  imageContainer: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    position: 'relative',
    backgroundColor: color.sand,
  },

  modalImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },

  modalBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: color.yellowSoft,
    justifyContent: "center",
  },

  modalBadgeText: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: color.ink,
  },

  modalTitle: {
    fontFamily: font.heading,
    fontSize: 22,
    color: color.ink,
    textAlign: "center",
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  modalTitleDot: { color: color.yellow },

  modalDesc: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
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
    height: 52,
    borderRadius: 26,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  bottomCloseBtnText: {
    fontFamily: font.bodyBold,
    color: color.white,
    fontSize: 15,
  },

  // SKELETON STYLES
  // Same box as a real card: left = ITEM_SPACING, width = ITEM_WIDTH - 8
  skeletonCard: {
    height: ITEM_HEIGHT,
    width: ITEM_WIDTH - 8,
    marginLeft: ITEM_SPACING,
    backgroundColor: color.sand,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: color.line,
    overflow: "hidden",
  },

  skeletonShimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 80,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.45)",
    transform: [{ skewX: '-20deg' }],
  },
});