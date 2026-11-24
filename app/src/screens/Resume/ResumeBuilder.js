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
import { INDUSTRIES, keyOf, indexOfKey, styles } from './steps/builderShared';
// P3a (flag resumeV2): the track's step order, the new sections, progress, one-page estimate, "saved"
import useFlag from '../../hooks/useFlag';
import { FLAGS } from '../../api/upgradeFlags';
import { finishShown } from '../../resume/finishMoment'; // P3d
import { EXTRA_STEPS, stepOrder, nextStep, prevStep, stepIdFor, pageEstimate, fitLine, KEY_TO_ID } from '../../resume/resumeV2';
import ActivitiesStep from './steps/ActivitiesStep';
import AwardsStep from './steps/AwardsStep';
import LanguagesStep from './steps/LanguagesStep';
import CourseworkSection from './steps/CourseworkSection';
// P3b (flags resumeV2 + resumeCoach): the coach
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { COACH_FLAG, programmeOf, readyChecklist, meterStart, meterAdd, meterCheck } from '../../resume/coach';
import { funnel } from '../../analytics/funnel';
import StepTip from './coach/StepTip';
import StoryPrompt from './coach/StoryPrompt';
import MemoryJoggers from './coach/MemoryJoggers';
import LiveCheck from './coach/LiveCheck';
import { CoachSummary, CoachSkills, CoachBar, ReadyCheck, spellingLeft } from './coach/CoachTools';
import renderStep1File from './steps/Step1Personal';
import renderStep2File from './steps/Step2Education';
import renderStep3File from './steps/Step3Experience';
import renderStep4File from './steps/Step4Projects';
import renderStep5File from './steps/Step5Certificates';
import renderStep6File from './steps/Step6Summary';
import renderStep7File from './steps/Step7Skills';
export { keyOf, indexOfKey }; // were defined here; tests and other screens import them from the builder
const { width, height } = Dimensions.get('window');



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
    updateResume: updateResumeInContext,
    uploadResume,
    loading,
    uploadProgress,
    error,
    clearError,
    fetchResumes,
    setCurrentResume,
    loadResume,
  } = useContext(ResumeContext);
  // P3-5: every save goes through here, so the builder can show "saved ✓" (resumeV2); nothing else changes
  const [savedAt, setSavedAt] = useState(0);
  const updateResume = (...args) => Promise.resolve(updateResumeInContext(...args)).then((r) => { if (r) setSavedAt(Date.now()); return r; });

  const navigation = useNavigation();
  const route = useRoute();
  const { resumeId, step: startStep } = route.params || {};
  // P3-1: the track chosen on the start screen for a new resume ("have you done an internship or job yet?")
  const newTrack = ['fresher', 'experienced'].includes(route.params?.track) ? route.params.track : null;
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
  // P3-1 (resumeV2): "upload my cv" on the start screen opens the builder's own upload once
  const autoUploadDone = useRef(false);
  useEffect(() => {
    if (!route.params?.autoUpload || autoUploadDone.current) return;
    autoUploadDone.current = true;
    handleAutoFillUpload();
  }, [route.params?.autoUpload]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // P3-3 (resumeV2): the steps in the track's order (fresher: education, projects and activities first, experience
  // last); the new sections are steps 8–11. Flag off: today's 1..7, unchanged.
  const v2 = useFlag(FLAGS.resumeV2) === true;
  // P3d: "fix it" (feedback) opens the builder at a section by name, the fresher steps (8-11) too; older params unchanged
  const startKey = route.params?.stepKey;
  useEffect(() => { if (v2 && startKey && KEY_TO_ID[startKey]) setActiveStep(KEY_TO_ID[startKey]); }, [v2, startKey]);
  const order = stepOrder(isNew && !createdIdRef.current ? { settings: { track: newTrack } } : currentResume, v2);
  const stepDef = (id) => steps.find((s) => s.id === id) || EXTRA_STEPS[id] || steps[0];
  const firstStep = order[0];
  const lastStep = order[order.length - 1];
  // the new steps save through the builder (a new resume is created first)
  const stepIo = { ensureResume: () => ensureResume(), updateResume: (...a) => updateResume(...a) };
  // P3b: the coach (under resumeV2), speak mode (resumeSpeak) inside it
  const coachFlag = useFlag(COACH_FLAG) === true; // hooks always called, in the same order
  const speakFlag = useFlag('resumeSpeak') === true;
  const finishFlag = useFlag('resumeFinish') === true; // P3d: the finish moment, once per resume
  const coachOn = v2 && coachFlag;
  const speakOn = coachOn && speakFlag;
  const programme = programmeOf(currentResume);
  const [ready, setReady] = useState({ open: false, items: [], loading: false });
  const openReady = async () => {
    const live = buildLiveResume();
    setReady({ open: true, items: readyChecklist(live), loading: true });
    const left = await spellingLeft(live).catch(() => 0);
    setReady({ open: true, items: readyChecklist(live, { spellingLeft: left }), loading: false });
    funnel('resume_ready_check', { refId: String(currentResume?._id || 'new'), left });
  };
  // the meter: real time and coach taps / typing to a strong one-page resume (sent once, never shown as a promise)
  const meterId = currentResume?._id && !String(currentResume._id).startsWith('guest_') ? String(currentResume._id) : null;
  useEffect(() => { if (coachOn && meterId) { meterStart(meterId, 'tap'); funnel('resume_coach_tap'); } }, [coachOn, meterId]);
  useEffect(() => {
    if (!coachOn || !meterId || !currentResume) return;
    meterCheck(meterId, currentResume).then((m) => { if (m) funnel('resume_one_page_ready', { refId: meterId, ...m }); }).catch(() => {});
  }, [coachOn, meterId, currentResume]);
  const coachTap = () => { if (meterId) meterAdd(meterId, { taps: 1 }); };
  const coachTyped = (n) => { if (meterId && n > 0) meterAdd(meterId, { typed: n }); };

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
        const created = await createResume({ personalInfo: currentPersonal(), template: 'modern_ats', ...(newTrack ? { settings: { track: newTrack } } : {}) }, { alert: false });
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
  const handlePrevStep = () => goToStep((prev) => prevStep(order, prev));
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
  const optionalStep = (s) => s !== lastStep && ((s >= 2 && s <= 6) || (v2 && s >= 8));

  // Continue: an item typed but not added is added first (never lost, never blocks)
  const handleNextStep = () => {
    const item = unsavedItem();
    // the new steps (8–11) add what is typed themselves (nothing typed: nothing happens)
    const add = (item && { education: 2, experience: 3, project: 4, certification: 5 }[item] === activeStep && addHandlers.current[activeStep]) || (activeStep >= 8 && addHandlers.current[activeStep]);
    if (add) {
      Promise.resolve(add({ quiet: true })).finally(() => goToStep((prev) => nextStep(order, prev)));
      return;
    }
    goToStep((prev) => nextStep(order, prev));
  };
  // skip for now: optional sections never block; what is typed stays on the phone for later
  const handleSkipStep = () => goToStep((prev) => nextStep(order, prev));

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
    // P3d (resumeV2 + resumeFinish): the first finish of a resume celebrates it; afterwards the preview, as before
    if (v2 && finishFlag && !(await finishShown(resume._id))) {
      navigation.navigate('ResumeFinish', { resumeId: resume._id });
      return;
    }
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
  const renderStep1 = () => renderStep1File({ buildLiveResume, currentResume, fieldError, handleAutoFillUpload, handleSaveStep1, pEmail, pGithub, pLinkedin, pLocation, pName, pPhone, pPortfolio, pTitle, resumeNameInput, savePersonalQuietly, saveResumeName, saveStep1, setPEmail, setPGithub, setPLinkedin, setPLocation, setPName, setPPhone, setPPortfolio, setPTitle, setPreviewTemplateId, setPreviewVisible, setResumeNameInput });

  // ============================================================
  // STEP 2: EDUCATION
  // ============================================================
  const renderStep2 = () => renderStep2File({ addHandlers, confirmRemove, currentResume, editingEduIndex, eduCurrent, eduDegree, eduEndDate, eduField, eduGpa, eduInstitution, eduSemester, eduStartDate, formatDateForInput, removeItem, saveItem, saveListItem, setEditingEduIndex, setEduCurrent, setEduDegree, setEduEndDate, setEduField, setEduGpa, setEduInstitution, setEduSemester, setEduStartDate });

  // ============================================================
  // STEP 3: WORK EXPERIENCE
  // ============================================================
  const renderStep3 = () => renderStep3File({ addHandlers, aiWork, confirmRemove, currentResume, editingWorkIndex, formatDateForInput, removeItem, requireAccount, saveItem, saveListItem, setEditingWorkIndex, setWorkCompany, setWorkCurrent, setWorkDesc, setWorkEndDate, setWorkLocation, setWorkPosition, setWorkStartDate, workCompany, workCurrent, workDesc, workEndDate, workLocation, workPosition, workStartDate });

  // ============================================================
  // STEP 4: PROJECTS
  // ============================================================
  const renderStep4 = () => renderStep4File({ addHandlers, aiProj, confirmRemove, currentResume, editingProjIndex, projDesc, projGithub, projLive, projName, projTech, removeItem, requireAccount, saveItem, saveListItem, setEditingProjIndex, setProjDesc, setProjGithub, setProjLive, setProjName, setProjTech });

  // ============================================================
  // STEP 5: CERTIFICATIONS (NEW POSITION)
  // ============================================================
  const renderStep5 = () => renderStep5File({ addHandlers, certExpiryDate, certIssueDate, certIssuer, certName, certUrl, confirmRemove, currentResume, editingCertIndex, removeItem, saveItem, saveListItem, setCertExpiryDate, setCertIssueDate, setCertIssuer, setCertName, setCertUrl, setEditingCertIndex });

  // ============================================================
  // STEP 6: TARGET JOB (NEW POSITION)
  // ============================================================
  const renderStep6 = () => renderStep6File({ aiSummary, currentResume, ensureResume, expandedIndustry, getTargetRoleFallback, handleSaveStep6, lastSummaryRef, requireAccount, roleSearchQuery, saveStep6, saveSummaryQuietly, setExpandedIndustry, setRoleSearchQuery, setTargetSummary, targetSummary, toggleRole, updateResume });

  // ============================================================
  // STEP 7: SKILLS (NEW POSITION - LAST)
  // ============================================================
  const renderStep7 = () => renderStep7File({ addSkill, aiSkills, confirmRemove, currentResume, ensureResume, getTargetRoleFallback, removeItem, requireAccount, setSkillInput, skillInput, updateResume });

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

  // the step buttons (unchanged); with the coach they sit above the keyboard (P3-5, moved to P3b by the owner)
  const footerEl = (
        <View style={styles.footerContainer}>
          <TouchableOpacity 
            style={[styles.backButton, activeStep === firstStep && { opacity: 0.5 }]}
            disabled={activeStep === firstStep || moveStep.running}
            onPress={handlePrevStep}
          >
            <Ionicons name="arrow-back" size={16} color={T.white} />
            <Text style={styles.backButtonText}>back</Text>
          </TouchableOpacity>

          <TouchableOpacity 
  style={[styles.continueButton, activeStep === lastStep && { backgroundColor: T.success }]}
  disabled={moveStep.running || finish.running}
  accessibilityRole="button"
  accessibilityState={{ busy: moveStep.running || finish.running }}
  onPress={() => {
    if (activeStep === lastStep && coachOn) {
      openReady(); // P3-4b "ready to send?": advice, then the same finish
    } else if (activeStep === lastStep) {
      // skills are saved on every add; a new resume that was never saved is created first
      handleFinish();
    } else {
      handleNextStep();
    }
  }}
>
            <Text style={[styles.continueButtonText, activeStep === lastStep && { color: T.white }]}>
              {activeStep === lastStep ? 'Finish & Preview 🚀' : 'Continue'}
            </Text>
            <Ionicons 
              name={activeStep === lastStep ? "checkmark-done" : "arrow-forward"} 
              size={16} 
              color={activeStep === lastStep ? T.white : T.ink} 
            />
          </TouchableOpacity>
        </View>
  );

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

      {/* P3-5 (resumeV2): a progress bar with the step and minutes left, instead of the icons */}
      {v2 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }} accessible accessibilityLabel={`step ${order.indexOf(activeStep) + 1} of ${order.length}`}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: T.line, overflow: 'hidden' }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: T.yellow, width: `${Math.round(((order.indexOf(activeStep) + 1) / order.length) * 100)}%` }} />
          </View>
          <Text style={{ fontFamily: F.bodyMedium, fontSize: 12, color: T.textMuted, marginTop: 6 }}>{`step ${order.indexOf(activeStep) + 1} of ${order.length}`}</Text>
        </View>
      )}
      {/* Stepper icons */}
      {!v2 && (
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
      )}

      {/* The White Card containing the active step form */}
      <KeyboardAwareScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} bottomOffset={24} keyboardShouldPersistTaps="handled">
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{stepDef(activeStep).title}</Text>
            <View style={styles.cardStepBadge}>
              <Text style={styles.cardStepBadgeText}>{v2 ? `${order.indexOf(activeStep) + 1}/${order.length}` : `${activeStep}/7`}</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>{stepDef(activeStep).desc}</Text>
          {v2 && (() => {
            const est = pageEstimate(buildLiveResume());
            return (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }} testID="v2-status">
                <Text style={{ fontFamily: F.bodyMedium, fontSize: 12.5, color: est.fits ? T.success : '#8A5A00', flex: 1 }} accessibilityLiveRegion="polite">{fitLine(est)}</Text>
                {!!savedAt && <Text style={{ fontFamily: F.bodyMedium, fontSize: 12.5, color: T.success }} accessibilityLiveRegion="polite">saved ✓</Text>}
              </View>
            );
          })()}
          <ResumeStrength resume={buildLiveResume()} compact style={{ marginBottom: 12 }} onGoTo={(s, _key, stepKey) => goToStep(stepIdFor(s, stepKey, v2))} />
          {coachOn && <StepTip step={activeStep} programme={programme} />}
          {coachOn && <CoachBar resume={currentResume ? buildLiveResume() : null} io={stepIo} onChat={() => navigation.navigate('ResumeCoachChat', currentResume?._id ? { resumeId: currentResume._id } : { track: newTrack || 'fresher' })} />}
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
          {/* P3-3 (resumeV2): coursework under education; the new sections */}
          {v2 && activeStep === 2 && <CourseworkSection resume={currentResume} io={stepIo} />}
          {activeStep === 8 && <ActivitiesStep kind="activities" resume={currentResume} io={stepIo} registerAdd={(fn) => { addHandlers.current[8] = fn; }} coach={coachOn ? { programme, speak: speakOn, onTap: coachTap, onTyped: coachTyped } : null} />}
          {activeStep === 9 && <ActivitiesStep kind="volunteering" resume={currentResume} io={stepIo} registerAdd={(fn) => { addHandlers.current[9] = fn; }} coach={coachOn ? { programme, speak: speakOn, onTap: coachTap, onTyped: coachTyped } : null} />}
          {/* P3b coach, per step */}
          {coachOn && activeStep === 1 && (
            <View>
              <LiveCheck field="email" text={pEmail} onFix={setPEmail} />
              <LiveCheck field="phone" text={pPhone} onFix={setPPhone} />
              <LiveCheck field="linkedin" text={pLinkedin} />
            </View>
          )}
          {coachOn && activeStep === 3 && (
            <View>
              <MemoryJoggers programme={programme} sections={['workExperience']} io={stepIo} onTap={coachTap} onTyped={coachTyped} />
              {!!(workCompany.trim() || workPosition.trim()) && <StoryPrompt section="workExperience" role={workPosition} organisation={workCompany} current={workCurrent} speak={speakOn} onTap={coachTap} onTyped={coachTyped} onKeep={(lines) => setWorkDesc((d) => [d, ...lines.map((l) => `- ${l}`)].filter((x) => String(x || '').trim()).join('\n'))} />}
              {!!workDesc.trim() && <LiveCheck field="bullet" text={workDesc.split('\n').filter((l) => l.trim()).pop()} current={workCurrent} />}
            </View>
          )}
          {coachOn && activeStep === 4 && (
            <View>
              <MemoryJoggers programme={programme} sections={['projects', 'awards', 'certifications']} io={stepIo} onTap={coachTap} onTyped={coachTyped} />
              {!!projName.trim() && <StoryPrompt section="projects" organisation={projName} speak={speakOn} onTap={coachTap} onTyped={coachTyped} onKeep={(lines) => setProjDesc((d) => [d, ...lines].filter((x) => String(x || '').trim()).join(' '))} />}
            </View>
          )}
          {coachOn && activeStep === 6 && (
            <View>
              <CoachSummary
                programme={programme}
                university={(currentResume?.education || [])[0]?.institution || ''}
                targetRole={getTargetRoleFallback()}
                strengths={[...(currentResume?.activities || []).map((a) => [a.role, a.organisation].filter(Boolean).join(' at ')), ...(currentResume?.projects || []).map((x) => x.name)].filter(Boolean)}
                skills={(currentResume?.skills || []).map((x) => x?.name || x)}
                onPick={(t) => { coachTap(); setTargetSummary(t); ensureResume().then((r) => r?._id && updateResume(r._id, { professionalSummary: { summary: t } })).then(() => { lastSummaryRef.current = t; }).catch(() => {}); }}
              />
              {!!targetSummary.trim() && <LiveCheck field="summary" text={targetSummary} onFix={setTargetSummary} />}
            </View>
          )}
          {coachOn && activeStep === 7 && <CoachSkills resume={currentResume} programme={programme} targetRole={getTargetRoleFallback()} io={stepIo} />}
          {activeStep === 10 && <AwardsStep resume={currentResume} io={stepIo} registerAdd={(fn) => { addHandlers.current[10] = fn; }} />}
          {activeStep === 11 && <LanguagesStep resume={currentResume} io={stepIo} registerAdd={(fn) => { addHandlers.current[11] = fn; }} />}
        </View>

        {/* Bottom Stepper Navigation buttons (pinned above the keyboard with the coach: see below) */}
        {!coachOn && footerEl}

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
      {coachOn && <KeyboardStickyView>{footerEl}</KeyboardStickyView>}
      {coachOn && <ReadyCheck visible={ready.open} items={ready.items} loading={ready.loading} onClose={() => setReady({ open: false, items: [], loading: false })} onContinue={() => { setReady({ open: false, items: [], loading: false }); handleFinish(); }} />}

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



export default ResumeBuilderScreen;