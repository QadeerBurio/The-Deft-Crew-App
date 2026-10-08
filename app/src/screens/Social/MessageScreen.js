// app/src/screens/Social/MessageScreen.js
// Chats inbox. tdc style (white, black, gold).
// - Opens instantly from the last loaded inbox (kept in memory per user),
//   then refreshes in the background. Skeleton only on the very first load.
// - Blocked users and inbox load together.
// - Socket updates are batched so a burst of messages = one refresh.

import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  StatusBar, Platform, Animated, Alert, Modal, Pressable,
  BackHandler, RefreshControl,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { AuthContext } from "../../context/AuthContext";
import io from "socket.io-client";

import { color as T, font as F } from "../../theme/tokens";
import { ScreenHeader, HeaderIconButton, Input, Chip, EmptyState, SkeletonBlock } from "../../ui";
const socket = io("https://the-deft-crew-production.up.railway.app");
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

const C = {
  gold: T.yellow,
  goldSoft: T.yellowSoft,
  dark: T.ink,
  white: T.white,
  bg: T.paper,
  soft: T.sand,
  border: T.line,
  line: T.line,
  muted: T.textFaint,
  text2: T.textMuted,
  danger: T.danger,
  dangerSoft: T.dangerBg,
  online: T.success,
};

// Last inbox per user, so coming back to Chats shows it at once
const inboxCache = { userId: null, conversations: null, blocked: [] };

// ─── helpers ───────────────────────────────────────────────────
const formatMessageDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
};

const sortByLatest = (list) =>
  [...list].sort((a, b) => {
    const da = new Date(a.lastMessageTime || a.updatedAt || a.createdAt);
    const db = new Date(b.lastMessageTime || b.updatedAt || b.createdAt);
    return db - da;
  });

const otherOf = (conv, me) => conv?.participants?.find((p) => p?._id !== me?._id);

// ─── Skeleton (first load only, static, no shimmer loop) ───────
const MessagesSkeleton = () => (
  <View style={styles.skeletonWrap}>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <View key={i} style={styles.skeletonRow}>
        <SkeletonBlock width={52} height={52} radius={26} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <SkeletonBlock width="45%" height={13} />
          <SkeletonBlock width="70%" height={10} style={{ marginTop: 8 }} />
        </View>
      </View>
    ))}
  </View>
);

// ─── Avatar ────────────────────────────────────────────────────
const Avatar = ({ uri, name, size = 52, dim, online }) => (
  <View style={{ width: size, height: size }}>
    {uri ? (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.soft }, dim && { opacity: 0.45 }]}
      />
    ) : (
      <View
        style={[
          styles.avatarFallback,
          { width: size, height: size, borderRadius: size / 2 },
          dim && { backgroundColor: T.sand },
        ]}
      >
        <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }, dim && { color: T.textFaint }]}>
          {(name || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
    )}
    {online ? <View style={styles.onlineDot} /> : null}
  </View>
);

// ─── Chat row ──────────────────────────────────────────────────
const ChatItem = React.memo(({ item, currentUser, onOpen, onLongPress, isBlocked }) => {
  const other = otherOf(item, currentUser);
  const name = other?.name || 'User';
  const unread = isBlocked ? 0 : item.unreadCount || 0;
  const when = item.lastMessageTime || item.updatedAt || item.createdAt;
  const preview = isBlocked
    ? 'blocked. messages hidden'
    : item.lastMessage || 'say hi';

  return (
    <TouchableOpacity
      style={[styles.row, unread > 0 && styles.rowUnread]}
      onPress={() => onOpen(item, isBlocked)}
      onLongPress={() => onLongPress(item._id)}
      delayLongPress={350}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${name}${unread > 0 ? `, ${unread} unread` : ''}`}
      accessibilityHint="long press for options"
    >
      <Avatar uri={other?.profileImage} name={name} dim={isBlocked} online={!isBlocked && other?.online} />

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, unread > 0 && styles.nameUnread, isBlocked && styles.mutedText]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.time, unread > 0 && styles.timeUnread]}>
            {isBlocked ? 'blocked' : formatMessageDate(when)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          {isBlocked ? <Ionicons name="lock-closed" size={12} color={C.muted} style={{ marginRight: 4 }} /> : null}
          <Text style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={1}>
            {preview}
          </Text>
          {unread > 0 ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
          {item.muted ? <Ionicons name="notifications-off" size={13} color={C.muted} style={{ marginLeft: 6 }} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Action sheet ──────────────────────────────────────────────
const ActionSheet = ({ visible, onClose, onAction, name, image, isBlocked }) => {
  const slide = useRef(new Animated.Value(300)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slide.setValue(300);
      fade.setValue(0);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = (after) => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 300, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      if (after) setTimeout(after, 50);
    });
  };

  const Option = ({ icon, label, color = C.dark, bg = C.soft, onPress }) => (
    <TouchableOpacity style={styles.sheetOption} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.sheetIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={[styles.sheetText, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={T.textFaint} />
    </TouchableOpacity>
  );

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={() => close()}>
      <Animated.View style={[styles.sheetBackdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Avatar uri={image} name={name} size={44} dim={isBlocked} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.sheetName} numberOfLines={1}>{name || 'User'}</Text>
            <Text style={styles.sheetSub}>{isBlocked ? 'blocked' : 'chat options'}</Text>
          </View>
        </View>

        <Option icon="person-outline" label="view profile" onPress={() => close(() => onAction('profile'))} />
        {isBlocked ? (
          <Option icon="lock-open-outline" label="unblock" color={T.success} bg={T.successBg} onPress={() => close(() => onAction('unblock'))} />
        ) : (
          <Option icon="notifications-off-outline" label="mute notifications" onPress={() => close(() => onAction('mute'))} />
        )}
        <Option icon="trash-outline" label="delete conversation" color={C.danger} bg={C.dangerSoft} onPress={() => close(() => onAction('delete'))} />
      </Animated.View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════
export default function MessagesScreen() {
  const navigation = useNavigation();
  const { token, user: currentUser } = useContext(AuthContext);
  const myId = currentUser?._id;
  const cacheHit = inboxCache.userId === myId && Array.isArray(inboxCache.conversations);

  const [conversations, setConversations] = useState(cacheHit ? inboxCache.conversations : []);
  const [blockedUserIds, setBlockedUserIds] = useState(cacheHit ? inboxCache.blocked : []);
  const [loading, setLoading] = useState(!cacheHit);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | unread
  const [selectedChat, setSelectedChat] = useState(null);

  const focusedRef = useRef(false);
  const refreshTimer = useRef(null);
  const busyRef = useRef(false);

  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  // One request round: inbox + blocked list together
  const loadAll = useCallback(async () => {
    if (!token || busyRef.current) return;
    busyRef.current = true;
    try {
      const [inboxRes, blockedRes] = await Promise.allSettled([
        axios.get(`${API_URL}/inbox`, config),
        axios.get(`${API_URL}/user/blocked`, config),
      ]);
      let blocked = inboxCache.userId === myId ? inboxCache.blocked : [];
      if (blockedRes.status === 'fulfilled') {
        blocked = (blockedRes.value.data?.blockedUsers || []).map((b) => b._id);
        setBlockedUserIds(blocked);
      }
      if (inboxRes.status === 'fulfilled') {
        const list = Array.isArray(inboxRes.value.data) ? inboxRes.value.data : [];
        const sorted = sortByLatest(list);
        setConversations(sorted);
        inboxCache.userId = myId;
        inboxCache.conversations = sorted;
        inboxCache.blocked = blocked;
      } else {
        console.log('[Chats] inbox failed', inboxRes.reason?.message);
      }
    } finally {
      busyRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, config, myId]);

  // Batch socket bursts into one refresh
  const scheduleRefresh = useCallback(() => {
    if (!focusedRef.current) return;
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(loadAll, 400);
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      loadAll();
      return () => {
        focusedRef.current = false;
        clearTimeout(refreshTimer.current);
      };
    }, [loadAll])
  );

  // Hardware back
  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'HomeTabs' }] }));
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack])
  );

  // Socket
  useEffect(() => {
    const onRead = ({ conversationId, userId }) => {
      if (userId === myId) return;
      setConversations((prev) => prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c)));
    };
    const onDeleted = ({ conversationId }) => {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      setSelectedChat((s) => (s?._id === conversationId ? null : s));
    };
    socket.on('inbox_update', scheduleRefresh);
    socket.on('new_message', scheduleRefresh);
    socket.on('message_deleted', scheduleRefresh);
    socket.on('messages_read', onRead);
    socket.on('conversation_deleted', onDeleted);
    return () => {
      socket.off('inbox_update', scheduleRefresh);
      socket.off('new_message', scheduleRefresh);
      socket.off('message_deleted', scheduleRefresh);
      socket.off('messages_read', onRead);
      socket.off('conversation_deleted', onDeleted);
    };
  }, [scheduleRefresh, myId]);

  // keep the cache in step with local edits
  useEffect(() => {
    if (myId && !loading) {
      inboxCache.userId = myId;
      inboxCache.conversations = conversations;
      inboxCache.blocked = blockedUserIds;
    }
  }, [conversations, blockedUserIds, myId, loading]);

  const blockedSet = useMemo(() => new Set(blockedUserIds), [blockedUserIds]);
  const isBlockedConv = useCallback((c) => {
    const o = otherOf(c, currentUser);
    return !!o && blockedSet.has(o._id);
  }, [blockedSet, currentUser]);

  const markRead = useCallback(async (conversationId) => {
    setConversations((prev) => prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c)));
    try {
      socket.emit('mark_messages_read', { conversationId, userId: myId });
      await axios.post(`${API_URL}/messages/mark-read/${conversationId}`, {}, config);
    } catch (err) {
      console.log('[Chats] mark read failed', err?.message);
    }
  }, [config, myId]);

  const openChat = useCallback((item, blocked) => {
    if (blocked) {
      Alert.alert('User blocked', 'Unblock this user to send messages again.');
      return;
    }
    const other = otherOf(item, currentUser);
    if (!item?._id || !other?._id) return;
    if ((item.unreadCount || 0) > 0) markRead(item._id);
    navigation.navigate('ChatDetailScreen', {
      conversationId: item._id,
      recipient: {
        _id: other._id,
        name: other.name || 'User',
        profileImage: other.profileImage || '',
        online: other.online || false,
      },
    });
  }, [currentUser, markRead, navigation]);

  const onLongPress = useCallback((id) => {
    const chat = conversations.find((c) => c._id === id);
    if (chat) setSelectedChat(chat);
  }, [conversations]);

  const deleteConversation = async (id) => {
    try {
      const res = await axios.delete(`${API_URL}/conversations/${id}`, config);
      if (res.data?.success) {
        socket.emit('delete_conversation', { conversationId: id });
        setConversations((prev) => prev.filter((c) => c._id !== id));
        Alert.alert('Deleted', 'Conversation deleted.');
      } else {
        Alert.alert('Error', res.data?.error || 'Could not delete this conversation.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || (err.request ? 'Network error. Check your connection.' : 'Could not delete this conversation.'));
    }
  };

  const handleAction = (action) => {
    const chat = selectedChat;
    if (!chat) return;
    const other = otherOf(chat, currentUser);

    if (action === 'profile' && other?._id) {
      navigation.navigate('UserProfile', { userId: other._id });
    } else if (action === 'mute') {
      axios.post(`${API_URL}/conversations/${chat._id}/mute`, {}, config)
        .then(() => {
          setConversations((prev) => prev.map((c) => (c._id === chat._id ? { ...c, muted: true } : c)));
          Alert.alert('Muted', `You won't get alerts from ${other?.name || 'this chat'}.`);
        })
        .catch(() => Alert.alert('Error', 'Could not mute this conversation.'));
    } else if (action === 'delete') {
      Alert.alert('Delete conversation?', 'This removes the chat for you. It cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteConversation(chat._id) },
      ]);
    } else if (action === 'unblock' && other?._id) {
      Alert.alert('Unblock user', `${other.name} will be able to message you again.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await axios.post(`${API_URL}/user/unblock/${other._id}`, {}, config);
              setBlockedUserIds((prev) => prev.filter((id) => id !== other._id));
              Alert.alert('Unblocked', `${other.name} has been unblocked.`);
              loadAll();
            } catch {
              Alert.alert('Error', 'Could not unblock. Please try again.');
            }
          },
        },
      ]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  // Visible list (blocked users are hidden from the inbox, same as before)
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      const o = otherOf(c, currentUser);
      if (!o) return false;
      if (blockedSet.has(o._id)) return false;
      if (filter === 'unread' && !(c.unreadCount > 0)) return false;
      if (q && !(o.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [conversations, currentUser, blockedSet, search, filter]);

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + (isBlockedConv(c) ? 0 : c.unreadCount || 0), 0),
    [conversations, isBlockedConv]
  );

  const selectedOther = otherOf(selectedChat, currentUser);

  const renderItem = useCallback(({ item }) => (
    <ChatItem
      item={item}
      currentUser={currentUser}
      onOpen={openChat}
      onLongPress={onLongPress}
      isBlocked={isBlockedConv(item)}
    />
  ), [currentUser, openChat, onLongPress, isBlockedConv]);

  const Empty = () => (
    <View style={styles.empty}>
      <EmptyState
        mood={search ? 'sus' : filter === 'unread' ? 'sorted' : 'sleepy'}
        title={search ? 'no chats found.' : filter === 'unread' ? 'all caught up.' : 'no chats yet.'}
        line={search ? 'try a different name.' : filter === 'unread' ? 'no unread messages right now.' : 'find people from your campus and say hi.'}
        actionLabel={!search && filter === 'all' ? 'find people' : undefined}
        onAction={!search && filter === 'all' ? () => navigation.navigate('Search') : undefined}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {/* Header */}
      <ScreenHeader
        title="chats"
        onBack={goBack}
        right={
          <>
            {totalUnread > 0 ? (
              <View style={styles.titlePill} accessibilityLabel={`${totalUnread} unread`}>
                <Text style={styles.titlePillText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
              </View>
            ) : null}
            <HeaderIconButton dark icon="create-outline" label="new chat" onPress={() => navigation.navigate('Search')} />
          </>
        }
      />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Input
          placeholder="search chats"
          accessibilityLabel="search chats"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          left={<Ionicons name="search" size={17} color={search ? C.dark : C.muted} style={{ marginRight: 8 }} />}
          right={
            search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="clear search">
                <Ionicons name="close-circle" size={18} color={C.muted} />
              </TouchableOpacity>
            ) : null
          }
        />
      </View>

      {/* Filter chips */}
      <View style={styles.chips}>
        {[
          { key: 'all', label: 'all' },
          { key: 'unread', label: totalUnread > 0 ? `unread · ${totalUnread}` : 'unread' },
        ].map((c) => {
          const on = filter === c.key;
          return <Chip key={c.key} label={c.label} selected={on} onPress={() => setFilter(c.key)} />;
        })}
      </View>

      {loading ? (
        <MessagesSkeleton />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, visible.length === 0 && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.dark]} tintColor={C.dark} />
          }
          ListEmptyComponent={Empty}
        />
      )}

      <ActionSheet
        visible={!!selectedChat}
        onClose={() => setSelectedChat(null)}
        onAction={handleAction}
        name={selectedOther?.name}
        image={selectedOther?.profileImage}
        isBlocked={selectedChat ? isBlockedConv(selectedChat) : false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  squareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.soft,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 20, fontFamily: F.heading, color: C.dark, letterSpacing: -0.3 },
  titlePill: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: C.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titlePillText: { color: C.gold, fontSize: 12, fontFamily: F.bodyBold },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // search + chips
  searchWrap: { paddingHorizontal: 16, paddingTop: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: C.soft,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchActive: { borderColor: C.dark, backgroundColor: C.white },
  searchInput: { flex: 1, fontSize: 15, fontFamily: F.body, color: C.dark, paddingVertical: 0 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.soft,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: C.dark, borderColor: C.dark },
  chipText: { fontSize: 13, fontFamily: F.bodyBold, color: C.text2 },
  chipTextOn: { color: C.gold },

  // list
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 30, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
  },
  rowUnread: { backgroundColor: C.goldSoft, borderColor: C.goldSoft },
  rowBody: { flex: 1, marginLeft: 12, borderBottomWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  name: { flex: 1, fontSize: 15.5, fontFamily: F.bodyBold, color: C.dark, marginRight: 8 },
  nameUnread: { fontFamily: F.bodyBold },
  mutedText: { color: C.muted },
  time: { fontSize: 12, color: C.muted, fontFamily: F.bodySemi },
  timeUnread: { color: C.dark, fontFamily: F.bodyBold },
  preview: { flex: 1, fontSize: 13.5, fontFamily: F.body, color: C.text2 },
  previewUnread: { color: C.dark, fontFamily: F.bodySemi },
  unreadPill: {
    marginLeft: 8,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: C.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: { color: C.gold, fontSize: 11, fontFamily: F.bodyBold },

  avatarFallback: { backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontFamily: F.bodyBold, color: C.dark },
  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: C.online,
    borderWidth: 2.5,
    borderColor: C.white,
  },

  // skeleton
  skeletonWrap: { paddingHorizontal: 20, paddingTop: 8 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  skeletonAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: T.sand, marginRight: 12 },
  skeletonLine: { height: 13, borderRadius: 6, backgroundColor: T.sand },

  // empty
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 60 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: C.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontFamily: F.heading, color: C.dark },
  emptySub: { fontSize: 13.5, fontFamily: F.body, color: C.muted, marginTop: 6, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: C.dark,
    paddingHorizontal: 20,
    height: 46,
    borderRadius: 14,
  },
  emptyBtnText: { color: C.white, fontSize: 14, fontFamily: F.bodyBold },

  // sheet
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: T.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
  },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: T.handle, alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  sheetName: { fontSize: 16, fontFamily: F.bodyBold, color: C.dark },
  sheetSub: { fontSize: 12, fontFamily: F.body, color: C.muted, marginTop: 2 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, minHeight: 56 },
  sheetIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sheetText: { flex: 1, fontSize: 15, fontFamily: F.bodyBold },
});
