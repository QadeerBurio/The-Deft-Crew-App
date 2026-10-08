// app/src/ui/Screen.js
// Safe area + paper background + dark status bar. `dark` for the ink screens
// (sign in / confessions).
import React from "react";
import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color } from "../theme/tokens";

export default function Screen({ children, style, edges = ["top"], dark = false, background }) {
  const bg = background || (dark ? color.ink : color.paper);
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: bg }, style]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={bg} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
