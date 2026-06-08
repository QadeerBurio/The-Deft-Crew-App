import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
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
  Animated,
  TouchableWithoutFeedback
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from '@react-navigation/native';
import { resumeAPI } from '../../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { AuthContext } from "../../context/AuthContext";
import GuestGuard from "../../components/GuestGuard";

const { width } = Dimensions.get("window");

const ResumeDashboard = ({ navigation }) => {
  const { token, user } = useContext(AuthContext);
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);
  const [userName, setUserName] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [marketInsights, setMarketInsights] = useState([]);
  const [fullInsights, setFullInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const actionStagger = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadUserData();
    fetchResume();
    fetchAnalytics();
    fetchMarketInsights();
    
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      ...actionStagger.map((anim, i) =>
        Animated.sequence([
          Animated.delay(i * 60),
          Animated.spring(anim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        ])
      ),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (completionScore > 0) {
      Animated.timing(progressWidth, {
        toValue: completionScore,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [completionScore]);

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
      // Don't show alert for new users (404 is expected)
      if (error.response?.status !== 404) {
        // Silent fail for new users
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await resumeAPI.getAnalytics();
      setAnalytics(response.data);
      if (response.data?.completionScore) {
        setCompletionScore(response.data.completionScore);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Silent fail - use fallbacks
    }
  };

  const fetchMarketInsights = async () => {
    try {
      setLoadingInsights(true);
      const response = await resumeAPI.getMarketInsights();
      
      if (response.data && response.data.insights) {
        const insights = response.data.insights;
        setFullInsights(insights);
        
        if (insights.topJobRoles && insights.topJobRoles.length > 0) {
          const formattedInsights = insights.topJobRoles.slice(0, 3).map(role => ({
            title: role.title,
            match: `${role.match || 70}%`,
            trend: role.trend || '+10%',
            description: role.description || 'Growing demand in the market',
            salary: role.salary || '$60,000 - $100,000',
            skills: role.requiredSkills || []
          }));
          setMarketInsights(formattedInsights);
        } else {
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

  const getFallbackInsights = () => [
    { title: "Software Developer", match: "85%", trend: "+12%", description: "High demand in your area", salary: "$75,000 - $115,000", skills: ["JavaScript", "React", "Node.js"] },
    { title: "Full Stack Developer", match: "78%", trend: "+15%", description: "Growing market demand", salary: "$80,000 - $120,000", skills: ["React", "Node.js", "MongoDB"] },
    { title: "DevOps Engineer", match: "65%", trend: "+18%", description: "Fastest growing role", salary: "$90,000 - $140,000", skills: ["Docker", "Kubernetes", "AWS"] }
  ];

  const getProfileImageUrl = () => {
    if (user?.profileImage && !profileImageError) return user.profileImage;
    if (userName && userName !== 'User') {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1a1a1a&color=f9c349&bold=true&length=2`;
    }
    return 'https://ui-avatars.com/api/?name=User&background=1a1a1a&color=f9c349&bold=true';
  };

  const handleViewResume = async () => {
    if (!resumeData?.fullName) {
      Alert.alert('No Resume', 'Please create a resume first');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      Alert.alert('Error', 'Failed to generate resume preview.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePDF = () => {
    if (!resumeData?.fullName) {
      Alert.alert('No Resume', 'Please create a resume first');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('TemplateSelection', { resumeData, mode: 'pdf' });
  };

  const handleShareResume = async () => {
    if (!resumeData?.fullName) {
      Alert.alert('No Resume', 'Please create a resume first');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Alert.alert('Error', 'Failed to generate share link');
    }
  };

  const handleCopyLink = async () => {
    if (!resumeData?.fullName) {
      Alert.alert('No Resume', 'Please create a resume first');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Alert.alert('Error', 'Failed to generate share link');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchResume(), fetchAnalytics(), fetchMarketInsights()]);
    setRefreshing(false);
  };

  const showInsightsWithAnimation = () => {
    setShowInsightsModal(true);
    modalScale.setValue(0.9);
    Animated.spring(modalScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start();
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#f9c349';
    if (score >= 60) return '#f9c349';
    return '#ef4444';
  };

  const getScoreMessage = (score) => {
    if (score >= 80) return 'Excellent! Your resume is ready';
    if (score >= 60) return 'Good progress, keep going!';
    if (score >= 40) return 'Room for improvement';
    return 'Need more details';
  };

  const getProfileCompletionMessage = () => {
    if (completionScore === 100) return "🎉 Congratulations! Your profile is 100% complete!";
    const remaining = 100 - completionScore;
    return `📈 Your profile is ${completionScore}% complete. Add ${remaining}% more details!`;
  };

  const allRecommendations = analytics?.recommendations || [
    { priority: 'high', message: 'Complete your profile', action: 'Add personal details' },
    { priority: 'high', message: 'Add work experience', action: 'Showcase your career' },
    { priority: 'medium', message: 'Add technical skills', action: 'List your expertise' },
    { priority: 'low', message: 'Add certifications', action: 'Validate your skills' }
  ];

  const progressWidthInterpolated = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const actionButtons = [
    { icon: "eye-outline", label: "View", color: "#1a1a1a", onPress: handleViewResume, disabled: !resumeData?.fullName, loading: generating },
    { icon: "document-outline", label: "PDF", color: "#1a1a1a", onPress: handleGeneratePDF, disabled: !resumeData?.fullName },
    { icon: "share-outline", label: "Share", color: "#1a1a1a", onPress: handleShareResume, disabled: !resumeData?.fullName },
    { icon: "create-outline", label: "Edit", color: "#1a1a1a", onPress: () => navigation.navigate("ResumeBuilder", { resumeData }) },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <HeaderBar navigation={navigation} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading your resume...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <HeaderBar navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f9c349" colors={["#f9c349"]} progressBackgroundColor="#fff" />
        }
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
          <Text style={styles.welcomeText}>Hello, {userName.split(' ')[0]}!</Text>
          <Text style={styles.subText}>{getProfileCompletionMessage()}</Text>
        </Animated.View>

        <Animated.View style={[styles.mainCard, { transform: [{ scale: cardScale }] }]}>
          <LinearGradient colors={['#1a1a1a', '#1a1a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardLabel}>RESUME STRENGTH</Text>
                <Text style={styles.cardValue}>{completionScore}% Complete</Text>
              </View>
              <View style={styles.trophyContainer}>
                <MaterialCommunityIcons name={completionScore === 100 ? "trophy" : "shield-check"} size={32} color="#1a1a1a" />
              </View>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidthInterpolated, backgroundColor: getScoreColor(completionScore) }]} />
              </View>
              <Text style={styles.progressText}>{getScoreMessage(completionScore)}</Text>
            </View>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity style={styles.whiteButton} onPress={() => navigation.navigate("ResumeBuilder", { resumeData })} activeOpacity={0.8}>
                <Text style={styles.whiteButtonText}>{resumeData?.fullName ? 'Enhance with AI' : 'Create Resume'}</Text>
                <Ionicons name="sparkles" color="#f9c349" size={16} />
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.actionRow}>
          {actionButtons.map((action, index) => (
            <Animated.View key={index} style={{
              opacity: actionStagger[index],
              transform: [{ 
                translateY: actionStagger[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] })
              }, { 
                scale: actionStagger[index].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] })
              }],
            }}>
              <ActionItem {...action} />
            </Animated.View>
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>AI Market Insights</Text>
          </View>
          <TouchableOpacity onPress={showInsightsWithAnimation} activeOpacity={0.7}>
            <Text style={styles.seeAll}>See details →</Text>
          </TouchableOpacity>
        </View>

        {loadingInsights ? (
          <View style={styles.insightsLoadingContainer}>
            <ActivityIndicator size="small" color="#f9c349" />
            <Text style={styles.insightsLoadingText}>Analyzing market data...</Text>
          </View>
        ) : (
          <View style={styles.insightGrid}>
            {marketInsights.slice(0, 2).map((insight, index) => (
              <InsightCard key={index} title={insight.title} match={insight.match} trend={insight.trend} icon={index === 0 ? "trending-up" : "cpu"} color={index === 0 ? "#f9c349" : "#1a1a1a"} />
            ))}
          </View>
        )}

        <View style={styles.sectionTitleRow}>
          <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Top Recommendations</Text>
        </View>
        {allRecommendations.slice(0, 2).map((rec, index) => (
          <TouchableOpacity key={index} style={styles.jobCard} onPress={() => {
            if (rec.message.toLowerCase().includes('resume') || rec.message.toLowerCase().includes('profile')) {
              navigation.navigate("ResumeBuilder", { resumeData });
            }
          }} activeOpacity={0.7}>
            <View style={[styles.jobIconBg, { backgroundColor: rec.priority === 'high' ? '#1a1a1a' : '#f9c349' }]}>
              <MaterialCommunityIcons name={rec.priority === 'high' ? 'alert-circle' : 'lightbulb'} size={24} color={rec.priority === 'high' ? '#f9c349' : '#1a1a1a'} />
            </View>
            <View style={styles.jobInfo}>
              <Text style={styles.jobName}>{rec.message}</Text>
              <Text style={styles.jobMeta}>{rec.action}</Text>
            </View>
            <View style={styles.chevronCircle}>
              <Feather name="chevron-right" size={18} color="#1a1a1a" />
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <MaterialCommunityIcons name="progress-check" size={22} color="#f9c349" />
            <Text style={styles.completionTitle}>Profile Completion Progress</Text>
          </View>
          <View style={styles.completionProgressTrack}>
            <Animated.View style={[styles.completionProgressFill, { width: progressWidthInterpolated, backgroundColor: getScoreColor(completionScore) }]} />
          </View>
          <View style={styles.completionFooter}>
            <Text style={styles.completionText}>{completionScore}% Complete</Text>
            {completionScore === 100 && (
              <View style={styles.perfectBadge}>
                <MaterialCommunityIcons name="star-circle" size={16} color="#f9c349" />
                <Text style={styles.perfectText}>Perfect!</Text>
              </View>
            )}
          </View>
        </View>

        {resumeData?.fullName && (
          <View style={styles.brandLinkBox}>
            <View style={styles.brandLeft}>
              <View style={styles.linkIconCircle}>
                <Feather name="link-2" size={16} color="#f9c349" />
              </View>
              <Text style={styles.brandUrl} numberOfLines={1}>
                tdc.app/me/{resumeData.fullName?.toLowerCase().replace(/\s/g, '') || 'user'}
              </Text>
            </View>
            <TouchableOpacity style={styles.copyBadge} onPress={handleCopyLink} activeOpacity={0.7}>
              <Text style={styles.copyText}>Get Link</Text>
              <Ionicons name="copy-outline" size={12} color="#f9c349" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* AI Market Insights Modal */}
      <Modal visible={showInsightsModal} animationType="fade" transparent onRequestClose={() => setShowInsightsModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowInsightsModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.modalContainer, { transform: [{ scale: modalScale }] }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>AI Market Insights</Text>
                  <TouchableOpacity onPress={() => setShowInsightsModal(false)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={22} color="#1a1a1a" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {loadingInsights ? (
                    <View style={styles.modalLoadingContainer}>
                      <ActivityIndicator size="large" color="#f9c349" />
                      <Text style={styles.modalLoadingText}>Generating insights...</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.modalSectionTitle}>🎯 Top Matching Roles</Text>
                      {marketInsights.map((insight, index) => (
                        <View key={index} style={styles.detailInsightCard}>
                          <View style={styles.detailInsightHeader}>
                            <Text style={styles.detailInsightTitle}>{insight.title}</Text>
                            <View style={styles.matchBadge}>
                              <Text style={styles.matchText}>{insight.match} Match</Text>
                            </View>
                          </View>
                          <Text style={styles.trendText}>📈 Market Trend: {insight.trend}</Text>
                          <Text style={styles.descriptionText}>{insight.description}</Text>
                          <Text style={styles.salaryText}>💰 Salary Range: {insight.salary}</Text>
                          <View style={styles.skillsContainer}>
                            {insight.skills && insight.skills.map((skill, idx) => (
                              <View key={idx} style={styles.skillTag}>
                                <Text style={styles.skillTagText}>{skill}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}

                      {fullInsights?.skillGaps && fullInsights.skillGaps.length > 0 && (
                        <>
                          <Text style={styles.modalSectionTitle}>📚 Skills to Develop</Text>
                          {fullInsights.skillGaps.slice(0, 3).map((gap, index) => (
                            <View key={index} style={styles.skillGapCard}>
                              <View style={styles.skillGapIcon}>
                                <MaterialCommunityIcons name="lightning-bolt" size={22} color="#f9c349" />
                              </View>
                              <View style={styles.skillGapContent}>
                                <Text style={styles.skillGapTitle}>{gap.skill}</Text>
                                <Text style={styles.skillGapSuggestion}>{gap.suggestion}</Text>
                                <Text style={styles.skillGapTime}>⏱️ {gap.estimatedTimeToLearn}</Text>
                              </View>
                            </View>
                          ))}
                        </>
                      )}

                      {fullInsights?.salaryInsights && fullInsights.salaryInsights.length > 0 && (
                        <>
                          <Text style={styles.modalSectionTitle}>💰 Salary Insights</Text>
                          {fullInsights.salaryInsights.map((salary, index) => (
                            <View key={index} style={styles.salaryCard}>
                              <Text style={styles.salaryTitle}>{salary.title}</Text>
                              <Text style={styles.salaryRange}>${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}</Text>
                              <Text style={styles.salaryDesc}>{salary.description}</Text>
                            </View>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
   
  );
};

// Header Bar Component
const HeaderBar = ({ navigation }) => (
  <View style={styles.headerNav}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
      <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
    </TouchableOpacity>
    <View style={styles.headerCenter}>
      <Text style={styles.headerNavTitle}>Resume Dashboard</Text>
    </View>
    <View style={{ width: 38 }} />
  </View>
);

// Action Item Component
const ActionItem = ({ icon, label, color, onPress, disabled, loading }) => (
  <TouchableOpacity style={[styles.actionItem, disabled && styles.actionDisabled]} onPress={onPress} disabled={disabled || loading} activeOpacity={0.7}>
    <View style={[styles.actionIconCircle, { backgroundColor: disabled ? '#f5f5f5' : '#1a1a1a' }]}>
      {loading ? <ActivityIndicator size="small" color="#f9c349" /> : <Ionicons name={icon} size={20} color={disabled ? '#ccc' : '#f9c349'} />}
    </View>
    <Text style={[styles.actionLabel, disabled && styles.actionDisabledText]}>{label}</Text>
  </TouchableOpacity>
);

// Insight Card Component
const InsightCard = ({ title, match, trend, icon, color }) => (
  <View style={styles.insightCard}>
    <View style={styles.insightHeader}>
      <View style={[styles.insightIconCircle, { backgroundColor: color + '15' }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <View style={[styles.trendBadge, { backgroundColor: color + '15' }]}>
        <Ionicons name="arrow-up" size={10} color="#16a34a" />
        <Text style={styles.trendText}>{trend}</Text>
      </View>
    </View>
    <Text style={styles.insightTitle} numberOfLines={1}>{title}</Text>
    <Text style={[styles.insightMatch, { color: color }]}>{match} Match</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  
  // Header Nav
  headerNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 8 : 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerNavTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#999', fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  header: { marginVertical: 20 },
  welcomeText: { fontSize: 28, fontWeight: "900", color: "#1a1a1a", letterSpacing: -0.5 },
  subText: { color: "#666", fontSize: 14, marginTop: 6, lineHeight: 20, fontWeight: '500' },
  
  mainCard: { borderRadius: 24, overflow: "hidden", elevation: 15, shadowColor: "#f9c349", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20 },
  gradientCard: { padding: 25, position: 'relative', overflow: 'hidden' },
  decorCircle1: { position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, borderWidth: 25, borderColor: 'rgba(255,255,255,0.05)' },
  decorCircle2: { position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: 50, borderWidth: 15, borderColor: 'rgba(255,255,255,0.05)' },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  cardValue: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 4 },
  trophyContainer: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  progressContainer: { marginTop: 25 },
  progressTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  progressText: { color: "#fff", fontSize: 12, fontWeight: "600", marginTop: 8, alignSelf: "flex-end", opacity: 0.9 },
  whiteButton: { backgroundColor: "#fff", marginTop: 20, paddingVertical: 14, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  whiteButtonText: { color: "#1a1a1a", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 28, marginBottom: 8, paddingHorizontal: 4 },
  actionItem: { alignItems: "center", width: 68 },
  actionDisabled: { opacity: 0.5 },
  actionIconCircle: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 8, elevation: 4 },
  actionLabel: { fontSize: 12, fontWeight: "700", color: "#1a1a1a", letterSpacing: 0.5, textAlign: 'center' },
  actionDisabledText: { color: '#ccc' },
  
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 32, marginBottom: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 10 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
  seeAll: { fontSize: 13, color: "#f9c349", fontWeight: "700" },
  
  insightsLoadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10, backgroundColor: '#f8f8f8', borderRadius: 16 },
  insightsLoadingText: { fontSize: 14, color: '#999', fontWeight: '500' },
  insightGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, gap: 12 },
  insightCard: { backgroundColor: "#fff", padding: 16, borderRadius: 20, borderWidth: 2, borderColor: "#f0f0f0", flex: 1 },
  insightHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  insightIconCircle: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 2 },
  trendText: { color: "#16a34a", fontSize: 10, fontWeight: "700" },
  insightTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  insightMatch: { fontSize: 12, fontWeight: "600" },
  
  jobCard: { backgroundColor: "#fff", padding: 16, borderRadius: 20, flexDirection: "row", alignItems: "center", borderWidth: 2, borderColor: "#f0f0f0", marginBottom: 10 },
  jobIconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  jobInfo: { flex: 1, marginLeft: 14 },
  jobName: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  jobMeta: { fontSize: 11, color: "#999", marginTop: 3, fontWeight: '500' },
  chevronCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  
  completionCard: { backgroundColor: "#fff", padding: 20, borderRadius: 20, borderWidth: 2, borderColor: "#f0f0f0", marginTop: 20 },
  completionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  completionTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  completionProgressTrack: { height: 10, backgroundColor: "#f0f0f0", borderRadius: 5, overflow: "hidden" },
  completionProgressFill: { height: 10, borderRadius: 5 },
  completionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  completionText: { fontSize: 13, color: "#999", fontWeight: '600' },
  perfectBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#fffbf0", borderRadius: 10, borderWidth: 1, borderColor: '#f9c34930' },
  perfectText: { fontSize: 11, color: "#1a1a1a", fontWeight: "700" },
  
  brandLinkBox: { marginTop: 25, padding: 14, backgroundColor: "#f8f8f8", borderRadius: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 2, borderColor: "#f0f0f0", borderStyle: "dashed" },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  linkIconCircle: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fffbf0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f9c34930' },
  brandUrl: { fontSize: 12, color: "#1a1a1a", fontWeight: "500", flex: 1 },
  copyBadge: { backgroundColor: "#1a1a1a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyText: { color: "#f9c349", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  modalLoadingContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  modalLoadingText: { marginTop: 12, fontSize: 14, color: '#999', fontWeight: '500' },
  modalSectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginTop: 20, marginBottom: 12 },
  
  detailInsightCard: { backgroundColor: '#f8f8f8', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#f0f0f0' },
  detailInsightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailInsightTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  matchBadge: { backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginLeft: 10 },
  matchText: { color: '#f9c349', fontSize: 10, fontWeight: '700' },
  descriptionText: { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '500', lineHeight: 18 },
  salaryText: { fontSize: 13, color: '#f9c349', fontWeight: '600', marginTop: 6 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  skillTag: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  skillTagText: { fontSize: 10, color: '#1a1a1a', fontWeight: '600' },
  
  skillGapCard: { flexDirection: 'row', backgroundColor: '#fffbf0', padding: 16, borderRadius: 14, marginBottom: 12, gap: 14, borderWidth: 1, borderColor: '#f9c34920' },
  skillGapIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f9c34930' },
  skillGapContent: { flex: 1 },
  skillGapTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  skillGapSuggestion: { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '500' },
  skillGapTime: { fontSize: 11, color: '#f9c349', marginTop: 6, fontWeight: '600' },
  
  salaryCard: { backgroundColor: '#f8f8f8', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 2, borderColor: '#f0f0f0' },
  salaryTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  salaryRange: { fontSize: 20, fontWeight: '800', color: '#f9c349', marginTop: 6 },
  salaryDesc: { fontSize: 11, color: '#666', marginTop: 4, fontWeight: '500' },
});

export default ResumeDashboard;