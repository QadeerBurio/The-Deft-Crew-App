// app/src/guest/GuestLocked.js
// Locked state for a guest: Dot face, one line, sign up + sign in.
// Used by accountOnly() for login-only screens, by GuestGuard, and inline for
// login-only sections of screens guests can view.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Dot from "../engagement/components/Dot";
import Button from "../ui/Button";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";
import { openSignIn, openSignUp } from "./accountRoutes";

export default function GuestLocked({
  title = "sign up to continue",
  line = "it's free and takes a minute.",
  mood = "cheeky",
  compact = false,
  style,
}) {
  return (
    <View style={[compact ? styles.compact : styles.wrap, style]}>
      <Dot mood={mood} size={compact ? 44 : 56} animated={false} />
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {title}
        <Text style={{ color: color.yellow }}>.</Text>
      </Text>
      {!!line && (
        <Text style={styles.line} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {line}
        </Text>
      )}
      <View style={styles.buttons}>
        <Button title="sign up" onPress={openSignUp} />
        <Button title="sign in" variant="secondary" onPress={openSignIn} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingBottom: 40 },
  compact: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16 },
  title: { marginTop: 14, fontFamily: font.heading, fontSize: 22, color: color.ink, textAlign: "center" },
  line: { marginTop: 6, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.textMuted, textAlign: "center" },
  buttons: { alignSelf: "stretch", marginTop: 22 },
});
