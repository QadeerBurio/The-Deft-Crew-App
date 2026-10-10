// app/src/ui/PressScale.js
// Pressable that scales down a little while pressed (Home tap feedback).
import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";
import { soundTap } from "../lib/tdcSounds";

// style → the scaled inner view; containerStyle → the Pressable (layout in a row/grid)
// Plays the tap sound once per press (not when disabled: Pressable skips onPress then).
// sound={false} turns it off.
export default function PressScale({ scaleTo = 0.96, style, containerStyle, children, onPressIn, onPressOut, onPress, sound = true, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (value) =>
    Animated.spring(scale, { toValue: value, friction: 6, tension: 120, useNativeDriver: true }).start();

  return (
    <Pressable
      accessibilityRole="button"
      style={containerStyle}
      onPressIn={(e) => {
        to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      {...rest}
      onPress={
        onPress
          ? (e) => {
              if (sound) soundTap();
              onPress(e);
            }
          : undefined
      }
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
