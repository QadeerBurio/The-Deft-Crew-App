// ConfessionRulesSheet.js: the confession rules, shown once before a student's first post (plan P4-1, flag
// confessionSafety). "i agree" is stored on the server; "not now" closes it and nothing is posted.
import React from "react";
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F } from "../../theme/tokens";

export const CONFESSION_RULES = [
  "no names or details that identify anyone",
  "no phone numbers, addresses or id numbers",
  "no sexual or vulgar content",
  "no threats or bullying",
  "no religious, political, racist, sectarian or ethnic content",
  "reports need evidence, and false reports have consequences",
];

export default function ConfessionRulesSheet({ visible, busy = false, onAgree, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: T.overlay, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontFamily: F.headingBold, fontSize: 18, color: T.ink }}>before you confess</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="close" hitSlop={12} style={{ minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center" }}>
              <Ionicons name="close" size={22} color={T.ink} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: T.textMuted, marginBottom: 12 }} maxFontSizeMultiplier={1.3}>
            confessions stay anonymous because everyone keeps these rules. posts are checked before they go live.
          </Text>
          {CONFESSION_RULES.map((rule) => (
            <View key={rule} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <Ionicons name="checkmark-circle-outline" size={18} color={T.ink} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: T.ink }} maxFontSizeMultiplier={1.3}>{rule}</Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={onAgree}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="i agree"
            style={{ marginTop: 10, minHeight: 48, borderRadius: 24, backgroundColor: T.ink, alignItems: "center", justifyContent: "center" }}
          >
            {busy ? <ActivityIndicator color={T.yellow} /> : <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.yellow }}>i agree</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="not now" style={{ minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: T.textMuted }}>not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
