// BlockedUsersScreen.js - Complete with Proper Unblock Functionality

import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

// Skeleton Loader for Blocked Users
const BlockedUsersSkeleton = () => {
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
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonItem}>
          <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
          <View style={styles.skeletonContent}>
            <Animated.View style={[styles.skeletonLine, { width: '60%', height: 14, opacity }]} />
            <Animated.View style={[styles.skeletonLine, { width: '40%', height: 10, marginTop: 6, opacity }]} />
          </View>
          <Animated.View style={[styles.skeletonButton, { opacity }]} />
        </View>
      ))}
    </View>
  );
};

// Animated Blocked User Item
const BlockedUserItem = React.memo(({ item, index, onUnblock, onNavigate, unblockingId }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isUnblocking = unblockingId === item._id;

  return (
    <Animated.View 
      style={[
        styles.userItemWrapper,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { translateX: slideAnim }
          ]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => onNavigate(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={['#f9c349', '#e6b800']}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
            </LinearGradient>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.headline && (
              <Text style={styles.userHeadline} numberOfLines={1}>
                {item.headline}
              </Text>
            )}
            <View style={styles.blockedDateContainer}>
              <Ionicons name="time-outline" size={12} color="#999" />
              <Text style={styles.blockedDate}>
                Blocked on {new Date(item.blockedAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric' 
                })}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.unblockButton, isUnblocking && styles.unblockButtonLoading]}
          onPress={() => onUnblock(item._id, item.name)}
          disabled={isUnblocking}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color="#f9c349" />
          ) : (
            <Text style={styles.unblockButtonText}>Unblock</Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function BlockedUsersScreen() {
  const { token } = useContext(AuthContext);
  const navigation = useNavigation();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fetch blocked users when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchBlockedUsers();
      return () => {};
    }, [])
  );

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/user/blocked`, config);
      setBlockedUsers(res.data.blockedUsers || []);
    } catch (err) {
      console.error('Fetch blocked users error:', err);
      Alert.alert('Error', 'Failed to load blocked users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUnblock = (userId, userName) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${userName}? They will be able to interact with you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => unblockUser(userId),
          style: 'default'
        }
      ]
    );
  };

  const unblockUser = async (userId) => {
    setUnblockingId(userId);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/user/unblock/${userId}`, {}, config);
      
      // IMPORTANT: Remove from list immediately
      setBlockedUsers(prev => prev.filter(user => user._id !== userId));
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert('Success', 'User unblocked successfully');
    } catch (err) {
      console.error('Unblock error:', err);
      Alert.alert('Error', 'Failed to unblock user. Please try again.');
    } finally {
      setUnblockingId(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    fetchBlockedUsers();
  };

  const navigateToProfile = (userId) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('UserProfile', { userId });
  };

  const handleClearAll = () => {
    if (blockedUsers.length === 0) return;
    
    Alert.alert(
      'Clear All',
      'Are you sure you want to unblock all users?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock All',
          style: 'destructive',
          onPress: async () => {
            try {
              const config = { headers: { Authorization: `Bearer ${token}` } };
              // Create a copy of current blocked users
              const usersToUnblock = [...blockedUsers];
              
              // Unblock each user
              for (const user of usersToUnblock) {
                await axios.post(`${API_URL}/user/unblock/${user._id}`, {}, config);
              }
              
              // Clear all from state
              setBlockedUsers([]);
              Alert.alert('Success', 'All users unblocked successfully');
            } catch (err) {
              console.error('Clear all error:', err);
              Alert.alert('Error', 'Failed to unblock all users. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Render Clear All button in header
  const renderClearAllButton = () => {
    if (blockedUsers.length === 0) return null;
    
    return (
      <TouchableOpacity 
        onPress={handleClearAll}
        style={styles.headerAction}
      >
        <Text style={styles.headerActionText}>Clear All</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <View style={{ width: 40 }} />
        </View>
        <BlockedUsersSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff22" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        {renderClearAllButton()}
      </View>

      {/* Content */}
      {blockedUsers.length === 0 ? (
        <Animated.View style={[
          styles.emptyContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.emptyIconWrapper}>
            <LinearGradient
              colors={['rgba(249,195,73,0.1)', 'rgba(249,195,73,0.05)']}
              style={styles.emptyIcon}
            >
              <Ionicons name="ban-outline" size={60} color="#f9c349" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No Blocked Users</Text>
          <Text style={styles.emptySubtext}>
            Users you block will appear here. You can unblock them at any time.
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <BlockedUserItem
              item={item}
              index={index}
              onUnblock={handleUnblock}
              onNavigate={navigateToProfile}
              unblockingId={unblockingId}
            />
          )}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#f9c349"
              colors={["#f9c349"]}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.listHeaderLeft}>
                <Ionicons name="people-outline" size={16} color="#999" />
                <Text style={styles.listHeaderText}>
                  {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'} blocked
                </Text>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fc',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f6f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  headerAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fef9f0',
    borderWidth: 1,
    borderColor: '#f9c349',
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f9c349',
  },
  headerActionTextDisabled: {
    color: '#ccc',
  },

  // Skeleton
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8ecf0',
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonLine: {
    backgroundColor: '#e8ecf0',
    borderRadius: 4,
  },
  skeletonButton: {
    width: 80,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8ecf0',
  },

  // List
  listContent: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listHeaderText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  userItemWrapper: {
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f5f5f5',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  userHeadline: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },
  blockedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  blockedDate: {
    fontSize: 11,
    color: '#999',
    fontWeight: '400',
  },
  unblockButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#f9c349',
    backgroundColor: '#fff',
  },
  unblockButtonLoading: {
    opacity: 0.6,
  },
  unblockButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f9c349',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});