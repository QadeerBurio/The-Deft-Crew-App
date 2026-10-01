// app/src/utils/pushNotifications.js
// FIXED: Handles foreground, background, and killed app states

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, AppState } from 'react-native';

// ═══════════════════════════════════════════════════════════════
// FOREGROUND HANDLER — show banner + sound + badge
// ═══════════════════════════════════════════════════════════════
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification?.request?.content?.data || {};
    
    // Check if app is in foreground
    const appState = AppState.currentState;
    const isForeground = appState === 'active';
    
    console.log('[push] handleNotification - appState:', appState, '| type:', data.type);
    
    return {
      shouldShowAlert: true,  // Always show alert (system tray when background)
      shouldPlaySound: true,
      shouldSetBadge: true,
      // Show in-app banner only when foreground
      shouldShowBanner: isForeground,
      shouldShowList: true,
    };
  },
});

// app/src/utils/pushNotifications.js — CHANNEL FIX

// ═══════════════════════════════════════════════════════════════
// CHANNELS — MAX importance = heads-up popup, bypass DND, sound
// ═══════════════════════════════════════════════════════════════
const CHANNELS = {
  engagement: {
    name: 'engagement',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#f9c349',
    sound: 'default',                    // ← MUST be set for popup sound
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,                     // ← shows even in Do Not Disturb
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
  },
  default: {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#f9c349',
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
  },
};

async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return;

  for (const [key, cfg] of Object.entries(CHANNELS)) {
    try {
      await Notifications.setNotificationChannelAsync(key, cfg);
      console.log(`[push] Channel "${key}" configured with MAX importance`);
    } catch (e) {
      console.warn(`[push] failed to set channel ${key}:`, e.message);
    }
  }

  // Also set default channel so notifications without channelId still work
  try {
    await Notifications.setNotificationChannelAsync('default', CHANNELS.default);
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
// REGISTER — permissions + Expo push token
// ═══════════════════════════════════════════════════════════════
export async function registerForPushNotificationsAsync() {
  console.log('[push] Device.isDevice:', Device.isDevice);

  if (!Device.isDevice) {
    console.log('[push] BLOCKED — not a physical device');
    return null;
  }

  await setupAndroidChannels();

  // Permission
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

  // Project ID
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  console.log('[push] projectId:', projectId);

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    console.log('[push] getExpoPushTokenAsync SUCCESS:', tokenResponse.data);
    return tokenResponse.data;
  } catch (err) {
    console.log('[push] getExpoPushTokenAsync FAILED:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// SAVE TOKEN — never throws, returns {ok:boolean, reason?}
// ═══════════════════════════════════════════════════════════════
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
// LISTENERS — foreground + tap + cold start
// Call once at app root.
// ═══════════════════════════════════════════════════════════════
export function setupNotificationListeners(navigationRef, opts = {}) {
  const { markOpened, onForeground, onNotificationReceived } = opts;

  // ── Foregrounded: push arrived while app was open ──
  const receiveSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      const content = notification?.request?.content || {};
      const data = content.data || {};
      
      console.log(
        '[push] received (foreground):',
        data.type || 'unknown',
        '| mood:',
        data.mood,
        '| title:',
        content.title
      );

      // Let the caller route it into the in-app banner
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
          console.warn('[push] onForeground handler failed:', e.message);
        }
      }

      // Generic callback
      if (typeof onNotificationReceived === 'function') {
        try {
          onNotificationReceived(notification);
        } catch (e) {
          console.warn('[push] onNotificationReceived failed:', e.message);
        }
      }
    }
  );

  // ── Tapped from OS tray (app was background or killed) ──
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      const content = response?.notification?.request?.content || {};
      const data = content.data || {};
      
      console.log('[push] tapped:', content.title, '| data:', data);

      // Best-effort mark-opened
      if (data.logId && typeof markOpened === 'function') {
        try {
          await markOpened(data.logId);
        } catch (e) {
          console.warn('[push] markOpened failed:', e.message);
        }
      }

      // Resolve route + params (supports both `route` and `screen` styles)
      const routeKey = data.route || data.screen || null;
      const params = data.params || {};

      // Build route params with fallbacks for all ID types
      const routeParams = {
        ...params,
        ...(data.listingId ? { listingId: data.listingId, id: data.listingId } : {}),
        ...(data.offerId ? { offerId: data.offerId } : {}),
        ...(data.matchId ? { matchId: data.matchId } : {}),
        ...(data.conversationId ? { conversationId: data.conversationId } : {}),
        ...(data.postId ? { postId: data.postId } : {}),
        ...(data.userId ? { userId: data.userId } : {}),
      };

      if (!routeKey) {
        console.warn('[push] no route in notification data — skipping nav');
        return;
      }

      const nav = navigationRef?.current;
      if (!nav) {
        console.warn('[push] navigationRef not ready — cannot navigate');
        return;
      }

      // Wait for nav to be ready (cold-start case)
      const go = () => {
        try {
          nav.navigate(routeKey, routeParams);
          console.log('[push] navigate →', routeKey, routeParams);
        } catch (e) {
          console.warn(`[push] navigate("${routeKey}") failed:`, e.message);
          // Last-ditch fallback
          try {
            nav.navigate('HomeTabs', { screen: 'HomeStackMain' });
          } catch {}
        }
      };

      if (nav.isReady && nav.isReady()) {
        go();
      } else {
        // Retry for 3s (increased from 2s for slow devices)
        let attempts = 0;
        const id = setInterval(() => {
          attempts++;
          if (nav.isReady && nav.isReady()) {
            clearInterval(id);
            go();
          } else if (attempts > 30) {
            clearInterval(id);
            console.warn('[push] nav never became ready');
          }
        }, 100);
      }
    }
  );

  // ── Cold-start: app was killed, user tapped notification to open ──
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      const content = response?.notification?.request?.content || {};
      const data = content.data || {};
      
      console.log('[push] cold-start tap:', content.title, '| data:', data);

      const routeKey = data.route || data.screen || null;
      const params = data.params || {};
      if (!routeKey) return;

      // Give navigation time to mount (increased to 1500ms)
      setTimeout(() => {
        const nav = navigationRef?.current;
        if (!nav || !(nav.isReady && nav.isReady())) {
          console.warn('[push] cold-start: nav not ready after delay');
          return;
        }
        try {
          nav.navigate(routeKey, {
            ...params,
            ...(data.listingId ? { listingId: data.listingId, id: data.listingId } : {}),
            ...(data.offerId ? { offerId: data.offerId } : {}),
            ...(data.matchId ? { matchId: data.matchId } : {}),
            ...(data.conversationId ? { conversationId: data.conversationId } : {}),
          });
          console.log('[push] cold-start navigate →', routeKey);
        } catch (e) {
          console.warn('[push] cold-start navigate failed:', e.message);
        }
      }, 1500);
    })
    .catch(() => {});

  // Cleanup function
  return () => {
    try {
      receiveSub.remove();
    } catch {}
    try {
      responseSub.remove();
    } catch {}
  };
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND NOTIFICATION TASK (for killed app)
// Requires expo-task-manager
// ═══════════════════════════════════════════════════════════════
export const NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

export async function registerBackgroundNotificationTask() {
  try {
    const TaskManager = require('expo-task-manager');
    
    if (!TaskManager.isTaskDefined(NOTIFICATION_TASK)) {
      TaskManager.defineTask(NOTIFICATION_TASK, async ({ data, error }) => {
        if (error) {
          console.error('[push] background task error:', error);
          return;
        }
        if (data) {
          const { notification } = data;
          console.log('[push] background notification received:', 
            notification?.request?.content?.title);
        }
      });
    }

    await Notifications.registerTaskAsync(NOTIFICATION_TASK);
    console.log('[push] Background notification task registered');
  } catch (err) {
    console.log('[push] Background task registration failed (ok if not supported):', err.message);
  }
}