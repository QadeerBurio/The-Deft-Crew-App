// app/src/engagement/components/FullySortedCelebration.js
// Full-screen once. Same idea as CelebrationPopup but fullscreen.

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Dot from './Dot';
import { success as hapticSuccess } from '../utils/haptics';

const GOLD = '#f9c349';
const DARK = '#1a1a1a';

export default function FullySortedCelebration({ popup, onClose }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!popup) return;
    hapticSuccess();
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [popup]);

  if (!popup) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.wrap}>
        <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
          <Dot mood="excited" size={180} />
          <Text style={styles.title}>all 8.</Text>
          <Text style={styles.sub}>fully sorted.</Text>

          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>see rewards</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: DARK,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    marginTop: 20,
    letterSpacing: -1,
  },
  sub: {
    fontSize: 18,
    color: GOLD,
    marginTop: 4,
    fontWeight: '700',
  },
  btn: {
    marginTop: 32,
    backgroundColor: GOLD,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK,
    letterSpacing: 0.3,
  },
});