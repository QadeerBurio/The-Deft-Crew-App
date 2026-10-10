// app/src/guest/accountOnly.js
// Wraps a login-only screen where it is registered in a navigator:
//   <Stack.Screen name="Rewards" component={accountOnly(RewardsScreen, { title: "rewards" })} />
// A guest sees the locked state (the real screen never mounts, so it makes no
// authenticated calls). Everyone else gets the screen exactly as before.
// Call it at module level so the wrapped component is created once.
import React, { useContext } from "react";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import ScreenHeader from "../ui/ScreenHeader";
import { color } from "../theme/tokens";
import GuestLocked from "./GuestLocked";

export default function accountOnly(Screen, { title, line, mood, showBack = true } = {}) {
  function AccountOnly(props) {
    const { user, token, isGuest } = useContext(AuthContext);
    if (user && token && !isGuest) return <Screen {...props} />;
    const canBack = showBack && props.navigation?.canGoBack?.();
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.paper }} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={color.paper} />
        {canBack || title ? (
          <ScreenHeader title={title} showBack={!!canBack} onBack={() => props.navigation.goBack()} />
        ) : null}
        <GuestLocked line={line} mood={mood} />
      </SafeAreaView>
    );
  }
  AccountOnly.displayName = `AccountOnly(${Screen.displayName || Screen.name || "Screen"})`;
  return AccountOnly;
}
