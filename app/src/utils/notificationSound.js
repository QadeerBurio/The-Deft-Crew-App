// utils/notificationSound.js
import { Audio } from 'expo-av';

let soundObject = null;

export const playNotificationSound = async () => {
  try {
    if (soundObject) {
      await soundObject.unloadAsync();
    }
    
    // Create a simple beep sound using Audio API
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/notification.wav'), // Add your sound file
      { shouldPlay: true }
    );
    
    soundObject = sound;
    return sound;
  } catch (error) {
    console.log('Error playing notification sound:', error);
    return null;
  }
};

export const playDefaultSound = async () => {
  try {
    // Use a simpler approach - just vibrate if sound fails
    const { Sound } = require('expo-av');
    const { sound } = await Sound.createAsync(
      require('../assets/sounds/notification.wav'),
      { shouldPlay: true }
    );
    return sound;
  } catch (error) {
    console.log('Sound play error:', error);
    return null;
  }
};

export const cleanupSound = async () => {
  if (soundObject) {
    await soundObject.unloadAsync();
    soundObject = null;
  }
};