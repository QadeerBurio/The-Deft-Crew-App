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
} from "react-native";

const { width, height } = Dimensions.get("window");
const ITEM_WIDTH = width * 0.88;
const ITEM_HEIGHT = 180;
const ITEM_SPACING = (width - ITEM_WIDTH) / 2;

const BASE_URL = "https://the-deft-crew-production.up.railway.app";

export default function Slider() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Modal & Saved States
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  
  // --- AUTO TRANSITION LOGIC ---
  useEffect(() => {
    let timer;
    if (data.length > 0) {
      timer = setInterval(() => {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= data.length) {
          nextIndex = 0;
        }
        
        // Scroll to the next index with animation
        flatListRef.current?.scrollToOffset({
          offset: nextIndex * ITEM_WIDTH,
          animated: true,
        });
      }, 3000); // 3 seconds interval
    }
    return () => clearInterval(timer);
  }, [currentIndex, data.length]);

  // Fast data fetching with timeout and cache
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Set a timeout for the fetch operation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${BASE_URL}/api/admin/all`, {
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
        
        // FIX: Check if json is an array before using filter
        let visibleData = [];
        
        if (Array.isArray(json)) {
          visibleData = json.filter((item) => item && item.active !== false);
        } else if (json && typeof json === 'object') {
          // Handle case where API returns an object with data property
          if (Array.isArray(json.data)) {
            visibleData = json.data.filter((item) => item && item.active !== false);
          } else if (Array.isArray(json.offers)) {
            visibleData = json.offers.filter((item) => item && item.active !== false);
          } else if (Array.isArray(json.sliders)) {
            visibleData = json.sliders.filter((item) => item && item.active !== false);
          } else {
            console.warn("API response is not an array:", json);
            visibleData = [];
          }
        } else {
          console.warn("Invalid API response format:", json);
          visibleData = [];
        }
        
        setData(visibleData);
        setLoading(false);
      } catch (err) {
        console.error("Slider Fetch Error:", err);
        setLoading(false);
        // Optionally set some default/demo data for testing
        setData([]);
      }
    };
    
    // Immediate fetch
    fetchData();
  }, []);

  // OPEN MODAL FOR BOTH TYPES
  const handlePress = (item) => {
    setSelectedOffer(item);
    setIsSaved(false);
    setModalVisible(true);
  };

  const toggleSave = () => {
    setIsSaved(!isSaved);
  };

  // Show loading indicator while fetching data
  // if (loading) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <ActivityIndicator size="large" color="#000" />
  //       <Text style={styles.loadingText}>Loading offers...</Text>
  //     </View>
  //   );
  // }
  
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {/* <ActivityIndicator size="large" color="#000" /> */}
        
      
      </View>
    );
  }

  const renderItem = ({ item, index }) => {
    const scale = scrollX.interpolate({
      inputRange: [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH],
      outputRange: [0.94, 1, 0.94],
      extrapolate: "clamp",
    });

    return (
      <View style={{ width: ITEM_WIDTH }}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => handlePress(item)}>
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.overlay}>
              <View style={styles.titleRow}>
                <Text style={styles.titleText} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={[styles.badge, { backgroundColor: item.type === "slider" ? "#f5c917" : "#FFD700" }]}>
                  <Text style={[styles.badgeText, { color: "#000" }]}>
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

  return (
    <View style={styles.container}>
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
      />

      {/* CENTERED DOTS */}
      <View style={styles.dotContainer}>
        {data.map((_, i) => {
          const scaleX = scrollX.interpolate({
            inputRange: [(i - 1) * ITEM_WIDTH, i * ITEM_WIDTH, (i + 1) * ITEM_WIDTH],
            outputRange: [1, 2.5, 1],
            extrapolate: "clamp",
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { transform: [{ scaleX }] },
                { opacity: currentIndex === i ? 1 : 0.3 },
              ]}
            />
          );
        })}
      </View>

      {/* DETAIL MODAL */}
      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.handleBar} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            {selectedOffer && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsContainer}>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: selectedOffer.image }} style={styles.modalImage} />
                  <View style={[styles.modalBadge, { backgroundColor: selectedOffer.type === 'slider' ? '#f5c917' : '#FFD700' }]}>
                    <Text style={styles.modalBadgeText}>{selectedOffer.type?.toUpperCase() || "OFFER"}</Text>
                  </View>
                </View>
                <Text style={styles.modalTitle}>{selectedOffer.title}</Text>
                <View style={styles.divider} />
                <Text style={styles.modalDesc}>{selectedOffer.description}</Text>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>• Available for all users</Text>
                  <Text style={styles.infoText}>• Check website for more details</Text>
                </View>

                <TouchableOpacity style={[styles.saveBtn, isSaved && styles.savedBtnActive]} onPress={toggleSave}>
                  <Text style={[styles.saveBtnText, isSaved && styles.savedBtnTextActive]}>
                    {isSaved ? "✓ Saved to Profile" : "Save to Favorites"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 15 },
  card: {
    height: ITEM_HEIGHT,
    backgroundColor: "#eee",
    borderRadius: 24,
    overflow: "hidden",
    marginHorizontal: 5,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    fontWeight: "900", 
    flex: 1, 
    marginRight: 10 
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 9, fontWeight: "bold", letterSpacing: 0.5 },
  subText: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    width: '100%',
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: "#000",
    marginHorizontal: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    maxHeight: height * 0.85,
    paddingHorizontal: 25,
    paddingBottom: Platform.OS === "ios" ? 40 : 25,
    paddingTop: 15,
  },
  handleBar: { width: 50, height: 5, backgroundColor: "#E0E0E0", borderRadius: 10, alignSelf: "center", marginBottom: 10 },
  closeBtn: { position: "absolute", right: 20, top: 20, zIndex: 10, backgroundColor: "#F5F5F5", width: 35, height: 35, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  closeText: { fontSize: 14, fontWeight: "bold", color: "#999" },
  detailsContainer: { alignItems: "center", paddingTop: 20 },
  imageContainer: { width: "100%", height: 220, borderRadius: 20, overflow: "hidden", marginBottom: 20, elevation: 10 },
  modalImage: { width: "100%", height: "100%", resizeMode: "cover" },
  modalBadge: { position: "absolute", top: 15, left: 15, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  modalBadgeText: { fontWeight: "bold", fontSize: 10, color: "#000" },
  modalTitle: { fontSize: 24, fontWeight: "900", color: "#1A1A1A", textAlign: "center", paddingHorizontal: 10 },
  divider: { width: 40, height: 4, backgroundColor: "#000", borderRadius: 2, marginVertical: 15 },
  modalDesc: { fontSize: 15, color: "#4F4F4F", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  infoRow: { width: "100%", backgroundColor: "#F9F9F9", padding: 15, borderRadius: 15, marginBottom: 25 },
  infoText: { fontSize: 13, color: "#828282", marginBottom: 5 },
  saveBtn: { backgroundColor: "#000", width: "100%", paddingVertical: 18, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  savedBtnActive: { backgroundColor: "#E8F5E9", borderWidth: 1, borderColor: "#4CAF50" },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  savedBtnTextActive: { color: "#4CAF50" },
});