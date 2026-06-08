import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, 
  Platform, StatusBar, KeyboardAvoidingView, Modal, Alert, ActivityIndicator,
  Animated, Dimensions, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { resumeAPI } from '../../api/api';

const { width, height } = Dimensions.get("window");

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

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const saveScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (route.params?.resumeData) {
      setFormData(route.params.resumeData);
    } else {
      fetchResume();
    }

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
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

  const validateFullName = (name) => {
    if (!name || name.trim() === '') return 'Full name is required';
    if (name.length > 100) return 'Name cannot exceed 100 characters';
    return '';
  };

  const validateEmail = (email) => {
    if (!email || email.trim() === '') return 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email';
    return '';
  };

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') return 'Phone number is required';
    if (!/^\+?[\d\s-]{10,}$/.test(phone)) return 'Minimum 10 digits required';
    return '';
  };

  const validateLinkedIn = (url) => {
    if (!url || url.trim() === '') return '';
    if (!/^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/.test(url)) return 'Invalid LinkedIn URL';
    return '';
  };

  const validateGitHub = (url) => {
    if (!url || url.trim() === '') return '';
    if (!/^(https?:\/\/)?(www\.)?github\.com\/.*$/.test(url)) return 'Invalid GitHub URL';
    return '';
  };

  const validatePortfolio = (url) => {
    if (!url || url.trim() === '') return '';
    if (!/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i.test(url)) return 'Invalid URL';
    return '';
  };

  const validateSummary = (summary) => {
    if (summary && summary.length > 500) return 'Summary cannot exceed 500 characters';
    return '';
  };

  const validateLanguageLevel = (level) => {
    const validLevels = ['Basic', 'Conversational', 'Professional', 'Native'];
    if (!level) return 'Proficiency level is required';
    const capitalized = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
    if (!validLevels.includes(capitalized)) {
      return 'Must be: Basic, Conversational, Professional, or Native';
    }
    return '';
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'fullName': return validateFullName(value);
      case 'email': return validateEmail(value);
      case 'phone': return validatePhone(value);
      case 'linkedin': return validateLinkedIn(value);
      case 'github': return validateGitHub(value);
      case 'portfolio': return validatePortfolio(value);
      case 'summary': return validateSummary(value);
      default: return '';
    }
  };

  const handleContactChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const addSkill = () => {
    const trimmedSkill = skillsInput.trim();
    if (trimmedSkill) {
      if (!formData.skills.includes(trimmedSkill)) {
        setFormData({
          ...formData,
          skills: [...formData.skills, trimmedSkill]
        });
        setSkillsInput('');
        Keyboard.dismiss();
      }
    }
  };

  const removeSkill = (index) => {
    const newSkills = [...formData.skills];
    newSkills.splice(index, 1);
    setFormData({ ...formData, skills: newSkills });
  };

  const openModal = (section, index = null) => {
    Keyboard.dismiss();
    
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
    modalScale.setValue(0.9);
    Animated.spring(modalScale, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const saveSectionData = () => {
    const sectionKey = activeSection.toLowerCase();
    
    if (activeSection === 'Languages') {
      const levelError = validateLanguageLevel(tempData.level);
      if (levelError) {
        Alert.alert('Validation Error', levelError);
        return;
      }
    }
    
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
    Keyboard.dismiss();
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
    
    setTouchedFields({
      fullName: true, email: true, phone: true,
      linkedin: true, github: true, portfolio: true, summary: true
    });
    
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    
    Animated.sequence([
      Animated.timing(saveScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(saveScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

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
        Alert.alert('Validation Error', Object.values(error.response.data.details).join('\n'));
      } else {
        Alert.alert('Error', error.response?.data?.error || 'Failed to save resume');
      }
    } finally {
      setLoading(false);
    }
  };

  const hasError = (field) => {
    return errors[field] && touchedFields[field];
  };

  const renderModalFields = () => {
    switch (activeSection) {
      case 'Education':
        return (
          <>
            <Text style={styles.modalLabel}>University/School Name *</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., Stanford University" 
              placeholderTextColor="#999" 
              value={tempData.school || ''} 
              onChangeText={(v) => setTempData({...tempData, school: v})} 
            />
            
            <Text style={styles.modalLabel}>Degree *</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., BS Computer Science" 
              placeholderTextColor="#999" 
              value={tempData.degree || ''} 
              onChangeText={(v) => setTempData({...tempData, degree: v})} 
            />
            
            <Text style={styles.modalLabel}>CGPA / Grade (Optional)</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., 3.8 / A+" 
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              value={tempData.cgpa || ''} 
              onChangeText={(v) => setTempData({...tempData, cgpa: v})} 
            />
            
            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.modalLabel}>Start Date *</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="e.g., 2020" 
                  placeholderTextColor="#999" 
                  value={tempData.startDate || ''} 
                  onChangeText={(v) => setTempData({...tempData, startDate: v})} 
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.modalLabel}>End Date *</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="e.g., 2024" 
                  placeholderTextColor="#999" 
                  value={tempData.endDate || ''} 
                  onChangeText={(v) => setTempData({...tempData, endDate: v})} 
                />
              </View>
            </View>
          </>
        );
      case 'Experience':
        return (
          <>
            <Text style={styles.modalLabel}>Company Name *</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., Google, Microsoft" 
              placeholderTextColor="#999" 
              value={tempData.company || ''} 
              onChangeText={(v) => setTempData({...tempData, company: v})} 
            />
            
            <Text style={styles.modalLabel}>Job Title *</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., Software Engineer" 
              placeholderTextColor="#999" 
              value={tempData.title || ''} 
              onChangeText={(v) => setTempData({...tempData, title: v})} 
            />
            
            <Text style={styles.modalLabel}>Location (Optional)</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., San Francisco, CA" 
              placeholderTextColor="#999" 
              value={tempData.location || ''} 
              onChangeText={(v) => setTempData({...tempData, location: v})} 
            />
            
            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 8}}>
                <Text style={styles.modalLabel}>Start Date *</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="e.g., Jan 2022" 
                  placeholderTextColor="#999" 
                  value={tempData.startDate || ''} 
                  onChangeText={(v) => setTempData({...tempData, startDate: v})} 
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.modalLabel}>End Date *</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="e.g., Present" 
                  placeholderTextColor="#999" 
                  value={tempData.endDate || ''} 
                  onChangeText={(v) => setTempData({...tempData, endDate: v})} 
                />
              </View>
            </View>
            
            <Text style={styles.modalLabel}>Role Description *</Text>
            <TextInput 
              style={[styles.modalInput, {height: 100}]} 
              multiline 
              placeholder="Describe your responsibilities and achievements" 
              placeholderTextColor="#999" 
              value={tempData.desc || ''} 
              onChangeText={(v) => setTempData({...tempData, desc: v})} 
            />
          </>
        );
      case 'Projects':
        return (
          <>
            <Text style={styles.modalLabel}>Project Name *</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., E-commerce Platform" 
              placeholderTextColor="#999" 
              value={tempData.name || ''} 
              onChangeText={(v) => setTempData({...tempData, name: v})} 
            />
            
            <Text style={styles.modalLabel}>Technologies Used</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., React, Node.js, MongoDB" 
              placeholderTextColor="#999" 
              value={tempData.tech || ''} 
              onChangeText={(v) => setTempData({...tempData, tech: v})} 
            />
            
            <Text style={styles.modalLabel}>Project Link (Optional)</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., github.com/username/project" 
              placeholderTextColor="#999"
              autoCapitalize="none"
              value={tempData.link || ''} 
              onChangeText={(v) => setTempData({...tempData, link: v})} 
            />
            
            <Text style={styles.modalLabel}>Description *</Text>
            <TextInput 
              style={[styles.modalInput, {height: 100}]} 
              multiline 
              placeholder="Describe your project and key features" 
              placeholderTextColor="#999" 
              value={tempData.desc || ''} 
              onChangeText={(v) => setTempData({...tempData, desc: v})} 
            />
          </>
        );
      case 'Certifications':
        return (
          <>
            <Text style={styles.modalLabel}>Certificate Name *</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., AWS Certified Solutions Architect" 
              placeholderTextColor="#999" 
              value={tempData.name || ''} 
              onChangeText={(v) => setTempData({...tempData, name: v})} 
            />
            
            <Text style={styles.modalLabel}>Issuing Organization *</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., Amazon, Google, Microsoft" 
              placeholderTextColor="#999" 
              value={tempData.issuer || ''} 
              onChangeText={(v) => setTempData({...tempData, issuer: v})} 
            />
            
            <Text style={styles.modalLabel}>Credential ID (Optional)</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., AWS-ASA-12345" 
              placeholderTextColor="#999" 
              value={tempData.credentialId || ''} 
              onChangeText={(v) => setTempData({...tempData, credentialId: v})} 
            />
            
            <Text style={styles.modalLabel}>Date Obtained *</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., June 2023" 
              placeholderTextColor="#999" 
              value={tempData.date || ''} 
              onChangeText={(v) => setTempData({...tempData, date: v})} 
            />
          </>
        );
      case 'Languages':
        return (
          <>
            <Text style={styles.modalLabel}>Language *</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g., English, Spanish, Mandarin" 
              placeholderTextColor="#999" 
              value={tempData.language || ''} 
              onChangeText={(v) => setTempData({...tempData, language: v})} 
            />
            
            <Text style={styles.modalLabel}>Proficiency Level *</Text>
            <TextInput 
              style={[styles.modalInput, tempData.level && validateLanguageLevel(tempData.level) ? styles.inputError : null]} 
              placeholder="Basic / Conversational / Professional / Native" 
              placeholderTextColor="#999"
              value={tempData.level || ''} 
              onChangeText={(v) => setTempData({...tempData, level: v})}
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
        activeOpacity={0.7}
      >
        <View style={styles.sectionItemLeft}>
          <View style={styles.sectionItemIcon}>
            <Ionicons name={icon} size={18} color="#f9c349" />
          </View>
          <View style={styles.sectionItemContent}>
            <Text style={styles.sectionItemTitle}>{item[titleKey]}</Text>
            {subtitleKey && item[subtitleKey] && (
              <Text style={styles.sectionItemSubtitle}>{item[subtitleKey]}</Text>
            )}
          </View>
        </View>
        <View style={styles.chevronCircle}>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </View>
      </TouchableOpacity>
    ));
  };

  if (loading && !formData.fullName) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading your resume...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Top Bar */}
      <Animated.View style={[styles.topBar, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Resume Editor</Text>
        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.8}>
            <LinearGradient
              colors={['#000', '#1a1a1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.form} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
            
            {/* Contact Information */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
                <Text style={styles.sectionHeader}>Contact Information</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <View style={[styles.inputWrapper, hasError('fullName') && styles.inputError]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="person-outline" size={18} color="#999" />
                  </View>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter your full name" 
                    placeholderTextColor="#999"
                    value={formData.fullName} 
                    onChangeText={(t) => handleContactChange('fullName', t)}
                  />
                </View>
                {hasError('fullName') && <Text style={styles.errorText}>{errors.fullName}</Text>}
              </View>
              
              <View style={styles.row}>
                <View style={[styles.inputGroup, {flex: 1, marginRight: 8}]}>
                  <Text style={styles.label}>Email *</Text>
                  <View style={[styles.inputWrapper, hasError('email') && styles.inputError]}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="mail-outline" size={18} color="#999" />
                    </View>
                    <TextInput 
                      style={styles.input} 
                      placeholder="your@email.com" 
                      placeholderTextColor="#999"
                      keyboardType="email-address" 
                      autoCapitalize="none"
                      value={formData.email} 
                      onChangeText={(t) => handleContactChange('email', t)}
                    />
                  </View>
                  {hasError('email') && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>
                
                <View style={[styles.inputGroup, {flex: 1}]}>
                  <Text style={styles.label}>Phone *</Text>
                  <View style={[styles.inputWrapper, hasError('phone') && styles.inputError]}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="call-outline" size={18} color="#999" />
                    </View>
                    <TextInput 
                      style={styles.input} 
                      placeholder="+1234567890" 
                      placeholderTextColor="#999"
                      keyboardType="phone-pad" 
                      value={formData.phone} 
                      onChangeText={(t) => handleContactChange('phone', t)}
                    />
                  </View>
                  {hasError('phone') && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>LinkedIn (Optional)</Text>
                <View style={[styles.inputWrapper, hasError('linkedin') && styles.inputError]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="logo-linkedin" size={18} color="#999" />
                  </View>
                  <TextInput 
                    style={styles.input} 
                    placeholder="linkedin.com/in/username" 
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    value={formData.linkedin} 
                    onChangeText={(t) => handleContactChange('linkedin', t)}
                  />
                </View>
                {hasError('linkedin') && <Text style={styles.errorText}>{errors.linkedin}</Text>}
              </View>
              
              <View style={styles.row}>
                <View style={[styles.inputGroup, {flex: 1, marginRight: 8}]}>
                  <Text style={styles.label}>GitHub (Optional)</Text>
                  <View style={[styles.inputWrapper, hasError('github') && styles.inputError]}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="logo-github" size={18} color="#999" />
                    </View>
                    <TextInput 
                      style={styles.input} 
                      placeholder="github.com/username" 
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      value={formData.github} 
                      onChangeText={(t) => handleContactChange('github', t)}
                    />
                  </View>
                  {hasError('github') && <Text style={styles.errorText}>{errors.github}</Text>}
                </View>
                
                <View style={[styles.inputGroup, {flex: 1}]}>
                  <Text style={styles.label}>Portfolio (Optional)</Text>
                  <View style={[styles.inputWrapper, hasError('portfolio') && styles.inputError]}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="globe-outline" size={18} color="#999" />
                    </View>
                    <TextInput 
                      style={styles.input} 
                      placeholder="yourwebsite.com" 
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      value={formData.portfolio} 
                      onChangeText={(t) => handleContactChange('portfolio', t)}
                    />
                  </View>
                  {hasError('portfolio') && <Text style={styles.errorText}>{errors.portfolio}</Text>}
                </View>
              </View>
            </View>

            {/* Professional Summary */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
                <Text style={styles.sectionHeader}>Professional Summary</Text>
              </View>
              <View style={[styles.textAreaWrapper, hasError('summary') && styles.inputError]}>
                <TextInput 
                  style={styles.textArea} 
                  multiline 
                  placeholder="Write a compelling summary of your professional background... (500 characters max)" 
                  placeholderTextColor="#999"
                  value={formData.summary}
                  onChangeText={(t) => handleContactChange('summary', t)}
                  maxLength={500}
                />
                <View style={styles.textAreaFooter}>
                  <TouchableOpacity style={styles.aiBtn} onPress={handleAIImprove} disabled={aiLoading} activeOpacity={0.7}>
                    {aiLoading ? (
                      <ActivityIndicator size="small" color="#f9c349" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="auto-fix" size={14} color="#f9c349" />
                        <Text style={styles.aiBtnText}>AI Improve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.charCount}>{formData.summary?.length || 0}/500</Text>
                </View>
              </View>
              {hasError('summary') && <Text style={styles.errorText}>{errors.summary}</Text>}
            </View>

            {/* Skills */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
                <Text style={styles.sectionHeader}>Skills</Text>
              </View>
              <View style={styles.skillsInputRow}>
                <View style={[styles.inputWrapper, {flex: 1, marginRight: 10}]}>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Add a skill (e.g., React, Python)" 
                    placeholderTextColor="#999"
                    value={skillsInput}
                    onChangeText={setSkillsInput}
                    onSubmitEditing={addSkill}
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity style={styles.addSkillBtn} onPress={addSkill} activeOpacity={0.7}>
                  <LinearGradient
                    colors={['#000', '#1a1a1a']}
                    style={styles.addSkillGradient}
                  >
                    <Ionicons name="add" size={22} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <View style={styles.skillsList}>
                {formData.skills.map((skill, index) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{skill}</Text>
                    <TouchableOpacity onPress={() => removeSkill(index)}>
                      <Ionicons name="close-circle" size={16} color="#999" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Resume Sections */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <LinearGradient colors={['#f9c349', '#f9c349']} style={styles.sectionDot} />
                <Text style={styles.sectionHeader}>Resume Sections</Text>
              </View>
              
              {/* Experience */}
              <View style={styles.sectionGroup}>
                <View style={styles.sectionGroupHeader}>
                  <Text style={styles.sectionGroupTitle}>Work Experience</Text>
                  <TouchableOpacity onPress={() => openModal('Experience')} activeOpacity={0.7}>
                    <View style={styles.addCircleBtn}>
                      <Ionicons name="add" size={20} color="#f9c349" />
                    </View>
                  </TouchableOpacity>
                </View>
                {renderSectionItems('Experience', formData.experience, 'briefcase-outline', 'title', 'company')}
                {formData.experience.length === 0 && (
                  <Text style={styles.emptyText}>No experience added yet. Tap + to add.</Text>
                )}
              </View>

              {/* Education */}
              <View style={styles.sectionGroup}>
                <View style={styles.sectionGroupHeader}>
                  <Text style={styles.sectionGroupTitle}>Education</Text>
                  <TouchableOpacity onPress={() => openModal('Education')} activeOpacity={0.7}>
                    <View style={styles.addCircleBtn}>
                      <Ionicons name="add" size={20} color="#f9c349" />
                    </View>
                  </TouchableOpacity>
                </View>
                {renderSectionItems('Education', formData.education, 'school-outline', 'degree', 'school')}
                {formData.education.length === 0 && (
                  <Text style={styles.emptyText}>No education added yet. Tap + to add.</Text>
                )}
              </View>

              {/* Projects */}
              <View style={styles.sectionGroup}>
                <View style={styles.sectionGroupHeader}>
                  <Text style={styles.sectionGroupTitle}>Projects</Text>
                  <TouchableOpacity onPress={() => openModal('Projects')} activeOpacity={0.7}>
                    <View style={styles.addCircleBtn}>
                      <Ionicons name="add" size={20} color="#f9c349" />
                    </View>
                  </TouchableOpacity>
                </View>
                {renderSectionItems('Projects', formData.projects, 'code-slash-outline', 'name', 'tech')}
                {formData.projects.length === 0 && (
                  <Text style={styles.emptyText}>No projects added yet. Tap + to add.</Text>
                )}
              </View>

              {/* Certifications */}
              <View style={styles.sectionGroup}>
                <View style={styles.sectionGroupHeader}>
                  <Text style={styles.sectionGroupTitle}>Certifications (Max 5)</Text>
                  <TouchableOpacity onPress={() => openModal('Certifications')} activeOpacity={0.7}>
                    <View style={styles.addCircleBtn}>
                      <Ionicons name="add" size={20} color="#f9c349" />
                    </View>
                  </TouchableOpacity>
                </View>
                {renderSectionItems('Certifications', formData.certifications, 'ribbon-outline', 'name', 'issuer')}
                {formData.certifications.length === 0 && (
                  <Text style={styles.emptyText}>No certifications added yet. Tap + to add.</Text>
                )}
              </View>

              {/* Languages */}
              <View style={styles.sectionGroup}>
                <View style={styles.sectionGroupHeader}>
                  <Text style={styles.sectionGroupTitle}>Languages (Max 5)</Text>
                  <TouchableOpacity onPress={() => openModal('Languages')} activeOpacity={0.7}>
                    <View style={styles.addCircleBtn}>
                      <Ionicons name="add" size={20} color="#f9c349" />
                    </View>
                  </TouchableOpacity>
                </View>
                {renderSectionItems('Languages', formData.languages, 'language-outline', 'language', 'level')}
                {formData.languages.length === 0 && (
                  <Text style={styles.emptyText}>No languages added yet. Tap + to add.</Text>
                )}
              </View>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, { transform: [{ scale: modalScale }] }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingIndex !== null ? 'Edit' : 'Add'} {activeSection}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={{marginVertical: 15}}
              keyboardShouldPersistTaps="handled"
            >
              {renderModalFields()}
            </ScrollView>
            <TouchableOpacity style={styles.modalAddBtn} onPress={saveSectionData} activeOpacity={0.8}>
              <LinearGradient
                colors={['#f9c349', '#1a1a1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalAddBtnGradient}
              >
                <Text style={styles.modalAddBtnText}>Save to Resume</Text>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#999', fontWeight: '600' },
  
  // Top Bar
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  saveBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: "#f9c349",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  saveBtnGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  
  form: { padding: 20, paddingBottom: 40 },
  
  // Sections
  sectionContainer: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', letterSpacing: 1, textTransform: 'uppercase' },
  
  // Input Styles
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 6, letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    height: 50,
  },
  inputError: { borderColor: '#ef4444' },
  inputIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: { flex: 1, fontSize: 14, color: '#1a1a1a', fontWeight: '500', paddingVertical: 4 },
  errorText: { color: '#ef4444', fontSize: 11, fontWeight: '600', marginTop: 4, marginLeft: 4 },
  row: { flexDirection: 'row' },
  
  // Text Area
  textAreaWrapper: {
    backgroundColor: '#f8f8f8',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 12,
  },
  textArea: { 
    height: 120, 
    textAlignVertical: 'top', 
    fontSize: 14, 
    color: '#1a1a1a',
    fontWeight: '500',
  },
  textAreaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  aiBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10, 
    borderWidth: 1,
    borderColor: '#f0f0f0',
    gap: 5,
  },
  aiBtnText: { color: '#f9c349', fontSize: 11, fontWeight: '700' },
  charCount: { fontSize: 11, color: '#999', fontWeight: '500' },
  
  // Skills
  skillsInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  addSkillBtn: { borderRadius: 14, overflow: 'hidden', elevation: 4 },
  addSkillGradient: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8f8f8', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    gap: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  skillChipText: { fontSize: 13, color: '#1a1a1a', fontWeight: '600' },
  
  // Section Groups
  sectionGroup: { 
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  sectionGroupHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionGroupTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  addCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  
  // Section Items
  sectionItemCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  sectionItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionItemContent: { flex: 1 },
  sectionItemTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  sectionItemSubtitle: { fontSize: 12, color: '#999', marginTop: 2, fontWeight: '500' },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 16, fontWeight: '500', fontStyle: 'italic' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 25, 
    maxHeight: '85%' 
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 6, marginTop: 12, letterSpacing: 0.5 },
  modalInput: { 
    borderWidth: 2, 
    borderColor: '#f0f0f0', 
    borderRadius: 14, 
    padding: 14, 
    fontSize: 14, 
    backgroundColor: '#f8f8f8', 
    marginBottom: 4,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  modalAddBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 20, elevation: 8 },
  modalAddBtnGradient: { 
    padding: 16, 
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modalAddBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
});

export default ResumeBuilder;