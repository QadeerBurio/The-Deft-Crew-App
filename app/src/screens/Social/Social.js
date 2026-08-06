// Social.js (Tab Navigator)
import React, { useRef, useEffect, useState, useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, View, StyleSheet, Animated, TouchableOpacity, Dimensions, Text, StatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";

import FeedScreen from "./FeedScreen";
import SearchScreen from "./SearchScreen";
import MessagesScreen from "./MessageScreen";
import ProfileScreen from "./ProfileScreen";
import GuestGuard from "../../components/GuestGuard";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

// Modern Tab Bar Button with enhanced animation
const ModernTabBarButton = ({ children, onPress, focused }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: -3,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.05 : 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.1],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
      style={styles.tabButtonWrapper}
    >
      <Animated.View style={[
        styles.tabButtonContainer,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: translateY }
          ],
        }
      ]}>
        <Animated.View style={[
          styles.pulseEffect,
          { opacity: pulseOpacity }
        ]} />
        {children}
        {focused && (
          <Animated.View style={[styles.activeIndicator, {
            transform: [{ scaleX: scaleAnim }]
          }]} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Modern Tab Icon Component
const TabIcon = ({ name, focused, badge }) => {
  const iconNames = {
    home: focused ? "home" : "home-outline",
    search: focused ? "search" : "search-outline",
    chatbubbles: focused ? "chatbubbles" : "chatbubbles-outline",
  };

  return (
    <View style={styles.iconWrapper}>
      <Ionicons 
        name={iconNames[name] || name} 
        size={24} 
        color={focused ? "#f9c349" : "#8e8e8e"} 
      />
      {badge > 0 && (
        <View style={styles.badge}>
          <LinearGradient
            colors={['#f9c349', '#f9c349']}
            style={styles.badgeGradient}
          >
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

// Profile Icon with Instagram-style border
const ProfileIcon = ({ focused }) => {
  return (
    <View style={styles.profileIconWrapper}>
      {focused && (
        <View style={styles.profileBorder} />
      )}
      <View style={styles.profileImageContainer}>
        <Ionicons 
          name={focused ? "person" : "person-outline"} 
          size={20} 
          color={focused ? "#f9c349" : "#8e8e8e"} 
        />
      </View>
    </View>
  );
};

// Custom Tab Bar Component with SafeAreaView
function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[
      styles.tabBarContainer,
      { 
        paddingBottom: Platform.OS === 'ios' ? insets.bottom || 8 : 8,
        height: Platform.OS === 'ios' ? 60 + (insets.bottom || 0) : 55,
      }
    ]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <ModernTabBarButton
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              focused={isFocused}
            >
              {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused }) : null}
              {options.tabBarLabel && (
                <Text style={[
                  styles.tabBarLabel,
                  { color: isFocused ? '#f9c349' : '#8e8e8e' }
                ]}>
                  {typeof options.tabBarLabel === 'function' 
                    ? options.tabBarLabel({ focused: isFocused }) 
                    : options.tabBarLabel}
                </Text>
              )}
            </ModernTabBarButton>
          );
        })}
      </View>
    </View>
  );
}

export default function Social() {
  const { token, user } = useContext(AuthContext);
  const [totalUnread, setTotalUnread] = useState(0);
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get(`${API_URL}/inbox`, config);
      if (res.data && Array.isArray(res.data)) {
        const unread = res.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setTotalUnread(unread);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container} >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.content}>
        <Tab.Navigator
          initialRouteName="Feed"
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#f9c349",
            tabBarInactiveTintColor: "#8e8e8e",
          }}
        >
          <Tab.Screen
            name="Feed"
            component={FeedScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="home" focused={focused} />
              ),
              tabBarLabel: "Home",
            }}
          />

          <Tab.Screen
            name="Search"
            component={SearchScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="search" focused={focused} />
              ),
              tabBarLabel: "Search",
            }}
          />

          <Tab.Screen
            name="Messages"
            component={MessagesScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="chatbubbles" focused={focused} badge={totalUnread} />
              ),
              tabBarLabel: "Messages",
            }}
          />

          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              unmountOnBlur: true,
              tabBarIcon: ({ focused }) => (
                <ProfileIcon focused={focused} />
              ),
              tabBarLabel: "Profile",
            }}
          />
        </Tab.Navigator>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Tab Bar Container - Reduced Height
  tabBarContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  
  tabBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },

  // Modern Tab Button
  tabButtonWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  
  tabButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 12,
    position: 'relative',
    minWidth: 45,
  },
  
  pulseEffect: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 50,
    backgroundColor: '#f9c349',
  },
  
  // Icon Container
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  tabBarLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  
  // Badge
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  
  badgeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  
  // Active Indicator
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 16,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#f9c349',
  },
  
  // Profile Icon
  profileIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  profileBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#f9c349',
  },
  
  profileImageContainer: {
    width: 24,
    height: 24,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});