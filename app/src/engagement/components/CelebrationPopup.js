// app/src/engagement/components/CelebrationPopup.js
// Clean black card. Single popup. Auto-closes, then triggers onClosed.

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  StatusBar,
} from 'react-native';
import Dot from './Dot';
import { pop, success as hapticSuccess } from '../utils/haptics';
import { colors } from '../../theme';

const GOLD = colors.yellow;
const BLACK = '#0f0f0f';
const WHITE = '#ffffff';
const MUTED = '#8b8b8b';

const AUTO_CLOSE_MS = 3000;

export default function CelebrationPopup({ popup, onClose, onNotNow, onClosed }) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const firedRef = useRef(false);
  const timerRef = useRef(null);
  const shownIdRef = useRef(null); // 👈 guards against double-show

  // Stable close handler (defined BEFORE the effect)
  const handleClose = useCallback(
    (fn) => {
      if (firedRef.current) return;
      firedRef.current = true;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.92,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        try {
          fn?.();
          onClosed?.(); // fires ONLY after popup fully hidden
        } catch (e) {
          console.log('[CelebrationPopup] close error:', e?.message);
        }
      });
    },
    [onClosed, scale, opacity]
  );

  useEffect(() => {
    if (!popup) return;

    // ✅ Only animate ONCE per popup identity
    const id = popup.id ?? popup.line ?? 'default';
    if (shownIdRef.current === id) return;
    shownIdRef.current = id;

    firedRef.current = false;
    scale.setValue(0.92);
    opacity.setValue(0);
    hapticSuccess();

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-close after delay
    timerRef.current = setTimeout(() => {
      handleClose(onNotNow || onClose);
    }, AUTO_CLOSE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [popup, handleClose, onNotNow, onClose, scale, opacity]);

  if (!popup) return null;

  const handleCta = () => {
    pop();
    handleClose(onClose);
  };

  const handleNotNow = () => {
    handleClose(onNotNow || onClose);
  };

  const handleBackdrop = () => {
    handleClose(onNotNow || onClose);
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={handleBackdrop}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" />
      <Pressable style={styles.backdrop} onPress={handleBackdrop}>
        <Animated.View
          style={[styles.card, { opacity, transform: [{ scale }] }]}
          onStartShouldSetResponder={() => true}
        >
          <Dot mood={popup.mood || 'sorted'} size={110} />

          <Text style={styles.line}>{popup.line || 'sorted.'}</Text>

          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={handleCta}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{popup.cta?.label || 'ok'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notNowBtn}
            onPress={handleNotNow}
            activeOpacity={0.7}
          >
            <Text style={styles.notNowText}>not now</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: BLACK,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(249,195,73,0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  line: {
    fontSize: 16,
    fontWeight: '800',
    color: WHITE,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  ctaBtn: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  notNowBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  notNowText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
});