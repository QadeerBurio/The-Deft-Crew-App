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

import { color as T, font as F } from "../../theme/tokens";
import ScreenHeader from "../../ui/ScreenHeader";
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
          ${resumeData?.professionalSummary?.summary ? `<h2>summary</h2><p>${resumeData.professionalSummary.summary}</p>` : ''}
          ${resumeData?.targetJob?.jobTitle ? `<h2>target job</h2><p>${resumeData.targetJob.jobTitle} - ${resumeData.targetJob.industry || ''}</p>` : ''}
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
        color={value ? T.ink : T.textFaint} 
      />
      <Text style={[styles.shareOptionText, value && styles.shareOptionTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const ShareButton = ({ icon, label, onPress, color = T.ink, disabled = false }) => (
    <TouchableOpacity 
      style={[styles.shareButton, { backgroundColor: color, opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={20} color={T.white} />
      <Text style={styles.shareButtonText}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading || isGenerating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={T.ink} />
        <Text style={styles.loadingText}>loading...</Text>
      </View>
    );
  }

  if (!resume) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={T.textFaint} />
          <Text style={styles.emptyTitle}>no resume found</Text>
          <Text style={styles.emptyDescription}>
            Please create a resume first before sharing.
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('ResumeBuilder')}
          >
            <Text style={styles.createButtonText}>create resume</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="share resume" onBack={() => navigation.goBack()} />
        <Text style={{ fontFamily: F.body, fontSize: 13, color: T.textMuted, paddingHorizontal: 20, marginTop: -6, marginBottom: 6 }}>
          Share your resume with recruiters and employers
        </Text>

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
          <Text style={styles.qrTitle}>scan to view resume</Text>
          <View style={styles.qrCode}>
            <QRCode
              value={shareLink}
              size={150}
              color={T.ink}
              backgroundColor="white"
            />
          </View>
          <TouchableOpacity style={styles.copyLinkButton} onPress={handleCopyLink}>
            <Ionicons name="copy-outline" size={18} color={T.ink} />
            <Text style={styles.copyLinkText}>copy share link</Text>
          </TouchableOpacity>
          <Text style={styles.shareLink} numberOfLines={2}>
            {shareLink}
          </Text>
        </View>

        {/* Share Options */}
        <View style={styles.optionsContainer}>
          <Text style={styles.optionsTitle}>share options</Text>
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
          <Text style={styles.optionsTitle}>privacy settings</Text>
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
          <Text style={styles.shareButtonsTitle}>share via</Text>
          <View style={styles.shareButtonsGrid}>
            <ShareButton
              icon="share-social-outline"
              label="Share"
              onPress={handleShare}
              color={T.ink}
            />
            <ShareButton
              icon="document-text-outline"
              label="PDF"
              onPress={handleSharePDF}
              color={T.success}
            />
            <ShareButton
              icon="mail-outline"
              label="Email"
              onPress={handleEmailShare}
              color={T.danger}
            />
            <ShareButton
              icon="logo-linkedin"
              label="LinkedIn"
              onPress={handleLinkedInShare}
              color={T.ink}
            />
            <ShareButton
              icon="logo-twitter"
              label="Twitter"
              onPress={handleTwitterShare}
              color={T.ink}
            />
            <ShareButton
              icon="copy-outline"
              label="Copy Link"
              onPress={handleCopyLink}
              color={T.ink}
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
    backgroundColor: T.sand,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: T.textMuted,
    fontSize: 14, fontFamily: F.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: F.headingBold,
    color: T.ink,
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  createButton: {
    backgroundColor: T.ink,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createButtonText: {
    color: T.white,
    fontSize: 16,
    fontFamily: F.bodySemi,
  },
  header: {
    padding: 20,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
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
    fontFamily: F.heading,
    color: T.ink,
  },
  headerSubtitle: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 4,
  },
  resumeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resumeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: T.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeInitials: {
    fontSize: 22,
    fontFamily: F.heading,
    color: T.white,
  },
  resumeDetails: {
    marginLeft: 16,
    flex: 1,
  },
  resumeName: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.ink,
  },
  resumeTitle: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 2,
  },
  resumeCompleteness: {
    fontSize: 12, fontFamily: F.body,
    color: T.ink,
    marginTop: 2,
  },
  qrContainer: {
    backgroundColor: T.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qrTitle: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    marginBottom: 12,
  },
  qrCode: {
    padding: 12,
    backgroundColor: T.card,
    borderRadius: 8,
  },
  copyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  copyLinkText: {
    fontSize: 14, fontFamily: F.body,
    color: T.ink,
    marginLeft: 6,
  },
  shareLink: {
    fontSize: 12, fontFamily: F.body,
    color: T.textFaint,
    marginTop: 8,
    textAlign: 'center',
  },
  optionsContainer: {
    backgroundColor: T.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionsTitle: {
    fontSize: 14,
    fontFamily: F.bodySemi,
    color: T.ink,
    marginBottom: 12,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  shareOptionActive: {
    borderBottomColor: T.ink,
  },
  shareOptionText: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    marginLeft: 10,
  },
  shareOptionTextActive: {
    color: T.ink,
  },
  shareButtonsContainer: {
    backgroundColor: T.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shareButtonsTitle: {
    fontSize: 14,
    fontFamily: F.bodySemi,
    color: T.ink,
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
    color: T.white,
    fontSize: 13,
    fontFamily: F.bodyMedium,
    marginLeft: 6,
  },
});

export default ResumeShareScreen;