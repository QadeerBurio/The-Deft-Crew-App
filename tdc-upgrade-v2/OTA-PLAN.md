# Over-the-air plan (EAS Update), final

How to send the app's JavaScript on `main` to phones without a store build: confirm the project first, then a test
channel, then production, once per live store version, and how to roll back. **Nothing here has been run by the
developer.** The owner runs it. `eas.json` was not opened (owner rule); its channel names come from the commands below.

## 0. Confirm the Expo project the live store builds listen to (do this first, or the update never arrives)

The committed `app.json` (since cdf72e6, 19 Nov) has:

| setting | value | account |
|---|---|---|
| `expo.owner` | `aqkhan622` | |
| `expo.extra.eas.projectId` | `112506b0-7553-4a1b-afeb-6a37019cc15f` | aqkhan622 |
| `expo.updates.url` | `https://u.expo.dev/d14cdf3a-2494-4d4f-bee0-90f862bf3389` | aqkhan621 |

A store build asks the project in the `updates.url` **that was in app.json when it was built**. `eas update` publishes to
the project in `projectId` (and `owner`). History: 48f3b01 (11 Nov, 1.2.0) both 112506b0; b479402 (13 Nov) both
d14cdf3a; cdf72e6 (19 Nov, 1.2.2) projectId back to 112506b0, url still d14cdf3a.

Find out, per live version:

1. Log in to each account in turn and list its builds:
   `eas login` (aqkhan621) → `eas build:list --platform all --limit 10`
   `eas login` (aqkhan622) → `eas build:list --platform all --limit 10`
   (from a clean clone whose `app.json` has that account's `owner` and `projectId`, see below)
2. The project that lists the **production** build of each live version (1.2.2 = Android versionCode 89 / iOS build 89;
   1.2.1 / 1.2.0 if still installed) is the project those phones listen to **only if** that build's commit had the
   matching `updates.url`. Check the build page: "Git commit" → `git show <commit>:app.json | grep -A2 '"updates"'`.
   The `updates.url` in that commit is the answer.
3. Write the answer down: `LIVE_PROJECT` = d14cdf3a (aqkhan621) or 112506b0 (aqkhan622), per version.

Then publish only to `LIVE_PROJECT`, from a separate clean clone (never the working copy with the owner's own edits):

- **If `LIVE_PROJECT` = d14cdf3a (aqkhan621):** in the clone set `"owner": "aqkhan621"` and
  `"extra": { "eas": { "projectId": "d14cdf3a-2494-4d4f-bee0-90f862bf3389" } }` (url already points there);
  `eas login` as aqkhan621; `eas project:info` must print d14cdf3a.
- **If `LIVE_PROJECT` = 112506b0 (aqkhan622):** in the clone set
  `"updates": { "url": "https://u.expo.dev/112506b0-7553-4a1b-afeb-6a37019cc15f", ... }` (the rest unchanged);
  `eas login` as aqkhan622; `eas project:info` must print 112506b0.
- If different live versions listen to different projects: publish to each project separately (each from its own
  clone set up as above).

Unifying on one project for good happens in the 1.3.0 store build (`release-1.3.0.md` §6). Until then, never commit
these clone edits.

Also in step 0:
- **Channels:** `eas channel:list` and `eas branch:list` in `LIVE_PROJECT`: note the store builds' channel (normally
  `production`) and the internal / preview one (e.g. `preview`).
- **Runtime:** the policy is `appVersion`, so each store version is its own runtime (`1.2.2`, `1.2.1`, ...). An update
  reaches only phones whose installed binary has exactly that version.

### What the read-only checks found (r9, 25 Nov 2026)

- Logged in as `aqkhan622`; this checkout publishes to **112506b0**.
- The iOS store builds 1.2.2 (build 69, a717165) and 1.2.1 (build 66, 707a55d) are listed in 112506b0, but the
  `updates.url` in both commits is **d14cdf3a**: iOS phones ask d14cdf3a (aqkhan621). No Android build is listed in
  112506b0: the Android store builds were made in d14cdf3a too. So **`LIVE_PROJECT` = d14cdf3a (aqkhan621)** for the
  builds the developer could see; confirm Android on the d14cdf3a dashboard.
- The iOS build record shows **no channel**. If the dashboard confirms no channel on the production builds, no
  `eas update` can reach them (in either project): the 1.3.0 store build (with a channel and one project) is the way.
  Check this before anything in §2.

## 1. Can a runtime take this update? (native compatibility)

For each live version `V`: `git diff <V's build commit> main -- package.json`.
- Releases 1-8 add **no native module**. JS-only additions: `@tanstack/query-async-storage-persister`,
  `@react-navigation/native-stack` (uses `react-native-screens ~4.16.0`, which `V` must already have: check `V`'s
  package.json).
- If `V` lacks a native module that `main` imports, `V` gets **no** update: skip it.
- App links, install referrer, rate-us, Sentry and Proguard are not on `main`; they ship in 1.3.0.

## 2. Test channel first (per runtime)

In the clean clone (step 0), on `main`'s release commit, for each runtime `V` that passed step 1:

1. Set `"version": "V"` in the clone's `app.json` (not committed).
2. `npx expo export -p android -p ios` must succeed (the developer's release runs: OK on release/r8).
3. `eas update --channel preview --platform all --message "release r8 for runtime V (<commit>)"`
4. On a test phone with a **preview build of version V** from `LIVE_PROJECT`: open the app twice (first launch
   downloads, second applies). EAS dashboard → Updates shows the group id: write it down.
5. Check: every screen students use most (Home, crew, Brands → claim, Events, Confessions, Chat, Resume) opens and goes
   back; the crew screen renders (the r8 crash fix); no crash in 20 minutes; with all flags off the app looks as before.

## 3. Production (the same group, staged)

1. `eas update:republish --group <tested group id> --destination-channel production`
   (check option names with `--help` on the CLI version used).
2. If the CLI offers a rollout percentage (`eas channel:rollout --help`): 10 %, then 50 %, then 100 %, a day apart.
   Otherwise all at once, at a quiet hour.
3. Watch 48 hours: Play Console → Android vitals, App Store Connect → Crashes, Railway logs (500s), support messages.
4. Repeat per runtime `V` (and per project, if versions listen to different ones).

## 4. Rollback

- To the previous update on that runtime: `eas update:republish --group <previous good group id> --destination-channel production`
- To the JavaScript inside the store build: `eas update:roll-back-to-embedded --channel production --runtime-version V`
  (check `--help`).

Phones take it on their next two launches. The server needs nothing: old app versions keep working against it (checked
in every release; since r8 by `tests/store-app-compat`).

## 5. Don't

- Publish before step 0 is answered, or to production without the test channel.
- Publish from the working copy with the owner's uncommitted `app.json`, or commit the clone's project edits.
- Publish a bundle that imports a native module the runtime lacks.
- Switch flags on in the same hour as an update (one change at a time: FLAG-ROLLOUT.md).
