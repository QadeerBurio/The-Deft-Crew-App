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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';

const { height } = Dimensions.get('window');

const DISCOUNT_THEMES = {
  10: { icon: 'restaurant-outline', accent: '#FFD700' },
  15: { icon: 'cafe-outline', accent: '#FFD700' },
  20: { icon: 'shirt-outline', accent: '#FFD700' },
  25: { icon: 'cut-outline', accent: '#FFD700' },
  30: { icon: 'fitness-outline', accent: '#FFD700' },
  40: { icon: 'diamond-outline', accent: '#FFD700' },
  50: { icon: 'trophy-outline', accent: '#FFD700' },
  default: { icon: 'pricetag-outline', accent: '#FFD700' },
};

const getTheme = (percentage) => DISCOUNT_THEMES[percentage] || DISCOUNT_THEMES.default;

const AnimatedStatCard = ({ title, value, icon, IconComponent, delay }) => {
  const translateY = useRef(new Animated.Value(12)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [delay, opacity, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={styles.statCardInner}>
        <View style={styles.statIconContainer}>
          <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.statIconGradient}>
            <IconComponent name={icon} size={20} color="#000" />
          </LinearGradient>
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
      delay: index * 45,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [entry, index]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.985,
      friction: 6,
      tension: 55,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 55,
      useNativeDriver: true,
    }).start();
  };

  const translateY = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  return (
    <Animated.View
      style={[
        styles.discountCard,
        {
          opacity: entry,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
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
              <LinearGradient colors={['#f5f5f5', '#e8e8e8']} style={styles.placeholderGradient}>
                <Ionicons name={theme.icon} size={45} color="rgba(255,215,0,0.4)" />
              </LinearGradient>
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.82)']}
            style={styles.imageOverlay}
          />

          <View style={styles.percentageBadge}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.percentageBadgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.percentageText}>{percentage}% OFF</Text>
            </LinearGradient>
          </View>

          <View style={styles.categoryTagContainer}>
            <BlurView intensity={28} style={styles.categoryTag}>
              <Ionicons name={theme.icon} size={11} color="#FFD700" style={{ marginRight: 4 }} />
              <Text style={styles.categoryText}>{item.category || 'Special Offer'}</Text>
            </BlurView>
          </View>

          <View style={styles.cardContentOverlay}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {item.title || 'Discount Offer'}
            </Text>
            <Text numberOfLines={2} style={styles.cardDescription}>
              {item.description || 'Tap to view how to redeem this offer.'}
            </Text>

            <View style={styles.tapIndicator}>
              <Ionicons name="sparkles-outline" size={12} color="#FFD700" />
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
    {
      icon: 'storefront-outline',
      title: 'Visit the Store',
      description: 'Visit the participating brand/store offering this discount',
    },
    {
      icon: 'id-card-outline',
      title: 'Show Your Card',
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
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(height);
      backdropAnim.setValue(0);
    }
  }, [visible, slideAnim, backdropAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHandle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {item?.displayImage ? (
              <View style={styles.modalImageContainer}>
                <Image source={{ uri: item.displayImage }} style={styles.modalImage} resizeMode="cover" />
                <LinearGradient
                  colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
                  style={styles.modalImageOverlay}
                />
                <View style={styles.modalPercentageBadge}>
                  <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.modalBadgeGradient}>
                    <Text style={styles.modalPercentageText}>{percentage}%</Text>
                    <Text style={styles.modalPercentageOff}>OFF</Text>
                  </LinearGradient>
                </View>
              </View>
            ) : (
              <View style={styles.modalHeaderPlaceholder}>
                <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.modalIconCircle}>
                  <Ionicons name="pricetag-outline" size={35} color="#000" />
                </LinearGradient>
              </View>
            )}

            <View style={styles.modalTitleSection}>
              <Text style={styles.modalTitle}>{item?.title}</Text>
              <Text style={styles.modalSubtitle}>{item?.description}</Text>
            </View>

            <View style={styles.stepsWrapper}>
              <Text style={styles.stepsHeader}>HOW TO REDEEM</Text>

              {steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumberContainer}>
                    <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </LinearGradient>
                    {index < steps.length - 1 && <View style={styles.stepLine} />}
                  </View>

                  <View style={styles.stepContentBox}>
                    <Ionicons
                      name={step.icon}
                      size={18}
                      color="#FFD700"
                      style={styles.stepContentIcon}
                    />
                    <View style={styles.stepTextContainer}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDescription}>{step.description}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.closeModalButton} onPress={onClose} activeOpacity={0.85}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.closeModalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.closeModalText}>Got It!</Text>
                <Ionicons name="checkmark-circle" size={20} color="#000" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const SkeletonLoader = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 650,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  const ShimmerBlock = ({ style }) => (
    <View style={[style, styles.shimmerBase]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 80,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />

      <View style={styles.skeletonHeader}>
        <ShimmerBlock style={{ width: 36, height: 36, borderRadius: 18 }} />
        <ShimmerBlock style={{ width: 140, height: 22, borderRadius: 11 }} />
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.listContainer}>
        <View style={styles.skeletonStatsRow}>
          <ShimmerBlock style={{ flex: 1, height: 80, borderRadius: 20 }} />
          <View style={{ width: 12 }} />
          <ShimmerBlock style={{ flex: 1, height: 80, borderRadius: 20 }} />
        </View>

        {[1, 2].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <ShimmerBlock style={styles.skeletonFullCard} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

const EmptyState = ({ navigation }) => {
  const scale = useRef(new Animated.Value(0.97)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.emptyState, { opacity, transform: [{ scale }] }]}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient colors={['#fff', '#f5f5f5']} style={styles.emptyIconGradient}>
          <MaterialCommunityIcons name="ticket-percent-outline" size={55} color="#FFD700" />
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
          colors={['#FFD700', '#FFA500']}
          style={styles.exploreButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="compass" size={18} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.exploreButtonText}>Explore Offers</Text>
          <Ionicons name="arrow-forward" size={18} color="#000" style={{ marginLeft: 8 }} />
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

  const headerSlide = useRef(new Animated.Value(-14)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  const loadDiscounts = useCallback(
    async (isRefresh = false) => {
      const loadStart = Date.now();

      if (!isRefresh) {
        setLoading(true);
      }

      try {
        const fetchPromise = Promise.all([
          api.get('/offers/claimed', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get('/offers/my-total-savings', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const minDelayPromise = new Promise((resolve) =>
          setTimeout(resolve, isRefresh ? 120 : 160)
        );

        const [[offersRes, savingsRes]] = await Promise.all([fetchPromise, minDelayPromise]);

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
      } catch (err) {
        console.log('Error loading discounts:', err?.message || err);
        setClaimedOffers([]);
        setTotalSaved(0);
      } finally {
        const elapsed = Date.now() - loadStart;
        const remaining = Math.max(0, (isRefresh ? 120 : 160) - elapsed);

        setTimeout(() => {
          setLoading(false);
          setRefreshing(false);
        }, remaining);
      }
    },
    [token]
  );

  useEffect(() => {
    loadDiscounts(false);
  }, [loadDiscounts]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(headerSlide, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, headerFade, headerSlide]);

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

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Profile');
  };

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />

      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerSlide }],
            opacity: headerFade,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonInner}>
            <Ionicons name="chevron-back" size={22} color="#FFD700" />
          </View>
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>My Discounts</Text>
        </View>

        <View style={styles.headerSpacer} />
      </Animated.View>

      <FlatList
        data={claimedOffers}
        renderItem={({ item, index }) => (
          <DiscountCard item={item} index={index} onUseNow={handleUseNow} />
        )}
        keyExtractor={(item, index) => item._id?.toString() || `${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFD700"
            colors={['#FFD700']}
            progressBackgroundColor="#fff"
          />
        }
        ListHeaderComponent={
          <View style={styles.statsContainer}>
            <AnimatedStatCard
              title="Active Discounts"
              value={claimedOffers.length}
              icon="pricetags"
              IconComponent={Ionicons}
              delay={0}
            />
            <AnimatedStatCard
              title="PKR Saved"
              value={totalSaved?.toFixed(0) || 0}
              icon="piggy-bank"
              IconComponent={MaterialCommunityIcons}
              delay={70}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FB',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 40,
  },

  listContainer: {
    padding: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },

  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statCardInner: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 75,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  statIconContainer: {
    marginRight: 12,
  },
  statIconGradient: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  discountCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    height: 200,
  },
  cardTouchable: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '78%',
  },
  percentageBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  percentageBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  percentageText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardContentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 45,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 17,
    marginBottom: 8,
  },
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapText: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '600',
  },
  categoryTagContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  categoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

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
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  exploreButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  exploreButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exploreButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalScrollContent: {
    paddingBottom: 34,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  modalImageContainer: {
    height: 200,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  modalHeaderPlaceholder: {
    height: 130,
    marginHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginTop: 10,
  },
  modalPercentageBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  modalBadgeGradient: {
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPercentageText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
  },
  modalPercentageOff: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalIconCircle: {
    width: 75,
    height: 75,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  modalTitleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  stepsWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  stepsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 68,
  },
  stepNumberContainer: {
    alignItems: 'center',
    marginRight: 12,
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
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  stepLine: {
    width: 1.5,
    flex: 1,
    minHeight: 14,
    backgroundColor: 'rgba(255,215,0,0.3)',
    marginTop: 4,
  },
  stepContentBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8f9fb',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 16,
  },
  closeModalButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  closeModalGradient: {
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },

  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FB',
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  skeletonCard: {
    height: 200,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  skeletonFullCard: {
    flex: 1,
    borderRadius: 20,
  },
  shimmerBase: {
    backgroundColor: '#E8ECF1',
    overflow: 'hidden',
  },
});