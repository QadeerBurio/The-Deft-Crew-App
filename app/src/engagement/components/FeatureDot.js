// app/src/engagement/components/FeatureDot.js
// The tiny mood-face dot that sits on each Home feature icon.
// Per addendum #1: shows the feature's problem mood, or 'sorted' once done.

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MOOD_IMAGES, YELLOW_DOT, moodForFeature } from '../utils/mood';

const SIZE = 18; // visible face size (looks right at 12–20 on a 44px icon)

export default function FeatureDot({ missionKey, sorted = false }) {
  const mood = moodForFeature(missionKey, sorted);
  const source = MOOD_IMAGES[mood] || YELLOW_DOT;

  return (
    <View style={styles.wrap}>
      <Image source={source} style={styles.img} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: SIZE + 4,
    height: SIZE + 4,
    borderRadius: (SIZE + 4) / 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  img: {
    width: SIZE,
    height: SIZE,
  },
});