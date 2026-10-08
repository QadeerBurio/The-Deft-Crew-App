// screens/InquiryChatScreen.js
import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  StatusBar,
  Image,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// works on Android edge-to-edge too (the app is wrapped in KeyboardProvider)
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import { getConversationMessages, markMessagesRead } from '../../api/api';

const SOCKET_URL = __DEV__ ? 'https://the-deft-crew-production.up.railway.app' : 'https://the-deft-crew-production.up.railway.app';

// ==================== DESIGN TOKENS (same as MatchChatScreen) ====================
const C = {
  white: '#ffffff',
  dark: '#1a1a1a',
  gold: '#f9c349',
  goldSoft: '#fff8e6',
  soft: '#F7F9F8',
  border: '#E8E8E8',
  divider: '#f2f2f2',
  muted: '#8a8a8a',
};

// last loaded thread per conversation, so reopening a chat is instant
const threadCache = new Map();

// ==================== HELPERS ====================
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const clockTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m < 10 ? '0' : ''}${m} ${ap}`;
};

const dayKey = (date) => {
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toDateString();
};

const formatDateDivider = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'today';
  if (d.toDateString() === yesterday.toDateString()) return 'yesterday';
  const base = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === today.getFullYear() ? base : `${base} ${d.getFullYear()}`;
};

const senderOf = (m) => m?.sender?._id || m?.sender;

// ==================== MESSAGE ROW ====================
const DateDivider = React.memo(function DateDivider({ label }) {
  return (
    <View style={styles.dividerWrap}>
      <View style={styles.dividerPill}>
        <Text style={styles.dividerText}>{label}</Text>
      </View>
    </View>
  );
});

const MessageRow = React.memo(function MessageRow({ item, isOwn, divider, grouped }) {
  if (item.messageType === 'system') {
    return (
      <View>
        {divider ? <DateDivider label={divider} /> : null}
        <View style={styles.systemWrap}>
          <View style={styles.systemPill}>
            <Text style={styles.systemText}>{item.text || ''}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View>
      {divider ? <DateDivider label={divider} /> : null}
      <View
        style={[
          styles.row,
          isOwn ? styles.rowOwn : styles.rowOther,
          grouped ? styles.rowGrouped : styles.rowSpaced,
        ]}
      >
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text style={[styles.msgText, isOwn ? styles.textOwn : styles.textOther]}>
            {item.text || ''}
          </Text>
          <View style={styles.metaRow}>
            <Text style={isOwn ? styles.timeOwn : styles.timeOther}>{clockTime(item.createdAt)}</Text>
            {isOwn ? (
              <Ionicons
                name={item.isRead ? 'checkmark-done' : 'checkmark'}
                size={13}
                color={item.isRead ? C.gold : 'rgba(255,255,255,0.6)'}
                style={styles.tick}
              />
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
});

// ==================== MAIN COMPONENT ====================
export default function InquiryChatScreen({ route, navigation }) {
  const { getCurrentUserId } = useContext(AuthContext);
  // otherParticipantId is passed by callers; kept in the params contract
  const { threadId, listingTitle, otherParticipantId, listingId } = route.params || {};
  const insets = useSafeAreaInsets();

  // follow the route param directly so a reused screen picks up a new thread
  const conversationId = threadId;
  const cached = conversationId ? threadCache.get(conversationId) : null;

  const [messages, setMessages] = useState(cached?.messages || []);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(!cached);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [otherUser, setOtherUser] = useState(cached?.otherUser || null);
  const [typing, setTyping] = useState(false);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const shownIdRef = useRef(conversationId);
  const userId = getCurrentUserId();

  useEffect(() => () => { mountedRef.current = false; }, []);

  // thread changed while this screen stayed mounted: show its cache (or spinner)
  useEffect(() => {
    if (shownIdRef.current === conversationId) return;
    shownIdRef.current = conversationId;
    const c = conversationId ? threadCache.get(conversationId) : null;
    setMessages(c?.messages || []);
    setOtherUser(c?.otherUser || null);
    setTyping(false);
    setLoading(!c);
  }, [conversationId]);

  const scrollToLatest = useCallback(() => {
    // list is inverted, so the latest message lives at offset 0
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Initialize socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      if (userId) {
        newSocket.emit('user_online', userId);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.log('Socket connection error:', err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  // Join conversation
  useEffect(() => {
    if (socket && conversationId && isConnected) {
      socket.emit('join_chat', conversationId);
    }
  }, [socket, conversationId, isConnected]);

  // Listen for messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => {
          if (message._id && prev.some((m) => m._id === message._id)) return prev;
          const next = [...prev, message];
          const c = threadCache.get(conversationId);
          threadCache.set(conversationId, { ...(c || {}), messages: next });
          return next;
        });
        setTimeout(scrollToLatest, 100);
      }
    };

    const handleTyping = (data) => {
      if (data.conversationId === conversationId && data.userId !== userId) {
        setTyping(data.isTyping);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [socket, conversationId, userId, scrollToLatest]);

  // Send "stopped typing" 2s after the last keystroke
  useEffect(() => {
    if (!socket || !isConnected || !conversationId) return;

    const typingTimeout = setTimeout(() => {
      socket.emit('typing', {
        conversationId,
        userId,
        isTyping: false
      });
    }, 2000);

    return () => clearTimeout(typingTimeout);
  }, [inputText, socket, isConnected, conversationId, userId]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setLoading(false); return; }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await getConversationMessages(conversationId);
      if (!mountedRef.current || shownIdRef.current !== conversationId) return;
      const list = data.messages || [];
      setMessages(list);

      // Set other user info
      let other = threadCache.get(conversationId)?.otherUser || null;
      if (data.participants) {
        other = data.participants.find(p => p._id !== userId) || null;
        setOtherUser(other);
      }
      threadCache.set(conversationId, { messages: list, otherUser: other });

      // Mark as read (in the background, so the chat shows right away)
      if (list.length > 0) {
        const unreadIds = list
          .filter(msg => msg.sender?._id !== userId && !msg.isRead)
          .map(msg => msg._id);
        if (unreadIds.length > 0) {
          markMessagesRead(conversationId, unreadIds).catch((err) => {
            console.error('Error marking messages read:', err);
          });
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [conversationId, userId]);

  // cached thread shows instantly; refresh quietly every time the chat is shown
  useFocusEffect(
    useCallback(() => {
      fetchMessages();
    }, [fetchMessages])
  );

  // Keep the latest message visible when the keyboard opens
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTimeout(scrollToLatest, 100)
    );
    return () => showSub.remove();
  }, [scrollToLatest]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DashboardMain');
  }, [navigation]);

  const openListing = useCallback(() => {
    navigation.navigate('ListingDetail', { id: listingId });
  }, [navigation, listingId]);

  const handleAttachPress = useCallback(() => {
    Alert.alert('Coming Soon', 'File attachment will be available soon');
  }, []);

  const handleInputChange = useCallback((text) => {
    setInputText(text);

    if (socket && isConnected && conversationId) {
      socket.emit('typing', {
        conversationId,
        userId,
        isTyping: text.length > 0
      });
    }
  }, [socket, isConnected, conversationId, userId]);

  const sendMessage = useCallback(() => {
    if (!inputText.trim() || !socket || !isConnected || !conversationId) return;

    const messageData = {
      conversationId,
      senderId: userId,
      text: inputText.trim(),
      messageType: 'text'
    };

    socket.emit('send_message', messageData);
    setInputText('');

    // Stop typing indicator
    socket.emit('typing', {
      conversationId,
      userId,
      isTyping: false
    });
  }, [inputText, socket, isConnected, conversationId, userId]);

  // ==================== DERIVED ROWS ====================
  // divider + grouping computed in chronological order, then reversed for the inverted list
  const rows = useMemo(() => {
    const out = new Array(messages.length);
    for (let i = 0; i < messages.length; i++) {
      const item = messages[i];
      const prev = messages[i - 1];
      const sender = senderOf(item);
      const newDay = !prev || dayKey(prev.createdAt) !== dayKey(item.createdAt);
      out[messages.length - 1 - i] = {
        key: String(item._id || `${item.createdAt || 'm'}-${i}`),
        item,
        isOwn: sender === userId,
        divider: newDay ? formatDateDivider(item.createdAt) : null,
        grouped:
          !newDay &&
          !!prev &&
          prev.messageType !== 'system' &&
          item.messageType !== 'system' &&
          senderOf(prev) === sender,
      };
    }
    return out;
  }, [messages, userId]);

  const keyExtractor = useCallback((row) => row.key, []);

  const renderItem = useCallback(
    ({ item: row }) => (
      <MessageRow item={row.item} isOwn={row.isOwn} divider={row.divider} grouped={row.grouped} />
    ),
    []
  );

  const headerSub = !isConnected
    ? 'connecting…'
    : listingTitle
      ? String(listingTitle).toLowerCase()
      : 'listing inquiry';
  const canSend = !!inputText.trim() && isConnected;
  const inputEditable = isConnected && !!userId;

  // ==================== LOADING ====================
  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <ActivityIndicator size="large" color={C.dark} />
        <Text style={styles.loadingText}>loading chat…</Text>
      </SafeAreaView>
    );
  }

  // ==================== MAIN ====================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.squareBtn}
          onPress={goBack}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-back" size={21} color={C.dark} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View>
            {otherUser?.profileImage ? (
              <Image source={{ uri: otherUser.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>
                  {(otherUser?.name || 'u').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.onlineDot, isConnected && styles.onlineDotOn]} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser?.name || 'user'}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {typing ? 'typing…' : headerSub}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.squareBtn} onPress={openListing} activeOpacity={0.7}>
          <Ionicons name="document-text-outline" size={19} color={C.dark} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {/* Messages */}
        {messages.length === 0 ? (
          <TouchableOpacity activeOpacity={1} style={styles.empty} onPress={Keyboard.dismiss}>
            <View style={styles.emptyTile}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={C.dark} />
            </View>
            <Text style={styles.emptyTitle}>no messages yet</Text>
            <Text style={styles.emptySub}>start the conversation about this listing.</Text>
          </TouchableOpacity>
        ) : (
          <FlatList
            ref={flatListRef}
            style={styles.flex}
            data={rows}
            inverted
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}

        {typing ? (
          <View style={styles.typingWrap}>
            <View style={styles.typingBubble}>
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </View>
          </View>
        ) : null}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handleAttachPress}
            disabled={!inputEditable}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={C.dark} />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={isConnected ? 'message…' : 'connecting…'}
            placeholderTextColor={C.muted}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
            editable={inputEditable}
          />

          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnOff]}
            onPress={sendMessage}
            disabled={!canSend}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={20} color={canSend ? C.gold : '#9a9a9a'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: C.white },

  // loading
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: C.white,
  },
  loadingText: { marginTop: 12, fontSize: 13.5, color: C.muted, fontWeight: '600' },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
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
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft },
  avatarFallback: { backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: C.dark, fontSize: 16, fontWeight: '900' },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#cfcfcf',
    borderWidth: 2,
    borderColor: C.white,
  },
  onlineDotOn: { backgroundColor: '#16a34a' },
  headerText: { flex: 1, marginLeft: 10 },
  headerName: { fontSize: 16, fontWeight: '900', color: C.dark },
  headerSub: { fontSize: 11.5, color: C.muted, marginTop: 1, fontWeight: '600' },

  // list
  listContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },

  dividerWrap: { alignItems: 'center', marginTop: 14, marginBottom: 4 },
  dividerPill: {
    backgroundColor: C.soft,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dividerText: { fontSize: 11.5, fontWeight: '800', color: C.muted },

  systemWrap: { alignItems: 'center', marginVertical: 8 },
  systemPill: {
    backgroundColor: C.goldSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  systemText: { fontSize: 11.5, color: C.muted, fontWeight: '700', textAlign: 'center' },

  row: { maxWidth: '80%' },
  rowOwn: { alignSelf: 'flex-end' },
  rowOther: { alignSelf: 'flex-start' },
  rowGrouped: { marginTop: 4 },
  rowSpaced: { marginTop: 10 },

  bubble: { paddingHorizontal: 13, paddingTop: 8, paddingBottom: 6, borderRadius: 18 },
  bubbleOwn: { backgroundColor: C.dark, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: C.soft, borderBottomLeftRadius: 6 },

  msgText: { fontSize: 14.5, lineHeight: 20 },
  textOwn: { color: C.white },
  textOther: { color: C.dark },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  timeOwn: { fontSize: 10.5, color: 'rgba(255,255,255,0.6)' },
  timeOther: { fontSize: 10.5, color: C.muted },
  tick: { marginLeft: 3 },

  // empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTile: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '900', color: C.dark },
  emptySub: { marginTop: 6, fontSize: 13.5, color: C.muted, textAlign: 'center' },

  // typing
  typingWrap: { paddingHorizontal: 14, paddingBottom: 6 },
  typingBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    backgroundColor: C.soft,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.muted },

  // input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.soft,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: 23,
    backgroundColor: C.soft,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 13 : 10,
    paddingBottom: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 14.5,
    color: C.dark,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnOff: { backgroundColor: '#e9e9e9' },
});
