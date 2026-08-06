// screens/NotificationScreen.js - COMPLETE FIXED VERSION WITH NAVIGATION

import React, { useState, useEffect, useContext, useRef } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image, 
  StatusBar, Platform, Alert, Animated,
  RefreshControl, Modal, Pressable, Dimensions
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from "../../context/AuthContext";

const { width, height } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

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
      case 'like': return { name: 'heart', color: COLORS.primary, bg: '#fef9f0' };
      case 'comment': return { name: 'chatbubble', color: COLORS.primary, bg: '#fef9f0' };
      case 'request': return { name: 'person-add', color: COLORS.primary, bg: '#fef9f0' };
      case 'connection_accepted': return { name: 'checkmark-circle', color: COLORS.success, bg: '#f0fdf4' };
      case 'request_declined': return { name: 'close-circle', color: COLORS.danger, bg: '#fef2f2' };
      default: return { name: 'notifications', color: COLORS.gray, bg: COLORS.lightGray };
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

  const icon = getNotificationIcon(item.type);
  
  const isRequestPending = item.type === 'request' && 
                          item.status === 'pending' && 
                          !item.isProcessed;

  const isConnectionResult = item.type === 'connection_accepted' || item.type === 'request_declined';

  const isProcessedRequest = item.type === 'request' && 
                            item.isProcessed && 
                            item.status !== 'pending';

  return (
    <Animated.View style={{ 
      opacity: itemFade,
      transform: [{ translateY: itemFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
    }}>
      <TouchableOpacity 
        style={[styles.notificationCard, item.isUnread && styles.unreadCard]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationInner}>
          <View style={styles.avatarSection}>
            <View style={[styles.avatarBorder, item.isUnread && styles.avatarBorderUnread]}>
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
                <Text style={styles.actionText}>
                  {item.type === 'like' ? 'liked your post' : 
                   item.type === 'comment' ? 'commented on your post' : 
                   item.type === 'connection_accepted' ? 'accepted your connection request 🎉' :
                   item.type === 'request_declined' ? 'declined your connection request' :
                   item.text || 'sent you a connection request'}
                </Text>
              </Text>
              {item.isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
            
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

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications`, config);
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
      
      setNotifications(formattedData);
    } catch (err) {
      console.error("Fetch notifications error:", err);
      setNotifications([]); 
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token]);

  const markAllRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/read-all`, {}, config);
      setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
      setShowMenuModal(false);
      Alert.alert("Success", "All notifications marked as read");
    } catch (err) {
      console.log("Mark all read error", err);
      Alert.alert("Error", "Could not mark all as read");
    }
  };

  const clearAllNotifications = async () => {
    try {
      await axios.delete(`${API_URL}/notifications/clear-all`, config);
      setNotifications([]);
      setShowClearModal(false);
      setShowMenuModal(false);
      Alert.alert("Success", "All notifications cleared");
    } catch (err) {
      console.error("Clear all error:", err);
      Alert.alert("Error", "Could not clear notifications");
    }
  };

  // screens/NotificationScreen.js - FIXED handleNotificationClick

const handleNotificationClick = async (item) => {
  // Mark as read if unread
  if (item.isUnread) {
    try {
      await axios.put(`${API_URL}/notifications/read/${item._id}`, {}, config);
      setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, isUnread: false } : n));
    } catch (e) { 
      console.log("Mark read error", e); 
    }
  }

  // Handle navigation based on notification type
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
        // ========== FIXED: Properly extract postId ==========
        let postId = null;
        
        // If postId is an object with _id property
        if (item.postId) {
          if (typeof item.postId === 'object' && item.postId._id) {
            postId = item.postId._id;
          } else if (typeof item.postId === 'string') {
            postId = item.postId;
          } else if (typeof item.postId === 'object' && item.postId.toString) {
            // Try to convert to string
            postId = item.postId.toString();
          }
        }
        
        // Also check if the post is stored in a different field
        if (!postId && item.post) {
          if (typeof item.post === 'object' && item.post._id) {
            postId = item.post._id;
          } else if (typeof item.post === 'string') {
            postId = item.post;
          }
        }
        
        // Validate postId is a valid ObjectId format (24 hex chars)
        const isValidObjectId = (id) => {
          if (!id) return false;
          const idStr = typeof id === 'string' ? id : String(id);
          return /^[0-9a-fA-F]{24}$/.test(idStr);
        };
        
        if (postId && isValidObjectId(postId)) {
          try {
            // First check if post exists
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
              console.error("Post fetch error:", error);
              Alert.alert("Error", "Could not load the post.");
            }
          }
        } else {
          // If no valid post ID, try to navigate to sender's profile
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

  // Handle Accept - Updates currentUser context
  const handleAccept = async (notificationId) => {
    if (processingIds[notificationId]) return;
    
    setProcessingIds(prev => ({ ...prev, [notificationId]: true }));
    
    try {
      const res = await axios.post(`${API_URL}/notifications/respond`, { 
        notificationId, 
        action: 'accepted' 
      }, config);
      
      if (res.data.success) {
        // Update the notification in the list
        setNotifications(prev => prev.map(item => 
          item._id === notificationId ? { 
            ...item, 
            status: 'accepted', 
            isUnread: false,
            isProcessed: true,
            type: 'connection_accepted',
            text: `${item.recipient?.name || 'You'} accepted the connection request`
          } : item
        ));
        
        // Update currentUser context with new connection
        if (currentUser && setUser) {
          const targetUserId = res.data.sender?._id || currentUser._id;
          const updatedUser = {
            ...currentUser,
            connections: [...(currentUser.connections || []), targetUserId],
            receivedRequests: (currentUser.receivedRequests || []).filter(id => id !== targetUserId)
          };
          setUser(updatedUser);
          console.log('🔄 User context updated with new connection');
        }
        
        Alert.alert("Success", "Connection accepted! You are now connected.");
        
        // Fetch latest notifications
        await fetchNotifications();
      }
    } catch (err) {
      console.error("Accept error:", err);
      Alert.alert("Error", err.response?.data?.error || "Could not process request.");
    } finally {
      setProcessingIds(prev => ({ ...prev, [notificationId]: false }));
    }
  };

  // Handle Decline - Updates currentUser context
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
            text: `${item.recipient?.name || 'You'} declined the connection request`
          } : item
        ));
        
        // Update currentUser context by removing from receivedRequests
        if (currentUser && setUser) {
          const targetUserId = res.data.sender?._id || currentUser._id;
          const updatedUser = {
            ...currentUser,
            receivedRequests: (currentUser.receivedRequests || []).filter(id => id !== targetUserId)
          };
          setUser(updatedUser);
          console.log('🔄 User context updated - request declined');
        }
        
        Alert.alert("Success", "Request declined.");
        await fetchNotifications();
      }
    } catch (err) {
      console.error("Decline error:", err);
      Alert.alert("Error", err.response?.data?.error || "Could not process request.");
    } finally {
      setProcessingIds(prev => ({ ...prev, [notificationId]: false }));
    }
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
            onRefresh={() => { setRefreshing(true); fetchNotifications(); }} 
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
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    marginBottom: 8 
  },
  skeletonAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 14, 
    backgroundColor: '#e8e8e8', 
    marginRight: 14 
  },
  skeletonContent: { flex: 1 },
  skeletonLine: { backgroundColor: '#e8e8e8', borderRadius: 4 },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 14, 
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom:5
  },
  headerBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 12, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerCenter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#1a1a1a', 
    letterSpacing: 0.3 
  },
  headerBadge: { 
    backgroundColor: '#f9c349', 
    minWidth: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 8,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBadgeText: { 
    color: '#1a1a1a', 
    fontSize: 12, 
    fontWeight: '800' 
  },
  headerActionBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  notificationCard: { 
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  unreadCard: { 
    backgroundColor: '#FFFDF5',
    borderColor: '#f9c34930',
    borderWidth: 1.5,
  },
  notificationInner: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  
  avatarSection: { 
    position: 'relative', 
    marginRight: 14 
  },
  avatarBorder: { 
    width: 52, 
    height: 52, 
    borderRadius: 16, 
    padding: 2, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  avatarBorderUnread: {
    borderColor: '#f9c349',
    borderWidth: 2,
  },
  avatar: { 
    width: 46, 
    height: 46, 
    borderRadius: 14, 
    backgroundColor: '#f0f0f0' 
  },
  typeBadge: { 
    position: 'absolute', 
    bottom: -2, 
    right: -2, 
    width: 22, 
    height: 22, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2.5, 
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  content: { flex: 1 },
  contentRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start' 
  },
  contentText: { 
    fontSize: 14, 
    color: '#333', 
    lineHeight: 20, 
    flex: 1 
  },
  userName: { 
    fontWeight: '800', 
    color: '#1a1a1a' 
  },
  actionText: { 
    color: '#555', 
    fontWeight: '400' 
  },
  unreadDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#f9c349', 
    marginLeft: 8, 
    marginTop: 6,
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  timeText: { 
    fontSize: 11, 
    color: '#999', 
    marginTop: 4, 
    fontWeight: '500' 
  },
  
  actionButtons: { 
    flexDirection: 'row', 
    marginTop: 12, 
    marginLeft: 66, 
    gap: 10 
  },
  acceptBtn: { 
    borderRadius: 10, 
    overflow: 'hidden' 
  },
  btnGradient: { 
    flexDirection: 'row', 
    paddingHorizontal: 18, 
    paddingVertical: 9, 
    alignItems: 'center', 
    gap: 6 
  },
  acceptText: { 
    color: '#1a1a1a', 
    fontWeight: '700', 
    fontSize: 12 
  },
  declineBtn: { 
    paddingHorizontal: 18, 
    paddingVertical: 9, 
    borderRadius: 10, 
    backgroundColor: '#f8f8f8', 
    borderWidth: 1.5, 
    borderColor: '#e8e8e8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  declineText: { 
    color: '#999', 
    fontWeight: '600', 
    fontSize: 12 
  },
  
  statusIndicator: { 
    flexDirection: 'row', 
    marginTop: 6
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    gap: 4 
  },
  statusText: { 
    fontSize: 11, 
    fontWeight: '600' 
  },
  
  empty: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingBottom: 40 
  },
  emptyIconCircle: { 
    width: 90, 
    height: 90, 
    borderRadius: 24, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#f0f0f0', 
    marginBottom: 16 
  },
  emptyText: { 
    color: '#1a1a1a', 
    fontSize: 20, 
    fontWeight: '800', 
    marginTop: 4 
  },
  emptySub: { 
    color: '#999', 
    fontSize: 14, 
    marginTop: 4, 
    fontWeight: '500' 
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
  },
  menuHeader: {
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuHeaderLine: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 12,
  },
  menuHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  menuItemDanger: {
    borderBottomColor: '#fff5f5',
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef9f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemIconDanger: {
    backgroundColor: '#fff5f5',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuItemTitleDanger: {
    color: '#ff4757',
  },
  menuItemSub: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
  },

  confirmContainer: {
    width: width - 40,
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  confirmContent: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  confirmIconContainer: {
    marginBottom: 16,
  },
  confirmIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff475730',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmCancelBtn: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  confirmCancelText: {
    color: '#666',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmDeleteBtn: {
    flex: 1,
    overflow: 'hidden',
  },
  confirmDeleteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  confirmDeleteText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});