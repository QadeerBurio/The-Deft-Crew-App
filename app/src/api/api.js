// api/api.js - Fixed for Guest Mode
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

const getBaseURL = () => {
  return 'https://the-deft-crew-production.up.railway.app/api';
};

// Create axios instance with optimized config
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Ultra-fast in-memory cache with TTL
class MemoryCache {
  constructor(maxSize = 40) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.delete(key);
      return null;
    }
    
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    
    return item.data;
  }

  set(key, data, ttlMs = 12000) {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.accessOrder.shift();
      if (oldest) this.cache.delete(oldest);
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
    
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() > item.expiry) {
      this.delete(key);
      return false;
    }
    return true;
  }
}

export const memoryCache = new MemoryCache(100);

// Promise deduplication map
const pendingRequests = new Map();

// FIXED: Global flag to track guest mode
let isGuestMode = false;

// FIXED: Export function to set guest mode
export const setGuestMode = (guestMode) => {
  isGuestMode = guestMode;
  console.log('Guest mode set to:', guestMode);
};

// Request interceptor - FIXED
api.interceptors.request.use(
  async (config) => {
    try {
      // FIXED: Check guest mode flag AND AsyncStorage
      // Only attach token if NOT in guest mode
      const guestFlag = await AsyncStorage.getItem('isGuest');
      
      if (guestFlag === 'true' || isGuestMode) {
        // Don't attach any token for guest users
        // Remove Authorization header if it exists
        delete config.headers.Authorization;
        console.log('Guest mode: No token attached');
      } else {
        // Only get token for non-guest users
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      config.headers['Cache-Control'] = 'no-cache';
      config.headers['Pragma'] = 'no-cache';
      
      return config;
    } catch (error) {
      console.log('Request interceptor error:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Response interceptor
let logoutHandler = () => {};
export const injectLogout = (handler) => {
  logoutHandler = handler;
};

let isLoggingOut = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (!error.response) {
      return Promise.reject(error);
    }
    
    // FIXED: Don't auto-logout for guest users
    if (error.response.status === 401 && !originalRequest._retry) {
      const guestFlag = await AsyncStorage.getItem('isGuest');
      
      // If guest mode, just reject without logout alert
      if (guestFlag === 'true' || isGuestMode) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      if (!isLoggingOut) {
        isLoggingOut = true;
        await AsyncStorage.multiRemove(['token', 'user']);
        memoryCache.clear();
        
        Alert.alert(
          "Session Expired",
          "Please log in again.",
          [
            {
              text: "OK",
              onPress: () => {
                isLoggingOut = false;
                logoutHandler?.();
              }
            }
          ]
        );
      }
    }
    
    return Promise.reject(error);
  }
);

// Deduplicate requests helper
async function deduplicatedRequest(key, requestFn, ttlMs = 6000) {
  const cached = memoryCache.get(key);
  if (cached) return cached;
  
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  const promise = requestFn()
    .then(data => {
      memoryCache.set(key, data, ttlMs);
      pendingRequests.delete(key);
      return data;
    })
    .catch(error => {
      pendingRequests.delete(key);
      throw error;
    });
  
  pendingRequests.set(key, promise);
  return promise;
}

// Optimized API methods
export const optimizedAPI = {
  // Ultra-fast brands fetch with offers summary
  getBrandsFast: async (token, userId, options = {}) => {
    const { forceRefresh = false, limit = 100 } = options;
    const cacheKey = `brands:${userId || 'all'}:${limit}`;
    
    if (!forceRefresh) {
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;
    }
    
    return deduplicatedRequest(cacheKey, async () => {
      // Parallel fetch: brands + offers summary
      const [brandsRes, summaryRes] = await Promise.all([
        api.get('/brands', { 
          params: { limit, sort: 'name' },
          timeout: 8000 
        }).catch(() => ({ data: [] })),
        api.get('/offers/summary', { timeout: 8000 })
          .catch(() => ({ data: {} }))
      ]);
      
      const brands = Array.isArray(brandsRes.data) ? brandsRes.data : 
                    (brandsRes.data?.data || brandsRes.data?.brands || []);
      const offersSummary = summaryRes.data || {};
      
      const baseUrl = 'https://the-deft-crew-production.up.railway.app';
      
      // Fast mapping
      const brandsWithOffers = brands.map(brand => {
        const brandOffers = offersSummary[brand._id] || [];
        const firstOffer = brandOffers[0];
        
        const formatImage = (path, type = 'offer') => {
          if (!path) return null;
          if (path.startsWith('http')) return path;
          return type === 'brand' 
            ? `${baseUrl}/uploads/brands/${path}`
            : `${baseUrl}/${path}`;
        };
        
        return {
          ...brand,
          logo: formatImage(brand.logo, 'brand'),
          offers: brandOffers.map(offer => ({
            ...offer,
            image: formatImage(offer.image),
            displayImage: formatImage(offer.image),
            isClaimed: offer.claimedBy?.includes(userId) || false,
            discountPercentage: offer.discountPercentage || 0,
          })),
          displayImage: firstOffer?.image 
            ? formatImage(firstOffer.image) 
            : formatImage(brand.logo, 'brand') || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          hasOffer: brandOffers.length > 0,
          discount: firstOffer?.discountPercentage || 0,
          category: firstOffer?.category || brand.category || 'General',
          isOnline: firstOffer?.isOnline || false,
          isInStore: firstOffer?.isInStore || false,
        };
      });
      
      return brandsWithOffers;
    }, 90000); // 1.5 minute cache
  },
  
  // Home data with parallel fetching
  getHomeData: async (forceRefresh = false) => {
    const cacheKey = 'home:data';
    
    if (!forceRefresh) {
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;
    }
    
    return deduplicatedRequest(cacheKey, async () => {
      const [slidersRes, brandsRes] = await Promise.all([
        api.get('/sliders', { timeout: 5000 }).catch(() => ({ data: [] })),
        api.get('/brands', { params: { limit: 20 }, timeout: 5000 })
          .catch(() => ({ data: [] }))
      ]);
      
      return {
        sliders: slidersRes.data || [],
        brands: brandsRes.data || [],
      };
    }, 60000);
  },
  
  // Clear caches
  clearBrandCache: () => {
    for (const key of memoryCache.cache.keys()) {
      if (key.startsWith('brands:') || key.startsWith('brand:')) {
        memoryCache.delete(key);
      }
    }
  }
};

// Keep existing courseAPI and resumeAPI
export const courseAPI = {
  getAllCourses: () => api.get('/courses'),
  getCourse: () => api.get('/courses/course'),
  getCourseById: (id) => api.get(`/courses/${id}`),
  getCoursesByCategory: (category) => api.get(`/courses/category/${category}`),
  getEnrolledCourses: () => api.get('/courses/user/enrolled'),
  updateProgress: (courseId, data) => api.put(`/courses/${courseId}/progress`, data),
  enrollCourse: (courseId) => api.post(`/courses/${courseId}/enroll`),
};

export const resumeAPI = {
  getResume: () => api.get('/resume'),
  saveResume: (data) => api.post('/resume', data),
  updateSection: (section, data) => api.patch(`/resume/${section}`, { data }),
  deleteResume: () => api.delete('/resume'),
  generatePDF: (templateId = 'modern') => api.post('/resume/generate-pdf', { templateId }),
  generateShareLink: () => api.post('/resume/share'),
  getPublicResume: (publicUrl) => api.get(`/resume/public/${publicUrl}`),
  improveText: (text, type) => api.post('/resume/ai-improve', { text, type }),
  getAnalytics: () => api.get('/resume/analytics'),
  exportResume: () => api.get('/resume/export/json'),
  importResume: (data) => api.post('/resume/import/json', { data }),
  getAllTemplates: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return api.get(`/resume/templates/all${queryString ? `?${queryString}` : ''}`);
  },
  getTemplatesByCategory: (category) => api.get(`/resume/templates/category/${category}`),
  getMarketInsights: () => api.get('/resume/market-insights'),
  getTemplateById: (templateId) => api.get(`/resume/templates/${templateId}`),
  generatePDFWithTemplate: async (templateId, options = {}) => {
    return api.post(`/resume/generate-pdf/${templateId}`, options);
  },
  generateMultiplePDFs: (templateIds, options = {}) => 
    api.post('/resume/generate-multiple', { templateIds, options }),
  saveTemplatePreference: (templateId) => api.post('/resume/save-template', { templateId }),
  getTemplateRecommendations: () => api.get('/resume/template-recommendations'),
  getTemplates: () => api.get('/resume/templates'),
  updateTemplate: (templateId) => api.patch(`/resume/template/${templateId}`),
};

export default api;