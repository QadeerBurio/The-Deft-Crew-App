# Manual native changes in `android/`

Compared with a fresh `npx expo prebuild -p android --clean --no-install` (Expo SDK 54.0.37,
no `META_*` variables set; `app.json` / `app.config.js` / `package.json` as on branch
`fix/native-release-hygiene`), checked 2026-10-21. Only these 7 files differ; every other
file in `android/` (MainApplication, Gradle settings, other resources, debug keystore) is
exactly what prebuild generates. The full diff is `prebuild-to-current.patch`.

## `android/app/build.gradle`

| Change | Prebuild writes | `android/` has | Note |
|---|---|---|---|
| Meta App Events IDs | — | `resValue "string", "meta_app_id", …` and `"meta_client_token"`, read from `META_APP_ID` / `META_CLIENT_TOKEN` at build time | Meta App Events (2026-10-21) |
| `versionCode` | `88` (from `app.json`) | `82` | Left alone on purpose: EAS sets it (`appVersionSource: remote`) |

## `android/app/src/main/AndroidManifest.xml`

| Change | Prebuild writes | `android/` has | Note |
|---|---|---|---|
| Meta App Events settings | — | 6 `com.facebook.sdk.*` meta-data entries: ApplicationId and ClientToken (from the Gradle strings above), ApplicationName `tdc`, AutoInitEnabled `false`, AutoLogAppEventsEnabled `false`, AdvertiserIDCollectionEnabled `false` | The SDK never starts or logs by itself; the app starts it after consent |
| Dev-client scheme | `exp+tdc` | none | Only development builds (expo-dev-client) open it; release builds don't need it. Re-add it if you make a dev-client build from this folder |

## Notification icons

`res/drawable-{hdpi,mdpi,xhdpi,xxhdpi,xxxhdpi}/notification_icon.png` differ from what
prebuild generates from `app.json` (yours: 601 / 395 / 897 / 1331 / 1821 bytes; generated:
701 / 439 / 969 / 1832 / 2692). The shipped icons are saved in `notification-icons/`.

## Aligned with `app.json` on 2026-10-21 (no longer differences)

- `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `SCHEDULE_EXACT_ALARM`, `SYSTEM_ALERT_WINDOW`,
  `USE_FULL_SCREEN_INTENT`: now `tools:node="remove"` (removed even if a library adds them).
- `android:allowBackup="false"`.
- Removed the `geo:` and Google Maps (`https://www.google.com/maps`) intent filters and the old
  `exp+testting` scheme (leftovers from a prebuild when the slug was `Testting`; nothing in
  the app receives these links).
- `versionName "1.1.14"`.
