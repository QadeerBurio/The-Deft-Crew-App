// app/src/push/PushAskHost.js
// Plan N-3 (flag pushAskV2): the small sheet that asks for notifications after a good moment (push/pushAsk.js).
// Mounted once in App.js; shows nothing until pushMoment() fires. "turn on" → the OS prompt (the app tour waits
// for it, as on login) → the token is saved. "not now" → asked once more after 7 days, then only from Settings.
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Sheet from "../ui/Sheet";
import Button from "../ui/Button";
import api from "../api/api";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";
import { registerForPushNotificationsAsync, savePushTokenToServer } from "../utils/pushNotifications";
import { holdTour, releaseTour } from "../engagement/tour/tourGate";
import { onPushAsk, answer } from "./pushAsk";

export default function PushAskHost() {
  const [ask, setAsk] = useState(null); // { kind, reason }
  const [busy, setBusy] = useState(false);
  useEffect(() => onPushAsk(setAsk), []);

  const close = async (choice) => {
    if (busy) return;
    setBusy(true);
    holdTour("push-permission");
    try {
      await answer(choice, {
        register: () => registerForPushNotificationsAsync(),
        save: (token) => savePushTokenToServer(api, token),
      });
    } finally {
      releaseTour("push-permission");
      setBusy(false);
      setAsk(null);
    }
  };

  if (!ask) return null;
  return (
    <Sheet visible onClose={() => close("not_now")} title="turn on notifications?" scroll={false}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{ fontFamily: F.body, fontSize: 15, color: T.ink, lineHeight: 21, marginBottom: 16 }} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {ask.reason}.
        </Text>
        <Button title="turn on" onPress={() => close("on")} loading={busy} accessibilityLabel="turn on notifications" />
        <Button title="not now" variant="ghost" onPress={() => close("not_now")} disabled={busy} style={{ marginTop: 8 }} />
      </View>
    </Sheet>
  );
}
