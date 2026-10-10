# Fonts: Outfit (headings) + DM Sans (body)

Approved by the owner: install the two Expo Google Fonts packages.

## 1. Install (from the project root)
```
npx expo install @expo-google-fonts/outfit @expo-google-fonts/dm-sans
```
`expo-font` (~14.0.12) is already in `package.json`. Use `npx expo install`, not `npm install`, so the versions match Expo SDK 54. If the install fails, stop and tell the owner.

## 2. Load them in `App.js`
`App.js` already keeps the splash screen up while `prepare()` runs. Load the fonts inside `prepare()`, **before** `SplashScreen.hideAsync()`. Add nothing else.

```js
import * as Font from "expo-font";
import { Outfit_700Bold, Outfit_800ExtraBold } from "@expo-google-fonts/outfit";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
```

Inside `prepare()`, as step 0, before `configureAudio()`:
```js
try {
  await Font.loadAsync({
    Outfit_700Bold,
    Outfit_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
} catch (e) {
  console.warn("[App] font load error:", e);
}
```
The try/catch matters: if fonts fail, the app must still open (text falls back to the system font).

## 3. Use them
In `app/src/theme/tokens.js`:
```js
export const font = {
  heading: "Outfit_800ExtraBold",
  headingBold: "Outfit_700Bold",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemi: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
};
```
Set `fontFamily` per text style. Don't combine a custom `fontFamily` with `fontWeight` on Android (it can fall back to the system font); the weight is in the family name.

Only Home and the tab bar use these fonts in this task. Don't set a global default font, because that would change every other screen.

## 4. Native builds
Fonts loaded with `Font.loadAsync` work in Expo Go, dev builds and EAS builds. `expo-font` is already listed in `app.json` plugins, so no `app.json` change is needed. The project doesn't use `expo-updates`, so users get the redesign through a normal new store build (see GO_LIVE.md).
