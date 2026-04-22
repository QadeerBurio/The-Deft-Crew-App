import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 50) / 2;

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

export default function AISkillsHomeScreen({ navigation }) {
  const { token, user, logout } = useContext(AuthContext);
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

  const fetchCourses = async () => {
    try {
      if (!token) {
        navigation.replace('Login');
        return;
      }

      console.log('Fetching courses...');
      let response;
      try {
        response = await api.get('/courses/course');
      } catch (firstError) {
        console.log('First endpoint failed, trying alternative...');
        response = await api.get('/courses/');
      }

      console.log('Courses response:', response.data);

      if (response.data.success) {
        const transformedCourses = response.data.courses.map(course => ({
          ...course,
          // IMPORTANT: Use the custom 'id' field, not MongoDB _id
          id: course.id, // This is the custom ID like "ds101"
          _id: course._id,
          image: course.image && course.image !== '' 
            ? course.image 
            : DEFAULT_IMAGES[course.category] || DEFAULT_IMAGES.default,
          color: course.color || '#64748B',
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
      console.error('Error fetching courses:', error);
      if (error.response?.status === 401) {
        logout();
        navigation.replace('Login');
      } else {
        setError('Network error. Please check your connection.');
      }
    }
  };

  const fetchEnrolledCourses = async () => {
    try {
      if (!token) return;

      console.log('Fetching enrolled courses...');
      const response = await api.get('/courses/user/enrolled');

      console.log('Enrolled courses response:', response.data);

      if (response.data.success) {
        const transformedEnrolled = response.data.courses.map(course => ({
          ...course,
          id: course.id, // Keep the custom ID
          _id: course._id,
          image: course.image && course.image !== '' 
            ? course.image 
            : DEFAULT_IMAGES[course.category] || DEFAULT_IMAGES.default,
        }));
        setEnrolledCourses(transformedEnrolled);
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      if (error.response?.status === 401) {
        logout();
        navigation.replace('Login');
      }
    }
  };

  useEffect(() => {
    if (token) {
      loadCourses();
    } else {
      navigation.replace('Login');
    }
  }, [token]);

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

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleCategorySelect = (id) => {
    setSelectedCategory(id);
    setIsMenuOpen(false);
    setActiveTab("Home");
  };

  const handleImageError = (courseId, category) => {
    console.log(`Image failed to load for course ${courseId}, using fallback`);
    setImageErrors(prev => ({
      ...prev,
      [courseId]: DEFAULT_IMAGES[category] || DEFAULT_IMAGES.default
    }));
  };

  const getImageUrl = (course) => {
    const key = course.id || course._id;
    if (imageErrors[key]) {
      return imageErrors[key];
    }
    if (course.image && course.image !== '') {
      return course.image;
    }
    return DEFAULT_IMAGES[course.category] || DEFAULT_IMAGES.default;
  };

  const filteredCourses = useCallback(() => {
    if (selectedCategory === "all") return courses;
    return courses.filter(course => course.category === selectedCategory);
  }, [selectedCategory, courses]);

  const getFilteredEnrolledCourses = () => {
    if (learningStatus === "Continue") {
      return enrolledCourses.filter(course => 
        course.userProgress && 
        course.userProgress.percentage > 0 && 
        course.userProgress.percentage < 100
      );
    } else {
      return enrolledCourses.filter(course => 
        course.userProgress && 
        course.userProgress.percentage === 100
      );
    }
  };

  const renderGridItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.gridCard} 
      activeOpacity={0.9}
      onPress={() => navigation.navigate("CourseDetailScreen", { course: item })}
    >
      <Image 
        source={{ uri: getImageUrl(item) }} 
        style={styles.gridImage}
        onError={() => handleImageError(item.id, item.category)}
        resizeMode="cover"
      />
      <View style={styles.gridContent}>
        <Text style={[styles.gridProvider, { color: item.color || "#64748B" }]}>{item.provider}</Text>
        <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.gridFooter}>
          <Text style={styles.levelText}>{item.level}</Text>
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={12} color="#F59E0B" />
            <Text style={styles.gridRating}>{item.rating}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEnrolledItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.enrolledCard}
      onPress={() => navigation.navigate("CourseDetailScreen", { course: item })}
    >
      <Image 
        source={{ uri: getImageUrl(item) }} 
        style={styles.enrolledImage}
        onError={() => handleImageError(item.id, item.category)}
        resizeMode="cover"
      />
      <View style={styles.enrolledContent}>
        <Text style={styles.enrolledTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.enrolledProvider}>{item.provider}</Text>
        {item.userProgress && item.userProgress.percentage < 100 && (
          <View style={styles.enrolledProgress}>
            <View style={styles.enrolledProgressBar}>
              <View style={[styles.enrolledProgressFill, { width: `${item.userProgress.percentage}%` }]} />
            </View>
            <Text style={styles.enrolledProgressText}>{item.userProgress.percentage}% Complete</Text>
          </View>
        )}
        {item.userProgress && item.userProgress.percentage === 100 && (
          <View style={styles.completedBadge}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const CourseList = () => {
    const currentCourses = filteredCourses();
    
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="cloud-off-outline" size={60} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCourses}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={currentCourses}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {CATEGORIES.find(c => c.id === selectedCategory)?.title || "All Courses"}
            </Text>
            <Text style={styles.courseCount}>{currentCourses.length} programs</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bookshelf" size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No courses found</Text>
            <Text style={styles.emptySub}>Try selecting a different category</Text>
          </View>
        }
      />
    );
  };

  const MyLearningView = () => {
    const filteredEnrolled = getFilteredEnrolledCourses();
    
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.learningToggleContainer}>
          <TouchableOpacity 
            style={[styles.learningToggle, learningStatus === "Continue" && styles.learningToggleActive]}
            onPress={() => setLearningStatus("Continue")}
          >
            <Text style={[styles.learningToggleText, learningStatus === "Continue" && styles.learningToggleTextActive]}>
              In Progress
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.learningToggle, learningStatus === "Completed" && styles.learningToggleActive]}
            onPress={() => setLearningStatus("Completed")}
          >
            <Text style={[styles.learningToggleText, learningStatus === "Completed" && styles.learningToggleTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredEnrolled}
          renderItem={renderEnrolledItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.enrolledContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name={learningStatus === "Continue" ? "play-speed" : "certificate-outline"} 
                size={70} 
                color="#CBD5E1" 
              />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySub}>
                {learningStatus === "Continue" 
                  ? "You haven't started any courses yet. Browse and enroll to get started!" 
                  : "Complete some courses to see them here!"}
              </Text>
              {learningStatus === "Continue" && (
                <TouchableOpacity 
                  style={styles.browseButton}
                  onPress={() => setActiveTab("Home")}
                >
                  <Text style={styles.browseButtonText}>Browse Courses</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>
    );
  };

  if (loading && !refreshing && courses.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.header}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={toggleMenu}>
            <MaterialCommunityIcons name={isMenuOpen ? "close" : "menu"} size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.brandText}>THE DEFT CREW</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image 
              source={{ uri: user?.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg' }} 
              style={styles.profileImage} 
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
        >
          <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
          <Text style={styles.searchPlaceholder}>Search for skills or programs</Text>
        </TouchableOpacity>

        <View style={styles.topTabsContainer}>
          <TouchableOpacity 
            style={[styles.topTab, activeTab === "Home" && styles.topTabActive]} 
            onPress={() => setActiveTab("Home")}
          >
            <Text style={[styles.topTabText, activeTab === "Home" && styles.topTabTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.topTab, activeTab === "My Learning" && styles.topTabActive]} 
            onPress={() => setActiveTab("My Learning")}
          >
            <Text style={[styles.topTabText, activeTab === "My Learning" && styles.topTabTextActive]}>My Learning</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {isMenuOpen && (
        <View style={styles.menuOverlay}>
          <View style={styles.menuContent}>
            <Text style={styles.menuHeader}>Explore Fields</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.menuItem, selectedCategory === cat.id && styles.menuItemActive]}
                onPress={() => handleCategorySelect(cat.id)}
              >
                <View style={[styles.menuIconCircle, selectedCategory === cat.id && {backgroundColor: '#334155'}]}>
                  <MaterialCommunityIcons name={cat.icon} size={20} color="#fff" />
                </View>
                <Text style={[styles.menuItemText, selectedCategory === cat.id && styles.menuItemTextActive]}>
                  {cat.title}
                </Text>
                {selectedCategory === cat.id && <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.closeArea} onPress={toggleMenu} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        {activeTab === "Home" ? <CourseList /> : <MyLearningView />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10, zIndex: 10 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  profileImage: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#fff' },
  searchBar: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    marginTop: 15, 
    padding: 10, 
    alignItems: 'center' 
  },
  searchPlaceholder: { color: '#94A3B8', marginLeft: 10, fontSize: 13 },
  topTabsContainer: { flexDirection: 'row', marginTop: 15, marginBottom: 5 },
  topTab: { marginRight: 25, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  topTabActive: { borderBottomColor: '#fff' },
  topTabText: { color: '#94A3B8', fontWeight: '700', fontSize: 15 },
  topTabTextActive: { color: '#fff' },
  learningToggleContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', margin: 20, borderRadius: 10, padding: 4 },
  learningToggle: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  learningToggleActive: { backgroundColor: '#fff', elevation: 2 },
  learningToggleText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  learningToggleTextActive: { color: '#000' },
  menuOverlay: { position: 'absolute', top: 185, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 },
  menuContent: { backgroundColor: '#fff', padding: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  menuHeader: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 15, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 6, backgroundColor: '#F1F5F9' },
  menuItemActive: { backgroundColor: '#000' },
  menuIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuItemText: { fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1 },
  menuItemTextActive: { color: '#fff' },
  closeArea: { flex: 1 },
  gridContainer: { padding: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 5 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  courseCount: { color: '#64748B', fontSize: 12 },
  gridCard: { width: COLUMN_WIDTH, backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, marginHorizontal: 5, elevation: 3, overflow: 'hidden' },
  gridImage: { width: '100%', height: 120, backgroundColor: '#E2E8F0' },
  gridContent: { padding: 10 },
  gridProvider: { fontSize: 9, fontWeight: '800' },
  gridTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 4, height: 36 },
  gridFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  levelText: { fontSize: 10, color: '#64748B' },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  gridRating: { fontSize: 10, fontWeight: '800', marginLeft: 3 },
  enrolledContainer: { padding: 20 },
  enrolledCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, overflow: 'hidden', elevation: 2 },
  enrolledImage: { width: 100, height: 100, backgroundColor: '#E2E8F0' },
  enrolledContent: { flex: 1, padding: 12 },
  enrolledTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  enrolledProvider: { fontSize: 11, color: '#64748B', marginBottom: 8 },
  enrolledProgress: { marginTop: 8 },
  enrolledProgressBar: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 4 },
  enrolledProgressFill: { height: '100%', backgroundColor: '#0F172A', borderRadius: 2 },
  enrolledProgressText: { fontSize: 10, color: '#64748B' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  completedText: { fontSize: 12, color: '#10B981', fontWeight: '600', marginLeft: 4 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, fontSize: 14, color: '#64748B' },
  errorText: { marginTop: 10, fontSize: 14, color: '#EF4444', textAlign: 'center' },
  retryButton: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#0F172A', borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 50 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 15 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8 },
  browseButton: { marginTop: 20, paddingHorizontal: 25, paddingVertical: 12, backgroundColor: '#0F172A', borderRadius: 25 },
  browseButtonText: { color: '#fff', fontWeight: '700' },
});