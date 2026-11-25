# Over-the-air plan (EAS Update)

How to send the app's JavaScript (everything on `main`, Releases 1-6) to phones without a store build, a test
channel first, then production, once per live store version, and how to roll back. **Nothing here has been run.**
The owner runs it (or says so in writing). `eas.json` was not opened for this (owner rule): its channel names are
checked with the commands below.

## 0. Before the first update: three checks

1. **The project the phones listen to.** In the committed `app.json`, `extra.eas.projectId` is
   `112506b0-7553-4a1b-afeb-6a37019cc15f` but `updates.url` is `https://u.expo.dev/d14cdf3a-2494-4d4f-bee0-90f862bf3389`
   (a different project). `eas update` publishes to the projectId's project; installed phones ask the URL's
   project. If they differ, an update is published and never arrives. Check:
   - `eas project:info` (the project this checkout publishes to);
   - EAS dashboard → the production build of each live version → its update URL / project;
   - they must be the same project. If they aren't, don't publish: tell the developer (it may be the owner's
     uncommitted `app.json` edit that fixes it).
2. **Channels.** `eas channel:list` and `eas branch:list`: note the channel the store builds use (normally
   `production`) and the one internal / preview builds use (e.g. `preview`). A store build only ever reads its own
   channel.
3. **Live store versions** (owner sends them, e.g. 1.2.2 on both stores, 1.2.1 still on some phones). The runtime
   policy is `appVersion`: each store version is its own runtime (`1.2.2`, `1.2.1`, …), and an update only reaches
   phones whose installed binary has exactly that runtime.

## 1. Can a runtime take this update? (native compatibility)

JavaScript may only use native modules the installed binary already has. For each live version `V`:

```sh
git log --oneline --grep "<V>"            # or the commit / tag the V store build was made from (EAS build page)
git diff <V-commit> main -- package.json  # native packages added or upgraded since V?
```

- Releases 1-6 add **no native module**. Two JavaScript packages: `@tanstack/query-async-storage-persister`
  (pure JS) and `@react-navigation/native-stack` (made explicit; it uses `react-native-screens`, `~4.16.0`, which the
  binary must already have; check it's in `V`'s package.json).
- If `V`'s package.json lacks a native module that `main` imports, `V` gets **no** update (it needs a store
  build): skip it.
- The native items (app links, install referrer, rate-us ask, Sentry, Proguard) are not on `main`; they wait for the
  1.3.0 build (`release-1.3.0.md` §3b).

## 2. Publish to the test channel (per runtime)

On a clean checkout of `main` (the release commit), for each runtime `V` that passed step 1:

1. Make the checkout's runtime equal `V`: set `"version": "V"` in `app.json` **without committing** (the owner's
   own `app.json` edit stays as it is; use a separate clean clone for this).
2. `npx expo export -p android -p ios` (must succeed; the developer's runs: release/r6 OK).
3. Publish to the test channel only:
   `eas update --channel preview --platform all --message "release r6 for runtime V (<commit>)"`
   (`--channel` = the internal / preview channel from step 0.2).
4. On a test phone with a **preview build of version V**: open the app twice (the first launch downloads, the second
   applies: `fallbackToCacheTimeout: 0`, `checkAutomatically: ON_LOAD`). EAS dashboard → Updates shows the group.
5. Check: RELEASE-6 (e) manual tests with test accounts; Maestro flows 01, 02, 07, 08 (`e2e/maestro`); the screens
   students use most (Home, Brands → claim, Events, Confessions, Chat, Resume) open and go back; no crash in 20
   minutes of use. Every new feature is behind a flag (off): with flags off the app must look as before.

## 3. Production (same bundle, staged)

1. Publish **the exact group tested** to production (not a new build of the bundle):
   `eas update:republish --group <tested group id> --destination-channel production`
   (check the option names with `eas update:republish --help` on the CLI version used).
2. If the CLI supports a rollout percentage (`eas update --help` / `eas channel:rollout --help`), start at 10 %, then
   50 %, then 100 % a day apart. Otherwise all at once, at a quiet hour.
3. Watch for 48 hours: Play Console → Android vitals (crashes, ANRs) and App Store Connect → Crashes (until Sentry
   comes with 1.3.0); Railway logs (500s, sudden traffic); support messages. Phones adopt it on their second launch,
   so most are on it within 2-3 days.
4. Repeat per runtime `V` (each needs its own publish with its own `"version"`).

## 4. Rollback

Any sign of trouble (a crash spike, a broken core screen):

- Back to the previous update on that runtime: `eas update:republish --group <previous good group id>
  --destination-channel production`, or
- back to the JavaScript inside the store build: `eas update:roll-back-to-embedded --channel production
  --runtime-version V` (check `--help`).

Phones take the rollback on their next launches (same two-launch rule). The server needs nothing: every new server
field and route is optional, and old app versions keep working against it (checked in each release).

## 5. Don't

- Publish without the step 0 checks, or to production without the test channel first.
- Publish a bundle that imports a native module the runtime lacks (step 1).
- Switch flags on in the same hour as an update (one change at a time: FLAG-ROLLOUT.md).
