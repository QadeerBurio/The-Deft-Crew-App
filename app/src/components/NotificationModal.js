import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, FlatList,
  Pressable, ActivityIndicator, Dimensions, ScrollView, RefreshControl, Alert,
  Animated, StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const NotificationModal = ({ visible, onClose }) => {
  const { token, user, setUnreadCount, updateUnreadCount } = useContext(AuthContext);
  const [filter, setFilter] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

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
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
      
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
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return past.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ✅ FIX: Filter notifications by user ID and type
  const fetchNotifications = async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const response = await axios.get('https://the-deft-crew-production.up.railway.app/api/notification/my-notifications',{
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // ✅ Filter notifications - only show current user's notifications
      let data = response.data;
      
      // Filter out notifications that don't belong to the current user
      data = data.filter(n => {
        // Check if notification has recipient field and it matches current user
        if (n.recipient && n.recipient._id) {
          return n.recipient._id === user._id || n.recipient === user._id;
        }
        // If recipient is stored as string ID
        if (typeof n.recipient === 'string') {
          return n.recipient === user._id;
        }
        return true; // Keep if no recipient filtering needed
      });

      // ✅ Map notifications and add time
      data = data.map(n => ({ 
        ...n, 
        time: getTimeAgo(n.createdAt),
        // Ensure proper icon based on type
        icon: getNotificationIcon(n.type)
      }));

      setNotifications(data);
      
      // Update unread count for current user
      const count = data.filter(n => !n.isRead).length;
      setUnreadCount(count);
      
    } catch (error) {
      console.error("Fetch Error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Helper function to get correct icon based on notification type
  const getNotificationIcon = (type) => {
    const iconMap = {
      'Offers': 'gift-outline',
      'Offer': 'gift-outline',
      'System': 'settings-outline',
      'Job Application': 'briefcase-outline',
      'Application Status': 'checkmark-circle-outline',
      'Interview': 'calendar-outline',
      'Job Posting': 'megaphone-outline',
      'Welcome': 'happy-outline',
      'Default': 'notifications-outline'
    };
    return iconMap[type] || iconMap['Default'];
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
    updateUnreadCount(token);
    onClose();
  };

  const handleOpenNotification = (item) => {
    setSelectedNotification(item);
    if (!item.isRead) markAsReadOnServer(item._id);
  };

  // ✅ Filter notifications based on selected filter
  const filteredData = notifications.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !n.isRead;
    // Map filter labels to notification types
    if (filter === 'Offers') return n.type === 'Offers' || n.type === 'Offer';
    if (filter === 'System') return n.type === 'System' || n.type === 'Application Status';
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Header Component
  const Header = () => (
    <Animated.View style={[styles.headerContainer, { opacity: headerFade }]}>
      <View style={styles.dragHandle} />
      
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleWrapper}>
            <LinearGradient
              colors={['#f9c349', '#e6b800']}
              style={styles.headerIconDot}
            />
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadCountBadge}>
                <Text style={styles.unreadCountText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={markAllRead} style={styles.headerActionBtn}>
              <Ionicons name="checkmark-done-outline" size={16} color="#f9c349" />
              <Text style={styles.actionTextGold}>Mark all read</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity onPress={clearAllNotifications} style={styles.headerActionBtn}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.actionTextRed}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#1a1a1a" />
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
            {filter === label && <View style={styles.filterChipIndicator} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  // Notification Card Component
  const NotificationCard = ({ item, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 400,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay: index * 50,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    // ✅ Get correct icon based on notification type
    const getIconName = () => {
      switch(item.type) {
        case 'Offers':
        case 'Offer':
          return 'gift-outline';
        case 'System':
          return 'settings-outline';
        case 'Application Status':
          return 'checkmark-circle-outline';
        case 'Job Application':
          return 'briefcase-outline';
        case 'Interview':
          return 'calendar-outline';
        default:
          return 'notifications-outline';
      }
    };

    return (
      <Animated.View style={{
        opacity: cardAnim,
        transform: [
          { scale: scaleAnim },
          { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }
        ],
      }}>
        <TouchableOpacity
          style={[styles.card, !item.isRead ? styles.unreadCard : styles.readCard]}
          onPress={() => handleOpenNotification(item)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={!item.isRead ? ['#f9c34915', '#f9c34908'] : ['#f8f8f8', '#f8f8f8']}
            style={styles.iconBox}
          >
            <Ionicons 
              name={getIconName()} 
              size={22} 
              color={!item.isRead ? '#f9c349' : '#999'} 
            />
          </LinearGradient>
          
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
  const MessageDetail = () => {
    const detailFade = useRef(new Animated.Value(0)).current;
    const detailSlide = useRef(new Animated.Value(20)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(detailFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(detailSlide, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    // ✅ Get correct icon for detail view
    const getIconName = () => {
      switch(selectedNotification?.type) {
        case 'Offers':
        case 'Offer':
          return 'gift-outline';
        case 'System':
          return 'settings-outline';
        case 'Application Status':
          return 'checkmark-circle-outline';
        case 'Job Application':
          return 'briefcase-outline';
        case 'Interview':
          return 'calendar-outline';
        default:
          return 'notifications-outline';
      }
    };

    return (
      <Animated.View style={[styles.detailWrapper, { opacity: detailFade, transform: [{ translateY: detailSlide }] }]}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.detailBack} onPress={() => setSelectedNotification(null)}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle}>Details</Text>
          <TouchableOpacity 
            style={styles.detailDeleteBtn}
            onPress={() => deleteNotification(selectedNotification._id)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.messageScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.detailDateBadge}>
            <Text style={styles.detailDateText}>
              {selectedNotification.time.toUpperCase()}
            </Text>
          </View>

          <View style={styles.detailCard}>
            <LinearGradient
              colors={['#f9c34915', '#f9c34908']}
              style={styles.detailIconWrapper}
            >
              <Ionicons name={getIconName()} size={32} color="#f9c349" />
            </LinearGradient>
            
            <Text style={styles.detailTitle}>{selectedNotification.title}</Text>
            
            <View style={styles.detailDivider} />
            
            <Text style={styles.detailBody}>{selectedNotification.description}</Text>
            
            <View style={styles.detailFooter}>
              <View style={styles.detailTimeRow}>
                <Ionicons name="time-outline" size={16} color="#999" />
                <Text style={styles.detailTime}>
                  {new Date(selectedNotification.createdAt).toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              <View style={styles.detailStatusRow}>
                <Ionicons 
                  name={selectedNotification.isRead ? 'checkmark-circle' : 'time-outline'} 
                  size={16} 
                  color={selectedNotification.isRead ? '#4CAF50' : '#f9c349'} 
                />
                <Text style={[styles.detailStatus, { color: selectedNotification.isRead ? '#4CAF50' : '#f9c349' }]}>
                  {selectedNotification.isRead ? 'Read' : 'Unread'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
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
                  <Text style={styles.loaderText}>Loading notifications...</Text>
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
                      <View style={styles.emptyIconWrapper}>
                        <LinearGradient
                          colors={['#f9c34915', '#f9c34908']}
                          style={styles.emptyIcon}
                        >
                          <Ionicons name="notifications-off-outline" size={60} color="#f9c349" />
                        </LinearGradient>
                      </View>
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
    height: SCREEN_HEIGHT * 0.92,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
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
    width: 40, 
    height: 4, 
    backgroundColor: '#e0e0e0', 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerIconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  unreadCountBadge: {
    backgroundColor: '#f9c349',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 10,
  },
  unreadCountText: {
    color: '#1a1a1a',
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 2,
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
    fontSize: 12,
  },
  actionTextRed: { 
    color: "#EF4444", 
    fontWeight: "700", 
    fontSize: 12,
  },
  actionDivider: { 
    marginHorizontal: 8, 
    color: '#ddd',
    fontSize: 14,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  
  // Filters
  filterScroll: { 
    flexDirection: 'row',
    marginTop: 2,
  },
  filterChip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 12, 
    backgroundColor: '#f8f8f8', 
    marginRight: 10, 
    borderWidth: 1.5, 
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  activeFilterChip: { 
    backgroundColor: '#1a1a1a', 
    borderColor: '#1a1a1a',
  },
  filterChipText: { 
    color: '#999', 
    fontWeight: '600', 
    fontSize: 12,
  },
  activeFilterChipText: { 
    color: '#f9c349',
  },
  filterChipIndicator: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#f9c349',
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
    marginBottom: 10, 
    alignItems: 'center', 
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  unreadCard: { 
    backgroundColor: '#f9c34906', 
    borderColor: '#f9c34925',
  },
  readCard: { 
    backgroundColor: '#ffffff', 
    borderColor: '#f0f0f0',
  },
  iconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14,
  },
  cardContent: { 
    flex: 1,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 3,
  },
  cardTitle: { 
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  unreadText: { 
    fontWeight: '700',
  },
  cardTime: { 
    fontSize: 10, 
    color: '#999', 
    fontWeight: '500',
  },
  cardDesc: { 
    fontSize: 12, 
    color: '#666', 
    lineHeight: 17,
    fontWeight: '400',
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
    padding: 6,
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
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    backgroundColor: '#ffffff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
  },
  detailBack: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  detailHeaderTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1a1a1a',
  },
  detailDeleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff475730',
  },
  messageScroll: { 
    paddingHorizontal: 20, 
    paddingTop: 20,
    paddingBottom: 40,
  },
  detailDateBadge: { 
    alignSelf: 'center', 
    backgroundColor: '#f0f0f0', 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 10, 
    marginBottom: 20,
  },
  detailDateText: { 
    fontSize: 11, 
    color: '#999', 
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  detailDivider: {
    width: 40,
    height: 2,
    backgroundColor: '#f9c349',
    borderRadius: 1,
    marginBottom: 16,
  },
  detailBody: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  detailFooter: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // States
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 100,
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
  emptyLabel: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1a1a1a', 
    marginTop: 4,
  },
  emptySubLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '400',
    marginTop: 4,
  },
});

export default NotificationModal;