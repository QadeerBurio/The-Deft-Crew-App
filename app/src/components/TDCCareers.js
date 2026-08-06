import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  Dimensions,
  Alert,
  Platform,
  ToastAndroid,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard,
  Share,
  Linking,
  Animated,
  KeyboardAvoidingView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GuestGuard from "./GuestGuard";

const { width, height } = Dimensions.get("window");

const getBaseURL = () => {
  if (__DEV__) return "https://the-deft-crew-production.up.railway.app/api";
  return "https://the-deft-crew-production.up.railway.app/api";
};
const API_URL = `${getBaseURL()}/jobs`;

const COLORS = {
  page: "#0d0d0d",
  surface: "#161616",
  card: "#1c1c1c",
  line: "#272727",
  primary: "#ffffff",
  accent: "#f9c349",
  accentSoft: "#f9c34915",
  muted: "#666",
  body: "#aaa",
  error: "#ef4444",
  success: "#10b981",
  warning: "#f59e0b",
  info: "#3b82f6",
  purple: "#8b5cf6",
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ==================== TDC CAREER CARD ====================
const TDCCareerCard = React.memo(({ item, index, onPress, hasApplied }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animDelay = Math.min(index, 8) * 55;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: animDelay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: animDelay, useNativeDriver: true }),
    ]).start();
  }, [index]);

  const animatePress = (toValue) => {
    Animated.spring(scale, { toValue, friction: 8, tension: 90, useNativeDriver: true }).start();
  };

  return (
    <AnimatedTouchable
      style={[styles.card, { opacity, transform: [{ translateY }, { scale }] }]}
      activeOpacity={0.92}
      onPress={onPress}
      onPressIn={() => animatePress(0.97)}
      onPressOut={() => animatePress(1)}
    >
      {/* TDC Badge */}
      <View style={styles.tdcBadgeRow}>
        <View style={styles.tdcBadge}>
          <MaterialCommunityIcons name="star-circle" size={12} color="#f9c349" />
          <Text style={styles.tdcBadgeText}>The Deft Crew</Text>
        </View>
        {hasApplied && (
          <View style={styles.appliedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#10b981" />
            <Text style={styles.appliedBadgeText}>Applied</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
      {item.department && <Text style={styles.departmentText}>{item.department}</Text>}

      {/* Badges */}
      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Ionicons name="briefcase-outline" size={11} color="#f9c349" />
          <Text style={styles.typeBadgeText}>{item.type || "Full-time"}</Text>
        </View>
        {item.experienceLevel && (
          <View style={styles.expBadge}>
            <Ionicons name="trending-up-outline" size={11} color="#8b5cf6" />
            <Text style={styles.expBadgeText}>{item.experienceLevel}</Text>
          </View>
        )}
        {item.locationType && (
          <View style={styles.locTypeBadge}>
            <Ionicons name={item.locationType === "Remote" ? "laptop-outline" : "business-outline"} size={11} color="#10b981" />
            <Text style={styles.locTypeBadgeText}>{item.locationType}</Text>
          </View>
        )}
      </View>

      {/* Meta */}
      <View style={styles.infoRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-sharp" size={14} color="#f9c349" />
          <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={14} color="#f9c349" />
          <Text style={styles.metaText} numberOfLines={1}>{item.salary || "Competitive"}</Text>
        </View>
      </View>

      {/* Skills */}
      {item.skills?.length > 0 && (
        <View style={styles.skillsRow}>
          {item.skills.slice(0, 4).map((skill, idx) => (
            <View key={idx} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {item.skills.length > 4 && (
            <View style={styles.skillBadge}>
              <Text style={styles.skillText}>+{item.skills.length - 4}</Text>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsLabel}>
          {hasApplied ? "✓ View Status" : "Apply at TDC →"}
        </Text>
        <Ionicons
          name={hasApplied ? "eye-outline" : "arrow-forward-circle"}
          size={22}
          color="#f9c349"
        />
      </View>
    </AnimatedTouchable>
  );
});

// ==================== MAIN TDC CAREERS SCREEN ====================
const TDCCareers = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "", locationType: "", experienceLevel: "", category: "", datePosted: "all" });
  const [showFilters, setShowFilters] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedResume, setSelectedResume] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailJob, setDetailJob] = useState(null);
  
  // Refs for form inputs
  const scrollViewRef = useRef(null);
  const formRef = useRef(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalJobsCount, setTotalJobsCount] = useState(0);

  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslate = useRef(new Animated.Value(20)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const [applicationForm, setApplicationForm] = useState({
    fullName: "", email: "", phone: "", address: "", city: "", country: "",
    coverLetter: "", portfolioUrl: "", linkedInUrl: "", githubUrl: "",
    currentCompany: "", currentPosition: "", yearsOfExperience: "",
    expectedSalary: "", noticePeriod: "", workAuthorization: "Citizen",
  });

  const requiredFields = {
    fullName: "Full Name",
    email: "Email",
    phone: "Phone",
    coverLetter: "Cover Letter",
  };

  useEffect(() => { loadAuthData(); }, []);

  const loadAuthData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setApplicationForm(prev => ({ ...prev, fullName: userData.name || "", email: userData.email || "" }));
        }
      }
    } catch (err) { console.log("Error loading auth data:", err); }
  };

  const runEntranceAnimation = useCallback(() => {
    entranceOpacity.setValue(0); entranceTranslate.setValue(20);
    Animated.parallel([
      Animated.timing(entranceOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(entranceTranslate, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchJobs = useCallback(async (pageNum = 1, shouldAppend = false) => {
    const cleanPage = typeof pageNum === "number" && !isNaN(pageNum) ? pageNum : 1;
    const cleanAppend = typeof shouldAppend === "boolean" ? shouldAppend : false;

    if (cleanPage === 1) setLoading(true);
    else setLoadingMore(true);
    setError(false);

    try {
      let queryString = `page=${cleanPage}&limit=20`;
      if (search) queryString += `&search=${encodeURIComponent(search)}`;
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== "datePosted") queryString += `&${key}=${encodeURIComponent(value)}`;
      });

      const response = await axios.get(`${API_URL}/public/tdc?${queryString}`, { timeout: 10000 });
      let jobsData = Array.isArray(response.data.jobs) ? response.data.jobs : [];
      const total = response.data.total || 0;
      const respPage = response.data.page || cleanPage;

      if (filters.datePosted && filters.datePosted !== "all") {
        const now = new Date();
        jobsData = jobsData.filter(job => {
          const diffHours = (now - new Date(job.createdAt)) / (1000 * 60 * 60);
          switch (filters.datePosted) {
            case "24h": return diffHours <= 24;
            case "week": return diffHours <= 168;
            case "month": return diffHours <= 720;
            default: return true;
          }
        });
      }

      setJobs(prev => {
        const combined = cleanAppend ? [...prev, ...jobsData] : jobsData;
        const seen = new Set();
        const unique = combined.filter(j => {
          if (!j._id) return true;
          if (seen.has(j._id)) return false;
          seen.add(j._id); return true;
        });
        setHasMore(unique.length < total);
        return unique;
      });

      setPage(cleanPage);
      setTotalJobsCount(total);
      runEntranceAnimation();
    } catch (err) {
      setError(true);
      if (!cleanAppend) setJobs([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [filters, search, runEntranceAnimation]);

  // FIXED: fetchMyApplications with proper error handling
  const fetchMyApplications = useCallback(async () => {
    if (!token) {
      setMyApplications([]);
      setAppliedJobIds(new Set());
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/my-applications`, { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      
      const applications = Array.isArray(response.data) ? response.data : [];
      setMyApplications(applications);
      
      // Update applied job IDs
      const appliedIds = new Set(
        applications
          .map(app => app.jobId?._id)
          .filter(Boolean)
      );
      setAppliedJobIds(appliedIds);
      
      return applications;
    } catch (err) {
      console.log("Error fetching applications:", err);
      // Don't clear applications on error
      return [];
    }
  }, [token]);

  useEffect(() => {
    setPage(1); setJobs([]); setHasMore(true);
    const t = setTimeout(() => fetchJobs(1, false), 450);
    return () => clearTimeout(t);
  }, [search, filters, fetchJobs]);

  useEffect(() => { if (token) fetchMyApplications(); }, [token, fetchMyApplications]);

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchJobs(1, false); 
    if (token) fetchMyApplications(); 
  };

  const handleInputChange = (field, value) => {
    setApplicationForm(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => { const u = { ...prev }; delete u[field]; return u; });
    }
  };

  const validateForm = () => {
    const errors = {};
    Object.entries(requiredFields).forEach(([field, label]) => {
      if (!applicationForm[field]?.trim()) errors[field] = `${label} is required`;
    });
    if (!selectedResume) errors.resume = "Resume is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], 
        copyToCacheDirectory: true 
      });
      if (result.assets?.length > 0) {
        const file = result.assets[0];

        const allowedExtensions = ['pdf', 'doc', 'docx'];
        const fileExt = file.name?.split('.').pop()?.toLowerCase();

        if (!allowedExtensions.includes(fileExt)) {
          Alert.alert(
            'Unsupported Format ⚠️',
            'Only PDF (.pdf), Word (.doc), and Word OpenXML (.docx) formats are supported.'
          );
          return;
        }

        if (file.size && file.size > 10 * 1024 * 1024) {
          Alert.alert(
            'File Too Large ⚠️',
            'The selected file exceeds the 10MB limit. Please upload a smaller document.'
          );
          return;
        }

        setSelectedResume({ uri: file.uri, name: file.name, mimeType: file.mimeType, size: file.size });
        if (validationErrors.resume) setValidationErrors(prev => { const u = { ...prev }; delete u.resume; return u; });
      }
    } catch (err) { Alert.alert("Error", "Failed to pick resume."); }
  };

  // FIXED: Better resetForm function
  const resetForm = useCallback(() => {
    setApplicationForm({ 
      fullName: user?.name || "", 
      email: user?.email || "", 
      phone: "", 
      address: "", 
      city: "", 
      country: "", 
      coverLetter: "", 
      portfolioUrl: "", 
      linkedInUrl: "", 
      githubUrl: "", 
      currentCompany: "", 
      currentPosition: "", 
      yearsOfExperience: "", 
      expectedSalary: "", 
      noticePeriod: "", 
      workAuthorization: "Citizen" 
    });
    setSelectedResume(null);
    setValidationErrors({});
    setUploadProgress(0);
    setSubmitting(false);
  }, [user]);

  // FIXED: handleApply function with proper reset and state updates
  const handleApply = async () => {
    if (!token) {
      Alert.alert("Login Required", "Please login to apply", [
        { text: "Cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login") }
      ]);
      return;
    }
    
    if (!validateForm()) {
      Alert.alert("Missing Information", "Please fill all required fields marked with *");
      return;
    }
    
    setSubmitting(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      Object.entries(applicationForm).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      // Fix: Ensure resume is properly appended
      if (selectedResume) {
        formData.append("resume", { 
          uri: selectedResume.uri, 
          type: selectedResume.mimeType || "application/octet-stream", 
          name: selectedResume.name 
        });
      }
      
      await axios.post(`${API_URL}/apply/${selectedJob._id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "multipart/form-data" 
        },
        onUploadProgress: (e) => {
          const progress = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(progress);
        },
        timeout: 60000,
      });
      
      // Success notification
      if (Platform.OS === "android") {
        ToastAndroid.show("Application Submitted! 🎉", ToastAndroid.LONG);
      } else {
        Alert.alert("Success!", "Your application has been submitted to The Deft Crew team.");
      }
      
      // FIXED: Properly close modal and reset form
      setModalVisible(false);
      
      // FIXED: Reset form completely after submission
      resetForm();
      
      // FIXED: Refresh applications to update applied status
      await fetchMyApplications();
      
      // FIXED: Force refresh jobs to update applied status in list
      await fetchJobs(1, false);
      
    } catch (err) {
      console.error("Application error:", err);
      Alert.alert(
        "Error", 
        err.response?.data?.error || err.message || "Failed to submit application"
      );
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  // FIXED: openApplyModal with better handling
  const openApplyModal = (job) => {
    setSelectedJob(job);
    const alreadyApplied = appliedJobIds.has(job._id);
    
    if (alreadyApplied) {
      // Show detail modal for already applied jobs
      setDetailJob(job);
      setShowDetailModal(true);
      return;
    }
    
    // Reset form before showing for new application
    resetForm();
    setApplicationForm(prev => ({ 
      ...prev, 
      fullName: user?.name || "", 
      email: user?.email || "" 
    }));
    setValidationErrors({});
    setSelectedResume(null);
    setModalVisible(true);
  };

  // FIXED: Handle modal close properly
  const handleModalClose = () => {
    Keyboard.dismiss();
    setModalVisible(false);
    resetForm();
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchJobs(nextPage, true);
    }
  };

  // ==================== FILTER MODAL ====================
  const FilterModal = () => (
    <Modal 
      visible={showFilters} 
      animationType="slide" 
      transparent 
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.filterModalOverlay}>
        <TouchableWithoutFeedback onPress={() => setShowFilters(false)}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View style={styles.filterModalContent}>
          <View style={styles.modalDragHandle} />
          <TouchableOpacity style={styles.closeXButton} onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.filterModalTitle}>Filter Openings</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date Posted</Text>
              <View style={styles.filterOptions}>
                {[{ label: "Any Time", value: "all" }, { label: "Past 24 Hours", value: "24h" }, { label: "Past Week", value: "week" }, { label: "Past Month", value: "month" }].map(o => (
                  <TouchableOpacity 
                    key={o.value} 
                    style={[styles.filterChip, filters.datePosted === o.value && styles.filterChipActive]} 
                    onPress={() => setFilters(p => ({ ...p, datePosted: o.value }))}
                  >
                    <Text style={[styles.filterChipText, filters.datePosted === o.value && styles.filterChipTextActive]}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Job Type</Text>
              <View style={styles.filterOptions}>
                {["Full-time", "Part-time", "Contract", "Internship"].map(t => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.filterChip, filters.type === t && styles.filterChipActive]} 
                    onPress={() => setFilters(p => ({ ...p, type: p.type === t ? "" : t }))}
                  >
                    <Text style={[styles.filterChipText, filters.type === t && styles.filterChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Work Location</Text>
              <View style={styles.filterOptions}>
                {["Remote", "On-site", "Hybrid"].map(lt => (
                  <TouchableOpacity 
                    key={lt} 
                    style={[styles.filterChip, filters.locationType === lt && styles.filterChipActive]} 
                    onPress={() => setFilters(p => ({ ...p, locationType: p.locationType === lt ? "" : lt }))}
                  >
                    <Text style={[styles.filterChipText, filters.locationType === lt && styles.filterChipTextActive]}>
                      {lt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => { 
            setFilters({ type: "", locationType: "", experienceLevel: "", category: "", datePosted: "all" }); 
            setShowFilters(false); 
          }}>
            <Text style={styles.clearFiltersBtnText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ==================== JOB DETAIL MODAL (for applied jobs) ====================
  const DetailModal = () => {
    const myApp = myApplications.find(a => a.jobId?._id === detailJob?._id);
    const getStatusColor = (s) => ({ 
      pending: COLORS.warning, 
      reviewed: COLORS.info, 
      shortlisted: COLORS.success, 
      interview: COLORS.purple, 
      rejected: COLORS.error, 
      hired: "#059669" 
    }[s?.toLowerCase()] || COLORS.muted);
    const getStatusLabel = (s) => ({ 
      pending: "Pending Review", 
      reviewed: "Reviewed", 
      shortlisted: "Shortlisted", 
      interview: "Interview Stage", 
      rejected: "Not Selected", 
      hired: "Hired! 🎉" 
    }[s?.toLowerCase()] || s || "Unknown");
    return (
      <Modal 
        visible={showDetailModal} 
        animationType="slide" 
        transparent 
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailModalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowDetailModal(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.detailModalContent}>
            <View style={styles.modalDragHandle} />
            <TouchableOpacity style={styles.closeXButton} onPress={() => setShowDetailModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.detailModalTitle}>{detailJob?.title}</Text>
            <Text style={styles.detailModalCompany}>The Deft Crew</Text>
            {myApp && (
              <View style={[styles.statusBanner, { backgroundColor: getStatusColor(myApp.status) + "25", borderColor: getStatusColor(myApp.status) + "40" }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(myApp.status) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBannerTitle}>Application Status</Text>
                  <Text style={[styles.statusBannerStatus, { color: getStatusColor(myApp.status) }]}>
                    {getStatusLabel(myApp.status)}
                  </Text>
                </View>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionHeading}>📋 Description</Text>
                <Text style={styles.descriptionText}>{detailJob?.description}</Text>
              </View>
              {detailJob?.skills?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>💡 Required Skills</Text>
                  <View style={styles.skillsGrid}>
                    {detailJob.skills.map((s, i) => (
                      <View key={i} style={styles.skillBadgeLarge}>
                        <Text style={styles.skillBadgeLargeText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDetailModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ==================== APPLICATION FORM MODAL ====================
  const AppFormModal = () => {
    return (
      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        transparent 
        onRequestClose={handleModalClose}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.formModalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.formModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.formModalContent}>
                  <View style={styles.modalDragHandle} />
                  <TouchableOpacity style={styles.closeXButton} onPress={handleModalClose}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.formModalTitle}>Apply to TDC</Text>
                  <Text style={styles.formModalSubtitle}>{selectedJob?.title}</Text>
                  
                  <ScrollView 
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false} 
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.formScrollContent}
                  >
                    <Text style={styles.formRequiredNote}>* Required fields</Text>

                    {/* Personal Info */}
                    <Text style={styles.formLabel}>Full Name *</Text>
                    <TextInput 
                      style={[styles.formInput, validationErrors.fullName && styles.formInputError]} 
                      placeholder="Your full name" 
                      placeholderTextColor="#555" 
                      value={applicationForm.fullName} 
                      onChangeText={v => handleInputChange("fullName", v)}
                      editable={!submitting}
                    />
                    {validationErrors.fullName && <Text style={styles.errorText}>{validationErrors.fullName}</Text>}

                    <Text style={styles.formLabel}>Email *</Text>
                    <TextInput 
                      style={[styles.formInput, validationErrors.email && styles.formInputError]} 
                      placeholder="your@email.com" 
                      placeholderTextColor="#555" 
                      value={applicationForm.email} 
                      onChangeText={v => handleInputChange("email", v)} 
                      keyboardType="email-address" 
                      autoCapitalize="none"
                      editable={!submitting}
                    />
                    {validationErrors.email && <Text style={styles.errorText}>{validationErrors.email}</Text>}

                    <Text style={styles.formLabel}>Phone *</Text>
                    <TextInput 
                      style={[styles.formInput, validationErrors.phone && styles.formInputError]} 
                      placeholder="+92 300 1234567" 
                      placeholderTextColor="#555" 
                      value={applicationForm.phone} 
                      onChangeText={v => handleInputChange("phone", v)} 
                      keyboardType="phone-pad"
                      editable={!submitting}
                    />
                    {validationErrors.phone && <Text style={styles.errorText}>{validationErrors.phone}</Text>}

                    <View style={styles.formRow}>
                      <View style={styles.formHalf}>
                        <Text style={styles.formLabel}>City</Text>
                        <TextInput 
                          style={styles.formInput} 
                          placeholder="Karachi" 
                          placeholderTextColor="#555" 
                          value={applicationForm.city} 
                          onChangeText={v => handleInputChange("city", v)}
                          editable={!submitting}
                        />
                      </View>
                      <View style={styles.formHalf}>
                        <Text style={styles.formLabel}>Country</Text>
                        <TextInput 
                          style={styles.formInput} 
                          placeholder="Pakistan" 
                          placeholderTextColor="#555" 
                          value={applicationForm.country} 
                          onChangeText={v => handleInputChange("country", v)}
                          editable={!submitting}
                        />
                      </View>
                    </View>

                    <Text style={styles.formLabel}>LinkedIn Profile</Text>
                    <TextInput 
                      style={styles.formInput} 
                      placeholder="linkedin.com/in/yourprofile" 
                      placeholderTextColor="#555" 
                      value={applicationForm.linkedInUrl} 
                      onChangeText={v => handleInputChange("linkedInUrl", v)} 
                      autoCapitalize="none"
                      editable={!submitting}
                    />

                    <Text style={styles.formLabel}>Portfolio / GitHub</Text>
                    <TextInput 
                      style={styles.formInput} 
                      placeholder="github.com/yourprofile" 
                      placeholderTextColor="#555" 
                      value={applicationForm.portfolioUrl} 
                      onChangeText={v => handleInputChange("portfolioUrl", v)} 
                      autoCapitalize="none"
                      editable={!submitting}
                    />

                    <View style={styles.formRow}>
                      <View style={styles.formHalf}>
                        <Text style={styles.formLabel}>Years of Experience</Text>
                        <TextInput 
                          style={styles.formInput} 
                          placeholder="3" 
                          placeholderTextColor="#555" 
                          value={applicationForm.yearsOfExperience} 
                          onChangeText={v => handleInputChange("yearsOfExperience", v)} 
                          keyboardType="numeric"
                          editable={!submitting}
                        />
                      </View>
                      <View style={styles.formHalf}>
                        <Text style={styles.formLabel}>Expected Salary</Text>
                        <TextInput 
                          style={styles.formInput} 
                          placeholder="PKR 100,000" 
                          placeholderTextColor="#555" 
                          value={applicationForm.expectedSalary} 
                          onChangeText={v => handleInputChange("expectedSalary", v)}
                          editable={!submitting}
                        />
                      </View>
                    </View>

                    <Text style={styles.formLabel}>Cover Letter *</Text>
                    <TextInput 
                      style={[styles.formInput, styles.formTextArea, validationErrors.coverLetter && styles.formInputError]} 
                      placeholder="Tell us why you're a great fit for this role at TDC..." 
                      placeholderTextColor="#555" 
                      value={applicationForm.coverLetter} 
                      onChangeText={v => handleInputChange("coverLetter", v)} 
                      multiline 
                      numberOfLines={5} 
                      textAlignVertical="top"
                      editable={!submitting}
                    />
                    {validationErrors.coverLetter && <Text style={styles.errorText}>{validationErrors.coverLetter}</Text>}

                    {/* Resume Upload */}
                    <Text style={styles.formLabel}>Resume *</Text>
                    <TouchableOpacity 
                      style={[styles.resumeBtn, validationErrors.resume && styles.resumeBtnError]} 
                      onPress={pickResume}
                      disabled={submitting}
                    >
                      <Ionicons name={selectedResume ? "document-text" : "cloud-upload-outline"} size={20} color={selectedResume ? "#f9c349" : "#555"} />
                      <Text style={[styles.resumeBtnText, selectedResume && { color: "#f9c349" }]}>
                        {selectedResume ? selectedResume.name : "Upload Resume (PDF/DOC)"}
                      </Text>
                    </TouchableOpacity>
                    {validationErrors.resume && <Text style={styles.errorText}>{validationErrors.resume}</Text>}

                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                      </View>
                    )}

                    {/* Submit */}
                    <TouchableOpacity 
                      style={styles.submitBtn} 
                      onPress={handleApply} 
                      disabled={submitting} 
                      activeOpacity={0.85}
                    >
                      <View style={styles.submitBtnGradient}>
                        {submitting ? <ActivityIndicator color="#0d0d0d" /> : (
                          <>
                            <Ionicons name="send" size={16} color="#0d0d0d" />
                            <Text style={styles.submitBtnText}>Submit Application</Text>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                    
                    <View style={{ height: 40 }} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // HEADER ANIMATION STYLE
  const headerAnimatedStyle = {
    opacity: scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.95], extrapolate: "clamp" }),
    transform: [{ scale: scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.98], extrapolate: "clamp" }) }],
  };

  return (
    <GuestGuard navigation={navigation}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

        {/* HEADER */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              Careers at <Text style={{ color: "#f9c349" }}>TDC</Text>
            </Text>
            <Text style={styles.headerSub}>Join the Deft Crew</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={() => {
            if (!token) { Alert.alert("Login Required", "Please login"); return; }
            setShowApplicationsModal(true);
          }}>
            <Ionicons name="document-text-outline" size={22} color="#f9c349" />
            {myApplications.length > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{myApplications.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* TDC Banner */}
        <View style={styles.tdcBanner}>
          <MaterialCommunityIcons name="star-circle" size={18} color="#f9c349" />
          <Text style={styles.tdcBannerText}>
            {totalJobsCount > 0 ? `${totalJobsCount} opening${totalJobsCount !== 1 ? "s" : ""} available` : "Internal openings at The Deft Crew"}
          </Text>
        </View>

        {/* SEARCH */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#555" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search TDC roles..."
              placeholderTextColor="#555"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#555" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterIcon}>
              <Ionicons name="options-outline" size={20} color="#f9c349" />
              {Object.values(filters).some(v => v && v !== "all") && <View style={styles.filterDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENT */}
        {loading ? (
          <View style={styles.centerSection}>
            <ActivityIndicator size="large" color="#f9c349" />
            <Text style={styles.loadingText}>Loading TDC openings...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerSection}>
            <MaterialCommunityIcons name="wifi-off" size={50} color="#333" />
            <Text style={styles.errorTitle}>Connection Error</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchJobs(1, false)}>
              <View style={styles.retryGradient}><Text style={styles.retryText}>Retry</Text></View>
            </TouchableOpacity>
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.centerSection}>
            <MaterialCommunityIcons name="briefcase-search" size={60} color="#2a2a2a" />
            <Text style={styles.emptyTitle}>No Openings Found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? `No TDC roles match "${search}"` : "No open positions right now. Check back soon!"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={item => item._id}
            renderItem={({ item, index }) => (
              <TDCCareerCard
                item={item}
                index={index}
                hasApplied={appliedJobIds.has(item._id)}
                onPress={() => openApplyModal(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f9c349" />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            ListFooterComponent={loadingMore ? <ActivityIndicator color="#f9c349" style={{ marginVertical: 20 }} /> : null}
          />
        )}

        <FilterModal />
        {showDetailModal && detailJob && <DetailModal />}
        <AppFormModal />

        {/* My Applications Modal */}
        <Modal 
          visible={showApplicationsModal} 
          animationType="slide" 
          transparent 
          onRequestClose={() => setShowApplicationsModal(false)}
        >
          <View style={styles.appsModalOverlay}>
            <TouchableWithoutFeedback onPress={() => setShowApplicationsModal(false)}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
            <View style={styles.appsModalContent}>
              <View style={styles.modalDragHandle} />
              <TouchableOpacity style={styles.closeXButton} onPress={() => setShowApplicationsModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.appsModalTitle}>My TDC Applications</Text>
              <Text style={styles.appsModalCount}>{myApplications.length} applications</Text>
              {myApplications.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="briefcase-search" size={50} color="#2a2a2a" />
                  <Text style={styles.emptyStateText}>No applications yet</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.6 }}>
                  {myApplications.map(app => {
                    const statusColors = { pending: COLORS.warning, reviewed: COLORS.info, shortlisted: COLORS.success, interview: COLORS.purple, rejected: COLORS.error, hired: "#059669" };
                    const statusLabels = { pending: "Pending", reviewed: "Reviewed", shortlisted: "Shortlisted", interview: "Interview", rejected: "Not Selected", hired: "Hired! 🎉" };
                    const sc = statusColors[app.status?.toLowerCase()] || COLORS.muted;
                    return (
                      <View key={app._id} style={styles.appCard}>
                        <View style={styles.appHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.appJobTitle}>{app.jobId?.title}</Text>
                            <Text style={styles.appCompany}>The Deft Crew</Text>
                          </View>
                          <View style={[styles.appStatus, { backgroundColor: sc + "25" }]}>
                            <Text style={[styles.appStatusText, { color: sc }]}>
                              {statusLabels[app.status?.toLowerCase()] || app.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.appDate}>Applied: {new Date(app.appliedAt).toLocaleDateString()}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowApplicationsModal(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GuestGuard>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.page, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  headerBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surface },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: COLORS.primary, letterSpacing: -0.5 },
  headerSub: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  headerBadge: { position: "absolute", top: -4, right: -4, backgroundColor: COLORS.accent, borderRadius: 8, minWidth: 16, height: 16, justifyContent: "center", alignItems: "center" },
  headerBadgeText: { fontSize: 9, fontWeight: "800", color: "#0d0d0d" },
  // TDC Banner
  tdcBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f9c34910", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9c34920" },
  tdcBannerText: { fontSize: 12, color: "#f9c349", fontWeight: "700" },
  // Search
  searchWrapper: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.line, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.primary },
  filterIcon: { padding: 4, position: "relative" },
  filterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent, position: "absolute", top: 0, right: 0 },
  listContent: { padding: 16, gap: 12, paddingBottom: 60 },
  centerSection: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingHorizontal: 32 },
  loadingText: { color: COLORS.muted, fontSize: 14 },
  errorTitle: { fontSize: 16, fontWeight: "800", color: COLORS.primary, marginTop: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.primary },
  emptySubtitle: { fontSize: 13, color: COLORS.muted, textAlign: "center", lineHeight: 18 },
  retryBtn: { marginTop: 8 },
  retryGradient: { backgroundColor: COLORS.accent, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  retryText: { fontWeight: "800", color: "#0d0d0d" },
  // Card
  card: { backgroundColor: COLORS.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.line },
  tdcBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  tdcBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#f9c34915", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: "#f9c34930" },
  tdcBadgeText: { fontSize: 10, color: "#f9c349", fontWeight: "700" },
  appliedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#10b98115", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: "#10b98130" },
  appliedBadgeText: { fontSize: 10, color: "#10b981", fontWeight: "700" },
  jobTitle: { fontSize: 17, fontWeight: "900", color: COLORS.primary, marginBottom: 4, lineHeight: 22 },
  departmentText: { fontSize: 12, color: COLORS.muted, marginBottom: 10 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f9c34910", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, color: "#f9c349", fontWeight: "700" },
  expBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#8b5cf610", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  expBadgeText: { fontSize: 10, color: "#8b5cf6", fontWeight: "700" },
  locTypeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#10b98110", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  locTypeBadgeText: { fontSize: 10, color: "#10b981", fontWeight: "700" },
  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: COLORS.body, maxWidth: width * 0.4 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  skillBadge: { backgroundColor: "#1f1f1f", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#2a2a2a" },
  skillText: { fontSize: 10, color: COLORS.muted, fontWeight: "600" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line },
  viewDetailsLabel: { fontSize: 12, fontWeight: "700", color: "#f9c349" },
  // Filter Modal
  filterModalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  filterModalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.75 },
  filterModalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.primary, marginBottom: 20, textAlign: "center" },
  filterGroup: { marginBottom: 20 },
  filterLabel: { fontSize: 13, fontWeight: "800", color: COLORS.primary, marginBottom: 10 },
  filterOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipText: { fontSize: 12, color: COLORS.muted, fontWeight: "600" },
  filterChipTextActive: { color: "#0d0d0d", fontWeight: "800" },
  clearFiltersBtn: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 14, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: COLORS.line },
  clearFiltersBtnText: { fontSize: 14, color: COLORS.muted, fontWeight: "700" },
  // Modals shared
  modalDragHandle: { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  closeXButton: { position: "absolute", top: 16, right: 16, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  closeBtn: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 14, alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: COLORS.line },
  closeBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.muted },
  // Detail Modal
  detailModalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.8)" },
  detailModalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.85 },
  detailModalTitle: { fontSize: 20, fontWeight: "900", color: COLORS.primary, marginTop: 16, marginBottom: 4 },
  detailModalCompany: { fontSize: 13, color: "#f9c349", fontWeight: "700", marginBottom: 16 },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusBannerTitle: { fontSize: 11, color: COLORS.muted, fontWeight: "600" },
  statusBannerStatus: { fontSize: 14, fontWeight: "800" },
  detailSection: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  sectionHeading: { fontSize: 14, fontWeight: "800", color: COLORS.primary, marginBottom: 10 },
  descriptionText: { fontSize: 13, color: COLORS.body, lineHeight: 20 },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillBadgeLarge: { backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line },
  skillBadgeLargeText: { fontSize: 11, color: COLORS.body, fontWeight: "600" },
  // Form Modal
  formModalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.85)" },
  formModalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.92 },
  formModalTitle: { fontSize: 20, fontWeight: "900", color: COLORS.primary, marginTop: 16, marginBottom: 2 },
  formModalSubtitle: { fontSize: 13, color: "#f9c349", fontWeight: "700", marginBottom: 16 },
  formRequiredNote: { fontSize: 11, color: COLORS.error, fontWeight: "600", marginBottom: 12 },
  formScrollContent: { paddingBottom: 20 },
  formLabel: { fontSize: 12, fontWeight: "700", color: COLORS.primary, marginBottom: 5, marginTop: 8 },
  formInput: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, fontSize: 13, marginBottom: 4, backgroundColor: COLORS.surface, color: COLORS.primary },
  formInputError: { borderColor: COLORS.error, backgroundColor: "#1a0000" },
  formTextArea: { height: 100, textAlignVertical: "top" },
  formRow: { flexDirection: "row", gap: 10 },
  formHalf: { flex: 1 },
  errorText: { fontSize: 10, color: COLORS.error, fontWeight: "600", marginBottom: 6, marginLeft: 4 },
  resumeBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line, borderStyle: "dashed", marginBottom: 4, backgroundColor: COLORS.surface },
  resumeBtnError: { borderColor: COLORS.error },
  resumeBtnText: { fontSize: 13, color: COLORS.muted, fontWeight: "500", flex: 1 },
  progressBar: { height: 4, backgroundColor: COLORS.line, borderRadius: 2, marginBottom: 10, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 2 },
  submitBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 10, marginTop: 8 },
  submitBtnGradient: { height: 52, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: COLORS.accent },
  submitBtnText: { color: "#0d0d0d", fontSize: 15, fontWeight: "900" },
  // My Apps Modal
  appsModalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.8)" },
  appsModalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.8 },
  appsModalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.primary, marginTop: 16, marginBottom: 4 },
  appsModalCount: { fontSize: 12, color: COLORS.muted, marginBottom: 16 },
  appCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.line },
  appHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  appJobTitle: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
  appCompany: { fontSize: 11, color: "#f9c349", fontWeight: "600" },
  appStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  appStatusText: { fontSize: 10, fontWeight: "700" },
  appDate: { fontSize: 11, color: COLORS.muted },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyStateText: { fontSize: 14, color: COLORS.muted, fontWeight: "600" },
});

export default TDCCareers;