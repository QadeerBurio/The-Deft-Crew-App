// app/src/screens/Resume/ResumeShare.js
import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Share,
  Alert,
  TextInput,
  ActivityIndicator,
  Clipboard,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ResumeContext } from '../../context/ResumeContext';
import { AuthContext } from '../../context/AuthContext';
import * as Print from 'expo-print';
import { renderResumeHTML } from '../../services/templateService';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';

const ResumeShareScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId } = route.params || {};
  const { user, isGuest } = useContext(AuthContext);
  const { resumes, currentResume, loading, updateResume } = useContext(ResumeContext);

  const [resume, setResume] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareOptions, setShareOptions] = useState({
    shareLink: true,
    sharePDF: false,
    shareHTML: false,
    shareJSON: false,
    includeContact: true,
    includePhoto: false,
    includeReferences: false,
  });

  useEffect(() => {
    if (resumeId) {
      const found = resumes.find(r => r._id === resumeId);
      if (found) {
        setResume(found);
        generateShareLink(found);
      }
    } else if (resumes.length > 0) {
      setResume(resumes[0]);
      generateShareLink(resumes[0]);
    }
  }, [resumeId, resumes]);

  const generateShareLink = async (resumeData) => {
    setIsGenerating(true);
    try {
      // Generate a shareable link
      const link = `https://yourdomain.com/resume/${resumeData._id}`;
      setShareLink(link);
    } catch (error) {
      console.error('Error generating share link:', error);
      setShareLink('Error generating link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      if (!resume) {
        Alert.alert('Error', 'No resume to share');
        return;
      }

      const message = `
📄 Resume: ${resume?.personalInfo?.firstName || ''} ${resume?.personalInfo?.lastName || ''}

${resume?.professionalSummary?.summary || ''}

🎯 Target: ${resume?.targetJob?.jobTitle || 'Not specified'}

View full resume: ${shareLink}
      `;

      const result = await Share.share({
        message: message,
        title: `${resume?.personalInfo?.firstName || ''}'s Resume`,
        url: shareLink,
      });

      if (result.action === Share.sharedAction) {
        Alert.alert('Success', 'Resume shared successfully!');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share resume');
    }
  };

  const handleSharePDF = async () => {
    try {
      const html = renderResumeHTML(resume, resume?.template || 'modern_ats', resume?.customStyles || {}, true);
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Resume_${resume?.personalInfo?.firstName || ''}.pdf`,
        });
      } else {
        Alert.alert('Error', 'Sharing not available on this device');
      }
    } catch (error) {
      console.error('PDF share error:', error);
      Alert.alert('Error', 'Failed to share PDF');
    }
  };

  const handleCopyLink = () => {
    Clipboard.setString(shareLink);
    Alert.alert('Success', 'Link copied to clipboard');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Resume: ${resume?.personalInfo?.firstName || ''} ${resume?.personalInfo?.lastName || ''}`);
    const body = encodeURIComponent(`
      Hi,

      I wanted to share my resume with you.

      You can view it here: ${shareLink}

      Best regards,
      ${resume?.personalInfo?.firstName || ''} ${resume?.personalInfo?.lastName || ''}
    `);
    
    const email = `mailto:?subject=${subject}&body=${body}`;
    Linking.openURL(email).catch(() => {
      Alert.alert('Error', 'No email app found');
    });
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open LinkedIn');
    });
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`Check out my resume: ${shareLink}`);
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open Twitter');
    });
  };

  const generateResumeHTML = (resumeData) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${resumeData?.personalInfo?.firstName || ''} ${resumeData?.personalInfo?.lastName || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #2c3e50; border-bottom: 2px solid #4A90D9; padding-bottom: 10px; }
            h2 { color: #4A90D9; margin-top: 20px; }
            .section { margin-bottom: 20px; }
            .item { margin-bottom: 10px; }
            .item-title { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${resumeData?.personalInfo?.firstName || ''} ${resumeData?.personalInfo?.lastName || ''}</h1>
          <p>${resumeData?.personalInfo?.email || ''} | ${resumeData?.personalInfo?.phone || ''}</p>
          ${resumeData?.professionalSummary?.summary ? `<h2>Summary</h2><p>${resumeData.professionalSummary.summary}</p>` : ''}
          ${resumeData?.targetJob?.jobTitle ? `<h2>Target Job</h2><p>${resumeData.targetJob.jobTitle} - ${resumeData.targetJob.industry || ''}</p>` : ''}
        </body>
      </html>
    `;
  };

  const ShareOption = ({ icon, label, value, onValueChange }) => (
    <TouchableOpacity 
      style={[styles.shareOption, value && styles.shareOptionActive]}
      onPress={() => onValueChange(!value)}
    >
      <Ionicons 
        name={value ? 'checkbox' : 'square-outline'} 
        size={22} 
        color={value ? '#4A90D9' : '#999'} 
      />
      <Text style={[styles.shareOptionText, value && styles.shareOptionTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const ShareButton = ({ icon, label, onPress, color = '#4A90D9', disabled = false }) => (
    <TouchableOpacity 
      style={[styles.shareButton, { backgroundColor: color, opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.shareButtonText}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading || isGenerating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!resume) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Resume Found</Text>
          <Text style={styles.emptyDescription}>
            Please create a resume first before sharing.
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('ResumeBuilder')}
          >
            <Text style={styles.createButtonText}>Create Resume</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Share Resume</Text>
            <Text style={styles.headerSubtitle}>
              Share your resume with recruiters and employers
            </Text>
          </View>
        </View>

        {/* Resume Info */}
        <View style={styles.resumeInfo}>
          <View style={styles.resumeAvatar}>
            <Text style={styles.resumeInitials}>
              {resume?.personalInfo?.firstName?.[0] || 'R'}
              {resume?.personalInfo?.lastName?.[0] || ''}
            </Text>
          </View>
          <View style={styles.resumeDetails}>
            <Text style={styles.resumeName}>
              {resume?.personalInfo?.firstName || 'Untitled'} {resume?.personalInfo?.lastName || ''}
            </Text>
            <Text style={styles.resumeTitle}>
              {resume?.professionalSummary?.title || 'No title set'}
            </Text>
            <Text style={styles.resumeCompleteness}>
              {resume?.completionPercentage || 0}% Complete
            </Text>
          </View>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>Scan to View Resume</Text>
          <View style={styles.qrCode}>
            <QRCode
              value={shareLink}
              size={150}
              color="#2c3e50"
              backgroundColor="white"
            />
          </View>
          <TouchableOpacity style={styles.copyLinkButton} onPress={handleCopyLink}>
            <Ionicons name="copy-outline" size={18} color="#4A90D9" />
            <Text style={styles.copyLinkText}>Copy Share Link</Text>
          </TouchableOpacity>
          <Text style={styles.shareLink} numberOfLines={2}>
            {shareLink}
          </Text>
        </View>

        {/* Share Options */}
        <View style={styles.optionsContainer}>
          <Text style={styles.optionsTitle}>Share Options</Text>
          <ShareOption
            icon="link-outline"
            label="Share Link"
            value={shareOptions.shareLink}
            onValueChange={(val) => setShareOptions({ ...shareOptions, shareLink: val })}
          />
          <ShareOption
            icon="document-text-outline"
            label="Share as PDF"
            value={shareOptions.sharePDF}
            onValueChange={(val) => setShareOptions({ ...shareOptions, sharePDF: val })}
          />
          <ShareOption
            icon="code-outline"
            label="Share as HTML"
            value={shareOptions.shareHTML}
            onValueChange={(val) => setShareOptions({ ...shareOptions, shareHTML: val })}
          />
          <ShareOption
            icon="database-outline"
            label="Share as JSON"
            value={shareOptions.shareJSON}
            onValueChange={(val) => setShareOptions({ ...shareOptions, shareJSON: val })}
          />
        </View>

        {/* Privacy Options */}
        <View style={styles.optionsContainer}>
          <Text style={styles.optionsTitle}>Privacy Settings</Text>
          <ShareOption
            icon="person-outline"
            label="Include Contact Info"
            value={shareOptions.includeContact}
            onValueChange={(val) => setShareOptions({ ...shareOptions, includeContact: val })}
          />
          <ShareOption
            icon="image-outline"
            label="Include Photo"
            value={shareOptions.includePhoto}
            onValueChange={(val) => setShareOptions({ ...shareOptions, includePhoto: val })}
          />
          <ShareOption
            icon="people-outline"
            label="Include References"
            value={shareOptions.includeReferences}
            onValueChange={(val) => setShareOptions({ ...shareOptions, includeReferences: val })}
          />
        </View>

        {/* Share Buttons */}
        <View style={styles.shareButtonsContainer}>
          <Text style={styles.shareButtonsTitle}>Share via</Text>
          <View style={styles.shareButtonsGrid}>
            <ShareButton
              icon="share-social-outline"
              label="Share"
              onPress={handleShare}
              color="#4A90D9"
            />
            <ShareButton
              icon="document-text-outline"
              label="PDF"
              onPress={handleSharePDF}
              color="#2ECC71"
            />
            <ShareButton
              icon="mail-outline"
              label="Email"
              onPress={handleEmailShare}
              color="#E74C3C"
            />
            <ShareButton
              icon="logo-linkedin"
              label="LinkedIn"
              onPress={handleLinkedInShare}
              color="#0A66C2"
            />
            <ShareButton
              icon="logo-twitter"
              label="Twitter"
              onPress={handleTwitterShare}
              color="#1DA1F2"
            />
            <ShareButton
              icon="copy-outline"
              label="Copy Link"
              onPress={handleCopyLink}
              color="#9B59B6"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  createButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  resumeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resumeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeInitials: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  resumeDetails: {
    marginLeft: 16,
    flex: 1,
  },
  resumeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  resumeTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  resumeCompleteness: {
    fontSize: 12,
    color: '#4A90D9',
    marginTop: 2,
  },
  qrContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qrTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  qrCode: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  copyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  copyLinkText: {
    fontSize: 14,
    color: '#4A90D9',
    marginLeft: 6,
  },
  shareLink: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  optionsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shareOptionActive: {
    borderBottomColor: '#4A90D9',
  },
  shareOptionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  shareOptionTextActive: {
    color: '#2c3e50',
  },
  shareButtonsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shareButtonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  shareButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default ResumeShareScreen;