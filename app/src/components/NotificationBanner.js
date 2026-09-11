// components/NotificationBanner.js
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const getIconName = (type) => {
  switch (type) {
    case 'Offers':
    case 'Offer':
      return 'gift-outline';
    case 'Brand':
      return 'pricetag-outline';
    case 'System':
      return 'settings-outline';
    case 'Job Application':
      return 'briefcase-outline';
    case 'Application Status':
      return 'checkmark-circle-outline';
    case 'Interview':
      return 'calendar-outline';
    default:
      return 'notifications-outline';
  }
};

const NotificationBanner = ({ visible, notification, onPress, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const autoDismissTimer = useRef(null);

  useEffect(() => {
    if (visible && notification) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 4.5s
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, 4500);
    } else {
      translateY.setValue(-150);
      opacity.setValue(0);
    }

    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, [visible, notification]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss && onDismiss();
    });
  };

  if (!visible || !notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + (Platform.OS === 'ios' ? 8 : 16),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => {
          onPress && onPress(notification);
        }}
      >
        <LinearGradient colors={['#f9c34920', '#f9c34908']} style={styles.iconBox}>
          <Ionicons name={getIconName(notification.type)} size={22} color="#f9c349" />
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {notification.description}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});

export default NotificationBanner;