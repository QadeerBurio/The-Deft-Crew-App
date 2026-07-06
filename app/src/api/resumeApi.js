// app/src/api/resumeApi.js
import api from './api';
import { memoryCache } from './api';

export const resumeApi = {
  // Create new resume
  createResume: async (resumeData) => {
    try {
      console.log('Creating resume with data');
      
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
      console.log('Updating resume:', resumeId);
      
      const response = await api.put(`/resume/${resumeId}`, updates);
      memoryCache.delete(`resume:${resumeId}`);
      memoryCache.delete('resumes:all');
      return response.data;
    } catch (error) {
      console.error('Update resume error:', error);
      throw error;
    }
  },

  // Delete resume
  deleteResume: async (resumeId) => {
    try {
      const response = await api.delete(`/resume/${resumeId}`);
      memoryCache.delete(`resume:${resumeId}`);
      memoryCache.delete('resumes:all');
      return response.data;
    } catch (error) {
      console.error('Delete resume error:', error);
      throw error;
    }
  },

  // Upload resume file
 // FIXED: Upload resume file with better error handling
  uploadResume: async (formData, onProgress) => {
    try {
      console.log('📤 Uploading resume file...');
      
      const response = await api.post('/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
        timeout: 60000, // 60 second timeout
      });
      
      console.log('✅ Upload response received');
      memoryCache.delete('resumes:all');
      
      return response.data;
    } catch (error) {
      console.error('❌ Upload resume error:', error);
      
      // Extract error message from response
      let errorMessage = 'Failed to upload resume';
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
        console.error('Server error response:', error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Get recommendations
 // Get recommendations
  getRecommendations: async (resumeId) => {
    try {
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
};

export default resumeApi;