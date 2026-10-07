// app/src/components/GlobalNotificationLayer.js
// FIXED: Handles both foreground push and background/killed app notifications

import React, { useContext, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useNotifications, resetNotificationBaseline } from '../hooks/useNotifications';
import { useNotificationPopup } from '../hooks/useNotificationPopup';
import NotificationBanner from './NotificationBanner';
import { navigationRef } from '../navigation/navigationRef';
import * as Notifications from 'expo-notifications';
import {
  claimNotificationResponse,
  getRouteFromNotificationData,
  navigateWhenReady,
} from '../utils/pushNotifications';

// Long enough that the 10s poller doesn't re-show a push already on screen
const DEDUPE_WINDOW_MS = 2 * 60 * 1000;

// App open → only the TDC in-app popup. Set here (on mount) as well as in
// App.js so it always wins, even if an older App.js handler is still around.
const HIDE_SYSTEM_POPUP = {
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
};

export default function GlobalNotificationLayer() {
  const { token, isGuest, updateUnreadCount } = useContext(AuthContext);
  const appStateRef = useRef(AppState.currentState);

  const {
    bannerVisible,
    currentNotification,
    handleBannerPress,
    dismissBanner,
    addNotification,
  } = useNotificationPopup();

  // ── Deduplication ──
  const seenRef = useRef(new Map());
  const isDuplicate = useCallback((id) => {
    if (!id) return false;
    const now = Date.now();
    const seen = seenRef.current;

    // Clean old entries
    for (const [k, t] of seen) {
      if (now - t > DEDUPE_WINDOW_MS) seen.delete(k);
    }

    if (seen.has(id)) {
      console.log('[GlobalNotificationLayer] Duplicate skipped:', id);
      return true;
    }
    seen.set(id, now);
    return false;
  }, []);

  // Conversations that just got a system push (avoid a 2nd in-app popup
  // when the 10s message poller notices the same message)
  const recentChatPushRef = useRef(new Map());

  // ── Handle new notification from polling ──
  const handleNewNotification = useCallback((notification) => {
    const convId = notification?.conversationId ? String(notification.conversationId) : null;
    if (convId && String(notification?.type).toLowerCase() === 'message') {
      const t = recentChatPushRef.current.get(convId);
      if (t && Date.now() - t < DEDUPE_WINDOW_MS) return;
    }
    if (isDuplicate(notification?._id)) return;
    addNotification(notification);
  }, [addNotification, isDuplicate]);

  // ── Polling hook (works when app is open) ──
  useNotifications(handleNewNotification);

  // ═══════════════════════════════════════════════════════════════
  // FOREGROUND: Listen for push notifications while app is open
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    console.log('[GlobalNotificationLayer] Setting up foreground listener...');
    Notifications.setNotificationHandler(HIDE_SYSTEM_POPUP);

    const sub = Notifications.addNotificationReceivedListener((notification) => {
      // Skip if guest
      if (isGuest) {
        console.log('[GlobalNotificationLayer] Guest - skipping notification');
        return;
      }

      const content = notification?.request?.content || {};
      const data = content.data || {};

      // Only while the app is on screen. Otherwise the phone shows it.
      if (AppState.currentState !== 'active') return;

      // Safety net: if the phone still put it in the tray, remove it,
      // so the user only sees the in-app popup.
      const reqId = notification?.request?.identifier;
      if (reqId) {
        Notifications.dismissNotificationAsync(reqId).catch(() => {});
      }

      // Generate unique ID for deduplication
      const id =
        data.notificationId ||
        `push-${notification?.request?.identifier || Date.now()}`;

      console.log('[GlobalNotificationLayer] Foreground push received:', {
        id,
        title: content.title,
        type: data.type,
        mood: data.mood,
      });

      // App is open: show the TDC in-app popup (the system popup is hidden
      // in App.js). Same title, emoji, mood icon and sound as outside the app.
      if (isDuplicate(id)) return;
      if (data.conversationId) {
        recentChatPushRef.current.set(String(data.conversationId), Date.now());
      }

      addNotification({
        _id: id,
        title: content.title || 'notification',
        description: content.body || '',
        type: data.type || 'System',
        mood: data.mood || 'sorted',
        soundKey: data.soundKey || null,
        iconUrl: data.iconUrl || null,
        link: data.link || null,
        conversationId: data.conversationId || null,
        screenToOpen: data.route || data.screen || null,
        metadata: data,
        createdAt: new Date().toISOString(),
      });

      if (token && typeof updateUnreadCount === 'function') {
        try { updateUnreadCount(token); } catch {}
      }
    });

    return () => {
      console.log('[GlobalNotificationLayer] Removing foreground listener');
      sub.remove();
    };
  }, [isGuest, isDuplicate, addNotification, token, updateUnreadCount]);

  // ═══════════════════════════════════════════════════════════════
  // BACKGROUND TAP: Handle notification tap (app was background/killed)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    console.log('[GlobalNotificationLayer] Setting up tap listener...');

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const content = response?.notification?.request?.content || {};
      const data = content.data || {};
      
      console.log('[GlobalNotificationLayer] Notification tapped:', {
        title: content.title,
        data,
      });

      if (!claimNotificationResponse(response)) return;

      const { route, params } = getRouteFromNotificationData(data);
      navigateWhenReady(navigationRef, route, params);
    });

    return () => {
      console.log('[GlobalNotificationLayer] Removing tap listener');
      sub.remove();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // APP STATE: Reset baseline when app comes to foreground
  // This catches notifications that arrived while app was in background
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      // App returned to foreground
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[GlobalNotificationLayer] App foregrounded - resetting baseline');
        
        // Reset the polling baseline so we catch any missed notifications
        if (token && !isGuest) {
          resetNotificationBaseline();
        }
      }
    });

    return () => subscription.remove();
  }, [token, isGuest]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <NotificationBanner
      visible={bannerVisible && !!token && !isGuest}
      notification={currentNotification}
      onPress={handleBannerPress}
      onDismiss={dismissBanner}
    />
  );
}