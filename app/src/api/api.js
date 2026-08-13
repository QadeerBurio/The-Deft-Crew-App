// api/api.js - Fixed for Guest Mode with Session Expiry Handling
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseURL = () => {
  if (__DEV__) {
    const manifest = Constants.expoConfig || Constants.manifest || {};
    const hostUri = manifest.hostUri;
    const devIp = hostUri ? hostUri.split(':')[0] : '192.168.18.93';
    return `https://the-deft-crew-production.up.railway.app/api`;
  }
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
  console.log('Guest mode set to:', isGuestMode);
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

// Response interceptor - FIXED
let logoutHandler = () => {};
let sessionErrorHandler = null;

export const injectLogout = (handler) => {
  logoutHandler = handler;
};

export const injectSessionErrorHandler = (handler) => {
  sessionErrorHandler = handler;
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
        
        // FIXED: Clear all auth data properly
        await AsyncStorage.multiRemove(['token', 'user', 'isGuest']);
        memoryCache.clear();
        
        // Reset guest mode flag
        isGuestMode = false;
        
        // REMOVED: Alert popup - now using notification system
        // Just call the session error handler if available
        if (sessionErrorHandler) {
          sessionErrorHandler('Session Expired', 'Your session has expired. Please log in again.');
        }
        
        // Call logout handler to update UI state
        if (logoutHandler) {
          logoutHandler();
        }
        
        // Reset logging out flag after a delay
        setTimeout(() => {
          isLoggingOut = false;
        }, 1000);
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



// ==================== JOB BOOKMARK API ====================

/**
 * Get all saved/bookmarked jobs for the current user.
 * Returns: { success, bookmarks: [{ job, savedAt, tag }], total }
 */
export const getBookmarkedJobs = async () => {
  const response = await api.get('/jobs/bookmarks');
  return response.data;
};

/**
 * Bookmark a job. Optional tag e.g. "Apply Later", "Dream Job"
 * Returns: { success, message, jobId, tag }
 * Throws 409 if already bookmarked.
 */
export const bookmarkJob = async (jobId, tag = '') => {
  const response = await api.post(`/jobs/bookmarks/${jobId}`, { tag });
  return response.data;
};

/**
 * Remove a bookmarked job.
 * Returns: { success, message, jobId }
 */
export const removeBookmark = async (jobId) => {
  const response = await api.delete(`/jobs/bookmarks/${jobId}`);
  return response.data;
};

// ==================== JOB INTELLIGENCE API ====================

/**
 * GET /api/jobs/feed — Personalised job feed using hybrid recommendation engine.
 * Falls back to featured jobs if user has no resume.
 * @param {{ page?, limit?, type?, locationType?, experienceLevel? }} params
 */
export const getPersonalizedFeed = async (params = {}) => {
  const response = await api.get('/jobs/feed', { params });
  return response.data;
};

/**
 * GET /api/jobs/similar/:jobId — Jobs semantically similar to a given job.
 * Used on the job detail screen's "Similar Roles" section.
 * @param {string} jobId
 * @param {number} limit
 */
export const getSimilarJobs = async (jobId, limit = 6) => {
  const response = await api.get(`/jobs/similar/${jobId}`, { params: { limit } });
  return response.data;
};

/**
 * GET /api/jobs/recommendations — Full paginated personalised recommendations.
 * @param {{ page?, limit? }} params
 */
export const getJobRecommendations = async (params = {}) => {
  const response = await api.get('/jobs/recommendations', { params });
  return response.data;
};

/**
 * GET /api/jobs/recommendations/top — Quick top-N for dashboard widgets.
 * @param {number} limit
 */
export const getTopRecommendations = async (limit = 5) => {
  const response = await api.get('/jobs/recommendations/top', { params: { limit } });
  return response.data;
};

// ==================== SKILL INTELLIGENCE API ====================

/**
 * GET /api/jobs/:jobId/skill-gap — Analyse skill gap between resume and job.
 * @param {string} jobId
 * @param {string} [resumeId] - Optional specific resumeId
 */
export const getSkillGap = async (jobId, resumeId) => {
  const response = await api.get(`/jobs/${jobId}/skill-gap`, {
    params: resumeId ? { resumeId } : {}
  });
  return response.data;
};

/**
 * POST /api/jobs/:jobId/skill-gap/refresh — Force-refresh skill gap analysis.
 * @param {string} jobId
 * @param {string} [resumeId] - Optional specific resumeId
 */
export const refreshSkillGap = async (jobId, resumeId) => {
  const response = await api.post(`/jobs/${jobId}/skill-gap/refresh`, { resumeId });
  return response.data;
};

/**
 * POST /api/jobs/:jobId/validate-application — "Should I apply?" verdict & hints.
 * @param {string} jobId
 * @param {string} [resumeId] - Optional specific resumeId
 */
export const validateApplication = async (jobId, resumeId) => {
  const response = await api.post(`/jobs/${jobId}/validate-application`, { resumeId });
  return response.data;
};

/**
 * GET /api/jobs/:jobId/ats-score — Get lightweight ATS score and match counts.
 * @param {string} jobId
 */
export const getAtsScore = async (jobId) => {
  const response = await api.get(`/jobs/${jobId}/ats-score`);
  return response.data;
};

// ==================== PUBLIC API ====================
export const publicAPI = {
  getExchangePrograms: async () => {
    const response = await api.get('/admin/exchange/all');
    return response.data;
  }
  
};



// ============ SKILLSWAP API FUNCTIONS ============

// Listings
// api/api.js - Update getListings
export const getListings = async ({ type, page, limit }) => {
  const params = {};
  if (type && type !== 'All') params.type = type.toLowerCase();
  if (page) params.page = page;
  if (limit) params.limit = limit;
  
  const response = await api.get('/listings', { params });
  
  // The backend now populates ownerId with user data
  // Just return the data as-is
  return response.data;
};

export const getListingById = async (id) => {
  const response = await api.get(`/listings/${id}`);
  return response.data;
};

// In api/api.js - Update the createListing function
export const createListing = async (payload) => {
  try {
    // Get the current user from AsyncStorage to include owner details
    const userStr = await AsyncStorage.getItem('user');
    let ownerData = null;
    
    if (userStr) {
      try {
        ownerData = JSON.parse(userStr);
      } catch (e) {
        console.log('Error parsing user data:', e);
      }
    }
    
    // If we have user data, include it in the payload
    if (ownerData) {
      payload.owner = {
        name: ownerData.name || ownerData.fullName || ownerData.username || 'User',
        email: ownerData.email || '',
        profileImage: ownerData.profileImage || ''
      };
    }
    
    const response = await api.post('/listings', payload);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// api/api.js - Fix getMyListings

/**
 * Get current user's listings
 * Uses the /mine endpoint which gets listings from the authenticated user
 */
export const getMyListings = async () => {
  try {
    // The backend /mine endpoint uses the authenticated user's token
    // No need to pass ownerId as it's extracted from the token
    const response = await api.get('/listings/mine');
    return response.data.listings || response.data || [];
  } catch (error) {
    console.error('Error fetching my listings:', error);
    throw error;
  }
};

export const closeListing = async (listingId, ownerId) => {
  const response = await api.patch(`/listings/${listingId}/close`, { ownerId });
  return response.data;
};


// ==================== SKILL OFFER API FUNCTIONS ====================

/**
 * Create a skill offer for a listing
 * @param {Object} payload - { listingId, message, offeredSkillName, offeredSkillLevel, proposedPrice, applicationNotes }
 */
export const createSkillOffer = async (payload) => {
  try {
    const response = await api.post('/skill-offers', payload);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// In api/api.js - Update the getOffersForListing function

/**
 * Get all offers for a listing (listing owner only)
 * @param {string} listingId
 */
export const getOffersForListing = async (listingId) => {
  try {
    console.log('Fetching offers for listing:', listingId);
    const response = await api.get(`/skill-offers/listing/${listingId}`);
    console.log('Offers response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in getOffersForListing:', error);
    // Log more details about the error
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
};

// api/api.js - Fix getMySkillOffers

/**
 * Get current user's skill offers
 */
export const getMySkillOffers = async () => {
  try {
    const response = await api.get('/skill-offers/my-offers');
    // The backend returns { success: true, offers: [...] }
    // Return the offers array directly or the whole response
    return response.data;
  } catch (error) {
    console.error('Error fetching my offers:', error);
    throw error;
  }
};

// In api/api.js - Update the updateOfferStatus function

/**
 * Update an offer status (accept/reject) - listing owner only
 * @param {string} offerId
 * @param {string} status - 'accepted' or 'rejected'
 */
export const updateOfferStatus = async (offerId, status) => {
  try {
    // Ensure status is valid
    if (!['accepted', 'rejected'].includes(status)) {
      throw new Error('Invalid status. Must be "accepted" or "rejected"');
    }
    
    const response = await api.patch(`/skill-offers/${offerId}/status`, { status });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Withdraw an offer - offeror only
 * @param {string} offerId
 */
export const withdrawSkillOffer = async (offerId) => {
  try {
    const response = await api.patch(`/skill-offers/${offerId}/withdraw`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ==================== MATCH CHAT API FUNCTIONS ====================

/**
 * Get conversation for a match
 * @param {string} matchId
 */
export const getMatchConversation = async (matchId) => {
  try {
    const response = await api.get(`/chat/match/${matchId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all active matches for the current user
 */
export const getMyMatches = async () => {
  try {
    const response = await api.get('/chat/my-matches');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get messages for a conversation
 * @param {string} conversationId
 * @param {Object} params - { page, limit }
 */
export const getConversationMessages = async (conversationId, params = {}) => {
  try {
    const response = await api.get(`/chat/messages/${conversationId}`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Mark messages as read
 * @param {string} conversationId
 * @param {Array} messageIds
 */
export const markMessagesRead = async (conversationId, messageIds) => {
  try {
    const response = await api.patch(`/chat/messages/read`, { conversationId, messageIds });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ==================== INQUIRY API FUNCTIONS ====================





/**
 * Get all inquiries for the current user
 */
export const getMyInquiries = async () => {
  try {
    const response = await api.get('/inquiries/my-inquiries');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ==================== LISTING API FUNCTIONS ====================











/**
 * Get suggested matches for a listing (barter only)
 * @param {string} listingId
 */
export const getSuggestedMatches = async (listingId) => {
  try {
    const response = await api.get(`/listings/${listingId}/suggested-matches`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ==================== INQUIRY API FUNCTIONS ====================

/**
 * Start an inquiry thread for a listing
 * @param {string} listingId
 * @param {string} userId
 * @param {string} message
 */
export const startInquiry = async (listingId, userId, message) => {
  try {
    const response = await api.post('/inquiries', { listingId, userId, message });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get inquiry for a listing and user
 * @param {string} listingId
 * @param {string} userId
 */
export const getInquiryForListing = async (listingId, userId) => {
  try {
    const response = await api.get(`/inquiries/listing/${listingId}/user/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};



export default api;