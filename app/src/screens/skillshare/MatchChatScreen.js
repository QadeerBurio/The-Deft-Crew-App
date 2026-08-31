// screens/MatchChatScreen.js
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
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
  SafeAreaView,
  StatusBar,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  AppState,
  Modal
} from 'react-native';


import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AuthContext } from '../../context/AuthContext';
import { getMatchConversation, getMyMatches } from '../../api/api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadChatFile } from '../../api/api';

import ImageView from 'react-native-image-viewing';
import { Video, ResizeMode } from 'expo-av';
import * as Linking from 'expo-linking';

const BRAND = '#f9c349';
const INK = '#1a1a1a';
const MUTED = '#8E8E93';


// Mirrors api.js's getBaseURL() exactly, so the socket connection and raw
// fetch() below always hit the SAME backend (and therefore the same
// database) as the rest of the app's API calls — dev IP in dev, Railway in prod.
const getSocketUrl = () => {
  if (__DEV__) {
    const manifest = Constants.expoConfig || Constants.manifest || {};
    const hostUri = manifest.hostUri;
    const devIp = hostUri ? hostUri.split(':')[0] : '192.168.18.93';
    return `http://${devIp}:5000`; //apply railway url when deploying this feature
  }
  return 'https://the-deft-crew-production.up.railway.app';
};

const SOCKET_URL = getSocketUrl();

const timeAgo = (date) => {
  if (!date) return '';
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(date).toLocaleDateString();
};

const clockTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatDateDivider = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const OFFER_META = {
  barter: { label: 'EXCHANGE OFFER', icon: 'swap-horizontal' },
  paid: { label: 'PAID SERVICE', icon: 'cash' },
  job: { label: 'HIRE APPLICATION', icon: 'briefcase' },
};

// ==================== MESSAGE BUBBLE ====================
const MessageBubble = React.memo(({ item, isOwn, onMediaPress }) => {
  const renderContent = () => {
    switch (item.messageType) {
      case 'image':
        return (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onMediaPress(item, 'image')}>
            <Image source={{ uri: item.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
          </TouchableOpacity>
        );
      case 'video':
        return (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onMediaPress(item, 'video')}>
            <View style={styles.mediaVideoPlaceholder}>
              <Ionicons name="play-circle" size={36} color="#fff" />
              <Text style={styles.mediaVideoLabel}>Video</Text>
            </View>
          </TouchableOpacity>
        );
      case 'audio':
        return (
          <TouchableOpacity style={styles.mediaFileRow} onPress={() => onMediaPress(item, 'audio')}>
            <Ionicons name="musical-notes" size={20} color={isOwn ? INK : BRAND} />
            <Text style={[styles.mediaFileName, isOwn ? styles.messageTextOwn : styles.messageTextOther]} numberOfLines={1}>
              {item.mediaMetadata?.fileName || 'Audio message'}
            </Text>
          </TouchableOpacity>
        );
      case 'document':
        return (
          <TouchableOpacity style={styles.mediaFileRow} onPress={() => onMediaPress(item, 'document')}>
            <Ionicons name="document-text" size={20} color={isOwn ? INK : BRAND} />
            <Text style={[styles.mediaFileName, isOwn ? styles.messageTextOwn : styles.messageTextOther]} numberOfLines={1}>
              {item.mediaMetadata?.fileName || 'Document'}
            </Text>
            <Ionicons name="download-outline" size={16} color={isOwn ? INK : MUTED} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        );
      default:
        return (
          <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
            {item.text || ''}
          </Text>
        );
    }
  };

  return (
    <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther, item.messageType === 'image' && styles.bubbleMedia]}>
        {renderContent()}
      </View>
      <View style={[styles.messageMetaRow, isOwn ? styles.messageMetaRowOwn : styles.messageMetaRowOther]}>
        <Text style={styles.messageTime}>{clockTime(item.createdAt)}</Text>
        {isOwn && (
          <Ionicons
            name={item.isRead ? 'checkmark-done' : 'checkmark-done-outline'}
            size={13}
            color={item.isRead ? '#34C759' : MUTED}
            style={{ marginLeft: 3 }}
          />
        )}
      </View>
    </View>
  );
});

// ==================== MAIN COMPONENT ====================
export default function MatchChatScreen({ route, navigation }) {
  const { getCurrentUserId, user, isGuest, token } = useContext(AuthContext);

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
  const [conversationId, setConversationId] = useState(null);
  const [otherUser, setOtherUser] = useState(routeOtherUser || null);
  const [listingInfo, setListingInfo] = useState(routeListing || null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [typing, setTyping] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [uploading, setUploading] = useState(false);


  const [previewImages, setPreviewImages] = useState([]);
const [imageViewerVisible, setImageViewerVisible] = useState(false);
const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);

const handleMediaPress = async (item, type) => {
  if (type === 'image') {
    setPreviewImages([{ uri: item.mediaUrl }]);
    setImageViewerVisible(true);
  } else if (type === 'video') {
    setVideoPreviewUrl(item.mediaUrl);
  } else {
    // Documents and audio: open in the device's default handler/browser.
    // Cloudinary raw URLs are directly downloadable — the OS decides
    // whether to preview (PDF) or download (docx etc.), same as tapping
    // a file link in WhatsApp Web.
    try {
      const supported = await Linking.canOpenURL(item.mediaUrl);
      if (supported) {
        await Linking.openURL(item.mediaUrl);
      } else {
        Alert.alert('Cannot Open File', 'No app available to open this file type.');
      }
    } catch (err) {
      console.error('Open file error:', err);
      Alert.alert('Error', 'Could not open this file.');
    }
  }
};

  const flatListRef = useRef(null);
  const userId = getCurrentUserId();

  // ==================== SOCKET SETUP ====================
  useEffect(() => {
    if (isGuest || !userId || userId === 'guest-user') {
      setError('Please login to use chat features');
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
      if (conversationId) newSocket.emit('join_chat', conversationId);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [userId, isGuest, token, conversationId]);

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
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const handleTyping = (data) => {
      if (data.conversationId === conversationId && data.userId !== userId) {
        setTyping(data.isTyping);
      }
    };

    const handleMessageError = () => {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('message_error', handleMessageError);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('message_error', handleMessageError);
    };
  }, [socket, conversationId, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active' && conversationId) {
        fetchMessages();
      }
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, [appState, conversationId]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    );
    return () => showSub.remove();
  }, []);

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

  const fetchMatchData = useCallback(async () => {
    if (!userId || userId === 'guest-user' || isGuest) {
      setError('Please login to use chat features');
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
          if (data.messages) setMessages(data.messages);
        } else {
          setError('No conversation found for this match');
        }
      } else if (listingId) {
        const matchesData = await getMyMatches();
        const match = matchesData.matches?.find((m) => {
          const listing = m.listingId?._id || m.listingId;
          return listing === listingId && m.status === 'active';
        });

        if (match) {
          setMatchId(match._id);
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
          setError('No active match found for this listing');
        }
      }
    } catch (err) {
      console.error('Error fetching match:', err);
      setError(err.message || 'Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [matchId, listingId, userId, isGuest]);

  useEffect(() => { fetchMatchData(); }, [fetchMatchData]);

  useEffect(() => {
    if (!socket || !isConnected || !conversationId || !userId) return;
    const typingTimeout = setTimeout(() => {
      socket.emit('typing', { conversationId, userId, isTyping: false });
    }, 1500);
    return () => clearTimeout(typingTimeout);
  }, [inputText, socket, isConnected, conversationId, userId]);

  const handleInputChange = (text) => {
    setInputText(text);
    if (socket && isConnected && conversationId && userId) {
      socket.emit('typing', { conversationId, userId, isTyping: text.length > 0 });
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !socket || !isConnected || !conversationId || !userId) {
      if (!isConnected) Alert.alert('Disconnected', 'Please wait for reconnection...');
      return;
    }

    socket.emit('send_message', {
      conversationId,
      senderId: userId,
      text: inputText.trim(),
      messageType: 'text',
    });
    setInputText('');

    if (socket && isConnected) {
      socket.emit('typing', { conversationId, userId, isTyping: false });
    }
  };

  const sendFileMessage = async (asset, forcedMimeType) => {
  if (!socket || !isConnected || !conversationId || !userId) {
    Alert.alert('Disconnected', 'Please wait for reconnection...');
    return;
  }

  setUploading(true);
  try {
    const mimeType = forcedMimeType || asset.mimeType || 'application/octet-stream';
    const fileName = asset.name || asset.fileName || asset.uri.split('/').pop() || `file_${Date.now()}`;

    const { mediaUrl, messageType, mediaMetadata } = await uploadChatFile(asset.uri, mimeType, fileName);

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
    Alert.alert('Upload Failed', 'Could not send this file. Please try again.');
  } finally {
    setUploading(false);
  }
};

const handleAttachPress = () => {
  Alert.alert('Share', 'Choose what to share', [
    { text: 'Photo / Video', onPress: pickMedia },
    { text: 'Document', onPress: pickDocument },
    { text: 'Cancel', style: 'cancel' },
  ]);
};

const pickMedia = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 0.8,
  });
  if (result.canceled) return;

  const asset = result.assets[0];
  const inferredMime = asset.type === 'video' ? (asset.mimeType || 'video/mp4') : (asset.mimeType || 'image/jpeg');
  sendFileMessage(asset, inferredMime);
};

const pickDocument = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return;

  const asset = result.assets ? result.assets[0] : result;
  sendFileMessage(asset, asset.mimeType);
};

  const getUserInitial = () => (otherUser?.name || 'User').charAt(0).toUpperCase();

  const offerMeta = listingInfo ? OFFER_META[listingInfo.type] || OFFER_META.barter : null;

  const renderOfferCard = () => {
    if (!listingInfo) return null;
    return (
      <View style={styles.offerCard}>
        <View style={styles.offerIconWrap}>
          <Ionicons name={offerMeta.icon} size={16} color={BRAND} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.offerLabel}>{offerMeta.label}</Text>
          {listingInfo.type === 'barter' ? (
            <View style={styles.offerValueRow}>
              <Text style={styles.offerValue} numberOfLines={1}>
                {listingInfo.skillOffered?.skillName || listingInfo.title}
              </Text>
              <Ionicons name="swap-horizontal" size={13} color={MUTED} style={{ marginHorizontal: 6 }} />
              <Text style={styles.offerValue} numberOfLines={1}>
                {listingInfo.skillWanted?.skillName || 'Open to offers'}
              </Text>
            </View>
          ) : (
            <Text style={styles.offerValue} numberOfLines={1}>{listingInfo.title}</Text>
          )}
        </View>
      </View>
    );
  };

 const renderMessage = ({ item, index }) => {
  const senderId = item.sender?._id || item.sender;
  const isOwn = senderId === userId;
  const prev = messages[index - 1];
  const showDivider = !prev || new Date(prev.createdAt).toDateString() !== new Date(item.createdAt).toDateString();

  return (
    <View>
      {showDivider && (
        <View style={styles.dateDividerWrap}>
          <Text style={styles.dateDividerText}>{formatDateDivider(item.createdAt)}</Text>
        </View>
      )}
      <MessageBubble item={item} isOwn={isOwn} onMediaPress={handleMediaPress} />
    </View>
  );
};

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="alert-circle-outline" size={56} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMatchData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={INK} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => navigation.navigate('UserProfile', { userId: otherUser?._id })}
        >
          <View style={styles.headerAvatarWrap}>
            {otherUser?.profileImage ? (
              <Image source={{ uri: otherUser.profileImage }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                <Text style={styles.headerAvatarText}>{getUserInitial()}</Text>
              </View>
            )}
            <View style={[styles.onlineDot, isConnected && styles.onlineDotActive]} />
          </View>
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{otherUser?.name || 'User'}</Text>
            <Text style={[styles.headerStatus, isConnected ? styles.statusOnline : styles.statusOffline]}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={INK} />
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id || item.createdAt?.toString() || Math.random().toString()}
            renderItem={renderMessage}
            ListHeaderComponent={renderOfferCard}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color="#ddd" />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Say hello to start the conversation!</Text>
              </View>
            }
          />

          {typing && (
            <View style={styles.typingWrap}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoid}>
        <View style={styles.inputContainer}>

         <TouchableOpacity
  style={styles.attachButton}
  onPress={handleAttachPress}
  disabled={uploading}
>
  {uploading ? (
    <ActivityIndicator size="small" color={INK} />
  ) : (
    <Ionicons name="add" size={24} color={INK} />
  )}
</TouchableOpacity>

          <View style={styles.inputPill}>
            <TextInput
              style={styles.input}
              placeholder="Write a message..."
              placeholderTextColor={MUTED}
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={1000}
              editable={!isGuest && isConnected && !!userId && userId !== 'guest-user'}
            />
            <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Emoji picker will be available soon')}>
              <Ionicons name="happy-outline" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || !isConnected}
          >
            <Ionicons name="send" size={18} color={INK} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
            <ImageView
        images={previewImages}
        imageIndex={0}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />

      <Modal
        visible={!!videoPreviewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setVideoPreviewUrl(null)}
      >
        <View style={styles.videoModalBackdrop}>
          <TouchableOpacity style={styles.videoCloseBtn} onPress={() => setVideoPreviewUrl(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {videoPreviewUrl && (
            <Video
              source={{ uri: videoPreviewUrl }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
   

const styles = StyleSheet.create({



  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8f9fa' },
  loadingText: { marginTop: 12, fontSize: 14, color: MUTED },
  errorText: { fontSize: 15, color: '#FF3B30', textAlign: 'center', marginVertical: 14 },
  retryButton: { backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryButtonText: { color: INK, fontWeight: '800' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: Platform.OS === 'android' ? 34 : 0,
  },
  headerBtn: { width: 36, alignItems: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  headerAvatarWrap: { position: 'relative', marginRight: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarFallback: { backgroundColor: BRAND, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#4A3B10', fontSize: 16, fontWeight: '800' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#C7C7CC', borderWidth: 2, borderColor: '#fff',
  },
  onlineDotActive: { backgroundColor: '#34C759' },
  headerName: { fontSize: 16, fontWeight: '700', color: INK },
  headerStatus: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  statusOnline: { color: '#34C759' },
  statusOffline: { color: MUTED },

  chatContainer: { flex: 1 },
  messagesContainer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },

  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  offerIconWrap: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFF3D6',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  offerLabel: { fontSize: 10.5, fontWeight: '800', color: '#8a6d1d', letterSpacing: 0.6, marginBottom: 3 },
  offerValueRow: { flexDirection: 'row', alignItems: 'center' },
  offerValue: { fontSize: 14, fontWeight: '700', color: INK, flexShrink: 1 },

  dateDividerWrap: { alignItems: 'center', marginVertical: 14 },
  dateDividerText: {
    fontSize: 12, color: MUTED, fontWeight: '600', backgroundColor: '#F0F0F0',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },

  messageRow: { marginBottom: 12, maxWidth: '80%' },
  messageRowOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageRowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },



  bubbleMedia: { padding: 4, overflow: 'hidden' },
mediaImage: { width: 200, height: 200, borderRadius: 14 },
mediaVideoPlaceholder: {
  width: 200, height: 140, borderRadius: 14, backgroundColor: '#333',
  justifyContent: 'center', alignItems: 'center', gap: 4,
},
mediaVideoLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
mediaFileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 220 },
mediaFileName: { fontSize: 14, flexShrink: 1 },

  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  bubbleOwn: {
  backgroundColor: BRAND,
  borderBottomRightRadius: 6,
},

bubbleOther: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E5E5',
  borderBottomLeftRadius: 6,
},


messageText: { fontSize: 15, lineHeight: 21 },
messageTextOwn: {
  color: INK,
},
messageTextOther: {
  color: INK,
},



  messageMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  messageMetaRowOwn: { justifyContent: 'flex-end' },
  messageMetaRowOther: { justifyContent: 'flex-start' },
  messageTime: { fontSize: 11, color: MUTED },

  videoModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
videoCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
videoPlayer: { width: '100%', height: 300 },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#555', fontWeight: '600', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: MUTED, marginTop: 4 },

  typingWrap: { paddingHorizontal: 16, paddingBottom: 6 },
  typingBubble: {
    alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee0bd',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
  },
  typingDots: { flexDirection: 'row', gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: MUTED },

  keyboardAvoid: { backgroundColor: '#fff' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },
  attachButton: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  inputPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8, minHeight: 42, gap: 8,
  },
  input: { flex: 1, fontSize: 15, color: INK, maxHeight: 100, padding: 0 },
  sendButton: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: BRAND,
    justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
});