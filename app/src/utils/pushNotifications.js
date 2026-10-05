// app/src/utils/pushNotifications.js
// Push setup for TDC: Android channels, permission, Expo token, tap routing.
//
// Rules that make notifications show OUTSIDE the app (background / killed):
//   • Android channels must exist BEFORE the first push arrives, so we create
//     them at app start (see setupAndroidChannels call in App.js), not after login.
//   • The channelId sent by the backend must be one of the IDs below.
//   • Channel importance MAX/HIGH = heads-up popup. Android freezes a channel's
//     settings after first creation, so reinstall the app after changing them.
//   • The foreground handler lives ONLY in App.js.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════
// ANDROID CHANNELS (IDs must match backend utils/pushNotification.js)
// ═══════════════════════════════════════════════════════════════
const CHANNELS = {
  engagement:  { name: 'General',        sound: 'tdc_push_default',    importance: 'MAX' },
  default:     { name: 'Default',        sound: 'tdc_push_default',    importance: 'MAX' },
  messages:    { name: 'Messages',       sound: 'tdc_push_message',    importance: 'MAX' },
  deals:       { name: 'Deals & offers', sound: 'tdc_push_deal',       importance: 'MAX' },
  jobs:        { name: 'Jobs',           sound: 'tdc_push_internship', importance: 'HIGH' },
  reminders:   { name: 'Reminders',      sound: 'tdc_push_reminder',   importance: 'HIGH' },
  points:      { name: 'Points',         sound: 'tdc_push_points',     importance: 'HIGH' },
  streaks:     { name: 'Streaks',        sound: 'tdc_push_streak',     importance: 'HIGH' },
  confessions: { name: 'Confessions',    sound: 'tdc_push_confession', importance: 'HIGH' },
  events:      { name: 'Events',         sound: 'tdc_push_event',      importance: 'HIGH' },
  levelup:     { name: 'Level up',       sound: 'tdc_push_level_up',   importance: 'MAX' },
};

let channelsPromise = null;

export function setupAndroidChannels() {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (channelsPromise) return channelsPromise;

  channelsPromise = (async () => {
    for (const [id, cfg] of Object.entries(CHANNELS)) {
      try {
        await Notifications.setNotificationChannelAsync(id, {
          name: cfg.name,
          importance:
            cfg.importance === 'MAX'
              ? Notifications.AndroidImportance.MAX
              : Notifications.AndroidImportance.HIGH,
          sound: `${cfg.sound}.wav`, // bundled via expo-notifications "sounds" in app.json
          vibrationPattern: [0, 250, 250, 250],
          enableVibrate: true,
          lightColor: '#f9c349',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        });
      } catch (e) {
        console.warn(`[push] channel "${id}" failed:`, e?.message);
      }
    }
    console.log('[push] android channels ready');
  })();

  return channelsPromise;
}

// ═══════════════════════════════════════════════════════════════
// PERMISSION + EXPO TOKEN
// ═══════════════════════════════════════════════════════════════
export async function registerForPushNotificationsAsync() {
  await setupAndroidChannels();

  if (!Device.isDevice) {
    console.log('[push] skipped: not a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[push] permission not granted:', finalStatus);
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('[push] missing EAS projectId in app.json → extra.eas.projectId');
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[push] token:', data);
    return data;
  } catch (err) {
    // Most common cause on Android: FCM V1 credentials not uploaded to EAS
    console.log('[push] getExpoPushTokenAsync failed:', err?.message);
    return null;
  }
}

export async function savePushTokenToServer(axiosInstance, token) {
  try {
    const res = await axiosInstance.put('/notification/save-token', {
      token,
      platform: Platform.OS,
    });
    console.log('[push] token saved:', res.status);
    return { ok: true };
  } catch (err) {
    console.error('[push] token save failed:', err.message, err.response?.data);
    return { ok: false, reason: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// TAP ROUTING (shared by App.js cold start + GlobalNotificationLayer)
// ═══════════════════════════════════════════════════════════════
const handledResponses = new Set();

// Returns true the first time a given notification tap is seen, false after.
// Stops the same tap from navigating twice (cold start + listener).
export function claimNotificationResponse(response) {
  const id =
    response?.notification?.request?.identifier ||
    response?.notification?.request?.content?.data?.notificationId;
  if (!id) return true;
  if (handledResponses.has(id)) return false;
  handledResponses.add(id);
  return true;
}

export function getRouteFromNotificationData(data = {}) {
  const route = data.route || data.screen || null;
  const params = {
    ...(data.params && typeof data.params === 'object' ? data.params : {}),
    ...(data.offerId ? { offerId: data.offerId } : {}),
    ...(data.listingId ? { listingId: data.listingId, id: data.listingId } : {}),
    ...(data.matchId ? { matchId: data.matchId } : {}),
    ...(data.conversationId ? { conversationId: data.conversationId } : {}),
    ...(data.inquiryId ? { inquiryId: data.inquiryId } : {}),
    ...(data.postId ? { postId: data.postId } : {}),
    ...(data.userId ? { userId: data.userId } : {}),
  };
  return { route, params };
}

// Navigate once the navigation container is ready (retries up to ~5s)
export function navigateWhenReady(navigationRef, route, params, attempt = 0) {
  if (!route) return;
  if (navigationRef?.isReady?.()) {
    try {
      navigationRef.navigate(route, params);
      console.log('[push] navigated →', route);
    } catch (e) {
      console.warn(`[push] navigate("${route}") failed:`, e?.message);
    }
  } else if (attempt < 50) {
    setTimeout(() => navigateWhenReady(navigationRef, route, params, attempt + 1), 100);
  }
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND TASK (runs for data pushes while app is backgrounded)
// The task itself is defined at module scope in App.js.
// ═══════════════════════════════════════════════════════════════
export const NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

export async function registerBackgroundNotificationTask() {
  try {
    await Notifications.registerTaskAsync(NOTIFICATION_TASK);
    console.log('[push] background task registered');
  } catch (err) {
    console.log('[push] background task registration failed:', err?.message);
  }
}