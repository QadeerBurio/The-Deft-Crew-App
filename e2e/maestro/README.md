# Maestro end-to-end flows (plan Q-7)

A developer tool, not part of the app: [Maestro](https://maestro.mobile.dev) drives a real build on an Android
emulator or iOS simulator by tapping what's on screen (texts and accessibility labels). No app code is needed for
it, and nothing here ships to students.

## One-time setup (dev machine)

1. **Android Studio** (it brings the emulator and `adb`). In Device Manager create:
   - a Pixel-type phone, **Android 14 (API 34), Google Play image** (the main run);
   - if possible, one on **Android 10 or 11** (the low-end check).
2. **Java 17** (already on this machine): `java -version`.
3. **Maestro CLI**:
   - Windows: follow the official Windows guide (WSL is not needed for Android). Check with `maestro --version`.
   - macOS / Linux: `curl -Ls "https://get.maestro.mobile.dev" | bash`.
4. Optional: **Maestro Studio** (desktop) to write and fix flows by pointing at the screen.
5. A **release-type build** on the emulator: the existing preview APK (`adb install <file>.apk`). Development builds are
   slower and show dev overlays; the numbers and timings only mean something on a release-type build.
6. iOS (on a Mac): Xcode + a simulator, the iOS preview build installed on it.

## Test accounts and values (never in the repo)

Pass them with `-e` on each run (or a local, git-ignored `.env.maestro` file you `source`):

| Variable | What |
|---|---|
| `TDC_EMAIL`, `TDC_PASSWORD` | a test student (staging), with resumeV2 + resumeFinish, confessionsV2 + confessionSafety on |
| `TDC_INVITE_CODE` | any valid invite code (flow 1) |
| `TDC_AMBASSADOR_CODE` | a test ambassador's invite code (flow 6) |
| `TDC_BRAND` | a test brand with a claimable offer, as its name shows in the list (flow 3) |

## Running

```sh
# one flow
maestro test -e TDC_EMAIL=… -e TDC_PASSWORD=… e2e/maestro/02-tabs-and-back.yaml
# the safe set (no posts, claims or applications): flows 1, 2, 7, 8
maestro test --exclude-tags staging-only,money -e … e2e/maestro/
# everything, against staging
maestro test -e … e2e/maestro/
```

| Flow | What | Where |
|---|---|---|
| 01 | invite link on a fresh install → signup with the code filled in | anywhere (creates nothing) |
| 02 | the five tabs and 14 screens, back after each (Android back button / iOS edge swipe); Android back on a tab goes Home | anywhere |
| 03 | claim a deal (press and hold) → it's in my discounts | staging (claims an offer) |
| 04 | fresher resume → preview → download the PDF | staging |
| 05 | confession with a phone number is blocked, edited, posted, reported | staging only |
| 06 | ambassador invite link → signup shows the code; then apply to be an ambassador | staging only |
| 07 | turn notifications on from the reason sheet → system prompt | fresh install |
| 08 | airplane mode: cached screens still show; the offline banner (Q-5) is optional until it ships | Android |

Steps marked **CALIBRATE** depend on live data (the first offer on a brand page, the builder's steps, the report
menu's wording): run them once with Maestro Studio open and adjust. `tests/app/maestro-flows.test.js` checks every
plain label a flow taps still exists in the app's code, so a renamed button fails the normal test run, not only the
emulator run.

The flows haven't been run yet (no emulator on the developer's machine when they were written, Q-a).
