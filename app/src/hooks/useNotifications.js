// app/src/hooks/useNotifications.js
// FIXED: Better baseline reset for catching missed notifications

import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import axios from 'axios';

import { AuthContext } from '../context/AuthContext';
import { BASE_URL } from '../api/api';
import { SOCIAL_TITLES } from '../utils/notificationStyle';

const POLL_INTERVAL_MS = 10000;
// Only pop up things that just happened while the app is open. Anything older
// was already shown by the phone (outside the app), so don't show it twice.
const FRESH_MS = 30000;
const isFresh = (date) => !date || Date.now() - new Date(date).getTime() < FRESH_MS;
const appIsActive = () => AppState.currentState === 'active';
const activeResetters = new Set();

// ✅ Export function to reset all active pollers
export const resetNotificationBaseline = () => {
  console.log('[useNotifications] Resetting baseline for', activeResetters.size, 'pollers');
  activeResetters.forEach((reset) => {
    try { 
      reset(); 
    } catch (e) { 
      console.warn('[useNotifications] Reset failed:', e.message);
    }
  });
};

export const useNotifications = (onNewNotification) => {
  const { token, isGuest, user } = useContext(AuthContext);

  const [unreadCount, setUnreadCount] = useState(0);

  const pollIntervalRef = useRef(null);
  const lastSeenIdRef = useRef(null);
  const isFirstPollRef = useRef(true);
  const lastNotifiedMessageTimeRef = useRef(null);

  // ✅ Reset baseline - call this when app foregrounds
  const resetBaseline = useCallback(() => {
    console.log('[useNotifications] Baseline reset called');
    lastSeenIdRef.current = null;
    isFirstPollRef.current = true;
    lastNotifiedMessageTimeRef.current = null;
  }, []);

  // Register this resetter
  useEffect(() => {
    activeResetters.add(resetBaseline);
    return () => { 
      activeResetters.delete(resetBaseline); 
    };
  }, [resetBaseline]);

  // ── Fetch unread count ──
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return 0;
    try {
      const response = await axios.get(
        `${BASE_URL}/notification/unread-count`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const count = response.data.count || 0;
      setUnreadCount(count);
      return count;
    } catch (error) {
      return 0;
    }
  }, [token]);

  // ── Poll chat messages ──
  const pollForNewMessages = useCallback(async () => {
    if (!token || isGuest) return;
    try {
      const res = await axios.get(`${BASE_URL}/social/inbox`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const conversations = Array.isArray(res.data) ? res.data : [];
      if (conversations.length === 0) return;

      let latestTime = 0;
      let latestConv = null;

      conversations.forEach((conv) => {
        if (!conv.lastMessageTime) return;
        const senderId =
          conv.lastMessageSender?._id?.toString?.() ||
          conv.lastMessageSender?.toString?.() ||
          (typeof conv.lastMessageSender === 'string' ? conv.lastMessageSender : null);
        const myId = user?._id?.toString?.() || '';
        if (senderId && senderId === myId) return;
        if (!conv.lastMessage || conv.lastMessage === 'Start a conversation...') return;
        const t = new Date(conv.lastMessageTime).getTime();
        if (t > latestTime) { latestTime = t; latestConv = conv; }
      });

      if (!latestConv || latestTime === 0) return;

      // First poll - just set baseline
      if (lastNotifiedMessageTimeRef.current === null) {
        lastNotifiedMessageTimeRef.current = latestTime;
        return;
      }

      // New message detected
      if (latestTime > lastNotifiedMessageTimeRef.current) {
        lastNotifiedMessageTimeRef.current = latestTime;
        if (!appIsActive() || !isFresh(latestTime)) return;

        const otherUser = (latestConv.participants || []).find(
          (p) => p._id && p._id.toString() !== user?._id?.toString()
        );
        const senderName = otherUser?.name || 'Someone';

        let preview = latestConv.lastMessage || 'New message';
        if (latestConv.lastMessageType === 'image') preview = '📷 Photo';
        else if (latestConv.lastMessageType === 'audio') preview = '🎤 Voice message';
        else if (preview.length > 60) preview = preview.slice(0, 60) + '...';

        const notif = {
          _id: `msg-${latestConv._id}-${latestTime}`,
          title: `${senderName} 💬`,
          description: preview,
          conversationId: latestConv._id,
          type: 'Message',
          mood: 'cheeky',
        };

        await fetchUnreadCount();
        if (onNewNotification) onNewNotification(notif);
      }
    } catch (error) { /* noop */ }
  }, [token, isGuest, user, onNewNotification, fetchUnreadCount]);

  // ── Poll notifications (main + social) ──
  const pollForNewNotifications = useCallback(async () => {
    if (!token || isGuest) return;

    try {
      const [mainRes, socialRes] = await Promise.all([
        axios.get(`${BASE_URL}/notification/my-notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BASE_URL}/social/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: [] })),
      ]);

      const mainDocs = Array.isArray(mainRes.data) ? mainRes.data : [];
      const socialDocs = Array.isArray(socialRes.data) ? socialRes.data : [];

      const userId = user?._id?.toString() || '';

      const TITLE_MAP = {
        like: '❤️ New Like',
        comment: '💬 New Comment',
        follow: '🌟 New Follower',
        request: '👤 Connection Request',
        connection_accepted: '🎉 Connection Accepted',
        request_declined: 'Request Declined',
        new_offer: '💼 New Offer',
        offer_accepted: '🎉 Offer Accepted',
        offer_rejected: 'Offer Declined',
        match_created: '🤝 Match Created',
        message: '💬 New Message',
      };
      const MOOD_MAP = {
        like: 'excited', comment: 'cheeky', follow: 'excited',
        request: 'sus', connection_accepted: 'hype', request_declined: 'sleepy',
        new_offer: 'shook', offer_accepted: 'hype', offer_rejected: 'sleepy',
        match_created: 'hype', message: 'cheeky',
      };

      const normalizedSocial = socialDocs
        .filter((n) => n.type !== 'message')
        .map((n) => ({
          _id: n._id,
          title: SOCIAL_TITLES[n.type] || TITLE_MAP[n.type] || 'notification',
          description: n.text,
          type: n.type,
          category: 'Social',
          mood: n.mood || MOOD_MAP[n.type] || 'sorted',
          iconUrl: n.iconUrl || null,
          createdAt: n.createdAt,
          isRead: userId
            ? (n.readBy || []).some((id) => id.toString() === userId)
            : false,
          link: n.postId ? `/post/${n.postId}` : (n.link || ''),
          metadata: n.metadata || {},
          screenToOpen: n.screenToOpen || n.metadata?.screen || null,
          conversationId: n.conversationId || null,
        }));

      const merged = [...mainDocs, ...normalizedSocial].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      if (merged.length === 0) return;

      const latest = merged[0];

      // First poll after reset - just set baseline, don't notify
      if (isFirstPollRef.current) {
        console.log('[useNotifications] First poll - setting baseline:', latest._id);
        lastSeenIdRef.current = latest._id;
        isFirstPollRef.current = false;
        return;
      }

      // New notification detected
      if (latest._id && latest._id !== lastSeenIdRef.current) {
        console.log('[useNotifications] New notification detected:', latest._id);
        lastSeenIdRef.current = latest._id;
        await fetchUnreadCount();
        if (onNewNotification && appIsActive() && isFresh(latest.createdAt)) {
          onNewNotification(latest);
        }
      }
    } catch (error) { /* noop */ }
  }, [token, isGuest, user, onNewNotification, fetchUnreadCount]);

  // ── Mark as read ──
  const markAsRead = useCallback(async (notificationId) => {
    if (!token) return false;
    try {
      await axios.patch(
        `${BASE_URL}/notification/mark-read/${notificationId}`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchUnreadCount();
      return true;
    } catch (e) { return false; }
  }, [token, fetchUnreadCount]);

  // ── Mark all as read ──
  const markAllAsRead = useCallback(async () => {
    if (!token) return false;
    try {
      await axios.put(
        `${BASE_URL}/notification/mark-all-read`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnreadCount(0);
      return true;
    } catch (e) { return false; }
  }, [token]);

  // ── Polling setup ──
  useEffect(() => {
    if (!token || isGuest) return;

    // Initial poll after short delay
    const initialDelay = setTimeout(() => {
      pollForNewNotifications();
      pollForNewMessages();
    }, 1500);

    // Regular polling
    pollIntervalRef.current = setInterval(() => {
      pollForNewNotifications();
      pollForNewMessages();
    }, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initialDelay);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [token, isGuest, pollForNewNotifications, pollForNewMessages]);

  // ── AppState listener ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && token && !isGuest) {
        console.log('[useNotifications] App active - refreshing');
        // Whatever arrived while the app was closed was shown by the phone.
        // Start a new baseline so it doesn't pop up again inside the app.
        resetBaseline();
        fetchUnreadCount();
        pollForNewNotifications();
        pollForNewMessages();
      }
    });
    return () => subscription.remove();
  }, [token, isGuest, resetBaseline, fetchUnreadCount, pollForNewNotifications, pollForNewMessages]);

  // ── Initial fetch ──
  useEffect(() => {
    if (token && !isGuest) fetchUnreadCount();
  }, [token, isGuest, fetchUnreadCount]);

  // ── Reset when logged out ──
  useEffect(() => {
    if (!token || isGuest) resetBaseline();
  }, [token, isGuest, resetBaseline]);

  return { unreadCount, fetchUnreadCount, markAsRead, markAllAsRead };
};