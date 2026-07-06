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
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Enhanced Theme Configuration
const COLORS = {
  primary: '#f9c349',
  primaryDark: '#e8b82a',
  primaryLight: '#fde8b3',
  background: '#f0f2f5',
  cardBg: '#ffffff',
  textPrimary: '#0a0a0a',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  borderLight: 'rgba(0,0,0,0.06)',
  shadow: 'rgba(0,0,0,0.08)',
  success: '#10b981',
  danger: '#ef4444',
  cardShadow: 'rgba(249,195,73,0.15)',
};

const DISCOUNT_THEMES = {
  10: { icon: 'restaurant-outline', gradient: ['#f9c349', '#f5a623'], accent: '#f5a623' },
  15: { icon: 'cafe-outline', gradient: ['#f9c349', '#f5a623'], accent: '#f5a623' },
  20: { icon: 'shirt-outline', gradient: ['#f9c349', '#f5a623'], accent: '#f5a623' },
  25: { icon: 'cut-outline', gradient: ['#f9c349', '#f5a623'], accent: '#f5a623' },
  30: { icon: 'fitness-outline', gradient: ['#f9c349', '#f5a623'], accent: '#f5a623' },
  40: { icon: 'diamond-outline', gradient: ['#f9c349', '#f5a623'], accent: '#f5a623' },
  50: { icon: 'trophy-outline', gradient: ['#f9c349', '#f5a623'], accent: '#f5a623' },
  default: { icon: 'pricetag-outline', gradient: ['#f9c349', '#f5a623'], accent: '#f5a623' },
};

const getTheme = (percentage) => DISCOUNT_THEMES[percentage] || DISCOUNT_THEMES.default;

// ==================== SPLIT STAT CARD ====================
const SplitStatCard = ({ title, value, icon, gradientColors, delay, index }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(index % 2 === 0 ? -30 : 30)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animValue, {
        toValue: 1,
        delay: delay,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideValue, {
        toValue: 0,
        delay: delay,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(rotateValue, {
        toValue: 1,
        delay: delay,
        friction: 8,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  const rotateInterpolate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '0deg'],
  });

  const bgGradient = gradientColors || ['#f9c349', '#f5a623'];

  return (
    <Animated.View
      style={[
        styles.splitStatCard,
        {
          opacity: animValue,
          transform: [
            { translateX: slideValue },
            { rotate: rotateInterpolate },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#fafafa']}
        style={styles.splitStatInner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.splitStatLeft}>
          <View style={[styles.splitStatIconBox, { backgroundColor: `${bgGradient[0]}20` }]}>
            <LinearGradient
              colors={bgGradient}
              style={styles.splitStatIconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={icon} size={22} color="#fff" />
            </LinearGradient>
          </View>
          <View style={styles.splitStatInfo}>
            <Text style={styles.splitStatValue}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Text>
            <Text style={styles.splitStatLabel}>{title}</Text>
          </View>
        </View>
        <View style={styles.splitStatRight}>
          <LinearGradient
            colors={bgGradient}
            style={styles.splitStatBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="arrow-forward" size={12} color="#fff" />
          </LinearGradient>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ==================== SPLIT DISCOUNT CARD ====================
const SplitDiscountCard = ({ item, index, onUseNow }) => {
  const entry = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const cardRotate = useRef(new Animated.Value(0)).current;
  
  const percentage = item.discountPercentage || 10;
  const theme = getTheme(percentage);

  // Card flip state
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entry, {
        toValue: 1,
        delay: index * 80,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay: index * 80,
        friction: 5,
        tension: 35,
        useNativeDriver: true,
      }),
      Animated.spring(cardRotate, {
        toValue: 1,
        delay: index * 80,
        friction: 7,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleCardPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Flip the card
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const translateY = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  const rotateInterpolate = cardRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-2deg', '0deg'],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.splitCardWrapper,
        {
          opacity: entry,
          transform: [{ translateY }, { scale }, { rotate: rotateInterpolate }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleCardPress}
        style={styles.splitCardTouchable}
      >
        {/* Card Front */}
        <Animated.View
          style={[
            styles.splitCard,
            {
              transform: [{ rotateY: frontInterpolate }],
              backfaceVisibility: 'hidden',
            },
          ]}
        >
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            style={styles.splitCardInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Left Side - Image/Visual */}
            <View style={styles.splitCardLeft}>
              {item.displayImage ? (
                <Image
                  source={{ uri: item.displayImage }}
                  style={styles.splitCardImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={['#f0f0f0', '#e8e8e8']}
                  style={styles.splitCardPlaceholder}
                >
                  <Ionicons name={theme.icon} size={56} color={`${COLORS.primary}30`} />
                </LinearGradient>
              )}
              
              {/* Shimmer Overlay */}
              <Animated.View
                style={[
                  styles.splitShimmerOverlay,
                  { transform: [{ translateX: shimmerTranslate }] },
                ]}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
                  style={styles.splitShimmerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.splitCardImageOverlay}
              />
            </View>

            {/* Right Side - Content */}
            <View style={styles.splitCardRight}>
              <View style={styles.splitCardHeader}>
                <View style={styles.splitPercentageBadge}>
                  <LinearGradient
                    colors={theme.gradient}
                    style={styles.splitPercentageGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.splitPercentageText}>{percentage}%</Text>
                    <Text style={styles.splitPercentageOff}>OFF</Text>
                  </LinearGradient>
                </View>
                <View style={styles.splitCategoryTag}>
                  <Ionicons name={theme.icon} size={12} color={COLORS.primary} />
                </View>
              </View>

              <View style={styles.splitCardContent}>
                <Text numberOfLines={1} style={styles.splitCardTitle}>
                  {item.title || 'Special Offer'}
                </Text>
                <Text numberOfLines={2} style={styles.splitCardDescription}>
                  {item.description || 'Tap card to view details'}
                </Text>
              </View>

              <View style={styles.splitCardFooter}>
                <View style={styles.splitUseNowIndicator}>
                  <LinearGradient
                    colors={['rgba(249,195,73,0.15)', 'rgba(249,195,73,0.05)']}
                    style={styles.splitUseNowPill}
                  >
                    <Ionicons name="flash-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.splitUseNowText}>Tap to flip</Text>
                  </LinearGradient>
                </View>
                <View style={styles.splitFlipIcon}>
                  <Ionicons name="sync-outline" size={16} color={COLORS.textMuted} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Card Back */}
        <Animated.View
          style={[
            styles.splitCard,
            styles.splitCardBack,
            {
              transform: [{ rotateY: backInterpolate }],
              backfaceVisibility: 'hidden',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            },
          ]}
        >
          <LinearGradient
            colors={theme.gradient}
            style={styles.splitCardBackInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.splitCardBackContent}>
              <View style={styles.splitCardBackIcon}>
                <Ionicons name="rocket-outline" size={40} color="#fff" />
              </View>
              <Text style={styles.splitCardBackTitle}>Ready to Save!</Text>
              <Text style={styles.splitCardBackDescription}>
                Tap "Use Now" to redeem your discount
              </Text>
              <TouchableOpacity
                style={styles.splitCardBackButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onUseNow(item);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ffffff', '#f0f0f0']}
                  style={styles.splitCardBackButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.splitCardBackButtonText}>Use Now</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ==================== USE NOW MODAL ====================
const UseNowModal = ({ visible, onClose, item }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.9)).current;
  const percentage = item?.discountPercentage || 10;
  const theme = getTheme(percentage);

  const steps = [
    {
      icon: 'storefront-outline',
      title: 'Visit the Store',
      description: 'Visit the participating brand or store offering this discount',
    },
    {
      icon: 'id-card-outline',
      title: 'Show Your TDC Card',
      description: 'Present your TDC Card or Student ID to the staff before payment',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Verification',
      description: 'The store staff will verify your eligibility for the offer',
    },
    {
      icon: 'checkmark-circle-outline',
      title: 'Redeem & Save',
      description: 'Once verified, the discount will be applied to your purchase',
    },
  ];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(contentScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(height);
      backdropAnim.setValue(0);
      contentScale.setValue(0.9);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        <Animated.View
          style={[styles.modalBackdrop, { opacity: backdropAnim }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [
                { translateY: slideAnim },
                { scale: contentScale },
              ],
            },
          ]}
        >
          <View style={styles.modalHandle}>
            <View style={styles.modalHandleBar} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <LinearGradient
              colors={theme.gradient}
              style={styles.modalHeaderGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name={theme.icon} size={36} color="#fff" />
                </View>
                <View style={styles.modalPercentageCircle}>
                  <Text style={styles.modalPercentageBig}>{percentage}%</Text>
                  <Text style={styles.modalPercentageOffBig}>OFF</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.modalTitleSection}>
              <Text style={styles.modalTitle}>{item?.title}</Text>
              <Text style={styles.modalSubtitle}>{item?.description}</Text>
            </View>

            <View style={styles.stepsWrapper}>
              <View style={styles.stepsSectionHeader}>
                <LinearGradient
                  colors={theme.gradient}
                  style={styles.stepsSectionDot}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={styles.stepsHeader}>How to Redeem</Text>
              </View>

              {steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumberContainer}>
                    <LinearGradient
                      colors={theme.gradient}
                      style={styles.stepNumber}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </LinearGradient>
                    {index < steps.length - 1 && <View style={styles.stepLine} />}
                  </View>
                  <View style={styles.stepContentBox}>
                    <View style={styles.stepContentIcon}>
                      <Ionicons name={step.icon} size={18} color={COLORS.primary} />
                    </View>
                    <View style={styles.stepTextContainer}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDescription}>{step.description}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#1a1a1a', '#2d2d2d']}
                style={styles.closeModalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.closeModalText}>Got It!</Text>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={COLORS.primary}
                  style={{ marginLeft: 8 }}
                />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ==================== SKELETON LOADER ====================
const SkeletonLoader = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  const SkeletonBlock = ({ style }) => (
    <View style={[style, styles.skeletonBase]}>
      <Animated.View
        style={[
          styles.skeletonShimmer,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.7)', 'transparent']}
          style={styles.skeletonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <SkeletonBlock style={{ width: 38, height: 38, borderRadius: 12 }} />
        <SkeletonBlock style={{ width: 140, height: 20, borderRadius: 8 }} />
        <View style={{ width: 38 }} />
      </View>
      <View style={styles.listContainer}>
        <View style={styles.splitStatsContainer}>
          <SkeletonBlock style={{ flex: 1, height: 80, borderRadius: 16 }} />
          <View style={{ width: 12 }} />
          <SkeletonBlock style={{ flex: 1, height: 80, borderRadius: 16 }} />
        </View>
        <SkeletonBlock style={{ height: 160, borderRadius: 20, marginBottom: 16 }} />
        <SkeletonBlock style={{ height: 160, borderRadius: 20, marginBottom: 16 }} />
      </View>
    </SafeAreaView>
  );
};

// ==================== EMPTY STATE ====================
const EmptyState = ({ navigation }) => {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(rotate, {
        toValue: 1,
        friction: 8,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.emptyState,
        { opacity, transform: [{ scale }, { rotate: rotateInterpolate }] },
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={['#fff', '#f8f8f8']}
          style={styles.emptyIconGradient}
        >
          <MaterialCommunityIcons
            name="ticket-percent-outline"
            size={64}
            color={COLORS.primary}
          />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>No Discounts Yet</Text>
      <Text style={styles.emptyDescription}>
        Start exploring partner offers and{'\n'}claim amazing student discounts!
      </Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate('Offers');
        }}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#1a1a1a', '#2d2d2d']}
          style={styles.exploreButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons
            name="compass-outline"
            size={16}
            color={COLORS.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.exploreButtonText}>Explore Offers</Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={COLORS.primary}
            style={{ marginLeft: 8 }}
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ==================== MAIN SCREEN ====================
export default function MyDiscountScreen() {
  const navigation = useNavigation();
  const { token } = useContext(AuthContext);
  const [claimedOffers, setClaimedOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSaved, setTotalSaved] = useState(0);
  const [redemptionCount, setRedemptionCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(headerScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadDiscounts = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const [offersRes, savingsRes] = await Promise.all([
          api.get('/offers/claimed', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/offers/my-total-savings', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const offersWithImages = offersRes.data.map((offer) => ({
          ...offer,
          displayImage: offer.image
            ? offer.image.startsWith('http')
              ? offer.image
              : `https://the-deft-crew-production.up.railway.app/${offer.image}`
            : null,
        }));
        setClaimedOffers(offersWithImages);
        setTotalSaved(savingsRes.data.totalSaved || 0);
        setRedemptionCount(savingsRes.data.redemptionCount || 0);
      } catch (err) {
        console.log('Error loading discounts:', err?.message || err);
        setClaimedOffers([]);
        setTotalSaved(0);
        setRedemptionCount(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadDiscounts(false);
  }, [loadDiscounts]);

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

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerTranslateY }, { scale: headerScale }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
         <Text style={styles.headerTitle}>My Discounts</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{claimedOffers.length} active</Text>
        <View style={styles.headerCenter}>
         
          </View>
        </View>
        
      </Animated.View>

      <FlatList
        data={claimedOffers}
        renderItem={({ item, index }) => (
          <SplitDiscountCard item={item} index={index} onUseNow={handleUseNow} />
        )}
        keyExtractor={(item, index) => item._id?.toString() || `${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressBackgroundColor="#fff"
          />
        }
        ListHeaderComponent={
          <View style={styles.splitStatsContainer}>
            <SplitStatCard
              title="Active Discounts"
              value={claimedOffers.length}
              icon="pricetags-outline"
              gradientColors={['#f9c349', '#f5a623']}
              delay={0}
              index={0}
            />
            <SplitStatCard
              title="Total Saved"
              value={`$${totalSaved.toFixed(0)}`}
              icon="wallet-outline"
              gradientColors={['#10b981', '#059669']}
              delay={100}
              index={1}
            />
          </View>
        }
        ListEmptyComponent={<EmptyState navigation={navigation} />}
      />

      <UseNowModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        item={selectedOffer}
      />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 12,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  headerCenter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerBadge: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  // List Container
  listContainer: {
    padding: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },

  // Split Stats
  splitStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  splitStatCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  splitStatInner: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 76,
    borderRadius: 16,
  },
  splitStatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  splitStatIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  splitStatIconGradient: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitStatInfo: {
    flex: 1,
  },
  splitStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  splitStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  splitStatRight: {
    marginLeft: 8,
  },
  splitStatBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Split Discount Card
  splitCardWrapper: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  splitCardTouchable: {
    flex: 1,
    minHeight: 160,
  },
  splitCard: {
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 160,
    backgroundColor: '#fff',
  },
  splitCardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  splitCardInner: {
    flexDirection: 'row',
    minHeight: 160,
  },
  
  // Left Side
  splitCardLeft: {
    width: '40%',
    position: 'relative',
    overflow: 'hidden',
  },
  splitCardImage: {
    width: '100%',
    height: '100%',
  },
  splitCardPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitShimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 200,
  },
  splitShimmerGradient: {
    flex: 1,
  },
  splitCardImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },

  // Right Side
  splitCardRight: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  splitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  splitPercentageBadge: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  splitPercentageGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  splitPercentageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  splitPercentageOff: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
    opacity: 0.9,
  },
  splitCategoryTag: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitCardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  splitCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  splitCardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  splitCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  splitUseNowIndicator: {
    alignSelf: 'flex-start',
  },
  splitUseNowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  splitUseNowText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  splitFlipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${COLORS.textMuted}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card Back
  splitCardBackInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  splitCardBackContent: {
    alignItems: 'center',
  },
  splitCardBackIcon: {
    marginBottom: 12,
  },
  splitCardBackTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  splitCardBackDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
  splitCardBackButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  splitCardBackButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  splitCardBackButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Skeleton
  skeletonBase: {
    backgroundColor: '#e8ecf0',
    overflow: 'hidden',
    borderRadius: 12,
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '60%',
  },
  skeletonGradient: {
    flex: 1,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    flex: 1,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  exploreButton: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  exploreButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exploreButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  modalScrollContent: {
    paddingBottom: 30,
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },
  modalHeaderGradient: {
    paddingVertical: 30,
    marginHorizontal: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPercentageCircle: {
    alignItems: 'center',
  },
  modalPercentageBig: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  modalPercentageOffBig: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  modalTitleSection: {
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  stepsWrapper: {
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  stepsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepsSectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  stepsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 6,
    minHeight: 58,
  },
  stepNumberContainer: {
    alignItems: 'center',
    marginRight: 14,
    width: 28,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  stepLine: {
    width: 1.5,
    flex: 1,
    minHeight: 12,
    backgroundColor: COLORS.borderLight,
    marginTop: 4,
  },
  stepContentBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8f9fb',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  stepContentIcon: {
    marginRight: 12,
    marginTop: 1,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  closeModalButton: {
    marginHorizontal: 22,
    marginTop: 22,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  closeModalGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});