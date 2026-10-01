// app/src/engagement/components/Dot.js
// Mood dot backed by real PNG assets. Falls back to a colored circle
// if the asset is missing or the mood is unknown.

import React, { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MOOD_IMAGES, getMoodColor, YELLOW_DOT } from '../utils/mood';

export default function Dot({ mood = 'sorted', size = 72, animated = false }) {
  const source = useMemo(() => {
    const img = MOOD_IMAGES[mood];
    if (img) return img;
    // Fallback: yellow dot
    return YELLOW_DOT;
  }, [mood]);

  // If we have a real asset, render it.
  if (source) {
    return (
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }

  // Last-resort fallback: colored circle
  const color = getMoodColor(mood);
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});