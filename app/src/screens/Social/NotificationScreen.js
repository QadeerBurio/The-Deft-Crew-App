import React, { useState, useEffect, useContext, useRef } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image, 
  StatusBar, Platform, Alert, Animated,
  RefreshControl
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from "../../context/AuthContext";

const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

// ✅ Skeleton Component (top-level)
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

// ✅ NotificationItem Component (top-level)
const NotificationItem = React.memo(({ item, index, onPress, onAccept, onDecline }) => {
  const itemFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemFade, {
      toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true,
    }).start();
  }, []);

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'like': return { name: 'heart', color: '#f9c349' };
      case 'comment': return { name: 'chatbubble', color: '#2196F3' };
      case 'request': return { name: 'person-add', color: '#4CAF50' };
      default: return { name: 'notifications', color: '#666' };
    }
  };

  const getTimeAgo = (dateString) => {
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
            <LinearGradient 
              colors={item.isUnread ? ['#f9c349', '#1a1a1a'] : ['#e0e0e0', '#e0e0e0']} 
              style={styles.avatarBorder}
            >
              <Image 
                source={{ uri: item.sender?.profileImage || 'https://via.placeholder.com/150' }} 
                style={styles.avatar} 
              />
            </LinearGradient>
            <View style={[styles.typeBadge, { backgroundColor: icon.color }]}>
              <Ionicons name={icon.name} size={10} color="#fff" />
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.contentRow}>
              <Text style={styles.contentText} numberOfLines={2}>
                <Text style={styles.userName}>{item.sender?.name || "Someone"}</Text>
                {' '}
                {item.type === 'like' ? 'liked your post' : 
                 item.type === 'comment' ? 'commented on your post' : 
                 item.text || 'sent you a connection request'}
              </Text>
              {item.isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
          </View>
        </View>

        {item.type === 'request' && item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.acceptBtn} 
              onPress={() => onAccept(item._id)}
              activeOpacity={0.7}
            >
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.btnGradient}>
                <Ionicons name="checkmark" size={14} color="#fff" />
                <Text style={styles.acceptText}>Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.declineBtn} 
              onPress={() => onDecline(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={14} color="#666" />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {(item.status === 'accepted' || item.status === 'declined') && (
          <View style={styles.statusIndicator}>
            <Ionicons 
              name={item.status === 'accepted' ? 'checkmark-circle' : 'close-circle'} 
              size={14} 
              color={item.status === 'accepted' ? '#4CAF50' : '#999'} 
            />
            <Text style={[styles.statusText, { color: item.status === 'accepted' ? '#4CAF50' : '#999' }]}>
              {item.status === 'accepted' ? 'Accepted' : 'Declined'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function NotificationScreen({ navigation }) {
  const { token, user: currentUser, setUnreadCount } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications`, config);
      const rawData = Array.isArray(res.data) ? res.data : [];
      
      const formattedData = rawData.map(n => ({
        ...n,
        isUnread: (n.readBy && Array.isArray(n.readBy) && currentUser?._id) 
                  ? !n.readBy.includes(currentUser._id) 
                  : true
      }));
      
      setNotifications(formattedData);
      const count = formattedData.filter(n => n.isUnread).length;
      setUnreadCount(count);
    } catch (err) {
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
      setUnreadCount(0);
      Alert.alert("Success", "All notifications marked as read");
    } catch (err) {
      console.log("Mark all read error", err);
    }
  };

  const handleNotificationClick = async (item) => {
    if (item.isUnread) {
      try {
        await axios.put(`${API_URL}/notifications/read/${item._id}`, {}, config);
        setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, isUnread: false } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) { console.log("Mark read error", e); }
    }

    if (item.type === 'request') {
      navigation.navigate("UserProfile", { userId: item.sender._id });
    } else if (item.type === 'like' || item.type === 'comment') {
      if (item.postId) {
        try {
          const postCheck = await axios.get(`${API_URL}/posts/${item.postId}`, config);
          if (postCheck.data) {
            navigation.navigate("PostDetailScreen", { postId: item.postId });
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
        Alert.alert("Notice", "This post is no longer available.");
      }
    }
  };

  const handleAccept = async (notificationId) => {
    try {
      const res = await axios.post(`${API_URL}/notifications/respond`, { notificationId, action: 'accepted' }, config);
      if (res.data.success) {
        setNotifications(prev => prev.map(item => 
          item._id === notificationId ? { ...item, status: 'accepted', isUnread: false } : item
        ));
        Alert.alert("Success", "Connection accepted!");
        fetchNotifications();
      }
    } catch (err) {
      Alert.alert("Error", "Could not process request.");
    }
  };

  const handleDecline = async (notificationId) => {
    try {
      const res = await axios.post(`${API_URL}/notifications/respond`, { notificationId, action: 'declined' }, config);
      if (res.data.success) {
        setNotifications(prev => prev.map(item => 
          item._id === notificationId ? { ...item, status: 'declined', isUnread: false } : item
        ));
        Alert.alert("Success", "Request declined.");
        fetchNotifications();
      }
    } catch (err) {
      Alert.alert("Error", "Could not process request.");
    }
  };

  const unreadCount = notifications.filter(n => n.isUnread).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Mark all</Text>
        </TouchableOpacity>
      </Animated.View>

      {loading && !refreshing ? (
        <NotificationSkeleton />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
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
              tintColor="#f9c349"
              colors={["#f9c349"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={50} color="#ccc" />
              </View>
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySub}>No new notifications</Text>
            </View>
          }
          contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  
  // Skeleton
  skeletonContainer: { padding: 16 },
  skeletonItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  skeletonAvatar: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#e8e8e8', marginRight: 14 },
  skeletonContent: { flex: 1 },
  skeletonLine: { backgroundColor: '#e8e8e8', borderRadius: 4 },
  
  // Header
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff'
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  headerBadge: { 
    backgroundColor: '#f9c349', minWidth: 22, height: 22, borderRadius: 11, 
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 7 
  },
  headerBadgeText: { color: '#1a1a1a', fontSize: 12, fontWeight: '800' },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  markAllText: { color: '#f9c349', fontWeight: '700', fontSize: 13 },
  
  // Notification Card
  notificationCard: { 
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5'
  },
  unreadCard: { backgroundColor: '#FFFDF5' },
  notificationInner: { flexDirection: 'row', alignItems: 'center' },
  
  avatarSection: { position: 'relative', marginRight: 14 },
  avatarBorder: { width: 52, height: 52, borderRadius: 16, padding: 2, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#f0f0f0' },
  typeBadge: { 
    position: 'absolute', bottom: -2, right: -2, 
    width: 22, height: 22, borderRadius: 8, 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: 2, borderColor: '#fff' 
  },
  
  content: { flex: 1 },
  contentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  contentText: { fontSize: 14, color: '#1a1a1a', lineHeight: 20, flex: 1 },
  userName: { fontWeight: '800', color: '#1a1a1a' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f9c349', marginLeft: 8, marginTop: 6 },
  timeText: { fontSize: 11, color: '#999', marginTop: 4, fontWeight: '500' },
  
  // Action Buttons
  actionButtons: { flexDirection: 'row', marginTop: 12, marginLeft: 66, gap: 10 },
  acceptBtn: { borderRadius: 10, overflow: 'hidden' },
  btnGradient: { flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 9, alignItems: 'center', gap: 6 },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  declineBtn: { 
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, 
    backgroundColor: '#f8f8f8', borderWidth: 2, borderColor: '#f0f0f0' 
  },
  declineText: { color: '#666', fontWeight: '600', fontSize: 12 },
  
  statusIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginLeft: 66, gap: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  
  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIconCircle: { 
    width: 80, height: 80, borderRadius: 20, backgroundColor: '#f8f8f8', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f0f0f0', marginBottom: 16 
  },
  emptyText: { color: '#1a1a1a', fontSize: 18, fontWeight: '800' },
  emptySub: { color: '#999', fontSize: 13, marginTop: 4, fontWeight: '500' },
});

