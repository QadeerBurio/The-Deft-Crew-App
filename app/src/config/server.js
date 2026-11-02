// app/src/config/server.js
// The one place the app learns where the server is. EXPO_PUBLIC_API_URL is the server's origin,
// without /api (e.g. https://tdc-server-staging.up.railway.app). Expo inlines it at build time (only
// this exact process.env.EXPO_PUBLIC_API_URL form is inlined); unset, it is production, so a build
// without the variable behaves as before. See docs/STAGING.md in the server repository.
export const SERVER_ORIGIN = (process.env.EXPO_PUBLIC_API_URL || "https://the-deft-crew-production.up.railway.app").replace(/\/+$/, "");
export const API_BASE = `${SERVER_ORIGIN}/api`;
