// app/src/screens/home/PressScale.js
// Pressable that scales down a little while pressed (Home tap feedback).
import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";

// style → the scaled inner view; containerStyle → the Pressable (layout in a row/grid)
export default function PressScale({ scaleTo = 0.96, style, containerStyle, children, onPressIn, onPressOut, ...rest }) {
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
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
