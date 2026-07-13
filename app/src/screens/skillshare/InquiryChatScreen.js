// screens/InquiryChatScreen.js
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
  Animated,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import { getConversationMessages, markMessagesRead } from '../../api/api';
import { timeAgo } from '../../utils/time';

const { width, height } = Dimensions.get('window');
const SOCKET_URL = __DEV__ ? 'http://192.168.18.93:5000' : 'https://the-deft-crew-production.up.railway.app';

// Message Bubble Component with animations
const MessageBubble = React.memo(({ item, isOwn, timeAgo }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isOwn ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 35,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isOwn ? styles.messageRowOwn : styles.messageRowOther,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
        <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
          {item.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
            {timeAgo(item.createdAt)}
          </Text>
          {isOwn && (
            <Ionicons 
              name="checkmark-done-outline" 
              size={12} 
              color="rgba(255,255,255,0.7)" 
              style={styles.messageStatus}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
});

export default function InquiryChatScreen({ route, navigation }) {
  const { getCurrentUserId, user, getUserName } = useContext(AuthContext);
  const { threadId, listingTitle, otherParticipantId, listingId } = route.params;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState(threadId);
  const [otherUser, setOtherUser] = useState(null);
  const [typing, setTyping] = useState(false);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const userId = getCurrentUserId();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
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
        setMessages(prev => [...prev, message]);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
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
  }, [socket, conversationId, userId]);

  // Typing indicator
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
  }, [inputText]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getConversationMessages(conversationId);
      setMessages(data.messages || []);
      
      // Set other user info
      if (data.participants) {
        const other = data.participants.find(p => p._id !== userId);
        setOtherUser(other || null);
      }
      
      // Mark as read
      if (data.messages && data.messages.length > 0) {
        const unreadIds = data.messages
          .filter(msg => msg.sender?._id !== userId && !msg.isRead)
          .map(msg => msg._id);
        if (unreadIds.length > 0) {
          await markMessagesRead(conversationId, unreadIds);
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleInputChange = (text) => {
    setInputText(text);
    
    if (socket && isConnected && conversationId) {
      socket.emit('typing', {
        conversationId,
        userId,
        isTyping: text.length > 0
      });
    }
  };

  const sendMessage = () => {
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
    if (socket && isConnected) {
      socket.emit('typing', {
        conversationId,
        userId,
        isTyping: false
      });
    }
  };

  const renderMessage = ({ item, index }) => {
    const isOwn = item.sender?._id === userId || item.sender === userId;
    return (
      <MessageBubble 
        item={item} 
        isOwn={isOwn} 
        timeAgo={timeAgo}
      />
    );
  };

  const getUserInitial = () => {
    const name = otherUser?.name || 'User';
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
            size={24} 
            color="#1C1C1E" 
          />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <LinearGradient
              colors={['#f9c349', '#f7b731']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{getUserInitial()}</Text>
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{otherUser?.name || 'User'}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, isConnected ? styles.online : styles.offline]} />
              <Text style={[styles.headerStatus, isConnected ? styles.onlineText : styles.offlineText]}>
                {isConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={() => {
            navigation.navigate('ListingDetail', { id: listingId });
          }}
        >
          <Ionicons name="document-text-outline" size={24} color="#1C1C1E" />
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.chatContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color="#f9c349" />
              </View>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation about this listing</Text>
            </View>
          }
        />

        {/* Typing Indicator */}
        {typing && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>Typing</Text>
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, { animationDelay: '0s' }]} />
                <View style={[styles.typingDot, { animationDelay: '0.2s' }]} />
                <View style={[styles.typingDot, { animationDelay: '0.4s' }]} />
              </View>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Input Area */}
      <KeyboardAvoidingView
        style={styles.inputContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputWrapper}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={() => Alert.alert('Coming Soon', 'File attachment will be available soon')}
          >
            <Ionicons name="attach-outline" size={24} color="#8E8E93" />
          </TouchableOpacity>
          
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#8E8E93"
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || !isConnected}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#f9c349', '#f7b731']}
              style={styles.sendGradient}
            >
              <Ionicons name="send-outline" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerAvatar: {
    marginRight: 10,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  online: {
    backgroundColor: '#34C759',
  },
  offline: {
    backgroundColor: '#C7C7CC',
  },
  onlineText: {
    color: '#34C759',
  },
  offlineText: {
    color: '#8E8E93',
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerAction: {
    padding: 4,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleOwn: {
    backgroundColor: '#f9c349',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#1C1C1E',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageStatus: {
    marginLeft: 2,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  typingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8E8E93',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 4,
  },
});