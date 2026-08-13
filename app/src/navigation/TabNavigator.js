import React from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Octicons, MaterialCommunityIcons, MaterialIcons, Foundation } from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStack from "./HomeStack";
import Social from "../screens/Social/Social"; 
import CampusToolsScreen from "../screens/StudentDashboard";
import Explore from "../screens/Explore";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");

// Constants for the tab bar
const TAB_HEIGHT = 55; // Increased height for better proportions

/**
 * CustomTabBar: The main logic for handling Safe Area and button rendering
 */
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const focusedRoute = state.routes[state.index];
  
  // Helper to resolve nested route state recursively
  const getNestedRouteName = (route) => {
    if (!route.state) return null;
    const activeRoute = route.state.routes[route.state.index];
    if (activeRoute.state) {
      return getNestedRouteName(activeRoute);
    }
    return activeRoute.name;
  };

  const nestedRouteName = getNestedRouteName(focusedRoute);
  
  // Hide bottom tab bar on specific screens
  const hideTabBarScreens = ["ResumeView", "ResumeBuilder", "ResumeTemplate", "ResumeShare", "ResumeAnalytics", "ResumeSettings", "Brands"];
  
  if (focusedRoute?.name === "Social" || (nestedRouteName && hideTabBarScreens.includes(nestedRouteName))) {
    return null;
  }

  const handleSocialPress = () => {
    navigation.navigate("Social");
  };

  // Get the current index for each tab
  const homeIndex = state.routes.findIndex(route => route.name === "Home");
  const exploreIndex = state.routes.findIndex(route => route.name === "Explore");
  const campusIndex = state.routes.findIndex(route => route.name === "Campus");
  const profileIndex = state.routes.findIndex(route => route.name === "Profile");

  return (
    <View style={[styles.tabBarWrapper, { height: TAB_HEIGHT + insets.bottom + 10 }]}>
      {/* Rectangular Background */}
      <View style={[styles.tabBarBackground, { height: TAB_HEIGHT + insets.bottom + 10 }]} />
      
      {/* Container for the icons */}
      <View style={[styles.contentContainer, { paddingBottom: insets.bottom + 5 }]}>
        
        {/* Home Button */}
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => {
            navigation.navigate("Home", { screen: "HomeStackMain" });
          }}
          activeOpacity={0.7}
        >
          <Octicons 
            name="home" 
            size={26} 
            color={state.index === homeIndex ? "#f9c349" : "#9AA0A6"} 
          />
        </TouchableOpacity>
        
        {/* Explore Button */}
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => navigation.navigate("Explore")}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name="explore" 
            size={26} 
            color={state.index === exploreIndex ? "#f9c349" : "#9AA0A6"} 
          />
        </TouchableOpacity>
        
        {/* Center Social Button */}
        <TouchableOpacity 
          style={styles.centerButtonContainer}
          onPress={handleSocialPress}
          activeOpacity={0.9}
        >
          <View style={styles.centerButton}>
            <Foundation 
              name="social-skillshare" 
              size={32} 
              color={"#f9c349"} 
            />
          </View>
        </TouchableOpacity>
        
        {/* Campus Button */}
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => navigation.navigate("Campus")}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="school-outline" 
            size={26} 
            color={state.index === campusIndex ? "#f9c349" : "#9AA0A6"} 
          />
        </TouchableOpacity>
        
        {/* Profile Button */}
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="account-circle" 
            size={26} 
            color={state.index === profileIndex ? "#f9c349" : "#9AA0A6"} 
          />
        </TouchableOpacity>
        
      </View>
    </View>
  );
};

export default function TabNavigator() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ 
          headerShown: false, 
          tabBarShowLabel: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
          lazy: false,
        }}
        initialRouteName="Home"
        backBehavior="history"
      >
        <Tab.Screen 
          name="Home" 
          component={HomeStack}
          options={{
            unmountOnBlur: false,
          }}
        />
        <Tab.Screen name="Explore" component={Explore} />
        <Tab.Screen name="Social" component={Social} />
        <Tab.Screen name="Campus" component={CampusToolsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    width: width,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  tabBarBackground: {
    position: 'absolute',
    bottom: 0,
    width: width,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 20,
  },
  contentContainer: {
    flexDirection: 'row',
    height: TAB_HEIGHT,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 9,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: TAB_HEIGHT,
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_HEIGHT,
    marginTop: -5, // Adjust to center the button properly
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#f9c349',
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 10,
    marginTop: -15, // Pull the button up to center it
  },
});