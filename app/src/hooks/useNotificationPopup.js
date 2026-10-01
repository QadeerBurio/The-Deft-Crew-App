// hooks/useNotificationPopup.js
import { useState, useCallback, useContext } from 'react';
import { Vibration, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export const useNotificationPopup = () => {
  const { token, updateUnreadCount } = useContext(AuthContext);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [pendingNotifications, setPendingNotifications] = useState([]);

  const showNotificationBanner = useCallback(
    (notification) => {
      if (bannerVisible) {
        setPendingNotifications((prev) => [...prev, notification]);
        return;
      }

      setCurrentNotification(notification);
      setBannerVisible(true);

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Vibration.vibrate(
          Platform.OS === 'android' ? [0, 200, 100, 200] : 200
        );
      }

      if (token && updateUnreadCount) {
        updateUnreadCount(token);
      }
    },
    [bannerVisible, token, updateUnreadCount]
  );

  const dismissBanner = useCallback(() => {
    setBannerVisible(false);
    setCurrentNotification(null);

    if (pendingNotifications.length > 0) {
      setTimeout(() => {
        const next = pendingNotifications[0];
        setPendingNotifications((prev) => prev.slice(1));
        showNotificationBanner(next);
      }, 400);
    }
  }, [pendingNotifications, showNotificationBanner]);

  const handleBannerPress = useCallback(
    (notification) => {
      console.log('[useNotificationPopup] pressed:', notification?.title);
      dismissBanner();
    },
    [dismissBanner]
  );

  // ✅ Normalize push + poll notifications identically
  const addNotification = useCallback(
    (notification) => {
      const data = notification.data || {};

      const formattedNotif = {
        _id: notification._id || `local-${Date.now()}`,
        title: notification.title || 'New Notification',
        description: notification.description || notification.body || '',
        type: notification.type || 'System',
        mood:
          notification.mood ||
          data.mood ||
          notification.request?.content?.data?.mood ||
          'sorted',
        iconUrl:
          notification.iconUrl ||
          data.iconUrl ||
          notification.request?.content?.data?.iconUrl ||
          null,
        time: notification.time || 'Just now',
        link: notification.link || data.link || null,
        conversationId:
          notification.conversationId || data.conversationId || null,
        screenToOpen:
          notification.screenToOpen ||
          data.screen ||
          data.route ||
          null,
        metadata: notification.metadata || data,
        createdAt: notification.createdAt || new Date().toISOString(),
        isRead: false,
      };

      showNotificationBanner(formattedNotif);
    },
    [showNotificationBanner]
  );

  return {
    bannerVisible,
    currentNotification,
    pendingNotifications,
    showNotificationBanner,
    dismissBanner,
    handleBannerPress,
    addNotification,
  };
};