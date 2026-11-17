// app/src/analytics/MetaConsent.js
// MetaEventsHost: follows the signed-in student, reads the server's switch (at launch and when the app comes back),
// and shows the tdc pre-screen once. useMetaConsent: the same choices for Settings → privacy.
//
// Measurement is anonymous and on by default (metaEvents.js). The pre-screen only asks about identifiers (the
// advertising ID and advanced matching): one plain line, "continue" or "not now". It never shows at first launch:
// only once onboarding is finished and the student has seen value (first job opened, offer claimed or discount
// redeemed). On iPhone, Apple's tracking prompt follows "continue" (never "not now"); on Android "continue" is the
// opt-in. No pressure: "not now" closes it, the app isn't blocked, nothing is given for allowing, and it isn't asked
// again (Settings → privacy can change it).
import React, { useContext, useEffect, useState } from "react";
import { AppState, Platform, View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../context/AuthContext";
import { Sheet, Button } from "../ui";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { holdTour, releaseTour } from "../engagement/tour/tourGate";
import {
  metaAvailable, measurementAllowed, setConsent, getIdsChoice, setIdsChoice, identifiersOn, trackingStatus,
  setMetaUser, refreshFlags, subscribe, onAppState, requestTracking, shouldShowPrescreen,
} from "./metaEvents";
import { checkRedemptions } from "./metaRedemptions";
import { reportMetaBuild } from "./metaBuildReport";

// the app tour's own key: "pending" from a fresh install until it's finished or skipped (TourProvider.js)
const TOUR_DEVICE_KEY = "@tdc_tour_device_v1_done";
export const PRESCREEN_TEXT = "allow tdc to show you better student deals in ads";

// "continue": identifiers allowed for this student, then (iPhone, if never answered) Apple's prompt, once the sheet
// has closed
export async function continuePrescreen() {
  const ok = await setIdsChoice(true);
  if (ok && Platform.OS === "ios") setTimeout(() => { requestTracking(); }, 600);
  return ok;
}

export function useMetaConsent() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((n) => n + 1)), []);
  return {
    available: metaAvailable(),
    // anonymous measurement (Settings → privacy "ad measurement")
    allowed: measurementAllowed(),
    setAllowed: (v) => setConsent(!!v),
    // identifiers (Settings → privacy "ads with your details"): Android on unless the student said no; iPhone only
    // after "continue"
    idsChoice: getIdsChoice(),
    detailsOn: Platform.OS === "android" ? getIdsChoice() !== "declined" : getIdsChoice() === "allowed",
    idsOn: identifiersOn(),
    tracking: trackingStatus(),
    setIdsAllowed: (v) => (v ? continuePrescreen() : setIdsChoice(false)),
  };
}

function useOnboardingDone(userId) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    let live = true;
    // finished or skipped ("1"), or an install from before the tour (no key); "pending" until then
    const check = () => AsyncStorage.getItem(TOUR_DEVICE_KEY)
      .then((v) => { if (live) setDone(v !== "pending"); })
      .catch(() => { if (live) setDone(false); });
    check();
    const t = setInterval(check, 4000); // the tour finishing writes the key; checked again shortly after
    return () => { live = false; clearInterval(t); };
  }, [userId]);
  return done;
}

export default function MetaEventsHost() {
  const { user, token, isGuest } = useContext(AuthContext) || {};
  const userId = !isGuest && token ? user?._id || user?.id || null : null;
  useMetaConsent(); // re-render on every change
  const [ready, setReady] = useState(false);
  const onboardingDone = useOnboardingDone(userId);

  // the student whose choices apply (email / phone only for advanced matching, used only with identifiers allowed)
  useEffect(() => {
    setMetaUser(userId, userId ? { email: user?.email, phone: user?.phone } : null).then(() => checkRedemptions());
  }, [userId, user?.email, user?.phone]);
  // once per build: tell the server whether this build carries the Meta IDs (nothing about the student or the phone)
  useEffect(() => { reportMetaBuild(); }, []);
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
  // not on top of a screen that is still loading
  useEffect(() => {
    setReady(false);
    if (!userId) return undefined;
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, [userId]);

  const visible = !!userId && ready && shouldShowPrescreen({ onboardingDone });
  // the onboarding tour waits while this sheet is up
  useEffect(() => {
    if (!visible) return undefined;
    holdTour("meta-prescreen");
    return () => releaseTour("meta-prescreen");
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={() => setIdsChoice(false)} title={PRESCREEN_TEXT} scroll={false}>
      <View>
        <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {Platform.OS === "ios" ? "next, your iPhone will ask. you can change this any time in settings → privacy." : "you can change this any time in settings → privacy."}
        </Text>
        <Button title="continue" variant="accent" onPress={continuePrescreen} style={styles.btn} accessibilityLabel="continue" />
        <Button title="not now" variant="ghost" onPress={() => setIdsChoice(false)} accessibilityLabel="not now" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: T.ink, marginBottom: 12 },
  btn: { marginTop: 4, marginBottom: 6 },
});
