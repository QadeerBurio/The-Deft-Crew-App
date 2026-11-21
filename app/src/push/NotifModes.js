// app/src/push/NotifModes.js
// Plan N-5 (flag notifSettingsV2): the top of notification settings: how often (three modes) and the 6 pm campus
// digest. Shown only when the server sends "mode" in the prefs (it does only for accounts with the flag).
//   everything      every switch below works as set
//   only important  things about you and things that match you; no campus-wide pushes
//   quiet           only things about you: replies, your claims, applications, tickets, chats
import React from "react";
import { View, Text, Pressable, Switch, Platform } from "react-native";
import { color as T, font as F, MAX_FONT_SCALE } from "../theme/tokens";

export const MODES = [
  { key: "everything", label: "everything", sub: "every switch below works as you set it" },
  { key: "important", label: "only important", sub: "about you and what matches you. no campus-wide pushes" },
  { key: "quiet", label: "quiet", sub: "only things about you: replies, your claims, applications, chats" },
];

export default function NotifModes({ mode = "everything", digest = false, onMode, onDigest }) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
      <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: T.textFaint, marginBottom: 8 }} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
        how often
      </Text>
      <View style={{ backgroundColor: T.white, borderRadius: 16, borderWidth: 1, borderColor: T.line, overflow: "hidden" }} accessibilityRole="radiogroup">
        {MODES.map((m, i) => {
          const on = mode === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => !on && onMode?.(m.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${m.label}. ${m.sub}`}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: T.line, backgroundColor: pressed ? T.sand : T.white })}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? T.ink : T.line, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: T.ink }} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: T.ink }} maxFontSizeMultiplier={MAX_FONT_SCALE}>{m.label}</Text>
                <Text style={{ fontFamily: F.body, fontSize: 12, color: T.textFaint, marginTop: 2 }} maxFontSizeMultiplier={MAX_FONT_SCALE}>{m.sub}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: T.white, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 14, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: T.ink }} maxFontSizeMultiplier={MAX_FONT_SCALE}>daily digest</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: T.textFaint, marginTop: 2 }} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            one push at 6 pm with today at your campus, instead of one per post
          </Text>
        </View>
        <Switch
          value={!!digest}
          onValueChange={(v) => onDigest?.(v)}
          trackColor={{ false: T.line, true: T.ink }}
          thumbColor={Platform.OS === "android" ? (digest ? T.yellow : T.white) : undefined}
          ios_backgroundColor={T.line}
          accessibilityLabel="daily digest notifications"
        />
      </View>
    </View>
  );
}
