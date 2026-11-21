// ConfessionSupportSheet.js: shown when a post signals self-harm (plan P4-1). Gentle, no blame: the post is held,
// and these Pakistani helplines (from the server, editable in admin) are one tap away. Android back and the close
// button both close it.
import React from "react";
import { View, Text, TouchableOpacity, Modal, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F } from "../../theme/tokens";

export default function ConfessionSupportSheet({ visible, helplines = [], onClose }) {
  const call = (number) => {
    const tel = String(number || "").replace(/[^\d+]/g, "");
    if (tel) Linking.openURL(`tel:${tel}`).catch(() => {});
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: T.overlay, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontFamily: F.headingBold, fontSize: 18, color: T.ink }}>you're not alone</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="close" hitSlop={12} style={{ minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center" }}>
              <Ionicons name="close" size={22} color={T.ink} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: T.textMuted, marginBottom: 14 }} maxFontSizeMultiplier={1.3}>
            your post is held for now. if things feel heavy, talk to someone today. these lines are free and private.
          </Text>
          {helplines.map((h) => (
            <TouchableOpacity
              key={`${h.name}-${h.number}`}
              onPress={() => call(h.number)}
              accessibilityRole="button"
              accessibilityLabel={`call ${h.name}, ${h.number}`}
              style={{ flexDirection: "row", alignItems: "center", minHeight: 52, borderTopWidth: 1, borderTopColor: T.line, gap: 12 }}
            >
              <Ionicons name="call-outline" size={20} color={T.ink} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: T.ink }} maxFontSizeMultiplier={1.3}>{h.name}</Text>
                {!!h.note && <Text style={{ fontFamily: F.body, fontSize: 12, color: T.textMuted }} maxFontSizeMultiplier={1.3}>{h.note}</Text>}
              </View>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 16, color: T.ink }} maxFontSizeMultiplier={1.3}>{h.number}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}
