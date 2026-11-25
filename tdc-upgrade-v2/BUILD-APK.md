# Build and install a test APK (Android), pointed at production

For the owner. A test APK of what is on `main` (release r9), installed next to nothing else on a test phone, talking to
the live server, so the launch can be tried before switching it on for students. Nothing here touches the store
listing, the live app or over-the-air updates. The developer has not run any build.

## What was checked (read-only, 25 Nov 2026)

| check | result |
|---|---|
| `eas whoami` | `aqkhan622` |
| `eas project:info` (this checkout's `app.json`) | `@aqkhan622/Testting`, id `112506b0-7553-4a1b-afeb-6a37019cc15f` |
| `eas build:list --platform ios` in that project | 1.2.2 (build 69, commit a717165, 19 Nov) and 1.2.1 (build 66, commit 707a55d, 14 Nov), both production / store |
| `eas build:list --platform android` in that project | none: the Android store builds were made in the other project, `d14cdf3a` (account aqkhan621) |
| the `updates.url` inside those iOS builds (their commits' app.json) | `https://u.expo.dev/d14cdf3a-…` in both |
| channel / runtime on the iOS build record | not set on the record (see OTA note below) |

So: a build from this checkout lands in project **112506b0 under aqkhan622**. The live store apps listen for updates to
**d14cdf3a (aqkhan621)**. That matters for over-the-air updates (OTA-PLAN.md step 0), not for this test APK.

## 1. Before the build (once)

1. A clean clone of `main` (so your own `app.json` edit isn't in it):
   ```sh
   git clone https://github.com/QadeerBurio/The-Deft-Crew-App.git tdc-apk && cd tdc-apk && npm ci
   ```
2. Log in as the account that owns this checkout's project:
   ```sh
   eas login            # aqkhan622
   eas whoami           # must print aqkhan622
   eas project:info     # must print 112506b0-7553-4a1b-afeb-6a37019cc15f
   ```
3. Check `eas.json` (you; the developer doesn't open it) has a `preview` build profile that makes an **APK** for
   internal install. If it's missing, add it:
   ```json
   "preview": {
     "distribution": "internal",
     "android": { "buildType": "apk" },
     "env": { "EXPO_PUBLIC_API_URL": "https://the-deft-crew-production.up.railway.app" }
   }
   ```
   `EXPO_PUBLIC_API_URL` is what points the app at a server (`app/src/config/server.js`). Production is also the default
   when it isn't set; setting it explicitly in `preview` makes sure the APK never talks to staging by mistake. Don't add a
   `channel` to `preview`: the test APK needs no over-the-air updates.
4. EAS environment variables (`eas env:list --environment preview`): nothing there may override `EXPO_PUBLIC_API_URL`
   with a staging address.

## 2. Build

```sh
eas build -p android --profile preview
```
EAS asks nothing else if the keystore is already stored for this project; if it asks to generate one for the preview
profile, yes is fine (it's only for this internal APK, not the Play key). The build takes about 15-25 minutes; the
command prints a link and a QR code at the end.

## 3. Install

- On the test phone, open the link (or scan the QR) → download the `.apk` → allow "install unknown apps" for the browser
  when Android asks → install.
- The APK has the same package name as the store app (`com.aqkhan110.tdc`) but a different signing key: **uninstall the
  store app on that phone first** (Android won't install over it), and use a test phone, not your own daily one.

## 4. Point the launch at your test account (production, nothing for students)

1. Sign in on the APK with a **test student account**.
2. Admin portal → features → "Launch: all v2 features" → find the account (from its profile → features tab) → **force on**
   with a reason. Only that account gets the 38 launch features; every student stays as today.
3. Kill the app and open it again (flags are read at start). Check: the crew screen, invite sharing (the link is the store
   link with your code while "Launch: gettdc.pk links" is off), the resume studio (15 templates), confessions (handles,
   polls, follow; safety in observe mode), the notification inbox and settings, the goals sheet, the next-action card.
4. Done: force it off again (or leave it for the launch, FLAG-ROLLOUT.md).

## OTA note (for OTA-PLAN.md)

The iOS store builds' records show no update channel. If the EAS dashboard also shows none for the production builds
(both projects), over-the-air updates can't reach those phones at all, whichever project they listen to: the fix is the
1.3.0 store build with a channel in its profile and one project (release-1.3.0.md §1). Check: EAS dashboard → project
d14cdf3a (aqkhan621) and 112506b0 (aqkhan622) → Builds → each production build → "Channel".
