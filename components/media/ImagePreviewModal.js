import React from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// This bare (no platform-suffix) file exists only to satisfy expo-router's
// route scanner, which requires a fallback sibling for any .native.js/.web.js
// pair inside the app/ directory. It is never actually imported at runtime —
// Metro's platform extension resolution always prefers ImagePreviewModal.native.js
// on iOS/Android and ImagePreviewModal.web.js on web over this bare file.
export default function ImagePreviewModal({ visible, images, onRequestClose }) {
  const uri = images?.[0]?.uri;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeBtn} onPress={onRequestClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {uri && <Image source={{ uri }} style={styles.image} resizeMode="contain" />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  image: { width: '90%', height: '80%' },
});