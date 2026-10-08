// app/src/ui/EmptyState.js
// Dot mood face (56) + title (Outfit 700 18) + one line + optional secondary button. No emoji.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Dot from "../engagement/components/Dot";
import Button from "./Button";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";

export default function EmptyState({ mood = "sleepy", title, line, actionLabel, onAction, dark = false, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <Dot mood={mood} size={56} animated={false} />
      {!!title && (
        <Text style={[styles.title, dark && { color: color.white }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {title}
        </Text>
      )}
      {!!line && (
        <Text style={[styles.line, dark && { color: color.onInkMuted }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {line}
        </Text>
      )}
      {!!actionLabel && !!onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant={dark ? "outlineLight" : "secondary"}
          size="small"
          full={false}
          style={styles.btn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 },
  title: { marginTop: 12, fontFamily: font.headingBold, fontSize: 18, color: color.ink, textAlign: "center" },
  line: { marginTop: 4, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.textMuted, textAlign: "center" },
  btn: { marginTop: 16 },
});
