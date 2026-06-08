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

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isGuest } = useContext(AuthContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user && !isGuest ? (
        // No user and not guest - Show auth screens
        <>
          <Stack.Screen name="Splash" component={Splash} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="VerificationScreen" component={VerificationScreen}/>
          <Stack.Screen name="Login" component={SignIn} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword}/>
          <Stack.Screen name="VerifyOTP" component={VerifyOTP}/>
          <Stack.Screen name="ResetPassword" component={ResetPassword}/>
        </>
      ) : (
        // User logged in OR guest mode - Show main app
        <Stack.Screen name="Drawer" component={DrawerNavigator} />
      )}
    </Stack.Navigator>
  );
}