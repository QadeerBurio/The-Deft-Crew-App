import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  RefreshControl,
} from "react-native";
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get("window");
const ITEM_WIDTH = width * 0.88;
const ITEM_HEIGHT = 200;
const ITEM_SPACING = (width - ITEM_WIDTH) / 2;

const BASE_URL = "https://the-deft-crew-production.up.railway.app";

// ==========================================
// SKELETON LOADER COMPONENT
// ==========================================
const SliderSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.skeletonCard, { opacity }]}>
        <View style={styles.skeletonImagePlaceholder}>
          <View style={styles.skeletonShimmer} />
        </View>
        <View style={styles.skeletonOverlay}>
          <View style={styles.skeletonTitleRow}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonBadge} />
          </View>
          <View style={styles.skeletonSubtitle} />
        </View>
      </Animated.View>

      {/* Skeleton Dots */}
      <View style={styles.dotContainer}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.skeletonDot, i === 1 && styles.skeletonDotActive]} />
        ))}
      </View>
    </View>
  );
};

export default function Slider() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Modal & Saved States
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Animation refs
  const modalAnim = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // --- AUTO TRANSITION LOGIC ---
  useEffect(() => {
    let timer;
    let interval;
    
    if (data.length > 0 && !loading) {
      // Auto scroll timer
      timer = setInterval(() => {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= data.length) {
          nextIndex = 0;
        }
        
        flatListRef.current?.scrollToOffset({
          offset: nextIndex * ITEM_WIDTH,
          animated: true,
        });
      }, 4000);
      
      // Pulsing animation for dots
      interval = setInterval(() => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);
    }
    
    return () => {
      clearInterval(timer);
      clearInterval(interval);
    };
  }, [currentIndex, data.length, loading]);

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fetch data with caching and fast response
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      // Add cache busting for fresh data
      const cacheBuster = isRefresh ? `?_=${Date.now()}` : '';
      
      const response = await fetch(`${BASE_URL}/api/admin/all${cacheBuster}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json = await response.json();
      
      let visibleData = [];
      
      if (Array.isArray(json)) {
        visibleData = json.filter((item) => item && item.active !== false);
      } else if (json && typeof json === 'object') {
        if (Array.isArray(json.data)) {
          visibleData = json.data.filter((item) => item && item.active !== false);
        } else if (Array.isArray(json.offers)) {
          visibleData = json.offers.filter((item) => item && item.active !== false);
        } else if (Array.isArray(json.sliders)) {
          visibleData = json.sliders.filter((item) => item && item.active !== false);
        } else {
          visibleData = [];
        }
      } else {
        visibleData = [];
      }
      
      setData(visibleData);
      setLoading(false);
      setRefreshing(false);
      
    } catch (err) {
      console.error("Slider Fetch Error:", err);
      setLoading(false);
      setRefreshing(false);
      setData([]);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [fetchData]);

  // Modal handlers with animations
  const handlePress = useCallback((item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOffer(item);
    setIsSaved(false);
    setModalVisible(true);
    
    // Animate modal entrance
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 0.9,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedOffer(null);
    });
  }, []);

  const toggleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate save button
    Animated.sequence([
      Animated.spring(pulseAnim, {
        toValue: 0.95,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsSaved(!isSaved);
  }, [isSaved]);

  const renderItem = ({ item, index }) => {
    const scale = scrollX.interpolate({
      inputRange: [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH],
      outputRange: [0.92, 1, 0.92],
      extrapolate: "clamp",
    });

    const translateY = scrollX.interpolate({
      inputRange: [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH],
      outputRange: [10, 0, 10],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange: [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH],
      outputRange: [0.7, 1, 0.7],
      extrapolate: "clamp",
    });

    return (
      <View style={{ width: ITEM_WIDTH }}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => handlePress(item)}
        >
          <Animated.View style={[
            styles.card, 
            { 
              transform: [{ scale }, { translateY }],
              opacity,
            }
          ]}>
            <Image source={{ uri: item.image }} style={styles.image} />
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
  };

  // ==========================================
  // SHOW SKELETON WHILE LOADING
  // ==========================================
  if (loading && data.length === 0) {
    return <SliderSkeleton />;
  }

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
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: ITEM_SPACING }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(ev) => {
          const newIndex = Math.round(ev.nativeEvent.contentOffset.x / ITEM_WIDTH);
          setCurrentIndex(newIndex);
        }}
        keyExtractor={(item, index) => item?._id || index.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
            colors={["#FFD700"]}
          />
        }
      />

      {/* ANIMATED DOTS */}
      <View style={styles.dotContainer}>
        {data.map((_, i) => {
          const scaleX = scrollX.interpolate({
            inputRange: [(i - 1) * ITEM_WIDTH, i * ITEM_WIDTH, (i + 1) * ITEM_WIDTH],
            outputRange: [0.8, 1.8, 0.8],
            extrapolate: "clamp",
          });
          
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * ITEM_WIDTH, i * ITEM_WIDTH, (i + 1) * ITEM_WIDTH],
            outputRange: [0.4, 1, 0.4],
            extrapolate: "clamp",
          });
          
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { 
                  transform: [{ scaleX }],
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>

      {/* DETAIL MODAL - CLOSE ON OUTSIDE CLICK */}
      <Modal 
        animationType="none" 
        transparent={true} 
        visible={isModalVisible} 
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <Animated.View 
            style={[
              styles.modalOverlay,
              { opacity: modalAnim }
            ]}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View 
                style={[
                  styles.modalContent,
                  {
                    transform: [{ scale: modalScale }],
                  }
                ]}
              >
                {/* Drag Handle */}
                <View style={styles.dragHandle}>
                  <View style={styles.handleBar} />
                </View>
                
                <TouchableOpacity 
                  style={styles.closeBtn} 
                  onPress={closeModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
                
                {selectedOffer && (
                  <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.detailsContainer}
                    bounces={false}
                  >
                    {/* Full Image Container */}
                    <Animated.View 
                      style={styles.imageContainer}
                    >
                      <Image 
                        source={{ uri: selectedOffer.image }} 
                        style={styles.modalImage}
                        resizeMode="cover"
                      />
                      <View style={[styles.modalBadge, { backgroundColor: "#f9c349" }]}>
                        <Text style={styles.modalBadgeText}>
                          {selectedOffer.type?.toUpperCase() || "OFFER"}
                        </Text>
                      </View>
                      <View style={styles.imageOverlay}>
                        <TouchableOpacity style={styles.expandBtn}>
                          <Text style={styles.expandBtnText}>🔍</Text>
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                    
                    <Text style={styles.modalTitle}>{selectedOffer.title}</Text>
                    
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                    </View>
                    
                    <Text style={styles.modalDesc}>{selectedOffer.description}</Text>
                    
                    {/* Enhanced Info Section */}
                    <View style={styles.infoCard}>
                      <View style={styles.infoItem}>
                        <View style={styles.infoIconContainer}>
                          <Text style={styles.infoIcon}>🎯</Text>
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Exclusive Offer</Text>
                          <Text style={styles.infoText}>Available for all students</Text>
                        </View>
                      </View>
                      
                      <View style={styles.infoItem}>
                        <View style={styles.infoIconContainer}>
                          <Text style={styles.infoIcon}>⭐</Text>
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Limited Time</Text>
                          <Text style={styles.infoText}>Grab before it's gone</Text>
                        </View>
                      </View>
                      
                      <View style={styles.infoItem}>
                        <View style={styles.infoIconContainer}>
                          <Text style={styles.infoIcon}>📱</Text>
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Multi-Platform</Text>
                          <Text style={styles.infoText}>Valid on App & Website</Text>
                        </View>
                      </View>
                    </View>

                    {/* Save Button with Animation */}
                    <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
                      <TouchableOpacity 
                        style={[styles.saveBtn, isSaved && styles.savedBtnActive]} 
                        onPress={toggleSave}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.saveBtnText, isSaved && styles.savedBtnTextActive]}>
                          {isSaved ? "✓ Saved to Favorites" : "❤️ Save to Favorites"}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                    
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

const styles = StyleSheet.create({
  container: { 
    marginTop: 20,
    marginBottom: 10,
  },
  
  card: {
    height: ITEM_HEIGHT,
    backgroundColor: "#fff",
    borderRadius: 28,
    overflow: "hidden",
    marginHorizontal: 5,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  
  image: { 
    width: "100%", 
    height: "100%", 
    resizeMode: "cover" 
  },
  
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(10px)",
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
  },
  
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  
  badgeText: { 
    fontSize: 9, 
    fontWeight: "800", 
    letterSpacing: 0.5,
    color: "#000",
  },
  
  subText: { 
    color: "rgba(255,255,255,0.9)", 
    fontSize: 12, 
    marginTop: 4,
    fontWeight: "500",
  },
  
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    width: '100%',
  },
  
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
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

  // MODAL STYLES
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.8)", 
    justifyContent: "flex-end",
  },
  
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    maxHeight: height * 0.8,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 20 : 20,
    paddingTop: 12,
  },
  
  dragHandle: {
    alignItems: 'center',
    marginBottom: 6,
  },
  
  handleBar: { 
    width: 50, 
    height: 4, 
    backgroundColor: "#E0E0E0", 
    borderRadius: 3,
  },
  
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  
  detailsContainer: { 
    alignItems: "center", 
    paddingTop: 10,
    paddingBottom: 10,
  },
  
  imageContainer: { 
    width: "100%", 
    height: 200, 
    borderRadius: 24, 
    overflow: "hidden", 
    marginBottom: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: 'relative',
  },
  
  modalImage: { 
    width: "100%", 
    height: "100%", 
    resizeMode:"stretch" 
  },
  
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 18,
  },
  
  expandBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  expandBtnText: {
    fontSize: 18,
  },
  
  modalBadge: { 
    position: "absolute", 
    top: 15, 
    left: 15, 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  modalBadgeText: { 
    fontWeight: "800", 
    fontSize: 10, 
    color: "#000",
    letterSpacing: 0.5,
  },
  
  modalTitle: { 
    fontSize: 26, 
    fontWeight: "900", 
    color: "#1A1A1A", 
    textAlign: "center", 
    paddingHorizontal: 10,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  
  divider: {
    marginVertical: 6,
    alignItems: 'center',
  },
  
  dividerLine: {
    width: 50,
    height: 4,
    backgroundColor: "#f9c349",
    borderRadius: 2,
  },
  
  modalDesc: { 
    fontSize: 16, 
    color: "#666", 
    textAlign: "center", 
    lineHeight: 24, 
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  
  infoCard: {
    width: "100%",
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 20,
    marginBottom: 2,
  },
  
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  infoIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: '#FFD70020',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  infoIcon: {
    fontSize: 20,
  },
  
  infoTextContainer: {
    flex: 1,
  },
  
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  
  infoText: {
    fontSize: 13,
    color: "#777",
  },
  
  saveBtn: { 
    backgroundColor: "#000", 
    width: "100%", 
    paddingVertical: 16, 
    borderRadius: 25, 
    alignItems: "center", 
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  
  savedBtnActive: { 
    backgroundColor: "#E8F5E9", 
    borderWidth: 2, 
    borderColor: "#4CAF50",
  },
  
  saveBtnText: { 
    color: "#fff", 
    fontWeight: "800", 
    fontSize: 16,
    letterSpacing: 0.3,
  },
  
  savedBtnTextActive: { 
    color: "#4CAF50",
  },
  
  bottomCloseBtn: {
    width: "100%",
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  
  bottomCloseBtnText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },

  // ==========================================
  // SKELETON STYLES
  // ==========================================
  skeletonCard: {
    height: ITEM_HEIGHT,
    backgroundColor: "#E0E0E0",
    borderRadius: 28,
    overflow: "hidden",
    marginHorizontal: ITEM_SPACING + 5,
    width: ITEM_WIDTH,
  },
  
  skeletonImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D0D0D0",
    position: "relative",
    overflow: "hidden",
  },
  
  skeletonShimmer: {
    position: "absolute",
    top: 0,
    left: -100,
    width: 100,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.3)",
    transform: [{ skewX: '-20deg' }],
  },
  
  skeletonOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  
  skeletonTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  
  skeletonTitle: {
    height: 18,
    width: "60%",
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
    width: "40%",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    marginTop: 8,
  },
  
  skeletonDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: "#D0D0D0",
    marginHorizontal: 5,
  },
  
  skeletonDotActive: {
    backgroundColor: "#B0B0B0",
    width: 16,
  },
});