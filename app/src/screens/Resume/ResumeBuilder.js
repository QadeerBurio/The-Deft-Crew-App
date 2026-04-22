import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, 
   Platform, StatusBar, KeyboardAvoidingView, Modal, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { resumeAPI } from '../../api/api';

const ResumeBuilder = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    portfolio: '',
    summary: '',
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    languages: [],
    skills: []
  });

  const [skillsInput, setSkillsInput] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [tempData, setTempData] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [touchedFields, setTouchedFields] = useState({});

  useEffect(() => {
    if (route.params?.resumeData) {
      setFormData(route.params.resumeData);
    } else {
      fetchResume();
    }
  }, []);

  const fetchResume = async () => {
    try {
      setLoading(true);
      const response = await resumeAPI.getResume();
      if (response.data && Object.keys(response.data).length > 0) {
        setFormData(response.data);
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
    } finally {
      setLoading(false);
    }
  };

  // Validation functions matching backend validators
  const validateFullName = (name) => {
    if (!name || name.trim() === '') {
      return 'Full name is required';
    }
    if (name.length > 100) {
      return 'Name cannot exceed 100 characters';
    }
    return '';
  };

  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return 'Email is required';
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email (e.g., name@example.com)';
    }
    return '';
  };

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') {
      return 'Phone number is required';
    }
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(phone)) {
      return 'Please enter a valid phone number (minimum 10 digits)';
    }
    return '';
  };

  const validateLinkedIn = (url) => {
    if (!url || url.trim() === '') {
      return ''; // Optional field
    }
    const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/;
    if (!linkedinRegex.test(url)) {
      return 'Please enter a valid LinkedIn URL (e.g., linkedin.com/in/username)';
    }
    return '';
  };

  const validateGitHub = (url) => {
    if (!url || url.trim() === '') {
      return ''; // Optional field
    }
    const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/.*$/;
    if (!githubRegex.test(url)) {
      return 'Please enter a valid GitHub URL (e.g., github.com/username)';
    }
    return '';
  };

  const validatePortfolio = (url) => {
    if (!url || url.trim() === '') {
      return ''; // Optional field
    }
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    if (!urlRegex.test(url)) {
      return 'Please enter a valid URL (e.g., https://yourwebsite.com)';
    }
    return '';
  };

  const validateSummary = (summary) => {
    if (summary && summary.length > 500) {
      return 'Summary cannot exceed 500 characters';
    }
    return '';
  };

  const validateLanguageLevel = (level) => {
    const validLevels = ['Basic', 'Conversational', 'Professional', 'Native'];
    if (!level) return 'Proficiency level is required';
    const capitalized = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
    if (!validLevels.includes(capitalized)) {
      return 'Proficiency must be: Basic, Conversational, Professional, or Native';
    }
    return '';
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'fullName':
        return validateFullName(value);
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      case 'linkedin':
        return validateLinkedIn(value);
      case 'github':
        return validateGitHub(value);
      case 'portfolio':
        return validatePortfolio(value);
      case 'summary':
        return validateSummary(value);
      default:
        return '';
    }
  };

  const handleContactChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleFieldBlur = (field) => {
    setTouchedFields({ ...touchedFields, [field]: true });
    const error = validateField(field, formData[field]);
    if (error) {
      setErrors({ ...errors, [field]: error });
    } else {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const addSkill = () => {
    if (skillsInput.trim()) {
      if (!formData.skills.includes(skillsInput.trim())) {
        setFormData({
          ...formData,
          skills: [...formData.skills, skillsInput.trim()]
        });
        setSkillsInput('');
      }
    }
  };

  const removeSkill = (index) => {
    const newSkills = [...formData.skills];
    newSkills.splice(index, 1);
    setFormData({ ...formData, skills: newSkills });
  };

  const openModal = (section, index = null) => {
    const sectionKey = section.toLowerCase();
    
    if ((section === 'Certifications' || section === 'Languages') && formData[sectionKey].length >= 5 && index === null) {
      Alert.alert("Limit Reached", `You can only add a maximum of 5 ${section}.`);
      return;
    }

    setActiveSection(section);
    setEditingIndex(index);
    
    if (index !== null) {
      setTempData({ ...formData[sectionKey][index] });
    } else {
      setTempData({});
    }
    
    setModalVisible(true);
  };

  const saveSectionData = () => {
    const sectionKey = activeSection.toLowerCase();
    
    // Validate language level if adding/editing languages
    if (activeSection === 'Languages') {
      const levelError = validateLanguageLevel(tempData.level);
      if (levelError) {
        Alert.alert('Validation Error', levelError);
        return;
      }
    }
    
    // Validate required fields for each section
    if (activeSection === 'Education') {
      if (!tempData.school || !tempData.degree || !tempData.startDate || !tempData.endDate) {
        Alert.alert('Missing Fields', 'Please fill in all required fields (*)');
        return;
      }
    }
    
    if (activeSection === 'Experience') {
      if (!tempData.company || !tempData.title || !tempData.startDate || !tempData.endDate) {
        Alert.alert('Missing Fields', 'Please fill in all required fields (*)');
        return;
      }
    }
    
    if (activeSection === 'Certifications') {
      if (!tempData.name || !tempData.issuer || !tempData.date) {
        Alert.alert('Missing Fields', 'Please fill in all required fields (*)');
        return;
      }
    }
    
    if (activeSection === 'Languages') {
      if (!tempData.language || !tempData.level) {
        Alert.alert('Missing Fields', 'Please fill in all required fields (*)');
        return;
      }
    }
    
    let newData = [...formData[sectionKey]];
    
    if (editingIndex !== null) {
      newData[editingIndex] = tempData;
    } else {
      newData.push(tempData);
    }
    
    setFormData({
      ...formData,
      [sectionKey]: newData
    });
    setModalVisible(false);
    setEditingIndex(null);
  };

  const deleteSectionItem = (section, index) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const sectionKey = section.toLowerCase();
            const newData = [...formData[sectionKey]];
            newData.splice(index, 1);
            setFormData({ ...formData, [sectionKey]: newData });
          }
        }
      ]
    );
  };

  const handleAIImprove = async () => {
    if (!formData.summary || formData.summary.length < 20) {
      Alert.alert('Info', 'Please write a summary first (minimum 20 characters)');
      return;
    }
    
    setAiLoading(true);
    try {
      const response = await resumeAPI.aiImprove(formData.summary, 'summary');
      if (response.data.improved) {
        Alert.alert(
          'AI Improvement',
          'Would you like to use this improved version?',
          [
            { text: 'No', style: 'cancel' },
            { 
              text: 'Yes', 
              onPress: () => setFormData({ ...formData, summary: response.data.improved })
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to improve text. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    newErrors.fullName = validateFullName(formData.fullName);
    newErrors.email = validateEmail(formData.email);
    newErrors.phone = validatePhone(formData.phone);
    newErrors.linkedin = validateLinkedIn(formData.linkedin);
    newErrors.github = validateGitHub(formData.github);
    newErrors.portfolio = validatePortfolio(formData.portfolio);
    newErrors.summary = validateSummary(formData.summary);
    
    setErrors(newErrors);
    
    // Mark all fields as touched to show errors
    const allFieldsTouched = {
      fullName: true,
      email: true,
      phone: true,
      linkedin: true,
      github: true,
      portfolio: true,
      summary: true
    };
    setTouchedFields(allFieldsTouched);
    
    // Check if there are any errors
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors marked in red before saving');
      return;
    }

    setLoading(true);
    try {
      await resumeAPI.saveResume(formData);
      Alert.alert('Success', 'Resume saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
      if (error.response?.data?.details) {
        const serverErrors = error.response.data.details;
        Alert.alert('Validation Error', Object.values(serverErrors).join('\n'));
      } else {
        Alert.alert('Error', error.response?.data?.error || 'Failed to save resume. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderModalFields = () => {
    switch (activeSection) {
      case 'Education':
        return (
          <>
            <Text style={styles.modalLabel}>University/School Name *</Text>
            <TextInput style={styles.modalInput} placeholder="e.g., Stanford University" value={tempData.school} onChangeText={(v) => setTempData({...tempData, school: v})} />
            
            <Text style={styles.modalLabel}>Degree *</Text>
            <TextInput style={styles.modalInput} placeholder="e.g., BS Computer Science" value={tempData.degree} onChangeText={(v) => setTempData({...tempData, degree: v})} />
            
            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.modalLabel}>Start Date *</Text>
                <TextInput style={styles.modalInput} placeholder="e.g., 2020" value={tempData.startDate} onChangeText={(v) => setTempData({...tempData, startDate: v})} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.modalLabel}>End Date *</Text>
                <TextInput style={styles.modalInput} placeholder="e.g., 2024" value={tempData.endDate} onChangeText={(v) => setTempData({...tempData, endDate: v})} />
              </View>
            </View>
            
            <Text style={styles.modalLabel}>Description (optional)</Text>
            <TextInput style={[styles.modalInput, {height: 80}]} multiline placeholder="Describe your studies, achievements, etc." value={tempData.description} onChangeText={(v) => setTempData({...tempData, description: v})} />
          </>
        );
      case 'Experience':
        return (
          <>
            <Text style={styles.modalLabel}>Company Name *</Text>
            <TextInput style={styles.modalInput} placeholder="e.g., Google, Microsoft" value={tempData.company} onChangeText={(v) => setTempData({...tempData, company: v})} />
            
            <Text style={styles.modalLabel}>Job Title *</Text>
            <TextInput style={styles.modalInput} placeholder="e.g., Software Engineer" value={tempData.title} onChangeText={(v) => setTempData({...tempData, title: v})} />
            
            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.modalLabel}>Start Date *</Text>
                <TextInput style={styles.modalInput} placeholder="e.g., Jan 2022" value={tempData.startDate} onChangeText={(v) => setTempData({...tempData, startDate: v})} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.modalLabel}>End Date *</Text>
                <TextInput style={styles.modalInput} placeholder="e.g., Present" value={tempData.endDate} onChangeText={(v) => setTempData({...tempData, endDate: v})} />
              </View>
            </View>
            
            <Text style={styles.modalLabel}>Role Description *</Text>
            <TextInput style={[styles.modalInput, {height: 100}]} multiline placeholder="Describe your responsibilities and achievements" value={tempData.desc} onChangeText={(v) => setTempData({...tempData, desc: v})} />
          </>
        );
      case 'Certifications':
        return (
          <>
            <Text style={styles.modalLabel}>Certificate Name *</Text>
            <TextInput style={styles.modalInput} placeholder="e.g., AWS Certified Solutions Architect" value={tempData.name} onChangeText={(v) => setTempData({...tempData, name: v})} />
            
            <Text style={styles.modalLabel}>Issuing Organization *</Text>
            <TextInput style={styles.modalInput} placeholder="e.g., Amazon, Google, Microsoft" value={tempData.issuer} onChangeText={(v) => setTempData({...tempData, issuer: v})} />
            
            <Text style={styles.modalLabel}>Date Obtained *</Text>
            <TextInput style={styles.modalInput} placeholder="e.g., June 2023" value={tempData.date} onChangeText={(v) => setTempData({...tempData, date: v})} />
          </>
        );
      case 'Languages':
        return (
          <>
            <Text style={styles.modalLabel}>Language *</Text>
            <TextInput style={styles.modalInput} placeholder="e.g., English, Spanish, Mandarin" value={tempData.language} onChangeText={(v) => setTempData({...tempData, language: v})} />
            
            <Text style={styles.modalLabel}>Proficiency Level *</Text>
            <TextInput 
              style={[styles.modalInput, tempData.level && validateLanguageLevel(tempData.level) ? styles.inputError : null]} 
              placeholder="Basic / Conversational / Professional / Native" 
              value={tempData.level} 
              onChangeText={(v) => {
                setTempData({...tempData, level: v});
              }}
            />
            {tempData.level && validateLanguageLevel(tempData.level) && (
              <Text style={styles.errorText}>{validateLanguageLevel(tempData.level)}</Text>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const renderSectionItems = (section, items, icon, titleKey, subtitleKey) => {
    if (!items || items.length === 0) return null;
    
    return items.map((item, index) => (
      <TouchableOpacity 
        key={index} 
        style={styles.sectionItemCard}
        onPress={() => openModal(section, index)}
        onLongPress={() => deleteSectionItem(section, index)}
      >
        <View style={styles.sectionItemLeft}>
          <Ionicons name={icon} size={20} color="#4f46e5" />
          <View style={styles.sectionItemContent}>
            <Text style={styles.sectionItemTitle}>{item[titleKey]}</Text>
            {subtitleKey && item[subtitleKey] && (
              <Text style={styles.sectionItemSubtitle}>{item[subtitleKey]}</Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
      </TouchableOpacity>
    ));
  };

  // Helper to check if a field has error
  const hasError = (field) => {
    return errors[field] && touchedFields[field];
  };

  if (loading && !formData.fullName) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" color="#1e293b" size={24} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Resume Editor</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeader, hasError('fullName') && styles.sectionHeaderError]}>
              Contact Information {hasError('fullName') && '⚠️'}
            </Text>
            
            {/* Full Name Field */}
            <View>
              <Text style={[styles.label, hasError('fullName') && styles.labelError]}>Full Name *</Text>
              <TextInput 
                style={[styles.input, hasError('fullName') && styles.inputError]} 
                placeholder="Enter your full name" 
                value={formData.fullName} 
                onChangeText={(t) => handleContactChange('fullName', t)}
                onBlur={() => handleFieldBlur('fullName')}
              />
              {hasError('fullName') && (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              )}
            </View>
            
            <View style={styles.row}>
              {/* Email Field */}
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={[styles.label, hasError('email') && styles.labelError]}>Email *</Text>
                <TextInput 
                  style={[styles.input, hasError('email') && styles.inputError]} 
                  placeholder="your@email.com" 
                  keyboardType="email-address" 
                  value={formData.email} 
                  onChangeText={(t) => handleContactChange('email', t)}
                  onBlur={() => handleFieldBlur('email')}
                />
                {hasError('email') && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>
              
              {/* Phone Field */}
              <View style={{flex: 1}}>
                <Text style={[styles.label, hasError('phone') && styles.labelError]}>Phone *</Text>
                <TextInput 
                  style={[styles.input, hasError('phone') && styles.inputError]} 
                  placeholder="+1234567890" 
                  keyboardType="phone-pad" 
                  value={formData.phone} 
                  onChangeText={(t) => handleContactChange('phone', t)}
                  onBlur={() => handleFieldBlur('phone')}
                />
                {hasError('phone') && (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                )}
              </View>
            </View>
            
            {/* LinkedIn Field */}
            <View>
              <Text style={[styles.label, hasError('linkedin') && styles.labelError]}>LinkedIn (Optional)</Text>
              <TextInput 
                style={[styles.input, hasError('linkedin') && styles.inputError]} 
                placeholder="linkedin.com/in/username" 
                value={formData.linkedin} 
                onChangeText={(t) => handleContactChange('linkedin', t)}
                onBlur={() => handleFieldBlur('linkedin')}
              />
              {hasError('linkedin') && (
                <Text style={styles.errorText}>{errors.linkedin}</Text>
              )}
            </View>
            
            <View style={styles.row}>
              {/* GitHub Field */}
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={[styles.label, hasError('github') && styles.labelError]}>GitHub (Optional)</Text>
                <TextInput 
                  style={[styles.input, hasError('github') && styles.inputError]} 
                  placeholder="github.com/username" 
                  value={formData.github} 
                  onChangeText={(t) => handleContactChange('github', t)}
                  onBlur={() => handleFieldBlur('github')}
                />
                {hasError('github') && (
                  <Text style={styles.errorText}>{errors.github}</Text>
                )}
              </View>
              
              {/* Portfolio Field */}
              <View style={{flex: 1}}>
                <Text style={[styles.label, hasError('portfolio') && styles.labelError]}>Portfolio (Optional)</Text>
                <TextInput 
                  style={[styles.input, hasError('portfolio') && styles.inputError]} 
                  placeholder="yourwebsite.com" 
                  value={formData.portfolio} 
                  onChangeText={(t) => handleContactChange('portfolio', t)}
                  onBlur={() => handleFieldBlur('portfolio')}
                />
                {hasError('portfolio') && (
                  <Text style={styles.errorText}>{errors.portfolio}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeader, hasError('summary') && styles.sectionHeaderError]}>
              Professional Summary {hasError('summary') && '⚠️'}
            </Text>
            <View style={styles.textAreaContainer}>
              <TextInput 
                style={[styles.textArea, hasError('summary') && styles.inputError]} 
                multiline 
                placeholder="Write a compelling summary of your professional background... (500 characters max)" 
                value={formData.summary}
                onChangeText={(t) => handleContactChange('summary', t)}
                onBlur={() => handleFieldBlur('summary')}
                maxLength={500}
              />
              <TouchableOpacity style={styles.aiBtn} onPress={handleAIImprove} disabled={aiLoading}>
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#7c3aed" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="auto-fix" size={16} color="#7c3aed" />
                    <Text style={styles.aiBtnText}>AI Improve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {hasError('summary') && (
              <Text style={styles.errorText}>{errors.summary}</Text>
            )}
            <Text style={styles.charCount}>{formData.summary?.length || 0}/500 characters</Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Skills</Text>
            <View style={styles.skillsContainer}>
              <View style={styles.skillsInputRow}>
                <TextInput 
                  style={styles.skillsInput} 
                  placeholder="Add a skill (e.g., React, Python)" 
                  value={skillsInput}
                  onChangeText={setSkillsInput}
                  onSubmitEditing={addSkill}
                />
                <TouchableOpacity style={styles.addSkillBtn} onPress={addSkill}>
                  <Ionicons name="add" size={24} color="#4f46e5" />
                </TouchableOpacity>
              </View>
              <View style={styles.skillsList}>
                {formData.skills.map((skill, index) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{skill}</Text>
                    <TouchableOpacity onPress={() => removeSkill(index)}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Resume Sections</Text>
            
            {/* Experience Section */}
            <View style={styles.sectionGroup}>
              <View style={styles.sectionGroupHeader}>
                <Text style={styles.sectionGroupTitle}>Work Experience</Text>
                <TouchableOpacity onPress={() => openModal('Experience')}>
                  <Ionicons name="add-circle" size={24} color="#4f46e5" />
                </TouchableOpacity>
              </View>
              {renderSectionItems('Experience', formData.experience, 'briefcase-outline', 'title', 'company')}
              {formData.experience.length === 0 && (
                <Text style={styles.emptyText}>No experience added yet. Tap + to add.</Text>
              )}
            </View>

            {/* Education Section */}
            <View style={styles.sectionGroup}>
              <View style={styles.sectionGroupHeader}>
                <Text style={styles.sectionGroupTitle}>Education</Text>
                <TouchableOpacity onPress={() => openModal('Education')}>
                  <Ionicons name="add-circle" size={24} color="#4f46e5" />
                </TouchableOpacity>
              </View>
              {renderSectionItems('Education', formData.education, 'school-outline', 'degree', 'school')}
              {formData.education.length === 0 && (
                <Text style={styles.emptyText}>No education added yet. Tap + to add.</Text>
              )}
            </View>

            {/* Certifications Section */}
            <View style={styles.sectionGroup}>
              <View style={styles.sectionGroupHeader}>
                <Text style={styles.sectionGroupTitle}>Certifications (Max 5)</Text>
                <TouchableOpacity onPress={() => openModal('Certifications')}>
                  <Ionicons name="add-circle" size={24} color="#4f46e5" />
                </TouchableOpacity>
              </View>
              {renderSectionItems('Certifications', formData.certifications, 'ribbon-outline', 'name', 'issuer')}
              {formData.certifications.length === 0 && (
                <Text style={styles.emptyText}>No certifications added yet. Tap + to add.</Text>
              )}
            </View>

            {/* Languages Section */}
            <View style={styles.sectionGroup}>
              <View style={styles.sectionGroupHeader}>
                <Text style={styles.sectionGroupTitle}>Languages (Max 5)</Text>
                <TouchableOpacity onPress={() => openModal('Languages')}>
                  <Ionicons name="add-circle" size={24} color="#4f46e5" />
                </TouchableOpacity>
              </View>
              {renderSectionItems('Languages', formData.languages, 'language-outline', 'language', 'level')}
              {formData.languages.length === 0 && (
                <Text style={styles.emptyText}>No languages added yet. Tap + to add.</Text>
              )}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal for adding/editing items */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingIndex !== null ? 'Edit' : 'Add'} {activeSection}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{marginVertical: 20}}>
              {renderModalFields()}
            </ScrollView>
            <TouchableOpacity style={styles.modalAddBtn} onPress={saveSectionData}>
              <Text style={styles.modalAddBtnText}>Save to Resume</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  saveBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  form: { padding: 20, paddingBottom: 40 },
  sectionContainer: { marginBottom: 24 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  sectionHeaderError: { color: '#ef4444' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 4 },
  labelError: { color: '#ef4444' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: '#f8fafc', marginBottom: 12 },
  inputError: { borderColor: '#ef4444', borderWidth: 2, backgroundColor: '#fef2f2' },
  errorText: { color: '#ef4444', fontSize: 11, marginTop: -8, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row' },
  textAreaContainer: { position: 'relative' },
  textArea: { height: 120, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 15, backgroundColor: '#f8fafc', textAlignVertical: 'top', fontSize: 14 },
  aiBtn: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, borderRadius: 10, elevation: 3 },
  aiBtnText: { color: '#7c3aed', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  charCount: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 },
  skillsContainer: { marginBottom: 16 },
  skillsInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  skillsInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: '#f8fafc', marginRight: 8 },
  addSkillBtn: { padding: 8 },
  skillsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  skillChipText: { fontSize: 13, color: '#4f46e5' },
  sectionGroup: { marginBottom: 20 },
  sectionGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionGroupTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  sectionItemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  sectionItemContent: { flex: 1 },
  sectionItemTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  sectionItemSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#f8fafc', marginBottom: 5 },
  modalAddBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  modalAddBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});

export default ResumeBuilder;