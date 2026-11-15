// app/src/analytics/MetaConsent.js
// MetaEventsHost: follows the signed-in student and reads the server's switch (at launch and when
// the app comes back). Ad measurement is on by default with an opt-out in Settings → privacy;
// there is no consent sheet (since 2026-11-15). On iPhone, Apple's tracking prompt is shown once,
// a few seconds after sign-in, unless the student switched ad measurement off. useMetaConsent:
// the Settings → privacy switch.
import { useContext, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { metaAvailable, getConsent, setConsent, setMetaUser, refreshFlags, subscribe, onAppState, requestTracking } from "./metaEvents";
import { checkRedemptions } from "./metaRedemptions";

const TRACKING_DELAY = 4000; // after sign-in, not on top of the first screen's load

// switched on in Settings, then (iPhone, if never answered) Apple's tracking prompt
async function allow() {
  const ok = await setConsent(true);
  if (ok && Platform.OS === "ios") setTimeout(() => { requestTracking(); }, 600);
}

export function useMetaConsent() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((n) => n + 1)), []);
  return {
    available: metaAvailable(),
    allowed: getConsent() !== "denied", // on unless switched off
    setAllowed: (v) => (v ? allow() : setConsent(false)),
  };
}

export default function MetaEventsHost() {
  const { user, token, isGuest } = useContext(AuthContext) || {};
  const userId = !isGuest && token ? user?._id || user?.id || null : null;
  const { available, allowed } = useMetaConsent();

  // the student whose choice applies
  useEffect(() => {
    setMetaUser(userId).then(() => checkRedemptions());
  }, [userId]);

  // the server's switch: at launch, on every return to the front, and every 5 minutes while open
  useEffect(() => {
    if (AppState.currentState === "active") onAppState("active"); // reads the switch now
    else refreshFlags({ force: true });
    const sub = AppState.addEventListener("change", (s) => {
      // the switch first, then any redemption recorded while the app was away
      Promise.resolve(onAppState(s)).then(() => { if (s === "active") checkRedemptions(); });
    });
    return () => {
      sub.remove();
      onAppState("background"); // stops the 5-minute check
    };
  }, []);

  // iPhone: Apple's tracking prompt once, a moment after sign-in (requestTracking only asks if it
  // was never answered, and never when Meta is off or the student switched ad measurement off)
  useEffect(() => {
    if (Platform.OS !== "ios" || !userId || !available || !allowed) return undefined;
    const t = setTimeout(() => { requestTracking(); }, TRACKING_DELAY);
    return () => clearTimeout(t);
  }, [userId, available, allowed]);

  return null;
}
