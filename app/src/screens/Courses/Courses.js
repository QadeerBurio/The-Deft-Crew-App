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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

const ParticleBackground = () => {
  const particles = useRef(
    [...Array(12)].map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 4 + 2,
      opacity: new Animated.Value(0),
      duration: 3500 + Math.random() * 3500,
      delay: Math.random() * 2500,
      color: ['#6366f1', '#a855f7', '#f43f5e', '#10b981', '#06b6d4', '#f59e0b'][
        Math.floor(Math.random() * 6)
      ],
    }))
  ).current;

  useEffect(() => {
    particles.forEach((particle) => {
      const animate = () => {
        Animated.sequence([
          Animated.delay(particle.delay),
          Animated.timing(particle.opacity, {
            toValue: 0.08,
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

const DashboardSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 650,
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
            colors={['transparent', 'rgba(255,255,255,0.75)', 'transparent']}
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
              <ShimmerBlock
                style={{ width: 120, height: 36, borderRadius: 12, marginBottom: 8 }}
              />
              <ShimmerBlock style={{ width: 80, height: 16, borderRadius: 8 }} />
            </View>
            <ShimmerBlock style={{ width: 52, height: 52, borderRadius: 26 }} />
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 35 }}>
            <ShimmerBlock style={{ width: '100%', height: 140, borderRadius: 32 }} />
          </View>

          <ShimmerBlock
            style={{
              width: 100,
              height: 14,
              borderRadius: 7,
              marginHorizontal: 24,
              marginBottom: 20,
            }}
          />

          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <ShimmerBlock
                style={{ width: '100%', height: 220, borderRadius: 28, marginBottom: 20 }}
              />
              <ShimmerBlock style={{ width: '100%', height: 180, borderRadius: 28 }} />
            </View>
            <View style={[styles.gridColumn, { marginTop: 25 }]}>
              <ShimmerBlock
                style={{ width: '100%', height: 180, borderRadius: 28, marginBottom: 20 }}
              />
              <ShimmerBlock style={{ width: '100%', height: 220, borderRadius: 28 }} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const AnimatedGridCard = ({ item, index, navigation }) => {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 220,
        delay: 140 + index * 70,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        delay: 140 + index * 70,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        delay: 140 + index * 70,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacityAnim, scaleAnim, slideAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }, { translateY: slideAnim }, { rotate: rotateInterpolate }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.gridItem, { height: item.size === 'large' ? 220 : 180 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate(item.routeName);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.whiteCard}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={item.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <MaterialCommunityIcons name={item.icon} size={24} color="#FFF" />
            </LinearGradient>
            <View style={styles.cardStatus}>
              <View style={[styles.statusDot, { backgroundColor: item.colors[0] }]} />
            </View>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardMainText}>{item.name}</Text>
            <Text style={styles.cardSubText}>{item.sub}</Text>
          </View>

          <View style={styles.plusIcon}>
            <MaterialCommunityIcons name="arrow-top-right" size={18} color={item.colors[0]} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedHero = ({ navigation }) => {
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 220,
        delay: 100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.015,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacityAnim, pulseAnim, scaleAnim]);

  return (
    <Animated.View
      style={[styles.heroWrapper, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={['#000', '#fff', '#f9c349']}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTagContainer} />
            <Text style={styles.heroTitle}>
              The Deft{'\n'}Crew
            </Text>
            <Text style={styles.heroSubtitle}>Your intelligent workspace companion</Text>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                navigation.navigate('Home');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#f9c349', '#f9c349']}
                style={styles.heroBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.heroBtnText}>Launch App</Text>
                <Ionicons name="rocket" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.heroIconContainer}>
            <MaterialCommunityIcons name="robot-outline" size={90} color="rgba(255,255,255,0.1)" />
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
};

const ModernDashboard = () => {
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
    }, 120);

    finishTimer.current = setTimeout(() => {
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
      setShowSkeleton(false);
      setLoading(false);
      startEntranceAnimations();
    }, 260);
  };

  const startEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(glowTopOpacity, {
        toValue: 0.18,
        duration: 320,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(glowBottomOpacity, {
        toValue: 0.12,
        duration: 360,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(80),
      Animated.timing(sectionFade, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(140),
      Animated.parallel([
        Animated.timing(footerSlide, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setRefreshing(false), 700);
  };

  const menuItems = [
    {
      id: 1,
      name: 'Learning',
      routeName: 'AiSkillsScreen',
      icon: 'brain',
      sub: 'AI Mastery',
      colors: ['#6366f1', '#a855f7'],
      size: 'large',
    },
    {
      id: 2,
      name: 'Events',
      routeName: 'Events',
      icon: 'calendar-star',
      sub: 'Meetups',
      colors: ['#f43f5e', '#fb923c'],
      size: 'small',
    },
    {
      id: 3,
      name: 'Resume',
      routeName: 'ResumeDashboard',
      icon: 'file-document-edit',
      sub: 'Builder',
      colors: ['#06b6d4', '#3b82f6'],
      size: 'small',
    },
    {
      id: 4,
      name: 'Jobs',
      routeName: 'CareerHub',
      icon: 'briefcase-variant',
      sub: 'Careers',
      colors: ['#f9c349', '#f9c349'],
      size: 'large',
    },
  ];

  if (loading && showSkeleton) {
    return <DashboardSkeleton />;
  }

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
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerOpacity,
                transform: [{ translateY: headerSlide }],
              },
            ]}
          >
            <View>
              <View style={styles.brandRow}>
                <Text style={styles.brandTitle}>tdc.</Text>
                <Text style={styles.brandHub}>Hub</Text>
              </View>
              <View style={styles.subBadge}>
                <View style={styles.subBadgeDot} />
                <Text style={styles.brandSubtitle}>DIGITAL WORKSPACE</Text>
              </View>
            </View>
          </Animated.View>

          <AnimatedHero navigation={navigation} />

          <Animated.View style={[styles.sectionLabelContainer, { opacity: sectionFade }]}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>CORE MODULES</Text>
            <View style={styles.sectionLine} />
          </Animated.View>

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

          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: footerOpacity,
                transform: [{ translateY: footerSlide }],
              },
            ]}
          >
            <View style={styles.statItem}>
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.1)', 'rgba(168, 85, 247, 0.1)']}
                style={styles.statIconBox}
              >
                <Ionicons name="people" size={20} color="#6366f1" />
              </LinearGradient>
              <Text style={styles.statNumber}>2.4k</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.1)', 'rgba(52, 211, 153, 0.1)']}
                style={styles.statIconBox}
              >
                <Ionicons name="briefcase" size={20} color="#f9c349" />
              </LinearGradient>
              <Text style={styles.statNumber}>50+</Text>
              <Text style={styles.statLabel}>Jobs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient
                colors={['rgba(244, 63, 94, 0.1)', 'rgba(251, 146, 60, 0.1)']}
                style={styles.statIconBox}
              >
                <Ionicons name="calendar" size={20} color="#f43f5e" />
              </LinearGradient>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  particle: {
    position: 'absolute',
    borderRadius: 50,
  },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 18 : 12,
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1.5,
  },
  brandHub: {
    fontSize: 36,
    fontWeight: '300',
    color: '#64748B',
    letterSpacing: -1.5,
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
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
  heroWrapper: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  heroCard: {
    borderRadius: 32,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  heroContent: {
    zIndex: 2,
  },
  heroTagContainer: {
    marginBottom: 16,
    alignSelf: 'flex-start',
    borderRadius: 10,
    overflow: 'hidden',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
    marginBottom: 8,
    letterSpacing: -1,
  },
  heroSubtitle: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 14,
    marginBottom: 24,
    fontWeight: '500',
  },
  heroBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  heroBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  heroIconContainer: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.4,
  },
  sectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginHorizontal: 15,
  },
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridColumn: {
    width: COLUMN_WIDTH,
  },
  gridItem: {
    width: '100%',
    marginBottom: 20,
  },
  whiteCard: {
    flex: 1,
    borderRadius: 28,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
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
  cardStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconBox: {
    width: 40,
    height: 40,
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
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
  },
});

export default ModernDashboard;