import React from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Svg, { Path } from "react-native-svg";
import { Octicons, MaterialCommunityIcons, MaterialIcons, Ionicons, Foundation } from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStack from "./HomeStack";
import Social from "../screens/Social/Social"; 
import CampusToolsScreen from "../screens/Courses/Courses";
import Traveling from "../components/TravellingScreen";
import CareerHub from "../components/CareerHub";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");

// Constants for the "Attractive Slim" look
const TAB_HEIGHT = 60; 

/**
 * TabBg: Handles the SVG curve and the bottom safe area background fill
 */
const TabBg = ({ color = "#FFFFFF", bottomInset = 0 }) => (
  <View style={[styles.svgContainer, { bottom: 0 }]}>
    <Svg 
      width={width} 
      height={TAB_HEIGHT + bottomInset} 
      viewBox={`0 0 ${width} ${TAB_HEIGHT + bottomInset}`} 
      fill="none"
    >
      <Path
        // This path creates the "dip" and then extends down to fill the safe area inset
        d={`M0 0 H${width * 0.38} 
           C${width * 0.43} 0 ${width * 0.45} 28 ${width * 0.5} 28 
           S${width * 0.57} 0 ${width * 0.62} 0 
           H${width} 
           V${TAB_HEIGHT + bottomInset} 
           H0 
           Z`}
        fill={color}
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
  
  // Hide bar on Social screen
  if (focusedRoute.name === "Social") return null;

  return (
    <View style={[styles.tabBarWrapper, { height: TAB_HEIGHT + insets.bottom }]}>
      {/* Background SVG extending into bottom inset */}
      <TabBg bottomInset={insets.bottom} />
      
      {/* Container for the icons */}
      <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ 
              type: 'tabPress', 
              target: route.key, 
              canPreventDefault: true 
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Special rendering for the center "Social" button
          if (route.name === "Social") {
            return (
              <TouchableOpacity 
                key={index} 
                onPress={onPress} 
                style={styles.centerButtonContainer} 
                activeOpacity={0.9}
              >
                <View style={styles.centerButton}>
                  <Foundation name="social-skillshare" size={26} color={isFocused ? "#1e3a8a" : "#9aa0a6"} />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity 
              key={index} 
              onPress={onPress} 
              style={styles.tabItem}
            >
              {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused }) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function HomeTabs() {
  return (
    <SafeAreaProvider>
      {/* Ensure Status Bar is visible and handled correctly */}
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ 
          headerShown: false, 
          tabBarShowLabel: false,
          // contentStyle ensures top-safe padding is managed by the screens
          contentStyle: { backgroundColor: '#FFFFFF' }
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeStack} 
          options={{ 
            tabBarIcon: ({ focused }) => (
              <Octicons name="home" size={26} color={focused ? "#1e3a8a" : "#9aa0a6"} />
            ) 
          }} 
        />
        
        <Tab.Screen 
          name="Traveling" 
          component={Traveling} 
          options={{ 
            tabBarIcon: ({ focused }) => (
              <MaterialIcons name="travel-explore" size={26} color={focused ? "#1e3a8a" : "#9aa0a6"} />
            ) 
          }} 
        />
        
        <Tab.Screen 
          name="Social" 
          component={Social} 
          options={{ tabBarStyle: { display: 'none' } }} 
        />
        
        <Tab.Screen 
          name="Campus" 
          component={CampusToolsScreen} 
          options={{ 
            tabBarIcon: ({ focused }) => (
              <Ionicons name="apps-outline" size={26} color={focused ? "#1e3a8a" : "#9aa0a6"} />
            ) 
          }} 
        />
        
        <Tab.Screen 
          name="CareerHub" 
          component={CareerHub} 
          options={{ 
            tabBarIcon: ({ focused }) => (
              <MaterialCommunityIcons name="briefcase-outline" size={26} color={focused ? "#1e3a8a" : "#9aa0a6"} />
            ) 
          }} 
        />
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
  },
  svgContainer: {
    position: 'absolute',
    width: width,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 15, // High elevation for Android shadow
  },
  contentContainer: {
    flexDirection: 'row',
    height: TAB_HEIGHT,
    backgroundColor: 'transparent',
    alignItems: 'center',
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
    top: -24, // Sits perfectly within the SVG curve
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#F8F8F8',
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
});