// api.js - Enhanced version with ultra-fast brands fetch
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const getBaseURL = () => {
  if (Platform.OS === 'android') {
    return 'https://the-deft-crew-production.up.railway.app/api';
  }
  return 'https://the-deft-crew-production.up.railway.app/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced cache system
class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.pendingRequests = new Map();
  }

  async get(key, fetchFunction, ttl = 5 * 60 * 1000) {
    // Check memory cache first
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request
    const promise = fetchFunction().then(async (data) => {
      this.memoryCache.set(key, {
        data,
        timestamp: Date.now(),
      });
      this.pendingRequests.delete(key);
      
      // Also cache to disk for offline support
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
      
      return data;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  async getOffline(key, ttl = 5 * 60 * 1000) {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return data;
        }
      }
    } catch (error) {
      console.error('Error reading from disk cache:', error);
    }
    return null;
  }

  clear(key) {
    if (key) {
      this.memoryCache.delete(key);
      AsyncStorage.removeItem(`cache_${key}`);
    } else {
      this.memoryCache.clear();
      AsyncStorage.getAllKeys().then(keys => {
        keys.filter(key => key.startsWith('cache_')).forEach(key => {
          AsyncStorage.removeItem(key);
        });
      });
    }
  }
}

export const cacheManager = new CacheManager();

// Request deduplication
const pendingRequests = new Map();

api.interceptors.request.use(
  async (config) => {
    try {
      let token = await AsyncStorage.getItem('token');
      if (!token) {
        token = await AsyncStorage.getItem('userToken');
        if (token) {
          await AsyncStorage.setItem('token', token);
          await AsyncStorage.removeItem('userToken');
        }
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add cache control headers
      config.headers['Cache-Control'] = 'no-cache';
      
      return config;
    } catch (error) {
      console.error('Error getting token:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

let logoutHandler = () => {};
export const injectLogout = (handler) => {
  logoutHandler = handler;
};

const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove(['token', 'userToken', 'authToken', 'user']);
    cacheManager.clear(); // Clear cache on logout
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

let isLoggingOut = false;

const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000;
    return Date.now() < expirationTime;
  } catch (error) {
    return false;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (!error.response) {
      console.log('Network error - no response from server');
      return Promise.reject(error);
    }
    
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const token = await AsyncStorage.getItem('token');
      
      if (token && !isTokenValid(token)) {
        console.log('Token expired');
      }
      
      if (!isLoggingOut) {
        isLoggingOut = true;
        await clearAuthData();
        
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please log in again.",
          [
            {
              text: "OK",
              onPress: () => {
                isLoggingOut = false;
                if (logoutHandler) {
                  logoutHandler();
                }
              }
            }
          ]
        );
      }
    }
    
    return Promise.reject(error);
  }
);

// Optimized API methods with parallel fetching
export const optimizedAPI = {
  getHomeData: async (forceRefresh = false) => {
    const cacheKey = 'home_data';
    
    // 1. Try to get from disk cache immediately for instant UI
    if (!forceRefresh) {
      const cached = await cacheManager.getOffline(cacheKey, 3 * 60 * 1000);
      if (cached) return cached;
    }
    
    // 2. Otherwise fetch from network (and memory cache handles deduplication)
    return cacheManager.get(cacheKey, async () => {
      const [slidersRes, brandsRes] = await Promise.all([
        api.get('/sliders').catch(() => ({ data: [] })),
        api.get('/brands').catch(() => ({ data: [] }))
      ]);
      
      return {
        sliders: slidersRes.data,
        brands: brandsRes.data,
      };
    }, 3 * 60 * 1000);
  },
  
  // ULTRA-FAST BRANDS FETCH WITH PROGRESSIVE LOADING
  getBrandsFast: async (token, userId, options = {}) => {
    const {
      forceRefresh = false,
      limit = 20,
      priority = 'high',
      includeOffers = true
    } = options;
    
    const cacheKey = `brands_fast_${userId}_${limit}`;
    
    // Immediate return from memory cache if available (fastest)
    if (!forceRefresh) {
      const memoryCached = cacheManager.memoryCache.get(cacheKey);
      if (memoryCached && Date.now() - memoryCached.timestamp < 60000) { // 1 minute TTL
        return memoryCached.data;
      }
      
      // Check disk cache for instant UI (50-100ms)
      const diskCached = await cacheManager.getOffline(cacheKey, 60000);
      if (diskCached) {
        // Store in memory cache for even faster subsequent access
        cacheManager.memoryCache.set(cacheKey, {
          data: diskCached,
          timestamp: Date.now(),
        });
        return diskCached;
      }
    }
    
    // Parallel fetch with optimized endpoints
    return cacheManager.get(cacheKey, async () => {
      // Fetch minimal brand data first for speed
      const fetchPromises = [
        api.get('/brands', {
          params: { 
            limit, 
            fields: 'name,logo,category,slug,_id', // Only fetch essential fields
            sort: '-createdAt'
          },
          timeout: 5000 // Shorter timeout for brands
        })
      ];
      
      // Conditionally fetch offers if needed
      if (includeOffers) {
        fetchPromises.push(
          api.get('/offers/summary', {
            params: { limit: 100 },
            timeout: 5000
          }).catch(() => ({ data: {} }))
        );
      }
      
      const results = await Promise.all(fetchPromises);
      const brandsRes = results[0];
      const offersSummaryRes = includeOffers ? results[1] : { data: {} };
      
      let brandsData = brandsRes.data;
      
      // Ensure we always have an array
      if (!Array.isArray(brandsData)) {
        brandsData = brandsData?.data || brandsData?.brands || [];
      }
      
      const offersSummary = offersSummaryRes.data || {};
      
      // Ultra-fast processing - minimal transformations
      const brandsWithOffers = brandsData.slice(0, limit).map(brand => ({
        ...brand,
        // Optimize image URL without heavy processing
        logo: brand.logo ? 
          (brand.logo.startsWith('http') ? brand.logo : `https://the-deft-crew-production.up.railway.app/uploads/brands/${brand.logo}`) 
          : null,
        // Quick offer count without processing full offer objects
        offerCount: offersSummary[brand._id]?.length || 0,
        hasOffers: (offersSummary[brand._id]?.length || 0) > 0,
        // Lazy load offers - only IDs for now
        offerIds: offersSummary[brand._id] || []
      }));
      
      return brandsWithOffers;
    }, 60000); // 1 minute cache for fast brands
  },
  
  // Progressive brand details loading
  getBrandsWithOffers: async (token, userId, forceRefresh = false) => {
    const cacheKey = `brands_offers_${userId}`;
    
    if (!forceRefresh) {
      const cached = await cacheManager.getOffline(cacheKey, 3 * 60 * 1000);
      if (cached) {
        return cached;
      }
    }
    
    return cacheManager.get(cacheKey, async () => {
      // Fetch brands and offers in parallel with pagination
      const [brandsRes, offersSummaryRes] = await Promise.all([
        api.get('/brands', {
          params: { limit: 50 } // Limit initial load
        }),
        api.get('/offers/summary').catch(() => ({ data: {} }))
      ]);
      
      const brandsData = brandsRes.data;
      const offersSummary = offersSummaryRes.data;
      
      // Process brands with minimal data first
      const brandsWithOffers = brandsData.map(brand => ({
        ...brand,
        logo: brand.logo ? `https://the-deft-crew-production.up.railway.app/uploads/brands/${brand.logo}` : null,
        offers: offersSummary[brand._id] || [],
        hasOffers: (offersSummary[brand._id]?.length || 0) > 0
      }));
      
      return brandsWithOffers;
    }, 3 * 60 * 1000);
  },
  
  // Get brands with pagination for infinite scroll
  getBrandsPaginated: async (page = 1, limit = 20, token) => {
    const cacheKey = `brands_page_${page}_${limit}`;
    
    return cacheManager.get(cacheKey, async () => {
      const response = await api.get('/brands', {
        params: { page, limit, sort: '-createdAt' }
      });
      
      return {
        brands: response.data,
        page,
        limit,
        hasMore: response.data.length === limit
      };
    }, 2 * 60 * 1000); // 2 minutes cache for paginated results
  },
  
  // Prefetch brands in background
  prefetchBrands: async (userId) => {
    const cacheKey = `brands_fast_${userId}_20`;
    
    // Check if already in cache
    if (cacheManager.memoryCache.has(cacheKey)) {
      return cacheManager.memoryCache.get(cacheKey).data;
    }
    
    // Prefetch in background without waiting
    return cacheManager.get(cacheKey, async () => {
      const response = await api.get('/brands', {
        params: { limit: 20, fields: 'name,logo,category,slug,_id' },
        timeout: 3000
      });
      
      let brandsData = response.data;
      if (!Array.isArray(brandsData)) {
        brandsData = brandsData?.data || brandsData?.brands || [];
      }
      
      const simplifiedBrands = brandsData.slice(0, 20).map(brand => ({
        _id: brand._id,
        name: brand.name,
        logo: brand.logo ? `https://the-deft-crew-production.up.railway.app/uploads/brands/${brand.logo}` : null,
        category: brand.category,
        slug: brand.slug
      }));
      
      return simplifiedBrands;
    }, 5 * 60 * 1000);
  },
  
  getBrandDetails: async (brandId, token, forceRefresh = false) => {
    const cacheKey = `brand_details_${brandId}`;
    
    if (!forceRefresh) {
      const cached = await cacheManager.getOffline(cacheKey, 2 * 60 * 1000);
      if (cached) return cached;
    }
    
    return cacheManager.get(cacheKey, async () => {
      const [brandRes, offersRes] = await Promise.all([
        api.get(`/brands/${brandId}`),
        api.get(`/offers/brand/${brandId}`)
      ]);
      
      return {
        ...brandRes.data,
        offers: offersRes.data,
      };
    }, 2 * 60 * 1000); // Shorter TTL for details
  },
  
  // Clear specific brand caches
  clearBrandCache: (userId, brandId = null) => {
    if (brandId) {
      cacheManager.clear(`brand_details_${brandId}`);
    } else {
      cacheManager.clear(`brands_fast_${userId}_20`);
      cacheManager.clear(`brands_offers_${userId}`);
      cacheManager.clear(`brands_page_1_20`);
    }
  }
};

export const courseAPI = {
  getAllCourses: () => api.get('/courses'),
  getCourse: () => api.get('/courses/course'),
  getCourseById: (id) => api.get(`/courses/${id}`),
  getCoursesByCategory: (category) => api.get(`/courses/category/${category}`),
  getEnrolledCourses: () => api.get('/courses/user/enrolled'),
  updateProgress: (courseId, data) => api.put(`/courses/${courseId}/progress`, data),
  enrollCourse: (courseId) => {
    console.log('Enrolling in course with ID:', courseId);
    return api.post(`/courses/${courseId}/enroll`);
  },
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
    try {
      console.log('Calling generate-pdf with template:', templateId);
      const response = await api.post(`/resume/generate-pdf/${templateId}`, options);
      return response;
    } catch (error) {
      console.error('PDF generation API error:', error);
      throw error;
    }
  },
  generateMultiplePDFs: (templateIds, options = {}) => api.post('/resume/generate-multiple', { templateIds, options }),
  saveTemplatePreference: (templateId) => api.post('/resume/save-template', { templateId }),
  getTemplateRecommendations: () => api.get('/resume/template-recommendations'),
  getTemplates: () => api.get('/resume/templates'),
  updateTemplate: (templateId) => api.patch(`/resume/template/${templateId}`),
};

export default api;