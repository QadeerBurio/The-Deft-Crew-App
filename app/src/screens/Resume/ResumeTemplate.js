// app/src/screens/Resume/ResumeTemplateScreen.js
import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ResumeContext } from '../../context/ResumeContext';
import { AuthContext } from '../../context/AuthContext';
import { renderResumeHTML } from '../../services/templateService';

// Use WebView only on native platforms
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const ResumeTemplateScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId } = route.params || {};
  const { user, isGuest } = useContext(AuthContext);
  const { 
    resumes, 
    currentResume, 
    updateTemplate, 
    loading,
    loadResume 
  } = useContext(ResumeContext);

  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [resume, setResume] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewHTML, setPreviewHTML] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Template definitions
  const templates = [
    {
      id: 'modern',
      name: 'Modern',
      description: 'Clean and contemporary design with a professional look',
      icon: 'grid-outline',
      colors: ['#4A90D9', '#2c3e50', '#ffffff'],
      previewColors: ['#4A90D9', '#f0f2f5', '#2c3e50'],
      features: ['Professional', 'Clean Layout', 'Color Accents']
    },
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional resume format with timeless elegance',
      icon: 'book-outline',
      colors: ['#2c3e50', '#34495e', '#ffffff'],
      previewColors: ['#2c3e50', '#f8f9fa', '#34495e'],
      features: ['Traditional', 'Elegant', 'Professional']
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Bold and artistic design for creative professionals',
      icon: 'color-palette-outline',
      colors: ['#9B59B6', '#E74C3C', '#F39C12'],
      previewColors: ['#9B59B6', '#fef9e7', '#E74C3C'],
      features: ['Artistic', 'Bold Colors', 'Unique Layout']
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simple and clean design focusing on content',
      icon: 'remove-outline',
      colors: ['#2c3e50', '#7f8c8d', '#ffffff'],
      previewColors: ['#2c3e50', '#ffffff', '#ecf0f1'],
      features: ['Simple', 'Content Focused', 'Clean']
    },
    {
      id: 'professional',
      name: 'Executive',
      description: 'Executive-level design for senior positions',
      icon: 'business-outline',
      colors: ['#1a237e', '#0d47a1', '#ffffff'],
      previewColors: ['#1a237e', '#e8eaf6', '#0d47a1'],
      features: ['Executive', 'Premium', 'Sophisticated']
    }
  ];

  useEffect(() => {
    if (resumeId) {
      const found = loadResume(resumeId) || resumes.find(r => r._id === resumeId);
      if (found) {
        setResume(found);
        setSelectedTemplate(found.template || 'modern');
      }
    } else if (resumes.length > 0) {
      setResume(resumes[0]);
      setSelectedTemplate(resumes[0].template || 'modern');
    }
  }, [resumeId, resumes]);

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplate(templateId);
  };

  const handleApplyTemplate = async () => {
    if (!resume) {
      Alert.alert('Error', 'No resume selected');
      return;
    }

    setIsApplying(true);
    try {
      const updated = await updateTemplate(resume._id, selectedTemplate);
      if (updated) {
        setResume(updated);
        Alert.alert(
          '✅ Success', 
          'Template applied successfully!',
          [
            { 
              text: 'View Resume', 
              onPress: () => navigation.navigate('ResumeView', { resumeId: resume._id })
            },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to apply template');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to apply template');
    } finally {
      setIsApplying(false);
    }
  };

  // Helper function to format resume data for template service
  const formatResumeForTemplate = (resumeData) => {
    if (!resumeData) return null;

    // Ensure all fields exist with proper structure
    return {
      personalInfo: {
        firstName: resumeData.personalInfo?.firstName || '',
        lastName: resumeData.personalInfo?.lastName || '',
        email: resumeData.personalInfo?.email || '',
        phone: resumeData.personalInfo?.phone || '',
        linkedin: resumeData.personalInfo?.linkedin || '',
        github: resumeData.personalInfo?.github || '',
        portfolio: resumeData.personalInfo?.portfolio || '',
        address: resumeData.personalInfo?.address || '',
        city: resumeData.personalInfo?.city || '',
        state: resumeData.personalInfo?.state || '',
        country: resumeData.personalInfo?.country || '',
        zipCode: resumeData.personalInfo?.zipCode || '',
      },
      professionalSummary: {
        title: resumeData.professionalSummary?.title || '',
        summary: resumeData.professionalSummary?.summary || '',
        experienceLevel: resumeData.professionalSummary?.experienceLevel || '',
      },
      workExperience: Array.isArray(resumeData.workExperience) ? resumeData.workExperience.map(work => ({
        company: work.company || '',
        position: work.position || '',
        location: work.location || '',
        startDate: work.startDate || '',
        endDate: work.endDate || '',
        current: work.current || false,
        description: work.description || '',
        achievements: Array.isArray(work.achievements) ? work.achievements : [],
      })) : [],
      education: Array.isArray(resumeData.education) ? resumeData.education.map(edu => ({
        institution: edu.institution || '',
        degree: edu.degree || '',
        fieldOfStudy: edu.fieldOfStudy || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        current: edu.current || false,
        gpa: edu.gpa || '',
        description: edu.description || '',
      })) : [],
      skills: Array.isArray(resumeData.skills) ? resumeData.skills.map(skill => ({
        name: skill.name || '',
        level: skill.level || 'intermediate',
      })) : [],
      certifications: Array.isArray(resumeData.certifications) ? resumeData.certifications.map(cert => ({
        name: cert.name || '',
        organization: cert.organization || '',
        issueDate: cert.issueDate || '',
        expiryDate: cert.expiryDate || '',
      })) : [],
      projects: Array.isArray(resumeData.projects) ? resumeData.projects.map(project => ({
        name: project.name || '',
        description: project.description || '',
        technologies: Array.isArray(project.technologies) ? project.technologies : [],
        url: project.url || '',
        githubUrl: project.githubUrl || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
      })) : [],
      languages: Array.isArray(resumeData.languages) ? resumeData.languages.map(lang => ({
        name: lang.name || '',
        proficiency: lang.proficiency || '',
      })) : [],
      targetJobs: Array.isArray(resumeData.targetJobs) ? resumeData.targetJobs.map(job => ({
        jobTitle: job.jobTitle || '',
        industry: job.industry || '',
        location: job.location || '',
        jobType: job.jobType || '',
        desiredSalary: job.desiredSalary || '',
        availability: job.availability || '',
      })) : [],
      targetJob: resumeData.targetJob ? {
        jobTitle: resumeData.targetJob.jobTitle || '',
        industry: resumeData.targetJob.industry || '',
        location: resumeData.targetJob.location || '',
        jobType: resumeData.targetJob.jobType || '',
        desiredSalary: resumeData.targetJob.desiredSalary || '',
        availability: resumeData.targetJob.availability || '',
      } : null,
      customStyles: resumeData.customStyles || {},
    };
  };

  const handlePreviewTemplate = async (template) => {
    if (!resume) {
      Alert.alert('Error', 'No resume data available for preview');
      return;
    }

    setPreviewTemplate(template);
    setShowPreview(true);
    setIsGeneratingPreview(true);

    try {
      // Format the resume data for the template service
      const formattedResume = formatResumeForTemplate(resume);
      
      // Generate the actual HTML using the template service
      const html = renderResumeHTML(formattedResume, template.id, formattedResume.customStyles || {});
      setPreviewHTML(html);
    } catch (error) {
      console.error('Error generating preview:', error);
      Alert.alert('Error', 'Failed to generate template preview: ' + error.message);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const renderTemplateCard = ({ item }) => {
    const isSelected = selectedTemplate === item.id;
    const isApplied = resume?.template === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.templateCard,
          isSelected && styles.templateCardSelected,
          isApplied && styles.templateCardApplied
        ]}
        onPress={() => handleSelectTemplate(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.templatePreview}>
          <View style={styles.templatePreviewHeader}>
            <View style={[styles.templateColorBar, { backgroundColor: item.colors[0] }]} />
            <View style={[styles.templateColorBar, { backgroundColor: item.colors[1] }]} />
          </View>
          <View style={styles.templatePreviewContent}>
            <View style={styles.templatePreviewAvatar} />
            <View style={styles.templatePreviewLine} />
            <View style={[styles.templatePreviewLine, { width: '60%' }]} />
          </View>
          <View style={styles.templatePreviewFooter}>
            <View style={[styles.templatePreviewDot, { backgroundColor: item.colors[0] }]} />
            <View style={[styles.templatePreviewDot, { backgroundColor: item.colors[1] }]} />
            <View style={[styles.templatePreviewDot, { backgroundColor: item.colors[2] }]} />
          </View>
        </View>

        <View style={styles.templateInfo}>
          <View style={styles.templateNameContainer}>
            <Text style={styles.templateName}>{item.name}</Text>
            {isApplied && (
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedBadgeText}>Applied</Text>
              </View>
            )}
          </View>
          <Text style={styles.templateDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.templateFeatures}>
            {item.features.map((feature, index) => (
              <View key={index} style={styles.featureTag}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.templateActions}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => handlePreviewTemplate(item)}
          >
            <Ionicons name="eye-outline" size={18} color="#4A90D9" />
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.selectButton,
              isSelected && styles.selectButtonActive
            ]}
            onPress={() => handleSelectTemplate(item.id)}
          >
            <Text style={[
              styles.selectButtonText,
              isSelected && styles.selectButtonTextActive
            ]}>
              {isSelected ? 'Selected' : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTemplatePreviewModal = () => {
    if (!previewTemplate) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPreview}
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {previewTemplate.name} Template Preview
              </Text>
              <TouchableOpacity
                onPress={() => setShowPreview(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {isGeneratingPreview ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4A90D9" />
                  <Text style={styles.loadingText}>Generating preview...</Text>
                </View>
              ) : previewHTML ? (
                <WebView
                  originWhitelist={['*']}
                  source={{ html: previewHTML }}
                  style={styles.webview}
                  scalesPageToFit={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#4A90D9" />
                      <Text style={styles.loadingText}>Loading preview...</Text>
                    </View>
                  )}
                />
              ) : (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>No preview available</Text>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowPreview(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalApplyButton]}
                onPress={() => {
                  setShowPreview(false);
                  handleSelectTemplate(previewTemplate.id);
                }}
              >
                <Text style={styles.modalApplyText}>Use This Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading || isApplying) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>
          {isApplying ? 'Applying template...' : 'Loading templates...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Template</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.resumeInfo}>
        <Text style={styles.resumeInfoText}>
          Resume: {resume?.personalInfo?.firstName || 'Untitled'} {resume?.personalInfo?.lastName || ''}
        </Text>
        <Text style={styles.resumeInfoSubtext}>
          Select a template that best represents your professional style
        </Text>
        <View style={styles.currentTemplateBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#2ECC71" />
          <Text style={styles.currentTemplateText}>
            Current: {templates.find(t => t.id === resume?.template)?.name || 'Modern'}
          </Text>
        </View>
      </View>

      <FlatList
        data={templates}
        renderItem={renderTemplateCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.templatesList}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[
            styles.applyButton,
            (!resume || resume?.template === selectedTemplate) && styles.applyButtonDisabled
          ]}
          onPress={handleApplyTemplate}
          disabled={!resume || resume?.template === selectedTemplate || isApplying}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.applyButtonText}>
            {resume?.template === selectedTemplate ? 'Template Already Applied' : 'Apply Template'}
          </Text>
        </TouchableOpacity>
      </View>

      {renderTemplatePreviewModal()}
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
  resumeInfo: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resumeInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  resumeInfoSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  currentTemplateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  currentTemplateText: {
    fontSize: 12,
    color: '#2ECC71',
    marginLeft: 4,
    fontWeight: '500',
  },
  templatesList: {
    padding: 12,
    paddingBottom: 80,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardSelected: {
    borderColor: '#4A90D9',
    backgroundColor: '#f0f7ff',
  },
  templateCardApplied: {
    borderColor: '#2ECC71',
    backgroundColor: '#f0faf4',
  },
  templatePreview: {
    height: 100,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  templatePreviewHeader: {
    flexDirection: 'row',
    height: 20,
  },
  templateColorBar: {
    flex: 1,
  },
  templatePreviewContent: {
    padding: 12,
    alignItems: 'center',
  },
  templatePreviewAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    marginBottom: 6,
  },
  templatePreviewLine: {
    height: 4,
    width: '80%',
    backgroundColor: '#ddd',
    borderRadius: 2,
    marginBottom: 4,
  },
  templatePreviewFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  templatePreviewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  templateInfo: {
    flex: 1,
  },
  templateNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  appliedBadge: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  appliedBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  templateDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  templateFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureTag: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 11,
    color: '#4A90D9',
  },
  templateActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f7ff',
  },
  previewButtonText: {
    fontSize: 13,
    color: '#4A90D9',
    marginLeft: 4,
  },
  selectButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#f0f2f5',
  },
  selectButtonActive: {
    backgroundColor: '#4A90D9',
  },
  selectButtonText: {
    fontSize: 13,
    color: '#666',
  },
  selectButtonTextActive: {
    color: '#fff',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
    paddingVertical: 14,
    borderRadius: 8,
  },
  applyButtonDisabled: {
    backgroundColor: '#b0c4de',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width - 1,
    height:600,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    minHeight: 300,
    maxHeight: height - 100,
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
    
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  modalApplyButton: {
    backgroundColor: '#4A90D9',
    marginLeft: 8,
  },
  modalApplyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ResumeTemplateScreen;