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

const DEDUPE_WINDOW_MS = 8000;

export default function GlobalNotificationLayer() {
  const { token, isGuest } = useContext(AuthContext);
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

  // ── Handle new notification from polling ──
  const handleNewNotification = useCallback((notification) => {
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

    const sub = Notifications.addNotificationReceivedListener((notification) => {
      // Skip if guest
      if (isGuest) {
        console.log('[GlobalNotificationLayer] Guest - skipping notification');
        return;
      }

      const content = notification?.request?.content || {};
      const data = content.data || {};
      
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

      // Check for duplicate
      if (isDuplicate(id)) {
        console.log('[GlobalNotificationLayer] Duplicate push - skipping');
        return;
      }
// Play sound
try {
  const { playSoundForNotification } = require('../lib/tdcSounds');
  playSoundForNotification(data.type, data.mood);
} catch (e) {
  console.log('[GlobalNotificationLayer] sound error:', e.message);
}

// Add to banner queue
addNotification({
  _id: id,
  title: content.title || 'notification',
  description: content.body || '',
  type: data.type || 'System',
  mood: data.mood || 'sorted',
  iconUrl: data.iconUrl || null,
  link: data.link || null,
  screenToOpen: data.screen || data.route || null,
  metadata: data,
  createdAt: new Date().toISOString(),
});
    });

    return () => {
      console.log('[GlobalNotificationLayer] Removing foreground listener');
      sub.remove();
    };
  }, [addNotification, isGuest, isDuplicate]);

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

      // Build route params
      const route = data.route || data.screen;
      const params = {
        ...(data.params || {}),
        ...(data.offerId ? { offerId: data.offerId } : {}),
        ...(data.listingId ? { listingId: data.listingId, id: data.listingId } : {}),
        ...(data.matchId ? { matchId: data.matchId } : {}),
        ...(data.conversationId ? { conversationId: data.conversationId } : {}),
        ...(data.postId ? { postId: data.postId } : {}),
      };

      if (route && navigationRef?.current?.isReady?.()) {
        try {
          navigationRef.current.navigate(route, params);
          console.log('[GlobalNotificationLayer] Navigated to:', route, params);
        } catch (e) {
          console.warn('[GlobalNotificationLayer] Nav failed:', e.message);
        }
      } else {
        console.log('[GlobalNotificationLayer] Nav not ready, route:', route);
      }
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