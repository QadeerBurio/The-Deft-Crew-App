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

### Vercel preview check for `vercel.json` (owner, before the portal goes to production)

`edu-boost/vercel.json` is new (P1): before it, the portal had no Vercel config at all. It adds two rewrites (the
invite page, and an SPA fallback for every path without a dot) and two headers. Deploy the `upgrade/p1-followups`
branch (or later) as a **preview**, then on the preview URL (`<preview>` below), in a private window:

| # | Open | Expect |
|---|------|--------|
| 1 | `<preview>/` | the landing page, as on gettdc.pk today |
| 2 | `<preview>/ambassador` (type it, then reload) | the ambassador page, not a 404 and not the landing page |
| 3 | `<preview>/privacy`, `/universities`, `/founder`: reload each | the same page after the reload |
| 4 | `<preview>/admin`: sign in, open any admin page, reload | still signed in on the same admin page |
| 5 | `<preview>/admin/users/student/<any id>`: reload | the admin user page (a deep path with several parts) |
| 6 | `<preview>/some-page-that-does-not-exist` | the landing page (the app's own `*` route), not a Vercel 404 |
| 7 | `<preview>/i/ABC123` | the small invite page (no React spinner, loads instantly), code `ABC123`, "your friend invited you to tdc" |
| 8 | `<preview>/i/<a real student code>?c=wa` | **before** the P1 server is in production: the page works, the title stays "your friend invited you to tdc" (the open call gets a 404 and is ignored). **After**: the title shows the inviter's first name and the open is logged (channel wa) |
| 9 | `<preview>/i/index.html?code=ABC123` | the same invite page, code `ABC123` (the fallback when the rewrite is not used) |
| 10 | On an Android phone: the Play button on #8 | Play Store opens the tdc page (the referrer is used from 1.3.0 on) |
| 11 | On an iPhone: "copy code & get the app" on #8 | the code is copied, the App Store opens on the tdc page (`apps.apple.com/app/id6765877675`) |
| 12 | `curl -sI <preview>/i/ABC123` | `x-robots-tag: noindex, nofollow` and `cache-control: public, max-age=300` |
| 13 | `curl -sI <preview>/` | **no** `x-robots-tag` (the landing page must stay indexable) |
| 14 | `curl -sI <preview>/.well-known/assetlinks.json` | 200, `content-type: application/json` |
| 15 | `curl -sI <preview>/.well-known/apple-app-site-association` | 200, `content-type: application/json` (no `.json` in the name: `vercel.json` sets it) |
| 16 | `<preview>/manifest.json`, `<preview>/favicon.ico`, and the page's `/static/js/main.*.js` (DevTools → Network) | served as files (200, the right type), **not** the HTML of index.html |
| 17 | `<preview>/robots.txt` and `<preview>/press/express-tribune.jpg` | the same files as on gettdc.pk today (text / image), not index.html |
| 18 | `<preview>/i/` (no code) | the invite page without a code (just "get the app"), no error |

The invite page always calls the production server (a preview may add `?api=https://tdc-server-staging.up.railway.app`
once staging exists); Vercel previews are allowed by the server's CORS list (`config/corsOrigins.js`).

Any row failing: don't promote; tell me which row. Rollback after promotion = redeploy the previous production
deployment in Vercel (Deployments → … → Promote), which has no `vercel.json`.

Note: the two `.well-known` files hold placeholders until the values above are filled in; #14/#15 only check that they
are served correctly, which is all the portal deploy needs. Android/iOS verification happens with the 1.3.0 build.

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
