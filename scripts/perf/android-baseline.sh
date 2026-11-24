#!/usr/bin/env bash
# scripts/perf/android-baseline.sh — Q-1 numbers on an Android phone or emulator, the same way every time
# (tdc-upgrade-v2/PERF-BASELINE.md). Needs adb (Android Studio) and a release-type build installed (the preview APK).
# Reads only timings and frame stats; nothing about the account or its data.
#   bash scripts/perf/android-baseline.sh            # cold start x5, warm start x5
#   bash scripts/perf/android-baseline.sh frames     # reset frame stats, wait for you (or Maestro) to use the app, print them
set -euo pipefail
PKG="${TDC_PKG:-com.aqkhan110.tdc}"
RUNS="${RUNS:-5}"
ADB="${ADB:-adb}"

$ADB get-state >/dev/null 2>&1 || { echo "no phone / emulator: check 'adb devices'"; exit 1; }
echo "device: $($ADB shell getprop ro.product.model | tr -d '\r') · Android $($ADB shell getprop ro.build.version.release | tr -d '\r') · RAM $($ADB shell cat /proc/meminfo | awk '/MemTotal/ {printf "%.1f GB", $2/1048576}')"
echo "app:    $($ADB shell dumpsys package "$PKG" | awk -F= '/versionName/ {print $2; exit}' | tr -d '\r')"

median() { sort -n | awk '{a[NR]=$1} END {if (NR==0) {print "-"} else if (NR%2) {print a[(NR+1)/2]} else {print int((a[NR/2]+a[NR/2+1])/2)}}'; }

if [ "${1:-}" = "frames" ]; then
  $ADB shell dumpsys gfxinfo "$PKG" reset >/dev/null
  echo "frame stats reset. use the app now (or run a Maestro flow), then press enter"
  read -r _
  $ADB shell dumpsys gfxinfo "$PKG" | grep -E "Total frames rendered|Janky frames|50th percentile|90th percentile|95th percentile|99th percentile|Number Slow UI thread|Number Frame deadline missed" | tr -d '\r'
  exit 0
fi

cold=(); usable=(); warm=()
for i in $(seq 1 "$RUNS"); do
  $ADB shell am force-stop "$PKG"
  sleep 2
  $ADB logcat -c
  # cold start: the system's time to the first frame (TotalTime), and "Home usable": from the system starting the
  # process ("Start proc" in the system log) to our mark when Home shows its deals ([perf] deals-shown), both read
  # from logcat's own clock (-v epoch), so no two clocks are mixed
  out=$($ADB shell am start -W -n "$PKG/.MainActivity" 2>/dev/null | tr -d '\r')
  total=$(echo "$out" | awk -F': ' '/TotalTime/ {print $2}')
  cold+=("$total")
  # wait up to 20 s for the Home mark
  for _ in $(seq 1 40); do
    $ADB logcat -d -s ReactNativeJS:W 2>/dev/null | grep -q '\[perf\] deals-shown' && break
    sleep 0.5
  done
  log=$($ADB logcat -d -v epoch -b main,system 2>/dev/null | tr -d '\r')
  t0=$(echo "$log" | grep -E "Start proc [0-9]+:$PKG/" | head -1 | awk '{print $1}')
  t1=$(echo "$log" | grep '\[perf\] deals-shown' | head -1 | awk '{print $1}')
  js=$(echo "$log" | grep -o '\[perf\] [a-z-]* [0-9]*ms' | tr '\n' ' ' || true)
  if [ -n "$t0" ] && [ -n "$t1" ]; then
    u=$(awk -v a="$t0" -v b="$t1" 'BEGIN {printf "%d", (b - a) * 1000}')
    usable+=("$u")
  else
    u="-"
  fi
  echo "cold #$i: first frame ${total} ms · Home with deals ${u} ms · marks: ${js:-none (signed out? no deals?)}"
  # warm start: to the background and back
  sleep 3
  $ADB shell input keyevent KEYCODE_HOME
  sleep 2
  wout=$($ADB shell am start -W -n "$PKG/.MainActivity" 2>/dev/null | tr -d '\r')
  wt=$(echo "$wout" | awk -F': ' '/TotalTime/ {print $2}')
  ls=$(echo "$wout" | awk -F': ' '/LaunchState/ {print $2}')
  warm+=("$wt")
  echo "warm #$i: ${wt} ms (${ls:-?})"
done
echo
echo "median cold start, first frame:        $(printf '%s\n' "${cold[@]}" | median) ms"
echo "median cold start, Home with deals:    $( [ ${#usable[@]} -gt 0 ] && printf '%s\n' "${usable[@]}" | median || echo -) ms  (budget 2500)"
echo "median warm start:                     $(printf '%s\n' "${warm[@]}" | median) ms  (budget 500)"
