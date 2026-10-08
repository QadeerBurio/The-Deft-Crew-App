// screens/ChatMatch.js
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Image,
  TextInput,
  Keyboard,
  Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// works on Android edge-to-edge too (the app is wrapped in KeyboardProvider)
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills, no gradients (design system)
import { getMatchConversation, getConversationMessages, markMessagesRead } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

import { color as T, font as F } from "../../theme/tokens";
const { width, height } = Dimensions.get('window');

// last loaded thread per match, so reopening a chat is instant
const threadCache = new Map();

// Message Bubble Component
const MessageBubble = React.memo(({ message, isOwn }) => {
  const senderName = message.sender?.name || message.sender?.fullName || 'User';

  return (
    <View
      style={[
        styles.messageWrapper,
        isOwn ? styles.messageWrapperOwn : styles.messageWrapperOther,
      ]}
    >
      {!isOwn && (
        <View style={styles.senderAvatar}>
          <LinearGradient
            colors={[T.yellow, T.yellow]}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>
              {senderName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        </View>
      )}

      <View style={[
        styles.messageBubble,
        isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther
      ]}>
        {!isOwn && (
          <Text style={styles.senderNameText}>{senderName}</Text>
        )}
        <Text style={[
          styles.messageText,
          isOwn ? styles.messageTextOwn : styles.messageTextOther
        ]}>
          {message.text || message.content || message.message}
        </Text>
        <Text style={[
          styles.messageTime,
          isOwn ? styles.messageTimeOwn : styles.messageTimeOther
        ]}>
          {timeAgo(message.createdAt)}
        </Text>
      </View>
    </View>
  );
});

const keyExtractor = (item, index) => String(item._id || item.id || `${item.createdAt}-${index}`);

export default function ChatMatch({ route, navigation }) {
  const { getCurrentUserId } = useContext(AuthContext);
  const { matchId, listingId, otherUser, listing } = route.params || {};
  const insets = useSafeAreaInsets();

  const cached = matchId ? threadCache.get(matchId) : null;
  const [messages, setMessages] = useState(cached?.messages || []);
  const [loading, setLoading] = useState(!cached);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState(cached?.conversation || null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const sendingRef = useRef(false);
  const mountedRef = useRef(true);

  const userId = getCurrentUserId();

  // Get user display info
  const displayName = otherUser?.name || otherUser?.fullName || 'User';
  const displayImage = otherUser?.profileImage || null;
  const displayInitial = displayName.charAt(0).toUpperCase();

  useEffect(() => () => { mountedRef.current = false; }, []);

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated }));
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      if (matchId) {
        // Fetch match conversation
        const data = await getMatchConversation(matchId);
        if (!mountedRef.current) return;
        setConversation(data.conversation);
        setMessages(data.messages || []);
        threadCache.set(matchId, { conversation: data.conversation, messages: data.messages || [] });

        // Mark messages as read
        if (data.messages && data.messages.length > 0) {
          const unreadMessages = data.messages
            .filter(m => {
              const senderId = m.sender?._id || m.sender;
              return senderId !== userId && !m.isRead;
            })
            .map(m => m._id);

          if (unreadMessages.length > 0 && data.conversation) {
            markMessagesRead(data.conversation._id, unreadMessages).catch(() => {});
          }
        }
      } else if (listingId) {
        // Alternative: fetch from listing
        // You might need to implement this endpoint
      }

      scrollToEnd(false);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [matchId, listingId, userId, scrollToEnd]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Keep the latest message visible when the keyboard opens
  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTimeout(() => scrollToEnd(true), 100)
    );
    return () => keyboardShowListener.remove();
  }, [scrollToEnd]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DashboardMain');
  }, [navigation]);

  const openProfile = useCallback(() => {
    if (!otherUser?._id) return;
    navigation.navigate('HomeTabs', {
      screen: 'UserProfile',
      params: { userId: otherUser._id },
    });
  }, [navigation, otherUser?._id]);

  const handleSend = async () => {
    if (!newMessage.trim() || sendingRef.current) return;
    sendingRef.current = true;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistically add message
    const tempMessage = {
      _id: `temp_${Date.now()}`,
      text: messageText,
      sender: { name: 'You' },
      createdAt: new Date().toISOString(),
      isOwn: true,
      isRead: false,
      isTemp: true
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToEnd(true);

    try {
      // In a real app, you'd send via WebSocket or API
      // For now, simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update temp message with real data
      const realMessage = {
        ...tempMessage,
        _id: `msg_${Date.now()}`,
        isTemp: false,
        isRead: true
      };

      if (mountedRef.current) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === tempMessage._id ? realMessage : msg
          )
        );
      }
    } catch (err) {
      // Remove temp message on error
      if (mountedRef.current) setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
      console.error('Error sending message:', err);
    } finally {
      sendingRef.current = false;
      if (mountedRef.current) setSending(false);
    }
  };

  const renderMessage = useCallback(({ item }) => {
    const isOwn = item.sender?._id === userId || item.sender === userId || item.isOwn;
    return <MessageBubble message={item} isOwn={isOwn} />;
  }, [userId]);

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={[T.white, T.yellowSoft]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={T.ink} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerUserInfo}
            onPress={openProfile}
            activeOpacity={0.7}
          >
            <View style={styles.headerAvatar}>
              {displayImage ? (
                <Image source={{ uri: displayImage }} style={styles.headerAvatarImage} />
              ) : (
                <LinearGradient
                  colors={[T.yellow, T.yellow]}
                  style={styles.headerAvatarGradient}
                >
                  <Text style={styles.headerAvatarText}>{displayInitial}</Text>
                </LinearGradient>
              )}
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.headerUserText}>
              <Text style={styles.headerUserName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.headerListingTitle} numberOfLines={1}>
                {listing?.title || 'Match Conversation'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="ellipsis-vertical" size={20} color={T.ink} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#f9c34920', '#f5a62320']}
        style={styles.emptyIcon}
      >
        <Ionicons name="chatbubbles-outline" size={48} color={T.yellow} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>no messages yet</Text>
      <Text style={styles.emptySubtext}>
        Say hello to start the conversation!
      </Text>
    </View>
  );

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>loading conversation...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />

      {renderHeader()}

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          ListEmptyComponent={renderEmpty}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          initialNumToRender={20}
          maxToRenderPerBatch={15}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
        />

        <View style={styles.inputContainer}>
          <LinearGradient
            colors={[T.white, T.sand]}
            style={[styles.inputGradient, { paddingBottom: Math.max(insets.bottom, 10) }]}
          >
            <View style={styles.inputWrapper}>
              <View style={styles.inputField}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor={T.textMuted}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !newMessage.trim() && styles.sendButtonDisabled
                ]}
                onPress={handleSend}
                disabled={!newMessage.trim() || sending}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={newMessage.trim() ? [T.yellow, T.yellow] : ['#E5E5EA', '#E5E5EA']}
                  style={styles.sendGradient}
                >
                  {sending ? (
                    <ActivityIndicator color={T.white} size="small" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={20}
                      color={newMessage.trim() ? T.white : '#C7C7CC'}
                    />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.paper,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.paper,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16, fontFamily: F.body,
    color: T.textMuted,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  headerGradient: {
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.sand,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.line,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerAvatar: {
    position: 'relative',
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: T.white,
    fontSize: 16,
    fontFamily: F.bodyBold,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: T.success,
    borderWidth: 2,
    borderColor: T.white,
  },
  headerUserText: {
    marginLeft: 10,
    flex: 1,
  },
  headerUserName: {
    fontSize: 16,
    fontFamily: F.bodySemi,
    color: T.ink,
  },
  headerListingTitle: {
    fontSize: 12, fontFamily: F.body,
    color: T.textMuted,
  },
  headerAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    padding: 12,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageWrapperOwn: {
    justifyContent: 'flex-end',
  },
  messageWrapperOther: {
    justifyContent: 'flex-start',
  },
  senderAvatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatarGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: T.white,
    fontSize: 14,
    fontFamily: F.bodyBold,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleOwn: {
    backgroundColor: T.yellow,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: T.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: T.line,
  },
  senderNameText: {
    fontSize: 11,
    fontFamily: F.bodySemi,
    color: T.yellow,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15, fontFamily: F.body,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: T.white,
  },
  messageTextOther: {
    color: T.ink,
  },
  messageTime: {
    fontSize: 10, fontFamily: F.body,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeOther: {
    color: '#C7C7CC',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: F.headingBold,
    color: T.ink,
  },
  emptySubtext: {
    fontSize: 14, fontFamily: F.body,
    color: T.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: T.line,
  },
  inputGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: T.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 100,
  },
  input: {
    fontSize: 16, fontFamily: F.body,
    color: T.ink,
    padding: 0,
    minHeight: 36,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});