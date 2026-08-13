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
    console.log('ReportModal - visible prop:', visible);
    console.log('ReportModal - modalVisible state:', modalVisible);
    console.log('ReportModal - contentId:', contentId);
    console.log('ReportModal - contentType:', contentType);
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
              <Ionicons name="flag-outline" size={22} color="#e74c3c" />
              <Text style={styles.title}>Report {getContentTypeLabel()}</Text>
            </View>
            <TouchableOpacity 
              onPress={handleClose} 
              disabled={loading}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          {submitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={40} color="#fff" />
              </View>
              <Text style={styles.successTitle}>Report Submitted</Text>
              <Text style={styles.successSubtext}>
                Thank you for your report. Our moderation team will review it within 24 hours.
              </Text>
              <View style={styles.successBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#2ecc71" />
                <Text style={styles.successBadgeText}>Under Review</Text>
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
                        color={selectedReason === reason.id ? '#f9c349' : '#666'} 
                      />
                      <Text
                        style={[
                          styles.reasonText,
                          selectedReason === reason.id && styles.reasonTextSelected
                        ]}
                      >
                        {reason.label}
                      </Text>
                    </View>
                    {selectedReason === reason.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#f9c349" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.descriptionLabel}>
                Additional details <Text style={styles.optionalText}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Provide more context about this report..."
                placeholderTextColor="#999"
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
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>

              <View style={styles.noteContainer}>
                <Ionicons name="information-circle-outline" size={16} color="#999" />
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
                  <Ionicons name="ban-outline" size={20} color="#e74c3c" />
                  <Text style={styles.blockOptionText}>Block this user</Text>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85, // FIXED: 85% of screen height
    minHeight: height * 0.4,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cfd9de',
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
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
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
    color: '#333',
    fontWeight: '600',
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
    backgroundColor: '#fef9f0',
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
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reasonRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f9c349',
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  reasonTextSelected: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optionalText: {
    fontWeight: '400',
    color: '#999',
    fontSize: 12,
  },
  descriptionInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  submitButton: {
    backgroundColor: '#f9c349',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#d4d4d4',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  noteText: {
    fontSize: 12,
    color: '#999',
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
    borderTopColor: '#f0f0f0',
  },
  blockOptionText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600',
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
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0faf0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
  },
  successBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2ecc71',
    marginLeft: 6,
  },
});