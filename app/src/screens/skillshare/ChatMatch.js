// screens/MatchChat.js
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getMatchConversation, getConversationMessages, markMessagesRead } from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

const { width, height } = Dimensions.get('window');

// Message Bubble Component - FIXED
const MessageBubble = React.memo(({ message, isOwn }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Use useNativeDriver: false for opacity animations to avoid conflicts
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false, // Changed to false
    }).start();
  }, []);

  const senderName = message.sender?.name || message.sender?.fullName || 'User';

  return (
    <Animated.View
      style={[
        styles.messageWrapper,
        isOwn ? styles.messageWrapperOwn : styles.messageWrapperOther,
        { opacity: fadeAnim }
      ]}
    >
      {!isOwn && (
        <View style={styles.senderAvatar}>
          <LinearGradient
            colors={['#f9c349', '#f5a623']}
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
    </Animated.View>
  );
});

export default function ChatMatch({ route, navigation }) {
  const { getCurrentUserId } = useContext(AuthContext);
  const { matchId, listingId, otherUser, listing } = route.params || {};
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  
  // FIXED: Use a different approach for send button animation
  const sendScale = useRef(new Animated.Value(1)).current;
  const isAnimating = useRef(false);

  const userId = getCurrentUserId();

  // Get user display info
  const displayName = otherUser?.name || otherUser?.fullName || 'User';
  const displayImage = otherUser?.profileImage || null;
  const displayInitial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    fetchMessages();
    
    // Auto-scroll to bottom when keyboard appears
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    
    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      let data;
      if (matchId) {
        // Fetch match conversation
        data = await getMatchConversation(matchId);
        setConversation(data.conversation);
        setMessages(data.messages || []);
        
        // Mark messages as read
        if (data.messages && data.messages.length > 0) {
          const unreadMessages = data.messages
            .filter(m => {
              const senderId = m.sender?._id || m.sender;
              return senderId !== userId && !m.isRead;
            })
            .map(m => m._id);
          
          if (unreadMessages.length > 0 && data.conversation) {
            await markMessagesRead(data.conversation._id, unreadMessages);
          }
        }
      } else if (listingId) {
        // Alternative: fetch from listing
        // You might need to implement this endpoint
      }
      
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [matchId, listingId, userId]);

  // FIXED: Simplified send button animation
  const animateSendButton = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    
    Animated.sequence([
      Animated.timing(sendScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(sendScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start(() => {
      isAnimating.current = false;
    });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Animate send button
    animateSendButton();

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
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

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
      
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempMessage._id ? realMessage : msg
        )
      );
      
    } catch (err) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.sender?._id === userId || item.sender === userId || item.isOwn;
    return <MessageBubble message={item} isOwn={isOwn} />;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#FFFFFF', '#FFFDF5']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerUserInfo}
            onPress={() => navigation.navigate('UserProfile', { userId: otherUser?._id })}
          >
            <View style={styles.headerAvatar}>
              {displayImage ? (
                <Image source={{ uri: displayImage }} style={styles.headerAvatarImage} />
              ) : (
                <LinearGradient
                  colors={['#f9c349', '#f5a623']}
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
            <Ionicons name="ellipsis-vertical" size={20} color="#1C1C1E" />
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
        <Ionicons name="chatbubbles-outline" size={48} color="#f9c349" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtext}>
        Say hello to start the conversation!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#f9c349" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {renderHeader()}

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id || item.id || String(item.createdAt)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          ListEmptyComponent={renderEmpty}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          showsVerticalScrollIndicator={false}
          inverted={false}
        />

        <View style={styles.inputContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={styles.inputGradient}
          >
            <View style={styles.inputWrapper}>
              <View style={styles.inputField}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor="#8E8E93"
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
                <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                  <LinearGradient
                    colors={newMessage.trim() ? ['#f9c349', '#f5a623'] : ['#E5E5EA', '#E5E5EA']}
                    style={styles.sendGradient}
                  >
                    {sending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Ionicons 
                        name="send" 
                        size={20} 
                        color={newMessage.trim() ? '#FFFFFF' : '#C7C7CC'} 
                      />
                    )}
                  </LinearGradient>
                </Animated.View>
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
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerUserText: {
    marginLeft: 10,
    flex: 1,
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  headerListingTitle: {
    fontSize: 12,
    color: '#8E8E93',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleOwn: {
    backgroundColor: '#f9c349',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  senderNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f9c349',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#1C1C1E',
  },
  messageTime: {
    fontSize: 10,
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
    fontWeight: '600',
    color: '#1C1C1E',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 100,
  },
  input: {
    fontSize: 16,
    color: '#1C1C1E',
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