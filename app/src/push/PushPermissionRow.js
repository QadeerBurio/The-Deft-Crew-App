// app/src/push/PushPermissionRow.js
// Plan N-3 (flag pushAskV2): in notification settings, when this phone doesn't allow notifications:
//   the OS can still ask → "turn on notifications" (the OS prompt, then the token is saved)
//   the OS said no       → "turn on in settings" (opens tdc's page in the phone's settings)
// Allowed, or the flag off: nothing (the screen is as today). Re-checked when the app comes back to the foreground.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Linking, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/api";
import useFlag from "../hooks/useFlag";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { registerForPushNotificationsAsync, savePushTokenToServer } from "../utils/pushNotifications";
import { FLAG } from "./pushAsk";

export default function PushPermissionRow() {
  const on = useFlag(FLAG) === true;
  const [perm, setPerm] = useState(null); // { status, canAskAgain }
  const check = useCallback(() => {
    Notifications.getPermissionsAsync().then(setPerm).catch(() => setPerm(null));
  }, []);
  useEffect(() => {
    if (!on) return undefined;
    check();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
    return () => sub?.remove?.();
  }, [on, check]);

  if (!on || !perm || perm.status === "granted" || perm.granted) return null;
  const denied = perm.canAskAgain === false;
  const onPress = async () => {
    if (denied) { Linking.openSettings().catch(() => {}); return; }
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) await savePushTokenToServer(api, token);
    } finally {
      check();
    }
  };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={denied ? "notifications are off for tdc. turn on in settings" : "turn on notifications"}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", backgroundColor: T.yellow, borderRadius: 16, padding: 14, marginTop: 12, opacity: pressed ? 0.8 : 1 })}
    >
      <Ionicons name="notifications-off-outline" size={20} color={T.ink} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.ink }} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {denied ? "notifications are off for tdc" : "notifications are off"}
        </Text>
        <Text style={{ fontFamily: F.body, fontSize: 13, color: T.ink, marginTop: 2 }} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {denied ? "turn on in settings" : "turn on notifications"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={T.ink} />
    </Pressable>
  );
}
