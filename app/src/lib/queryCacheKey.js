// app/src/lib/queryCacheKey.js — where Q-3c's saved React Query copy lives on the phone (lib/persistedQueries.js).
// Its own module so AuthContext can delete it on sign-out without importing persistedQueries (which imports
// AuthContext).
export const QUERY_CACHE_KEY = "@tdc_query_cache_v1";
