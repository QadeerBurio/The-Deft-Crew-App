// app/src/components/NotificationModal.js
// Bell on Home → app notifications (offers, jobs, events, system…).
// Social and SkillShare notifications have their own screens, so they are
// not mixed in here. Same design as those screens (components/notifications/NotifUI).
//
// - Opens instantly from the last loaded list, refreshes in the background
// - Tap: opens the linked screen; if there's no link, expands the full text

import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  FlatList,
  Pressable,
  Dimensions,
  RefreshControl,
  Alert,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { soundPopupOpen, soundPopupClose } from '../lib/tdcSounds';
import { AuthContext } from '../context/AuthContext';
import { BASE_URL } from '../api/api';
import { navigationRef } from '../navigation/navigationRef';
import {
  N,
  timeAgo,
  withSections,
  NotifHeader,
  NotifFilters,
  NotifSection,
  NotifRow,
  NotifSkeleton,
  NotifEmpty,
} from './notifications/NotifUI';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Last loaded list per user (instant open)
const cache = { userId: null, list: null };

// ── type → icon + tone ──
const LOOK = {
  Offer: ['pricetag', 'gold'],
  Brand: ['storefront-outline', 'gold'],
  Promotion: ['megaphone-outline', 'gold'],
  Payment: ['wallet-outline', 'ok'],
  Card: ['card-outline', 'dark'],
  'Job Application': ['briefcase-outline', 'dark'],
  'Job Posting': ['briefcase-outline', 'dark'],
  Jobs: ['briefcase-outline', 'dark'],
  'Application Status': ['checkmark-done-outline', 'ok'],
  Interview: ['calendar-outline', 'blue'],
  Event: ['calendar-outline', 'blue'],
  Booking: ['ticket-outline', 'blue'],
  Exchange: ['school-outline', 'blue'],
  Scholarship: ['school-outline', 'blue'],
  Course: ['book-outline', 'blue'],
  Message: ['chatbubble-ellipses-outline', 'dark'],
  Alert: ['alert-circle-outline', 'danger'],
  Security: ['shield-checkmark-outline', 'danger'],
  Reminder: ['alarm-outline', 'gold'],
  Welcome: ['happy-outline', 'gold'],
  Update: ['sparkles-outline', 'dark'],
  System: ['notifications-outline', 'dark'],
};
const lookFor = (type) => LOOK[type] || LOOK.System;

const GROUPS = {
  offers: ['Offer', 'Brand', 'Promotion', 'Payment', 'Card'],
  careers: ['Job Application', 'Job Posting', 'Jobs', 'Application Status', 'Interview', 'Exchange', 'Scholarship', 'Course'],
  events: ['Event', 'Booking'],
};

const FILTERS = [
  { key: 'all', label: 'all' },
  { key: 'unread', label: 'unread' },
  { key: 'offers', label: 'offers' },
  { key: 'careers', label: 'careers' },
  { key: 'events', label: 'events' },
  { key: 'other', label: 'updates' },
];

// ── deep links ──
const go = (screen, params, navigation) => {
  try {
    if (navigationRef.isReady()) navigationRef.navigate(screen, params);
    else navigation?.navigate(screen, params);
    return true;
  } catch (e) {
    console.log('[NotificationModal] nav failed', e?.message);
    return false;
  }
};

const targetOf = (item) => {
  const m = item.metadata || {};
  const screen = item.screenToOpen || m.screenToOpen || m.screen || m.route;
  if (screen) return { screen, params: m.params || item.params || {} };

  const link = item.link || m.link || item.url;
  if (!link || typeof link !== 'string') return null;
  const post = link.match(/\/post\/([a-zA-Z0-9]+)/);
  if (post) return { screen: 'PostDetailScreen', params: { postId: post[1] } };
  const user = link.match(/\/user\/([a-zA-Z0-9]+)/);
  if (user) return { screen: 'UserProfile', params: { userId: user[1] } };
  if (/\/(offers?|brand)/.test(link)) return { screen: 'Brands', params: {} };
  if (/\/(jobs|career)/.test(link)) return { screen: 'Career', params: {} };
  if (/\/event/.test(link)) return { screen: 'Events', params: {} };
  if (/\/(message|chat)/.test(link)) return { screen: 'Messages', params: {} };
  return null;
};

const normalize = (n, i, myId) => {
  let isRead = false;
  if (typeof n.isRead === 'boolean') isRead = n.isRead;
  else if (Array.isArray(n.readBy) && myId) isRead = n.readBy.some((id) => id?.toString() === myId);
  return {
    ...n,
    _id: n._id?.toString() || `main-${i}`,
    type: n.type || 'System',
    description: n.description || n.text || n.message || '',
    isRead,
    createdAt: n.createdAt || new Date().toISOString(),
  };
};

const NotificationModal = ({ visible: visibleProp, onClose: onCloseProp, navigation: navProp }) => {
  const { token, user, setUnreadCount, updateUnreadCount } = useContext(AuthContext);
  const hookNav = useNavigation();
  const navigation = navProp || hookNav;

  // Also works when registered as a stack screen (no visible/onClose props)
  const isScreen = visibleProp === undefined;
  const visible = isScreen ? true : visibleProp;
  const onClose = onCloseProp || (() => navigation?.canGoBack?.() && navigation.goBack());

  const myId = user?._id?.toString();
  const cached = cache.userId === myId ? cache.list : null;

  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  const headers = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const save = useCallback((list) => {
    setNotifications(list);
    cache.userId = myId;
    cache.list = list;
  }, [myId]);

  const fetchNotifications = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await axios.get(`${BASE_URL}/notification/my-notifications`, headers);
      const docs = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.notifications) ? res.data.notifications : [];
      const list = docs
        .map((n, i) => normalize(n, i, myId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      save(list);
      if (typeof setUnreadCount === 'function') setUnreadCount(list.filter((n) => !n.isRead).length);
    } catch (err) {
      console.log('[NotificationModal] fetch error', err?.response?.status, err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user, headers, myId, save, setUnreadCount]);

  // open / close
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setExpandedId(null);
      if (!isScreen) soundPopupOpen();
      sheetY.setValue(SCREEN_HEIGHT);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.spring(sheetY, { toValue: 0, friction: 10, tension: 70, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      // fresh user list into state (another account may have signed in)
      if (cache.userId === myId && cache.list) setNotifications(cache.list);
      else setLoading(true);
      fetchNotifications();
    } else if (mounted) {
      soundPopupClose();
      Animated.parallel([
        Animated.timing(sheetY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = useCallback(() => {
    updateUnreadCount?.(token);
    onClose?.();
  }, [onClose, token, updateUnreadCount]);

  // ── actions ──
  const markRead = (id) => {
    save(notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount?.((prev) => Math.max(0, (prev || 0) - 1));
    axios.patch(`${BASE_URL}/notification/mark-read/${id}`, {}, headers).catch(() => {});
  };

  const markAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    save(notifications.map((n) => ({ ...n, isRead: true })));
    setUnreadCount?.(0);
    axios.put(`${BASE_URL}/notification/mark-all-read`, {}, headers).catch(() => {});
  };

  const deleteOne = (item) => {
    save(notifications.filter((n) => n._id !== item._id));
    if (!item.isRead) setUnreadCount?.((prev) => Math.max(0, (prev || 0) - 1));
    axios.delete(`${BASE_URL}/notification/delete/${item._id}`, headers).catch(() => {});
  };

  const clearAll = () => {
    Alert.alert('Clear all notifications?', 'This removes every notification in this list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: () => {
          save([]);
          setUnreadCount?.(0);
          axios.delete(`${BASE_URL}/notification/clear-all`, headers).catch(() => {});
        },
      },
    ]);
  };

  const onPressItem = (item) => {
    Haptics.selectionAsync().catch(() => {});
    if (!item.isRead) markRead(item._id);
    const t = targetOf(item);
    if (t) {
      handleClose();
      setTimeout(() => go(t.screen, t.params, navigation), isScreen ? 0 : 220);
    } else {
      setExpandedId((id) => (id === item._id ? null : item._id));
    }
  };

  // ── list ──
  const counts = useMemo(() => {
    const c = { unread: 0, offers: 0, careers: 0, events: 0, other: 0 };
    notifications.forEach((n) => {
      if (!n.isRead) {
        c.unread += 1;
        const g = Object.keys(GROUPS).find((k) => GROUPS[k].includes(n.type)) || 'other';
        c[g] += 1;
      }
    });
    return c;
  }, [notifications]);

  const data = useMemo(() => {
    const list = notifications.filter((n) => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !n.isRead;
      if (filter === 'other') return !Object.values(GROUPS).some((g) => g.includes(n.type));
      return (GROUPS[filter] || []).includes(n.type);
    });
    return withSections(list);
  }, [notifications, filter]);

  const renderItem = ({ item }) => {
    if (item._section) return <NotifSection label={item.label} />;
    const [icon, tone] = lookFor(item.type);
    const t = targetOf(item);
    return (
      <NotifRow
        item={{
          title: item.title || 'notification',
          body: item.description,
          time: timeAgo(item.createdAt),
          unread: !item.isRead,
          icon,
          tone,
          linkable: !!t,
          expanded: expandedId === item._id,
        }}
        onPress={() => onPressItem(item)}
        onDelete={() => deleteOne(item)}
      />
    );
  };

  const content = (
    <>
      <NotifHeader
        unread={counts.unread}
        onClose={handleClose}
        onBack={null}
        onMarkAll={notifications.length ? markAllRead : null}
        onClear={notifications.length ? clearAll : null}
        showHandle={!isScreen}
      />
      <View>
        <NotifFilters filters={FILTERS} value={filter} onChange={setFilter} counts={counts} />
      </View>
      {loading ? (
        <NotifSkeleton />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={[{ paddingBottom: 30 }, data.length === 0 && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
              colors={[N.dark]}
              tintColor={N.dark}
            />
          }
          ListEmptyComponent={
            filter === 'all' ? (
              <NotifEmpty />
            ) : (
              <NotifEmpty title="nothing here" sub="no notifications in this filter right now." icon="funnel-outline" />
            )
          }
        />
      )}
    </>
  );

  if (isScreen) {
    return <View style={[styles.screen, { paddingTop: Platform.OS === 'ios' ? 50 : 30 }]}>{content}</View>;
  }

  if (!mounted && !visible) return null;

  return (
    <Modal visible={mounted || visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>{content}</Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(17,17,17,0.5)' },
  sheet: {
    height: SCREEN_HEIGHT * 0.88,
    backgroundColor: N.paper,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    overflow: 'hidden',
  },
  screen: { flex: 1, backgroundColor: N.paper },
});

export default NotificationModal;
