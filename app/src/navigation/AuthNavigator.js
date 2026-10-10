// navigation/AppNavigator.js
// Root stack.
//   Nobody yet (no user, not a guest): Splash only. It shows the intro once, then
//   enters guest mode, which switches to the Drawer (Home).
//   Guest or student: the Drawer.
// Sign in / sign up screens are registered in both states, so for a guest they open
// on top of the Drawer and the Drawer (with the guest's place in it) survives sign in.
import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";

import Splash from "../screens/Splash";
import SignIn from "../screens/SignIn";
import SignupScreen from "../screens/SignupScreen";
import DrawerNavigator from "./DrawerNavigator";
import ForgotPassword from "../screens/ForgotPassword"
import VerifyOTP from "../screens/VerifyOTPScreen"
import SignupVerifyScreen from "../screens/SignupVerifyScreen"
import ResetPassword from "../screens/ResetPasswordScreen"
import VerificationScreen from "../screens/VerificationScreen";
import ResumeStack from "./ResumeNavigator";
import TermsScreen from "../screens/PrivacyScreen";
import CommunityGuidelinesScreen from "../screens/Guidelines";
// the drawer's legal pages, opened from the sign up line
import LegalTermsScreen from "../components/Terms";
import LegalPrivacyScreen from "../components/Privacy";


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isGuest } = useContext(AuthContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user && !isGuest ? (
        // Nobody yet: splash (+ intro on first install), then guest Home
        <Stack.Screen name="Splash" component={Splash} />
      ) : (
        // Student or guest: the app
        <Stack.Screen name="Drawer" component={DrawerNavigator} />
      )}

      {/* Old onboarding pages: no longer in the first-run flow, kept registered */}
      <Stack.Screen name="Privacy" component={TermsScreen} />
      <Stack.Screen name="CommunityGuidelines" component={CommunityGuidelinesScreen} />

      {/* Auth screens (open over the app for a guest) */}
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="SignupVerify" component={SignupVerifyScreen} />
      <Stack.Screen name="VerificationScreen" component={VerificationScreen}/>
      <Stack.Screen name="Login" component={SignIn} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword}/>
      <Stack.Screen name="VerifyOTP" component={VerifyOTP}/>
      <Stack.Screen name="ResetPassword" component={ResetPassword}/>
      <Stack.Screen name="LegalTerms" component={LegalTermsScreen} />
      <Stack.Screen name="LegalPrivacy" component={LegalPrivacyScreen} />

      <Stack.Screen
        name="Resume"
        component={ResumeStack}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
