import React, { useState, useEffect, useContext } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, FlatList,
  Pressable, ActivityIndicator, Dimensions, ScrollView, RefreshControl, Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const NotificationModal = ({ visible, onClose }) => {
  const { token, setUnreadCount } = useContext(AuthContext);
  const [filter, setFilter] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Recently';
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 84600) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return past.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get('https://the-deft-crew-production.up.railway.app/api/notification/my-notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data.map(n => ({ ...n, time: getTimeAgo(n.createdAt) }));
      setNotifications(data);
      const count = data.filter(n => !n.isRead).length;
      setUnreadCount(count);
    } catch (error) {
      console.error("Fetch Error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible && token) fetchNotifications();
  }, [visible, token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsReadOnServer = async (id) => {
    try {
      await axios.patch(`https://the-deft-crew-production.up.railway.app/api/notification/mark-read/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.log("Read update error:", error.message);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put("https://the-deft-crew-production.up.railway.app/api/notification/mark-all-read", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.log(err);
    }
  };

  // --- DELETE FUNCTIONALITY ---

 const deleteNotification = async (id) => {
  try {
    // API Call
    await axios.delete(`https://the-deft-crew-production.up.railway.app/api/notification/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Find if the deleted item was unread before removing it
    const deletedItem = notifications.find(n => n._id === id);
    if (deletedItem && !deletedItem.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Update Local UI State
    setNotifications(prev => prev.filter(n => n._id !== id));
    
    // Close detail view if the deleted message was open
    if (selectedNotification?._id === id) {
      setSelectedNotification(null);
    }
  } catch (error) {
    Alert.alert("Error", "Could not delete notification");
  }
};

  const clearAllNotifications = () => {
    Alert.alert(
      "Clear All",
      "Are you sure you want to delete all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive", 
          onPress: async () => {
            try {
              await axios.delete("https://the-deft-crew-production.up.railway.app/api/notification/clear-all", {
                headers: { Authorization: `Bearer ${token}` }
              });
              setNotifications([]);
              setUnreadCount(0);
            } catch (err) {
              console.log(err);
            }
          } 
        }
      ]
    );
  };

  const handleOpenNotification = (item) => {
    setSelectedNotification(item);
    if (!item.isRead) markAsReadOnServer(item._id);
  };

  const filteredData = notifications.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !n.isRead;
    return n.type === filter;
  });

  // --- Components ---

  const Header = () => (
    <View style={styles.headerContainer}>
      <View style={styles.dragHandle} />
      <View style={styles.headerTextRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={markAllRead} style={styles.headerActionBtn}>
              <Text style={styles.actionTextBlue}>Mark all read</Text>
            </TouchableOpacity>
            <Text style={styles.actionDivider}>•</Text>
            <TouchableOpacity onPress={clearAllNotifications} style={styles.headerActionBtn}>
              <Text style={styles.actionTextRed}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close-circle" size={32} color="#CBD5E1" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {['All', 'Unread', 'Offers', 'System'].map(label => (
          <TouchableOpacity
            key={label}
            onPress={() => setFilter(label)}
            style={[styles.filterChip, filter === label && styles.activeFilterChip]}
          >
            <Text style={[styles.filterChipText, filter === label && styles.activeFilterChipText]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const NotificationCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead ? styles.unreadCard : styles.readCard]}
      onPress={() => handleOpenNotification(item)}
    >
      <View style={[styles.iconBox, { backgroundColor: !item.isRead ? '#E0E7FF' : '#F1F5F9' }]}>
        <MaterialCommunityIcons 
          name={item.type === 'Offers' ? 'tag-outline' : 'bell-outline'} 
          size={24} 
          color={!item.isRead ? '#4F46E5' : '#94A3B8'} 
        />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, !item.isRead ? styles.unreadText : styles.readText]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardTime}>{item.time}</Text>
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      </View>
      
      <View style={styles.rightActions}>
        {!item.isRead && <View style={styles.unreadIndicator} />}
        <TouchableOpacity 
          style={styles.deleteBtn} 
          onPress={() => deleteNotification(item._id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FDA4AF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const MessageDetail = () => (
    <View style={styles.detailWrapper}>
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.detailBack} onPress={() => setSelectedNotification(null)}>
          <Ionicons name="chevron-back" size={28} color="#0F172A" />
          <Text style={styles.detailHeaderTitle}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteNotification(selectedNotification._id)}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.messageScroll}>
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{selectedNotification.time.toUpperCase()}</Text>
        </View>

        <View style={styles.chatBubble}>
          <Text style={styles.bubbleTitle}>{selectedNotification.title}</Text>
          <Text style={styles.bubbleBody}>{selectedNotification.description}</Text>
          <View style={styles.bubbleFooter}>
            <Text style={styles.bubbleTime}>
              {new Date(selectedNotification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Ionicons name="checkmark-done" size={18} color="#4F46E5" style={{ marginLeft: 5 }} />
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {!selectedNotification ? (
            <>
              <Header />
              {loading && !refreshing ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                </View>
              ) : (
                <FlatList
                  data={filteredData}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => <NotificationCard item={item} />}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />}
                  contentContainerStyle={styles.listContainer}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <MaterialCommunityIcons name="email-open-outline" size={60} color="#CBD5E1" />
                      <Text style={styles.emptyLabel}>No notifications</Text>
                    </View>
                  }
                />
              )}
            </>
          ) : (
            <MessageDetail />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  sheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: SCREEN_HEIGHT * 0.9,
    width: '100%',
    overflow: 'hidden'
  },
  headerContainer: { paddingHorizontal: 24, paddingTop: 15, paddingBottom: 20, backgroundColor: '#FFF' },
  dragHandle: { width: 40, height: 5, backgroundColor: '#F1F5F9', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
  headerTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  headerActionBtn: { paddingVertical: 2 },
  actionTextBlue: { color: "#4F46E5", fontWeight: "700", fontSize: 13 },
  actionTextRed: { color: "#EF4444", fontWeight: "700", fontSize: 13 },
  actionDivider: { marginHorizontal: 8, color: '#CBD5E1' },
  filterScroll: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  activeFilterChip: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterChipText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  activeFilterChipText: { color: '#FFF' },
  listContainer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 },
  card: { flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 10, alignItems: 'center', borderWidth: 1 },
  unreadCard: { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' },
  readCard: { backgroundColor: '#FFF', borderColor: '#F1F5F9' },
  iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  cardTitle: { fontSize: 16 },
  unreadText: { color: '#0F172A', fontWeight: '800' },
  readText: { color: '#475569', fontWeight: '500' },
  cardTime: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  rightActions: { alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  unreadIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5', marginBottom: 10 },
  deleteBtn: { padding: 4 },
  detailWrapper: { flex: 1, backgroundColor: '#F8FAFC' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailBack: { flexDirection: 'row', alignItems: 'center' },
  detailHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginLeft: 4 },
  messageScroll: { paddingHorizontal: 20, paddingTop: 25 },
  dateSeparator: { alignSelf: 'center', backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginBottom: 20 },
  dateSeparatorText: { fontSize: 10, color: '#64748B', fontWeight: '800' },
  chatBubble: { backgroundColor: '#FFF', width: '100%', borderRadius: 20, borderTopLeftRadius: 4, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  bubbleTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  bubbleBody: { fontSize: 15, color: '#334155', lineHeight: 24 },
  bubbleFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15 },
  bubbleTime: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 80, opacity: 0.6 },
  emptyLabel: { fontSize: 16, fontWeight: '600', color: '#64748B', marginTop: 10 }
});

export default NotificationModal;