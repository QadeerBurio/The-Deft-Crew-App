# Android native project

EAS builds Android (and iOS) from **prebuild**: `/android` and `/ios` are in `.easignore` (and `.gitignore`), so a
local `android/` folder is never uploaded. Everything native comes from `app.json`, `app.config.js` and the config
plugins in `plugins/`. Don't edit `android/` by hand: the change won't reach a build.

## Meta App Events (Android)

`app.config.js` adds the Meta SDK plugin only when `META_APP_ID` and `META_CLIENT_TOKEN` are set in the EAS build
environment (a production build stops without them). The generated `AndroidManifest.xml` then has:

| Entry | Value |
|---|---|
| `com.google.android.gms.permission.AD_ID` | declared (`app.json` → `android.permissions`, and `plugins/withAndroidAdIdDefault.js`) |
| `com.facebook.sdk.ApplicationId` / `ClientToken` | `@string/facebook_app_id` / `@string/facebook_client_token` (from the build environment) |
| `com.facebook.sdk.AutoInitEnabled` | `false` (the app starts the SDK: `app/src/analytics/metaEvents.js`) |
| `com.facebook.sdk.AutoLogAppEventsEnabled` | `false` (switched on by the app once the server's switch is on) |
| `com.facebook.sdk.AdvertiserIDCollectionEnabled` | `true` (Android ad ID on by default; the app turns it off before the SDK starts for a student who said no) |

`plugins/withAndroidAdIdDefault.js` sets the last one on Android only (iOS stays `false`: the iPhone ad ID needs
"continue" and Apple's Allow). It's listed **before** the Meta plugin in `app.config.js` because Expo runs the
plugins' manifest changes last-listed first.

## Checking a build

Locally (no secrets needed; any 5+ digit id and 8+ character token):

```bash
META_APP_ID=1234567890123 META_CLIENT_TOKEN=dummytoken0123456789 npx expo prebuild -p android --no-install --clean
grep -E "AD_ID|com.facebook.sdk" android/app/src/main/AndroidManifest.xml
```

The merged manifest of a real build (all libraries included): download the `.aab` from EAS and run
`bundletool dump manifest --bundle app.aab | grep -E "AD_ID|com.facebook.sdk"`.

Before 1.2.0 the app was built from a hand-maintained `android/` folder; the old patches for it were removed
(they described a setup no build uses any more).
