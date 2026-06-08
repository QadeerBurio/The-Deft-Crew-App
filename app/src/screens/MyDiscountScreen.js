import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  RefreshControl,
  Easing,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';

const { height } = Dimensions.get('window');

const DISCOUNT_THEMES = {
  10: { icon: 'restaurant-outline', accent: '#f9c349' },
  15: { icon: 'cafe-outline', accent: '#f9c349' },
  20: { icon: 'shirt-outline', accent: '#f9c349' },
  25: { icon: 'cut-outline', accent: '#f9c349' },
  30: { icon: 'fitness-outline', accent: '#f9c349' },
  40: { icon: 'diamond-outline', accent: '#f9c349' },
  50: { icon: 'trophy-outline', accent: '#f9c349' },
  default: { icon: 'pricetag-outline', accent: '#f9c349' },
};

const getTheme = (percentage) => DISCOUNT_THEMES[percentage] || DISCOUNT_THEMES.default;

const StatCard = ({ title, value, icon, delay }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(animValue, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleValue, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();
  }, [delay, animValue, scaleValue]);

  return (
    <Animated.View style={[styles.statCard, { opacity: animValue, transform: [{ scale: scaleValue }] }]}>
      <View style={styles.statCardInner}>
        <View style={[styles.statIconBox, { backgroundColor: '#f9c34915' }]}>
          <Ionicons name={icon} size={20} color="#f9c349" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{title}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const DiscountCard = ({ item, index, onUseNow }) => {
  const entry = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const percentage = item.discountPercentage || 10;
  const theme = getTheme(percentage);

  useEffect(() => {
    Animated.timing(entry, {
      toValue: 1,
      delay: index * 50,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [entry, index]);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.98, friction: 6, tension: 55, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }).start();
  };

  const translateY = entry.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <Animated.View style={[styles.discountCard, { opacity: entry, transform: [{ translateY }, { scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onUseNow(item)}
        style={styles.cardTouchable}
      >
        <View style={styles.imageContainer}>
          {item.displayImage ? (
            <Image source={{ uri: item.displayImage }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={styles.cardPlaceholder}>
              <LinearGradient colors={['#f8f8f8', '#f0f0f0']} style={styles.placeholderGradient}>
                <Ionicons name={theme.icon} size={40} color="rgba(249,195,73,0.3)" />
              </LinearGradient>
            </View>
          )}

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']} style={styles.imageOverlay} />

          <View style={styles.percentageBadge}>
            <LinearGradient colors={['#f9c349', '#f7b733']} style={styles.percentageBadgeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.percentageText}>{percentage}% OFF</Text>
            </LinearGradient>
          </View>

          <View style={styles.categoryTag}>
            <Ionicons name={theme.icon} size={10} color="#f9c349" style={{ marginRight: 4 }} />
            <Text style={styles.categoryText}>{item.category || 'Special Offer'}</Text>
          </View>

          <View style={styles.cardContentOverlay}>
            <Text numberOfLines={1} style={styles.cardTitle}>{item.title || 'Discount Offer'}</Text>
            <Text numberOfLines={2} style={styles.cardDescription}>{item.description || 'Tap to view how to redeem this offer.'}</Text>
            <View style={styles.tapIndicator}>
              <Ionicons name="sparkles-outline" size={11} color="#f9c349" />
              <Text style={styles.tapText}>Tap to use now</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const UseNowModal = ({ visible, onClose, item }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const percentage = item?.discountPercentage || 10;

  const steps = [
    { icon: 'storefront-outline', title: 'Visit the Store', description: 'Visit the participating brand/store offering this discount' },
    { icon: 'id-card-outline', title: 'Show Your Card', description: 'Present your TDC Card or Student ID to the staff before payment' },
    { icon: 'shield-checkmark-outline', title: 'Verification', description: 'The store staff will verify your eligibility for the offer' },
    { icon: 'checkmark-circle-outline', title: 'Redeem & Save', description: 'Once verified, the discount will be applied to your purchase' },
  ];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(height);
      backdropAnim.setValue(0);
    }
  }, [visible, slideAnim, backdropAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={styles.modalScrollContent}>
            {item?.displayImage ? (
              <View style={styles.modalImageContainer}>
                <Image source={{ uri: item.displayImage }} style={styles.modalImage} resizeMode="cover" />
                <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']} style={styles.modalImageOverlay} />
                <View style={styles.modalPercentageBadge}>
                  <LinearGradient colors={['#f9c349', '#f7b733']} style={styles.modalBadgeGradient}>
                    <Text style={styles.modalPercentageText}>{percentage}%</Text>
                    <Text style={styles.modalPercentageOff}>OFF</Text>
                  </LinearGradient>
                </View>
              </View>
            ) : (
              <View style={styles.modalHeaderPlaceholder}>
                <LinearGradient colors={['#f9c349', '#f7b733']} style={styles.modalIconCircle}>
                  <Ionicons name="pricetag-outline" size={30} color="#000" />
                </LinearGradient>
              </View>
            )}

            <View style={styles.modalTitleSection}>
              <Text style={styles.modalTitle}>{item?.title}</Text>
              <Text style={styles.modalSubtitle}>{item?.description}</Text>
            </View>

            <View style={styles.stepsWrapper}>
              <View style={styles.stepsSectionHeader}>
                <View style={styles.stepsSectionDot} />
                <Text style={styles.stepsHeader}>HOW TO REDEEM</Text>
              </View>

              {steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumberContainer}>
                    <LinearGradient colors={['#f9c349', '#f7b733']} style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </LinearGradient>
                    {index < steps.length - 1 && <View style={styles.stepLine} />}
                  </View>
                  <View style={styles.stepContentBox}>
                    <Ionicons name={step.icon} size={16} color="#f9c349" style={styles.stepContentIcon} />
                    <View style={styles.stepTextContainer}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDescription}>{step.description}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.closeModalButton} onPress={onClose} activeOpacity={0.85}>
              <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.closeModalGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.closeModalText}>Got It!</Text>
                <Ionicons name="checkmark-circle" size={18} color="#f9c349" style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// FAST Skeleton Loader - Optimized
const SkeletonLoader = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, { 
        toValue: 1, 
        duration: 400, 
        easing: Easing.linear, 
        useNativeDriver: true 
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [-100, 100] 
  });

  const ShimmerBlock = ({ style }) => (
    <View style={[style, { overflow: 'hidden', backgroundColor: '#f0f0f0' }]}>
      <Animated.View style={{ 
        position: 'absolute', 
        top: 0, 
        bottom: 0, 
        width: 60, 
        transform: [{ translateX }] 
      }}>
        <LinearGradient 
          colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }} 
          style={{ flex: 1 }} 
        />
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <ShimmerBlock style={{ width: 38, height: 38, borderRadius: 12 }} />
        <ShimmerBlock style={{ width: 100, height: 16, borderRadius: 8 }} />
        <View style={{ width: 38 }} />
      </View>
      <View style={styles.listContainer}>
        <View style={styles.statsContainer}>
          <ShimmerBlock style={{ flex: 1, height: 72, borderRadius: 16 }} />
          <View style={{ width: 12 }} />
          <ShimmerBlock style={{ flex: 1, height: 72, borderRadius: 16 }} />
        </View>
        <ShimmerBlock style={{ height: 200, borderRadius: 16, marginBottom: 16 }} />
        <ShimmerBlock style={{ height: 200, borderRadius: 16, marginBottom: 16 }} />
      </View>
    </SafeAreaView>
  );
};

const EmptyState = ({ navigation }) => {
  const scale = useRef(new Animated.Value(0.97)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.emptyState, { opacity, transform: [{ scale }] }]}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient colors={['#fff', '#f8f8f8']} style={styles.emptyIconGradient}>
          <MaterialCommunityIcons name="ticket-percent-outline" size={50} color="#f9c349" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>No Discounts Yet</Text>
      <Text style={styles.emptyDescription}>
        Start exploring partner offers and{'\n'}claim amazing student discounts!
      </Text>
      <TouchableOpacity style={styles.exploreButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Offers'); }} activeOpacity={0.85}>
        <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.exploreButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="compass" size={16} color="#f9c349" style={{ marginRight: 8 }} />
          <Text style={styles.exploreButtonText}>Explore Offers</Text>
          <Ionicons name="arrow-forward" size={16} color="#f9c349" style={{ marginLeft: 8 }} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MyDiscountScreen() {
  const navigation = useNavigation();
  const { token } = useContext(AuthContext);
  const [claimedOffers, setClaimedOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSaved, setTotalSaved] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const loadDiscounts = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [offersRes, savingsRes] = await Promise.all([
        api.get('/offers/claimed', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/offers/my-total-savings', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const offersWithImages = offersRes.data.map((offer) => ({
        ...offer,
        displayImage: offer.image ? (offer.image.startsWith('http') ? offer.image : `https://the-deft-crew-production.up.railway.app/${offer.image}`) : null,
      }));
      setClaimedOffers(offersWithImages);
      setTotalSaved(savingsRes.data.totalSaved || 0);
    } catch (err) {
      console.log('Error loading discounts:', err?.message || err);
      setClaimedOffers([]);
      setTotalSaved(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadDiscounts(false); }, [loadDiscounts]);

  const handleUseNow = (item) => { 
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
    setSelectedOffer(item); 
    setModalVisible(true); 
  };
  
  const handleRefresh = useCallback(() => { 
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
    setRefreshing(true); 
    loadDiscounts(true); 
  }, [loadDiscounts]);

  if (loading) return <SkeletonLoader />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Discounts</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        data={claimedOffers}
        renderItem={({ item, index }) => <DiscountCard item={item} index={index} onUseNow={handleUseNow} />}
        keyExtractor={(item, index) => item._id?.toString() || `${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(data, index) => ({
          length: 216,
          offset: 216 * index,
          index,
        })}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            tintColor="#f9c349" 
            colors={['#f9c349']} 
            progressBackgroundColor="#fff" 
          />
        }
        ListHeaderComponent={
          <View style={styles.statsContainer}>
            <StatCard title="Active Discounts" value={claimedOffers.length} icon="pricetags" delay={0} />
            <StatCard title="PKR Saved" value={totalSaved?.toFixed(0) || 0} icon="wallet-outline" delay={50} />
          </View>
        }
        ListEmptyComponent={<EmptyState navigation={navigation} />}
      />

      <UseNowModal visible={modalVisible} onClose={() => setModalVisible(false)} item={selectedOffer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 8 : 10,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff',
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  listContainer: { padding: 16, paddingBottom: 30, flexGrow: 1 },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#f0f0f0' },
  statCardInner: { backgroundColor: '#fff', padding: 16, flexDirection: 'row', alignItems: 'center', minHeight: 72, borderRadius: 16 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statInfo: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  discountCard: { borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#f0f0f0', height: 200 },
  cardTouchable: { flex: 1 },
  imageContainer: { flex: 1, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardPlaceholder: { width: '100%', height: '100%' },
  placeholderGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '78%' },
  percentageBadge: { position: 'absolute', top: 12, right: 12, borderRadius: 10, overflow: 'hidden', elevation: 4 },
  percentageBadgeGradient: { paddingHorizontal: 12, paddingVertical: 6 },
  percentageText: { color: '#000', fontSize: 12, fontWeight: '800' },
  categoryTag: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)' },
  categoryText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardContentOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingTop: 45 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardDescription: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17, marginBottom: 6 },
  tapIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tapText: { fontSize: 10, color: '#f9c349', fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, flex: 1 },
  emptyIconContainer: { marginBottom: 20 },
  emptyIconGradient: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f0f0f0' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  emptyDescription: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 24, paddingHorizontal: 40, lineHeight: 20 },
  exploreButton: { borderRadius: 14, overflow: 'hidden', elevation: 3 },
  exploreButtonGradient: { paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  exploreButtonText: { color: '#f9c349', fontSize: 14, fontWeight: '700' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', overflow: 'hidden' },
  modalScrollContent: { paddingBottom: 34 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  modalImageContainer: { height: 180, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalImage: { width: '100%', height: '100%' },
  modalImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%' },
  modalHeaderPlaceholder: { height: 120, marginHorizontal: 20, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8', marginTop: 10, borderWidth: 2, borderColor: '#f0f0f0' },
  modalPercentageBadge: { position: 'absolute', top: 12, right: 12, borderRadius: 12, overflow: 'hidden', elevation: 6 },
  modalBadgeGradient: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
  modalPercentageText: { fontSize: 18, fontWeight: '900', color: '#000' },
  modalPercentageOff: { fontSize: 9, fontWeight: '700', color: '#000' },
  modalIconCircle: { width: 65, height: 65, borderRadius: 16, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '45deg' }] },
  modalTitleSection: { paddingHorizontal: 20, paddingTop: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#999', lineHeight: 20 },
  stepsWrapper: { paddingHorizontal: 20, paddingTop: 20 },
  stepsSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stepsSectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f9c349', marginRight: 8 },
  stepsHeader: { fontSize: 12, fontWeight: '800', color: '#1a1a1a', letterSpacing: 1.5 },
  stepItem: { flexDirection: 'row', marginBottom: 4, minHeight: 60 },
  stepNumberContainer: { alignItems: 'center', marginRight: 12, width: 26 },
  stepNumber: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  stepNumberText: { color: '#000', fontWeight: '800', fontSize: 11 },
  stepLine: { width: 1.5, flex: 1, minHeight: 12, backgroundColor: '#f0f0f0', marginTop: 4 },
  stepContentBox: { flex: 1, flexDirection: 'row', backgroundColor: '#f8f9fb', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  stepContentIcon: { marginRight: 10, marginTop: 1 },
  stepTextContainer: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  stepDescription: { fontSize: 11, color: '#999', lineHeight: 16 },
  closeModalButton: { marginHorizontal: 20, marginTop: 20, borderRadius: 14, overflow: 'hidden', elevation: 3 },
  closeModalGradient: { paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  closeModalText: { color: '#f9c349', fontSize: 15, fontWeight: '700' },
});