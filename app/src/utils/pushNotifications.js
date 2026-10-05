// app/src/utils/pushNotifications.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, AppState } from 'react-native';

// ═══════════════════════════════════════════════════════════════
// FOREGROUND HANDLER
// ═══════════════════════════════════════════════════════════════
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification?.request?.content?.data || {};
    const appState = AppState.currentState;
    const isForeground = appState === 'active';

    console.log('[push] handleNotification - appState:', appState, '| type:', data.type);

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: isForeground,
      shouldShowList: true,
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// ANDROID CHANNELS — one channel per sound so each notification
// type gets its own sound. Falls back to default.
// ═══════════════════════════════════════════════════════════════
const CHANNELS = {
  // Core channels
  engagement: { sound: 'tdc_push_default', importance: 'MAX' },
  default:    { sound: 'tdc_push_default', importance: 'MAX' },

  // Feature-specific channels
  deals:       { sound: 'tdc_push_deal',       importance: 'MAX' },
  messages:    { sound: 'tdc_push_message',    importance: 'MAX' },
  jobs:        { sound: 'tdc_push_internship', importance: 'HIGH' },
  reminders:   { sound: 'tdc_push_reminder',   importance: 'HIGH' },
  points:      { sound: 'tdc_push_points',     importance: 'DEFAULT' },
  streaks:     { sound: 'tdc_push_streak',     importance: 'HIGH' },
  confessions: { sound: 'tdc_push_confession', importance: 'DEFAULT' },
  events:      { sound: 'tdc_push_event',      importance: 'DEFAULT' },
  levelup:     { sound: 'tdc_push_level_up',   importance: 'MAX' },
};

async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return;

  for (const [key, cfg] of Object.entries(CHANNELS)) {
    try {
      await Notifications.setNotificationChannelAsync(key, {
        name: key,
        importance:
          cfg.importance === 'MAX'
            ? Notifications.AndroidImportance.MAX
            : cfg.importance === 'HIGH'
            ? Notifications.AndroidImportance.HIGH
            : Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f9c349',
        sound: cfg.sound + '.wav',   // Android resolves from res/raw/
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
      console.log(`[push] channel "${key}" configured (sound: ${cfg.sound})`);
    } catch (e) {
      console.warn(`[push] channel "${key}" failed:`, e.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('[push] BLOCKED — not a physical device');
    return null;
  }

  await setupAndroidChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[push] BLOCKED — permission denied:', finalStatus);
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    console.log('[push] token:', tokenResponse.data);
    return tokenResponse.data;
  } catch (err) {
    console.log('[push] getExpoPushTokenAsync FAILED:', err.message);
    return null;
  }
}

export async function savePushTokenToServer(axiosInstance, token) {
  try {
    const res = await axiosInstance.put('/notification/save-token', {
      token,
      platform: Platform.OS,
    });
    console.log('[push] Save response:', res.status);
    return { ok: true };
  } catch (err) {
    console.error('[push] Save failed:', err.message, err.response?.data);
    return { ok: false, reason: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// LISTENERS
// ═══════════════════════════════════════════════════════════════
export function setupNotificationListeners(navigationRef, opts = {}) {
  const { markOpened, onForeground, onNotificationReceived } = opts;

  // Foreground
  const receiveSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      const content = notification?.request?.content || {};
      const data = content.data || {};

      console.log('[push] received (foreground):', data.type, '| mood:', data.mood);

      if (typeof onForeground === 'function') {
        try {
          onForeground({
            _id: data.notificationId || `push-${Date.now()}`,
            title: content.title || 'notification',
            description: content.body || '',
            type: data.type || 'System',
            mood: data.mood || 'sorted',
            iconUrl: data.iconUrl || null,
            link: data.link || null,
            screenToOpen: data.screen || data.route || null,
            metadata: data,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[push] onForeground failed:', e.message);
        }
      }

      if (typeof onNotificationReceived === 'function') {
        try { onNotificationReceived(notification); } catch {}
      }
    }
  );

  // Tapped from tray
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      const content = response?.notification?.request?.content || {};
      const data = content.data || {};

      console.log('[push] tapped:', content.title, '| data:', data);

      if (data.logId && typeof markOpened === 'function') {
        try { await markOpened(data.logId); } catch {}
      }

      const routeKey = data.route || data.screen || null;
      const params = data.params || {};
      const routeParams = {
        ...params,
        ...(data.listingId ? { listingId: data.listingId, id: data.listingId } : {}),
        ...(data.offerId ? { offerId: data.offerId } : {}),
        ...(data.matchId ? { matchId: data.matchId } : {}),
        ...(data.conversationId ? { conversationId: data.conversationId } : {}),
        ...(data.postId ? { postId: data.postId } : {}),
        ...(data.userId ? { userId: data.userId } : {}),
      };

      if (!routeKey) return;

      const nav = navigationRef?.current;
      const go = () => {
        try {
          nav.navigate(routeKey, routeParams);
        } catch (e) {
          console.warn(`[push] navigate("${routeKey}") failed:`, e.message);
        }
      };

      if (nav?.isReady?.()) go();
      else {
        let attempts = 0;
        const id = setInterval(() => {
          attempts++;
          if (nav?.isReady?.()) {
            clearInterval(id);
            go();
          } else if (attempts > 30) clearInterval(id);
        }, 100);
      }
    }
  );

  // Cold start (app was killed)
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      const content = response?.notification?.request?.content || {};
      const data = content.data || {};
      const routeKey = data.route || data.screen || null;
      if (!routeKey) return;

      setTimeout(() => {
        const nav = navigationRef?.current;
        if (!nav?.isReady?.()) return;
        try {
          nav.navigate(routeKey, {
            ...(data.params || {}),
            ...(data.listingId ? { listingId: data.listingId, id: data.listingId } : {}),
            ...(data.offerId ? { offerId: data.offerId } : {}),
            ...(data.matchId ? { matchId: data.matchId } : {}),
            ...(data.conversationId ? { conversationId: data.conversationId } : {}),
            ...(data.postId ? { postId: data.postId } : {}),
          });
        } catch (e) {
          console.warn('[push] cold-start navigate failed:', e.message);
        }
      }, 1500);
    })
    .catch(() => {});

  return () => {
    try { receiveSub.remove(); } catch {}
    try { responseSub.remove(); } catch {}
  };
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND TASK
// ═══════════════════════════════════════════════════════════════
export const NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

export async function registerBackgroundNotificationTask() {
  try {
    const TaskManager = require('expo-task-manager');

    if (!TaskManager.isTaskDefined(NOTIFICATION_TASK)) {
      TaskManager.defineTask(NOTIFICATION_TASK, async ({ data, error }) => {
        if (error) return;
        if (data) {
          const { notification } = data;
          console.log('[push] bg notification:', notification?.request?.content?.title);
        }
      });
    }

    await Notifications.registerTaskAsync(NOTIFICATION_TASK);
    console.log('[push] Background task registered');
  } catch (err) {
    console.log('[push] Background task registration failed:', err.message);
  }
}