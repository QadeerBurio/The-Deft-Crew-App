// app/src/analytics/MetaConsent.js
// MetaEventsHost: follows the signed-in student, reads the server's switch (at launch and
// when the app comes back), and asks once for consent. useMetaConsent: the same choice for
// Settings → privacy.
import React, { useContext, useEffect, useState } from "react";
import { AppState, View, Text, StyleSheet } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { Sheet, Button } from "../ui";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { holdTour, releaseTour } from "../engagement/tour/tourGate";
import { metaAvailable, getConsent, setConsent, setMetaUser, refreshFlags, subscribe } from "./metaEvents";

export function useMetaConsent() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((n) => n + 1)), []);
  return {
    available: metaAvailable(),
    allowed: getConsent() === "granted",
    decided: getConsent() != null,
    setAllowed: (v) => setConsent(!!v),
  };
}

export default function MetaEventsHost() {
  const { user, token, isGuest } = useContext(AuthContext) || {};
  const userId = !isGuest && token ? user?._id || user?.id || null : null;
  const { available, decided } = useMetaConsent();
  const [ready, setReady] = useState(false);

  // the student whose choice applies
  useEffect(() => {
    setMetaUser(userId);
  }, [userId]);

  // the server's switch: at launch, and when the app comes back to the front
  useEffect(() => {
    refreshFlags({ force: true });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refreshFlags();
    });
    return () => sub.remove();
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
        <Button title="allow" variant="accent" onPress={() => setConsent(true)} style={styles.btn} accessibilityLabel="allow sharing app activity with Meta" />
        <Button title="not now" variant="ghost" onPress={() => setConsent(false)} accessibilityLabel="don't share app activity with Meta" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: T.ink, marginBottom: 12 },
  btn: { marginTop: 4, marginBottom: 6 },
});
