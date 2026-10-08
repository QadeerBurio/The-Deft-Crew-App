// app/src/screens/StudentDashboard.js — with engagement sorted indicators (all 4 cards)
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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

// 🆕 engagement
import FeatureDot from '../engagement/components/FeatureDot';
import { useMissions } from '../engagement/hooks/useMissions';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

// ─── Particle Background ──────────────────────────────────────────────
const ParticleBackground = () => {
  const particles = useRef(
    [...Array(20)].map(() => ({
      x: Math.random() * width,
      y: Math.random() * 900,
      size: Math.random() * 6 + 2,
      opacity: new Animated.Value(0),
      duration: 4000 + Math.random() * 4000,
      delay: Math.random() * 3000,
      color: ['#f9c349', '#6366f1', '#a855f7', '#f43f5e', '#10b981', '#06b6d4', '#fb923c'][
        Math.floor(Math.random() * 7)
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

// ─── Enhanced Skeleton with Shimmer ──────────────────────────────────
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
const AnimatedGridCard = ({ item, index, navigation, missionKey, sorted }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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

  const cardHeight = item.size === 'large' ? 230 : 180;

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
          if (item.routeName === 'ResumeDashboard') {
            navigation.navigate('Home', { screen: 'Resume' });
          } else {
            navigation.navigate(item.routeName);
          }
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.whiteCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            {/* 🆕 icon circle with mood-face dot on top-right */}
            <View style={styles.iconCircleWrap}>
              <LinearGradient
                colors={item.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <MaterialCommunityIcons name={item.icon} size={24} color="#FFF" />
              </LinearGradient>

              {missionKey && (
                <FeatureDot missionKey={missionKey} sorted={sorted} />
              )}
            </View>

            <View style={styles.cardNumberBadge}>
              <Text style={styles.cardNumberText}>{item.number}</Text>
            </View>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardMainText}>{item.name}</Text>
            <Text style={styles.cardSubText}>{item.sub}</Text>
          </View>

          <View style={styles.plusIcon}>
            <LinearGradient
              colors={item.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.plusGradient}
            >
              <MaterialCommunityIcons name="arrow-top-right" size={16} color="#FFF" />
            </LinearGradient>
          </View>

          <View style={styles.cardDecorLine}>
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
const StudentDashboard = () => {
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

  // 🆕 Feature mapping — ALL 4 cards now show a dot
  const getMissionKey = (routeName) => {
    if (routeName === 'ResumeDashboard') return 'resume';
    if (routeName === 'Dashboard') return 'skillshare';   // SkillsShare
    if (routeName === 'Career') return 'jobs';
    if (routeName === 'Exchange') return 'scholarship';   // Scholarship Events
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
      name: 'Resume',
      routeName: 'ResumeDashboard',
      icon: 'file-document-edit',
      sub: 'Builder & Templates',
      colors: ['#06b6d4', '#3b82f6'],
      size: 'large',
    },
    {
      id: 2,
      number: '02',
      name: 'SkillsShare',
      routeName: 'Dashboard',
      icon: 'brain',
      sub: 'tdc. Mastery',
      colors: ['#6366f1', '#a855f7'],
      size: 'small',
    },
    {
      id: 3,
      number: '03',
      name: 'Jobs',
      routeName: 'Career',
      icon: 'briefcase-variant',
      sub: 'Careers & Hiring',
      colors: ['#f9c349', '#f59e0b'],
      size: 'small',
    },
    {
      id: 4,
      number: '04',
      name: 'Scholarship Events',
      routeName: 'Exchange',
      icon: 'calendar-star',
      sub: 'Meetups & Conferences',
      colors: ['#f43f5e', '#fb923c'],
      size: 'large',
    },
  ];

  if (loading && showSkeleton) return <DashboardSkeleton />;

  // Same routes as the old cards (resume opens inside the Home stack)
  const go = (routeName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (routeName === 'ResumeDashboard') {
      navigation.navigate('Home', { screen: 'Resume' });
    } else {
      navigation.navigate(routeName);
    }
  };
  const moodFor = (routeName) => {
    const missionKey = getMissionKey(routeName);
    return { missionKey, sorted: !!missionKey && sortedFeatureIds.has(missionKey) };
  };
  const resume = moodFor('ResumeDashboard');
  const jobs = moodFor('Career');
  const skills = moodFor('Dashboard');
  const scholar = moodFor('Exchange');

  const Module = ({ routeName, icon, title, sub, mood }) => (
    <PressScale
      onPress={() => go(routeName)}
      containerStyle={styles.tileWrap}
      style={styles.tile}
      accessibilityLabel={`${title}, ${sub}`}
    >
      <View style={styles.tileIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={T.ink} />
        {mood.missionKey && <FeatureDot missionKey={mood.missionKey} sorted={mood.sorted} />}
      </View>
      <View>
        <Text style={styles.tileTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {title}
          <Text style={{ color: T.yellow }}>.</Text>
        </Text>
        <Text style={styles.tileSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>{sub}</Text>
      </View>
    </PressScale>
  );

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
            <Text style={styles.kicker} maxFontSizeMultiplier={MAX_FONT_SCALE}>career dashboard</Text>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
              campus<Text style={{ color: T.yellow }}>.</Text>
            </Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>from campus to career.</Text>
          </Animated.View>

          <Animated.View style={{ opacity: sectionFade }}>
            {/* Resume (dark) */}
            <View style={styles.section}>
              <PressScale onPress={() => go('ResumeDashboard')} style={styles.hero} accessibilityLabel="resume builder">
                <View style={styles.heroIcon}>
                  <MaterialCommunityIcons name="file-document-edit-outline" size={26} color={T.yellow} />
                  {resume.missionKey && <FeatureDot missionKey={resume.missionKey} sorted={resume.sorted} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroKicker} maxFontSizeMultiplier={MAX_FONT_SCALE}>resume</Text>
                  <Text style={styles.heroTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>make yours ats ready.</Text>
                  <Text style={styles.heroLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>builder, templates and analytics.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={T.onInkMuted} />
              </PressScale>
            </View>

            {/* Modules */}
            <View style={styles.tiles}>
              <Module routeName="Career" icon="briefcase-variant-outline" title="jobs" sub="careers and hiring" mood={jobs} />
              <Module routeName="Dashboard" icon="swap-horizontal" title="skillsshare" sub="swap or teach a skill" mood={skills} />
            </View>
          </Animated.View>

          {/* Scholarships & meetups */}
          <Animated.View
            style={[styles.section, { paddingTop: 10, opacity: footerOpacity, transform: [{ translateY: footerSlide }] }]}
          >
            <PressScale
              onPress={() => go('Exchange')}
              style={styles.row}
              accessibilityLabel="scholarships, meetups and conferences"
            >
              <View style={[styles.tileIcon, { backgroundColor: T.ink }]}>
                <MaterialCommunityIcons name="calendar-star" size={22} color={T.yellow} />
                {scholar.missionKey && <FeatureDot missionKey={scholar.missionKey} sorted={scholar.sorted} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>scholarships & meetups</Text>
                <Text style={styles.tileSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>career fairs and scholarship events</Text>
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
  particle: { position: 'absolute', borderRadius: 50 },

  header: { paddingHorizontal: 20, paddingTop: 22 },
  kicker: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted },
  title: { fontFamily: F.heading, fontSize: 32, letterSpacing: -1, color: T.ink, marginTop: 2 },
  subtitle: { fontFamily: F.body, fontSize: 14, color: T.textMuted, marginTop: 2 },

  section: { paddingHorizontal: 16, paddingTop: 16 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 26,
    backgroundColor: T.ink,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: { fontFamily: F.body, fontSize: 12, color: T.onInkMuted },
  heroTitle: { fontFamily: F.bodyBold, fontSize: 16, color: T.white, marginTop: 2 },
  heroLine: { fontFamily: F.body, fontSize: 13, color: T.onInkMuted, marginTop: 2 },

  tiles: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  tileWrap: { flex: 1 },
  tile: {
    minHeight: 150,
    borderRadius: 24,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: T.sand,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tileTitle: { fontFamily: F.heading, fontSize: 18, color: T.ink },
  tileSub: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted, marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: T.yellowSoft,
  },
  rowTitle: { fontFamily: F.bodyBold, fontSize: 15, color: T.ink },

  // skeleton (DashboardSkeleton)
  sectionLabelContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 20, gap: 12 },
  sectionLine: { flex: 1, height: 1, backgroundColor: T.line },
  gridContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 20, marginTop: 20 },
  gridColumn: { flex: 1 },
});

export default StudentDashboard;
