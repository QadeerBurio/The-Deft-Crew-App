import React, { useState, useEffect, useCallback, useContext, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar,
  Image, FlatList, ActivityIndicator, RefreshControl, Animated, Platform,
  Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 48) / 2;

const CATEGORIES = [
  { id: "all", title: "All Courses", icon: "infinity" },
  { id: "ds", title: "Data Science", icon: "database" },
  { id: "ai", title: "Artificial Intelligence", icon: "robot" },
  { id: "fs", title: "Full Stack", icon: "code-tags" },
  { id: "cs", title: "Cyber Security", icon: "shield-check" },
];

const DEFAULT_IMAGES = {
  ds: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
  ai: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop",
  fs: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop",
  cs: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop",
  default: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop",
};

const shimmerAnim = new Animated.Value(0);
Animated.loop(
  Animated.sequence([
    Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
  ])
).start();

const SkeletonGrid = () => {
  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  
  return (
    <View style={styles.gridContainer}>
      <Animated.View style={[styles.sectionHeader, { opacity }]}>
        <View>
          <View style={{ width: 120, height: 20, backgroundColor: '#e8e8e8', borderRadius: 4, marginBottom: 4 }} />
          <View style={{ width: 80, height: 12, backgroundColor: '#e8e8e8', borderRadius: 3 }} />
        </View>
      </Animated.View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.gridCard, { borderWidth: 0, elevation: 0, shadowOpacity: 0 }]}>
            <Animated.View style={[styles.skeletonImage, { opacity }]} />
            <View style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#e8e8e8' }} />
                <View style={{ width: 60, height: 10, backgroundColor: '#e8e8e8', borderRadius: 3 }} />
              </View>
              <View style={{ width: '100%', height: 14, backgroundColor: '#e8e8e8', borderRadius: 3, marginBottom: 4 }} />
              <View style={{ width: '70%', height: 14, backgroundColor: '#e8e8e8', borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const SkeletonEnrolled = () => {
  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.learningToggleContainer}>
        <View style={[styles.learningToggle, styles.learningToggleActive]}>
          <View style={{ width: 60, height: 12, backgroundColor: '#e8e8e8', borderRadius: 3 }} />
        </View>
        <View style={styles.learningToggle}>
          <View style={{ width: 60, height: 12, backgroundColor: '#e8e8e8', borderRadius: 3 }} />
        </View>
      </View>
      <View style={{ padding: 16 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.enrolledCard, { borderWidth: 0 }]}>
            <Animated.View style={[{ width: 90, height: 90, backgroundColor: '#e8e8e8' }, { opacity }]} />
            <View style={{ flex: 1, padding: 12 }}>
              <View style={{ width: '80%', height: 14, backgroundColor: '#e8e8e8', borderRadius: 3, marginBottom: 4 }} />
              <View style={{ width: '50%', height: 14, backgroundColor: '#e8e8e8', borderRadius: 3, marginBottom: 4 }} />
              <View style={{ width: '40%', height: 10, backgroundColor: '#e8e8e8', borderRadius: 3, marginBottom: 10 }} />
              <View style={{ width: '100%', height: 5, backgroundColor: '#e8e8e8', borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function AISkillsHomeScreen({ navigation }) {
  const { token, user, isGuest, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("Home");
  const [learningStatus, setLearningStatus] = useState("Continue");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const menuSlide = useRef(new Animated.Value(-20)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const tabIndicator = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // FIX: Don't redirect guest users to login
    loadCourses();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(tabIndicator, {
      toValue: activeTab === "Home" ? 0 : 1,
      friction: 6, tension: 40, useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // FIX: Show guest alert instead of redirect
  const showGuestAlert = (action) => {
    Alert.alert(
      'Create an Account',
      `Sign up to ${action} and unlock exclusive student benefits!`,
      [
        { text: 'Not Now', style: 'cancel' },
        { 
          text: 'Sign Up', 
          onPress: () => navigation.navigate('Login')
        }
      ]
    );
  };

  const fetchCourses = async () => {
    try {
      // FIX: Guest users can see courses
      let response;
      try { 
        response = await api.get('/courses/course'); 
      } catch (firstError) { 
        response = await api.get('/courses/'); 
      }

      if (response.data.success) {
        const transformedCourses = response.data.courses.map(course => ({
          ...course, 
          id: course.id || course._id, 
          _id: course._id || course.id,
          image: course.image && course.image !== '' ? course.image : DEFAULT_IMAGES[course.category] || DEFAULT_IMAGES.default,
          color: course.color || '#f9c349', 
          rating: course.rating || 4.5,
          provider: course.provider || 'TechDegree Club', 
          level: course.level || 'Beginner',
        }));
        setCourses(transformedCourses);
        setError(null);
      } else { 
        setError(response.data.message || 'Failed to fetch courses'); 
      }
    } catch (error) {
      if (error.response?.status === 401 && !isGuest) { 
        logout(); 
        navigation.replace('Login'); 
      } else {
        // Guest users get empty courses array instead of error
        setCourses([]);
        setError('Network error. Please check your connection.');
      }
    }
  };

  const fetchEnrolledCourses = async () => {
    // FIX: Guest users don't have enrolled courses
    if (!token || isGuest) {
      setEnrolledCourses([]);
      return;
    }
    
    try {
      const response = await api.get('/courses/user/enrolled');
      if (response.data.success) {
        const transformedEnrolled = response.data.courses.map(course => ({
          ...course, 
          id: course.id || course._id, 
          _id: course._id || course.id,
          image: course.image && course.image !== '' ? course.image : DEFAULT_IMAGES[course.category] || DEFAULT_IMAGES.default,
        }));
        setEnrolledCourses(transformedEnrolled);
      }
    } catch (error) {
      if (error.response?.status === 401) { 
        logout(); 
        navigation.replace('Login'); 
      }
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    await Promise.all([fetchCourses(), fetchEnrolledCourses()]);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  }, []);

  const toggleMenu = () => {
    if (isMenuOpen) {
      Animated.parallel([
        Animated.timing(menuSlide, { toValue: -20, duration: 200, useNativeDriver: true }),
        Animated.timing(menuOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setIsMenuOpen(false));
    } else {
      setIsMenuOpen(true);
      menuSlide.setValue(-20); menuOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(menuSlide, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(menuOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleCategorySelect = (id) => { setSelectedCategory(id); toggleMenu(); setActiveTab("Home"); };
  
  // FIX: Handle enroll button press for guest users
  const handleEnroll = (course) => {
    if (isGuest || !token) {
      showGuestAlert('enroll in courses');
      return;
    }
    navigation.navigate("CourseDetailScreen", { course });
  };

  const handleImageError = (courseId, category) => {
    setImageErrors(prev => ({ ...prev, [courseId]: DEFAULT_IMAGES[category] || DEFAULT_IMAGES.default }));
  };
  
  const getImageUrl = (course) => {
    const key = course.id || course._id;
    if (imageErrors[key]) return imageErrors[key];
    if (course.image && course.image !== '') return course.image;
    return DEFAULT_IMAGES[course.category] || DEFAULT_IMAGES.default;
  };

  const filteredCourses = useCallback(() => {
    if (selectedCategory === "all") return courses;
    return courses.filter(course => course.category === selectedCategory);
  }, [selectedCategory, courses]);

  const getFilteredEnrolledCourses = () => {
    if (isGuest) return [];
    
    if (learningStatus === "Continue") {
      return enrolledCourses.filter(course => course.userProgress && course.userProgress.percentage > 0 && course.userProgress.percentage < 100);
    } else {
      return enrolledCourses.filter(course => course.userProgress && course.userProgress.percentage === 100);
    }
  };

  const renderGridItem = ({ item, index }) => (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideUpAnim.interpolate({ inputRange: [0, 30], outputRange: [30 * (index % 4), 0] }) }],
    }}>
      <TouchableOpacity 
        style={styles.gridCard} 
        activeOpacity={0.9} 
        onPress={() => navigation.navigate("CourseDetailScreen", { course: item })}
      >
        <Image source={{ uri: getImageUrl(item) }} style={styles.gridImage} onError={() => handleImageError(item.id, item.category)} resizeMode="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.imageOverlay}>
          <View style={styles.levelBadge}><Text style={styles.levelBadgeText}>{item.level}</Text></View>
        </LinearGradient>
        <View style={styles.gridContent}>
          <View style={styles.providerRow}>
            <View style={[styles.providerDot, { backgroundColor: item.color || '#f9c349' }]} />
            <Text style={styles.gridProvider} numberOfLines={1}>{item.provider}</Text>
          </View>
          <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.gridFooter}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#f9c349" />
              <Text style={styles.gridRating}>{item.rating}</Text>
            </View>
            <TouchableOpacity 
              style={styles.enrollBtn} 
              onPress={() => handleEnroll(item)}
            >
              <Text style={styles.enrollBtnText}>
                {isGuest ? 'Sign Up' : 'Enroll'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEnrolledItem = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideUpAnim }] }}>
      <TouchableOpacity style={styles.enrolledCard} onPress={() => navigation.navigate("CourseDetailScreen", { course: item })} activeOpacity={0.8}>
        <Image source={{ uri: getImageUrl(item) }} style={styles.enrolledImage} onError={() => handleImageError(item.id, item.category)} resizeMode="cover" />
        <View style={styles.enrolledContent}>
          <Text style={styles.enrolledTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.enrolledProvider}>{item.provider}</Text>
          {item.userProgress && item.userProgress.percentage < 100 && (
            <View style={styles.enrolledProgressSection}>
              <View style={styles.enrolledProgressBar}>
                <Animated.View style={[styles.enrolledProgressFill, { width: `${item.userProgress.percentage}%` }]} />
              </View>
              <Text style={styles.enrolledProgressText}>{item.userProgress.percentage}% Complete</Text>
            </View>
          )}
          {item.userProgress && item.userProgress.percentage === 100 && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#f9c349" />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          )}
        </View>
        <View style={styles.enrolledChevron}><Ionicons name="chevron-forward" size={18} color="#ccc" /></View>
      </TouchableOpacity>
    </Animated.View>
  );

  const tabIndicatorLeft = tabIndicator.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });

  const CourseList = () => {
    if (loading && !refreshing) return <SkeletonGrid />;

    if (error && courses.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.errorIconCircle}>
            <MaterialCommunityIcons name="cloud-off-outline" size={40} color="#f9c349" />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCourses} activeOpacity={0.7}>
            <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.retryGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    const currentCourses = filteredCourses();
    return (
      <FlatList
        data={currentCourses} 
        renderItem={renderGridItem} 
        keyExtractor={(item) => item.id || item._id} 
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f9c349" colors={["#f9c349"]} />}
        ListHeaderComponent={
          <Animated.View style={[styles.sectionHeader, { opacity: fadeAnim }]}>
            <View>
              <Text style={styles.sectionTitle}>{CATEGORIES.find(c => c.id === selectedCategory)?.title || "All Courses"}</Text>
              <Text style={styles.courseCount}>{currentCourses.length} programs available</Text>
            </View>
            <TouchableOpacity style={styles.filterChip}><Ionicons name="options-outline" size={16} color="#f9c349" /></TouchableOpacity>
          </Animated.View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bookshelf" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No courses found</Text>
            <Text style={styles.emptySub}>Try selecting a different category</Text>
          </View>
        }
      />
    );
  };

  const MyLearningView = () => {
    if (loading && !refreshing) return <SkeletonEnrolled />;

    // FIX: Show guest message for My Learning tab
    if (isGuest) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="book-education-outline" size={70} color="#ccc" />
          <Text style={styles.emptyTitle}>Create an Account</Text>
          <Text style={styles.emptySub}>Sign up to track your learning progress and enroll in courses!</Text>
          <TouchableOpacity 
            style={styles.browseButton} 
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.browseGradient}>
              <Ionicons name="person-add-outline" size={18} color="#fff" />
              <Text style={styles.browseButtonText}>Sign Up Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    const filteredEnrolled = getFilteredEnrolledCourses();
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.learningToggleContainer}>
          <TouchableOpacity style={[styles.learningToggle, learningStatus === "Continue" && styles.learningToggleActive]} onPress={() => setLearningStatus("Continue")}>
            <Text style={[styles.learningToggleText, learningStatus === "Continue" && styles.learningToggleTextActive]}>In Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.learningToggle, learningStatus === "Completed" && styles.learningToggleActive]} onPress={() => setLearningStatus("Completed")}>
            <Text style={[styles.learningToggleText, learningStatus === "Completed" && styles.learningToggleTextActive]}>Completed</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={filteredEnrolled} 
          renderItem={renderEnrolledItem} 
          keyExtractor={(item) => item.id || item._id}
          contentContainerStyle={styles.enrolledContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f9c349" colors={["#f9c349"]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name={learningStatus === "Continue" ? "play-speed" : "certificate-outline"} size={70} color="#ccc" />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySub}>{learningStatus === "Continue" ? "Browse and enroll to get started!" : "Complete some courses to see them here!"}</Text>
              {learningStatus === "Continue" && (
                <TouchableOpacity style={styles.browseButton} onPress={() => setActiveTab("Home")}>
                  <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.browseGradient}>
                    <Ionicons name="compass-outline" size={18} color="#fff" />
                    <Text style={styles.browseButtonText}>Browse Courses</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Guest Banner */}
      {isGuest && (
        <View style={styles.guestBanner}>
          <Ionicons name="information-circle" size={20} color="#1a1a1a" />
          <Text style={styles.guestBannerText}>
            Browsing as guest. Sign in to enroll in courses!
          </Text>
        </View>
      )}
      
      <Animated.View style={{ opacity: headerFade }}>
        <LinearGradient colors={['#1a1a1a', '#1a1a1a']} style={styles.header}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={toggleMenu} style={styles.menuBtn}>
              <Ionicons name={isMenuOpen ? "close" : "menu"} size={24} color="#f9c349" />
            </TouchableOpacity>
            <Text style={styles.brandText}>tdc<Text style={{color: '#f9c349'}}>.</Text></Text>
            <TouchableOpacity onPress={() => {
              if (isGuest) {
                showGuestAlert('view profile');
              } else {
                navigation.navigate('Profile');
              }
            }} style={styles.profileBtn}>
              <Image 
                source={{ 
                  uri: isGuest 
                    ? 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
                    : user?.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg' 
                }} 
                style={styles.profileImage} 
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
            <Ionicons name="search-outline" size={18} color="#999" />
            <Text style={styles.searchPlaceholder}>Search for skills or programs</Text>
          </TouchableOpacity>
          <View style={styles.topTabsContainer}>
            <TouchableOpacity style={styles.topTab} onPress={() => setActiveTab("Home")}>
              <Text style={[styles.topTabText, activeTab === "Home" && styles.topTabTextActive]}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.topTab} onPress={() => {
              if (isGuest) {
                setActiveTab("My Learning");
              } else {
                setActiveTab("My Learning");
              }
            }}>
              <Text style={[styles.topTabText, activeTab === "My Learning" && styles.topTabTextActive]}>My Learning</Text>
            </TouchableOpacity>
            <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: tabIndicatorLeft }] }]} />
          </View>
        </LinearGradient>
      </Animated.View>

      {isMenuOpen && (
        <View style={styles.menuOverlay}>
          <Animated.View style={[styles.menuContent, { opacity: menuOpacity, transform: [{ translateY: menuSlide }] }]}>
            <Text style={styles.menuHeader}>Explore Fields</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.id} style={[styles.menuItem, selectedCategory === cat.id && styles.menuItemActive]} onPress={() => handleCategorySelect(cat.id)}>
                <View style={[styles.menuIconCircle, selectedCategory === cat.id && {backgroundColor: '#f9c349'}]}>
                  <MaterialCommunityIcons name={cat.icon} size={20} color={selectedCategory === cat.id ? '#1a1a1a' : '#f9c349'} />
                </View>
                <Text style={[styles.menuItemText, selectedCategory === cat.id && styles.menuItemTextActive]}>{cat.title}</Text>
                {selectedCategory === cat.id && <Ionicons name="checkmark-circle" size={18} color="#f9c349" />}
              </TouchableOpacity>
            ))}
          </Animated.View>
          <TouchableOpacity style={styles.closeArea} onPress={toggleMenu} activeOpacity={1} />
        </View>
      )}

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
        {activeTab === "Home" ? <CourseList /> : <MyLearningView />}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f9c34930'
  },
  guestBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1a1a1a',
    marginLeft: 8,
    fontWeight: '500'
  },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  brandText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  profileBtn: { borderRadius: 14, borderWidth: 2, borderColor: '#f9c349', overflow: 'hidden' },
  profileImage: { width: 36, height: 36, borderRadius: 12 },
  searchBar: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, marginTop: 14, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: '#f0f0f0' },
  searchPlaceholder: { color: '#999', marginLeft: 10, fontSize: 13, fontWeight: '500' },
  topTabsContainer: { flexDirection: 'row', marginTop: 16, position: 'relative', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 3 },
  topTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, zIndex: 1 },
  topTabText: { color: '#999', fontWeight: '700', fontSize: 13 },
  topTabTextActive: { color: '#1a1a1a' },
  tabIndicator: { position: 'absolute', top: 3, left: 3, width: '48%', height: 36, backgroundColor: '#f9c349', borderRadius: 10 },
  learningToggleContainer: { flexDirection: 'row', backgroundColor: '#f8f8f8', margin: 20, borderRadius: 14, padding: 4, borderWidth: 2, borderColor: '#f0f0f0' },
  learningToggle: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11 },
  learningToggleActive: { backgroundColor: '#1a1a1a' },
  learningToggleText: { color: '#999', fontWeight: '700', fontSize: 13 },
  learningToggleTextActive: { color: '#f9c349' },
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 },
  menuContent: { backgroundColor: '#1a1a1a', marginTop: 160, marginHorizontal: 16, padding: 20, borderRadius: 24 },
  menuHeader: { fontSize: 11, fontWeight: '800', color: '#f9c349', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 14, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  menuItemActive: { backgroundColor: '#f9c349', borderColor: '#f9c349' },
  menuIconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuItemText: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  menuItemTextActive: { color: '#1a1a1a' },
  closeArea: { flex: 1 },
  skeletonImage: { width: '100%', height: 130, backgroundColor: '#e8e8e8' },
  gridContainer: { padding: 14, paddingTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  courseCount: { color: '#999', fontSize: 12, fontWeight: '500', marginTop: 2 },
  filterChip: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f0f0f0' },
  gridCard: { width: COLUMN_WIDTH, backgroundColor: '#fff', borderRadius: 18, marginBottom: 14, marginHorizontal: 4, overflow: 'hidden', borderWidth: 2, borderColor: '#f0f0f0', elevation: 3 },
  gridImage: { width: '100%', height: 130, backgroundColor: '#f0f0f0' },
  imageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 130, justifyContent: 'flex-end', padding: 8 },
  levelBadge: { alignSelf: 'flex-start', backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  levelBadgeText: { fontSize: 10, color: '#f9c349', fontWeight: '700' },
  gridContent: { padding: 12 },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  providerDot: { width: 8, height: 8, borderRadius: 4 },
  gridProvider: { fontSize: 10, fontWeight: '700', color: '#999', flex: 1 },
  gridTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', height: 38, lineHeight: 19 },
  gridFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridRating: { fontSize: 11, fontWeight: '700', color: '#1a1a1a' },
  enrollBtn: { backgroundColor: '#f9c349', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  enrollBtnText: { fontSize: 10, fontWeight: '800', color: '#1a1a1a' },
  enrolledContainer: { padding: 16, paddingTop: 4 },
  enrolledCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#f0f0f0' },
  enrolledImage: { width: 90, height: 90, backgroundColor: '#f0f0f0' },
  enrolledContent: { flex: 1, padding: 12 },
  enrolledTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 3 },
  enrolledProvider: { fontSize: 11, color: '#999', marginBottom: 6, fontWeight: '500' },
  enrolledProgressSection: { marginTop: 4 },
  enrolledProgressBar: { height: 5, backgroundColor: '#f0f0f0', borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
  enrolledProgressFill: { height: '100%', backgroundColor: '#f9c349', borderRadius: 3 },
  enrolledProgressText: { fontSize: 10, color: '#999', fontWeight: '600' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  completedText: { fontSize: 11, color: '#f9c349', fontWeight: '700' },
  enrolledChevron: { justifyContent: 'center', paddingRight: 12 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#ffffff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#999', fontWeight: '500' },
  errorIconCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#f0f0f0' },
  errorText: { marginTop: 8, fontSize: 14, color: '#666', textAlign: 'center', fontWeight: '500' },
  retryButton: { marginTop: 16, borderRadius: 12, overflow: 'hidden', elevation: 5 },
  retryGradient: { paddingHorizontal: 24, paddingVertical: 12 },
  retryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginTop: 15 },
  emptySub: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 6, fontWeight: '500' },
  browseButton: { marginTop: 20, borderRadius: 14, overflow: 'hidden', elevation: 5 },
  browseGradient: { flexDirection: 'row', paddingHorizontal: 22, paddingVertical: 13, alignItems: 'center', gap: 8 },
  browseButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});