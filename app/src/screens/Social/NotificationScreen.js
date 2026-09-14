// screens/NotificationScreen.js - COMPLETE with reply & mention support + AUTO REFRESH

import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image, 
  StatusBar, Platform, Alert, Animated, AppState,
  RefreshControl, Modal, Pressable, Dimensions
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from "../../context/AuthContext";

const { width, height } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

const POLL_INTERVAL = 8000; // Poll every 8 seconds

// TDC Brand Colors
const COLORS = {
  primary: '#f9c349',
  white: '#ffffff',
  black: '#1a1a1a',
  gray: '#666666',
  lightGray: '#f8f9fa',
  border: '#f0f0f0',
  danger: '#ff4757',
  success: '#2ecc71',
  mention: '#1877f2',
};

// Skeleton Component
const NotificationSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);
  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skeletonItem}>
          <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
          <View style={styles.skeletonContent}>
            <Animated.View style={[styles.skeletonLine, { width: '70%', height: 12, opacity }]} />
            <Animated.View style={[styles.skeletonLine, { width: '50%', height: 8, marginTop: 6, opacity }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

// NotificationItem Component
const NotificationItem = React.memo(({ item, index, onPress, onAccept, onDecline }) => {
  const itemFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemFade, {
      toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true,
    }).start();
  }, []);

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'like': 
        return { name: 'heart', color: COLORS.primary, bg: '#fef9f0' };
      case 'comment': 
        return { name: 'chatbubble', color: COLORS.primary, bg: '#fef9f0' };
      case 'reply':
        return { name: 'return-down-forward', color: COLORS.primary, bg: '#fef9f0' };
      case 'mention':
        return { name: 'at', color: COLORS.mention, bg: '#e7f3ff' };
      case 'request': 
        return { name: 'person-add', color: COLORS.primary, bg: '#fef9f0' };
      case 'connection_accepted': 
        return { name: 'checkmark-circle', color: COLORS.success, bg: '#f0fdf4' };
      case 'request_declined': 
        return { name: 'close-circle', color: COLORS.danger, bg: '#fef2f2' };
      default: 
        return { name: 'notifications', color: COLORS.gray, bg: COLORS.lightGray };
    }
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActionText = () => {
    switch(item.type) {
      case 'like': return 'liked your post';
      case 'comment': return 'commented on your post';
      case 'reply': return 'replied to your comment';
      case 'mention': return 'mentioned you in a comment';
      case 'connection_accepted': return 'accepted your connection request 🎉';
      case 'request_declined': return 'declined your connection request';
      case 'request': return 'sent you a connection request';
      default: return item.text || 'sent you a notification';
    }
  };

  const icon = getNotificationIcon(item.type);
  
  const isRequestPending = item.type === 'request' && 
                          item.status === 'pending' && 
                          !item.isProcessed;

  const isConnectionResult = item.type === 'connection_accepted' || item.type === 'request_declined';

  const isProcessedRequest = item.type === 'request' && 
                            item.isProcessed && 
                            item.status !== 'pending';

  const isMention = item.type === 'mention';

  return (
    <Animated.View style={{ 
      opacity: itemFade,
      transform: [{ translateY: itemFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
    }}>
      <TouchableOpacity 
        style={[
          styles.notificationCard, 
          item.isUnread && styles.unreadCard,
          isMention && styles.mentionCard,
        ]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationInner}>
          <View style={styles.avatarSection}>
            <View style={[
              styles.avatarBorder, 
              item.isUnread && styles.avatarBorderUnread,
              isMention && styles.avatarBorderMention,
            ]}>
              <Image 
                source={{ uri: item.sender?.profileImage || `https://ui-avatars.com/api/?name=${item.sender?.name || 'User'}&background=f9c349&color=1a1a1a` }} 
                style={styles.avatar} 
              />
            </View>
            <View style={[styles.typeBadge, { backgroundColor: icon.color }]}>
              <Ionicons name={icon.name} size={10} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.contentRow}>
              <Text style={styles.contentText} numberOfLines={2}>
                <Text style={styles.userName}>{item.sender?.name || "Someone"}</Text>
                {' '}
                <Text style={[styles.actionText, isMention && styles.actionTextMention]}>
                  {getActionText()}
                </Text>
              </Text>
              {item.isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
            
            {(item.type === 'comment' || item.type === 'reply' || item.type === 'mention') && 
             item.text && (
              <View style={styles.previewBox}>
                <Text style={styles.previewText} numberOfLines={2}>
                  {item.text}
                </Text>
              </View>
            )}
            
            {isProcessedRequest && (
              <View style={styles.statusIndicator}>
                <View style={[styles.statusBadge, { 
                  backgroundColor: item.status === 'accepted' ? '#f0fdf4' : '#fef2f2'
                }]}>
                  <Ionicons 
                    name={item.status === 'accepted' ? 'checkmark-circle' : 'close-circle'} 
                    size={14} 
                    color={item.status === 'accepted' ? COLORS.success : COLORS.danger} 
                  />
                  <Text style={[styles.statusText, { 
                    color: item.status === 'accepted' ? COLORS.success : COLORS.danger 
                  }]}>
                    {item.status === 'accepted' ? 'Accepted ✅' : 'Declined ❌'}
                  </Text>
                </View>
              </View>
            )}

            {isConnectionResult && (
              <View style={styles.statusIndicator}>
                <View style={[styles.statusBadge, { 
                  backgroundColor: item.type === 'connection_accepted' ? '#f0fdf4' : '#fef2f2'
                }]}>
                  <Ionicons 
                    name={item.type === 'connection_accepted' ? 'checkmark-circle' : 'close-circle'} 
                    size={14} 
                    color={item.type === 'connection_accepted' ? COLORS.success : COLORS.danger} 
                  />
                  <Text style={[styles.statusText, { 
                    color: item.type === 'connection_accepted' ? COLORS.success : COLORS.danger 
                  }]}>
                    {item.type === 'connection_accepted' ? 'Connected ✅' : 'Declined ❌'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {isRequestPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.acceptBtn} 
              onPress={() => onAccept(item._id)}
              activeOpacity={0.7}
            >
              <LinearGradient colors={[COLORS.primary, '#e6b800']} style={styles.btnGradient}>
                <Ionicons name="checkmark" size={14} color={COLORS.black} />
                <Text style={styles.acceptText}>Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.declineBtn} 
              onPress={() => onDecline(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={14} color={COLORS.gray} />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function NotificationScreen({ navigation }) {
  const { token, user: currentUser, setUser } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [processingIds, setProcessingIds] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const menuSlide = useRef(new Animated.Value(200)).current;
  
  // Refs for polling
  const pollIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);
  const lastFetchRef = useRef(0);

  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (showMenuModal) {
      menuSlide.setValue(200);
      Animated.spring(menuSlide, { 
        toValue: 0, 
        friction: 7, 
        tension: 40, 
        useNativeDriver: true 
      }).start();
    }
  }, [showMenuModal]);

  // ============ CORE FETCH (silent mode for polling) ============
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!token || !isMountedRef.current) return;
    
    // Prevent duplicate fetches within 2 seconds
    const now = Date.now();
    if (silent && now - lastFetchRef.current < 2000) return;
    lastFetchRef.current = now;

    try {
      const res = await axios.get(`${API_URL}/notifications`, config);
      if (!isMountedRef.current) return;
      
      const rawData = Array.isArray(res.data) ? res.data : [];
      
      const formattedData = rawData.map(n => ({
        ...n,
        isUnread: (n.readBy && Array.isArray(n.readBy) && currentUser?._id) 
                  ? !n.readBy.includes(currentUser._id) 
                  : true,
        status: n.type === 'request' ? (n.status || 'pending') : undefined,
        isProcessed: n.isProcessed || false,
        type: n.type || 'notification'
      }));
      
      // ✅ SMART UPDATE: Only update state if data actually changed
      setNotifications(prev => {
        // Quick check: if length differs, update
        if (prev.length !== formattedData.length) return formattedData;
        
        // Deep check: compare IDs and isUnread/status
        const hasChanges = formattedData.some((newNotif, idx) => {
          const oldNotif = prev[idx];
          if (!oldNotif) return true;
          return (
            oldNotif._id !== newNotif._id ||
            oldNotif.isUnread !== newNotif.isUnread ||
            oldNotif.status !== newNotif.status ||
            oldNotif.isProcessed !== newNotif.isProcessed
          );
        });
        
        return hasChanges ? formattedData : prev;
      });
    } catch (err) {
      if (!silent) {
        console.error("Fetch notifications error:", err);
      }
      // Don't clear notifications on silent poll errors — just keep old data
      if (!silent && err.response?.status === 401) {
        setNotifications([]); 
      }
    } finally {
      if (!silent && isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [token, currentUser?._id]);

  // ============ INITIAL FETCH ============
  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchNotifications(false);
    }
  }, [token, fetchNotifications]);

  // ============ AUTO REFRESH POLLING ============
  // Poll every POLL_INTERVAL ms, but pause when app is in background
  useEffect(() => {
    if (!token) return;

    const startPolling = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        // Only poll when app is active
        if (appStateRef.current === 'active') {
          fetchNotifications(true); // silent mode
        }
      }, POLL_INTERVAL);
    };

    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [token, fetchNotifications]);

  // ============ APP STATE LISTENER ============
  // When user returns to app → refresh immediately
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      // Refresh when app comes back to foreground
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        fetchNotifications(true);
      }
    });

    return () => subscription.remove();
  }, [fetchNotifications]);

  // ============ SCREEN FOCUS LISTENER ============
  // When user navigates to this screen → refresh
  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      if (token) {
        fetchNotifications(true); // silent refresh on focus
      }
      
      return () => {
        isMountedRef.current = false;
      };
    }, [token, fetchNotifications])
  );

  // ============ CLEANUP ON UNMOUNT ============
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const markAllRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
      setShowMenuModal(false);
      
      await axios.put(`${API_URL}/notifications/read-all`, {}, config);
    } catch (err) {
      console.log("Mark all read error", err);
      Alert.alert("Error", "Could not mark all as read");
      // Rollback
      fetchNotifications(false);
    }
  };

  const clearAllNotifications = async () => {
    try {
      // Optimistic update
      setNotifications([]);
      setShowClearModal(false);
      setShowMenuModal(false);
      
      await axios.delete(`${API_URL}/notifications/clear-all`, config);
    } catch (err) {
      console.error("Clear all error:", err);
      Alert.alert("Error", "Could not clear notifications");
      // Rollback
      fetchNotifications(false);
    }
  };

  const handleNotificationClick = async (item) => {
    // Optimistic mark read
    if (item.isUnread) {
      setNotifications(prev => 
        prev.map(n => n._id === item._id ? { ...n, isUnread: false } : n)
      );
      try {
        await axios.put(`${API_URL}/notifications/read/${item._id}`, {}, config);
      } catch (e) { 
        console.log("Mark read error", e); 
      }
    }

    // Navigation
    try {
      switch(item.type) {
        case 'request':
          if (item.sender?._id) {
            navigation.navigate("UserProfile", { userId: item.sender._id });
          }
          break;

        case 'connection_accepted':
        case 'request_declined':
          if (item.sender?._id) {
            navigation.navigate("UserProfile", { userId: item.sender._id });
          } else {
            Alert.alert("Notice", "User profile not available.");
          }
          break;

        case 'like':
        case 'comment':
        case 'reply':
        case 'mention':
          let postId = null;
          
          if (item.postId) {
            if (typeof item.postId === 'object' && item.postId._id) {
              postId = item.postId._id;
            } else if (typeof item.postId === 'string') {
              postId = item.postId;
            } else if (typeof item.postId === 'object' && item.postId.toString) {
              postId = item.postId.toString();
            }
          }
          
          if (!postId && item.post) {
            if (typeof item.post === 'object' && item.post._id) {
              postId = item.post._id;
            } else if (typeof item.post === 'string') {
              postId = item.post;
            }
          }
          
          if (!postId && item.relatedId) {
            if (typeof item.relatedId === 'object' && item.relatedId._id) {
              postId = item.relatedId._id;
            } else if (typeof item.relatedId === 'string') {
              postId = item.relatedId;
            }
          }

          const isValidObjectId = (id) => {
            if (!id) return false;
            const idStr = typeof id === 'string' ? id : String(id);
            return /^[0-9a-fA-F]{24}$/.test(idStr);
          };
          
          if (postId && isValidObjectId(postId)) {
            try {
              const postCheck = await axios.get(`${API_URL}/posts/${postId}`, config);
              if (postCheck.data) {
                navigation.navigate("PostDetailScreen", { postId: postId });
              } else {
                Alert.alert("Notice", "This post is no longer available.");
              }
            } catch (error) {
              if (error.response?.status === 404) {
                Alert.alert("Notice", "This post has been deleted.");
              } else {
                Alert.alert("Error", "Could not load the post.");
              }
            }
          } else {
            if (item.sender?._id) {
              navigation.navigate("UserProfile", { userId: item.sender._id });
            } else {
              Alert.alert("Notice", "This content is no longer available.");
            }
          }
          break;

        default:
          if (item.sender?._id) {
            navigation.navigate("UserProfile", { userId: item.sender._id });
          }
          break;
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert("Error", "Could not navigate to the requested content.");
    }
  };

  const handleAccept = async (notificationId) => {
    if (processingIds[notificationId]) return;
    
    setProcessingIds(prev => ({ ...prev, [notificationId]: true }));
    
    try {
      const res = await axios.post(`${API_URL}/notifications/respond`, { 
        notificationId, 
        action: 'accepted' 
      }, config);
      
      if (res.data.success) {
        setNotifications(prev => prev.map(item => 
          item._id === notificationId ? { 
            ...item, 
            status: 'accepted', 
            isUnread: false,
            isProcessed: true,
            type: 'connection_accepted',
          } : item
        ));
        
        if (currentUser && setUser) {
          const targetUserId = res.data.sender?._id || currentUser._id;
          const updatedUser = {
            ...currentUser,
            connections: [...(currentUser.connections || []), targetUserId],
            receivedRequests: (currentUser.receivedRequests || []).filter(id => id !== targetUserId)
          };
          setUser(updatedUser);
        }
        
        Alert.alert("Success", "Connection accepted! You are now connected.");
      }
    } catch (err) {
      console.error("Accept error:", err);
      Alert.alert("Error", err.response?.data?.error || "Could not process request.");
      fetchNotifications(false);
    } finally {
      setProcessingIds(prev => ({ ...prev, [notificationId]: false }));
    }
  };

  const handleDecline = async (notificationId) => {
    if (processingIds[notificationId]) return;
    
    setProcessingIds(prev => ({ ...prev, [notificationId]: true }));
    
    try {
      const res = await axios.post(`${API_URL}/notifications/respond`, { 
        notificationId, 
        action: 'declined' 
      }, config);
      
      if (res.data.success) {
        setNotifications(prev => prev.map(item => 
          item._id === notificationId ? { 
            ...item, 
            status: 'declined', 
            isUnread: false,
            isProcessed: true,
            type: 'request_declined',
          } : item
        ));
        
        if (currentUser && setUser) {
          const targetUserId = res.data.sender?._id || currentUser._id;
          const updatedUser = {
            ...currentUser,
            receivedRequests: (currentUser.receivedRequests || []).filter(id => id !== targetUserId)
          };
          setUser(updatedUser);
        }
        
        Alert.alert("Success", "Request declined.");
      }
    } catch (err) {
      console.error("Decline error:", err);
      Alert.alert("Error", err.response?.data?.error || "Could not process request.");
      fetchNotifications(false);
    } finally {
      setProcessingIds(prev => ({ ...prev, [notificationId]: false }));
    }
  };

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  const unreadCount = notifications.filter(n => n.isUnread).length;

  if (loading && !refreshing) {
    return <NotificationSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={() => setShowMenuModal(true)} style={styles.headerActionBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={COLORS.black} />
        </TouchableOpacity>
      </Animated.View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id || Math.random().toString()}
        renderItem={({ item, index }) => (
          <NotificationItem 
            item={item} 
            index={index} 
            onPress={handleNotificationClick} 
            onAccept={handleAccept} 
            onDecline={handleDecline} 
          />
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onManualRefresh} 
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={50} color="#ccc" />
            </View>
            <Text style={styles.emptyText}>All caught up! 🎉</Text>
            <Text style={styles.emptySub}>No new notifications</Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenuModal(false)}>
          <Animated.View style={[styles.menuContainer, { transform: [{ translateY: menuSlide }] }]}>
            <View style={styles.menuHeader}>
              <View style={styles.menuHeaderLine} />
              <Text style={styles.menuHeaderTitle}>Options</Text>
            </View>
            
            {unreadCount > 0 && (
              <>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={markAllRead}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemIcon}>
                    <Ionicons name="checkmark-done-circle" size={22} color={COLORS.primary} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Mark all as read</Text>
                    <Text style={styles.menuItemSub}>Mark all notifications as read</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}

            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemDanger]} 
              onPress={() => {
                setShowMenuModal(false);
                setTimeout(() => setShowClearModal(true), 300);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuItemIcon, styles.menuItemIconDanger]}>
                <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, styles.menuItemTitleDanger]}>Clear all</Text>
                <Text style={styles.menuItemSub}>Remove all notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => setShowMenuModal(false)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemIcon}>
                <Ionicons name="close" size={22} color={COLORS.gray} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: COLORS.gray }]}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Clear All Confirmation Modal */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowClearModal(false)}>
          <View style={styles.confirmContainer}>
            <View style={styles.confirmContent}>
              <View style={styles.confirmIconContainer}>
                <View style={styles.confirmIconCircle}>
                  <Ionicons name="trash-outline" size={40} color={COLORS.danger} />
                </View>
              </View>
              <Text style={styles.confirmTitle}>Clear All Notifications?</Text>
              <Text style={styles.confirmSubtitle}>
                This will permanently remove all your notifications. This action cannot be undone.
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity 
                  style={[styles.confirmBtn, styles.confirmCancelBtn]} 
                  onPress={() => setShowClearModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmBtn, styles.confirmDeleteBtn]} 
                  onPress={clearAllNotifications}
                  activeOpacity={0.7}
                >
                  <LinearGradient colors={[COLORS.danger, '#c0392b']} style={styles.confirmDeleteGradient}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.white} />
                    <Text style={styles.confirmDeleteText}>Clear All</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  
  skeletonContainer: { padding: 16, paddingTop: 8 },
  skeletonItem: { 
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, 
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, marginBottom: 8 
  },
  skeletonAvatar: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#e8e8e8', marginRight: 14 },
  skeletonContent: { flex: 1 },
  skeletonLine: { backgroundColor: '#e8e8e8', borderRadius: 4 },
  
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 5
  },
  headerBtn: { 
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', 
    justifyContent: 'center', alignItems: 'center' 
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.3 },
  headerBadge: { 
    backgroundColor: '#f9c349', minWidth: 24, height: 24, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8,
    shadowColor: '#f9c349', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  headerBadgeText: { color: '#1a1a1a', fontSize: 12, fontWeight: '800' },
  headerActionBtn: { 
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f8f8', 
    justifyContent: 'center', alignItems: 'center' 
  },
  
  notificationCard: { 
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  unreadCard: { backgroundColor: '#FFFDF5', borderColor: '#f9c34930', borderWidth: 1.5 },
  mentionCard: { backgroundColor: '#F0F7FF', borderColor: '#1877f230', borderWidth: 1.5 },
  notificationInner: { flexDirection: 'row', alignItems: 'center' },
  
  avatarSection: { position: 'relative', marginRight: 14 },
  avatarBorder: { 
    width: 52, height: 52, borderRadius: 16, padding: 2, 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  avatarBorderUnread: { borderColor: '#f9c349', borderWidth: 2 },
  avatarBorderMention: { borderColor: '#1877f2', borderWidth: 2 },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#f0f0f0' },
  typeBadge: { 
    position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, 
    borderRadius: 8, justifyContent: 'center', alignItems: 'center', 
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  
  content: { flex: 1 },
  contentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  contentText: { fontSize: 14, color: '#333', lineHeight: 20, flex: 1 },
  userName: { fontWeight: '800', color: '#1a1a1a' },
  actionText: { color: '#555', fontWeight: '400' },
  actionTextMention: { color: COLORS.mention, fontWeight: '500' },
  unreadDot: { 
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9c349', 
    marginLeft: 8, marginTop: 6,
    shadowColor: '#f9c349', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 2,
  },
  timeText: { fontSize: 11, color: '#999', marginTop: 4, fontWeight: '500' },
  
  previewBox: {
    marginTop: 8, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#f8f9fa', borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: '#e0e0e0',
  },
  previewText: { fontSize: 12, color: '#666', fontStyle: 'italic', lineHeight: 16 },
  
  actionButtons: { flexDirection: 'row', marginTop: 12, marginLeft: 66, gap: 10 },
  acceptBtn: { borderRadius: 10, overflow: 'hidden' },
  btnGradient: { flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 9, alignItems: 'center', gap: 6 },
  acceptText: { color: '#1a1a1a', fontWeight: '700', fontSize: 12 },
  declineBtn: { 
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, 
    backgroundColor: '#f8f8f8', borderWidth: 1.5, borderColor: '#e8e8e8',
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  declineText: { color: '#999', fontWeight: '600', fontSize: 12 },
  
  statusIndicator: { flexDirection: 'row', marginTop: 6 },
  statusBadge: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, 
    paddingVertical: 4, borderRadius: 8, gap: 4 
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  emptyIconCircle: { 
    width: 90, height: 90, borderRadius: 24, backgroundColor: '#f8f8f8', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, 
    borderColor: '#f0f0f0', marginBottom: 16 
  },
  emptyText: { color: '#1a1a1a', fontSize: 20, fontWeight: '800', marginTop: 4 },
  emptySub: { color: '#999', fontSize: 14, marginTop: 4, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuContainer: { 
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, 
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 12 
  },
  menuHeader: { alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuHeaderLine: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, marginBottom: 12 },
  menuHeaderTitle: { fontSize: 14, fontWeight: '600', color: '#999' },
  menuItem: { 
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, 
    borderBottomWidth: 1, borderBottomColor: '#f8f8f8' 
  },
  menuItemDanger: { borderBottomColor: '#fff5f5' },
  menuItemIcon: { 
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fef9f0', 
    justifyContent: 'center', alignItems: 'center', marginRight: 14 
  },
  menuItemIconDanger: { backgroundColor: '#fff5f5' },
  menuItemContent: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  menuItemTitleDanger: { color: '#ff4757' },
  menuItemSub: { fontSize: 12, color: '#999', marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },

  confirmContainer: { 
    width: width - 40, maxWidth: 340, borderRadius: 24, 
    overflow: 'hidden', alignSelf: 'center' 
  },
  confirmContent: { padding: 24, alignItems: 'center', backgroundColor: '#fff' },
  confirmIconContainer: { marginBottom: 16 },
  confirmIconCircle: { 
    width: 70, height: 70, borderRadius: 20, backgroundColor: '#fff5f5', 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: 2, borderColor: '#ff475730' 
  },
  confirmTitle: { 
    fontSize: 20, fontWeight: '800', color: '#1a1a1a', 
    textAlign: 'center', marginBottom: 8 
  },
  confirmSubtitle: { 
    fontSize: 14, color: '#666', textAlign: 'center', 
    lineHeight: 20, marginBottom: 20 
  },
  confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  confirmCancelBtn: { 
    backgroundColor: '#f8f8f8', paddingVertical: 12, alignItems: 'center', 
    borderWidth: 1, borderColor: '#e8e8e8' 
  },
  confirmCancelText: { color: '#666', fontWeight: '700', fontSize: 14 },
  confirmDeleteBtn: { flex: 1, overflow: 'hidden' },
  confirmDeleteGradient: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    paddingVertical: 12, gap: 8 
  },
  confirmDeleteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});