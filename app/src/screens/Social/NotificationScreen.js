import React, { useState, useEffect, useContext } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image, 
   StatusBar, Platform, ActivityIndicator, Alert 
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from "../../context/AuthContext";

const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

export default function NotificationScreen({ navigation }) {
  const { token, user: currentUser, setUnreadCount } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const config = { headers: { Authorization: `Bearer ${token}` } };

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
    } catch (err) {
      console.log("Mark all read error", err);
    }
  };

  const handleNotificationClick = async (item) => {
  // 1. Mark as read in Database immediately
  if (item.isUnread) {
    try {
      await axios.put(`${API_URL}/notifications/read/${item._id}`, {}, config);
      setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, isUnread: false } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.log("Mark read error", e); }
  }

  // 2. Navigation Logic
  if (item.type === 'request') {
    navigation.navigate("UserProfile", { userId: item.sender._id });
  } else if (item.type === 'like' || item.type === 'comment') {
    // Check if postId exists
    if (item.postId) {
      try {
        // Optional: Verify post still exists before navigating
        const postCheck = await axios.get(`${API_URL}/posts/${item.postId}`, config);
        if (postCheck.data) {
          navigation.navigate("PostDetailScreen", { 
            postId: item.postId,
            onGoBack: () => {
              fetchNotifications(); // Refresh on return
            }
          });
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

  const handleRespond = async (notificationId, action) => {
    try {
      const res = await axios.post(`${API_URL}/notifications/respond`, { notificationId, action }, config);
      if (res.data.success) {
        setNotifications(prev => prev.map(item => 
          item._id === notificationId ? { ...item, status: action, isUnread: false } : item
        ));
        Alert.alert("Success", action === 'accepted' ? "Connection accepted!" : "Request declined.");
        // Refresh notifications to get updated status
        fetchNotifications();
      }
    } catch (err) {
      Alert.alert("Error", "Could not process request.");
    }
  };

  const renderItem = ({ item }) => {
    const icon = item.type === 'like' ? { name: 'heart', color: '#FF3B30' } :
                 item.type === 'comment' ? { name: 'chatbubble', color: '#4CAF50' } :
                 { name: 'person-add', color: '#6C63FF' };

    return (
      <View style={[styles.notificationCard, item.isUnread && styles.unreadBg]}>
        <TouchableOpacity style={styles.mainRow} onPress={() => handleNotificationClick(item)}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: item.sender?.profileImage || 'https://via.placeholder.com/150' }} 
              style={styles.avatar} 
            />
            <View style={[styles.typeIconBg, { backgroundColor: icon.color }]}>
              <Ionicons name={icon.name} size={10} color="#FFF" />
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.contentText} numberOfLines={2}>
              <Text style={styles.userName}>{item.sender?.name || "Someone"} </Text>
              {item.type === 'like' ? 'liked your post.' : 
               item.type === 'comment' ? 'commented on your post.' : 
               item.text || 'sent you a request.'}
            </Text>
            <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          {item.isUnread && <View style={styles.unreadDot} />}
        </TouchableOpacity>

        {item.type === 'request' && item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.btn, styles.acceptBtn]} 
              onPress={() => handleRespond(item._id, 'accepted')}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btn, styles.declineBtn]} 
              onPress={() => handleRespond(item._id, 'declined')}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#6C63FF" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={50} color="#DDD" />
              <Text style={styles.emptyText}>All caught up!</Text>
            </View>
          }
          contentContainerStyle={notifications.length === 0 && { flex: 1 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', 
    paddingTop: Platform.OS === 'android' ? 45 : 10 
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  markAllText: { color: '#6C63FF', fontWeight: '600', fontSize: 14 },
  notificationCard: { padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  unreadBg: { backgroundColor: '#F4F8FF' },
  mainRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEE' },
  typeIconBg: { position: 'absolute', bottom: -1, right: -1, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  content: { flex: 1, marginLeft: 12 },
  userName: { fontWeight: '700', color: '#1A1A1A' },
  contentText: { fontSize: 14, color: '#444', lineHeight: 18 },
  timeText: { fontSize: 12, color: '#AAA', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6C63FF', marginLeft: 10 },
  actionButtons: { flexDirection: 'row', marginTop: 12, marginLeft: 62 },
  btn: { paddingVertical: 8, paddingHorizontal: 22, borderRadius: 8, marginRight: 10 },
  acceptBtn: { backgroundColor: '#6C63FF' },
  declineBtn: { backgroundColor: '#F0F0F0' },
  acceptText: { color: '#FFF', fontWeight: 'bold' },
  declineText: { color: '#666', fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#999', fontSize: 16, marginTop: 10 }
});