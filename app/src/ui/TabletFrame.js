// app/src/ui/TabletFrame.js — Q-4 (flag tabletLayout, off by default; owner: the iPad keeps tdc, with a centred layout).
// On a wide screen (iPad, Android tablet: the short side 600 pt or more) every screen sits in a centred column of at
// most 600 pt, on the sand background, instead of stretching across. Phones, or the flag off: exactly as before (no
// extra view at all). Follows rotation (useWindowDimensions). React Native modals open full-width above it.
import React from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import useFlag from "../hooks/useFlag";
import { color as T } from "../theme/tokens";

export const TABLET_MIN_SHORT_SIDE = 600;
export const MAX_CONTENT_WIDTH = 600;

/** whether a window this size counts as a tablet */
export const isTabletWindow = ({ width, height }) => Math.min(width || 0, height || 0) >= TABLET_MIN_SHORT_SIDE;

export default function TabletFrame({ children }) {
  const on = useFlag("tabletLayout") === true;
  const win = useWindowDimensions();
  if (!on || !isTabletWindow(win)) return children;
  return (
    <View style={s.outer}>
      <View style={s.column}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, alignItems: "center", backgroundColor: T.sand },
  column: { flex: 1, width: "100%", maxWidth: MAX_CONTENT_WIDTH, backgroundColor: T.paper },
});
