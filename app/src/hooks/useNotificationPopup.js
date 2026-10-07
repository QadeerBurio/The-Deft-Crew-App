// hooks/useNotificationPopup.js
import { useState, useCallback, useContext } from 'react';
import { Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { playSound } from '../lib/soundManager';
import { styleNotification } from '../utils/notificationStyle';
import { navigationRef } from '../navigation/navigationRef';

export const useNotificationPopup = () => {
  const { token, updateUnreadCount } = useContext(AuthContext);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [pendingNotifications, setPendingNotifications] = useState([]);

  const showNotificationBanner = useCallback(
    (raw) => {
      const notification = styleNotification(raw || {});

      // Queue it; the sound plays when it's actually shown
      if (bannerVisible) {
        setPendingNotifications((prev) => [...prev, notification]);
        return;
      }

      // Same sound file the push uses outside the app
      try {
        playSound(notification?.soundKey || 'tdc_push_default');
      } catch (e) {
        console.log('[useNotificationPopup] sound error:', e?.message);
      }

      setCurrentNotification(notification);
      setBannerVisible(true);

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

  // ✅ Navigate on tap — this is the missing piece for deep-linking
  const handleBannerPress = useCallback(
    (notification) => {
      const n = notification || currentNotification;
      if (!n) return dismissBanner();

      const data = n.metadata || n.data || {};
      const route =
        n.screenToOpen ||
        data.screen ||
        data.route ||
        n.metadata?.screen ||
        null;

      const params = {
        ...(data.params || n.metadata?.params || {}),
        ...(data.offerId ? { offerId: data.offerId } : {}),
        ...(data.listingId ? { listingId: data.listingId, id: data.listingId } : {}),
        ...(data.matchId ? { matchId: data.matchId } : {}),
        ...(data.conversationId ? { conversationId: data.conversationId } : {}),
        ...(data.postId ? { postId: data.postId } : {}),
        ...(data.userId ? { userId: data.userId } : {}),
      };

      dismissBanner();

      if (route && navigationRef?.isReady?.()) {
        setTimeout(() => {
          try {
            navigationRef.navigate(route, params);
            console.log('[useNotificationPopup] navigated →', route, params);
          } catch (e) {
            console.warn('[useNotificationPopup] nav failed:', e.message);
          }
        }, 250);
      }
    },
    [currentNotification, dismissBanner]
  );

  const addNotification = useCallback(
    (notification) => {
      const data = notification.data || {};
      const formattedNotif = {
        _id: notification._id || `local-${Date.now()}`,
        title: notification.title || 'New Notification',
        description: notification.description || notification.body || '',
        type: notification.type || 'System',
        soundKey: notification.soundKey || data.soundKey || null,
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
          notification.screenToOpen || data.screen || data.route || null,
        metadata: notification.metadata || data,
        createdAt: notification.createdAt || new Date().toISOString(),
        isRead: false,
      };
      showNotificationBanner(styleNotification(formattedNotif));
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