// screens/MyDiscountScreen.js - Fixed Permanent Removal
import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
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
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Camera, CameraView } from 'expo-camera';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Modern Color Palette
const COLORS = {
  primary: '#f9c349',
  primaryDark: '#e8b82a',
  primaryLight: '#fde8b3',
  background: '#f2f4f8',
  cardBg: '#ffffff',
  textPrimary: '#0a0a0a',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  borderLight: 'rgba(0,0,0,0.05)',
  shadow: 'rgba(0,0,0,0.06)',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  cardShadow: 'rgba(249,195,73,0.12)',
  darkOverlay: 'rgba(0,0,0,0.4)',
};

const DISCOUNT_THEMES = {
  10: { icon: 'restaurant-outline', gradient: ['#f9c349', '#f5a623'] },
  15: { icon: 'cafe-outline', gradient: ['#f9c349', '#f5a623'] },
  20: { icon: 'shirt-outline', gradient: ['#f9c349', '#f5a623'] },
  25: { icon: 'cut-outline', gradient: ['#f9c349', '#f5a623'] },
  30: { icon: 'fitness-outline', gradient: ['#f9c349', '#f5a623'] },
  40: { icon: 'diamond-outline', gradient: ['#f9c349', '#f5a623'] },
  50: { icon: 'trophy-outline', gradient: ['#f9c349', '#f5a623'] },
  default: { icon: 'pricetag-outline', gradient: ['#f9c349', '#f5a623'] },
};

const getTheme = (percentage) => DISCOUNT_THEMES[percentage] || DISCOUNT_THEMES.default;

// Global cache for faster loading
let discountsCache = null;
let cacheTimestamp = null;
let cachedUserId = null;
const CACHE_DURATION = 30000; // 30 seconds cache for faster updates

// Track permanently removed offers (by ID) - persists across sessions
let removedOfferIds = new Set();

// ==================== HELPER FUNCTIONS ====================
const generateFallbackCode = (item) => {
  const prefix = item?.brand?.name?.substring(0, 3).toUpperCase() || 'TDC';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

// ==================== STAT CARD ====================
const StatCard = React.memo(({ title, value, icon, gradientColors, delay, isCurrency = false }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animValue, {
        toValue: 1,
        delay,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideValue, {
        toValue: 0,
        delay,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  const formattedValue = isCurrency
    ? `Rs. ${typeof value === 'number' ? value.toFixed(0) : '0'}`
    : typeof value === 'number' ? value.toLocaleString() : value || '0';

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: animValue,
          transform: [{ translateY: slideValue }],
        },
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#fafafa']}
        style={styles.statCardInner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statCardLeft}>
          <View style={[styles.statIconBox, { backgroundColor: `${gradientColors[0]}15` }]}>
            <LinearGradient
              colors={gradientColors}
              style={styles.statIconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={icon} size={18} color="#fff" />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.statValue} numberOfLines={1}>
              {formattedValue}
            </Text>
            <Text style={styles.statLabel}>{title}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

// ==================== PROMO CODE MODAL ====================
const PromoCodeModal = React.memo(({
  visible,
  onClose,
  item,
  promoDetails,
  onCopy,
  onUseCode,
  generating,
  onGenerate,
  onCancel
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const promoCode = useMemo(() => {
    if (promoDetails?.code) return promoDetails.code;
    return item ? generateFallbackCode(item) : '------';
  }, [promoDetails, item]);

  const discountPercentage = useMemo(() => {
    if (promoDetails?.discountPercentage) return promoDetails.discountPercentage;
    return item?.discountPercentage || 10;
  }, [promoDetails, item]);

  const brandName = useMemo(() => {
    if (promoDetails?.brandName) return promoDetails.brandName;
    return item?.brand?.name || 'Brand';
  }, [promoDetails, item]);

  const offerTitle = useMemo(() => {
    if (promoDetails?.offerTitle) return promoDetails.offerTitle;
    return item?.title || 'Special Offer';
  }, [promoDetails, item]);

  const expiresAt = useMemo(() => {
    if (promoDetails?.expiresAt) {
      return new Date(promoDetails.expiresAt);
    }
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }, [promoDetails]);

  const isFromBackend = useMemo(() => {
    return !!(promoDetails?.code && promoDetails?.expiresAt) || promoDetails?.status === 'used' || promoDetails?.status === 'expired';
  }, [promoDetails]);

  useEffect(() => {
    if (visible && promoCode && isFromBackend) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, promoCode, isFromBackend]);

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
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(height);
      backdropAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible]);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(promoCode);
    } else {
      await Clipboard.setStringAsync(promoCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Promo code copied to clipboard');
    }
  };

  const handleUseCode = () => {
    if (onUseCode) {
      onUseCode(promoCode);
    } else {
      Alert.alert(
        'Use Promo Code',
        `Use code "${promoCode}" at ${brandName} checkout to get ${discountPercentage}% OFF!`
      );
    }
  };

  const handleGenerate = () => {
    if (onGenerate && !isFromBackend) {
      onGenerate();
    }
  };

  const handleCancel = () => {
    if (onCancel && isFromBackend) {
      onCancel(promoCode);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.modalHandle}>
            <View style={styles.modalHandleBar} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <LinearGradient
              colors={['#f9c349', '#f5a623']}
              style={styles.promoModalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.promoModalIconContainer}>
                <Ionicons name={isFromBackend ? "ticket-outline" : "sparkles-outline"} size={48} color="#fff" />
              </View>
              <Text style={styles.promoModalTitle}>
                {isFromBackend ? 'Your Promo Code' : 'Get Your Promo Code'}
              </Text>
              <Text style={styles.promoModalSubtitle}>
                {isFromBackend
                  ? `Use this code at ${brandName} checkout to get ${discountPercentage}% OFF`
                  : `Generate a unique promo code for ${offerTitle}`
                }
              </Text>
            </LinearGradient>

            {generating ? (
              <View style={styles.generatingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.generatingText}>Generating your promo code...</Text>
              </View>
            ) : promoDetails?.status === 'used' ? (
              <View style={[styles.promoCodeDisplay, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <Text style={[styles.promoCodeDisplayText, { color: '#166534', letterSpacing: 1 }]}>CODE USED</Text>
                <View style={styles.promoCodeCopyButton}>
                  <LinearGradient colors={['rgba(16,185,129,0.9)', 'rgba(5,150,105,0.9)']} style={styles.promoCodeCopyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                    <Text style={styles.promoCodeCopyText}>Used</Text>
                  </LinearGradient>
                </View>
              </View>
            ) : promoDetails?.status === 'expired' ? (
              <View style={[styles.promoCodeDisplay, { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' }]}>
                <Text style={[styles.promoCodeDisplayText, { color: '#4b5563', letterSpacing: 1 }]}>EXPIRED</Text>
                <View style={styles.promoCodeCopyButton}>
                  <LinearGradient colors={['rgba(156,163,175,0.9)', 'rgba(107,114,128,0.9)']} style={styles.promoCodeCopyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="time" size={20} color="#fff" />
                    <Text style={styles.promoCodeCopyText}>Expired</Text>
                  </LinearGradient>
                </View>
              </View>
            ) : (
              <>
                {isFromBackend ? (
                  <View style={styles.promoCodeDisplay}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }], flex: 1 }}>
                      <Text style={styles.promoCodeDisplayText}>{promoCode}</Text>
                    </Animated.View>
                    <TouchableOpacity
                      style={styles.promoCodeCopyButton}
                      onPress={handleCopy}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#f9c349', '#f5a623']}
                        style={styles.promoCodeCopyGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="copy-outline" size={20} color="#fff" />
                        <Text style={styles.promoCodeCopyText}>Copy</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.generatePromoButton}
                    onPress={handleGenerate}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#f9c349', '#f5a623']}
                      style={styles.generatePromoGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="sparkles-outline" size={24} color="#fff" />
                      <Text style={styles.generatePromoText}>Generate Promo Code</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {isFromBackend && expiresAt && (
                  <View style={styles.expiryContainer}>
                    <Ionicons name="time-outline" size={16} color={COLORS.warning} />
                    <Text style={styles.expiryText}>
                      Expires: {formatDate(expiresAt)}
                    </Text>
                  </View>
                )}

                {isFromBackend && (
                  <TouchableOpacity
                    style={styles.cancelPromoButton}
                    onPress={handleCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelPromoText}>Cancel Promo Code</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <View style={styles.promoDetails}>
              <Text style={styles.promoDetailsTitle}>How to use:</Text>
              <View style={styles.promoStep}>
                <View style={styles.promoStepNumber}>
                  <Text style={styles.promoStepNumberText}>1</Text>
                </View>
                <Text style={styles.promoStepText}>
                  {isFromBackend ? 'Copy the promo code above' : 'Tap "Generate Promo Code" to get your code'}
                </Text>
              </View>
              <View style={styles.promoStep}>
                <View style={styles.promoStepNumber}>
                  <Text style={styles.promoStepNumberText}>2</Text>
                </View>
                <Text style={styles.promoStepText}>Go to {brandName} website/app</Text>
              </View>
              <View style={styles.promoStep}>
                <View style={styles.promoStepNumber}>
                  <Text style={styles.promoStepNumberText}>3</Text>
                </View>
                <Text style={styles.promoStepText}>Enter code at checkout</Text>
              </View>
              <View style={styles.promoStep}>
                <View style={styles.promoStepNumber}>
                  <Text style={styles.promoStepNumberText}>4</Text>
                </View>
                <Text style={styles.promoStepText}>Get {discountPercentage}% discount instantly!</Text>
              </View>
            </View>

            {isFromBackend && promoDetails?.status === 'active' && (
              <TouchableOpacity
                style={styles.useCodeButton}
                onPress={handleUseCode}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#1a1a1a', '#2d2d2d']}
                  style={styles.useCodeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.useCodeText}>Use This Code</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.primary}
                    style={{ marginLeft: 8 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#f0f0f0', '#e0e0e0']}
                style={styles.closeModalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.closeModalText}>Close</Text>
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={COLORS.textMuted}
                  style={{ marginLeft: 8 }}
                />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
});

// ==================== DISCOUNT CARD ====================
const DiscountCard = React.memo(({
  item,
  index,
  onUseNow,
  onScan,
  onUnclaim,
  onGetCode,
}) => {
  const entry = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  const percentage = item?.discountPercentage || 10;
  const theme = getTheme(percentage);

  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [redemptionsToday, setRedemptionsToday] = useState(item?.redemptionsToday || 0);
  const [maxRedemptions] = useState(2);
  const [hasActivePromo, setHasActivePromo] = useState(item?.hasActivePromo || false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entry, {
        toValue: 1,
        delay: Math.min(index * 40, 200),
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay: Math.min(index * 40, 200),
        friction: 5,
        tension: 35,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  useEffect(() => {
    setRedemptionsToday(item?.redemptionsToday || 0);
    setHasActivePromo(item?.hasActivePromo || false);
  }, [item]);

  const handleCardPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsFlipped(!isFlipped);
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleScanPress = (e) => {
    e?.stopPropagation?.();
    if (!canRedeem) {
      Alert.alert('Limit Reached', 'You have already used this discount 2 times today. Please try again tomorrow.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onScan(item);
  };

  const handleGetCodePress = (e) => {
    e?.stopPropagation?.();
    if (!canRedeem) {
      Alert.alert('Limit Reached', 'You have already used this discount 2 times today. Please try again tomorrow.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onGetCode(item);
  };

  const translateY = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0],
  });

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const canRedeem = redemptionsToday < maxRedemptions;

  const handleUnclaim = () => {
    Alert.alert(
      'Remove Discount',
      `Are you sure you want to remove "${item?.title}" from your discounts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onUnclaim(item);
          }
        }
      ]
    );
  };

  const getDiscountDescription = () => {
    if (item?.isOnline) {
      return hasActivePromo
        ? '✅ Promo code ready!'
        : `Use code at ${item?.brand?.name || 'brand'} checkout`;
    }
    if (item?.isInStore) {
      return 'Show this card in-store to redeem';
    }
    return item?.description || 'Tap to view details';
  };

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: entry,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleCardPress}
        style={styles.cardTouchable}
      >
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ rotateY: frontInterpolate }],
              backfaceVisibility: 'hidden',
            },
          ]}
        >
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            style={styles.cardInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardImageContainer}>
              {item?.displayImage ? (
                <Image
                  source={{ uri: item.displayImage }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={['#f0f0f0', '#e8e8e8']}
                  style={styles.cardPlaceholder}
                >
                  <Ionicons name={theme.icon} size={32} color={`${COLORS.primary}30`} />
                </LinearGradient>
              )}
              <LinearGradient
                colors={['transparent', COLORS.darkOverlay]}
                style={styles.cardImageOverlay}
              />

              <LinearGradient
                colors={theme.gradient}
                style={styles.cardPercentBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.cardPercentText}>{percentage}%</Text>
                <Text style={styles.cardPercentOff}>OFF</Text>
              </LinearGradient>

              {item?.isInStore && canRedeem && (
                <TouchableOpacity
                  style={styles.scanQrButton}
                  onPress={handleScanPress}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['rgba(249,195,73,0.92)', 'rgba(245,166,35,0.92)']}
                    style={styles.scanQrButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="qr-code-outline" size={20} color="#fff" />
                    <Text style={styles.scanQrButtonText}>Scan QR</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {item?.isOnline && canRedeem && (
                <TouchableOpacity
                  style={[
                    styles.scanQrButton,
                    item.promoStatus === 'active' && styles.promoReadyButton
                  ]}
                  onPress={handleGetCodePress}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={item.promoStatus === 'active'
                      ? ['rgba(16,185,129,0.92)', 'rgba(5,150,105,0.92)']
                      : ['rgba(249,195,73,0.92)', 'rgba(245,166,35,0.92)']
                    }
                    style={styles.scanQrButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons
                      name={item.promoStatus === 'active' ? "checkmark-circle" : "code-outline"}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.scanQrButtonText}>
                      {item.promoStatus === 'active' ? 'View Code' : 'Get Code'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View style={styles.redemptionInfo}>
                <Text style={styles.redemptionText}>
                  {redemptionsToday}/{maxRedemptions} used today
                </Text>
                {!canRedeem && (
                  <Text style={styles.redemptionLimitText}>Limit reached</Text>
                )}
              </View>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.cardCategory}>
                  <Ionicons name={theme.icon} size={12} color={COLORS.primary} />
                  <Text style={styles.cardCategoryText}>
                    {item?.isOnline ? 'Online' : item?.isInStore ? 'In-Store' : 'Offer'}
                  </Text>
                </View>
                <View style={styles.cardFlipIndicator}>
                  <Ionicons name="sync-outline" size={14} color={COLORS.textMuted} />
                </View>
              </View>

              <Text numberOfLines={1} style={styles.cardTitle}>
                {item?.title || 'Special Offer'}
              </Text>
              <Text numberOfLines={1} style={styles.cardDescription}>
                {getDiscountDescription()}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.cardTapHint}>
                  <Ionicons name="finger-print-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.cardTapHintText}>Tap to flip</Text>
                </View>
                {item?.brand?.name && (
                  <Text style={styles.cardBrandName}>{item.brand.name}</Text>
                )}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
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
            style={styles.cardBackInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardBackContent}>
              <Text style={styles.cardBackTitle}>Ready to Save!</Text>
              <Text style={styles.cardBackDescription}>
                {canRedeem ? 'Choose your redemption method' : 'Limit reached for today'}
              </Text>

              <View style={styles.cardBackActions}>
                <TouchableOpacity
                  style={[styles.cardBackButton, !canRedeem && styles.cardBackButtonDisabled]}
                  onPress={() => {
                    if (!canRedeem) {
                      Alert.alert('Limit Reached', 'You have already used this discount 2 times today. Please try again tomorrow.');
                      return;
                    }
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onUseNow(item);
                  }}
                  activeOpacity={0.8}
                  disabled={!canRedeem}
                >
                  <LinearGradient
                    colors={canRedeem ? ['#ffffff', '#f0f0f0'] : ['#cccccc', '#bbbbbb']}
                    style={styles.cardBackButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.cardBackButtonText, !canRedeem && styles.cardBackButtonTextDisabled]}>
                      {canRedeem ? 'Redeem' : 'Limit Reached'}
                    </Text>
                    {canRedeem && <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />}
                  </LinearGradient>
                </TouchableOpacity>

                {item?.isInStore && canRedeem && (
                  <TouchableOpacity
                    style={styles.cardBackScanButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onScan(item);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                      style={styles.cardBackScanGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="qr-code-outline" size={18} color="#fff" />
                      <Text style={styles.cardBackScanText}>Scan QR</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                {item?.isOnline && canRedeem && (
                  <TouchableOpacity
                    style={[
                      styles.cardBackPromoButton,
                      item.promoStatus === 'active' && styles.promoReadyCardButton
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onGetCode(item);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={item.promoStatus === 'active'
                        ? ['rgba(16,185,129,0.3)', 'rgba(5,150,105,0.2)']
                        : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']
                      }
                      style={styles.cardBackPromoGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons
                        name={item.promoStatus === 'active' ? "checkmark-circle" : "code-outline"}
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.cardBackPromoText}>
                        {item.promoStatus === 'active' ? 'View Code' : 'Get Code'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.unclaimButton}
                onPress={handleUnclaim}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                  style={styles.unclaimButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="trash-outline" size={14} color="#fff" />
                  <Text style={styles.unclaimButtonText}>Remove Discount</Text>
                </LinearGradient>
              </TouchableOpacity>

              {!canRedeem && (
                <Text style={styles.limitMessage}>⏰ Try again tomorrow</Text>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return prevProps.item._id === nextProps.item._id &&
    prevProps.item.redemptionsToday === nextProps.item.redemptionsToday &&
    prevProps.item.hasActivePromo === nextProps.item.hasActivePromo &&
    prevProps.item.promoStatus === nextProps.item.promoStatus &&
    prevProps.item.isClaimed === nextProps.item.isClaimed;
});

// ==================== QR SCANNER MODAL ====================
const QRScannerModal = React.memo(({ visible, onClose, onScanComplete, offer }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const { user, token } = useContext(AuthContext);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const getCameraPermissions = async () => {
      if (visible) {
        try {
          const { status } = await Camera.requestCameraPermissionsAsync();
          if (isMounted.current) {
            setHasPermission(status === 'granted');
          }
        } catch (error) {
          console.error('Camera permission error:', error);
          if (isMounted.current) {
            setHasPermission(false);
          }
        }
      }
    };

    if (visible) {
      getCameraPermissions();
      setScanned(false);
      setLoading(false);
    }

    return () => {
      isMounted.current = false;
    };
  }, [visible]);

  const handleBarCodeScanned = useCallback(async ({ type, data }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);

    try {
      const parsedData = JSON.parse(data);

      if (parsedData.offerId === offer?._id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
          const canScanRes = await api.get(`/offers/can-scan/${offer._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!canScanRes.data.canScan) {
            Alert.alert(
              'Limit Reached',
              `You have already used this discount ${canScanRes.data.redemptionsUsed} times today. Maximum 2 times per day.`,
              [{ text: 'OK', onPress: () => { setScanned(false); setLoading(false); } }]
            );
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error checking scan limit:', err);
          setLoading(false);
          setScanned(false);
          return;
        }

        const studentData = {
          studentId: user?._id,
          name: user?.name,
          rollNo: user?.rollNo,
          university: user?.university,
          email: user?.email,
          offerId: offer?._id,
          offerTitle: offer?.title,
          discountPercentage: offer?.discountPercentage,
          brandId: parsedData.brandId,
          brandName: parsedData.brandName,
          scannedAt: new Date().toISOString()
        };

        try {
          const response = await api.post('/offers/scan-verify', studentData, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.success) {
            Alert.alert(
              'QR Verified! 🎉',
              `Student verified successfully. Please proceed with payment.`,
              [
                {
                  text: 'Continue',
                  onPress: () => {
                    onScanComplete({
                      ...parsedData,
                      student: studentData,
                      verified: true,
                      verificationData: response.data
                    });
                    onClose();
                    setLoading(false);
                    setScanned(false);
                  }
                }
              ]
            );
          } else {
            Alert.alert(
              'Verification Failed',
              response.data.message || 'Student verification failed. Please try again.',
              [
                {
                  text: 'Try Again',
                  onPress: () => {
                    setScanned(false);
                    setLoading(false);
                  }
                }
              ]
            );
            setLoading(false);
          }
        } catch (apiError) {
          console.error('API Error:', apiError);
          Alert.alert(
            'Error',
            apiError.response?.data?.message || 'Failed to verify student. Please try again.',
            [
              {
                text: 'Try Again',
                onPress: () => {
                  setScanned(false);
                  setLoading(false);
                }
              }
            ]
          );
          setLoading(false);
        }
      } else {
        Alert.alert(
          'Invalid QR Code',
          'This QR code does not match the selected offer. Please scan the correct QR code.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setScanned(false);
                setLoading(false);
              }
            }
          ]
        );
        setLoading(false);
      }
    } catch (err) {
      Alert.alert(
        'Error',
        'Invalid QR code format. Please scan a valid QR code.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setLoading(false);
            }
          }
        ]
      );
      setLoading(false);
    }
  }, [scanned, loading, offer, user, token, onScanComplete, onClose]);

  const toggleTorch = () => {
    setTorchOn(!torchOn);
  };

  if (hasPermission === null) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.scannerModalContainer}>
          <View style={styles.scannerModalContent}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerHeaderTitle}>Scan QR Code</Text>
              <TouchableOpacity onPress={onClose} style={styles.scannerCloseBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.scannerPermissionContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.scannerPermissionText}>Requesting camera permission...</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.scannerModalContainer}>
          <View style={styles.scannerModalContent}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerHeaderTitle}>Scan QR Code</Text>
              <TouchableOpacity onPress={onClose} style={styles.scannerCloseBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.scannerPermissionContainer}>
              <Ionicons name="camera-off" size={48} color="#fff" />
              <Text style={styles.scannerPermissionText}>Camera access denied</Text>
              <Text style={styles.scannerPermissionSubtext}>
                Please enable camera access in your device settings to scan QR codes.
              </Text>
              <TouchableOpacity
                style={styles.scannerPermissionButton}
                onPress={onClose}
              >
                <Text style={styles.scannerPermissionButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.scannerModalContainer}>
        <View style={styles.scannerModalContent}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerHeaderTitle}>Scan QR Code</Text>
            <View style={styles.scannerHeaderActions}>
              <TouchableOpacity onPress={toggleTorch} style={styles.scannerTorchBtn}>
                <Ionicons
                  name={torchOn ? "flashlight" : "flashlight-outline"}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.scannerCloseBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {offer && (
            <View style={styles.scannerOfferInfo}>
              <Text style={styles.scannerOfferTitle}>{offer.title}</Text>
              <Text style={styles.scannerOfferDiscount}>{offer.discountPercentage}% OFF</Text>
              <Text style={styles.scannerOfferHint}>Scan the QR code displayed at the brand store</Text>
            </View>
          )}

          <View style={styles.scannerWrapper}>
            <CameraView
              style={styles.scannerCamera}
              facing="back"
              enableTorch={torchOn}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame}>
                  <View style={styles.scannerCornerTL} />
                  <View style={styles.scannerCornerTR} />
                  <View style={styles.scannerCornerBL} />
                  <View style={styles.scannerCornerBR} />
                </View>
              </View>

              <View style={styles.scannerInstructionContainer}>
                <Text style={styles.scannerInstruction}>
                  Place QR code in the frame
                </Text>
              </View>

              <View style={styles.scannerBottomContent}>
                {loading && (
                  <ActivityIndicator size="large" color={COLORS.primary} />
                )}
                {scanned && !loading && (
                  <TouchableOpacity
                    style={styles.scannerRetryBtn}
                    onPress={() => setScanned(false)}
                  >
                    <Text style={styles.scannerRetryText}>Scan Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            </CameraView>
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerFooterText}>
              Make sure the QR code is well lit and centered
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ==================== USE NOW MODAL ====================
const UseNowModal = React.memo(({ visible, onClose, item }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const percentage = item?.discountPercentage || 10;
  const theme = getTheme(percentage);

  const steps = [
    {
      icon: item?.isOnline ? 'globe-outline' : 'storefront-outline',
      title: item?.isOnline ? 'Visit Website' : 'Visit the Store',
      description: item?.isOnline ? `Go to ${item?.brand?.name || 'brand'} website` : 'Visit the participating brand or store',
    },
    {
      icon: 'id-card-outline',
      title: 'Scan QR Code',
      description: 'Ask the staff to scan your TDC QR code to verify your discount.',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Verification',
      description: 'Staff will verify your eligibility',
    },
    {
      icon: 'checkmark-circle-outline',
      title: 'Redeem & Save',
      description: 'Discount will be applied to your purchase',
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
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(height);
      backdropAnim.setValue(0);
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
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.modalHandle}>
            <View style={styles.modalHandleBar} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
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
                  <Ionicons name={theme.icon} size={28} color="#fff" />
                </View>
                <View style={styles.modalPercentageCircle}>
                  <Text style={styles.modalPercentageBig}>{percentage}%</Text>
                  <Text style={styles.modalPercentageOffBig}>OFF</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.modalTitleSection}>
              <Text style={styles.modalTitle}>{item?.title || 'Special Offer'}</Text>
              <Text style={styles.modalSubtitle}>
                {item?.isOnline ? '💻 Online Discount' : item?.isInStore ? '🏪 In-Store Discount' : ''}
              </Text>
              <Text style={[styles.modalSubtitle, { marginTop: 4 }]}>
                {item?.description || 'Redeem your discount today!'}
              </Text>
              {item?.brand?.name && (
                <Text style={styles.modalBrandName}>By {item.brand.name}</Text>
              )}
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
                      <Ionicons name={step.icon} size={16} color={COLORS.primary} />
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
});

// ==================== LOADING OVERLAY ====================
const LoadingOverlay = ({ visible, message }) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(loadingProgress, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadingScaleX = loadingProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 1],
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.loadingOverlay, { opacity: overlayOpacity }]}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>{message || "Loading discounts..."}</Text>
        <View style={styles.loadingProgressContainer}>
          <Animated.View
            style={[
              styles.loadingProgressBar,
              { transform: [{ scaleX: loadingScaleX }] }
            ]}
          />
        </View>
        <View style={styles.loadingDots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.loadingDot} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

// ==================== EMPTY STATE ====================
const EmptyState = React.memo(({ navigation }) => {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.emptyState,
        { opacity, transform: [{ scale }] },
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={['#fff', '#f8f8f8']}
          style={styles.emptyIconGradient}
        >
          <MaterialCommunityIcons
            name="ticket-percent-outline"
            size={56}
            color={COLORS.primary}
          />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>No Discounts Yet</Text>
      <Text style={styles.emptyDescription}>
        Explore partner offers and claim{'\n'}amazing student discounts!
      </Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate('Brands');
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
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ==================== MAIN SCREEN ====================
export default function MyDiscountScreen() {
  const navigation = useNavigation();
  const { token, user } = useContext(AuthContext);
  const [claimedOffers, setClaimedOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSaved, setTotalSaved] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanningOffer, setScanningOffer] = useState(null);
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [promoOffer, setPromoOffer] = useState(null);
  const [promoDetails, setPromoDetails] = useState(null);
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  const loadTimeoutRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // Track removed IDs for this session
  const removedIdsRef = useRef(new Set());

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => {
      isMounted.current = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  // ==================== LOAD DISCOUNTS ====================
  const loadDiscounts = useCallback(async (isRefresh = false) => {
    if (!token || !user) {
      if (isMounted.current) {
        setLoading(false);
        setInitialLoading(false);
        setClaimedOffers([]);
        setTotalSaved(0);
      }
      return;
    }

    // Use cache for non-refresh loads
    if (!isRefresh && discountsCache && cacheTimestamp &&
      (Date.now() - cacheTimestamp) < CACHE_DURATION &&
      cachedUserId === user?._id) {
      if (isMounted.current) {
        // Filter out removed offers from cache
        const filteredOffers = discountsCache.offers.filter(
          offer => !removedIdsRef.current.has(offer._id)
        );
        setClaimedOffers(filteredOffers);
        setTotalSaved(discountsCache.totalSaved);
        setLoading(false);
        setInitialLoading(false);
      }
      return;
    }

    try {
      const [offersRes, savingsRes] = await Promise.all([
        api.get('/offers/claimed', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000
        }),
        api.get('/offers/my-total-savings', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }).catch(() => ({ data: { totalSaved: 0 } }))
      ]);

      let promoCodes = [];
      try {
        const promoRes = await api.get('/promo-codes/my-codes', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        });
        promoCodes = promoRes.data.promoCodes || [];
      } catch (err) {
        console.log('Promo codes fetch error, using cached:', err?.message);
      }

      const offersWithImages = offersRes.data
        .filter((offer) => {
          // Skip offers that have been permanently removed
          return !removedIdsRef.current.has(offer._id);
        })
        .map((offer) => {
          let offerPromo = promoCodes.find(
            p => p.offer?._id?.toString() === offer._id?.toString()
          );

          // If no promo found in fresh data, check cache
          if (!offerPromo && discountsCache?.offers) {
            const cachedOffer = discountsCache.offers.find(o => o._id?.toString() === offer._id?.toString());
            if (cachedOffer?.activePromoDetails) {
              offerPromo = cachedOffer.activePromoDetails;
            }
          }

          return {
            ...offer,
            displayImage: offer.image
              ? offer.image.startsWith('http')
                ? offer.image
                : `https://the-deft-crew-production.up.railway.app/${offer.image}`
              : null,
            redemptionsToday: offer.redemptionsToday || 0,
            hasActivePromo: offerPromo?.status === 'active',
            promoStatus: offerPromo?.status || null,
            activePromoCode: offerPromo?.code || null,
            activePromoDetails: offerPromo || null,
            isClaimed: true
          };
        });

      if (isMounted.current) {
        setClaimedOffers(offersWithImages);
        const saved = savingsRes.data?.totalSaved || 0;
        setTotalSaved(saved);

        // Update cache
        discountsCache = {
          offers: offersWithImages,
          totalSaved: saved
        };
        cacheTimestamp = Date.now();
        cachedUserId = user?._id;

        setLoading(false);
        setInitialLoading(false);
        setRefreshing(false);
      }

    } catch (err) {
      if (isMounted.current) {
        console.log('Error loading discounts:', err?.message || err);
        if (discountsCache) {
          const filteredOffers = discountsCache.offers.filter(
            offer => !removedIdsRef.current.has(offer._id)
          );
          setClaimedOffers(filteredOffers);
          setTotalSaved(discountsCache.totalSaved);
        } else {
          setClaimedOffers([]);
          setTotalSaved(0);
        }
        setLoading(false);
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [token, user]);

  // ==================== AUTO REFRESH ====================
  const setupAutoRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      if (isMounted.current && token && user) {
        loadDiscounts(true);
        setupAutoRefresh();
      }
    }, 30000);
  }, [token, user, loadDiscounts]);

  // Initial load
  useEffect(() => {
    let isSubscribed = true;

    const performInitialLoad = async () => {
      if (token && user) {
        await loadDiscounts(false);
        setupAutoRefresh();
      } else {
        if (isSubscribed) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    };

    performInitialLoad();

    return () => {
      isSubscribed = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [token, user]);

  useFocusEffect(
    useCallback(() => {
      if (token && user && !initialLoading) {
        loadDiscounts(true);
        setupAutoRefresh();
      }
      return () => {
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }
      };
    }, [token, user, initialLoading, loadDiscounts, setupAutoRefresh])
  );

  // ==================== PROMO CODE FUNCTIONS ====================

  const generatePromoCodeForOffer = useCallback(async (offerId) => {
    if (!token) {
      Alert.alert('Error', 'Please login to generate a promo code');
      return null;
    }

    setGeneratingPromo(true);

    try {
      const response = await api.post(`/promo-codes/generate`,
        { offerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return response.data.promoCode;
      } else {
        throw new Error(response.data.message || 'Failed to generate promo code');
      }
    } catch (err) {
      console.error('Error generating promo code:', err);

      if (err.response?.status === 403) {
        Alert.alert(
          'Claim First',
          'You need to claim this discount first. Would you like to claim it now?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Claim & Generate',
              onPress: async () => {
                try {
                  await api.post(`/offers/claim/${offerId}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  const retryResult = await generatePromoCodeForOffer(offerId);
                  if (retryResult) {
                    return retryResult;
                  }
                } catch (claimErr) {
                  Alert.alert('Error', 'Failed to claim offer. Please try again.');
                }
              }
            }
          ]
        );
        return null;
      }

      const errorMsg = err.response?.data?.message || err.message || 'Failed to generate promo code. Please try again.';
      Alert.alert('Error', errorMsg);
      return null;
    } finally {
      setGeneratingPromo(false);
    }
  }, [token]);

  const copyPromoCode = useCallback(async (code) => {
    try {
      await Clipboard.setStringAsync(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Promo code copied to clipboard');
    } catch (err) {
      Alert.alert('Error', 'Failed to copy promo code');
    }
  }, []);

  const usePromoCode = useCallback((code) => {
    const websiteUrl = promoOffer?.brand?.websiteUrl || promoOffer?.brand?.shopifyStoreUrl;
    const platform = promoOffer?.brand?.platform;
    
    const fallbackAlert = () => {
      Alert.alert(
        'Use Promo Code',
        `Use code "${code}" at checkout to get your discount!`,
        [
          { text: 'Copy Code', onPress: () => copyPromoCode(code) },
          { text: 'OK', style: 'default' }
        ]
      );
    };

    if (websiteUrl) {
      const formattedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
      const isShopify = platform === 'shopify' || formattedUrl.includes('myshopify.com');
      const urlWithCoupon = isShopify
        ? `${formattedUrl.replace(/\/$/, '')}/discount/${code}`
        : `${formattedUrl}?coupon=${code}`;
      
      Linking.openURL(urlWithCoupon).catch((err) => {
        fallbackAlert();
      });
    } else {
      fallbackAlert();
    }
  }, [copyPromoCode, promoOffer]);

  const cancelPromoCode = useCallback(async (code) => {
    Alert.alert(
      'Cancel Promo Code',
      'Are you sure you want to cancel this promo code? This action cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Code',
          style: 'destructive',
          onPress: async () => {
            try {
              const promoCodeDoc = await api.get(`/promo-codes/${code}`, {
                headers: { Authorization: `Bearer ${token}` }
              });

              if (promoCodeDoc.data.success) {
                const codeId = promoCodeDoc.data.promoCode.id;
                await api.post(`/promo-codes/cancel/${codeId}`, {}, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                Alert.alert('Cancelled', 'Promo code has been cancelled successfully.');
                loadDiscounts(true);
                setPromoModalVisible(false);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel promo code. Please try again.');
            }
          }
        }
      ]
    );
  }, [token, loadDiscounts]);

  // ==================== HANDLERS ====================

  const handleUseNow = useCallback((item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedOffer(item);
    setModalVisible(true);
  }, []);

  const handleScan = useCallback((item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanningOffer(item);
    setScannerVisible(true);
  }, []);

  const handleGetCode = useCallback(async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPromoOffer(item);

    if (!item.isOnline) {
      Alert.alert('Not Available', 'This offer is not available online. Please visit the store to redeem.');
      return;
    }

    if (item.promoStatus === 'active') {
      setPromoDetails({
        code: item.activePromoCode,
        discountPercentage: item.discountPercentage,
        brandName: item.brand?.name,
        offerTitle: item.title,
        expiresAt: item.activePromoDetails?.expiresAt,
        status: item.promoStatus,
        isExisting: true
      });
      setPromoModalVisible(true);
      return;
    }

    setPromoDetails(null);
    setPromoModalVisible(true);

    const newPromo = await generatePromoCodeForOffer(item._id);

    if (newPromo) {
      setPromoDetails({
        code: newPromo.code,
        discountPercentage: newPromo.discountPercentage,
        brandName: newPromo.brandName,
        offerTitle: newPromo.offerTitle,
        expiresAt: newPromo.expiresAt,
        isExisting: false
      });
      loadDiscounts(true);
    } else {
      setPromoModalVisible(false);
    }
  }, [generatePromoCodeForOffer, loadDiscounts]);

  const handleScanComplete = useCallback((data) => {
    Alert.alert(
      'QR Verified! 🎉',
      `You've successfully verified the discount at ${data.brandName || scanningOffer?.title}. Your discount has been applied!`,
      [{ text: 'Great!', style: 'default' }]
    );
    loadDiscounts(true);
  }, [scanningOffer, loadDiscounts]);

  const handleUnclaim = useCallback(async (item) => {
    try {
      const response = await api.post(`/offers/unclaim/${item._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.message) {
        // PERMANENTLY mark as removed - add to removed set
        removedIdsRef.current.add(item._id);
        
        // Also update the global set for persistence across sessions
        removedOfferIds.add(item._id);

        // Immediately remove from local state
        setClaimedOffers(prev => prev.filter(o => o._id !== item._id));
        
        // Update cache - filter out the removed offer
        if (discountsCache) {
          discountsCache.offers = discountsCache.offers.filter(o => o._id !== item._id);
        }
        
        Alert.alert('Removed', `${item.title} has been removed from your discounts.`);
      }
    } catch (err) {
      console.error('Error unclaiming offer:', err);
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to remove discount. Please try again.'
      );
    }
  }, [token]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadDiscounts(true);
  }, [loadDiscounts]);

  // Memoized stats
  const stats = useMemo(() => {
    const activeCount = claimedOffers.filter(o => o.isActive !== false).length;
    const onlineCount = claimedOffers.filter(o => o.isOnline).length;
    const inStoreCount = claimedOffers.filter(o => o.isInStore).length;
    const promoCount = claimedOffers.filter(o => o.hasActivePromo).length;
    return { activeCount, onlineCount, inStoreCount, promoCount };
  }, [claimedOffers]);

  if (initialLoading && !discountsCache) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <LoadingOverlay visible={true} message="Loading your discounts..." />
      </SafeAreaView>
    );
  }

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor='#ffffff08' />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Discounts</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{stats.activeCount}</Text>
          <Text style={styles.headerBadgeLabel}>active</Text>
        </View>
      </Animated.View>

      <FlatList
        data={claimedOffers}
        renderItem={({ item, index }) => (
          <DiscountCard
            item={item}
            index={index}
            onUseNow={handleUseNow}
            onScan={handleScan}
            onUnclaim={handleUnclaim}
            onGetCode={handleGetCode}
          />
        )}
        keyExtractor={(item, index) => item._id?.toString() || `discount-${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
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
          <View style={styles.statsContainer}>
            <StatCard
              title="Active Discounts"
              value={stats.activeCount}
              icon="pricetag-outline"
              gradientColors={['#f9c349', '#f5a623']}
              delay={200}
            />
            {stats.onlineCount > 0 && (
              <StatCard
                title="Online Offers"
                value={stats.onlineCount}
                icon="globe-outline"
                gradientColors={['#3b82f6', '#2563eb']}
                delay={300}
              />
            )}
            {stats.promoCount > 0 && (
              <StatCard
                title="Promo Codes Ready"
                value={stats.promoCount}
                icon="code-outline"
                gradientColors={['#10b981', '#059669']}
                delay={400}
              />
            )}
          </View>
        }
        ListEmptyComponent={<EmptyState navigation={navigation} />}
      />

      <UseNowModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        item={selectedOffer}
      />

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => {
          setScannerVisible(false);
          setScanningOffer(null);
        }}
        onScanComplete={handleScanComplete}
        offer={scanningOffer}
      />

      <PromoCodeModal
        visible={promoModalVisible}
        onClose={() => {
          setPromoModalVisible(false);
          setPromoOffer(null);
          setPromoDetails(null);
          setGeneratingPromo(false);
        }}
        item={promoOffer}
        promoDetails={promoDetails}
        onCopy={copyPromoCode}
        onUseCode={usePromoCode}
        generating={generatingPromo}
        onGenerate={() => {
          if (promoOffer) {
            generatePromoCodeForOffer(promoOffer._id).then((newPromo) => {
              if (newPromo) {
                setPromoDetails({
                  code: newPromo.code,
                  discountPercentage: newPromo.discountPercentage,
                  brandName: newPromo.brandName,
                  offerTitle: newPromo.offerTitle,
                  expiresAt: newPromo.expiresAt,
                  isExisting: false
                });
                loadDiscounts(true);
              }
            });
          }
        }}
        onCancel={cancelPromoCode}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 10,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerBadgeLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardInner: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
  },
  statCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statIconGradient: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardWrapper: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTouchable: {
    flex: 1,
    height: 130,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 130,
    backgroundColor: '#fff',
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardInner: {
    flexDirection: 'row',
    height: 130,
  },
  cardImageContainer: {
    width: '38%',
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  cardPercentBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardPercentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  cardPercentOff: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '700',
    opacity: 0.9,
  },
  scanQrButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -45 }, { translateY: -18 }],
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  promoReadyButton: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  scanQrButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanQrButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  redemptionInfo: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  redemptionText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  redemptionLimitText: {
    fontSize: 8,
    color: '#ff6b6b',
    fontWeight: '700',
    marginTop: 1,
  },
  limitMessage: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    opacity: 0.9,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  cardCategoryText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardFlipIndicator: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: `${COLORS.textMuted}08`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.textMuted}06`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cardTapHintText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  cardBrandName: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  cardBackInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cardBackContent: {
    alignItems: 'center',
    width: '100%',
  },
  cardBackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 1,
  },
  cardBackDescription: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardBackActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  cardBackButton: {
    borderRadius: 10,
    overflow: 'hidden',
    flex: 1,
    minWidth: 70,
  },
  cardBackButtonDisabled: {
    opacity: 0.6,
  },
  cardBackButtonGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardBackButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardBackButtonTextDisabled: {
    color: '#888',
  },
  cardBackScanButton: {
    borderRadius: 10,
    overflow: 'hidden',
    flex: 1,
    minWidth: 80,
  },
  cardBackScanGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardBackScanText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cardBackPromoButton: {
    borderRadius: 10,
    overflow: 'hidden',
    flex: 1,
    minWidth: 80,
  },
  promoReadyCardButton: {
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  cardBackPromoGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardBackPromoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  unclaimButton: {
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 180,
  },
  unclaimButtonGradient: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  unclaimButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    flex: 1,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  exploreButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  exploreButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exploreButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  modalScrollContent: {
    paddingBottom: 30,
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  modalHandleBar: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },
  modalHeaderGradient: {
    paddingVertical: 24,
    marginHorizontal: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPercentageCircle: {
    alignItems: 'center',
  },
  modalPercentageBig: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  modalPercentageOffBig: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  modalTitleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  modalBrandName: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  stepsWrapper: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  stepsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepsSectionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 8,
  },
  stepsHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 4,
    minHeight: 50,
  },
  stepNumberContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  stepLine: {
    width: 1.5,
    flex: 1,
    minHeight: 10,
    backgroundColor: COLORS.borderLight,
    marginTop: 3,
  },
  stepContentBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  stepContentIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 1,
  },
  stepDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  promoModalHeader: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  promoModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  promoModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  promoModalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  promoCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -20,
  },
  promoCodeDisplayText: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    textAlign: 'center',
    letterSpacing: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  promoCodeCopyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  promoCodeCopyGradient: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoCodeCopyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  generatingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  generatePromoButton: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  generatePromoGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  generatePromoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  expiryText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '600',
    marginLeft: 6,
  },
  cancelPromoButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelPromoText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  useCodeButton: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  useCodeGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  useCodeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  closeModalButton: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  closeModalGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  promoDetails: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  promoDetailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  promoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  promoStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promoStepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  promoStepText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  scannerModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerModalContent: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  scannerHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  scannerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scannerTorchBtn: {
    padding: 4,
  },
  scannerCloseBtn: {
    padding: 4,
  },
  scannerOfferInfo: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  scannerOfferTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scannerOfferDiscount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  scannerOfferHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  scannerWrapper: {
    flex: 1,
    position: 'relative',
  },
  scannerCamera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scannerCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
  },
  scannerCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
  },
  scannerCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
  },
  scannerCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
  },
  scannerInstructionContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  scannerInstruction: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    marginHorizontal: 30,
  },
  scannerBottomContent: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  scannerRetryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    pointerEvents: 'auto',
  },
  scannerRetryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scannerFooter: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
  },
  scannerFooterText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  scannerPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  scannerPermissionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  scannerPermissionSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  scannerPermissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  scannerPermissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  loadingText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  loadingProgressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  loadingProgressBar: {
    height: '100%',
    borderRadius: 2,
    transform: [{ scaleX: 0 }],
    width: '100%',
    backgroundColor: '#f9c349',
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f9c349',
    marginHorizontal: 3,
    opacity: 0.5,
  },
});