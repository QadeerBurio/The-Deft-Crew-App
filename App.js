import React, { useEffect } from "react";
import * as SplashScreen from 'expo-splash-screen'; 
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import AuthProvider from "./app/src/context/AuthContext";
import ChatProvider from "./app/src/context/ChatContext";
import AppNavigator from "./app/src/navigation/AuthNavigator"; 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StatusBar } from "react-native";
import * as SplashScren from 'expo-splash-screen';
import ResumeProvider from "./app/src/context/ResumeContext";
SplashScren.preventAutoHideAsync();
// Keep native splash visible until we tell it to hide
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const MyTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#000000' },
};

export default function App() {
 useEffect(() => {
  const hideSplash = async () => {
    await SplashScreen.hideAsync();
  };
  hideSplash();
}, []);


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