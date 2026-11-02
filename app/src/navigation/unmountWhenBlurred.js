// app/src/navigation/unmountWhenBlurred.js
// React Navigation 7 removed the `unmountOnBlur` option (it is silently ignored). This is its
// replacement: the screen renders only while focused, so leaving it unmounts it and coming back
// starts fresh, as `unmountOnBlur: true` did.
import React from "react";
import { useIsFocused } from "@react-navigation/native";

export function unmountWhenBlurred(Screen) {
  function UnmountWhenBlurred(props) {
    const isFocused = useIsFocused();
    return isFocused ? <Screen {...props} /> : null;
  }
  UnmountWhenBlurred.displayName = `UnmountWhenBlurred(${Screen.displayName || Screen.name || "Screen"})`;
  return UnmountWhenBlurred;
}

export default unmountWhenBlurred;
