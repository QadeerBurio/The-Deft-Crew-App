import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Platform, Alert, Linking } from 'react-native';

export const checkAllPermissions = async () => {
  try {
    const location = await Location.getForegroundPermissionsAsync();
    const media = await ImagePicker.getMediaLibraryPermissionsAsync();
    const audio = await Audio.getPermissionsAsync();

    return {
      location: location.status === 'granted',
      mediaLibrary: media.status === 'granted',
      microphone: audio.status === 'granted',
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return {
      location: false,
      mediaLibrary: false,
      microphone: false,
    };
  }
};

export const requestAllPermissions = async () => {
  try {
    const location = await Location.requestForegroundPermissionsAsync();
    const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const audio = await Audio.requestPermissionsAsync();

    return {
      location: location.status === 'granted',
      mediaLibrary: media.status === 'granted',
      microphone: audio.status === 'granted',
    };
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return {
      location: false,
      mediaLibrary: false,
      microphone: false,
    };
  }
};

export const openAppSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
};