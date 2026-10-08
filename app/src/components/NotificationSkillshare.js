// app/src/components/NotificationSkillshare.js
// SkillShare notifications: offers on your listings, offer results, matches.
// Same design as the bell modal and Social (components/notifications/NotifUI).
//
// - Opens instantly from the last loaded list, refreshes on focus
// - Tap opens the right SkillShare screen (ManageOffers / MatchChat / MyOffers)
// - Does not touch the Home bell badge (that one counts app notifications)

import React, { useState, useContext, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, StatusBar, Alert, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

const SKILLSHARE_TYPES = ['new_offer', 'offer_accepted', 'offer_rejected', 'match_created', 'message'];

const LOOK = {
  new_offer: ['new offer on your listing', 'briefcase', 'gold'],
  offer_accepted: ['offer accepted', 'checkmark-done', 'ok'],
  offer_rejected: ['offer declined', 'close', 'danger'],
  match_created: ["it's a match", 'people', 'gold'],
  message: ['new message', 'chatbubble-ellipses', 'dark'],
};

// When we know who did it: "<name> made an offer"
const NAMED = {
  new_offer: 'made an offer',
  offer_accepted: 'accepted your offer',
  offer_rejected: 'declined your offer',
  match_created: 'matched with you',
  message: 'sent you a message',
};

// "Ali made an offer on "Logo design"" → "Logo design"
const listingOf = (text = '') => {
  const m = String(text).match(/"([^"]+)"/);
  return m ? m[1] : null;
};

const FILTERS = [
  { key: 'all', label: 'all' },
  { key: 'unread', label: 'unread' },
  { key: 'offers', label: 'offers' },
  { key: 'matches', label: 'matches' },
  { key: 'messages', label: 'messages' },
];

const cache = { userId: null, list: null };

// Where a tap goes. Uses the saved target first, then a sensible default per type.
const targetOf = (n) => {
  const m = n.metadata || {};
  const screen = m.screenToOpen || m.screen || m.route;
  if (screen) return { screen, params: m.params || {} };
  if (n.type === 'new_offer') return { screen: 'ManageOffers', params: {} };
  if (n.type === 'offer_accepted' && m.matchId) return { screen: 'MatchChat', params: { matchId: m.matchId } };
  if (['offer_accepted', 'offer_rejected', 'match_created'].includes(n.type)) return { screen: 'MyOffers', params: {} };
  return null;
};

const NotificationSkillshare = () => {
  const { token, user } = useContext(AuthContext);
  const navigation = useNavigation();
  const myId = user?._id?.toString();
  const cached = cache.userId === myId ? cache.list : null;

  const [notifications, setNotifications] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const fetchingRef = useRef(false);

  const headers = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const save = useCallback((updater) => {
    setNotifications((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cache.userId = myId;
      cache.list = next;
      return next;
    });
  }, [myId]);

  const fetchNotifications = useCallback(async () => {
    if (!token || !user || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await axios.get(
        `${BASE_URL}/social/notifications?types=${SKILLSHARE_TYPES.join(',')}`,
        headers
      );
      const docs = Array.isArray(res.data) ? res.data : [];
      const list = docs
        .filter((n) => SKILLSHARE_TYPES.includes(n.type))
        .map((n) => ({
          ...n,
          isRead:
            typeof n.isUnread === 'boolean'
              ? !n.isUnread
              : (n.readBy || []).some((id) => String(id) === myId),
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      save(list);
    } catch (error) {
      console.log('[SkillShare notifications] fetch error:', error?.message);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user, headers, myId, save]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  // ── actions ──
  const markRead = (n) => {
    if (n.isRead) return;
    save((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    axios.put(`${BASE_URL}/social/notifications/read/${n._id}`, {}, headers).catch(() => {});
  };

  const markAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    save((prev) => prev.map((x) => ({ ...x, isRead: true })));
    axios
      .put(`${BASE_URL}/social/notifications/read-all?types=${SKILLSHARE_TYPES.join(',')}`, {}, headers)
      .catch(() => {});
  };

  const deleteOne = (n) => {
    save((prev) => prev.filter((x) => x._id !== n._id));
    axios.delete(`${BASE_URL}/social/notifications/${n._id}`, headers).catch(() => {});
  };

  const clearAll = () => {
    Alert.alert('Clear SkillShare notifications?', 'Only offers, matches and SkillShare messages are removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          save([]);
          try {
            await axios.delete(
              `${BASE_URL}/social/notifications/clear-all?types=${SKILLSHARE_TYPES.join(',')}`,
              headers
            );
          } catch {
            Alert.alert('Error', 'Could not clear notifications.');
            fetchNotifications();
          }
        },
      },
    ]);
  };

  const open = (n) => {
    Haptics.selectionAsync().catch(() => {});
    markRead(n);
    const t = targetOf(n);
    if (!t) return;
    try {
      if (navigationRef.isReady()) navigationRef.navigate(t.screen, t.params);
      else navigation.navigate(t.screen, t.params);
    } catch (e) {
      Alert.alert('Not available', 'This item is no longer available.');
    }
  };

  // ── list ──
  const counts = useMemo(() => {
    const c = { unread: 0, offers: 0, matches: 0, messages: 0 };
    notifications.forEach((n) => {
      if (n.isRead) return;
      c.unread += 1;
      if (['new_offer', 'offer_accepted', 'offer_rejected'].includes(n.type)) c.offers += 1;
      if (n.type === 'match_created') c.matches += 1;
      if (n.type === 'message') c.messages += 1;
    });
    return c;
  }, [notifications]);

  const data = useMemo(() => {
    const list = notifications.filter((n) => {
      if (filter === 'unread') return !n.isRead;
      if (filter === 'offers') return ['new_offer', 'offer_accepted', 'offer_rejected'].includes(n.type);
      if (filter === 'matches') return n.type === 'match_created' || n.type === 'offer_accepted';
      if (filter === 'messages') return n.type === 'message';
      return true;
    });
    return withSections(list);
  }, [notifications, filter]);

  const renderItem = ({ item }) => {
    if (item._section) return <NotifSection label={item.label} />;
    const [title, icon, tone] = LOOK[item.type] || ['skillshare update', 'briefcase', 'gold'];
    return (
      <NotifRow
        item={{
          name: item.sender?.name || null,
          avatar: item.sender?.profileImage || null,
          title: item.sender?.name ? NAMED[item.type] || title : title,
          body: item.sender?.name
            ? (listingOf(item.text) ? `on "${listingOf(item.text)}"` : item.type === 'message' ? item.text : '')
            : item.text || '',
          time: timeAgo(item.createdAt),
          unread: !item.isRead,
          icon,
          tone,
          linkable: !!targetOf(item),
        }}
        onPress={() => open(item)}
        onDelete={() => deleteOne(item)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={N.paper} />
      <NotifHeader
        title="skillshare alerts"
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
              <NotifEmpty icon="briefcase-outline" sub="offers on your listings and matches show up here." />
            ) : (
              <NotifEmpty title="nothing here" sub="no notifications in this filter right now." icon="funnel-outline" />
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: N.paper },
});

export default NotificationSkillshare;
