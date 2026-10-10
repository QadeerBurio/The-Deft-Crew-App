// app/src/utils/clipboard.js
// One copy action for the whole app: copies, plays the copy sound once and, when given
// popup text, shows the usual "copied" popup (without the popup's own open/close sound,
// so a copy is one sound). Haptics stay with the caller, as before.
//
//   copyToClipboard(code, { title: "Copied!", message: "Promo code copied to clipboard" })
//   copyToClipboard(text)            // no popup (screen shows its own "copied" state)
//
// Resolves true when copied, false when the copy failed (logged with console.warn).
import * as Clipboard from "expo-clipboard";
import { Alert } from "react-native";
import { soundCopy } from "../lib/tdcSounds";

export async function copyToClipboard(text, popup) {
  try {
    await Clipboard.setStringAsync(text == null ? "" : String(text));
  } catch (e) {
    console.warn("[copy] failed:", e?.message);
    return false;
  }
  soundCopy(); // fire and forget
  if (popup) Alert.alert(popup.title || "Copied!", popup.message || "", undefined, { sound: false });
  return true;
}

export default copyToClipboard;
