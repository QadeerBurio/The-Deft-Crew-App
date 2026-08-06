// hooks/useNotifications.js - Complete Notification Hook
import { useState, useEffect, useContext, useCallback } from 'react';
import { Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export const useNotifications = () => {
  const { token, updateUnreadCount } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = 'https://the-deft-crew-production.up.railway.app';

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(
        `${API_URL}/api/notification/unread-count`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnreadCount(response.data.count || 0);
      return response.data.count || 0;
    } catch (error) {
      console.error('Fetch unread count error:', error);
      return 0;
    }
  }, [token]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!token) return false;
    try {
      await axios.patch(
        `${API_URL}/api/notification/mark-read/${notificationId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchUnreadCount();
      return true;
    } catch (error) {
      console.error('Mark as read error:', error);
      return false;
    }
  }, [token, fetchUnreadCount]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!token) return false;
    try {
      await axios.put(
        `${API_URL}/api/notification/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnreadCount(0);
      return true;
    } catch (error) {
      console.error('Mark all as read error:', error);
      return false;
    }
  }, [token]);

  // Send push notification
  const sendPushNotification = useCallback(async (userId, title, body, data = {}) => {
    if (!token) return false;
    try {
      await axios.post(
        `${API_URL}/api/notification/send-push`,
        { userId, title, body, data },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (error) {
      console.error('Send push notification error:', error);
      return false;
    }
  }, [token]);

  // Create notification (in-app)
  const createNotification = useCallback(async (recipientId, title, description, type, sendPush = true) => {
    if (!token) return null;
    try {
      const response = await axios.post(
        `${API_URL}/api/notification/create`,
        { recipientId, title, description, type, sendPush },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.notification;
    } catch (error) {
      console.error('Create notification error:', error);
      return null;
    }
  }, [token]);

  // Handle notification tap
  const handleNotificationTap = useCallback((notification) => {
    console.log('Notification tapped:', notification);
    
    // Mark as read
    if (notification._id) {
      markAsRead(notification._id);
    }
    
    // Get navigation data from notification
    const data = notification.data || {};
    
    // Handle different notification types
    switch (notification.type) {
      case 'Offers':
        // Navigate to Offers screen
        console.log('Navigate to Offers');
        break;
      case 'Jobs':
        // Navigate to Jobs screen
        console.log('Navigate to Jobs');
        break;
      case 'Event':
        // Navigate to Events screen
        console.log('Navigate to Events');
        break;
      default:
        // Default navigation
        console.log('Navigate to Notifications');
        break;
    }
  }, [markAsRead]);

  // Setup notification listeners
  useEffect(() => {
    // Handle foreground notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received in foreground:', notification);
        setLatestNotification(notification);
        fetchUnreadCount();
      }
    );

    // Handle notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notification tapped:', response);
        const notification = response.notification.request.content;
        const data = notification.data || {};
        
        // Mark as read
        if (data.notificationId) {
          markAsRead(data.notificationId);
        }
        
        // Navigate based on data
        if (data.screen) {
          console.log('Navigate to:', data.screen);
        }
      }
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [fetchUnreadCount, markAsRead]);

  // Update unread count on app state change
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchUnreadCount();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [fetchUnreadCount]);

  // Initial fetch
  useEffect(() => {
    if (token) {
      fetchUnreadCount();
    }
  }, [token, fetchUnreadCount]);

  return {
    unreadCount,
    latestNotification,
    isLoading,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    sendPushNotification,
    createNotification,
    handleNotificationTap,
  };
};