import React, { useRef, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, View, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import FeedScreen from "./FeedScreen";
import CreatePostScreen from "./CreatePostScreen";
import ConfessionScreen from "./ConfessionScreen";
import MessagesScreen from "./MessageScreen";
import ProfileScreen from "./ProfileScreen";

const Tab = createBottomTabNavigator();

// Custom Tab Bar Button for Create with active state
const CustomTabBarButton = ({ children, onPress, focused }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.loop(
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
        ])
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [focused]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.customTabBarButton}
    >
      <Animated.View style={[
        styles.createButtonGradient, 
        { 
          transform: [{ scale: scaleAnim }],
          shadowColor: focused ? "#f9c349" : "#000",
          shadowOpacity: focused ? 0.6 : 0.4,
        }
      ]}>
        <LinearGradient
          colors={focused ? ['#f9c349', '#f9c349'] : ['#1a1a1a', '#1a1a1a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.createButtonGradientInner}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons 
              name={focused ? "close" : "add"} 
              size={28} 
              color={focused ? "#1a1a1a" : "#f9c349"} 
            />
          </Animated.View>
        </LinearGradient>
      </Animated.View>
      {focused && (
        <Animated.View style={[styles.activeIndicator, { opacity: scaleAnim }]}>
          <LinearGradient
            colors={['#f9c349', '#f9c349']}
            style={styles.activeIndicatorGradient}
          />
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

export default function Social() {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName="Feed"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#1a1a1a",
          tabBarInactiveTintColor: "#999",
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarShowLabel: true,
        }}
      >
        <Tab.Screen
          name="Feed"
          component={FeedScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons 
                  name={focused ? "home" : "home-outline"} 
                  size={22} 
                  color={focused ? "#f9c349" : "#999"} 
                />
                
              </View>
            ),
            tabBarLabel: "Home",
          }}
        />

        <Tab.Screen
          name="Confessions"
          component={ConfessionScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons 
                  name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} 
                  size={22} 
                  color={focused ? "#f9c349" : "#999"} 
                />
               
              </View>
            ),
            tabBarLabel: "Confessions",
          }}
        />

        <Tab.Screen
          name="Create"
          component={CreatePostScreen}
          options={({ route }) => ({
            tabBarButton: (props) => <CustomTabBarButton {...props} />,
            tabBarLabel: "",
            unmountOnBlur: true,
          })}
        />

        <Tab.Screen
          name="MessagesScreen"
          component={MessagesScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons 
                  name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                  size={22} 
                  color={focused ? "#f9c349" : "#999"} 
                />
                
              </View>
            ),
            tabBarLabel: "Messages",
          }}
        />

        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            unmountOnBlur: true,
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconContainer}>
                <Ionicons 
                  name={focused ? "person" : "person-outline"} 
                  size={22} 
                  color={focused ? "#f9c349" : "#999"} 
                />
                
              </View>
            ),
            tabBarLabel: "Profile",
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  // Tab Bar
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingHorizontal: 10,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  
  // Tab Icon
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#f9c349',
    position: 'absolute',
    bottom: -8,
  },

  // Custom Create Button
  customTabBarButton: {
    top: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  createButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 10,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 15,
  },
  
  createButtonGradientInner: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },

  // Active Indicator below Create button
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 30,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  
  activeIndicatorGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
});