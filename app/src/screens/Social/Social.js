import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import FeedScreen from "./FeedScreen";
import CreatePostScreen from "./CreatePostScreen";
import ConfessionScreen from "./ConfessionScreen";
import MessagesScreen from "./MessageScreen";
import ProfileScreen from "./ProfileScreen";

import Icon from "react-native-vector-icons/Ionicons";

const Tab = createBottomTabNavigator();

export default function Social() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA', paddingBottom:10 }} edges={['top', 'left', 'right']}>
       <Tab.Navigator 
      // 1. Set Feed as the default starting point
      initialRouteName="Feed" 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: "#6C63FF",
        tabBarInactiveTintColor: "#AAA",
        tabBarStyle: {
          backgroundColor: "#FFF",
          borderTopWidth: 1,
          borderTopColor: "#F0F0F0",
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        }
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? "home" : "home-outline"} size={24} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="Create"
        component={CreatePostScreen}
        options={{
          // 2. unmountOnBlur: This ensures that if you leave the 'Create' tab, 
          // the next time you click it, it starts fresh.
          unmountOnBlur: true, 
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? "add-circle" : "add-circle-outline"} size={28} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="Confessions"
        component={ConfessionScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? "chatbox-ellipses" : "chatbox-ellipses-outline"} size={24} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="MessagesScreen"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? "mail" : "mail-outline"} size={24} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          // 3. This forces the Profile screen to reload when you switch away 
          // and switch back, keeping the app feeling "fresh".
          unmountOnBlur: true, 
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? "person" : "person-outline"} size={24} color={color} />
          )
        }}
      />
    </Tab.Navigator>
    </SafeAreaView>
   
  );
}