# 1.3.0 store build: final steps (ready to run, not built)

Every native change in the upgrade goes into **one** store build (plan §1 rule 9). Nothing here is applied yet. Run it
on a `release/1.3.0` branch from `main`, in a clean clone (never the working copy with the owner's own `app.json`
edit), when the owner says "build 1.3.0". JS-only changes keep shipping over the air (OTA-PLAN.md).

**Three values only the owner has** (everything else below is exact):

| placeholder | where to get it |
|---|---|
| `<PLAY_SHA256>` | Play Console → Setup → App integrity → App signing key certificate → SHA-256 (add the upload key's too if it differs) |
| `<APPLE_TEAM_ID>` | developer.apple.com → Membership → Team ID |
| `<EXPO_PROJECT>` | the one Expo project to unify on: `112506b0-7553-4a1b-afeb-6a37019cc15f` (aqkhan622) or `d14cdf3a-2494-4d4f-bee0-90f862bf3389` (aqkhan621), and its account `<EXPO_OWNER>` |

The Sentry DSN and auth token are EAS secrets the owner sets (step 5); they never go in the repo.

Order: 0 → 7, in one branch, then one build. Each step says how to check it.

## 0. Branch and version

```sh
git checkout -b release/1.3.0 main
```
`app.json`: `"version": "1.3.0"` (runtimeVersion policy `appVersion` → a new runtime; OTA for 1.2.x continues
separately), `android.versionCode` 90, `ios.buildNumber` "90".

## 1. One Expo project: `updates.url` and `projectId` must match

`app.json`:
```json
"owner": "<EXPO_OWNER>",
"updates": { "url": "https://u.expo.dev/<EXPO_PROJECT>", "checkAutomatically": "ON_LOAD", "fallbackToCacheTimeout": 0 },
"extra": { "eas": { "projectId": "<EXPO_PROJECT>" } }
```
Check: `eas login` as `<EXPO_OWNER>`, `eas project:info` prints `<EXPO_PROJECT>`; `grep -c <EXPO_PROJECT> app.json` → 2.
From 1.3.0 on, every store build and every `eas update` use this one project. Phones on 1.2.x keep listening to the
project their binary has (OTA-PLAN.md §0) until they update from the store.

## 2. App links: `https://gettdc.pk/i/<code>`, `/r/<link>`, `/c/<id>` open the app

Needs gettdc.pk served by Vercel (owner, DNS).

a. `edu-boost/public/.well-known/assetlinks.json`: replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_BEFORE_1.3.0` with
   `<PLAY_SHA256>` (colon-separated, upper case, as the Play Console shows it).
b. `edu-boost/public/.well-known/apple-app-site-association`: replace `REPLACE_WITH_APPLE_TEAM_ID` with
   `<APPLE_TEAM_ID>`; the `components` list: `{ "/": "/i/*" }`, `{ "/": "/r/*" }`, `{ "/": "/c/*" }`.
c. Deploy the portal; check: `curl -sI https://gettdc.pk/.well-known/assetlinks.json` and
   `curl -sI https://gettdc.pk/.well-known/apple-app-site-association` → 200, `content-type: application/json`.
d. `app.json` android `intentFilters`: add (keep the existing ones)
   ```json
   { "action": "VIEW", "autoVerify": true, "category": ["BROWSABLE", "DEFAULT"],
     "data": [{ "scheme": "https", "host": "gettdc.pk", "pathPrefix": "/i/" },
              { "scheme": "https", "host": "gettdc.pk", "pathPrefix": "/r/" },
              { "scheme": "https", "host": "gettdc.pk", "pathPrefix": "/c/" }] }
   ```
   and drop `autoVerify` on the old `the-deft-crew-production.up.railway.app` filter (that host serves no
   assetlinks.json, so its verification always fails). ios: `"associatedDomains": ["applinks:gettdc.pk"]` (EAS enables
   the capability on the app id).
e. App (`App.js` ExternalDeepLink): `/i/<code>` is handled already (growth/inviteLinks.js). Add `https://gettdc.pk/c/<id>`
   → the same handler as `tdcapp://confession/<id>`; `/r/<link>` → open it in the browser (a public resume is a page).
f. Check after the build: Android `adb shell pm verify-app-links --re-verify com.aqkhan110.tdc`, then
   `adb shell pm get-app-links com.aqkhan110.tdc` → `gettdc.pk: verified`; iPhone: a gettdc.pk/i/ link pasted in Notes
   opens the app.

## 3. Play install referrer (P1-3, approved)

`npx expo install react-native-google-play-install-referrer`. In `App.js`, after the splash, first launch only, guarded
(`try { require(...) } catch {}`): read the referrer; if it holds `ref=<CODE>` (the invite page's Play button adds
`referrer=ref%3D<CODE>`), save it as `@tdc_pending_ref` (the key invite links use), so Signup fills it in.
Check: install from a Play internal-track link with `&referrer=ref%3DTEST12`, open → signup shows TEST12.

## 4. Rate-us ask (P5-8, approved: expo-store-review), flag `rateAsk` (off)

`npx expo install expo-store-review`. Server: add `rateAsk: { default: false, client: true, grant: { roles: ["student"],
label: "Rate-us ask" } }` to `config/featureFlags.js` (+ the feature-access counts). App `app/src/lib/rateAsk.js`: once
per install, after a celebration closes (CelebrationPopup `onClosed`), when the flag is on, the account is 7+ days old
and `StoreReview.isAvailableAsync()` is true: `StoreReview.requestReview()`, then `@tdc_rate_asked`. Never after an
error, a refusal or a payment. The stores decide whether the sheet shows.

## 5. Sentry (approved: @sentry/react-native)

`npx expo install @sentry/react-native`; `app.json` plugins: `["@sentry/react-native/expo", { "organization": "<sentry
org>", "project": "<sentry project>" }]`. EAS secrets (owner): `eas secret:create --name SENTRY_DSN` and
`--name SENTRY_AUTH_TOKEN` (source maps). `App.js`, before anything else: `Sentry.init({ dsn, tracesSampleRate: 0.1,
sendDefaultPii: false, beforeSend: scrub })`, `scrub` = `lib/safeConsole.js`'s `safeArg` over extra and breadcrumbs.
`utils/reportError.js` forwards to `Sentry.captureException` (the console path stays as fallback).
Check: a test build throws once from a hidden dev action → the event shows in Sentry without tokens or bodies.

## 6. Android minify + shrink (Q-3h): internal track first

`app.json` → `expo-build-properties` (installed): `android.enableProguardInReleaseBuilds: true`,
`android.enableShrinkResourcesInReleaseBuilds: true`; `android.extraProguardRules` only if a library breaks:
`-keep class com.stripe.** { *; }`, `-keep class org.webrtc.** { *; }`, `-keep class com.facebook.** { *; }`.

## 7. Build, internal track, then release

1. `npx expo export -p android -p ios` (must pass), all app tests (`node tests/run-all.js app`, lint included).
2. `eas build --platform all --profile production` (owner runs it).
3. Android: Play **internal testing** first. Test: sign in (email + Google), pay (Stripe test card), a voice / video
   call, a push tap, the Meta events (Events Manager → Test events), a PDF download, image upload, the crew screen, the
   three app links (step 2f), the install referrer (step 3). Compare the download size with 1.2.2 (Play Console → App
   bundle explorer; PERF-BASELINE.md row).
4. iOS: TestFlight, the same list (no referrer).
5. Then production, staged (Play: 20 % → 100 %; App Store: phased release).
6. After release: OTA for 1.3.0 goes to `<EXPO_PROJECT>` only (OTA-PLAN.md, channel `production`, runtime 1.3.0).

Rollback: Play → halt the rollout; App Store → pause the phased release; phones on 1.2.x are untouched.
