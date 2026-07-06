// app/src/screens/Job/JobApplicationScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ResumeContext } from '../../context/ResumeContext';
import { AuthContext } from '../../context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';

const EnhanceCareer = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { jobId, job } = route.params || {};
  const { user } = useContext(AuthContext);
  const { applyToJob, loading } = useContext(ResumeContext);

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    coverLetter: '',
    resume: null,
  });
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleResumeUpload = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        setFormData(prev => ({
          ...prev,
          resume: {
            uri: result.uri,
            name: result.name,
            type: result.mimeType || 'application/pdf',
          }
        }));
        Alert.alert('✅ Success', 'Resume uploaded successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    if (!formData.resume) {
      Alert.alert('Error', 'Please upload your resume');
      return;
    }

    try {
      const applicationData = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        coverLetter: formData.coverLetter,
        resume: formData.resume,
        currentCompany: user?.currentCompany || '',
        currentPosition: user?.currentPosition || '',
        yearsOfExperience: user?.yearsOfExperience || '0',
        linkedInUrl: user?.linkedIn || '',
        githubUrl: user?.github || '',
      };

      const response = await applyToJob(jobId, applicationData);
      
      if (response) {
        Alert.alert(
          '✅ Application Submitted!',
          'Your application has been submitted successfully. We will review it and get back to you soon.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit application');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Job</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job?.title || 'Position'}</Text>
          <Text style={styles.jobCompany}>{job?.companyName || job?.company || 'Company'}</Text>
          <View style={styles.jobInfoDetails}>
            <View style={styles.jobInfoItem}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.jobInfoText}>{job?.location || 'Remote'}</Text>
            </View>
            <View style={styles.jobInfoItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.jobInfoText}>{job?.type || 'Full-time'}</Text>
            </View>
            <View style={styles.jobInfoItem}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.jobInfoText}>{job?.salary || 'Competitive'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={(text) => handleInputChange('fullName', text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cover Letter</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Tell us why you're a great fit for this position..."
              value={formData.coverLetter}
              onChangeText={(text) => handleInputChange('coverLetter', text)}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Resume / CV *</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleResumeUpload}
              disabled={uploading}
            >
              <Ionicons name="cloud-upload-outline" size={24} color="#4A90D9" />
              <Text style={styles.uploadButtonText}>
                {formData.resume ? 'Resume Uploaded' : 'Upload Resume'}
              </Text>
              {uploading && <ActivityIndicator size="small" color="#4A90D9" />}
            </TouchableOpacity>
            {formData.resume && (
              <Text style={styles.fileName}>{formData.resume.name}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Application</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerPlaceholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  jobInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  jobCompany: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  jobInfoDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  jobInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  jobInfoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  textarea: {
    height: 120,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4A90D9',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#4A90D9',
    fontWeight: '500',
    marginLeft: 8,
  },
  fileName: {
    fontSize: 12,
    color: '#2ECC71',
    marginTop: 4,
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default EnhanceCareer;