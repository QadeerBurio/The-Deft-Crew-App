import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  console.log('[pushNotifications] Device.isDevice:', Device.isDevice);
  if (!Device.isDevice) {
    console.log('[pushNotifications] BLOCKED — not a physical device (emulator/simulator)');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('[pushNotifications] Existing permission status:', existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    console.log('[pushNotifications] Requesting permission...');
    const { status } = await Notifications.requestPermissionsAsync();
    console.log('[pushNotifications] Permission request result:', status);
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[pushNotifications] BLOCKED — permission not granted, final status:', finalStatus);
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f9c349',
    });
    console.log('[pushNotifications] Android channel set');
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  console.log('[pushNotifications] projectId from Constants.expoConfig:', projectId);

  if (!projectId) {
    console.log('[pushNotifications] WARNING — no projectId found. Checking Constants.easConfig fallback...');
    console.log('[pushNotifications] Constants.easConfig:', JSON.stringify(Constants.easConfig));
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    console.log('[pushNotifications] getExpoPushTokenAsync SUCCESS:', tokenResponse.data);
    return tokenResponse.data;
  } catch (err) {
    console.log('[pushNotifications] getExpoPushTokenAsync THREW:', err.message);
    return null;
  }
}

export async function savePushTokenToServer(axiosInstance, token) {
  try {
    console.log('[pushNotifications] Saving token to server:', token);
    const res = await axiosInstance.put('/notification/save-token', { token });
    console.log('[pushNotifications] Save response:', res.status, res.data);
  } catch (err) {
    console.error('[pushNotifications] Failed to save push token:', err.message, err.response?.data);
    throw err; // re-throw so the caller's .catch() sees it too
  }
}