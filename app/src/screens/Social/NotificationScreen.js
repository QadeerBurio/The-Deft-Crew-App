// app/src/screens/Social/NotificationScreen.js
// Social notifications: likes, comments, replies, mentions, messages,
// connection requests. Same design as the bell modal and SkillShare
// (components/notifications/NotifUI). SkillShare offer/match notifications
// live on their own screen and are not repeated here.
//
// - Opens instantly from the last loaded list, refreshes in the background
// - Light polling (20s) only while this screen is open

import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { View, FlatList, StatusBar, Alert, AppState, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { color as T } from '../../theme/tokens';
import { AuthContext } from '../../context/AuthContext';
import {
  N,
  timeAgo,
  withSections,
  NotifHeader,
  NotifFilters,
  NotifSection,
  NotifRow,
  NotifRequestActions,
  NotifSkeleton,
  NotifEmpty,
} from '../../components/notifications/NotifUI';

const API_URL = 'https://the-deft-crew-production.up.railway.app/api/social';
const POLL_MS = 20000;

const SKILLSHARE_ONLY = ['new_offer', 'offer_accepted', 'offer_rejected', 'match_created'];
const SOCIAL_TYPES = [
  'like', 'comment', 'reply', 'mention', 'tag', 'message', 'follow',
  'request', 'connection_accepted', 'request_declined', 'Social', 'social',
];

const cache = { userId: null, list: null };

const objectId = (v) => {
  if (!v) return null;
  const s = typeof v === 'object' ? String(v._id || v) : String(v);
  return /^[0-9a-fA-F]{24}$/.test(s) ? s : null;
};
const postIdOf = (n) =>
  [n.postId, n.post, n.relatedId, n.targetId, n.metadata?.postId].map(objectId).find(Boolean) || null;

const ACTION = {
  like: ['liked your post', 'heart', 'gold'],
  comment: ['commented on your post', 'chatbubble', 'dark'],
  reply: ['replied to your comment', 'return-down-forward', 'dark'],
  mention: ['mentioned you', 'at', 'blue'],
  tag: ['tagged you', 'pricetag', 'blue'],
  message: ['sent you a message', 'paper-plane', 'dark'],
  follow: ['started following you', 'person-add', 'gold'],
  request: ['wants to connect', 'person-add', 'gold'],
  connection_accepted: ['accepted your request', 'checkmark', 'ok'],
  request_declined: ['declined your request', 'close', 'danger'],
};

const FILTERS = [
  { key: 'all', label: 'all' },
  { key: 'unread', label: 'unread' },
  { key: 'requests', label: 'requests' },
  { key: 'activity', label: 'likes & comments' },
  { key: 'mentions', label: 'mentions' },
];

export default function NotificationScreen({ navigation }) {
  const { token, user: currentUser, setUser } = useContext(AuthContext);
  const myId = currentUser?._id?.toString();
  const cached = cache.userId === myId ? cache.list : null;

  const [notifications, setNotifications] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState({});

  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
  const pollRef = useRef(null);
  const focusedRef = useRef(false);
  const fetchingRef = useRef(false);

  const save = useCallback((updater) => {
    setNotifications((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cache.userId = myId;
      cache.list = next;
      return next;
    });
  }, [myId]);

  const fetchNotifications = useCallback(async () => {
    if (!token || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await axios.get(`${API_URL}/notifications`, config);
      const raw = Array.isArray(res.data) ? res.data : [];
      const list = raw
        .filter((n) => !SKILLSHARE_ONLY.includes(n.type))
        .map((n) => ({
          ...n,
          isUnread:
            typeof n.isUnread === 'boolean'
              ? n.isUnread
              : Array.isArray(n.readBy) && myId
              ? !n.readBy.some((id) => String(id) === myId)
              : true,
          status: n.type === 'request' ? n.status || 'pending' : n.status,
          isProcessed: n.isProcessed || false,
          type: n.type || 'notification',
        }));
      save(list);
    } catch (err) {
      if (err.response?.status === 401) save([]);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, config, myId, save]);

  // load on focus + light polling while focused
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      fetchNotifications();
      pollRef.current = setInterval(() => {
        if (AppState.currentState === 'active') fetchNotifications();
      }, POLL_MS);
      return () => {
        focusedRef.current = false;
        clearInterval(pollRef.current);
      };
    }, [fetchNotifications])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && focusedRef.current) fetchNotifications();
    });
    return () => sub.remove();
  }, [fetchNotifications]);

  // ── actions ──
  const markRead = (item) => {
    if (!item.isUnread) return;
    save((prev) => prev.map((n) => (n._id === item._id ? { ...n, isUnread: false } : n)));
    axios.put(`${API_URL}/notifications/read/${item._id}`, {}, config).catch(() => {});
  };

  const markAllRead = () => {
    save((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    axios.put(`${API_URL}/notifications/read-all?types=${SOCIAL_TYPES.join(',')}`, {}, config).catch(() => {});
  };

  const clearAll = () => {
    Alert.alert('Clear all notifications?', 'Pending connection requests stay until you answer them.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          save((prev) => prev.filter((n) => n.type === 'request' && n.status === 'pending' && !n.isProcessed));
          try {
            await axios.delete(`${API_URL}/notifications/clear-all?types=${SOCIAL_TYPES.join(',')}`, config);
          } catch {
            Alert.alert('Error', 'Could not clear notifications.');
            fetchNotifications();
          }
        },
      },
    ]);
  };

  const deleteOne = (item) => {
    save((prev) => prev.filter((n) => n._id !== item._id));
    axios.delete(`${API_URL}/notifications/${item._id}`, config).catch(() => {});
  };

  const open = (item) => {
    markRead(item);
    const senderId = item.sender?._id;
    try {
      switch (item.type) {
        case 'message':
          if (item.conversationId) {
            navigation.navigate('ChatDetailScreen', { conversationId: item.conversationId, recipient: item.sender });
          } else if (senderId) navigation.navigate('UserProfile', { userId: senderId });
          return;
        case 'like':
        case 'comment':
        case 'reply':
        case 'mention':
        case 'tag': {
          const postId = postIdOf(item);
          if (postId) navigation.navigate('PostDetailScreen', { postId, notification: item });
          else if (senderId) navigation.navigate('UserProfile', { userId: senderId });
          else Alert.alert('Not available', 'This post is no longer available.');
          return;
        }
        default:
          if (senderId) navigation.navigate('UserProfile', { userId: senderId });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open this notification.');
    }
  };

  const respond = async (item, action) => {
    if (busy[item._id]) return;
    setBusy((b) => ({ ...b, [item._id]: true }));
    try {
      const res = await axios.post(`${API_URL}/notifications/respond`, { notificationId: item._id, action }, config);
      if (res.data?.success) {
        const accepted = action === 'accepted';
        save((prev) =>
          prev.map((n) =>
            n._id === item._id
              ? { ...n, status: action, isUnread: false, isProcessed: true, type: accepted ? 'connection_accepted' : 'request_declined' }
              : n
          )
        );
        if (currentUser && setUser) {
          const other = res.data.sender?._id || item.sender?._id;
          setUser({
            ...currentUser,
            connections: accepted ? [...(currentUser.connections || []), other] : currentUser.connections || [],
            receivedRequests: (currentUser.receivedRequests || []).filter((id) => String(id) !== String(other)),
          });
        }
        Alert.alert(
          accepted ? 'Connected' : 'Request declined',
          accepted ? (item.sender?.name ? `You and ${item.sender.name} are now connected.` : 'You are now connected.') : ''
        );
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not process request.');
      fetchNotifications();
    } finally {
      setBusy((b) => ({ ...b, [item._id]: false }));
    }
  };

  // ── list ──
  const counts = useMemo(() => {
    const c = { unread: 0, requests: 0, activity: 0, mentions: 0 };
    notifications.forEach((n) => {
      if (n.type === 'request' && n.status === 'pending' && !n.isProcessed) c.requests += 1;
      if (!n.isUnread) return;
      c.unread += 1;
      if (['like', 'comment', 'reply'].includes(n.type)) c.activity += 1;
      if (['mention', 'tag'].includes(n.type)) c.mentions += 1;
    });
    return c;
  }, [notifications]);

  const data = useMemo(() => {
    const list = notifications.filter((n) => {
      if (filter === 'unread') return n.isUnread;
      if (filter === 'requests') return ['request', 'connection_accepted', 'request_declined', 'follow'].includes(n.type);
      if (filter === 'activity') return ['like', 'comment', 'reply'].includes(n.type);
      if (filter === 'mentions') return ['mention', 'tag'].includes(n.type);
      return true;
    });
    return withSections(list);
  }, [notifications, filter]);

  const renderItem = ({ item }) => {
    if (item._section) return <NotifSection label={item.label} />;
    const [action, icon, tone] = ACTION[item.type] || [item.text || 'sent you a notification', 'notifications', 'dark'];
    const pending = item.type === 'request' && item.status === 'pending' && !item.isProcessed;
    const processed = item.type === 'request' && item.isProcessed && item.status !== 'pending';
    const showsText = ['comment', 'reply', 'mention', 'message'].includes(item.type) && item.text;

    let status = null;
    let statusTone = 'ok';
    if (item.type === 'connection_accepted' || (processed && item.status === 'accepted')) status = 'connected';
    if (item.type === 'request_declined' || (processed && item.status === 'declined')) {
      status = 'declined';
      statusTone = 'danger';
    }

    return (
      <NotifRow
        item={{
          name: item.sender?.name || 'Someone',
          avatar: item.sender?.profileImage || null,
          title: action,
          preview: showsText ? item.text : null,
          time: timeAgo(item.createdAt),
          unread: item.isUnread,
          icon,
          tone,
          status,
          statusTone,
        }}
        onPress={() => open(item)}
        onDelete={pending ? null : () => deleteOne(item)}
      >
        {pending ? (
          <NotifRequestActions
            busy={!!busy[item._id]}
            onAccept={() => respond(item, 'accepted')}
            onDecline={() => respond(item, 'declined')}
          />
        ) : null}
      </NotifRow>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      <NotifHeader
        unread={counts.unread}
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTabs'))}
        onMarkAll={notifications.length ? markAllRead : null}
        onClear={notifications.length ? clearAll : null}
      />
      <View>
        <NotifFilters filters={FILTERS} value={filter} onChange={setFilter} counts={counts} />
      </View>

      {loading ? (
        <NotifSkeleton />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item._id)}
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
              <NotifEmpty sub="likes, comments and connection requests show up here." />
            ) : (
              <NotifEmpty title="nothing here" sub="no notifications in this filter right now." icon="funnel-outline" />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
});
