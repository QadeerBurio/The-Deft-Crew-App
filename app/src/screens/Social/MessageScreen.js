// MessagesScreen.js - Complete with Block Filtering

import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  StatusBar, Platform, ActivityIndicator, TextInput, Animated,
  Alert, Modal, Pressable, Dimensions, LayoutAnimation, UIManager,
  BackHandler, RefreshControl
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useNavigation, useFocusEffect, useIsFocused, CommonActions } from '@react-navigation/native';
import { AuthContext } from "../../context/AuthContext";
import io from "socket.io-client";

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const socket = io("https://the-deft-crew-production.up.railway.app");
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#f9c349',
  primaryDark: '#e6b800',
  primaryLight: '#fef9f0',
  white: '#ffffff',
  black: '#1a1a1a',
  dark: '#0f1419',
  gray: '#666666',
  lightGray: '#f5f6f8',
  border: '#eef0f2',
  danger: '#ff4757',
  success: '#4CAF50',
  text: '#1a1a1a',
  textSecondary: '#71767b',
  textLight: '#8899a6',
  shadow: 'rgba(0,0,0,0.05)',
  blocked: '#e74c3c',
  blockedBg: '#fef0f0',
};

// Format date properly
const formatMessageDate = (dateString) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  if (isNaN(date.getTime())) return 'Just now';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateToCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (dateToCheck.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (dateToCheck.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

// Skeleton Component with Shimmer Effect
const MessagesSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] });

  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.skeletonItem}>
          <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
          <View style={styles.skeletonContent}>
            <Animated.View style={[styles.skeletonLine, { width: '55%', height: 14, opacity }]} />
            <Animated.View style={[styles.skeletonLine, { width: '75%', height: 10, marginTop: 6, opacity }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

// Chat Item Component with Block Check
const ChatItem = React.memo(({ item, currentUser, navigation, index, onLongPress, markAsRead, isBlocked }) => {
  const itemFade = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);

  const otherUser = item.participants?.find(p => p._id !== currentUser?._id);
  const recipientName = otherUser?.name || "User";
  const lastMessage = item.lastMessage || "No messages yet";
  const unreadCount = item.unreadCount || 0;
  const updatedAt = item.lastMessageTime || item.updatedAt || item.createdAt;
  const isOnline = otherUser?.online || false;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFade, {
        toValue: 1,
        duration: 600,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 80,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: index * 80,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      })
    ]).start();

    if (unreadCount > 0 && !isBlocked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    return () => {
      pulseAnim.stopAnimation();
    };
  }, [unreadCount, isBlocked]);

  const handlePress = () => {
    if (isBlocked) {
      Alert.alert(
        "User Blocked",
        "You have blocked this user. Unblock them to continue messaging."
      );
      return;
    }
    
    if (!item?._id || !otherUser?._id) {
      console.warn('Invalid chat data, skipping navigation');
      return;
    }
    
    if (unreadCount > 0 && markAsRead) {
      markAsRead(item._id);
    }
    
    navigation.navigate('ChatDetailScreen', {
      conversationId: item._id,
      recipient: {
        _id: otherUser._id,
        name: otherUser.name || 'User',
        profileImage: otherUser.profileImage || '',
        online: otherUser.online || false
      }
    });
  };

  const getMessagePreview = (text) => {
    if (!text) return "Start a conversation...";
    if (isBlocked) return "🔒 User blocked - messages hidden";
    if (text.length > 35) return text.substring(0, 35) + '...';
    return text;
  };

  return (
    <Animated.View style={{
      opacity: itemFade,
      transform: [
        { scale: scaleAnim },
        { translateX: slideAnim }
      ]
    }}>
      <TouchableOpacity
        style={[
          styles.chatCard, 
          unreadCount > 0 && !isBlocked && styles.chatCardUnread,
          isBlocked && styles.chatCardBlocked
        ]}
        onPress={handlePress}
        onLongPress={() => !isBlocked && onLongPress && onLongPress(item._id)}
        activeOpacity={0.6}
        delayLongPress={400}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        disabled={isBlocked}
      >
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarContainer}>
            {otherUser?.profileImage ? (
              <Image 
                source={{ uri: otherUser.profileImage }} 
                style={[styles.profileImg, isBlocked && { opacity: 0.5 }]} 
              />
            ) : (
              <LinearGradient
                colors={isBlocked ? ['#ccc', '#bbb'] : [COLORS.primary, COLORS.primaryDark]}
                style={styles.avatarPlaceholder}
              >
                <Text style={[styles.avatarInitial, isBlocked && { color: '#999' }]}>
                  {recipientName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            {isBlocked && (
              <View style={styles.blockedBadge}>
                <Ionicons name="ban" size={12} color="#fff" />
              </View>
            )}
            {isOnline && !isBlocked && (
              <Animated.View style={[
                styles.onlineDot,
                {
                  transform: [{
                    scale: pulseAnim.interpolate({
                      inputRange: [1, 1.1],
                      outputRange: [1, 1.2]
                    })
                  }]
                }
              ]} />
            )}
          </View>
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatRow}>
            <Text style={[styles.chatName, unreadCount > 0 && !isBlocked && styles.chatNameUnread, isBlocked && styles.blockedText]} numberOfLines={1}>
              {recipientName}
              {isBlocked && " 🔒"}
            </Text>
            <View style={styles.timeContainer}>
              <Text style={[styles.chatTime, isBlocked && styles.blockedText]}>
                {isBlocked ? "Blocked" : formatMessageDate(updatedAt)}
              </Text>
            </View>
          </View>
          <View style={styles.lastMsgRow}>
            <Text style={[
              styles.chatMessage,
              unreadCount > 0 && !isBlocked && styles.chatMessageUnread,
              isBlocked && styles.blockedText
            ]} numberOfLines={1}>
              {getMessagePreview(lastMessage)}
            </Text>
            {unreadCount > 0 && !isBlocked && (
              <Animated.View style={[styles.unreadBadge, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.chatChevron}>
          <Ionicons 
            name={isBlocked ? "ban-outline" : "chevron-forward"} 
            size={16} 
            color={isBlocked ? COLORS.danger : "#ddd"} 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Action Modal
const ActionModal = ({ visible, onClose, onAction, recipientName, recipientId, navigation, isBlocked }) => {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      slideAnim.setValue(400);
      backdropAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 400,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => onClose());
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: backdropAnim }]}>
        <Pressable style={styles.modalOverlayPress} onPress={handleClose}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <LinearGradient 
                  colors={isBlocked ? ['#ccc', '#bbb'] : [COLORS.primary, COLORS.primaryDark]} 
                  style={styles.modalAvatar}
                >
                  <Text style={[styles.modalAvatarText, isBlocked && { color: '#999' }]}>
                    {recipientName?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
                <Text style={[styles.modalTitle, isBlocked && styles.blockedText]}>
                  {recipientName || 'User'}
                  {isBlocked && " (Blocked)"}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                handleClose();
                setTimeout(() => {
                  navigation.navigate('UserProfile', { userId: recipientId });
                }, 300);
              }}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#fef9f0' }]}>
                <Ionicons name="person-outline" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.modalOptionText}>View Profile</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>

            {!isBlocked && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  handleClose();
                  setTimeout(() => onAction('mute'), 300);
                }}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#fef9f0' }]}>
                  <Ionicons name="notifications-off-outline" size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.modalOptionText}>Mute Notifications</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            )}

            {isBlocked && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  handleClose();
                  setTimeout(() => onAction('unblock'), 300);
                }}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#f0faf0' }]}>
                  <Ionicons name="person-add" size={22} color={COLORS.success} />
                </View>
                <Text style={[styles.modalOptionText, { color: COLORS.success }]}>Unblock User</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            )}

            

            <TouchableOpacity
              style={[styles.modalOption, styles.modalOptionDanger]}
              onPress={() => {
                handleClose();
                setTimeout(() => onAction('delete'), 300);
              }}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#fff5f5' }]}>
                <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
              </View>
              <Text style={[styles.modalOptionText, styles.modalOptionDangerText]}>Delete Conversation</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

export default function MessagesScreen() {
  const navigation = useNavigation();
  const { token, user: currentUser } = useContext(AuthContext);
  const isFocused = useIsFocused();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const searchFade = useRef(new Animated.Value(0)).current;
  const listFade = useRef(new Animated.Value(0)).current;

  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Initial animations
  useEffect(() => {
    if (isFirstLoad) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(headerSlide, {
          toValue: 0,
          delay: 100,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(searchFade, {
          toValue: 1,
          duration: 500,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(listFade, {
          toValue: 1,
          duration: 600,
          delay: 400,
          useNativeDriver: true,
        })
      ]).start();
      setIsFirstLoad(false);
    }
  }, []);

  // Load blocked users
  const loadBlockedUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/user/blocked`, config);
      const blocked = res.data.blockedUsers || [];
      setBlockedUserIds(blocked.map(b => b._id));
    } catch (err) {
      console.error("Error loading blocked users:", err);
    }
  }, [token]);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isNavigating) {
        setIsNavigating(true);
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'HomeTabs' }],
            })
          );
        }
        setTimeout(() => setIsNavigating(false), 500);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [navigation, isNavigating]);

  // Fetch inbox when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (isFocused) {
        loadBlockedUsers();
        fetchInbox();
      }
      return () => {};
    }, [isFocused])
  );

  // Socket listeners
  useEffect(() => {
    const handleInboxUpdate = () => {
      if (isFocused) {
        fetchInbox();
      }
    };

    const handleNewMessage = (msg) => {
      if (isFocused) {
        fetchInbox();
      }
    };

    const handleMessageDeleted = () => {
      if (isFocused) {
        fetchInbox();
      }
    };

    const handleMessagesRead = ({ conversationId, userId }) => {
      if (isFocused && userId !== currentUser?._id) {
        setConversations(prev => 
          prev.map(conv => 
            conv._id === conversationId 
              ? { ...conv, unreadCount: 0 } 
              : conv
          )
        );
      }
    };

    const handleConversationDeleted = ({ conversationId }) => {
      if (isFocused) {
        setConversations(prev => {
          const updated = prev.filter(conv => conv._id !== conversationId);
          const unread = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
          setTotalUnread(unread);
          return updated;
        });
        
        setActionModalVisible(false);
        setSelectedChat(null);
      }
    };

    socket.on('inbox_update', handleInboxUpdate);
    socket.on('new_message', handleNewMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('messages_read', handleMessagesRead);
    socket.on('conversation_deleted', handleConversationDeleted);

    return () => {
      socket.off('inbox_update', handleInboxUpdate);
      socket.off('new_message', handleNewMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('messages_read', handleMessagesRead);
      socket.off('conversation_deleted', handleConversationDeleted);
    };
  }, [isFocused]);

  const fetchInbox = async () => {
    try {
      console.log('Fetching inbox...');
      const res = await axios.get(`${API_URL}/inbox`, config);
      console.log('Inbox response:', res.data);
      
      // Filter out conversations with blocked users
      let filteredConversations = res.data;
      if (blockedUserIds.length > 0) {
        filteredConversations = res.data.filter(conv => {
          const otherUser = conv.participants?.find(p => p._id !== currentUser?._id);
          if (!otherUser) return true;
          return !blockedUserIds.includes(otherUser._id);
        });
      }
      
      const sorted = filteredConversations.sort((a, b) => {
        const dateA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt);
        const dateB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt);
        return dateB - dateA;
      });
      setConversations(sorted);
      
      const unread = sorted.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setTotalUnread(unread);
    } catch (err) {
      console.error("Inbox fetch failed", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check if a conversation is blocked
  const isConversationBlocked = useCallback((conversation) => {
    if (!conversation || !conversation.participants) return false;
    const otherUser = conversation.participants.find(p => p._id !== currentUser?._id);
    if (!otherUser) return false;
    return blockedUserIds.includes(otherUser._id);
  }, [blockedUserIds, currentUser]);

  // Mark messages as read when clicking on chat
  const markMessagesAsRead = async (conversationId) => {
    if (markingRead) return;
    setMarkingRead(true);
    
    try {
      socket.emit('mark_messages_read', {
        conversationId,
        userId: currentUser._id
      });
      
      await axios.post(`${API_URL}/messages/mark-read/${conversationId}`, {}, config);
      
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, unreadCount: 0 } 
            : conv
        )
      );
      
      setTotalUnread(prev => {
        const conv = conversations.find(c => c._id === conversationId);
        const unread = conv?.unreadCount || 0;
        return Math.max(0, prev - unread);
      });
    } catch (err) {
      console.error('Mark read error:', err);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleLongPress = (id) => {
    const chat = conversations.find(c => c._id === id);
    if (chat) {
      const blocked = isConversationBlocked(chat);
      setIsBlocked(blocked);
      setSelectedChat(chat);
      setActionModalVisible(true);
    }
  };

  const handleAction = (action) => {
    if (!selectedChat) return;

    if (action === 'delete') {
      Alert.alert(
        "Delete Conversation",
        "Are you sure you want to delete this conversation? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: () => handleDeleteSingle(selectedChat._id)
          }
        ]
      );
    } else if (action === 'mute') {
      handleMuteSingle(selectedChat._id);
    } else if (action === 'unblock') {
      handleUnblockUser(selectedChat);
    }
  };

  const handleUnblockUser = async (chat) => {
    const otherUser = chat.participants?.find(p => p._id !== currentUser?._id);
    if (!otherUser) return;

    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${otherUser.name}? They will be able to message you again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            try {
              await axios.post(`${API_URL}/user/unblock/${otherUser._id}`, {}, config);
              Alert.alert("Success", `${otherUser.name} has been unblocked`);
              
              // Remove from blocked list
              setBlockedUserIds(prev => prev.filter(id => id !== otherUser._id));
              
              // Refresh conversations
              await fetchInbox();
              
              setActionModalVisible(false);
              setSelectedChat(null);
            } catch (err) {
              console.error("Unblock error:", err);
              Alert.alert("Error", "Failed to unblock user. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleMuteSingle = async (id) => {
    try {
      await axios.post(`${API_URL}/conversations/${id}/mute`, {}, config);
      fetchInbox();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (err) {
      console.error('Mute error:', err);
      Alert.alert('Error', 'Failed to mute conversation');
    }
  };

  const handleDeleteSingle = async (id) => {
    if (isDeleting) return;
    setIsDeleting(true);
    
    try {
      console.log('Deleting conversation:', id);
      const response = await axios.delete(`${API_URL}/conversations/${id}`, config);
      console.log('Delete response:', response.data);
      
      if (response.data.success) {
        socket.emit('delete_conversation', { conversationId: id });
        
        setConversations(prev => {
          const updated = prev.filter(conv => conv._id !== id);
          const unread = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
          setTotalUnread(unread);
          return updated;
        });
        
        setActionModalVisible(false);
        setSelectedChat(null);
        
        Alert.alert('Success', 'Conversation deleted successfully');
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to delete conversation');
      }
    } catch (err) {
      console.error('Delete error:', err);
      if (err.response) {
        Alert.alert('Error', err.response.data?.error || 'Failed to delete conversation');
      } else if (err.request) {
        Alert.alert('Error', 'Network error. Please check your connection.');
      } else {
        Alert.alert('Error', 'Failed to delete conversation. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBlockedUsers();
    fetchInbox();
  };

  const handleBackPress = () => {
    if (!isNavigating) {
      setIsNavigating(true);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'HomeTabs' }],
          })
        );
      }
      setTimeout(() => setIsNavigating(false), 500);
    }
  };

  const navigateToSocial = () => {
    navigation.navigate('Search');
  };

  // Filter conversations by search and block status
  const filteredConversations = conversations.filter(c => {
    if (!c || !c.participants) return false;
    // Already filtered blocked conversations, but double-check
    const otherUser = c.participants.find(p => p._id !== currentUser?._id);
    if (!otherUser) return false;
    if (blockedUserIds.includes(otherUser._id)) return false;
    
    const matchesSearch = otherUser.name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const renderEmptyComponent = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <View style={styles.emptyIconWrapper}>
        <LinearGradient colors={[COLORS.primaryLight, COLORS.white]} style={styles.emptyIcon}>
          <Ionicons name="chatbubbles-outline" size={56} color={COLORS.primary} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>Start a new conversation with someone</Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={navigateToSocial}
        activeOpacity={0.7}
      >
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.emptyBtnGradient}>
          <Ionicons name="people-outline" size={18} color={COLORS.black} />
          <Text style={styles.emptyBtnText}>Find People</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header with back button */}
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: headerSlide }] }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={handleBackPress} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          
          <View style={styles.logoWrapper}>
            <Text style={styles.logoText}>Chats</Text>
            {totalUnread > 0 && (
              <Animated.View style={[styles.headerBadge, {
                transform: [{
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1]
                  })
                }]
              }]}>
                <Text style={styles.headerBadgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
              </Animated.View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={navigateToSocial}
          activeOpacity={0.7}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.headerBtnGradient}>
            <Ionicons name="create-outline" size={24} color={COLORS.black} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Search */}
      <Animated.View style={[styles.searchContainer, { opacity: searchFade }]}>
        <View style={[styles.searchWrapper, search.length > 0 && styles.searchWrapperActive]}>
          <Ionicons name="search-outline" size={20} color={search.length > 0 ? COLORS.primary : COLORS.textLight} />
          <TextInput
            placeholder="Search messages..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.textLight}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Content */}
      {loading ? (
        <MessagesSkeleton />
      ) : (
        <Animated.View style={{ flex: 1, opacity: listFade }}>
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item._id}
            renderItem={({ item, index }) => (
              <ChatItem
                item={item}
                currentUser={currentUser}
                navigation={navigation}
                index={index}
                onLongPress={handleLongPress}
                markAsRead={markMessagesAsRead}
                isBlocked={isConversationBlocked(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            ListEmptyComponent={renderEmptyComponent}
          />
        </Animated.View>
      )}

      {/* Action Modal */}
      <ActionModal
        visible={actionModalVisible}
        onClose={() => {
          setActionModalVisible(false);
          setSelectedChat(null);
          setIsBlocked(false);
        }}
        onAction={handleAction}
        recipientName={selectedChat?.participants?.find(p => p._id !== currentUser?._id)?.name || ''}
        recipientId={selectedChat?.participants?.find(p => p._id !== currentUser?._id)?._id}
        navigation={navigation}
        isBlocked={isBlocked}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fc'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.black,
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: COLORS.primary,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primaryDark,
  },
  headerBadgeText: {
    color: COLORS.black,
    fontSize: 11,
    fontWeight: '700',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    borderRadius: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchWrapperActive: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.black,
    fontWeight: '400',
  },
  searchClear: {
    padding: 4,
  },
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 12
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e8ecf0',
    marginRight: 14
  },
  skeletonContent: {
    flex: 1
  },
  skeletonLine: {
    backgroundColor: '#e8ecf0',
    borderRadius: 4
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginVertical: 1,
  },
  chatCardUnread: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  chatCardBlocked: {
    backgroundColor: COLORS.blockedBg,
    opacity: 0.8,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  avatarWrapper: {
    marginRight: 14,
  },
  avatarContainer: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  profileImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  blockedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  chatContent: {
    flex: 1,
    marginLeft: 2,
  },
  chatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1,
  },
  chatNameUnread: {
    fontWeight: '700',
  },
  blockedText: {
    color: COLORS.gray,
  },
  timeContainer: {
    marginLeft: 8,
  },
  chatTime: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '400',
  },
  lastMsgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  chatMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    fontWeight: '400',
  },
  chatMessageUnread: {
    color: COLORS.black,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
    borderWidth: 1.5,
    borderColor: COLORS.primaryDark,
  },
  unreadText: {
    color: COLORS.black,
    fontSize: 11,
    fontWeight: '700',
  },
  chatChevron: {
    marginLeft: 4,
    opacity: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayPress: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.black,
  },
  modalClose: {
    padding: 4,
  },
  modalDivider: {
    height: 0.5,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.black,
    fontWeight: '500',
  },
  modalOptionDanger: {
    marginTop: 4,
    paddingTop: 14,
  },
  modalOptionDangerText: {
    color: COLORS.danger,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconWrapper: {
    marginBottom: 16,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  emptyBtn: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    gap: 8,
  },
  emptyBtnText: {
    color: COLORS.black,
    fontWeight: '700',
    fontSize: 14,
  },
});