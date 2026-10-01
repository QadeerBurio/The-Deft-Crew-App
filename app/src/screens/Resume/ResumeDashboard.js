// app/src/screens/Resume/ResumeDashboardScreen.js
import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Share,
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
  Animated,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { ResumeContext } from '../../context/ResumeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { renderResumeHTML } from '../../services/templateService';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const MAX_CREATIONS = 2;

const ResumeDashboardScreen = ({ navigation }) => {
  const { user, isGuest } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const {
    resumes = [],
    creationsUsed = 0,
    fetchResumes,
    loadResume,
    deleteResume,
    getRecommendedJobs,
    getJobRecommendations,
    updateResume,
    optimizeResume,
    checkResumeFit,
    loading,
    duplicateResume,
  } = useContext(ResumeContext);

  const safeResumes = Array.isArray(resumes) ? resumes : [];
  const totalCreationsUsed =
    creationsUsed !== undefined && creationsUsed !== null
      ? creationsUsed
      : safeResumes.length;

  const [recommendationsError, setRecommendationsError] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const [selectedResume, setSelectedResume] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showAllResumes, setShowAllResumes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResumes, setFilteredResumes] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [skillGapVisible, setSkillGapVisible] = useState(false);
  const [skillGapData, setSkillGapData] = useState({ missingSkills: [], message: '' });
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [savingJobId, setSavingJobId] = useState(null);

  // ============================================================
  // Entrance animation
  // ============================================================
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  // ============================================================
  // Fetch on focus
  // ============================================================
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        if (safeResumes.length === 0) setIsLoading(true);
        await fetchResumes(true);
        setIsLoading(false);
      };
      loadData();
    }, [safeResumes.length])
  );

  // ============================================================
  // Sync selected resume when resumes array updates
  // ============================================================
  useEffect(() => {
    if (safeResumes && safeResumes.length > 0) {
      if (selectedResume) {
        const fresh = safeResumes.find(r => r._id === selectedResume._id);
        if (fresh) {
          setSelectedResume(fresh);
        } else {
          const firstResume = safeResumes[0];
          setSelectedResume(firstResume);
          loadResume(firstResume._id);
          fetchRecommendations(firstResume._id);
        }
      } else {
        const firstResume = safeResumes[0];
        setSelectedResume(firstResume);
        loadResume(firstResume._id);
        fetchRecommendations(firstResume._id);
      }
      setFilteredResumes(safeResumes);
    } else {
      setSelectedResume(null);
      setFilteredResumes([]);
    }
  }, [resumes]);

  useEffect(() => {
    if (selectedResume && selectedResume._id) {
      fetchRecommendations(selectedResume._id);
    }
  }, [selectedResume]);

  // Search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredResumes(safeResumes);
    } else {
      const q = searchQuery.toLowerCase().trim();
      const filtered = safeResumes.filter(r => {
        const name = `${r.personalInfo?.firstName || ''} ${r.personalInfo?.lastName || ''}`.toLowerCase();
        const title = r.professionalSummary?.title?.toLowerCase() || '';
        const jobTitle = r.targetJob?.jobTitle?.toLowerCase() || '';
        return name.includes(q) || title.includes(q) || jobTitle.includes(q);
      });
      setFilteredResumes(filtered);
    }
  }, [searchQuery, resumes]);

  // ============================================================
  // Refresh
  // ============================================================
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchResumes();
    if (safeResumes && safeResumes.length > 0) {
      const firstResume = safeResumes[0];
      setSelectedResume(firstResume);
      await fetchRecommendations(firstResume._id);
    }
    setRefreshing(false);
  }, [resumes]);

  // ============================================================
  // Recommendations
  // ============================================================
  const fetchRecommendations = async (resumeId) => {
    try {
      setRecommendationsLoading(true);
      setRecommendationsError(null);
      const response = await getJobRecommendations(resumeId, { limit: 10, page: 1 });
      setRecommendations(response?.recommendations || []);
    } catch (error) {
      console.error('Fetch recommendations error:', error);
      setRecommendations([]);
      setRecommendationsError('Failed to load personalized recommendations. Please try again.');
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // ============================================================
  // Resume selection
  // ============================================================
  const handleSelectResume = (resume) => {
    if (resume && resume._id) {
      setSelectedResume(resume);
      loadResume(resume._id);
      setShowAllResumes(false);
    }
  };

  // ============================================================
  // Delete resume — counters update instantly
  // ============================================================
  const handleDeleteResume = (resumeId) => {
    Alert.alert(
      'Delete Resume',
      'Are you sure you want to delete this resume? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteResume(resumeId);
              // Optimistically clear selection
              if (selectedResume?._id === resumeId) {
                const remaining = safeResumes.filter(r => r._id !== resumeId);
                setSelectedResume(remaining.length > 0 ? remaining[0] : null);
              }
              // Refetch — backend returns fresh creationsUsed count
              await fetchResumes(true);
              Alert.alert('✅ Success', 'Resume deleted successfully');
            } catch (error) {
              Alert.alert('❌ Error', error?.message || 'Failed to delete resume');
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // Download / share / optimize handlers (unchanged)
  // ============================================================
  const handleDownloadResume = async (resume, format = 'pdf') => {
    if (!resume) return Alert.alert('Error', 'No resume selected');
    try {
      setDownloading(true);
      setDownloadProgress(10);
      setDownloadModalVisible(true);
      const html = renderResumeHTML(resume, resume.template || 'modern_ats', resume.customStyles || {}, true);
      setDownloadProgress(30);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setDownloadProgress(70);
      const firstName = (resume.personalInfo?.firstName || 'User').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const lastName = (resume.personalInfo?.lastName || 'Resume').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${firstName}_${lastName}_Resume.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      if (resume._id) {
        await updateResume(resume._id, { downloadCount: (resume.downloadCount || 0) + 1 });
      }
      setDownloadProgress(90);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${firstName} ${lastName} Resume`,
          UTI: 'com.adobe.pdf',
        });
        setDownloadProgress(100);
        Alert.alert('✅ Success', 'Resume downloaded successfully!');
      } else {
        setDownloadProgress(100);
        Alert.alert('✅ Success', `Resume saved as: ${fileName}`);
      }
      setTimeout(() => {
        setDownloadModalVisible(false);
        setDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Download error:', error);
      setDownloading(false);
      setDownloadModalVisible(false);
      setDownloadProgress(0);
      Alert.alert('❌ Error', 'Failed to download resume: ' + error.message);
    }
  };

  const handleDownloadHTML = async (resume) => {
    if (!resume) return Alert.alert('Error', 'No resume selected');
    try {
      setDownloading(true);
      setDownloadProgress(10);
      setDownloadModalVisible(true);
      const html = renderResumeHTML(resume, resume.template || 'modern_ats', resume.customStyles || {}, true);
      setDownloadProgress(50);
      const fileName = `Resume_${resume.personalInfo?.firstName || 'Resume'}_${Date.now()}.html`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });
      setDownloadProgress(80);
      if (resume._id) {
        await updateResume(resume._id, { downloadCount: (resume.downloadCount || 0) + 1 });
      }
      setDownloadProgress(100);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: `Resume_${resume.personalInfo?.firstName || 'Resume'}.html`,
        });
      }
      setTimeout(() => {
        setDownloadModalVisible(false);
        setDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Download HTML error:', error);
      setDownloading(false);
      setDownloadModalVisible(false);
      setDownloadProgress(0);
      Alert.alert('❌ Error', 'Failed to download HTML resume');
    }
  };

  const handleDownloadJSON = async (resume) => {
    if (!resume) return Alert.alert('Error', 'No resume selected');
    try {
      setDownloading(true);
      setDownloadProgress(10);
      setDownloadModalVisible(true);
      const jsonData = JSON.stringify(resume, null, 2);
      setDownloadProgress(50);
      const fileName = `Resume_${resume.personalInfo?.firstName || 'Resume'}_${Date.now()}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, jsonData, { encoding: FileSystem.EncodingType.UTF8 });
      setDownloadProgress(80);
      if (resume._id) {
        await updateResume(resume._id, { downloadCount: (resume.downloadCount || 0) + 1 });
      }
      setDownloadProgress(100);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: `Resume_${resume.personalInfo?.firstName || 'Resume'}.json`,
        });
      }
      setTimeout(() => {
        setDownloadModalVisible(false);
        setDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Download JSON error:', error);
      setDownloading(false);
      setDownloadModalVisible(false);
      setDownloadProgress(0);
      Alert.alert('❌ Error', 'Failed to download JSON resume');
    }
  };

  const handleShareResume = async (resume) => {
    try {
      if (!resume) return Alert.alert('Error', 'No resume selected');
      const shareMessage = `
📄 Resume: ${resume?.personalInfo?.firstName || ''} ${resume?.personalInfo?.lastName || ''}

${resume?.professionalSummary?.summary || ''}

🎯 Target Job: ${resume?.targetJob?.jobTitle || 'Not specified'}

💼 Experience: ${resume?.workExperience?.length || 0} positions
🎓 Education: ${resume?.education?.length || 0} degrees
🔧 Skills: ${resume?.skills?.map(s => s.name).join(', ') || 'None listed'}

${resume?.completionPercentage || 0}% Complete
      `;
      const result = await Share.share({
        message: shareMessage,
        title: `${resume?.personalInfo?.firstName || ''}'s Resume`,
      });
      if (result.action === Share.sharedAction) {
        if (resume._id) {
          await updateResume(resume._id, { shareCount: (resume.shareCount || 0) + 1 });
        }
        Alert.alert('✅ Success', 'Resume shared successfully!');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('❌ Error', 'Failed to share resume');
    }
  };

  // ============================================================
  // Optimize resume flow
  // ============================================================
  const handleOptimizeResumeFlow = async (job) => {
    if (isGuest) return Alert.alert('Login Required', 'Please log in to optimize your resume.');
    if (!selectedResume || !selectedResume._id) {
      return Alert.alert('No Resume Found', 'Please create or upload a resume first.');
    }
    try {
      setDownloading(true);
      setDownloadProgress(10);
      setDownloadModalVisible(true);
      const fitResult = await checkResumeFit(selectedResume._id, job._id);
      if (!fitResult.meetsRequirements) {
        setDownloadModalVisible(false);
        setDownloading(false);
        setSkillGapData({
          missingSkills: fitResult.missingSkills || [],
          message:
            'Your current expertise does not fully match the requirements for this role. To apply, you should enhance your skills in',
        });
        setSkillGapVisible(true);
        return;
      }
      setDownloadProgress(40);
      const tailored = await optimizeResume(selectedResume._id, {
        jobId: job._id,
        jobTitle: job.title,
        jobDescription: job.description || `Target role: ${job.title}`,
      });
      if (!tailored) throw new Error('AI tailoring returned empty results.');
      setDownloadProgress(75);
      const html = renderResumeHTML(tailored, tailored.template || 'modern_ats', tailored.customStyles || {}, true);
      setDownloadProgress(85);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const firstName = (tailored.personalInfo?.firstName || 'User').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const lastName = (tailored.personalInfo?.lastName || 'Resume').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${firstName}_${lastName}_Optimized_Resume.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      setDownloadProgress(100);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${firstName} ${lastName} Optimized Resume`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('✅ Success', `Optimized resume saved as: ${fileName}`);
      }
      // Refresh to update counter after tailor creates new resume
      await fetchResumes(true);
      setTimeout(() => {
        setDownloadModalVisible(false);
        setDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Optimization flow error:', error);
      setDownloading(false);
      setDownloadModalVisible(false);
      setDownloadProgress(0);
      Alert.alert('❌ Error', 'Failed to optimize resume: ' + error.message);
    }
  };

  const handleApplyToJob = (job) => {
    const applyUrl =
      job.externalUrl || job.companyWebsite || 'https://pk.indeed.com/q-remote-internship-jobs.html';
    Linking.openURL(applyUrl).catch(() => {
      Alert.alert('Cannot Open Link', 'The application link could not be opened.');
    });
  };

  const handleSaveJob = async (job) => {
    if (isGuest) return Alert.alert('Login Required', 'Please log in to save jobs.');
    if (!job?._id || savingJobId === job._id) return;
    try {
      setSavingJobId(job._id);
      const resumeApiModule = require('../../api/resumeApi');
const resumeApi = resumeApiModule.default || resumeApiModule.resumeApi || resumeApiModule;
      if (savedJobIds.has(job._id)) {
        await resumeApi.unsaveJob(job._id);
        setSavedJobIds(prev => {
          const next = new Set(prev);
          next.delete(job._id);
          return next;
        });
        Alert.alert('✅ Removed', `"${job.title}" removed from saved jobs.`);
      } else {
        await resumeApi.saveJob(job._id);
        setSavedJobIds(prev => new Set([...prev, job._id]));
        Alert.alert('✅ Saved', `"${job.title}" saved to your bookmarks!`);
      }
    } catch (error) {
      const alreadySaved = error?.message?.toLowerCase().includes('already');
      if (alreadySaved) {
        setSavedJobIds(prev => new Set([...prev, job._id]));
        Alert.alert('ℹ️ Already saved', `"${job.title}" is already in your saved jobs.`);
      } else {
        Alert.alert('❌ Error', 'Failed to save job. Please try again.');
      }
    } finally {
      setSavingJobId(null);
    }
  };

  // ============================================================
  // Navigation
  // ============================================================
  const handleViewResume = (resume) => {
    if (!resume?._id) return Alert.alert('Error', 'No resume selected');
    navigation.navigate('ResumeView', { resumeId: resume._id });
  };
  const handleEditResume = (resume) => {
    if (!resume?._id) return Alert.alert('Error', 'No resume selected');
    navigation.navigate('ResumeBuilder', { resumeId: resume._id });
  };
  const handleAnalytics = (resume) => {
    if (!resume?._id) return Alert.alert('Error', 'No resume selected');
    navigation.navigate('ResumeAnalytics', { resumeId: resume._id });
  };
  const handleSettings = (resume) => {
    if (!resume?._id) return Alert.alert('Error', 'No resume selected');
    navigation.navigate('ResumeSettings', { resumeId: resume._id });
  };
  const handleDuplicateResume = async (resumeId) => {
    try {
      setIsLoading(true);
      const duplicated = await duplicateResume(resumeId);
      if (duplicated) {
        setSelectedResume(duplicated);
        await fetchResumes(true);
        Alert.alert('✅ Success', 'Resume duplicated successfully!');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to duplicate resume: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Helpers
  // ============================================================
  const getStatusColor = (p) => {
    if (p >= 80) return '#2ECC71';
    if (p >= 50) return '#f9c349';
    if (p >= 30) return '#E67E22';
    return '#E74C3C';
  };
  const getStatusText = (p) => {
    if (p >= 80) return 'Excellent';
    if (p >= 50) return 'Good';
    if (p >= 30) return 'Needs Work';
    return 'Incomplete';
  };

  // ============================================================
  // Render: recommendations
  // ============================================================
  const renderRecommendations = () => {
    if (recommendationsLoading) {
      return (
        <View style={styles.recommendationsLoading}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Finding best matches...</Text>
        </View>
      );
    }
    if (recommendationsError) {
      return (
        <View style={styles.emptyJobsContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E74C3C" />
          <Text style={styles.emptyJobsTitle}>Connection Issue</Text>
          <Text style={styles.emptyJobsText}>{recommendationsError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchRecommendations(selectedResume?._id)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!recommendations || recommendations.length === 0) {
      return (
        <View style={styles.emptyJobsContainer}>
          <Ionicons name="briefcase-outline" size={48} color="#ccc" />
          <Text style={styles.emptyJobsTitle}>No Matches Found Yet</Text>
          <Text style={styles.emptyJobsText}>
            {selectedResume
              ? "We couldn't find any job matches for your current skills. Try editing your resume to add more skills or certifications."
              : 'Complete your resume to get personalized job matches.'}
          </Text>
          <TouchableOpacity
            style={styles.buildResumeButton}
            onPress={() =>
              navigation.navigate(
                'ResumeBuilder',
                selectedResume ? { resumeId: selectedResume._id } : undefined
              )
            }
          >
            <Text style={styles.buildResumeButtonText}>
              {selectedResume ? 'Update Your Resume' : 'Build Your Resume'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return recommendations.map((job, index) => {
      const matchColor =
        job.matchPercentage >= 80 ? '#2ECC71' : job.matchPercentage >= 60 ? '#f9c349' : '#E74C3C';
      return (
        <Animated.View
          key={job._id || index}
          style={[styles.jobCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {job.urgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>URGENT</Text>
            </View>
          )}
          {job.featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>FEATURED</Text>
            </View>
          )}
          <View style={styles.jobHeader}>
            <View style={styles.jobTitleContainer}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <View style={[styles.matchBadge, { backgroundColor: matchColor }]}>
                <Text style={styles.matchText}>{job.matchPercentage}% Match</Text>
              </View>
            </View>
            <Text style={styles.jobCompany}>{job.companyName || job.company || 'Company'}</Text>
          </View>
          <View style={styles.jobDetails}>
            <View style={styles.jobDetailItem}>
              <Ionicons name="business-outline" size={16} color="#666" />
              <Text style={styles.jobDetailText}>{job.department || 'Technology'}</Text>
            </View>
            <View style={styles.jobDetailItem}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.jobDetailText}>{job.location || 'Remote'}</Text>
            </View>
            <View style={styles.jobDetailItem}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.jobDetailText}>{job.salary || 'Competitive'}</Text>
            </View>
            <View style={styles.jobDetailItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.jobDetailText}>{job.type || 'Full-time'}</Text>
            </View>
          </View>
          {job.matchedSkills && job.matchedSkills.length > 0 && (
            <View style={styles.matchedSkillsContainer}>
              <Text style={styles.matchedSkillsLabel}>Matched Skills:</Text>
              <View style={styles.matchedSkillsList}>
                {job.matchedSkills.slice(0, 4).map((skill, idx) => (
                  <View key={idx} style={styles.matchedSkillTag}>
                    <Text style={styles.matchedSkillText}>{skill}</Text>
                  </View>
                ))}
                {job.matchedSkills.length > 4 && (
                  <Text style={styles.moreSkillsText}>+{job.matchedSkills.length - 4} more</Text>
                )}
              </View>
            </View>
          )}
          {job.matchReasons && job.matchReasons.length > 0 && (
            <View style={styles.matchReasonsContainer}>
              <Text style={styles.matchReasonsLabel}>Why this matches:</Text>
              <View style={styles.matchReasonsList}>
                {job.matchReasons.slice(0, 3).map((reason, idx) => (
                  <View key={idx} style={styles.matchReasonTag}>
                    <Ionicons name="checkmark-circle" size={12} color="#2ECC71" />
                    <Text style={styles.matchReasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <TouchableOpacity onPress={() => setExpandedJobId(expandedJobId === job._id ? null : job._id)}>
            <Text
              style={styles.jobDescription}
              numberOfLines={expandedJobId === job._id ? undefined : 3}
            >
              {job.description || 'Great opportunity to join our team and grow your career.'}
            </Text>
            <Text
              style={{
                color: '#f9c349',
                fontSize: 12,
                fontWeight: '600',
                marginTop: 2,
                marginBottom: 6,
              }}
            >
              {expandedJobId === job._id ? 'Show Less ▲' : 'Read Full Description ▼'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optimizeButton, { backgroundColor: '#f9c349' }]}
            onPress={() => handleApplyToJob(job)}
          >
            <Text style={[styles.optimizeButtonText, { color: '#000' }]}>Apply Now</Text>
            <Ionicons name="arrow-forward" size={16} color="#000" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <View style={styles.jobActions}>
            <TouchableOpacity style={styles.applyButton} onPress={() => handleOptimizeResumeFlow(job)}>
              <Ionicons name="sparkles" size={14} color="#f9c349" style={{ marginRight: 4 }} />
              <Text style={styles.applyButtonText}>Optimize Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveJobButton}
              onPress={() => handleSaveJob(job)}
              disabled={savingJobId === job._id}
            >
              {savingJobId === job._id ? (
                <ActivityIndicator size="small" color="#f9c349" />
              ) : (
                <Ionicons
                  name={savedJobIds.has(job._id) ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={savedJobIds.has(job._id) ? '#f9c349' : '#666'}
                />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    });
  };

  // ============================================================
  // Render: download modal
  // ============================================================
  const renderDownloadModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={downloadModalVisible}
      onRequestClose={() => {
        if (!downloading) setDownloadModalVisible(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {downloading ? 'Downloading Resume...' : 'Download Options'}
            </Text>
            {!downloading && (
              <TouchableOpacity onPress={() => setDownloadModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            )}
          </View>
          {downloading ? (
            <View style={styles.downloadProgressContainer}>
              <ActivityIndicator size="large" color="#f9c349" />
              <Text style={styles.downloadProgressText}>{downloadProgress}% Complete</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
              </View>
            </View>
          ) : (
            <View style={styles.downloadOptions}>
              <TouchableOpacity
                style={styles.downloadOption}
                onPress={() => handleDownloadResume(selectedResume, 'pdf')}
              >
                <View style={[styles.downloadOptionIcon, { backgroundColor: '#E74C3C' }]}>
                  <Ionicons name="document-text" size={28} color="#fff" />
                </View>
                <View style={styles.downloadOptionInfo}>
                  <Text style={styles.downloadOptionTitle}>PDF Resume</Text>
                  <Text style={styles.downloadOptionDesc}>
                    Professional PDF format, ready for printing
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.downloadOption}
                onPress={() => handleDownloadHTML(selectedResume)}
              >
                <View style={[styles.downloadOptionIcon, { backgroundColor: '#f9c349' }]}>
                  <Ionicons name="code" size={28} color="#fff" />
                </View>
                <View style={styles.downloadOptionInfo}>
                  <Text style={styles.downloadOptionTitle}>HTML Resume</Text>
                  <Text style={styles.downloadOptionDesc}>
                    Web-ready HTML format with styling
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.downloadOption}
                onPress={() => handleDownloadJSON(selectedResume)}
              >
                <View style={[styles.downloadOptionIcon, { backgroundColor: '#9B59B6' }]}>
                  <Ionicons name="database" size={28} color="#fff" />
                </View>
                <View style={styles.downloadOptionInfo}>
                  <Text style={styles.downloadOptionTitle}>JSON Data</Text>
                  <Text style={styles.downloadOptionDesc}>
                    Raw resume data in JSON format
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // ============================================================
  // Loading state
  // ============================================================
  if (isLoading || (loading && resumes.length === 0)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading your resumes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasResumes = safeResumes.length > 0;
  const limitReached = totalCreationsUsed >= MAX_CREATIONS;

  // ============================================================
  // Main render
  // ============================================================
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <Animated.View
        style={[
          styles.contentContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* ==================== HEADER ==================== */}
        <View style={[styles.header, { paddingTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{isGuest ? 'Guest User' : user?.name || 'User'}</Text>
            <Text style={styles.creationCounter}>
              Resumes: {totalCreationsUsed} / {MAX_CREATIONS}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.newResumeButton, limitReached && { opacity: 0.5 }]}
            onPress={() => {
              if (limitReached) {
                Alert.alert(
                  'Resume Limit Reached',
                  `You can have at most ${MAX_CREATIONS} resumes at a time. Delete an existing resume to create a new one.`
                );
                return;
              }
              navigation.navigate('ResumeBuilder');
            }}
          >
            <Ionicons name="add" size={20} color="#000" />
            <Text style={styles.newResumeButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* ==================== SCROLL CONTENT ==================== */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollContent}
        >
          {hasResumes ? (
            <>
              {/* Resume Selector */}
              <View style={styles.resumeSelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(searchQuery.trim() ? filteredResumes : safeResumes).map((resume, index) => (
                    <TouchableOpacity
                      key={resume._id || `resume-${index}`}
                      style={[
                        styles.resumeTab,
                        selectedResume?._id === resume._id && styles.resumeTabActive,
                      ]}
                      onPress={() => handleSelectResume(resume)}
                    >
                      <Text
                        style={[
                          styles.resumeTabText,
                          selectedResume?._id === resume._id && styles.resumeTabTextActive,
                        ]}
                      >
                        {resume?.personalInfo?.firstName || 'Resume'}
                      </Text>
                      <View
                        style={[
                          styles.resumeTabBadge,
                          { backgroundColor: getStatusColor(resume?.completionPercentage || 0) },
                        ]}
                      >
                        <Text style={styles.resumeTabBadgeText}>
                          {resume?.completionPercentage || 0}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {safeResumes.length > 1 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => setShowAllResumes(!showAllResumes)}
                  >
                    <Text style={styles.viewAllText}>
                      {showAllResumes ? 'Show Less' : `+${safeResumes.length - 1} more`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedResume ? (
                <>
                  {/* Stats Card */}
                  <View style={styles.statsCard}>
                    <LinearGradient
                      colors={['#000000', '#1a1a1a', '#f9c349']}
                      style={styles.statsGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.statsContent}>
                        <View style={styles.statsLeft}>
                          <Text style={styles.resumeName}>
                            {selectedResume?.personalInfo?.firstName || 'Untitled'}{' '}
                            {selectedResume?.personalInfo?.lastName || ''}
                          </Text>
                          <Text style={styles.resumeTitle}>
                            {selectedResume?.professionalSummary?.title || 'No title set'}
                          </Text>
                          <View style={styles.statusContainer}>
                            <View
                              style={[
                                styles.statusDot,
                                {
                                  backgroundColor: getStatusColor(
                                    selectedResume?.completionPercentage || 0
                                  ),
                                },
                              ]}
                            />
                            <Text style={styles.statusText}>
                              {getStatusText(selectedResume?.completionPercentage || 0)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.statsRight}>
                          <Text style={styles.percentageText}>
                            {selectedResume?.completionPercentage || 0}%
                          </Text>
                          <Text style={styles.percentageLabel}>Complete</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Resume Stats */}
                  <View style={styles.resumeStats}>
                    <View style={styles.resumeStatItem}>
                      <Ionicons name="eye-outline" size={18} color="#f9c349" />
                      <Text style={styles.resumeStatText}>
                        {selectedResume.viewCount || 0} views
                      </Text>
                    </View>
                    <View style={styles.resumeStatItem}>
                      <Ionicons name="download-outline" size={18} color="#f9c349" />
                      <Text style={styles.resumeStatText}>
                        {selectedResume.downloadCount || 0} downloads
                      </Text>
                    </View>
                    <View style={styles.resumeStatItem}>
                      <Ionicons name="share-outline" size={18} color="#f9c349" />
                      <Text style={styles.resumeStatText}>
                        {selectedResume.shareCount || 0} shares
                      </Text>
                    </View>
                  </View>

                  {/* Action Row */}
                  <View style={styles.simplifiedActionRow}>
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => handleViewResume(selectedResume)}
                    >
                      <Ionicons name="document-text-outline" size={18} color="#000000" />
                      <Text style={styles.actionBtnTextPrimary}>View & Download</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtnSecondary}
                      onPress={() => handleEditResume(selectedResume)}
                    >
                      <Ionicons name="create-outline" size={18} color="#f9c349" />
                      <Text style={styles.actionBtnTextSecondary}>Edit Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtnDanger}
                      onPress={() => handleDeleteResume(selectedResume._id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>

                  {/* ATS Score Card */}
                  <View style={styles.atsScoreCard}>
                    <View style={styles.atsScoreHeader}>
                      <View>
                        <Text style={styles.atsScoreTitle}>ATS Compatibility Score</Text>
                        <Text style={styles.atsScoreSubtitle}>
                          Based on AI career profile analysis
                        </Text>
                      </View>
                      <View style={styles.atsScoreBadgeContainer}>
                        <Text style={styles.atsScoreValue}>
                          {selectedResume.careerProfile?.atsScore || 0}
                        </Text>
                        <Text style={styles.atsScoreMax}>/100</Text>
                      </View>
                    </View>
                    {selectedResume.careerProfile?.atsKeywords &&
                    selectedResume.careerProfile.atsKeywords.length > 0 ? (
                      <View style={styles.atsKeywordsSection}>
                        <Text style={styles.atsKeywordsTitle}>Extracted ATS Keywords</Text>
                        <View style={styles.atsKeywordsList}>
                          {selectedResume.careerProfile.atsKeywords.slice(0, 10).map((kw, idx) => (
                            <View key={idx} style={styles.atsKeywordTag}>
                              <Text style={styles.atsKeywordText}>{kw}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.atsPendingContainer}>
                        <ActivityIndicator size="small" color="#f9c349" />
                        <Text style={styles.atsPendingText}>AI profile enrichment in progress...</Text>
                      </View>
                    )}
                  </View>

                  {/* Recommendations */}
                  <View style={styles.recommendationsSection}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Recommended Jobs</Text>
                      <TouchableOpacity>
                        <Text style={styles.seeAllText}>See All</Text>
                      </TouchableOpacity>
                    </View>
                    {renderRecommendations()}
                  </View>
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Resume Selected</Text>
                  <Text style={styles.emptyDescription}>
                    Please select a resume from the list above.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Resume Found</Text>
              <Text style={styles.emptyDescription}>
                Create your first resume to get started with your job search.
              </Text>
              <TouchableOpacity
                style={[styles.createButton, limitReached && { opacity: 0.5 }]}
                onPress={() => {
                  if (limitReached) {
                    Alert.alert(
                      'Resume Limit Reached',
                      `You can have at most ${MAX_CREATIONS} resumes at a time. Delete an existing resume to create a new one.`
                    );
                    return;
                  }
                  navigation.navigate('ResumeBuilder');
                }}
              >
                <LinearGradient
                  colors={['#000', '#f9c349']}
                  style={styles.createButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.createButtonText}>Create Resume</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>

      {/* Modals */}
      {renderDownloadModal()}

      <Modal
        visible={skillGapVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSkillGapVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 360,
              overflow: 'hidden',
              borderWidth: 1.5,
              borderColor: '#f9c349',
            }}
          >
            <View
              style={{
                backgroundColor: '#1a1a1a',
                paddingVertical: 20,
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons name="alert-decagram" size={48} color="#f9c349" />
              <Text
                style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', marginTop: 8 }}
              >
                Skill Gap Warning
              </Text>
            </View>
            <View style={{ padding: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: '#333333',
                  lineHeight: 22,
                  textAlign: 'center',
                  marginBottom: 16,
                }}
              >
                Your current expertise does not fully match the requirements for this role. To apply,
                you should enhance your skills in{' '}
                <Text style={{ fontWeight: '800', color: '#1a1a1a' }}>
                  {skillGapData.missingSkills.join(', ') || 'key required skills'}
                </Text>
                {'. '}Developing these skills will significantly increase your chances of selection.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#f9c349',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginTop: 8,
                }}
                onPress={() => setSkillGapVisible(false)}
              >
                <Text style={{ color: '#1a1a1a', fontWeight: '800', fontSize: 14 }}>
                  I will enhance them!
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  contentContainer: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  bottomSpacer: { height: Platform.OS === 'ios' ? 20 : 10 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },

  // ========== HEADER ==========
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  greeting: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  creationCounter: {
    fontSize: 12,
    color: '#f9c349',
    fontWeight: '700',
    marginTop: 2,
  },
  newResumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9c349',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  newResumeButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },

  // ========== SELECTOR ==========
  resumeSelector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  resumeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  resumeTabActive: { backgroundColor: '#f9c349', borderColor: '#f9c349' },
  resumeTabText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  resumeTabTextActive: { color: '#000000' },
  resumeTabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  resumeTabBadgeText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  viewAllButton: { paddingVertical: 6, paddingHorizontal: 12 },
  viewAllText: { fontSize: 12, color: '#f9c349', fontWeight: '500' },

  // ========== STATS CARD ==========
  statsCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statsGradient: { padding: 24 },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLeft: { flex: 1 },
  resumeName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  resumeTitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  statsRight: { alignItems: 'center' },
  percentageText: { fontSize: 32, fontWeight: '700', color: '#f9c349' },
  percentageLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  // ========== RESUME STATS ==========
  resumeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  resumeStatItem: { flexDirection: 'row', alignItems: 'center' },
  resumeStatText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 6,
    fontWeight: '500',
  },

  // ========== ACTION ROW ==========
  simplifiedActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9c349',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 2,
    marginRight: 8,
  },
  actionBtnTextPrimary: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#f9c349',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 2,
    marginRight: 8,
  },
  actionBtnTextSecondary: {
    color: '#f9c349',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  actionBtnDanger: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },

  // ========== ATS CARD ==========
  atsScoreCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f9c349',
  },
  atsScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249, 195, 73, 0.2)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  atsScoreTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  atsScoreSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  atsScoreBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(249, 195, 73, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249, 195, 73, 0.3)',
  },
  atsScoreValue: { fontSize: 20, fontWeight: '800', color: '#f9c349' },
  atsScoreMax: { fontSize: 11, color: '#94A3B8', marginLeft: 2 },
  atsKeywordsSection: { marginTop: 4 },
  atsKeywordsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  atsKeywordsList: { flexDirection: 'row', flexWrap: 'wrap' },
  atsKeywordTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  atsKeywordText: { fontSize: 11, color: '#E2E8F0', fontWeight: '500' },
  atsPendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  atsPendingText: { fontSize: 12, color: '#94A3B8', marginLeft: 8 },

  // ========== RECOMMENDATIONS ==========
  recommendationsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  seeAllText: { fontSize: 13, color: '#f9c349', fontWeight: '500' },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  jobHeader: { marginBottom: 8 },
  jobTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  matchText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  jobCompany: { fontSize: 14, color: '#666', marginTop: 2 },
  jobDetails: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 6 },
  jobDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginVertical: 2,
  },
  jobDetailText: { fontSize: 12, color: '#666', marginLeft: 4 },
  matchedSkillsContainer: { marginTop: 8, marginBottom: 4 },
  matchedSkillsLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  matchedSkillsList: { flexDirection: 'row', flexWrap: 'wrap' },
  matchedSkillTag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  matchedSkillText: { fontSize: 11, color: '#333', fontWeight: '500' },
  moreSkillsText: { fontSize: 11, color: '#999', marginLeft: 4 },
  matchReasonsContainer: { marginTop: 4, marginBottom: 4 },
  matchReasonsLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  matchReasonsList: { flexDirection: 'row', flexWrap: 'wrap' },
  matchReasonTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0faf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  matchReasonText: { fontSize: 11, color: '#2ECC71', marginLeft: 2 },
  jobDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginVertical: 6,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  applyButtonText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
    marginRight: 4,
  },
  saveJobButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
  },
  urgentBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  urgentBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 80,
    backgroundColor: '#f9c349',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  featuredBadgeText: { fontSize: 10, color: '#000', fontWeight: '700' },
  optimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#f9c349',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
    width: '100%',
  },
  optimizeButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  // ========== EMPTY STATES ==========
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  createButton: { marginTop: 20, borderRadius: 25, overflow: 'hidden' },
  createButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyJobsContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyJobsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  emptyJobsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  buildResumeButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  buildResumeButtonText: { color: '#f9c349', fontSize: 14, fontWeight: '600' },
  recommendationsLoading: { padding: 30, alignItems: 'center' },
  retryButton: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
  },
  retryButtonText: { color: '#000', fontSize: 13, fontWeight: '600' },

  // ========== MODAL ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: width - 32,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  downloadOptions: { padding: 16 },
  downloadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  downloadOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadOptionInfo: { flex: 1, marginLeft: 12 },
  downloadOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  downloadOptionDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  downloadProgressContainer: { padding: 30, alignItems: 'center' },
  downloadProgressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#f9c349', borderRadius: 3 },
});

export default ResumeDashboardScreen;