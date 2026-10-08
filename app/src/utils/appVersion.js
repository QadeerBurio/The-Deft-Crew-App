// app/src/utils/appVersion.js
// The app version shown to students, read from the app config (app.json "version")
// so Profile, the settings hub and app Settings always match the build.
import Constants from "expo-constants";

export const APP_VERSION =
  Constants.expoConfig?.version ||
  Constants.manifest?.version ||
  Constants.manifest2?.extra?.expoClient?.version ||
  null;
