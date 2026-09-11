import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import NotificationModal from './NotificationModal';  // ✅ FIXED: Use default import (no braces)

const { width } = Dimensions.get('window');

const CustomHeader = ({ title, showNotification = true }) => {
  const { user, isGuest } = useContext(AuthContext);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.leftSection}>
          {user?.profilePicture ? (
            <Image 
              source={{ uri: user.profilePicture }} 
              style={styles.profilePic}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
          )}
          <View style={styles.textSection}>
            <Text style={styles.greeting}>
              {isGuest ? 'Welcome' : `Welcome back, ${user?.fullName?.split(' ')[0] || 'User'}`}
            </Text>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          {showNotification && !isGuest && (
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => setNotificationVisible(true)}
            >
              <Ionicons name="notifications-outline" size={24} color="#1a1a1a" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ✅ FIXED: NotificationModal is now correctly imported and rendered */}
      <NotificationModal 
        visible={notificationVisible}
        onClose={() => setNotificationVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: Platform.OS === 'android' ? 10 : 0,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  profilePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textSection: {
    justifyContent: 'center',
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#f9c349',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});

export default CustomHeader;