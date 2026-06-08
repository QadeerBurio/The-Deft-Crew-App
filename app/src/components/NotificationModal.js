import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, FlatList,
  Pressable, ActivityIndicator, Dimensions, ScrollView, RefreshControl, Alert,
  Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const NotificationModal = ({ visible, onClose }) => {
  const { token, setUnreadCount, updateUnreadCount } = useContext(AuthContext);
  const [filter, setFilter] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Fetch notifications when modal opens
      if (token) fetchNotifications();
    } else {
      // Slide out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

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
      
      // Update unread count in context
      const count = data.filter(n => !n.isRead).length;
      setUnreadCount(count);
    } catch (error) {
      console.error("Fetch Error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`https://the-deft-crew-production.up.railway.app/api/notification/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const deletedItem = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      
      // Only decrease unread count if the deleted item was unread
      if (deletedItem && !deletedItem.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
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

  const handleClose = () => {
    // Refresh count when closing modal
    updateUnreadCount(token);
    onClose();
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

  // Header Component
  const Header = () => (
    <View style={styles.headerContainer}>
      <View style={styles.dragHandle} />
      <View style={styles.headerTextRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={markAllRead} style={styles.headerActionBtn}>
              <Ionicons name="checkmark-done-outline" size={14} color="#f9c349" />
              <Text style={styles.actionTextGold}>Mark all read</Text>
            </TouchableOpacity>
            <Text style={styles.actionDivider}>•</Text>
            <TouchableOpacity onPress={clearAllNotifications} style={styles.headerActionBtn}>
              <Ionicons name="trash-outline" size={14} color="#EF4444" />
              <Text style={styles.actionTextRed}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={22} color="#1a1a1a" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {['All', 'Unread', 'Offers', 'System'].map(label => (
          <TouchableOpacity
            key={label}
            onPress={() => setFilter(label)}
            style={[styles.filterChip, filter === label && styles.activeFilterChip]}
          >
            <Text style={[styles.filterChipText, filter === label && styles.activeFilterChipText]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Notification Card Component
  const NotificationCard = ({ item, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={{
        opacity: cardAnim,
        transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}>
        <TouchableOpacity
          style={[styles.card, !item.isRead ? styles.unreadCard : styles.readCard]}
          onPress={() => handleOpenNotification(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: !item.isRead ? '#f9c34915' : '#f8f8f8' }]}>
            <MaterialCommunityIcons 
              name={item.type === 'Offers' ? 'tag-outline' : 'bell-outline'} 
              size={20} 
              color={!item.isRead ? '#f9c349' : '#999'} 
            />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, !item.isRead && styles.unreadText]} numberOfLines={1}>
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
              <Ionicons name="trash-outline" size={18} color="#ccc" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Message Detail Component
  const MessageDetail = () => (
    <View style={styles.detailWrapper}>
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.detailBack} onPress={() => setSelectedNotification(null)}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Notification</Text>
        <TouchableOpacity 
          style={styles.detailDeleteBtn}
          onPress={() => deleteNotification(selectedNotification._id)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.messageScroll}>
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{selectedNotification.time.toUpperCase()}</Text>
        </View>

        <View style={styles.chatBubble}>
          <View style={styles.bubbleHeader}>
            <View style={styles.bubbleIconCircle}>
              <MaterialCommunityIcons 
                name={selectedNotification.type === 'Offers' ? 'tag-outline' : 'bell-outline'} 
                size={20} 
                color="#f9c349" 
              />
            </View>
            <Text style={styles.bubbleTitle}>{selectedNotification.title}</Text>
          </View>
          <Text style={styles.bubbleBody}>{selectedNotification.description}</Text>
          <View style={styles.bubbleFooter}>
            <Text style={styles.bubbleTime}>
              {new Date(selectedNotification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Ionicons name="checkmark-circle" size={16} color="#f9c349" style={{ marginLeft: 6 }} />
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          }
        ]}>
          {!selectedNotification ? (
            <>
              <Header />
              {loading && !refreshing ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#f9c349" />
                </View>
              ) : (
                <FlatList
                  data={filteredData}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item, index }) => <NotificationCard item={item} index={index} />}
                  refreshControl={
                    <RefreshControl 
                      refreshing={refreshing} 
                      onRefresh={onRefresh} 
                      colors={['#f9c349']}
                      tintColor="#f9c349"
                      progressBackgroundColor="#ffffff"
                    />
                  }
                  contentContainerStyle={styles.listContainer}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <MaterialCommunityIcons name="bell-off-outline" size={60} color="#ccc" />
                      <Text style={styles.emptyLabel}>No notifications yet</Text>
                      <Text style={styles.emptySubLabel}>We'll notify you when something arrives</Text>
                    </View>
                  }
                />
              )}
            </>
          ) : (
            <MessageDetail />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
  },
  backdrop: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: SCREEN_HEIGHT * 0.9,
    width: '100%',
    overflow: 'hidden',
  },
  
  // Header
  headerContainer: { 
    paddingHorizontal: 20, 
    paddingTop: 12, 
    paddingBottom: 16, 
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dragHandle: { 
    width: 36, 
    height: 4, 
    backgroundColor: '#f0f0f0', 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginBottom: 16,
  },
  headerTextRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f9c349',
    marginRight: 8,
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 2,
    marginLeft: 16,
  },
  headerActionBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 4,
  },
  actionTextGold: { 
    color: "#f9c349", 
    fontWeight: "700", 
    fontSize: 11,
  },
  actionTextRed: { 
    color: "#EF4444", 
    fontWeight: "700", 
    fontSize: 11,
  },
  actionDivider: { 
    marginHorizontal: 6, 
    color: '#ccc',
    fontSize: 11,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // Filters
  filterScroll: { 
    flexDirection: 'row',
  },
  filterChip: { 
    paddingHorizontal: 14, 
    paddingVertical: 7, 
    borderRadius: 10, 
    backgroundColor: '#f8f8f8', 
    marginRight: 8, 
    borderWidth: 1, 
    borderColor: '#f0f0f0',
  },
  activeFilterChip: { 
    backgroundColor: '#1a1a1a', 
    borderColor: '#1a1a1a',
  },
  filterChipText: { 
    color: '#999', 
    fontWeight: '700', 
    fontSize: 12,
  },
  activeFilterChipText: { 
    color: '#f9c349',
  },
  
  // List
  listContainer: { 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: 40,
  },
  
  // Card
  card: { 
    flexDirection: 'row', 
    padding: 14, 
    borderRadius: 16, 
    marginBottom: 8, 
    alignItems: 'center', 
    borderWidth: 2,
  },
  unreadCard: { 
    backgroundColor: '#f9c34908', 
    borderColor: '#f9c34930',
  },
  readCard: { 
    backgroundColor: '#ffffff', 
    borderColor: '#f0f0f0',
  },
  iconBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
  },
  cardContent: { 
    flex: 1,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 2,
  },
  cardTitle: { 
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  unreadText: { 
    fontWeight: '800',
    color: '#1a1a1a',
  },
  cardTime: { 
    fontSize: 10, 
    color: '#999', 
    fontWeight: '600',
  },
  cardDesc: { 
    fontSize: 12, 
    color: '#666', 
    lineHeight: 17,
    fontWeight: '500',
  },
  rightActions: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginLeft: 8,
  },
  unreadIndicator: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#f9c349', 
    marginBottom: 8,
  },
  deleteBtn: { 
    padding: 4,
  },
  
  // Detail View
  detailWrapper: { 
    flex: 1, 
    backgroundColor: '#ffffff',
  },
  detailHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    backgroundColor: '#ffffff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
  },
  detailBack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#1a1a1a',
  },
  detailDeleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageScroll: { 
    paddingHorizontal: 16, 
    paddingTop: 20,
  },
  dateSeparator: { 
    alignSelf: 'center', 
    backgroundColor: '#f0f0f0', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginBottom: 16,
  },
  dateSeparatorText: { 
    fontSize: 10, 
    color: '#999', 
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chatBubble: { 
    backgroundColor: '#ffffff', 
    width: '100%', 
    borderRadius: 20, 
    borderWidth: 2,
    borderColor: '#f0f0f0',
    padding: 20,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bubbleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f9c34915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bubbleTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#1a1a1a',
    flex: 1,
  },
  bubbleBody: { 
    fontSize: 14, 
    color: '#666', 
    lineHeight: 22,
    fontWeight: '500',
  },
  bubbleFooter: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center', 
    marginTop: 12,
  },
  bubbleTime: { 
    fontSize: 11, 
    color: '#999', 
    fontWeight: '600',
  },
  
  // States
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 80,
  },
  emptyLabel: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1a1a1a', 
    marginTop: 12,
  },
  emptySubLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginTop: 4,
  },
});

export default NotificationModal;