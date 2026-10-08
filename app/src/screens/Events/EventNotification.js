// app/src/screens/Events/EventNotification.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { color as T, font as F } from "../../theme/tokens";
export default function EventNotification() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>event notifications coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  text: { fontSize: 15, fontFamily: F.body, color: T.textMuted, textAlign: 'center' },
});