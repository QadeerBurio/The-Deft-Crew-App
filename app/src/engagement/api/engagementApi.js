// app/src/engagement/api/engagementApi.js
import api from '../../api/api';

export const engagementApi = {
  getMe: async () => {
    const res = await api.get('/engagement/me');
    return res.data;
  },

  getHome: async () => {
    const res = await api.get('/engagement/home');
    return res.data;
  },

  postEvent: async (name, meta = {}) => {
    await api.post('/engagement/events', { name, meta });
  },

  completeTour: async () => {
    await api.post('/engagement/tour/complete');
  },

  markTooltipSeen: async (id) => {
    await api.post(`/engagement/tooltips/${id}/seen`);
  },

  snoozeMission: async (feature) => {
    const res = await api.post(`/engagement/missions/${feature}/snooze`);
    return res.data;
  },

  ackPopup: async (popupId) => {
    await api.post(`/engagement/popups/${popupId}/ack`);
  },

  getBadges: async () => {
    const res = await api.get('/engagement/badges');
    return res.data;
  },

  getPointsLedger: async (cursor = null, limit = 20) => {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    const res = await api.get('/engagement/points/ledger', { params });
    return res.data;
  },

  getRewards: async () => {
    const res = await api.get('/engagement/rewards');
    return res.data;
  },
    // ✅ NEW — needed by RewardsScreen "my rewards" section
  getMyRedemptions: async () => {
    const res = await api.get('/engagement/rewards/my-redemptions');
    return res.data;
  },

  redeemReward: async (rewardId) => {
    const res = await api.post(`/engagement/rewards/${rewardId}/redeem`);
    return res.data;
  },

  getNotificationPrefs: async () => {
    const res = await api.get('/engagement/notification-prefs');
    return res.data;
  },

  updateNotificationPrefs: async (prefs) => {
    const res = await api.put('/engagement/notification-prefs', prefs);
    return res.data;
  },

  reportPushPermission: async (status) => {
    await api.post('/engagement/push-permission', { status });
  },

  // ── Streak ──────────────────────────────────────────────────
  fetchStreakStatus: async () => {
    const res = await api.get('/engagement/streak/status');
    return res.data;
  },

  setExamMode: async (days = 7) => {
    console.log('[engagementApi] POST /engagement/streak/exam-mode', days);
    const res = await api.post('/engagement/streak/exam-mode', { days });
    console.log('[engagementApi] setExamMode response:', res.data);
    return res.data;
  },

  clearExamMode: async () => {
    console.log('[engagementApi] DELETE /engagement/streak/exam-mode');
    const res = await api.delete('/engagement/streak/exam-mode');
    console.log('[engagementApi] clearExamMode response:', res.data);
    return res.data;
  },

  // ── Daily drop ──────────────────────────────────────────────
  getTodayDrop: async () => {
    const res = await api.get('/engagement/drops/today');
    return res.data;
  },

  reactToDrop: async (dayKey, choice) => {
    const res = await api.post(`/engagement/drops/${dayKey}/react`, { choice });
    return res.data;
  },

  saveItem: async (kind, id) => {
    const res = await api.post(`/engagement/saved/${kind}/${id}`);
    return res.data;
  },

  unsaveItem: async (kind, id) => {
    await api.delete(`/engagement/saved/${kind}/${id}`);
  },
  // Add to the existing engagementApi object
getMyReferrals: async () => {
  const res = await api.get('/engagement/referrals/me');
  return res.data;
},

getReferralLeaderboard: async () => {
  const res = await api.get('/engagement/referrals/leaderboard');
  return res.data;
},

validateReferralCode: async (code) => {
  const res = await api.get(`/engagement/referrals/validate/${code}`);
  return res.data;
},
  
};

export default engagementApi;