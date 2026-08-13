import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { openAppSettings } from '../utils/PermissionUtils';

export const useLocationPermission = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      
      if (!granted) {
        Alert.alert(
          'Location Permission',
          'Location permission is needed to share your location in chat.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openAppSettings }
          ]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  useEffect(() => {
    checkPermission();
  }, []);

  return { hasPermission, loading, checkPermission, requestPermission };
};

export const useMediaPermission = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPermission = async () => {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      setHasPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error checking media permission:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      
      if (!granted) {
        Alert.alert(
          'Media Library Permission',
          'Media library permission is needed to upload photos and share images.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openAppSettings }
          ]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting media permission:', error);
      return false;
    }
  };

  useEffect(() => {
    checkPermission();
  }, []);

  return { hasPermission, loading, checkPermission, requestPermission };
};

export const useMicrophonePermission = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPermission = async () => {
    try {
      const { status } = await Audio.getPermissionsAsync();
      setHasPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      
      if (!granted) {
        Alert.alert(
          'Microphone Permission',
          'Microphone permission is needed to record and send voice messages.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openAppSettings }
          ]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  };

  useEffect(() => {
    checkPermission();
  }, []);

  return { hasPermission, loading, checkPermission, requestPermission };
};