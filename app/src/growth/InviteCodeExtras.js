// app/src/growth/InviteCodeExtras.js
// Under Signup's referral field (P1-1, P1-2):
//   - a code saved from an invite link fills the field in (only when it's empty), checked with the server:
//     "invited by aisha ✓ code AISHA1" (the field stays editable)
//   - "paste invite code" (iPhone flow from the invite page): reads the clipboard only when tapped, never on its own;
//     shown when the server's invite features are on (GET /api/invites/config) and the field is empty
// Nothing shows for a student who came without an invite and before the server turns the features on.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import api from "../api/api";
import { color as T, font as F } from "../theme/tokens";
import { readPendingRef, codeFromText } from "./inviteLinks";

export default function InviteCodeExtras({ code, onCode, disabled = false }) {
  const [inviter, setInviter] = useState(null); // { code, name }
  const [pasteOn, setPasteOn] = useState(false);
  const [note, setNote] = useState("");

  // a code saved from an invite link: fill it in once
  useEffect(() => {
    let live = true;
    readPendingRef().then((pending) => { if (live && pending && !code) onCode(pending); });
    api.get("/invites/config", { timeout: 8000 }).then((r) => { if (live) setPasteOn(r?.data?.enabled === true); }).catch(() => {});
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // who invited: checked whenever the code looks complete
  useEffect(() => {
    let live = true;
    const c = String(code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{6,12}$/.test(c)) { setInviter(null); return undefined; }
    api.get(`/engagement/referrals/validate/${encodeURIComponent(c)}`, { timeout: 8000 })
      .then((r) => { if (live) setInviter(r?.data?.valid ? { code: c, name: r.data.referrer?.name || "a friend" } : null); })
      .catch(() => { if (live) setInviter(null); });
    return () => { live = false; };
  }, [code]);

  const paste = async () => {
    try {
      const found = codeFromText(await Clipboard.getStringAsync());
      if (found) { onCode(found); setNote(""); } else setNote("no invite code in what you copied");
    } catch { setNote("couldn't read what you copied"); }
  };

  return (
    <View>
      {inviter && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: T.yellowSoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginTop: -4, marginBottom: 10 }} accessibilityLabel={`invited by ${inviter.name}, code ${inviter.code}`}>
          <Ionicons name="checkmark-circle" size={16} color={T.ink} />
          <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: T.ink }} maxFontSizeMultiplier={1.3}>
            invited by {String(inviter.name).toLowerCase()} ✓ code {inviter.code}
          </Text>
        </View>
      )}
      {inviter && (
        <Text style={{ fontFamily: F.body, fontSize: 12, color: T.textMuted, marginTop: -6, marginBottom: 10 }} maxFontSizeMultiplier={1.3}>
          you both get 100 points when you start using tdc.
        </Text>
      )}
      {pasteOn && !String(code || "").trim() && (
        <TouchableOpacity onPress={paste} disabled={disabled} accessibilityRole="button" accessibilityLabel="paste invite code" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, alignSelf: "flex-start", marginTop: -6, marginBottom: 6 }}>
          <Ionicons name="clipboard-outline" size={16} color={T.ink} />
          <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: T.ink, textDecorationLine: "underline" }} maxFontSizeMultiplier={1.3}>paste invite code</Text>
        </TouchableOpacity>
      )}
      {!!note && <Text style={{ fontFamily: F.body, fontSize: 12, color: T.textMuted, marginBottom: 8 }} maxFontSizeMultiplier={1.3}>{note}</Text>}
    </View>
  );
}
