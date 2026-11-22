// app/src/utils/reportError.js
// Plan P0-5, option A: one place where new-feature code reports an error it caught. Today it writes a short
// console.warn (no personal data, no tokens). When Sentry arrives with the 1.3.0 store build, only this file
// changes; callers stay the same.
//   reportError("confessionSafety", err, { step: "report" })
// Never throws.
export function reportError(feature, error, context = {}) {
  try {
    const message = String(error?.message || error || "unknown error").slice(0, 300);
    const safe = {};
    for (const [k, v] of Object.entries(context || {})) {
      if (/token|password|email|phone|cnic/i.test(k)) continue; // never log these
      if (["string", "number", "boolean"].includes(typeof v)) safe[k] = typeof v === "string" ? v.slice(0, 100) : v;
    }
    const extra = Object.keys(safe).length ? ` ${JSON.stringify(safe)}` : "";
    console.warn(`[error:${String(feature || "app").slice(0, 40)}] ${message}${extra}`);
  } catch {
    // reporting must never break the screen
  }
}

export default reportError;
