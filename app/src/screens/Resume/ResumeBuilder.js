// app/src/screens/Resume/ResumeBuilder.js
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
import { SafeAreaView } from 'react-native-safe-area-context';
// the focused field scrolls above the keyboard (KeyboardProvider is at the app root)
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { AuthContext } from '../../context/AuthContext';
import { useGuestGate } from '../../guest/GuestGate';
import { ResumeContext } from '../../context/ResumeContext';
import { useNavigation, useRoute, usePreventRemove } from '@react-navigation/native';
import useAction, { errorMessage } from '../../hooks/useAction';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { renderResumeHTML } from '../../services/templateService';
import resumeApi from '../../api/resumeApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ResumeStrength from '../../components/ResumeStrength';
import { finishErrors as requiredForFinish, defaultResumeName } from '../../utils/resumeRules';

import { color as T, font as F } from "../../theme/tokens";
import ScreenHeader, { HeaderIconButton } from "../../ui/ScreenHeader";
import { plainError } from "../../utils/plainError";
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
  { name: 'Classic', color: T.ink },
  { name: 'Emerald', color: T.success },
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

// A list item's identity: the server's _id, else its content (guest items). Never its position,
// so deleting one item can't make "Update" overwrite another.
export const keyOf = (item) => (item?._id ? `id:${item._id}` : `v:${JSON.stringify(item)}`);
export const indexOfKey = (list, key) => (key == null ? -1 : (list || []).findIndex((x) => keyOf(x) === key));

// The personal-info fields as the server stores them
export const buildPersonal = ({ name, title, email, phone, location, linkedin, github, portfolio }) => {
  const parts = String(name || '').trim().split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    title, email, phone, location, linkedin, github, portfolio,
  };
};

export const LIMIT_TITLE = 'you already have 2 resumes';
export const LIMIT_TEXT = 'open one of them to edit it, or delete one to make a new one.';

const ResumeBuilderScreen = () => {
  const { user } = useContext(AuthContext);
  const { requireAccount, isGuest: guestMode } = useGuestGate();
  const {
    currentResume,
    resumes = [],
    creationsUsed = 0,
    createResume,
    updateResume,
    uploadResume,
    loading,
    uploadProgress,
    error,
    clearError,
    fetchResumes,
    setCurrentResume,
    loadResume,
  } = useContext(ResumeContext);

  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId, step: startStep } = route.params || {};
  // no resumeId = a new resume: nothing is created until the student saves something
  const isNew = !resumeId;
  const createdIdRef = useRef(null);
  const creatingRef = useRef(null);
  const limitShownRef = useRef(false);
  const [opened, setOpened] = useState(false); // first list load done

  // One action per button: its own spinner, one tap at a time, errors shown plainly
  const runner = (errorTitle) => ({ errorTitle });
  const saveItem = useAction(async (_c, task) => task(), runner('not saved'));
  const removeItem = useAction(async (_c, task) => task(), runner('not deleted'));
  const addSkill = useAction(async (_c, task) => task(), runner('skill not added'));
  const toggleRole = useAction(async (_c, task) => task(), runner('not saved'));
  const moveStep = useAction(async (_c, task) => task(), runner('not saved'));
  const saveStep1 = useAction(async (_c, task) => task(), runner('not saved'));
  const saveStep6 = useAction(async (_c, task) => task(), runner('not saved'));
  const aiWork = useAction(async (_c, task) => task(), runner("AI couldn't help right now"));
  const aiProj = useAction(async (_c, task) => task(), runner("AI couldn't help right now"));
  const aiSummary = useAction(async (_c, task) => task(), runner("AI couldn't write a summary"));
  const aiSkills = useAction(async (_c, task) => task(), runner("AI couldn't suggest skills"));
  const finish = useAction(async (_c, task) => task(), runner('not saved'));

  // Step state: 1 to 7
  const [activeStep, setActiveStep] = useState(startStep >= 1 && startStep <= 7 ? startStep : 1);
  // "edit" from the preview / the upload review opens the builder at that section
  useEffect(() => { if (startStep >= 1 && startStep <= 7) setActiveStep(startStep); }, [startStep]);
  // missing required fields: only after the student tries to finish
  const [finishTried, setFinishTried] = useState(false);
  // the resume's name (empty = the default "<Full name> – <title>")
  const [resumeNameInput, setResumeNameInput] = useState('');
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

  // Step 5: Certifications Inline Form
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certUrl, setCertUrl] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [editingCertIndex, setEditingCertIndex] = useState(null);

  // Step 6: Target Job Inline
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [expandedIndustry, setExpandedIndustry] = useState('Technology');
  const [targetSummary, setTargetSummary] = useState('');

  // Step 7: Skills Tag Input
  const [skillInput, setSkillInput] = useState('');

  // AI & Preview Control
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState('modern_ats');

  // Customize options
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [selectedColor, setSelectedColor] = useState('#1E3A8A');
  const [accentColor, setAccentColor] = useState('#1E3A8A');
  const [headingColor, setHeadingColor] = useState('#0F172A');
  const [textColor, setTextColor] = useState('#334155');
  const [bgColor, setBgColor] = useState(T.white);

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

  // only the changed colour / font is sent; the server merges it (background save: logged, not shown)
  const saveCustomStyles = async (updatedFields) => {
    if (!currentResume?._id) return;
    try {
      await updateResume(currentResume._id, { customStyles: updatedFields });
    } catch (err) {
      console.warn('[builder] style not saved:', err?.message);
    }
  };

  const ACCENT_COLORS = ['#1E3A8A', '#0F766E', T.ink, '#111827'];
  const HEADING_COLORS = ['#0F172A', '#1E293B', '#111827'];
  const TEXT_COLORS = ['#334155', '#475569', '#111827'];
  const BG_COLORS = [T.white, T.sand, T.sand];

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

  // ============================================================
  // STEPPER TITLES — NEW ORDER
  // 1. Personal
  // 2. Education
  // 3. Work
  // 4. Projects
  // 5. Certifications
  // 6. Target Job
  // 7. Skills
  // ============================================================
  const steps = [
    { id: 1, name: 'Personal', icon: 'person-outline', title: 'Personal Info', desc: 'Your name and how employers can reach you' },
    { id: 2, name: 'Education', icon: 'school-outline', title: 'Education', desc: 'School, college or university' },
    { id: 3, name: 'Experience', icon: 'briefcase-outline', title: 'Experience', desc: 'Internships, jobs and volunteering (optional)' },
    { id: 4, name: 'Projects', icon: 'folder-outline', title: 'Projects', desc: 'Class, personal or work projects (optional)' },
    { id: 5, name: 'Certificates', icon: 'ribbon-outline', title: 'Certificates', desc: 'Courses and certificates (optional)' },
    { id: 6, name: 'Summary', icon: 'locate-outline', title: 'Summary & goal', desc: 'The job you want and 2–3 lines about you (optional)' },
    { id: 7, name: 'Skills', icon: 'hammer-outline', title: 'Skills', desc: 'What you are good at — any field (optional)' },
  ];

  // Date format helper
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const syncedResumeIdRef = useRef(null);
  const syncedStepRef = useRef(null);

  // What was last saved (or loaded), to send personal info / summary only when they changed
  const currentPersonal = () => buildPersonal({ name: pName, title: pTitle, email: pEmail, phone: pPhone, location: pLocation, linkedin: pLinkedin, github: pGithub, portfolio: pPortfolio });
  const lastPersonalRef = useRef(null);
  const personalInflight = useRef(null);
  const lastSummaryRef = useRef(null);
  const personalUnsaved = () => lastPersonalRef.current !== null && JSON.stringify(currentPersonal()) !== lastPersonalRef.current;
  const summaryUnsaved = () => lastSummaryRef.current !== null && targetSummary !== lastSummaryRef.current;

  // Sync inputs from the open resume: on a new resume always; on a step change only when the
  // student has nothing unsaved there (a failed save never gets overwritten by older data)
  useEffect(() => {
    if (currentResume) {
      const isNewResume = syncedResumeIdRef.current !== currentResume._id;
      const isNewStep = syncedStepRef.current !== activeStep;

      if (isNewResume || isNewStep) {
        syncedResumeIdRef.current = currentResume._id;
        syncedStepRef.current = activeStep;

        if (activeStep === 1 && (isNewResume || !personalUnsaved())) {
          const info = currentResume.personalInfo || {};
          const fullName = `${info.firstName || ''} ${info.lastName || ''}`.trim();
          const loadedTitle = info.title || currentResume.professionalSummary?.title || currentResume.targetJob?.jobTitle || '';
          const loadedLocation = info.location || (info.city ? `${info.city}${info.country ? ', ' + info.country : ''}` : '') || currentResume.targetJob?.location || '';
          const v = {
            name: fullName || pName, title: loadedTitle || pTitle, email: info.email || pEmail, phone: info.phone || pPhone,
            location: loadedLocation || pLocation, linkedin: info.linkedin || pLinkedin, github: info.github || pGithub, portfolio: info.portfolio || pPortfolio,
          };
          setPName(v.name); setPTitle(v.title); setPEmail(v.email); setPPhone(v.phone);
          setPLocation(v.location); setPLinkedin(v.linkedin); setPGithub(v.github); setPPortfolio(v.portfolio);
          lastPersonalRef.current = JSON.stringify(buildPersonal(v));
        } else if (activeStep === 6 && (isNewResume || !summaryUnsaved())) {
          const s = currentResume.professionalSummary?.summary || '';
          setTargetSummary(s);
          lastSummaryRef.current = s;
        }
      }
    }
  }, [currentResume, activeStep]);

  useEffect(() => {
    setResumeNameInput(currentResume?.nameCustom ? (currentResume.name || '') : '');
  }, [currentResume?._id]);
  const lastNameSaved = useRef(null);
  const saveResumeName = () => {
    const value = resumeNameInput.trim();
    if (!currentResume?._id || value === (currentResume.nameCustom ? currentResume.name || '' : '') || value === lastNameSaved.current) return;
    lastNameSaved.current = value;
    updateResume(currentResume._id, { name: value }).catch((e) => console.warn('[builder] name not saved yet:', e?.message));
  };

  // ---- autosave: every change is saved shortly after typing stops (offline: kept on the phone, sent later) ----
  const autosaveTimer = useRef(null);
  const autosaveReady = useRef(false);
  useEffect(() => {
    if (!autosaveReady.current) return undefined; // not the values loaded from the resume
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (personalUnsaved()) savePersonalQuietly();
      if (summaryUnsaved()) saveSummaryQuietly();
    }, 1500);
    return () => clearTimeout(autosaveTimer.current);
  }, [pName, pTitle, pEmail, pPhone, pLocation, pLinkedin, pGithub, pPortfolio, targetSummary]);
  useEffect(() => { const t0 = setTimeout(() => { autosaveReady.current = true; }, 0); return () => clearTimeout(t0); }, [currentResume?._id]);
  useEffect(() => () => clearTimeout(autosaveTimer.current), []);

  // ---- what is typed in an item form but not added yet: kept on the phone (back / closing the app never loses it) ----
  const draftKey = `resumeBuilderDraft:${resumeId || 'new'}`;
  const draftLoaded = useRef(false);
  const draftValues = {
    eduDegree, eduField, eduInstitution, eduGpa, eduSemester, eduStartDate, eduEndDate, eduCurrent,
    workCompany, workPosition, workLocation, workStartDate, workEndDate, workCurrent, workDesc,
    projName, projTech, projGithub, projLive, projDesc,
    certName, certIssuer, certIssueDate, certUrl, certExpiryDate, skillInput,
  };
  const draftSetters = {
    eduDegree: setEduDegree, eduField: setEduField, eduInstitution: setEduInstitution, eduGpa: setEduGpa, eduSemester: setEduSemester, eduStartDate: setEduStartDate, eduEndDate: setEduEndDate, eduCurrent: setEduCurrent,
    workCompany: setWorkCompany, workPosition: setWorkPosition, workLocation: setWorkLocation, workStartDate: setWorkStartDate, workEndDate: setWorkEndDate, workCurrent: setWorkCurrent, workDesc: setWorkDesc,
    projName: setProjName, projTech: setProjTech, projGithub: setProjGithub, projLive: setProjLive, projDesc: setProjDesc,
    certName: setCertName, certIssuer: setCertIssuer, certIssueDate: setCertIssueDate, certUrl: setCertUrl, certExpiryDate: setCertExpiryDate, skillInput: setSkillInput,
  };
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(draftKey);
        const d = raw ? JSON.parse(raw) : null;
        if (live && d && typeof d === 'object') for (const [k, v] of Object.entries(d)) if (draftSetters[k] && v !== '' && v !== false && v != null) draftSetters[k](v);
      } catch { /* no draft */ }
      draftLoaded.current = true;
    })();
    return () => { live = false; };
  }, [draftKey]);
  const draftSig = JSON.stringify(draftValues);
  useEffect(() => {
    if (!draftLoaded.current) return undefined;
    const tm = setTimeout(() => {
      const empty = Object.values(draftValues).every((v) => v === '' || v === false);
      (empty ? AsyncStorage.removeItem(draftKey) : AsyncStorage.setItem(draftKey, draftSig)).catch(() => {});
    }, 300);
    return () => clearTimeout(tm);
  }, [draftSig]);

  const showLimit = () => {
    if (limitShownRef.current) return;
    limitShownRef.current = true;
    Alert.alert(LIMIT_TITLE, LIMIT_TEXT, [
      { text: 'see my resumes', onPress: () => navigation.navigate('ResumeDashboard') },
      { text: 'ok', style: 'cancel', onPress: () => { if (!createdIdRef.current && navigation.canGoBack()) navigation.goBack(); } },
    ]);
  };

  // Open: an existing resume is loaded by its id; a new one starts empty (prefilled from the
  // profile) and is created on the first save
  useEffect(() => {
    let live = true;
    (async () => {
      if (!resumeId && guestMode) {
        requireAccount();
        navigation.goBack();
        return;
      }
      if (!resumeId) {
        setCurrentResume(null);
        const v = {
          name: user?.name || '', title: user?.headline || '', email: user?.email || '', phone: user?.phone || '',
          location: user?.location || '', linkedin: '', github: '', portfolio: '',
        };
        setPName(v.name); setPTitle(v.title); setPEmail(v.email); setPPhone(v.phone);
        setPLocation(v.location); setPLinkedin(''); setPGithub(''); setPPortfolio(''); setTargetSummary('');
        lastPersonalRef.current = JSON.stringify(buildPersonal(v));
        lastSummaryRef.current = '';
      }
      await fetchResumes();
      if (!live) return;
      if (resumeId) {
        const found = loadResume(resumeId);
        if (!found) {
          Alert.alert("couldn't open this resume", 'please check your connection and try again.');
          navigation.goBack();
          return;
        }
      }
      setOpened(true);
    })();
    return () => { live = false; };
  }, [resumeId]);

  // a new resume at the limit: say so right away, with a way to the existing ones
  useEffect(() => {
    if (isNew && opened && !createdIdRef.current && creationsUsed >= 2) showLimit();
  }, [isNew, opened, creationsUsed]);

  /** The resume being built; a new one is created here, once (concurrent callers share it). */
  const ensureResume = async () => {
    if (!isNew) return currentResume || null;
    if (createdIdRef.current && currentResume?._id === createdIdRef.current) return currentResume;
    if (creatingRef.current) return creatingRef.current;
    creatingRef.current = (async () => {
      try {
        const created = await createResume({ personalInfo: currentPersonal(), template: 'modern_ats' }, { alert: false });
        if (created?._id) {
          createdIdRef.current = created._id;
          lastPersonalRef.current = JSON.stringify(currentPersonal());
        }
        return created || null;
      } catch (err) {
        if (err?.code === 'RESUME_LIMIT') { showLimit(); return null; }
        throw err;
      } finally {
        creatingRef.current = null;
      }
    })();
    return creatingRef.current;
  };

  // Pick Document Helper
  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const pickedFile = res.assets[0];

        const allowedExtensions = ['pdf', 'doc', 'docx'];
        const fileExt = pickedFile.name?.split('.').pop()?.toLowerCase();

        if (!allowedExtensions.includes(fileExt)) {
          Alert.alert(
            'Unsupported Format ⚠️',
            'Only PDF (.pdf), Word (.doc), and Word OpenXML (.docx) formats are supported.'
          );
          return null;
        }

        if (pickedFile.size && pickedFile.size > 10 * 1024 * 1024) {
          Alert.alert(
            'File Too Large ⚠️',
            'The selected file exceeds the 10MB limit. Please upload a smaller document.'
          );
          return null;
        }

        return pickedFile;
      }
      return null;
    } catch (err) {
      console.warn('[builder] file picker failed:', err?.message);
      return null;
    }
  };

  // Upload and parse: the upload makes its own resume (no blank one first)
  const uploadingRef = useRef(false);
  const handleAutoFillUpload = async () => {
    if (!requireAccount()) return; // uploads to the server to parse
    if (uploadingRef.current) return;
    if (creationsUsed >= 2) {
      showLimit();
      limitShownRef.current = false; // the next tap may show it again
      return;
    }
    const file = await pickDocument();
    if (!file) return;

    uploadingRef.current = true;
    setAiGeneratingVisible(true);
    setAiGeneratingStep('Uploading resume document...');
    setAiGeneratingProgress(15);
    const progressInterval = setInterval(() => {
      setAiGeneratingProgress(prev => {
        if (prev < 50) return prev + 5;
        if (prev < 80) return prev + 2;
        return prev;
      });
    }, 400);

    try {
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
        syncedResumeIdRef.current = null;
        setAiGeneratingStep('Structuring resume sections...');
        setAiGeneratingProgress(100);
        await new Promise(resolve => setTimeout(resolve, 600));
        setAiGeneratingVisible(false);
        fetchResumes().catch(() => {});
        // "we filled in X sections, please check" before the builder
        navigation.navigate('ResumeImportReview', { resumeId: parsed._id });
      } else {
        setAiGeneratingVisible(false);
        Alert.alert("couldn't read that file", 'please try another file.');
      }
    } catch (err) {
      setAiGeneratingVisible(false);
      if (err?.response?.data?.code === 'RESUME_CREATION_LIMIT_REACHED') { showLimit(); limitShownRef.current = false; }
      else {
        const code = err?.response?.data?.code;
        const title = code === 'RESUME_SCAN' ? 'this file looks like a scan' : code === 'RESUME_UNSUPPORTED' ? "this file type can't be read" : "couldn't read that file";
        Alert.alert(title, errorMessage(err, "We couldn't read that resume file. Please try another file."));
      }
    } finally {
      clearInterval(progressInterval);
      uploadingRef.current = false;
    }
  };

  // Personal info: only `personalInfo`, only when it changed (the server keeps the title / location
  // of the summary and target job in step). Two calls with the same data share one request.
  const savePersonalInfo = async () => {
    const payload = currentPersonal();
    const sig = JSON.stringify(payload);
    if (sig === lastPersonalRef.current && (!isNew || createdIdRef.current)) return currentResume;
    if (personalInflight.current?.sig === sig) return personalInflight.current.promise;
    const promise = (async () => {
      const resume = await ensureResume();
      if (!resume?._id) return null;
      if (sig === lastPersonalRef.current) return resume; // created with this data just now
      const saved = await updateResume(resume._id, { personalInfo: payload });
      lastPersonalRef.current = sig;
      return saved;
    })();
    personalInflight.current = { sig, promise };
    try { return await promise; } finally { if (personalInflight.current?.promise === promise) personalInflight.current = null; }
  };
  // field blur: a background save (logged; the save buttons and step moves report errors)
  const savePersonalQuietly = () => { savePersonalInfo().catch((e) => console.warn('[builder] personal info not saved yet:', e?.message)); };

  const saveTargetSummary = async () => {
    if (targetSummary === lastSummaryRef.current) return currentResume;
    const resume = await ensureResume();
    if (!resume?._id) return null;
    const value = targetSummary;
    const saved = await updateResume(resume._id, { professionalSummary: { summary: value } });
    lastSummaryRef.current = value;
    return saved;
  };
  const saveSummaryQuietly = () => { saveTargetSummary().catch((e) => console.warn('[builder] summary not saved yet:', e?.message)); };

  const handleSaveStep1 = () => saveStep1.run(async () => {
    const saved = await savePersonalInfo();
    if (saved) Alert.alert('✅ Saved!', 'Personal Information saved successfully!');
  });

  // Save handler for Target Job (now Step 6)
  const handleSaveStep6 = () => saveStep6.run(async () => {
    const saved = await saveTargetSummary();
    if (saved) Alert.alert('✅ Saved!', 'Target Job & Summary saved successfully!');
  });

  // Moving between steps saves the step first; a failed save says so but never traps the student
  const saveCurrentStep = async () => {
    if (activeStep === 1) await savePersonalInfo();
    else if (activeStep === 6) await saveTargetSummary();
  };
  const goToStep = (next) => moveStep.run(async () => {
    try {
      await saveCurrentStep();
    } catch (err) {
      Alert.alert('not saved yet', `${errorMessage(err)} your changes stay on this screen; tap save to try again.`);
    }
    setActiveStep(next);
  });

  const handleStepChange = (newStep) => goToStep(newStep);
  const handlePrevStep = () => goToStep((prev) => Math.max(1, prev - 1));
  // back: the leave check below saves or asks
  const handleGoBack = () => navigation.goBack();

  // what is typed in an item form but not added yet
  const unsavedItem = () => {
    if (eduInstitution.trim() || eduDegree.trim()) return 'education';
    if (workCompany.trim() || workPosition.trim()) return 'experience';
    if (projName.trim() || projDesc.trim()) return 'project';
    if (certName.trim() || certIssuer.trim()) return 'certification';
    return null;
  };
  const leaveUnsaved = !!unsavedItem() || personalUnsaved() || summaryUnsaved();
  // header back, iOS swipe back and Android back all pass here: save what changed, keep what is typed, leave
  usePreventRemove(leaveUnsaved, ({ data }) => {
    clearTimeout(autosaveTimer.current);
    if (personalUnsaved()) savePersonalQuietly();
    if (summaryUnsaved()) saveSummaryQuietly();
    AsyncStorage.setItem(draftKey, JSON.stringify(draftValues)).catch(() => {});
    navigation.dispatch(data.action);
  });

  // the add-item buttons of each step (defined with their forms), so "continue" can add what is typed
  const addHandlers = useRef({});
  const optionalStep = (s) => s >= 2 && s <= 6;

  // Continue: an item typed but not added is added first (never lost, never blocks)
  const handleNextStep = () => {
    const item = unsavedItem();
    const add = item && { education: 2, experience: 3, project: 4, certification: 5 }[item] === activeStep && addHandlers.current[activeStep];
    if (add) {
      Promise.resolve(add({ quiet: true })).finally(() => goToStep((prev) => Math.min(7, prev + 1)));
      return;
    }
    goToStep((prev) => Math.min(7, prev + 1));
  };
  // skip for now: optional sections never block; what is typed stays on the phone for later
  const handleSkipStep = () => goToStep((prev) => Math.min(7, prev + 1));

  // Finish: only now are missing required fields shown (name, email or phone, one of education/experience/projects)
  const finishProblems = () => requiredForFinish(buildLiveResume());
  const handleFinish = () => finish.run(async () => {
    const problems = finishProblems();
    if (problems.length) {
      setFinishTried(true);
      return;
    }
    const resume = currentResume?._id ? currentResume : await ensureResume();
    if (!resume?._id) return;
    if (personalUnsaved()) await savePersonalInfo().catch(() => {});
    if (summaryUnsaved()) await saveTargetSummary().catch(() => {});
    navigation.navigate('ResumeView', { resumeId: resume._id });
  });
  const problems = finishTried ? finishProblems() : [];
  const problemFor = (field) => problems.find((x) => x.field === field);
  const fieldError = (field) => {
    const pr = problemFor(field);
    return pr ? <Text style={styles.fieldError} accessibilityRole="alert">{pr.text}</Text> : null;
  };

  // Add or update one item of a list section, on the latest saved list (by key, never by position)
  const saveListItem = async (field, newItem, editingKey) => {
    const resume = await ensureResume();
    if (!resume?._id) return false;
    await updateResume(resume._id, (latest) => {
      const list = [...(latest?.[field] || [])];
      const i = indexOfKey(list, editingKey);
      if (editingKey != null && i >= 0) list[i] = { ...list[i], ...newItem };
      else list.push(newItem);
      return { [field]: list };
    });
    return true;
  };
  // Delete one item after asking; `onGone` clears the form if that item was being edited
  const confirmRemove = (field, item, label, onGone) => {
    const key = keyOf(item);
    Alert.alert(`delete this ${label}?`, "you can't undo this.", [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: () => removeItem.run(async () => {
          if (!currentResume?._id) return;
          await updateResume(currentResume._id, (latest) => ({ [field]: (latest?.[field] || []).filter((x) => keyOf(x) !== key) }));
          if (onGone) onGone(key);
        }),
      },
    ]);
  };

  const getTargetRoleFallback = () => {
    const roles = currentResume?.targetJobs || [];
    return roles.map(r => r.jobTitle).join(', ') || currentResume?.targetJob?.jobTitle || ''; // P3 #7: no assumed role
  };

  // ============================================================
  // STEP 1: PERSONAL INFO
  // ============================================================
  const renderStep1 = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>already have a resume?</Text>
          <Text style={styles.bannerText}>
            Upload it and AI will auto-fill all fields — no manual typing needed.
          </Text>
          <View style={styles.bannerButtons}>
            <TouchableOpacity style={styles.bannerUploadBtn} onPress={handleAutoFillUpload}>
              <Text style={styles.bannerUploadBtnText}>upload & auto-fill</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bannerSkipBtn} onPress={() => {
              savePersonalQuietly();
              setPreviewTemplateId(currentResume?.template || 'modern_ats');
              setPreviewVisible(true);
            }}>
              <Text style={styles.bannerSkipBtnText}>skip to preview</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.inputLabel}>full name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. John Doe"
          placeholderTextColor={T.textFaint}
          value={pName}
          onChangeText={setPName}
          onBlur={savePersonalQuietly}
          accessibilityLabel="full name"
        />
        {fieldError('name')}

        <Text style={styles.inputLabel}>title (like "HR Intern")</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Senior Software Engineer"
          placeholderTextColor={T.textFaint}
          value={pTitle}
          onChangeText={setPTitle}
          onBlur={savePersonalQuietly}
        />

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="john@example.com"
              placeholderTextColor={T.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              value={pEmail}
              onChangeText={setPEmail}
              onBlur={savePersonalQuietly}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>phone</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+92 301 0000000"
              placeholderTextColor={T.textFaint}
              keyboardType="phone-pad"
              value={pPhone}
              onChangeText={setPPhone}
              onBlur={savePersonalQuietly}
            />
          </View>
        </View>
        <Text style={styles.fieldHint}>email or phone is needed so employers can reach you</Text>
        {fieldError('contact')}

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>city</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Karachi, Pakistan"
              placeholderTextColor={T.textFaint}
              value={pLocation}
              onChangeText={setPLocation}
              onBlur={savePersonalQuietly}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>LinkedIn profile</Text>
            <TextInput
              style={styles.textInput}
              placeholder="linkedin.com/in/johndoe"
              placeholderTextColor={T.textFaint}
              autoCapitalize="none"
              value={pLinkedin}
              onChangeText={setPLinkedin}
              onBlur={savePersonalQuietly}
            />
          </View>
        </View>

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>GitHub profile</Text>
            <TextInput
              style={styles.textInput}
              placeholder="github.com/johndoe"
              placeholderTextColor={T.textFaint}
              autoCapitalize="none"
              value={pGithub}
              onChangeText={setPGithub}
              onBlur={savePersonalQuietly}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>portfolio website</Text>
            <TextInput
              style={styles.textInput}
              placeholder="johndoe.dev"
              placeholderTextColor={T.textFaint}
              autoCapitalize="none"
              value={pPortfolio}
              onChangeText={setPPortfolio}
              onBlur={savePersonalQuietly}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>resume name</Text>
        <TextInput
          style={styles.textInput}
          placeholder={defaultResumeName(buildLiveResume())}
          placeholderTextColor={T.textFaint}
          value={resumeNameInput}
          onChangeText={setResumeNameInput}
          onBlur={saveResumeName}
          accessibilityLabel="resume name"
        />
        <Text style={styles.fieldHint}>only you see this. leave it empty to use "{defaultResumeName(buildLiveResume())}".</Text>

        <TouchableOpacity 
          style={[styles.yellowButton, { marginTop: 20 }]} 
          onPress={handleSaveStep1}
          disabled={saveStep1.running}
          accessibilityRole="button"
          accessibilityLabel="save personal information"
          accessibilityState={{ busy: saveStep1.running }}
        >
          {saveStep1.running ? (
            <ActivityIndicator color={T.ink} size="small" />
          ) : (
            <Text style={styles.yellowButtonText}>💾 Save Personal Information</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================
  // STEP 2: EDUCATION
  // ============================================================
  const renderStep2 = () => {
    const items = currentResume?.education || [];

    const handleAddEducation = ({ quiet } = {}) => saveItem.run(async () => {
      if (!eduDegree.trim() && !eduInstitution.trim()) {
        if (!quiet) Alert.alert('add a school or degree', 'type your school, college or university (or your degree) to add it.');
        return;
      }
      const gradeText = eduGpa.trim();
      const gpaNum = Number((gradeText.match(/^(\d(?:\.\d{1,2})?)(?:\s*\/\s*\d(?:\.\d{1,2})?)?$/) || [])[1]);
      const newItem = {
        degree: eduDegree.trim(),
        fieldOfStudy: eduField.trim(),
        institution: eduInstitution.trim(),
        // the grade as typed ("3.5/4", "A", "First Division"); a plain number also as gpa
        grade: gradeText,
        gpa: gpaNum > 0 && gpaNum <= 5 ? gpaNum : undefined,
        currentSemester: eduSemester.trim(),
        startDate: eduStartDate.trim(),
        endDate: eduCurrent ? '' : eduEndDate.trim(),
        current: eduCurrent
      };
      
      if (!(await saveListItem('education', newItem, editingEduIndex))) return;
      
      setEduDegree('');
      setEduField('');
      setEduInstitution('');
      setEduGpa('');
      setEduSemester('');
      setEduStartDate('');
      setEduEndDate('');
      setEduCurrent(false);
      setEditingEduIndex(null);
    });
    addHandlers.current[2] = handleAddEducation;

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={item?._id || `i${index}`} style={styles.itemRowBadge}>
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
                setEditingEduIndex(keyOf(item));
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color={T.ink} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`delete education ${index + 1}`} disabled={removeItem.running} hitSlop={8} onPress={() => confirmRemove('education', item, 'education', (k) => {
                if (editingEduIndex === k) { setEduDegree(''); setEduField(''); setEduInstitution(''); setEduGpa(''); setEduSemester(''); setEduStartDate(''); setEduEndDate(''); setEduCurrent(false); setEditingEduIndex(null); }
              })}>
                <Ionicons name="trash-outline" size={20} color={T.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingEduIndex !== null ? `Edit Education #${indexOfKey(items, editingEduIndex) + 1}` : `Education #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>degree</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Bachelor of Science"
          placeholderTextColor={T.textFaint}
          value={eduDegree}
          onChangeText={setEduDegree}
        />

        <Text style={styles.inputLabel}>field of study</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Computer Science"
          placeholderTextColor={T.textFaint}
          value={eduField}
          onChangeText={setEduField}
        />

        <Text style={styles.inputLabel}>University / Institution</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Massachusetts Institute of Technology"
          placeholderTextColor={T.textFaint}
          value={eduInstitution}
          onChangeText={setEduInstitution}
        />

        <View style={styles.inputGridRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>CGPA / GPA</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 3.8 / 4.0"
              placeholderTextColor={T.textFaint}
              value={eduGpa}
              onChangeText={setEduGpa}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>Current Semester (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 6th Semester"
              placeholderTextColor={T.textFaint}
              value={eduSemester}
              onChangeText={setEduSemester}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>start date</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Sep 2020"
          placeholderTextColor={T.textFaint}
          value={eduStartDate}
          onChangeText={setEduStartDate}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>currently studying here</Text>
          <Switch
            value={eduCurrent}
            onValueChange={setEduCurrent}
            trackColor={{ false: T.line, true: T.yellow }}
            thumbColor={eduCurrent ? T.white : T.sand}
          />
        </View>

        {!eduCurrent && (
          <>
            <Text style={styles.inputLabel}>end date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. May 2024"
              placeholderTextColor={T.textFaint}
              value={eduEndDate}
              onChangeText={setEduEndDate}
            />
          </>
        )}

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddEducation} disabled={saveItem.running} accessibilityRole="button" accessibilityLabel={editingEduIndex !== null ? 'update education' : 'add education'} accessibilityState={{ busy: saveItem.running }}>
          {saveItem.running ? <ActivityIndicator color={T.ink} size="small" /> : <Text style={styles.yellowButtonText}>
            {editingEduIndex !== null ? 'Update Education' : 'Add Education'}
          </Text>}
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================
  // STEP 3: WORK EXPERIENCE
  // ============================================================
  const renderStep3 = () => {
    const items = currentResume?.workExperience || [];

    const handleAddWork = ({ quiet } = {}) => saveItem.run(async () => {
      if (!workCompany.trim() && !workPosition.trim()) {
        if (!quiet) Alert.alert('add a company or role', 'type where you worked (or your role) to add it.');
        return;
      }
      const newItem = {
        company: workCompany.trim(),
        position: workPosition.trim(),
        location: workLocation.trim(),
        startDate: workStartDate.trim(),
        endDate: workCurrent ? '' : workEndDate.trim(),
        current: workCurrent,
        description: workDesc.trim(),
        achievements: [] // bullets from an upload are in the description box now
      };

      if (!(await saveListItem('workExperience', newItem, editingWorkIndex))) return;
      
      setWorkCompany('');
      setWorkPosition('');
      setWorkLocation('');
      setWorkStartDate('');
      setWorkEndDate('');
      setWorkCurrent(false);
      setWorkDesc('');
      setEditingWorkIndex(null);
    });
    addHandlers.current[3] = handleAddWork;

    const handleAIEnhanceWork = () => {
      if (!requireAccount()) return;
      if (!workDesc.trim()) {
        Alert.alert('Empty', 'Please type in your responsibilities first before enhancing.');
        return;
      }
      aiWork.run(async () => {
        const result = await resumeApi.enhanceText(
          workDesc,
          `Work experience as ${workPosition || 'professional'} at ${workCompany || 'a company'}`
        );
        if (result?.enhanced) setWorkDesc(result.enhanced);
      });
    };

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={item?._id || `i${index}`} style={styles.itemRowBadge}>
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
                setWorkDesc([item.description || '', ...(item.achievements || []).map((b) => `• ${b}`)].filter(Boolean).join('\n'));
                setEditingWorkIndex(keyOf(item));
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color={T.ink} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`delete experience ${index + 1}`} disabled={removeItem.running} hitSlop={8} onPress={() => confirmRemove('workExperience', item, 'experience', (k) => {
                if (editingWorkIndex === k) { setWorkCompany(''); setWorkPosition(''); setWorkLocation(''); setWorkStartDate(''); setWorkEndDate(''); setWorkCurrent(false); setWorkDesc(''); setEditingWorkIndex(null); }
              })}>
                <Ionicons name="trash-outline" size={20} color={T.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingWorkIndex !== null ? `Edit Experience #${indexOfKey(items, editingWorkIndex) + 1}` : `Experience #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>company name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Google"
          placeholderTextColor={T.textFaint}
          value={workCompany}
          onChangeText={setWorkCompany}
        />

        <Text style={styles.inputLabel}>Job Title / Role</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Software Engineer"
          placeholderTextColor={T.textFaint}
          value={workPosition}
          onChangeText={setWorkPosition}
        />

        <Text style={styles.inputLabel}>location</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Mountain View, CA"
          placeholderTextColor={T.textFaint}
          value={workLocation}
          onChangeText={setWorkLocation}
        />

        <Text style={styles.inputLabel}>start date</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Jan 2022"
          placeholderTextColor={T.textFaint}
          value={workStartDate}
          onChangeText={setWorkStartDate}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>currently working here</Text>
          <Switch
            value={workCurrent}
            onValueChange={setWorkCurrent}
            trackColor={{ false: T.line, true: T.yellow }}
            thumbColor={workCurrent ? T.white : T.sand}
          />
        </View>

        {!workCurrent && (
          <>
            <Text style={styles.inputLabel}>end date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Dec 2023"
              placeholderTextColor={T.textFaint}
              value={workEndDate}
              onChangeText={setWorkEndDate}
            />
          </>
        )}

        <View style={styles.labelWithAction}>
          <Text style={styles.inputLabel}>responsibilities & achievements</Text>
          <TouchableOpacity style={styles.aiEnhanceMiniBtn} onPress={handleAIEnhanceWork} disabled={aiWork.running} accessibilityRole="button" accessibilityLabel="ai enhance experience" accessibilityState={{ busy: aiWork.running }}>
            {aiWork.running ? <ActivityIndicator color={T.ink} size="small" /> : <Ionicons name="sparkles" size={14} color={T.ink} />}
            <Text style={styles.aiEnhanceMiniBtnText}>ai enhance</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.textInput, styles.summaryTextarea]}
          multiline
          placeholder="Describe your key responsibilities and achievements. The AI can convert these into polished ATS-friendly bullet points."
          placeholderTextColor={T.textFaint}
          value={workDesc}
          onChangeText={setWorkDesc}
        />

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddWork} disabled={saveItem.running} accessibilityRole="button" accessibilityLabel={editingWorkIndex !== null ? 'update experience' : 'add experience'} accessibilityState={{ busy: saveItem.running }}>
          {saveItem.running ? <ActivityIndicator color={T.ink} size="small" /> : <Text style={styles.yellowButtonText}>
            {editingWorkIndex !== null ? 'Update Experience' : 'Add Experience'}
          </Text>}
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================
  // STEP 4: PROJECTS
  // ============================================================
  const renderStep4 = () => {
    const items = currentResume?.projects || [];

    const handleAddProj = ({ quiet } = {}) => saveItem.run(async () => {
      if (!projName.trim()) {
        if (!quiet) Alert.alert('add a project name', 'give your project a short name to add it.');
        return;
      }
      const newItem = {
        name: projName.trim(),
        technologies: projTech.split(',').map(s => s.trim()).filter(Boolean),
        githubUrl: projGithub.trim(),
        url: projLive.trim(),
        description: projDesc.trim()
      };

      if (!(await saveListItem('projects', newItem, editingProjIndex))) return;
      
      setProjName('');
      setProjTech('');
      setProjGithub('');
      setProjLive('');
      setProjDesc('');
      setEditingProjIndex(null);
    });
    addHandlers.current[4] = handleAddProj;

    const handleAIEnhanceProj = () => {
      if (!requireAccount()) return;
      if (!projDesc.trim()) {
        Alert.alert('Empty', 'Please describe your project first.');
        return;
      }
      aiProj.run(async () => {
        const result = await resumeApi.enhanceText(
          projDesc,
          `Project description for ${projName || 'a software project'} using ${projTech || 'various technologies'}`
        );
        if (result?.enhanced) setProjDesc(result.enhanced);
      });
    };

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={item?._id || `i${index}`} style={styles.itemRowBadge}>
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
                setEditingProjIndex(keyOf(item));
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color={T.ink} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`delete project ${index + 1}`} disabled={removeItem.running} hitSlop={8} onPress={() => confirmRemove('projects', item, 'project', (k) => {
                if (editingProjIndex === k) { setProjName(''); setProjTech(''); setProjGithub(''); setProjLive(''); setProjDesc(''); setEditingProjIndex(null); }
              })}>
                <Ionicons name="trash-outline" size={20} color={T.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingProjIndex !== null ? `Edit Project #${indexOfKey(items, editingProjIndex) + 1}` : `Project #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>project name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. AI Resume Builder"
          placeholderTextColor={T.textFaint}
          value={projName}
          onChangeText={setProjName}
        />

        <Text style={styles.inputLabel}>tech stack</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. React, Next.js, OpenAI, TailwindCSS, PostgreSQL"
          placeholderTextColor={T.textFaint}
          value={projTech}
          onChangeText={setProjTech}
        />

        <Text style={styles.inputLabel}>GitHub url</Text>
        <TextInput
          style={styles.textInput}
          placeholder="github.com/user/project"
          placeholderTextColor={T.textFaint}
          autoCapitalize="none"
          value={projGithub}
          onChangeText={setProjGithub}
        />

        <Text style={styles.inputLabel}>live url</Text>
        <TextInput
          style={styles.textInput}
          placeholder="project.vercel.app"
          placeholderTextColor={T.textFaint}
          autoCapitalize="none"
          value={projLive}
          onChangeText={setProjLive}
        />

        <View style={styles.labelWithAction}>
          <Text style={styles.inputLabel}>description</Text>
          <TouchableOpacity style={styles.aiEnhanceMiniBtn} onPress={handleAIEnhanceProj} disabled={aiProj.running} accessibilityRole="button" accessibilityLabel="ai enhance project" accessibilityState={{ busy: aiProj.running }}>
            {aiProj.running ? <ActivityIndicator color={T.ink} size="small" /> : <Ionicons name="sparkles" size={14} color={T.ink} />}
            <Text style={styles.aiEnhanceMiniBtnText}>ai enhance</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.textInput, styles.summaryTextarea]}
          multiline
          placeholder="What did you build? What problem did it solve? What was the impact?"
          placeholderTextColor={T.textFaint}
          value={projDesc}
          onChangeText={setProjDesc}
        />

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddProj} disabled={saveItem.running} accessibilityRole="button" accessibilityLabel={editingProjIndex !== null ? 'update project' : 'add project'} accessibilityState={{ busy: saveItem.running }}>
          {saveItem.running ? <ActivityIndicator color={T.ink} size="small" /> : <Text style={styles.yellowButtonText}>
            {editingProjIndex !== null ? 'Update Project' : 'Add Project'}
          </Text>}
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================
  // STEP 5: CERTIFICATIONS (NEW POSITION)
  // ============================================================
  const renderStep5 = () => {
    const items = currentResume?.certifications || [];

    const handleAddCertification = ({ quiet } = {}) => saveItem.run(async () => {
      if (!certName.trim()) {
        if (!quiet) Alert.alert('add a certificate name', 'type the certificate or course name to add it.');
        return;
      }
      // the model's field names (date/url were silently dropped before)
      const newCert = {
        name: certName.trim(),
        organization: certIssuer.trim(),
        issueDate: certIssueDate.trim() || undefined,
        credentialUrl: certUrl.trim(),
        expiryDate: certExpiryDate.trim() || undefined
      };

      if (!(await saveListItem('certifications', newCert, editingCertIndex))) return;
      
      setCertName('');
      setCertIssuer('');
      setCertIssueDate('');
      setCertUrl('');
      setCertExpiryDate('');
      setEditingCertIndex(null);
    });
    addHandlers.current[5] = handleAddCertification;

    return (
      <View style={styles.formContainer}>
        {items.map((item, index) => (
          <View key={item?._id || `i${index}`} style={styles.itemRowBadge}>
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
                setEditingCertIndex(keyOf(item));
              }} style={{ marginRight: 12 }}>
                <Ionicons name="create-outline" size={20} color={T.ink} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`delete certification ${index + 1}`} disabled={removeItem.running} hitSlop={8} onPress={() => confirmRemove('certifications', item, 'certification', (k) => {
                if (editingCertIndex === k) { setCertName(''); setCertIssuer(''); setCertIssueDate(''); setCertUrl(''); setCertExpiryDate(''); setEditingCertIndex(null); }
              })}>
                <Ionicons name="trash-outline" size={20} color={T.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.certificationHeading}>
          {editingCertIndex !== null ? `Edit Certification #${indexOfKey(items, editingCertIndex) + 1}` : `Certification #${items.length + 1}`}
        </Text>

        <Text style={styles.inputLabel}>certification name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. AWS Certified Solutions Architect"
          placeholderTextColor={T.textFaint}
          value={certName}
          onChangeText={setCertName}
        />

        <Text style={styles.inputLabel}>issuer</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Amazon Web Services"
          placeholderTextColor={T.textFaint}
          value={certIssuer}
          onChangeText={setCertIssuer}
        />

        <Text style={styles.inputLabel}>issue date</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. March 2024"
          placeholderTextColor={T.textFaint}
          value={certIssueDate}
          onChangeText={setCertIssueDate}
        />

        <Text style={styles.inputLabel}>Credential URL (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="credly.com/badges/..."
          placeholderTextColor={T.textFaint}
          autoCapitalize="none"
          value={certUrl}
          onChangeText={setCertUrl}
        />

        <Text style={styles.inputLabel}>Expiry Date (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. March 2027"
          placeholderTextColor={T.textFaint}
          value={certExpiryDate}
          onChangeText={setCertExpiryDate}
        />

        <TouchableOpacity style={styles.yellowButton} onPress={handleAddCertification} disabled={saveItem.running} accessibilityRole="button" accessibilityLabel={editingCertIndex !== null ? 'update certification' : 'add certification'} accessibilityState={{ busy: saveItem.running }}>
          {saveItem.running ? <ActivityIndicator color={T.ink} size="small" /> : <Text style={styles.yellowButtonText}>
            {editingCertIndex !== null ? 'Update Certification' : 'Add Certification'}
          </Text>}
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================
  // STEP 6: TARGET JOB (NEW POSITION)
  // ============================================================
  const renderStep6 = () => {
    const selectedRoles = currentResume?.targetJobs || [];

    // roles: toggled on the latest saved list
    const handleSelectRole = (role) => toggleRole.run(async () => {
      const resume = await ensureResume();
      if (!resume?._id) return;
      const industry = expandedIndustry || '';
      await updateResume(resume._id, (latest) => {
        const list = latest?.targetJobs || [];
        const exist = list.some(r => r.jobTitle.toLowerCase() === role.toLowerCase());
        const updated = exist
          ? list.filter(r => r.jobTitle.toLowerCase() !== role.toLowerCase())
          : [...list, { jobTitle: role, industry, jobType: 'Full-time' }];
        return { targetJobs: updated, targetJob: updated[0] || { jobTitle: role, industry, jobType: 'Full-time' } };
      });
    });

    const handleClearRole = (role) => toggleRole.run(async () => {
      if (!currentResume?._id) return;
      await updateResume(currentResume._id, (latest) => {
        const updated = (latest?.targetJobs || []).filter(r => r.jobTitle.toLowerCase() !== role.toLowerCase());
        return { targetJobs: updated, targetJob: updated[0] || {} };
      });
    });

    const handleAIGenerateSummary = () => {
      if (!requireAccount()) return;
      const jobTitle = getTargetRoleFallback();
      if (!jobTitle || selectedRoles.length === 0) {
        Alert.alert('Required', 'Please select at least one target role first.');
        return;
      }
      aiSummary.run(async () => {
        const skillNames = (currentResume?.skills || []).map(s => s.name).join(', ');
        const expSummary = (currentResume?.workExperience || []).map(w => `${w.position} at ${w.company}`).join(', ');
        const prompt = `Write a concise, powerful 3-4 sentence professional summary for a ${jobTitle} resume. Skills: ${skillNames || 'not specified'}. Experience: ${expSummary || 'not specified'}. Make it ATS-optimized.`;
        const result = await resumeApi.enhanceText(prompt, `professional summary for ${jobTitle}`);
        if (result?.enhanced) {
          setTargetSummary(result.enhanced);
          await updateResume(currentResume._id, { professionalSummary: { summary: result.enhanced } });
          lastSummaryRef.current = result.enhanced;
        }
      });
    };

    return (
      <View style={styles.formContainer}>
        <Text style={styles.inputLabel}>Search roles or type a custom role & press Enter...</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Search roles..."
          placeholderTextColor={T.textFaint}
          value={roleSearchQuery}
          onChangeText={setRoleSearchQuery}
        />

        {selectedRoles.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.inputLabel}>selected:</Text>
            <View style={styles.skillsTagRow}>
              {selectedRoles.map((role, idx) => (
                <View key={idx} style={styles.skillTag}>
                  <Text style={styles.skillTagText}>{role.jobTitle}</Text>
                  <TouchableOpacity onPress={() => handleClearRole(role.jobTitle)}>
                    <Text style={{ marginLeft: 6, color: T.danger, fontWeight: 'bold' }}>✕</Text>
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
                    color={T.textMuted} 
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
                          disabled={toggleRole.running}
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

        <Text style={[styles.inputLabel, { marginTop: 24 }]}>professional summary</Text>
        <TextInput
          style={[styles.textInput, styles.summaryTextarea]}
          multiline
          placeholder="Your professional summary will appear here after generation, or type manually..."
          placeholderTextColor={T.textFaint}
          value={targetSummary}
          onChangeText={setTargetSummary}
          onBlur={saveSummaryQuietly}
        />

        <TouchableOpacity 
          style={styles.yellowButton} 
          onPress={handleAIGenerateSummary}
          disabled={aiSummary.running}
          accessibilityRole="button"
          accessibilityLabel="generate summary with ai"
          accessibilityState={{ busy: aiSummary.running }}
        >
          {aiSummary.running ? (
            <ActivityIndicator color={T.ink} size="small" />
          ) : (
            <Text style={styles.yellowButtonText}>⚡ Generate with AI</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.yellowButton, { marginTop: 12, backgroundColor: T.ink }]} 
          onPress={handleSaveStep6}
          disabled={saveStep6.running}
          accessibilityRole="button"
          accessibilityLabel="save target job and summary"
          accessibilityState={{ busy: saveStep6.running }}
        >
          {saveStep6.running ? (
            <ActivityIndicator color={T.white} size="small" />
          ) : (
            <Text style={[styles.yellowButtonText, { color: T.white }]}>💾 Save Target Job & Summary</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================
  // STEP 7: SKILLS (NEW POSITION - LAST)
  // ============================================================
  const renderStep7 = () => {
    const items = currentResume?.skills || [];

    const handleAddSkill = () => {
      const name = skillInput.trim();
      if (!name) return;
      addSkill.run(async () => {
        const resume = await ensureResume();
        if (!resume?._id) return;
        await updateResume(resume._id, (latest) => {
          const list = latest?.skills || [];
          if (list.some(s => s.name.toLowerCase() === name.toLowerCase())) return null; // already there
          return { skills: [...list, { name, level: 'Advanced' }] };
        });
        setSkillInput('');
      });
    };

    return (
      <View style={styles.formContainer}>
        <View style={styles.skillInputWrapper}>
          <TextInput
            style={styles.skillTextInput}
            placeholder="Type a skill and press Enter or comma..."
            placeholderTextColor={T.textFaint}
            value={skillInput}
            onChangeText={setSkillInput}
            onSubmitEditing={handleAddSkill}
          />
          <TouchableOpacity style={styles.skillAddBtn} onPress={handleAddSkill} disabled={addSkill.running} accessibilityRole="button" accessibilityLabel="add skill" accessibilityState={{ busy: addSkill.running }}>
            {addSkill.running ? <ActivityIndicator color={T.ink} size="small" /> : <Ionicons name="add" size={22} color={T.ink} />}
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCardBody}>
            <Text style={styles.emptyCardText}>No skills added yet — type above or use AI Suggestions</Text>
          </View>
        ) : (
          <View style={styles.skillsTagRow}>
            {items.map((skill, index) => (
              <View key={skill?._id || skill.name || index} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill.name}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`remove ${skill.name}`} disabled={removeItem.running} hitSlop={8} onPress={() => confirmRemove('skills', skill, 'skill')}>
                  <Ionicons name="close" size={14} color={T.textMuted} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.yellowButton, { marginTop: 24 }]}
          disabled={aiSkills.running}
          accessibilityRole="button"
          accessibilityLabel="ai skill suggestions"
          accessibilityState={{ busy: aiSkills.running }}
          onPress={() => {
            if (!requireAccount()) return;
            aiSkills.run(async () => {
              const resume = await ensureResume();
              if (!resume?._id) return;
              const targetRole = getTargetRoleFallback();
              const result = await resumeApi.suggestSkills((resume.skills || []).map(s => s.name), targetRole);
              if (!(result?.suggestions && result.suggestions.length > 0)) {
                Alert.alert('No Suggestions', 'Could not generate suggestions. Try adding a target role in the Target step.');
                return;
              }
              let added = 0;
              // added to the latest list (skills added meanwhile are kept, none twice)
              await updateResume(resume._id, (latest) => {
                const list = latest?.skills || [];
                const existingNames = new Set(list.map(s => s.name.toLowerCase()));
                const newSkills = [...new Set(result.suggestions)]
                  .filter(s => !existingNames.has(String(s).toLowerCase()))
                  .map(s => ({ name: s, level: 'Intermediate' }));
                added = newSkills.length;
                return newSkills.length ? { skills: [...list, ...newSkills] } : null;
              });
              if (added > 0) Alert.alert('Skills Added ✨', `${added} new skills added based on your target role.`);
              else Alert.alert('All Caught Up ✓', 'No new skills to suggest — you already have them!');
            });
          }}
        >
          {aiSkills.running ? <ActivityIndicator color={T.ink} size="small" /> : <Text style={styles.yellowButtonText}>✨ AI Skill Suggestions</Text>}
        </TouchableOpacity>
        <Text style={styles.skillTipText}>💡 Press Enter or , to add a skill quickly</Text>
      </View>
    );
  };

  // Compile responsive WebView HTML for pure preview modal
  const renderPreviewHTMLMobile = () => {
    if (!currentResume) return '';
    return renderResumeHTML(buildLiveResume(), previewTemplateId, {
      font: selectedFont,
      accentColor: accentColor,
      headingColor: headingColor,
      textColor: textColor,
      bgColor: bgColor
    });
  };

  // the resume as it is on screen right now (typed but not yet saved included)
  function buildLiveResume() {
    const base = currentResume || { education: [], workExperience: [], projects: [], certifications: [], skills: [] };
    const parts = (pName || '').trim().split(' ');
    const first = parts[0] || base.personalInfo?.firstName || '';
    const last = parts.slice(1).join(' ') || base.personalInfo?.lastName || '';
    const currentResumeLive = base;
    return liveFrom(currentResumeLive, first, last);
  }
  function liveFrom(currentResume, first, last) {
    return {
      ...currentResume,
      personalInfo: {
        ...currentResume.personalInfo,
        firstName: first,
        lastName: last,
        title: pTitle || currentResume.personalInfo?.title || currentResume.professionalSummary?.title || '',
        email: pEmail || currentResume.personalInfo?.email || '',
        phone: pPhone || currentResume.personalInfo?.phone || '',
        location: pLocation || currentResume.personalInfo?.location || '',
        linkedin: pLinkedin || currentResume.personalInfo?.linkedin || '',
        github: pGithub || currentResume.personalInfo?.github || '',
        portfolio: pPortfolio || currentResume.personalInfo?.portfolio || '',
      },
      professionalSummary: {
        ...currentResume.professionalSummary,
        title: pTitle || currentResume.professionalSummary?.title || '',
        summary: targetSummary || currentResume.professionalSummary?.summary || ''
      }
    };
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={T.ink} />

      {/* Top Header */}
      <ScreenHeader
        dark
        title="resume builder"
        onBack={handleGoBack}
        right={
          <HeaderIconButton
            dark
            label="preview resume"
            onPress={() => {
              savePersonalQuietly();
              setPreviewTemplateId(currentResume?.template || 'modern_ats');
              setPreviewVisible(true);
            }}
          >
            <Ionicons name="eye-outline" size={20} color={T.yellow} />
          </HeaderIconButton>
        }
      />

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
                onPress={() => handleStepChange(s.id)}
                disabled={moveStep.running}
                accessibilityRole="button"
                accessibilityLabel={`step ${s.id}: ${s.name}`}
              >
                <Ionicons 
                  name={activeStep > s.id ? 'checkmark' : s.icon} 
                  size={16} 
                  color={activeStep === s.id ? T.ink : activeStep > s.id ? T.white : T.textMuted} 
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
      <KeyboardAwareScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} bottomOffset={24} keyboardShouldPersistTaps="handled">
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{steps[activeStep - 1].title}</Text>
            <View style={styles.cardStepBadge}>
              <Text style={styles.cardStepBadgeText}>{activeStep}/7</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>{steps[activeStep - 1].desc}</Text>
          <ResumeStrength resume={buildLiveResume()} compact style={{ marginBottom: 12 }} onGoTo={(s) => goToStep(s)} />
          {problems.length > 0 && (
            <View style={styles.problemBox} accessibilityRole="alert" testID="finish-problems">
              <Text style={styles.problemTitle}>to finish, please add:</Text>
              {problems.map((pr) => (
                <View key={pr.field} style={styles.problemRow}>
                  <Text style={styles.problemText}>• {pr.text}</Text>
                  <TouchableOpacity onPress={() => goToStep(pr.step)} accessibilityRole="button" accessibilityLabel={`go to field: ${pr.text}`} hitSlop={8} style={styles.problemGo}>
                    <Text style={styles.problemGoText}>go to field</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Form Switcher — NEW ORDER */}
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
          {activeStep === 3 && renderStep3()}
          {activeStep === 4 && renderStep4()}
          {activeStep === 5 && renderStep5()}
          {activeStep === 6 && renderStep6()}
          {activeStep === 7 && renderStep7()}
        </View>

        {/* Bottom Stepper Navigation buttons */}
        <View style={styles.footerContainer}>
          <TouchableOpacity 
            style={[styles.backButton, activeStep === 1 && { opacity: 0.5 }]}
            disabled={activeStep === 1 || moveStep.running}
            onPress={handlePrevStep}
          >
            <Ionicons name="arrow-back" size={16} color={T.white} />
            <Text style={styles.backButtonText}>back</Text>
          </TouchableOpacity>

          <TouchableOpacity 
  style={[styles.continueButton, activeStep === 7 && { backgroundColor: T.success }]}
  disabled={moveStep.running || finish.running}
  accessibilityRole="button"
  accessibilityState={{ busy: moveStep.running || finish.running }}
  onPress={() => {
    if (activeStep === 7) {
      // skills are saved on every add; a new resume that was never saved is created first
      handleFinish();
    } else {
      handleNextStep();
    }
  }}
>
            <Text style={[styles.continueButtonText, activeStep === 7 && { color: T.white }]}>
              {activeStep === 7 ? 'Finish & Preview 🚀' : 'Continue'}
            </Text>
            <Ionicons 
              name={activeStep === 7 ? "checkmark-done" : "arrow-forward"} 
              size={16} 
              color={activeStep === 7 ? T.white : T.ink} 
            />
          </TouchableOpacity>
        </View>

        {optionalStep(activeStep) && (
          <TouchableOpacity onPress={handleSkipStep} disabled={moveStep.running} style={styles.skipLink} accessibilityRole="button" accessibilityLabel="skip for now">
            <Text style={styles.skipLinkText}>skip for now</Text>
          </TouchableOpacity>
        )}

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
      </KeyboardAwareScrollView>

      {/* CLEAN MODAL PREVIEW */}
      <Modal visible={previewVisible} transparent animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
        <SafeAreaView style={styles.previewOverlay}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>resume template preview</Text>
            <TouchableOpacity onPress={() => setPreviewVisible(false)} hitSlop={10} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="close preview">
              <Ionicons name="close" size={26} color={T.white} />
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
      {/* progress overlay, no close button: back does nothing while it runs */}
      <Modal visible={aiGeneratingVisible} transparent={true} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContent}>
            <ActivityIndicator size="large" color={T.yellow} style={{ marginBottom: 16 }} />
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
  fieldError: { color: T.danger, fontFamily: F.bodySemi, fontSize: 12.5, marginTop: 4 },
  fieldHint: { color: T.textMuted, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  problemBox: { backgroundColor: T.dangerBg, borderRadius: 12, padding: 12, marginBottom: 12 },
  problemTitle: { fontFamily: F.bodyBold, fontSize: 13.5, color: T.danger, marginBottom: 4 },
  problemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  problemText: { flex: 1, fontFamily: F.body, fontSize: 13, color: T.ink },
  problemGo: { minHeight: 44, justifyContent: 'center' },
  problemGoText: { fontFamily: F.bodyBold, fontSize: 13, color: T.ink, textDecorationLine: 'underline' },
  skipLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  skipLinkText: { fontFamily: F.bodySemi, fontSize: 14, color: T.textMuted, textDecorationLine: 'underline' },
  safeArea: {
    flex: 1,
    backgroundColor: T.ink,
  },
  mainHeader: {
    height: 60,
    backgroundColor: T.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.ink,
  },
  headerBackBtn: {
    padding: 4,
  },
  mainHeaderTitle: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.white,
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
    backgroundColor: T.ink,
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
    backgroundColor: T.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: T.inkLine,
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  stepCircleCompleted: {
    backgroundColor: T.success,
    borderColor: T.success,
  },
  stepLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: T.inkSoft,
    left: '50%',
    right: '-50%',
    top: 15,
    zIndex: 1,
  },
  stepLineCompleted: {
    backgroundColor: T.success,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 10,
  },
  cardContainer: {
    backgroundColor: T.card,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 24,
    shadowColor: T.ink,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.line,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: F.heading,
    color: T.ink,
  },
  cardStepBadge: {
    backgroundColor: T.sand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardStepBadgeText: {
    fontSize: 12,
    fontFamily: F.bodyBold,
    color: T.textMuted,
  },
  cardSubtitle: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    marginBottom: 20,
  },
  bannerCard: {
    backgroundColor: T.sand,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.line,
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 15,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  bannerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerUploadBtn: {
    backgroundColor: T.yellow,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  bannerUploadBtnText: {
    color: T.ink,
    fontSize: 12,
    fontFamily: F.bodyBold,
  },
  bannerSkipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerSkipBtnText: {
    color: T.textMuted,
    fontSize: 12,
    fontFamily: F.bodySemi,
  },
  formContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: F.bodyBold,
    color: T.textMuted,
    textTransform: 'none',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: T.sand,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 14, fontFamily: F.body,
    color: T.ink,
    marginBottom: 12,
  },
  inputGridRow: {
    flexDirection: 'row',
  },
  yellowButton: {
    backgroundColor: T.yellow,
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  yellowButtonText: {
    color: T.ink,
    fontSize: 14,
    fontFamily: F.bodyBold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  toggleLabel: {
    fontSize: 13,
    fontFamily: F.bodySemi,
    color: T.textMuted,
  },
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiEnhanceMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.yellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiEnhanceMiniBtnText: {
    fontSize: 10,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginLeft: 4,
  },
  skillInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skillTextInput: {
    flex: 1,
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 14, fontFamily: F.body,
    color: T.ink,
    marginRight: 10,
  },
  skillAddBtn: {
    backgroundColor: T.yellow,
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
    backgroundColor: T.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  skillTagText: {
    fontSize: 13,
    color: T.textMuted,
    fontFamily: F.bodySemi,
  },
  skillTipText: {
    fontSize: 11, fontFamily: F.body,
    color: T.textFaint,
    textAlign: 'center',
    marginTop: 12,
  },
  certificationHeading: {
    fontSize: 15,
    fontFamily: F.bodyBold,
    color: T.ink,
    marginTop: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    paddingBottom: 4,
  },
  emptyCardBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: T.sand,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.line,
    marginBottom: 12,
  },
  emptyCardText: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.textMuted,
  },
  itemRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.sand,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: T.line,
    marginBottom: 10,
  },
  itemBadgeTitle: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.ink,
  },
  itemBadgeSub: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 2,
  },
  rolesListContainer: {
    marginTop: 10,
  },
  industryBlock: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 10,
    backgroundColor: T.sand,
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
    fontFamily: F.bodyBold,
    color: T.textMuted,
  },
  industryRolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: T.line,
    backgroundColor: T.card,
  },
  roleSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.line,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: T.sand,
  },
  roleSelectBtnActive: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  roleSelectText: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
  },
  roleSelectTextActive: {
    color: T.ink,
    fontFamily: F.bodyBold,
  },
  summaryTextarea: {
    height: 100,
    textAlignVertical: 'top',
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
    backgroundColor: T.inkSoft,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.white,
    marginLeft: 6,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.yellow,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  continueButtonText: {
    fontSize: 14,
    fontFamily: F.bodyBold,
    color: T.ink,
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
    color: T.textMuted,
    fontFamily: F.bodyMedium,
  },
  bottomLabelTextActive: {
    color: T.yellow,
    fontFamily: F.bodyBold,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: T.ink,
  },
  previewHeader: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: T.ink,
  },
  previewTitle: {
    fontSize: 15,
    fontFamily: F.bodySemi,
    color: T.white,
  },
  previewWebView: {
    flex: 1,
    backgroundColor: T.card,
  },
  previewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmptyText: {
    color: T.textMuted,
  },
  aiModalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiModalContent: {
    width: width * 0.85,
    backgroundColor: T.inkSoft,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.inkLine,
  },
  aiModalTitle: {
    fontSize: 20,
    fontFamily: F.headingBold,
    color: T.white,
    marginBottom: 10,
  },
  aiModalStep: {
    fontSize: 14, fontFamily: F.body,
    color: T.textFaint,
    marginBottom: 20,
    textAlign: 'center',
  },
  aiProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: T.inkSoft,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  aiProgressBar: {
    height: '100%',
    backgroundColor: T.yellow,
    borderRadius: 3,
  },
  aiModalPercent: {
    fontSize: 14,
    fontFamily: F.bodySemi,
    color: T.yellow,
  },
});

export default ResumeBuilderScreen;