// The-Deft-Crew-App/app/src/hooks/useNotifications.js

import {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';

import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

import { AuthContext } from '../context/AuthContext';
import { BASE_URL } from '../api/api';

const POLL_INTERVAL_MS = 10000; // 10 seconds while debugging

export const useNotifications = (onNewNotification) => {
  // --------------------------------------------------
  // React Hooks MUST be inside the custom hook
  // --------------------------------------------------

  const { token, isGuest, user } = useContext(AuthContext);

  const [unreadCount, setUnreadCount] = useState(0);

  const pollIntervalRef = useRef(null);

  // Track the latest notification we have already seen.
  const lastSeenIdRef = useRef(null);

  // Prevent the first poll from triggering a notification.
  const isFirstPollRef = useRef(true);

  // --------------------------------------------------
  // Fetch unread count
  // --------------------------------------------------

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return 0;

    try {
      const response = await axios.get(
        `${BASE_URL}/notification/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const count = response.data.count || 0;

      setUnreadCount(count);

      return count;
    } catch (error) {
      console.log(
        '[useNotifications] unread-count error:',
        error.message
      );

      return 0;
    }
  }, [token]);

  // --------------------------------------------------
  // Fire local notification
  // --------------------------------------------------

  const fireLocalAlert = useCallback(async (notification) => {
    try {
      console.log(
        '[useNotifications] Firing local alert for:',
        notification.title
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'New Notification',
          body: notification.description || '',
          sound: true,
          data: {
            notificationId: notification._id,
            link: notification.link || null,
          },
        },

        trigger: null,
      });
    } catch (err) {
      console.log(
        '[useNotifications] fireLocalAlert error:',
        err.message
      );
    }
  }, []);

  // --------------------------------------------------
  // Poll for new notifications
  // --------------------------------------------------

  const pollForNewNotifications = useCallback(async () => {
    if (!token || isGuest) {
      return;
    }

    try {
      const [mainRes, socialRes] = await Promise.all([
        axios.get(
          `${BASE_URL}/notification/my-notifications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),

        axios
          .get(
            `${BASE_URL}/social/notifications`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
          .catch(() => ({
            data: [],
          })),
      ]);

      // --------------------------------------------------
      // Main notifications
      // --------------------------------------------------

      const mainDocs = Array.isArray(mainRes.data)
        ? mainRes.data
        : [];

      // --------------------------------------------------
      // Social notifications
      // --------------------------------------------------

      const socialDocs = Array.isArray(socialRes.data)
        ? socialRes.data
        : [];

      const userId = user?._id?.toString() || '';

      const normalizedSocial = socialDocs.map((n) => ({
        _id: n._id,

        title:
          n.type === 'like'
            ? '❤️ New Like'
            : n.type === 'comment'
            ? '💬 New Comment'
            : n.type === 'connection_accepted'
            ? '🎉 Connection Accepted'
            : n.type === 'request_declined'
            ? 'Request Declined'
            : n.type === 'request'
            ? '👤 Connection Request'
            : 'Notification',

        description: n.text,

        type: 'Social',

        createdAt: n.createdAt,

        isRead: userId
          ? (n.readBy || []).some(
              (id) => id.toString() === userId
            )
          : false,

        link: n.postId
          ? `/post/${n.postId}`
          : '',
      }));

      // --------------------------------------------------
      // Merge + sort notifications
      // --------------------------------------------------

      const merged = [
        ...mainDocs,
        ...normalizedSocial,
      ].sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );

      if (merged.length === 0) {
        return;
      }

      const latest = merged[0];

      console.log(
        '[useNotifications] latest:',
        latest._id,
        '| lastSeen:',
        lastSeenIdRef.current,
        '| firstPoll:',
        isFirstPollRef.current
      );

      // --------------------------------------------------
      // First poll
      // --------------------------------------------------

      // IMPORTANT:
      // The first poll should establish the baseline.
      // Otherwise the newest existing notification would
      // immediately trigger a notification when the app starts.
      if (isFirstPollRef.current) {
        lastSeenIdRef.current = latest._id;

        isFirstPollRef.current = false;

        console.log(
          '[useNotifications] First poll — baseline established:',
          latest._id
        );

        return;
      }

      // --------------------------------------------------
      // Detect new notification
      // --------------------------------------------------

      if (
        latest._id &&
        latest._id !== lastSeenIdRef.current
      ) {
        console.log(
          '[useNotifications] NEW notification detected:',
          latest.title
        );

        // Update the last seen ID FIRST.
        // This prevents duplicate alerts from the next poll.
        lastSeenIdRef.current = latest._id;

        // Update unread count.
        await fetchUnreadCount();

        // Fire local notification.
        await fireLocalAlert(latest);

        // Notify UI / GlobalNotificationLayer if callback exists.
        if (onNewNotification) {
          onNewNotification(latest);
        }
      }
    } catch (error) {
      console.log(
        '[useNotifications] poll error:',
        error.message
      );
    }
  }, [
    token,
    isGuest,
    user,
    onNewNotification,
    fetchUnreadCount,
    fireLocalAlert,
  ]);

  // --------------------------------------------------
  // Mark one notification as read
  // --------------------------------------------------

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!token) return false;

      try {
        await axios.patch(
          `${BASE_URL}/notification/mark-read/${notificationId}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        await fetchUnreadCount();

        return true;
      } catch (error) {
        console.log(
          '[useNotifications] markAsRead error:',
          error.message
        );

        return false;
      }
    },
    [token, fetchUnreadCount]
  );

  // --------------------------------------------------
  // Mark all notifications as read
  // --------------------------------------------------

  const markAllAsRead = useCallback(async () => {
    if (!token) return false;

    try {
      await axios.put(
        `${BASE_URL}/notification/mark-all-read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUnreadCount(0);

      return true;
    } catch (error) {
      console.log(
        '[useNotifications] markAllAsRead error:',
        error.message
      );

      return false;
    }
  }, [token]);

  // --------------------------------------------------
  // Start / stop polling
  // --------------------------------------------------

  useEffect(() => {
    if (!token || isGuest) {
      console.log(
        '[useNotifications] polling disabled — token:',
        !!token,
        'isGuest:',
        isGuest
      );

      return;
    }

    console.log(
      '[useNotifications] polling STARTED'
    );

    // Poll immediately.
    pollForNewNotifications();

    // Then poll every 10 seconds.
    pollIntervalRef.current = setInterval(
      pollForNewNotifications,
      POLL_INTERVAL_MS
    );

    return () => {
      console.log(
        '[useNotifications] polling STOPPED'
      );

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = null;
      }
    };
  }, [
    token,
    isGuest,
    pollForNewNotifications,
  ]);

  // --------------------------------------------------
  // When app comes back to foreground
  // --------------------------------------------------

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        (nextAppState) => {
          if (
            nextAppState === 'active' &&
            token &&
            !isGuest
          ) {
            console.log(
              '[useNotifications] App became active'
            );

            fetchUnreadCount();

            pollForNewNotifications();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [
    token,
    isGuest,
    fetchUnreadCount,
    pollForNewNotifications,
  ]);

  // --------------------------------------------------
  // Initial unread count
  // --------------------------------------------------

  useEffect(() => {
    if (token && !isGuest) {
      fetchUnreadCount();
    }
  }, [
    token,
    isGuest,
    fetchUnreadCount,
  ]);

  // --------------------------------------------------
  // Reset notification tracking when user logs out
  // --------------------------------------------------

  useEffect(() => {
    if (!token || isGuest) {
      lastSeenIdRef.current = null;
      isFirstPollRef.current = true;
    }
  }, [token, isGuest]);

  // --------------------------------------------------
  // Return hook API
  // --------------------------------------------------

  return {
    unreadCount,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
};


export const resetNotificationBaseline = () => {
  globalLastSeenId = null;
  globalIsFirstPoll = true;
};