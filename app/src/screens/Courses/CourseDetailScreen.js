import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../../context/AuthContext";
import { courseAPI } from "../../api/api";

// Enable LayoutAnimation for Android
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

  useEffect(() => {
    checkEnrollmentStatus();
  }, []);

  const checkEnrollmentStatus = async () => {
    if (!token || !course?.id) return;
    
    try {
      const response = await courseAPI.getEnrolledCourses();
      if (response.data.success) {
        const enrolled = response.data.courses.some(c => c.id === course.id);
        setIsEnrolled(enrolled);
        
        // Update course with progress if enrolled
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

  if (!course) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text>Loading course...</Text>
      </View>
    );
  }

  const progressPercent = course.userProgress?.percentage || 0;
  const hasStarted = progressPercent > 0;

  const toggleModule = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedModule(expandedModule === id ? null : id);
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
    navigation.navigate("EnrollmentFormScreen", { course });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* 1. HERO SECTION */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: course.image }} style={styles.heroImage} />
          <LinearGradient colors={["rgba(0,0,0,0.6)", "transparent"]} style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          {isEnrolled && (
            <View style={styles.enrolledBadge}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
              <Text style={styles.enrolledBadgeText}>Enrolled</Text>
            </View>
          )}
        </View>

        {/* 2. HEADER & PROGRESS */}
        <View style={styles.headerInfo}>
          <Text style={[styles.providerText, { color: course.color || "#0F172A" }]}>{course.provider}</Text>
          <Text style={styles.titleText}>{course.title}</Text>
          
          {isEnrolled && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>{hasStarted ? "Your Progress" : "Not Started"}</Text>
                <Text style={styles.progressPercent}>{progressPercent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${progressPercent}%`, backgroundColor: course.color || "#000" }]} />
              </View>
            </View>
          )}
        </View>

        {/* 3. TABS */}
        <View style={styles.tabBar}>
          {["About", "Syllabus"].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, activeTab === tab && { borderBottomColor: course.color || "#000" }]}
            >
              <Text style={[styles.tabText, activeTab === tab && { color: course.color || "#000" }]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. CONTENT */}
        <View style={styles.content}>
          {activeTab === "About" ? (
            <View>
              <Text style={styles.sectionTitle}>Course Description</Text>
              <Text style={styles.descriptionText}>{course.description}</Text>
              
              <Text style={styles.sectionTitle}>Skills You'll Learn</Text>
              <View style={styles.skillsContainer}>
                {course.skills?.map((skill, index) => (
                  <View key={index} style={[styles.skillBadge, { backgroundColor: course.color + "15" }]}>
                    <Text style={[styles.skillText, { color: course.color }]}>{skill}</Text>
                  </View>
                ))}
              </View>
              
              <Text style={styles.sectionTitle}>Instructor</Text>
              <View style={styles.instructorCard}>
                <Image 
                  source={{ uri: course.instructor?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }} 
                  style={styles.instrAvatar} 
                />
                <View style={styles.instrInfo}>
                  <Text style={styles.instrName}>{course.instructor?.name || "TechDegree Team"}</Text>
                  <Text style={styles.instrRole}>{course.instructor?.role || "Senior Instructor"}</Text>
                  {course.instructor?.bio && (
                    <Text style={styles.instrBio}>{course.instructor.bio}</Text>
                  )}
                </View>
              </View>

              <Text style={styles.sectionTitle}>Course Details</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#64748B" />
                  <Text style={styles.detailText}>Duration: {course.duration}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="signal" size={20} color="#64748B" />
                  <Text style={styles.detailText}>Level: {course.level}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="star" size={20} color="#F59E0B" />
                  <Text style={styles.detailText}>Rating: {course.rating} ({course.reviews || 0} reviews)</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="account-group" size={20} color="#64748B" />
                  <Text style={styles.detailText}>Students: {course.enrolledCount || 0}+ enrolled</Text>
                </View>
              </View>
            </View>
          ) : (
            <View>
              {course.modules?.length > 0 ? (
                course.modules.map((mod, index) => (
                  <View key={mod.id || index} style={styles.moduleWrapper}>
                    <TouchableOpacity 
                      style={styles.moduleHeader} 
                      onPress={() => toggleModule(mod.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.moduleNumber, { backgroundColor: (course.color || '#000') + '15' }]}>
                        <Text style={{ color: course.color, fontWeight: '800' }}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.moduleName}>{mod.title}</Text>
                        <Text style={styles.moduleMeta}>{mod.lessons?.length || 0} items • Tap to view</Text>
                      </View>
                      <MaterialCommunityIcons 
                        name={expandedModule === mod.id ? "chevron-up" : "chevron-down"} 
                        size={24} color="#94A3B8" 
                      />
                    </TouchableOpacity>

                    {expandedModule === mod.id && (
                      <View style={styles.lessonList}>
                        {mod.lessons?.map((lesson, lIdx) => (
                          <TouchableOpacity key={lIdx} style={styles.lessonRow}>
                            <MaterialCommunityIcons name={getLessonIcon(lesson.type)} size={20} color={course.color} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.lessonTitle}>{lesson.title}</Text>
                              <Text style={styles.lessonType}>{lesson.type?.toUpperCase() || "LESSON"} • {lesson.time || "15m"}</Text>
                            </View>
                            {isEnrolled ? (
                              <MaterialCommunityIcons name="play-circle-outline" size={22} color={course.color} />
                            ) : (
                              <MaterialCommunityIcons name="lock-outline" size={22} color="#CBD5E1" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.noModulesContainer}>
                  <MaterialCommunityIcons name="file-document-outline" size={50} color="#CBD5E1" />
                  <Text style={styles.noModulesText}>Course modules coming soon!</Text>
                  <Text style={styles.noModulesSubtext}>Stay tuned for updates</Text>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 5. FOOTER */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerPrice}>Free</Text>
          <Text style={styles.footerSub}>Start learning today</Text>
        </View>
        <TouchableOpacity 
          style={[styles.enrollBtn, { backgroundColor: course.color || "#000" }]}
          onPress={handleEnrollPress}
        >
          <Text style={styles.enrollBtnText}>
            {isEnrolled ? (hasStarted ? "Continue Learning" : "Start Course") : "Enroll Now"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroContainer: { height: 240, width: '100%', position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20, zIndex: 10 },
  enrolledBadge: { position: 'absolute', top: 50, right: 20, backgroundColor: '#10B981', flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center', zIndex: 10 },
  enrolledBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  headerInfo: { padding: 20 },
  providerText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  titleText: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  
  progressSection: { marginTop: 15 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  progressPercent: { fontSize: 12, fontWeight: '800' },
  progressTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },

  tabBar: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabItem: { paddingVertical: 15, marginRight: 25, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '800', color: '#94A3B8' },

  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 10, marginTop: 10 },
  descriptionText: { color: '#475569', lineHeight: 22 },
  
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  skillBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  skillText: { fontSize: 12, fontWeight: '600' },
  
  instructorCard: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  instrAvatar: { width: 50, height: 50, borderRadius: 25 },
  instrInfo: { marginLeft: 12, flex: 1 },
  instrName: { fontWeight: '800', color: '#1E293B' },
  instrRole: { fontSize: 12, color: '#64748B' },
  instrBio: { fontSize: 12, color: '#475569', marginTop: 4 },
  
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 12 },
  detailText: { marginLeft: 8, fontSize: 13, color: '#475569' },

  moduleWrapper: { marginBottom: 12, borderRadius: 12, backgroundColor: '#F8FAFC', overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  moduleNumber: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  moduleName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  moduleMeta: { fontSize: 11, color: '#94A3B8' },
  
  lessonList: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  lessonRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  lessonTitle: { fontSize: 14, fontWeight: '600', color: '#334155' },
  lessonType: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginTop: 2 },
  
  noModulesContainer: { alignItems: 'center', padding: 40 },
  noModulesText: { fontSize: 16, fontWeight: '600', color: '#64748B', marginTop: 12 },
  noModulesSubtext: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  footer: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    padding: 20, 
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  footerPrice: { fontSize: 20, fontWeight: '900' },
  footerSub: { fontSize: 12, color: '#10B981', fontWeight: '700' },
  enrollBtn: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  enrollBtnText: { color: '#fff', fontWeight: '800' }
});