// components/SafeAreaWrapper.js
import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SafeAreaWrapper({ 
  children, 
  style, 
  backgroundColor = '#fff',
  statusBarStyle = 'dark-content' 
}) {
  // Get status bar height for Android
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar 
        barStyle={statusBarStyle} 
        backgroundColor="transparent"
        translucent={true}
      />
      <SafeAreaView 
        style={[
          styles.safeArea,
          // Add extra padding for Android devices with small status bars
          Platform.OS === 'android' && statusBarHeight < 20 && styles.smallAndroid,
          style
        ]}
        edges={['top', 'bottom']}
      >
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  smallAndroid: {
    paddingTop: 4,
  },
});