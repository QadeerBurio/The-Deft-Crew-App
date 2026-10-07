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
import { colors } from '../theme';

// ═══════════════════════════════════════════════════════════════
// ANDROID CHANNELS: one per sound
// On Android a background/killed notification plays the sound of its
// channel, not a per-message sound. So every sound the in-app banner can
// play (see lib/tdcSounds.js playSoundForNotification) gets its own
// channel "snd_<sound>". The backend (utils/pushNotification.js
// resolveSoundKey) picks the same sound with the same rule, so the
// notification outside the app sounds exactly like the one inside.
// Every file below must also be listed in app.json → expo-notifications → sounds.
// ═══════════════════════════════════════════════════════════════
const SOUND_CHANNELS = {
  // mood sounds (used first, same as in-app)
  tdc_mood_sorted:     'Sorted',
  tdc_mood_excited:    'Excited',
  tdc_mood_panic:      'Panic',
  tdc_mood_broke:      'Broke',
  tdc_mood_sleepy:     'Sleepy',
  tdc_mood_shook:      'Shook',
  tdc_mood_sus:        'Sus',
  tdc_mood_cheeky:     'Cheeky',
  tdc_mood_rs:         'Rs',
  // type sounds (used when the mood has no sound)
  tdc_push_default:    'General',
  tdc_push_deal:       'Deals & offers',
  tdc_push_message:    'Messages',
  tdc_push_internship: 'Jobs & internships',
  tdc_push_reminder:   'Reminders',
  tdc_push_points:     'Points',
  tdc_push_streak:     'Streaks',
  tdc_push_confession: 'Confessions',
  tdc_push_event:      'Events',
  tdc_push_level_up:   'Level up',
  tdc_like:            'Likes',
  tdc_nope:            'Declined',
};

export const channelForSound = (soundKey) => `snd_${soundKey}`;

// Sent with the push token so the backend knows this build has the snd_* channels
export const CHANNEL_SET = 'snd_v1';

// Old channel IDs from earlier builds. Removed so Settings stays clean.
const LEGACY_CHANNELS = [
  'engagement', 'default', 'messages', 'deals', 'jobs', 'reminders',
  'points', 'streaks', 'confessions', 'events', 'levelup',
];

let channelsPromise = null;

export function setupAndroidChannels() {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (channelsPromise) return channelsPromise;

  channelsPromise = (async () => {
    for (const [soundKey, name] of Object.entries(SOUND_CHANNELS)) {
      const id = channelForSound(soundKey);
      try {
        await Notifications.setNotificationChannelAsync(id, {
          name: `tdc · ${name}`,
          importance: Notifications.AndroidImportance.MAX, // heads-up popup
          sound: `${soundKey}.wav`,                         // from res/raw (app.json sounds)
          vibrationPattern: [0, 250, 250, 250],
          enableVibrate: true,
          lightColor: colors.yellow,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        });
      } catch (e) {
        console.warn(`[push] channel "${id}" failed:`, e?.message);
      }
    }

    for (const id of LEGACY_CHANNELS) {
      try { await Notifications.deleteNotificationChannelAsync(id); } catch {}
    }

    console.log('[push] android sound channels ready');
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
      channels: CHANNEL_SET,
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