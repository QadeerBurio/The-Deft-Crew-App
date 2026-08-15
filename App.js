import React, { useEffect, useState } from "react";
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import AuthProvider from "./app/src/context/AuthContext";
import ChatProvider from "./app/src/context/ChatContext";
import AppNavigator from "./app/src/navigation/AuthNavigator";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StatusBar, View, Text, TouchableOpacity } from "react-native";
import ResumeProvider from "./app/src/context/ResumeContext";
// import PermissionScreen from "./app/src/components/PermissionScreen";
// import { PermissionProvider } from "./app/src/context/PermissionContext";

// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const MyTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#000000' },
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showPermissionScreen, setShowPermissionScreen] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Hide splash screen
        await SplashScreen.hideAsync();
        
        // Set app as ready
        setAppIsReady(true);
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();
  }, []);

  const handlePermissionsGranted = () => {
    setShowPermissionScreen(false);
  };

  const handleSkipPermissions = () => {
    setShowPermissionScreen(false);
  };

  if (!appIsReady) {
    return null; // Splash screen is still visible
  }



  // Main app
  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
          <AuthProvider>
            <ResumeProvider>
              <ChatProvider>
                <StatusBar barStyle="light-content" backgroundColor="#000000" />
                <NavigationContainer theme={MyTheme}>
                  <AppNavigator />
                </NavigationContainer>
              </ChatProvider>
            </ResumeProvider>
          </AuthProvider>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}