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
import * as FileSystem from 'expo-file-system/legacy';
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

  const generateHTML = (isPrinting = false) => {
    if (!resume) return '';
    return renderResumeHTML(resume, resume.template || 'modern_ats', resume.customStyles || {}, isPrinting);
  };

  const handleShare = async () => {
    try {
      setIsExporting(true);
      const html = generateHTML(true);
      const { uri } = await Print.printToFileAsync({ html });

      // Clean name parameters for safe filename
      const firstName = (resume?.personalInfo?.firstName || 'User').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const lastName = (resume?.personalInfo?.lastName || 'Resume').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const targetName = `${firstName}_${lastName}_Resume.pdf`;
      const localUri = `${FileSystem.cacheDirectory}${targetName}`;
      await FileSystem.copyAsync({
        from: uri,
        to: localUri
      });
      
      if (resume && resume._id) {
        await updateResume(resume._id, { shareCount: (resume.shareCount || 0) + 1 });
      }
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${firstName} ${lastName} Resume`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Share PDF error:', error);
      Alert.alert('Error', 'Failed to share PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const html = generateHTML(true);
      const { uri } = await Print.printToFileAsync({ html });

      // Clean name parameters for safe filename
      const firstName = (resume?.personalInfo?.firstName || 'User').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const lastName = (resume?.personalInfo?.lastName || 'Resume').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const targetName = `${firstName}_${lastName}_Resume.pdf`;
      const localUri = `${FileSystem.cacheDirectory}${targetName}`;
      await FileSystem.copyAsync({
        from: uri,
        to: localUri
      });
      
      if (resume && resume._id) {
        await updateResume(resume._id, { downloadCount: (resume.downloadCount || 0) + 1 });
      }
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${firstName} ${lastName} Resume`,
          UTI: 'com.adobe.pdf',
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
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resume Document</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.headerAction} disabled={isExporting}>
              <Ionicons name="share-social-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleExportPDF} 
              style={[styles.headerAction, styles.exportButton]} 
              disabled={isExporting}
            >
               {isExporting ? (
                 <ActivityIndicator size="small" color="#000" />
               ) : (
                 <>
                   <Ionicons name="download-outline" size={18} color="#000" />
                   <Text style={styles.exportButtonText}>PDF</Text>
                 </>
               )}
            </TouchableOpacity>
          </View>
        </View>
        {/* WebView Preview container */}
        <View style={{ flex: 1, backgroundColor: '#525659' }}>
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={{ flex: 1 }}
            scalesPageToFit={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="large" color="#f9c349" />
                <Text style={styles.inlineLoadingText}>Loading document preview...</Text>
              </View>
            )}
            onShouldStartLoadWithRequest={(request) => {
              if (request.url.startsWith('http') || request.url.startsWith('mailto:') || request.url.startsWith('tel:')) {
                return false;
              }
              return true;
            }}
          />
        </View>

        {/* Bottom Actions Toolbar */}
        <View style={styles.bottomToolbar}>
          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={() => navigation.navigate('ResumeTemplate', { resumeId: resume._id })}
          >
            <Ionicons name="color-palette-outline" size={22} color="#ffffff" />
            <Text style={styles.toolbarButtonText}>Templates</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={() => navigation.navigate('ResumeBuilder', { resumeId: resume._id })}
          >
            <Ionicons name="create-outline" size={22} color="#ffffff" />
            <Text style={styles.toolbarButtonText}>Customize</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={handleExportPDF}
            disabled={isExporting}
          >
            <Ionicons name="download-outline" size={22} color="#f9c349" />
            <Text style={[styles.toolbarButtonText, { color: '#f9c349' }]}>Download PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={handleShare}
            disabled={isExporting}
          >
            <Ionicons name="share-social-outline" size={22} color="#ffffff" />
            <Text style={styles.toolbarButtonText}>Share PDF</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomToolbar: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#222222',
    paddingVertical: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  toolbarButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  toolbarButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  inlineLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#525659',
  },
  inlineLoadingText: {
    color: '#ffffff',
    marginTop: 10,
    fontSize: 14,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    paddingBottom: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
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
    backgroundColor: '#f9c349',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 14,
  },
  exportButtonText: {
    color: '#000000',
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
    backgroundColor: '#000000',
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
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
    color: '#ffffff',
  },
  webViewExport: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9c349',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  webViewExportText: {
    color: '#000000',
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