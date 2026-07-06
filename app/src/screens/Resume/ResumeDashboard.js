// app/src/screens/Resume/ResumeDashboardScreen.js
import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  Dimensions,
  Share,
  ActivityIndicator,
  Modal,
  Platform,
  FlatList,
  TextInput,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { ResumeContext } from '../../context/ResumeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { renderResumeHTML } from '../../services/templateService';

const { width, height } = Dimensions.get('window');

const ResumeDashboardScreen = ({ navigation }) => {
  const { user, isGuest } = useContext(AuthContext);
  const {
    resumes = [],
    fetchResumes,
    loadResume,
    deleteResume,
    getRecommendedJobs,
    updateResume,
    loading,
    initialized,
  } = useContext(ResumeContext);

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
  const [activeTab, setActiveTab] = useState('overview');

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchResumes();
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Set selected resume when resumes load
  useEffect(() => {
    if (resumes && resumes.length > 0 && !selectedResume) {
      const firstResume = resumes[0];
      setSelectedResume(firstResume);
      loadResume(firstResume._id);
      fetchRecommendations(firstResume._id);
    }
    if (resumes && resumes.length > 0) {
      setFilteredResumes(resumes);
    }
  }, [resumes]);

  // Fetch recommendations when selected resume changes
  useEffect(() => {
    if (selectedResume && selectedResume._id) {
      fetchRecommendations(selectedResume._id);
    }
  }, [selectedResume]);

  // Filter resumes on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredResumes(resumes);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = resumes.filter(r => {
        const name = `${r.personalInfo?.firstName || ''} ${r.personalInfo?.lastName || ''}`.toLowerCase();
        const title = r.professionalSummary?.title?.toLowerCase() || '';
        const jobTitle = r.targetJob?.jobTitle?.toLowerCase() || '';
        return name.includes(query) || title.includes(query) || jobTitle.includes(query);
      });
      setFilteredResumes(filtered);
    }
  }, [searchQuery, resumes]);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchResumes();
    if (resumes && resumes.length > 0) {
      const firstResume = resumes[0];
      setSelectedResume(firstResume);
      await fetchRecommendations(firstResume._id);
    }
    setRefreshing(false);
  }, [resumes]);

  // Fetch recommendations
  const fetchRecommendations = async (resumeId) => {
    try {
      setRecommendationsLoading(true);
      const jobs = await getRecommendedJobs(resumeId);
      setRecommendations(jobs || []);
    } catch (error) {
      console.error('Fetch recommendations error:', error);
      setRecommendations([]);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Handle resume selection
  const handleSelectResume = (resume) => {
    if (resume && resume._id) {
      setSelectedResume(resume);
      loadResume(resume._id);
      setShowAllResumes(false);
    }
  };

  // Handle delete resume
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
              const remaining = resumes.filter(r => r._id !== resumeId);
              if (selectedResume?._id === resumeId) {
                setSelectedResume(remaining.length > 0 ? remaining[0] : null);
              }
              await fetchResumes();
              Alert.alert('✅ Success', 'Resume deleted successfully');
            } catch (error) {
              Alert.alert('❌ Error', 'Failed to delete resume');
            }
          }
        }
      ]
    );
  };

  // Handle download resume as PDF
  const handleDownloadResume = async (resume, format = 'pdf') => {
    if (!resume) {
      Alert.alert('Error', 'No resume selected');
      return;
    }

    try {
      setDownloading(true);
      setDownloadProgress(10);
      setDownloadModalVisible(true);

      const html = renderResumeHTML(resume, resume.template || 'modern');
      setDownloadProgress(30);

      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      setDownloadProgress(70);

      if (resume._id) {
        await updateResume(resume._id, { 
          downloadCount: (resume.downloadCount || 0) + 1 
        });
      }
      setDownloadProgress(90);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Resume_${resume.personalInfo?.firstName || 'Resume'}.pdf`,
          UTI: 'com.adobe.pdf',
        });
        setDownloadProgress(100);
        Alert.alert('✅ Success', 'Resume downloaded successfully!');
      } else {
        const fileName = `Resume_${resume.personalInfo?.firstName || 'Resume'}_${Date.now()}.pdf`;
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.copyAsync({
          from: uri,
          to: fileUri,
        });
        setDownloadProgress(100);
        Alert.alert(
          '✅ Success', 
          `Resume saved to: ${fileUri}`,
          [
            {
              text: 'Open File',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Sharing.shareAsync(fileUri);
                } else {
                  Sharing.shareAsync(fileUri);
                }
              }
            },
            { text: 'OK' }
          ]
        );
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

  // Handle download as HTML
  const handleDownloadHTML = async (resume) => {
    if (!resume) {
      Alert.alert('Error', 'No resume selected');
      return;
    }

    try {
      setDownloading(true);
      setDownloadProgress(10);
      setDownloadModalVisible(true);

      const html = renderResumeHTML(resume, resume.template || 'modern');
      setDownloadProgress(50);

      const fileName = `Resume_${resume.personalInfo?.firstName || 'Resume'}_${Date.now()}.html`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setDownloadProgress(80);

      if (resume._id) {
        await updateResume(resume._id, { 
          downloadCount: (resume.downloadCount || 0) + 1 
        });
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

  // Handle download as JSON
  const handleDownloadJSON = async (resume) => {
    if (!resume) {
      Alert.alert('Error', 'No resume selected');
      return;
    }

    try {
      setDownloading(true);
      setDownloadProgress(10);
      setDownloadModalVisible(true);

      const jsonData = JSON.stringify(resume, null, 2);
      setDownloadProgress(50);

      const fileName = `Resume_${resume.personalInfo?.firstName || 'Resume'}_${Date.now()}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, jsonData, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setDownloadProgress(80);

      if (resume._id) {
        await updateResume(resume._id, { 
          downloadCount: (resume.downloadCount || 0) + 1 
        });
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

  // Handle share resume
  const handleShareResume = async (resume) => {
    try {
      if (!resume) {
        Alert.alert('Error', 'No resume selected');
        return;
      }
      
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
          await updateResume(resume._id, { 
            shareCount: (resume.shareCount || 0) + 1 
          });
        }
        Alert.alert('✅ Success', 'Resume shared successfully!');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('❌ Error', 'Failed to share resume');
    }
  };

  // Handle apply to job
  const handleApplyToJob = (job) => {
    Alert.alert(
      'Apply for Position',
      `Would you like to apply for ${job.title} at ${job.companyName || job.company || 'Company'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            navigation.navigate('EnhancedCareer', { jobId: job._id, job });
          }
        }
      ]
    );
  };

  // Handle save job
  const handleSaveJob = (job) => {
    Alert.alert('✅ Job Saved', `${job.title} has been saved to your favorites.`);
  };

  // Navigation handlers
  const handleViewResume = (resume) => {
    if (!resume || !resume._id) {
      Alert.alert('Error', 'No resume selected');
      return;
    }
    try {
      navigation.navigate('ResumeView', { resumeId: resume._id });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open resume view');
    }
  };

  const handleCreateTemplate = (resume) => {
    if (!resume || !resume._id) {
      Alert.alert('Error', 'No resume selected');
      return;
    }
    try {
      navigation.navigate('ResumeTemplate', { resumeId: resume._id });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open templates');
    }
  };

  const handleEditResume = (resume) => {
    if (!resume || !resume._id) {
      Alert.alert('Error', 'No resume selected');
      return;
    }
    try {
      navigation.navigate('ResumeBuilder', { resumeId: resume._id });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open resume builder');
    }
  };

  const handleAnalytics = (resume) => {
    if (!resume || !resume._id) {
      Alert.alert('Error', 'No resume selected');
      return;
    }
    try {
      navigation.navigate('ResumeAnalytics', { resumeId: resume._id });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open analytics');
    }
  };

  const handleSettings = (resume) => {
    if (!resume || !resume._id) {
      Alert.alert('Error', 'No resume selected');
      return;
    }
    try {
      navigation.navigate('ResumeSettings', { resumeId: resume._id });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open settings');
    }
  };

  // Get status color
  const getStatusColor = (percentage) => {
    if (percentage >= 80) return '#2ECC71';
    if (percentage >= 50) return '#f9c349';
    if (percentage >= 30) return '#E67E22';
    return '#E74C3C';
  };

  // Get status text
  const getStatusText = (percentage) => {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 50) return 'Good';
    if (percentage >= 30) return 'Needs Work';
    return 'Incomplete';
  };

  // Render recommendations
  const renderRecommendations = () => {
    if (recommendationsLoading) {
      return (
        <View style={styles.recommendationsLoading}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Finding best matches...</Text>
        </View>
      );
    }

    if (!recommendations || recommendations.length === 0) {
      return (
        <View style={styles.emptyJobsContainer}>
          <Ionicons name="briefcase-outline" size={48} color="#ccc" />
          <Text style={styles.emptyJobsText}>
            Complete your resume to get personalized job matches.
          </Text>
          <TouchableOpacity
            style={styles.buildResumeButton}
            onPress={() => navigation.navigate('ResumeBuilder')}
          >
            <Text style={styles.buildResumeButtonText}>Build Your Resume</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return recommendations.map((job, index) => {
      const matchColor = job.matchPercentage >= 80 ? '#2ECC71' : 
                         job.matchPercentage >= 60 ? '#f9c349' : '#E74C3C';
      
      return (
        <Animated.View 
          key={job._id || index} 
          style={[
            styles.jobCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
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
          
          <Text style={styles.jobDescription} numberOfLines={2}>
            {job.description || 'Great opportunity to join our team and grow your career.'}
          </Text>
          
          <View style={styles.jobActions}>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => handleApplyToJob(job)}
            >
              <Text style={styles.applyButtonText}>Apply Now</Text>
              <Ionicons name="arrow-forward" size={16} color="#f9c349" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveJobButton}
              onPress={() => handleSaveJob(job)}
            >
              <Ionicons name="bookmark-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    });
  };

  // Render download modal
  const renderDownloadModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={downloadModalVisible}
      onRequestClose={() => {
        if (!downloading) {
          setDownloadModalVisible(false);
        }
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
              <Text style={styles.downloadProgressText}>
                {downloadProgress}% Complete
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${downloadProgress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.downloadStatusText}>
                {downloadProgress < 30 && 'Generating resume...'}
                {downloadProgress >= 30 && downloadProgress < 70 && 'Creating PDF...'}
                {downloadProgress >= 70 && downloadProgress < 100 && 'Saving file...'}
                {downloadProgress >= 100 && 'Complete!'}
              </Text>
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

  // Loading state
  if (isLoading || (loading && resumes.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading your resumes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const safeResumes = Array.isArray(resumes) ? resumes : [];
  const hasResumes = safeResumes.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>
              {isGuest ? 'Guest User' : user?.name || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newResumeButton}
            onPress={() => navigation.navigate('ResumeBuilder')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newResumeButtonText}>New</Text>
          </TouchableOpacity>
        </View>

       

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
                        selectedResume?._id === resume._id && styles.resumeTabActive
                      ]}
                      onPress={() => handleSelectResume(resume)}
                    >
                      <Text style={[
                        styles.resumeTabText,
                        selectedResume?._id === resume._id && styles.resumeTabTextActive
                      ]}>
                        {resume?.personalInfo?.firstName || 'Resume'}
                      </Text>
                      <View style={[
                        styles.resumeTabBadge,
                        { backgroundColor: getStatusColor(resume?.completionPercentage || 0) }
                      ]}>
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
                  {/* Stats Card with Gold Gradient */}
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
                            {selectedResume?.personalInfo?.firstName || 'Untitled'} {selectedResume?.personalInfo?.lastName || ''}
                          </Text>
                          <Text style={styles.resumeTitle}>
                            {selectedResume?.professionalSummary?.title || 'No title set'}
                          </Text>
                          <View style={styles.statusContainer}>
                            <View style={[
                              styles.statusDot,
                              { backgroundColor: getStatusColor(selectedResume?.completionPercentage || 0) }
                            ]} />
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

                  {/* Quick Action Cards */}
                  <View style={styles.quickActions}>
                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => handleViewResume(selectedResume)}
                    >
                      <View style={[styles.quickActionIcon, { backgroundColor: '#f9c349' }]}>
                        <Ionicons name="eye-outline" size={24} color="#000" />
                      </View>
                      <Text style={styles.quickActionLabel}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => handleEditResume(selectedResume)}
                    >
                      <View style={[styles.quickActionIcon, { backgroundColor: '#000' }]}>
                        <Ionicons name="create-outline" size={24} color="#f9c349" />
                      </View>
                      <Text style={styles.quickActionLabel}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => setDownloadModalVisible(true)}
                    >
                      <View style={[styles.quickActionIcon, { backgroundColor: '#f9c349' }]}>
                        <Ionicons name="download-outline" size={24} color="#000" />
                      </View>
                      <Text style={styles.quickActionLabel}>Download</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => handleShareResume(selectedResume)}
                    >
                      <View style={[styles.quickActionIcon, { backgroundColor: '#000' }]}>
                        <Ionicons name="share-outline" size={24} color="#f9c349" />
                      </View>
                      <Text style={styles.quickActionLabel}>Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => handleCreateTemplate(selectedResume)}
                    >
                      <View style={[styles.quickActionIcon, { backgroundColor: '#f9c349' }]}>
                        <Ionicons name="color-palette-outline" size={24} color="#000" />
                      </View>
                      <Text style={styles.quickActionLabel}>Templates</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => handleAnalytics(selectedResume)}
                    >
                      <View style={[styles.quickActionIcon, { backgroundColor: '#000' }]}>
                        <Ionicons name="stats-chart-outline" size={24} color="#f9c349" />
                      </View>
                      <Text style={styles.quickActionLabel}>Analytics</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Recommendations Section */}
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
                style={styles.createButton}
                onPress={() => navigation.navigate('ResumeBuilder')}
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
          
          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>

      {/* Download Modal */}
      {renderDownloadModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    marginTop:40
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 20 : 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  greeting: {
    fontSize: 13,
    color: '#999',
    fontWeight: '400',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  newResumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
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
    color: '#f9c349',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#000',
  },
  resumeSelector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resumeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  resumeTabActive: {
    backgroundColor: '#000',
    borderColor: '#f9c349',
  },
  resumeTabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  resumeTabTextActive: {
    color: '#fff',
  },
  resumeTabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  resumeTabBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  viewAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewAllText: {
    fontSize: 12,
    color: '#f9c349',
    fontWeight: '500',
  },
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
  statsGradient: {
    padding: 24,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLeft: {
    flex: 1,
  },
  resumeName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  resumeTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  statsRight: {
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f9c349',
  },
  percentageLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
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
  resumeStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeStatText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 6,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  quickActionCard: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  seeAllText: {
    fontSize: 13,
    color: '#f9c349',
    fontWeight: '500',
  },
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
  jobHeader: {
    marginBottom: 8,
  },
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
  matchText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  jobCompany: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 6,
  },
  jobDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginVertical: 2,
  },
  jobDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  matchedSkillsContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  matchedSkillsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  matchedSkillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
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
  matchedSkillText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  moreSkillsText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
  },
  matchReasonsContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  matchReasonsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  matchReasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
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
  matchReasonText: {
    fontSize: 11,
    color: '#2ECC71',
    marginLeft: 2,
  },
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
  urgentBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
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
  featuredBadgeText: {
    fontSize: 10,
    color: '#000',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  createButton: {
    marginTop: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyJobsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
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
  buildResumeButtonText: {
    color: '#f9c349',
    fontSize: 14,
    fontWeight: '600',
  },
  recommendationsLoading: {
    padding: 30,
    alignItems: 'center',
  },
  // Modal Styles
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  downloadOptions: {
    padding: 16,
  },
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
  downloadOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
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
  downloadProgressContainer: {
    padding: 30,
    alignItems: 'center',
  },
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
  progressFill: {
    height: '100%',
    backgroundColor: '#f9c349',
    borderRadius: 3,
  },
  downloadStatusText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

export default ResumeDashboardScreen;