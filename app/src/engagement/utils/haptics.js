// app/src/engagement/utils/haptics.js
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const pop = () => {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const success = () => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {}
  );
};

export const warn = () => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
    () => {}
  );
};

export const error = () => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    () => {}
  );
};

export const selection = () => {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
};