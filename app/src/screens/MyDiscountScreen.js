// screens/MyDiscountScreen.js - User-Scoped Cache (Same-Device Multi-User Safe) + TDC Sound Kit
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
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { color as T, font as F, MAX_FONT_SCALE } from '../theme/tokens';
import { SheetHandle } from '../ui/Sheet';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Camera, CameraView } from 'expo-camera';
import axios from 'axios';
import api, {
  notifyOfferUnclaimed,
  notifyOfferClaimed,
  onCacheEvent,
} from '../api/brandApi';

import { AuthContext } from '../context/AuthContext';

// ═══════════════════════════════════════════
// TDC SOUND KIT
// ═══════════════════════════════════════════
import {
  soundCopy,
  soundDealClaimed,
  soundSuccess,
  soundError,
  soundNope,
  soundTap,
  soundConfirm,
  soundSwipe,
  soundRefresh,
  soundQrScanSuccess,
  soundBadgeUnlock,
  soundPopupOpen,
  soundPopupClose,
  soundSheetUp,
  soundSheetDown,
} from '../lib/tdcSounds';

// ✅ IMPORT shared claim registry from OfferScreen
import {
  registerLocalClaim,
  unregisterLocalClaim,
  hydrateClaimedRegistry,
  isLocallyClaimed,
  replaceClaimedIds,
} from './OfferScreen';
import CityDropdown from '../components/CityDropdown';
import {
  ALL_CITIES,
  useSelectedCity,
  offerMatchesCity,
  buildCityOptions,
  getOfferCities,
  resolveCity,
} from '../utils/cityFilter';
import Dot from '../engagement/components/Dot';

const SERVER_URL = 'https://the-deft-crew-production.up.railway.app';

// Offer image → full URL (was pointing at /api/<path>, which 404s)
const offerImageUrl = (img) => {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  return `${SERVER_URL}/${img.replace(/^\/+/, '')}`;
};

const { width, height } = Dimensions.get('window');

// Design system: no gradients. Same <LinearGradient colors=…> call sites, drawn as one
// flat token colour picked from the first stop.
const FLAT = {
  '#f9c349': T.yellow,
  '#1a1a1a': T.ink,
  '#ffffff': T.card,
  '#fff': T.card,
  '#f0f0f0': T.sand,
  '#cccccc': T.sand,
  'rgba(16,185,129,0.9)': T.success,
  'rgba(156,163,175,0.9)': T.textFaint,
  'rgba(249,195,73,0.92)': T.yellow,
  'rgba(16,185,129,0.92)': T.card,
  'rgba(16,185,129,0.3)': 'rgba(17,17,17,0.10)',
  'rgba(255,255,255,0.2)': 'rgba(17,17,17,0.08)',
  'rgba(255,255,255,0.15)': 'rgba(17,17,17,0.08)',
  transparent: 'transparent',
};
const LinearGradient = ({ colors = [], style, children }) => (
  <View style={[{ backgroundColor: FLAT[String(colors[0])] ?? colors[0] }, style]}>{children}</View>
);

// Modern Color Palette
const COLORS = {
  primary: T.yellow,
  primaryDark: T.ink,
  primaryLight: T.yellowSoft,
  background: T.paper,
  cardBg: T.card,
  textPrimary: T.ink,
  textSecondary: T.textMuted,
  textMuted: T.textFaint,
  borderLight: T.line,
  shadow: 'rgba(17,17,17,0.06)',
  success: T.success,
  danger: T.danger,
  warning: T.textMuted,
  cardShadow: 'rgba(17,17,17,0.06)',
  darkOverlay: 'transparent',
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

// ==================== ✅ USER-SCOPED CACHE ====================
const userCaches = new Map();

// "Just removed" IDs hide an offer only until the server catches up.
// Before, this was a plain Set that never expired, so an offer you removed
// and claimed again never came back in My Discounts.
const REMOVED_HIDE_MS = 20000;
class TimedSet {
  constructor() { this.map = new Map(); }
  add(id) { if (id) this.map.set(String(id), Date.now()); return this; }
  delete(id) { return this.map.delete(String(id)); }
  has(id) {
    const t = this.map.get(String(id));
    if (!t) return false;
    if (Date.now() - t > REMOVED_HIDE_MS) { this.map.delete(String(id)); return false; }
    return true;
  }
  clear() { this.map.clear(); }
}

const CACHE_DURATION = 15000;

const getUserCache = (userId) => {
  if (!userId) return null;
  if (!userCaches.has(userId)) {
    userCaches.set(userId, {
      offers: null,
      totalSaved: 0,
      timestamp: null,
      removedIds: new TimedSet(),
      inFlight: null,
    });
  }
  return userCaches.get(userId);
};

const clearUserCache = (userId) => {
  if (userId) userCaches.delete(userId);
};

// ==================== HELPER FUNCTIONS ====================
const generateFallbackCode = (item) => {
  const prefix = item?.brand?.name?.substring(0, 3).toUpperCase() || 'TDC';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

const getBrandIdFromOffer = (item) => {
  if (!item) return null;
  const b = item.brand;
  if (!b) return item.brandId || null;
  if (typeof b === 'string') return b;
  return b._id || b.id || null;
};

const isCanceledError = (error) => {
  if (!error) return false;
  if (axios.isCancel?.(error)) return true;
  if (error.code === 'ERR_CANCELED') return true;
  if (error.code === 'ECONNABORTED') return true;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('canceled') || msg.includes('cancelled') || msg.includes('aborted');
};

// ==================== STAT CARD ====================
const StatCard = React.memo(({ title, value, icon, gradientColors, delay, isCurrency = false }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animValue, {
        toValue: 1, delay, duration: 300,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.spring(slideValue, {
        toValue: 0, delay, friction: 6, tension: 40, useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  const formattedValue = isCurrency
    ? `rs ${typeof value === 'number' ? value.toFixed(0) : '0'}`
    : typeof value === 'number' ? value.toLocaleString() : value || '0';

  return (
    <Animated.View style={[styles.statCard, { opacity: animValue, transform: [{ translateY: slideValue }] }]}>
      <LinearGradient colors={['#ffffff', '#fafafa']} style={styles.statCardInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.statCardLeft}>
          <View style={[styles.statIconBox, { backgroundColor: `${gradientColors[0]}15` }]}>
            <LinearGradient colors={[T.sand]} style={styles.statIconGradient}>
              <Ionicons name={icon} size={18} color={T.ink} />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.statValue} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formattedValue}</Text>
            <Text style={styles.statLabel}>{title}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

// ==================== PROMO CODE MODAL ====================
const PromoCodeModal = React.memo(({
  visible, onClose, item, promoDetails, onCopy, onUseCode, generating, onGenerate, onCancel
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
    if (promoDetails?.expiresAt) return new Date(promoDetails.expiresAt);
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }, [promoDetails]);

  const isFromBackend = useMemo(() => {
    return !!(promoDetails?.code && promoDetails?.expiresAt) || promoDetails?.status === 'used' || promoDetails?.status === 'expired';
  }, [promoDetails]);

  useEffect(() => {
    if (visible && promoCode && isFromBackend) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible, promoCode, isFromBackend]);

  useEffect(() => {
    if (visible) {
      // 🔔 popup open sound
      soundPopupOpen();
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(height);
      backdropAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible]);

  const handleCopy = async () => {
    // 🔔 copy sound
    soundCopy();
    if (onCopy) onCopy(promoCode);
    else {
      await Clipboard.setStringAsync(promoCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Promo code copied to clipboard');
    }
  };

  const handleUseCode = () => {
    soundTap();
    if (onUseCode) onUseCode(promoCode);
  };

  const handleGenerate = () => {
    soundTap();
    if (onGenerate && !isFromBackend) onGenerate();
  };

  const handleCancel = () => {
    soundConfirm();
    if (onCancel && isFromBackend) onCancel(promoCode);
  };

  const formatDate = (date) => date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
          <SheetHandle />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            <LinearGradient colors={[T.yellowSoft]} style={styles.promoModalHeader}>
              <View style={styles.promoModalIconContainer}>
                <Ionicons name={isFromBackend ? "ticket-outline" : "sparkles-outline"} size={32} color={T.ink} />
              </View>
              <Text style={styles.promoModalTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {isFromBackend ? 'your promo code' : 'get your promo code'}
                <Text style={{ color: T.ink }}>.</Text>
              </Text>
              <Text style={styles.promoModalSubtitle}>
                {isFromBackend
                  ? `use this code at ${brandName} checkout to get ${discountPercentage}% off.`
                  : `generate a unique promo code for ${offerTitle}.`}
              </Text>
            </LinearGradient>

            {generating ? (
              <View style={styles.generatingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.generatingText}>generating your promo code…</Text>
              </View>
            ) : promoDetails?.status === 'used' ? (
              <View style={[styles.promoCodeDisplay, { backgroundColor: T.successBg, borderColor: T.successBg }]}>
                <Text style={[styles.promoCodeDisplayText, { color: T.success, letterSpacing: 1 }]}>code used</Text>
                <View style={styles.promoCodeCopyButton}>
                  <LinearGradient colors={['rgba(16,185,129,0.9)', 'rgba(5,150,105,0.9)']} style={styles.promoCodeCopyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                    <Text style={styles.promoCodeCopyText}>used</Text>
                  </LinearGradient>
                </View>
              </View>
            ) : promoDetails?.status === 'expired' ? (
              <View style={[styles.promoCodeDisplay, { backgroundColor: T.sand, borderColor: T.line }]}>
                <Text style={[styles.promoCodeDisplayText, { color: T.textMuted, letterSpacing: 1 }]}>expired</Text>
                <View style={styles.promoCodeCopyButton}>
                  <LinearGradient colors={['rgba(156,163,175,0.9)', 'rgba(107,114,128,0.9)']} style={styles.promoCodeCopyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="time" size={20} color="#fff" />
                    <Text style={styles.promoCodeCopyText}>expired</Text>
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
                    <TouchableOpacity style={styles.promoCodeCopyButton} onPress={handleCopy} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="copy code">
                      <LinearGradient colors={[T.ink]} style={styles.promoCodeCopyGradient}>
                        <Ionicons name="copy-outline" size={20} color="#fff" />
                        <Text style={styles.promoCodeCopyText}>copy</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.generatePromoButton} onPress={handleGenerate} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="generate promo code">
                    <LinearGradient colors={[T.ink]} style={styles.generatePromoGradient}>
                      <Ionicons name="sparkles-outline" size={20} color={T.white} />
                      <Text style={styles.generatePromoText}>generate promo code</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {isFromBackend && expiresAt && (
                  <View style={styles.expiryContainer}>
                    <Ionicons name="time-outline" size={16} color={COLORS.warning} />
                    <Text style={styles.expiryText}>expires {formatDate(expiresAt)}</Text>
                  </View>
                )}

                {isFromBackend && (
                  <TouchableOpacity style={styles.cancelPromoButton} onPress={handleCancel} activeOpacity={0.7}>
                    <Text style={styles.cancelPromoText}>cancel promo code</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <View style={styles.promoDetails}>
              <Text style={styles.promoDetailsTitle}>how to use<Text style={{ color: T.yellow }}>.</Text></Text>
              <View style={styles.promoStep}>
                <View style={styles.promoStepNumber}><Text style={styles.promoStepNumberText}>1</Text></View>
                <Text style={styles.promoStepText}>
                  {isFromBackend ? 'copy the promo code above.' : 'tap "generate promo code" to get your code.'}
                </Text>
              </View>
              <View style={styles.promoStep}>
                <View style={styles.promoStepNumber}><Text style={styles.promoStepNumberText}>2</Text></View>
                <Text style={styles.promoStepText}>go to the {brandName} website or app.</Text>
              </View>
              <View style={styles.promoStep}>
                <View style={styles.promoStepNumber}><Text style={styles.promoStepNumberText}>3</Text></View>
                <Text style={styles.promoStepText}>enter the code at checkout.</Text>
              </View>
              <View style={styles.promoStep}>
                <View style={styles.promoStepNumber}><Text style={styles.promoStepNumberText}>4</Text></View>
                <Text style={styles.promoStepText}>get {discountPercentage}% off. sorted.</Text>
              </View>
            </View>

            {isFromBackend && promoDetails?.status === 'active' && (
              <TouchableOpacity style={styles.useCodeButton} onPress={handleUseCode} activeOpacity={0.85}>
                <LinearGradient colors={['#1a1a1a']} style={styles.useCodeGradient}>
                  <Text style={styles.useCodeText}>use this code</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.primary} style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeModalButton} onPress={onClose} activeOpacity={0.85}>
              <LinearGradient colors={['#f0f0f0']} style={[styles.closeModalGradient, styles.closeModalGradientLight]}>
                <Text style={[styles.closeModalText, { color: T.ink }]}>close</Text>
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
  item, index, onUseNow, onScan, onUnclaim, onGetCode,
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
        toValue: 1, delay: Math.min(index * 40, 200), duration: 300,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1, delay: Math.min(index * 40, 200), friction: 5, tension: 35, useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  useEffect(() => {
    setRedemptionsToday(item?.redemptionsToday || 0);
    setHasActivePromo(item?.hasActivePromo || false);
  }, [item]);

  const handleCardPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // 🔔 subtle tap on card flip
    soundTap();
    setIsFlipped(!isFlipped);
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1, friction: 8, tension: 40, useNativeDriver: true,
    }).start();
  };

  const handleScanPress = (e) => {
    e?.stopPropagation?.();
    if (!canRedeem) {
      soundNope();
      Alert.alert('Limit Reached', 'You have already used this discount 2 times today. Please try again tomorrow.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onScan(item);
  };

  const handleGetCodePress = (e) => {
    e?.stopPropagation?.();
    if (!canRedeem) {
      soundNope();
      Alert.alert('Limit Reached', 'You have already used this discount 2 times today. Please try again tomorrow.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onGetCode(item);
  };

  const translateY = entry.interpolate({ inputRange: [0, 1], outputRange: [15, 0] });
  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const canRedeem = redemptionsToday < maxRedemptions;

  const handleUnclaim = () => {
    soundConfirm();   // 🔔 confirm dialog sound
    Alert.alert(
      'Remove Discount',
      `Are you sure you want to remove "${item?.title}" from your discounts?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => soundTap() },
        {
          text: 'Remove', style: 'destructive',
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
      return hasActivePromo ? 'promo code ready.' : `use a code at ${item?.brand?.name || 'brand'} checkout.`;
    }
    if (item?.isInStore) return 'ready to save. show this in-store.';
    return item?.description || 'tap to view details.';
  };

  return (
    <Animated.View style={[styles.cardWrapper, { opacity: entry, transform: [{ translateY }, { scale }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={handleCardPress} style={styles.cardTouchable}>
        <Animated.View style={[styles.card, { transform: [{ rotateY: frontInterpolate }], backfaceVisibility: 'hidden' }]}>
          <LinearGradient colors={[T.ink]} style={styles.cardInner}>
            <View style={styles.cardImageContainer}>
              {item?.displayImage ? (
                <Image source={{ uri: item.displayImage }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <LinearGradient colors={[T.inkSoft]} style={styles.cardPlaceholder}>
                  <Ionicons name={theme.icon} size={32} color={`${COLORS.primary}30`} />
                </LinearGradient>
              )}
              <LinearGradient colors={['transparent', COLORS.darkOverlay]} style={styles.cardImageOverlay} />

              <LinearGradient colors={theme.gradient} style={styles.cardPercentBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.cardPercentText}>{percentage}%</Text>
                <Text style={styles.cardPercentOff}>off</Text>
              </LinearGradient>

              {item?.isInStore && canRedeem && (
                <TouchableOpacity style={styles.scanQrButton} onPress={handleScanPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="scan qr">
                  <LinearGradient colors={['rgba(249,195,73,0.92)', 'rgba(245,166,35,0.92)']} style={styles.scanQrButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="qr-code-outline" size={18} color={T.ink} />
                    <Text style={styles.scanQrButtonText}>scan qr</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {item?.isOnline && canRedeem && (
                <TouchableOpacity
                  style={[styles.scanQrButton, item.promoStatus === 'active' && styles.promoReadyButton]}
                  onPress={handleGetCodePress}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={item.promoStatus === 'active'
                      ? ['rgba(16,185,129,0.92)', 'rgba(5,150,105,0.92)']
                      : ['rgba(249,195,73,0.92)', 'rgba(245,166,35,0.92)']}
                    style={styles.scanQrButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name={item.promoStatus === 'active' ? "checkmark-circle" : "code-outline"} size={18} color={T.ink} />
                    <Text style={styles.scanQrButtonText}>{item.promoStatus === 'active' ? 'view code' : 'get code'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View style={styles.redemptionInfo}>
                <Text style={styles.redemptionText}>{redemptionsToday}/{maxRedemptions} used today</Text>
                {!canRedeem && <Text style={styles.redemptionLimitText}>limit reached</Text>}
              </View>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.cardCategory}>
                  <Ionicons name={theme.icon} size={12} color={T.yellow} />
                  <Text style={styles.cardCategoryText}>{item?.isOnline ? 'online' : item?.isInStore ? 'in-store' : 'offer'}</Text>
                </View>
                <View style={styles.cardFlipIndicator}>
                  <Ionicons name="sync-outline" size={14} color={T.onInkMuted} />
                </View>
              </View>

              <Text numberOfLines={1} style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{item?.title || 'special offer'}</Text>
              <Text numberOfLines={1} style={styles.cardDescription}>{getDiscountDescription()}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.cardTapHint}>
                  <Ionicons name="sync-outline" size={12} color={T.onInkMuted} />
                  <Text style={styles.cardTapHintText}>tap to flip</Text>
                </View>
                {item?.brand?.name && <Text style={styles.cardBrandName}>{item.brand.name}</Text>}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={[styles.card, styles.cardBack, {
            transform: [{ rotateY: backInterpolate }],
            backfaceVisibility: 'hidden',
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          }]}
        >
          <LinearGradient colors={theme.gradient} style={styles.cardBackInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.cardBackContent}>
              <Text style={styles.cardBackTitle}>ready to save<Text style={{ color: T.ink }}>.</Text></Text>
              <Text style={styles.cardBackDescription}>
                {canRedeem ? 'choose how to redeem.' : 'limit reached for today.'}
              </Text>

              <View style={styles.cardBackActions}>
                <TouchableOpacity
                  style={[styles.cardBackButton, !canRedeem && styles.cardBackButtonDisabled]}
                  onPress={() => {
                    if (!canRedeem) {
                      soundNope();
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
                    colors={canRedeem ? [T.ink] : ['#cccccc']}
                    style={styles.cardBackButtonGradient}
                  >
                    <Text style={[styles.cardBackButtonText, !canRedeem && styles.cardBackButtonTextDisabled]}>
                      {canRedeem ? 'redeem' : 'limit reached'}
                    </Text>
                    {canRedeem && <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />}
                  </LinearGradient>
                </TouchableOpacity>

                {item?.isInStore && canRedeem && (
                  <TouchableOpacity
                    style={styles.cardBackScanButton}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onScan(item); }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']} style={styles.cardBackScanGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Ionicons name="qr-code-outline" size={18} color={T.ink} />
                      <Text style={styles.cardBackScanText}>scan qr</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                {item?.isOnline && canRedeem && (
                  <TouchableOpacity
                    style={[styles.cardBackPromoButton, item.promoStatus === 'active' && styles.promoReadyCardButton]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onGetCode(item); }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={item.promoStatus === 'active'
                        ? ['rgba(16,185,129,0.3)', 'rgba(5,150,105,0.2)']
                        : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                      style={styles.cardBackPromoGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name={item.promoStatus === 'active' ? "checkmark-circle" : "code-outline"} size={18} color={T.ink} />
                      <Text style={styles.cardBackPromoText}>{item.promoStatus === 'active' ? 'view code' : 'get code'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.unclaimButton} onPress={handleUnclaim} activeOpacity={0.7}>
                <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.unclaimButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="trash-outline" size={14} color={T.ink} />
                  <Text style={styles.unclaimButtonText}>remove discount</Text>
                </LinearGradient>
              </TouchableOpacity>

              {!canRedeem && <Text style={styles.limitMessage}>try again tomorrow.</Text>}
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
          if (isMounted.current) setHasPermission(status === 'granted');
        } catch (error) {
          console.error('Camera permission error:', error);
          if (isMounted.current) setHasPermission(false);
        }
      }
    };
    if (visible) { getCameraPermissions(); setScanned(false); setLoading(false); }
    return () => { isMounted.current = false; };
  }, [visible]);

  const handleBarCodeScanned = useCallback(async ({ type, data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const parsedData = JSON.parse(data);

      if (parsedData.offerId === offer?._id) {
        // 🔔 QR scan detected — play immediate success chime
        soundQrScanSuccess();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
          const canScanRes = await api.get(`/offers/can-scan/${offer._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!canScanRes.data.canScan) {
            soundNope();
            Alert.alert(
              'Limit Reached',
              `You have already used this discount ${canScanRes.data.redemptionsUsed} times today. Maximum 2 times per day.`,
              [{ text: 'OK', onPress: () => { setScanned(false); setLoading(false); } }]
            );
            setLoading(false);
            return;
          }
        } catch (err) {
          if (!isCanceledError(err)) console.error('Error checking scan limit:', err);
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
            // 🔔 final success sound
            soundSuccess();
            Alert.alert('QR Verified! 🎉', `Student verified successfully. Please proceed with payment.`, [
              {
                text: 'Continue',
                onPress: () => {
                  onScanComplete({ ...parsedData, student: studentData, verified: true, verificationData: response.data });
                  onClose();
                  setLoading(false);
                  setScanned(false);
                }
              }
            ]);
          } else {
            soundError();
            Alert.alert('Verification Failed', response.data.message || 'Student verification failed. Please try again.', [
              { text: 'Try Again', onPress: () => { setScanned(false); setLoading(false); } }
            ]);
            setLoading(false);
          }
        } catch (apiError) {
          if (!isCanceledError(apiError)) console.error('API Error:', apiError);
          soundError();
          Alert.alert('Error', apiError.response?.data?.message || 'Failed to verify student. Please try again.', [
            { text: 'Try Again', onPress: () => { setScanned(false); setLoading(false); } }
          ]);
          setLoading(false);
        }
      } else {
        soundError();
        Alert.alert('Invalid QR Code', 'This QR code does not match the selected offer. Please scan the correct QR code.', [
          { text: 'Try Again', onPress: () => { setScanned(false); setLoading(false); } }
        ]);
        setLoading(false);
      }
    } catch (err) {
      soundError();
      Alert.alert('Error', 'Invalid QR code format. Please scan a valid QR code.', [
        { text: 'Try Again', onPress: () => { setScanned(false); setLoading(false); } }
      ]);
      setLoading(false);
    }
  }, [scanned, loading, offer, user, token, onScanComplete, onClose]);

  const toggleTorch = () => {
    soundTap();
    setTorchOn(!torchOn);
  };

  if (hasPermission === null) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.scannerModalContainer}>
          <View style={styles.scannerModalContent}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerHeaderTitle}>scan qr code</Text>
              <TouchableOpacity onPress={onClose} style={styles.scannerCloseBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.scannerPermissionContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.scannerPermissionText}>asking for camera access…</Text>
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
              <Text style={styles.scannerHeaderTitle}>scan qr code</Text>
              <TouchableOpacity onPress={onClose} style={styles.scannerCloseBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.scannerPermissionContainer}>
              <Ionicons name="camera-off" size={48} color="#fff" />
              <Text style={styles.scannerPermissionText}>camera access is off</Text>
              <Text style={styles.scannerPermissionSubtext}>
                turn on camera access in your phone settings to scan qr codes.
              </Text>
              <TouchableOpacity style={styles.scannerPermissionButton} onPress={onClose}>
                <Text style={styles.scannerPermissionButtonText}>close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scannerModalContainer}>
        <View style={styles.scannerModalContent}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerHeaderTitle}>scan qr code</Text>
            <View style={styles.scannerHeaderActions}>
              <TouchableOpacity onPress={toggleTorch} style={styles.scannerTorchBtn}>
                <Ionicons name={torchOn ? "flashlight" : "flashlight-outline"} size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.scannerCloseBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {offer && (
            <View style={styles.scannerOfferInfo}>
              <Text style={styles.scannerOfferTitle}>{offer.title}</Text>
              <Text style={styles.scannerOfferDiscount}>{offer.discountPercentage}% off</Text>
              <Text style={styles.scannerOfferHint}>{"scan the qr code shown at the brand's counter."}</Text>
            </View>
          )}

          <View style={styles.scannerWrapper}>
            <CameraView
              style={styles.scannerCamera}
              facing="back"
              enableTorch={torchOn}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
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
                <Text style={styles.scannerInstruction}>place the qr code in the frame</Text>
              </View>

              <View style={styles.scannerBottomContent}>
                {loading && <ActivityIndicator size="large" color={COLORS.primary} />}
                {scanned && !loading && (
                  <TouchableOpacity style={styles.scannerRetryBtn} onPress={() => { soundTap(); setScanned(false); }}>
                    <Text style={styles.scannerRetryText}>scan again</Text>
                  </TouchableOpacity>
                )}
              </View>
            </CameraView>
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerFooterText}>make sure the qr code is well lit and centred.</Text>
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
      title: item?.isOnline ? 'visit the website' : 'visit the store',
      description: item?.isOnline ? `go to the ${item?.brand?.name || 'brand'} website.` : 'visit the participating brand or store.',
    },
    { icon: 'id-card-outline', title: 'scan the qr code', description: 'ask the staff to scan your tdc qr code to verify your discount.' },
    { icon: 'shield-checkmark-outline', title: 'verification', description: 'staff will check that you are eligible.' },
    { icon: 'checkmark-circle-outline', title: 'redeem and save', description: 'the discount is applied to your purchase. sorted.' },
  ];

  useEffect(() => {
    if (visible) {
      // 🔔 popup open sound
      soundPopupOpen();
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(height);
      backdropAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
          <SheetHandle />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            <LinearGradient colors={[T.yellowSoft]} style={styles.modalHeaderGradient}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name={theme.icon} size={24} color={T.ink} />
                </View>
                <View style={styles.modalPercentageCircle}>
                  <Text style={styles.modalPercentageBig}>{percentage}%</Text>
                  <Text style={styles.modalPercentageOffBig}>off</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.modalTitleSection}>
              <Text style={styles.modalTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>{item?.title || 'special offer'}</Text>
              <Text style={styles.modalSubtitle}>
                {item?.isOnline ? 'online discount' : item?.isInStore ? 'in-store discount' : ''}
              </Text>
              <Text style={[styles.modalSubtitle, { marginTop: 4 }]}>
                {item?.description || 'redeem your discount today.'}
              </Text>
              {item?.brand?.name && <Text style={styles.modalBrandName}>by {item.brand.name}</Text>}
            </View>

            <View style={styles.stepsWrapper}>
              <View style={styles.stepsSectionHeader}>
                <Text style={styles.stepsHeader}>how to redeem<Text style={{ color: T.yellow }}>.</Text></Text>
              </View>

              {steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumberContainer}>
                    <LinearGradient colors={[T.ink]} style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </LinearGradient>
                    {index < steps.length - 1 && <View style={styles.stepLine} />}
                  </View>
                  <View style={styles.stepContentBox}>
                    <View style={styles.stepContentIcon}>
                      <Ionicons name={step.icon} size={16} color={T.ink} />
                    </View>
                    <View style={styles.stepTextContainer}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDescription}>{step.description}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.closeModalButton} onPress={onClose} activeOpacity={0.85}>
              <LinearGradient colors={['#1a1a1a']} style={styles.closeModalGradient}>
                <Text style={styles.closeModalText}>got it</Text>
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
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(loadingProgress, { toValue: 1, duration: 1000, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const loadingScaleX = loadingProgress.interpolate({
    inputRange: [0, 0.5, 1], outputRange: [0, 1, 1],
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.loadingOverlay, { opacity: overlayOpacity }]}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={T.ink} />
        <Text style={styles.loadingText}>{message || "loading discounts…"}</Text>
        <View style={styles.loadingProgressContainer}>
          <Animated.View style={[styles.loadingProgressBar, { transform: [{ scaleX: loadingScaleX }] }]} />
        </View>
        <View style={styles.loadingDots}>
          {[0, 1, 2].map((i) => <View key={i} style={styles.loadingDot} />)}
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
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.emptyState, { opacity, transform: [{ scale }] }]}>
      <View style={styles.emptyIconContainer}>
        <Dot mood="broke" size={56} animated={false} />
      </View>
      <Text style={styles.emptyTitle}>no discounts yet</Text>
      <Text style={styles.emptyDescription}>
        claim a partner offer and it shows up here.
      </Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); soundTap(); navigation.navigate('Brands'); }}
        activeOpacity={0.85}
      >
        <LinearGradient colors={['#1a1a1a']} style={styles.exploreButtonGradient}>
          <Text style={styles.exploreButtonText}>see brands</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ==================== MAIN SCREEN ====================
export default function MyDiscountScreen() {
  const navigation = useNavigation();
  const { token, user } = useContext(AuthContext);
  const userId = user?._id;

  const initialCache = useMemo(() => getUserCache(userId), [userId]);
  const initialOffers = useMemo(() => {
    if (!initialCache?.offers) return [];
    return initialCache.offers.filter(o => !initialCache.removedIds.has(o._id));
  }, [initialCache]);

  const [claimedOffers, setClaimedOffers] = useState(initialOffers);
  const [loading, setLoading] = useState(!initialOffers.length);
  const [initialLoading, setInitialLoading] = useState(!initialOffers.length);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSaved, setTotalSaved] = useState(initialCache?.totalSaved || 0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanningOffer, setScanningOffer] = useState(null);
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [promoOffer, setPromoOffer] = useState(null);
  const [promoDetails, setPromoDetails] = useState(null);
  const [generatingPromo, setGeneratingPromo] = useState(false);

  // ── City filter (Karachi default, shared with Brands + Offer screens) ──
  const [savedCity, setSelectedCity] = useSelectedCity();

  // "All" + only cities your claimed deals are in, count = deals in that city
  const cityOptions = useMemo(
    () => buildCityOptions(claimedOffers, getOfferCities),
    [claimedOffers]
  );
  const selectedCity = claimedOffers.length
    ? resolveCity(savedCity, cityOptions)
    : savedCity;

  const visibleOffers = useMemo(
    () => claimedOffers.filter((o) => offerMatchesCity(o, selectedCity)),
    [claimedOffers, selectedCity]
  );
  const hiddenByCity = claimedOffers.length - visibleOffers.length;

  const headerAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  const refreshTimerRef = useRef(null);
  const focusRefreshTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const currentUserIdRef = useRef(userId);
  const hasHydratedRef = useRef(false);

  // ============================================================
  // ✅ CRITICAL FIX: USER CHANGE DETECTION
  // ============================================================
  useEffect(() => {
    const newUserId = userId;

    if (currentUserIdRef.current === newUserId) return;

    const previousUserId = currentUserIdRef.current;
    currentUserIdRef.current = newUserId;

    if (previousUserId) {
      clearUserCache(previousUserId);
    }

    const newCache = getUserCache(newUserId);
    const newOffers = newCache?.offers
      ? newCache.offers.filter(o => !newCache.removedIds.has(o._id))
      : [];

    setClaimedOffers(newOffers);
    setTotalSaved(newCache?.totalSaved || 0);
    setLoading(!newOffers.length);
    setInitialLoading(!newOffers.length);
    setRefreshing(false);

    setModalVisible(false);
    setSelectedOffer(null);
    setScannerVisible(false);
    setScanningOffer(null);
    setPromoModalVisible(false);
    setPromoOffer(null);
    setPromoDetails(null);
    setGeneratingPromo(false);

    if (refreshTimerRef.current) { clearTimeout(refreshTimerRef.current); refreshTimerRef.current = null; }
    if (focusRefreshTimerRef.current) { clearTimeout(focusRefreshTimerRef.current); focusRefreshTimerRef.current = null; }
  }, [userId]);

  // Unmount cleanup
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();

    return () => {
      isMounted.current = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (focusRefreshTimerRef.current) clearTimeout(focusRefreshTimerRef.current);
    };
  }, []);

  // ==================== LOAD DISCOUNTS ====================
  const loadDiscounts = useCallback(async (isRefresh = false, useCache = true) => {
    const activeUserId = userId;

    if (!token || !activeUserId) {
      if (isMounted.current && currentUserIdRef.current === activeUserId) {
        setLoading(false);
        setInitialLoading(false);
        setClaimedOffers([]);
        setTotalSaved(0);
      }
      return;
    }

    const userCache = getUserCache(activeUserId);
    if (!userCache) return;

    if (useCache && !isRefresh && userCache.offers && userCache.timestamp &&
      (Date.now() - userCache.timestamp) < CACHE_DURATION) {
      if (isMounted.current && currentUserIdRef.current === activeUserId) {
        const filteredOffers = userCache.offers.filter(o => !userCache.removedIds.has(o._id));
        setClaimedOffers(filteredOffers);
        setTotalSaved(userCache.totalSaved);
        setLoading(false);
        setInitialLoading(false);
        setRefreshing(false);
      }
      return;
    }

    if (userCache.inFlight) {
      try { await userCache.inFlight; } catch (_) {}
      return;
    }

    const fetchPromise = (async () => {
      const [offersRes, savingsRes] = await Promise.all([
        api.get('/offers/claimed', {
          headers: { Authorization: `Bearer ${token}` },
          // refresh / focus / polling skip the server cache
          params: isRefresh || !useCache ? { fresh: 1 } : undefined,
          timeout: 10000,
        }),
        api.get('/offers/my-total-savings', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        }).catch(() => ({ data: { totalSaved: 0 } })),
      ]);

      let promoCodes = [];
      try {
        const promoRes = await api.get('/promo-codes/my-codes', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        promoCodes = promoRes.data?.promoCodes || [];
      } catch (err) {
        if (!isCanceledError(err)) console.log('Promo codes fetch error:', err?.message);
      }

      const activeCache = getUserCache(activeUserId);
      if (!activeCache) return { offers: [], totalSaved: 0, promoCodes };

      const removedIds = activeCache.removedIds;

      const offersWithImages = offersRes.data
        .filter((offer) => !removedIds.has(offer._id))
        .map((offer) => {
          let offerPromo = promoCodes.find(
            p => p.offer?._id?.toString() === offer._id?.toString()
          );

          if (!offerPromo && activeCache.offers) {
            const cachedOffer = activeCache.offers.find(o => o._id?.toString() === offer._id?.toString());
            if (cachedOffer?.activePromoDetails) offerPromo = cachedOffer.activePromoDetails;
          }

          return {
            ...offer,
            displayImage: offerImageUrl(offer.image),
            redemptionsToday: offer.redemptionsToday || 0,
            hasActivePromo: offerPromo?.status === 'active',
            promoStatus: offerPromo?.status || null,
            activePromoCode: offerPromo?.code || null,
            activePromoDetails: offerPromo || null,
            isClaimed: true,
          };
        });

      const saved = savingsRes.data?.totalSaved || 0;

      // This is the full claimed list → the registry becomes exactly this list
      // (redeemed / removed offers stop showing "Claimed" on Brands + Offer)
      try {
        replaceClaimedIds(
          (Array.isArray(offersRes.data) ? offersRes.data : []).map((o) => o._id)
        );
      } catch (e) {}

      activeCache.offers = offersWithImages;
      activeCache.totalSaved = saved;
      activeCache.timestamp = Date.now();

      return { offers: offersWithImages, totalSaved: saved, promoCodes };
    })();

    userCache.inFlight = fetchPromise;

    try {
      const result = await fetchPromise;

      if (isMounted.current && currentUserIdRef.current === activeUserId) {
        setClaimedOffers(result.offers);
        setTotalSaved(result.totalSaved);
        setLoading(false);
        setInitialLoading(false);
        setRefreshing(false);
      }
    } catch (err) {
      if (isCanceledError(err)) return;

      if (isMounted.current && currentUserIdRef.current === activeUserId) {
        console.log('Error loading discounts:', err?.message || err);
        const fallbackCache = getUserCache(activeUserId);
        if (fallbackCache?.offers) {
          const filtered = fallbackCache.offers.filter(o => !fallbackCache.removedIds.has(o._id));
          setClaimedOffers(filtered);
          setTotalSaved(fallbackCache.totalSaved);
        } else {
          setClaimedOffers([]);
          setTotalSaved(0);
        }
        setLoading(false);
        setInitialLoading(false);
        setRefreshing(false);
      }
    } finally {
      const c = getUserCache(activeUserId);
      if (c) c.inFlight = null;
    }
  }, [token, userId]);

  // ==================== STATS-ONLY REFRESH ====================
  const refreshStatsOnly = useCallback(async () => {
    const activeUserId = userId;
    if (!token || !activeUserId || !isMounted.current) return;

    try {
      const savingsRes = await api.get('/offers/my-total-savings', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      }).catch(() => ({ data: { totalSaved: 0 } }));

      if (isMounted.current && currentUserIdRef.current === activeUserId) {
        const saved = savingsRes.data?.totalSaved || 0;
        setTotalSaved(saved);
        const c = getUserCache(activeUserId);
        if (c) c.totalSaved = saved;
      }
    } catch (err) {
      if (!isCanceledError(err)) console.log('Stats refresh error:', err?.message);
    }
  }, [token, userId]);

  // ==================== AUTO REFRESH ====================
  const setupAutoRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const activeUserId = userId;
    if (!activeUserId) return;

    refreshTimerRef.current = setTimeout(async () => {
      if (isMounted.current && token && currentUserIdRef.current === activeUserId) {
        await loadDiscounts(true, false);
        if (isMounted.current && token && currentUserIdRef.current === activeUserId) {
          setupAutoRefresh();
        }
      }
    }, 30000);
  }, [token, userId, loadDiscounts]);

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    let isSubscribed = true;
    const activeUserId = userId;

    const performInitialLoad = async () => {
      if (!hasHydratedRef.current) {
        hasHydratedRef.current = true;
        try { await hydrateClaimedRegistry(activeUserId); } catch (e) { console.log('hydrate failed:', e); }
      }
      if (!isSubscribed || currentUserIdRef.current !== activeUserId) return;

      if (token && activeUserId) {
        await loadDiscounts(false, true);
        if (isSubscribed && currentUserIdRef.current === activeUserId) setupAutoRefresh();
      } else {
        if (isSubscribed) { setLoading(false); setInitialLoading(false); }
      }
    };

    performInitialLoad();

    return () => {
      isSubscribed = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [token, userId, loadDiscounts, setupAutoRefresh]);

  // ==================== FOCUS REFRESH ====================
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const activeUserId = userId;

      const doFocusRefresh = async () => {
        if (token && activeUserId && isActive && currentUserIdRef.current === activeUserId) {
          await loadDiscounts(true, false);
          if (isActive && currentUserIdRef.current === activeUserId) setupAutoRefresh();
        }
      };

      focusRefreshTimerRef.current = setTimeout(doFocusRefresh, 150);

      return () => {
        isActive = false;
        if (focusRefreshTimerRef.current) clearTimeout(focusRefreshTimerRef.current);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      };
    }, [token, userId, loadDiscounts, setupAutoRefresh])
  );

  // ==================== APP STATE LISTENER ====================
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      const activeUserId = userId;
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        if (token && activeUserId && isMounted.current && currentUserIdRef.current === activeUserId) {
          loadDiscounts(true, false);
          setupAutoRefresh();
        }
      } else if (nextAppState === 'background') {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      }
    });

    return () => subscription?.remove();
  }, [token, userId, loadDiscounts, setupAutoRefresh]);

  // ==================== CACHE EVENT LISTENER ====================
  useEffect(() => {
    const unsub = onCacheEvent((event) => {
      if (!event || event.type !== 'cache:invalidated') return;
      if (!isMounted.current) return;

      const activeUserId = userId;
      if (!activeUserId || currentUserIdRef.current !== activeUserId) return;

      if (event.type === 'offer:claimed' && event.offerId) {
        try { registerLocalClaim(event.offerId); } catch (e) {}

        const c = getUserCache(activeUserId);
        if (c) {
          c.timestamp = null;
          c.removedIds.delete(event.offerId); // claimed again → show it again
        }

        setTimeout(() => {
          if (isMounted.current && token && currentUserIdRef.current === activeUserId) {
            loadDiscounts(true, false);
          }
        }, 300);
      }

      if (event.type === 'offer:unclaimed' && event.offerId) {
        try { unregisterLocalClaim(event.offerId); } catch (e) {}

        const c = getUserCache(activeUserId);
        if (c) {
          c.removedIds.add(event.offerId);
          if (c.offers) c.offers = c.offers.filter(o => o._id !== event.offerId);
        }

        setClaimedOffers((prev) => prev.filter((o) => o._id !== event.offerId));
        refreshStatsOnly();
      }
    });
    return unsub;
  }, [loadDiscounts, refreshStatsOnly, token, userId]);

  // ==================== PROMO CODE FUNCTIONS ====================
  const generatePromoCodeForOffer = useCallback(async (offerId) => {
    if (!token) {
      soundNope();
      Alert.alert('Error', 'Please login to generate a promo code');
      return null;
    }

    setGeneratingPromo(true);
    try {
      const response = await api.post(`/promo-codes/generate`, { offerId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // 🔔 success sound on generate
        soundSuccess();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return response.data.promoCode;
      }
      throw new Error(response.data.message || 'Failed to generate promo code');
    } catch (err) {
      if (isCanceledError(err)) return null;
      console.error('Error generating promo code:', err);

      if (err.response?.status === 403) {
        soundNope();
        Alert.alert('Claim First', 'You need to claim this discount first. Would you like to claim it now?', [
          { text: 'Cancel', style: 'cancel', onPress: () => soundTap() },
          {
            text: 'Claim & Generate',
            onPress: async () => {
              try {
                soundDealClaimed();       // 🔔 claim sound
                await api.post(`/offers/claim/${offerId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                try { registerLocalClaim(offerId); } catch (e) {}
                const retryResult = await generatePromoCodeForOffer(offerId);
                if (retryResult) return retryResult;
              } catch (claimErr) {
                if (!isCanceledError(claimErr)) {
                  soundError();
                  Alert.alert('Error', 'Failed to claim offer. Please try again.');
                }
              }
            }
          }
        ]);
        return null;
      }
      soundError();
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to generate promo code.');
      return null;
    } finally {
      setGeneratingPromo(false);
    }
  }, [token]);

  const copyPromoCode = useCallback(async (code) => {
    try {
      // 🔔 copy sound fires immediately
      soundCopy();
      await Clipboard.setStringAsync(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Promo code copied to clipboard');
    } catch (err) {
      soundError();
      Alert.alert('Error', 'Failed to copy promo code');
    }
  }, []);

  const usePromoCode = useCallback((code) => {
    const websiteUrl = promoOffer?.brand?.websiteUrl || promoOffer?.brand?.shopifyStoreUrl;
    const platform = promoOffer?.brand?.platform;

    const fallbackAlert = () => {
      Alert.alert('Use Promo Code', `Use code "${code}" at checkout to get your discount!`, [
        { text: 'Copy Code', onPress: () => copyPromoCode(code) },
        { text: 'OK', style: 'default' }
      ]);
    };

    if (websiteUrl) {
      const formattedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
      const isShopify = platform === 'shopify' || formattedUrl.includes('myshopify.com');
      const urlWithCoupon = isShopify
        ? `${formattedUrl.replace(/\/$/, '')}/discount/${code}`
        : `${formattedUrl}?coupon=${code}`;
      Linking.openURL(urlWithCoupon).catch(() => fallbackAlert());
    } else {
      fallbackAlert();
    }
  }, [copyPromoCode, promoOffer]);

  const cancelPromoCode = useCallback(async (code) => {
    Alert.alert('Cancel Promo Code', 'Are you sure you want to cancel this promo code? This action cannot be undone.', [
      { text: 'Keep', style: 'cancel', onPress: () => soundTap() },
      {
        text: 'Cancel Code', style: 'destructive',
        onPress: async () => {
          try {
            const promoCodeDoc = await api.get(`/promo-codes/${code}`, { headers: { Authorization: `Bearer ${token}` } });
            if (promoCodeDoc.data.success) {
              const codeId = promoCodeDoc.data.promoCode.id;
              await api.post(`/promo-codes/cancel/${codeId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
              // 🔔 removal sound
              soundSwipe();
              Alert.alert('Cancelled', 'Promo code has been cancelled successfully.');
              loadDiscounts(true, false);
              setPromoModalVisible(false);
            }
          } catch (err) {
            if (!isCanceledError(err)) {
              soundError();
              Alert.alert('Error', 'Failed to cancel promo code. Please try again.');
            }
          }
        }
      }
    ]);
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
      soundNope();
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
        isExisting: true,
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
        isExisting: false,
      });
      loadDiscounts(true, false);
    } else {
      setPromoModalVisible(false);
    }
  }, [generatePromoCodeForOffer, loadDiscounts]);

  const handleScanComplete = useCallback((data) => {
    // 🔔 success + badge unlock for completing redemption
    soundSuccess();
    soundBadgeUnlock();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.alert(
      'QR Verified! 🎉',
      `You've successfully verified the discount at ${data.brandName || scanningOffer?.title}. Your discount has been applied!`,
      [{ text: 'Great!', style: 'default' }]
    );

    if (scanningOffer) {
      setClaimedOffers(prev => prev.map(offer => {
        if (offer._id === scanningOffer._id) {
          return { ...offer, redemptionsToday: (offer.redemptionsToday || 0) + 1 };
        }
        return offer;
      }));
    }

    loadDiscounts(true, false);
  }, [scanningOffer, loadDiscounts]);

  // ==================== HANDLE UNCLAIM ====================
  const handleUnclaim = useCallback(async (item) => {
    const activeUserId = userId;
    if (!activeUserId) return;

    try {
      const response = await api.post(`/offers/unclaim/${item._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.message) {
        // 🔔 removal swipe sound
        soundSwipe();

        try { unregisterLocalClaim(item._id); } catch (e) { console.log('unregister error:', e); }

        const c = getUserCache(activeUserId);
        if (c) {
          c.removedIds.add(item._id);
          if (c.offers) c.offers = c.offers.filter(o => o._id !== item._id);
          c.timestamp = null;
        }

        if (currentUserIdRef.current === activeUserId) {
          setClaimedOffers(prev => prev.filter(o => o._id !== item._id));
        }

        const brandId = getBrandIdFromOffer(item);
        if (brandId) {
          try { notifyOfferUnclaimed(brandId, item._id, activeUserId); } catch (e) { console.log('notify error:', e); }
        }

        Alert.alert('Removed', `${item.title} has been removed from your discounts.`);
        refreshStatsOnly();
      }
    } catch (err) {
      if (isCanceledError(err)) return;
      console.error('Error unclaiming offer:', err);
      soundError();
      Alert.alert('Error', err.response?.data?.message || 'Failed to remove discount. Please try again.');
    }
  }, [token, refreshStatsOnly, userId]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    soundRefresh();       // 🔔 refresh whoosh
    setRefreshing(true);
    loadDiscounts(true, false);
  }, [loadDiscounts]);

  const stats = useMemo(() => {
    const activeCount = visibleOffers.filter(o => o.isActive !== false).length;
    const onlineCount = visibleOffers.filter(o => o.isOnline).length;
    const inStoreCount = visibleOffers.filter(o => o.isInStore).length;
    const promoCount = visibleOffers.filter(o => o.hasActivePromo).length;
    return { activeCount, onlineCount, inStoreCount, promoCount };
  }, [visibleOffers]);

  if (initialLoading && claimedOffers.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <LoadingOverlay visible={true} message="Loading your discounts..." />
      </SafeAreaView>
    );
  }

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1], outputRange: [-8, 0],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerTranslateY }] }]}>
        <TouchableOpacity
          onPress={() => { soundTap(); navigation.goBack(); }}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="back"
        >
          <Ionicons name="chevron-back" size={19} color={T.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>my discounts<Text style={{ color: T.yellow }}>.</Text></Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.headerBadge} activeOpacity={0.7} disabled={refreshing} accessibilityRole="button" accessibilityLabel={`${stats.activeCount} active, refresh`}>
          {refreshing ? (
            <ActivityIndicator size="small" color={T.ink} />
          ) : (
            <>
              <Text style={styles.headerBadgeText}>{stats.activeCount}</Text>
              <Text style={styles.headerBadgeLabel}>active</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {cityOptions.length > 1 && (
        <View style={styles.cityRow}>
          <Text style={styles.cityRowText}>
            {selectedCity === ALL_CITIES ? 'all your discounts' : `discounts in ${selectedCity}`}
          </Text>
          <CityDropdown
            options={cityOptions}
            selected={selectedCity}
            onSelect={setSelectedCity}
            title="my discounts in"
          />
        </View>
      )}

      <FlatList
        data={visibleOffers}
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
            tintColor={T.ink}
            colors={[T.ink]}
            progressBackgroundColor={T.card}
          />
        }
        ListHeaderComponent={
          <View style={styles.statsContainer}>
            <StatCard title="active" value={stats.activeCount} icon="pricetag-outline" gradientColors={['#f9c349', '#f5a623']} delay={200} />
            {stats.onlineCount > 0 && (
              <StatCard title="online" value={stats.onlineCount} icon="globe-outline" gradientColors={['#3b82f6', '#2563eb']} delay={300} />
            )}
            {stats.promoCount > 0 && (
              <StatCard title="codes ready" value={stats.promoCount} icon="code-outline" gradientColors={['#10b981', '#059669']} delay={400} />
            )}
          </View>
        }
        ListEmptyComponent={
          hiddenByCity > 0 ? (
            <View style={styles.cityEmpty}>
              <Dot mood="sus" size={56} animated={false} />
              <Text style={styles.cityEmptyTitle}>no discounts in {selectedCity}</Text>
              <Text style={styles.cityEmptyText}>
                you have {hiddenByCity} {hiddenByCity === 1 ? 'discount' : 'discounts'} in other cities.
              </Text>
              <TouchableOpacity
                style={styles.cityEmptyBtn}
                activeOpacity={0.85}
                onPress={() => { soundTap(); setSelectedCity(ALL_CITIES); }}
              >
                <Text style={styles.cityEmptyBtnText}>show all cities</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState navigation={navigation} />
          )
        }
      />

      <UseNowModal visible={modalVisible} onClose={() => setModalVisible(false)} item={selectedOffer} />

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => { setScannerVisible(false); setScanningOffer(null); }}
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
                  isExisting: false,
                });
                loadDiscounts(true, false);
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
  container: { flex: 1, backgroundColor: T.paper },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontFamily: F.heading, fontSize: 28, letterSpacing: -0.8, color: T.ink },
  headerBadge: {
    minWidth: 64,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  headerBadgeText: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  headerBadgeLabel: { fontFamily: F.body, fontSize: 12, color: T.textMuted },

  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cityRowText: { flex: 1, fontFamily: F.bodySemi, fontSize: 13, color: T.textMuted },

  listContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  // Stats
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statCard: { flexGrow: 1, flexBasis: '30%' },
  statCardInner: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.line,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIconBox: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden' },
  statIconGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: F.heading, fontSize: 18, color: T.ink },
  statLabel: { fontFamily: F.body, fontSize: 12, color: T.textMuted },

  // Discount card
  cardWrapper: { marginBottom: 12 },
  cardTouchable: {},
  card: { borderRadius: 26, overflow: 'hidden' },
  cardInner: { borderRadius: 26, overflow: 'hidden' },
  cardImageContainer: { height: 150, backgroundColor: T.inkSoft, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardImageOverlay: { ...StyleSheet.absoluteFillObject },
  cardPercentBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardPercentText: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  cardPercentOff: { fontFamily: F.bodyBold, fontSize: 12, color: T.ink },
  scanQrButton: { position: 'absolute', right: 12, bottom: 12, borderRadius: 20, overflow: 'hidden' },
  promoReadyButton: {},
  scanQrButtonGradient: {
    height: 40,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanQrButtonText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink },
  redemptionInfo: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(17,17,17,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redemptionText: { fontFamily: F.bodySemi, fontSize: 11.5, color: T.white },
  redemptionLimitText: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.yellow },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCategory: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardCategoryText: { fontFamily: F.bodySemi, fontSize: 12, color: T.onInkMuted },
  cardFlipIndicator: {},
  cardTitle: { fontFamily: F.bodyBold, fontSize: 16, color: T.white, marginTop: 6 },
  cardDescription: { fontFamily: F.body, fontSize: 12.5, color: T.onInkMuted, marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  cardTapHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTapHintText: { fontFamily: F.body, fontSize: 11.5, color: T.onInkMuted },
  cardBrandName: { fontFamily: F.bodyBold, fontSize: 12.5, color: T.yellow },

  // Card back (yellow)
  cardBack: {},
  cardBackInner: { flex: 1, borderRadius: 26, padding: 18, justifyContent: 'center' },
  cardBackContent: { alignItems: 'stretch' },
  cardBackTitle: { fontFamily: F.heading, fontSize: 22, color: T.ink, textAlign: 'center' },
  cardBackDescription: { fontFamily: F.body, fontSize: 13, color: T.ink, textAlign: 'center', marginTop: 2 },
  cardBackActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' },
  cardBackButton: { flexGrow: 1, borderRadius: 22, overflow: 'hidden' },
  cardBackButtonDisabled: {},
  cardBackButtonGradient: {
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardBackButtonText: { fontFamily: F.bodyBold, fontSize: 14, color: T.white },
  cardBackButtonTextDisabled: { color: T.textFaint },
  cardBackScanButton: { flexGrow: 1, borderRadius: 22, overflow: 'hidden' },
  cardBackScanGradient: {
    height: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardBackScanText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink },
  cardBackPromoButton: { flexGrow: 1, borderRadius: 22, overflow: 'hidden' },
  promoReadyCardButton: {},
  cardBackPromoGradient: {
    height: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardBackPromoText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink },
  unclaimButton: { alignSelf: 'center', marginTop: 12, borderRadius: 18, overflow: 'hidden' },
  unclaimButtonGradient: {
    height: 36,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unclaimButtonText: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.ink },
  limitMessage: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.ink, textAlign: 'center', marginTop: 8 },

  // Shared bottom-sheet modal
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: T.overlay },
  modalContent: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.88,
    paddingTop: 8,
  },
  modalHandle: { alignItems: 'center', paddingVertical: 6 },
  modalHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.handle },
  modalScrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  // Promo code modal
  promoModalHeader: { borderRadius: 22, padding: 18, alignItems: 'center', marginTop: 8 },
  promoModalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoModalTitle: { fontFamily: F.heading, fontSize: 22, color: T.ink, marginTop: 10, textAlign: 'center' },
  promoModalSubtitle: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.ink, textAlign: 'center', marginTop: 4 },
  generatingContainer: { alignItems: 'center', paddingVertical: 24 },
  generatingText: { fontFamily: F.body, fontSize: 14, color: T.textMuted, marginTop: 10 },
  promoCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    padding: 10,
    paddingLeft: 16,
    borderRadius: 20,
    backgroundColor: T.ink,
    borderWidth: 1,
    borderColor: T.ink,
  },
  promoCodeDisplayText: { fontFamily: F.heading, fontSize: 24, letterSpacing: 3, color: T.yellow },
  promoCodeCopyButton: { borderRadius: 18, overflow: 'hidden' },
  promoCodeCopyGradient: {
    height: 36,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
  },
  promoCodeCopyText: { fontFamily: F.bodyBold, fontSize: 13, color: T.white },
  generatePromoButton: { marginTop: 16, borderRadius: 26, overflow: 'hidden' },
  generatePromoGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generatePromoText: { fontFamily: F.bodyBold, fontSize: 15, color: T.white },
  expiryContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  expiryText: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted },
  cancelPromoButton: { alignSelf: 'center', marginTop: 8, paddingVertical: 10, paddingHorizontal: 12 },
  cancelPromoText: { fontFamily: F.bodySemi, fontSize: 13, color: T.danger },
  promoDetails: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.line,
  },
  promoDetailsTitle: { fontFamily: F.heading, fontSize: 17, color: T.ink, marginBottom: 10 },
  promoStep: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  promoStepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoStepNumberText: { fontFamily: F.bodyBold, fontSize: 12, color: T.white },
  promoStepText: { flex: 1, fontFamily: F.body, fontSize: 14, color: T.ink },
  useCodeButton: { marginTop: 16, borderRadius: 26, overflow: 'hidden' },
  useCodeGradient: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  useCodeText: { fontFamily: F.bodyBold, fontSize: 15, color: T.white },
  closeModalButton: { marginTop: 12, borderRadius: 26, overflow: 'hidden' },
  closeModalGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  closeModalGradientLight: { borderWidth: 1.5, borderColor: T.ink, backgroundColor: T.card },
  closeModalText: { fontFamily: F.bodyBold, fontSize: 15, color: T.white },

  // QR scanner (camera stays dark)
  scannerModalContainer: { flex: 1, backgroundColor: 'rgba(17,17,17,0.92)' },
  scannerModalContent: { flex: 1, paddingTop: Platform.OS === 'ios' ? 54 : 32 },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  scannerHeaderTitle: { fontFamily: F.heading, fontSize: 22, color: T.white },
  scannerHeaderActions: { flexDirection: 'row', gap: 10 },
  scannerTorchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerOfferInfo: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  scannerOfferTitle: { fontFamily: F.bodyBold, fontSize: 16, color: T.white, textAlign: 'center' },
  scannerOfferDiscount: { fontFamily: F.heading, fontSize: 26, color: T.yellow, marginTop: 2 },
  scannerOfferHint: { fontFamily: F.body, fontSize: 13, color: T.onInkMuted, marginTop: 4, textAlign: 'center' },
  scannerWrapper: { flex: 1, marginHorizontal: 16, borderRadius: 26, overflow: 'hidden' },
  scannerCamera: { flex: 1 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scannerFrame: { width: 230, height: 230, position: 'relative' },
  scannerCornerTL: { position: 'absolute', top: 0, left: 0, width: 36, height: 36, borderTopWidth: 4, borderLeftWidth: 4, borderColor: T.yellow, borderTopLeftRadius: 16 },
  scannerCornerTR: { position: 'absolute', top: 0, right: 0, width: 36, height: 36, borderTopWidth: 4, borderRightWidth: 4, borderColor: T.yellow, borderTopRightRadius: 16 },
  scannerCornerBL: { position: 'absolute', bottom: 0, left: 0, width: 36, height: 36, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: T.yellow, borderBottomLeftRadius: 16 },
  scannerCornerBR: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderBottomWidth: 4, borderRightWidth: 4, borderColor: T.yellow, borderBottomRightRadius: 16 },
  scannerInstructionContainer: { position: 'absolute', top: 24, left: 0, right: 0, alignItems: 'center' },
  scannerInstruction: {
    fontFamily: F.bodySemi,
    fontSize: 13,
    color: T.white,
    backgroundColor: 'rgba(17,17,17,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  scannerBottomContent: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  scannerRetryBtn: { height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: T.yellow, justifyContent: 'center' },
  scannerRetryText: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  scannerFooter: { paddingHorizontal: 20, paddingVertical: 18, alignItems: 'center' },
  scannerFooterText: { fontFamily: F.body, fontSize: 12.5, color: T.onInkMuted, textAlign: 'center' },
  scannerPermissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  scannerPermissionText: { fontFamily: F.bodyBold, fontSize: 16, color: T.white, textAlign: 'center' },
  scannerPermissionSubtext: { fontFamily: F.body, fontSize: 14, color: T.onInkMuted, textAlign: 'center' },
  scannerPermissionButton: { marginTop: 8, height: 48, paddingHorizontal: 24, borderRadius: 24, backgroundColor: T.white, justifyContent: 'center' },
  scannerPermissionButtonText: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },

  // Use now modal
  modalHeaderGradient: { borderRadius: 22, padding: 18, marginTop: 8 },
  modalHeaderContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPercentageCircle: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  modalPercentageBig: { fontFamily: F.heading, fontSize: 40, letterSpacing: -1.2, color: T.ink },
  modalPercentageOffBig: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },
  modalTitleSection: { marginTop: 16 },
  modalTitle: { fontFamily: F.heading, fontSize: 22, color: T.ink },
  modalSubtitle: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.textMuted, marginTop: 2 },
  modalBrandName: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink, marginTop: 6 },
  stepsWrapper: { marginTop: 20 },
  stepsSectionHeader: { marginBottom: 12 },
  stepsSectionDot: {},
  stepsHeader: { fontFamily: F.heading, fontSize: 18, color: T.ink },
  stepItem: { flexDirection: 'row', gap: 12, minHeight: 64 },
  stepNumberContainer: { alignItems: 'center' },
  stepNumber: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: F.bodyBold, fontSize: 13, color: T.white },
  stepLine: { flex: 1, width: 2, backgroundColor: T.lineSoft, marginVertical: 4 },
  stepContentBox: { flex: 1, flexDirection: 'row', gap: 10, paddingBottom: 12 },
  stepContentIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextContainer: { flex: 1 },
  stepTitle: { fontFamily: F.bodyBold, fontSize: 14.5, color: T.ink },
  stepDescription: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: T.textMuted, marginTop: 2 },

  // Loading
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: T.paper, alignItems: 'center', justifyContent: 'center' },
  loadingCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 22,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    minWidth: 220,
  },
  loadingText: { fontFamily: F.bodySemi, fontSize: 14, color: T.textMuted, marginTop: 12 },
  loadingProgressContainer: { width: 140, height: 4, borderRadius: 2, backgroundColor: T.sand, marginTop: 14, overflow: 'hidden' },
  loadingProgressBar: { width: '100%', height: '100%', backgroundColor: T.ink },
  loadingDots: { flexDirection: 'row', gap: 6, marginTop: 12 },
  loadingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.handle },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIconContainer: { marginBottom: 4 },
  emptyIconGradient: {},
  emptyTitle: { fontFamily: F.headingBold, fontSize: 18, color: T.ink, marginTop: 12 },
  emptyDescription: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: T.textMuted, textAlign: 'center', marginTop: 4 },
  exploreButton: { marginTop: 16, borderRadius: 26, overflow: 'hidden' },
  exploreButtonGradient: { height: 48, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  exploreButtonText: { fontFamily: F.bodyBold, fontSize: 15, color: T.white },

  cityEmpty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  cityEmptyTitle: { fontFamily: F.headingBold, fontSize: 18, color: T.ink, marginTop: 12, textAlign: 'center' },
  cityEmptyText: { fontFamily: F.body, fontSize: 14, color: T.textMuted, textAlign: 'center', marginTop: 4 },
  cityEmptyBtn: {
    marginTop: 16,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: T.ink,
    backgroundColor: T.card,
    justifyContent: 'center',
  },
  cityEmptyBtnText: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
});
