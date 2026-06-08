import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../screens/ProfileScreen";
import ProfileDetails from "../screens/ProfileDetailsScreen";
import MyDiscountScreen from "../screens/MyDiscountScreen";
import PremiumMemberCard from "../components/Card";
import SettingsScreen from "../screens/SettingScreen";
import GuestGuard from '../components/GuestGuard';
const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  return (
    <GuestGuard 
      title="View Your Discounts" 
      message="Sign in to see your claimed offers and discounts."
    >
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="ProfileDetails" component={ProfileDetails} />
      <Stack.Screen name="MyDiscountScreen" component={MyDiscountScreen} />
      <Stack.Screen name="Card" component={PremiumMemberCard} />
      <Stack.Screen name="SettingScreen" component={SettingsScreen} />
    </Stack.Navigator>
    </GuestGuard>
  );
}
