// app/src/engagement/components/BadgePip.js
// Tiny 12px mood dot next to a name.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Dot from './Dot';

export default function BadgePip({ mood = 'sorted' }) {
  return (
    <View style={styles.wrap}>
      <Dot mood={mood} size={12} animated={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginLeft: 6 },
});