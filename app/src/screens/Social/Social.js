// Social.js (Tab Navigator) - WITH CENTER CREATE BUTTON
import React, { useRef, useEffect, useState, useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, View, StyleSheet, Animated, TouchableOpacity, Dimensions, Text, StatusBar, Alert } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "../../ui/FlatGradient"; // flat fills (design system)
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
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
const ModernTabBarButton = ({ children, onPress, onLongPress, focused, label }) => {
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
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
      style={styles.tabButtonWrapper}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!focused }}
      accessibilityLabel={label}
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
        size={23} 
        color={focused ? T.yellow : T.onInkMuted} 
      />
      {badge > 0 && (
        <View style={styles.badge}>
          <LinearGradient
            colors={[T.yellow]}
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
          color={focused ? T.yellow : T.onInkMuted} 
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
        accessibilityRole="button"
        accessibilityLabel="create post"
      >
        <Animated.View style={[
          styles.createButtonContainer,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          <LinearGradient colors={[T.yellow]} style={styles.createButtonGradient}>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Ionicons name="add" size={28} color={T.ink} />
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
    const labelText = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name;
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
        label={labelText}
      >
        {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused }) : null}
        {options.tabBarLabel && (
          <Text
            style={[
              styles.tabBarLabel,
              { color: isFocused ? T.yellow : T.onInkMuted }
            ]}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
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
      <StatusBar barStyle="dark-content" backgroundColor={T.paper} />
      <View style={styles.content}>
        <Tab.Navigator
          initialRouteName="Feed"
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: T.yellow,
            tabBarInactiveTintColor: T.onInkMuted,
          }}
        >
          <Tab.Screen
            name="Feed"
            component={FeedScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="home" focused={focused} />
              ),
              tabBarLabel: "feed",
            }}
          />

          <Tab.Screen
            name="Search"
            component={SearchScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="search" focused={focused} />
              ),
              tabBarLabel: "search",
            }}
          />

          <Tab.Screen
            name="Messages"
            component={MessagesScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="chatbubbles" focused={focused} badge={totalUnread} />
              ),
              tabBarLabel: "messages",
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
              tabBarLabel: "profile",
            }}
          />
        </Tab.Navigator>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  content: { flex: 1, backgroundColor: T.paper },

  // Inner tab bar (dark, Social design)
  tabBarContainer: {
    backgroundColor: T.ink,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  tabButtonWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    minHeight: 44,
    paddingVertical: 4,
  },
  tabButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    position: 'relative',
    minWidth: 45,
  },
  pulseEffect: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent' },
  iconWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  tabBarLabel: { fontFamily: F.bodySemi, fontSize: 10.5, marginTop: 3 },

  // Unread badge
  badge: {
    position: 'absolute',
    top: -7,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: T.ink,
  },
  badgeGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontFamily: F.bodyBold, fontSize: 9.5, color: T.ink },

  activeIndicator: {
    position: 'absolute',
    bottom: -7,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: T.yellow,
  },

  profileIconWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  profileBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: T.yellow,
  },
  profileImageContainer: {
    width: 24,
    height: 24,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  // Center create button (yellow, the action)
  createButtonWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  createButtonTouchable: { alignItems: 'center', justifyContent: 'center' },
  createButtonContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    marginTop: -4,
  },
  createButtonGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
});
