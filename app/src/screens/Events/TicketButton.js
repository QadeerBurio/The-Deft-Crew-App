// app/src/screens/Events/TicketButton.js
// "download ticket" / "download tickets (n)" on a registered event (mine card, event
// details). Pending payment: "ticket after payment is confirmed". Rejected, cancelled or no
// ticket yet: nothing.
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F, MAX_FONT_SCALE } from "../../theme/tokens";
import { ticketButtonState } from "./ticketData";

export default function TicketButton({ registration, onOpen, style }) {
  const state = ticketButtonState(registration);
  if (!state) return null;
  if (state.kind === "pending") {
    return (
      <View style={[styles.pending, style]} accessible accessibilityLabel="ticket after payment is confirmed">
        <Ionicons name="time-outline" size={15} color={T.textMuted} />
        <Text style={styles.pendingText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          ticket after payment is confirmed
        </Text>
      </View>
    );
  }
  const label = state.count > 1 ? `download tickets (${state.count})` : "download ticket";
  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      onPress={() => onOpen && onOpen(registration)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="opens your ticket to save it to the gallery"
    >
      <Ionicons name="download-outline" size={17} color={T.ink} />
      <Text style={styles.btnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: T.yellow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  btnText: { fontFamily: F.bodyBold, fontSize: 14, color: T.ink },
  pending: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  pendingText: { fontFamily: F.bodyMedium, fontSize: 13, color: T.textMuted },
});
