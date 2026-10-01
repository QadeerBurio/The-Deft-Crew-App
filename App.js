// The-Deft-Crew-App/App.js
// FIXED: Proper push registration, cold-start handling, single listener owner

import React, { useEffect, useState, useRef, useContext } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

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

import {
  registerForPushNotificationsAsync,
  savePushTokenToServer,
  registerBackgroundNotificationTask,
  NOTIFICATION_TASK,
} from "./app/src/utils/pushNotifications";

import GlobalNotificationLayer from "./app/src/components/GlobalNotificationLayer";
import { navigationRef } from "./app/src/navigation/navigationRef";
export { navigationRef };

import EngagementProvider from "./app/src/engagement/EngagementProvider";
import CelebrationHost from "./app/src/engagement/components/CelebrationHost";
import TourProvider from "./app/src/engagement/tour/TourProvider";
import TourOverlay from "./app/src/engagement/tour/TourOverlay";

// ═══════════════════════════════════════════════════════════════
// 1. NOTIFICATION HANDLER — MUST be set before any notification
//    arrives. Setting it at module load (outside React) guarantees
//    it's ready even during cold-start.
// ═══════════════════════════════════════════════════════════════
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ═══════════════════════════════════════════════════════════════
// 2. BACKGROUND TASK — define at module scope, before app renders.
//    This is what lets a KILLED app receive & process notifications.
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
// 3. PUSH REGISTRATION — re-registers on every login, saves token.
// ═══════════════════════════════════════════════════════════════
function PushRegistration() {
  const { token: authToken, isGuest } = useContext(AuthContext);
  const lastRegisteredTokenRef = useRef(null);
  const lastRegisteredUserRef = useRef(null);

  useEffect(() => {
    // Skip guest / no auth
    if (!authToken || isGuest) {
      lastRegisteredTokenRef.current = null;
      lastRegisteredUserRef.current = null;
      return;
    }

    // Skip if we already registered for this exact auth token
    if (lastRegisteredUserRef.current === authToken) {
      return;
    }

    lastRegisteredUserRef.current = authToken;

    (async () => {
      try {
        console.log("[PushRegistration] registering device...");

        // Register background task first (needed for killed-app delivery)
        await registerBackgroundNotificationTask();

        const expoPushToken = await registerForPushNotificationsAsync();
        if (!expoPushToken) {
          console.log("[PushRegistration] no token returned");
          return;
        }

        lastRegisteredTokenRef.current = expoPushToken;

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
// 4. COLD-START DEEP LINK — user tapped push while app was killed.
//    Handles BOTH `route` and `screen` (backend sends `screen`).
// ═══════════════════════════════════════════════════════════════
function ColdStartDeepLink() {
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;

        const data = response?.notification?.request?.content?.data || {};
        // ✅ Backend sends BOTH route and screen — support both
        const route = data.route || data.screen;
        const params = {
          ...(data.params || {}),
          ...(data.offerId ? { offerId: data.offerId } : {}),
          ...(data.listingId
            ? { listingId: data.listingId, id: data.listingId }
            : {}),
          ...(data.matchId ? { matchId: data.matchId } : {}),
          ...(data.conversationId
            ? { conversationId: data.conversationId }
            : {}),
          ...(data.postId ? { postId: data.postId } : {}),
        };

        if (!route) return;

        console.log("[ColdStart] navigating to:", route, params);
        handledRef.current = true;

        // Wait for NavigationContainer to be ready
        const tryNavigate = (attempt = 0) => {
          if (navigationRef?.current?.isReady?.()) {
            try {
              navigationRef.current.navigate(route, params);
              console.log("[ColdStart] navigated ✅");
            } catch (e) {
              console.warn("[ColdStart] nav failed:", e.message);
            }
          } else if (attempt < 30) {
            setTimeout(() => tryNavigate(attempt + 1), 100);
          } else {
            console.warn("[ColdStart] nav never became ready");
          }
        };

        setTimeout(() => tryNavigate(), 500);
      })
      .catch(() => {});
  }, []);

  return null;
}

// ═══════════════════════════════════════════════════════════════
// 5. APP CONTENT — GlobalNotificationLayer inside NavigationContainer
//    so it can both show banner AND use navigation.
// ═══════════════════════════════════════════════════════════════
function AppContent() {
  return (
    <>
      <PushRegistration />
      <ColdStartDeepLink />

      <ResumeProvider>
        <ChatProvider>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={{ flex: 1 }}>
            <NavigationContainer ref={navigationRef} theme={MyTheme}>
              <AppNavigator />
            </NavigationContainer>

            {/* ✅ Banner layer — mounted after NavigationContainer so
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
// 6. ROOT APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Small delay so splash looks intentional
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // ✅ Ensure Android channels exist BEFORE hiding splash,
        //    so first notification lands on the right channel.
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("engagement", {
            name: "engagement",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#f9c349",
            sound: "default",
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
          });
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#f9c349",
            sound: "default",
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
          });
        }

        await SplashScreen.hideAsync();
        setAppIsReady(true);
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