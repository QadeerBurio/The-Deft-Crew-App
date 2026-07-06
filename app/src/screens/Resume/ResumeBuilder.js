// app/src/screens/Resume/ResumeBuilder.js
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { ResumeContext } from '../../context/ResumeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const ResumeBuilderScreen = () => {
  const { user, isGuest } = useContext(AuthContext);
  const {
    currentResume,
    createResume,
    updateResume,
    uploadResume,
    loading,
    uploadProgress,
    error,
    clearError,
    fetchResumes
  } = useContext(ResumeContext);
  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId } = route.params || {};

  const [selectedSection, setSelectedSection] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [targetJobs, setTargetJobs] = useState([]);
  const [showTargetJob, setShowTargetJob] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [targetJobModalVisible, setTargetJobModalVisible] = useState(false);
  const [editingTargetJobIndex, setEditingTargetJobIndex] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null);
  const [targetJobForm, setTargetJobForm] = useState({
    jobTitle: '',
    industry: '',
    jobType: 'Full-time',
    desiredSalary: '',
    location: '',
    availability: ''
  });
  const [uploadStatus, setUploadStatus] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  
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

  // Clear error on mount
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      clearError();
    }
  }, [error]);

  // Load target jobs from current resume
  useEffect(() => {
    if (currentResume?.targetJobs) {
      setTargetJobs(currentResume.targetJobs);
    } else if (currentResume?.targetJob) {
      setTargetJobs([currentResume.targetJob]);
    }
  }, [currentResume]);

  // Load resume if editing
  useEffect(() => {
    if (resumeId && currentResume?._id !== resumeId) {
      // Resume will be loaded via context
    }
  }, [resumeId]);

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Section definitions with colors
  const sections = [
    {
      id: 'personalInfo',
      title: 'Personal Information',
      icon: 'person-outline',
      color: '#4A90D9',
      gradient: ['#4A90D9', '#357ABD'],
      fields: [
        { key: 'firstName', label: 'First Name', type: 'text', required: true },
        { key: 'lastName', label: 'Last Name', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'phone', label: 'Phone', type: 'phone', required: true },
        { key: 'address', label: 'Address', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'state', label: 'State', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'postalCode', label: 'Postal Code', type: 'text' },
        { key: 'linkedin', label: 'LinkedIn URL', type: 'url' },
        { key: 'github', label: 'GitHub URL', type: 'url' },
        { key: 'portfolio', label: 'Portfolio URL', type: 'url' }
      ]
    },
    {
      id: 'professionalSummary',
      title: 'Professional Summary',
      icon: 'document-text-outline',
      color: '#E74C3C',
      gradient: ['#E74C3C', '#C0392B'],
      fields: [
        { key: 'title', label: 'Professional Title', type: 'text' },
        { key: 'summary', label: 'Summary', type: 'textarea', required: true },
        { 
          key: 'experienceLevel', 
          label: 'Experience Level', 
          type: 'select',
          options: ['Entry Level', 'Mid Level', 'Senior Level', 'Executive']
        }
      ]
    },
    {
      id: 'education',
      title: 'Education',
      icon: 'school-outline',
      color: '#2ECC71',
      gradient: ['#2ECC71', '#27AE60'],
      fields: [
        { key: 'institution', label: 'Institution', type: 'text', required: true },
        { key: 'degree', label: 'Degree', type: 'text', required: true },
        { key: 'fieldOfStudy', label: 'Field of Study', type: 'text', required: true },
        { key: 'startDate', label: 'Start Date', type: 'date' },
        { key: 'endDate', label: 'End Date', type: 'date' },
        { key: 'current', label: 'Currently Studying', type: 'checkbox' },
        { key: 'gpa', label: 'GPA', type: 'number' },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]
    },
    {
      id: 'skills',
      title: 'Skills',
      icon: 'bulb-outline',
      color: '#F39C12',
      gradient: ['#F39C12', '#E67E22'],
      fields: [
        { key: 'name', label: 'Skill Name', type: 'text', required: true },
        { 
          key: 'level', 
          label: 'Proficiency Level', 
          type: 'select',
          options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
          required: true
        },
        { 
          key: 'category', 
          label: 'Category', 
          type: 'select',
          options: ['Technical', 'Soft Skills', 'Language', 'Other']
        }
      ]
    },
    {
      id: 'workExperience',
      title: 'Work Experience',
      icon: 'briefcase-outline',
      color: '#9B59B6',
      gradient: ['#9B59B6', '#8E44AD'],
      fields: [
        { key: 'company', label: 'Company', type: 'text', required: true },
        { key: 'position', label: 'Position', type: 'text', required: true },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'startDate', label: 'Start Date', type: 'date' },
        { key: 'endDate', label: 'End Date', type: 'date' },
        { key: 'current', label: 'Currently Working', type: 'checkbox' },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]
    },
    {
      id: 'certifications',
      title: 'Certifications',
      icon: 'ribbon-outline',
      color: '#1ABC9C',
      gradient: ['#1ABC9C', '#16A085'],
      fields: [
        { key: 'name', label: 'Certification Name', type: 'text', required: true },
        { key: 'organization', label: 'Organization', type: 'text', required: true },
        { key: 'issueDate', label: 'Issue Date', type: 'date' },
        { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
        { key: 'credentialId', label: 'Credential ID', type: 'text' },
        { key: 'credentialUrl', label: 'Credential URL', type: 'url' }
      ]
    },
    {
      id: 'projects',
      title: 'Projects',
      icon: 'code-outline',
      color: '#3498DB',
      gradient: ['#3498DB', '#2980B9'],
      fields: [
        { key: 'name', label: 'Project Name', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'textarea', required: true },
        { key: 'technologies', label: 'Technologies (comma separated)', type: 'text' },
        { key: 'startDate', label: 'Start Date', type: 'date' },
        { key: 'endDate', label: 'End Date', type: 'date' },
        { key: 'url', label: 'Project URL', type: 'url' },
        { key: 'githubUrl', label: 'GitHub URL', type: 'url' }
      ]
    },
    {
      id: 'languages',
      title: 'Languages',
      icon: 'language-outline',
      color: '#E67E22',
      gradient: ['#E67E22', '#D35400'],
      fields: [
        { key: 'name', label: 'Language', type: 'text', required: true },
        { 
          key: 'proficiency', 
          label: 'Proficiency', 
          type: 'select',
          options: ['Native', 'Fluent', 'Intermediate', 'Basic'],
          required: true
        }
      ]
    },
    {
      id: 'references',
      title: 'References',
      icon: 'people-outline',
      color: '#2C3E50',
      gradient: ['#2C3E50', '#1A252F'],
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'position', label: 'Position', type: 'text' },
        { key: 'company', label: 'Company', type: 'text' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone', type: 'phone' }
      ]
    }
  ];

  // Open modal for section
  const openSectionModal = (section, index = null) => {
    setSelectedSection(section);
    setEditingIndex(index);
    
    let sectionData = currentResume?.[section.id] || {};
    
    if (index !== null && Array.isArray(sectionData) && sectionData[index]) {
      const initialData = {};
      section.fields.forEach(field => {
        const value = sectionData[index][field.key];
        if (field.type === 'date' && value) {
          initialData[field.key] = new Date(value);
        } else {
          initialData[field.key] = value || '';
        }
      });
      setFormData(initialData);
    } else if (section.id === 'personalInfo' && sectionData && typeof sectionData === 'object') {
      const initialData = {};
      section.fields.forEach(field => {
        const value = sectionData[field.key];
        if (field.type === 'date' && value) {
          initialData[field.key] = new Date(value);
        } else {
          initialData[field.key] = value || '';
        }
      });
      setFormData(initialData);
    } else {
      const initialData = {};
      section.fields.forEach(field => {
        if (field.type === 'checkbox') {
          initialData[field.key] = false;
        } else if (field.type === 'select' && field.options) {
          initialData[field.key] = field.options[0] || '';
        } else if (field.type === 'date') {
          initialData[field.key] = null;
        } else {
          initialData[field.key] = '';
        }
      });
      setFormData(initialData);
    }
    
    setModalVisible(true);
  };

  // Handle form input change
  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Handle date picker
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange(datePickerField, selectedDate);
    }
  };

  // Handle target job form input change
  const handleTargetJobInputChange = (key, value) => {
    setTargetJobForm(prev => ({ ...prev, [key]: value }));
  };

  // Save section data
  const saveSectionData = async () => {
    try {
      const sectionId = selectedSection.id;
      const isArraySection = ['education', 'skills', 'workExperience', 'certifications', 'projects', 'languages', 'references'].includes(sectionId);
      
      const requiredFields = selectedSection.fields.filter(f => f.required);
      for (const field of requiredFields) {
        const value = formData[field.key];
        if (!value || value.toString().trim() === '') {
          Alert.alert('Validation Error', `${field.label} is required`);
          return;
        }
      }

      let updateData = {};
      
      if (sectionId === 'personalInfo') {
        const currentPersonalInfo = currentResume?.personalInfo || {};
        updateData = {
          personalInfo: {
            ...currentPersonalInfo,
            ...formData
          }
        };
      } else if (sectionId === 'professionalSummary') {
        const currentSummary = currentResume?.professionalSummary || {};
        updateData = {
          professionalSummary: {
            ...currentSummary,
            ...formData
          }
        };
      } else if (isArraySection) {
        const existingItems = currentResume?.[sectionId] || [];
        const newItem = { ...formData };
        
        Object.keys(newItem).forEach(key => {
          if (newItem[key] instanceof Date) {
            newItem[key] = newItem[key].toISOString();
          }
        });
        
        if (editingIndex !== null && existingItems[editingIndex]) {
          existingItems[editingIndex] = { ...existingItems[editingIndex], ...newItem };
          updateData[sectionId] = existingItems;
        } else {
          updateData[sectionId] = [...existingItems, newItem];
        }
      }

      if (!currentResume) {
        const newResume = await createResume(updateData);
        if (newResume) {
          Alert.alert('✅ Success', `${selectedSection.title} added successfully`);
          setModalVisible(false);
          await fetchResumes();
        }
      } else {
        const updated = await updateResume(currentResume._id, updateData);
        if (updated) {
          Alert.alert('✅ Success', `${selectedSection.title} saved successfully`);
          setModalVisible(false);
          await fetchResumes();
        }
      }
    } catch (error) {
      console.error('❌ Save section error:', error);
      Alert.alert('❌ Error', error.message || 'Failed to save section data');
    }
  };

  // Open target job modal
  const openTargetJobModal = (index = null) => {
    setEditingTargetJobIndex(index);
    if (index !== null && targetJobs[index]) {
      setTargetJobForm(targetJobs[index]);
    } else {
      setTargetJobForm({
        jobTitle: '',
        industry: '',
        jobType: 'Full-time',
        desiredSalary: '',
        location: '',
        availability: ''
      });
    }
    setTargetJobModalVisible(true);
  };

  // Save target job
  const saveTargetJob = async () => {
    try {
      if (!targetJobForm.jobTitle || !targetJobForm.industry) {
        Alert.alert('Validation Error', 'Job Title and Industry are required');
        return;
      }

      let updatedTargetJobs = [...targetJobs];
      if (editingTargetJobIndex !== null) {
        updatedTargetJobs[editingTargetJobIndex] = targetJobForm;
      } else {
        updatedTargetJobs.push(targetJobForm);
      }

      setTargetJobs(updatedTargetJobs);

      if (!currentResume) {
        const newResume = await createResume({ targetJobs: updatedTargetJobs });
        if (newResume) {
          Alert.alert('✅ Success', 'Target job added successfully');
          setTargetJobModalVisible(false);
          await fetchResumes();
        }
      } else {
        const updated = await updateResume(currentResume._id, { targetJobs: updatedTargetJobs });
        if (updated) {
          Alert.alert('✅ Success', 'Target job saved successfully');
          setTargetJobModalVisible(false);
          await fetchResumes();
        }
      }
    } catch (error) {
      console.error('❌ Save target job error:', error);
      Alert.alert('❌ Error', error.message || 'Failed to save target job');
    }
  };

  // Delete target job
  const deleteTargetJob = (index) => {
    Alert.alert(
      'Delete Target Job',
      'Are you sure you want to delete this target job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedTargetJobs = targetJobs.filter((_, i) => i !== index);
            setTargetJobs(updatedTargetJobs);
            
            if (currentResume) {
              await updateResume(currentResume._id, { targetJobs: updatedTargetJobs });
              await fetchResumes();
            }
            Alert.alert('✅ Success', 'Target job deleted successfully');
          }
        }
      ]
    );
  };

  // Delete section item
  const deleteSectionItem = (sectionId, index) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const existingItems = currentResume?.[sectionId] || [];
            const updatedItems = existingItems.filter((_, i) => i !== index);
            
            if (currentResume) {
              await updateResume(currentResume._id, { [sectionId]: updatedItems });
              await fetchResumes();
              Alert.alert('✅ Success', 'Item deleted successfully');
            }
          }
        }
      ]
    );
  };

  // Upload resume file
  const handleUploadResume = async () => {
    try {
      setUploading(true);
      setUploadStatus('Selecting file...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true
      });

      if (result.type === 'success') {
        const file = {
          uri: result.uri,
          name: result.name,
          type: result.mimeType || 'application/pdf'
        };
        
        setUploadStatus('Uploading and parsing resume...');
        
        const uploadedResume = await uploadResume(file);
        
        if (uploadedResume) {
          const parsedData = uploadedResume.uploadedResume?.parsedData;
          if (parsedData) {
            let parsedCount = 0;
            if (parsedData.personalInfo?.firstName) parsedCount++;
            if (parsedData.education?.length > 0) parsedCount++;
            if (parsedData.skills?.length > 0) parsedCount++;
            if (parsedData.workExperience?.length > 0) parsedCount++;
            
            setUploadStatus(`✅ Resume uploaded and parsed! Extracted ${parsedCount} sections.`);
            await fetchResumes();
            
            Alert.alert(
              '✅ Success', 
              `Resume uploaded and parsed successfully!\n\nExtracted ${parsedCount} sections of data.`,
              [
                { 
                  text: 'View Resume', 
                  onPress: () => navigation.navigate('ResumeView', { resumeId: uploadedResume._id })
                },
                { text: 'Continue Editing' }
              ]
            );
          } else {
            setUploadStatus('✅ Resume uploaded successfully!');
            await fetchResumes();
            Alert.alert('✅ Success', 'Resume uploaded successfully!');
          }
        } else {
          setUploadStatus('❌ Failed to upload resume');
          Alert.alert('❌ Error', 'Failed to upload resume. Please try again.');
        }
      } else {
        setUploadStatus('Upload cancelled');
      }
    } catch (error) {
      console.error('❌ Upload resume error:', error);
      setUploadStatus('❌ Error: ' + error.message);
      Alert.alert('❌ Error', error.message || 'Failed to upload resume');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadStatus('');
      }, 2000);
    }
  };

  // Render section card with expandable items
  const renderSectionCard = (section) => {
    const sectionData = currentResume?.[section.id];
    const isArraySection = ['education', 'skills', 'workExperience', 'certifications', 'projects', 'languages', 'references'].includes(section.id);
    const itemCount = Array.isArray(sectionData) ? sectionData.length : 0;
    const isExpanded = expandedSections[section.id] || false;
    
    let isComplete = false;
    
    if (section.id === 'personalInfo') {
      isComplete = sectionData && 
        sectionData.firstName && 
        sectionData.firstName.trim() !== '' &&
        sectionData.email && 
        sectionData.email.trim() !== '';
    } else if (Array.isArray(sectionData)) {
      isComplete = sectionData.length > 0;
    } else if (sectionData && typeof sectionData === 'object') {
      isComplete = Object.keys(sectionData).some(key => sectionData[key]);
    }

    const hasParsedData = currentResume?.uploadedResume?.parsedData && 
                         currentResume.uploadedResume.parsedData[section.id];

    return (
      <View key={section.id} style={styles.sectionWrapper}>
        <TouchableOpacity
          style={[styles.sectionCard, isComplete && styles.sectionCardComplete]}
          onPress={() => toggleSection(section.id)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={section.gradient}
            style={styles.sectionIconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={section.icon} size={22} color="#fff" />
          </LinearGradient>
          
          <View style={styles.sectionInfo}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {isComplete && (
                <View style={styles.completeBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#2ECC71" />
                  <Text style={styles.completeBadgeText}>Complete</Text>
                </View>
              )}
            </View>
            {isArraySection && itemCount > 0 && (
              <Text style={styles.itemCountText}>{itemCount} item{itemCount > 1 ? 's' : ''}</Text>
            )}
            {hasParsedData && (
              <Text style={styles.parsedBadge}>📄 Parsed from upload</Text>
            )}
          </View>
          
          <View style={styles.sectionActions}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openSectionModal(section)}
            >
              <Ionicons name="add-circle" size={28} color={section.color} />
            </TouchableOpacity>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={22} 
              color="#999" 
            />
          </View>
        </TouchableOpacity>

        {/* Expandable Items List */}
        {isArraySection && Array.isArray(sectionData) && sectionData.length > 0 && isExpanded && (
          <Animated.View style={styles.itemsListContainer}>
            {sectionData.map((item, index) => {
              let displayText = '';
              let subText = '';
              let icon = 'documents-outline';
              
              switch(section.id) {
                case 'education':
                  displayText = item.institution || '';
                  subText = item.degree || '';
                  icon = 'school-outline';
                  break;
                case 'skills':
                  displayText = item.name || '';
                  subText = item.level || '';
                  icon = 'bulb-outline';
                  break;
                case 'workExperience':
                  displayText = item.position || '';
                  subText = item.company || '';
                  icon = 'briefcase-outline';
                  break;
                case 'certifications':
                  displayText = item.name || '';
                  subText = item.organization || '';
                  icon = 'ribbon-outline';
                  break;
                case 'projects':
                  displayText = item.name || '';
                  subText = item.technologies?.join(', ') || '';
                  icon = 'code-outline';
                  break;
                case 'languages':
                  displayText = item.name || '';
                  subText = item.proficiency || '';
                  icon = 'language-outline';
                  break;
                case 'references':
                  displayText = item.name || '';
                  subText = item.position || '';
                  icon = 'people-outline';
                  break;
                default:
                  displayText = item.name || '';
              }
              
              return (
                <View key={index} style={styles.itemRow}>
                  <TouchableOpacity
                    style={styles.itemRowContent}
                    onPress={() => openSectionModal(section, index)}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: section.color + '20' }]}>
                      <Ionicons name={icon} size={16} color={section.color} />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemRowText}>{displayText || 'Untitled'}</Text>
                      {subText ? (
                        <Text style={styles.itemRowSubtext}>{subText}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteItemButton}
                    onPress={() => deleteSectionItem(section.id, index)}
                  >
                    <Ionicons name="close-circle" size={22} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </Animated.View>
        )}
      </View>
    );
  };

  // Render target job item
  const renderTargetJobItem = ({ item, index }) => (
    <View style={styles.targetJobItem}>
      <TouchableOpacity
        style={styles.targetJobItemContent}
        onPress={() => openTargetJobModal(index)}
      >
        <View style={styles.targetJobItemHeader}>
          <Text style={styles.targetJobItemTitle}>{item.jobTitle}</Text>
          <View style={[styles.targetJobItemBadge, { backgroundColor: '#4A90D9' }]}>
            <Text style={styles.targetJobItemBadgeText}>{item.jobType}</Text>
          </View>
        </View>
        <Text style={styles.targetJobItemIndustry}>{item.industry}</Text>
        {item.location && (
          <Text style={styles.targetJobItemLocation}>
            <Ionicons name="location-outline" size={12} color="#666" /> {item.location}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteItemButton}
        onPress={() => deleteTargetJob(index)}
      >
        <Ionicons name="close-circle" size={22} color="#E74C3C" />
      </TouchableOpacity>
    </View>
  );

  if (loading || uploading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          {uploadProgress > 0 && (
            <>
              <Text style={styles.loadingText}>Uploading... {Math.round(uploadProgress)}%</Text>
              <View style={styles.loadingProgressBar}>
                <View 
                  style={[
                    styles.loadingProgressFill, 
                    { width: `${uploadProgress}%` }
                  ]} 
                />
              </View>
            </>
          )}
          {uploadStatus && !uploadProgress && (
            <Text style={styles.loadingText}>{uploadStatus}</Text>
          )}
          {!uploadProgress && !uploadStatus && (
            <Text style={styles.loadingText}>Saving resume...</Text>
          )}
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
              <Ionicons name="arrow-back" size={24} color="#2c3e50" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Resume Builder</Text>
              <Text style={styles.headerSubtitle}>
                {currentResume ? 'Update your resume sections' : 'Create your professional resume'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={handleUploadResume}
              disabled={uploading}
            >
              <LinearGradient
                colors={['#000', '#f9c349']}
                style={styles.uploadButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadButtonText}>Upload</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Upload Status */}
          {uploadStatus && (
            <View style={[
              styles.uploadStatusContainer,
              uploadStatus.includes('✅') && styles.uploadStatusSuccess,
              uploadStatus.includes('❌') && styles.uploadStatusError
            ]}>
              <Text style={styles.uploadStatusText}>
                {uploadStatus}
              </Text>
            </View>
          )}

          {/* Completion Progress */}
          {currentResume && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <View style={styles.progressLeft}>
                  <Ionicons name="stats-chart-outline" size={18} color="#f9c349" />
                  <Text style={styles.progressLabel}>Completion</Text>
                </View>
                <Text style={styles.progressPercentage}>
                  {currentResume.completionPercentage || 0}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${currentResume.completionPercentage || 0}%` }
                  ]} 
                />
              </View>
              {currentResume.uploadedResume?.fileName && (
                <Text style={styles.uploadedFileName}>
                  📄 Uploaded: {currentResume.uploadedResume.fileName}
                </Text>
              )}
            </View>
          )}

          {/* Sections */}
          <View style={styles.sectionsContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionGroupTitle}>Resume Sections</Text>
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCountText}>{sections.length}</Text>
              </View>
            </View>
            {sections.map(renderSectionCard)}
          </View>

          {/* Target Jobs Section */}
          <View style={styles.targetJobContainer}>
            <TouchableOpacity
              style={styles.targetJobHeader}
              onPress={() => setShowTargetJob(!showTargetJob)}
              activeOpacity={0.8}
            >
              <View style={styles.targetJobTitleContainer}>
                <View style={styles.targetJobIcon}>
                  <Ionicons name="briefcase-outline" size={22} color="#fff" />
                </View>
                <Text style={styles.targetJobTitle}>Target Jobs</Text>
                {targetJobs.length > 0 && (
                  <View style={styles.targetJobCount}>
                    <Text style={styles.targetJobCountText}>{targetJobs.length}</Text>
                  </View>
                )}
              </View>
              <View style={styles.targetJobHeaderActions}>
                <TouchableOpacity
                  style={styles.addTargetJobButton}
                  onPress={() => openTargetJobModal()}
                >
                  <Ionicons name="add-circle" size={28} color="#f9c349" />
                </TouchableOpacity>
                <Ionicons 
                  name={showTargetJob ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color="#fff" 
                />
              </View>
            </TouchableOpacity>

            {showTargetJob && (
              <View style={styles.targetJobForm}>
                {targetJobs.length > 0 ? (
                  <FlatList
                    data={targetJobs}
                    renderItem={renderTargetJobItem}
                    keyExtractor={(item, index) => `target-job-${index}`}
                    scrollEnabled={false}
                    style={styles.targetJobsList}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.addTargetJobEmpty}
                    onPress={() => openTargetJobModal()}
                  >
                    <Ionicons name="add-circle-outline" size={50} color="#f9c349" />
                    <Text style={styles.addTargetJobEmptyText}>Add Target Job</Text>
                    <Text style={styles.addTargetJobEmptySubtext}>
                      Specify your dream job to get personalized recommendations
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>

      {/* Modal for section data */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingIndex !== null ? `Edit ${selectedSection?.title}` : `Add ${selectedSection?.title}`}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedSection?.fields.map((field) => (
                <View key={field.key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {field.label}
                    {field.required && <Text style={styles.requiredStar}> *</Text>}
                  </Text>
                  
                  {field.type === 'textarea' ? (
                    <TextInput
                      style={[styles.input, styles.textarea]}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      value={formData[field.key] || ''}
                      onChangeText={(text) => handleInputChange(field.key, text)}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      placeholderTextColor="#999"
                    />
                  ) : field.type === 'select' ? (
                    <View style={styles.selectContainer}>
                      {field.options.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.selectOption,
                            formData[field.key] === option && styles.selectOptionActive
                          ]}
                          onPress={() => handleInputChange(field.key, option)}
                        >
                          <Text style={[
                            styles.selectOptionText,
                            formData[field.key] === option && styles.selectOptionTextActive
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : field.type === 'checkbox' ? (
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => handleInputChange(field.key, !formData[field.key])}
                    >
                      <View style={[
                        styles.checkbox,
                        formData[field.key] && styles.checkboxChecked
                      ]}>
                        {formData[field.key] && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>Yes</Text>
                    </TouchableOpacity>
                  ) : field.type === 'date' ? (
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => {
                        setDatePickerField(field.key);
                        setShowDatePicker(true);
                      }}
                    >
                      <Text style={styles.dateButtonText}>
                        {formData[field.key] instanceof Date 
                          ? formData[field.key].toLocaleDateString() 
                          : 'Select Date'}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color="#f9c349" />
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      value={formData[field.key] || ''}
                      onChangeText={(text) => handleInputChange(field.key, text)}
                      keyboardType={
                        field.type === 'email' ? 'email-address' :
                        field.type === 'phone' ? 'phone-pad' :
                        field.type === 'number' ? 'numeric' :
                        field.type === 'url' ? 'url' :
                        'default'
                      }
                      autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
                      placeholderTextColor="#999"
                    />
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={saveSectionData}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#000', '#f9c349']}
                  style={styles.modalSaveGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveText}>
                      {editingIndex !== null ? 'Update' : 'Add'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData[datePickerField] instanceof Date ? formData[datePickerField] : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Target Job Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={targetJobModalVisible}
        onRequestClose={() => setTargetJobModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTargetJobIndex !== null ? 'Edit Target Job' : 'Add Target Job'}
              </Text>
              <TouchableOpacity
                onPress={() => setTargetJobModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Job Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Software Engineer"
                  value={targetJobForm.jobTitle}
                  onChangeText={(text) => handleTargetJobInputChange('jobTitle', text)}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Industry *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Technology, Healthcare"
                  value={targetJobForm.industry}
                  onChangeText={(text) => handleTargetJobInputChange('industry', text)}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Job Type *</Text>
                <View style={styles.jobTypeContainer}>
                  {['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.jobTypeButton,
                        targetJobForm.jobType === type && styles.jobTypeButtonActive
                      ]}
                      onPress={() => handleTargetJobInputChange('jobType', type)}
                    >
                      <Text style={[
                        styles.jobTypeText,
                        targetJobForm.jobType === type && styles.jobTypeTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., New York, Remote"
                  value={targetJobForm.location}
                  onChangeText={(text) => handleTargetJobInputChange('location', text)}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Desired Salary</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., $80,000 - $100,000"
                  value={targetJobForm.desiredSalary}
                  onChangeText={(text) => handleTargetJobInputChange('desiredSalary', text)}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Availability</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Immediately, 2 weeks notice"
                  value={targetJobForm.availability}
                  onChangeText={(text) => handleTargetJobInputChange('availability', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setTargetJobModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={saveTargetJob}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#000', '#f9c349']}
                  style={styles.modalSaveGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveText}>
                      {editingTargetJobIndex !== null ? 'Update' : 'Add'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  loadingProgressBar: {
    width: '80%',
    height: 6,
    backgroundColor: '#e8f0fe',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  loadingProgressFill: {
    height: '100%',
    backgroundColor: '#f9c349',
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  uploadButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  uploadStatusContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f0fe',
  },
  uploadStatusSuccess: {
    borderColor: '#2ECC71',
    backgroundColor: '#f0faf4',
  },
  uploadStatusError: {
    borderColor: '#E74C3C',
    backgroundColor: '#fdf0f0',
  },
  uploadStatusText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  progressContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f9c349',
    borderRadius: 3,
  },
  uploadedFileName: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  sectionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionGroupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  sectionCountBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sectionCountText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sectionWrapper: {
    marginBottom: 8,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionCardComplete: {
    borderLeftWidth: 3,
    borderLeftColor: '#2ECC71',
  },
  sectionIconGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#f0faf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  completeBadgeText: {
    fontSize: 10,
    color: '#2ECC71',
    marginLeft: 2,
    fontWeight: '500',
  },
  itemCountText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  parsedBadge: {
    fontSize: 11,
    color: '#4A90D9',
    marginTop: 2,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    marginRight: 8,
  },
  itemsListContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemRowText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  itemRowSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  deleteItemButton: {
    padding: 4,
    marginLeft: 8,
  },
  targetJobContainer: {
    backgroundColor: '#000',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  targetJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  targetJobTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetJobIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249, 195, 73, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetJobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  targetJobCount: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  targetJobCountText: {
    fontSize: 11,
    color: '#000',
    fontWeight: '700',
  },
  targetJobHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addTargetJobButton: {
    marginRight: 8,
  },
  targetJobForm: {
    padding: 16,
  },
  targetJobsList: {
    marginTop: 4,
  },
  targetJobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  targetJobItemContent: {
    flex: 1,
  },
  targetJobItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetJobItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  targetJobItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  targetJobItemBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  targetJobItemIndustry: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  targetJobItemLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  addTargetJobEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  addTargetJobEmptyText: {
    fontSize: 16,
    color: '#f9c349',
    marginTop: 12,
    fontWeight: '600',
  },
  addTargetJobEmptySubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 5,
  },
  requiredStar: {
    color: '#E74C3C',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    backgroundColor: '#fafafa',
    color: '#000',
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
  },
  selectOptionActive: {
    backgroundColor: '#000',
    borderColor: '#f9c349',
  },
  selectOptionText: {
    fontSize: 13,
    color: '#666',
  },
  selectOptionTextActive: {
    color: '#f9c349',
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#000',
    borderColor: '#f9c349',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#2c3e50',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#fafafa',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  jobTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  jobTypeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
  },
  jobTypeButtonActive: {
    backgroundColor: '#000',
    borderColor: '#f9c349',
  },
  jobTypeText: {
    fontSize: 13,
    color: '#666',
  },
  jobTypeTextActive: {
    color: '#f9c349',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: height * 0.6,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalCancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  modalSaveButton: {
    marginLeft: 8,
    overflow: 'hidden',
  },
  modalSaveGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResumeBuilderScreen;