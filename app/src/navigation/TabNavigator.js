// app/src/navigation/TabNavigator.js
import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Octicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Foundation,
} from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStack from "./HomeStack";
import Social from "../screens/Social/Social";
import CampusToolsScreen from "../screens/StudentDashboard";
import Explore from "../screens/Explore";
import ProfileScreen from "../screens/ProfileScreen";

// 🆕 tour
import { useTour } from "../engagement/tour/TourProvider";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");
const TAB_HEIGHT = 55;

// ============================================================
// EXPORTED — screens that hide BOTH tab bar AND TDC header
// ============================================================
export const HIDE_TAB_BAR_SCREENS = [
  "Resume",
  "ResumeDashboard",
  "ResumeBuilder",
  "ResumeTemplate",
  "ResumeShare",
  "ResumeAnalytics",
  "ResumeSettings",
  "ResumeView",
  "Brands",
  "OfferScreen",
  "BrandOffers",
  "ChatHistory",
  "EditProfileScreen",
  "Booking",
  "Payment",
];

// ============================================================
// EXPORTED — recursive helper to find deepest active route
// ============================================================
export const getDeepestRouteName = (route) => {
  if (!route) return null;
  if (route.state && route.state.routes && route.state.routes.length > 0) {
    const index = route.state.index ?? route.state.routes.length - 1;
    const activeChild = route.state.routes[index];
    const deepest = getDeepestRouteName(activeChild);
    return deepest || activeChild?.name || route.name;
  }
  return route.name;
};

// ============================================================
// CustomTabBar
// ⚠️ Rules of Hooks: ALL hooks must come BEFORE any early return.
// ============================================================
const CustomTabBar = ({ state, descriptors, navigation }) => {
  // --- Hooks: always in the same order ---
  const insets = useSafeAreaInsets();
  const { registerTarget } = useTour();

  // ✅ Use native View refs (not TouchableOpacity refs) — these reliably
  //    support measureInWindow on Android + iOS.
  const homeRef = useRef(null);
  const exploreRef = useRef(null);
  const campusRef = useRef(null);
  const socialRef = useRef(null);

  // Register targets once mounted
  useEffect(() => {
    const t = setTimeout(() => {
      if (homeRef.current) registerTarget("tab_home", homeRef.current);
      if (exploreRef.current) registerTarget("tab_explore", exploreRef.current);
      if (campusRef.current) registerTarget("tab_campus", campusRef.current);
      if (socialRef.current) registerTarget("tab_social", socialRef.current);
    }, 100);
    return () => clearTimeout(t);
  }, [registerTarget]);

  // --- Derived values (no hooks below this line) ---
  const focusedRoute = state.routes[state.index];
  const deepestRouteName = getDeepestRouteName(focusedRoute);

  const shouldHideTabBar =
    focusedRoute?.name === "Social" ||
    (deepestRouteName && HIDE_TAB_BAR_SCREENS.includes(deepestRouteName));

  if (shouldHideTabBar) {
    return null;
  }

  const handleSocialPress = () => {
    navigation.navigate("Social");
  };

  const homeIndex = state.routes.findIndex((r) => r.name === "Home");
  const exploreIndex = state.routes.findIndex((r) => r.name === "Explore");
  const campusIndex = state.routes.findIndex((r) => r.name === "Campus");
  const profileIndex = state.routes.findIndex((r) => r.name === "Profile");

  return (
    <View
      style={[
        styles.tabBarWrapper,
        { height: TAB_HEIGHT + insets.bottom + 10 },
      ]}
    >
      <View
        style={[
          styles.tabBarBackground,
          { height: TAB_HEIGHT + insets.bottom + 10 },
        ]}
      />
      <View
        style={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 5 },
        ]}
      >
        {/* ─── Home tab ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() =>
            navigation.navigate("Home", { screen: "HomeStackMain" })
          }
          activeOpacity={0.7}
        >
          {/* ✅ Native View with ref — measureInWindow works on this */}
          <View ref={homeRef} collapsable={false} style={styles.refBox}>
            <Octicons
              name="home"
              size={26}
              color={state.index === homeIndex ? "#f9c349" : "#9AA0A6"}
            />
          </View>
        </TouchableOpacity>

        {/* ─── Explore tab ──────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate("Explore")}
          activeOpacity={0.7}
        >
          <View ref={exploreRef} collapsable={false} style={styles.refBox}>
            <MaterialIcons
              name="explore"
              size={26}
              color={state.index === exploreIndex ? "#f9c349" : "#9AA0A6"}
            />
          </View>
        </TouchableOpacity>

        {/* ─── Social (center) ──────────────────────────────────── */}
        <TouchableOpacity
          style={styles.centerButtonContainer}
          onPress={handleSocialPress}
          activeOpacity={0.9}
        >
          <View ref={socialRef} collapsable={false} style={styles.refBox}>
            <View style={styles.centerButton}>
              <Foundation
                name="social-skillshare"
                size={32}
                color={"#f9c349"}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* ─── Campus tab ───────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate("Campus")}
          activeOpacity={0.7}
        >
          <View ref={campusRef} collapsable={false} style={styles.refBox}>
            <MaterialCommunityIcons
              name="school-outline"
              size={26}
              color={state.index === campusIndex ? "#f9c349" : "#9AA0A6"}
            />
          </View>
        </TouchableOpacity>

        {/* ─── Profile tab ──────────────────────────────────────── */}
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

// ============================================================
// TabNavigator
// ============================================================
export default function TabNavigator({ onTabChange, onRouteChange }) {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          contentStyle: { backgroundColor: "#FFFFFF" },
          lazy: false,
        }}
        initialRouteName="Home"
        backBehavior="initialRoute" // back always returns to Home (history sent you back to Profile)
        screenListeners={({ route }) => ({
          focus: () => {
            if (typeof onTabChange === "function") {
              onTabChange(route.name);
            }
            if (typeof onRouteChange === "function") {
              const deepest = getDeepestRouteName(route);
              onRouteChange(deepest || route.name);
            }
          },
          state: (e) => {
            if (typeof onRouteChange === "function") {
              const deepest = getDeepestRouteName(route);
              onRouteChange(deepest || route.name);
            }
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{ unmountOnBlur: false }}
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
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: "transparent",
    zIndex: 1000,
  },
  tabBarBackground: {
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 20,
  },
  contentContainer: {
    flexDirection: "row",
    height: TAB_HEIGHT,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 9,
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: TAB_HEIGHT,
  },
  // ✅ Small wrapper so measureInWindow measures just the icon
  refBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: TAB_HEIGHT,
    marginTop: -5,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 45,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#f9c349",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 10,
    marginTop: -15,
  },
});