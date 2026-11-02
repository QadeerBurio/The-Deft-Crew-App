// app/src/lib/perf.js
// Cold start timings (App speed work). One line per mark, once per app start:
//   [perf] splash-hidden 640ms
// Times are from when this module first loads (index.js imports it first, before App).
// Release builds keep console.warn (App.js silences log/info/debug), so the lines show in
//   adb logcat -s ReactNativeJS
// No ids, user data or URLs are logged.

const T0 = Date.now();
const seen = new Set();

export function perfMark(name) {
  if (seen.has(name)) return;
  seen.add(name);
  const line = `[perf] ${name} ${Date.now() - T0}ms`;
  // dev: plain log (a warn would open the yellow LogBox)
  if (__DEV__) console.log(line);
  else console.warn(line);
}

// for tests
export const _perfSeen = seen;
