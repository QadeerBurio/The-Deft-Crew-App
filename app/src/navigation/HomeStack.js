import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Brands from "../screens/Brands"; 
import BrandOffersScreen from "../screens/OfferScreen";
import UniversityScreen from "../screens/University"; 
import Slider from "../screens/Slider";
import Home from "../screens/Home";
import ContactUs from "../components/ContactUs";
import Card from "../components/Card";
import BookingScreenBase from "../components/BookingScreen";
const BookingScreen = accountOnly(BookingScreenBase, { title: "booking" });
import PaymentScreenBase from "../components/PaymentScreen";
const PaymentScreen = accountOnly(PaymentScreenBase, { title: "payment" });
import TravelingScreen from "../components/TravellingScreen";
import EditProfileScreen from "../screens/Social/EditProfileScreen";
import ChatHistoryScreenBase from "../screens/ChatHistoryScreen";
const ChatHistoryScreen = accountOnly(ChatHistoryScreenBase, { title: "chat history" });
import ResumeStack from "./ResumeNavigator";  // 👈 FIXED: was "./ResumeNavigator"
import Social from "../screens/Social/Social";
import OfferScreen from "../screens/OfferScreen";
import { accountOnly } from "../guest";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeStackMain"
    >
      <Stack.Screen 
        name="HomeStackMain" 
        component={Home} 
        options={{ freezeOnBlur: false }}
      />
      <Stack.Screen name="Brands" component={Brands} />
      <Stack.Screen name="ContactUs" component={ContactUs} />
      
      {/* Resume Stack — nested navigator */}
      <Stack.Screen
  name="Resume"
  component={ResumeStack}
  options={{
    headerShown: false,
    
  }}
/>
      
      <Stack.Screen name="BrandOffers" component={BrandOffersScreen} />
      <Stack.Screen
        name="OfferScreen"
        component={OfferScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen name="University" component={UniversityScreen} />
      <Stack.Screen name="Slider" component={Slider} />
      <Stack.Screen name="Card" component={Card} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
      <Stack.Screen name="TravellingScreen" component={TravelingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChatHistory" component={ChatHistoryScreen} />
      <Stack.Screen name="Social" component={Social} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}