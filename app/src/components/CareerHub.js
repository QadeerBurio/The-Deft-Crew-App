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
  Easing,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

// API Configuration
const API_BASE_URL = 'https://the-deft-crew-production.up.railway.app/api';
const JOBS_PUBLIC_ENDPOINT = `${API_BASE_URL}/jobs/public/all`;

// ─── Animated Particle Background ─────────────────────────────────────
const ParticleBackground = () => {
  const particles = useRef([...Array(35)].map(() => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 4 + 1.5,
    opacity: new Animated.Value(0),
    duration: 2500 + Math.random() * 3500,
    delay: Math.random() * 3000,
    color: ['#f9c349', '#1e3a8a', '#6366f1', '#10b981', '#f43f5e'][Math.floor(Math.random() * 5)],
  }))).current;

  useEffect(() => {
    const animations = particles.map(particle => {
      const animate = () => {
        return Animated.sequence([
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
      return animate();
    });

    return () => {
      animations.forEach(anim => anim && anim.stop());
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
              borderRadius: Math.random() > 0.5 ? 50 : 4,
            },
          ]}
        />
      ))}
    </View>
  );
};

// ─── Animated Card Component ──────────────────────────────────────────
const AnimatedCard = ({ children, style, delay = 0, onPress, scale = 1, fromDirection = 'up' }) => {
  const scaleAnim = useRef(new Animated.Value(fromDirection === 'up' ? 0.85 : 0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(fromDirection === 'up' ? 40 : -40)).current;
  const translateX = useRef(new Animated.Value(fromDirection === 'left' ? 40 : 0)).current;

  useEffect(() => {
    const animations = [
      Animated.spring(scaleAnim, {
        toValue: scale,
        friction: 8,
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
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
    ];

    if (fromDirection === 'left') {
      animations.push(
        Animated.spring(translateX, {
          toValue: 0,
          friction: 8,
          tension: 40,
          delay,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
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
      toValue: scale,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const transform = [{ scale: scaleAnim }, { translateY }];
  if (fromDirection === 'left') {
    transform.push({ translateX });
  }

  return (
    <Animated.View style={[
      { opacity: opacityAnim, transform },
      style
    ]}>
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          {children}
        </TouchableOpacity>
      ) : children}
    </Animated.View>
  );
};

// ─── Enhanced Skeleton Loader ─────────────────────────────────────────
const CareerSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const ShimmerBlock = ({ style, rounded = true }) => {
    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-300, 300],
    });

    return (
      <View style={[
        style, 
        { 
          overflow: 'hidden', 
          backgroundColor: '#E8EDF2',
          borderRadius: rounded ? 12 : 0,
        }
      ]}>
        <Animated.View style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
        }}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.7)', 'transparent']}
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
      <ParticleBackground />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <View style={{ marginTop: 20, marginBottom: 40 }}>
          <ShimmerBlock style={{ width: 100, height: 14, borderRadius: 8, marginBottom: 12 }} />
          <ShimmerBlock style={{ width: 200, height: 36, borderRadius: 12, marginBottom: 8 }} />
          <ShimmerBlock style={{ width: 240, height: 14, borderRadius: 8 }} />
        </View>

        <View style={{ flexDirection: 'row', gap: 15, marginBottom: 30 }}>
          <View style={{ flex: 1, height: 170, borderRadius: 24, overflow: 'hidden' }}>
            <ShimmerBlock style={{ width: '100%', height: '100%', borderRadius: 24 }} />
          </View>
          <View style={{ flex: 1, height: 170, borderRadius: 24, overflow: 'hidden' }}>
            <ShimmerBlock style={{ width: '100%', height: '100%', borderRadius: 24 }} />
          </View>
        </View>

        <View style={{ marginBottom: 30 }}>
          <ShimmerBlock style={{ width: 160, height: 16, borderRadius: 8, marginBottom: 12 }} />
          <ShimmerBlock style={{ width: '100%', height: 140, borderRadius: 24 }} />
        </View>

        <ShimmerBlock style={{ width: 180, height: 18, borderRadius: 10, marginBottom: 15 }} />
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

// ─── Error State ──────────────────────────────────────────────────────
const ErrorState = ({ error, onRetry }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ParticleBackground />
      <Animated.View style={[styles.errorContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.errorIconContainer}>
          <LinearGradient
            colors={['#FEE2E2', '#FECACA']}
            style={styles.errorIconBg}
          >
            <MaterialCommunityIcons name="cloud-off-outline" size={48} color="#EF4444" />
          </LinearGradient>
        </View>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>{error || "Failed to load opportunities. Please check your internet connection."}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f9c349', '#f8c14a']}
            style={styles.retryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="refresh" size={18} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.retryText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

// ─── Main Career Hub ──────────────────────────────────────────────────
const CareerHub = ({ navigation }) => {
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Animation refs
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const bannerPulse = useRef(new Animated.Value(1)).current;
  const mainOpacity = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Glow pulse animation
  useEffect(() => {
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.4,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    glowAnimation.start();

    return () => {
      glowAnimation.stop();
    };
  }, []);

  // Banner pulse animation
  useEffect(() => {
    const bannerAnimation = Animated.loop(
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
    );
    bannerAnimation.start();

    return () => {
      bannerAnimation.stop();
    };
  }, []);

  const startEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchPreviewData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
        setDataLoaded(false);
        mainOpacity.setValue(0);
      }

      const response = await axios.get(JOBS_PUBLIC_ENDPOINT, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (!isMounted.current) return;

      let jobs = [];
      if (response.data && response.data.jobs) {
        jobs = response.data.jobs;
      } else if (Array.isArray(response.data)) {
        jobs = response.data;
      } else if (response.data && typeof response.data === 'object') {
        const possibleArrays = Object.values(response.data).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          jobs = possibleArrays[0];
        }
      }
      
      setRecentJobs(jobs.slice(0, 3));
      setDataLoaded(true);
      setError(null);
      setLoading(false);

      setTimeout(() => {
        startEntranceAnimations();
        Animated.timing(mainOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 100);

    } catch (err) {
      console.error("Error fetching jobs:", err);
      
      if (!isMounted.current) return;

      let errorMessage = "Failed to load opportunities. Please try again.";
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please check your connection.";
      } else if (err.response) {
        errorMessage = `Server error: ${err.response.data?.message || err.response.statusText || 'Unknown error'}`;
      } else if (err.request) {
        errorMessage = "Unable to reach the server. Please check your internet connection.";
      }
      
      setError(errorMessage);
      setLoading(false);
      setDataLoaded(false);
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  }, [mainOpacity]);

  useEffect(() => {
    fetchPreviewData();
  }, []);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchPreviewData(true);
  }, [fetchPreviewData]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    fetchPreviewData();
  }, [fetchPreviewData]);

  const handleCardPress = useCallback((screen) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (navigation) {
      navigation.navigate(screen);
    }
  }, [navigation]);

  // Helper function to get job type icon
  const getJobTypeIcon = (type) => {
    const typeLower = type?.toLowerCase() || '';
    if (typeLower.includes('full') || typeLower.includes('full-time')) return 'briefcase';
    if (typeLower.includes('part') || typeLower.includes('part-time')) return 'clock-outline';
    if (typeLower.includes('contract')) return 'file-document-outline';
    if (typeLower.includes('intern')) return 'school-outline';
    if (typeLower.includes('remote')) return 'laptop-outline';
    return 'briefcase-outline';
  };

  // Helper function to get job type color
  const getJobTypeColor = (type) => {
    const typeLower = type?.toLowerCase() || '';
    if (typeLower.includes('full') || typeLower.includes('full-time')) return '#f9c349';
    if (typeLower.includes('part') || typeLower.includes('part-time')) return '#3b82f6';
    if (typeLower.includes('contract')) return '#8b5cf6';
    if (typeLower.includes('intern')) return '#10b981';
    if (typeLower.includes('remote')) return '#f43f5e';
    return '#64748B';
  };

  // Helper function to get job type display name
  const getJobTypeDisplay = (type) => {
    if (!type) return 'Full-time';
    const typeLower = type.toLowerCase();
    if (typeLower.includes('full')) return 'Full-time';
    if (typeLower.includes('part')) return 'Part-time';
    if (typeLower.includes('contract')) return 'Contract';
    if (typeLower.includes('intern')) return 'Internship';
    if (typeLower.includes('remote')) return 'Remote';
    return type;
  };

  // Helper function to get department icon
  const getDepartmentIcon = (department) => {
    const deptLower = department?.toLowerCase() || '';
    if (deptLower.includes('market') || deptLower.includes('sales')) return 'trending-up-outline';
    if (deptLower.includes('engineer') || deptLower.includes('tech') || deptLower.includes('develop')) return 'code-outline';
    if (deptLower.includes('design')) return 'brush-outline';
    if (deptLower.includes('finance') || deptLower.includes('account')) return 'cash-outline';
    if (deptLower.includes('hr') || deptLower.includes('human')) return 'people-outline';
    if (deptLower.includes('oper') || deptLower.includes('manag')) return 'settings-outline';
    return 'briefcase-outline';
  };

  if (loading && !dataLoaded && !error) {
    return <CareerSkeleton />;
  }

  if (error && !dataLoaded) {
    return <ErrorState error={error} onRetry={handleRetry} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <ParticleBackground />
      
      {/* Animated Glow */}
      <Animated.View style={[styles.glowTop, { opacity: glowPulse }]} />
      <Animated.View style={[styles.glowBottom, { opacity: glowPulse }]} />
      
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
        <Animated.View style={{ opacity: mainOpacity }}>
          {/* ── Animated Header ── */}
          <Animated.View style={[
            styles.header,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }]
            }
          ]}>
            <View style={styles.headerTop}>
              <View style={styles.headerBadge}>
                <LinearGradient
                  colors={['#f9c349', '#f8c14a']}
                  style={styles.headerBadgeGradient}
                >
                  <Text style={styles.headerBadgeText}>tdc</Text>
                </LinearGradient>
              </View>
              
            </View>
            
            <Text style={styles.welcomeText}>Welcome to </Text>
            <Text style={styles.mainTitle}>
              Career<Text style={styles.titleAccent}>Hub</Text>
            </Text>
            <Text style={styles.subtitle}>
              Discover opportunities that match your ambition
            </Text>
          </Animated.View>

          {/* ── Navigation Grid ── */}
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
                <View style={[styles.iconCircle, styles.iconYellow]}>
                  <MaterialCommunityIcons name="briefcase-search" size={24} color="#FFF" />
                </View>
                <Text style={styles.cardTitle}>Find Jobs</Text>
                <Text style={styles.cardSub}>Browse 50+ Roles</Text>
                <View style={styles.cardAccent}>
                  <Ionicons name="trending-up" size={14} color="#f9c349" />
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
                  <FontAwesome5 name="globe-americas" size={20} color="#FFF" />
                </View>
                <Text style={styles.cardTitle}>Study Abroad</Text>
                <Text style={styles.cardSub}>Global Programs</Text>
                <View style={styles.cardAccent}>
                  <Ionicons name="airplane" size={14} color="#000" />
                  <Text style={styles.cardAccentText}>Explore Now</Text>
                </View>
              </LinearGradient>
            </AnimatedCard>
          </View>

          {/* ── Featured Banner ── */}
          <Animated.View style={{ marginBottom: 30, opacity: headerFade }}>
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
                  colors={['#0F172A', '#1a1a2e', '#0F172A']}
                  style={styles.bannerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.bannerOverlay}>
                    {[...Array(5)].map((_, i) => (
                      <View key={i} style={[styles.bannerCircle, { 
                        width: 100 + (i * 60), 
                        height: 100 + (i * 60),
                        opacity: 0.05 - (i * 0.008)
                      }]} />
                    ))}
                  </View>
                  
                  <View style={styles.bannerContent}>
                    <View style={styles.tag}>
                      <LinearGradient
                        colors={['#f9c349', '#f8c14a']}
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
                      colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                      style={styles.bannerIconCircle}
                    >
                      <Ionicons name="chevron-forward-circle" size={32} color="#FFF" />
                    </LinearGradient>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* ── Recent Opportunities ── */}
          <Animated.View style={{ opacity: headerFade }}>
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
                <Ionicons name="chevron-forward" size={16} color="#f9c349" />
              </TouchableOpacity>
            </View>

            {recentJobs.length === 0 ? (
              <AnimatedCard delay={400}>
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="briefcase-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No opportunities available yet</Text>
                  <Text style={styles.emptySubText}>Check back soon for new positions</Text>
                </View>
              </AnimatedCard>
            ) : (
              <View style={styles.recentList}>
                {recentJobs.map((job, index) => {
                  const jobType = getJobTypeDisplay(job.type);
                  const jobTypeColor = getJobTypeColor(job.type);
                  const jobTypeIcon = getJobTypeIcon(job.type);
                  const deptIcon = getDepartmentIcon(job.department);

                  return (
                    <AnimatedCard
                      key={job._id || index}
                      delay={400 + (index * 100)}
                      onPress={() => handleCardPress('Career')}
                      scale={0.95}
                      fromDirection={index % 2 === 0 ? 'up' : 'left'}
                    >
                      <LinearGradient
                        colors={['#FFFFFF', '#F8FAFC']}
                        style={styles.recentJobCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {/* Company Name & Badge */}
                        <View style={styles.jobHeaderRow}>
                          <View style={styles.companyNameContainer}>
                            <View style={styles.companyDot} />
                            <Text style={styles.companyNameText} numberOfLines={1}>
                              {job.companyName || job.department || 'Company'}
                            </Text>
                          </View>
                          {/* Job Type Badge */}
                          <View style={[styles.jobTypeBadge, { backgroundColor: jobTypeColor + '15', borderColor: jobTypeColor + '30' }]}>
                            <Ionicons name={jobTypeIcon} size={10} color={jobTypeColor} />
                            <Text style={[styles.jobTypeText, { color: jobTypeColor }]}>{jobType}</Text>
                          </View>
                        </View>

                        {/* Job Title */}
                        <Text style={styles.jobTitleText} numberOfLines={2}>
                          {job.title || `Position ${index + 1}`}
                        </Text>

                        {/* Department & Location */}
                        <View style={styles.jobMetaRow}>
                          <View style={styles.metaItem}>
                            <Ionicons name={deptIcon} size={13} color="#64748B" />
                            <Text style={styles.metaText} numberOfLines={1}>
                              {job.department || 'General'}
                            </Text>
                          </View>
                          <View style={styles.metaDivider} />
                          <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={13} color="#64748B" />
                            <Text style={styles.metaText} numberOfLines={1}>
                              {job.location || 'Remote'}
                            </Text>
                          </View>
                          {job.salary && (
                            <>
                              <View style={styles.metaDivider} />
                              <View style={styles.metaItem}>
                                <Ionicons name="cash-outline" size={13} color="#10b981" />
                                <Text style={[styles.metaText, styles.salaryText]} numberOfLines={1}>
                                  {job.salary}
                                </Text>
                              </View>
                            </>
                          )}
                        </View>

                        {/* Skills Preview */}
                        {job.skills && job.skills.length > 0 && (
                          <View style={styles.skillsPreview}>
                            {job.skills.slice(0, 3).map((skill, idx) => (
                              <View key={idx} style={styles.skillChip}>
                                <Text style={styles.skillChipText}>{skill}</Text>
                              </View>
                            ))}
                            {job.skills.length > 3 && (
                              <View style={styles.skillChip}>
                                <Text style={styles.skillChipText}>+{job.skills.length - 3}</Text>
                              </View>
                            )}
                          </View>
                        )}

                        {/* Footer */}
                        <View style={styles.jobFooter}>
                          <View style={styles.jobDate}>
                            <Ionicons name="time-outline" size={11} color="#94A3B8" />
                            <Text style={styles.jobDateText}>
                              {job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              }) : 'Recently'}
                            </Text>
                          </View>
                          <View style={styles.jobActionArrow}>
                            <Ionicons name="arrow-forward" size={14} color="#FFF" />
                          </View>
                        </View>
                      </LinearGradient>
                    </AnimatedCard>
                  );
                })}
              </View>
            )}
          </Animated.View>

          {/* ── Stats ── */}
          <AnimatedCard delay={700} style={{ marginHorizontal: 20, marginTop: 30 }}>
            <LinearGradient
              colors={['#F8FAFC', '#F1F5F9']}
              style={styles.statsContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>50+</Text>
                <Text style={styles.statLabel}>Active Jobs</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>20+</Text>
                <Text style={styles.statLabel}>Countries</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>100+</Text>
                <Text style={styles.statLabel}>Hired</Text>
              </View>
            </LinearGradient>
          </AnimatedCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },

  // Glow Effects
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#f9c349',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#6366f1',
  },

  // Particles
  particle: {
    position: 'absolute',
  },

  // Header
  header: { 
    marginTop: Platform.OS === 'android' ? 20 : 10, 
    marginBottom: 35,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerBadge: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerBadgeGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBadgeText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 2,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f43f5e',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    borderColor: '#E8EDF2',
    minHeight: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
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
  iconYellow: {
    backgroundColor: '#f9c349',
  },
  iconBlack: {
    backgroundColor: '#0F172A',
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
    marginLeft: 6,
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
    backgroundColor: '#0F172A',
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
    color: '#0F172A', 
    fontWeight: '700', 
    fontSize: 14,
    marginRight: 4,
  },

  // Featured Banner
  featuredBanner: { 
    marginHorizontal: 20,
    borderRadius: 24, 
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  bannerGradient: {
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140,
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
    borderColor: 'rgba(255,255,255,0.08)',
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
    fontSize: 26, 
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

  // Recent Jobs - UPDATED
  recentList: { 
    gap: 12, 
    paddingHorizontal: 20,
  },
  recentJobCard: { 
    padding: 16, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  jobHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  companyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f9c349',
    marginRight: 8,
  },
  companyNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f9c349',
    flex: 1,
  },
  jobTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  jobTypeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  jobTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 22,
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  salaryText: {
    color: '#10b981',
    fontWeight: '600',
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  skillsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  skillChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  skillChipText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  jobDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobDateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  jobActionArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF2',
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
    marginHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF2',
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

  // Error
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});

export default CareerHub;