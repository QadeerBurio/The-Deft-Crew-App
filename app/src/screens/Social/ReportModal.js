// components/ReportModal.js - COMPLETE FIXED VERSION

import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

import { color as T, font as F } from "../../theme/tokens";
const { height, width } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

const REPORT_REASONS = [
  { id: 'Spam', label: 'Spam', icon: 'mail-outline' },
  { id: 'Harassment', label: 'Harassment or bullying', icon: 'people-outline' },
  { id: 'Hate Speech', label: 'Hate or abusive content', icon: 'warning-outline' },
  { id: 'Sexual Content', label: 'Sexual content', icon: 'alert-circle-outline' },
  { id: 'Violence', label: 'Violence', icon: 'flash-outline' },
  { id: 'Misinformation', label: 'Misinformation', icon: 'information-circle-outline' },
  { id: 'Inappropriate Content', label: 'Inappropriate Content', icon: 'eye-off-outline' },
  { id: 'Fake Account', label: 'Fake Account', icon: 'person-remove-outline' },
  { id: 'Other', label: 'Other', icon: 'ellipsis-horizontal-outline' }
];

export default function ReportModal({
  visible = false,
  onClose,
  contentType = 'Post',
  contentId,
  reportedUserId,
  onSuccess
}) {
  const { token } = useContext(AuthContext);
  const [selectedReason, setSelectedReason] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Sync internal state with prop
  useEffect(() => {
    setModalVisible(visible);
  }, [visible]);

  // Log for debugging
  useEffect(() => {
    // console.log('ReportModal - visible prop:', visible);
    // console.log('ReportModal - modalVisible state:', modalVisible);
    // console.log('ReportModal - contentId:', contentId);
    // console.log('ReportModal - contentType:', contentType);
  }, [visible, modalVisible, contentId, contentType]);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    if (!contentId) {
      Alert.alert('Error', 'No content selected for reporting');
      return;
    }

    setLoading(true);
    try {
      let endpoint;
      let payload = {
        reason: selectedReason,
        description: description.trim() || ''
      };

      switch (contentType) {
        case 'Post':
          endpoint = `${API_URL}/posts/report/${contentId}`;
          break;
        case 'Comment':
          const [postId, commentId] = contentId.split(':');
          if (!postId || !commentId) {
            throw new Error('Invalid comment ID format');
          }
          endpoint = `${API_URL}/posts/comment/${postId}/${commentId}/report`;
          break;
        case 'User':
          endpoint = `${API_URL}/user/report/${contentId}`;
          break;
        default:
          throw new Error('Invalid content type');
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(endpoint, payload, config);
      
      console.log('Report response:', response.data);

      setSubmitted(true);
      if (onSuccess) {
        onSuccess(response.data);
      }

      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('Report error:', err);
      console.error('Error response:', err.response?.data);
      Alert.alert(
        'Error',
        err.response?.data?.error || 'Failed to submit report. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSelectedReason(null);
    setDescription('');
    setSubmitted(false);
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      resetState();
      setModalVisible(false);
      if (onClose) {
        onClose();
      }
    }
  };

  const getContentTypeLabel = () => {
    switch (contentType) {
      case 'Post': return 'post';
      case 'Comment': return 'comment';
      case 'User': return 'account';
      default: return 'content';
    }
  };

  return (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
          disabled={loading}
        />
        
        <View style={styles.modalContainer}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="flag-outline" size={22} color={T.danger} />
              <Text style={styles.title}>report {String(getContentTypeLabel()).toLowerCase()}</Text>
            </View>
            <TouchableOpacity 
              onPress={handleClose} 
              disabled={loading}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={T.ink} />
            </TouchableOpacity>
          </View>

          {submitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={40} color={T.white} />
              </View>
              <Text style={styles.successTitle}>report submitted</Text>
              <Text style={styles.successSubtext}>
                Thank you for your report. Our moderation team will review it within 24 hours.
              </Text>
              <View style={styles.successBadge}>
                <Ionicons name="shield-checkmark" size={16} color={T.success} />
                <Text style={styles.successBadgeText}>under review</Text>
              </View>
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.subtitle}>
                Why are you reporting this {getContentTypeLabel()}?
              </Text>

              <View style={styles.reasonsContainer}>
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[
                      styles.reasonOption,
                      selectedReason === reason.id && styles.reasonSelected
                    ]}
                    onPress={() => setSelectedReason(reason.id)}
                    disabled={loading}
                  >
                    <View style={styles.reasonLeft}>
                      <View style={styles.reasonRadio}>
                        {selectedReason === reason.id && (
                          <View style={styles.reasonRadioInner} />
                        )}
                      </View>
                      <Ionicons 
                        name={reason.icon} 
                        size={18} 
                        color={selectedReason === reason.id ? T.yellow : T.textMuted} 
                      />
                      <Text
                        style={[
                          styles.reasonText,
                          selectedReason === reason.id && styles.reasonTextSelected
                        ]}
                      >
                        {reason.label.toLowerCase()}
                      </Text>
                    </View>
                    {selectedReason === reason.id && (
                      <Ionicons name="checkmark-circle" size={20} color={T.yellow} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.descriptionLabel}>
                additional details <Text style={styles.optionalText}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Provide more context about this report..."
                placeholderTextColor={T.textFaint}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!loading}
                maxLength={500}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedReason || loading) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!selectedReason || loading}
              >
                {loading ? (
                  <ActivityIndicator color={T.white} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>submit report</Text>
                )}
              </TouchableOpacity>

              <View style={styles.noteContainer}>
                <Ionicons name="information-circle-outline" size={16} color={T.textFaint} />
                <Text style={styles.noteText}>
                  Reports are reviewed by our moderation team. False reports may lead to account restrictions.
                </Text>
              </View>

              {/* Block Option */}
              {contentType !== 'User' && reportedUserId && (
                <TouchableOpacity 
                  style={styles.blockOption}
                  onPress={() => {
                    Alert.alert(
                      'Block User',
                      'Would you also like to block this user? You will no longer see their content.',
                      [
                        { text: 'No', style: 'cancel' },
                        { 
                          text: 'Yes, Block', 
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              const config = { headers: { Authorization: `Bearer ${token}` } };
                              await axios.post(`${API_URL}/user/block/${reportedUserId}`, {}, config);
                              Alert.alert('Blocked', 'User has been blocked successfully');
                              handleClose();
                            } catch (err) {
                              Alert.alert('Error', 'Failed to block user');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons name="ban-outline" size={20} color={T.danger} />
                  <Text style={styles.blockOptionText}>block this user</Text>
                  <Ionicons name="chevron-forward" size={16} color={T.textFaint} />
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: T.overlay,
  },
  modalContainer: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85, // FIXED: 85% of screen height
    minHeight: height * 0.4,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: T.sand,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.ink,
    marginLeft: 10,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 15,
    color: T.ink,
    fontFamily: F.bodySemi,
    marginTop: 16,
    marginBottom: 12,
  },
  reasonsContainer: {
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  reasonSelected: {
    backgroundColor: T.yellowSoft,
  },
  reasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: T.line,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reasonRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.yellow,
  },
  reasonText: {
    fontSize: 14, fontFamily: F.body,
    color: T.ink,
    marginLeft: 10,
    flex: 1,
  },
  reasonTextSelected: {
    color: T.ink,
    fontFamily: F.bodyMedium,
  },
  descriptionLabel: {
    fontSize: 14,
    fontFamily: F.bodySemi,
    color: T.ink,
    marginBottom: 8,
  },
  optionalText: {
    fontFamily: F.body,
    color: T.textFaint,
    fontSize: 12,
  },
  descriptionInput: {
    backgroundColor: T.sand,
    borderRadius: 12,
    padding: 14,
    fontSize: 14, fontFamily: F.body,
    color: T.ink,
    minHeight: 100,
    borderWidth: 1,
    borderColor: T.line,
  },
  submitButton: {
    backgroundColor: T.yellow,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: T.sand,
  },
  submitButtonText: {
    color: T.white,
    fontSize: 16,
    fontFamily: F.bodyBold,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  noteText: {
    fontSize: 12, fontFamily: F.body,
    color: T.textFaint,
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
  blockOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: T.line,
  },
  blockOptionText: {
    fontSize: 14,
    color: T.danger,
    fontFamily: F.bodySemi,
    marginLeft: 12,
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    minHeight: height * 0.4,
  },
  successIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: T.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: F.headingBold,
    color: T.ink,
  },
  successSubtext: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.successBg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
  },
  successBadgeText: {
    fontSize: 13,
    fontFamily: F.bodySemi,
    color: T.success,
    marginLeft: 6,
  },
});