// app/src/ui/Card.js
// White, radius 22 (20 when small), 1px line, padding 16. Pressable when onPress is given.
import React from "react";
import { View, StyleSheet } from "react-native";
import PressScale from "./PressScale";
import { color, radius } from "../theme/tokens";

export default function Card({ children, onPress, small = false, padded = true, style, ...rest }) {
  const s = [styles.card, small && styles.small, !padded && { padding: 0 }, style];
  if (onPress) {
    return (
      <PressScale onPress={onPress} style={s} {...rest}>
        {children}
      </PressScale>
    );
  }
  return (
    <View style={s} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    padding: 16,
  },
  small: { borderRadius: radius.cardSmall },
});
