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
import resumeApi from '../../api/resumeApi';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { color as T, font as F } from "../../theme/tokens";
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)

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
    let isMounted = true;
    const fetchFresh = async () => {
      if (resumeId) {
        try {
          const res = await resumeApi.getResume(resumeId, true);
          if (isMounted && res?.success && res?.data) {
            setResume(res.data);
            return;
          }
        } catch (err) {
          console.log('Error fetching fresh resume in ViewResume:', err);
        }
        const found = loadResume(resumeId) || (Array.isArray(resumes) ? resumes.find(r => r._id === resumeId) : null);
        if (isMounted && found) {
          setResume(found);
        }
      } else if (resumes && resumes.length > 0) {
        setResume(resumes[0]);
      }
    };
    fetchFresh();
    return () => { isMounted = false; };
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
    if (percentage >= 80) return T.success;
    if (percentage >= 50) return T.yellow;
    if (percentage >= 30) return '#E67E22';
    return T.danger;
  };

  // Get skill level color
  const getSkillLevelStyle = (level) => {
    switch (level?.toLowerCase()) {
      case 'expert':
        return { backgroundColor: T.ink, borderColor: T.yellow };
      case 'advanced':
        return { backgroundColor: T.ink, borderColor: T.yellow };
      case 'intermediate':
        return { backgroundColor: '#2a2a2a', borderColor: T.yellow };
      default:
        return { backgroundColor: T.sand, borderColor: T.line };
    }
  };

  if (loading || !resume) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={T.yellow} />
          <Text style={styles.loadingText}>loading resume...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const htmlContent = generateHTML();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={T.paper} />
      
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
            <Ionicons name="arrow-back" size={24} color={T.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>resume document</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.headerAction} disabled={isExporting}>
              <Ionicons name="share-social-outline" size={22} color={T.white} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleExportPDF} 
              style={[styles.headerAction, styles.exportButton]} 
              disabled={isExporting}
            >
               {isExporting ? (
                 <ActivityIndicator size="small" color={T.ink} />
               ) : (
                 <>
                   <Ionicons name="download-outline" size={18} color={T.ink} />
                   <Text style={styles.exportButtonText}>pdf</Text>
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
                <ActivityIndicator size="large" color={T.yellow} />
                <Text style={styles.inlineLoadingText}>loading document preview...</Text>
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
            <Ionicons name="color-palette-outline" size={22} color={T.white} />
            <Text style={styles.toolbarButtonText}>templates</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={() => navigation.navigate('ResumeBuilder', { resumeId: resume._id })}
          >
            <Ionicons name="create-outline" size={22} color={T.white} />
            <Text style={styles.toolbarButtonText}>customize</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={handleExportPDF}
            disabled={isExporting}
          >
            <Ionicons name="download-outline" size={22} color={T.yellow} />
            <Text style={[styles.toolbarButtonText, { color: T.yellow }]}>download pdf</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toolbarButton} 
            onPress={handleShare}
            disabled={isExporting}
          >
            <Ionicons name="share-social-outline" size={22} color={T.white} />
            <Text style={styles.toolbarButtonText}>share pdf</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomToolbar: {
    flexDirection: 'row',
    backgroundColor: T.ink,
    borderTopWidth: 1,
    borderTopColor: T.ink,
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
    color: T.white,
    fontSize: 10,
    fontFamily: F.bodySemi,
    marginTop: 4,
  },
  inlineLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#525659',
  },
  inlineLoadingText: {
    color: T.white,
    marginTop: 10,
    fontSize: 14, fontFamily: F.body,
  },
  safeArea: {
    flex: 1,
    backgroundColor: T.ink,
  },
  container: {
    flex: 1,
    backgroundColor: T.ink,
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
    backgroundColor: T.ink,
  },
  loadingText: {
    marginTop: 12,
    color: T.textFaint,
    fontSize: 14, fontFamily: F.body,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    paddingBottom: 12,
    backgroundColor: T.ink,
    borderBottomWidth: 1,
    borderBottomColor: T.ink,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.white,
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
    backgroundColor: T.yellow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 14,
  },
  exportButtonText: {
    color: T.ink,
    fontSize: 12,
    fontFamily: F.bodySemi,
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
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: T.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: T.white,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: F.heading,
    color: T.ink,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 22,
    fontFamily: F.heading,
    color: T.white,
  },
  title: {
    fontSize: 14, fontFamily: F.body,
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
    fontSize: 12, fontFamily: F.body,
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
    fontSize: 11, fontFamily: F.body,
    color: T.white,
    marginLeft: 4,
  },
  completionBadge: {
    backgroundColor: T.yellowSoft,
  },
  completionBadgeText: {
    color: T.yellow,
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
    backgroundColor: T.yellow,
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: T.card,
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.line,
    shadowColor: T.ink,
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
    fontFamily: F.headingBold,
    color: T.ink,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11, fontFamily: F.body,
    color: T.textFaint,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: T.sand,
  },
  section: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.line,
    shadowColor: T.ink,
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
    backgroundColor: T.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: F.bodyBold,
    color: T.ink,
  },
  sectionContent: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    lineHeight: 22,
  },
  itemCard: {
    backgroundColor: T.sand,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: T.line,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: F.bodySemi,
    color: T.ink,
    flex: 1,
  },
  itemBadge: {
    backgroundColor: T.sand,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemBadgeText: {
    fontSize: 10,
    color: T.textMuted,
    fontFamily: F.bodyMedium,
  },
  itemSubtitle: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 1,
  },
  itemDate: {
    fontSize: 12, fontFamily: F.body,
    color: T.textFaint,
    marginTop: 4,
  },
  itemDescription: {
    fontSize: 13, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  gpaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  gpaLabel: {
    fontSize: 12, fontFamily: F.body,
    color: T.textFaint,
    marginRight: 4,
  },
  gpaValue: {
    fontSize: 13,
    fontFamily: F.bodySemi,
    color: T.success,
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
    color: T.ink,
    fontFamily: F.bodyMedium,
  },
  skillTextLight: {
    color: T.white,
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
    color: T.white,
    fontFamily: F.bodySemi,
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
    fontSize: 11, fontFamily: F.body,
    color: '#4A90D9',
  },
  credentialText: {
    fontSize: 12, fontFamily: F.body,
    color: T.textFaint,
    marginTop: 2,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  languageName: {
    fontSize: 14,
    color: T.ink,
    fontFamily: F.bodyMedium,
  },
  languageProficiencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  languageProficiencyText: {
    fontSize: 11,
    color: T.white,
    fontFamily: F.bodyMedium,
  },
  targetJobCard: {
    backgroundColor: T.sand,
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
    fontFamily: F.bodySemi,
    color: T.ink,
  },
  targetJobTypeBadge: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  targetJobTypeText: {
    fontSize: 10,
    color: T.white,
    fontFamily: F.bodyMedium,
  },
  targetJobIndustry: {
    fontSize: 13, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 2,
  },
  targetJobLocation: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 2,
  },
  targetJobSalary: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 2,
  },
  targetJobAvailability: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 2,
  },
  // WebView Styles
  webViewContainer: {
    flex: 1,
    backgroundColor: T.ink,
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.ink,
    borderBottomWidth: 1,
    borderBottomColor: T.ink,
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
    fontFamily: F.headingBold,
    color: T.white,
  },
  webViewExport: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.yellow,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  webViewExportText: {
    color: T.ink,
    fontSize: 12,
    fontFamily: F.bodySemi,
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