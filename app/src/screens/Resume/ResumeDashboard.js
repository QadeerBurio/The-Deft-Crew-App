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
import { useGuestGate } from '../../guest/GuestGate';
import { ResumeContext } from '../../context/ResumeContext';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { renderResumeHTML } from '../../services/templateService';
import { resumeHtmlWithFonts } from '../../services/templates/print'; // P3-6: fonts embedded (library templates / chosen pair)
import { useFocusEffect } from '@react-navigation/native';

import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import Svg, { Circle } from 'react-native-svg';
import { plainError } from "../../utils/plainError";
// FLAG_CAREER_MATCHING: "recommended for you" (the server's skill-evidence matcher, GET /jobs/recommendations/:resumeId)
// and "invites to apply" (the "let employers invite me" switch + invites) show only with it on for the student
import useFlag from "../../hooks/useFlag";
// P5-4 (polishEmptyStates): the design system's EmptyState, loaded only when the flag is on (off: nothing new loads)
const EmptyState = (props) => React.createElement(require("../../ui").EmptyState, props);
import { matchingEnabled } from "../../api/matchingApi";
import CareerInvites from "../../components/CareerInvites";
import useAction from '../../hooks/useAction';
import { TIMEOUT, withTimeout } from '../../config/timeouts';
import { studioEnabled } from "../../api/resumeStudioApi";
import ResumeStrength from "../../components/ResumeStrength";
import { resumeStrength, resumeName } from "../../utils/resumeRules";
import { makeResumePdf, saveResumePdf, openSavedPdf } from "../../utils/resumeFiles";
import { ScoreRing } from "./ScoreRing";
import { styles, RD } from "./resumeDashboardStyles";
const MAX_CREATIONS = 2;


const ResumeDashboardScreen = ({ navigation, route }) => {
  const matchingOn = useFlag("careerMatching", matchingEnabled) === true;
  // P3-1: with resumeV2 a new resume starts on ResumeStart (upload / from my tdc profile / start fresh)
  const resumeV2 = useFlag("resumeV2") === true;
  const polishEmpty = useFlag("polishEmptyStates") === true; // P5-4
  const newResumeScreen = resumeV2 ? 'ResumeStart' : 'ResumeBuilder';
  // P3d (resumeV2 + resumeFeedback): recruiter-style feedback on the selected resume
  const feedbackOn = useFlag("resumeFeedback") === true && resumeV2;
  // an invite push without a job: { openInvites: true } scrolls to the invites card
  const openInvites = !!route?.params?.openInvites;
  const scrollRef = useRef(null);
  const invitesY = useRef(null);
  const scrolledToInvites = useRef(false);
  const onInvitesLayout = (e) => {
    invitesY.current = e.nativeEvent.layout.y;
    if (openInvites && !scrolledToInvites.current) {
      scrolledToInvites.current = true;
      scrollRef.current?.scrollTo?.({ y: Math.max(0, invitesY.current - 12), animated: true });
    }
  };
  useEffect(() => { if (openInvites) scrolledToInvites.current = false; }, [openInvites, route?.params?.at]);
  // P3d finish moment: "apply to matching jobs" opens the dashboard at "recommended for you" ({ openMatches: true })
  const openMatches = !!route?.params?.openMatches;
  const scrolledToMatches = useRef(false);
  const onMatchesLayout = (e) => {
    if (openMatches && !scrolledToMatches.current) {
      scrolledToMatches.current = true;
      scrollRef.current?.scrollTo?.({ y: Math.max(0, e.nativeEvent.layout.y - 12), animated: true });
    }
  };
  useEffect(() => { if (openMatches) scrolledToMatches.current = false; }, [openMatches, route?.params?.at]);
  const { user, isGuest } = useContext(AuthContext);
  const { requireAccount } = useGuestGate();
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
  // AI Resume Studio (FLAG_RESUME_STUDIO_V2): "tailor for a job" and "my versions"
  const [studioOn, setStudioOn] = useState(false);
  useEffect(() => { studioEnabled().then(setStudioOn).catch(() => setStudioOn(false)); }, [isGuest]);

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
    }, [])
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
        }
      } else {
        const firstResume = safeResumes[0];
        setSelectedResume(firstResume);
        loadResume(firstResume._id);
      }
      setFilteredResumes(safeResumes);
    } else {
      setSelectedResume(null);
      setFilteredResumes([]);
    }
  }, [resumes]);

  useEffect(() => {
    if (matchingOn && selectedResume && selectedResume._id) {
      fetchRecommendations(selectedResume._id);
    }
  }, [selectedResume?._id, matchingOn]);

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
    try {
      await fetchResumes();
      if (matchingOn && selectedResume?._id) await fetchRecommendations(selectedResume._id);
    } finally {
      setRefreshing(false);
    }
  }, [selectedResume?._id]);

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
  const deletingRef = useRef(false);
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
            if (deletingRef.current) return;
            deletingRef.current = true;
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
              Alert.alert('❌ Error', plainError(error, "Failed to delete resume."));
            } finally {
              deletingRef.current = false;
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // Download / share / optimize handlers (unchanged)
  // ============================================================
  // a background counter: never blocks or fails the file
  const bump = (resume, field) => {
    if (!resume?._id) return;
    updateResume(resume._id, { [field]: (resume[field] || 0) + 1 }).catch((e) => console.warn('[dashboard] counter not saved:', e?.message));
  };
  const fileName = (resume, suffix) => {
    const first = (resume.personalInfo?.firstName || 'User').trim().replace(/[^a-zA-Z0-9]/g, '_');
    const last = (resume.personalInfo?.lastName || 'Resume').trim().replace(/[^a-zA-Z0-9]/g, '_');
    return { first, last, name: `${first}_${last}_${suffix}` };
  };
  // the progress sheet shows one file at a time; it always closes (finally), even on an error
  const exporter = useAction(async (_c, task) => {
    setDownloadProgress(10);
    setDownloadModalVisible(true);
    try {
      return await task();
    } finally {
      setDownloadModalVisible(false);
      setDownloadProgress(0);
    }
  }, { errorTitle: "couldn't make the file", fallback: 'please try again.' });
  const downloading = exporter.running;

  const handleDownloadResume = (resume) => {
    if (!requireAccount()) return;
    if (!resume) return Alert.alert('Error', 'No resume selected');
    exporter.run(async () => {
      setDownloadProgress(30);
      const file = await makeResumePdf(resume);
      setDownloadProgress(100);
      const r = await saveResumePdf(file);
      if (r.status === 'saved') {
        bump(resume, 'downloadCount');
        const buttons = Platform.OS === 'android' && r.uri ? [{ text: 'ok', style: 'cancel' }, { text: 'open', onPress: () => { openSavedPdf(r.uri); } }] : [{ text: 'ok' }];
        Alert.alert(r.message, file.name, buttons);
      } else if (r.status === 'shared') {
        bump(resume, 'downloadCount');
      } else if (r.status === 'denied') {
        Alert.alert('not saved', r.message);
      }
    });
  };

  const handleDownloadHTML = (resume) => {
    if (!requireAccount()) return;
    if (!resume) return Alert.alert('Error', 'No resume selected');
    exporter.run(async () => {
      const html = await resumeHtmlWithFonts(resume, resume.template || 'modern_ats', resume.customStyles || {});
      setDownloadProgress(50);
      const name = `Resume_${resume.personalInfo?.firstName || 'Resume'}_${Date.now()}.html`;
      const fileUri = FileSystem.documentDirectory + name;
      await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });
      setDownloadProgress(100);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/html', dialogTitle: `Resume_${resume.personalInfo?.firstName || 'Resume'}.html` });
      }
      bump(resume, 'downloadCount');
    });
  };

  const handleDownloadJSON = (resume) => {
    if (!requireAccount()) return;
    if (!resume) return Alert.alert('Error', 'No resume selected');
    exporter.run(async () => {
      const jsonData = JSON.stringify(resume, null, 2);
      setDownloadProgress(50);
      const name = `Resume_${resume.personalInfo?.firstName || 'Resume'}_${Date.now()}.json`;
      const fileUri = FileSystem.documentDirectory + name;
      await FileSystem.writeAsStringAsync(fileUri, jsonData, { encoding: FileSystem.EncodingType.UTF8 });
      setDownloadProgress(100);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: `Resume_${resume.personalInfo?.firstName || 'Resume'}.json` });
      }
      bump(resume, 'downloadCount');
    });
  };

  const handleShareResume = async (resume) => {
    if (!requireAccount()) return;
    try {
      if (!resume) return Alert.alert('Error', 'No resume selected');
      const shareMessage = `
📄 Resume: ${resume?.personalInfo?.firstName || ''} ${resume?.personalInfo?.lastName || ''}

${resume?.professionalSummary?.summary || ''}

🎯 Target Job: ${resume?.targetJob?.jobTitle || 'Not specified'}

💼 Experience: ${resume?.workExperience?.length || 0} positions
🎓 Education: ${resume?.education?.length || 0} degrees
🔧 Skills: ${resume?.skills?.map(s => s.name).join(', ') || 'None listed'}

Resume strength: ${resumeStrength(resume).score}%
      `;
      const result = await Share.share({
        message: shareMessage,
        title: `${resume?.personalInfo?.firstName || ''}'s Resume`,
      });
      if (result.action === Share.sharedAction) {
        bump(resume, 'shareCount');
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
  const handleOptimizeResumeFlow = (job) => {
    if (isGuest) return requireAccount();
    if (!selectedResume || !selectedResume._id) {
      return Alert.alert('No Resume Found', 'Please create or upload a resume first.');
    }
    exporter.run(async () => {
      const fitResult = await checkResumeFit(selectedResume._id, job._id);
      if (!fitResult.meetsRequirements) {
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
      const html = await resumeHtmlWithFonts(tailored, tailored.template || 'modern_ats', tailored.customStyles || {});
      setDownloadProgress(85);
      const { uri } = await withTimeout(Print.printToFileAsync({ html, base64: false }), TIMEOUT.PDF, 'pdf');
      const f = fileName(tailored, 'Optimized_Resume.pdf');
      const fileUri = FileSystem.documentDirectory + f.name;
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      setDownloadProgress(100);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: `${f.first} ${f.last} Optimized Resume`, UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('✅ Success', `Optimized resume saved as: ${f.name}`);
      }
      // the tailored copy counts against the limit: refresh the list (background)
      fetchResumes(true).catch(() => {});
    });
  };

  const handleApplyToJob = (job) => {
    const applyUrl =
      job.externalUrl || job.companyWebsite || 'https://pk.indeed.com/q-remote-internship-jobs.html';
    Linking.openURL(applyUrl).catch(() => {
      Alert.alert('Cannot Open Link', 'The application link could not be opened.');
    });
  };

  const handleSaveJob = async (job) => {
    if (isGuest) return requireAccount();
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
    if (!requireAccount()) return;
    try {
      setIsLoading(true);
      const duplicated = await duplicateResume(resumeId);
      if (duplicated) {
        setSelectedResume(duplicated);
        await fetchResumes(true);
        Alert.alert('✅ Success', 'Resume duplicated successfully!');
      }
    } catch (error) {
      Alert.alert('❌ Error', plainError(error, "Failed to duplicate resume. Please try again."));
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
            onPress={() => {
              // no resume yet = a new one (needs an account)
              if (!selectedResume && !requireAccount()) return;
              navigation.navigate(
                selectedResume ? 'ResumeBuilder' : newResumeScreen,
                selectedResume ? { resumeId: selectedResume._id } : undefined
              );
            }}
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
              <Text style={styles.downloadProgressText}>making your pdf… {downloadProgress}%</Text>
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
  // P5-4 (polishEmptyStates): the empty state's action, the same steps as the "create resume" button below
  const startNewResume = () => {
    if (!requireAccount()) return;
    if (limitReached) {
      Alert.alert(
        'Resume Limit Reached',
        `You can have at most ${MAX_CREATIONS} resumes at a time. Delete an existing resume to create a new one.`
      );
      return;
    }
    navigation.navigate(newResumeScreen);
  };

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
              if (!requireAccount()) return;
              if (limitReached) {
                Alert.alert(
                  'Resume Limit Reached',
                  `You can have at most ${MAX_CREATIONS} resumes at a time. Delete an existing resume to create a new one.`
                );
                return;
              }
              navigation.navigate(newResumeScreen);
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
          ref={scrollRef}
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
                        <Text style={[RD.chipText, on && RD.chipTextOn]} numberOfLines={1}>
                          {resumeName(resume)}
                        </Text>
                        <Text style={[RD.chipPct, on && RD.chipTextOn]} accessibilityLabel={`resume strength ${resumeStrength(resume).score} percent`}>
                          strength {resumeStrength(resume).score}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {selectedResume ? (
                <>
                  {studioOn && (
                    <View style={RD.section}>
                      <View style={RD.studio}>
                        <Text style={RD.studioTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>resume studio</Text>
                        <Text style={RD.studioText} maxFontSizeMultiplier={MAX_FONT_SCALE}>tailor this resume for a job. you review every change; nothing is invented.</Text>
                        <View style={RD.studioRow}>
                          <TouchableOpacity style={RD.studioBtn} accessibilityRole="button" accessibilityLabel="tailor for a job"
                            onPress={() => navigation.navigate('ResumeStudio', { resumeId: selectedResume._id, fresh: true })}>
                            <Text style={RD.studioBtnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>tailor for a job</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[RD.studioBtn, RD.studioBtnLight]} accessibilityRole="button" accessibilityLabel="my tailored versions"
                            onPress={() => navigation.navigate('ResumeStudio', { view: 'versions' })}>
                            <Text style={[RD.studioBtnText, { color: T.ink }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>my versions</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}

                  {feedbackOn && (
                    <View style={RD.section}>
                      <TouchableOpacity style={[RD.studioBtn, RD.studioBtnLight]} accessibilityRole="button" accessibilityLabel="get recruiter feedback on this resume"
                        onPress={() => navigation.navigate('ResumeFeedback', { resumeId: selectedResume._id })}>
                        <Text style={[RD.studioBtnText, { color: T.ink }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>get recruiter feedback</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Dark card: score ring + actions */}
                  <View style={RD.section}>
                    <View style={RD.dark}>
                      <View style={RD.darkTop}>
                        <ScoreRing
                          value={hasAts ? atsScore : resumeStrength(selectedResume).score}
                          label={hasAts ? 'ats' : 'strength'}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={RD.darkLabel}>
                            {hasAts ? 'ats compatibility score' : 'resume strength'}
                          </Text>
                          <Text style={RD.darkName} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                            {resumeName(selectedResume)}
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
                                { backgroundColor: getStatusColor(resumeStrength(selectedResume).score) },
                              ]}
                            />
                            <Text style={RD.darkSub}>
                              {getStatusText(resumeStrength(selectedResume).score).toLowerCase()}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* what the % means, and exactly what is missing (tap) */}
                      <ResumeStrength
                        resume={selectedResume}
                        dark
                        style={{ marginTop: 12 }}
                        onGoTo={(step) => navigation.navigate('ResumeBuilder', { resumeId: selectedResume._id, step })}
                      />

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

                  {/* Recommended for you (FLAG_CAREER_MATCHING) */}
                  {matchingOn && (
                    <View style={RD.section} testID="resume-recommended" onLayout={onMatchesLayout}>
                      <Text style={RD.h2} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                        recommended for you<Text style={{ color: T.yellow }}>.</Text>
                      </Text>
                      <View style={{ marginTop: 10 }}>{renderRecommendations()}</View>
                    </View>
                  )}
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
          ) : polishEmpty ? (
            // P5-4 (polishEmptyStates): the design system's empty state, the same create action
            <EmptyState mood="sleepy" title="no resume yet" line="build your first one. it takes a few minutes." actionLabel="create resume" onAction={startNewResume} />
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
                  if (!requireAccount()) return;
                  if (limitReached) {
                    Alert.alert(
                      'Resume Limit Reached',
                      `You can have at most ${MAX_CREATIONS} resumes at a time. Delete an existing resume to create a new one.`
                    );
                    return;
                  }
                  navigation.navigate(newResumeScreen);
                }}
              >
                <Text style={RD.btnYellowText}>create resume</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Invites to apply (FLAG_CAREER_MATCHING), below the resumes; renders nothing with it off */}
          {matchingOn && (
            <View onLayout={onInvitesLayout} testID="resume-invites" style={{ marginTop: 8 }}>
              <CareerInvites navigation={navigation} refreshKey={refreshing} />
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


export default ResumeDashboardScreen;

