// navigation/AppNavigator.js
import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";

import Splash from "../screens/Splash";
import SignIn from "../screens/SignIn";
import SignupScreen from "../screens/SignupScreen";
import DrawerNavigator from "./DrawerNavigator";
import ForgotPassword from "../screens/ForgotPassword"
import VerifyOTP from "../screens/VerifyOTPScreen"
import ResetPassword from "../screens/ResetPasswordScreen"
import VerificationScreen from "../screens/VerificationScreen";
import TDCFlow from "../screens/SplashScren";
import ResumeStack from "./ResumeNavigator";
import TermsScreen from "../screens/PrivacyScreen";
import CommunityGuidelinesScreen from "../screens/Guidelines";


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isGuest } = useContext(AuthContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user && !isGuest ? (
        // No user and not guest - Show auth screens
        <>
          {/* Splash is the entry point - it checks if onboarding is complete */}
          <Stack.Screen name="Splash" component={Splash} />
          
          {/* Onboarding flow - Terms and Guidelines */}
          <Stack.Screen name="Privacy" component={TermsScreen} />
          <Stack.Screen name="CommunityGuidelines" component={CommunityGuidelinesScreen} />
          
          {/* Auth screens */}
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="VerificationScreen" component={VerificationScreen}/>
          <Stack.Screen name="Login" component={SignIn} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword}/>
          <Stack.Screen name="VerifyOTP" component={VerifyOTP}/>
          <Stack.Screen name="ResetPassword" component={ResetPassword}/>
          
          <Stack.Screen 
            name="Resume" 
            component={ResumeStack}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        // User logged in OR guest mode - Show main app
        <Stack.Screen name="Drawer" component={DrawerNavigator} />
      )}
    </Stack.Navigator>
  );
}