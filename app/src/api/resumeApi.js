import api from './api';
import { memoryCache } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';

export const resumeApi = {
  // Create new resume
  createResume: async (resumeData) => {
    try {
      const cleanData = { ...resumeData };

      // Initialize empty objects if not present
      if (!cleanData.personalInfo) {
        cleanData.personalInfo = {};
      }

      // Ensure all personalInfo fields exist
      const personalInfoFields = [
        'firstName', 'lastName', 'email', 'phone', 'address',
        'city', 'state', 'country', 'postalCode', 'linkedin',
        'github', 'portfolio'
      ];

      personalInfoFields.forEach(field => {
        if (!cleanData.personalInfo[field]) {
          cleanData.personalInfo[field] = '';
        }
      });

      // Ensure professionalSummary has required fields
      if (!cleanData.professionalSummary) {
        cleanData.professionalSummary = {
          title: '',
          summary: '',
          experienceLevel: 'Mid Level'
        };
      }

      // Ensure targetJob has required fields
      if (!cleanData.targetJob) {
        cleanData.targetJob = {
          jobTitle: '',
          industry: '',
          jobType: 'Full-time'
        };
      }

      // Clean arrays
      const arrayFields = ['education', 'skills', 'workExperience', 'certifications', 'projects', 'languages', 'references', 'targetJobs'];
      arrayFields.forEach(field => {
        if (!cleanData[field]) {
          cleanData[field] = [];
        }
      });

      // Ensure settings
      if (!cleanData.settings) {
        cleanData.settings = {
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
        };
      }

      const response = await api.post('/resume', cleanData);
      memoryCache.delete('resumes:all');
      return response.data;
    } catch (error) {
      console.error('Create resume API error:', error);
      throw error;
    }
  },

  // Get all resumes
  getResumes: async () => {
    try {
      const cacheKey = 'resumes:all';
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;

      const response = await api.get('/resume');
      const data = response.data;
      memoryCache.set(cacheKey, data, 30000);
      return data;
    } catch (error) {
      console.error('Get resumes error:', error);
      throw error;
    }
  },

  // Get single resume
  getResume: async (resumeId) => {
    try {
      const cacheKey = `resume:${resumeId}`;
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;

      const response = await api.get(`/resume/${resumeId}`);
      const data = response.data;
      memoryCache.set(cacheKey, data, 30000);
      return data;
    } catch (error) {
      console.error('Get resume error:', error);
      throw error;
    }
  },

  // Update resume
  updateResume: async (resumeId, updates) => {
    try {
      const response = await api.put(`/resume/${resumeId}`, updates);
      memoryCache.delete(`resume:${resumeId}`);
      memoryCache.delete(`recommendations:${resumeId}`);
      memoryCache.delete('resumes:all');
      return response.data;
    } catch (error) {
      console.error('Update resume error:', error);
      throw error;
    }
  },

  optimizeResume: async (resumeId, optimizeData) => {
    try {
      const response = await api.post(`/resume/${resumeId}/optimize`, optimizeData, { timeout: 60000 });
      memoryCache.delete(`resume:${resumeId}`);
      memoryCache.delete(`recommendations:${resumeId}`);
      memoryCache.delete('resumes:all');
      return response.data;
    } catch (error) {
      console.error('Optimize resume error:', error);
      throw error;
    }
  },

  // Delete resume
  deleteResume: async (resumeId) => {
    try {
      const response = await api.delete(`/resume/${resumeId}`);
      memoryCache.delete(`resume:${resumeId}`);
      memoryCache.delete(`recommendations:${resumeId}`);
      memoryCache.delete('resumes:all');
      return response.data;
    } catch (error) {
      console.error('Delete resume error:', error);
      throw error;
    }
  },

  // Upload resume file
  uploadResume: async (formData, onProgress) => {
    try {
      // Clear all related cache before upload
      memoryCache.delete('resumes:all');

      const response = await api.post('/resume/upload', formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': null, // Suppress Axios default & fallback headers
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
        timeout: 60000,
      });

      // Clear cache after successful upload
      memoryCache.delete('resumes:all');
      return response.data;
    } catch (error) {
      let errorMessage = 'Failed to upload resume';
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      throw new Error(errorMessage);
    }
  },

  // Save a job (write behavioral affinity signal to backend)
  saveJob: async (jobId) => {
    try {
      const response = await api.post(`/jobs/bookmarks/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Save job error:', error);
      throw new Error(error.response?.data?.error || 'Failed to save job');
    }
  },

  // Remove a saved job bookmark
  unsaveJob: async (jobId) => {
    try {
      const response = await api.delete(`/jobs/bookmarks/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Unsave job error:', error);
      throw new Error(error.response?.data?.error || 'Failed to remove saved job');
    }
  },

  // Log a job interaction (view/ignore/dismiss) for behavioral personalization
  logJobInteraction: async (jobId, interactionType) => {
    try {
      const response = await api.post(`/jobs/interactions/${jobId}`, { interactionType });
      return response.data;
    } catch (error) {
      // Non-critical — fail silently
      console.warn('Log interaction error (non-critical):', error?.message);
      return null;
    }
  },

  // Get recommendations
  // Get recommendations
  getRecommendations: async (resumeId) => {
    try {
      const isValidObjectId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id);
      if (!isValidObjectId(resumeId)) {
        return { success: true, data: [] };
      }

      const cacheKey = `recommendations:${resumeId}`;
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;

      const response = await api.get(`/resume/${resumeId}/recommendations`);
      const data = response.data;
      memoryCache.set(cacheKey, data, 60000);
      return data;
    } catch (error) {
      console.error('Get recommendations error:', error);
      return { data: [] };
    }
  },
  // Get job recommendations based on resume
  getJobRecommendations: async (resumeId = null, params = {}) => {
    try {
      const isValidObjectId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id);
      if (resumeId && !isValidObjectId(resumeId)) {
        return { recommendations: [], total: 0 };
      }

      const { limit = 10, page = 1 } = params;
      const cacheKey = resumeId ? `recommendations:${resumeId}` : 'recommendations:top';

      let url = '/jobs/recommendations';
      if (resumeId) {
        url = `/jobs/recommendations/${resumeId}`;
      }

      const response = await api.get(url, {
        params: { limit, page }
      });

      return response.data;
    } catch (error) {
      console.error('Get job recommendations error:', error);
      return { recommendations: [], total: 0 };
    }
  },

  // Get top job recommendations (simplified for dashboard)
  getTopJobRecommendations: async (limit = 5) => {
    try {
      const response = await api.get('/jobs/recommendations/top', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Get top recommendations error:', error);
      return { recommendations: [], total: 0 };
    }
  },

  // Apply to a job
  applyToJob: async (jobId, applicationData) => {
    try {
      const formData = new FormData();

      Object.keys(applicationData).forEach(key => {
        if (key === 'resume' && applicationData.resume) {
          formData.append('resume', {
            uri: applicationData.resume.uri,
            type: applicationData.resume.type || 'application/pdf',
            name: applicationData.resume.name || 'resume.pdf',
          });
        } else if (applicationData[key] !== undefined && applicationData[key] !== null) {
          formData.append(key, applicationData[key].toString());
        }
      });

      const response = await api.post(`/jobs/apply/${jobId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      // Clear recommendations cache
      memoryCache.delete('recommendations:*');
      return response.data;
    } catch (error) {
      console.error('Apply to job error:', error);
      throw error;
    }
  },

  // Get my applications
  getMyApplications: async () => {
    try {
      const response = await api.get('/jobs/my-applications');
      return response.data;
    } catch (error) {
      console.error('Get applications error:', error);
      return [];
    }
  },
  // Update template
  updateTemplate: async (resumeId, template) => {
    try {
      const response = await api.put(`/resume/${resumeId}/template`, { template });
      memoryCache.delete(`resume:${resumeId}`);
      return response.data;
    } catch (error) {
      console.error('Update template error:', error);
      throw error;
    }
  },

  // Get analytics
  getAnalytics: async (resumeId) => {
    try {
      const cacheKey = `analytics:${resumeId}`;
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;

      const response = await api.get(`/resume/${resumeId}/analytics`);
      const data = response.data;
      memoryCache.set(cacheKey, data, 30000);
      return data;
    } catch (error) {
      console.error('Get analytics error:', error);
      return { data: null };
    }
  },

  // Enhance text with AI (Work, Projects, Summary)
  enhanceText: async (text, context) => {
    try {
      const response = await api.post('/resume/enhance-text', { text, context }, { timeout: 60000 });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to enhance text');
    }
  },

  // Get AI skill suggestions
  suggestSkills: async (currentSkills, targetRole) => {
    try {
      const response = await api.post('/resume/suggest-skills', { currentSkills, targetRole }, { timeout: 60000 });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get skill suggestions');
    }
  },

  // Check resume fit against job
  checkResumeFit: async (resumeId, jobId) => {
    try {
      const response = await api.post(`/resume/${resumeId}/check-fit`, { jobId }, { timeout: 60000 });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to check resume fit');
    }
  },

  // Debug resume upload
  debugResume: async (resumeId) => {
    try {
      const response = await api.get(`/resume/${resumeId}/debug`);
      return response.data;
    } catch (error) {
      console.error('Debug resume error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get debug info');
    }
  },

  // Duplicate resume
  duplicateResume: async (resumeId) => {
    try {
      const response = await api.post(`/resume/${resumeId}/duplicate`);
      memoryCache.delete('resumes:all');
      return response.data;
    } catch (error) {
      console.error('Duplicate resume error:', error);
      throw error;
    }
  },
};

export default resumeApi;