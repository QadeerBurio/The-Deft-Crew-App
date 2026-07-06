// app/src/screens/Resume/ResumeViewScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useContext } from 'react';
import { ResumeContext } from '../../context/ResumeContext';
import { AuthContext } from '../../context/AuthContext';
import { renderResumeHTML } from '../../services/templateService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const ResumeViewScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { resumeId } = route.params || {};
  const { user } = useContext(AuthContext);
  const { resumes, currentResume, loadResume, loading, updateResume } = useContext(ResumeContext);
  const [resume, setResume] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  
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
      const found = loadResume(resumeId) || resumes.find(r => r._id === resumeId);
      if (found) {
        setResume(found);
      }
    } else if (resumes.length > 0) {
      setResume(resumes[0]);
    }
  }, [resumeId, resumes]);

  const generateHTML = () => {
    if (!resume) return '';
    return renderResumeHTML(resume, resume.template || 'modern');
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `
📄 Resume: ${resume?.personalInfo?.firstName || ''} ${resume?.personalInfo?.lastName || ''}

${resume?.professionalSummary?.summary || ''}

🎓 Education:
${resume?.education?.map(e => `- ${e.degree} at ${e.institution}`).join('\n') || 'No education listed'}

💼 Experience:
${resume?.workExperience?.map(w => `- ${w.position} at ${w.company}`).join('\n') || 'No experience listed'}

🔧 Skills:
${resume?.skills?.map(s => `- ${s.name}`).join('\n') || 'No skills listed'}

🎯 Target Jobs:
${resume?.targetJobs?.map(j => `- ${j.jobTitle} (${j.industry})`).join('\n') || 'Not specified'}
        `,
        title: `${resume?.personalInfo?.firstName || ''}'s Resume`
      });
      
      if (result.action === Share.sharedAction) {
        if (resume && resume._id) {
          await updateResume(resume._id, { shareCount: (resume.shareCount || 0) + 1 });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share resume');
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });
      
      if (resume && resume._id) {
        await updateResume(resume._id, { downloadCount: (resume.downloadCount || 0) + 1 });
      }
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Resume_${resume?.personalInfo?.firstName || ''}.pdf`,
        });
      } else {
        Alert.alert('Success', 'PDF exported successfully!');
      }
    } catch (error) {
      console.error('Export PDF error:', error);
      Alert.alert('Error', 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreview = () => {
    setShowWebView(true);
  };

  // Get status color
  const getStatusColor = (percentage) => {
    if (percentage >= 80) return '#2ECC71';
    if (percentage >= 50) return '#f9c349';
    if (percentage >= 30) return '#E67E22';
    return '#E74C3C';
  };

  // Get skill level color
  const getSkillLevelStyle = (level) => {
    switch (level?.toLowerCase()) {
      case 'expert':
        return { backgroundColor: '#000', borderColor: '#f9c349' };
      case 'advanced':
        return { backgroundColor: '#1a1a1a', borderColor: '#f9c349' };
      case 'intermediate':
        return { backgroundColor: '#2a2a2a', borderColor: '#f9c349' };
      default:
        return { backgroundColor: '#f5f5f5', borderColor: '#e8e8e8' };
    }
  };

  if (loading || !resume) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading resume...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const htmlContent = generateHTML();

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resume Preview</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handlePreview} style={styles.headerAction}>
              <Ionicons name="eye-outline" size={22} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.headerAction}>
              <Ionicons name="share-outline" size={22} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleExportPDF} 
              style={[styles.headerAction, styles.exportButton]} 
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.exportButtonText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header Card */}
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['#000', '#1a1a1a', '#f9c349']}
              style={styles.profileGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {resume.personalInfo?.firstName?.[0] || 'R'}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.name}>
                    {resume.personalInfo?.firstName || ''} {resume.personalInfo?.lastName || ''}
                  </Text>
                  {resume.professionalSummary?.title && (
                    <Text style={styles.title}>{resume.professionalSummary.title}</Text>
                  )}
                </View>
              </View>

              {/* Contact Info */}
              <View style={styles.contactGrid}>
                {resume.personalInfo?.email && (
                  <View style={styles.contactItem}>
                    <Ionicons name="mail-outline" size={16} color="#f9c349" />
                    <Text style={styles.contactText}>{resume.personalInfo.email}</Text>
                  </View>
                )}
                {resume.personalInfo?.phone && (
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={16} color="#f9c349" />
                    <Text style={styles.contactText}>{resume.personalInfo.phone}</Text>
                  </View>
                )}
                {resume.personalInfo?.address && (
                  <View style={styles.contactItem}>
                    <Ionicons name="location-outline" size={16} color="#f9c349" />
                    <Text style={styles.contactText}>{resume.personalInfo.address}</Text>
                  </View>
                )}
              </View>

              {/* Badges */}
              <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                  <Ionicons name="color-palette-outline" size={14} color="#f9c349" />
                  <Text style={styles.badgeText}>
                    {resume.template || 'Modern'}
                  </Text>
                </View>
                <View style={[styles.badge, styles.completionBadge]}>
                  <Ionicons name="stats-chart-outline" size={14} color="#fff" />
                  <Text style={[styles.badgeText, styles.completionBadgeText]}>
                    {resume.completionPercentage || 0}% Complete
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarTrack}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${resume.completionPercentage || 0}%` }
                    ]} 
                  />
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={18} color="#f9c349" />
              <Text style={styles.statValue}>{resume.viewCount || 0}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="download-outline" size={18} color="#f9c349" />
              <Text style={styles.statValue}>{resume.downloadCount || 0}</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="share-outline" size={18} color="#f9c349" />
              <Text style={styles.statValue}>{resume.shareCount || 0}</Text>
              <Text style={styles.statLabel}>Shares</Text>
            </View>
          </View>

          {/* Professional Summary */}
          {resume.professionalSummary?.summary && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="document-text-outline" size={20} color="#f9c349" />
                </View>
                <Text style={styles.sectionTitle}>Professional Summary</Text>
              </View>
              <Text style={styles.sectionContent}>
                {resume.professionalSummary.summary}
              </Text>
            </View>
          )}

          {/* Education */}
          {resume.education && resume.education.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#2ECC71' }]}>
                  <Ionicons name="school-outline" size={20} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>Education</Text>
              </View>
              {resume.education.map((edu, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{edu.degree}</Text>
                    <View style={styles.itemBadge}>
                      <Text style={styles.itemBadgeText}>
                        {edu.fieldOfStudy}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemSubtitle}>{edu.institution}</Text>
                  <Text style={styles.itemDate}>
                    <Ionicons name="calendar-outline" size={12} color="#999" />
                    {' '}
                    {edu.startDate ? new Date(edu.startDate).getFullYear() : ''}
                    {edu.endDate && ` - ${new Date(edu.endDate).getFullYear()}`}
                    {edu.current && ' - Present'}
                  </Text>
                  {edu.gpa && (
                    <View style={styles.gpaContainer}>
                      <Text style={styles.gpaLabel}>GPA:</Text>
                      <Text style={styles.gpaValue}>{edu.gpa}</Text>
                    </View>
                  )}
                  {edu.description && (
                    <Text style={styles.itemDescription}>{edu.description}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Work Experience */}
          {resume.workExperience && resume.workExperience.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#9B59B6' }]}>
                  <Ionicons name="briefcase-outline" size={20} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>Work Experience</Text>
              </View>
              {resume.workExperience.map((work, index) => (
                <View key={index} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{work.position}</Text>
                  <Text style={styles.itemSubtitle}>{work.company}</Text>
                  <Text style={styles.itemDate}>
                    <Ionicons name="calendar-outline" size={12} color="#999" />
                    {' '}
                    {work.startDate ? new Date(work.startDate).getFullYear() : ''}
                    {work.endDate && ` - ${new Date(work.endDate).getFullYear()}`}
                    {work.current && ' - Present'}
                  </Text>
                  {work.description && (
                    <Text style={styles.itemDescription}>{work.description}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Skills */}
          {resume.skills && resume.skills.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#F39C12' }]}>
                  <Ionicons name="bulb-outline" size={20} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>Skills</Text>
              </View>
              <View style={styles.skillsContainer}>
                {resume.skills.map((skill, index) => (
                  <View key={index} style={[styles.skillTag, getSkillLevelStyle(skill.level)]}>
                    <Text style={[
                      styles.skillText,
                      skill.level && skill.level.toLowerCase() !== 'beginner' && styles.skillTextLight
                    ]}>
                      {skill.name}
                    </Text>
                    {skill.level && (
                      <View style={styles.skillLevelDot}>
                        <Text style={styles.skillLevelText}>{skill.level}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Certifications */}
          {resume.certifications && resume.certifications.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#1ABC9C' }]}>
                  <Ionicons name="ribbon-outline" size={20} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>Certifications</Text>
              </View>
              {resume.certifications.map((cert, index) => (
                <View key={index} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{cert.name}</Text>
                  <Text style={styles.itemSubtitle}>{cert.organization}</Text>
                  <Text style={styles.itemDate}>
                    <Ionicons name="calendar-outline" size={12} color="#999" />
                    {' '}
                    Issued: {cert.issueDate ? new Date(cert.issueDate).getFullYear() : ''}
                    {cert.expiryDate && ` • Expires: ${new Date(cert.expiryDate).getFullYear()}`}
                  </Text>
                  {cert.credentialId && (
                    <Text style={styles.credentialText}>ID: {cert.credentialId}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Projects */}
          {resume.projects && resume.projects.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#3498DB' }]}>
                  <Ionicons name="code-outline" size={20} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>Projects</Text>
              </View>
              {resume.projects.map((project, index) => (
                <View key={index} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{project.name}</Text>
                  {project.technologies && (
                    <View style={styles.techContainer}>
                      {project.technologies.map((tech, idx) => (
                        <View key={idx} style={styles.techTag}>
                          <Text style={styles.techText}>{tech}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={styles.itemDate}>
                    <Ionicons name="calendar-outline" size={12} color="#999" />
                    {' '}
                    {project.startDate ? new Date(project.startDate).getFullYear() : ''}
                    {project.endDate && ` - ${new Date(project.endDate).getFullYear()}`}
                  </Text>
                  {project.description && (
                    <Text style={styles.itemDescription}>{project.description}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Languages */}
          {resume.languages && resume.languages.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#E67E22' }]}>
                  <Ionicons name="language-outline" size={20} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>Languages</Text>
              </View>
              {resume.languages.map((lang, index) => (
                <View key={index} style={styles.languageItem}>
                  <Text style={styles.languageName}>{lang.name}</Text>
                  <View style={[
                    styles.languageProficiencyBadge,
                    { backgroundColor: getProficiencyColor(lang.proficiency) }
                  ]}>
                    <Text style={styles.languageProficiencyText}>{lang.proficiency}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Target Jobs */}
          {(resume.targetJobs && resume.targetJobs.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#4A90D9' }]}>
                  <Ionicons name="briefcase-outline" size={20} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>Target Jobs</Text>
              </View>
              {resume.targetJobs.map((job, index) => (
                <View key={index} style={styles.targetJobCard}>
                  <View style={styles.targetJobHeader}>
                    <Text style={styles.targetJobTitle}>{job.jobTitle}</Text>
                    <View style={styles.targetJobTypeBadge}>
                      <Text style={styles.targetJobTypeText}>{job.jobType}</Text>
                    </View>
                  </View>
                  <Text style={styles.targetJobIndustry}>{job.industry}</Text>
                  {job.location && (
                    <Text style={styles.targetJobLocation}>
                      <Ionicons name="location-outline" size={14} color="#666" /> {job.location}
                    </Text>
                  )}
                  {job.desiredSalary && (
                    <Text style={styles.targetJobSalary}>
                      <Ionicons name="cash-outline" size={14} color="#666" /> {job.desiredSalary}
                    </Text>
                  )}
                  {job.availability && (
                    <Text style={styles.targetJobAvailability}>
                      <Ionicons name="time-outline" size={14} color="#666" /> Available: {job.availability}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* WebView Modal for Template Preview */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={showWebView}
          onRequestClose={() => setShowWebView(false)}
        >
          <SafeAreaView style={styles.webViewContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View style={styles.webViewHeader}>
              <View style={styles.webViewHeaderLeft}>
                <TouchableOpacity onPress={() => setShowWebView(false)} style={styles.webViewClose}>
                  <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.webViewTitle}>Template Preview</Text>
              </View>
              <TouchableOpacity 
                onPress={handleExportPDF} 
                style={styles.webViewExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#f9c349" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#f9c349" />
                    <Text style={styles.webViewExportText}>PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              style={styles.webView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color="#f9c349" />
                  <Text style={styles.loadingText}>Loading preview...</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
};

// Helper function for proficiency colors
const getProficiencyColor = (proficiency) => {
  switch (proficiency?.toLowerCase()) {
    case 'native':
      return '#2ECC71';
    case 'fluent':
      return '#4A90D9';
    case 'intermediate':
      return '#f9c349';
    case 'basic':
      return '#E67E22';
    default:
      return '#999';
  }
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    marginLeft: 14,
    padding: 4,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 14,
  },
  exportButtonText: {
    color: '#f9c349',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  profileGradient: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f9c349',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  contactText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginLeft: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#fff',
    marginLeft: 4,
  },
  completionBadge: {
    backgroundColor: 'rgba(249, 195, 73, 0.3)',
  },
  completionBadgeText: {
    color: '#f9c349',
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f9c349',
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f9c349',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  sectionContent: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  itemBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemBadgeText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 1,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: '#444',
    marginTop: 6,
    lineHeight: 20,
  },
  gpaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  gpaLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 4,
  },
  gpaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2ECC71',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
  },
  skillTextLight: {
    color: '#fff',
  },
  skillLevelDot: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 6,
  },
  skillLevelText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  techContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  techTag: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  techText: {
    fontSize: 11,
    color: '#4A90D9',
  },
  credentialText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  languageName: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  languageProficiencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  languageProficiencyText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  targetJobCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90D9',
  },
  targetJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetJobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  targetJobTypeBadge: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  targetJobTypeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  targetJobIndustry: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  targetJobLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  targetJobSalary: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  targetJobAvailability: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // WebView Styles
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  webViewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webViewClose: {
    padding: 4,
    marginRight: 12,
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  webViewExport: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  webViewExportText: {
    color: '#f9c349',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ResumeViewScreen;