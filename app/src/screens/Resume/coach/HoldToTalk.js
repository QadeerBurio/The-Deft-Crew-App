// app/src/screens/Resume/coach/HoldToTalk.js
// P3-4b speak mode (flags resumeV2 + resumeSpeak): hold to talk, let go to stop (up to a minute); the answer is
// turned into text on the server and then treated exactly like typed text. The recording is deleted from the phone
// after it's sent, and the server doesn't keep it. Uses the installed expo-av (recording, like chat voice messages);
// owner backlog: move to expo-audio before the next SDK upgrade. Renders nothing with the flag off.
import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
// expo-av and the file system load only when the button is used (nothing native is loaded for students who never talk)
const av = () => require("expo-av").Audio;
const fsLegacy = () => require("expo-file-system/legacy"); // SDK 54: the old API (deleteAsync) lives here
import { Ionicons } from "@expo/vector-icons";
import useFlag from "../../../hooks/useFlag";
import { color as T, font as F, MAX_FONT_SCALE } from "../../../theme/tokens";
import { transcribe, SPEAK_FLAG } from "../../../resume/coach";

export const PRIVACY_LINE = "your voice is turned into text and not kept.";
const MAX_MS = 60000;
const quietMode = () => av().setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false }).catch(() => {});

export default function HoldToTalk({ onText }) {
  const on = useFlag(SPEAK_FLAG) === true;
  const rec = useRef(null);
  const startedAt = useRef(0);
  const timer = useRef(null);
  const [state, setState] = useState("idle"); // idle | recording | working
  const [msg, setMsg] = useState("");

  const start = async () => {
    if (state !== "idle") return;
    setMsg("");
    try {
      const Audio = av();
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { setMsg("allow the microphone to answer by talking."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true, playThroughEarpieceAndroid: false });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      rec.current = recording;
      startedAt.current = Date.now();
      setState("recording");
      timer.current = setTimeout(() => stop(), MAX_MS); // a minute at most
    } catch {
      await quietMode();
      setMsg("couldn't start recording. try again in a moment.");
      setState("idle");
    }
  };

  const stop = async () => {
    clearTimeout(timer.current);
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    setState("working");
    let uri = null;
    try {
      await r.stopAndUnloadAsync();
      uri = r.getURI();
      await quietMode();
      const seconds = (Date.now() - startedAt.current) / 1000;
      if (seconds < 1) { setMsg("hold the button while you talk."); return; }
      const text = await transcribe(uri, Math.min(60, seconds));
      if (text) onText?.(text); else setMsg("we didn't catch that. try again a little closer to the phone.");
    } catch (e) {
      setMsg(e?.response?.status === 413 ? "keep it under a minute." : "couldn't turn that into text. try again or type it.");
    } finally {
      if (uri) fsLegacy().deleteAsync(uri, { idempotent: true }).catch(() => {});
      setState("idle");
    }
  };

  if (!on) return null;
  const label = state === "recording" ? "listening… let go to stop" : state === "working" ? "turning it into text…" : "hold to talk";
  return (
    <View style={s.wrap}>
      <Pressable onPressIn={start} onPressOut={stop} disabled={state === "working"} style={[s.btn, state === "recording" && s.on]} accessibilityRole="button" accessibilityLabel="hold to talk: answer by speaking" accessibilityHint={PRIVACY_LINE} accessibilityState={{ busy: state !== "idle" }}>
        <Ionicons name={state === "recording" ? "radio-button-on" : "mic-outline"} size={18} color={state === "recording" ? T.white : T.ink} />
        <Text style={[s.text, state === "recording" && { color: T.white }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
      </Pressable>
      <Text style={s.privacy} maxFontSizeMultiplier={MAX_FONT_SCALE}>{msg || PRIVACY_LINE}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginVertical: 8 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: T.ink, backgroundColor: T.card },
  on: { backgroundColor: T.danger, borderColor: T.danger },
  text: { fontFamily: F.bodySemi, fontSize: 14, color: T.ink },
  privacy: { fontFamily: F.body, fontSize: 12, color: T.textFaint, marginTop: 4, textAlign: "center" },
});
