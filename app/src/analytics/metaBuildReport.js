// app/src/analytics/metaBuildReport.js
// Once per build per install: tells the server whether this build carries the Meta App Events IDs
// (app.config.js → extra.meta.enabled), so tdc can see a build that was made without them (POST /api/app/meta-build).
// Sent at launch, before sign-in. Only the platform, the app version, the build number and true / false: nothing about
// the student or the phone, no advertising ID. Never throws; a failed report is tried again at the next launch.
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import * as Application from "expo-application";
import { Platform } from "react-native";
import { BASE_URL } from "../api/api";

const KEY = "tdc.metaBuildReported.v1"; // "<platform>:<version>:<build>" once reported

const deps = {
  storage: AsyncStorage,
  post: (url, body, cfg) => axios.post(url, body, cfg),
  url: () => `${String(BASE_URL || "").replace(/\/$/, "")}/app/meta-build`,
  enabled: () => Constants.expoConfig?.extra?.meta?.enabled === true,
  platform: () => Platform.OS,
  version: () => Application.nativeApplicationVersion || Constants.expoConfig?.version || null,
  build: () => Application.nativeBuildVersion || null,
};

/** Reports this build once. Resolves to "sent" | "already" | "skipped" (not a store build) | "error"; never throws. */
export async function reportMetaBuild() {
  try {
    const platform = deps.platform();
    const appVersion = String(deps.version() || "");
    const build = String(deps.build() || "");
    // Expo Go, web or a development client without a native build number: nothing to report
    if (!["ios", "android"].includes(platform) || !/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(appVersion) || !/^\d{1,9}$/.test(build)) return "skipped";
    const id = `${platform}:${appVersion}:${build}`;
    if ((await deps.storage.getItem(KEY)) === id) return "already";
    await deps.post(deps.url(), { platform, appVersion, build, enabled: deps.enabled() }, { timeout: 10000 });
    await deps.storage.setItem(KEY, id);
    return "sent";
  } catch {
    return "error"; // offline or the server is busy: the next launch tries again
  }
}

// tests only
export const _test = { deps, KEY };

export default reportMetaBuild;
