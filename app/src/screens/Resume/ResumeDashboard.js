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
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { renderResumeHTML } from '../../services/templateService';
import { useFocusEffect } from '@react-navigation/native';

import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import Svg, { Circle } from 'react-native-svg';
const { width } = Dimensions.get('window');
const MAX_CREATIONS = 2;

// Score ring (Resume design) — draws a real value only
const ScoreRing = ({ value, label }) => {
  const size = 84;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={T.inkLine} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={T.yellow}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </Svg>
      <Text style={{ fontFamily: F.heading, fontSize: 24, color: T.white }} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {Math.round(pct)}
      </Text>
      <Text style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: T.onInkMuted, marginTop: -2 }}>{label}</Text>
    </View>
  );
};

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
    if (p >= 80) return T.success;
    if (p >= 50) return T.yellow;
    if (p >= 30) return '#E67E22';
    return T.danger;
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
          <ActivityIndicator size="large" color={T.ink} />
          <Text style={styles.loadingText}>finding best matches...</Text>
        </View>
      );
    }
    if (recommendationsError) {
      return (
        <View style={styles.emptyJobsContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={T.danger} />
          <Text style={styles.emptyJobsTitle}>connection issue</Text>
          <Text style={styles.emptyJobsText}>{recommendationsError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchRecommendations(selectedResume?._id)}
          >
            <Text style={styles.retryButtonText}>retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!recommendations || recommendations.length === 0) {
      return (
        <View style={styles.emptyJobsContainer}>
          <Ionicons name="briefcase-outline" size={48} color={T.textFaint} />
          <Text style={styles.emptyJobsTitle}>no matches found yet</Text>
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
      const hasMatch = typeof job.matchPercentage === 'number';
      const details = [
        { icon: 'business-outline', text: job.department },
        { icon: 'location-outline', text: job.location },
        { icon: 'cash-outline', text: job.salary },
        { icon: 'time-outline', text: job.type },
      ].filter((d) => !!d.text);
      const company = job.companyName || job.company;
      return (
        <Animated.View
          key={job._id || index}
          style={[RD.job, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={RD.jobTop}>
            <View style={{ flex: 1 }}>
              <Text style={RD.jobTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{job.title}</Text>
              {!!company && <Text style={RD.jobCompany}>{company}</Text>}
            </View>
            {hasMatch && (
              <View style={RD.matchPill}>
                <Text style={RD.matchText}>{job.matchPercentage}% match</Text>
              </View>
            )}
          </View>
          {(job.urgent || job.featured) && (
            <View style={RD.flagRow}>
              {job.urgent && (
                <View style={[RD.flag, { backgroundColor: T.dangerBg }]}>
                  <Text style={[RD.flagText, { color: T.danger }]}>urgent</Text>
                </View>
              )}
              {job.featured && (
                <View style={[RD.flag, { backgroundColor: T.yellowSoft }]}>
                  <Text style={RD.flagText}>featured</Text>
                </View>
              )}
            </View>
          )}
          {details.length > 0 && (
            <View style={RD.detailRow}>
              {details.map((d) => (
                <View key={d.icon} style={RD.detailItem}>
                  <Ionicons name={d.icon} size={14} color={T.textMuted} />
                  <Text style={RD.detailText}>{d.text}</Text>
                </View>
              ))}
            </View>
          )}
          {job.matchReasons && job.matchReasons.length > 0 && (
            <Text style={RD.why}>
              <Text style={RD.whyLabel}>why: </Text>
              {job.matchReasons.slice(0, 3).join(' · ')}
            </Text>
          )}
          {job.matchedSkills && job.matchedSkills.length > 0 && (
            <View style={RD.kwWrap}>
              {job.matchedSkills.slice(0, 4).map((skill, idx) => (
                <View key={idx} style={RD.kw}>
                  <Text style={RD.kwText}>{skill}</Text>
                </View>
              ))}
              {job.matchedSkills.length > 4 && (
                <Text style={RD.more}>+{job.matchedSkills.length - 4} more</Text>
              )}
            </View>
          )}
          {!!job.description && (
            <TouchableOpacity onPress={() => setExpandedJobId(expandedJobId === job._id ? null : job._id)}>
              <Text style={RD.desc} numberOfLines={expandedJobId === job._id ? undefined : 3}>
                {job.description}
              </Text>
              <Text style={RD.descToggle}>
                {expandedJobId === job._id ? 'show less' : 'read full description'}
              </Text>
            </TouchableOpacity>
          )}
          <View style={RD.jobActions}>
            <TouchableOpacity
              style={[RD.btnYellow, { flex: 1 }]}
              onPress={() => handleApplyToJob(job)}
              accessibilityRole="button"
            >
              <Text style={RD.btnYellowText}>apply now</Text>
              <Ionicons name="arrow-forward" size={15} color={T.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              style={RD.btnLight}
              onPress={() => handleOptimizeResumeFlow(job)}
              accessibilityRole="button"
            >
              <Ionicons name="sparkles" size={14} color={T.ink} />
              <Text style={RD.btnLightText}>optimize</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={RD.saveBtn}
              onPress={() => handleSaveJob(job)}
              disabled={savingJobId === job._id}
              accessibilityRole="button"
              accessibilityLabel={savedJobIds.has(job._id) ? 'saved job' : 'save job'}
            >
              {savingJobId === job._id ? (
                <ActivityIndicator size="small" color={T.ink} />
              ) : (
                <Ionicons
                  name={savedJobIds.has(job._id) ? 'bookmark' : 'bookmark-outline'}
                  size={19}
                  color={T.ink}
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
                <Ionicons name="close" size={24} color={T.ink} />
              </TouchableOpacity>
            )}
          </View>
          {downloading ? (
            <View style={styles.downloadProgressContainer}>
              <ActivityIndicator size="large" color={T.ink} />
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
                <View style={[styles.downloadOptionIcon, { backgroundColor: T.danger }]}>
                  <Ionicons name="document-text" size={28} color={T.white} />
                </View>
                <View style={styles.downloadOptionInfo}>
                  <Text style={styles.downloadOptionTitle}>pdf resume</Text>
                  <Text style={styles.downloadOptionDesc}>
                    Professional PDF format, ready for printing
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={T.textFaint} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.downloadOption}
                onPress={() => handleDownloadHTML(selectedResume)}
              >
                <View style={[styles.downloadOptionIcon, { backgroundColor: T.yellow }]}>
                  <Ionicons name="code" size={28} color={T.white} />
                </View>
                <View style={styles.downloadOptionInfo}>
                  <Text style={styles.downloadOptionTitle}>html resume</Text>
                  <Text style={styles.downloadOptionDesc}>
                    web-ready html format with styling
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={T.textFaint} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.downloadOption}
                onPress={() => handleDownloadJSON(selectedResume)}
              >
                <View style={[styles.downloadOptionIcon, { backgroundColor: '#9B59B6' }]}>
                  <Ionicons name="database" size={28} color={T.white} />
                </View>
                <View style={styles.downloadOptionInfo}>
                  <Text style={styles.downloadOptionTitle}>json data</Text>
                  <Text style={styles.downloadOptionDesc}>
                    Raw resume data in JSON format
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={T.textFaint} />
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
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={T.ink} />
          <Text style={styles.loadingText}>loading your resumes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasResumes = safeResumes.length > 0;
  const atsScore = selectedResume?.careerProfile?.atsScore;
  const hasAts = typeof atsScore === 'number' && atsScore > 0;
  const atsKeywords = Array.isArray(selectedResume?.careerProfile?.atsKeywords)
    ? selectedResume.careerProfile.atsKeywords
    : [];
  const limitReached = totalCreationsUsed >= MAX_CREATIONS;

  // ============================================================
  // Main render
  // ============================================================
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      <Animated.View
        style={[
          styles.contentContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* ==================== HEADER (Resume design) ==================== */}
        <View style={RD.header}>
          <View style={{ flex: 1 }}>
            <Text style={RD.hello} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
              hello, {isGuest ? 'guest' : (user?.name || 'there').split(' ')[0].toLowerCase()}
            </Text>
            <Text style={RD.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
              resume<Text style={{ color: T.yellow }}>.</Text>
            </Text>
            <Text style={RD.counter}>
              {totalCreationsUsed} / {MAX_CREATIONS} resumes used
            </Text>
          </View>
          <TouchableOpacity
            style={[RD.newBtn, limitReached && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="new resume"
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
            <Ionicons name="add" size={18} color={T.ink} />
            <Text style={RD.newBtnText}>new</Text>
          </TouchableOpacity>
          {selectedResume && (
            <TouchableOpacity
              style={RD.iconBtn}
              onPress={() => handleSettings(selectedResume)}
              accessibilityRole="button"
              accessibilityLabel="resume settings"
            >
              <Ionicons name="settings-outline" size={19} color={T.ink} />
            </TouchableOpacity>
          )}
        </View>

        {/* ==================== SCROLL CONTENT ==================== */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollContent}
        >
          {hasResumes ? (
            <>
              {/* Resume selector (only when there is more than one to pick) */}
              {safeResumes.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={RD.chips}
                >
                  {(searchQuery.trim() ? filteredResumes : safeResumes).map((resume, index) => {
                    const on = selectedResume?._id === resume._id;
                    return (
                      <TouchableOpacity
                        key={resume._id || `resume-${index}`}
                        style={[RD.chip, on && RD.chipOn]}
                        onPress={() => handleSelectResume(resume)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[RD.chipText, on && RD.chipTextOn]}>
                          {(resume?.personalInfo?.firstName || 'resume').toLowerCase()}
                        </Text>
                        <Text style={[RD.chipPct, on && RD.chipTextOn]}>
                          {resume?.completionPercentage || 0}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {selectedResume ? (
                <>
                  {/* Dark card: score ring + actions */}
                  <View style={RD.section}>
                    <View style={RD.dark}>
                      <View style={RD.darkTop}>
                        <ScoreRing
                          value={hasAts ? atsScore : selectedResume?.completionPercentage || 0}
                          label={hasAts ? 'ats' : 'done'}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={RD.darkLabel}>
                            {hasAts ? 'ats compatibility score' : 'resume completion'}
                          </Text>
                          <Text style={RD.darkName} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                            {selectedResume?.personalInfo?.firstName || 'untitled'}{' '}
                            {selectedResume?.personalInfo?.lastName || ''}
                          </Text>
                          {!!selectedResume?.professionalSummary?.title && (
                            <Text style={RD.darkSub} numberOfLines={1}>
                              {selectedResume.professionalSummary.title}
                            </Text>
                          )}
                          <View style={RD.statusRow}>
                            <View
                              style={[
                                RD.statusDot,
                                { backgroundColor: getStatusColor(selectedResume?.completionPercentage || 0) },
                              ]}
                            />
                            <Text style={RD.darkSub}>
                              {getStatusText(selectedResume?.completionPercentage || 0).toLowerCase()}
                              {hasAts ? ` · ${selectedResume?.completionPercentage || 0}% complete` : ''}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={RD.statsRow}>
                        <Text style={RD.stat}>
                          <Text style={RD.statN}>{selectedResume.viewCount || 0}</Text> views
                        </Text>
                        <Text style={RD.stat}>
                          <Text style={RD.statN}>{selectedResume.downloadCount || 0}</Text> downloads
                        </Text>
                        <Text style={RD.stat}>
                          <Text style={RD.statN}>{selectedResume.shareCount || 0}</Text> shares
                        </Text>
                      </View>

                      <View style={RD.btnRow}>
                        <TouchableOpacity
                          style={RD.btnYellow}
                          onPress={() => handleViewResume(selectedResume)}
                          accessibilityRole="button"
                        >
                          <Ionicons name="document-text-outline" size={17} color={T.ink} />
                          <Text style={RD.btnYellowText}>view & download</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={RD.btnOutline}
                          onPress={() => handleEditResume(selectedResume)}
                          accessibilityRole="button"
                        >
                          <Ionicons name="create-outline" size={17} color={T.white} />
                          <Text style={RD.btnOutlineText}>edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={RD.btnDelete}
                          onPress={() => handleDeleteResume(selectedResume._id)}
                          accessibilityRole="button"
                          accessibilityLabel="delete resume"
                        >
                          <Ionicons name="trash-outline" size={17} color={T.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Keywords found (real ATS keywords only) */}
                  <View style={RD.section}>
                    {atsKeywords.length > 0 ? (
                      <>
                        <Text style={RD.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                          keywords found<Text style={{ color: T.yellow }}>.</Text>
                        </Text>
                        <View style={RD.kwWrap}>
                          {atsKeywords.slice(0, 10).map((kw, idx) => (
                            <View key={idx} style={RD.kw}>
                              <Text style={RD.kwText}>{kw}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    ) : (
                      <View style={RD.pending}>
                        <ActivityIndicator size="small" color={T.ink} />
                        <Text style={RD.pendingText}>ai profile enrichment in progress...</Text>
                      </View>
                    )}
                  </View>

                  {/* Recommended jobs */}
                  <View style={RD.section}>
                    <Text style={RD.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                      recommended jobs<Text style={{ color: T.yellow }}>.</Text>
                    </Text>
                    <View style={{ marginTop: 10 }}>{renderRecommendations()}</View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={64} color={T.textFaint} />
                  <Text style={styles.emptyTitle}>no resume selected</Text>
                  <Text style={styles.emptyDescription}>
                    Please select a resume from the list above.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={T.textFaint} />
              <Text style={styles.emptyTitle}>no resume found</Text>
              <Text style={styles.emptyDescription}>
                Create your first resume to get started with your job search.
              </Text>
              <TouchableOpacity
                style={[RD.btnYellow, RD.createBtn, limitReached && { opacity: 0.5 }]}
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
                <Text style={RD.btnYellowText}>create resume</Text>
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
              backgroundColor: T.card,
              borderRadius: 20,
              width: '100%',
              maxWidth: 360,
              overflow: 'hidden',
              borderWidth: 1.5,
              borderColor: T.yellow,
            }}
          >
            <View
              style={{
                backgroundColor: T.ink,
                paddingVertical: 20,
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons name="alert-decagram" size={48} color={T.yellow} />
              <Text
                style={{ color: T.white, fontSize: 18, fontWeight: '800', marginTop: 8 }}
              >
                Skill Gap Warning
              </Text>
            </View>
            <View style={{ padding: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: T.ink,
                  lineHeight: 22,
                  textAlign: 'center',
                  marginBottom: 16,
                }}
              >
                Your current expertise does not fully match the requirements for this role. To apply,
                you should enhance your skills in{' '}
                <Text style={{ fontWeight: '800', color: T.ink }}>
                  {skillGapData.missingSkills.join(', ') || 'key required skills'}
                </Text>
                {'. '}Developing these skills will significantly increase your chances of selection.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: T.yellow,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginTop: 8,
                }}
                onPress={() => setSkillGapVisible(false)}
              >
                <Text style={{ color: T.ink, fontWeight: '800', fontSize: 14 }}>
                  i will enhance them!
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
  safeArea: { flex: 1, backgroundColor: T.paper },
  container: { flex: 1, backgroundColor: T.card },
  contentContainer: { flex: 1, backgroundColor: T.paper },
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
    backgroundColor: T.card,
  },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: F.body, color: T.textMuted },

  // ========== HEADER ==========
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  greeting: {
    fontSize: 13,
    color: T.textMuted,
    fontFamily: F.body,
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontFamily: F.heading,
    color: '#0F172A',
    marginBottom: 4,
  },
  creationCounter: {
    fontSize: 12,
    color: T.ink,
    fontFamily: F.bodyBold,
    marginTop: 2,
  },
  newResumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.yellow,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  newResumeButtonText: {
    color: T.ink,
    fontSize: 14,
    fontFamily: F.bodySemi,
    marginLeft: 4,
  },

  // ========== SELECTOR ==========
  resumeSelector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: T.card,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
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
  resumeTabActive: { backgroundColor: T.yellow, borderColor: T.yellow },
  resumeTabText: { fontSize: 13, color: T.textFaint, fontFamily: F.bodyMedium },
  resumeTabTextActive: { color: T.ink },
  resumeTabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  resumeTabBadgeText: { fontSize: 10, color: T.white, fontFamily: F.bodySemi },
  viewAllButton: { paddingVertical: 6, paddingHorizontal: 12 },
  viewAllText: { fontSize: 12, color: T.ink, fontFamily: F.bodyMedium },

  // ========== STATS CARD ==========
  statsCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statsGradient: { padding: 24 },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLeft: { flex: 1 },
  resumeName: { fontSize: 22, fontFamily: F.heading, color: T.white },
  resumeTitle: { fontSize: 14, fontFamily: F.body, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontFamily: F.bodyMedium },
  statsRight: { alignItems: 'center' },
  percentageText: { fontSize: 32, fontFamily: F.heading, color: T.ink },
  percentageLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: F.bodyMedium },

  // ========== RESUME STATS ==========
  resumeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: T.card,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 4,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.line,
  },
  resumeStatItem: { flexDirection: 'row', alignItems: 'center' },
  resumeStatText: {
    fontSize: 13,
    color: T.ink,
    marginLeft: 6,
    fontFamily: F.bodyMedium,
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
    backgroundColor: T.yellow,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 2,
    marginRight: 8,
  },
  actionBtnTextPrimary: {
    color: T.ink,
    fontSize: 14,
    fontFamily: F.bodyBold,
    marginLeft: 6,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.ink,
    borderWidth: 1,
    borderColor: T.yellow,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 2,
    marginRight: 8,
  },
  actionBtnTextSecondary: {
    color: T.ink,
    fontSize: 14,
    fontFamily: F.bodyBold,
    marginLeft: 6,
  },
  actionBtnDanger: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.dangerBg,
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
    borderColor: T.yellow,
  },
  atsScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    paddingBottom: 12,
    marginBottom: 12,
  },
  atsScoreTitle: { fontSize: 15, fontFamily: F.bodyBold, color: T.white },
  atsScoreSubtitle: { fontSize: 11, fontFamily: F.body, color: T.textFaint, marginTop: 2 },
  atsScoreBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: T.yellowSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.line,
  },
  atsScoreValue: { fontSize: 20, fontFamily: F.heading, color: T.ink },
  atsScoreMax: { fontSize: 11, fontFamily: F.body, color: T.textFaint, marginLeft: 2 },
  atsKeywordsSection: { marginTop: 4 },
  atsKeywordsTitle: {
    fontSize: 12,
    fontFamily: F.bodySemi,
    color: T.textFaint,
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
  atsKeywordText: { fontSize: 11, color: T.textFaint, fontFamily: F.bodyMedium },
  atsPendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  atsPendingText: { fontSize: 12, fontFamily: F.body, color: T.textFaint, marginLeft: 8 },

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
  sectionTitle: { fontSize: 18, fontFamily: F.headingBold, color: '#0F172A' },
  seeAllText: { fontSize: 13, color: T.ink, fontFamily: F.bodyMedium },
  jobCard: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.line,
  },
  jobHeader: { marginBottom: 8 },
  jobTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTitle: {
    fontSize: 16,
    fontFamily: F.bodySemi,
    color: T.ink,
    flex: 1,
  },
  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  matchText: { fontSize: 10, color: T.white, fontFamily: F.bodyBold },
  jobCompany: { fontSize: 14, fontFamily: F.body, color: T.textMuted, marginTop: 2 },
  jobDetails: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 6 },
  jobDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginVertical: 2,
  },
  jobDetailText: { fontSize: 12, fontFamily: F.body, color: T.textMuted, marginLeft: 4 },
  matchedSkillsContainer: { marginTop: 8, marginBottom: 4 },
  matchedSkillsLabel: { fontSize: 12, fontFamily: F.body, color: T.textMuted, marginBottom: 4 },
  matchedSkillsList: { flexDirection: 'row', flexWrap: 'wrap' },
  matchedSkillTag: {
    backgroundColor: T.sand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: T.line,
  },
  matchedSkillText: { fontSize: 11, color: T.ink, fontFamily: F.bodyMedium },
  moreSkillsText: { fontSize: 11, fontFamily: F.body, color: T.textFaint, marginLeft: 4 },
  matchReasonsContainer: { marginTop: 4, marginBottom: 4 },
  matchReasonsLabel: { fontSize: 12, fontFamily: F.body, color: T.textMuted, marginBottom: 2 },
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
  matchReasonText: { fontSize: 11, fontFamily: F.body, color: T.success, marginLeft: 2 },
  jobDescription: {
    fontSize: 13, fontFamily: F.body,
    color: T.textMuted,
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
    color: T.ink,
    fontFamily: F.bodySemi,
    marginRight: 4,
  },
  saveJobButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 8,
  },
  urgentBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: T.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  urgentBadgeText: { fontSize: 10, color: T.white, fontFamily: F.bodyBold },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 80,
    backgroundColor: T.yellow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  featuredBadgeText: { fontSize: 10, color: T.ink, fontFamily: F.bodyBold },
  optimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.card,
    borderWidth: 1.5,
    borderColor: T.yellow,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
    width: '100%',
  },
  optimizeButtonText: {
    color: T.ink,
    fontSize: 13,
    fontFamily: F.bodyBold,
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
    fontFamily: F.headingBold,
    color: '#0F172A',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14, fontFamily: F.body,
    color: T.textFaint,
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
  createButtonText: { color: T.white, fontSize: 16, fontFamily: F.bodySemi },
  emptyJobsContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyJobsTitle: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginTop: 12,
  },
  emptyJobsText: {
    fontSize: 14, fontFamily: F.body,
    color: T.textFaint,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  buildResumeButton: {
    backgroundColor: T.ink,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  buildResumeButtonText: { color: T.yellow, fontSize: 14, fontFamily: F.bodySemi },
  recommendationsLoading: { padding: 30, alignItems: 'center' },
  retryButton: {
    backgroundColor: T.yellow,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
  },
  retryButtonText: { color: T.ink, fontSize: 13, fontFamily: F.bodySemi },

  // ========== MODAL ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: T.card,
    borderRadius: 24,
    width: width - 32,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  modalTitle: { fontSize: 18, fontFamily: F.headingBold, color: T.ink },
  downloadOptions: { padding: 16 },
  downloadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
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
    fontFamily: F.bodySemi,
    color: T.ink,
  },
  downloadOptionDesc: {
    fontSize: 12, fontFamily: F.body,
    color: T.textFaint,
    marginTop: 2,
  },
  downloadProgressContainer: { padding: 30, alignItems: 'center' },
  downloadProgressText: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.ink,
    marginTop: 16,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: T.sand,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: T.yellow, borderRadius: 3 },
});

export default ResumeDashboardScreen;

// ─── Resume dashboard design layout ──────────────────────────────────
const RD = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, backgroundColor: T.paper },
  hello: { fontFamily: F.bodySemi, fontSize: 13.5, color: T.textMuted },
  title: { fontFamily: F.heading, fontSize: 24, color: T.ink },
  counter: { fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: 1 },
  newBtn: { height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: T.yellow, flexDirection: 'row', alignItems: 'center', gap: 4 },
  newBtnText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, alignItems: 'center', justifyContent: 'center' },

  section: { paddingHorizontal: 16, paddingTop: 14 },
  h2: { fontFamily: F.heading, fontSize: 17, color: T.ink },

  chips: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: T.line, backgroundColor: T.card, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOn: { backgroundColor: T.ink, borderColor: T.ink },
  chipText: { fontFamily: F.bodySemi, fontSize: 13, color: T.ink },
  chipPct: { fontFamily: F.bodyBold, fontSize: 12, color: T.textMuted },
  chipTextOn: { color: T.white },

  dark: { borderRadius: 28, backgroundColor: T.ink, padding: 18 },
  darkTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  darkLabel: { fontFamily: F.bodyBold, fontSize: 11.5, color: T.onInkMuted },
  darkName: { fontFamily: F.heading, fontSize: 20, color: T.white, marginTop: 2 },
  darkSub: { fontFamily: F.body, fontSize: 12.5, color: T.onInkMuted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', gap: 14, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.inkLine },
  stat: { fontFamily: F.body, fontSize: 12.5, color: T.onInkMuted },
  statN: { fontFamily: F.bodyBold, color: T.white },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btnYellow: { flex: 1, height: 44, borderRadius: 22, backgroundColor: T.yellow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  btnYellowText: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  btnOutline: { height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: T.inkLine, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnOutlineText: { fontFamily: F.bodyBold, fontSize: 14, color: T.white },
  btnDelete: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.inkSoft, alignItems: 'center', justifyContent: 'center' },
  createBtn: { flex: 0, alignSelf: 'center', paddingHorizontal: 24, marginTop: 16 },

  kwWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  kw: { height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, justifyContent: 'center' },
  kwText: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.ink },
  more: { fontFamily: F.bodySemi, fontSize: 12, color: T.textMuted, alignSelf: 'center' },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 18, backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
  pendingText: { fontFamily: F.body, fontSize: 13, color: T.textMuted },

  job: { borderRadius: 22, backgroundColor: T.card, borderWidth: 1, borderColor: T.line, padding: 14, marginBottom: 10 },
  jobTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  jobTitle: { fontFamily: F.headingBold, fontSize: 16, color: T.ink },
  jobCompany: { fontFamily: F.body, fontSize: 13, color: T.textMuted, marginTop: 2 },
  matchPill: { height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: T.ink, justifyContent: 'center' },
  matchText: { fontFamily: F.bodyBold, fontSize: 12, color: T.yellow },
  flagRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  flag: { height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: 'center' },
  flagText: { fontFamily: F.bodyBold, fontSize: 11, color: T.ink },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontFamily: F.body, fontSize: 12.5, color: T.textMuted },
  why: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: T.textMuted, marginTop: 10 },
  whyLabel: { fontFamily: F.bodyBold, color: T.ink },
  desc: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: T.ink, marginTop: 10 },
  descToggle: { fontFamily: F.bodySemi, fontSize: 12.5, color: T.textMuted, marginTop: 4 },
  jobActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btnLight: { height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: T.sand, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnLightText: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.ink },
  saveBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: T.line, alignItems: 'center', justifyContent: 'center' },
});
