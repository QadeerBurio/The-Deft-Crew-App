import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../screens/ProfileScreen";
import ProfileDetails from "../screens/ProfileDetailsScreen";
import MyDiscountScreen from "../screens/MyDiscountScreen";
import PremiumMemberCard from "../components/Card";
import SettingsScreen from "../screens/SettingScreen";
import GuestGuard from '../components/GuestGuard';

// 🆕 engagement
import NotificationSettingsScreen from "../engagement/screens/NotificationSettingsScreen";
import BadgesScreen from "../engagement/screens/BadgesScreen";
import RewardsScreen from "../engagement/screens/RewardsScreen";
import NotificationModal from "../components/NotificationModal";

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
         <Stack.Screen name="NotificationModal" component={NotificationModal} />
        {/* 🆕 engagement screens */}
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="Badges" component={BadgesScreen} />
        <Stack.Screen name="Rewards" component={RewardsScreen} />
      </Stack.Navigator>
    </GuestGuard>
  );
}