// app/src/context/ResumeContext.js
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, AppState } from 'react-native';
import resumeApi from '../api/resumeApi';
import { metaEvents } from '../analytics/metaEvents';
import { AuthContext } from './AuthContext';
import { runInGroup } from '../hooks/useAction';
import { plainError } from '../utils/plainError';

export const ACCOUNT_LIMIT_MSG = "you already have 2 resumes. open one of them to edit it, or delete one to make a new one.";
export const GUEST_LIMIT_MSG = "guest mode allows 2 resumes, and deleting one doesn't free a slot. sign up to make more.";

const getErrorMessage = (error, defaultMsg = 'An error occurred') => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  return error.message || defaultMsg;
};

export const ResumeContext = createContext();

// ---- saves made without a connection: kept on the phone, sent when the connection is back ----
export const PENDING_KEY = 'resumePendingSaves';
const MERGED = ['personalInfo', 'professionalSummary', 'customStyles', 'targetJob', 'settings'];
/** b on top of a (objects that the server merges are merged here too) */
export const mergeChanges = (a, b) => {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = MERGED.includes(k) && v && typeof v === 'object' && !Array.isArray(v) ? { ...(out[k] || {}), ...v } : v;
  }
  return out;
};
/** no answer from the server (offline, timeout): the save can wait; a 4xx/5xx answer can't */
export const isOfflineError = (err) => !!err && !err.response && (
  !!err.request || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || /network|timeout|taking too long/i.test(String(err.message || ''))
);

export default function ResumeProvider({ children }) {
  const { token, isGuest, user } = useContext(AuthContext);
  const [resumes, setResumesState] = useState([]);
  const [currentResume, setCurrentResumeState] = useState(null);
  const [creationsUsed, setCreationsUsed] = useState(0);
  // what is running, per action: { fetch: 1, "update:<id>": 1, ... } (never one flag for everything)
  const [pending, setPending] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // The latest list / open resume, readable inside queued saves (state in a closure can be stale)
  const resumesRef = useRef([]);
  const currentRef = useRef(null);
  const setResumes = useCallback((next) => {
    const value = typeof next === 'function' ? next(resumesRef.current) : next;
    resumesRef.current = Array.isArray(value) ? value : [];
    setResumesState(resumesRef.current);
  }, []);
  const setCurrentResume = useCallback((next) => {
    const value = typeof next === 'function' ? next(currentRef.current) : next;
    currentRef.current = value || null;
    setCurrentResumeState(currentRef.current);
  }, []);
  // put one changed resume everywhere it is shown
  const replaceResume = useCallback((updated) => {
    if (!updated?._id) return;
    setResumes((list) => list.map((r) => (r._id === updated._id ? updated : r)));
    setCurrentResume((cur) => (cur?._id === updated._id ? updated : cur));
  }, [setResumes, setCurrentResume]);

  const begin = useCallback((key) => setPending((p) => ({ ...p, [key]: (p[key] || 0) + 1 })), []);
  const end = useCallback((key) => setPending((p) => {
    const n = (p[key] || 0) - 1;
    const next = { ...p };
    if (n > 0) next[key] = n; else delete next[key];
    return next;
  }), []);
  const track = useCallback(async (key, work) => {
    begin(key);
    try { return await work(); } finally { end(key); }
  }, [begin, end]);
  /** is an action running? isPending("update", id) / isPending("fetch") */
  const isPending = useCallback((action, id) => !!pending[id ? `${action}:${id}` : action], [pending]);

  // { [resumeId]: changes not on the server yet }, mirrored in AsyncStorage (survives closing the app)
  const pendingSavesRef = useRef({});
  const [pendingSync, setPendingSync] = useState(0);
  const writePending = async (next) => {
    pendingSavesRef.current = next;
    setPendingSync(Object.keys(next).length);
    try { await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(next)); } catch (e) { console.warn('[resume] offline copy not kept:', e?.message); }
  };
  const readPending = async () => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      pendingSavesRef.current = parsed && typeof parsed === 'object' ? parsed : {};
    } catch { pendingSavesRef.current = {}; }
    setPendingSync(Object.keys(pendingSavesRef.current).length);
    return pendingSavesRef.current;
  };
  // the server's copy with the changes still waiting on this phone on top
  const withPending = (r) => (r?._id && pendingSavesRef.current[r._id] ? { ...mergeChanges(r, pendingSavesRef.current[r._id]), _pendingSync: true } : r);

  const flushingRef = useRef(null);
  /** send every waiting save (one per resume, oldest first); stops at the first one that still can't reach the server */
  const flushPendingSaves = () => {
    if (flushingRef.current) return flushingRef.current;
    flushingRef.current = (async () => {
      try {
        if (isGuest || !token) return 0;
        await readPending();
        let sent = 0;
        for (const id of Object.keys(pendingSavesRef.current)) {
          const changes = pendingSavesRef.current[id];
          try {
            const res = await runInGroup(`resume:${id}`, () => resumeApi.updateResume(id, changes));
            const { [id]: _done, ...rest } = pendingSavesRef.current;
            await writePending(rest);
            if (res?.success && res.data) replaceResume(withPending(res.data));
            sent++;
          } catch (err) {
            if (isOfflineError(err)) break;
            // the server said no (deleted resume, bad data): don't retry it forever
            console.warn('[resume] waiting save dropped:', err?.message);
            const { [id]: _bad, ...rest } = pendingSavesRef.current;
            await writePending(rest);
          }
        }
        return sent;
      } finally {
        flushingRef.current = null;
      }
    })();
    return flushingRef.current;
  };

  // back online / back in the app: send what is waiting
  useEffect(() => {
    if (isGuest || !token) return undefined;
    readPending().then((p) => { if (Object.keys(p).length) flushPendingSaves(); });
    const subs = [];
    try {
      const NetInfo = require('@react-native-community/netinfo').default;
      const off = NetInfo?.addEventListener?.((s) => { if (s?.isConnected && Object.keys(pendingSavesRef.current).length) flushPendingSaves(); });
      if (off) subs.push(off);
    } catch { /* no NetInfo: app focus and the next save still send it */ }
    const appSub = AppState?.addEventListener?.('change', (s) => { if (s === 'active' && Object.keys(pendingSavesRef.current).length) flushPendingSaves(); });
    if (appSub) subs.push(() => appSub.remove());
    return () => subs.forEach((f) => { try { f(); } catch {} });
  }, [token, isGuest]);

  const persistGuest = async (list) => {
    try { await AsyncStorage.setItem('guestResumes', JSON.stringify(list)); }
    catch (e) { console.warn('[resume] guest save failed:', e?.message); }
  };

  // Fetch all resumes. A failed refresh keeps the list the student already sees.
  const fetchResumes = async (force = true) => track('fetch', async () => {
    try {
      setError(null);
      if (isGuest) {
        const storedResumes = await AsyncStorage.getItem('guestResumes');
        const storedCreations = await AsyncStorage.getItem('guestCreationsUsed');
        const parsedResumes = storedResumes ? JSON.parse(storedResumes) : [];
        const usedCount = storedCreations ? parseInt(storedCreations, 10) : (Array.isArray(parsedResumes) ? parsedResumes.length : 0);
        setResumes(Array.isArray(parsedResumes) ? parsedResumes : []);
        setCreationsUsed(usedCount);
        return true;
      }
      if (!token) {
        setResumes([]);
        setCreationsUsed(0);
        return true;
      }
      const response = await resumeApi.getResumes(force);
      if (response?.success) {
        setResumes(Array.isArray(response.data) ? response.data.map(withPending) : []);
        setCreationsUsed(response.creationsUsed !== undefined ? response.creationsUsed : (response.data?.length || 0));
        return true;
      }
      setError('Failed to fetch resumes');
      return false;
    } catch (err) {
      console.warn('[resume] refresh failed, keeping the last list:', err?.message);
      setError(getErrorMessage(err, 'Failed to fetch resumes'));
      return false;
    } finally {
      setInitialized(true);
    }
  });

  const isLimitError = (err) =>
    err?.code === 'RESUME_LIMIT' ||
    err?.response?.data?.code === 'RESUME_CREATION_LIMIT_REACHED' ||
    err?.response?.data?.code === 'RESUME_LIMIT_REACHED' ||
    String(err?.response?.data?.error || '').includes('resume creations') ||
    String(err?.message || '').includes('resume creations');

  // Create new resume. At the limit it throws an error with code RESUME_LIMIT;
  // { alert: false } lets the screen show its own message.
  const createResume = async (resumeData = {}, { alert = true } = {}) => track('create', async () => {
    try {
      setError(null);
      if (isGuest) {
        const storedResumes = await AsyncStorage.getItem('guestResumes');
        const storedCreations = await AsyncStorage.getItem('guestCreationsUsed');
        const parsed = storedResumes ? JSON.parse(storedResumes) : [];
        const guestList = Array.isArray(parsed) ? parsed : [];
        const usedCount = storedCreations ? parseInt(storedCreations, 10) : guestList.length;
        if (usedCount >= 2) {
          throw Object.assign(new Error(GUEST_LIMIT_MSG), { code: 'RESUME_LIMIT' });
        }
        const newResume = {
          _id: `guest_${Date.now()}`,
          isGuest: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          template: resumeData.template || 'modern_ats',
          personalInfo: {
            firstName: user?.name?.split(' ')[0] || '',
            lastName: user?.name?.split(' ')[1] || '',
            // P3 #7 (owner): nothing made up: empty unless the student gave it
            title: user?.headline || '',
            location: user?.location && String(user.location).trim().toLowerCase() !== 'karachi, pakistan' ? user.location : '',
            ...(resumeData.personalInfo || {})
          },
          professionalSummary: {
            title: resumeData.personalInfo?.title || user?.headline || '',
            ...(resumeData.professionalSummary || {})
          },
          education: resumeData.education || [],
          skills: resumeData.skills || [],
          workExperience: resumeData.workExperience || [],
          certifications: resumeData.certifications || [],
          projects: resumeData.projects || [],
          languages: resumeData.languages || [],
          targetJobs: resumeData.targetJobs || [],
          targetJob: resumeData.targetJob || {},
        };
        const updatedResumes = [...guestList, newResume];
        setResumes(updatedResumes);
        setCreationsUsed(usedCount + 1);
        await persistGuest(updatedResumes);
        await AsyncStorage.setItem('guestCreationsUsed', String(usedCount + 1));
        setCurrentResume(newResume);
        return newResume;
      }

      const response = await resumeApi.createResume(resumeData);
      if (response?.success) {
        const newResume = response.data;
        setResumes((list) => [newResume, ...list]);
        setCreationsUsed((prev) => prev + 1);
        setCurrentResume(newResume);
        return newResume;
      }
      return null;
    } catch (err) {
      const limit = isLimitError(err);
      const msg = limit ? (isGuest ? GUEST_LIMIT_MSG : ACCOUNT_LIMIT_MSG) : getErrorMessage(err, 'Failed to create resume');
      setError(msg);
      if (alert) Alert.alert(limit ? 'Resume Creation Limit Reached ⚠️' : 'Error', limit ? msg : plainError(err, "couldn't create the resume. please try again."));
      if (limit) err.code = 'RESUME_LIMIT';
      throw err;
    }
  });

  // Update resume: only the sent fields change on the server. Saves of one resume run one after
  // another; `updates` may be a function of the latest saved resume (computed when the save runs),
  // so two quick edits never overwrite each other. Returns the saved resume.
  const updateResume = async (resumeId, updates) => {
    begin(`update:${resumeId}`);
    try {
      return await runInGroup(`resume:${resumeId}`, async () => {
        const latest = resumesRef.current.find((r) => r._id === resumeId) || (currentRef.current?._id === resumeId ? currentRef.current : null);
        const changes = typeof updates === 'function' ? updates(latest) : updates;
        if (!changes || Object.keys(changes).length === 0) return latest;
        setError(null);
        if (isGuest || String(resumeId).startsWith('guest_')) {
          const base = latest || {};
          const updated = { ...base, ...changes, updatedAt: new Date().toISOString() };
          replaceResume(updated);
          await persistGuest(resumesRef.current);
          return updated;
        }
        // saves still waiting for this resume go first, in the same request
        const waiting = pendingSavesRef.current[resumeId];
        const toSend = waiting ? mergeChanges(waiting, changes) : changes;
        try {
          const response = await resumeApi.updateResume(resumeId, toSend);
          if (waiting) { const { [resumeId]: _sent, ...rest } = pendingSavesRef.current; await writePending(rest); }
          if (response?.success && response.data) {
            replaceResume(response.data);
            return response.data;
          }
          return null;
        } catch (err) {
          if (!isOfflineError(err)) throw err;
          // no connection: keep it on this phone and show it as saved; it is sent when the connection is back
          await writePending({ ...pendingSavesRef.current, [resumeId]: toSend });
          const local = { ...mergeChanges(latest || { _id: resumeId }, changes), _pendingSync: true, updatedAt: new Date().toISOString() };
          replaceResume(local);
          return local;
        }
      });
    } catch (err) {
      console.warn('[resume] update failed:', err?.message);
      setError(getErrorMessage(err, 'Failed to update resume'));
      throw err;
    } finally {
      end(`update:${resumeId}`);
    }
  };

  // Delete resume
  const deleteResume = async (resumeId) => track(`delete:${resumeId}`, async () => {
    try {
      setError(null);
      if (!isGuest) await resumeApi.deleteResume(resumeId);
      setResumes((list) => list.filter((r) => r._id !== resumeId));
      setCurrentResume((cur) => (cur?._id === resumeId ? (resumesRef.current[0] || null) : cur));
      if (isGuest) await persistGuest(resumesRef.current);
    } catch (err) {
      console.warn('[resume] delete failed:', err?.message);
      setError(getErrorMessage(err, 'Failed to delete resume'));
      throw err;
    }
  });



  // Upload and parse resume
  const uploadResume = async (file) => track('upload', async () => {
    try {
      setError(null);
      setUploadProgress(0);

      if (isGuest) {
        const newResume = {
          _id: `guest_${Date.now()}`,
          personalInfo: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            country: '',
            postalCode: '',
            linkedin: '',
            github: '',
            portfolio: ''
          },
          professionalSummary: {
            title: '',
            summary: '',
            experienceLevel: 'Mid Level'
          },
          uploadedResume: {
            fileName: file.name,
            uploadDate: new Date().toISOString(),
            parsedData: {}
          },
          settings: {
            visibility: 'public',
            allowDownload: true,
            allowSharing: true,
            showContactInfo: true,
            showSocialLinks: true,
            showSkills: true,
            showExperience: true,
            showEducation: true,
            showCertifications: true,
            showProjects: true,
            showLanguages: true,
            showInterests: true,
            showReferences: true,
            fontSize: 'medium',
            colorScheme: 'blue',
            language: 'en',
            autoSave: true,
            saveInterval: 30,
            defaultTemplate: 'modern'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completionPercentage: 10,
          isComplete: false,
          education: [],
          skills: [],
          workExperience: [],
          certifications: [],
          projects: [],
          languages: [],
          targetJobs: [],
          viewCount: 0,
          downloadCount: 0,
          shareCount: 0,
          viewsHistory: []
        };

        setResumes((list) => [...list, newResume]);
        await persistGuest(resumesRef.current);
        setCurrentResume(newResume);
        setUploadProgress(100);
        return newResume;
      }

      let fileUri = file.uri;

      // Resolve content:// URIs on Android to local cache to prevent permission/read failures
      if (Platform.OS === 'android' && fileUri.startsWith('content://')) {
        try {
          const FileSystem = require('expo-file-system');
          const tempFileName = file.name || 'resume.pdf';
          const cacheUri = `${FileSystem.cacheDirectory}${tempFileName}`;
          await FileSystem.copyAsync({
            from: fileUri,
            to: cacheUri,
          });
          fileUri = cacheUri;
          console.log('🔄 Resolved content:// URI to local cache URI:', fileUri);
        } catch (copyError) {
          console.error('❌ Failed to cache content:// URI:', copyError);
        }
      }

      // Create form data for upload
      const formData = new FormData();
      formData.append('resume', {
        uri: fileUri,
        type: file.type || 'application/pdf',
        name: file.name || 'resume.pdf',
      });

      // Upload and parse the resume
      const response = await resumeApi.uploadResume(formData, (progress) => {
        setUploadProgress(progress);
      });

      if (response?.success) {
        const newResume = response.data;
        // AI made a resume from the uploaded CV
        metaEvents.aiResumeCreated(newResume?._id, 'upload_parse');
        setResumes((list) => [newResume, ...list]);
        setCurrentResume(newResume);
        setUploadProgress(100);

        return newResume;
      }

      setUploadProgress(0);
      return null;
    } catch (error) {
      console.warn('[resume] upload failed:', error?.message);
      setError(getErrorMessage(error, 'Failed to upload resume'));
      setUploadProgress(0);
      throw error; // the screen that started the upload shows the message
    }
  });

  // Get recommended jobs
  // app/src/context/ResumeContext.js - This is already complete
  const getRecommendedJobs = async (resumeId) => {
    try {
      if (isGuest) {
        return [
          {
            title: "Frontend Development Intern",
            company: "ClickTake",
            location: "Karachi (In person)",
            matchPercentage: 85,
            salary: "Not Specified",
            postedAt: "2 days ago",
            description: "Internship focusing on Frontend React Native development..."
          },
          {
            title: "SEO Intern (Remote)",
            company: "ClickTake",
            location: "Remote (Pakistan)",
            matchPercentage: 78,
            salary: "Not Specified",
            postedAt: "3 days ago",
            description: "Internship focusing on search engine optimization..."
          }
        ];
      }

      const response = await resumeApi.getRecommendations(resumeId);
      return response?.data || [];
    } catch (error) {
      console.error('Get recommendations error:', error);
      return [];
    }
  };

  // Update template
  const updateTemplate = async (resumeId, template) => {
    try {
      if (isGuest) {
        return updateResume(resumeId, { template });
      }
      const response = await resumeApi.updateTemplate(resumeId, template);
      if (response?.success) {
        const updatedResume = response.data;
        replaceResume(updatedResume);
        return updatedResume;
      }
      return null;
    } catch (error) {
      console.error('Update template error:', error);
      throw error;
    }
  };

  // Get analytics
  const getAnalytics = async (resumeId) => {
    try {
      if (isGuest) {
        const idHash = (resumeId || "default").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const views = (idHash % 60) + 40;
        const downloads = (idHash % 20) + 10;
        const shares = (idHash % 10) + 3;
        const applications = (idHash % 8) + 2;
        const skillMatch = (idHash % 25) + 70;

        return {
          views,
          downloads,
          shares,
          applications,
          viewHistory: Array.from({ length: 30 }, (_, i) => {
            const date = new Date(Date.now() - (29 - i) * 86400000);
            const dayFactor = (idHash + date.getDate() + date.getMonth()) % 6;
            return {
              date,
              views: dayFactor + 1
            };
          }),
          skillMatch,
          completeness: currentResume?.completionPercentage || 50,
          strength: currentResume?.isComplete ? 90 : 65,
          improvements: []
        };
      }
      const response = await resumeApi.getAnalytics(resumeId);
      return response?.data || null;
    } catch (error) {
      console.error('Get analytics error:', error);
      return null;
    }
  };

  // Load resume by ID
  const loadResume = (resumeId) => {
    const found = resumesRef.current.find(r => r._id === resumeId);
    if (found) {
      setCurrentResume(found);
    }
    return found || null;
  };

  // Initialize
  useEffect(() => {
    fetchResumes();
  }, [token, isGuest]);
  // Get job recommendations for a resume
  const getJobRecommendations = async (resumeId = null, params = {}) => {
    try {
      if (isGuest) {
        // Return mock recommendations for guest
        return {
          recommendations: [
            {
              _id: '1',
              title: 'Frontend Development Intern',
              companyName: 'ClickTake',
              department: 'Engineering',
              location: 'Karachi (In person)',
              type: 'Internship',
              salary: 'Not Specified',
              matchPercentage: 85,
              matchedSkills: ['JavaScript', 'React', 'React Native'],
              matchReasons: ['Matched 3 skills', 'Internship', 'Remote friendly'],
              description: 'Internship focusing on Frontend React Native development...',
              urgent: true,
              featured: true
            },
            {
              _id: '2',
              title: 'SEO Intern (Remote)',
              companyName: 'ClickTake',
              department: 'Marketing',
              location: 'Remote (Pakistan)',
              type: 'Internship',
              salary: 'Not Specified',
              matchPercentage: 78,
              matchedSkills: ['SEO', 'Google Analytics'],
              matchReasons: ['Matched 2 skills', 'Internship'],
              description: 'Internship focusing on search engine optimization...'
            }
          ],
          total: 2,
          hasResume: true
        };
      }

      const response = await resumeApi.getJobRecommendations(resumeId, params);
      return response;
    } catch (error) {
      console.error('Get job recommendations error:', error);
      return { recommendations: [], total: 0 };
    }
  };

  // Get top job recommendations
  const getTopJobRecommendations = async (limit = 5) => {
    try {
      if (isGuest) {
        return {
          recommendations: [
            {
              _id: '1',
              title: 'Frontend Development Intern',
              companyName: 'ClickTake',
              location: 'Karachi (In person)',
              type: 'Internship',
              salary: 'Not Specified',
              matchPercentage: 85
            },
            {
              _id: '2',
              title: 'SEO Intern (Remote)',
              companyName: 'ClickTake',
              location: 'Remote (Pakistan)',
              type: 'Internship',
              salary: 'Not Specified',
              matchPercentage: 78
            }
          ],
          total: 2,
          hasResume: true
        };
      }

      const response = await resumeApi.getTopJobRecommendations(limit);
      return response;
    } catch (error) {
      console.error('Get top recommendations error:', error);
      return { recommendations: [], total: 0 };
    }
  };


  // Get my applications
  const getMyApplications = async () => {
    try {
      if (isGuest) {
        return [];
      }

      const response = await resumeApi.getMyApplications();
      return response;
    } catch (error) {
      console.error('Get applications error:', error);
      return [];
    }
  };

  // Check resume fit against job (compatibility)
  const checkResumeFit = async (resumeId, jobId) => {
    try {
      const response = await resumeApi.checkResumeFit(resumeId, jobId);
      return response;
    } catch (error) {
      console.error('Check resume fit context error:', error);
      throw error;
    }
  };

  // Optimize resume (Flow C - Instant AI Match)
  const optimizeResume = async (resumeId, optimizeData) => track(`optimize:${resumeId}`, async () => {
    try {
      setError(null);

      const response = await resumeApi.optimizeResume(resumeId, optimizeData);
      if (response?.success) {
        const optimizedResume = response.data;
        // AI tailored the resume to a job
        metaEvents.aiResumeCreated(`${resumeId}:${optimizeData?.jobId || ''}`, 'tailor');
        setResumes((list) => list.map(r => r._id === resumeId ? optimizedResume : r));
        setCurrentResume(optimizedResume);
        return optimizedResume;
      }
      return null;
    } catch (error) {
      console.warn('[resume] tailor failed:', error?.message);
      setError(getErrorMessage(error, 'Failed to optimize resume'));
      throw error;
    }
  });

  // Duplicate resume
  const duplicateResume = async (resumeId) => track(`duplicate:${resumeId}`, async () => {
    try {
      setError(null);

      if (isGuest) {
        const found = resumesRef.current.find(r => r._id === resumeId);
        if (!found) {
          throw new Error('Resume not found');
        }
        const duplicate = {
          ...found,
          _id: `guest_${Date.now()}`,
          isPrimary: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (duplicate.personalInfo) {
          duplicate.personalInfo = {
            ...duplicate.personalInfo,
            firstName: `Copy of ${duplicate.personalInfo.firstName || 'Resume'}`
          };
        }
        setResumes((list) => [duplicate, ...list]);
        await persistGuest(resumesRef.current);
        return duplicate;
      }

      const response = await resumeApi.duplicateResume(resumeId);
      if (response?.success) {
        const duplicated = response.data;
        setResumes((list) => [duplicated, ...list]);
        return duplicated;
      }
      return null;
    } catch (error) {
      console.warn('[resume] duplicate failed:', error?.message);
      setError(getErrorMessage(error, 'Failed to duplicate resume'));
      throw error;
    }
  });

  // Update the return object with new methods
  return (
    <ResumeContext.Provider
      value={{
        resumes,
        currentResume,
        creationsUsed,
        // true only while the first list loads and nothing is shown yet; background saves never set it
        loading: !initialized || (!!pending.fetch && resumes.length === 0),
        pending,
        isPending,
        uploadProgress,
        error,
        initialized,
        fetchResumes,
        createResume,
        updateResume,
        deleteResume,
        uploadResume,
        optimizeResume,
        checkResumeFit,
        getRecommendedJobs,
        getJobRecommendations,
        getTopJobRecommendations,
        getMyApplications,
        updateTemplate,
        getAnalytics,
        loadResume,
        setCurrentResume,
        duplicateResume,
        clearError: () => setError(null),
        pendingSync,
        flushPendingSaves,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
}