import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StatusBar,
} from "react-native";
import { LinearGradient } from "../ui/FlatGradient"; // flat fills, no gradients (design system)
import AsyncStorage from "@react-native-async-storage/async-storage";
import { color as T, font as F } from "../theme/tokens";
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
      <StatusBar barStyle="light-content" backgroundColor={T.ink} />
      <LinearGradient
        colors={[T.ink, T.ink, T.ink]} // Subtle gradient for depth
        style={styles.center}
      >
        <Animated.View
          style={[
            styles.splashLogoCircle,
            { opacity: fadeAnim, transform: [{ scale: fadeAnim }] },
          ]}
        >
          <Text style={styles.splashLogoText} accessibilityLabel="tdc">tdc<Text style={{ color: T.white }}>.</Text></Text>
        </Animated.View>

        <Animated.Text style={[styles.splashTitle, { opacity: fadeAnim }]}>
          the deft crew
        </Animated.Text>

        <View style={styles.splashFooter}>
          <Text style={styles.footerBrandText}>est. 2026 · karachi</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  splashLogoCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: T.yellow,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: T.ink, // Added for iOS visibility
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  splashLogoText: {
    fontSize: 50,
    fontFamily: F.heading,
    color: T.ink,
  },
  splashTitle: {
    color: T.white,
    fontSize: 22,
    fontFamily: F.heading,
    marginTop: 24,
    letterSpacing: 1,
  },
  splashFooter: {
    position: "absolute",
    bottom: 50,
  },
  footerBrandText: {
    color: T.onInkMuted,
    fontSize: 12.5, fontFamily: F.bodySemi,
    letterSpacing: 1,
  },
});