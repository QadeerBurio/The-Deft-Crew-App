// app/src/engagement/utils/pushPermission.js
// Ask only after the first sorted moment. Never on install.

import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import api from '../../api/api';
import { useContext } from 'react';

export async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('engagement', {
      name: 'engagement',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f9c349',
    });
  }
}

export async function registerForPushNotificationsAsync() {
  await ensureChannel();

  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    try {
      await api.post('/engagement/push-permission', { status: 'denied' });
    } catch {}
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data;
    if (!token) return null;

    await api.put('/notification/save-token', { token, platform: Platform.OS });

    try {
      await api.post('/engagement/push-permission', { status: 'granted' });
    } catch {}

    return token;
  } catch (e) {
    console.log('[pushPermission] register error:', e?.message);
    return null;
  }
}

export async function maybeAskPushPermission(me) {
  if (!me?.askPushPermission) return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') {
    await registerForPushNotificationsAsync();
    return true;
  }
  return false;
}