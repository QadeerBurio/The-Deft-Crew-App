// app/src/screens/Events/EventNotification.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EventNotification() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Event notifications coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  text: { fontSize: 15, color: '#8E8E93', textAlign: 'center' },
});