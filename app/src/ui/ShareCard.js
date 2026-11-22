// ui/ShareCard.js: branded share cards (P1-5, flag shareCards). One card, shown in a sheet as a preview and shared as
// a 1080×1350 PNG (react-native-view-shot + expo-sharing). Every card has the tdc mark, a QR code and the student's
// invite link (gettdc.pk/i/<CODE>), so each share brings people to tdc.
// Variants (only real data; nothing personal):
//   invite       "join me on tdc" + the code
//   levelUp      data.level: "I just reached <level> on tdc"
//   resumeReady  "my resume is ready" (no personal data at all)
//   savings      data.amount (PKR, from /offers/my-total-savings): "I saved rs X this month with tdc"
//   confession   data.text: the confession text only, never a handle or name (P4-5)
// The sheet has a visible close button and closes with Android back.
import React, { useRef, useState } from "react";
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from "react-native";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { color as T, font as F } from "../theme/tokens";
import { inviteLink } from "../growth/inviteLinks";

const W = 300; // preview width; captured at 1080 × 1350 (4:5)
const H = 375;

function lines(variant, data) {
  switch (variant) {
    case "levelUp": return { big: `i just reached ${String(data?.level || "a new level").toLowerCase()}`, small: "on tdc, the student app" };
    case "resumeReady": return { big: "my resume is ready", small: "built on tdc, the student app" };
    case "savings": return { big: `i saved rs ${Number(data?.amount || 0).toLocaleString("en-US")} this month`, small: "with student deals on tdc" };
    case "confession": return { big: String(data?.text || "").slice(0, 220), small: "sent from tdc confessions", quote: true };
    default: return { big: "join me on tdc", small: "deals, jobs and your campus, in one app" };
  }
}

export function ShareCardView({ variant = "invite", code, data }) {
  const link = inviteLink(code, "direct");
  const t = lines(variant, data);
  return (
    <View style={{ width: W, height: H, backgroundColor: T.ink, borderRadius: 24, padding: 22, justifyContent: "space-between" }} collapsable={false}>
      <View style={{ alignSelf: "flex-start", backgroundColor: T.yellow, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ fontFamily: F.headingBold, fontSize: 16, color: T.ink }}>tdc</Text>
      </View>
      <View>
        <Text style={{ fontFamily: F.headingBold, fontSize: t.quote ? 18 : 26, lineHeight: t.quote ? 24 : 30, color: T.white }} numberOfLines={t.quote ? 8 : 3}>
          {t.quote ? `“${t.big}”` : t.big}
        </Text>
        <Text style={{ fontFamily: F.body, fontSize: 14, color: T.onInkMuted, marginTop: 8 }}>{t.small}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          {!!code && <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.yellow, letterSpacing: 1 }}>code {String(code).toUpperCase()}</Text>}
          <Text style={{ fontFamily: F.body, fontSize: 11, color: T.onInkMuted, marginTop: 2 }} numberOfLines={1}>{link.replace(/^https:\/\//, "").replace(/\?.*$/, "")}</Text>
        </View>
        <View style={{ backgroundColor: T.white, padding: 6, borderRadius: 10 }}>
          <QRCode value={link} size={64} color={T.ink} backgroundColor={T.white} ecl="M" />
        </View>
      </View>
    </View>
  );
}

export default function ShareCardSheet({ visible, onClose, variant = "invite", code, data, onShared }) {
  const shot = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const share = async () => {
    setBusy(true); setError("");
    try {
      const uri = await shot.current.capture();
      if (!(await Sharing.isAvailableAsync())) throw new Error("sharing unavailable");
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "share", UTI: "public.png" });
      onShared?.(variant);
    } catch (e) {
      setError("couldn't share the card. try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: T.overlay, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, alignItems: "center" }}>
          <View style={{ alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontFamily: F.headingBold, fontSize: 18, color: T.ink }}>share as image</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="close" hitSlop={12} style={{ minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center" }}>
              <Ionicons name="close" size={22} color={T.ink} />
            </TouchableOpacity>
          </View>
          <ViewShot ref={shot} options={{ format: "png", quality: 1, width: 1080, height: 1350 }}>
            <ShareCardView variant={variant} code={code} data={data} />
          </ViewShot>
          {!!error && <Text style={{ fontFamily: F.body, fontSize: 13, color: T.textMuted, marginTop: 10 }}>{error}</Text>}
          <TouchableOpacity onPress={share} disabled={busy} accessibilityRole="button" accessibilityLabel="share the card" style={{ alignSelf: "stretch", minHeight: 48, borderRadius: 24, backgroundColor: T.ink, alignItems: "center", justifyContent: "center", marginTop: 16 }}>
            {busy ? <ActivityIndicator color={T.yellow} /> : <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.yellow }}>share</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
