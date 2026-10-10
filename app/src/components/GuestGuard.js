// components/GuestGuard.js
// Same name and props as before; a guest now gets the shared locked state
// (guest/GuestLocked). Sign in / sign up open over the app, so the guest's place
// is kept and they come back to it after signing in.
import React, { useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { color as T } from "../theme/tokens";
import GuestLocked from "../guest/GuestLocked";

// fallback: what a guest sees instead (e.g. null when the guard wraps a modal and the
// action that opens it is already gated)
export default function GuestGuard({ title, message, children, fallback }) {
  const { user, isGuest } = useContext(AuthContext);

  // logged in (or not a guest): show the screen
  if (user && !isGuest) return children;

  if (isGuest && !user) {
    if (fallback !== undefined) return fallback;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.paper }} edges={["top"]}>
        <GuestLocked title={title || "sign up to continue"} line={message || "it's free and takes a minute."} />
      </SafeAreaView>
    );
  }

  return children;
}
