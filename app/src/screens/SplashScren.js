import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native"; // Import this

export default function TDCFlow() {
  const navigation = useNavigation(); // Initialize navigation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem("alreadyLaunched");
      
      // Delay to show the splash screen branding
      setTimeout(() => {
        // IMPORTANT: Use the correct screen name from your Stack.Navigator
        // Based on your code, this should be "HomeStackMain"
        navigation.replace("Drawer"); 
      }, 2500);
    } catch (e) {
      console.log(e);
      navigation.replace("Drawer");
    }
  };

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#000000", "#1a1a1a", "#000000"]} // Subtle gradient for depth
        style={styles.center}
      >
        <Animated.View
          style={[
            styles.splashLogoCircle,
            { opacity: fadeAnim, transform: [{ scale: fadeAnim }] },
          ]}
        >
          <Text style={styles.splashLogoText}>tdc.</Text>
        </Animated.View>

        <Animated.Text style={[styles.splashTitle, { opacity: fadeAnim }]}>
          THE DEFT CREW
        </Animated.Text>

        <View style={styles.splashFooter}>
          <Text style={styles.footerBrandText}>EST. 2026 | KARACHI</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  splashLogoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#fff", // Added for iOS visibility
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  splashLogoText: {
    fontSize: 50,
    fontWeight: "900",
    color: "#000000",
  },
  splashTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 25,
    letterSpacing: 4,
  },
  splashFooter: {
    position: "absolute",
    bottom: 50,
  },
  footerBrandText: {
    color: "#666",
    fontSize: 12,
    letterSpacing: 2,
  },
});