import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  
  Dimensions,
  Platform,
  StatusBar,
  RefreshControl,
  Alert,
  Share,
  ActivityIndicator,
  Modal,
  Image,
  TouchableWithoutFeedback
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from '@react-navigation/native';
import { resumeAPI } from '../../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { AuthContext } from "../../context/AuthContext";
import { useContext } from "react";
const { width } = Dimensions.get("window");

const ResumeDashboard = ({ navigation }) => {
  const { token, user, logout } = useContext(AuthContext);
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);
  const [userName, setUserName] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [marketInsights, setMarketInsights] = useState([]);
  const [fullInsights, setFullInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  useEffect(() => {
    loadUserData();
    fetchResume();
    fetchAnalytics();
    fetchMarketInsights();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchResume();
      fetchAnalytics();
      fetchMarketInsights();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUserName(userData.name || userData.fullName || 'User');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchResume = async () => {
    try {
      setLoading(true);
      const response = await resumeAPI.getResume();
      setResumeData(response.data);
      if (response.data.completionScore) {
        setCompletionScore(response.data.completionScore);
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
      if (error.response?.status !== 404) {
        Alert.alert('Error', 'Failed to load resume data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await resumeAPI.getAnalytics();
      setAnalytics(response.data);
      if (response.data.completionScore) {
        setCompletionScore(response.data.completionScore);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchMarketInsights = async () => {
    try {
      setLoadingInsights(true);
      const response = await resumeAPI.getMarketInsights();
      console.log('Market Insights Response:', response.data);
      
      if (response.data && response.data.insights) {
        const insights = response.data.insights;
        setFullInsights(insights);
        
        // Format top job roles for display
        if (insights.topJobRoles && insights.topJobRoles.length > 0) {
          const formattedInsights = insights.topJobRoles.slice(0, 3).map(role => ({
            title: role.title,
            match: `${role.match}%`,
            trend: role.trend || '+0%',
            description: role.description || 'Growing demand in the market',
            salary: role.salary || '$60,000 - $100,000',
            skills: role.requiredSkills || []
          }));
          setMarketInsights(formattedInsights);
        } else {
          // Fallback insights
          setMarketInsights(getFallbackInsights());
        }
      } else {
        setMarketInsights(getFallbackInsights());
      }
    } catch (error) {
      console.error('Error fetching market insights:', error);
      setMarketInsights(getFallbackInsights());
    } finally {
      setLoadingInsights(false);
    }
  };

  const getFallbackInsights = () => {
    return [
      {
        title: "Software Developer",
        match: "85%",
        trend: "+12%",
        description: "High demand in your area",
        salary: "$75,000 - $115,000",
        skills: ["JavaScript", "React", "Node.js"]
      },
      {
        title: "Full Stack Developer",
        match: "78%",
        trend: "+15%",
        description: "Growing market demand",
        salary: "$80,000 - $120,000",
        skills: ["React", "Node.js", "MongoDB"]
      },
      {
        title: "DevOps Engineer",
        match: "65%",
        trend: "+18%",
        description: "Fastest growing role",
        salary: "$90,000 - $140,000",
        skills: ["Docker", "Kubernetes", "AWS"]
      }
    ];
  };

  // Function to get user's initials for fallback
  const getUserInitials = () => {
    if (userName && userName !== 'User') {
      const nameParts = userName.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return userName[0].toUpperCase();
    }
    return 'U';
  };

  // Function to get profile image URL
  const getProfileImageUrl = () => {
    // Check if user has profile image from context
    if (user?.profileImage && !profileImageError) {
      return user.profileImage;
    }
    // Fallback to a reliable avatar service with user's name
    if (userName && userName !== 'User') {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=4f46e5&color=fff&bold=true&length=2`;
    }
    // Final fallback
    return 'https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff&bold=true';
  };

  const handleViewResume = async () => {
    if (!resumeData?.fullName) {
      Alert.alert('No Resume', 'Please create a resume first');
      return;
    }
    
    setGenerating(true);
    try {
      const currentTemplateId = resumeData.templateId || 'modern_001';
      const response = await resumeAPI.generatePDFWithTemplate(currentTemplateId);
      
      if (response.data && response.data.pdfUrl) {
        navigation.navigate('PDFViewer', { 
          pdfUrl: response.data.pdfUrl,
          filename: response.data.filename || `resume_${Date.now()}.pdf`,
          resumeData: resumeData 
        });
      } else {
        throw new Error('No PDF URL received');
      }
    } catch (error) {
      console.error('View resume error:', error);
      Alert.alert('Error', 'Failed to generate resume preview. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePDF = () => {
    if (!resumeData?.fullName) {
      Alert.alert('No Resume', 'Please create a resume first');
      return;
    }
    navigation.navigate('TemplateSelection', { resumeData, mode: 'pdf' });
  };

  const handleShareResume = async () => {
    if (!resumeData?.fullName) {
      Alert.alert('No Resume', 'Please create a resume first');
      return;
    }
    
    try {
      const response = await resumeAPI.generateShareLink();
      const { shareUrl: url } = response.data;
      setShareUrl(url);
      
      await Share.share({
        message: `Check out my professional resume: ${url}`,
        title: 'Share Resume',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to generate share link. Please try again.');
    }
  };

  const handleCopyLink = async () => {
    if (!resumeData?.fullName) {
      Alert.alert('No Resume', 'Please create a resume first');
      return;
    }
    
    try {
      let url = shareUrl;
      if (!url) {
        const response = await resumeAPI.generateShareLink();
        url = response.data.shareUrl;
        setShareUrl(url);
      }
      await Clipboard.setStringAsync(url);
      Alert.alert('Success', 'Link copied to clipboard!');
    } catch (error) {
      console.error('Copy link error:', error);
      Alert.alert('Error', 'Failed to generate share link');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchResume(), fetchAnalytics(), fetchMarketInsights()]);
    setRefreshing(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  const getScoreMessage = (score) => {
    if (score >= 80) return 'Excellent! Your resume is ready';
    if (score >= 60) return 'Good progress, keep going!';
    if (score >= 40) return 'Room for improvement';
    return 'Need more details';
  };

  const getProfileCompletionMessage = () => {
    if (completionScore === 100) {
      return "🎉 Congratulations! Your profile is 100% complete! You're ready to impress employers!";
    }
    const remaining = 100 - completionScore;
    return `📈 Your profile is ${completionScore}% complete. Add ${remaining}% more details to reach 100%!`;
  };

  const allRecommendations = analytics?.recommendations || [
    { priority: 'high', message: 'Complete your profile', action: 'Add personal details' },
    { priority: 'high', message: 'Add work experience', action: 'Showcase your career' },
    { priority: 'medium', message: 'Add technical skills', action: 'List your expertise' },
    { priority: 'low', message: 'Add certifications', action: 'Validate your skills' }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading your resume...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topNav}>
        <View style={styles.profileCircle}>
          <Image 
            source={{ uri: getProfileImageUrl() }} 
            style={styles.profileImage}
            onError={() => setProfileImageError(true)}
          />
        </View>
        
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Hello, {userName.split(' ')[0]}!</Text>
          <Text style={styles.subText}>
            {getProfileCompletionMessage()}
          </Text>
        </View>

        {/* Resume Strength Card */}
        <View style={styles.mainCard}>
          <LinearGradient
            colors={["#ae7b04", "#f9c349"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCard}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardLabel}>RESUME STRENGTH</Text>
                <Text style={styles.cardValue}>{completionScore}% Complete</Text>
              </View>
              <MaterialCommunityIcons
                name={completionScore === 100 ? "trophy" : "shield-check"}
                size={32}
                color="rgba(255,255,255,0.8)"
              />
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${completionScore}%`, backgroundColor: getScoreColor(completionScore) }]} />
              </View>
              <Text style={styles.progressText}>{getScoreMessage(completionScore)}</Text>
            </View>

            <TouchableOpacity
              style={styles.whiteButton}
              onPress={() => navigation.navigate("ResumeBuilder", { resumeData })}
            >
              <Text style={styles.whiteButtonText}>
                {resumeData?.fullName ? 'Enhance with AI' : 'Create Resume'}
              </Text>
              <Ionicons name="sparkles" color="#4f46e5" size={16} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <ActionItem 
            icon="eye-outline" 
            label="View" 
            color="#6366f1"
            onPress={handleViewResume}
            disabled={!resumeData?.fullName || generating}
            loading={generating}
          />
          <ActionItem
            icon="download-outline"
            label="PDF"
            color="#ec4899"
            onPress={handleGeneratePDF}
            disabled={!resumeData?.fullName}
          />
          <ActionItem 
            icon="share-outline" 
            label="Share" 
            color="#22c55e"
            onPress={handleShareResume}
            disabled={!resumeData?.fullName}
          />
          <ActionItem 
            icon="settings-outline" 
            label="Edit" 
            color="#f59e0b"
            onPress={() => navigation.navigate("ResumeBuilder", { resumeData })}
          />
        </View>

        {/* AI Market Insights */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>AI Market Insights</Text>
          <TouchableOpacity onPress={() => setShowInsightsModal(true)}>
            <Text style={styles.seeAll}>See details</Text>
          </TouchableOpacity>
        </View>

        {loadingInsights ? (
          <View style={styles.insightsLoadingContainer}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={styles.insightsLoadingText}>Analyzing market data...</Text>
          </View>
        ) : (
          <View style={styles.insightGrid}>
            {marketInsights.slice(0, 2).map((insight, index) => (
              <InsightCard
                key={index}
                title={insight.title}
                match={insight.match}
                trend={insight.trend}
                icon={index === 0 ? "cpu" : "layers"}
                color={index === 0 ? "#818cf8" : "#fb7185"}
              />
            ))}
          </View>
        )}

        {/* Top Recommendations */}
        <Text style={styles.sectionTitle}>Top Recommendations</Text>
        {allRecommendations.slice(0, 2).map((rec, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.jobCard}
            onPress={() => {
              if (rec.message.toLowerCase().includes('resume') || rec.message.toLowerCase().includes('profile')) {
                navigation.navigate("ResumeBuilder", { resumeData });
              }
            }}
          >
            <View style={[styles.jobIconBg, { backgroundColor: rec.priority === 'high' ? '#fee2e2' : '#fef3c7' }]}>
              <MaterialCommunityIcons
                name={rec.priority === 'high' ? 'alert-circle' : 'lightbulb'}
                size={24}
                color={rec.priority === 'high' ? '#ef4444' : '#f59e0b'}
              />
            </View>
            <View style={styles.jobInfo}>
              <Text style={styles.jobName}>{rec.message}</Text>
              <Text style={styles.jobMeta}>{rec.action}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        ))}

        {/* Completion Progress */}
        <View style={styles.completionCard}>
          <Text style={styles.completionTitle}>Profile Completion Progress</Text>
          <View style={styles.completionProgressTrack}>
            <View style={[styles.completionProgressFill, { width: `${completionScore}%`, backgroundColor: getScoreColor(completionScore) }]} />
          </View>
          <Text style={styles.completionText}>{completionScore}% Complete</Text>
          {completionScore === 100 && (
            <View style={styles.perfectBadge}>
              <MaterialCommunityIcons name="star-circle" size={20} color="#f59e0b" />
              <Text style={styles.perfectText}>Perfect! Your resume is ready to share</Text>
            </View>
          )}
        </View>

        {/* Public Link */}
        {resumeData?.fullName && (
          <View style={styles.brandLinkBox}>
            <View style={styles.brandLeft}>
              <Feather name="link-2" size={18} color="#4f46e5" />
              <Text style={styles.brandUrl} numberOfLines={1}>
                tdc.app/me/{resumeData.fullName?.toLowerCase().replace(/\s/g, '') || 'user'}
              </Text>
            </View>
            <TouchableOpacity style={styles.copyBadge} onPress={handleCopyLink}>
              <Text style={styles.copyText}>Get Link</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* AI Market Insights Modal - Detailed View */}
      <Modal
        visible={showInsightsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInsightsModal(false)}
      >
      <TouchableWithoutFeedback onPress={() => setShowInsightsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Market Insights</Text>
              <TouchableOpacity onPress={() => setShowInsightsModal(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingInsights ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color="#4f46e5" />
                  <Text style={styles.modalLoadingText}>Generating insights...</Text>
                </View>
              ) : (
                <>
                  {/* Top Job Roles Section */}
                  <Text style={styles.modalSectionTitle}>🎯 Top Matching Roles</Text>
                  {marketInsights.map((insight, index) => (
                    <View key={index} style={styles.detailInsightCard}>
                      <View style={styles.detailInsightHeader}>
                        <Text style={styles.detailInsightTitle}>{insight.title}</Text>
                        <View style={styles.matchBadge}>
                          <Text style={styles.matchText}>{insight.match} Match</Text>
                        </View>
                      </View>
                      <Text style={styles.trendText}>Market Trend: {insight.trend}</Text>
                      <Text style={styles.descriptionText}>{insight.description}</Text>
                      <Text style={styles.salaryText}>💰 Salary Range: {insight.salary}</Text>
                      <View style={styles.skillsContainer}>
                        <Text style={styles.skillsLabel}>Key Skills:</Text>
                        {insight.skills && insight.skills.map((skill, idx) => (
                          <View key={idx} style={styles.skillTag}>
                            <Text style={styles.skillTagText}>{skill}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}

                  {/* Skill Gaps Section */}
                  {fullInsights?.skillGaps && fullInsights.skillGaps.length > 0 && (
                    <>
                      <Text style={styles.modalSectionTitle}>📚 Skills to Develop</Text>
                      {fullInsights.skillGaps.slice(0, 3).map((gap, index) => (
                        <View key={index} style={styles.skillGapCard}>
                          <MaterialCommunityIcons name="lightning-bolt" size={24} color="#f59e0b" />
                          <View style={styles.skillGapContent}>
                            <Text style={styles.skillGapTitle}>{gap.skill}</Text>
                            <Text style={styles.skillGapSuggestion}>{gap.suggestion}</Text>
                            <Text style={styles.skillGapTime}>⏱️ {gap.estimatedTimeToLearn}</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Salary Insights */}
                  {fullInsights?.salaryInsights && fullInsights.salaryInsights.length > 0 && (
                    <>
                      <Text style={styles.modalSectionTitle}>💰 Salary Insights</Text>
                      {fullInsights.salaryInsights.map((salary, index) => (
                        <View key={index} style={styles.salaryCard}>
                          <Text style={styles.salaryTitle}>{salary.title}</Text>
                          <Text style={styles.salaryRange}>
                            ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}
                          </Text>
                          <Text style={styles.salaryDesc}>{salary.description}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Career Path */}
                  {fullInsights?.careerPath && fullInsights.careerPath.length > 0 && (
                    <>
                      <Text style={styles.modalSectionTitle}>🚀 Career Path</Text>
                      {fullInsights.careerPath.map((path, index) => (
                        <View key={index} style={styles.careerPathCard}>
                          <View style={styles.careerPathStage}>
                            <Text style={styles.careerPathStageText}>{path.stage}</Text>
                            <Text style={styles.careerPathTimeframe}>{path.timeframe}</Text>
                          </View>
                          <Text style={styles.careerPathRole}>{path.role}</Text>
                          <Text style={styles.careerPathDesc}>{path.description}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Personalized Recommendations */}
                  {fullInsights?.recommendations && fullInsights.recommendations.length > 0 && (
                    <>
                      <Text style={styles.modalSectionTitle}>📋 Actionable Recommendations</Text>
                      {fullInsights.recommendations.slice(0, 3).map((rec, index) => (
                        <View key={index} style={styles.recommendationCard}>
                          <MaterialCommunityIcons 
                            name={rec.priority === 'high' ? 'alert-decagram' : 'lightbulb-on'} 
                            size={24} 
                            color={rec.priority === 'high' ? '#ef4444' : '#10b981'} 
                          />
                          <View style={styles.recommendationCardContent}>
                            <Text style={styles.recommendationCardTitle}>{rec.message}</Text>
                            <Text style={styles.recommendationCardAction}>{rec.action}</Text>
                            {rec.estimatedTime && (
                              <Text style={styles.recommendationCardTime}>⏱️ {rec.estimatedTime}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
        </TouchableWithoutFeedback>
      </Modal>

      
    </SafeAreaView>
  );
};

const ActionItem = ({ icon, label, color, onPress, disabled, loading }) => (
  <TouchableOpacity 
    style={[styles.actionItem, disabled && styles.disabled]} 
    onPress={onPress}
    disabled={disabled || loading}
  >
    <View style={[styles.actionIconCircle, { backgroundColor: `${color}15` }]}>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={22} color={disabled ? '#cbd5e1' : color} />
      )}
    </View>
    <Text style={[styles.actionLabel, disabled && styles.disabledText]}>{label}</Text>
  </TouchableOpacity>
);

const InsightCard = ({ title, match, trend, icon, color }) => (
  <TouchableOpacity style={styles.insightCard}>
    <View style={styles.insightHeader}>
      <Feather name={icon} size={18} color={color} />
      <View style={styles.trendBadge}>
        <Text style={styles.trendText}>{trend}</Text>
      </View>
    </View>
    <Text style={styles.insightTitle}>{title}</Text>
    <Text style={[styles.insightMatch, { color: color }]}>{match} Match</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fcfdfe" },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileInitial: { fontWeight: "bold", color: "#475569", fontSize: 16 },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowOpacity: 0.05,
  },
  dot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    backgroundColor: "#ef4444",
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { marginVertical: 20 },
  welcomeText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  subText: { color: "#64748b", fontSize: 14, marginTop: 4, lineHeight: 20 },
  mainCard: {
    borderRadius: 28,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#f9c349",
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  gradientCard: { padding: 25 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  cardValue: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 4 },
  progressContainer: { marginTop: 25 },
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    alignSelf: "flex-end",
  },
  whiteButton: {
    backgroundColor: "#fff",
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  whiteButtonText: { color: "#4f46e5", fontWeight: "700", fontSize: 14 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  actionItem: { alignItems: "center", width: "22%" },
  disabled: { opacity: 0.5 },
  disabledText: { color: '#cbd5e1' },
  actionIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: { fontSize: 12, fontWeight: "600", color: "#475569" },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 35,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b", marginBottom: 12 },
  seeAll: { fontSize: 13, color: "#000000", fontWeight: "600" },
  insightsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  insightsLoadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  insightGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  insightCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  insightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  trendBadge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: { color: "#16a34a", fontSize: 10, fontWeight: "bold" },
  insightTitle: { fontSize: 14, fontWeight: "700", color: "#334155" },
  insightMatch: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  jobCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 10,
  },
  jobIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  jobInfo: { flex: 1, marginLeft: 15 },
  jobName: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  jobMeta: { fontSize: 11, color: "#64748b", marginTop: 2 },
  completionCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginTop: 20,
  },
  completionTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 12 },
  completionProgressTrack: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  completionProgressFill: { height: 8, borderRadius: 4 },
  completionText: { fontSize: 12, color: "#64748b", marginTop: 8, textAlign: "center" },
  perfectBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    padding: 8,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
  },
  perfectText: { fontSize: 12, color: "#f59e0b", fontWeight: "600" },
  brandLinkBox: {
    marginTop: 25,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  brandUrl: { fontSize: 12, color: "#475569", fontWeight: "500", flex: 1 },
  copyBadge: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  copyText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  modalLoadingContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  modalLoadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  modalSectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginTop: 20, marginBottom: 12 },
  detailInsightCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  detailInsightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailInsightTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  matchBadge: { backgroundColor: '#4f46e5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  matchText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  descriptionText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  salaryText: { fontSize: 12, color: '#22c55e', fontWeight: '600', marginTop: 4 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  skillsLabel: { fontSize: 11, fontWeight: '600', color: '#475569', width: '100%', marginBottom: 6 },
  skillTag: { backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  skillTagText: { fontSize: 10, color: '#475569' },
  skillGapCard: { flexDirection: 'row', backgroundColor: '#fef3c7', padding: 16, borderRadius: 12, marginBottom: 12, gap: 12 },
  skillGapContent: { flex: 1 },
  skillGapTitle: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  skillGapSuggestion: { fontSize: 12, color: '#92400e', marginTop: 4 },
  skillGapTime: { fontSize: 11, color: '#b45309', marginTop: 6 },
  salaryCard: { backgroundColor: '#ecfdf5', padding: 16, borderRadius: 12, marginBottom: 12 },
  salaryTitle: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  salaryRange: { fontSize: 18, fontWeight: '800', color: '#059669', marginTop: 6 },
  salaryDesc: { fontSize: 11, color: '#047857', marginTop: 4 },
  careerPathCard: { backgroundColor: '#eff6ff', padding: 16, borderRadius: 12, marginBottom: 12 },
  careerPathStage: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  careerPathStageText: { fontSize: 12, fontWeight: '700', color: '#1e40af' },
  careerPathTimeframe: { fontSize: 11, color: '#3b82f6' },
  careerPathRole: { fontSize: 14, fontWeight: '700', color: '#1e3a8a', marginBottom: 4 },
  careerPathDesc: { fontSize: 11, color: '#1e40af' },
  recommendationCard: { flexDirection: 'row', backgroundColor: '#f0fdf4', padding: 16, borderRadius: 12, marginBottom: 12, gap: 12 },
  recommendationCardContent: { flex: 1 },
  recommendationCardTitle: { fontSize: 13, fontWeight: '700', color: '#166534' },
  recommendationCardAction: { fontSize: 12, color: '#15803d', marginTop: 4 },
  recommendationCardTime: { fontSize: 11, color: '#16a34a', marginTop: 6 },
  recommendationItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  recommendationIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  recommendationContent: { flex: 1 },
  recommendationMessage: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  recommendationAction: { fontSize: 12, color: '#64748b', marginTop: 2 },
  congratsCard: { alignItems: 'center', padding: 24, gap: 12 },
  congratsText: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  congratsSubtext: { fontSize: 12, color: '#64748b', textAlign: 'center' },
});

export default ResumeDashboard;