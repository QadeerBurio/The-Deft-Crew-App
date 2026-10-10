// app/src/ui/Sheet.js
// Bottom sheet: white, top radius 24, overlay rgba(17,17,17,0.5), handle, 36 close circle.
// Also exports the bits (SheetHandle, SheetClose, sheetStyles) so existing modals can be
// restyled without changing their own open/close/animation logic.
import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, font, MAX_FONT_SCALE } from "../theme/tokens";

export function SheetHandle({ style }) {
  return (
    <View style={[sheetStyles.handleWrap, style]}>
      <View style={sheetStyles.handle} />
    </View>
  );
}

export function SheetClose({ onPress, style, label = "close" }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [sheetStyles.close, pressed && { opacity: 0.7 }, style]}
    >
      <Ionicons name="close" size={18} color={color.ink} />
    </Pressable>
  );
}

export default function Sheet({ visible, onClose, title, children, scroll = true, maxHeight = "85%", footer }) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={sheetStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="close" />
        <View style={[sheetStyles.sheet, { maxHeight, paddingBottom: Math.max(16, insets.bottom + 8) }]}>
          <SheetHandle />
          <View style={sheetStyles.header}>
            {!!title && (
              <Text style={sheetStyles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {title}
                <Text style={{ color: color.yellow }}>.</Text>
              </Text>
            )}
            <SheetClose onPress={onClose} style={{ marginLeft: "auto" }} />
          </View>
          <Body
            {...(scroll ? { contentContainerStyle: sheetStyles.body, keyboardShouldPersistTaps: "handled" } : { style: sheetStyles.body })}
          >
            {children}
          </Body>
          {footer}
        </View>
      </View>
    </Modal>
  );
}

export const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: color.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  handleWrap: { alignItems: "center", paddingVertical: 6 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.handle },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 8, gap: 12 },
  title: { fontFamily: font.heading, fontSize: 20, color: color.ink, flexShrink: 1 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 20, paddingBottom: 8 },
});
