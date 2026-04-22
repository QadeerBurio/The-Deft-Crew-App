import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Brands from "../screens/Brands"; 
import BrandOffersScreen from "../screens/OfferScreen";
import UniversityScreen from "../screens/University"; 
import Slider from "../screens/Slider";
import Home from "../screens/Home";
import ContactUs from "../components/ContactUs";
import Card from "../components/Card"
import BookingScreen from "../components/BookingScreen";
import PaymentScreen from "../components/PaymentScreen";
import TravelingScreen from "../components/TravellingScreen";
import EditProfileScreen from "../screens/Social/EditProfileScreen";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
    
      <Stack.Screen name="HomeStackMain" component={Home} />
      <Stack.Screen name="Brands" component={Brands} />
      <Stack.Screen name="ContactUs" component={ContactUs} />
      <Stack.Screen name="BrandOffers" component={BrandOffersScreen} />
      <Stack.Screen name="University" component={UniversityScreen} />
      <Stack.Screen name="Slider" component={Slider} />
      <Stack.Screen name="Card" component={Card} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
      <Stack.Screen name="TravellingScreen" component={TravelingScreen} options={{ headerShown: false }}/>
      

    </Stack.Navigator>
  );
}
