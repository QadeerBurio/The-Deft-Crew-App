import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  UIManager,
  ActivityIndicator,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../../context/AuthContext";
import { courseAPI } from "../../api/api";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

export default function CourseDetailScreen({ route, navigation }) {
  const { course: initialCourse } = route.params || {};
  const { token } = useContext(AuthContext);
  const [course, setCourse] = useState(initialCourse);
  const [activeTab, setActiveTab] = useState("About");
  const [expandedModule, setExpandedModule] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(40)).current;
  const imageScale = useRef(new Animated.Value(1.1)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const tabIndicator = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const footerSlide = useRef(new Animated.Value(60)).current;
  const enrollScale = useRef(new Animated.Value(1)).current;
  const moduleAnims = useRef({}).current;

  useEffect(() => {
    checkEnrollmentStatus();
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(imageScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(footerSlide, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();

    // Animate progress bar
    if (progressPercent > 0) {
      Animated.timing(progressAnim, {
        toValue: progressPercent,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    }
  }, []);

  useEffect(() => {
    Animated.spring(tabIndicator, {
      toValue: activeTab === "About" ? 0 : 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const checkEnrollmentStatus = async () => {
    if (!token || !course?.id) return;
    
    try {
      const response = await courseAPI.getEnrolledCourses();
      if (response.data.success) {
        const enrolled = response.data.courses.some(c => c.id === course.id);
        setIsEnrolled(enrolled);
        
        const enrolledCourse = response.data.courses.find(c => c.id === course.id);
        if (enrolledCourse && enrolledCourse.userProgress) {
          setCourse(prev => ({
            ...prev,
            userProgress: enrolledCourse.userProgress
          }));
        }
      }
    } catch (error) {
      console.error("Error checking enrollment:", error);
    }
  };

  const getOrCreateModuleAnim = (id) => {
    if (!moduleAnims[id]) {
      moduleAnims[id] = new Animated.Value(0);
    }
    return moduleAnims[id];
  };

  if (!course) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = course.userProgress?.percentage || 0;
  const hasStarted = progressPercent > 0;
  const primaryColor = course.color || '#f9c349';

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const tabIndicatorLeft = tabIndicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.35],
  });

  const toggleModule = (id) => {
    const anim = getOrCreateModuleAnim(id);
    if (expandedModule === id) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start(() => setExpandedModule(null));
    } else {
      if (expandedModule) {
        const prevAnim = getOrCreateModuleAnim(expandedModule);
        Animated.timing(prevAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      }
      setExpandedModule(id);
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const getLessonIcon = (type) => {
    switch (type) {
      case 'video': return 'play-circle-outline';
      case 'practice': return 'notebook-edit-outline';
      case 'lab': return 'flask-outline';
      case 'assignment': return 'file-certificate-outline';
      default: return 'bookmark-outline';
    }
  };

  const handleEnrollPress = () => {
    Animated.sequence([
      Animated.timing(enrollScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(enrollScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    navigation.navigate("EnrollmentFormScreen", { course });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Animated.Image 
            source={{ uri: course.image }} 
            style={[styles.heroImage, { transform: [{ scale: imageScale }] }]} 
          />
          <LinearGradient 
            colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.1)", "transparent"]} 
            style={styles.heroOverlay} 
          />
          
          {/* Back Button */}
          <Animated.View style={[styles.backButtonContainer, { opacity: headerFade }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
            </TouchableOpacity>
          </Animated.View>

          {/* Enrolled Badge */}
          {isEnrolled && (
            <Animated.View style={[styles.enrolledBadge, { opacity: fadeAnim }]}>
              <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.enrolledBadgeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={styles.enrolledBadgeText}>Enrolled</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Hero Info Overlay */}
          <Animated.View style={[styles.heroInfo, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
            <View style={styles.providerBadge}>
              <View style={[styles.providerDot, { backgroundColor: primaryColor }]} />
              <Text style={styles.providerText}>{course.provider}</Text>
            </View>
            <Text style={styles.titleText}>{course.title}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}>
                <Ionicons name="star" size={13} color="#f9c349" />
                <Text style={styles.heroMetaText}>{course.rating}</Text>
              </View>
              <View style={styles.heroMetaItem}>
                <Ionicons name="people-outline" size={13} color="#fff" />
                <Text style={styles.heroMetaText}>{course.enrolledCount || 0}+ enrolled</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{course.level}</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Progress Section */}
        {isEnrolled && (
          <Animated.View style={[styles.progressSection, { opacity: fadeAnim }]}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTitleRow}>
                <Ionicons name={hasStarted ? "timer-outline" : "play-circle-outline"} size={18} color="#f9c349" />
                <Text style={styles.progressTitle}>{hasStarted ? "Your Progress" : "Ready to Start"}</Text>
              </View>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressBar, { width: progressWidth, backgroundColor: '#f9c349' }]} />
            </View>
          </Animated.View>
        )}

        {/* Tabs */}
        <Animated.View style={[styles.tabBar, { opacity: headerFade }]}>
          <TouchableOpacity 
            onPress={() => setActiveTab("About")}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "About" && styles.tabTextActive]}>About</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab("Syllabus")}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "Syllabus" && styles.tabTextActive]}>Syllabus</Text>
          </TouchableOpacity>
          <Animated.View style={[styles.tabIndicator, { 
            transform: [{ translateX: tabIndicatorLeft }],
            backgroundColor: '#f9c349',
          }]} />
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
          {activeTab === "About" ? (
            <View>
              {/* Description */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Course Description</Text>
                </View>
                <Text style={styles.descriptionText}>{course.description}</Text>
              </View>
              
              {/* Skills */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Skills You'll Learn</Text>
                </View>
                <View style={styles.skillsContainer}>
                  {course.skills?.map((skill, index) => (
                    <View key={index} style={styles.skillBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#f9c349" />
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              {/* Instructor */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Instructor</Text>
                </View>
                <View style={styles.instructorCard}>
                  <Image 
                    source={{ uri: course.instructor?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }} 
                    style={styles.instrAvatar} 
                  />
                  <View style={styles.instrInfo}>
                    <Text style={styles.instrName}>{course.instructor?.name || "TechDegree Team"}</Text>
                    <Text style={styles.instrRole}>{course.instructor?.role || "Senior Instructor"}</Text>
                    {course.instructor?.bio && (
                      <Text style={styles.instrBio} numberOfLines={3}>{course.instructor.bio}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Course Details */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Course Details</Text>
                </View>
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconCircle}>
                      <Ionicons name="time-outline" size={18} color="#f9c349" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Duration</Text>
                      <Text style={styles.detailValue}>{course.duration}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconCircle}>
                      <Ionicons name="cellular-outline" size={18} color="#f9c349" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Level</Text>
                      <Text style={styles.detailValue}>{course.level}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconCircle}>
                      <Ionicons name="language-outline" size={18} color="#f9c349" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Language</Text>
                      <Text style={styles.detailValue}>English</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconCircle}>
                      <Ionicons name="ribbon-outline" size={18} color="#f9c349" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Certificate</Text>
                      <Text style={styles.detailValue}>Yes</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View>
              {course.modules?.length > 0 ? (
                course.modules.map((mod, index) => {
                  const moduleAnim = getOrCreateModuleAnim(mod.id);
                  const isExpanded = expandedModule === mod.id;
                  
                  return (
                    <View key={mod.id || index} style={styles.moduleWrapper}>
                      <TouchableOpacity 
                        style={styles.moduleHeader} 
                        onPress={() => toggleModule(mod.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.moduleNumber}>
                          <LinearGradient colors={['#f9c349', '#1a1a1a']} style={styles.moduleNumberGradient}>
                            <Text style={styles.moduleNumberText}>{index + 1}</Text>
                          </LinearGradient>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.moduleName}>{mod.title}</Text>
                          <Text style={styles.moduleMeta}>{mod.lessons?.length || 0} lessons</Text>
                        </View>
                        <View style={[styles.moduleChevron, isExpanded && styles.moduleChevronActive]}>
                          <Ionicons name="chevron-down" size={18} color={isExpanded ? '#f9c349' : '#ccc'} />
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <Animated.View style={[styles.lessonList, { opacity: moduleAnim }]}>
                          {mod.lessons?.map((lesson, lIdx) => (
                            <TouchableOpacity key={lIdx} style={styles.lessonRow} activeOpacity={0.6}>
                              <View style={styles.lessonIconCircle}>
                                <Ionicons name={getLessonIcon(lesson.type)} size={18} color="#f9c349" />
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                                <Text style={styles.lessonType}>{lesson.type?.toUpperCase() || "LESSON"} • {lesson.time || "15m"}</Text>
                              </View>
                              {isEnrolled ? (
                                <View style={styles.playCircle}>
                                  <Ionicons name="play-circle" size={28} color="#f9c349" />
                                </View>
                              ) : (
                                <View style={styles.lockCircle}>
                                  <Ionicons name="lock-closed" size={16} color="#ccc" />
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </Animated.View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.noModulesContainer}>
                  <MaterialCommunityIcons name="file-document-outline" size={50} color="#ccc" />
                  <Text style={styles.noModulesText}>Course modules coming soon!</Text>
                  <Text style={styles.noModulesSubtext}>Stay tuned for updates</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Footer */}
      <Animated.View style={[styles.footer, { transform: [{ translateY: footerSlide }] }]}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerPrice}>Free</Text>
          <Text style={styles.footerSub}>Start learning today</Text>
        </View>
        <Animated.View style={{ flex: 1, marginLeft: 16, transform: [{ scale: enrollScale }] }}>
          <TouchableOpacity 
            style={styles.enrollBtn}
            onPress={handleEnrollPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#f9c349', '#1a1a1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.enrollBtnGradient}
            >
              <Text style={styles.enrollBtnText}>
                {isEnrolled ? (hasStarted ? "Continue Learning" : "Start Course") : "Enroll Now"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#999', fontWeight: '500' },
  
  // Hero
  heroContainer: { height: 320, width: '100%', position: 'relative', backgroundColor: '#1a1a1a' },
  heroImage: { width: '100%', height: '100%', opacity: 0.8 },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  backButtonContainer: { position: 'absolute', top: 50, left: 16, zIndex: 10 },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  enrolledBadge: { position: 'absolute', top: 50, right: 16, zIndex: 10, borderRadius: 12, overflow: 'hidden' },
  enrolledBadgeGradient: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', gap: 5 },
  enrolledBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  
  heroInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 24 },
  providerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  providerDot: { width: 8, height: 8, borderRadius: 4 },
  providerText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.9 },
  titleText: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 10, letterSpacing: -0.5 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  levelBadge: { 
    backgroundColor: 'rgba(249,195,73,0.2)', 
    paddingHorizontal: 10, 
    paddingVertical: 3, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(249,195,73,0.4)',
  },
  levelBadgeText: { color: '#f9c349', fontSize: 10, fontWeight: '700' },
  
  // Progress
  progressSection: { 
    marginHorizontal: 20, 
    marginTop: -20,
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  progressPercent: { fontSize: 13, fontWeight: '800', color: '#f9c349' },
  progressTrack: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  
  // Tabs
  tabBar: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    marginTop: 20,
    position: 'relative',
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  tabItem: { paddingVertical: 14, marginRight: 30 },
  tabText: { fontSize: 15, fontWeight: '700', color: '#999' },
  tabTextActive: { color: '#1a1a1a' },
  tabIndicator: {
    position: 'absolute',
    bottom: -2,
    left: 20,
    width: 60,
    height: 3,
    borderRadius: 2,
  },
  
  // Content
  content: { padding: 20, paddingTop: 20 },
  sectionBlock: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  descriptionText: { color: '#666', lineHeight: 24, fontSize: 14, fontWeight: '500' },
  
  // Skills
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  skillText: { fontSize: 12, fontWeight: '600', color: '#1a1a1a' },
  
  // Instructor
  instructorCard: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    backgroundColor: '#f8f8f8', 
    padding: 16, 
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  instrAvatar: { width: 56, height: 56, borderRadius: 16 },
  instrInfo: { marginLeft: 14, flex: 1 },
  instrName: { fontWeight: '800', color: '#1a1a1a', fontSize: 15 },
  instrRole: { fontSize: 12, color: '#999', fontWeight: '500', marginTop: 2 },
  instrBio: { fontSize: 12, color: '#666', marginTop: 6, lineHeight: 18, fontWeight: '500' },
  
  // Details Grid
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '50%', 
    marginBottom: 14,
    gap: 10,
  },
  detailIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  detailLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '700', marginTop: 1 },
  
  // Modules
  moduleWrapper: { 
    marginBottom: 12, 
    borderRadius: 16, 
    backgroundColor: '#fff', 
    overflow: 'hidden', 
    borderWidth: 2, 
    borderColor: '#f0f0f0' 
  },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  moduleNumber: { borderRadius: 12, overflow: 'hidden' },
  moduleNumberGradient: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  moduleNumberText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  moduleName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  moduleMeta: { fontSize: 11, color: '#999', fontWeight: '500', marginTop: 2 },
  moduleChevron: { 
    width: 30, 
    height: 30, 
    borderRadius: 10, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  moduleChevronActive: { backgroundColor: '#fffbf0' },
  
  lessonList: { backgroundColor: '#fafafa', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  lessonRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    paddingHorizontal: 20,
    borderBottomWidth: 1, 
    borderBottomColor: '#f5f5f5' 
  },
  lessonIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  lessonTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  lessonType: { fontSize: 10, color: '#999', fontWeight: '600', marginTop: 2 },
  playCircle: { padding: 2 },
  lockCircle: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  noModulesContainer: { alignItems: 'center', padding: 40 },
  noModulesText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 12 },
  noModulesSubtext: { fontSize: 13, color: '#ccc', marginTop: 4, fontWeight: '500' },

  // Footer
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    padding: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#fff', 
    borderTopWidth: 2, 
    borderTopColor: '#f0f0f0', 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  footerLeft: { marginRight: 16 },
  footerPrice: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  footerSub: { fontSize: 11, color: '#f9c349', fontWeight: '700', marginTop: 1 },
  enrollBtn: { borderRadius: 14, overflow: 'hidden', elevation: 8 },
  enrollBtnGradient: { 
    flexDirection: 'row',
    paddingVertical: 15, 
    paddingHorizontal: 24,
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8,
  },
  enrollBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
});

