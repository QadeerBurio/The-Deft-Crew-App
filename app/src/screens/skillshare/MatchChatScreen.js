// screens/MatchChatScreen.js - COMPLETELY FIXED
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
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  AppState
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { getMatchConversation, getMyMatches } from '../../api/api';

// Socket URL
const SOCKET_URL = __DEV__ 
  ? 'https://the-deft-crew-production.up.railway.app' 
  : 'https://the-deft-crew-production.up.railway.app';

// Time formatter
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

// ==================== MESSAGE BUBBLE ====================
const MessageBubble = React.memo(({ item, isOwn, senderName, senderImage, timeAgo }) => {
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

  // Get sender ID consistently
  const senderId = item.sender?._id || item.sender;

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
      {!isOwn && (
        <View style={styles.avatarContainer}>
          {senderImage ? (
            <Image source={{ uri: senderImage }} style={styles.messageAvatar} />
          ) : (
            <View style={[styles.messageAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>
                {senderName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
        {!isOwn && (
          <Text style={styles.messageSender}>{senderName || 'User'}</Text>
        )}
        <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
          {item.text || ''}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, isOwn ? styles.messageTimeOwn : styles.messageTimeOther]}>
            {timeAgo(item.createdAt)}
          </Text>
          {isOwn && (
            <Ionicons 
              name={item.isRead ? "checkmark-done-circle" : "checkmark-done-outline"} 
              size={14} 
              color={item.isRead ? "#34C759" : "rgba(255,255,255,0.7)"} 
              style={styles.messageStatus}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
});

// ==================== MAIN COMPONENT ====================
export default function MatchChatScreen({ route, navigation }) {
  const { 
    getCurrentUserId, 
    user, 
    getUserName, 
    isGuest,
    token,
    getUser
  } = useContext(AuthContext);
  
  const { listingId, matchId: routeMatchId } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [matchId, setMatchId] = useState(routeMatchId);
  const [conversationId, setConversationId] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const userId = getCurrentUserId();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ==================== SOCKET SETUP ====================
  useEffect(() => {
    if (isGuest || !userId || userId === 'guest-user') {
      setError('Please login to use chat features');
      setLoading(false);
      return;
    }

    console.log('Setting up socket for user:', userId);

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: {
        token: token
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      if (userId) {
        newSocket.emit('user_online', userId);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.log('Socket connection error:', err);
      setIsConnected(false);
    });

    newSocket.on('reconnect', () => {
      console.log('Socket reconnected');
      setIsConnected(true);
      if (userId) {
        newSocket.emit('user_online', userId);
      }
      if (conversationId) {
        newSocket.emit('join_chat', conversationId);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId, isGuest, token, conversationId]);

  // ==================== JOIN CONVERSATION ====================
  useEffect(() => {
    if (socket && conversationId && isConnected) {
      console.log('Joining chat room:', conversationId);
      socket.emit('join_chat', conversationId);
    }
  }, [socket, conversationId, isConnected]);

  // ==================== SOCKET EVENT LISTENERS ====================
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      console.log('New message received:', message);
      // Check if message belongs to this conversation
      if (message.conversationId === conversationId) {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const handleTyping = (data) => {
      if (data.conversationId === conversationId && data.userId !== userId) {
        setTyping(data.isTyping);
        if (data.isTyping) {
          setTypingUser(data.userName || otherUser?.name || 'User');
        }
      }
    };

    const handleMessageError = (error) => {
      console.error('Message error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    };

    const handleStatusUpdate = (data) => {
      console.log('Status update:', data);
      // You could update online status here if needed
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('message_error', handleMessageError);
    socket.on('user_status_update', handleStatusUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('message_error', handleMessageError);
      socket.off('user_status_update', handleStatusUpdate);
    };
  }, [socket, conversationId, userId, otherUser]);

  // ==================== APP STATE LISTENER ====================
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        if (conversationId) {
          fetchMessages();
        }
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState, conversationId]);

  // ==================== KEYBOARD LISTENERS ====================
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // ==================== ENTRY ANIMATION ====================
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

  // ==================== FETCH MESSAGES ====================
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !userId || userId === 'guest-user') return;

    try {
      // Get token from AsyncStorage
      const storedToken = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${SOCKET_URL}/api/chat/messages/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${storedToken || token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [conversationId, userId, token]);

  // ==================== FETCH MATCH DATA ====================
  const fetchMatchData = useCallback(async () => {
    if (!userId || userId === 'guest-user') {
      setError('Please login to use chat features');
      setLoading(false);
      return;
    }

    if (isGuest) {
      setError('Please login to use chat features');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (matchId) {
        console.log('Fetching match with ID:', matchId);
        
        const data = await getMatchConversation(matchId);
        console.log('Match data received:', data);
        
        const conversation = data.conversation;
        if (conversation) {
          setConversationId(conversation._id);
          
          // Get other user from conversation
          const participants = conversation.participants || [];
          const other = participants.find(p => p._id !== userId);
          setOtherUser(other || null);
          
          // Set messages from response
          if (data.messages) {
            setMessages(data.messages);
          }
          
          // If otherUser is in response, use it
          if (data.otherUser) {
            setOtherUser(data.otherUser);
          }
        } else {
          setError('No conversation found for this match');
        }
      } else if (listingId) {
        console.log('Fetching matches for listing:', listingId);
        
        const matchesData = await getMyMatches();
        console.log('Matches data:', matchesData);
        
        const match = matchesData.matches?.find(m => {
          const listing = m.listingId?._id || m.listingId;
          return listing === listingId && m.status === 'active';
        });
        
        if (match) {
          setMatchId(match._id);
          // Recursive call with matchId
          const data = await getMatchConversation(match._id);
          const conversation = data.conversation;
          if (conversation) {
            setConversationId(conversation._id);
            const other = conversation.participants?.find(p => p._id !== userId) || null;
            setOtherUser(other || data.otherUser || null);
            if (data.messages) {
              setMessages(data.messages);
            }
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

  // Initial data fetch
  useEffect(() => {
    fetchMatchData();
  }, [fetchMatchData]);

  // ==================== TYPING INDICATOR ====================
  useEffect(() => {
    if (!socket || !isConnected || !conversationId || !userId) return;

    const typingTimeout = setTimeout(() => {
      socket.emit('typing', {
        conversationId,
        userId,
        isTyping: false
      });
    }, 1500);

    return () => clearTimeout(typingTimeout);
  }, [inputText, socket, isConnected, conversationId, userId]);

  // ==================== HANDLE INPUT CHANGE ====================
  const handleInputChange = (text) => {
    setInputText(text);
    
    if (socket && isConnected && conversationId && userId) {
      socket.emit('typing', {
        conversationId,
        userId,
        isTyping: text.length > 0
      });
    }
  };

  // ==================== SEND MESSAGE ====================
  const sendMessage = () => {
    if (!inputText.trim() || !socket || !isConnected || !conversationId || !userId) {
      if (!isConnected) {
        Alert.alert('Disconnected', 'Please wait for reconnection...');
      }
      return;
    }

    const messageData = {
      conversationId,
      senderId: userId,
      text: inputText.trim(),
      messageType: 'text'
    };

    console.log('Sending message:', messageData);
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

  // ==================== RENDER MESSAGE ====================
  const renderMessage = ({ item, index }) => {
    if (!item) return null;
    
    // Get sender ID consistently
    const senderId = item.sender?._id || item.sender;
    const isOwn = senderId === userId;
    
    // Get sender name
    let senderName = 'User';
    if (isOwn) {
      senderName = user?.name || 'You';
    } else if (item.sender?.name) {
      senderName = item.sender.name;
    } else if (otherUser?.name) {
      senderName = otherUser.name;
    }
    
    // Get sender image
    let senderImage = null;
    if (isOwn) {
      senderImage = user?.profileImage;
    } else if (item.sender?.profileImage) {
      senderImage = item.sender.profileImage;
    } else if (otherUser?.profileImage) {
      senderImage = otherUser.profileImage;
    }
    
    return (
      <MessageBubble 
        item={item} 
        isOwn={isOwn} 
        senderName={senderName}
        senderImage={senderImage}
        timeAgo={timeAgo}
      />
    );
  };

  // ==================== DISMISS KEYBOARD ====================
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f9c349" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== ERROR STATE ====================
  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMatchData}>
            <LinearGradient
              colors={['#f9c349', '#f7b731']}
              style={styles.retryGradient}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== GET USER INITIAL ====================
  const getUserInitial = () => {
    const name = otherUser?.name || 'User';
    return name.charAt(0).toUpperCase();
  };

  // ==================== MAIN RENDER ====================
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
            {otherUser?.profileImage ? (
              <Image source={{ uri: otherUser.profileImage }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={['#f9c349', '#f7b731']}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>{getUserInitial()}</Text>
              </LinearGradient>
            )}
            <View style={[styles.onlineDot, isConnected ? styles.online : styles.offline]} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser?.name || 'User'}
            </Text>
            <Text style={[styles.headerStatus, isConnected ? styles.onlineText : styles.offlineText]}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={() => Alert.alert('Info', `Chat with ${otherUser?.name || 'User'}`)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#1C1C1E" />
        </TouchableOpacity>
      </View>

      {/* Chat Messages */}
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id || item.createdAt?.toString() || Math.random().toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => {
              setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }}
            onLayout={() => {
              setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color="#f9c349" />
                </View>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Say hello to start the conversation!</Text>
              </View>
            }
          />

          {/* Typing Indicator */}
          {typing && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>{typingUser || 'User'} is typing</Text>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={styles.keyboardAvoidingView}
        enabled
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity 
              style={styles.attachButton}
              onPress={() => Alert.alert('Coming Soon', 'File attachment will be available soon')}
              activeOpacity={0.7}
            >
              <Ionicons name="attach-outline" size={24} color="#8E8E93" />
            </TouchableOpacity>
            
            <View style={styles.inputWrapperInner}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#8E8E93"
                value={inputText}
                onChangeText={handleInputChange}
                multiline
                maxLength={1000}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
                editable={!isGuest && isConnected && !!userId && userId !== 'guest-user'}
              />
              
              {inputText.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.sendButton, (!inputText.trim() || !isConnected) && styles.sendButtonDisabled]}
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
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.emojiButton}
              onPress={() => Alert.alert('Coming Soon', 'Emoji picker will be available soon')}
              activeOpacity={0.7}
            >
              <Ionicons name="happy-outline" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
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
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
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
    marginTop: Platform.OS === 'android' ? 34 : 0,
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
    position: 'relative',
    marginRight: 10,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  online: {
    backgroundColor: '#34C759',
  },
  offline: {
    backgroundColor: '#C7C7CC',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  onlineText: {
    color: '#34C759',
  },
  offlineText: {
    color: '#8E8E93',
  },
  headerAction: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#E8E8ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
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
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 2,
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
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeOther: {
    color: '#8E8E93',
  },
  messageStatus: {
    marginLeft: 2,
  },
  keyboardAvoidingView: {
    backgroundColor: '#FFFFFF',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 8,
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
    marginBottom: 4,
  },
  inputWrapperInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
    minHeight: 36,
    color: '#1C1C1E',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginHorizontal: 4,
    marginVertical: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 4,
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
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8E8E93',
  },
  typingDot1: {
    animationDelay: '0s',
  },
  typingDot2: {
    animationDelay: '0.2s',
  },
  typingDot3: {
    animationDelay: '0.4s',
  },
});