import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  ActivityIndicator,
  StatusBar,
  Animated,
  Platform,
  RefreshControl,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

// ==========================================
// SKELETON LOADER COMPONENT
// ==========================================
const CareerSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const ShimmerBlock = ({ style }) => {
    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-200, 200],
    });

    return (
      <View style={[style, { overflow: 'hidden', backgroundColor: '#F1F5F9' }]}>
        <Animated.View style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
        }}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Header Skeleton */}
        <View style={{ marginTop: 25, marginBottom: 50 }}>
          <ShimmerBlock style={{ width: 140, height: 16, borderRadius: 8, marginBottom: 12 }} />
          <ShimmerBlock style={{ width: 200, height: 36, borderRadius: 12 }} />
        </View>

        {/* Nav Grid Skeleton */}
        <View style={{ flexDirection: 'row', gap: 15, marginBottom: 30 }}>
          <View style={{ flex: 1, height: 150, borderRadius: 24 }}>
            <ShimmerBlock style={{ width: '100%', height: '100%', borderRadius: 24 }} />
          </View>
          <View style={{ flex: 1, height: 150, borderRadius: 24 }}>
            <ShimmerBlock style={{ width: '100%', height: '100%', borderRadius: 24 }} />
          </View>
        </View>

        {/* Banner Skeleton */}
        <View style={{ marginBottom: 30 }}>
          <ShimmerBlock style={{ width: '100%', height: 120, borderRadius: 24 }} />
        </View>

        {/* Jobs Skeleton */}
        <ShimmerBlock style={{ width: 160, height: 20, borderRadius: 10, marginBottom: 15 }} />
        {[1, 2, 3].map((item) => (
          <ShimmerBlock 
            key={item}
            style={{ width: '100%', height: 80, borderRadius: 20, marginBottom: 12 }} 
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

// ==========================================
// ANIMATED PARTICLE BACKGROUND
// ==========================================
const ParticleBackground = () => {
  const particles = useRef([...Array(20)].map(() => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 4 + 2,
    opacity: new Animated.Value(0),
    duration: 3000 + Math.random() * 5000,
    delay: Math.random() * 4000,
    color: Math.random() > 0.5 ? '#1e3a8a' : '#000000',
  }))).current;

  useEffect(() => {
    particles.forEach(particle => {
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
  }, []);

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

// ==========================================
// ANIMATED CARD COMPONENT
// ==========================================
const AnimatedCard = ({ children, style, delay = 0, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[
      { opacity: opacityAnim, transform: [{ scale: scaleAnim }, { translateY }] },
      style
    ]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ==========================================
// MAIN CAREER HUB COMPONENT
// ==========================================
const CareerHub = ({ navigation }) => {
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Animation refs
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const bannerPulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  
  // Skeleton timer
  const skeletonTimer = useRef(null);

  useEffect(() => {
    // Continuous banner pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bannerPulse, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bannerPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Continuous glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.5,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
    };
  }, []);

  const fetchPreviewData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }

      // Show skeleton after 800ms if still loading
      if (!isRefresh && !dataLoaded) {
        skeletonTimer.current = setTimeout(() => {
          setShowSkeleton(true);
        }, 800);
      }

      const jobRes = await axios.get("https://the-deft-crew-production.up.railway.app/api/admin/jobs/public");
      
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
      
      setRecentJobs(jobRes.data.slice(0, 3));
      setDataLoaded(true);
      setShowSkeleton(false);
      setError(null);

      if (!isRefresh) {
        startEntranceAnimations();
      }
    } catch (err) {
      console.log("Error fetching preview:", err);
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
      setError("Failed to load opportunities. Please try again.");
      setShowSkeleton(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dataLoaded]);

  useEffect(() => {
    fetchPreviewData();
  }, []);

  const startEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchPreviewData(true);
  };

  const handleRetry = () => {
    setError(null);
    fetchPreviewData();
  };

  const handleCardPress = (screen) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen);
  };

  // Show skeleton loader
  if (showSkeleton && !dataLoaded) {
    return <CareerSkeleton />;
  }

  // Show error state
  if (error && !dataLoaded) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <MaterialCommunityIcons name="cloud-off-outline" size={64} color="#94A3B8" />
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <LinearGradient
            colors={['#1e3a8a', '#2563eb']}
            style={styles.retryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="refresh" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <ParticleBackground />
      
      {/* Background Glow */}
      <Animated.View style={[styles.bgGlow, { opacity: glowOpacity }]} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
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
        {/* Animated Header */}
        <Animated.View style={[
          styles.header,
          {
            opacity: headerFade,
            transform: [{ translateY: headerSlide }]
          }
        ]}>
          <View style={styles.headerBadge}>
            
              <Text style={styles.headerBadgeText}>tdc<Text style={{color:"#f9c349"}}>.</Text></Text>
            
          </View>
          <Text style={styles.welcomeText}>Welcome to </Text>
          <Text style={styles.mainTitle}>
            Career<Text style={styles.titleAccent}>Hub</Text>
          </Text>
          <Text style={styles.subtitle}>
            Discover opportunities that match your ambition
          </Text>
        </Animated.View>

        {/* Navigation Grid */}
        <View style={styles.navGrid}>
          <AnimatedCard 
            style={[styles.bigCardWrapper]}
            delay={200}
            onPress={() => handleCardPress('Career')}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.bigCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.iconCircle, styles.iconBlue]}>
                <LinearGradient
                  colors={['#f9c349', '#f9c349']}
                  style={styles.iconGradient}
                >
                  <MaterialCommunityIcons name="briefcase-search" size={24} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={styles.cardTitle}>Find Jobs</Text>
              <Text style={styles.cardSub}>Browse 50+ Roles</Text>
              <View style={styles.cardAccent}>
                <Ionicons name="trending-up" size={16} color="#1e3a8a" />
                <Text style={styles.cardAccentText}>Active Hiring</Text>
              </View>
            </LinearGradient>
          </AnimatedCard>

          <AnimatedCard 
            style={[styles.bigCardWrapper]}
            delay={300}
            onPress={() => handleCardPress('Exchange')}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.bigCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.iconCircle, styles.iconBlack]}>
                <LinearGradient
                  colors={['#1a1a1a', '#2d2d2d']}
                  style={styles.iconGradient}
                >
                  <FontAwesome5 name="globe-americas" size={20} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={styles.cardTitle}>Study Abroad</Text>
              <Text style={styles.cardSub}>Global Programs</Text>
              <View style={styles.cardAccent}>
                <Ionicons name="airplane" size={16} color="#000" />
                <Text style={styles.cardAccentText}>Explore Now</Text>
              </View>
            </LinearGradient>
          </AnimatedCard>
        </View>

        {/* Featured Banner */}
        <Animated.View style={{ marginBottom: 30 }}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Featured Program</Text>
            </View>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>HOT</Text>
            </View>
          </View>
          
          <Animated.View style={{ transform: [{ scale: bannerPulse }] }}>
            <TouchableOpacity 
              style={styles.featuredBanner} 
              onPress={() => handleCardPress('Exchange')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#000000', '#1a1a2e', '#000000']}
                style={styles.bannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.bannerOverlay}>
                  {[...Array(5)].map((_, i) => (
                    <View key={i} style={[styles.bannerCircle, { 
                      width: 100 + (i * 50), 
                      height: 100 + (i * 50),
                      opacity: 0.05 - (i * 0.01)
                    }]} />
                  ))}
                </View>
                
                <View style={styles.bannerContent}>
                  <View style={styles.tag}>
                    <LinearGradient
                      colors={['#f9c349', '#f9c349']}
                      style={styles.tagGradient}
                    >
                      <Ionicons name="earth" size={12} color="#000" style={{ marginRight: 4 }} />
                      <Text style={styles.tagText}>GLOBAL</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.bannerTitle}>Erasmus+</Text>
                  <Text style={styles.bannerSub}>Study in Europe with full scholarship opportunities</Text>
                </View>
                
                <View style={styles.bannerIcon}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.bannerIconCircle}
                  >
                    <Ionicons name="chevron-forward-circle" size={32} color="#FFF" />
                  </LinearGradient>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Recent Opportunities */}
        <Animated.View style={{ opacity: dataLoaded ? 1 : 0 }}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: '#f9c349' }]} />
              <Text style={styles.sectionTitle}>Recent Opportunities</Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => handleCardPress('Career')}
            >
              <Text style={styles.seeAll}>See All</Text>
              
            </TouchableOpacity>
          </View>

          {loading && !dataLoaded ? (
            <ActivityIndicator color="#f9c349" style={{ marginTop: 20 }} />
          ) : recentJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="briefcase-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No opportunities available yet</Text>
              <Text style={styles.emptySubText}>Check back soon for new positions</Text>
            </View>
          ) : (
            <View style={styles.recentList}>
              {recentJobs.map((job, index) => (
                <AnimatedCard
                  key={job._id || index}
                  delay={500 + (index * 100)}
                  onPress={() => handleCardPress('Career')}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F8FAFC']}
                    style={styles.recentJobCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.jobLeft}>
                      <View style={[styles.jobIconBox, { backgroundColor: index === 0 ? '#1e3a8a15' : index === 1 ? '#00000010' : '#10b98115' }]}>
                        <MaterialCommunityIcons 
                          name={index === 0 ? 'briefcase' : index === 1 ? 'code-tags' : 'chart-line'} 
                          size={20} 
                          color={index === 0 ? '#f9c349' : index === 1 ? '#000' : '#10b981'} 
                        />
                      </View>
                      <View style={styles.jobInfo}>
                        <Text style={styles.jobTitleText} numberOfLines={1}>{job.title}</Text>
                        <Text style={styles.jobMetaText} numberOfLines={1}>
                          {job.department} • {job.location}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.jobAction}>
                      <Text style={styles.salaryText}>
                        {job.salary || "Competitive"}
                      </Text>
                      <View style={styles.jobArrow}>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                      </View>
                    </View>
                  </LinearGradient>
                </AnimatedCard>
              ))}
            </View>
          )}
        </Animated.View>

        
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' ,
    paddingBottom:20
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    
  },
  scrollView: {
    flex: 1,
  },

  // Background
  bgGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    backgroundColor: '#f9c349',
    borderRadius: 150,
    opacity: 0.05,
  },
  particle: {
    position: 'absolute',
    borderRadius: 50,
  },

  // Header
  header: { 
    marginTop: Platform.OS === 'android' ? 30 : 15, 
    marginBottom: 35,
    paddingHorizontal: 20,
  },
  headerBadge: {
    marginBottom: 15,
    alignSelf: 'flex-start',
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerBadgeText: {
    color: '#0000',
    fontWeight: '900',
    fontSize: 26,
    letterSpacing: 2,
  },
  welcomeText: { 
    fontSize: 14, 
    color: '#64748B', 
    fontWeight: '600', 
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  mainTitle: { 
    fontSize: 36, 
    fontWeight: '800', 
    color: '#0F172A',
    letterSpacing: -1,
  },
  titleAccent: {
    color: '#f9c349',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },

  // Navigation Grid
  navGrid: { 
    flexDirection: 'row', 
    gap: 15, 
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  bigCardWrapper: {
    flex: 1,
  },
  bigCard: { 
    borderRadius: 24, 
    padding: 20, 
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 12,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#1E293B' 
  },
  cardSub: { 
    fontSize: 12, 
    color: '#64748B', 
    marginTop: 4 
  },
  cardAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardAccentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },

  // Section Header
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e3a8a',
    marginRight: 10,
  },
  sectionTitle: { 
    fontSize: 19, 
    fontWeight: '800', 
    color: '#0F172A' 
  },
  sectionBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionBadgeText: {
    color: '#f9c349',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAll: { 
    color: '#1e3a8a', 
    fontWeight: '700', 
    fontSize: 14 
  },

  // Featured Banner
  featuredBanner: { 
    marginHorizontal: 20,
    borderRadius: 24, 
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  bannerGradient: {
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerCircle: {
    position: 'absolute',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bannerContent: { 
    flex: 1 
  },
  tag: { 
    alignSelf: 'flex-start', 
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tagGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { 
    color: '#000', 
    fontSize: 10, 
    fontWeight: '900',
    letterSpacing: 1,
  },
  bannerTitle: { 
    color: '#FFF', 
    fontSize: 28, 
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bannerSub: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: 13, 
    marginTop: 6,
    lineHeight: 18,
  },
  bannerIcon: {
    marginLeft: 15,
  },
  bannerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Recent Jobs
  recentList: { 
    gap: 12, 
    paddingHorizontal: 20,
  },
  recentJobCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 18, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  jobLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  jobInfo: { 
    flex: 1 
  },
  jobTitleText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1E293B' 
  },
  jobMetaText: { 
    fontSize: 13, 
    color: '#94A3B8', 
    marginTop: 3 
  },
  jobAction: { 
    alignItems: 'flex-end' 
  },
  salaryText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#000000', 
    marginBottom: 6 
  },
  jobArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 30,
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
  },

  // Loading & Error
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default CareerHub;