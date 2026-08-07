// app/src/context/ResumeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import resumeApi from '../api/resumeApi';
import { AuthContext } from './AuthContext';

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

export default function ResumeProvider({ children }) {
  const { token, isGuest, user } = useContext(AuthContext);
  const [resumes, setResumes] = useState([]);
  const [currentResume, setCurrentResume] = useState(null);
  const [creationsUsed, setCreationsUsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch all resumes
  const fetchResumes = async (force = true) => {
    try {
      setLoading(true);
      setError(null);

      if (isGuest) {
        const storedResumes = await AsyncStorage.getItem('guestResumes');
        const storedCreations = await AsyncStorage.getItem('guestCreationsUsed');
        const parsedResumes = storedResumes ? JSON.parse(storedResumes) : [];
        const usedCount = storedCreations ? parseInt(storedCreations, 10) : (Array.isArray(parsedResumes) ? parsedResumes.length : 0);
        setResumes(Array.isArray(parsedResumes) ? parsedResumes : []);
        setCreationsUsed(usedCount);
        setInitialized(true);
        setLoading(false);
        return;
      }

      if (!token) {
        setResumes([]);
        setCreationsUsed(0);
        setInitialized(true);
        setLoading(false);
        return;
      }

      const response = await resumeApi.getResumes(force);
      if (response?.success) {
        setResumes(Array.isArray(response.data) ? response.data : []);
        setCreationsUsed(response.creationsUsed !== undefined ? response.creationsUsed : (response.data?.length || 0));
      } else {
        setResumes([]);
      }
    } catch (error) {
      console.error('Fetch resumes error:', error);
      setError(getErrorMessage(error, 'Failed to fetch resumes'));
      setResumes([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  // Create new resume
  const createResume = async (resumeData = {}) => {
    try {
      setLoading(true);
      setError(null);

      if (isGuest) {
        const storedResumes = await AsyncStorage.getItem('guestResumes');
        const storedCreations = await AsyncStorage.getItem('guestCreationsUsed');
        const parsed = storedResumes ? JSON.parse(storedResumes) : [];
        const guestList = Array.isArray(parsed) ? parsed : [];
        const usedCount = storedCreations ? parseInt(storedCreations, 10) : guestList.length;

        if (usedCount >= 2) {
          const limitMsg = 'You have used all 2 resume creations available for guest mode. Deleting a resume will not restore your creation limit.';
          Alert.alert('Resume Creation Limit Reached ⚠️', limitMsg);
          setLoading(false);
          throw new Error(limitMsg);
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
            title: user?.headline || 'Software Engineer',
            location: user?.location || 'Karachi, Pakistan',
            ...(resumeData.personalInfo || {})
          },
          professionalSummary: {
            title: resumeData.personalInfo?.title || user?.headline || 'Software Engineer',
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
        const newUsedCount = usedCount + 1;
        setResumes(updatedResumes);
        setCreationsUsed(newUsedCount);
        await AsyncStorage.setItem('guestResumes', JSON.stringify(updatedResumes));
        await AsyncStorage.setItem('guestCreationsUsed', String(newUsedCount));
        setCurrentResume(newResume);
        setLoading(false);
        return newResume;
      }

      const response = await resumeApi.createResume(resumeData);
      if (response?.success) {
        const newResume = response.data;
        setResumes([newResume, ...resumes]);
        setCreationsUsed(prev => prev + 1);
        setCurrentResume(newResume);
        setLoading(false);
        return newResume;
      }
      setLoading(false);
      return null;
    } catch (error) {
      console.error('Create resume error:', error);
      const isLimit = error?.response?.data?.code === 'RESUME_CREATION_LIMIT_REACHED' || 
                      error?.response?.data?.code === 'RESUME_LIMIT_REACHED' || 
                      error?.response?.data?.error?.includes('resume creations') ||
                      error?.message?.includes('resume creations');
      const title = isLimit ? 'Resume Creation Limit Reached ⚠️' : 'Error';
      const errMsg = isLimit 
        ? 'You have used all 2 resume creations available for your account. Deleting a resume will not restore your creation limit.' 
        : getErrorMessage(error, 'Failed to create resume');
      setError(errMsg);
      setLoading(false);
      Alert.alert(title, errMsg);
      throw new Error(errMsg);
    }
  };

  // Update resume
  const updateResume = async (resumeId, updates) => {
    try {
      setLoading(true);
      setError(null);

      if (isGuest) {
        const updatedResumes = resumes.map(r => {
          if (r._id === resumeId) {
            return { ...r, ...updates, updatedAt: new Date().toISOString() };
          }
          return r;
        });
        setResumes(updatedResumes);
        await AsyncStorage.setItem('guestResumes', JSON.stringify(updatedResumes));
        if (currentResume?._id === resumeId) {
          const updated = updatedResumes.find(r => r._id === resumeId);
          setCurrentResume(updated || null);
        }
        setLoading(false);
        return updatedResumes.find(r => r._id === resumeId);
      }

      const response = await resumeApi.updateResume(resumeId, updates);
      if (response?.success) {
        const updatedResume = response.data;
        setResumes(resumes.map(r => r._id === resumeId ? updatedResume : r));
        if (currentResume?._id === resumeId) {
          setCurrentResume(updatedResume);
        }
        setLoading(false);
        return updatedResume;
      }
      setLoading(false);
      return null;
    } catch (error) {
      console.error('Update resume error:', error);
      const errMsg = getErrorMessage(error, 'Failed to update resume');
      setError(errMsg);
      setLoading(false);
      throw new Error(errMsg);
    }
  };

  // Delete resume
  const deleteResume = async (resumeId) => {
    try {
      setLoading(true);
      setError(null);

      if (isGuest) {
        const updatedResumes = resumes.filter(r => r._id !== resumeId);
        setResumes(updatedResumes);
        await AsyncStorage.setItem('guestResumes', JSON.stringify(updatedResumes));
        if (currentResume?._id === resumeId) {
          setCurrentResume(updatedResumes.length > 0 ? updatedResumes[0] : null);
        }
        setLoading(false);
        return;
      }

      await resumeApi.deleteResume(resumeId);
      const updatedResumes = resumes.filter(r => r._id !== resumeId);
      setResumes(updatedResumes);
      if (currentResume?._id === resumeId) {
        setCurrentResume(updatedResumes.length > 0 ? updatedResumes[0] : null);
      }
      setLoading(false);
    } catch (error) {
      console.error('Delete resume error:', error);
      const errMsg = getErrorMessage(error, 'Failed to delete resume');
      setError(errMsg);
      setLoading(false);
      throw new Error(errMsg);
    }
  };



  // Upload and parse resume
  const uploadResume = async (file) => {
    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      if (isGuest) {
        const newResume = {
          _id: `guest_${Date.now()}`,
          personalInfo: {
            firstName: file.name?.split('.')[0] || 'Resume',
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

        const updatedResumes = [...resumes, newResume];
        setResumes(updatedResumes);
        await AsyncStorage.setItem('guestResumes', JSON.stringify(updatedResumes));
        setCurrentResume(newResume);
        setLoading(false);
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
        setResumes([newResume, ...resumes]);
        setCurrentResume(newResume);
        setLoading(false);
        setUploadProgress(100);

        // Notify user about missing critical fields
        const missingFields = [];
        const pi = newResume.personalInfo || {};
        if (!pi.title && !newResume.professionalSummary?.title) {
          missingFields.push('Professional Title');
        }
        if (!pi.location && !pi.city) {
          missingFields.push('Location');
        }
        if (missingFields.length > 0) {
          setTimeout(() => {
            Alert.alert(
              'Missing Fields ⚠️',
              `Your uploaded resume did not contain: ${missingFields.join(' & ')}. Please fill these in on Step 1 — Personal Info.`
            );
          }, 800);
        }

        return newResume;
      }

      setLoading(false);
      setUploadProgress(0);
      return null;
    } catch (error) {
      console.error('Upload resume error:', error);
      const errMsg = getErrorMessage(error, 'Failed to upload resume');
      setError(errMsg);
      setLoading(false);
      setUploadProgress(0);
      Alert.alert('Upload Error', errMsg);
      throw new Error(errMsg);
    }
  };

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
        setResumes(resumes.map(r => r._id === resumeId ? updatedResume : r));
        if (currentResume?._id === resumeId) {
          setCurrentResume(updatedResume);
        }
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
    const found = resumes.find(r => r._id === resumeId);
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

  // Apply to a job
  const applyToJob = async (jobId, applicationData) => {
    try {
      setLoading(true);

      if (isGuest) {
        Alert.alert('Login Required', 'Please login or create an account to apply for jobs.');
        setLoading(false);
        return null;
      }

      const response = await resumeApi.applyToJob(jobId, applicationData);
      setLoading(false);
      return response;
    } catch (error) {
      console.error('Apply to job error:', error);
      setLoading(false);
      throw error;
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
  const optimizeResume = async (resumeId, optimizeData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await resumeApi.optimizeResume(resumeId, optimizeData);
      if (response?.success) {
        const optimizedResume = response.data;
        setResumes(resumes.map(r => r._id === resumeId ? optimizedResume : r));
        setCurrentResume(optimizedResume);
        setLoading(false);
        return optimizedResume;
      }
      setLoading(false);
      return null;
    } catch (error) {
      console.error('Optimize resume context error:', error);
      const errMsg = getErrorMessage(error, 'Failed to optimize resume');
      setError(errMsg);
      setLoading(false);
      throw new Error(errMsg);
    }
  };

  // Duplicate resume
  const duplicateResume = async (resumeId) => {
    try {
      setLoading(true);
      setError(null);

      if (isGuest) {
        const found = resumes.find(r => r._id === resumeId);
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
        const updatedResumes = [duplicate, ...resumes];
        setResumes(updatedResumes);
        await AsyncStorage.setItem('guestResumes', JSON.stringify(updatedResumes));
        setLoading(false);
        return duplicate;
      }

      const response = await resumeApi.duplicateResume(resumeId);
      if (response?.success) {
        const duplicated = response.data;
        setResumes([duplicated, ...resumes]);
        setLoading(false);
        return duplicated;
      }
      setLoading(false);
      return null;
    } catch (error) {
      console.error('Duplicate resume error:', error);
      const errMsg = getErrorMessage(error, 'Failed to duplicate resume');
      setError(errMsg);
      setLoading(false);
      throw new Error(errMsg);
    }
  };

  // Update the return object with new methods
  return (
    <ResumeContext.Provider
      value={{
        resumes,
        currentResume,
        creationsUsed,
        loading,
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
        applyToJob,
        getMyApplications,
        updateTemplate,
        getAnalytics,
        loadResume,
        setCurrentResume,
        duplicateResume,
        clearError: () => setError(null),
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
}