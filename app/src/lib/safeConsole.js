// lib/safeConsole.js — release builds only (App.js). console.log / info / debug are already silent in release;
// console.warn and console.error stay (they reach the phone's system log), but what they print goes through
// safeArg first (P5a): many call sites pass a whole axios error, which carries the request body (passwords on
// change-password) and the Authorization header. Plain JavaScript, no package.

const SECRET_KEY = /pass(word)?|token|authorization|cookie|secret|otp|cnic|pushtoken|apikey|api_key/i;
const MAX_DEPTH = 3;

// strings: hide bearer tokens, Expo push tokens and JWT-looking values
export const scrubText = (s) =>
  String(s)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [hidden]")
    .replace(/ExponentPushToken\[[^\]]*\]/g, "ExponentPushToken[hidden]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g, "[jwt hidden]");

// a URL without its query string (queries can carry tokens or search text)
const pathOf = (url) => (typeof url === "string" ? url.split("?")[0] : undefined);

const errorSummary = (e) => {
  const parts = [`${e.name || "Error"}: ${scrubText(e.message || "")}`];
  const status = e.response?.status;
  const method = e.config?.method;
  const url = pathOf(e.config?.url);
  if (status) parts.push(`status ${status}`);
  if (method || url) parts.push(`${String(method || "").toUpperCase()} ${scrubText(url || "")}`.trim());
  return parts.join(" · ");
};

export function safeArg(value, depth = 0, seen = new WeakSet()) {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return scrubText(value);
  if (typeof value === "function") return "[function]";
  if (typeof value !== "object") return String(value);
  // errors (and axios errors, which are Errors with config / request / response)
  if (value instanceof Error || value.isAxiosError || (value.config && (value.response || value.request))) return errorSummary(value);
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (depth >= MAX_DEPTH) return Array.isArray(value) ? `[array(${value.length})]` : "[object]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => safeArg(v, depth + 1, seen));
  const out = {};
  for (const k of Object.keys(value).slice(0, 30)) out[k] = SECRET_KEY.test(k) ? "[hidden]" : safeArg(value[k], depth + 1, seen);
  return out;
}

// wraps console.warn / console.error so every argument goes through safeArg; safe to call more than once
export function installSafeConsole(c = console) {
  for (const level of ["warn", "error"]) {
    const original = c[level];
    if (typeof original !== "function" || original.__tdcSafe) continue;
    const wrapped = (...args) => {
      let clean;
      try { clean = args.map((a) => safeArg(a)); } catch { clean = ["[log hidden]"]; }
      return original.apply(c, clean);
    };
    wrapped.__tdcSafe = true;
    c[level] = wrapped;
  }
}
