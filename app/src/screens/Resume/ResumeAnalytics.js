// app/src/screens/Resume/ResumeAnalyticsScreen.js
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Alert,
  Share,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ResumeContext } from '../../context/ResumeContext';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const ResumeAnalyticsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId } = route.params || {};
  const { user, isGuest } = useContext(AuthContext);
  const { resumes, currentResume, loading, getAnalytics, updateResume } = useContext(ResumeContext);

  const [resume, setResume] = useState(null);
  const [analytics, setAnalytics] = useState({
    views: 0,
    downloads: 0,
    shares: 0,
    applications: 0,
    viewHistory: [],
    skillMatch: 0,
    completeness: 0,
    strength: 0,
    improvements: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (resumeId) {
      const found = resumes.find(r => r._id === resumeId);
      if (found) {
        setResume(found);
        loadAnalytics(found._id);
      }
    } else if (resumes.length > 0) {
      setResume(resumes[0]);
      loadAnalytics(resumes[0]._id);
    }
  }, [resumeId, resumes]);

  const loadAnalytics = async (id) => {
    try {
      setIsLoading(true);
      const data = await getAnalytics(id);
      if (data) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Load analytics error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPeriodData = () => {
    const periods = {
      week: analytics.viewHistory?.slice(-7) || [],
      month: analytics.viewHistory?.slice(-30) || [],
      year: analytics.viewHistory?.slice(-365) || [],
    };
    return periods[selectedPeriod] || periods.month;
  };

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#000',
    backgroundGradientTo: '#1a1a1a',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(249, 195, 73, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#f9c349',
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  const renderLineChart = () => {
    const data = getPeriodData();
    if (data.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="bar-chart-outline" size={40} color="#999" />
          <Text style={styles.noDataText}>No view data available</Text>
          <Text style={styles.noDataSubtext}>Views will appear here once your resume gets traffic</Text>
        </View>
      );
    }

    const chartData = {
      labels: data.map((_, i) => {
        if (i % Math.max(1, Math.floor(data.length / 5)) === 0 || i === data.length - 1) {
          const d = new Date(_.date);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        }
        return '';
      }),
      datasets: [{
        data: data.map(d => d.views || 0),
        color: (opacity = 1) => `rgba(249, 195, 73, ${opacity})`,
        strokeWidth: 2,
      }],
    };

    return (
      <LineChart
        data={chartData}
        width={width - 48}
        height={200}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLabels={true}
        withHorizontalLabels={true}
      />
    );
  };

  const renderPieChart = () => {
    const pieData = [
      {
        name: 'Views',
        population: analytics.views || 1,
        color: '#f9c349',
        legendFontColor: '#333',
        legendFontSize: 12,
      },
      {
        name: 'Downloads',
        population: analytics.downloads || 1,
        color: '#2ECC71',
        legendFontColor: '#333',
        legendFontSize: 12,
      },
      {
        name: 'Shares',
        population: analytics.shares || 1,
        color: '#4A90D9',
        legendFontColor: '#333',
        legendFontSize: 12,
      },
      {
        name: 'Applications',
        population: analytics.applications || 1,
        color: '#9B59B6',
        legendFontColor: '#333',
        legendFontSize: 12,
      },
    ];

    const hasData = pieData.some(item => item.population > 1);
    if (!hasData) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="pie-chart-outline" size={40} color="#999" />
          <Text style={styles.noDataText}>No engagement data yet</Text>
          <Text style={styles.noDataSubtext}>Start sharing your resume to see engagement</Text>
        </View>
      );
    }

    return (
      <PieChart
        data={pieData}
        width={width - 48}
        height={200}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
        hasLegend={true}
      />
    );
  };

  const StatCard = ({ icon, title, value, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const ImprovementCard = ({ improvement }) => (
    <View style={[
      styles.improvementCard,
      { 
        borderLeftColor: improvement.priority === 'high' ? '#E74C3C' : 
                         improvement.priority === 'medium' ? '#f9c349' : '#4A90D9' 
      }
    ]}>
      <View style={styles.improvementHeader}>
        <Text style={styles.improvementTitle}>{improvement.title}</Text>
        <View style={[
          styles.priorityBadge,
          { 
            backgroundColor: improvement.priority === 'high' ? '#E74C3C' : 
                             improvement.priority === 'medium' ? '#f9c349' : '#4A90D9' 
          }
        ]}>
          <Text style={styles.priorityText}>{improvement.priority}</Text>
        </View>
      </View>
      <Text style={styles.improvementDescription}>{improvement.description}</Text>
    </View>
  );

  const handleExportReport = async () => {
    try {
      const reportData = `
📊 Resume Analytics Report
===========================

Resume: ${resume?.personalInfo?.firstName || ''} ${resume?.personalInfo?.lastName || ''}
Completeness: ${analytics.completeness || 0}%
Strength Score: ${analytics.strength || 0}%

📈 Engagement Stats:
- Views: ${analytics.views || 0}
- Downloads: ${analytics.downloads || 0}
- Shares: ${analytics.shares || 0}
- Applications: ${analytics.applications || 0}

🎯 Skills Match: ${analytics.skillMatch || 0}%

📝 Improvements Needed:
${analytics.improvements?.map(i => `- ${i.title}: ${i.description}`).join('\n') || 'None - Your resume looks great!'}
      `;

      const result = await Share.share({
        message: reportData,
        title: `Analytics Report - ${resume?.personalInfo?.firstName || ''}`,
      });

      if (result.action === Share.sharedAction) {
        Alert.alert('Success', 'Report shared successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
    }
  };

  if (isLoading || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Analytics</Text>
            <TouchableOpacity onPress={handleExportReport} style={styles.shareButton}>
              <Ionicons name="share-outline" size={22} color="#f9c349" />
            </TouchableOpacity>
          </View>

          {/* Resume Info */}
          <View style={styles.resumeInfoCard}>
            <LinearGradient
              colors={['#000', '#1a1a1a', '#f9c349']}
              style={styles.resumeInfoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.resumeInfoName}>
                {resume?.personalInfo?.firstName || 'Your'} Resume
              </Text>
              <Text style={styles.resumeInfoTitle}>
                Performance Overview
              </Text>
              <View style={styles.resumeInfoBadges}>
                <View style={styles.resumeInfoBadge}>
                  <Ionicons name="calendar-outline" size={12} color="#f9c349" />
                  <Text style={styles.resumeInfoBadgeText}>
                    Last 30 days
                  </Text>
                </View>
                <View style={[styles.resumeInfoBadge, styles.resumeInfoBadgeGold]}>
                  <Ionicons name="stats-chart-outline" size={12} color="#000" />
                  <Text style={[styles.resumeInfoBadgeText, styles.resumeInfoBadgeTextGold]}>
                    Live
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{analytics.completeness || 0}%</Text>
              <Text style={styles.quickStatLabel}>Completeness</Text>
              <View style={styles.quickStatBar}>
                <View 
                  style={[
                    styles.quickStatBarFill, 
                    { width: `${Math.min(analytics.completeness || 0, 100)}%` }
                  ]} 
                />
              </View>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={[styles.quickStatValue, { color: '#2ECC71' }]}>
                {analytics.strength || 0}%
              </Text>
              <Text style={styles.quickStatLabel}>Strength</Text>
              <View style={styles.quickStatBar}>
                <View 
                  style={[
                    styles.quickStatBarFill, 
                    { width: `${Math.min(analytics.strength || 0, 100)}%`, backgroundColor: '#2ECC71' }
                  ]} 
                />
              </View>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={[styles.quickStatValue, { color: '#4A90D9' }]}>
                {analytics.skillMatch || 0}%
              </Text>
              <Text style={styles.quickStatLabel}>Skill Match</Text>
              <View style={styles.quickStatBar}>
                <View 
                  style={[
                    styles.quickStatBarFill, 
                    { width: `${Math.min(analytics.skillMatch || 0, 100)}%`, backgroundColor: '#4A90D9' }
                  ]} 
                />
              </View>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="eye-outline"
              title="Views"
              value={analytics.views || 0}
              color="#f9c349"
              subtitle="Total views"
            />
            <StatCard
              icon="download-outline"
              title="Downloads"
              value={analytics.downloads || 0}
              color="#2ECC71"
              subtitle="PDF downloads"
            />
            <StatCard
              icon="share-outline"
              title="Shares"
              value={analytics.shares || 0}
              color="#4A90D9"
              subtitle="Times shared"
            />
            <StatCard
              icon="briefcase-outline"
              title="Applications"
              value={analytics.applications || 0}
              color="#9B59B6"
              subtitle="Jobs applied"
            />
          </View>

          {/* Views Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <Ionicons name="trending-up-outline" size={18} color="#f9c349" />
                <Text style={styles.chartTitle}>Views Over Time</Text>
              </View>
              <View style={styles.periodSelector}>
                {['week', 'month', 'year'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.periodButtonActive,
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      selectedPeriod === period && styles.periodButtonTextActive,
                    ]}>
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.chartWrapper}>
              {renderLineChart()}
            </View>
          </View>

          {/* Distribution Chart */}
          <View style={styles.pieChartContainer}>
            <View style={styles.pieChartHeader}>
              <Ionicons name="pie-chart-outline" size={18} color="#f9c349" />
              <Text style={styles.chartTitle}>Engagement Distribution</Text>
            </View>
            <View style={styles.pieChartWrapper}>
              {renderPieChart()}
            </View>
          </View>

          {/* Improvements */}
          <View style={styles.improvementsContainer}>
            <View style={styles.improvementsHeader}>
              <View style={styles.improvementsTitleContainer}>
                <Ionicons name="bulb-outline" size={18} color="#f9c349" />
                <Text style={styles.improvementsTitle}>Suggested Improvements</Text>
              </View>
              <View style={styles.improvementsCountBadge}>
                <Text style={styles.improvementsCount}>
                  {analytics.improvements?.length || 0}
                </Text>
              </View>
            </View>
            {analytics.improvements && analytics.improvements.length > 0 ? (
              analytics.improvements.map((improvement, index) => (
                <ImprovementCard key={index} improvement={improvement} />
              ))
            ) : (
              <View style={styles.noImprovements}>
                <LinearGradient
                  colors={['#f9c349', '#2ECC71']}
                  style={styles.noImprovementsIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark-circle" size={40} color="#fff" />
                </LinearGradient>
                <Text style={styles.noImprovementsText}>
                  Your resume looks great!
                </Text>
                <Text style={styles.noImprovementsSubtext}>
                  No improvements needed at this time
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    marginTop:40
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 20 : 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  shareButton: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeInfoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  resumeInfoGradient: {
    padding: 20,
  },
  resumeInfoName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  resumeInfoTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  resumeInfoBadges: {
    flexDirection: 'row',
    marginTop: 10,
  },
  resumeInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  resumeInfoBadgeGold: {
    backgroundColor: '#f9c349',
  },
  resumeInfoBadgeText: {
    fontSize: 11,
    color: '#fff',
    marginLeft: 4,
  },
  resumeInfoBadgeTextGold: {
    color: '#000',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9c349',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  quickStatBar: {
    width: '80%',
    height: 3,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  quickStatBarFill: {
    height: '100%',
    backgroundColor: '#f9c349',
    borderRadius: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    margin: '1%',
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  statSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: '#000',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
  },
  periodButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  periodButtonActive: {
    backgroundColor: '#f9c349',
  },
  periodButtonText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  periodButtonTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },
  pieChartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pieChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pieChartWrapper: {
    alignItems: 'center',
  },
  improvementsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  improvementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  improvementsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  improvementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  improvementsCountBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  improvementsCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  improvementCard: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  improvementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  improvementTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  improvementDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  noImprovements: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noImprovementsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImprovementsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  noImprovementsSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  noDataContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  noDataSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ResumeAnalyticsScreen;