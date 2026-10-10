// app/src/lib/soundManager.js
// Central sound manager for TDC Sound Kit

import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

// ─── Sound Registry ───
// ✅ Fixed paths: from app/src/lib/ up 3 levels to project root, then assets/
export const SOUNDS = {
  // ═══════ General + Moods ═══════
  tdc_general:              require("../../../assets/sounds/moods/tdc_general.wav"),
  tdc_mood_sorted:          require("../../../assets/sounds/moods/tdc_mood_sorted.wav"),
  tdc_mood_excited:         require("../../../assets/sounds/moods/tdc_mood_excited.wav"),
  tdc_mood_panic:           require("../../../assets/sounds/moods/tdc_mood_panic.wav"),
  tdc_mood_broke:           require("../../../assets/sounds/moods/tdc_mood_broke.wav"),
  tdc_mood_sleepy:          require("../../../assets/sounds/moods/tdc_mood_sleepy.wav"),
  tdc_mood_shook:           require("../../../assets/sounds/moods/tdc_mood_shook.wav"),
  tdc_mood_sus:             require("../../../assets/sounds/moods/tdc_mood_sus.wav"),
  tdc_mood_cheeky:          require("../../../assets/sounds/moods/tdc_mood_cheeky.wav"),
  tdc_mood_rs:              require("../../../assets/sounds/moods/tdc_mood_rs.wav"),
  tdc_streak_broke:         require("../../../assets/sounds/moods/tdc_streak_broke.wav"),
  tdc_streak_saved:         require("../../../assets/sounds/moods/tdc_streak_saved.wav"),
  tdc_streak_on_fire:       require("../../../assets/sounds/moods/tdc_streak_on_fire.wav"),
  tdc_deal_expiring:        require("../../../assets/sounds/moods/tdc_deal_expiring.wav"),
  tdc_welcome_back:         require("../../../assets/sounds/moods/tdc_welcome_back.wav"),
  tdc_not_enough_points:    require("../../../assets/sounds/moods/tdc_not_enough_points.wav"),

  // ═══════ Push Notifications ═══════
  tdc_push_default:         require("../../../assets/sounds/push/tdc_push_default.wav"),
  tdc_push_deal:            require("../../../assets/sounds/push/tdc_push_deal.wav"),
  tdc_push_message:         require("../../../assets/sounds/push/tdc_push_message.wav"),
  tdc_push_internship:      require("../../../assets/sounds/push/tdc_push_internship.wav"),
  tdc_push_reminder:        require("../../../assets/sounds/push/tdc_push_reminder.wav"),
  tdc_push_points:          require("../../../assets/sounds/push/tdc_push_points.wav"),
  tdc_push_streak:          require("../../../assets/sounds/push/tdc_push_streak.wav"),
  tdc_push_confession:      require("../../../assets/sounds/push/tdc_push_confession.wav"),
  tdc_push_event:           require("../../../assets/sounds/push/tdc_push_event.wav"),
  tdc_push_level_up:        require("../../../assets/sounds/push/tdc_push_level_up.wav"),

  // ═══════ In-App UI ═══════
  tdc_app_open:             require("../../../assets/sounds/ui/tdc_app_open.wav"),
  tdc_tap:                  require("../../../assets/sounds/ui/tdc_tap.wav"),
  tdc_popup_open:           require("../../../assets/sounds/ui/tdc_popup_open.wav"),
  tdc_popup_close:          require("../../../assets/sounds/ui/tdc_popup_close.wav"),
  tdc_sheet_up:             require("../../../assets/sounds/ui/tdc_sheet_up.wav"),
  tdc_sheet_down:           require("../../../assets/sounds/ui/tdc_sheet_down.wav"),
  tdc_toast:                require("../../../assets/sounds/ui/tdc_toast.wav"),
  tdc_success:              require("../../../assets/sounds/ui/tdc_success.wav"),
  tdc_nope:                 require("../../../assets/sounds/ui/tdc_nope.wav"),
  tdc_error:                require("../../../assets/sounds/ui/tdc_error.wav"),
  tdc_confirm:              require("../../../assets/sounds/ui/tdc_confirm.wav"),
  tdc_swipe:                require("../../../assets/sounds/ui/tdc_swipe.wav"),
  tdc_refresh:              require("../../../assets/sounds/ui/tdc_refresh.wav"),
  tdc_like:                 require("../../../assets/sounds/ui/tdc_like.wav"),
  tdc_send:                 require("../../../assets/sounds/ui/tdc_send.wav"),
  tdc_copy:                 require("../../../assets/sounds/ui/tdc_copy.wav"),
  tdc_deal_claimed:         require("../../../assets/sounds/ui/tdc_deal_claimed.wav"),
  tdc_qr_scan_success:      require("../../../assets/sounds/ui/tdc_qr_scan_success.wav"),
  tdc_badge_unlock:         require("../../../assets/sounds/ui/tdc_badge_unlock.wav"),
  tdc_notification_in_app:  require("../../../assets/sounds/ui/tdc_notification_in_app.wav"),
};

const soundCache = {};
let soundEnabled = true;
let lastSoundAt = 0;

// ms since the last sound started (AppAlert skips its open sound right after another one)
export const msSinceLastSound = () => Date.now() - lastSoundAt;
let hapticsEnabled = true;

const HAPTIC_MAP = {
  tdc_tap:             "selection",
  tdc_success:         "success",
  tdc_error:           "error",
  tdc_nope:            "error",
  tdc_like:            "light",
  tdc_send:            "medium",
  tdc_deal_claimed:    "success",
  tdc_badge_unlock:    "success",
  tdc_qr_scan_success: "success",
  tdc_streak_on_fire:  "success",
  tdc_mood_excited:    "medium",
  tdc_mood_panic:      "heavy",
  tdc_mood_shook:      "heavy",
  tdc_popup_open:      "light",
  tdc_popup_close:     "light",
  tdc_sheet_up:        "light",
  tdc_sheet_down:      "light",
};

// console.warn, not console.log: release builds silence console.log (App.js), and a
// failing sound should still show up in logcat (adb logcat -s ReactNativeJS).
// Only the sound id and the error text are logged.
const warn = (...args) => console.warn("[sound]", ...args);

export const configureAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    warn("configureAudio error:", e?.message);
  }
};

const loadSound = async (id) => {
  if (soundCache[id]) return soundCache[id];
  const source = SOUNDS[id];
  if (!source) {
    warn("unknown id:", id);
    return null;
  }
  try {
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: false,
      volume: 1.0,
    });
    soundCache[id] = sound;
    return sound;
  } catch (e) {
    warn("load error:", id, e?.message);
    return null;
  }
};

// A cached player can stop working (e.g. after the app was in the background).
// Before, it stayed in the cache, so that sound was silent until the app restarted.
const dropSound = (id) => {
  const sound = soundCache[id];
  delete soundCache[id];
  if (sound) sound.unloadAsync().catch(() => {});
};

const replay = async (id, volume, rate) => {
  const sound = await loadSound(id);
  if (!sound) return false;
  await sound.setVolumeAsync(volume);
  await sound.setRateAsync(rate, true);
  await sound.replayAsync();
  return true;
};

export const preloadSounds = async (ids) => {
  await Promise.all(ids.map((id) => loadSound(id)));
};

export const playSound = async (id, options = {}) => {
  if (!soundEnabled) return;
  lastSoundAt = Date.now();

  const { withHaptic = true, volume = 1.0, rate = 1.0 } = options;

  if (withHaptic && hapticsEnabled && HAPTIC_MAP[id]) {
    try {
      const type = HAPTIC_MAP[id];
      if (type === "selection") await Haptics.selectionAsync();
      else if (type === "light") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === "medium") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === "heavy") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === "success") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === "error") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      warn("haptic error:", id, e?.message);
    }
  }

  try {
    await replay(id, volume, rate);
  } catch (e) {
    // drop the broken player and try once more with a fresh one
    warn("play error, reloading:", id, e?.message);
    dropSound(id);
    try {
      await replay(id, volume, rate);
    } catch (e2) {
      warn("play error:", id, e2?.message);
      dropSound(id);
    }
  }
};

export const stopSound = async (id) => {
  const sound = soundCache[id];
  if (sound) {
    try { await sound.stopAsync(); } catch {}
  }
};

export const setSoundEnabled = (enabled) => { soundEnabled = enabled; };
export const isSoundEnabled = () => soundEnabled;
export const setHapticsEnabled = (enabled) => { hapticsEnabled = enabled; };

export const unloadAllSounds = async () => {
  const ids = Object.keys(soundCache);
  await Promise.all(
    ids.map((id) => soundCache[id]?.unloadAsync().catch(() => {}))
  );
  Object.keys(soundCache).forEach((k) => delete soundCache[k]);
};