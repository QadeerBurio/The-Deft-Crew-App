import React from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Svg, { Path } from "react-native-svg";
import { Octicons, MaterialCommunityIcons, MaterialIcons, Foundation } from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStack from "./HomeStack";
import Social from "../screens/Social/Social"; 
import CampusToolsScreen from "../screens/StudentDashboard";
import Explore from "../screens/Explore";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");

// Constants for the "Attractive Slim" look
const TAB_HEIGHT = 55; 

/**
 * TabBg: Handles the SVG curve and the bottom safe area background fill
 */
const TabBg = ({ color = "#FFFFFF", bottomInset = 0 }) => (
  <View style={[styles.svgContainer, { bottom: 0 }]}>
    <Svg 
      width={width} 
      height={TAB_HEIGHT + bottomInset + 10} 
      viewBox={`0 0 ${width} ${TAB_HEIGHT + bottomInset + 10}`} 
      fill="none"
    >
      <Path
        d={`M0 0 
           C${width * 0.27} 0 ${width * 0.32} 8 ${width * 0.38} 18 
           C${width * 0.43} 26 ${width * 0.46} 32 ${width * 0.5} 32 
           C${width * 0.54} 32 ${width * 0.57} 26 ${width * 0.62} 18 
           C${width * 0.68} 8 ${width * 0.73} 0 ${width} 0 
           V${TAB_HEIGHT + bottomInset + 10} 
           H0 
           Z`}
        fill={color}
      />
      <Path
        d={`M0 0 
           C${width * 0.27} 0 ${width * 0.32} 8 ${width * 0.38} 18 
           C${width * 0.43} 26 ${width * 0.46} 32 ${width * 0.5} 32 
           C${width * 0.54} 32 ${width * 0.57} 26 ${width * 0.62} 18 
           C${width * 0.68} 8 ${width * 0.73} 0 ${width} 0`}
        stroke="rgba(0,0,0,0.05)"
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  </View>
);

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
  
  // Hide bar on Social screen or specific nested stack screens
  if (focusedRoute?.name === "Social" || (nestedRouteName && hideTabBarScreens.includes(nestedRouteName))) {
    return null;
  }

  const handleSocialPress = () => {
    // Direct navigation to Social screen
    navigation.navigate("Social");
  };

  // Get the current index for each tab
  const homeIndex = state.routes.findIndex(route => route.name === "Home");
  const exploreIndex = state.routes.findIndex(route => route.name === "Explore");
  const campusIndex = state.routes.findIndex(route => route.name === "Campus");
  const profileIndex = state.routes.findIndex(route => route.name === "Profile");

  return (
    <View style={[styles.tabBarWrapper, { height: TAB_HEIGHT + insets.bottom + 10 }]}>
      {/* Background SVG extending into bottom inset */}
      <TabBg bottomInset={insets.bottom} />
      
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
            size={24} 
            color={state.index === homeIndex ? "#f9c349" : "#9AA0A6"} 
          />
        </TouchableOpacity>
        
        {/* Explore/Traveling Button */}
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => navigation.navigate("Explore")}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name="explore" 
            size={24} 
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
              size={30} 
              color={"#f9c349"} 
            />
          </View>
        </TouchableOpacity>
        
        {/* Campus/Tools Button */}
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => navigation.navigate("Campus")}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="school-outline" 
            size={24} 
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
            size={24} 
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
  svgContainer: {
    position: 'absolute',
    width: width,
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
    paddingHorizontal: 8,
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
  },
  centerButton: {
    position: 'absolute',
    top: -2,
    width: 55,
    height: 55,
    borderRadius: 30,
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
  },
});