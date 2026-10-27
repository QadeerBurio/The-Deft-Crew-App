// app/src/analytics/MetaConsent.js
// MetaEventsHost: follows the signed-in student, reads the server's switch (at launch and
// when the app comes back), and asks once for consent. useMetaConsent: the same choice for
// Settings → privacy. On iPhone, Apple's tracking prompt follows "allow" (never "not now").
import React, { useContext, useEffect, useState } from "react";
import { AppState, Platform, View, Text, StyleSheet } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { Sheet, Button } from "../ui";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { holdTour, releaseTour } from "../engagement/tour/tourGate";
import { metaAvailable, getConsent, setConsent, setMetaUser, refreshFlags, subscribe, onAppState, requestTracking } from "./metaEvents";
import { checkRedemptions } from "./metaRedemptions";

// "allow", then (iPhone, if never answered) Apple's tracking prompt, once the sheet has closed
async function allow() {
  const ok = await setConsent(true);
  if (ok && Platform.OS === "ios") setTimeout(() => { requestTracking(); }, 600);
}

export function useMetaConsent() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((n) => n + 1)), []);
  return {
    available: metaAvailable(),
    allowed: getConsent() === "granted",
    decided: getConsent() != null,
    setAllowed: (v) => (v ? allow() : setConsent(false)),
  };
}

export default function MetaEventsHost() {
  const { user, token, isGuest } = useContext(AuthContext) || {};
  const userId = !isGuest && token ? user?._id || user?.id || null : null;
  const { available, decided } = useMetaConsent();
  const [ready, setReady] = useState(false);

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

  // ask a moment after signing in, not on top of the first screen's load
  useEffect(() => {
    setReady(false);
    if (!userId) return undefined;
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, [userId]);

  const visible = !!userId && available && !decided && ready;
  // the onboarding tour waits while this sheet is up
  useEffect(() => {
    if (!visible) return undefined;
    holdTour("meta-consent");
    return () => releaseTour("meta-consent");
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={() => setConsent(false)} title="help us measure our ads" scroll={false}>
      <View>
        <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {"allow tdc to share some app activity with Meta (sign-up, offer claims, job applications, AI resumes) together with this phone's advertising ID, so we can see which of our Facebook and Instagram ads bring students to tdc."}
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          your name, email and phone number are never shared. nothing is sent unless you allow it, and you can change this
          any time in settings → privacy.
        </Text>
        {Platform.OS === "ios" ? (
          <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            on iPhone, after you tap allow, Apple will ask whether tdc may track. the advertising ID is only shared if you
            say yes there too.
          </Text>
        ) : null}
        <Button title="allow" variant="accent" onPress={allow} style={styles.btn} accessibilityLabel="allow sharing app activity with Meta" />
        <Button title="not now" variant="ghost" onPress={() => setConsent(false)} accessibilityLabel="don't share app activity with Meta" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: T.ink, marginBottom: 12 },
  btn: { marginTop: 4, marginBottom: 6 },
});
