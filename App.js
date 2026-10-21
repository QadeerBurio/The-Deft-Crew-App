// The-Deft-Crew-App/App.js
// FIXED: Push registration, cold-start deep link, external deep link, in-app sounds

import MetaEventsHost from "./app/src/analytics/MetaConsent"; // Meta App Events consent + switch

// Release builds: no console.log / info / debug output (warn and error stay).
if (!__DEV__) { console.log = () => {}; console.info = () => {}; console.debug = () => {}; }

import React, { useEffect, useState, useRef, useContext } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as Linking from "expo-linking";
import * as Font from "expo-font";
import { Outfit_700Bold, Outfit_800ExtraBold } from "@expo-google-fonts/outfit";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import AuthProvider, { AuthContext } from "./app/src/context/AuthContext";
import ChatProvider from "./app/src/context/ChatContext";
import AppNavigator from "./app/src/navigation/AuthNavigator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar, View, Platform } from "react-native";
import ResumeProvider from "./app/src/context/ResumeContext";
import api from "./app/src/api/api";
import { SafeAreaProvider } from "react-native-safe-area-context";

// ─── Sound kit ───
import { configureAudio, preloadSounds } from "./app/src/lib/soundManager";
import { soundAppOpen } from "./app/src/lib/tdcSounds";

// ─── Push utilities ───
import {
  registerForPushNotificationsAsync,
  savePushTokenToServer,
  removePushTokenFromServer,
  registerBackgroundNotificationTask,
  setupAndroidChannels,
  claimNotificationResponse,
  getRouteFromNotificationData,
  NOTIFICATION_TASK,
} from "./app/src/utils/pushNotifications";

import GlobalNotificationLayer from "./app/src/components/GlobalNotificationLayer";
import AppAlertHost, { installAppAlert } from "./app/src/components/AppAlert";

// Every Alert.alert in the app now shows the tdc styled popup
installAppAlert();
import { navigationRef } from "./app/src/navigation/navigationRef";
export { navigationRef };

// ─── Engagement ───
import EngagementProvider from "./app/src/engagement/EngagementProvider";
import CelebrationHost from "./app/src/engagement/components/CelebrationHost";
import TourProvider from "./app/src/engagement/tour/TourProvider";
import TourOverlay from "./app/src/engagement/tour/TourOverlay";
import { holdTour, releaseTour } from "./app/src/engagement/tour/tourGate";

// ─── Guest mode: one gate + sign-in return ───
import { GuestGateProvider, openTarget } from "./app/src/guest";

// ═══════════════════════════════════════════════════════════════
// 1. NOTIFICATION HANDLER — set ONCE at module load.
//    This file is the single source of truth for the handler.
//    (pushNotifications.js must NOT set its own handler.)
// ═══════════════════════════════════════════════════════════════
Notifications.setNotificationHandler({
  // Runs ONLY while the app is open (foreground).
  // App open   → TDC in-app popup (GlobalNotificationLayer) with mood icon + TDC sound.
  // App closed → Android/iOS system popup with the same title, emoji, image and sound.
  // So here we hide the system popup and its sound to avoid a double popup.
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// Create Android channels at launch, before login, so pushes that arrive
// while the app is killed always have a valid channel to show on.
setupAndroidChannels();

// ═══════════════════════════════════════════════════════════════
// 2. BACKGROUND TASK — defined at module scope so it's ready
//    even when the OS wakes the app in the background.
// ═══════════════════════════════════════════════════════════════
if (!TaskManager.isTaskDefined(NOTIFICATION_TASK)) {
  TaskManager.defineTask(NOTIFICATION_TASK, async ({ data, error }) => {
    if (error) {
      // warn, not error: no red error screen; kept in release logs (adb logcat)
      console.warn("[BG-Task] background notification task failed:", error?.message || String(error));
      return;
    }
    if (data?.notification) {
      const content = data.notification?.request?.content || {};
      console.log(
        "[BG-Task] received while app killed:",
        content.title,
        content.data
      );
    }
  });
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const MyTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: "#000000" },
};

// ═══════════════════════════════════════════════════════════════
// 3. PUSH REGISTRATION
//    Registers device token once per auth session.
// ═══════════════════════════════════════════════════════════════
function PushRegistration() {
  const { token: authToken, isGuest } = useContext(AuthContext);
  const lastRegisteredUserRef = useRef(null);
  // the session + push token this phone was registered with, so logout can remove it
  const registeredRef = useRef({ authToken: null, pushToken: null });

  useEffect(() => {
    if (!authToken || isGuest) {
      lastRegisteredUserRef.current = null;
      // signed out (or switched to guest): this phone stops getting that account's pushes
      const { authToken: prevAuth, pushToken } = registeredRef.current;
      registeredRef.current = { authToken: null, pushToken: null };
      if (prevAuth && pushToken) removePushTokenFromServer(api.defaults.baseURL, prevAuth, pushToken);
      return;
    }

    if (lastRegisteredUserRef.current === authToken) return;
    lastRegisteredUserRef.current = authToken;

    (async () => {
      // the system permission prompt can appear during registration:
      // hold the app tour until it has been answered
      holdTour("push-permission");
      try {
        console.log("[PushRegistration] registering device...");
        await registerBackgroundNotificationTask();

        let expoPushToken = null;
        try {
          expoPushToken = await registerForPushNotificationsAsync();
        } finally {
          releaseTour("push-permission");
        }
        if (!expoPushToken) {
          console.log("[PushRegistration] no token returned");
          return;
        }

        const result = await savePushTokenToServer(api, expoPushToken);
        if (result?.ok) {
          registeredRef.current = { authToken, pushToken: expoPushToken };
          console.log("[PushRegistration] token registered ✅");
        } else {
          console.warn("[PushRegistration] token save failed:", result?.reason);
        }
      } catch (err) {
        console.warn("[PushRegistration] error:", err?.message);
      } finally {
        releaseTour("push-permission");
      }
    })();
  }, [authToken, isGuest]);

  // The phone's push token can change (reinstall data, Google rotation): save the new one
  useEffect(() => {
    if (!authToken || isGuest) return undefined;
    const sub = Notifications.addPushTokenListener(async () => {
      try {
        const fresh = await registerForPushNotificationsAsync();
        if (!fresh || fresh === registeredRef.current.pushToken) return;
        const result = await savePushTokenToServer(api, fresh);
        if (result?.ok) {
          registeredRef.current = { authToken, pushToken: fresh };
          console.log("[PushRegistration] new token saved after a change");
        }
      } catch (e) {
        console.warn("[PushRegistration] token change not saved:", e?.message);
      }
    });
    return () => sub.remove();
  }, [authToken, isGuest]);

  return null;
}

// ═══════════════════════════════════════════════════════════════
// 4. COLD-START DEEP LINK
//    User tapped a push notification while app was killed.
//    ✅ Uses FLAT navigationRef (NOT .current).
// ═══════════════════════════════════════════════════════════════
function ColdStartDeepLink() {
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        if (!claimNotificationResponse(response)) return;

        const data = response?.notification?.request?.content?.data || {};
        const { route, params } = getRouteFromNotificationData(data);
        if (!route) return;

        console.log("[ColdStart] navigating to:", route, params);
        handledRef.current = true;
        // guest + login-only route → sign in first, then continue
        setTimeout(() => openTarget(route, params), 500);
      })
      .catch(() => {});
  }, []);

  return null;
}

// ═══════════════════════════════════════════════════════════════
// 5. EXTERNAL DEEP LINK
//    Handles tdcapp://... and https://... link opens.
// ═══════════════════════════════════════════════════════════════
function ExternalDeepLink() {
  useEffect(() => {
    const handleUrl = ({ url }) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        const parts = (parsed.path || "").split("/").filter(Boolean);

        if (!navigationRef?.isReady?.()) return;

        console.log("[ExternalDeepLink] handling:", url, "parts:", parts);

        if (parts[0] === "post" && parts[1]) {
          openTarget("PostDetailScreen", { postId: parts[1] });
        } else if (parts[0] === "user" && parts[1]) {
          openTarget("UserProfile", { userId: parts[1] });
        } else if (parts[0] === "offer" && parts[1]) {
          openTarget("OfferScreen", { offerId: parts[1] });
        } else if (parts[0] === "chat" && parts[1]) {
          openTarget("ChatDetailScreen", { chatId: parts[1] });
        } else if (parts[0] === "listing" && parts[1]) {
          openTarget("ListingDetail", { listingId: parts[1] });
        } else if (parts[0] === "match" && parts[1]) {
          openTarget("MatchChat", { matchId: parts[1] });
        } else if (parts[0] === "inquiry" && parts[1]) {
          openTarget("InquiryChat", { inquiryId: parts[1] });
        }
      } catch (e) {
        console.warn("[ExternalDeepLink] parse error:", e.message);
      }
    };

    // Cold start via URL
    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          // Delay so NavigationContainer is mounted
          setTimeout(() => handleUrl({ url }), 800);
        }
      })
      .catch(() => {});

    // While running
    const sub = Linking.addEventListener("url", handleUrl);
    return () => sub.remove();
  }, []);

  return null;
}

// ═══════════════════════════════════════════════════════════════
// 6. APP CONTENT
// ═══════════════════════════════════════════════════════════════
function AppContent() {
  return (
    <>
      <PushRegistration />
      <ColdStartDeepLink />
      <ExternalDeepLink />

      <ResumeProvider>
        <ChatProvider>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={{ flex: 1 }}>
            <NavigationContainer ref={navigationRef} theme={MyTheme}>
              <AppNavigator />
            </NavigationContainer>

            {/* Banner layer — mounted AFTER NavigationContainer so
                navigationRef is always ready when a notification arrives */}
            <GlobalNotificationLayer />

            <CelebrationHost />
            <TourOverlay />
            {/* Meta App Events: server switch + the student's consent (asks once) */}
            <MetaEventsHost />
          </View>
        </ChatProvider>
      </ResumeProvider>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// 7. ROOT APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 0. Fonts for the new Home + tab bar (falls back to system font)
        try {
          await Font.loadAsync({
            Outfit_700Bold,
            Outfit_800ExtraBold,
            DMSans_400Regular,
            DMSans_500Medium,
            DMSans_600SemiBold,
            DMSans_700Bold,
          });
        } catch (e) {
          console.warn("[App] font load error:", e);
        }

        // 1. Init audio mode + preload hot sounds BEFORE splash hides
        await configureAudio();
        await preloadSounds([
          "tdc_tap",
          "tdc_success",
          "tdc_error",
          "tdc_nope",
          "tdc_like",
          "tdc_send",
          "tdc_popup_open",
          "tdc_popup_close",
          "tdc_notification_in_app",
          "tdc_push_default",
          "tdc_push_message",
          "tdc_push_deal",
          "tdc_push_confession",
          "tdc_push_streak",
          "tdc_push_level_up",
        ]);

        // 2. Small delay so splash feels intentional
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // 3. Make sure Android channels finished creating
        await setupAndroidChannels();

        await SplashScreen.hideAsync();
        setAppIsReady(true);

        // 4. Play the sonic logo on cold start
        setTimeout(() => {
          try {
            soundAppOpen();
          } catch (e) {
            console.log("[App] soundAppOpen error:", e?.message);
          }
        }, 300);
      } catch (e) {
        console.warn("[App] prepare error:", e);
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  if (!appIsReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <EngagementProvider>
              <TourProvider>
                <GuestGateProvider>
                  <AppContent />
                </GuestGateProvider>
              </TourProvider>
            </EngagementProvider>
          </AuthProvider>
          <AppAlertHost />
        </SafeAreaProvider>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}