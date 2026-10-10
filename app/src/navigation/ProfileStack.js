import React from "react";
import { accountOnly } from '../guest';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreenBase from "../screens/ProfileScreen";
const ProfileScreen = accountOnly(ProfileScreenBase, { title: "profile", line: "sign up for your student card, discounts and points.", showBack: false });
import ProfileDetailsBase from "../screens/ProfileDetailsScreen";
const ProfileDetails = accountOnly(ProfileDetailsBase, { title: "profile" });
import MyDiscountScreenBase from "../screens/MyDiscountScreen";
const MyDiscountScreen = accountOnly(MyDiscountScreenBase, { title: "my discounts" });
import PremiumMemberCardBase from "../components/Card";
const PremiumMemberCard = accountOnly(PremiumMemberCardBase, { title: "membership card" });
import SettingsScreenBase from "../screens/SettingScreen";
const SettingsScreen = accountOnly(SettingsScreenBase, { title: "settings" });

// 🆕 engagement
import NotificationSettingsScreenBase from "../engagement/screens/NotificationSettingsScreen";
const NotificationSettingsScreen = accountOnly(NotificationSettingsScreenBase, { title: "notifications" });
import BadgesScreenBase from "../engagement/screens/BadgesScreen";
const BadgesScreen = accountOnly(BadgesScreenBase, { title: "badges" });
import RewardsScreenBase from "../engagement/screens/RewardsScreen";
const RewardsScreen = accountOnly(RewardsScreenBase, { title: "rewards" });
import NotificationModalBase from "../components/NotificationModal";
const NotificationModal = accountOnly(NotificationModalBase, { title: "notifications" });

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  return (
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
  );
}