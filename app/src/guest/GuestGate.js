// app/src/guest/GuestGate.js
// One gate for every guest action.
//
//   const { isGuest, requireAccount } = useGuestGate();
//   const onLike = () => { if (!requireAccount()) return; ...existing code... };
//
// Signed in: requireAccount() returns true and nothing else happens.
// Guest: it opens the "sign up to continue" sheet and returns false.
//
// The provider also handles the moments the app changes identity:
//   guest → student   drop cached queries (nothing from the guest session shows as the
//                     student's data), go back to the screen they were on, open a held target
//   student → guest   (logout) clear the held target, fresh stack on Home
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../context/AuthContext";
import Sheet from "../ui/Sheet";
import Button from "../ui/Button";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";
import {
  setAuthSnapshot,
  openSignIn,
  openSignUp,
  afterSignedIn,
  afterSignedOut,
  afterEnteredAsGuest,
} from "./accountRoutes";

const GuestGateContext = createContext({ isGuest: false, requireAccount: () => true });

export function useGuestGate() {
  return useContext(GuestGateContext);
}

// wait (briefly) until the stored guest flag is gone, so refetches carry the token
async function guestFlagCleared() {
  for (let i = 0; i < 20; i++) {
    try {
      if ((await AsyncStorage.getItem("isGuest")) !== "true") return;
    } catch {
      return;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

export function GuestGateProvider({ children }) {
  const { user, token, isGuest } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const signedIn = !!(user && token && !isGuest);
  const guest = !!isGuest && !signedIn;
  const [sheetOpen, setSheetOpen] = useState(false);

  setAuthSnapshot({ signedIn, isGuest: guest });

  // identity changes
  const prevRef = useRef(signedIn ? "student" : guest ? "guest" : "none");
  const loggedOutRef = useRef(false);
  useEffect(() => {
    const now = signedIn ? "student" : guest ? "guest" : "none";
    const prev = prevRef.current;
    if (now === prev) return;
    prevRef.current = now;

    if (now === "student") {
      setSheetOpen(false);
      guestFlagCleared().then(() => queryClient.resetQueries());
      // let the Drawer render with the student before moving
      setTimeout(afterSignedIn, 0);
    } else if (now === "none") {
      // logged out: the splash switches to guest Home next
      if (prev === "student") loggedOutRef.current = true;
      setSheetOpen(false);
      queryClient.resetQueries();
    } else if (now === "guest") {
      const fromLogout = loggedOutRef.current || prev === "student";
      loggedOutRef.current = false;
      queryClient.resetQueries();
      // wait one tick so the Drawer route exists
      setTimeout(fromLogout ? afterSignedOut : afterEnteredAsGuest, 0);
    }
  }, [signedIn, guest, queryClient]);

  const requireAccount = useCallback(() => {
    if (!guest) return true;
    setSheetOpen(true);
    return false;
  }, [guest]);

  const value = useMemo(() => ({ isGuest: guest, requireAccount }), [guest, requireAccount]);

  const go = (open) => {
    setSheetOpen(false);
    setTimeout(open, 250); // let the sheet slide away first
  };

  return (
    <GuestGateContext.Provider value={value}>
      {children}
      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="sign up to continue" scroll={false}>
        <View style={styles.body}>
          <Text style={styles.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            it's free and takes a minute.
          </Text>
          <Button title="sign up" onPress={() => go(openSignUp)} />
          <Button title="sign in" variant="secondary" onPress={() => go(openSignIn)} style={{ marginTop: 10 }} />
        </View>
      </Sheet>
    </GuestGateContext.Provider>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 8 },
  line: { fontFamily: font.body, fontSize: 14, color: color.textMuted, marginBottom: 18 },
});

export default GuestGateProvider;
