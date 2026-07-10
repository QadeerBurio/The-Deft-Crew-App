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
  Switch,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { ResumeContext } from '../../context/ResumeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { renderResumeHTML } from '../../services/templateService';
import resumeApi from '../../api/resumeApi';

const { width, height } = Dimensions.get('window');

const INDUSTRIES = [
  {
    name: 'Technology',
    roles: [
      'Software Engineer', 'Frontend Developer', 'Backend Developer', 
      'Full Stack Developer', 'Mobile Developer', 'DevOps Engineer', 
      'Data Scientist', 'Machine Learning Engineer', 'AI Engineer', 
      'Cloud Architect', 'Cybersecurity Analyst', 'QA Engineer', 
      'Database Administrator', 'Systems Administrator', 'IT Support Specialist'
    ]
  },
  {
    name: 'Healthcare & Medicine',
    roles: [
      'Registered Nurse', 'Physician', 'Pharmacist', 'Medical Assistant', 
      'Physical Therapist', 'Dentist', 'Radiologist', 'Surgeon', 
      'Healthcare Administrator', 'Clinical Research Associate', 
      'Occupational Therapist', 'Paramedic', 'Nutritionist / Dietitian'
    ]
  },
  {
    name: 'Business & Finance',
    roles: [
      'Financial Analyst', 'Accountant', 'Investment Banker', 'Business Analyst', 
      'Management Consultant', 'Auditor', 'Financial Planner', 'Risk Analyst', 
      'Operations Manager', 'Supply Chain Manager', 'Procurement Specialist', 'Actuary'
    ]
  },
  {
    name: 'Marketing & Sales',
    roles: [
      'Marketing Manager', 'Digital Marketing Specialist', 'Content Strategist', 
      'SEO / SEM Specialist', 'Social Media Manager', 'Brand Manager', 
      'Sales Manager', 'Account Executive', 'Sales Representative', 
      'Growth Hacker', 'Email Marketing Specialist', 'Product Marketer'
    ]
  },
  {
    name: 'Design & Creative',
    roles: [
      'UX Designer', 'UI Designer', 'Graphic Designer', 'Product Designer', 
      'Motion Designer', 'Illustrator', '3D Artist', 'Art Director', 
      'Creative Director', 'Video Editor', 'Photographer', 'Interior Designer', 'Fashion Designer'
    ]
  },
  {
    name: 'Education',
    roles: [
      'Teacher', 'University Lecturer', 'Academic Researcher', 'School Principal', 
      'Education Consultant', 'Curriculum Developer', 'Instructional Designer', 
      'School Counselor', 'Special Education Teacher', 'ESL / Language Instructor', 'Librarian'
    ]
  },
  {
    name: 'Engineering',
    roles: [
      'Mechanical Engineer', 'Civil Engineer', 'Electrical Engineer', 'Chemical Engineer', 
      'Aerospace Engineer', 'Structural Engineer', 'Environmental Engineer', 
      'Biomedical Engineer', 'Industrial Engineer', 'Manufacturing Engineer', 
      'Petroleum Engineer', 'Robotics Engineer'
    ]
  },
  {
    name: 'Law & Legal',
    roles: [
      'Lawyer / Attorney', 'Paralegal', 'Legal Assistant', 'Corporate Counsel', 
      'Compliance Officer', 'Judge', 'Legal Researcher', 'Contract Manager', 'IP Specialist'
    ]
  },
  {
    name: 'Human Resources',
    roles: [
      'HR Manager', 'Recruiter / Talent Acquisition', 'HR Business Partner', 
      'Compensation & Benefits Specialist', 'Training & Development Manager', 
      'HR Generalist', 'People Operations Manager', 'Labour Relations Specialist'
    ]
  },
  {
    name: 'Media & Communication',
    roles: [
      'Journalist', 'Content Writer', 'Copywriter', 'Public Relations Specialist', 
      'Editor', 'Broadcast Producer', 'Podcast Producer', 'Technical Writer', 'Communications Manager'
    ]
  }
];

const FONTS = ['Inter (Modern Sans)', 'Roboto', 'Playfair Display', 'Open Sans', 'Outfit'];
const PRESETS = [
  { name: 'Indigo', color: '#4F46E5' },
  { name: 'Classic', color: '#2563EB' },
  { name: 'Emerald', color: '#10B981' },
  { name: 'Royal', color: '#1E3A8A' },
  { name: 'Rose', color: '#F43F5E' },
  { name: 'Warm', color: '#F59E0B' }
];

const SYSTEM_TEMPLATES = [
  { id: 'modern_ats', name: 'Modern ATS Resume', desc: 'Clean, minimalist, single-column resume designed to maximize compatibility with Applicant Tracking Systems (ATS). Uses modern sans-serif fonts.' },
  { id: 'stanford', name: 'Stanford Resume Style', desc: 'Highly traditional, text-focused black-and-white university style layout. Compact, academic, no extra colors.' },
  { id: 'faang', name: 'FAANG Resume', desc: 'Emphasizes metrics, technical skills, and business achievements. Tailored for top technology companies.' },
  { id: 'jakes', name: 'Jake\'s Resume', desc: 'Elegantly simple single-column layout, developer favorite formatting for projects and skills.' },
  { id: 'rezi', name: 'Rezi Resume', desc: 'ATS-first layout optimized with structured keyword-rich headers for scanning software.' },
  { id: 'flowcv', name: 'FlowCV Style', desc: 'European design layout with soft dividers, premium visual formatting, and subtle accent colors.' },
  { id: 'reactive', name: 'Reactive Resume', desc: 'Modern and flexible layout tailored for software engineers and tech professionals.' },
  { id: 'canva', name: 'Canva Professional', desc: 'Visually polished two-column creative layout combining left-hand sidebar options.' }
];

const ResumeBuilderScreen = () => {
  const { user } = useContext(AuthContext);
  const {
    currentResume,
    createResume,
    updateResume,
    uploadResume,
    loading,
    uploadProgress,
    error,
    clearError,
    fetchResumes,
    setCurrentResume
  } = useContext(ResumeContext);
  
  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId } = route.params || {};

  // Step state: 1 to 8 mapping to tabs
  const [activeStep, setActiveStep] = useState(1);
  const [aiGeneratingVisible, setAiGeneratingVisible] = useState(false);
  const [aiGeneratingStep, setAiGeneratingStep] = useState('');
  const [aiGeneratingProgress, setAiGeneratingProgress] = useState(0);

  // --- LOCAL INPUT STATES ---
  const [pName, setPName] = useState('');
  const [pTitle, setPTitle] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pLocation, setPLocation] = useState('');
  const [pLinkedin, setPLinkedin] = useState('');
  const [pGithub, setPGithub] = useState('');
  const [pPortfolio, setPPortfolio] = useState('');

  // Step 2: Education Inline Form
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduGpa, setEduGpa] = useState('');
  const [eduSemester, setEduSemester] = useState('');
  const [eduStartDate, setEduStartDate] = useState('');
  const [eduEndDate, setEduEndDate] = useState('');
  const [eduCurrent, setEduCurrent] = useState(false);
  const [editingEduIndex, setEditingEduIndex] = useState(null);

  // Step 3: Work Experience Inline Form
  const [workCompany, setWorkCompany] = useState('');
  const [workPosition, setWorkPosition] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [workStartDate, setWorkStartDate] = useState('');
  const [workEndDate, setWorkEndDate] = useState('');
  const [workCurrent, setWorkCurrent] = useState(false);
  const [workDesc, setWorkDesc] = useState('');
  const [editingWorkIndex, setEditingWorkIndex] = useState(null);

  // Step 4: Projects Inline Form
  const [projName, setProjName] = useState('');
  const [projTech, setProjTech] = useState('');
  const [projGithub, setProjGithub] = useState('');
  const [projLive, setProjLive] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [editingProjIndex, setEditingProjIndex] = useState(null);

  // Step 5: Skills Tag Input
  const [skillInput, setSkillInput] = useState('');

  // Step 6: Certifications Inline Form
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certUrl, setCertUrl] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [editingCertIndex, setEditingCertIndex] = useState(null);

  // Step 7: Target Job Inline
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [expandedIndustry, setExpandedIndustry] = useState('Technology');
  const [targetSummary, setTargetSummary] = useState('');

  // AI & Preview Control
  const [aiProcessing, setAiProcessing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState('modern_ats');

  // Customize options (Kept separate on Step 8)
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [selectedColor, setSelectedColor] = useState('#1E3A8A');
  const [accentColor, setAccentColor] = useState('#1E3A8A');
  const [headingColor, setHeadingColor] = useState('#0F172A');
  const [textColor, setTextColor] = useState('#334155');
  const [bgColor, setBgColor] = useState('#FFFFFF');

  // Sync styling options from database
  useEffect(() => {
    if (currentResume && currentResume.customStyles) {
      const styles = currentResume.customStyles;
      if (styles.font) setSelectedFont(styles.font);
      if (styles.accentColor) {
        setAccentColor(styles.accentColor);
        setSelectedColor(styles.accentColor);
      }
      if (styles.headingColor) setHeadingColor(styles.headingColor);
      if (styles.textColor) setTextColor(styles.textColor);
      if (styles.bgColor) setBgColor(styles.bgColor);
    }
  }, [currentResume]);

  const saveCustomStyles = async (updatedFields) => {
    if (!currentResume) return;
    
    const newStyles = {
      font: selectedFont,
      accentColor: accentColor,
      headingColor: headingColor,
      textColor: textColor,
      bgColor: bgColor,
      ...updatedFields
    };
    
    try {
      await updateResume(currentResume._id, { customStyles: newStyles });
    } catch (err) {
      console.log('Error saving custom styles:', err);
    }
  };

  const ACCENT_COLORS = ['#1E3A8A', '#0F766E', '#2563EB', '#111827'];
  const HEADING_COLORS = ['#0F172A', '#1E293B', '#111827'];
  const TEXT_COLORS = ['#334155', '#475569', '#111827'];
  const BG_COLORS = ['#FFFFFF', '#F8FAFC', '#F1F5F9'];

  const cycleAccentColor = () => {
    const currentIndex = ACCENT_COLORS.indexOf(accentColor);
    const nextIndex = (currentIndex + 1) % ACCENT_COLORS.length;
    const nextVal = ACCENT_COLORS[nextIndex];
    setAccentColor(nextVal);
    saveCustomStyles({ accentColor: nextVal });
  };

  const cycleHeadingColor = () => {
    const currentIndex = HEADING_COLORS.indexOf(headingColor);
    const nextIndex = (currentIndex + 1) % HEADING_COLORS.length;
    const nextVal = HEADING_COLORS[nextIndex];
    setHeadingColor(nextVal);
    saveCustomStyles({ headingColor: nextVal });
  };

  const cycleTextColor = () => {
    const currentIndex = TEXT_COLORS.indexOf(textColor);
    const nextIndex = (currentIndex + 1) % TEXT_COLORS.length;
    const nextVal = TEXT_COLORS[nextIndex];
    setTextColor(nextVal);
    saveCustomStyles({ textColor: nextVal });
  };

  const cycleBgColor = () => {
    const currentIndex = BG_COLORS.indexOf(bgColor);
    const nextIndex = (currentIndex + 1) % BG_COLORS.length;
    const nextVal = BG_COLORS[nextIndex];
    setBgColor(nextVal);
    saveCustomStyles({ bgColor: nextVal });
  };

  // Stepper titles (7 steps — Templates removed)
  const steps = [
    { id: 1, name: 'Personal', icon: 'person-outline', title: 'Personal Info', desc: 'Your contact details and basic information' },
    { id: 2, name: 'Education', icon: 'school-outline', title: 'Education', desc: 'Academic background and qualifications' },
    { id: 3, name: 'Work', icon: 'briefcase-outline', title: 'Work Experience', desc: 'Work history with AI-enhanced bullet points' },
    { id: 4, name: 'Projects', icon: 'folder-outline', title: 'Projects', desc: 'Portfolio projects with AI-optimized descriptions' },
    { id: 5, name: 'Skills', icon: 'hammer-outline', title: 'Skills', desc: 'Skills with AI suggestions — for any field' },
    { id: 6, name: 'Certifications', icon: 'ribbon-outline', title: 'Certifications', desc: 'Professional certifications and credentials' },
    { id: 7, name: 'Target', icon: 'locate-outline', title: 'Target Job', desc: 'Role (any industry) and AI-generated summary' },
  ];

  // Date format helper — converts ISO dates to "Mon YYYY" for form inputs
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // already a plain string like "Jan 2022"
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Sync inputs from currentResume
  useEffect(() => {
    if (currentResume) {
      if (activeStep === 1) {
        const info = currentResume.personalInfo || {};
        setPName(`${info.firstName || ''} ${info.lastName || ''}`.trim());
        setPTitle(info.title || '');
        setPEmail(info.email || '');
        setPPhone(info.phone || '');
        setPLocation(info.location || '');
        setPLinkedin(info.linkedin || '');
        setPGithub(info.github || '');
        setPPortfolio(info.portfolio || '');
      } else if (activeStep === 7) {
        setTargetSummary(currentResume.professionalSummary?.summary || '');
      }
    }
  }, [currentResume, activeStep]);

  // Initial resume setup
  useEffect(() => {
    const initResume = async () => {
      if (resumeId) {
        await fetchResumes();
      } else {
        try {
          // Reset all local input states to blank/defaults
          setPName('');
          setPTitle('');
          setPEmail('');
          setPPhone('');
          setPLocation('');
          setPLinkedin('');
          setPGithub('');
          setPPortfolio('');
          setTargetSummary('');

          await createResume({
            personalInfo: { 
              firstName: user?.name?.split(' ')[0] || '', 
              lastName: user?.name?.split(' ')[1] || '',
              email: user?.email || '',
              phone: '',
              location: '',
              linkedin: '',
              github: '',
              portfolio: ''
            },
            template: 'modern_ats'
          });
        } catch (err) {
          console.log('Error auto-creating blank resume', err);
          navigation.goBack();
        }
      }
    };
    initResume();
  }, [resumeId]);



  // Pick Document Helper
  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        return res.assets[0];
      }
      return null;
    } catch (err) {
      console.error('File picker error:', err);
      return null;
    }
  };

  // Upload and parse helper
  const handleAutoFillUpload = async () => {
    const file = await pickDocument();
    if (!file) return;

    setAiGeneratingVisible(true);
    setAiGeneratingStep('Uploading resume document...');
    setAiGeneratingProgress(15);

    try {
      // Simulate progress updates for a smoother visual experience while uploading
      const progressInterval = setInterval(() => {
        setAiGeneratingProgress(prev => {
          if (prev < 50) return prev + 5;
          if (prev < 80) return prev + 2;
          return prev;
        });
      }, 400);

      const payload = {
        uri: file.uri,
        name: file.name || 'resume.pdf',
        type: file.mimeType || 'application/pdf',
      };

      setAiGeneratingStep('AI is reading and parsing details...');
      setAiGeneratingProgress(55);

      const parsed = await uploadResume(payload);
      
      clearInterval(progressInterval);

      if (parsed) {
        setAiGeneratingStep('Structuring resume sections...');
        setAiGeneratingProgress(85);
        
        await new Promise(resolve => setTimeout(resolve, 800));

        setAiGeneratingStep('Generating document preview...');
        setAiGeneratingProgress(100);

        await new Promise(resolve => setTimeout(resolve, 600));
        setAiGeneratingVisible(false);

        await fetchResumes();

        // Navigate directly to the ResumeView document format screen!
        navigation.navigate('ResumeView', { resumeId: parsed._id });
      } else {
        setAiGeneratingVisible(false);
        Alert.alert('Error', 'Failed to generate resume from file.');
      }
    } catch (err) {
      setAiGeneratingVisible(false);
      Alert.alert('Upload Error ❌', err.message || 'Server error parsing resume.');
    }
  };

  // Step sync calls
  const savePersonalInfo = async () => {
    if (!currentResume) return;
    const parts = pName.trim().split(' ');
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ') || '';
    const updated = {
      firstName: first,
      lastName: last,
      title: pTitle,
      email: pEmail,
      phone: pPhone,
      location: pLocation,
      linkedin: pLinkedin,
      github: pGithub,
      portfolio: pPortfolio
    };
    await updateResume(currentResume._id, { personalInfo: updated });
  };

  const saveTargetSummary = async () => {
    if (!currentResume) return;
    await updateResume(currentResume._id, {
      professionalSummary: {
        ...currentResume.professionalSummary,
        summary: targetSummary
      }
    });
  };

  // Next step trigger with auto sync
  const handleNextStep = async () => {
    // Check for unsaved education details
    if (activeStep === 2 && (eduInstitution.trim() || eduDegree.trim())) {
      Alert.alert(
        'Unsaved Education details 🎓',
        'You have typed education details but haven\'t clicked "Add Education" yet. Please click the yellow "Add Education" button to save them or clear the text fields to continue.'
      );
      return;
    }
    // Check for unsaved experience details
    if (activeStep === 3 && (workCompany.trim() || workPosition.trim())) {
      Alert.alert(
        'Unsaved Experience details 💼',
        'You have typed experience details but haven\'t clicked "Add Experience" yet. Please click the yellow "Add Experience" button to save them or clear the text fields to continue.'
      );
      return;
    }
    // Check for unsaved projects details
    if (activeStep === 4 && (projName.trim() || projDesc.trim())) {
      Alert.alert(
        'Unsaved Project details 📂',
        'You have typed project details but haven\'t clicked "Add Project" yet. Please click the yellow "Add Project" button to save them or clear the text fields to continue.'
      );
      return;
    }

    if (activeStep === 1) {
      await savePersonalInfo();
    } else if (activeStep === 7) {
      await saveTargetSummary();
    }
    setActiveStep(prev => Math.min(7, prev + 1));
  };

  // Helper to extract fallback target role
  const getTargetRoleFallback = () => {
    const roles = currentResume?.targetJobs || [];
    return roles.map(r => r.jobTitle).join(', ') || currentResume?.targetJob?.jobTitle || 'Software Engineer';
  };

  // Step 1: Personal Info Card
  const renderStep1 = () => {
    return (
      <View style={styles.formContainer}>
        {/* Upload banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>Already have a resume?</Text>
          <Text style={styles.bannerText}>
            Upload it and AI will auto-fill all fields — no manual typing needed.
          </Text>
          <View style={styles.bannerButtons}>
            <TouchableOpacity style={styles.bannerUploadBtn} onPress={handleAutoFillUpload}>
              <Text style={styles.bannerUploadBtnText}>Upload & Auto-fill</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bannerSkipBtn} onPress={() => {
              setPreviewTemplateId(currentResume?.template || 'modern_ats');
              setPreviewVisible(true);
            }}>
              <Text style={styles.bannerSkipBtnText}>Skip to Preview</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.inputLabel}>Full Name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. John Doe"
          placeholderTextColor="#94A3B8"
          value={pName}
          onChangeText={setPName}
          onBlur={savePersonalInfo}
        />

        <Text style={styles.inputLabel}>Professional Title *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Senior Software Engineer"
          placeholderTextColor="#94A3B8"
          value={pTitle}
          onChangeText={setPTitle}
          onBlur={savePersonalInfo}
        />

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="john@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={pEmail}
              onChangeText={setPEmail}
              onBlur={savePersonalInfo}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+92 301 0000000"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={pPhone}
              onChangeText={setPPhone}
              onBlur={savePersonalInfo}
            />
          </View>
        </View>

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>Location *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Karachi, Pakistan"
              placeholderTextColor="#94A3B8"
              value={pLocation}
              onChangeText={setPLocation}
              onBlur={savePersonalInfo}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>LinkedIn Profile</Text>
            <TextInput
              style={styles.textInput}
              placeholder="linkedin.com/in/johndoe"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              value={pLinkedin}
              onChangeText={setPLinkedin}
              onBlur={savePersonalInfo}
            />
          </View>
        </View>

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>GitHub Profile</Text>
            <TextInput
              style={styles.textInput}
              placeholder="github.com/johndoe"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              value={pGithub}
              onChangeText={setPGithub}
              onBlur={savePersonalInfo}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>Portfolio Website</Text>
            <TextInput
              style={styles.textInput}
              placeholder="johndoe.dev"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              value={pPortfolio}
              onChangeText={setPPortfolio}
              onBlur={savePersonalInfo}
            />
          </View>
        </View>
      </View>
    );
  };

  // Step 2: Education Inline Form & List
  const renderStep2 = () => {
    const items = currentResume?.education || [];

    const handleAddEducation = async () => {
      if (!eduDegree.trim() || !eduInstitution.trim()) {
        Alert.alert('Required', 'Degree and University/Institution are mandatory.');
        return;
      }
      const newItem = {
        degree: eduDegree.trim(),
        fieldOfStudy: eduField.trim(),
        institution: eduInstitution.trim(),
        gpa: eduGpa.trim(),
        currentSemester: eduSemester.trim(),
        startDate: eduStartDate.trim(),
        endDate: eduCurrent ? '' : eduEndDate.trim(),
        current: eduCurrent
      };
      
      let updated;
      if (editingEduIndex !== null) {
        updated = [...items];
        updated[editingEduIndex] = newItem;
      } else {
        updated = [...items, newItem];
      }

      await updateResume(currentResume._id, { education: updated });
      
      // Reset
      setEduDegree('');
      setEduField('');
      setEduInstitution('');
      setEduGpa('');
      setEduSemester('');
      setEduStartDate('');
      setEduEndDate('');
      setEduCurrent(false);
      setEditingEduIndex(null);
    };

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRowBadge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemBadgeTitle}>{item.degree} in {item.fieldOfStudy}</Text>
              <Text style={styles.itemBadgeSub}>{item.institution} • {item.startDate} - {item.current ? 'Currently studying' : item.endDate}</Text>
              {item.gpa ? <Text style={styles.itemBadgeSub}>GPA: {item.gpa}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => {
                setEduDegree(item.degree);
                setEduField(item.fieldOfStudy);
                setEduInstitution(item.institution);
                setEduGpa(item.gpa || '');
                setEduSemester(item.currentSemester || '');
                setEduStartDate(formatDateForInput(item.startDate));
                setEduEndDate(formatDateForInput(item.endDate));
                setEduCurrent(item.current || false);
                setEditingEduIndex(index);
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                const updated = items.filter((_, i) => i !== index);
                await updateResume(currentResume._id, { education: updated });
              }}>
                <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingEduIndex !== null ? `Edit Education #${editingEduIndex + 1}` : `Education #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>Degree</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Bachelor of Science"
          placeholderTextColor="#94A3B8"
          value={eduDegree}
          onChangeText={setEduDegree}
        />

        <Text style={styles.inputLabel}>Field of Study</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Computer Science"
          placeholderTextColor="#94A3B8"
          value={eduField}
          onChangeText={setEduField}
        />

        <Text style={styles.inputLabel}>University / Institution</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Massachusetts Institute of Technology"
          placeholderTextColor="#94A3B8"
          value={eduInstitution}
          onChangeText={setEduInstitution}
        />

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>CGPA / GPA</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 3.8 / 4.0"
              placeholderTextColor="#94A3B8"
              value={eduGpa}
              onChangeText={setEduGpa}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>Current Semester (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 6th Semester"
              placeholderTextColor="#94A3B8"
              value={eduSemester}
              onChangeText={setEduSemester}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Start Date</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Sep 2020"
          placeholderTextColor="#94A3B8"
          value={eduStartDate}
          onChangeText={setEduStartDate}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Currently studying here</Text>
          <Switch
            value={eduCurrent}
            onValueChange={setEduCurrent}
            trackColor={{ false: '#767577', true: '#f9c349' }}
            thumbColor={eduCurrent ? '#fff' : '#f4f3f4'}
          />
        </View>

        {!eduCurrent && (
          <>
            <Text style={styles.inputLabel}>End Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. May 2024"
              placeholderTextColor="#94A3B8"
              value={eduEndDate}
              onChangeText={setEduEndDate}
            />
          </>
        )}

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddEducation}>
          <Text style={styles.yellowButtonText}>
            {editingEduIndex !== null ? 'Update Education' : 'Add Education'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Step 3: Work Experience Inline Form & List
  const renderStep3 = () => {
    const items = currentResume?.workExperience || [];

    const handleAddWork = async () => {
      if (!workCompany.trim() || !workPosition.trim()) {
        Alert.alert('Required', 'Company name and Position/Role are mandatory.');
        return;
      }
      const newItem = {
        company: workCompany.trim(),
        position: workPosition.trim(),
        location: workLocation.trim(),
        startDate: workStartDate.trim(),
        endDate: workCurrent ? '' : workEndDate.trim(),
        current: workCurrent,
        description: workDesc.trim()
      };

      let updated;
      if (editingWorkIndex !== null) {
        updated = [...items];
        updated[editingWorkIndex] = newItem;
      } else {
        updated = [...items, newItem];
      }

      await updateResume(currentResume._id, { workExperience: updated });
      
      // Reset
      setWorkCompany('');
      setWorkPosition('');
      setWorkLocation('');
      setWorkStartDate('');
      setWorkEndDate('');
      setWorkCurrent(false);
      setWorkDesc('');
      setEditingWorkIndex(null);
    };

    const handleAIEnhanceWork = async () => {
      if (!workDesc.trim()) {
        Alert.alert('Empty', 'Please type in your responsibilities first before enhancing.');
        return;
      }
      try {
        setAiProcessing(true);
        const result = await resumeApi.enhanceText(
          workDesc,
          `Work experience as ${workPosition || 'professional'} at ${workCompany || 'a company'}`
        );
        if (result?.enhanced) {
          setWorkDesc(result.enhanced);
        }
        setAiProcessing(false);
      } catch (err) {
        setAiProcessing(false);
        Alert.alert('AI Error', err.message || 'Enhancement failed. Please try again later.');
      }
    };

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRowBadge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemBadgeTitle}>{item.position} at {item.company}</Text>
              <Text style={styles.itemBadgeSub}>{item.location} • {item.startDate} - {item.current ? 'Present' : item.endDate}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => {
                setWorkCompany(item.company);
                setWorkPosition(item.position);
                setWorkLocation(item.location || '');
                setWorkStartDate(formatDateForInput(item.startDate));
                setWorkEndDate(formatDateForInput(item.endDate));
                setWorkCurrent(item.current || false);
                setWorkDesc(item.description || '');
                setEditingWorkIndex(index);
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                const updated = items.filter((_, i) => i !== index);
                await updateResume(currentResume._id, { workExperience: updated });
              }}>
                <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingWorkIndex !== null ? `Edit Experience #${editingWorkIndex + 1}` : `Experience #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>Company Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Google"
          placeholderTextColor="#94A3B8"
          value={workCompany}
          onChangeText={setWorkCompany}
        />

        <Text style={styles.inputLabel}>Job Title / Role</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Software Engineer"
          placeholderTextColor="#94A3B8"
          value={workPosition}
          onChangeText={setWorkPosition}
        />

        <Text style={styles.inputLabel}>Location</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Mountain View, CA"
          placeholderTextColor="#94A3B8"
          value={workLocation}
          onChangeText={setWorkLocation}
        />

        <Text style={styles.inputLabel}>Start Date</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Jan 2022"
          placeholderTextColor="#94A3B8"
          value={workStartDate}
          onChangeText={setWorkStartDate}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Currently working here</Text>
          <Switch
            value={workCurrent}
            onValueChange={setWorkCurrent}
            trackColor={{ false: '#767577', true: '#f9c349' }}
            thumbColor={workCurrent ? '#fff' : '#f4f3f4'}
          />
        </View>

        {!workCurrent && (
          <>
            <Text style={styles.inputLabel}>End Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Dec 2023"
              placeholderTextColor="#94A3B8"
              value={workEndDate}
              onChangeText={setWorkEndDate}
            />
          </>
        )}

        <View style={styles.labelWithAction}>
          <Text style={styles.inputLabel}>Responsibilities & Achievements</Text>
          <TouchableOpacity style={styles.aiEnhanceMiniBtn} onPress={handleAIEnhanceWork} disabled={aiProcessing}>
            <Ionicons name="sparkles" size={14} color="#000" />
            <Text style={styles.aiEnhanceMiniBtnText}>AI Enhance</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.textInput, styles.summaryTextarea]}
          multiline
          placeholder="Describe your key responsibilities and achievements. The AI can convert these into polished ATS-friendly bullet points."
          placeholderTextColor="#94A3B8"
          value={workDesc}
          onChangeText={setWorkDesc}
        />

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddWork}>
          <Text style={styles.yellowButtonText}>
            {editingWorkIndex !== null ? 'Update Experience' : 'Add Experience'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Step 4: Projects Inline Form & List
  const renderStep4 = () => {
    const items = currentResume?.projects || [];

    const handleAddProj = async () => {
      if (!projName.trim() || !projDesc.trim()) {
        Alert.alert('Required', 'Project name and Description are mandatory.');
        return;
      }
      const newItem = {
        name: projName.trim(),
        technologies: projTech.split(',').map(s => s.trim()).filter(Boolean),
        githubUrl: projGithub.trim(),
        url: projLive.trim(),
        description: projDesc.trim()
      };

      let updated;
      if (editingProjIndex !== null) {
        updated = [...items];
        updated[editingProjIndex] = newItem;
      } else {
        updated = [...items, newItem];
      }

      await updateResume(currentResume._id, { projects: updated });
      
      // Reset
      setProjName('');
      setProjTech('');
      setProjGithub('');
      setProjLive('');
      setProjDesc('');
      setEditingProjIndex(null);
    };

    const handleAIEnhanceProj = async () => {
      if (!projDesc.trim()) {
        Alert.alert('Empty', 'Please describe your project first.');
        return;
      }
      try {
        setAiProcessing(true);
        const result = await resumeApi.enhanceText(
          projDesc,
          `Project description for ${projName || 'a software project'} using ${projTech || 'various technologies'}`
        );
        if (result?.enhanced) {
          setProjDesc(result.enhanced);
        }
        setAiProcessing(false);
      } catch (err) {
        setAiProcessing(false);
        Alert.alert('AI Error', err.message || 'Enhancement failed. Please try again later.');
      }
    };

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRowBadge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemBadgeTitle}>{item.name}</Text>
              <Text style={styles.itemBadgeSub}>{Array.isArray(item.technologies) ? item.technologies.join(', ') : item.technologies}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => {
                setProjName(item.name);
                setProjTech(Array.isArray(item.technologies) ? item.technologies.join(', ') : item.technologies || '');
                setProjGithub(item.githubUrl || '');
                setProjLive(item.url || '');
                setProjDesc(item.description || '');
                setEditingProjIndex(index);
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                const updated = items.filter((_, i) => i !== index);
                await updateResume(currentResume._id, { projects: updated });
              }}>
                <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingProjIndex !== null ? `Edit Project #${editingProjIndex + 1}` : `Project #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>Project Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. AI Resume Builder"
          placeholderTextColor="#94A3B8"
          value={projName}
          onChangeText={setProjName}
        />

        <Text style={styles.inputLabel}>Tech Stack</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. React, Next.js, OpenAI, TailwindCSS, PostgreSQL"
          placeholderTextColor="#94A3B8"
          value={projTech}
          onChangeText={setProjTech}
        />

        <Text style={styles.inputLabel}>GitHub URL</Text>
        <TextInput
          style={styles.textInput}
          placeholder="github.com/user/project"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          value={projGithub}
          onChangeText={setProjGithub}
        />

        <Text style={styles.inputLabel}>Live URL</Text>
        <TextInput
          style={styles.textInput}
          placeholder="project.vercel.app"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          value={projLive}
          onChangeText={setProjLive}
        />

        <View style={styles.labelWithAction}>
          <Text style={styles.inputLabel}>Description</Text>
          <TouchableOpacity style={styles.aiEnhanceMiniBtn} onPress={handleAIEnhanceProj} disabled={aiProcessing}>
            <Ionicons name="sparkles" size={14} color="#000" />
            <Text style={styles.aiEnhanceMiniBtnText}>AI Enhance</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.textInput, styles.summaryTextarea]}
          multiline
          placeholder="What did you build? What problem did it solve? What was the impact?"
          placeholderTextColor="#94A3B8"
          value={projDesc}
          onChangeText={setProjDesc}
        />

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddProj}>
          <Text style={styles.yellowButtonText}>
            {editingProjIndex !== null ? 'Update Project' : 'Add Project'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Step 5: Skills Tag Input
  const renderStep5 = () => {
    const items = currentResume?.skills || [];

    const handleAddSkill = async () => {
      if (!skillInput.trim()) return;
      const exist = items.some(s => s.name.toLowerCase() === skillInput.trim().toLowerCase());
      if (exist) {
        setSkillInput('');
        return;
      }
      const updated = [...items, { name: skillInput.trim(), level: 'Advanced' }];
      await updateResume(currentResume._id, { skills: updated });
      setSkillInput('');
    };

    return (
      <View style={styles.formContainer}>
        <View style={styles.skillInputWrapper}>
          <TextInput
            style={styles.skillTextInput}
            placeholder="Type a skill and press Enter or comma..."
            placeholderTextColor="#94A3B8"
            value={skillInput}
            onChangeText={setSkillInput}
            onSubmitEditing={handleAddSkill}
          />
          <TouchableOpacity style={styles.skillAddBtn} onPress={handleAddSkill}>
            <Ionicons name="add" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCardBody}>
            <Text style={styles.emptyCardText}>No skills added yet — type above or use AI Suggestions</Text>
          </View>
        ) : (
          <View style={styles.skillsTagRow}>
            {items.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill.name}</Text>
                <TouchableOpacity onPress={async () => {
                  const updated = items.filter((_, i) => i !== index);
                  await updateResume(currentResume._id, { skills: updated });
                }}>
                  <Ionicons name="close" size={14} color="#64748B" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.yellowButton, { marginTop: 24 }]}
          onPress={async () => {
            try {
              const items = currentResume?.skills || [];
              const targetRole = getTargetRoleFallback();
              const result = await resumeApi.suggestSkills(
                items.map(s => s.name),
                targetRole
              );
              if (result?.suggestions && result.suggestions.length > 0) {
                const existingNames = new Set(items.map(s => s.name.toLowerCase()));
                const newSkills = result.suggestions
                  .filter(s => !existingNames.has(s.toLowerCase()))
                  .map(s => ({ name: s, level: 'Intermediate' }));
                if (newSkills.length > 0) {
                  await updateResume(currentResume._id, { skills: [...items, ...newSkills] });
                  Alert.alert('Skills Added ✨', `${newSkills.length} new skills added based on your target role.`);
                } else {
                  Alert.alert('All Caught Up ✓', 'No new skills to suggest — you already have them!');
                }
              } else {
                Alert.alert('No Suggestions', 'Could not generate suggestions. Try adding a target role in Step 7.');
              }
            } catch (err) {
              Alert.alert('AI Failed', err.message || 'Suggestions timed out. Please try again.');
            }
          }}
        >
          <Text style={styles.yellowButtonText}>✨ AI Skill Suggestions</Text>
        </TouchableOpacity>
        <Text style={styles.skillTipText}>💡 Press Enter or , to add a skill quickly</Text>
      </View>
    );
  };

  // Step 6: Certifications Inline Form & List
  const renderStep6 = () => {
    const items = currentResume?.certifications || [];

    const handleAddCertification = async () => {
      if (!certName.trim() || !certIssuer.trim()) {
        Alert.alert('Required', 'Certification name and Issuer are mandatory.');
        return;
      }
      const newCert = {
        name: certName.trim(),
        organization: certIssuer.trim(),
        date: certIssueDate.trim(),
        url: certUrl.trim(),
        expiryDate: certExpiryDate.trim()
      };

      let updated;
      if (editingCertIndex !== null) {
        updated = [...items];
        updated[editingCertIndex] = newCert;
      } else {
        updated = [...items, newCert];
      }

      await updateResume(currentResume._id, { certifications: updated });
      
      // Clear
      setCertName('');
      setCertIssuer('');
      setCertIssueDate('');
      setCertUrl('');
      setCertExpiryDate('');
      setEditingCertIndex(null);
    };

    return (
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRowBadge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemBadgeTitle}>{item.name}</Text>
              <Text style={styles.itemBadgeSub}>{item.organization} • {item.date}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => {
                setCertName(item.name);
                setCertIssuer(item.organization);
                setCertIssueDate(item.date || '');
                setCertUrl(item.url || '');
                setCertExpiryDate(item.expiryDate || '');
                setEditingCertIndex(index);
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                const updated = items.filter((_, i) => i !== index);
                await updateResume(currentResume._id, { certifications: updated });
              }}>
                <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingCertIndex !== null ? `Edit Certification #${editingCertIndex + 1}` : `Certification #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>Certification Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. AWS Certified Solutions Architect"
          placeholderTextColor="#94A3B8"
          value={certName}
          onChangeText={setCertName}
        />

        <Text style={styles.inputLabel}>Issuer</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Amazon Web Services"
          placeholderTextColor="#94A3B8"
          value={certIssuer}
          onChangeText={setCertIssuer}
        />

        <Text style={styles.inputLabel}>Issue Date</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. March 2024"
          placeholderTextColor="#94A3B8"
          value={certIssueDate}
          onChangeText={setCertIssueDate}
        />

        <Text style={styles.inputLabel}>Credential URL (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="credly.com/badges/..."
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          value={certUrl}
          onChangeText={setCertUrl}
        />

        <Text style={styles.inputLabel}>Expiry Date (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. March 2027"
          placeholderTextColor="#94A3B8"
          value={certExpiryDate}
          onChangeText={setCertExpiryDate}
        />

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddCertification}>
          <Text style={styles.yellowButtonText}>
            {editingCertIndex !== null ? 'Update Certification' : 'Add Certification'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Step 7: Target Job with multi role selection
  const renderStep7 = () => {
    const selectedRoles = currentResume?.targetJobs || [];

    const handleSelectRole = async (role) => {
      const exist = selectedRoles.some(r => r.jobTitle.toLowerCase() === role.toLowerCase());
      let updated;
      if (exist) {
        updated = selectedRoles.filter(r => r.jobTitle.toLowerCase() !== role.toLowerCase());
      } else {
        updated = [...selectedRoles, { jobTitle: role, industry: expandedIndustry || '', jobType: 'Full-time' }];
      }
      await updateResume(currentResume._id, { 
        targetJobs: updated,
        targetJob: updated[0] || { jobTitle: role, industry: expandedIndustry || '', jobType: 'Full-time' } 
      });
    };

    const handleClearRole = async (role) => {
      const updated = selectedRoles.filter(r => r.jobTitle.toLowerCase() !== role.toLowerCase());
      await updateResume(currentResume._id, { 
        targetJobs: updated,
        targetJob: updated[0] || {}
      });
    };

    const handleAIGenerateSummary = async () => {
      const jobTitle = getTargetRoleFallback();
      if (!jobTitle || selectedRoles.length === 0) {
        Alert.alert('Required', 'Please select at least one target role first.');
        return;
      }
      try {
        setAiProcessing(true);
        const skillNames = (currentResume?.skills || []).map(s => s.name).join(', ');
        const expSummary = (currentResume?.workExperience || []).map(w => `${w.position} at ${w.company}`).join(', ');
        const prompt = `Write a concise, powerful 3-4 sentence professional summary for a ${jobTitle} resume. Skills: ${skillNames || 'not specified'}. Experience: ${expSummary || 'not specified'}. Make it ATS-optimized.`;
        const result = await resumeApi.enhanceText(prompt, `professional summary for ${jobTitle}`);
        if (result?.enhanced) {
          setTargetSummary(result.enhanced);
          await updateResume(currentResume._id, {
            professionalSummary: {
              ...currentResume.professionalSummary,
              summary: result.enhanced
            }
          });
        }
        setAiProcessing(false);
      } catch (err) {
        setAiProcessing(false);
        Alert.alert('AI Error', err.message || 'Failed to generate summary.');
      }
    };

    return (
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.inputLabel}>Search roles or type a custom role & press Enter...</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Search roles..."
          placeholderTextColor="#94A3B8"
          value={roleSearchQuery}
          onChangeText={setRoleSearchQuery}
        />

        {selectedRoles.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.inputLabel}>Selected:</Text>
            <View style={styles.skillsTagRow}>
              {selectedRoles.map((role, idx) => (
                <View key={idx} style={styles.skillTag}>
                  <Text style={styles.skillTagText}>{role.jobTitle}</Text>
                  <TouchableOpacity onPress={() => handleClearRole(role.jobTitle)}>
                    <Text style={{ marginLeft: 6, color: '#E74C3C', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.rolesListContainer}>
          {INDUSTRIES.map(ind => {
            const matched = ind.roles.filter(r => r.toLowerCase().includes(roleSearchQuery.toLowerCase()));
            if (matched.length === 0) return null;

            return (
              <View key={ind.name} style={styles.industryBlock}>
                <TouchableOpacity 
                  style={styles.industryHeader}
                  onPress={() => setExpandedIndustry(expandedIndustry === ind.name ? null : ind.name)}
                >
                  <Text style={styles.industryHeaderTitle}>{ind.name}</Text>
                  <Ionicons 
                    name={expandedIndustry === ind.name ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color="#475569" 
                  />
                </TouchableOpacity>

                {expandedIndustry === ind.name && (
                  <View style={styles.industryRolesGrid}>
                    {matched.map(role => {
                      const isActive = selectedRoles.some(r => r.jobTitle.toLowerCase() === role.toLowerCase());
                      return (
                        <TouchableOpacity 
                          key={role} 
                          style={[styles.roleSelectBtn, isActive && styles.roleSelectBtnActive]}
                          onPress={() => handleSelectRole(role)}
                        >
                          <Text style={[styles.roleSelectText, isActive && styles.roleSelectTextActive]}>
                            {role}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={[styles.inputLabel, { marginTop: 24 }]}>Professional Summary</Text>
        <TextInput
          style={[styles.textInput, styles.summaryTextarea]}
          multiline
          placeholder="Your professional summary will appear here after generation, or type manually..."
          placeholderTextColor="#94A3B8"
          value={targetSummary}
          onChangeText={setTargetSummary}
          onBlur={saveTargetSummary}
        />

        <TouchableOpacity 
          style={styles.yellowButton} 
          onPress={handleAIGenerateSummary}
          disabled={aiProcessing}
        >
          {aiProcessing ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.yellowButtonText}>⚡ Generate with AI</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Step 8: Templates & Styles Customize Panel
  const renderStep8 = () => {
    return (
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {/* Templates Catalog */}
        <Text style={styles.inputLabel}>Choose Resume Template Style</Text>
        <View style={styles.templatesCatalogRow}>
          {SYSTEM_TEMPLATES.map(t => {
            const isActive = currentResume?.template === t.id;
            return (
              <View key={t.id} style={[styles.catalogCard, isActive && styles.catalogCardActive]}>
                <Text style={styles.catalogCardTitle}>{t.name}</Text>
                <Text style={styles.catalogCardDesc}>{t.desc}</Text>
                <View style={styles.catalogCardActions}>
                  <TouchableOpacity 
                    style={styles.catalogPreviewBtn} 
                    onPress={() => {
                      setPreviewTemplateId(t.id);
                      setPreviewVisible(true);
                    }}
                  >
                    <Ionicons name="eye-outline" size={14} color="#64748B" />
                    <Text style={styles.catalogPreviewBtnText}>Preview</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.catalogApplyBtn, isActive && styles.catalogApplyBtnActive]} 
                    onPress={async () => {
                      await updateResume(currentResume._id, { template: t.id });
                    }}
                  >
                    <Text style={[styles.catalogApplyBtnText, isActive && styles.catalogApplyBtnTextActive]}>
                      {isActive ? 'Applied' : 'Apply'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Custom Styles */}
        <Text style={styles.sectionHeading}>Custom Style Options</Text>

        <Text style={styles.inputLabel}>Font Family</Text>
        <View style={styles.fontGrid}>
          {FONTS.map(f => (
            <TouchableOpacity 
              key={f}
              style={[styles.fontBtn, selectedFont === f && styles.fontBtnActive]}
              onPress={() => {
                setSelectedFont(f);
                saveCustomStyles({ font: f });
              }}
            >
              <Text style={styles.fontBtnText}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Color Preset</Text>
        <View style={styles.presetGrid}>
          {PRESETS.map(p => (
            <TouchableOpacity 
              key={p.name} 
              style={[styles.presetCircle, { backgroundColor: p.color }, selectedColor === p.color && { borderWidth: 3, borderColor: '#000' }]}
              onPress={() => {
                setSelectedColor(p.color);
                setAccentColor(p.color);
                setHeadingColor(p.color);
                saveCustomStyles({ accentColor: p.color, headingColor: p.color });
              }}
            />
          ))}
        </View>

        <Text style={styles.inputLabel}>Custom Palette Details (Tap to Cycle Colors)</Text>
        <View style={styles.customPaletteRow}>
          <TouchableOpacity style={[styles.paletteCircle, { backgroundColor: accentColor }]} onPress={cycleAccentColor}>
            <Text style={[styles.palText, { color: accentColor === '#111827' || accentColor === '#1E3A8A' ? '#fff' : '#000' }]}>Accent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paletteCircle, { backgroundColor: headingColor }]} onPress={cycleHeadingColor}>
            <Text style={[styles.palText, { color: headingColor === '#111827' || headingColor === '#0F172A' ? '#fff' : '#000' }]}>Headings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paletteCircle, { backgroundColor: '#E2E8F0', borderLeftColor: textColor, borderLeftWidth: 8 }]} onPress={cycleTextColor}>
            <Text style={styles.palText}>Text</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.paletteCircle, { backgroundColor: bgColor, borderColor: '#CBD5E1', borderWidth: 1 }]} onPress={cycleBgColor}>
            <Text style={[styles.palText, { color: '#000' }]}>Bg</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.yellowButton, { marginTop: 24 }]}
          onPress={() => navigation.navigate('ViewResume', { resumeId: currentResume?._id })}
        >
          <Text style={styles.yellowButtonText}>Save & Download Resume 🚀</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Compile responsive WebView HTML for pure preview modal
  const renderPreviewHTMLMobile = () => {
    if (!currentResume) return '';
    return renderResumeHTML(currentResume, previewTemplateId, {
      font: selectedFont,
      accentColor: accentColor,
      headingColor: headingColor,
      textColor: textColor,
      bgColor: bgColor
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Top Header */}
      <View style={styles.mainHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.mainHeaderTitle}>TDC Resume Builder</Text>
        <TouchableOpacity onPress={() => {
          setPreviewTemplateId(currentResume?.template || 'modern_ats');
          setPreviewVisible(true);
        }} style={styles.previewFloatBtn}>
          <Ionicons name="eye-outline" size={22} color="#f9c349" />
        </TouchableOpacity>
      </View>

      {/* Stepper icons */}
      <View style={styles.stepperContainer}>
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <View style={styles.stepIndicatorWrapper}>
              <TouchableOpacity 
                style={[
                  styles.stepCircle, 
                  activeStep === s.id && styles.stepCircleActive,
                  activeStep > s.id && styles.stepCircleCompleted
                ]}
                onPress={() => setActiveStep(s.id)}
              >
                <Ionicons 
                  name={activeStep > s.id ? 'checkmark' : s.icon} 
                  size={16} 
                  color={activeStep === s.id ? '#000' : activeStep > s.id ? '#fff' : '#64748B'} 
                />
              </TouchableOpacity>
              {idx < steps.length - 1 && (
                <View style={[styles.stepLine, activeStep > s.id && styles.stepLineCompleted]} />
              )}
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* The White Card containing the active step form */}
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{steps[activeStep - 1].title}</Text>
            <View style={styles.cardStepBadge}>
              <Text style={styles.cardStepBadgeText}>{activeStep}/7</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>{steps[activeStep - 1].desc}</Text>



          {/* Form Switcher */}
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
          {activeStep === 3 && renderStep3()}
          {activeStep === 4 && renderStep4()}
          {activeStep === 5 && renderStep5()}
          {activeStep === 6 && renderStep6()}
          {activeStep === 7 && renderStep7()}
        </View>

        {/* Persistent Bottom Stepper Navigation buttons */}
        <View style={styles.footerContainer}>
          <TouchableOpacity 
            style={[styles.backButton, activeStep === 1 && { opacity: 0.5 }]}
            disabled={activeStep === 1}
            onPress={() => setActiveStep(prev => Math.max(1, prev - 1))}
          >
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.continueButton, activeStep === 7 && { backgroundColor: '#2ECC71' }]}
            onPress={async () => {
              if (activeStep === 7) {
                await saveTargetSummary();
                navigation.navigate('ResumeView', { resumeId: currentResume?._id });
              } else {
                await handleNextStep();
              }
            }}
          >
            <Text style={[styles.continueButtonText, activeStep === 7 && { color: '#ffffff' }]}>
              {activeStep === 7 ? 'Finish & Preview 🚀' : 'Continue'}
            </Text>
            <Ionicons 
              name={activeStep === 7 ? "checkmark-done" : "arrow-forward"} 
              size={16} 
              color={activeStep === 7 ? "#ffffff" : "#000000"} 
            />
          </TouchableOpacity>
        </View>

        {/* Label list underneath the stepper */}
        <View style={styles.bottomLabelsContainer}>
          {steps.map(s => (
            <Text 
              key={s.id} 
              style={[styles.bottomLabelText, activeStep === s.id && styles.bottomLabelTextActive]}
            >
              {s.name}
            </Text>
          ))}
        </View>
      </ScrollView>

      {/* CLEAN MODAL PREVIEW (Shows ONLY the WebView - No custom style tools inside modal) */}
      <Modal visible={previewVisible} transparent animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
        <SafeAreaView style={styles.previewOverlay}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Resume Template Preview</Text>
            <TouchableOpacity onPress={() => setPreviewVisible(false)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
          {currentResume ? (
            <WebView
              style={styles.previewWebView}
              source={{ html: renderPreviewHTMLMobile() }}
              originWhitelist={['*']}
              scalesPageToFit={true}
              onShouldStartLoadWithRequest={(request) => {
                if (request.url.startsWith('http') || request.url.startsWith('mailto:') || request.url.startsWith('tel:')) {
                  return false;
                }
                return true;
              }}
            />
          ) : (
            <View style={styles.previewEmpty}>
              <Text style={styles.previewEmptyText}>Create a draft to view template preview</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* AI Processing / Generation Modal */}
      <Modal visible={aiGeneratingVisible} transparent={true} animationType="fade">
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContent}>
            <ActivityIndicator size="large" color="#f9c349" style={{ marginBottom: 16 }} />
            <Text style={styles.aiModalTitle}>AI Resume Parser 🤖</Text>
            <Text style={styles.aiModalStep}>{aiGeneratingStep}</Text>
            <View style={styles.aiProgressTrack}>
              <View style={[styles.aiProgressBar, { width: `${aiGeneratingProgress}%` }]} />
            </View>
            <Text style={styles.aiModalPercent}>{aiGeneratingProgress}%</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainHeader: {
    height: 60,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  headerBackBtn: {
    padding: 4,
  },
  mainHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  previewFloatBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
  },
  stepIndicatorWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexDirection: 'row',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#334155',
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: '#f9c349',
    borderColor: '#f9c349',
  },
  stepCircleCompleted: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  stepLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#334155',
    left: '50%',
    right: '-50%',
    top: 15,
    zIndex: 1,
  },
  stepLineCompleted: {
    backgroundColor: '#2ECC71',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 10,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardStepBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardStepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  bannerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  bannerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerUploadBtn: {
    backgroundColor: '#f9c349',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  bannerUploadBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  bannerSkipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerSkipBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  inputGridRow: {
    flexDirection: 'row',
  },
  yellowButton: {
    backgroundColor: '#f9c349',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  yellowButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiEnhanceMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9c349',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiEnhanceMiniBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    marginLeft: 4,
  },
  skillInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skillTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginRight: 10,
  },
  skillAddBtn: {
    backgroundColor: '#f9c349',
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  skillTagText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  skillTipText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
  },
  certificationHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  emptyCardBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  emptyCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyCardSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  itemRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  itemBadgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemBadgeSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rolesListContainer: {
    marginTop: 10,
  },
  industryBlock: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  industryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  industryHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  industryRolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#ffffff',
  },
  roleSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  roleSelectBtnActive: {
    backgroundColor: '#f9c349',
    borderColor: '#f9c349',
  },
  roleSelectText: {
    fontSize: 12,
    color: '#475569',
  },
  roleSelectTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  summaryTextarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  layoutBtnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  layoutChoiceBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginBottom: 10,
  },
  layoutChoiceBtnActive: {
    borderColor: '#f9c349',
    backgroundColor: 'rgba(249,195,73,0.03)',
  },
  layoutChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 8,
  },
  layoutChoiceTextActive: {
    color: '#f9c349',
    fontWeight: '700',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9c349',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginRight: 6,
  },
  bottomLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  bottomLabelText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
  },
  bottomLabelTextActive: {
    color: '#f9c349',
    fontWeight: '700',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewHeader: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#000000',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  previewWebView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  previewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmptyText: {
    color: '#666',
  },
  templatesCatalogRow: {
    marginTop: 10,
  },
  catalogCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  catalogCardActive: {
    borderColor: '#f9c349',
    backgroundColor: 'rgba(249,195,73,0.02)',
  },
  catalogCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  catalogCardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 12,
  },
  catalogCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogPreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#ffffff',
  },
  catalogPreviewBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 4,
  },
  catalogApplyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f9c349',
  },
  catalogApplyBtnActive: {
    backgroundColor: '#2ECC71',
  },
  catalogApplyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  catalogApplyBtnTextActive: {
    color: '#fff',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 24,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  fontGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 12,
  },
  fontBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  fontBtnActive: {
    backgroundColor: '#f9c349',
  },
  fontBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  presetGrid: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 12,
  },
  presetCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  customPaletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
  },
  paletteCircle: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  palText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  aiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiModalContent: {
    width: width * 0.85,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  aiModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  aiModalStep: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    textAlign: 'center',
  },
  aiProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  aiProgressBar: {
    height: '100%',
    backgroundColor: '#f9c349',
    borderRadius: 3,
  },
  aiModalPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f9c349',
  },
  helpTipCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderLeftWidth: 3,
    borderLeftColor: '#f9c349',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  helpTipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  helpTipText: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 16,
  },
});

export default ResumeBuilderScreen;