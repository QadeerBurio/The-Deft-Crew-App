// screens/MatchChatScreen.js
import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Image,
  Keyboard,
  Alert,
  AppState,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { getMatchConversation, getMyMatches, BASE_URL } from '../../api/api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadChatFile } from '../../api/api';

import { Video, ResizeMode } from 'expo-av';
import * as Linking from 'expo-linking';
import ImagePreviewModal from '../../../../components/media/ImagePreviewModal';

// ==================== DESIGN TOKENS ====================
const C = {
  white: '#ffffff',
  dark: '#1a1a1a',
  gold: '#f9c349',
  goldSoft: '#fff8e6',
  soft: '#F7F9F8',
  border: '#E8E8E8',
  divider: '#f2f2f2',
  muted: '#8a8a8a',
  text2: '#5f5f5f',
  danger: '#e11d48',
  ok: '#16a34a',
};

const SCREEN_W = Dimensions.get('window').width;
const IMAGE_W = Math.round(SCREEN_W * 0.7);

// Socket + raw fetch() use the SAME server as every other API call.
// (Before, in dev builds this pointed at a local IP:5000 while the API used
// Railway, so the socket never connected and the chat sat on "connecting…".)
const SOCKET_URL = String(BASE_URL || 'https://the-deft-crew-production.up.railway.app/api').replace(/\/api\/?$/, '');

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

const OFFER_META = {
  barter: { label: 'exchange offer', icon: 'swap-horizontal' },
  paid: { label: 'paid service', icon: 'cash' },
  job: { label: 'hire application', icon: 'briefcase' },
};

const STATUS_STYLE = {
  active: { bg: C.dark, fg: C.gold },
  completed: { bg: '#e7f6ec', fg: C.ok },
  cancelled: { bg: '#fde8ed', fg: C.danger },
  closed: { bg: '#fde8ed', fg: C.danger },
};

const senderOf = (m) => m?.sender?._id || m?.sender;

// ==================== MESSAGE ROW ====================
const MessageRow = React.memo(function MessageRow({
  item,
  isOwn,
  divider,
  grouped,
  onMediaPress,
}) {
  const time = clockTime(item.createdAt);

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

  const timeEl = (
    <View style={styles.metaRow}>
      <Text style={isOwn ? styles.timeOwn : styles.timeOther}>{time}</Text>
      {isOwn ? (
        <Ionicons
          name={item.isRead ? 'checkmark-done' : 'checkmark'}
          size={13}
          color={item.isRead ? C.gold : 'rgba(255,255,255,0.6)'}
          style={styles.tick}
        />
      ) : null}
    </View>
  );

  let content;
  switch (item.messageType) {
    case 'image': {
      const w = item.mediaMetadata?.width;
      const h = item.mediaMetadata?.height;
      const ratio = w && h ? Math.min(Math.max(h / w, 0.6), 1.4) : 1;
      content = (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onMediaPress(item, 'image')}>
          <Image
            source={{ uri: item.mediaUrl }}
            style={[styles.mediaImage, { height: Math.round(IMAGE_W * ratio) }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
      break;
    }
    case 'video':
      content = (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onMediaPress(item, 'video')}>
          <View style={styles.mediaVideo}>
            <View style={styles.playCircle}>
              <Ionicons name="play" size={22} color={C.dark} />
            </View>
            <Text style={styles.mediaVideoLabel}>video</Text>
          </View>
        </TouchableOpacity>
      );
      break;
    case 'audio':
    case 'document': {
      const isAudio = item.messageType === 'audio';
      content = (
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.fileRow}
          onPress={() => onMediaPress(item, item.messageType)}
        >
          <View style={[styles.fileIcon, isOwn ? styles.fileIconOwn : styles.fileIconOther]}>
            <Ionicons
              name={isAudio ? 'musical-notes' : 'document-text'}
              size={18}
              color={isOwn ? C.dark : C.gold}
            />
          </View>
          <Text
            style={[styles.fileName, isOwn ? styles.textOwn : styles.textOther]}
            numberOfLines={1}
          >
            {item.mediaMetadata?.fileName || (isAudio ? 'audio message' : 'document')}
          </Text>
          {!isAudio ? (
            <Ionicons
              name="download-outline"
              size={16}
              color={isOwn ? 'rgba(255,255,255,0.7)' : C.muted}
            />
          ) : null}
        </TouchableOpacity>
      );
      break;
    }
    default:
      content = (
        <Text style={[styles.msgText, isOwn ? styles.textOwn : styles.textOther]}>
          {item.text || ''}
        </Text>
      );
  }

  const isMedia = item.messageType === 'image' || item.messageType === 'video';

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
        <View
          style={[
            styles.bubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
            isMedia && styles.bubbleMedia,
          ]}
        >
          {content}
          <View style={isMedia ? styles.metaMedia : null}>{timeEl}</View>
        </View>
      </View>
    </View>
  );
});

const DateDivider = React.memo(function DateDivider({ label }) {
  return (
    <View style={styles.dividerWrap}>
      <View style={styles.dividerPill}>
        <Text style={styles.dividerText}>{label}</Text>
      </View>
    </View>
  );
});

// ==================== MAIN COMPONENT ====================
export default function MatchChatScreen({ route, navigation }) {
  const { getCurrentUserId, isGuest, token } = useContext(AuthContext);

  const {
    listingId,
    matchId: routeMatchId,
    listing: routeListing,
    otherUser: routeOtherUser,
  } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [matchId, setMatchId] = useState(routeMatchId);
  const [matchStatus, setMatchStatus] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [otherUser, setOtherUser] = useState(routeOtherUser || null);
  const [listingInfo, setListingInfo] = useState(routeListing || null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [previewImages, setPreviewImages] = useState([]);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);

  const flatListRef = useRef(null);
  const conversationIdRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const userId = getCurrentUserId();

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const scrollToLatest = useCallback(() => {
    // list is inverted, so the latest message lives at offset 0
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleMediaPress = useCallback(async (item, type) => {
    if (type === 'image') {
      setPreviewImages([{ uri: item.mediaUrl }]);
      setImageViewerVisible(true);
    } else if (type === 'video') {
      setVideoPreviewUrl(item.mediaUrl);
    } else {
      // Documents and audio: open in the device's default handler/browser.
      try {
        const supported = await Linking.canOpenURL(item.mediaUrl);
        if (supported) {
          await Linking.openURL(item.mediaUrl);
        } else {
          Alert.alert('cannot open file', 'no app available to open this file type.');
        }
      } catch (err) {
        console.error('Open file error:', err);
        Alert.alert('error', 'could not open this file.');
      }
    }
  }, []);

  // ==================== SOCKET SETUP ====================
  // One socket per user session. conversationId is read from a ref so the
  // socket is not torn down and rebuilt when the conversation loads.
  useEffect(() => {
    if (isGuest || !userId || userId === 'guest-user') {
      setError('please login to use chat features');
      setLoading(false);
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: { token },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      if (userId) newSocket.emit('user_online', userId);
    });

    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', () => setIsConnected(false));

    newSocket.on('reconnect', () => {
      setIsConnected(true);
      if (userId) newSocket.emit('user_online', userId);
      if (conversationIdRef.current) newSocket.emit('join_chat', conversationIdRef.current);
    });

    setSocket(newSocket);

    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, [userId, isGuest, token]);

  useEffect(() => {
    if (socket && conversationId && isConnected) {
      socket.emit('join_chat', conversationId);
    }
  }, [socket, conversationId, isConnected]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        scrollToLatest();
      }
    };

    const handleTyping = (data) => {
      if (data.conversationId === conversationId && data.userId !== userId) {
        setTyping(data.isTyping);
      }
    };

    const handleMessageError = () => {
      Alert.alert('error', 'failed to send message. please try again.');
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('message_error', handleMessageError);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('message_error', handleMessageError);
    };
  }, [socket, conversationId, userId, scrollToLatest]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !userId || userId === 'guest-user') return;
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const response = await fetch(`${SOCKET_URL}/api/chat/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${storedToken || token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [conversationId, userId, token]);

  // Refetch when the app comes back to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        fetchMessages();
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [fetchMessages]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTimeout(scrollToLatest, 100)
    );
    return () => showSub.remove();
  }, [scrollToLatest]);

  const fetchMatchData = useCallback(async () => {
    if (!userId || userId === 'guest-user' || isGuest) {
      setError('please login to use chat features');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (matchId) {
        const data = await getMatchConversation(matchId);
        const conversation = data.conversation;
        if (conversation) {
          setConversationId(conversation._id);
          const participants = conversation.participants || [];
          const other = participants.find((p) => p._id !== userId);
          setOtherUser(data.otherUser || other || routeOtherUser || null);
          if (data.listing) setListingInfo(data.listing);
          if (data.match?.status) setMatchStatus(data.match.status);
          if (data.messages) setMessages(data.messages);
        } else {
          setError('no conversation found for this match');
        }
      } else if (listingId) {
        const matchesData = await getMyMatches();
        const match = matchesData.matches?.find((m) => {
          const listing = m.listingId?._id || m.listingId;
          return listing === listingId && m.status === 'active';
        });

        if (match) {
          setMatchId(match._id);
          setMatchStatus(match.status || null);
          const data = await getMatchConversation(match._id);
          const conversation = data.conversation;
          if (conversation) {
            setConversationId(conversation._id);
            const other = conversation.participants?.find((p) => p._id !== userId) || null;
            setOtherUser(other || data.otherUser || routeOtherUser || null);
            if (match.listingId && typeof match.listingId === 'object') setListingInfo(match.listingId);
            if (data.messages) setMessages(data.messages);
          }
        } else {
          setError('no active match found for this listing');
        }
      }
    } catch (err) {
      console.error('Error fetching match:', err);
      setError(err.message || 'failed to load match');
    } finally {
      setLoading(false);
    }
  }, [matchId, listingId, userId, isGuest]);

  useEffect(() => {
    fetchMatchData();
  }, [fetchMatchData]);

  // Send "stopped typing" 1.5s after the last keystroke.
  useEffect(() => {
    if (!socket || !isConnected || !conversationId || !userId) return;
    const typingTimeout = setTimeout(() => {
      socket.emit('typing', { conversationId, userId, isTyping: false });
    }, 1500);
    return () => clearTimeout(typingTimeout);
  }, [inputText, socket, isConnected, conversationId, userId]);

  const handleInputChange = useCallback(
    (text) => {
      setInputText(text);
      if (socket && isConnected && conversationId && userId) {
        socket.emit('typing', { conversationId, userId, isTyping: text.length > 0 });
      }
    },
    [socket, isConnected, conversationId, userId]
  );

  const sendMessage = useCallback(() => {
    if (!inputText.trim() || !socket || !isConnected || !conversationId || !userId) {
      if (!isConnected) Alert.alert('disconnected', 'please wait for reconnection…');
      return;
    }

    socket.emit('send_message', {
      conversationId,
      senderId: userId,
      text: inputText.trim(),
      messageType: 'text',
    });
    setInputText('');
    socket.emit('typing', { conversationId, userId, isTyping: false });
  }, [inputText, socket, isConnected, conversationId, userId]);

  const sendFileMessage = useCallback(
    async (asset, forcedMimeType) => {
      if (!socket || !isConnected || !conversationId || !userId) {
        Alert.alert('disconnected', 'please wait for reconnection…');
        return;
      }

      setUploading(true);
      try {
        const mimeType = forcedMimeType || asset.mimeType || 'application/octet-stream';
        const fileName =
          asset.name || asset.fileName || asset.uri.split('/').pop() || `file_${Date.now()}`;

        const { mediaUrl, messageType, mediaMetadata } = await uploadChatFile(
          asset.uri,
          mimeType,
          fileName
        );

        socket.emit('send_message', {
          conversationId,
          senderId: userId,
          text: '',
          messageType,
          mediaUrl,
          mediaMetadata,
        });
      } catch (err) {
        console.error('File send error:', err);
        Alert.alert('upload failed', 'could not send this file. please try again.');
      } finally {
        setUploading(false);
      }
    },
    [socket, isConnected, conversationId, userId]
  );

  const pickMedia = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const inferredMime =
      asset.type === 'video' ? asset.mimeType || 'video/mp4' : asset.mimeType || 'image/jpeg';
    sendFileMessage(asset, inferredMime);
  }, [sendFileMessage]);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets ? result.assets[0] : result;
    sendFileMessage(asset, asset.mimeType);
  }, [sendFileMessage]);

  const handleAttachPress = useCallback(() => {
    Alert.alert('share', 'choose what to share', [
      { text: 'photo / video', onPress: pickMedia },
      { text: 'document', onPress: pickDocument },
      { text: 'cancel', style: 'cancel' },
    ]);
  }, [pickMedia, pickDocument]);

  const openProfile = useCallback(() => {
    navigation.navigate('UserProfile', { userId: otherUser?._id });
  }, [navigation, otherUser?._id]);

  const handleMorePress = useCallback(() => {
    Alert.alert(otherUser?.name || 'options', undefined, [
      { text: 'view profile', onPress: openProfile },
      { text: 'cancel', style: 'cancel' },
    ]);
  }, [otherUser?.name, openProfile]);

  // ==================== DERIVED ROWS ====================
  // Precompute divider + grouping in chronological order, then reverse for
  // the inverted list so each row receives only primitive props.
  const rows = useMemo(() => {
    const out = new Array(messages.length);
    for (let i = 0; i < messages.length; i++) {
      const item = messages[i];
      const prev = messages[i - 1];
      const sender = senderOf(item);
      const newDay = !prev || dayKey(prev.createdAt) !== dayKey(item.createdAt);
      out[messages.length - 1 - i] = {
        key: item._id || `${item.createdAt || 'm'}-${i}`,
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
      <MessageRow
        item={row.item}
        isOwn={row.isOwn}
        divider={row.divider}
        grouped={row.grouped}
        onMediaPress={handleMediaPress}
      />
    ),
    [handleMediaPress]
  );

  const offerMeta = listingInfo ? OFFER_META[listingInfo.type] || OFFER_META.barter : null;
  const headerSub = !isConnected
    ? 'connecting…'
    : listingInfo?.title
      ? listingInfo.title.toLowerCase()
      : 'skillshare match';
  const statusKey = matchStatus ? String(matchStatus).toLowerCase() : null;
  const statusStyle = statusKey ? STATUS_STYLE[statusKey] || STATUS_STYLE.active : null;
  const canSend = !!inputText.trim() && isConnected;
  const inputEditable = !isGuest && isConnected && !!userId && userId !== 'guest-user';

  // ==================== LOADING / ERROR ====================
  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <ActivityIndicator size="large" color={C.dark} />
        <Text style={styles.loadingText}>loading chat…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <View style={styles.errorTile}>
          <Ionicons name="alert-circle-outline" size={32} color={C.danger} />
        </View>
        <Text style={styles.errorTitle}>couldn't open this chat</Text>
        <Text style={styles.errorText}>{String(error).toLowerCase()}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.ghostBtnText}>go back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.darkBtn} onPress={fetchMatchData}>
            <Text style={styles.darkBtnText}>try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== MAIN ====================
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.squareBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-back" size={21} color={C.dark} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo} onPress={openProfile} activeOpacity={0.7}>
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
        </TouchableOpacity>

        <TouchableOpacity style={styles.squareBtn} onPress={handleMorePress} activeOpacity={0.7}>
          <Ionicons name="ellipsis-horizontal" size={19} color={C.dark} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Listing / offer context */}
        {listingInfo ? (
          <View style={styles.ctxCard}>
            <View style={styles.ctxIcon}>
              <Ionicons name={offerMeta.icon} size={17} color={C.gold} />
            </View>
            <View style={styles.ctxBody}>
              {listingInfo.type === 'barter' ? (
                <View style={styles.ctxTitleRow}>
                  <Text style={styles.ctxTitle} numberOfLines={1}>
                    {listingInfo.skillOffered?.skillName || listingInfo.title}
                  </Text>
                  <Ionicons
                    name="swap-horizontal"
                    size={13}
                    color={C.muted}
                    style={styles.ctxSwap}
                  />
                  <Text style={styles.ctxTitle} numberOfLines={1}>
                    {listingInfo.skillWanted?.skillName || 'open to offers'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.ctxTitle} numberOfLines={1}>
                  {listingInfo.title}
                </Text>
              )}
              <Text style={styles.ctxSub} numberOfLines={1}>
                {offerMeta.label}
              </Text>
            </View>
            {statusStyle ? (
              <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.fg }]}>{statusKey}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Messages */}
        {messages.length === 0 ? (
          <TouchableOpacity activeOpacity={1} style={styles.empty} onPress={Keyboard.dismiss}>
            <View style={styles.emptyTile}>
              <Ionicons name="chatbubbles-outline" size={32} color={C.dark} />
            </View>
            <Text style={styles.emptyTitle}>start the conversation</Text>
            <Text style={styles.emptySub}>say hi and agree on the details.</Text>
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
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handleAttachPress}
            disabled={uploading || !inputEditable}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={C.dark} />
            ) : (
              <Ionicons name="add" size={22} color={C.dark} />
            )}
          </TouchableOpacity>

          <TextInput
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

      <ImagePreviewModal
        visible={imageViewerVisible}
        images={previewImages}
        onRequestClose={() => setImageViewerVisible(false)}
      />

      <Modal
        visible={!!videoPreviewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setVideoPreviewUrl(null)}
      >
        <View style={styles.videoBackdrop}>
          <TouchableOpacity style={styles.videoClose} onPress={() => setVideoPreviewUrl(null)}>
            <Ionicons name="close" size={24} color={C.white} />
          </TouchableOpacity>
          {videoPreviewUrl ? (
            <Video
              source={{ uri: videoPreviewUrl }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: C.white },

  // loading / error
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: C.white,
  },
  loadingText: { marginTop: 12, fontSize: 13.5, color: C.muted, fontWeight: '600' },
  errorTile: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#fde8ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: { marginTop: 16, fontSize: 18, fontWeight: '900', color: C.dark },
  errorText: { marginTop: 6, fontSize: 13.5, color: C.muted, textAlign: 'center' },
  errorActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  ghostBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: C.soft,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
  },
  ghostBtnText: { fontSize: 13.5, fontWeight: '800', color: C.dark },
  darkBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: C.dark,
    justifyContent: 'center',
  },
  darkBtnText: { fontSize: 13.5, fontWeight: '800', color: C.gold },

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
  onlineDotOn: { backgroundColor: C.ok },
  headerText: { flex: 1, marginLeft: 10 },
  headerName: { fontSize: 16, fontWeight: '900', color: C.dark },
  headerSub: { fontSize: 11.5, color: C.muted, marginTop: 1, fontWeight: '600' },

  // context card
  ctxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.goldSoft,
    borderRadius: 16,
    margin: 12,
    marginBottom: 4,
    padding: 12,
  },
  ctxIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  ctxBody: { flex: 1, marginRight: 8 },
  ctxTitleRow: { flexDirection: 'row', alignItems: 'center' },
  ctxTitle: { fontSize: 14, fontWeight: '800', color: C.dark, flexShrink: 1 },
  ctxSwap: { marginHorizontal: 6 },
  ctxSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  statusPill: {
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  statusText: { fontSize: 11.5, fontWeight: '800' },

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
  bubbleMedia: { padding: 4, paddingTop: 4, paddingBottom: 4 },

  msgText: { fontSize: 14.5, lineHeight: 20 },
  textOwn: { color: C.white },
  textOther: { color: C.dark },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  metaMedia: { paddingHorizontal: 6, paddingBottom: 2 },
  timeOwn: { fontSize: 10.5, color: 'rgba(255,255,255,0.6)' },
  timeOther: { fontSize: 10.5, color: C.muted },
  tick: { marginLeft: 3 },

  mediaImage: { width: IMAGE_W, borderRadius: 14, backgroundColor: C.border },
  mediaVideo: {
    width: IMAGE_W,
    height: Math.round(IMAGE_W * 0.62),
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.gold,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
  },
  mediaVideoLabel: { color: C.white, fontSize: 12, fontWeight: '700', marginTop: 6 },

  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 230, paddingVertical: 2 },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIconOwn: { backgroundColor: C.gold },
  fileIconOther: { backgroundColor: C.dark },
  fileName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },

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
    paddingVertical: 8,
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

  // video modal
  videoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: { width: '100%', height: 300 },
});
