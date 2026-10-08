// app/src/screens/home/AiFab.js
// Small black AI button, bottom-right. Opens the ChatBot modal (handled by Home).
import React from "react";
import { StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PressScale from "../../ui/PressScale";
import { color } from "../../theme/tokens";

// Same distance from the bottom as the old FAB (bottom 30 + marginBottom 40),
// so it stays clear of the tab bar
export const AI_FAB_BOTTOM = 70;

export default function AiFab({ onPress }) {
  return (
    <PressScale
      scaleTo={0.94}
      onPress={onPress}
      accessibilityLabel="ask tdc ai"
      containerStyle={styles.wrap}
      style={styles.btn}
      hitSlop={6}
    >
      <MaterialCommunityIcons name="robot-outline" size={22} color={color.yellow} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: 16, bottom: AI_FAB_BOTTOM },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.ink,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: color.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
});
