// app/src/context/ResumeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import resumeApi from '../api/resumeApi';
import { AuthContext } from './AuthContext';

export const ResumeContext = createContext();

export default function ResumeProvider({ children }) {
  const { token, isGuest, user } = useContext(AuthContext);
  const [resumes, setResumes] = useState([]);
  const [currentResume, setCurrentResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch all resumes
  const fetchResumes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isGuest) {
        const storedResumes = await AsyncStorage.getItem('guestResumes');
        if (storedResumes) {
          const parsed = JSON.parse(storedResumes);
          setResumes(Array.isArray(parsed) ? parsed : []);
        } else {
          setResumes([]);
        }
        setInitialized(true);
        setLoading(false);
        return;
      }

      if (!token) {
        setResumes([]);
        setInitialized(true);
        setLoading(false);
        return;
      }

      const response = await resumeApi.getResumes();
      if (response?.success) {
        setResumes(Array.isArray(response.data) ? response.data : []);
      } else {
        setResumes([]);
      }
    } catch (error) {
      console.error('Fetch resumes error:', error);
      setError(error.message || 'Failed to fetch resumes');
      setResumes([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  // Create new resume
  const createResume = async (resumeData) => {
    try {
      setLoading(true);
      setError(null);

      if (isGuest) {
        const newResume = {
          _id: `guest_${Date.now()}`,
          ...resumeData,
          settings: resumeData.settings || {
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
          completionPercentage: 0,
          isComplete: false,
          viewCount: 0,
          downloadCount: 0,
          shareCount: 0,
          viewsHistory: [],
          personalInfo: resumeData.personalInfo || {},
          professionalSummary: resumeData.professionalSummary || {},
          education: resumeData.education || [],
          skills: resumeData.skills || [],
          workExperience: resumeData.workExperience || [],
          certifications: resumeData.certifications || [],
          projects: resumeData.projects || [],
          languages: resumeData.languages || [],
          targetJobs: resumeData.targetJobs || [],
          targetJob: resumeData.targetJob || {},
        };
        
        const updatedResumes = [...resumes, newResume];
        setResumes(updatedResumes);
        await AsyncStorage.setItem('guestResumes', JSON.stringify(updatedResumes));
        setCurrentResume(newResume);
        setLoading(false);
        return newResume;
      }

      const response = await resumeApi.createResume(resumeData);
      if (response?.success) {
        const newResume = response.data;
        setResumes([newResume, ...resumes]);
        setCurrentResume(newResume);
        setLoading(false);
        return newResume;
      }
      setLoading(false);
      return null;
    } catch (error) {
      console.error('Create resume error:', error);
      setError(error.message || 'Failed to create resume');
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to create resume');
      throw error;
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
      setError(error.message || 'Failed to update resume');
      setLoading(false);
      throw error;
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
      setError(error.message || 'Failed to delete resume');
      setLoading(false);
      throw error;
    }
  };

  // Calculate completion percentage (same as model)
  const calculateCompletionPercentage = (resume) => {
    try {
      let total = 0;
      let completed = 0;

      // Personal Info (15%)
      if (resume.personalInfo) {
        const hasName = resume.personalInfo.firstName && resume.personalInfo.firstName.trim() !== '';
        const hasEmail = resume.personalInfo.email && resume.personalInfo.email.trim() !== '';
        const hasPhone = resume.personalInfo.phone && resume.personalInfo.phone.trim() !== '';
        if (hasName) completed += 5;
        if (hasEmail) completed += 5;
        if (hasPhone) completed += 5;
        total += 15;
      }

      // Professional Summary (10%)
      if (resume.professionalSummary && resume.professionalSummary.summary && resume.professionalSummary.summary.trim() !== '') {
        completed += 10;
      }
      total += 10;

      // Education (15%)
      if (resume.education && resume.education.length > 0) {
        const validEducation = resume.education.filter(e => e.institution && e.institution.trim() !== '');
        if (validEducation.length > 0) {
          completed += Math.min(15, validEducation.length * 5);
        }
      }
      total += 15;

      // Skills (10%)
      if (resume.skills && resume.skills.length > 0) {
        const validSkills = resume.skills.filter(s => s.name && s.name.trim() !== '');
        if (validSkills.length > 0) {
          completed += Math.min(10, validSkills.length * 2);
        }
      }
      total += 10;

      // Work Experience (20%)
      if (resume.workExperience && resume.workExperience.length > 0) {
        const validExperience = resume.workExperience.filter(w => w.company && w.company.trim() !== '');
        if (validExperience.length > 0) {
          completed += Math.min(20, validExperience.length * 5);
        }
      }
      total += 20;

      // Certifications (5%)
      if (resume.certifications && resume.certifications.length > 0) {
        const validCerts = resume.certifications.filter(c => c.name && c.name.trim() !== '');
        if (validCerts.length > 0) {
          completed += Math.min(5, validCerts.length * 2);
        }
      }
      total += 5;

      // Projects (5%)
      if (resume.projects && resume.projects.length > 0) {
        const validProjects = resume.projects.filter(p => p.name && p.name.trim() !== '');
        if (validProjects.length > 0) {
          completed += Math.min(5, validProjects.length * 2);
        }
      }
      total += 5;

      // Languages (5%)
      if (resume.languages && resume.languages.length > 0) {
        const validLanguages = resume.languages.filter(l => l.name && l.name.trim() !== '');
        if (validLanguages.length > 0) {
          completed += Math.min(5, validLanguages.length * 2);
        }
      }
      total += 5;

      // Target Jobs (15%)
      if (resume.targetJobs && resume.targetJobs.length > 0) {
        const validJobs = resume.targetJobs.filter(j => j.jobTitle && j.jobTitle.trim() !== '');
        if (validJobs.length > 0) {
          completed += Math.min(15, validJobs.length * 5);
        }
      } else if (resume.targetJob && resume.targetJob.jobTitle && resume.targetJob.jobTitle.trim() !== '') {
        completed += 15;
      }
      total += 15;

      return Math.min(Math.round((completed / total) * 100), 100);
    } catch (error) {
      console.error('Error calculating completion:', error);
      return 0;
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

      // Create form data for upload
      const formData = new FormData();
      formData.append('resume', {
        uri: file.uri,
        type: file.type || 'application/pdf',
        name: file.name || 'resume.pdf',
      });

      // Upload and parse the resume
      const response = await resumeApi.uploadResume(formData, (progress) => {
        setUploadProgress(progress);
      });

      if (response?.success) {
        const newResume = response.data;
        
        // Ensure parsed data is properly merged into the resume
        if (newResume.uploadedResume?.parsedData) {
          const parsedData = newResume.uploadedResume.parsedData;
          
          console.log('📊 Parsed data received:', JSON.stringify(parsedData, null, 2));
          
          // Merge personal info
          if (parsedData.personalInfo) {
            newResume.personalInfo = {
              ...newResume.personalInfo,
              ...parsedData.personalInfo
            };
          }
          
          // Merge professional summary
          if (parsedData.professionalSummary) {
            newResume.professionalSummary = {
              ...newResume.professionalSummary,
              ...parsedData.professionalSummary
            };
          }
          
          // Merge education
          if (parsedData.education && parsedData.education.length > 0) {
            newResume.education = parsedData.education;
          }
          
          // Merge skills
          if (parsedData.skills && parsedData.skills.length > 0) {
            newResume.skills = parsedData.skills;
          }
          
          // Merge work experience
          if (parsedData.workExperience && parsedData.workExperience.length > 0) {
            newResume.workExperience = parsedData.workExperience;
          }
          
          // Merge certifications
          if (parsedData.certifications && parsedData.certifications.length > 0) {
            newResume.certifications = parsedData.certifications;
          }
          
          // Merge projects
          if (parsedData.projects && parsedData.projects.length > 0) {
            newResume.projects = parsedData.projects;
          }
          
          // Merge languages
          if (parsedData.languages && parsedData.languages.length > 0) {
            newResume.languages = parsedData.languages;
          }
          
          // Calculate completion percentage
          const completionPercentage = calculateCompletionPercentage(newResume);
          newResume.completionPercentage = completionPercentage;
          newResume.isComplete = completionPercentage >= 85;
          
          console.log(`📊 Calculated completion: ${completionPercentage}%`);
          
          // Update the resume with merged data
          const updatedResume = await resumeApi.updateResume(newResume._id, {
            personalInfo: newResume.personalInfo,
            professionalSummary: newResume.professionalSummary,
            education: newResume.education,
            skills: newResume.skills,
            workExperience: newResume.workExperience,
            certifications: newResume.certifications,
            projects: newResume.projects,
            languages: newResume.languages,
            completionPercentage: newResume.completionPercentage,
            isComplete: newResume.isComplete
          });
          
          if (updatedResume?.success) {
            const finalResume = updatedResume.data;
            setResumes([finalResume, ...resumes]);
            setCurrentResume(finalResume);
            setLoading(false);
            setUploadProgress(100);
            return finalResume;
          }
        }
        
        // If no parsed data, return the original response
        setResumes([newResume, ...resumes]);
        setCurrentResume(newResume);
        setLoading(false);
        setUploadProgress(100);
        return newResume;
      }
      
      setLoading(false);
      setUploadProgress(0);
      return null;
    } catch (error) {
      console.error('Upload resume error:', error);
      setError(error.message || 'Failed to upload resume');
      setLoading(false);
      setUploadProgress(0);
      Alert.alert('Upload Error', error.message || 'Failed to upload resume file');
      throw error;
    }
  };

  // Get recommended jobs
 // app/src/context/ResumeContext.js - This is already complete
const getRecommendedJobs = async (resumeId) => {
  try {
    if (isGuest) {
      return [
        {
          title: "Software Engineer",
          company: "Tech Company",
          location: "Remote",
          matchPercentage: 85,
          salary: "$100k - $130k",
          postedAt: "2 days ago",
          description: "Join our growing team as a Software Engineer..."
        },
        // ... more guest recommendations
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
        return response.data;
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
        return {
          views: Math.floor(Math.random() * 100) + 20,
          downloads: Math.floor(Math.random() * 30) + 5,
          shares: Math.floor(Math.random() * 15) + 2,
          applications: Math.floor(Math.random() * 10) + 1,
          viewHistory: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 86400000),
            views: Math.floor(Math.random() * 8) + 1
          })),
          skillMatch: Math.floor(Math.random() * 30) + 70,
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
    if (!initialized) {
      fetchResumes();
    }
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
            title: 'Software Engineer',
            companyName: 'Tech Company',
            department: 'Engineering',
            location: 'Remote',
            type: 'Full-time',
            salary: '$100k - $130k',
            matchPercentage: 85,
            matchedSkills: ['JavaScript', 'React', 'Node.js'],
            matchReasons: ['Matched 3 skills', 'Full-time', 'Remote'],
            description: 'Join our growing team as a Software Engineer...',
            urgent: true,
            featured: true
          },
          {
            _id: '2',
            title: 'Full Stack Developer',
            companyName: 'Startup Inc',
            department: 'Technology',
            location: 'New York, NY',
            type: 'Full-time',
            salary: '$90k - $120k',
            matchPercentage: 78,
            matchedSkills: ['Python', 'React', 'MongoDB'],
            matchReasons: ['Matched 2 skills', 'Full-time'],
            description: 'Looking for a Full Stack Developer to join our team...'
          },
          {
            _id: '3',
            title: 'React Native Developer',
            companyName: 'Mobile First',
            department: 'Engineering',
            location: 'Remote',
            type: 'Remote',
            salary: '$85k - $110k',
            matchPercentage: 72,
            matchedSkills: ['React Native', 'JavaScript'],
            matchReasons: ['Matched 2 skills', 'Remote'],
            description: 'Build amazing mobile apps with React Native...'
          }
        ],
        total: 3,
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
            title: 'Software Engineer',
            companyName: 'Tech Company',
            location: 'Remote',
            type: 'Full-time',
            salary: '$100k - $130k',
            matchPercentage: 85
          },
          {
            _id: '2',
            title: 'Full Stack Developer',
            companyName: 'Startup Inc',
            location: 'New York, NY',
            type: 'Full-time',
            salary: '$90k - $120k',
            matchPercentage: 78
          },
          {
            _id: '3',
            title: 'React Native Developer',
            companyName: 'Mobile First',
            location: 'Remote',
            type: 'Remote',
            salary: '$85k - $110k',
            matchPercentage: 72
          }
        ],
        total: 3,
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

// Update the return object with new methods
return (
  <ResumeContext.Provider
    value={{
      resumes,
      currentResume,
      loading,
      uploadProgress,
      error,
      initialized,
      fetchResumes,
      createResume,
      updateResume,
      deleteResume,
      uploadResume,
      getRecommendedJobs,
      getJobRecommendations,
      getTopJobRecommendations,
      applyToJob,
      getMyApplications,
      updateTemplate,
      getAnalytics,
      loadResume,
      setCurrentResume,
      clearError: () => setError(null),
    }}
  >
    {children}
  </ResumeContext.Provider>
);
}