//The-Deft-Crew-App/App.js


import React, { useEffect, useState, useRef } from "react";
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from "expo-notifications";

import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import AuthProvider, { AuthContext } from "./app/src/context/AuthContext";
import ChatProvider from "./app/src/context/ChatContext";
import AppNavigator from "./app/src/navigation/AuthNavigator";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StatusBar, View } from "react-native";
import ResumeProvider from "./app/src/context/ResumeContext";
import api from "./app/src/api/api";
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  registerForPushNotificationsAsync,
  savePushTokenToServer,
} from "./app/src/utils/pushNotifications";



import GlobalNotificationLayer from "./app/src/components/GlobalNotificationLayer";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const MyTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#000000' },
};

// ✅ MOVED INSIDE App to have access to providers
function NotificationHandler() {
  const { token: authToken, isGuest } = React.useContext(AuthContext);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const hasAttemptedRegistration = useRef(false);

  useEffect(() => {
    console.log('[NotificationHandler] Effect fired — authToken:', !!authToken, 'isGuest:', isGuest);

    if (!authToken || isGuest) {
      console.log('[NotificationHandler] Skipping — no authToken or isGuest');
      return;
    }

    // Guard against double-firing in dev (StrictMode / fast refresh)
    if (hasAttemptedRegistration.current) {
      console.log('[NotificationHandler] Already attempted this session, skipping duplicate call');
    } else {
      hasAttemptedRegistration.current = true;
      console.log('[NotificationHandler] >>> Calling registerForPushNotificationsAsync()');

      registerForPushNotificationsAsync()
        .then((expoPushToken) => {
          console.log('[NotificationHandler] <<< registerForPushNotificationsAsync resolved:', expoPushToken);
          if (expoPushToken) {
            return savePushTokenToServer(api, expoPushToken).then(() => {
              console.log('[NotificationHandler] Token saved to server OK');
            });
          } else {
            console.log('[NotificationHandler] No token returned (permission denied, emulator, or projectId missing)');
          }
        })
        .catch((err) => {
          console.log('[NotificationHandler] registerForPushNotificationsAsync THREW:', err.message, err.stack);
        });
    }

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received in foreground:", notification.request.content);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data || {};
        console.log("Notification tapped:", data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [authToken, isGuest]);

  return null;
}
function AppContent() {
  return (
    <>
      <NotificationHandler />
      <ResumeProvider>
        <ChatProvider>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={{ flex: 1 }}>
            <NavigationContainer theme={MyTheme}>
              <AppNavigator />
            </NavigationContainer>
            <GlobalNotificationLayer />
          </View>
        </ChatProvider>
      </ResumeProvider>
    </>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await SplashScreen.hideAsync();
        setAppIsReady(true);
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}