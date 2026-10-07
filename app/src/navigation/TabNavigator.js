// app/src/navigation/TabNavigator.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, Foundation } from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import HomeStack from "./HomeStack";
import Social from "../screens/Social/Social";
import CampusToolsScreen from "../screens/StudentDashboard";
import Explore from "../screens/Explore";
import ProfileScreen from "../screens/ProfileScreen";

// 🆕 tour
import { useTour } from "../engagement/tour/TourProvider";
import { colors, shadow } from "../theme";

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

  // One side tab: icon, lowercase label, yellow dot when active.
  // The ref box wraps only the icon so the tour spotlight stays tight.
  const renderTab = ({ label, iconOn, iconOff, active, onPress, refBox }) => (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <View ref={refBox} collapsable={false} style={styles.refBox}>
        <Ionicons
          name={active ? iconOn : iconOff}
          size={24}
          color={active ? colors.ink : colors.textFaint}
        />
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
      <View style={[styles.activeDot, active && styles.activeDotOn]} />
    </TouchableOpacity>
  );

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
        {renderTab({
          label: "home",
          iconOn: "home",
          iconOff: "home-outline",
          active: state.index === homeIndex,
          onPress: () => navigation.navigate("Home", { screen: "HomeStackMain" }),
          refBox: homeRef,
        })}

        {/* ─── Explore tab ──────────────────────────────────────── */}
        {renderTab({
          label: "explore",
          iconOn: "compass",
          iconOff: "compass-outline",
          active: state.index === exploreIndex,
          onPress: () => navigation.navigate("Explore"),
          refBox: exploreRef,
        })}

        {/* ─── Social (center) ──────────────────────────────────── */}
        <TouchableOpacity
          style={styles.centerButtonContainer}
          onPress={handleSocialPress}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="social"
        >
          <View ref={socialRef} collapsable={false} style={styles.refBox}>
            <View style={styles.centerButton}>
              <Foundation
                name="social-skillshare"
                size={30}
                color={colors.yellow}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* ─── Campus tab ───────────────────────────────────────── */}
        {renderTab({
          label: "campus",
          iconOn: "school",
          iconOff: "school-outline",
          active: state.index === campusIndex,
          onPress: () => navigation.navigate("Campus"),
          refBox: campusRef,
        })}

        {/* ─── Profile tab ──────────────────────────────────────── */}
        {renderTab({
          label: "profile",
          iconOn: "person-circle",
          iconOff: "person-circle-outline",
          active: state.index === profileIndex,
          onPress: () => navigation.navigate("Profile"),
          refBox: undefined,
        })}
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
        backBehavior="history"
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
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 16,
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
    paddingTop: 4,
  },
  // ✅ Small wrapper so measureInWindow measures just the icon
  refBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    color: colors.textFaint,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.ink,
    fontWeight: "700",
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
    backgroundColor: "transparent",
  },
  activeDotOn: {
    backgroundColor: colors.yellow,
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: TAB_HEIGHT,
    marginTop: -5,
  },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.ink,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: colors.card,
    ...shadow.lift,
    zIndex: 10,
    marginTop: -22,
  },
});
