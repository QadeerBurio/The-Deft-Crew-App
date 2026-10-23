
import { Platform } from "react-native";
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync
} from "expo-tracking-transparency";

import { Settings } from "react-native-fbsdk-next";

export async function configureIOSTracking() {
  if (Platform.OS !== "ios") {
    return false;
  }

  try {
    let permission = await getTrackingPermissionsAsync();

    if (permission.status === "undetermined") {
      permission = await requestTrackingPermissionsAsync();
    }

    const granted = permission.status === "granted";

    Settings.setAdvertiserTrackingEnabled(granted);
    Settings.setAdvertiserIDCollectionEnabled(granted);

    return granted;
  } catch (error) {
    console.warn(
      "[Meta iOS] Tracking permission error:",
      error?.message
    );

    return false;
  }
}
