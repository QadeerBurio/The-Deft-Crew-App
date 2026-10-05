// app/src/components/NotificationBanner.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMoodMeta } from '../utils/notificationIcon';
import { navigationRef } from '../navigation/navigationRef';

const NotificationBanner = ({
  visible,
  notification,
  onPress,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const autoDismissTimer = useRef(null);

  useEffect(() => {
    if (visible && notification) {
      translateY.setValue(-150);
      opacity.setValue(0);
      scale.setValue(0.96);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0, friction: 8, tension: 50, useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1, duration: 250, useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1, friction: 6, tension: 60, useNativeDriver: true,
        }),
      ]).start();

      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, 4500);
    } else {
      translateY.setValue(-150);
      opacity.setValue(0);
      scale.setValue(0.96);
    }

    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, [visible, notification]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150, duration: 200, useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss && onDismiss();
    });
  };

  // ✅ Navigate on press using metadata.screen + params
  const handleCardPress = () => {
  const n = notification;
  const data = n?.data || {};
  const meta = n?.metadata || data;

  const route =
    n?.screenToOpen || meta?.screen || meta?.route || data?.screen || null;

  const params = {
    ...(meta?.params || data?.params || {}),
    ...(meta?.offerId ? { offerId: meta.offerId } : {}),
    ...(meta?.listingId ? { listingId: meta.listingId } : {}),
    ...(meta?.matchId ? { matchId: meta.matchId } : {}),
    ...(meta?.conversationId ? { conversationId: meta.conversationId } : {}),
    ...(n?.conversationId ? { conversationId: n.conversationId } : {}),
  };

  if (route && navigationRef?.isReady?.()) {
    try {
      navigationRef.navigate(route, params);
      console.log('[Banner] navigated →', route, params);
    } catch (e) {
      console.warn('[Banner] nav failed:', e.message);
    }
  }

  onPress && onPress(n);
};

  if (!visible || !notification) return null;

  const mood =
    notification.mood ||
    notification.data?.mood ||
    notification.request?.content?.data?.mood ||
    'sorted';

  const { icon, emoji, color } = getMoodMeta(mood);

  const remoteIcon =
    notification.iconUrl ||
    notification.data?.iconUrl ||
    notification.request?.content?.data?.iconUrl ||
    null;

  const iconSource = icon || (remoteIcon ? { uri: remoteIcon } : null);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + (Platform.OS === 'ios' ? 8 : 16),
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={handleCardPress}
      >
        <View
          style={[
            styles.iconBox,
            { backgroundColor: '#000', borderColor: '#000' },
          ]}
        >
          {iconSource ? (
            <Image source={iconSource} style={styles.iconImage} resizeMode="contain" />
          ) : (
            <Text style={styles.emoji} allowFontScaling={false}>{emoji}</Text>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title || 'New Notification'}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {notification.description || notification.body || ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ══════ styles unchanged ══════
const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: 12, right: 12, zIndex: 9999, elevation: 20,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 16, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  iconBox: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, overflow: 'hidden', borderWidth: 1.5,
  },
  iconImage: { width: 34, height: 34 },
  emoji: {
    fontSize: 26, lineHeight: 30, textAlign: 'center', includeFontPadding: false,
  },
  content: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2,
  },
  description: { fontSize: 12, color: '#666', lineHeight: 16 },
  closeBtn: { padding: 4, marginLeft: 8 },
});

export default NotificationBanner;