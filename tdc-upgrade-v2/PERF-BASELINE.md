# Performance baseline (plan Q-1)

The "before" numbers for Phase Q, taken the same way every time so the "after" numbers compare. Every Q sub-phase
ends by re-running this page on the same phone and the same build type.

## The budgets (plan Q-1)

| Metric | Budget | How it's measured here |
|---|---|---|
| Cold start → Home usable | ≤ 2.5 s on the reference Android (≤ 1.5 s on iPhone 12+) | `android-baseline.sh`: from the system starting the process to `[perf] deals-shown` |
| Warm start (from background) | ≤ 0.5 s, no splash | `android-baseline.sh`: `am start -W` after Home, `LaunchState: HOT` |
| Tap → visible response | ≤ 100 ms | screen recording at 60 fps, frames between touch and change (below) |
| Screen transition | 60 fps, no visible dropped frames | `android-baseline.sh frames` + `e2e/maestro/perf/transitions.yaml` |
| Long-list scroll | no blank rows, no stutter | `android-baseline.sh frames` + `e2e/maestro/perf/scroll-lists.yaml` |
| Crash-free users | ≥ 99.5 % | Sentry (comes with the 1.3.0 build); until then Play Console → Android vitals |
| ANR | under Play's bad-behaviour line | Play Console → Android vitals |
| Android download size | must not grow | Play Console → App bundle explorer (per device), or `bundletool get-size total` on the .aab |

## Measured now, on the developer's machine (no phone needed)

Build: `release/r5` + P5a (`upgrade/p5a-fixes`), `npx expo export -p android -p ios`, 25 Nov 2026.

| What | Android | iOS |
|---|---|---|
| JS bundle (Hermes bytecode) | 9,913 KB | 9,929 KB |
| Modules in the bundle | 2,644 | 2,670 |
| Assets in the update | 15 MB | 15 MB |

These change only with JS work, so Q-b to Q-d report them too (a split or a lazy screen should not grow them).

## To measure on the reference phone (owner / dev machine)

**Reference phone:** an Android with 3–4 GB RAM (e.g. a Redmi or Samsung A-series), plus the Android 14 emulator for
quick checks. **Build:** a release-type build (the current preview APK). A development build is several times slower
and its numbers mean nothing. **Account:** a test student who sees deals on Home (the `deals-shown` mark needs them).

1. **Cold and warm start** (5 runs each, medians):

   ```sh
   bash scripts/perf/android-baseline.sh
   ```

   It prints, per run, the first frame, "Home with deals" and the app's own marks (`splash-hidden`,
   `home-first-render`, `deals-shown`), then the medians against the budgets.

2. **Screen transitions:** sign in, go to the Home tab, then:

   ```sh
   bash scripts/perf/android-baseline.sh frames     # resets the frame stats and waits
   maestro test e2e/maestro/perf/transitions.yaml   # in another terminal; then press enter in the first
   ```

   Note "Janky frames" (%), and the 90th / 95th / 99th percentile frame times. 60 fps = a frame every 16.7 ms.

3. **Long lists:** the same with `e2e/maestro/perf/scroll-lists.yaml` (brands and events). Do the social feed and
   confessions by hand: reset, scroll fast down and up for 30 s, press enter.

4. **Tap → response:** `adb shell screenrecord --bit-rate 8000000 /sdcard/tap.mp4`, tap a deal card, a tab and a
   "claim" button 5 times each, stop with Ctrl+C, `adb pull /sdcard/tap.mp4`, and count frames from the touch dot
   (Settings → Developer options → Show taps) to the first visible change. 6 frames at 60 fps = 100 ms.

5. **iPhone** (a Mac): Xcode → Open Developer Tool → Instruments → "App Launch" (cold start) and "Animation Hitches"
   (transitions and scrolling), on a release build on a real iPhone.

6. **Android vitals** (Play Console): crash rate, ANR rate and the download size per device, for the last 28 days.

## Results

Fill in one column per measurement, same phone, same build type.

| Metric | Budget | Before Q (date, build) | After Q-b | After Q-c | After Q-d |
|---|---|---|---|---|---|
| Reference phone (model, Android, RAM) | — | | | | |
| Cold start, first frame (median) | — | | | | |
| Cold start, Home with deals (median) | ≤ 2,500 ms | | | | |
| Warm start (median) | ≤ 500 ms | | | | |
| Transitions: janky frames | as low as possible, 0 visible | | | | |
| Transitions: 95th percentile frame | ≤ 16.7 ms | | | | |
| Brands scroll: janky / 95th pct | — / ≤ 16.7 ms | | | | |
| Events scroll: janky / 95th pct | — / ≤ 16.7 ms | | | | |
| Feed scroll: janky / 95th pct | — / ≤ 16.7 ms | | | | |
| Confessions scroll: janky / 95th pct | — / ≤ 16.7 ms | | | | |
| Tap → response (median of 15) | ≤ 100 ms | | | | |
| iPhone cold start (model) | ≤ 1,500 ms on 12+ | | | | |
| Crash-free users (28 days) | ≥ 99.5 % | | | | |
| ANR rate (28 days) | under Play's line | | | | |
| Android download size (typical device) | must not grow | | | | |
| JS bundle (Android / iOS) | must not grow without a reason | 9,913 / 9,929 KB | | | |

## Notes

- The `[perf]` lines are `console.warn` in release builds (`lib/perf.js`); P5a's log scrubbing (`lib/safeConsole.js`)
  leaves them as they are (plain text, no data).
- The script reads only timings, frame stats, the phone model and the app version: nothing about the account.
- Close other apps and keep the phone on charge and cool; run each measurement twice if a number looks odd.
