// Social.js (Tab Navigator) - WITH CENTER CREATE BUTTON
import React, { useRef, useEffect, useState, useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, View, StyleSheet, Animated, TouchableOpacity, Dimensions, Text, StatusBar, Alert } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";

import FeedScreen from "./FeedScreen";
import SearchScreen from "./SearchScreen";
import MessagesScreen from "./MessageScreen";
import ProfileScreen from "./ProfileScreen";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');
const API_URL = "https://the-deft-crew-production.up.railway.app/api/social";

// ============ MODERN TAB BAR BUTTON ============
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

// ============ TAB ICON ============
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

// ============ PROFILE ICON ============
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

// ============ CENTER CREATE BUTTON ============
const CreateButton = ({ onPress, navigation, isGuest }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.85,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    // Animate rotation on press
    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (isGuest) {
      Alert.alert(
        'Create an Account',
        'Sign up to create a post!',
        [
          { text: 'Not Now', style: 'cancel' },
          { 
            text: 'Sign Up', 
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
      return;
    }
    
    navigation.navigate('CreatePostScreen');
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.createButtonWrapper}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.createButtonTouchable}
      >
        <Animated.View style={[
          styles.createButtonContainer,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          <LinearGradient
            colors={['#f9c349', '#e6b800']}
            style={styles.createButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Ionicons name="add" size={32} color="#1a1a1a" />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

// ============ CUSTOM TAB BAR ============
function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { isGuest } = useContext(AuthContext);
  
  // Define the order of tabs with the create button in the middle
  // Order: Feed (0), Search (1), CREATE (center), Messages (2), Profile (3)
  const tabOrder = ['Feed', 'Search', 'CREATE', 'Messages', 'Profile'];
  
  const renderTabButton = (routeName) => {
    const route = state.routes.find(r => r.name === routeName);
    if (!route) return null;
    
    const { options } = descriptors[route.key];
    const isFocused = state.index === state.routes.findIndex(r => r.name === routeName);

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
  };

  return (
    <View style={[
      styles.tabBarContainer,
      { 
        paddingBottom: Platform.OS === 'ios' ? insets.bottom || 8 : 8,
        height: Platform.OS === 'ios' ? 65 + (insets.bottom || 0) : 62,
      }
    ]}>
      <View style={styles.tabBarInner}>
        {/* Feed */}
        {renderTabButton('Feed')}
        
        {/* Search */}
        {renderTabButton('Search')}
        
        {/* Center Create Button */}
        <CreateButton 
          navigation={navigation} 
          isGuest={isGuest}
        />
        
        {/* Messages */}
        {renderTabButton('Messages')}
        
        {/* Profile */}
        {renderTabButton('Profile')}
      </View>
    </View>
  );
}

// ============ MAIN SOCIAL COMPONENT ============
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
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
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

  // Tab Bar Container
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
    paddingHorizontal: 4,
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

  // ============ CENTER CREATE BUTTON STYLES ============
  createButtonWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingVertical: 4,
  },

  createButtonTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  createButtonContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    // Elevation for the button to pop out
    shadowColor: '#f9c349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    // Lift it above the tab bar
    marginTop: -20,
    borderWidth: 3,
    borderColor: '#ffffff',
  },

  createButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});