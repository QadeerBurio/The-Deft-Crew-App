// app/src/guest/firstRun.js
// "Seen the intro" flag for the first-run flow (splash → intro cards → Home as guest).
// Only INTRO_KEY is ever written. The older keys are read so existing installs
// never see the intro again; they are not changed.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const INTRO_KEY = "@tdc_intro_seen_v1";

// read-only: any of these means the app has been used on this device before
const LEGACY_KEYS = ["onboardingComplete", "alreadyLaunched", "termsAccepted", "token", "user", "isGuest"];

export async function hasSeenIntro() {
  try {
    const own = await AsyncStorage.getItem(INTRO_KEY);
    if (own === "true") return true;
    const rows = await AsyncStorage.multiGet(LEGACY_KEYS);
    const get = (k) => rows.find(([key]) => key === k)?.[1];
    return (
      get("onboardingComplete") === "true" ||
      get("alreadyLaunched") === "true" ||
      get("termsAccepted") === "true" ||
      get("isGuest") === "true" ||
      !!(get("token") && get("user"))
    );
  } catch {
    return true; // can't tell: don't show the intro to someone who may have seen it
  }
}

export async function markIntroSeen() {
  try {
    await AsyncStorage.setItem(INTRO_KEY, "true");
  } catch {}
}
