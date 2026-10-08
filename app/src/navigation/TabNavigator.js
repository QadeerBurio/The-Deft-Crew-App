// app/src/navigation/TabNavigator.js
import React, { useEffect, useRef, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  AppState,
  Dimensions,
  StatusBar,
} from "react-native";
import axios from "axios";
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
import { AuthContext } from "../context/AuthContext";
import { color, font } from "../theme/tokens";

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");
const TAB_HEIGHT = 55;

// Same value Social.js uses for GET /inbox (unread badge on the social button)
const SOCIAL_API_URL = "https://the-deft-crew-production.up.railway.app/api/social";
const LABEL_SCALE = 1.2; // labels must fit TAB_HEIGHT at big system fonts

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

  // Unread messages badge: same GET /inbox as Social.js. Fetched on mount,
  // when the active tab changes and when the app comes back. No polling.
  const { token, isGuest } = useContext(AuthContext);
  const [unread, setUnread] = useState(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchUnread = useCallback(async () => {
    if (!token || isGuest) {
      setUnread(0);
      return;
    }
    try {
      const res = await axios.get(`${SOCIAL_API_URL}/inbox`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!mountedRef.current || !Array.isArray(res?.data)) return;
      setUnread(res.data.reduce((sum, c) => sum + (c?.unreadCount || 0), 0));
    } catch (e) {
      if (__DEV__) console.log("[TabBar] unread fetch failed:", e?.message);
    }
  }, [token, isGuest]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread, state.index]);

  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener("change", (next) => {
      if (prev.match(/inactive|background/) && next === "active") fetchUnread();
      prev = next;
    });
    return () => sub.remove();
  }, [fetchUnread]);

  // Centre button press scale
  const socialScale = useRef(new Animated.Value(1)).current;
  const scaleSocial = (value) =>
    Animated.spring(socialScale, { toValue: value, friction: 6, tension: 120, useNativeDriver: true }).start();

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

  // Side tab: icon (inside the tour ref box, if any) + label + active dot
  const renderSideTab = ({ label, selected, onPress, tourRef, renderIcon }) => {
    const tint = selected ? color.ink : color.textFaint;
    return (
      <TouchableOpacity
        style={styles.tabItem}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
      >
        {/* ✅ Native View with ref — measureInWindow works on this */}
        <View ref={tourRef} collapsable={false} style={styles.refBox}>
          {renderIcon(tint)}
        </View>
        <Text
          style={[styles.tabLabel, { color: tint }, selected && styles.tabLabelActive]}
          numberOfLines={1}
          maxFontSizeMultiplier={LABEL_SCALE}
        >
          {label}
        </Text>
        <View style={[styles.tabDot, selected && styles.tabDotActive]} />
      </TouchableOpacity>
    );
  };

  const badgeText = unread > 99 ? "99+" : String(unread);

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
        {renderSideTab({
          label: "home",
          selected: state.index === homeIndex,
          onPress: () => navigation.navigate("Home", { screen: "HomeStackMain" }),
          tourRef: homeRef,
          renderIcon: (tint) => <Octicons name="home" size={23} color={tint} />,
        })}

        {/* ─── Explore tab ──────────────────────────────────────── */}
        {renderSideTab({
          label: "explore",
          selected: state.index === exploreIndex,
          onPress: () => navigation.navigate("Explore"),
          tourRef: exploreRef,
          renderIcon: (tint) => <MaterialIcons name="explore" size={23} color={tint} />,
        })}

        {/* ─── Social (center) ──────────────────────────────────── */}
        {/* Same column as the side tabs (spacer · label · dot) so "social"
            shares their baseline; the circle floats above, raised */}
        <Pressable
          style={styles.tabItem}
          onPress={handleSocialPress}
          onPressIn={() => scaleSocial(0.95)}
          onPressOut={() => scaleSocial(1)}
          accessibilityRole="tab"
          accessibilityState={{ selected: false }}
          accessibilityLabel={unread > 0 ? `social, ${unread} unread` : "social"}
        >
          <Animated.View
            pointerEvents="box-none"
            style={[styles.centerRaised, { transform: [{ scale: socialScale }] }]}
          >
            <View ref={socialRef} collapsable={false} style={styles.refBox}>
              <View style={styles.centerButton}>
                <Foundation name="social-skillshare" size={28} color={color.yellow} />
              </View>
              {unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} maxFontSizeMultiplier={LABEL_SCALE}>
                    {badgeText}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
          <View style={styles.iconSpacer} />
          <Text
            style={[styles.tabLabel, styles.centerLabel]}
            numberOfLines={1}
            maxFontSizeMultiplier={LABEL_SCALE}
          >
            social
          </Text>
          <View style={styles.tabDot} />
        </Pressable>

        {/* ─── Campus tab ───────────────────────────────────────── */}
        {renderSideTab({
          label: "campus",
          selected: state.index === campusIndex,
          onPress: () => navigation.navigate("Campus"),
          tourRef: campusRef,
          renderIcon: (tint) => <MaterialCommunityIcons name="school-outline" size={23} color={tint} />,
        })}

        {/* ─── Profile tab ──────────────────────────────────────── */}
        {renderSideTab({
          label: "profile",
          selected: state.index === profileIndex,
          onPress: () => navigation.navigate("Profile"),
          tourRef: undefined,
          renderIcon: (tint) => <MaterialCommunityIcons name="account-circle" size={23} color={tint} />,
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
    backgroundColor: color.white,
    borderTopWidth: 1,
    borderTopColor: color.line,
  },
  contentContainer: {
    flexDirection: "row",
    height: TAB_HEIGHT,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 9,
  },
  // icon 23 · 3 · label · 3 · dot 5 — fits inside TAB_HEIGHT
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: TAB_HEIGHT,
    gap: 3,
  },
  // ✅ Small wrapper so measureInWindow measures just the icon
  refBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
  },
  tabLabelActive: { fontFamily: font.bodyBold },
  // Inactive dot is transparent but keeps its space so nothing shifts
  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  tabDotActive: { backgroundColor: color.yellow },

  // Raised like the design: circle starts 14 above the bar's top edge
  centerRaised: {
    position: "absolute",
    top: -14,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  // Takes the icon's place in the column so the label lines up
  iconSpacer: { height: 23 },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: color.ink,
    borderWidth: 4,
    borderColor: color.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: color.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 10,
  },
  centerLabel: {
    fontFamily: font.bodyBold,
    color: color.ink,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: color.yellow,
    borderWidth: 2,
    borderColor: color.white,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11,
    elevation: 7,
  },
  // Spec asks for DM Sans 800; only 400–700 are loaded (FONTS.md), so 700
  badgeText: {
    fontFamily: font.bodyBold,
    fontSize: 10.5,
    color: color.ink,
  },
});
