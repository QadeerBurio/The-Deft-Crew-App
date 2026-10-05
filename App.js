// The-Deft-Crew-App/App.js
// FIXED: Push registration, cold-start deep link, external deep link, in-app sounds

import React, { useEffect, useState, useRef, useContext } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as Linking from "expo-linking";

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
  registerBackgroundNotificationTask,
  setupAndroidChannels,
  claimNotificationResponse,
  getRouteFromNotificationData,
  navigateWhenReady,
  NOTIFICATION_TASK,
} from "./app/src/utils/pushNotifications";

import GlobalNotificationLayer from "./app/src/components/GlobalNotificationLayer";
import { navigationRef } from "./app/src/navigation/navigationRef";
export { navigationRef };

// ─── Engagement ───
import EngagementProvider from "./app/src/engagement/EngagementProvider";
import CelebrationHost from "./app/src/engagement/components/CelebrationHost";
import TourProvider from "./app/src/engagement/tour/TourProvider";
import TourOverlay from "./app/src/engagement/tour/TourOverlay";

// ═══════════════════════════════════════════════════════════════
// 1. NOTIFICATION HANDLER — set ONCE at module load.
//    This file is the single source of truth for the handler.
//    (pushNotifications.js must NOT set its own handler.)
// ═══════════════════════════════════════════════════════════════
Notifications.setNotificationHandler({
  // Runs ONLY while the app is open. GlobalNotificationLayer already shows
  // the TDC in-app banner + sound, so the system popup is muted here to
  // avoid a double popup. Background/killed pushes are shown by Android/iOS
  // directly and are NOT affected by this handler.
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
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
      console.error("[BG-Task] error:", error);
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

  useEffect(() => {
    if (!authToken || isGuest) {
      lastRegisteredUserRef.current = null;
      return;
    }

    if (lastRegisteredUserRef.current === authToken) return;
    lastRegisteredUserRef.current = authToken;

    (async () => {
      try {
        console.log("[PushRegistration] registering device...");
        await registerBackgroundNotificationTask();

        const expoPushToken = await registerForPushNotificationsAsync();
        if (!expoPushToken) {
          console.log("[PushRegistration] no token returned");
          return;
        }

        const result = await savePushTokenToServer(api, expoPushToken);
        if (result?.ok) {
          console.log("[PushRegistration] token registered ✅");
        } else {
          console.warn("[PushRegistration] token save failed:", result?.reason);
        }
      } catch (err) {
        console.log("[PushRegistration] error:", err?.message);
      }
    })();
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
        setTimeout(() => navigateWhenReady(navigationRef, route, params), 500);
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
          navigationRef.navigate("PostDetailScreen", { postId: parts[1] });
        } else if (parts[0] === "user" && parts[1]) {
          navigationRef.navigate("UserProfile", { userId: parts[1] });
        } else if (parts[0] === "offer" && parts[1]) {
          navigationRef.navigate("OfferScreen", { offerId: parts[1] });
        } else if (parts[0] === "chat" && parts[1]) {
          navigationRef.navigate("ChatDetailScreen", { chatId: parts[1] });
        } else if (parts[0] === "listing" && parts[1]) {
          navigationRef.navigate("ListingDetail", { listingId: parts[1] });
        } else if (parts[0] === "match" && parts[1]) {
          navigationRef.navigate("MatchChat", { matchId: parts[1] });
        } else if (parts[0] === "inquiry" && parts[1]) {
          navigationRef.navigate("InquiryChat", { inquiryId: parts[1] });
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
                <AppContent />
              </TourProvider>
            </EngagementProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}