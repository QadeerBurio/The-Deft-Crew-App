// app/src/screens/Explore.js — with engagement sorted indicators
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
  Easing,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from "../ui/FlatGradient"; // flat fills (design system)
import PressScale from "../ui/PressScale";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { MaterialCommunityIcons, Ionicons, FontAwesome5, Feather, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

// 🆕 engagement
import FeatureDot from '../engagement/components/FeatureDot';
import { useMissions } from '../engagement/hooks/useMissions';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

// ─── Skeleton ──────────────────────────────────────────────────────────
const DashboardSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const ShimmerBlock = ({ style }) => {
    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-120, 120],
    });

    return (
      <View style={[style, { overflow: 'hidden', backgroundColor: T.sand }]}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 80,
            transform: [{ translateX }],
          }}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.7)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.header}>
            <View>
              <ShimmerBlock style={{ width: 140, height: 36, borderRadius: 12, marginBottom: 8 }} />
              <ShimmerBlock style={{ width: 100, height: 14, borderRadius: 7 }} />
            </View>
          </View>
          <View style={styles.sectionLabelContainer}>
            <View style={styles.sectionLine} />
            <ShimmerBlock style={{ width: 120, height: 14, borderRadius: 7 }} />
            <View style={styles.sectionLine} />
          </View>
          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <ShimmerBlock style={{ width: '100%', height: 230, borderRadius: 28, marginBottom: 20 }} />
              <ShimmerBlock style={{ width: '100%', height: 180, borderRadius: 28 }} />
            </View>
            <View style={[styles.gridColumn, { marginTop: 25 }]}>
              <ShimmerBlock style={{ width: '100%', height: 180, borderRadius: 28, marginBottom: 20 }} />
              <ShimmerBlock style={{ width: '100%', height: 230, borderRadius: 28 }} />
            </View>
          </View>
          <View style={{ marginHorizontal: 24, marginTop: 5 }}>
            <ShimmerBlock style={{ width: '100%', height: 90, borderRadius: 24 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ─── Animated Grid Card ──────────────────────────────────────────────
// 🆕 Accepts `missionKey` + `sorted` so we render the mood-face dot
const AnimatedGridCard = ({ item, index, navigation, missionKey, sorted }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 60,
        delay: 100 + index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: 100 + index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: 100 + index * 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (item.size === 'large') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    if (item.hasShimmer) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
    Animated.spring(rotateAnim, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
    Animated.spring(rotateAnim, {
      toValue: 0,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-2deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  const cardHeight = item.size === 'large' ? 230 : 180;

  const renderIcon = () => {
    if (item.iconComponent) {
      return item.iconComponent;
    }
    return <MaterialCommunityIcons name={item.icon || 'star'} size={24} color={T.white} />;
  };

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }, { translateY: slideAnim }, { rotate: rotateInterpolate }],
      }}
    >
      {item.size === 'large' && (
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: glowOpacity,
              backgroundColor: item.colors[0],
            },
          ]}
        />
      )}
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.gridItem, { height: cardHeight }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate(item.routeName);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <LinearGradient
          colors={item.gradientColors || ['#FFFFFF', '#F8FAFC']}
          style={[styles.whiteCard, item.cardStyle]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {item.hasShimmer && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                transform: [{ translateX: shimmerTranslate }],
                opacity: 0.3,
              }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          )}

          <View style={styles.cardHeader}>
            {/* 🆕 icon circle with optional mood-face dot on top-right */}
            <View style={styles.iconCircleWrap}>
              <LinearGradient
                colors={item.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.iconCircle, item.iconCircleStyle]}
              >
                {renderIcon()}
              </LinearGradient>

              {missionKey && (
                <FeatureDot missionKey={missionKey} sorted={sorted} />
              )}
            </View>

            <View style={[styles.cardNumberBadge, item.badgeStyle]}>
              <Text style={[styles.cardNumberText, item.badgeTextStyle]}>{item.number}</Text>
            </View>
          </View>

          <View style={styles.cardInfo}>
            <Text style={[styles.cardMainText, item.titleStyle]}>{item.name}</Text>
            <Text style={[styles.cardSubText, item.subStyle]}>{item.sub}</Text>
          </View>

          <View style={[styles.plusIcon, item.plusStyle]}>
            <LinearGradient
              colors={item.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.plusGradient}
            >
              <MaterialCommunityIcons name="arrow-top-right" size={16} color={T.white} />
            </LinearGradient>
          </View>

          <View style={[styles.cardDecorLine, item.decorStyle]}>
            <LinearGradient
              colors={item.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.decorLineInner}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Explore ──────────────────────────────────────────────────────────
const Explore = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 🆕 engagement: read missions + sorted state
  const { missions } = useMissions();

  // 🆕 Map of sorted feature keys → boolean
  const sortedFeatureIds = useMemo(() => {
    if (!missions?.cards) return new Set();
    const s = new Set();
    for (const c of missions.cards) {
      if (c.sorted) s.add(c.feature);
    }
    return s;
  }, [missions?.cards]);

  // 🆕 Feature mapping — all 4 Explore cards
  const getMissionKey = (routeName) => {
    if (routeName === 'Brands') return 'discounts';
    if (routeName === 'Events') return 'events';
    if (routeName === 'Travelling') return 'traveling';
    if (routeName === 'Social') return 'social';
    return null;
  };

  const headerSlide = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const sectionFade = useRef(new Animated.Value(0)).current;
  const footerSlide = useRef(new Animated.Value(16)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const glowTopOpacity = useRef(new Animated.Value(0)).current;
  const glowBottomOpacity = useRef(new Animated.Value(0)).current;
  const skeletonTimer = useRef(null);
  const finishTimer = useRef(null);

  useEffect(() => {
    startLoadingSequence();
    return () => {
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
      if (finishTimer.current) clearTimeout(finishTimer.current);
    };
  }, []);

  const startLoadingSequence = () => {
    setLoading(true);
    setShowSkeleton(false);
    headerSlide.setValue(-20);
    headerOpacity.setValue(0);
    sectionFade.setValue(0);
    footerSlide.setValue(16);
    footerOpacity.setValue(0);
    glowTopOpacity.setValue(0);
    glowBottomOpacity.setValue(0);

    skeletonTimer.current = setTimeout(() => {
      setShowSkeleton(true);
    }, 80);

    finishTimer.current = setTimeout(() => {
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
      setShowSkeleton(false);
      setLoading(false);
      startEntranceAnimations();
    }, 200);
  };

  const startEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowTopOpacity, {
        toValue: 0.2,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glowBottomOpacity, {
        toValue: 0.15,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(80),
      Animated.timing(sectionFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(footerSlide, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      setRefreshing(false);
      startLoadingSequence();
    }, 500);
  };

  const menuItems = [
    {
      id: 1,
      number: '01',
      name: 'Exclusive Discounts',
      routeName: 'Brands',
      sub: 'Student Offers & Deals',
      colors: ['#f9c349', '#f59e0b'],
      gradientColors: ['#FFFBEB', '#FEF3C7'],
      size: 'large',
      hasShimmer: true,
      cardStyle: { borderColor: '#FDE68A' },
      iconCircleStyle: { shadowColor: '#f9c349' },
      badgeStyle: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
      badgeTextStyle: { color: '#D97706' },
      titleStyle: { color: '#92400E' },
      subStyle: { color: '#B45309' },
      plusStyle: { borderColor: '#FDE68A' },
      decorStyle: { left: 20, right: 20 },
      iconComponent: <FontAwesome5 name="tags" size={24} color={T.white} />,
    },
    {
      id: 2,
      number: '02',
      name: 'Events Hub',
      routeName: 'Events',
      sub: 'Campus & Community',
      colors: ['#ec4899', '#f43f5e'],
      gradientColors: ['#FDF2F8', '#FCE7F3'],
      size: 'small',
      hasShimmer: false,
      cardStyle: { borderColor: '#FBCFE8' },
      iconCircleStyle: { shadowColor: '#ec4899' },
      badgeStyle: { borderColor: '#FBCFE8', backgroundColor: '#FDF2F8' },
      badgeTextStyle: { color: '#BE185D' },
      titleStyle: { color: '#831843' },
      subStyle: { color: '#9D174D' },
      plusStyle: { borderColor: '#FBCFE8' },
      decorStyle: { left: 20, right: 20 },
      iconComponent: <Ionicons name="calendar" size={24} color={T.white} />,
    },
    {
      id: 3,
      number: '03',
      name: 'Travel & Explore',
      routeName: 'Travelling',
      sub: 'Adventure ',
      colors: ['#06b6d4', '#0ea5e9'],
      gradientColors: ['#F0F9FF', '#E0F2FE'],
      size: 'small',
      hasShimmer: false,
      cardStyle: { borderColor: '#BAE6FD' },
      iconCircleStyle: { shadowColor: '#06b6d4' },
      badgeStyle: { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' },
      badgeTextStyle: { color: '#0369A1' },
      titleStyle: { color: '#0C4A6E' },
      subStyle: { color: '#075985' },
      plusStyle: { borderColor: '#BAE6FD' },
      decorStyle: { left: 20, right: 20 },
      iconComponent: <MaterialIcons name="travel-explore" size={24} color={T.white} />,
    },
    {
      id: 4,
      number: '04',
      name: 'Social Connect',
      routeName: 'Social',
      sub: 'Network & Collaborate',
      colors: ['#8b5cf6', '#6d28d9'],
      gradientColors: ['#F5F3FF', '#EDE9FE'],
      size: 'large',
      hasShimmer: true,
      cardStyle: { borderColor: '#DDD6FE' },
      iconCircleStyle: { shadowColor: '#8b5cf6' },
      badgeStyle: { borderColor: '#DDD6FE', backgroundColor: '#F5F3FF' },
      badgeTextStyle: { color: '#6D28D9' },
      titleStyle: { color: '#4C1D95' },
      subStyle: { color: '#5B21B6' },
      plusStyle: { borderColor: '#DDD6FE' },
      decorStyle: { left: 20, right: 20 },
      iconComponent: <MaterialCommunityIcons name="account-multiple" size={24} color={T.white} />,
    },
  ];

  if (loading && showSkeleton) return <DashboardSkeleton />;

  const go = (routeName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate(routeName);
  };
  const moodFor = (routeName) => {
    const missionKey = getMissionKey(routeName);
    return { missionKey, sorted: !!missionKey && sortedFeatureIds.has(missionKey) };
  };
  const brands = moodFor('Brands');
  const events = moodFor('Events');
  const travel = moodFor('Travelling');
  const social = moodFor('Social');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={T.ink}
              colors={[T.ink]}
              progressViewOffset={20}
            />
          }
        >
          {/* Header */}
          <Animated.View
            style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}
          >
            <Text style={styles.kicker} maxFontSizeMultiplier={MAX_FONT_SCALE}>student hub</Text>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
              explore<Text style={{ color: T.yellow }}>.</Text>
            </Text>
          </Animated.View>

          <Animated.View style={{ opacity: sectionFade }}>
            {/* Discounts hero */}
            <View style={styles.section}>
              <PressScale
                onPress={() => go('Brands')}
                style={styles.hero}
                accessibilityLabel="exclusive discounts, see brands"
              >
                <View style={styles.heroIconRow}>
                  <View style={styles.heroIcon}>
                    <FontAwesome5 name="tags" size={18} color={T.yellow} />
                    {brands.missionKey && <FeatureDot missionKey={brands.missionKey} sorted={brands.sorted} />}
                  </View>
                </View>
                <Text style={styles.heroKicker} maxFontSizeMultiplier={MAX_FONT_SCALE}>exclusive discounts</Text>
                <Text style={styles.heroTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  always broke<Text style={{ color: T.yellow }}>?</Text>
                </Text>
                <Text style={styles.heroLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>flat student off at partner brands.</Text>
                <View style={styles.heroBtn}>
                  <Text style={styles.heroBtnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>see brands</Text>
                </View>
              </PressScale>
            </View>

            {/* Events + travel tiles */}
            <View style={styles.tiles}>
              <PressScale
                onPress={() => go('Events')}
                containerStyle={styles.tileWrap}
                style={styles.tile}
                accessibilityLabel="events hub, what's on near you"
              >
                <View style={[styles.tileIcon, { backgroundColor: T.sand }]}>
                  <Ionicons name="calendar-outline" size={22} color={T.ink} />
                  {events.missionKey && <FeatureDot missionKey={events.missionKey} sorted={events.sorted} />}
                </View>
                <View>
                  <Text style={styles.tileKicker} maxFontSizeMultiplier={MAX_FONT_SCALE}>events hub</Text>
                  <Text style={styles.tileTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {"what's on near you"}<Text style={{ color: T.yellow }}>.</Text>
                  </Text>
                </View>
              </PressScale>

              <PressScale
                onPress={() => go('Travelling')}
                containerStyle={styles.tileWrap}
                style={[styles.tile, { backgroundColor: T.yellowSoft }]}
                accessibilityLabel="travel, plan trips with ai"
              >
                <View style={[styles.tileIcon, { backgroundColor: T.card }]}>
                  <MaterialIcons name="travel-explore" size={22} color={T.ink} />
                  {travel.missionKey && <FeatureDot missionKey={travel.missionKey} sorted={travel.sorted} />}
                </View>
                <View>
                  <Text style={styles.tileKicker} maxFontSizeMultiplier={MAX_FONT_SCALE}>travel</Text>
                  <Text style={styles.tileTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    plan trips with ai<Text style={{ color: T.ink }}>.</Text>
                  </Text>
                </View>
              </PressScale>
            </View>
          </Animated.View>

          {/* Social row */}
          <Animated.View
            style={[styles.section, { paddingTop: 10, opacity: footerOpacity, transform: [{ translateY: footerSlide }] }]}
          >
            <PressScale
              onPress={() => go('Social')}
              style={styles.row}
              accessibilityLabel="social connect, post, confess, connect"
            >
              <View style={[styles.tileIcon, { backgroundColor: T.sand }]}>
                <MaterialCommunityIcons name="account-multiple-outline" size={22} color={T.ink} />
                {social.missionKey && <FeatureDot missionKey={social.missionKey} sorted={social.sorted} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileKicker} maxFontSizeMultiplier={MAX_FONT_SCALE}>social connect</Text>
                <Text style={styles.tileTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  post, confess, connect<Text style={{ color: T.yellow }}>.</Text>
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
            </PressScale>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },

  // header
  header: { paddingHorizontal: 20, paddingTop: 22 },
  kicker: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted },
  title: { fontFamily: F.heading, fontSize: 32, letterSpacing: -1, color: T.ink, marginTop: 2 },

  section: { paddingHorizontal: 16, paddingTop: 16 },

  // hero (dark)
  hero: {
    minHeight: 176,
    borderRadius: 28,
    backgroundColor: T.ink,
    padding: 20,
    overflow: 'hidden',
  },
  heroIconRow: { flexDirection: 'row', justifyContent: 'flex-end', position: 'absolute', top: 18, right: 18 },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: T.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.yellow },
  heroTitle: { fontFamily: F.heading, fontSize: 28, lineHeight: 30, color: T.white, marginTop: 8, maxWidth: 210 },
  heroLine: { fontFamily: F.body, fontSize: 14, color: T.onInkMuted, marginTop: 6 },
  heroBtn: {
    alignSelf: 'flex-start',
    marginTop: 16,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: T.yellow,
    justifyContent: 'center',
  },
  heroBtnText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink },

  // tiles
  tiles: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  tileWrap: { flex: 1 },
  tile: {
    minHeight: 168,
    borderRadius: 26,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    padding: 16,
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tileKicker: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.textMuted },
  tileTitle: { fontFamily: F.heading, fontSize: 19, lineHeight: 21, color: T.ink, marginTop: 4 },

  // social row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 26,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
  },

  // skeleton (DashboardSkeleton)
  sectionLabelContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 20, gap: 12 },
  sectionLine: { flex: 1, height: 1, backgroundColor: T.line },
  gridContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 20, marginTop: 20 },
  gridColumn: { flex: 1 },
});

export default Explore;
