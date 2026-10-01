// app/src/engagement/engagementBus.js
// Tiny event emitter so api.js (non-React) can talk to EngagementProvider.

const listeners = new Map();

export const engagementBus = {
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => listeners.get(event)?.delete(handler);
  },

  emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    set.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.log(`[engagementBus] listener error for ${event}:`, e?.message);
      }
    });
  },
};

export const ENGAGEMENT_EVENTS = {
  POPUPS_QUEUED: 'popups:queued',
  PROFILE_REFRESH: 'profile:refresh',
  CELEBRATE: 'celebrate',
};