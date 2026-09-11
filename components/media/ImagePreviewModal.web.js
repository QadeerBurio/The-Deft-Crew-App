import React from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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