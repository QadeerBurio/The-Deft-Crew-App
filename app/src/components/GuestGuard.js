// components/GuestGuard.js
// Same name and props as before; a guest now gets the shared locked state
// (guest/GuestLocked). Sign in / sign up open over the app, so the guest's place
// is kept and they come back to it after signing in.
import React, { useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { color as T } from "../theme/tokens";
import GuestLocked from "../guest/GuestLocked";

export default function GuestGuard({ title, message, children }) {
  const { user, isGuest } = useContext(AuthContext);

  // logged in (or not a guest): show the screen
  if (user && !isGuest) return children;

  if (isGuest && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.paper }} edges={["top"]}>
        <GuestLocked title={title || "sign up to continue"} line={message || "it's free and takes a minute."} />
      </SafeAreaView>
    );
  }

  return children;
}
