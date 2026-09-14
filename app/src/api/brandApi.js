// api/api.js - ULTRA FAST + OPTIMIZED + CACHE BUSTING + CLAIM/UNCLAIM SYNC
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// ─────────────────────────────────────────────────────
// BASE URL RESOLUTION (only computed once)
// ─────────────────────────────────────────────────────
const getBaseURL = () => {
  if (__DEV__) {
    const manifest = Constants.expoConfig || Constants.manifest || {};
    const hostUri = manifest.hostUri;
    const devIp = hostUri ? hostUri.split(":")[0] : "192.168.18.93";
    return `https://the-deft-crew-production.up.railway.app/api`;
  }
  return "https://the-deft-crew-production.up.railway.app/api";
};

export const BASE_URL = getBaseURL();
export const SERVER_URL = BASE_URL.replace(/\/api\/?$/, "");

// ─────────────────────────────────────────────────────
// FAST AXIOS INSTANCE
// ─────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  maxContentLength: 10 * 1024 * 1024,
  maxBodyLength: 10 * 1024 * 1024,
});

// ─────────────────────────────────────────────────────
// FAST LRU MEMORY CACHE (Map-based, zero deps)
// ─────────────────────────────────────────────────────
class FastCache {
  constructor(max = 120) {
    this.map = new Map();
    this.max = max;
  }
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.exp < Date.now()) {
      this.map.delete(key);
      return null;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.data;
  }
  set(key, data, ttl = 30000) {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest) this.map.delete(oldest);
    }
    this.map.set(key, { data, exp: Date.now() + ttl });
  }
  del(key) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
  has(key) {
    const e = this.map.get(key);
    if (!e) return false;
    if (e.exp < Date.now()) {
      this.map.delete(key);
      return false;
    }
    return true;
  }
}

export const memoryCache = new FastCache(120);

// ─────────────────────────────────────────────────────
// ✅ GLOBAL CLAIM/UNCLAIM EVENT BUS
// ─────────────────────────────────────────────────────
const cacheEventListeners = new Set();

export const onCacheEvent = (callback) => {
  cacheEventListeners.add(callback);
  return () => cacheEventListeners.delete(callback);
};

const emitCacheEvent = (event) => {
  cacheEventListeners.forEach((cb) => {
    try {
      cb(event);
    } catch (e) {
      console.log("cache event listener error:", e);
    }
  });
};

// ─────────────────────────────────────────────────────
// ✅ CACHE BUSTING — call after claim / unclaim
// ─────────────────────────────────────────────────────
export const invalidateBrandsCache = (event = null) => {
  const keysToDelete = [];
  for (const key of memoryCache.map.keys()) {
    if (
      key.startsWith("brands:") ||
      key.startsWith("GET:/brands") ||
      key.startsWith("GET:/offers/summary") ||
      key.startsWith("GET:/offers/brand") ||
      key.startsWith("GET:/offers/claimed") ||
      key.startsWith("GET:/offers/my-total-savings")
    ) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((k) => memoryCache.del(k));

  if (event) {
    emitCacheEvent({ type: "cache:invalidated", ...event });
  }
};

export const invalidateCache = (prefix, event = null) => {
  if (!prefix) return;
  const keysToDelete = [];
  for (const key of memoryCache.map.keys()) {
    if (key.startsWith(prefix)) keysToDelete.push(key);
  }
  keysToDelete.forEach((k) => memoryCache.del(k));

  if (event) {
    emitCacheEvent({ type: "cache:invalidated", ...event });
  }
};

// ─────────────────────────────────────────────────────
// ✅ CLAIM/UNCLAIM HELPERS
// ─────────────────────────────────────────────────────
export const notifyOfferClaimed = (brandId, offerId, userId) => {
  invalidateBrandsCache({
    type: "offer:claimed",
    brandId,
    offerId,
    userId,
  });
};

export const notifyOfferUnclaimed = (brandId, offerId, userId) => {
  invalidateBrandsCache({
    type: "offer:unclaimed",
    brandId,
    offerId,
    userId,
  });
};

// ─────────────────────────────────────────────────────
// AUTH STATE
// ─────────────────────────────────────────────────────
let cachedToken = null;
let cachedIsGuest = null;
let authHydrated = false;

export const hydrateAuth = async () => {
  try {
    const [[, token], [, guestFlag]] = await AsyncStorage.multiGet([
      "token",
      "isGuest",
    ]);
    cachedToken = token || null;
    cachedIsGuest = guestFlag === "true";
    authHydrated = true;
  } catch {
    cachedToken = null;
    cachedIsGuest = null;
    authHydrated = true;
  }
};

export const setAuthToken = (token) => {
  cachedToken = token || null;
  authHydrated = true;
};

export const setGuestMode = (isGuest) => {
  cachedIsGuest = !!isGuest;
  if (isGuest) cachedToken = null;
  authHydrated = true;
};

export const clearAuth = () => {
  cachedToken = null;
  cachedIsGuest = null;
  memoryCache.clear();
};

// ─────────────────────────────────────────────────────
// REQUEST DEDUPLICATION
// ─────────────────────────────────────────────────────
const inFlight = new Map();

function makeKey(config) {
  const params = config.params ? JSON.stringify(config.params) : "";
  return `${config.method || "get"}:${config.url}:${params}`;
}

// ─────────────────────────────────────────────────────
// REQUEST INTERCEPTOR
// ─────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (!authHydrated) {
      hydrateAuth();
    }

    if (cachedToken && !cachedIsGuest) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
    } else {
      delete config.headers.Authorization;
    }

    if (
      (config.method || "get").toLowerCase() === "get" &&
      !config._skipDedup
    ) {
      const key = makeKey(config);
      const existing = inFlight.get(key);
      if (existing) {
        const controller = new AbortController();
        config.signal = controller.signal;
        controller.abort();
        config._dedupKey = key;
      } else {
        config._dedupKey = key;
        inFlight.set(key, true);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR
// ─────────────────────────────────────────────────────
let logoutHandler = () => {};
let sessionErrorHandler = null;

export const injectLogout = (h) => {
  logoutHandler = h;
};
export const injectSessionErrorHandler = (h) => {
  sessionErrorHandler = h;
};

let isLoggingOut = false;

api.interceptors.response.use(
  (response) => {
    const key = response.config?._dedupKey;
    if (key) inFlight.delete(key);
    return response;
  },
  async (error) => {
    const cfg = error.config || {};
    const key = cfg._dedupKey;
    if (key) inFlight.delete(key);

    if (
      axios.isCancel?.(error) ||
      error.code === "ERR_CANCELED" ||
      error.name === "CanceledError"
    ) {
      return Promise.reject(error);
    }

    if (!error.response) return Promise.reject(error);

    if (error.response.status === 401 && !cfg._retry) {
      if (cachedIsGuest) return Promise.reject(error);

      cfg._retry = true;

      if (!isLoggingOut) {
        isLoggingOut = true;
        try {
          await AsyncStorage.multiRemove(["token", "user", "isGuest"]);
        } catch {}
        clearAuth();
        sessionErrorHandler?.(
          "Session Expired",
          "Your session has expired. Please log in again."
        );
        logoutHandler?.();
        setTimeout(() => {
          isLoggingOut = false;
        }, 1000);
      }
    }

    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────
// DEDUPLICATED + CACHED REQUEST HELPER
// ─────────────────────────────────────────────────────
async function cachedGet(url, { ttl = 30000, config = {} } = {}) {
  const cacheKey = `GET:${url}:${JSON.stringify(config.params || {})}`;

  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const promise = api
    .get(url, { ...config, _skipDedup: true })
    .then((res) => {
      memoryCache.set(cacheKey, res.data, ttl);
      inFlight.delete(cacheKey);
      return res.data;
    })
    .catch((err) => {
      inFlight.delete(cacheKey);
      throw err;
    });

  inFlight.set(cacheKey, promise);
  return promise;
}

// ─────────────────────────────────────────────────────
// OPTIMIZED BRAND + OFFER FETCH
// ─────────────────────────────────────────────────────
export const optimizedAPI = {
  getBrandsFast: async (token, userId, options = {}) => {
    const { forceRefresh = false, limit = 200 } = options;
    const cacheKey = `brands:${userId || "all"}:${limit}`;

    if (!forceRefresh) {
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;
    }

    return cachedGet("/brands", {
      ttl: 300000,
      config: { params: { limit } },
    }).then(async (brandsRaw) => {
      let summary = {};
      try {
        summary = (await cachedGet("/offers/summary", { ttl: 300000 })) || {};
      } catch {}

      const brands = Array.isArray(brandsRaw)
        ? brandsRaw
        : brandsRaw?.data || brandsRaw?.brands || [];

      const baseUrl = SERVER_URL;
      const defaultImage =
        "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

      const mapped = new Array(brands.length);
      for (let i = 0; i < brands.length; i++) {
        const brand = brands[i];
        const brandOffers = summary[brand._id] || [];
        const firstOffer = brandOffers[0];

        const logoUrl = formatImg(brand.logo, "brand", baseUrl);
        const offerImg = firstOffer?.image
          ? formatImg(firstOffer.image, "offer", baseUrl)
          : null;

        const offers = new Array(brandOffers.length);
        for (let j = 0; j < brandOffers.length; j++) {
          const o = brandOffers[j];
          offers[j] = {
            ...o,
            image: formatImg(o.image, "offer", baseUrl),
            displayImage: formatImg(o.image, "offer", baseUrl),
            isClaimed: o.claimedBy?.includes(userId) || false,
            discountPercentage: o.discountPercentage || 0,
          };
        }

        mapped[i] = {
          ...brand,
          logo: logoUrl,
          offers,
          displayImage: offerImg || logoUrl || defaultImage,
          hasOffer: brandOffers.length > 0,
          discount: firstOffer?.discountPercentage || 0,
          category: firstOffer?.category || brand.category || "General",
          isOnline: firstOffer?.isOnline || brand.isOnline || false,
          isInStore: firstOffer?.isInStore || brand.isInStore || false,
          createdAt: brand.createdAt || new Date().toISOString(),
        };
      }

      mapped.sort(
        (a, b) =>
          new Date(b.createdAt || b._id).getTime() -
          new Date(a.createdAt || a._id).getTime()
      );

      memoryCache.set(cacheKey, mapped, 300000);
      return mapped;
    });
  },
};

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
function formatImg(path, type = "offer", baseUrl = SERVER_URL) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const clean = path.replace(/^\/+/, "");
  if (type === "brand") {
    return clean.startsWith("uploads/brands/")
      ? `${baseUrl}/${clean}`
      : `${baseUrl}/uploads/brands/${clean}`;
  }
  return `${baseUrl}/${clean}`;
}

export default api;