# Manual native changes in `android/`

Compared with a fresh `npx expo prebuild -p android --clean --no-install` (app commit
`85f4a2b`, Expo SDK 54.0.37, no `META_*` variables set) on 2026-10-21. Only these 7 files
differ; every other file in `android/` (MainApplication, Gradle settings, other resources,
debug keystore) is exactly what prebuild generates. The full diff is
`prebuild-to-current.patch`.

## `android/app/build.gradle`

| Change | Prebuild would write | `android/` has | Note |
|---|---|---|---|
| Meta App Events IDs | — | `resValue "string", "meta_app_id", …` and `"meta_client_token"` read from `META_APP_ID` / `META_CLIENT_TOKEN` at build time | Added for Meta App Events (2026-10-21) |
| `versionCode` | `88` (from `app.json`) | `82` | EAS sets the real number (`appVersionSource: remote`), so this one doesn't reach the store |
| `versionName` | `"1.1.14"` (from `app.json`) | `"1.1.13"` | Shown to users on Android. Check which you want before a release |

## `android/app/src/main/AndroidManifest.xml`

| Change | Prebuild would write | `android/` has | Note |
|---|---|---|---|
| Meta App Events settings | — | 6 `com.facebook.sdk.*` meta-data entries: ApplicationId and ClientToken (from the Gradle strings above), ApplicationName `tdc`, AutoInitEnabled `false`, AutoLogAppEventsEnabled `false`, AdvertiserIDCollectionEnabled `false` | The SDK never starts or logs by itself; the app starts it after consent |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | removed (`tools:node="remove"`) | declared | `app.json` blocks it |
| `SCHEDULE_EXACT_ALARM` | removed | declared | `app.json` blocks it |
| `SYSTEM_ALERT_WINDOW` | removed | declared | `app.json` blocks it |
| `USE_FULL_SCREEN_INTENT` | removed | declared | `app.json` blocks it |
| `android:allowBackup` | `false` | `true` | |
| Dev-client scheme | `exp+tdc` (slug `tdc`) | `exp+testting` | Marked `data-generated`: left from a prebuild when the slug was `Testting` |
| `geo:` intent filter | not generated | present | Marked `data-generated`: left from an earlier prebuild |
| Google Maps (`https://www.google.com/maps`) intent filter | not generated | present | Marked `data-generated`: left from an earlier prebuild |

The four permissions and `allowBackup` disagree with `app.json`. Either way works for EAS
builds (they use `android/`), but decide which is right: the Play Console's permission list
follows `android/`.

## Notification icons

`res/drawable-{hdpi,mdpi,xhdpi,xxhdpi,xxxhdpi}/notification_icon.png` differ from what
prebuild generates from `app.json` (yours: 601 / 395 / 897 / 1331 / 1821 bytes; generated:
701 / 439 / 969 / 1832 / 2692). The shipped icons are saved in `notification-icons/`.
