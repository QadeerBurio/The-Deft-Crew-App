// app/src/config/timeouts.js
// How long the app waits for the server before giving up, in one place.
//   DEFAULT  every request unless it names another one (axios default + the api instances)
//   AI       resume AI, skill suggestions, AI chat, travel (also the travel stream's "no data" limit)
//   UPLOAD   file uploads (multipart, Cloudinary)
//   PDF      PDF generation / download
// A request that runs out of time shows TOO_LONG and the button that started it works again.

export const TIMEOUT = Object.freeze({
  DEFAULT: 20000,
  AI: 90000,
  UPLOAD: 120000,
  PDF: 120000,
});

export const TOO_LONG = "taking too long, try again";

/** true for an axios timeout, an aborted fetchWithTimeout / withTimeout, or a TimeoutError */
export function isTimeout(err) {
  if (!err) return false;
  if (err.isTimeout === true || err.name === "TimeoutError") return true;
  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") return true;
  return /timeout of \d+ms exceeded|timed out/i.test(String(err.message || ""));
}

export function timeoutError(ms, what = "request") {
  const e = new Error(`${what} timed out after ${ms}ms`);
  e.name = "TimeoutError";
  e.isTimeout = true;
  e.code = "ETIMEDOUT";
  return e;
}

/**
 * Race a promise against a timer (for work that can't be cancelled: printToFileAsync, downloadAsync).
 * The timer is always cleared.
 */
export function withTimeout(promise, ms = TIMEOUT.DEFAULT, what = "request") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(timeoutError(ms, what)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

const isFormData = (body) => typeof FormData !== "undefined" && body instanceof FormData;

/**
 * fetch with a time limit. A caller's own `signal` is respected (and still gets the limit).
 * Uploads (FormData bodies) get TIMEOUT.UPLOAD unless `timeout` is given.
 */
export async function fetchWithTimeout(url, init = {}, ms) {
  const limit = ms || init.timeout || (isFormData(init.body) ? TIMEOUT.UPLOAD : TIMEOUT.DEFAULT);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, limit);
  const outer = init.signal;
  const onOuterAbort = () => controller.abort();
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener?.("abort", onOuterAbort);
  }
  const { timeout: _ignored, ...rest } = init;
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (err) {
    if (timedOut) throw timeoutError(limit, "fetch");
    throw err;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener?.("abort", onOuterAbort);
  }
}

export default TIMEOUT;
