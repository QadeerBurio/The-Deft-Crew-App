// app/src/ui/Input.js
// Height 52, radius 16, white, 1px line. Label above. Focus: 1.5 ink. Error: 1.5 danger + message.
import React, { forwardRef, useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";

const Input = forwardRef(function Input(
  { label, error, right, left, dark = false, style, inputStyle, multiline, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? color.danger : focused ? (dark ? color.yellow : color.ink) : dark ? color.inkLine : color.line;
  const borderWidth = error || focused ? 1.5 : 1;

  return (
    <View style={style}>
      {!!label && (
        <Text style={[styles.label, dark && { color: color.onInkMuted }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.box,
          multiline && styles.boxMulti,
          { borderColor, borderWidth, backgroundColor: dark ? color.inkSoft : color.card },
        ]}
      >
        {left}
        <TextInput
          ref={ref}
          style={[styles.input, multiline && styles.inputMulti, dark && { color: color.white }, inputStyle]}
          placeholderTextColor={dark ? color.onInkMuted : color.textFaint}
          multiline={multiline}
          accessibilityLabel={rest.accessibilityLabel || label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {right}
      </View>
      {!!error && typeof error === "string" && (
        <Text style={styles.error} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {error}
        </Text>
      )}
    </View>
  );
});

export default Input;

const styles = StyleSheet.create({
  label: { fontFamily: font.bodySemi, fontSize: 13, color: color.textMuted, marginBottom: 6 },
  box: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  boxMulti: { alignItems: "flex-start", paddingVertical: 12 },
  input: { flex: 1, fontFamily: font.body, fontSize: 15, color: color.ink, paddingVertical: 12 },
  inputMulti: { minHeight: 96, textAlignVertical: "top", paddingVertical: 0 },
  error: { fontFamily: font.bodyMedium, fontSize: 12.5, color: color.danger, marginTop: 6 },
});
