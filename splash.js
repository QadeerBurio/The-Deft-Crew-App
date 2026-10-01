import React, { useEffect, useRef } from "react";
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Easing,
  Dimensions,
  Text,
} from "react-native";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function splash() {
  const router = useRouter();

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(-width)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1) Entrance: logo fade + spring scale
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // 2) Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.8,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1.15,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.2,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 0.85,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // 3) Shimmer sweep across logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: width,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(600),
        Animated.timing(shimmerX, {
          toValue: -width,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4) Progress bar fill
    Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();

    // 5) Exit fade → navigate
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start(() => {
        router.replace("/");
      });
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Glow ring behind logo */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Logo wrapper (clips shimmer) */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("../assets/tdc.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Shimmer overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmerX }, { rotate: "20deg" }] },
          ]}
        />
      </Animated.View>

      {/* App name */}
      <Animated.Text
        style={[styles.appName, { opacity: logoOpacity }]}
      >
        TDC
      </Animated.Text>
      <Animated.Text
        style={[styles.tagline, { opacity: logoOpacity }]}
      >
        Connect. Chat. Share.
      </Animated.Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const LOGO_SIZE = 180;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },

  glow: {
    position: "absolute",
    width: LOGO_SIZE + 80,
    height: LOGO_SIZE + 80,
    borderRadius: (LOGO_SIZE + 80) / 2,
    backgroundColor: "#1E90FF",
    shadowColor: "#1E90FF",
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },

  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 24,
  },

  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },

  shimmer: {
    position: "absolute",
    top: -LOGO_SIZE,
    width: 60,
    height: LOGO_SIZE * 3,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  appName: {
    marginTop: 28,
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 6,
  },

  tagline: {
    marginTop: 8,
    color: "#8A8A8A",
    fontSize: 13,
    letterSpacing: 2,
  },

  progressTrack: {
    position: "absolute",
    bottom: 70,
    width: width * 0.5,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#1E90FF",
    borderRadius: 2,
  },
});