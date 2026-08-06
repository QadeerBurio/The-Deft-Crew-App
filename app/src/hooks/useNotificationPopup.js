// hooks/useNotificationPopup.js
import { useState, useCallback, useEffect, useContext } from 'react';
import { Vibration, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export const useNotificationPopup = () => {
  const { token, updateUnreadCount } = useContext(AuthContext);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Show a notification banner
  const showNotificationBanner = useCallback((notification) => {
    // Add to pending queue if already showing
    if (bannerVisible) {
      setPendingNotifications(prev => [...prev, notification]);
      return;
    }

    setCurrentNotification(notification);
    setBannerVisible(true);

    // Vibrate on notification
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Vibration.vibrate(Platform.OS === 'android' ? [0, 200, 100, 200] : 200);
    }

    // Update unread count
    if (token) {
      updateUnreadCount(token);
    }
  }, [bannerVisible, token, updateUnreadCount]);

  // Dismiss the current banner
  const dismissBanner = useCallback(() => {
    setBannerVisible(false);
    setCurrentNotification(null);
    
    // Process next notification in queue
    if (pendingNotifications.length > 0) {
      setTimeout(() => {
        const next = pendingNotifications[0];
        setPendingNotifications(prev => prev.slice(1));
        showNotificationBanner(next);
      }, 300);
    }
  }, [pendingNotifications, showNotificationBanner]);

  // Handle banner press (navigate to notification)
  const handleBannerPress = useCallback((notification) => {
    // Navigate to notification detail or relevant screen
    if (notification?.link) {
      // Navigate to the link
      console.log('Navigate to:', notification.link);
    }
    
    // Mark as read if possible
    if (notification?._id && token) {
      // Mark as read logic here
    }
    
    dismissBanner();
  }, [token, dismissBanner]);

  // Add notification to queue
  const addNotification = useCallback((notification) => {
    // Format notification
    const formattedNotif = {
      _id: notification._id || Date.now().toString(),
      title: notification.title || 'New Notification',
      description: notification.description || notification.body || '',
      type: notification.type || 'System',
      time: notification.time || 'Just now',
      link: notification.link || null,
      createdAt: notification.createdAt || new Date().toISOString(),
      isRead: false,
    };
    
    showNotificationBanner(formattedNotif);
  }, [showNotificationBanner]);

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