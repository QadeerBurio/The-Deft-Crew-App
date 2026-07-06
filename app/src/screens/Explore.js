import React, { useState, useEffect, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons, FontAwesome5, Feather, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

// ─── Particle Background ──────────────────────────────────────────────
const ParticleBackground = () => {
  const particles = useRef(
    [...Array(25)].map(() => ({
      x: Math.random() * width,
      y: Math.random() * 900,
      size: Math.random() * 6 + 2,
      opacity: new Animated.Value(0),
      duration: 4000 + Math.random() * 4000,
      delay: Math.random() * 3000,
      color: ['#f9c349', '#6366f1', '#a855f7', '#f43f5e', '#10b981', '#06b6d4', '#fb923c', '#8b5cf6', '#ec4899'][
        Math.floor(Math.random() * 9)
      ],
    }))
  ).current;

  useEffect(() => {
    particles.forEach((particle) => {
      const animate = () => {
        Animated.sequence([
          Animated.delay(particle.delay),
          Animated.timing(particle.opacity, {
            toValue: 0.12,
            duration: particle.duration,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: particle.duration,
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };
      animate();
    });
  }, [particles]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
              backgroundColor: particle.color,
            },
          ]}
        />
      ))}
    </View>
  );
};

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
      <View style={[style, { overflow: 'hidden', backgroundColor: '#F1F5F9' }]}>
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
const AnimatedGridCard = ({ item, index, navigation }) => {
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

  // Render icon function
  const renderIcon = () => {
    // If iconComponent is provided as React element
    if (item.iconComponent) {
      return item.iconComponent;
    }
    // Fallback to MaterialCommunityIcons
    return <MaterialCommunityIcons name={item.icon || 'star'} size={24} color="#FFF" />;
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
            <LinearGradient
              colors={item.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.iconCircle, item.iconCircleStyle]}
            >
              {renderIcon()}
            </LinearGradient>
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
              <MaterialCommunityIcons name="arrow-top-right" size={16} color="#FFF" />
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

// ─── StudentDashboard ──────────────────────────────────────────────────
const Explore = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      iconComponent: <FontAwesome5 name="tags" size={24} color="#FFF" />,
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
      iconComponent: <Ionicons name="calendar" size={24} color="#FFF" />,
    },
    {
      id: 3,
      number: '03',
      name: 'Travel & Explore',
      routeName: 'Travelling',
      sub: 'Adventure Awaits',
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
      iconComponent: <MaterialIcons name="travel-explore" size={24} color="#FFF" />,
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
      iconComponent: <MaterialCommunityIcons name="account-multiple" size={24} color="#FFF" />,
    },
  ];

  if (loading && showSkeleton) return <DashboardSkeleton />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ParticleBackground />
      <Animated.View style={[styles.glowTop, { opacity: glowTopOpacity }]} />
      <Animated.View style={[styles.glowBottom, { opacity: glowBottomOpacity }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#f9c349"
              colors={['#f9c349']}
              progressViewOffset={20}
            />
          }
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              { opacity: headerOpacity, transform: [{ translateY: headerSlide }] },
            ]}
          >
            <View>
              <View style={styles.brandRow}>
                <Text style={styles.brandTitle}>tdc<Text style={{color:'#f9c349'}}>.</Text></Text>
              </View>
              <View style={styles.subBadge}>
                <View style={styles.subBadgeDot} />
                <Text style={styles.brandSubtitle}>STUDENT HUB</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>🎓 STUDENT</Text>
              </View>
            </View>
          </Animated.View>

          {/* Welcome Message */}
          <Animated.View style={[styles.welcomeContainer, { opacity: sectionFade }]}>
            <Text style={styles.welcomeTitle}>Welcome to Your Hub! 🚀</Text>
            <Text style={styles.welcomeSub}>Explore exclusive features designed just for you</Text>
          </Animated.View>

          {/* Section Label */}
          <Animated.View
            style={[styles.sectionLabelContainer, { opacity: sectionFade }]}
          >
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>EXPLORE FEATURES</Text>
            <View style={styles.sectionLine} />
          </Animated.View>

          {/* Grid */}
          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              {menuItems
                .filter((_, i) => i % 2 === 0)
                .map((item, index) => (
                  <AnimatedGridCard
                    key={item.id}
                    item={item}
                    index={index * 2}
                    navigation={navigation}
                  />
                ))}
            </View>
            <View style={[styles.gridColumn, { marginTop: 25 }]}>
              {menuItems
                .filter((_, i) => i % 2 !== 0)
                .map((item, index) => (
                  <AnimatedGridCard
                    key={item.id}
                    item={item}
                    index={index * 2 + 1}
                    navigation={navigation}
                  />
                ))}
            </View>
          </View>

          {/* Quick Stats */}
          <Animated.View
            style={[
              styles.statsContainer,
              { opacity: footerOpacity, transform: [{ translateY: footerSlide }] },
            ]}
          >
            <View style={styles.statItem}>
              <LinearGradient
                colors={['rgba(249, 195, 73, 0.12)', 'rgba(245, 158, 11, 0.12)']}
                style={styles.statIconBox}
              >
                <FontAwesome5 name="tags" size={18} color="#f9c349" />
              </LinearGradient>
              <Text style={styles.statNumber}>100+</Text>
              <Text style={styles.statLabel}>Discounts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient
                colors={['rgba(236, 72, 153, 0.12)', 'rgba(244, 63, 94, 0.12)']}
                style={styles.statIconBox}
              >
                <Ionicons name="calendar" size={18} color="#ec4899" />
              </LinearGradient>
              <Text style={styles.statNumber}>25+</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
           
            
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.12)', 'rgba(109, 40, 217, 0.12)']}
                style={styles.statIconBox}
              >
                <MaterialCommunityIcons name="account-multiple" size={18} color="#8b5cf6" />
              </LinearGradient>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  particle: { position: 'absolute', borderRadius: 50 },

  // Glow effects
  glowTop: {
    position: 'absolute',
    top: -150,
    right: -50,
    width: 400,
    height: 350,
    borderRadius: 200,
    backgroundColor: '#f9c349',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 400,
    height: 370,
    borderRadius: 200,
    backgroundColor: '#f9c349',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 18 : 12,
    marginBottom: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'baseline' },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1.5,
  },
  subBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  subBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f9c349',
    marginRight: 8,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },

  // Welcome
  welcomeContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
    marginTop: 4,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  welcomeSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },

  // Section
  sectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginHorizontal: 15,
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridColumn: { width: COLUMN_WIDTH },
  gridItem: { width: '100%', marginBottom: 20 },
  cardGlow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: -8,
    bottom: -8,
    borderRadius: 32,
    opacity: 0.1,
    zIndex: -1,
  },
  whiteCard: {
    flex: 1,
    borderRadius: 28,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  cardDecorLine: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 2.5,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  decorLineInner: { width: '100%', height: '100%' },

  // Card Content
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardNumberBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  cardNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  cardInfo: { flex: 1, justifyContent: 'flex-end' },
  cardMainText: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardSubText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  plusIcon: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  plusGradient: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Footer
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 5,
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  statDivider: { width: 1, height: 45, backgroundColor: '#F1F5F9' },
});

export default Explore;