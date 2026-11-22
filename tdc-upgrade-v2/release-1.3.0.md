# 1.3.0 store build: native changes waiting for it

Everything native in the upgrade goes into **one** store build (plan §1 rule 9, owner). Nothing here is applied
yet: `app.json` and the native packages stay as they are until the owner says "build 1.3.0". JS-only changes keep
shipping over the air per live runtime version.

## 1. App links for invite links (P1, owner decision #4)

`https://gettdc.pk/i/<CODE>` opens the app (signup with the code filled in) instead of the web page.

**Before the build, fill in (owner):**
- `edu-boost/public/.well-known/assetlinks.json`: replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_BEFORE_1.3.0` with the
  SHA-256 of the **Play App Signing** key (Play Console → Setup → App integrity → App signing key certificate).
  If the upload key differs, add both fingerprints.
- `edu-boost/public/.well-known/apple-app-site-association`: replace `REPLACE_WITH_APPLE_TEAM_ID` with the Apple
  Team ID (developer.apple.com → Membership).
- Deploy the portal and check both URLs open with `Content-Type: application/json`:
  `https://gettdc.pk/.well-known/assetlinks.json` and `https://gettdc.pk/.well-known/apple-app-site-association`
  (`vercel.json` sets the header for the second).

**`app.json` changes (apply at build time):**

Android: add a second entry to `expo.android.intentFilters` (keep the existing ones):
```json
{
  "action": "VIEW",
  "autoVerify": true,
  "data": [{ "scheme": "https", "host": "gettdc.pk", "pathPrefix": "/i/" }],
  "category": ["BROWSABLE", "DEFAULT"]
}
```
iOS: add to `expo.ios`:
```json
"associatedDomains": ["applinks:gettdc.pk"]
```
(The Apple Developer account must have the Associated Domains capability on the app id; EAS can enable it.)

The app already handles these links (`App.js` → `growth/inviteLinks.js`), so no JS change is needed at build time.

Note: the existing Android intent filter for `the-deft-crew-production.up.railway.app` has `autoVerify: true`, but the
server serves no `/.well-known/assetlinks.json`, so that verification fails today (links open a chooser or the
browser). Fix with the same file on the server, or drop that filter, in this build.

## 2. Play install referrer (P1-3, approved package)

`react-native-google-play-install-referrer`. On the first launch only: read the referrer; if it holds `ref=<CODE>`
(the invite page's Play button adds `referrer=ref%3D<CODE>…`), save it as `@tdc_pending_ref` (the same key the
invite links use), so Signup fills it in. Guard: if the module is missing (an older binary), do nothing.

## 3. Others already approved for this build

- `@sentry/react-native` (P0-5 option A): replace the body of `app/src/utils/reportError.js`.
- `expo-store-review` (P5-8).

## 4. Version

`app.json` version **1.3.0** (runtimeVersion = appVersion: a new runtime; over-the-air updates for 1.2.2 continue
separately), build number / versionCode +1.
