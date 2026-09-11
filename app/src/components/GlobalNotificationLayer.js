// app/src/components/GlobalNotificationLayer.js

import React, { useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useNotificationPopup } from '../hooks/useNotificationPopup';
import NotificationBanner from './NotificationBanner';

export default function GlobalNotificationLayer() {
  const { token, isGuest } = useContext(AuthContext);

  const {
    bannerVisible,
    currentNotification,
    handleBannerPress,
    dismissBanner,
    addNotification,
  } = useNotificationPopup();

  const handleNewNotification = useCallback((notification) => {
    console.log('[GlobalNotificationLayer] Triggering banner for:', notification.title);
    addNotification(notification);
  }, [addNotification]);

  useNotifications(handleNewNotification);

  console.log('[GlobalNotificationLayer] mounted. token:', !!token, 'isGuest:', isGuest, 'bannerVisible:', bannerVisible);

  if (!token || isGuest) return null;

  return (
    <NotificationBanner
      visible={bannerVisible}
      notification={currentNotification}
      onPress={handleBannerPress}
      onDismiss={dismissBanner}
    />
  );
}